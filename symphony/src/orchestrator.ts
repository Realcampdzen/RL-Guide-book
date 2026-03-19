/**
 * Orchestrator — SPEC.md §7-8
 * Main poll loop, state machine, dispatch, retry, reconciliation
 */

import logger from './logger.js';
import { GitHubTracker } from './tracker.js';
import { LinearTracker } from './linear-tracker.js';
import { WorkspaceManager } from './workspace.js';
import { AgentRunner } from './agent-runner.js';
import { OpenAIAgentRunner } from './openai-agent.js';
import { renderPrompt } from './prompt.js';
import type {
    ServiceConfig,
    WorkflowDefinition,
    Issue,
    OrchestratorState,
    RunAttempt,
    RetryEntry,
    RunningEntry,
    RunStatus,
    AgentEvent,
    TrackerClient,
} from './types.js';

export class Orchestrator {
    private config: ServiceConfig;
    private workflow: WorkflowDefinition;
    private tracker: TrackerClient;
    private workspaceManager: WorkspaceManager;
    private state: OrchestratorState;
    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private shutdownRequested = false;

    constructor(config: ServiceConfig, workflow: WorkflowDefinition) {
        this.config = config;
        this.workflow = workflow;
        this.tracker = createTracker(config);
        this.workspaceManager = new WorkspaceManager(config.workspace.root, config.hooks);

        this.state = {
            poll_interval_ms: config.polling.interval_ms,
            max_concurrent_agents: config.agent.max_concurrent_agents,
            running: new Map(),
            claimed: new Set(),
            retry_attempts: new Map(),
            completed: new Set(),
            totals: {
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0,
                runtime_seconds: 0,
            },
        };
    }

    updateConfig(config: ServiceConfig, workflow: WorkflowDefinition) {
        this.config = config;
        this.workflow = workflow;
        this.state.poll_interval_ms = config.polling.interval_ms;
        this.state.max_concurrent_agents = config.agent.max_concurrent_agents;
        this.tracker = createTracker(config);
        this.workspaceManager.updateConfig(config.workspace.root, config.hooks);

        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = setInterval(() => this.tick(), this.state.poll_interval_ms);
        }
    }

    async start() {
        logger.separator('Symphony — Starting');
        logger.info(describeTracker(this.config), { component: 'orchestrator' });
        logger.info(`Active states: [${getActiveStates(this.config).join(', ')}]`, { component: 'orchestrator' });
        logger.info(`Workspace root: ${this.config.workspace.root}`, { component: 'orchestrator' });
        logger.info(`Max concurrent agents: ${this.config.agent.max_concurrent_agents}`, { component: 'orchestrator' });
        logger.info(`Poll interval: ${this.state.poll_interval_ms}ms`, { component: 'orchestrator' });
        const agentMode = this.config.codex.command === 'openai' || !this.config.codex.command
            ? 'openai-api' : this.config.codex.command;
        logger.info(`Agent mode: ${agentMode}`, { component: 'orchestrator' });

        await this.startupCleanup();
        await this.tick();
        this.pollTimer = setInterval(() => this.tick(), this.state.poll_interval_ms);

        logger.separator('Symphony is running');
        logger.info(`Polling every ${this.state.poll_interval_ms / 1000}s. Press Ctrl+C to stop.`, { component: 'orchestrator' });
    }

    async stop() {
        this.shutdownRequested = true;
        logger.separator('Shutting down');

        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }

        for (const [issueId, entry] of this.state.running) {
            logger.info(`Stopping agent for ${entry.issue.identifier}`, {
                component: 'orchestrator',
                issue_id: issueId,
            });
            entry.abort_controller.abort();
        }

        for (const [, entry] of this.state.retry_attempts) {
            if (entry.timer_handle) {
                clearTimeout(entry.timer_handle);
            }
        }

        const promises = Array.from(this.state.running.values())
            .map((e) => e.worker_promise)
            .filter(Boolean);

        if (promises.length > 0) {
            logger.info(`Waiting for ${promises.length} running agent(s) to stop...`, { component: 'orchestrator' });
            await Promise.race([
                Promise.allSettled(promises),
                new Promise((r) => setTimeout(r, 10000)),
            ]);
        }

        this.logStatus();
        logger.info('Symphony stopped.', { component: 'orchestrator' });
    }

    private async startupCleanup() {
        try {
            logger.info('Running startup cleanup for terminal issues...', { component: 'orchestrator' });
            const terminalIssues = await this.tracker.fetchTerminalIssues();
            let cleaned = 0;
            for (const issue of terminalIssues) {
                await this.workspaceManager.cleanupWorkspace(issue);
                cleaned++;
            }
            if (cleaned > 0) {
                logger.info(`Cleaned ${cleaned} terminal workspace(s)`, { component: 'orchestrator' });
            }
        } catch (err) {
            logger.warn(`Startup cleanup error (non-fatal): ${err}`, { component: 'orchestrator' });
        }
    }

    private async tick() {
        if (this.shutdownRequested) return;

        try {
            await this.reconcileActiveRuns();
            const candidates = await this.tracker.fetchCandidateIssues();

            let dispatched = 0;
            for (const issue of candidates) {
                if (this.shutdownRequested) break;
                if (this.state.running.size >= this.state.max_concurrent_agents) {
                    logger.debug('All agent slots occupied, skipping remaining candidates', { component: 'orchestrator' });
                    break;
                }
                if (this.state.claimed.has(issue.id)) continue;

                await this.dispatch(issue);
                dispatched++;
            }

            if (dispatched > 0) {
                logger.info(`Dispatched ${dispatched} new issue(s)`, { component: 'orchestrator' });
            }

            this.logStatus();
        } catch (err) {
            logger.error(`Poll tick error: ${err}`, { component: 'orchestrator' });
        }
    }

    private async reconcileActiveRuns() {
        if (this.state.running.size === 0) return;

        for (const [issueId, entry] of this.state.running) {
            try {
                const current = await this.tracker.fetchIssueById(issueId);

                if (!current) {
                    logger.info(`Issue ${entry.issue.identifier} not found, stopping run`, {
                        component: 'orchestrator',
                        issue_id: issueId,
                    });
                    entry.abort_controller.abort();
                    this.release(issueId);
                    continue;
                }

                if (isTerminalIssue(this.config, current)) {
                    logger.info(`Issue ${current.identifier} is now terminal (${current.state}), stopping run`, {
                        component: 'orchestrator',
                        issue_id: issueId,
                    });
                    entry.abort_controller.abort();
                    this.release(issueId);
                    await this.workspaceManager.cleanupWorkspace(current);
                }
            } catch (err) {
                logger.warn(`Reconciliation error for ${entry.issue.identifier}: ${err}`, {
                    component: 'orchestrator',
                    issue_id: issueId,
                });
            }
        }
    }

    private async dispatch(issue: Issue, attempt: number | null = null) {
        const issueId = issue.id;
        this.state.claimed.add(issueId);

        logger.info(`Dispatching ${issue.identifier}: "${issue.title}"`, {
            component: 'orchestrator',
            issue_id: issueId,
            issue_identifier: issue.identifier,
        });

        await this.syncRunStarted(issue, attempt);

        const abortController = new AbortController();
        const run: RunAttempt = {
            issue_id: issueId,
            issue_identifier: issue.identifier,
            attempt,
            workspace_path: '',
            status: 'preparing_workspace' as RunStatus,
            started_at: new Date(),
        };

        const entry: RunningEntry = {
            issue,
            run,
            session: null,
            worker_promise: null,
            abort_controller: abortController,
        };

        this.state.running.set(issueId, entry);
        entry.worker_promise = this.worker(issue, entry, attempt).catch((err) => {
            logger.error(`Worker crashed for ${issue.identifier}: ${err}`, {
                component: 'orchestrator',
                issue_id: issueId,
            });
        });
    }

    private async worker(issue: Issue, entry: RunningEntry, attempt: number | null) {
        const startTime = Date.now();

        try {
            entry.run.status = 'preparing_workspace' as RunStatus;
            const workspace = await this.workspaceManager.ensureWorkspace(issue);
            entry.run.workspace_path = workspace.path;

            await this.workspaceManager.runBeforeRunHook(workspace, issue);

            entry.run.status = 'building_prompt' as RunStatus;
            const prompt = await renderPrompt(this.workflow.prompt_template, issue, attempt);

            logger.debug(`Rendered prompt (${prompt.length} chars)`, {
                component: 'orchestrator',
                issue_identifier: issue.identifier,
            });

            entry.run.status = 'launching_agent' as RunStatus;

            const useOpenAI = this.config.codex.command === 'openai' || !this.config.codex.command;
            let result: { success: boolean; error?: string };

            if (useOpenAI) {
                const agentRunner = new OpenAIAgentRunner(entry.abort_controller, {
                    model: process.env.SYMPHONY_MODEL || 'gpt-4o-mini',
                });
                result = await agentRunner.runSession(
                    workspace.path,
                    prompt,
                    issue,
                    this.config.agent.max_turns,
                    (event: AgentEvent) => this.handleAgentEvent(issue, entry, event),
                );
            } else {
                const agentRunner = new AgentRunner(this.config.codex, entry.abort_controller);
                result = await agentRunner.runSession(
                    workspace.path,
                    prompt,
                    issue,
                    this.config.agent.max_turns,
                    (event: AgentEvent) => this.handleAgentEvent(issue, entry, event),
                );
            }

            await this.workspaceManager.runAfterRunHook(workspace, issue);

            const runtimeSeconds = (Date.now() - startTime) / 1000;
            this.state.totals.runtime_seconds += runtimeSeconds;

            if (result.success) {
                entry.run.status = 'succeeded' as RunStatus;
                logger.info(`✅ Worker completed successfully for ${issue.identifier} (${runtimeSeconds.toFixed(1)}s)`, {
                    component: 'orchestrator',
                    issue_identifier: issue.identifier,
                });
                await this.syncRunFinished(issue, 'succeeded', runtimeSeconds);
                this.scheduleRetry(issue, 1, 1000);
            } else {
                entry.run.status = 'failed' as RunStatus;
                entry.run.error = result.error;
                logger.error(`Worker failed for ${issue.identifier}: ${result.error}`, {
                    component: 'orchestrator',
                    issue_identifier: issue.identifier,
                });
                await this.syncRunFinished(issue, 'failed', runtimeSeconds, result.error);

                const currentAttempt = (attempt || 0) + 1;
                const backoff = Math.min(1000 * Math.pow(2, currentAttempt), this.config.agent.max_retry_backoff_ms);
                this.scheduleRetry(issue, currentAttempt, backoff);
            }
        } catch (err) {
            entry.run.status = 'failed' as RunStatus;
            entry.run.error = String(err);
            logger.error(`Worker error for ${issue.identifier}: ${err}`, {
                component: 'orchestrator',
                issue_identifier: issue.identifier,
            });
            await this.syncRunFinished(issue, 'failed', (Date.now() - startTime) / 1000, String(err));

            const currentAttempt = (attempt || 0) + 1;
            const backoff = Math.min(1000 * Math.pow(2, currentAttempt), this.config.agent.max_retry_backoff_ms);
            this.scheduleRetry(issue, currentAttempt, backoff);
        } finally {
            this.state.running.delete(issue.id);
        }
    }

    private handleAgentEvent(issue: Issue, entry: RunningEntry, event: AgentEvent) {
        if (entry.session || event.agent_pid) {
            if (!entry.session) {
                entry.session = {
                    session_id: '',
                    thread_id: '',
                    turn_id: '',
                    agent_pid: event.agent_pid || null,
                    last_event: null,
                    last_timestamp: null,
                    last_message: '',
                    input_tokens: 0,
                    output_tokens: 0,
                    total_tokens: 0,
                    turn_count: 0,
                };
            }
            entry.session.last_event = event.event;
            entry.session.last_timestamp = event.timestamp;

            if (event.usage) {
                entry.session.input_tokens += event.usage.input_tokens;
                entry.session.output_tokens += event.usage.output_tokens;
                entry.session.total_tokens += event.usage.total_tokens;
                this.state.totals.input_tokens += event.usage.input_tokens;
                this.state.totals.output_tokens += event.usage.output_tokens;
                this.state.totals.total_tokens += event.usage.total_tokens;
            }
        }

        switch (event.event) {
            case 'session_started':
                logger.info(`🤖 Agent started (PID: ${event.agent_pid})`, {
                    component: 'orchestrator',
                    issue_identifier: issue.identifier,
                });
                break;
            case 'turn_completed':
                logger.info('✅ Turn completed', {
                    component: 'orchestrator',
                    issue_identifier: issue.identifier,
                });
                break;
            case 'turn_failed':
                logger.warn('❌ Turn failed', {
                    component: 'orchestrator',
                    issue_identifier: issue.identifier,
                });
                break;
            case 'approval_auto_approved':
                logger.debug('Auto-approved agent action', {
                    component: 'orchestrator',
                    issue_identifier: issue.identifier,
                });
                break;
        }
    }

    private async syncRunStarted(issue: Issue, attempt: number | null) {
        const lines = [
            'Symphony marker: agent started.',
            `Issue: ${issue.identifier}`,
            `Attempt: ${attempt ?? 0}`,
            `Started at: ${new Date().toISOString()}`,
        ];
        await this.safeTrackerComment(issue.id, lines.join('\n'));

        if (this.config.tracker.kind === 'linear' && this.config.tracker.agent_started_state) {
            await this.safeTrackerState(issue.id, this.config.tracker.agent_started_state);
        }
    }

    private async syncRunFinished(
        issue: Issue,
        status: 'succeeded' | 'failed',
        runtimeSeconds: number,
        error?: string,
    ) {
        const lines = [
            `Symphony marker: agent ${status === 'succeeded' ? 'done' : 'failed'}.`,
            `Issue: ${issue.identifier}`,
            `Finished at: ${new Date().toISOString()}`,
            `Runtime: ${runtimeSeconds.toFixed(1)}s`,
        ];

        if (error) {
            lines.push(`Error: ${truncate(error, 600)}`);
        }

        await this.safeTrackerComment(issue.id, lines.join('\n'));

        if (this.config.tracker.kind === 'linear') {
            const stateName = status === 'succeeded'
                ? this.config.tracker.agent_done_state
                : this.config.tracker.agent_failed_state;
            if (stateName) {
                await this.safeTrackerState(issue.id, stateName);
            }
        }
    }

    private async safeTrackerComment(issueId: string, body: string) {
        try {
            await this.tracker.postComment(issueId, body);
        } catch (err) {
            logger.warn(`Tracker comment sync failed: ${err}`, { component: 'orchestrator', issue_id: issueId });
        }
    }

    private async safeTrackerState(issueId: string, stateName: string) {
        try {
            await this.tracker.setIssueState(issueId, stateName);
        } catch (err) {
            logger.warn(`Tracker state sync failed (${stateName}): ${err}`, { component: 'orchestrator', issue_id: issueId });
        }
    }

    private scheduleRetry(issue: Issue, attempt: number, delayMs: number) {
        const existing = this.state.retry_attempts.get(issue.id);
        if (existing?.timer_handle) {
            clearTimeout(existing.timer_handle);
        }

        logger.info(`Scheduling retry #${attempt} for ${issue.identifier} in ${delayMs}ms`, {
            component: 'orchestrator',
            issue_identifier: issue.identifier,
        });

        const timer = setTimeout(async () => {
            if (this.shutdownRequested) return;
            this.state.retry_attempts.delete(issue.id);

            try {
                const current = await this.tracker.fetchIssueById(issue.id);
                if (!current) {
                    this.release(issue.id);
                    return;
                }

                if (isActiveIssue(this.config, current) && !isTerminalIssue(this.config, current)) {
                    await this.dispatch(current, attempt);
                } else {
                    this.release(issue.id);
                }
            } catch (err) {
                logger.error(`Retry check failed for ${issue.identifier}: ${err}`, {
                    component: 'orchestrator',
                    issue_identifier: issue.identifier,
                });
                this.release(issue.id);
            }
        }, delayMs);

        const retryEntry: RetryEntry = {
            issue_id: issue.id,
            identifier: issue.identifier,
            attempt,
            due_at_ms: Date.now() + delayMs,
            timer_handle: timer,
            error: null,
        };

        this.state.retry_attempts.set(issue.id, retryEntry);
    }

    private release(issueId: string) {
        this.state.claimed.delete(issueId);
        this.state.running.delete(issueId);
        this.state.completed.add(issueId);

        const retry = this.state.retry_attempts.get(issueId);
        if (retry?.timer_handle) {
            clearTimeout(retry.timer_handle);
        }
        this.state.retry_attempts.delete(issueId);
    }

    private logStatus() {
        logger.status({
            running: this.state.running.size,
            claimed: this.state.claimed.size,
            retrying: this.state.retry_attempts.size,
            completed: this.state.completed.size,
            tokens: this.state.totals.total_tokens,
        });
    }

    getStateSnapshot() {
        return {
            running: Array.from(this.state.running.entries()).map(([id, entry]) => ({
                issue_id: id,
                identifier: entry.issue.identifier,
                title: entry.issue.title,
                status: entry.run.status,
                started_at: entry.run.started_at.toISOString(),
                session: entry.session
                    ? {
                        turn_count: entry.session.turn_count,
                        total_tokens: entry.session.total_tokens,
                        last_event: entry.session.last_event,
                    }
                    : null,
            })),
            retry_queue: Array.from(this.state.retry_attempts.values()).map((r) => ({
                issue_id: r.issue_id,
                identifier: r.identifier,
                attempt: r.attempt,
                due_in_ms: Math.max(0, r.due_at_ms - Date.now()),
            })),
            totals: this.state.totals,
            config: {
                poll_interval_ms: this.state.poll_interval_ms,
                max_concurrent_agents: this.state.max_concurrent_agents,
            },
        };
    }
}

function createTracker(config: ServiceConfig): TrackerClient {
    if (config.tracker.kind === 'linear') {
        return new LinearTracker(config.tracker);
    }
    return new GitHubTracker(config.tracker);
}

function describeTracker(config: ServiceConfig): string {
    if (config.tracker.kind === 'linear') {
        const scope = config.tracker.project_slug
            ? `${config.tracker.team_key}/${config.tracker.project_slug}`
            : config.tracker.team_key;
        return `Tracker: linear (${scope})`;
    }
    return `Tracker: github (${config.tracker.owner}/${config.tracker.repo})`;
}

function getActiveStates(config: ServiceConfig): string[] {
    const tracker = config.tracker;
    return tracker.kind === 'linear' ? tracker.active_states : tracker.active_labels;
}

function isTerminalIssue(config: ServiceConfig, issue: Issue): boolean {
    const tracker = config.tracker;
    if (tracker.kind === 'linear') {
        return tracker.terminal_states.some((state) => sameName(state, issue.state));
    }
    return issue.state === 'Done' || issue.labels.some((label) => tracker.terminal_labels.includes(label));
}

function isActiveIssue(config: ServiceConfig, issue: Issue): boolean {
    const tracker = config.tracker;
    if (tracker.kind === 'linear') {
        return tracker.active_states.some((state) => sameName(state, issue.state));
    }
    return issue.labels.some((label) => tracker.active_labels.includes(label));
}

function sameName(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function truncate(value: string, maxLength: number): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}
