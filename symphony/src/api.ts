/**
 * Symphony Dashboard API — HTTP server for real-time monitoring
 * Serves JSON state snapshots + static dashboard
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import logger from './logger.js';
import type { Orchestrator } from './orchestrator.js';

export function startDashboardServer(
    orchestrator: Orchestrator,
    port = 4400,
): { close: () => void } {
    const dashboardPath = resolve(import.meta.dirname || '.', '..', 'dashboard', 'index.html');

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const url = req.url || '/';

        // API: state snapshot
        if (url === '/api/state' || url === '/api/status') {
            const snapshot = orchestrator.getStateSnapshot();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(snapshot, null, 2));
            return;
        }

        // API: health check
        if (url === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
            return;
        }

        // Dashboard HTML
        if (url === '/' || url === '/dashboard') {
            if (existsSync(dashboardPath)) {
                const html = readFileSync(dashboardPath, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(html);
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<html><body><h1>Dashboard file not found</h1><p>Expected: ' + dashboardPath + '</p></body></html>');
            }
            return;
        }

        // 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not_found' }));
    });

    server.listen(port, () => {
        logger.info(`🖥  Dashboard: http://localhost:${port}`, { component: 'dashboard' });
        logger.info(`📡 API:       http://localhost:${port}/api/state`, { component: 'dashboard' });
    });

    return {
        close: () => {
            server.close();
        },
    };
}
