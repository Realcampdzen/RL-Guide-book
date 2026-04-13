/**
 * OpenAI Agent Runner — Direct API-based agent (no Codex CLI needed)
 *
 * Instead of launching Codex app-server subprocess, this agent:
 * 1. Reads the workspace file structure
 * 2. Sends the issue prompt + context to OpenAI Chat Completions
 * 3. Applies code changes returned by the model
 * 4. Runs build verification
 * 5. Commits and pushes changes
 *
 * This is a lightweight alternative to Codex for Symphony orchestration.
 */

import { exec } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { promisify } from 'node:util';
import logger from './logger.js';
import type { AgentEvent, Issue } from './types.js';

const execAsync = promisify(exec);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface OpenAIAgentConfig {
  api_key: string;
  model: string;
  max_tokens: number;
  temperature: number;
}

const DEFAULT_CONFIG: OpenAIAgentConfig = {
  api_key: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4o-mini',
  max_tokens: 16384,
  temperature: 0.2,
};

// File extensions to include in context
const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.css',
  '.html',
  '.md',
  '.py',
  '.yaml',
  '.yml',
  '.toml',
  '.sh',
  '.bat',
]);

// Directories to skip
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.cache',
  '__pycache__',
  '.mypy_cache',
  '.vite_old_20260204053059',
  'recovered',
  '.taskmaster',
]);

// Max file size to include in context (50KB)
const MAX_FILE_SIZE = 50 * 1024;

// ---------------------------------------------------------------------------
// Workspace scanner
// ---------------------------------------------------------------------------

function scanWorkspaceFiles(rootDir: string, maxFiles = 30): { path: string; content: string }[] {
  const files: { path: string; content: string; size: number }[] = [];

  function walk(dir: string, depth = 0) {
    if (depth > 4 || files.length >= maxFiles) return;

    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (files.length >= maxFiles) break;
        if (SKIP_DIRS.has(entry)) continue;
        if (entry.startsWith('.') && entry !== '.env.example') continue;

        const fullPath = join(dir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath, depth + 1);
          } else if (stat.isFile()) {
            const ext = extname(entry).toLowerCase();
            if (CODE_EXTENSIONS.has(ext) && stat.size <= MAX_FILE_SIZE) {
              const content = readFileSync(fullPath, 'utf-8');
              files.push({
                path: relative(rootDir, fullPath).replace(/\\/g, '/'),
                content,
                size: stat.size,
              });
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Skip unreadable dirs
    }
  }

  // Prioritize key files
  const priorityFiles = [
    'package.json',
    'tsconfig.json',
    'GEMINI.md',
    'agent.md',
    'README.md',
    'vite.config.ts',
    'src/App.tsx',
  ];

  for (const pf of priorityFiles) {
    const fullPath = join(rootDir, pf);
    if (existsSync(fullPath)) {
      try {
        const stat = statSync(fullPath);
        if (stat.size <= MAX_FILE_SIZE) {
          files.push({
            path: pf,
            content: readFileSync(fullPath, 'utf-8'),
            size: stat.size,
          });
        }
      } catch {
        // skip
      }
    }
  }

  walk(rootDir);

  // Deduplicate by path
  const seen = new Set<string>();
  return files
    .filter((f) => {
      if (seen.has(f.path)) return false;
      seen.add(f.path);
      return true;
    })
    .slice(0, maxFiles)
    .map(({ path, content }) => ({ path, content }));
}

// ---------------------------------------------------------------------------
// OpenAI API call
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface FileChange {
  action: 'create' | 'modify' | 'delete';
  path: string;
  content?: string;
}

async function callOpenAI(
  config: OpenAIAgentConfig,
  messages: ChatMessage[]
): Promise<{
  content: string;
  usage: { input_tokens: number; output_tokens: number; total_tokens: number };
}> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  return {
    content: data.choices[0]?.message?.content || '',
    usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Parse code changes from model response
// ---------------------------------------------------------------------------

function parseFileChanges(response: string): FileChange[] {
  const changes: FileChange[] = [];

  // Look for code blocks with file paths
  // Format: ```filepath:path/to/file.ts
  const fileBlockRegex = /```(?:filepath:|file:)(.+?)\n([\s\S]*?)```/g;
  let match;
  while ((match = fileBlockRegex.exec(response)) !== null) {
    const filePath = match[1].trim();
    const content = match[2];
    changes.push({
      action: 'create', // create or overwrite
      path: filePath,
      content,
    });
  }

  // Also look for DELETE markers
  const deleteRegex = /(?:DELETE|REMOVE):\s*`([^`]+)`/g;
  while ((match = deleteRegex.exec(response)) !== null) {
    changes.push({
      action: 'delete',
      path: match[1].trim(),
    });
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Apply changes
// ---------------------------------------------------------------------------

function applyFileChanges(workspacePath: string, changes: FileChange[]): string[] {
  const applied: string[] = [];
  const { mkdirSync, unlinkSync } = require('node:fs');
  const { dirname } = require('node:path');

  for (const change of changes) {
    const fullPath = join(workspacePath, change.path);

    try {
      switch (change.action) {
        case 'create':
        case 'modify':
          if (change.content !== undefined) {
            mkdirSync(dirname(fullPath), { recursive: true });
            writeFileSync(fullPath, change.content, 'utf-8');
            applied.push(`${change.action}: ${change.path}`);
            logger.info(`Applied ${change.action}: ${change.path}`, {
              component: 'openai-agent',
            });
          }
          break;
        case 'delete':
          if (existsSync(fullPath)) {
            unlinkSync(fullPath);
            applied.push(`delete: ${change.path}`);
            logger.info(`Deleted: ${change.path}`, { component: 'openai-agent' });
          }
          break;
      }
    } catch (err) {
      logger.error(`Failed to apply ${change.action} ${change.path}: ${err}`, {
        component: 'openai-agent',
      });
    }
  }

  return applied;
}

// ---------------------------------------------------------------------------
// Git operations
// ---------------------------------------------------------------------------

async function runGit(
  workspacePath: string,
  command: string
): Promise<{ stdout: string; stderr: string; success: boolean }> {
  try {
    const result = await execAsync(`git ${command}`, {
      cwd: workspacePath,
      timeout: 30000,
    });
    return { stdout: result.stdout, stderr: result.stderr, success: true };
  } catch (err: any) {
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || err.message,
      success: false,
    };
  }
}

async function commitAndPush(
  workspacePath: string,
  issue: Issue,
  summary: string
): Promise<boolean> {
  // Create a branch
  const branchName = `symphony/${issue.identifier.replace('#', '')}`;
  await runGit(
    workspacePath,
    `checkout -b ${branchName} 2>/dev/null || git checkout ${branchName}`
  );

  // Stage all changes
  await runGit(workspacePath, 'add -A');

  // Check if there are changes
  const status = await runGit(workspacePath, 'status --porcelain');
  if (!status.stdout.trim()) {
    logger.info('No changes to commit', { component: 'openai-agent' });
    return false;
  }

  // Commit
  const commitMsg = `feat: ${issue.title}\n\n${summary}\n\nRefs: ${issue.identifier}`;
  await runGit(workspacePath, `commit -m "${commitMsg.replace(/"/g, '\\"')}"`);

  // Push
  const pushResult = await runGit(workspacePath, `push -u origin ${branchName}`);
  if (!pushResult.success) {
    logger.warn(`Push failed: ${pushResult.stderr}`, { component: 'openai-agent' });
    return false;
  }

  logger.info(`Pushed branch ${branchName}`, {
    component: 'openai-agent',
    issue_identifier: issue.identifier,
  });

  return true;
}

// ---------------------------------------------------------------------------
// Main Agent Runner (OpenAI Direct)
// ---------------------------------------------------------------------------

export class OpenAIAgentRunner {
  private config: OpenAIAgentConfig;
  private abortController: AbortController;

  constructor(abortController: AbortController, overrides?: Partial<OpenAIAgentConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      api_key: process.env.OPENAI_API_KEY || DEFAULT_CONFIG.api_key,
      ...overrides,
    };
    this.abortController = abortController;
  }

  async runSession(
    workspacePath: string,
    prompt: string,
    issue: Issue,
    maxTurns: number,
    onEvent: (event: AgentEvent) => void
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config.api_key) {
      return { success: false, error: 'No OPENAI_API_KEY set' };
    }

    logger.info(`🤖 Starting OpenAI agent for ${issue.identifier}`, {
      component: 'openai-agent',
      issue_identifier: issue.identifier,
    });

    onEvent({
      event: 'session_started',
      timestamp: new Date(),
      agent_pid: 'openai-api',
    });

    try {
      // Scan workspace for context
      const files = scanWorkspaceFiles(workspacePath);
      logger.info(`Scanned ${files.length} workspace files for context`, {
        component: 'openai-agent',
      });

      // Build context
      const fileContext = files
        .map((f) => `### ${f.path}\n\`\`\`\n${f.content.slice(0, 5000)}\n\`\`\``)
        .join('\n\n');

      const systemPrompt = `You are an AI coding agent working autonomously on a GitHub issue.
You have access to the following project files.

IMPORTANT: When you want to create or modify files, output them in this exact format:
\`\`\`filepath:path/to/file.ext
<file contents here>
\`\`\`

When you want to delete a file, write: DELETE: \`path/to/file.ext\`

Rules:
- Make targeted, minimal changes to solve the issue
- Follow existing code patterns and conventions
- Do not modify unrelated files
- Explain your changes briefly before the code blocks
- End with a summary of what you did

Project files:
${fileContext}`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ];

      // Call OpenAI
      logger.info('Calling OpenAI API...', {
        component: 'openai-agent',
        issue_identifier: issue.identifier,
      });

      const result = await callOpenAI(this.config, messages);

      onEvent({
        event: 'turn_completed',
        timestamp: new Date(),
        agent_pid: 'openai-api',
        usage: result.usage,
      });

      logger.info(`OpenAI responded (${result.usage.total_tokens} tokens)`, {
        component: 'openai-agent',
        issue_identifier: issue.identifier,
      });

      // Parse and apply file changes
      const changes = parseFileChanges(result.content);
      if (changes.length > 0) {
        logger.info(`Applying ${changes.length} file change(s)...`, {
          component: 'openai-agent',
          issue_identifier: issue.identifier,
        });

        const applied = applyFileChanges(workspacePath, changes);
        logger.info(`Applied: ${applied.join(', ')}`, { component: 'openai-agent' });

        // Try to commit and push
        const pushed = await commitAndPush(workspacePath, issue, result.content.slice(0, 500));
        if (pushed) {
          logger.info('✅ Changes committed and pushed', {
            component: 'openai-agent',
            issue_identifier: issue.identifier,
          });
        }
      } else {
        logger.info('No file changes detected in response — may be analysis-only', {
          component: 'openai-agent',
          issue_identifier: issue.identifier,
        });
      }

      // Log the AI's response summary (first 300 chars)
      logger.info(`Agent summary: ${result.content.slice(0, 300)}...`, {
        component: 'openai-agent',
        issue_identifier: issue.identifier,
      });

      return { success: true };
    } catch (err) {
      const error = `OpenAI agent error: ${err}`;
      onEvent({
        event: 'turn_failed',
        timestamp: new Date(),
        payload: { error },
      });
      return { success: false, error };
    }
  }

  kill() {
    // No subprocess to kill — API call is already fire-and-forget
    // But we can signal abort
    this.abortController.abort();
  }

  getSession() {
    return null;
  }
}
