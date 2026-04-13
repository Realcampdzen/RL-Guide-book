#!/usr/bin/env node
/**
 * Strictly verify that every JPG/PNG image under
 * public/Новые значки/За личные достижения/** has a sibling .webp.
 *
 * Rationale:
 * - Our UI uses <picture><source type="image/webp" ... /></picture>.
 * - If the webp is missing (404), some browsers will not reliably fall back to <img src="...jpg">.
 *
 * We intentionally:
 * - exclude backups like *.orig.jpg
 * - focus on category 1 to keep the check fast and scoped
 */
import { existsSync, readdirSync, statSync } from 'fs';
import { extname, join, relative, resolve } from 'path';

const root = process.cwd();
const targetDirs = [
  resolve(root, 'public', 'Новые значки', 'За личные достижения'),
  resolve(root, 'public', 'Новые значки', 'медия значки'),
  resolve(root, 'public', 'Новые значки', 'за лагерные дела'),
  resolve(root, 'public', 'Новые значки', 'за отрядные дела'),
  resolve(root, 'public', 'Новые значки', 'гармония и порядок'),
  resolve(root, 'public', 'Новые значки', 'за творческие достижения'),
];

const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

const missingDirs = targetDirs.filter((d) => !isDir(d));
if (missingDirs.length) {
  console.error('❌ Не найдены папки для проверки:');
  for (const d of missingDirs) console.error(`- ${d}`);
  process.exit(1);
}

const imageExts = new Set(['.jpg', '.jpeg', '.png']);
const isOrigBackup = (fileName) => /\.orig\.(jpg|jpeg|png)$/i.test(fileName);

const toWebpPath = (inputPath) => {
  const ext = extname(inputPath);
  return inputPath.slice(0, -ext.length) + '.webp';
};

const missing = [];

const walk = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (!imageExts.has(ext)) continue;
    if (isOrigBackup(entry.name)) continue;

    const webpPath = toWebpPath(fullPath);
    if (!existsSync(webpPath)) {
      missing.push({
        input: fullPath,
        webp: webpPath,
      });
    }
  }
};

for (const dir of targetDirs) walk(dir);

if (missing.length === 0) {
  console.log('✅ webp check OK: все изображения имеют .webp соседа.');
  process.exit(0);
}

console.error(`❌ webp check FAILED: отсутствуют .webp для ${missing.length} файлов:`);
for (const m of missing.slice(0, 100)) {
  console.error(
    `- ${relative(resolve(root, 'public'), m.input).replace(/\\/g, '/')} -> ${relative(resolve(root, 'public'), m.webp).replace(/\\/g, '/')}`
  );
}
if (missing.length > 100) {
  console.error(`... и еще ${missing.length - 100}`);
}

process.exit(1);
