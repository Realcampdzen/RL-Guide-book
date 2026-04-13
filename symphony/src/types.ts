/**
 * Symphony Domain Model — based on SPEC.md §4
 */

// ---------------------------------------------------------------------------
// Issue (normalized from tracker payloads)
// ---------------------------------------------------------------------------

export interface BlockerRef {
  id: string | null;
  identifier: string | null;
  state: string | null;
}

export interface Issue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number | null;
  state: string;
  branch_name: string | null;
  url: string | null;
  labels: string[];
  blocked_by: BlockerRef[];
  created_at: string | null;
  updated_at: string | null;
}

export interface WorkflowDefinition {
  config: Record<string, unknown>;
  prompt_template: string;
}

export interface GitHubTrackerConfig {
  kind: 'github';
  owner: string;
  repo: string;
  token: string;
  active_labels: string[];
  terminal_labels: string[];
  label_state_map: Record<string, string>;
}

export interface LinearTrackerConfig {
  kind: 'linear';
  api_key: string;
  team_key: string;
  project_slug: string | null;
  active_states: string[];
  terminal_states: string[];
  agent_started_state: string | null;
  agent_done_state: string | null;
  agent_failed_state: string | null;
}

export type TrackerConfig = GitHubTrackerConfig | LinearTrackerConfig;

export interface PollingConfig {
  interval_ms: number;
}

export interface WorkspaceConfig {
  root: string;
}

export interface HooksConfig {
  after_create: string | null;
  before_run: string | null;
  after_run: string | null;
  before_remove: string | null;
  timeout_ms: number;
}

export interface AgentConfig {
  max_concurrent_agents: number;
  max_turns: number;
  max_retry_backoff_ms: number;
}

export interface CodexConfig {
  command: string;
  approval_policy: string;
  thread_sandbox: string;
  turn_sandbox_policy: Record<string, unknown>;
  turn_timeout_ms: number;
  read_timeout_ms: number;
  stall_timeout_ms: number;
}

export interface ServiceConfig {
  tracker: TrackerConfig;
  polling: PollingConfig;
  workspace: WorkspaceConfig;
  hooks: HooksConfig;
  agent: AgentConfig;
  codex: CodexConfig;
}

export interface Workspace {
  path: string;
  workspace_key: string;
  created_now: boolean;
}

export enum RunStatus {
  PreparingWorkspace = 'preparing_workspace',
  BuildingPrompt = 'building_prompt',
  LaunchingAgent = 'launching_agent',
  InitializingSession = 'initializing_session',
  StreamingTurn = 'streaming_turn',
  Finishing = 'finishing',
  Succeeded = 'succeeded',
  Failed = 'failed',
  TimedOut = 'timed_out',
  Stalled = 'stalled',
  Canceled = 'canceled_by_reconciliation',
}

export interface RunAttempt {
  issue_id: string;
  issue_identifier: string;
  attempt: number | null;
  workspace_path: string;
  started_at: Date;
  status: RunStatus;
  error?: string;
}

export interface LiveSession {
  session_id: string;
  thread_id: string;
  turn_id: string;
  agent_pid: string | null;
  last_event: string | null;
  last_timestamp: Date | null;
  last_message: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  turn_count: number;
}

export interface RetryEntry {
  issue_id: string;
  identifier: string;
  attempt: number;
  due_at_ms: number;
  timer_handle: ReturnType<typeof setTimeout> | null;
  error: string | null;
}

export interface RunningEntry {
  issue: Issue;
  run: RunAttempt;
  session: LiveSession | null;
  worker_promise: Promise<void> | null;
  abort_controller: AbortController;
}

export interface OrchestratorState {
  poll_interval_ms: number;
  max_concurrent_agents: number;
  running: Map<string, RunningEntry>;
  claimed: Set<string>;
  retry_attempts: Map<string, RetryEntry>;
  completed: Set<string>;
  totals: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    runtime_seconds: number;
  };
}

export type AgentEventType =
  | 'session_started'
  | 'startup_failed'
  | 'turn_completed'
  | 'turn_failed'
  | 'turn_cancelled'
  | 'turn_input_required'
  | 'approval_auto_approved'
  | 'notification'
  | 'other_message'
  | 'malformed';

export interface AgentEvent {
  event: AgentEventType;
  timestamp: Date;
  agent_pid?: string;
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
  payload?: unknown;
}

export interface TrackerClient {
  updateConfig(config: TrackerConfig): void;
  fetchCandidateIssues(): Promise<Issue[]>;
  fetchIssueById(issueId: string): Promise<Issue | null>;
  fetchTerminalIssues(): Promise<Issue[]>;
  postComment(issueId: string, body: string): Promise<void>;
  setIssueState(issueId: string, stateName: string): Promise<void>;
}
