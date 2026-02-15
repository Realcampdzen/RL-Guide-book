#!/usr/bin/env node
/**
 * Normalize badge image folder/file names to match getBadgeImagePath conventions.
 * - Files: lower-case, ё->е, remove спецсимволы, normalize spaces, keep numeric prefix.
 * - Folders: same normalization; category root folders are untouched.
 * - For category "За личные достижения" keep ё in folder names to match explicit mapping.
 *
 * Usage:
 *   node scripts/normalize-badge-images.mjs --check
 *   node scripts/normalize-badge-images.mjs --apply
 *   node scripts/normalize-badge-images.mjs --apply --include-dirs
 */

import { existsSync, readdirSync, renameSync } from 'fs';
import { dirname, extname, join, relative } from 'path';

const root = process.cwd();
const baseDir = join(root, 'public', 'Новые значки');

if (!existsSync(baseDir)) {
  console.error('❌ Папка public/Новые значки не найдена:', baseDir);
  process.exit(1);
}

const args = process.argv.slice(2);
const wantsApply = args.includes('--apply');
const includeDirs = args.includes('--include-dirs');
const checkOnly = args.includes('--check') || args.includes('--dry-run') || !wantsApply;

const imageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const normalizeName = (name, preserveYo = false) => {
  let out = name.toLowerCase();
  if (!preserveYo) {
    out = out.replace(/ё/g, 'е');
  }
  const stripRegex = preserveYo ? /[^\w\sа-яё-]/gi : /[^\w\sа-яе-]/gi;
  out = out.replace(stripRegex, '');
  out = out.replace(/\s+/g, ' ').trim();
  return out;
};

const normalizeFileBase = (base) => {
  const match = base.match(/^(\d+)[\s._-]*(.+)$/);
  if (match) {
    const num = match[1];
    const rest = match[2];
    const normalizedRest = normalizeName(rest, false);
    return normalizedRest ? `${num} ${normalizedRest}` : num;
  }
  return normalizeName(base, false);
};

const normalizeFileName = (fileName) => {
  const ext = extname(fileName);
  if (!ext) return fileName;
  const base = fileName.slice(0, -ext.length);
  const normalizedBase = normalizeFileBase(base);
  if (!normalizedBase) return fileName;
  return `${normalizedBase}${ext.toLowerCase()}`;
};

const isCategoryOne = (pathName) => {
  const rel = relative(baseDir, pathName);
  const parts = rel.split(/[\\/]/).filter(Boolean);
  const categoryName = parts[0] || '';
  return categoryName.toLowerCase() === 'за личные достижения';
};

const operations = [];
const conflicts = [];
const failures = [];

const renameEntry = (oldPath, newName) => {
  if (!newName) return;
  const newPath = join(dirname(oldPath), newName);
  if (oldPath === newPath) return;
  const sameIgnoreCase = oldPath.toLowerCase() === newPath.toLowerCase();
  if (sameIgnoreCase) {
    operations.push({ oldPath, newPath });
    if (!checkOnly) {
      try {
        const tempPath = `${newPath}.__tmp__${Date.now()}`;
        renameSync(oldPath, tempPath);
        renameSync(tempPath, newPath);
      } catch (error) {
        failures.push({ oldPath, newPath, error: error?.message || String(error) });
      }
    }
    return;
  }

  if (existsSync(newPath)) {
    conflicts.push({ oldPath, newPath });
    return;
  }

  operations.push({ oldPath, newPath });
  if (!checkOnly) {
    try {
      renameSync(oldPath, newPath);
    } catch (error) {
      failures.push({ oldPath, newPath, error: error?.message || String(error) });
    }
  }
};

const processDir = (dir, depth) => {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath, depth + 1);

      // Skip category root folders (depth 1) unless directories are requested.
      if (includeDirs && depth >= 1) {
        const preserveYo = isCategoryOne(fullPath);
        const normalizedDir = normalizeName(entry.name, preserveYo);
        if (normalizedDir) {
          renameEntry(fullPath, normalizedDir);
        }
      }
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (!imageExts.has(ext)) continue;

    const normalizedFile = normalizeFileName(entry.name);
    if (normalizedFile) {
      renameEntry(fullPath, normalizedFile);
    }
  }
};

processDir(baseDir, 0);

const printSample = (title, items) => {
  if (!items.length) return;
  console.log(`\n${title} (${items.length}):`);
  items.slice(0, 20).forEach((item) => {
    console.log(`- ${item.oldPath} -> ${item.newPath}`);
  });
  if (items.length > 20) {
    console.log(`... и еще ${items.length - 20}`);
  }
};

if (operations.length === 0 && conflicts.length === 0) {
  console.log('✅ Нет имен для нормализации.');
  process.exit(0);
}

printSample(checkOnly ? '⚠️  Требуют нормализации' : '✅ Переименовано', operations);

if (conflicts.length) {
  console.log(`\n❌ Конфликты имен (${conflicts.length}):`);
  conflicts.slice(0, 10).forEach((item) => {
    console.log(`- ${item.oldPath} -> ${item.newPath}`);
  });
  if (conflicts.length > 10) {
    console.log(`... и еще ${conflicts.length - 10}`);
  }
  process.exit(1);
}

if (failures.length) {
  console.log(`\n❌ Ошибки переименования (${failures.length}):`);
  failures.slice(0, 10).forEach((item) => {
    console.log(`- ${item.oldPath} -> ${item.newPath} (${item.error})`);
  });
  if (failures.length > 10) {
    console.log(`... и еще ${failures.length - 10}`);
  }
  process.exit(1);
}

if (checkOnly) {
  console.log('\n⚠️  Запустите с --apply, чтобы переименовать.');
  process.exit(1);
}

console.log(`\n✅ Готово. Переименовано: ${operations.length}.`);
