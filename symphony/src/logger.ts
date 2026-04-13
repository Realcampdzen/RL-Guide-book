/**
 * Structured Logger — SPEC.md §13
 * JSON-line structured logs + colorized console output
 */

import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  issue_id?: string;
  issue_identifier?: string;
  workspace_path?: string;
  session_id?: string;
  component?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, (s: string) => string> = {
  debug: chalk.gray,
  info: chalk.cyan,
  warn: chalk.yellow,
  error: chalk.red,
};

const LEVEL_ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: '📋',
  warn: '⚠️',
  error: '❌',
};

class Logger {
  private minLevel: LogLevel = 'info';
  private logFilePath: string | null = null;

  setLevel(level: LogLevel) {
    this.minLevel = level;
  }

  setLogsRoot(logsRoot: string) {
    if (!existsSync(logsRoot)) {
      mkdirSync(logsRoot, { recursive: true });
    }
    const date = new Date().toISOString().slice(0, 10);
    this.logFilePath = join(logsRoot, `symphony-${date}.jsonl`);
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.minLevel];
  }

  private formatConsole(entry: LogEntry): string {
    const color = LEVEL_COLORS[entry.level];
    const icon = LEVEL_ICONS[entry.level];
    const time = entry.timestamp.slice(11, 19);
    const lvl = color(entry.level.toUpperCase().padEnd(5));

    let line = `${chalk.dim(time)} ${icon} ${lvl} ${entry.message}`;

    if (entry.context?.issue_identifier) {
      line += chalk.dim(` [${entry.context.issue_identifier}]`);
    }
    if (entry.context?.component) {
      line += chalk.dim(` (${entry.context.component})`);
    }

    return line;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    // Console output
    console.log(this.formatConsole(entry));

    // File output (JSON-line)
    if (this.logFilePath) {
      try {
        appendFileSync(this.logFilePath, JSON.stringify(entry) + '\n');
      } catch {
        // Silently ignore file write errors
      }
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  /** Log a separator line for visual clarity */
  separator(title?: string) {
    if (!this.shouldLog('info')) return;
    if (title) {
      console.log(chalk.dim(`\n${'─'.repeat(20)} ${chalk.bold(title)} ${'─'.repeat(20)}\n`));
    } else {
      console.log(chalk.dim('─'.repeat(60)));
    }
  }

  /** Pretty-print orchestrator status snapshot */
  status(state: {
    running: number;
    claimed: number;
    retrying: number;
    completed: number;
    tokens: number;
  }) {
    if (!this.shouldLog('info')) return;
    console.log(
      chalk.dim('│') +
        ` Running: ${chalk.green(String(state.running))}` +
        ` │ Claimed: ${chalk.yellow(String(state.claimed))}` +
        ` │ Retrying: ${chalk.blue(String(state.retrying))}` +
        ` │ Completed: ${chalk.cyan(String(state.completed))}` +
        ` │ Tokens: ${chalk.magenta(String(state.tokens))}`
    );
  }
}

export const logger = new Logger();
export default logger;
