#!/usr/bin/env node
/**
 * Symphony — CLI Entry Point
 * Usage: npx tsx src/cli.ts [--workflow <path>] [--logs-root <path>] [--debug]
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import logger from './logger.js';
import { parseWorkflowFile, buildServiceConfig, validateConfig, watchWorkflowFile } from './config.js';
import { Orchestrator } from './orchestrator.js';
import { startDashboardServer } from './api.js';

function parseArgs(args: string[]) {
    const parsed = {
        workflow: './WORKFLOW.md',
        logsRoot: './log',
        debug: false,
        port: 4400,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--workflow':
                parsed.workflow = args[++i] || parsed.workflow;
                break;
            case '--logs-root':
                parsed.logsRoot = args[++i] || parsed.logsRoot;
                break;
            case '--debug':
                parsed.debug = true;
                break;
            case '--port':
                parsed.port = parseInt(args[++i], 10) || 4400;
                break;
            case '--help':
            case '-h':
                console.log(`
  🎵 Symphony — AI Agent Orchestrator

  Usage: npx tsx src/cli.ts [options]

  Options:
    --workflow <path>    Path to WORKFLOW.md (default: ./WORKFLOW.md)
    --logs-root <path>   Directory for log files (default: ./log)
    --debug              Enable debug logging
    --port <number>      Dashboard port (default: 4400)
    -h, --help           Show this help

  Environment:
    LINEAR_API_KEY       Linear API key (when tracker.kind=linear)
    GITHUB_TOKEN         GitHub PAT (when tracker.kind=github)

  Example:
    LINEAR_API_KEY=lin_api_xxx npx tsx src/cli.ts --workflow ../WORKFLOW.md
`);
                process.exit(0);
                break;
            default:
                if (!args[i].startsWith('--') && i === 0) {
                    parsed.workflow = args[i];
                }
        }
    }

    return parsed;
}

function loadEnvFile(filePath: string) {
    if (!existsSync(filePath)) {
        return;
    }

    const content = readFileSync(filePath, 'utf-8');
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) {
            continue;
        }

        const index = line.indexOf('=');
        if (index <= 0) {
            continue;
        }

        const key = line.slice(0, index).trim();
        let value = line.slice(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}

function loadEnvironment(workflowPath: string) {
    const workflowDir = dirname(workflowPath);
    const candidates = [
        resolve(process.cwd(), '.env'),
        resolve(workflowDir, '.env'),
        resolve(workflowDir, '..', '.env'),
    ];

    const seen = new Set<string>();
    for (const candidate of candidates) {
        const normalized = resolve(candidate);
        if (seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        loadEnvFile(normalized);
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const workflowPath = resolve(args.workflow);
    loadEnvironment(workflowPath);

    if (args.debug) {
        logger.setLevel('debug');
    }
    logger.setLogsRoot(resolve(args.logsRoot));

    console.log(`
  ╔═══════════════════════════════════════════════╗
  ║  🎵  Symphony — Agent Orchestrator            ║
  ║     Tracker: Linear or GitHub                ║
  ╚═══════════════════════════════════════════════╝
  `);

    logger.info(`Loading workflow: ${workflowPath}`, { component: 'cli' });

    let workflow;
    try {
        workflow = parseWorkflowFile(workflowPath);
    } catch (err) {
        logger.error(`Failed to load workflow: ${err}`, { component: 'cli' });
        process.exit(1);
    }

    const config = buildServiceConfig(workflow);
    const errors = validateConfig(config);
    if (errors.length > 0) {
        logger.error('Configuration validation failed:', { component: 'cli' });
        for (const err of errors) {
            logger.error(`  ${err.field}: ${err.message}`, { component: 'cli' });
        }
        process.exit(1);
    }

    const orchestrator = new Orchestrator(config, workflow);

    const stopWatcher = watchWorkflowFile(workflowPath, (newWorkflow, newConfig) => {
        orchestrator.updateConfig(newConfig, newWorkflow);
    });

    const dashboard = startDashboardServer(orchestrator, args.port);

    const shutdown = async () => {
        stopWatcher();
        dashboard.close();
        await orchestrator.stop();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    if (process.platform === 'win32') {
        const rl = await import('node:readline');
        const rli = rl.createInterface({ input: process.stdin, output: process.stdout });
        rli.on('SIGINT', () => process.emit('SIGINT'));
    }

    await orchestrator.start();
}

main().catch((err) => {
    logger.error(`Fatal error: ${err}`, { component: 'cli' });
    process.exit(1);
});
