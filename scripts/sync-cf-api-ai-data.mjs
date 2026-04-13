#!/usr/bin/env node
import { execSync } from 'child_process';
/**
 * Sync ai-data from project to cf-api.
 * Run after sync:ai-data (or it runs sync:ai-data first).
 * Copies public/ai-data -> cf-api/public/ai-data, then builds guidebook-badges-index.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'public', 'ai-data');
const dest = path.join(root, 'cf-api', 'public', 'ai-data');
const staticDir = path.join(root, 'cf-api', 'public', 'static');

// Ensure project public/ai-data exists (run sync:ai-data first)
const aiData = path.join(root, 'ai-data');
if (!fs.existsSync(aiData)) {
  console.error('ai-data/ not found. Run npm run sync:ai-data first.');
  process.exit(1);
}
// Sync ai-data -> public/ai-data
execSync('node scripts/sync-ai-data.mjs', { cwd: root, stdio: 'inherit' });

if (!fs.existsSync(src)) {
  console.error('public/ai-data/ not found at', src);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log('Synced public/ai-data/ -> cf-api/public/ai-data/');

// Build guidebook-badges-index.json
fs.mkdirSync(staticDir, { recursive: true });
const outFile = path.join(staticDir, 'guidebook-badges-index.json');
execSync(`node scripts/build-guidebook-badges-index.mjs "${dest}" "${outFile}"`, {
  cwd: path.join(root, 'cf-api'),
  stdio: 'inherit',
});
console.log('Built cf-api/public/static/guidebook-badges-index.json');
