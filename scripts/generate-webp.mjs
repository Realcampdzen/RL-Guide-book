#!/usr/bin/env node
/**
 * Generate .webp siblings for selected images under public/.
 *
 * Goals:
 * - Do NOT rename or delete originals
 * - Write output next to originals (same base name, .webp extension)
 * - Skip files that already have a .webp sibling unless --force is provided
 *
 * Usage:
 *   npm run images:webp
 *   node scripts/generate-webp.mjs --force
 *   node scripts/generate-webp.mjs --include-pictures
 *
 * Notes:
 * - We intentionally avoid converting everything by default to prevent repo bloat.
 * - This script targets assets that are actually referenced from the UI:
 *   - public/Новые значки/** (badge images)
 *   - public/шапки внутри категорий/** (category header images)
 *   - selected top-level public files (screen backgrounds, category_*.png, avatar)
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { extname, join, resolve } from 'path';
import sharp from 'sharp';

const root = process.cwd();

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const includePictures = args.has('--include-pictures');

const imageExts = new Set(['.jpg', '.jpeg', '.png']);
const isOrigBackup = (fileName) => /\.orig\.(jpg|jpeg|png)$/i.test(fileName);

const publicDir = resolve(root, 'public');
if (!existsSync(publicDir)) {
  console.error('❌ public/ не найден:', publicDir);
  process.exit(1);
}

const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

const walk = (dir, out) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip ai-data and (optionally) pictures
      if (entry.name === 'ai-data') continue;
      if (!includePictures && entry.name === 'pictures') continue;
      walk(fullPath, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (!imageExts.has(ext)) continue;
    if (isOrigBackup(entry.name)) continue;
    out.push(fullPath);
  }
};

const shouldIncludeTopLevel = (fileName) => {
  // Keep this list tight: only assets we know are referenced by CSS/JSX.
  return (
    /^category_\d+\.png$/i.test(fileName) ||
    /^screen\d+_bg\.png$/i.test(fileName) ||
    /^экран .*\.png$/i.test(fileName) ||
    /^pattern_stickers\.jpg$/i.test(fileName) ||
    /^Валюша\.jpg$/i.test(fileName) ||
    /^домик_AI\.jpg$/i.test(fileName)
  );
};

const collectTargets = () => {
  const targets = [];

  // 1) Badge images + category headers (biggest impact)
  const badgeDir = resolve(publicDir, 'Новые значки');
  if (isDir(badgeDir)) {
    walk(badgeDir, targets);
  } else {
    console.warn('⚠️  public/Новые значки не найден — пропускаю.');
  }

  const headersDir = resolve(publicDir, 'шапки внутри категорий');
  if (isDir(headersDir)) {
    walk(headersDir, targets);
  } else {
    console.warn('⚠️  public/шапки внутри категорий не найден — пропускаю.');
  }

  const guideBookDir = resolve(publicDir, 'RL-Guide-book');
  if (isDir(guideBookDir)) {
    walk(guideBookDir, targets);
  }

  // 2) Selected top-level public assets
  const topEntries = readdirSync(publicDir, { withFileTypes: true });
  for (const entry of topEntries) {
    if (!entry.isFile()) continue;
    if (!shouldIncludeTopLevel(entry.name)) continue;
    targets.push(join(publicDir, entry.name));
  }

  return targets;
};

const toWebpPath = (inputPath) => {
  const ext = extname(inputPath);
  return inputPath.slice(0, -ext.length) + '.webp';
};

const formatBytes = (bytes) => {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

const convertOne = async (inputPath) => {
  const outPath = toWebpPath(inputPath);
  if (!force && existsSync(outPath)) {
    // If the original was replaced/updated, refresh the sibling .webp
    try {
      const inStat = statSync(inputPath);
      const outStat = statSync(outPath);
      if (inStat.mtimeMs <= outStat.mtimeMs) {
        return { status: 'skipped', inputPath, outPath };
      }
      // fallthrough: regenerate
    } catch {
      return { status: 'skipped', inputPath, outPath };
    }
  }

  const baseName = inputPath.split(/[\\/]/).pop() || '';
  const isCategoryIcon = /^category_\d+\.png$/i.test(baseName);
  const isPng = extname(inputPath).toLowerCase() === '.png';

  const inSize = statSync(inputPath).size;

  const pipeline = sharp(inputPath, { failOn: 'none' }).rotate();

  const webpOptions = isCategoryIcon
    ? { lossless: true, effort: 4 }
    : isPng
      ? { quality: 80, effort: 4 }
      : { quality: 82, effort: 4 };

  await pipeline.webp(webpOptions).toFile(outPath);

  const outSize = statSync(outPath).size;
  return {
    status: 'converted',
    inputPath,
    outPath,
    inSize,
    outSize,
  };
};

async function main() {
  const targets = collectTargets();
  // De-dupe (walk + top-level may overlap)
  const uniqueTargets = Array.from(new Set(targets));

  console.log(`🔍 Найдено кандидатов: ${uniqueTargets.length}`);
  console.log(`   force: ${force ? 'yes' : 'no'}`);
  console.log(`   includePictures: ${includePictures ? 'yes' : 'no'}`);

  let converted = 0;
  let skipped = 0;
  let failed = 0;

  // Simple concurrency limiter (avoid CPU spikes)
  const concurrency = 4;
  let index = 0;
  const results = [];

  const worker = async () => {
    while (index < uniqueTargets.length) {
      const current = uniqueTargets[index];
      index += 1;
      try {
        const res = await convertOne(current);
        results.push(res);
        if (res.status === 'converted') {
          converted += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        console.warn('❌ convert failed:', current, error?.message || String(error));
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Print a small sample of best savings (top 15)
  const savings = results
    .filter((r) => r.status === 'converted')
    .map((r) => ({ ...r, saved: r.inSize - r.outSize }))
    .sort((a, b) => b.saved - a.saved)
    .slice(0, 15);

  console.log(`\n✅ Готово.`);
  console.log(`   converted: ${converted}`);
  console.log(`   skipped:   ${skipped}`);
  console.log(`   failed:    ${failed}`);

  if (savings.length) {
    console.log('\n📉 Лучшие экономии (sample):');
    for (const s of savings) {
      console.log(
        `- saved ${formatBytes(s.saved)} | ${formatBytes(s.inSize)} -> ${formatBytes(s.outSize)} | ${s.inputPath.replace(publicDir + '\\\\', 'public\\\\')}`
      );
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal:', error?.message || String(error));
  process.exit(1);
});
