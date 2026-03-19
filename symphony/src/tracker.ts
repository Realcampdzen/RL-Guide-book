/**
 * GitHub Issues Tracker Client — fallback tracker implementation.
 */

import { Octokit } from '@octokit/rest';
import logger from './logger.js';
import type { Issue, GitHubTrackerConfig, TrackerClient, TrackerConfig } from './types.js';

export class GitHubTracker implements TrackerClient {
    private octokit: Octokit;
    private owner: string;
    private repo: string;
    private activeLabels: string[];
    private terminalLabels: string[];
    private labelStateMap: Record<string, string>;

    constructor(config: GitHubTrackerConfig) {
        this.octokit = new Octokit({ auth: config.token });
        this.owner = config.owner;
        this.repo = config.repo;
        this.activeLabels = config.active_labels.map((l) => l.toLowerCase());
        this.terminalLabels = config.terminal_labels.map((l) => l.toLowerCase());
        this.labelStateMap = config.label_state_map;
    }

    updateConfig(config: TrackerConfig) {
        if (config.kind !== 'github') {
            throw new Error('GitHubTracker received non-github config');
        }

        this.owner = config.owner;
        this.repo = config.repo;
        this.activeLabels = config.active_labels.map((l) => l.toLowerCase());
        this.terminalLabels = config.terminal_labels.map((l) => l.toLowerCase());
        this.labelStateMap = config.label_state_map;
        if (config.token) {
            this.octokit = new Octokit({ auth: config.token });
        }
    }

    private normalizeIssue(ghIssue: GHIssuePayload): Issue {
        const labels = (ghIssue.labels || [])
            .map((l) => (typeof l === 'string' ? l : (l as GHLabel).name || ''))
            .filter(Boolean)
            .map((l) => l.toLowerCase());

        let state = 'Unknown';
        for (const label of labels) {
            if (this.labelStateMap[label]) {
                state = this.labelStateMap[label];
                break;
            }
        }

        if (ghIssue.state === 'closed') {
            state = 'Done';
        }

        let priority: number | null = null;
        for (const label of labels) {
            const match = label.match(/^(?:priority[:\-]?|p)(\d+)$/);
            if (match) {
                priority = parseInt(match[1], 10);
                break;
            }
        }

        return {
            id: String(ghIssue.number),
            identifier: `#${ghIssue.number}`,
            title: ghIssue.title || '',
            description: ghIssue.body || null,
            priority,
            state,
            branch_name: null,
            url: ghIssue.html_url || null,
            labels,
            blocked_by: [],
            created_at: ghIssue.created_at || null,
            updated_at: ghIssue.updated_at || null,
        };
    }

    async fetchCandidateIssues(): Promise<Issue[]> {
        const allIssues: Issue[] = [];

        try {
            for (const label of this.activeLabels) {
                const response = await this.octokit.issues.listForRepo({
                    owner: this.owner,
                    repo: this.repo,
                    labels: label,
                    state: 'open',
                    per_page: 100,
                    sort: 'created',
                    direction: 'asc',
                });

                for (const ghIssue of response.data) {
                    if (ghIssue.pull_request) continue;

                    const issue = this.normalizeIssue(ghIssue as GHIssuePayload);
                    if (!allIssues.some((i) => i.id === issue.id)) {
                        allIssues.push(issue);
                    }
                }
            }

            allIssues.sort((a, b) => {
                const pa = a.priority ?? 999;
                const pb = b.priority ?? 999;
                if (pa !== pb) return pa - pb;
                return (a.created_at || '') < (b.created_at || '') ? -1 : 1;
            });

            logger.debug(`Fetched ${allIssues.length} candidate issue(s)`, {
                component: 'tracker',
            });
        } catch (err) {
            logger.error(`Failed to fetch candidate issues: ${err}`, {
                component: 'tracker',
            });
            throw err;
        }

        return allIssues;
    }

    async fetchIssueById(issueNumber: string): Promise<Issue | null> {
        try {
            const response = await this.octokit.issues.get({
                owner: this.owner,
                repo: this.repo,
                issue_number: parseInt(issueNumber, 10),
            });

            if (response.data.pull_request) return null;
            return this.normalizeIssue(response.data as GHIssuePayload);
        } catch (err: unknown) {
            const httpErr = err as { status?: number };
            if (httpErr.status === 404) return null;
            logger.error(`Failed to fetch issue #${issueNumber}: ${err}`, {
                component: 'tracker',
                issue_id: issueNumber,
            });
            throw err;
        }
    }

    async fetchTerminalIssues(): Promise<Issue[]> {
        try {
            const response = await this.octokit.issues.listForRepo({
                owner: this.owner,
                repo: this.repo,
                state: 'closed',
                per_page: 50,
                sort: 'updated',
                direction: 'desc',
            });

            return response.data
                .filter((i) => !i.pull_request)
                .map((i) => this.normalizeIssue(i as GHIssuePayload));
        } catch (err) {
            logger.error(`Failed to fetch terminal issues: ${err}`, { component: 'tracker' });
            return [];
        }
    }

    async postComment(issueId: string, body: string): Promise<void> {
        try {
            await this.octokit.issues.createComment({
                owner: this.owner,
                repo: this.repo,
                issue_number: parseInt(issueId, 10),
                body,
            });
        } catch (err) {
            logger.error(`Failed to post comment on #${issueId}: ${err}`, {
                component: 'tracker',
                issue_id: issueId,
            });
        }
    }

    async setIssueState(): Promise<void> {
        // GitHub fallback tracker does not implement status transitions.
    }
}

interface GHLabel {
    name?: string;
    [key: string]: unknown;
}

interface GHIssuePayload {
    number: number;
    title?: string;
    body?: string | null;
    state?: string;
    html_url?: string;
    labels?: (GHLabel | string)[];
    pull_request?: unknown;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}
