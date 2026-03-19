/**
 * Workspace Manager — SPEC.md §9
 * Creates and manages isolated per-issue workspace directories
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, normalize } from 'node:path';
import { exec } from 'node:child_process';
import { platform } from 'node:os';
import logger from './logger.js';
import type { Workspace, Issue, HooksConfig } from './types.js';

// ---------------------------------------------------------------------------
// Workspace key sanitization (SPEC.md §4.2)
// ---------------------------------------------------------------------------

export function sanitizeWorkspaceKey(identifier: string): string {
    // Replace # prefix and any char not in [A-Za-z0-9._-] with _
    return identifier.replace(/^#/, '').replace(/[^A-Za-z0-9._-]/g, '_');
}

// ---------------------------------------------------------------------------
// Workspace path safety (SPEC.md §9.5)
// ---------------------------------------------------------------------------

function validateWorkspacePath(workspacePath: string, workspaceRoot: string): boolean {
    const normalizedPath = normalize(resolve(workspacePath));
    const normalizedRoot = normalize(resolve(workspaceRoot));
    return normalizedPath.startsWith(normalizedRoot);
}

// ---------------------------------------------------------------------------
// Hook execution
// ---------------------------------------------------------------------------

function runHookScript(
    script: string,
    cwd: string,
    timeoutMs: number,
    hookName: string,
): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        // Use appropriate shell for the platform
        const isWindows = platform() === 'win32';
        const shell = isWindows ? 'cmd.exe' : 'bash';
        const shellArgs = isWindows ? ['/c', script] : ['-lc', script];

        logger.debug(`Running hook "${hookName}"...`, { component: 'workspace' });

        const child = exec(
            isWindows ? script : `bash -lc ${JSON.stringify(script)}`,
            {
                cwd,
                timeout: timeoutMs,
                env: { ...process.env },
                shell: isWindows ? 'cmd.exe' : '/bin/bash',
            },
            (error, stdout, stderr) => {
                if (error) {
                    logger.error(`Hook "${hookName}" failed: ${error.message}`, {
                        component: 'workspace',
                    });
                    reject(error);
                } else {
                    if (stdout.trim()) {
                        logger.debug(`Hook "${hookName}" stdout: ${stdout.trim().slice(0, 500)}`, {
                            component: 'workspace',
                        });
                    }
                    resolve({ stdout, stderr });
                }
            },
        );
    });
}

// ---------------------------------------------------------------------------
// Workspace Manager
// ---------------------------------------------------------------------------

export class WorkspaceManager {
    private root: string;
    private hooks: HooksConfig;

    constructor(root: string, hooks: HooksConfig) {
        this.root = resolve(root);
        this.hooks = hooks;
    }

    /** Update hooks config (for live reload) */
    updateConfig(root: string, hooks: HooksConfig) {
        this.root = resolve(root);
        this.hooks = hooks;
    }

    /**
     * Ensure workspace exists for an issue (SPEC.md §9.2)
     */
    async ensureWorkspace(issue: Issue): Promise<Workspace> {
        const key = sanitizeWorkspaceKey(issue.identifier);
        const workspacePath = resolve(this.root, key);

        // Safety: validate path stays inside root
        if (!validateWorkspacePath(workspacePath, this.root)) {
            throw new Error(`Workspace path escapes root: ${workspacePath}`);
        }

        // Ensure root exists
        if (!existsSync(this.root)) {
            mkdirSync(this.root, { recursive: true });
        }

        // Check if workspace already exists
        const createdNow = !existsSync(workspacePath);

        if (createdNow) {
            mkdirSync(workspacePath, { recursive: true });
            logger.info(`Created workspace: ${workspacePath}`, {
                component: 'workspace',
                issue_identifier: issue.identifier,
                workspace_path: workspacePath,
            });

            // Run after_create hook
            if (this.hooks.after_create) {
                try {
                    await runHookScript(
                        this.hooks.after_create,
                        workspacePath,
                        this.hooks.timeout_ms,
                        'after_create',
                    );
                } catch (err) {
                    // after_create failure is fatal — remove partial workspace
                    logger.error(`after_create hook failed, removing workspace: ${err}`, {
                        component: 'workspace',
                        issue_identifier: issue.identifier,
                    });
                    try {
                        rmSync(workspacePath, { recursive: true, force: true });
                    } catch {
                        // Ignore cleanup errors
                    }
                    throw err;
                }
            }
        } else {
            logger.debug(`Reusing workspace: ${workspacePath}`, {
                component: 'workspace',
                issue_identifier: issue.identifier,
            });
        }

        return {
            path: workspacePath,
            workspace_key: key,
            created_now: createdNow,
        };
    }

    /**
     * Run before_run hook
     */
    async runBeforeRunHook(workspace: Workspace, issue: Issue): Promise<void> {
        if (!this.hooks.before_run) return;

        try {
            await runHookScript(
                this.hooks.before_run,
                workspace.path,
                this.hooks.timeout_ms,
                'before_run',
            );
        } catch (err) {
            logger.error(`before_run hook failed: ${err}`, {
                component: 'workspace',
                issue_identifier: issue.identifier,
            });
            throw err; // Fatal to current attempt
        }
    }

    /**
     * Run after_run hook
     */
    async runAfterRunHook(workspace: Workspace, issue: Issue): Promise<void> {
        if (!this.hooks.after_run) return;

        try {
            await runHookScript(
                this.hooks.after_run,
                workspace.path,
                this.hooks.timeout_ms,
                'after_run',
            );
        } catch (err) {
            // after_run failure is logged and ignored
            logger.warn(`after_run hook failed (ignored): ${err}`, {
                component: 'workspace',
                issue_identifier: issue.identifier,
            });
        }
    }

    /**
     * Cleanup workspace for a terminal issue (SPEC.md §9)
     */
    async cleanupWorkspace(issue: Issue): Promise<void> {
        const key = sanitizeWorkspaceKey(issue.identifier);
        const workspacePath = resolve(this.root, key);

        if (!existsSync(workspacePath)) return;

        // Run before_remove hook
        if (this.hooks.before_remove) {
            try {
                await runHookScript(
                    this.hooks.before_remove,
                    workspacePath,
                    this.hooks.timeout_ms,
                    'before_remove',
                );
            } catch (err) {
                // before_remove failure is logged and ignored; cleanup still proceeds
                logger.warn(`before_remove hook failed (ignored): ${err}`, {
                    component: 'workspace',
                    issue_identifier: issue.identifier,
                });
            }
        }

        try {
            rmSync(workspacePath, { recursive: true, force: true });
            logger.info(`Cleaned up workspace: ${workspacePath}`, {
                component: 'workspace',
                issue_identifier: issue.identifier,
            });
        } catch (err) {
            logger.error(`Failed to cleanup workspace: ${err}`, {
                component: 'workspace',
                issue_identifier: issue.identifier,
            });
        }
    }
}
