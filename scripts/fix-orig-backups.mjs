#!/usr/bin/env node
/**
 * Repair backup filenames accidentally normalized to "...orig.jpg"
 * back to the expected "... .orig.jpg" form.
 *
 * We only touch files like:
 *   <anything>orig.(jpg|jpeg|png)
 * and skip ones that already have ".orig." in the name.
 */
import { existsSync, readdirSync, renameSync, statSync } from 'fs';
import { join, resolve, extname, dirname } from 'path';

const root = process.cwd();
const baseDir = resolve(root, 'public', 'Новые значки');

if (!existsSync(baseDir)) {
  console.error('❌ Папка public/Новые значки не найдена:', baseDir);
  process.exit(1);
}

const imageExts = new Set(['.jpg', '.jpeg', '.png']);
const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

const shouldFix = (fileName) => {
  if (fileName.includes('.orig.')) return false;
  const ext = extname(fileName).toLowerCase();
  if (!imageExts.has(ext)) return false;
  return /orig\.(jpg|jpeg|png)$/i.test(fileName);
};

const toFixedName = (fileName) => {
  // "1 fooorig.jpg" -> "1 foo.orig.jpg"
  return fileName.replace(/orig\.(jpg|jpeg|png)$/i, '.orig.$1');
};

const operations = [];
const failures = [];

const renameSafe = (oldPath, newPath) => {
  if (oldPath === newPath) return;
  if (existsSync(newPath)) {
    failures.push({ oldPath, newPath, error: 'target exists' });
    return;
  }
  // Workaround for Windows oddities: rename via temp if only case differs
  const sameIgnoreCase = oldPath.toLowerCase() === newPath.toLowerCase();
  try {
    if (sameIgnoreCase) {
      const tmpPath = `${newPath}.__tmp__${Date.now()}`;
      renameSync(oldPath, tmpPath);
      renameSync(tmpPath, newPath);
    } else {
      renameSync(oldPath, newPath);
    }
    operations.push({ oldPath, newPath });
  } catch (error) {
    failures.push({ oldPath, newPath, error: error?.message || String(error) });
  }
};

const walk = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!shouldFix(entry.name)) continue;
    const fixedName = toFixedName(entry.name);
    const fixedPath = join(dirname(fullPath), fixedName);
    renameSafe(fullPath, fixedPath);
  }
};

walk(baseDir);

if (operations.length) {
  console.log(`✅ Исправлено: ${operations.length}`);
  operations.slice(0, 30).forEach((op) => console.log(`- ${op.oldPath} -> ${op.newPath}`));
  if (operations.length > 30) console.log(`... и еще ${operations.length - 30}`);
} else {
  console.log('✅ Нечего исправлять.');
}

if (failures.length) {
  console.warn(`\n⚠️  Ошибки (${failures.length}):`);
  failures.slice(0, 30).forEach((f) => console.warn(`- ${f.oldPath} -> ${f.newPath} (${f.error})`));
  if (failures.length > 30) console.warn(`... и еще ${failures.length - 30}`);
  process.exit(1);
}

