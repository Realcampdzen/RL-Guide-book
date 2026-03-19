/**
 * Linear Tracker Client — minimal GraphQL integration for Symphony.
 */

import logger from './logger.js';
import type { Issue, LinearTrackerConfig, TrackerClient, TrackerConfig } from './types.js';

interface LinearIssueNode {
    id: string;
    identifier?: string | null;
    title?: string | null;
    description?: string | null;
    priority?: number | null;
    branchName?: string | null;
    url?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    team?: { key?: string | null } | null;
    state?: { name?: string | null } | null;
    labels?: { nodes?: Array<{ name?: string | null }> | null } | null;
    project?: { slugId?: string | null } | null;
}

interface LinearStateNode {
    id: string;
    name?: string | null;
}

interface GraphQLResponse<T> {
    data?: T;
    errors?: Array<{ message?: string }>;
}

const ISSUE_FIELDS = `
    id
    identifier
    title
    description
    priority
    branchName
    url
    createdAt
    updatedAt
    team { key }
    state { name }
    project { slugId }
    labels(first: 20) { nodes { name } }
`;

const TEAM_ISSUES_QUERY = `
query SymphonyTeamIssues($teamKey: String!) {
  teams(filter: { key: { eq: $teamKey } }) {
    nodes {
      issues(first: 100) {
        nodes {
          ${ISSUE_FIELDS}
        }
      }
    }
  }
}`;

const PROJECT_ISSUES_QUERY = `
query SymphonyProjectIssues($projectSlug: String!) {
  projects(filter: { slugId: { eq: $projectSlug } }) {
    nodes {
      issues(first: 100) {
        nodes {
          ${ISSUE_FIELDS}
        }
      }
    }
  }
}`;

const ISSUE_BY_ID_QUERY = `
query SymphonyIssueById($id: String!) {
  issue(id: $id) {
    ${ISSUE_FIELDS}
  }
}`;

const TEAM_STATES_QUERY = `
query SymphonyTeamStates($teamKey: String!) {
  teams(filter: { key: { eq: $teamKey } }) {
    nodes {
      states {
        nodes {
          id
          name
        }
      }
    }
  }
}`;

const CREATE_COMMENT_MUTATION = `
mutation SymphonyCommentCreate($issueId: String!, $body: String!) {
  commentCreate(input: { issueId: $issueId, body: $body }) {
    success
  }
}`;

const UPDATE_ISSUE_STATE_MUTATION = `
mutation SymphonyIssueUpdate($issueId: String!, $stateId: String!) {
  issueUpdate(id: $issueId, input: { stateId: $stateId }) {
    success
  }
}`;

export class LinearTracker implements TrackerClient {
    private apiKey: string;
    private teamKey: string;
    private projectSlug: string | null;
    private activeStates: string[];
    private terminalStates: string[];
    private stateIdByName: Map<string, string> = new Map();

    constructor(config: LinearTrackerConfig) {
        this.apiKey = config.api_key;
        this.teamKey = config.team_key;
        this.projectSlug = config.project_slug;
        this.activeStates = config.active_states.map(normalizeName);
        this.terminalStates = config.terminal_states.map(normalizeName);
    }

    updateConfig(config: TrackerConfig): void {
        if (config.kind !== 'linear') {
            throw new Error('LinearTracker received non-linear config');
        }
        this.apiKey = config.api_key;
        this.teamKey = config.team_key;
        this.projectSlug = config.project_slug;
        this.activeStates = config.active_states.map(normalizeName);
        this.terminalStates = config.terminal_states.map(normalizeName);
        this.stateIdByName.clear();
    }

    async fetchCandidateIssues(): Promise<Issue[]> {
        const nodes = await this.fetchScopedIssues();
        return nodes
            .filter((issue) => this.matchesScope(issue))
            .map((issue) => this.normalizeIssue(issue))
            .filter((issue) => this.activeStates.includes(normalizeName(issue.state)))
            .sort(sortIssues);
    }

    async fetchIssueById(issueId: string): Promise<Issue | null> {
        const response = await this.graphql<{ issue: LinearIssueNode | null }>(ISSUE_BY_ID_QUERY, { id: issueId });
        const node = response.issue;
        if (!node || !this.matchesScope(node)) {
            return null;
        }
        return this.normalizeIssue(node);
    }

    async fetchTerminalIssues(): Promise<Issue[]> {
        const nodes = await this.fetchScopedIssues();
        return nodes
            .filter((issue) => this.matchesScope(issue))
            .map((issue) => this.normalizeIssue(issue))
            .filter((issue) => this.terminalStates.includes(normalizeName(issue.state)))
            .sort(sortIssues);
    }

    async postComment(issueId: string, body: string): Promise<void> {
        await this.graphql(CREATE_COMMENT_MUTATION, { issueId, body });
    }

    async setIssueState(issueId: string, stateName: string): Promise<void> {
        const normalized = normalizeName(stateName);
        if (!normalized) {
            return;
        }

        const stateId = await this.resolveStateId(stateName);
        if (!stateId) {
            throw new Error(`Linear state not found: ${stateName}`);
        }

        await this.graphql(UPDATE_ISSUE_STATE_MUTATION, { issueId, stateId });
    }

    private async resolveStateId(stateName: string): Promise<string | null> {
        const normalized = normalizeName(stateName);
        if (this.stateIdByName.has(normalized)) {
            return this.stateIdByName.get(normalized) || null;
        }

        const response = await this.graphql<{ teams?: { nodes?: Array<{ states?: { nodes?: LinearStateNode[] } | null }> | null } | null }>(
            TEAM_STATES_QUERY,
            { teamKey: this.teamKey },
        );
        const nodes = response.teams?.nodes?.[0]?.states?.nodes || [];
        for (const state of nodes) {
            const name = normalizeName(state.name || '');
            if (name && state.id) {
                this.stateIdByName.set(name, state.id);
            }
        }

        return this.stateIdByName.get(normalized) || null;
    }

    private async fetchScopedIssues(): Promise<LinearIssueNode[]> {
        if (this.projectSlug) {
            const response = await this.graphql<{ projects?: { nodes?: Array<{ issues?: { nodes?: LinearIssueNode[] } | null }> | null } | null }>(
                PROJECT_ISSUES_QUERY,
                { projectSlug: this.projectSlug },
            );
            const project = response.projects?.nodes?.[0];
            return project?.issues?.nodes || [];
        }

        const response = await this.graphql<{ teams?: { nodes?: Array<{ issues?: { nodes?: LinearIssueNode[] } | null }> | null } | null }>(
            TEAM_ISSUES_QUERY,
            { teamKey: this.teamKey },
        );
        const team = response.teams?.nodes?.[0];
        return team?.issues?.nodes || [];
    }

    private matchesScope(issue: LinearIssueNode): boolean {
        if (this.teamKey) {
            const issueTeam = normalizeName(issue.team?.key || '');
            if (issueTeam !== normalizeName(this.teamKey)) {
                return false;
            }
        }

        if (this.projectSlug) {
            const issueProject = normalizeName(issue.project?.slugId || '');
            if (issueProject !== normalizeName(this.projectSlug)) {
                return false;
            }
        }

        return true;
    }

    private normalizeIssue(node: LinearIssueNode): Issue {
        const labels = (node.labels?.nodes || [])
            .map((label) => (label?.name || '').trim())
            .filter(Boolean);

        return {
            id: node.id,
            identifier: node.identifier || `${node.team?.key || this.teamKey}-${node.id}`,
            title: node.title || '',
            description: node.description || null,
            priority: typeof node.priority === 'number' ? node.priority : null,
            state: node.state?.name || 'Unknown',
            branch_name: node.branchName || null,
            url: node.url || null,
            labels,
            blocked_by: [],
            created_at: node.createdAt || null,
            updated_at: node.updatedAt || null,
        };
    }

    private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
        const response = await fetch('https://api.linear.app/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: this.apiKey,
            },
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Linear API error ${response.status}: ${text}`);
        }

        const payload = await response.json() as GraphQLResponse<T>;
        if (payload.errors?.length) {
            const message = payload.errors.map((error) => error.message || 'Unknown GraphQL error').join('; ');
            logger.error(`Linear GraphQL error: ${message}`, { component: 'tracker' });
            throw new Error(message);
        }

        if (!payload.data) {
            throw new Error('Linear API returned no data');
        }

        return payload.data;
    }
}

function normalizeName(value: string): string {
    return value.trim().toLowerCase();
}

function sortIssues(a: Issue, b: Issue): number {
    const pa = a.priority ?? 999;
    const pb = b.priority ?? 999;
    if (pa !== pb) {
        return pa - pb;
    }

    const ca = a.created_at || '';
    const cb = b.created_at || '';
    if (ca === cb) {
        return 0;
    }
    return ca < cb ? -1 : 1;
}
