#!/usr/bin/env node
/**
 * Generate public/vozhatifikator-toc.json from a text list.
 * Plan: Вожатификатор 1.1–1.3 и TOC — Вариант B (редактор передаёт список).
 *
 * Usage: node scripts/vozhatifikator-toc-from-list.mjs <path-to-list>
 *
 * List format (one entry per line):
 *   Title | page
 *   Title, page
 *   Title	page
 * Example: public/vozhatifikator-toc-list.example.txt
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'public', 'vozhatifikator-toc.json');

const listPath = process.argv[2];
if (!listPath) {
  console.error('Usage: node scripts/vozhatifikator-toc-from-list.mjs <path-to-list>');
  console.error(
    'Example: node scripts/vozhatifikator-toc-from-list.mjs public/vozhatifikator-toc-list.example.txt'
  );
  process.exit(1);
}

const absPath = path.isAbsolute(listPath) ? listPath : path.join(root, listPath);
if (!fs.existsSync(absPath)) {
  console.error('File not found:', absPath);
  process.exit(1);
}

const raw = fs.readFileSync(absPath, 'utf8');
const lines = raw
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);
const toc = [];

for (const line of lines) {
  let title = '';
  let page = 1;
  if (line.includes('|')) {
    const idx = line.lastIndexOf('|');
    title = line.slice(0, idx).trim();
    page = parseInt(line.slice(idx + 1).trim(), 10) || 1;
  } else if (line.includes(',') || line.includes('\t')) {
    const sep = line.includes('\t') ? '\t' : ',';
    const parts = line.split(sep).map((s) => s.trim());
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      const num = parseInt(last, 10);
      if (!Number.isNaN(num)) {
        page = num;
        title = parts
          .slice(0, -1)
          .join(sep === '\t' ? ' ' : ', ')
          .trim();
      } else {
        title = line;
      }
    } else {
      title = line;
    }
  } else {
    const match = line.match(/^(.+?)\s+(\d+)\s*$/);
    if (match) {
      title = match[1].trim();
      page = parseInt(match[2], 10) || 1;
    } else {
      title = line;
    }
  }
  if (title) toc.push({ title, page });
}

if (toc.length === 0) {
  console.error('No valid entries found. Use format: "Title | page" per line.');
  process.exit(1);
}

fs.writeFileSync(outPath, JSON.stringify(toc, null, 2), 'utf8');
console.log('Written', toc.length, 'entries to', outPath);
