#!/usr/bin/env node
import crypto from 'crypto';
/**
 * Normalize badge icon JPGs by trimming near-white borders and resizing to square.
 *
 * Scope:
 * - Only icon images under: public/Новые значки/**
 * - Excludes any path segment: реализм, запасные, __normalized__
 * - Processes only .jpg/.jpeg (skips .orig.jpg backups)
 *
 * Behavior:
 * - Creates a one-time backup рядом: <name>.orig.jpg (or .orig.jpeg)
 * - If a backup exists, uses it as the processing input
 * - Auto-crops a centered square around non-white content (with configurable pad)
 * - Resizes to square (cover) for consistent framing
 * - Overwrites the original JPG
 *
 * Usage:
 *   node scripts/normalize-badge-icons.mjs --check
 *   node scripts/normalize-badge-icons.mjs --apply
 *   node scripts/normalize-badge-icons.mjs --apply --subdir "За личные достижения/валюша"
 *
 * Options:
 *   --check                 dry-run (default if no --apply)
 *   --apply                 write changes
 *   --subdir "<relPath>"    limit to a subtree under public/Новые значки (alias: --only for direct node runs)
 *   --size <n>              target square size (default: 1024)
 *   --threshold <n>         trim threshold 0..255 (default: 18)
 *   --bg-threshold <n>      treat pixels >= this (RGB) as background white (default: 245)
 *   --pad <n>               padding (px) around centered crop (default: 4)
 *   --zoom <n>              zoom in (>1 means bigger icon) (default: 1.0)
 *   --quality <n>           jpeg quality 1..100 (default: 92)
 *   --no-backup             do not create .orig backups
 */
import { copyFileSync, existsSync, readdirSync, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import os from 'os';
import { dirname, extname, join, relative } from 'path';
import process from 'process';
import sharp from 'sharp';

const root = process.cwd();
const baseDir = join(root, 'public', 'Новые значки');

if (!existsSync(baseDir)) {
  console.error('❌ Папка public/Новые значки не найдена:', baseDir);
  process.exit(1);
}

const args = process.argv.slice(2);
const wantsApply = args.includes('--apply');
const checkOnly = args.includes('--check') || !wantsApply;
const subdirIdx = args.indexOf('--subdir');
const onlyIdx = args.indexOf('--only'); // alias (note: `npm run ... -- --only` conflicts with npm's own --only flag)
const subdirRel = subdirIdx >= 0 ? args[subdirIdx + 1] : onlyIdx >= 0 ? args[onlyIdx + 1] : null;

const sizeIdx = args.indexOf('--size');
const thresholdIdx = args.indexOf('--threshold');
const bgThresholdIdx = args.indexOf('--bg-threshold');
const padIdx = args.indexOf('--pad');
const zoomIdx = args.indexOf('--zoom');
const qualityIdx = args.indexOf('--quality');
const noBackup = args.includes('--no-backup');

const targetSize = sizeIdx >= 0 ? Number(args[sizeIdx + 1]) : 1024;
const trimThreshold = thresholdIdx >= 0 ? Number(args[thresholdIdx + 1]) : 18;
const bgThreshold = bgThresholdIdx >= 0 ? Number(args[bgThresholdIdx + 1]) : 245;
const cropPad = padIdx >= 0 ? Number(args[padIdx + 1]) : 4;
const zoomFactor = zoomIdx >= 0 ? Number(args[zoomIdx + 1]) : 1.0;
const jpegQuality = qualityIdx >= 0 ? Number(args[qualityIdx + 1]) : 92;

const isFiniteInt = (n) => Number.isFinite(n) && Math.floor(n) === n;
if (!isFiniteInt(targetSize) || targetSize < 64 || targetSize > 4096) {
  console.error('❌ Некорректный --size. Ожидали целое число в диапазоне 64..4096.');
  process.exit(1);
}
if (!isFiniteInt(trimThreshold) || trimThreshold < 0 || trimThreshold > 255) {
  console.error('❌ Некорректный --threshold. Ожидали целое число в диапазоне 0..255.');
  process.exit(1);
}
if (!isFiniteInt(bgThreshold) || bgThreshold < 0 || bgThreshold > 255) {
  console.error('❌ Некорректный --bg-threshold. Ожидали целое число в диапазоне 0..255.');
  process.exit(1);
}
if (!isFiniteInt(cropPad) || cropPad < 0 || cropPad > 256) {
  console.error('❌ Некорректный --pad. Ожидали целое число в диапазоне 0..256.');
  process.exit(1);
}
if (!Number.isFinite(zoomFactor) || zoomFactor < 0.8 || zoomFactor > 1.5) {
  console.error('❌ Некорректный --zoom. Ожидали число в диапазоне 0.8..1.5.');
  process.exit(1);
}
if (!isFiniteInt(jpegQuality) || jpegQuality < 1 || jpegQuality > 100) {
  console.error('❌ Некорректный --quality. Ожидали целое число в диапазоне 1..100.');
  process.exit(1);
}

const excludeSegments = new Set(['реализм', 'запасные', '__normalized__']);
const isExcluded = (fullPath) => {
  const rel = relative(baseDir, fullPath);
  const parts = rel
    .split(/[\\/]/)
    .filter(Boolean)
    .map((p) => p.toLowerCase());
  return parts.some((p) => excludeSegments.has(p));
};

const isJpeg = (fileName) => {
  const ext = extname(fileName).toLowerCase();
  return ext === '.jpg' || ext === '.jpeg';
};

const isBackup = (fileName) => fileName.toLowerCase().includes('.orig.');

const collectFiles = (dir, out) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (isExcluded(full)) continue;
      collectFiles(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!isJpeg(entry.name)) continue;
    if (isExcluded(full)) continue;

    // Also handle a missing main file when only *.orig.jpg exists:
    // create/update <name>.jpg by targeting the main path.
    if (isBackup(entry.name)) {
      const lower = entry.name.toLowerCase();
      const idx = lower.lastIndexOf('.orig.');
      if (idx > 0) {
        const mainName = entry.name.slice(0, idx) + entry.name.slice(idx + '.orig'.length);
        const mainPath = join(dir, mainName);
        if (!existsSync(mainPath)) {
          out.push(mainPath);
        }
      }
      continue;
    }

    out.push(full);
  }
};

const subtreeDir = subdirRel ? join(baseDir, subdirRel) : baseDir;
if (subdirRel && !existsSync(subtreeDir)) {
  console.error('❌ --subdir путь не найден (относительно public/Новые значки):', subdirRel);
  process.exit(1);
}

const files = [];
collectFiles(subtreeDir, files);

if (files.length === 0) {
  console.log('✅ JPG файлов для обработки не найдено.');
  process.exit(0);
}

const jobs = [];
const results = [];
const failures = [];

const backupPathFor = (filePath) => {
  const ext = extname(filePath);
  const base = filePath.slice(0, -ext.length);
  return `${base}.orig${ext.toLowerCase()}`;
};

const hashBytes = (buf) => crypto.createHash('sha1').update(buf).digest('hex');

const median = (arr) => {
  if (!arr.length) return null;
  const a = arr.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 === 0 ? (a[mid - 1] + a[mid]) / 2 : a[mid];
};

const computeNonWhiteBBox = async (inputBuf) => {
  const { data, info } = await sharp(inputBuf, { failOn: 'none' })
    .rotate()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const c = info.channels;

  // Estimate background color from corner patches (helps with non-white studio backgrounds).
  const cornerSize = Math.min(24, w, h);
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let bgN = 0;
  const sample = (x0, y0) => {
    for (let y = y0; y < y0 + cornerSize; y++) {
      for (let x = x0; x < x0 + cornerSize; x++) {
        const i = (y * w + x) * c;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        bgR += r;
        bgG += g;
        bgB += b;
        bgN++;
      }
    }
  };
  sample(0, 0);
  sample(w - cornerSize, 0);
  sample(0, h - cornerSize);
  sample(w - cornerSize, h - cornerSize);
  bgR = Math.round(bgR / bgN);
  bgG = Math.round(bgG / bgN);
  bgB = Math.round(bgB / bgN);
  const bgLuma = (bgR + bgG + bgB) / 3;

  // Robust bbox: ignore sparse edge noise by using per-row/col counts.
  const rowCounts = new Uint32Array(h);
  const colCounts = new Uint32Array(w);
  const rowMin = new Int32Array(h);
  const rowMax = new Int32Array(h);
  const colMin = new Int32Array(w);
  const colMax = new Int32Array(w);
  rowMin.fill(w);
  rowMax.fill(-1);
  colMin.fill(h);
  colMax.fill(-1);

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * c;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = c >= 4 ? data[i + 3] : 255;

      // Treat nearly-transparent as background too
      const isTransparentBg = a <= 5;
      const maxRgb = Math.max(r, g, b);
      const minRgb = Math.min(r, g, b);
      const chroma = maxRgb - minRgb; // "colorfulness"
      const luma = (r + g + b) / 3; // simple brightness

      // Background heuristic:
      // - Near-white (for white backdrops)
      // - Close to estimated corner background color (for gray studio backdrops)
      const bgDist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
      // Don't treat bright gold lettering as background: require low chroma for "white bg".
      // Also allow slightly darker/noisy whites by comparing to the estimated bg luma.
      const isWhiteBg = luma >= Math.max(bgThreshold, bgLuma - 10) && chroma <= 18;
      // The studio background often has a mild gradient/noise; allow a wider distance
      // while still requiring low chroma (near-gray) and a reasonably bright pixel.
      const isCornerBg = bgDist <= 120 && chroma <= 80 && luma >= bgLuma - 45;

      const isBg = isTransparentBg || isWhiteBg || isCornerBg;

      if (isBg) continue;

      rowCounts[y]++;
      colCounts[x]++;
      if (x < rowMin[y]) rowMin[y] = x;
      if (x > rowMax[y]) rowMax[y] = x;
      if (y < colMin[x]) colMin[x] = y;
      if (y > colMax[x]) colMax[x] = y;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0 || maxY < 0) return null;

  // If there is edge noise (JPEG speckles / shadows), shrink bbox using density thresholds.
  // Use a stricter minimum so single-edge artifacts don't count as "content".
  const minRowCount = Math.max(12, Math.floor(w * 0.005)); // ~0.5% of row pixels, but at least 12
  const minColCount = Math.max(12, Math.floor(h * 0.005)); // ~0.5% of col pixels, but at least 12

  let denseMinY = -1;
  let denseMaxY = -1;
  for (let y = 0; y < h; y++) {
    if (rowCounts[y] >= minRowCount) {
      denseMinY = y;
      break;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    if (rowCounts[y] >= minRowCount) {
      denseMaxY = y;
      break;
    }
  }

  let denseMinX = -1;
  let denseMaxX = -1;
  for (let x = 0; x < w; x++) {
    if (colCounts[x] >= minColCount) {
      denseMinX = x;
      break;
    }
  }
  for (let x = w - 1; x >= 0; x--) {
    if (colCounts[x] >= minColCount) {
      denseMaxX = x;
      break;
    }
  }

  // Fallback: if thresholds were too strict, keep the raw bbox.
  if (denseMinX >= 0 && denseMaxX >= 0) {
    minX = denseMinX;
    maxX = denseMaxX;
  }
  if (denseMinY >= 0 && denseMaxY >= 0) {
    minY = denseMinY;
    maxY = denseMaxY;
  }

  // Guard against pathological detections
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  if (width < 32 || height < 32) return null;

  // Estimate content center via "chords" (more stable for circular badges).
  const rowMids = [];
  const rowWidths = [];
  const minChord = Math.max(24, Math.floor(w * 0.08));
  for (let y = 0; y < h; y++) {
    if (rowCounts[y] < minRowCount) continue;
    const a = rowMin[y];
    const b = rowMax[y];
    if (a < 0 || b < 0) continue;
    const chordW = b - a + 1;
    if (chordW < minChord) continue;
    rowMids.push((a + b) / 2);
    rowWidths.push(chordW);
  }

  const colMids = [];
  const colHeights = [];
  const minChordY = Math.max(24, Math.floor(h * 0.08));
  for (let x = 0; x < w; x++) {
    if (colCounts[x] < minColCount) continue;
    const a = colMin[x];
    const b = colMax[x];
    if (a < 0 || b < 0) continue;
    const chordH = b - a + 1;
    if (chordH < minChordY) continue;
    colMids.push((a + b) / 2);
    colHeights.push(chordH);
  }

  // Prefer midpoints near the widest chords (closest to true circle center),
  // to reduce bias from inner artwork touching the rim unevenly.
  const maxRowChord = rowWidths.length ? Math.max(...rowWidths) : 0;
  const strongRowMids = maxRowChord
    ? rowMids.filter((_, i) => rowWidths[i] >= maxRowChord * 0.92)
    : [];

  const maxColChord = colHeights.length ? Math.max(...colHeights) : 0;
  const strongColMids = maxColChord
    ? colMids.filter((_, i) => colHeights[i] >= maxColChord * 0.92)
    : [];

  const cxChord = median(strongRowMids.length ? strongRowMids : rowMids);
  const cyChord = median(strongColMids.length ? strongColMids : colMids);
  const rX = median(rowWidths);
  const rY = median(colHeights);

  // Fallbacks
  const cx = cxChord ?? (minX + maxX) / 2;
  const cy = cyChord ?? (minY + maxY) / 2;
  const radius = Math.max(rX ? rX / 2 : width / 2, rY ? rY / 2 : height / 2);

  return { w, h, minX, minY, maxX, maxY, width, height, cx, cy, radius };
};

const computeCenteredSquareCrop = (bbox, pad) => {
  const { w, h, width, height, cx, cy, radius } = bbox;

  let side = Math.max(2 * radius, width, height) + 2 * pad;
  side = Math.max(32, Math.floor(side));

  // Zoom-in by shrinking the crop area a bit (keeps center).
  if (zoomFactor && zoomFactor !== 1) {
    side = Math.max(32, Math.floor(side / zoomFactor));
  }

  // Clamp side to image bounds (square must fit inside)
  side = Math.min(side, w, h);

  let left = Math.round(cx - side / 2);
  let top = Math.round(cy - side / 2);

  // Clamp so that extract area is always valid
  left = Math.max(0, Math.min(left, w - side));
  top = Math.max(0, Math.min(top, h - side));

  return { left, top, width: side, height: side };
};

const processOne = async (filePath) => {
  const targetExists = existsSync(filePath);
  const currentBuf = targetExists ? readFileSync(filePath) : null;
  const beforeHash = currentBuf ? hashBytes(currentBuf) : null;

  const backupPath = backupPathFor(filePath);
  const sourcePath = existsSync(backupPath) ? backupPath : filePath;
  const sourceBuf = readFileSync(sourcePath);

  const bbox = await computeNonWhiteBBox(sourceBuf);

  // Auto-crop near-white margins (centered) + normalize framing
  let pipeline = sharp(sourceBuf, { failOn: 'none' }).rotate(); // honor EXIF
  if (bbox) {
    const crop = computeCenteredSquareCrop(bbox, cropPad);
    pipeline = pipeline.extract(crop);
  } else {
    // Note: `trim()` and `extract()` together can error on some JPGs,
    // so only run trim when we didn't auto-crop.
    pipeline = pipeline.trim({ threshold: trimThreshold });
  }
  pipeline = pipeline
    .resize(targetSize, targetSize, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: jpegQuality, mozjpeg: true });

  const outBuf = await pipeline.toBuffer();
  const afterHash = hashBytes(outBuf);
  const changed = !targetExists || beforeHash !== afterHash;

  // Create backup once, only when we are going to write changes
  if (!checkOnly && changed && !noBackup && targetExists && !existsSync(backupPath)) {
    copyFileSync(filePath, backupPath);
  }

  if (!checkOnly && changed) {
    await writeFile(filePath, outBuf);
  }

  return {
    filePath,
    backupPath: noBackup ? null : backupPath,
    changed,
  };
};

// Concurrency: keep it gentle on Windows
const maxConcurrency = Math.max(2, Math.min(6, os.cpus().length || 4));
let idx = 0;

const worker = async () => {
  while (idx < files.length) {
    const current = files[idx++];
    try {
      const r = await processOne(current);
      results.push(r);
    } catch (err) {
      failures.push({ filePath: current, error: err?.message || String(err) });
    }
  }
};

for (let i = 0; i < maxConcurrency; i++) {
  jobs.push(worker());
}
await Promise.all(jobs);

// Summary
const processed = results.length;
const changedCount = results.filter((r) => r.changed).length;

console.log(checkOnly ? '🔎 DRY RUN (ничего не записано)' : '✅ APPLY (файлы обновлены)');
console.log(`- Найдено JPG: ${files.length}`);
console.log(`- Обработано: ${processed}`);
console.log(`- ${checkOnly ? 'Будет обновлено' : 'Обновлено'}: ${changedCount}`);
console.log(`- Ошибок: ${failures.length}`);

if (failures.length) {
  console.log('\nОшибки (первые 10):');
  failures.slice(0, 10).forEach((f) => console.log(`- ${f.filePath}: ${f.error}`));
}

// Non-zero exit in check mode if there are files to process, to make CI usage easy.
if (checkOnly) {
  process.exit(changedCount > 0 || failures.length > 0 ? 1 : 0);
}

if (failures.length) {
  process.exit(1);
}
