/**
 * Agent Runner — SPEC.md §10
 * Launches Codex app-server as subprocess, speaks JSON-RPC over stdio
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { platform } from 'node:os';
import { createInterface } from 'node:readline';
import logger from './logger.js';
import type { CodexConfig, Issue, AgentEvent, AgentEventType, LiveSession } from './types.js';

// ---------------------------------------------------------------------------
// Agent Runner
// ---------------------------------------------------------------------------

export class AgentRunner {
    private config: CodexConfig;
    private process: ChildProcess | null = null;
    private session: LiveSession | null = null;
    private abortController: AbortController;

    constructor(config: CodexConfig, abortController: AbortController) {
        this.config = config;
        this.abortController = abortController;
    }

    /** Update config (for live reload) */
    updateConfig(config: CodexConfig) {
        this.config = config;
    }

    /**
     * Run a full agent session for an issue
     * Returns when agent completes all turns or is aborted
     */
    async runSession(
        workspacePath: string,
        prompt: string,
        issue: Issue,
        maxTurns: number,
        onEvent: (event: AgentEvent) => void,
    ): Promise<{ success: boolean; error?: string }> {
        const isWindows = platform() === 'win32';

        // Launch the coding agent subprocess (SPEC.md §10.1)
        const command = this.config.command;
        logger.info(`Launching agent: ${command}`, {
            component: 'agent-runner',
            issue_identifier: issue.identifier,
            workspace_path: workspacePath,
        });

        try {
            if (isWindows) {
                this.process = spawn('cmd.exe', ['/c', command], {
                    cwd: workspacePath,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: { ...process.env },
                });
            } else {
                this.process = spawn('bash', ['-lc', command], {
                    cwd: workspacePath,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: { ...process.env },
                });
            }
        } catch (err) {
            const error = `Failed to launch agent: ${err}`;
            onEvent({
                event: 'startup_failed',
                timestamp: new Date(),
                payload: { error },
            });
            return { success: false, error };
        }

        const pid = String(this.process.pid || 'unknown');
        onEvent({
            event: 'session_started',
            timestamp: new Date(),
            agent_pid: pid,
        });

        // Handle abort signal
        const abortHandler = () => {
            logger.info('Aborting agent process...', {
                component: 'agent-runner',
                issue_identifier: issue.identifier,
            });
            this.kill();
        };
        this.abortController.signal.addEventListener('abort', abortHandler);

        try {
            // Perform session startup handshake (SPEC.md §10.2)
            const threadId = await this.performHandshake(workspacePath);
            if (!threadId) {
                return { success: false, error: 'Handshake failed: no thread_id received' };
            }

            this.session = {
                session_id: '',
                thread_id: threadId,
                turn_id: '',
                agent_pid: pid,
                last_event: null,
                last_timestamp: null,
                last_message: '',
                input_tokens: 0,
                output_tokens: 0,
                total_tokens: 0,
                turn_count: 0,
            };

            // Multi-turn loop (SPEC.md §7.1 Important nuance)
            let turnCount = 0;
            let currentPrompt = prompt;

            while (turnCount < maxTurns) {
                if (this.abortController.signal.aborted) {
                    return { success: false, error: 'Aborted by reconciliation' };
                }

                turnCount++;
                this.session.turn_count = turnCount;

                logger.info(`Starting turn ${turnCount}/${maxTurns}`, {
                    component: 'agent-runner',
                    issue_identifier: issue.identifier,
                });

                const turnResult = await this.runTurn(
                    threadId,
                    currentPrompt,
                    workspacePath,
                    issue,
                    onEvent,
                );

                if (!turnResult.success) {
                    return { success: false, error: turnResult.error };
                }

                // After successful turn, use continuation guidance for next turn
                currentPrompt = `Continue working on ${issue.identifier}. Check the current state and resume from where you left off.`;

                // If this is the last allowed turn, stop
                if (turnCount >= maxTurns) {
                    logger.info(`Reached max turns (${maxTurns})`, {
                        component: 'agent-runner',
                        issue_identifier: issue.identifier,
                    });
                    break;
                }
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: String(err) };
        } finally {
            this.abortController.signal.removeEventListener('abort', abortHandler);
            this.kill();
        }
    }

    /**
     * Perform the JSON-RPC session startup handshake (SPEC.md §10.2)
     */
    private async performHandshake(workspacePath: string): Promise<string | null> {
        if (!this.process?.stdin || !this.process?.stdout) return null;

        // 1. Send initialize request
        this.sendMessage({
            id: 1,
            method: 'initialize',
            params: {
                clientInfo: { name: 'symphony-github', version: '1.0' },
                capabilities: {},
            },
        });

        // Wait for initialize response
        const initResponse = await this.readResponse(1, this.config.read_timeout_ms);
        if (!initResponse) {
            logger.error('No response to initialize', { component: 'agent-runner' });
            return null;
        }

        // 2. Send initialized notification
        this.sendMessage({
            method: 'initialized',
            params: {},
        });

        // 3. Send thread/start
        this.sendMessage({
            id: 2,
            method: 'thread/start',
            params: {
                approvalPolicy: this.config.approval_policy,
                sandbox: this.config.thread_sandbox,
                cwd: workspacePath,
            },
        });

        // Wait for thread/start response
        const threadResponse = await this.readResponse(2, this.config.read_timeout_ms);
        if (!threadResponse) {
            logger.error('No response to thread/start', { component: 'agent-runner' });
            return null;
        }

        // Try multiple response shapes for compatibility
        const result = threadResponse.result as Record<string, any> | undefined;
        const threadId =
            result?.thread?.id ||
            result?.threadId ||
            result?.id;

        if (!threadId) {
            logger.error('No thread_id in thread/start response', { component: 'agent-runner' });
            return null;
        }

        return String(threadId);
    }

    /**
     * Run a single turn (SPEC.md §10.3)
     */
    private async runTurn(
        threadId: string,
        prompt: string,
        workspacePath: string,
        issue: Issue,
        onEvent: (event: AgentEvent) => void,
    ): Promise<{ success: boolean; error?: string }> {
        // Send turn/start
        const turnId = Date.now();
        this.sendMessage({
            id: turnId,
            method: 'turn/start',
            params: {
                threadId,
                input: [{ type: 'text', text: prompt }],
                cwd: workspacePath,
                title: `${issue.identifier}: ${issue.title}`,
                approvalPolicy: this.config.approval_policy,
                sandboxPolicy: this.config.turn_sandbox_policy,
            },
        });

        // Stream turn processing — read messages until turn completes
        return new Promise((resolve) => {
            if (!this.process?.stdout) {
                resolve({ success: false, error: 'No stdout' });
                return;
            }

            let resolved = false;
            let stallTimer: ReturnType<typeof setTimeout> | null = null;
            let turnTimer: ReturnType<typeof setTimeout> | null = null;

            const finish = (success: boolean, error?: string) => {
                if (resolved) return;
                resolved = true;
                if (stallTimer) clearTimeout(stallTimer);
                if (turnTimer) clearTimeout(turnTimer);
                resolve({ success, error });
            };

            // Turn timeout
            if (this.config.turn_timeout_ms > 0) {
                turnTimer = setTimeout(() => {
                    onEvent({ event: 'turn_failed', timestamp: new Date(), payload: { reason: 'timeout' } });
                    finish(false, `Turn timed out after ${this.config.turn_timeout_ms}ms`);
                }, this.config.turn_timeout_ms);
            }

            // Stall detection
            const resetStall = () => {
                if (stallTimer) clearTimeout(stallTimer);
                if (this.config.stall_timeout_ms > 0) {
                    stallTimer = setTimeout(() => {
                        onEvent({ event: 'turn_failed', timestamp: new Date(), payload: { reason: 'stall' } });
                        finish(false, `Agent stalled for ${this.config.stall_timeout_ms}ms`);
                    }, this.config.stall_timeout_ms);
                }
            };
            resetStall();

            // Read stdout lines
            const rl = createInterface({ input: this.process!.stdout! });
            rl.on('line', (line) => {
                resetStall();

                try {
                    const msg = JSON.parse(line);

                    // Handle turn completion events
                    if (msg.method === 'turn/completed' || msg.result?.status === 'completed') {
                        const usage = msg.result?.usage || msg.params?.usage;
                        if (usage) {
                            onEvent({
                                event: 'turn_completed',
                                timestamp: new Date(),
                                agent_pid: String(this.process?.pid || ''),
                                usage: {
                                    input_tokens: usage.input_tokens || 0,
                                    output_tokens: usage.output_tokens || 0,
                                    total_tokens: usage.total_tokens || 0,
                                },
                            });
                        } else {
                            onEvent({ event: 'turn_completed', timestamp: new Date() });
                        }
                        finish(true);
                    } else if (msg.method === 'turn/failed' || msg.result?.status === 'failed') {
                        onEvent({
                            event: 'turn_failed',
                            timestamp: new Date(),
                            payload: msg.result || msg.params,
                        });
                        finish(false, msg.result?.error || msg.params?.error || 'Turn failed');
                    } else if (msg.method === 'turn/cancelled') {
                        onEvent({ event: 'turn_cancelled', timestamp: new Date() });
                        finish(false, 'Turn cancelled');
                    } else if (msg.method === 'turn/approval_request' || msg.method === 'approval_request') {
                        // Auto-approve
                        onEvent({ event: 'approval_auto_approved', timestamp: new Date(), payload: msg.params });
                        if (msg.id && this.process?.stdin) {
                            this.sendMessage({
                                id: msg.id,
                                result: { approved: true },
                            });
                        }
                    } else if (msg.method === 'turn/input_required') {
                        onEvent({ event: 'turn_input_required', timestamp: new Date(), payload: msg.params });
                        // In autonomous mode, we can't provide input — this is a blocker
                        finish(false, 'Agent requires user input (autonomous mode)');
                    } else {
                        // Other messages: notifications, status updates, etc.
                        onEvent({
                            event: 'other_message',
                            timestamp: new Date(),
                            payload: msg,
                        });
                    }
                } catch {
                    // Not JSON — ignore (could be stderr leak)
                    logger.debug(`Non-JSON stdout line: ${line.slice(0, 200)}`, {
                        component: 'agent-runner',
                    });
                }
            });

            // Handle process exit
            this.process!.on('exit', (code) => {
                rl.close();
                if (!resolved) {
                    if (code === 0) {
                        finish(true);
                    } else {
                        finish(false, `Agent exited with code ${code}`);
                    }
                }
            });

            this.process!.on('error', (err) => {
                finish(false, `Agent process error: ${err.message}`);
            });
        });
    }

    /**
     * Send a JSON message to the agent via stdin
     */
    private sendMessage(msg: Record<string, unknown>) {
        if (!this.process?.stdin) return;
        const line = JSON.stringify(msg) + '\n';
        this.process.stdin.write(line);
    }

    /**
     * Read a specific response by id (blocking with timeout)
     */
    private readResponse(id: number, timeoutMs: number): Promise<any | null> {
        return new Promise((resolve) => {
            if (!this.process?.stdout) {
                resolve(null);
                return;
            }

            const timer = setTimeout(() => {
                resolve(null);
            }, timeoutMs);

            const rl = createInterface({ input: this.process.stdout });
            rl.on('line', (line) => {
                try {
                    const msg = JSON.parse(line);
                    if (msg.id === id) {
                        clearTimeout(timer);
                        rl.close();
                        resolve(msg);
                    }
                } catch {
                    // Ignore non-JSON lines
                }
            });

            this.process!.on('exit', () => {
                clearTimeout(timer);
                rl.close();
                resolve(null);
            });
        });
    }

    /**
     * Kill the agent process
     */
    kill() {
        if (this.process && !this.process.killed) {
            try {
                this.process.kill('SIGTERM');
                // Force kill after 5 seconds
                setTimeout(() => {
                    if (this.process && !this.process.killed) {
                        this.process.kill('SIGKILL');
                    }
                }, 5000);
            } catch {
                // Process may already be dead
            }
        }
    }

    getSession(): LiveSession | null {
        return this.session;
    }
}
