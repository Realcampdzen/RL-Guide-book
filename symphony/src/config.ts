/**
 * Config Layer — SPEC.md §5-6
 * Parses WORKFLOW.md (YAML front matter + prompt template)
 */

import { readFileSync, watchFile, unwatchFile, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import yaml from 'js-yaml';
import logger from './logger.js';
import type {
    WorkflowDefinition,
    ServiceConfig,
    TrackerConfig,
    HooksConfig,
    AgentConfig,
    CodexConfig,
    GitHubTrackerConfig,
    LinearTrackerConfig,
} from './types.js';

export function parseWorkflowFile(filePath: string): WorkflowDefinition {
    const absPath = resolve(filePath);
    if (!existsSync(absPath)) {
        throw new Error(`missing_workflow_file: ${absPath}`);
    }

    const raw = readFileSync(absPath, 'utf-8');
    return parseWorkflowContent(raw);
}

export function parseWorkflowContent(raw: string): WorkflowDefinition {
    let config: Record<string, unknown> = {};
    let prompt_template = raw.trim();

    if (raw.startsWith('---')) {
        const secondDash = raw.indexOf('---', 3);
        if (secondDash === -1) {
            throw new Error('workflow_parse_error: unclosed front matter (missing closing ---)');
        }

        const frontMatter = raw.slice(3, secondDash).trim();
        const body = raw.slice(secondDash + 3).trim();

        if (frontMatter) {
            const parsed = yaml.load(frontMatter);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                config = parsed as Record<string, unknown>;
            } else if (parsed !== null && parsed !== undefined) {
                throw new Error('workflow_front_matter_not_a_map: front matter must be a YAML map/object');
            }
        }

        prompt_template = body;
    }

    return { config, prompt_template };
}

function resolveEnvValue(value: string): string {
    if (value.startsWith('$')) {
        const varName = value.slice(1);
        return process.env[varName] || '';
    }
    return value;
}

function expandPath(value: string): string {
    if (value.startsWith('~')) {
        return value.replace('~', homedir());
    }
    if (value.startsWith('$')) {
        const resolved = resolveEnvValue(value);
        if (resolved.startsWith('~')) {
            return resolved.replace('~', homedir());
        }
        return resolved;
    }
    return value;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
        if (current && typeof current === 'object' && !Array.isArray(current)) {
            current = (current as Record<string, unknown>)[part];
        } else {
            return undefined;
        }
    }
    return current;
}

function asStringList(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
    return [];
}

function asInt(value: unknown, defaultVal: number): number {
    if (value === undefined || value === null) return defaultVal;
    const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
    return isNaN(n) ? defaultVal : n;
}

function asString(value: unknown, defaultVal: string): string {
    if (value === undefined || value === null) return defaultVal;
    return String(value);
}

function asNullableString(value: unknown): string | null {
    const normalized = asString(value, '').trim();
    return normalized ? normalized : null;
}

const DEFAULT_LABEL_STATE_MAP: Record<string, string> = {
    todo: 'Todo',
    'in-progress': 'In Progress',
    'human-review': 'Human Review',
    rework: 'Rework',
    merging: 'Merging',
    done: 'Done',
};

const DEFAULT_LINEAR_ACTIVE_STATES = ['Todo', 'In Progress'];
const DEFAULT_LINEAR_TERMINAL_STATES = ['Done', 'Canceled', 'Cancelled', 'Duplicate'];

function buildTrackerConfig(c: Record<string, unknown>): TrackerConfig {
    const trackerKind = asString(getNestedValue(c, 'tracker.kind'), 'linear').toLowerCase();

    if (trackerKind === 'github') {
        const rawToken = asString(getNestedValue(c, 'tracker.token'), '$GITHUB_TOKEN');
        const customMap = getNestedValue(c, 'tracker.label_state_map') as Record<string, string> | undefined;
        const labelStateMap = customMap && typeof customMap === 'object'
            ? { ...DEFAULT_LABEL_STATE_MAP, ...customMap }
            : { ...DEFAULT_LABEL_STATE_MAP };

        const tracker: GitHubTrackerConfig = {
            kind: 'github',
            owner: asString(getNestedValue(c, 'tracker.owner'), ''),
            repo: asString(getNestedValue(c, 'tracker.repo'), ''),
            token: resolveEnvValue(rawToken),
            active_labels: asStringList(getNestedValue(c, 'tracker.active_labels')).length > 0
                ? asStringList(getNestedValue(c, 'tracker.active_labels'))
                : ['todo', 'in-progress'],
            terminal_labels: asStringList(getNestedValue(c, 'tracker.terminal_labels')).length > 0
                ? asStringList(getNestedValue(c, 'tracker.terminal_labels'))
                : ['done'],
            label_state_map: labelStateMap,
        };

        return tracker;
    }

    if (trackerKind !== 'linear') {
        logger.warn(`Unsupported tracker.kind "${trackerKind}", falling back to "linear"`, { component: 'config' });
    }

    const rawApiKey = asString(getNestedValue(c, 'tracker.api_key'), '$LINEAR_API_KEY');
    const tracker: LinearTrackerConfig = {
        kind: 'linear',
        api_key: resolveEnvValue(rawApiKey),
        team_key: asString(getNestedValue(c, 'tracker.team_key'), ''),
        project_slug: asNullableString(getNestedValue(c, 'tracker.project_slug')),
        active_states: asStringList(getNestedValue(c, 'tracker.active_states')).length > 0
            ? asStringList(getNestedValue(c, 'tracker.active_states'))
            : DEFAULT_LINEAR_ACTIVE_STATES,
        terminal_states: asStringList(getNestedValue(c, 'tracker.terminal_states')).length > 0
            ? asStringList(getNestedValue(c, 'tracker.terminal_states'))
            : DEFAULT_LINEAR_TERMINAL_STATES,
        agent_started_state: asNullableString(getNestedValue(c, 'tracker.agent_started_state')) || 'In Progress',
        agent_done_state: asNullableString(getNestedValue(c, 'tracker.agent_done_state')) || 'In Review',
        agent_failed_state: asNullableString(getNestedValue(c, 'tracker.agent_failed_state')) || 'Todo',
    };

    return tracker;
}

export function buildServiceConfig(workflow: WorkflowDefinition): ServiceConfig {
    const c = workflow.config;
    const tracker = buildTrackerConfig(c);

    const hooks: HooksConfig = {
        after_create: getNestedValue(c, 'hooks.after_create') as string | null ?? null,
        before_run: getNestedValue(c, 'hooks.before_run') as string | null ?? null,
        after_run: getNestedValue(c, 'hooks.after_run') as string | null ?? null,
        before_remove: getNestedValue(c, 'hooks.before_remove') as string | null ?? null,
        timeout_ms: asInt(getNestedValue(c, 'hooks.timeout_ms'), 60000),
    };
    if (hooks.timeout_ms <= 0) hooks.timeout_ms = 60000;

    const agent: AgentConfig = {
        max_concurrent_agents: asInt(getNestedValue(c, 'agent.max_concurrent_agents'), 10),
        max_turns: asInt(getNestedValue(c, 'agent.max_turns'), 20),
        max_retry_backoff_ms: asInt(getNestedValue(c, 'agent.max_retry_backoff_ms'), 300000),
    };

    const turnSandboxPolicy = getNestedValue(c, 'codex.turn_sandbox_policy');
    const codex: CodexConfig = {
        command: asString(getNestedValue(c, 'codex.command'), 'codex app-server'),
        approval_policy: asString(getNestedValue(c, 'codex.approval_policy'), 'never'),
        thread_sandbox: asString(getNestedValue(c, 'codex.thread_sandbox'), 'workspace-write'),
        turn_sandbox_policy: (turnSandboxPolicy && typeof turnSandboxPolicy === 'object')
            ? turnSandboxPolicy as Record<string, unknown>
            : { type: 'workspaceWrite' },
        turn_timeout_ms: asInt(getNestedValue(c, 'codex.turn_timeout_ms'), 3600000),
        read_timeout_ms: asInt(getNestedValue(c, 'codex.read_timeout_ms'), 5000),
        stall_timeout_ms: asInt(getNestedValue(c, 'codex.stall_timeout_ms'), 300000),
    };

    const rawRoot = asString(getNestedValue(c, 'workspace.root'), '');
    const workspaceRoot = rawRoot
        ? expandPath(rawRoot)
        : resolve(tmpdir(), 'symphony_workspaces');

    return {
        tracker,
        polling: {
            interval_ms: asInt(getNestedValue(c, 'polling.interval_ms'), 30000),
        },
        workspace: {
            root: workspaceRoot,
        },
        hooks,
        agent,
        codex,
    };
}

export interface ValidationError {
    field: string;
    message: string;
}

export function validateConfig(config: ServiceConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    if (config.tracker.kind === 'github') {
        if (!config.tracker.owner) {
            errors.push({ field: 'tracker.owner', message: 'Required: GitHub repo owner' });
        }
        if (!config.tracker.repo) {
            errors.push({ field: 'tracker.repo', message: 'Required: GitHub repo name' });
        }
        if (!config.tracker.token) {
            errors.push({ field: 'tracker.token', message: 'Required: GitHub token ($GITHUB_TOKEN or explicit)' });
        }
    } else {
        if (!config.tracker.api_key) {
            errors.push({ field: 'tracker.api_key', message: 'Required: Linear API key ($LINEAR_API_KEY or explicit)' });
        }
        if (!config.tracker.team_key) {
            errors.push({ field: 'tracker.team_key', message: 'Required: Linear team key (for example PUT)' });
        }
    }

    if (!config.codex.command) {
        errors.push({ field: 'codex.command', message: 'Required: codex command must be non-empty' });
    }

    return errors;
}

export function watchWorkflowFile(
    filePath: string,
    onReload: (workflow: WorkflowDefinition, config: ServiceConfig) => void,
): () => void {
    const absPath = resolve(filePath);

    const handler = () => {
        try {
            logger.info('WORKFLOW.md changed, reloading...', { component: 'config' });
            const workflow = parseWorkflowFile(absPath);
            const config = buildServiceConfig(workflow);
            const errors = validateConfig(config);
            if (errors.length > 0) {
                logger.error(`Config validation failed after reload: ${errors.map(e => `${e.field}: ${e.message}`).join('; ')}`, { component: 'config' });
                return;
            }
            onReload(workflow, config);
            logger.info('WORKFLOW.md reloaded successfully', { component: 'config' });
        } catch (err) {
            logger.error(`Failed to reload WORKFLOW.md: ${err}`, { component: 'config' });
        }
    };

    watchFile(absPath, { interval: 2000 }, handler);

    return () => {
        unwatchFile(absPath, handler);
    };
}

