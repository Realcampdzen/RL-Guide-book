#!/usr/bin/env node
/**
 * Sync ai-data/ to public/ai-data/ (source of truth -> runtime).
 * Run after any changes to ai-data/ and before build/deploy.
 * Node 16+ (fs.cpSync).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'ai-data');
const dest = path.join(root, 'public', 'ai-data');

if (!fs.existsSync(src)) {
  console.error('ai-data/ not found at', src);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log('Synced ai-data/ -> public/ai-data/');
