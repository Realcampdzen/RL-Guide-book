#!/usr/bin/env node
/**
 * Аудит 1: извлечение из билда recovery_profile.js
 * - Русские строки (в кавычках)
 * - fileName + lineNumber
 * Вывод: JSON в docs/recovery_inventory.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = readFileSync(join(root, 'recovery_profile.js'), 'utf8');

// Русские строки: "..." или '...' с хотя бы одной кириллической буквой
const cyrillicRegex = /["']([^"']*[А-Яа-яЁё][^"']*)["']/g;
const strings = new Set();
let m;
while ((m = cyrillicRegex.exec(src)) !== null) {
  const s = m[1].trim();
  if (s.length >= 2 && s.length <= 200) strings.add(s);
}

// fileName + lineNumber (source maps style)
const fileLineRegex = /fileName:"([^"]+)",lineNumber:(\d+)/g;
const fileLines = [];
while ((m = fileLineRegex.exec(src)) !== null) {
  const file = m[1].replace(/^.*\/src\//, 'src/');
  const line = parseInt(m[2], 10);
  if (!fileLines.some((f) => f.file === file && f.lineNumber === line)) {
    fileLines.push({ file, lineNumber: line });
  }
}
fileLines.sort((a, b) =>
  a.file === b.file ? a.lineNumber - b.lineNumber : a.file.localeCompare(b.file)
);

// Уникальные ProfileView lineNumber для границ блоков
const profileViewLines = [
  ...new Set(fileLines.filter((f) => f.file.includes('ProfileView')).map((f) => f.lineNumber)),
].sort((a, b) => a - b);

const inventory = {
  generatedAt: new Date().toISOString(),
  source: 'recovery_profile.js',
  russianStrings: [...strings].filter(Boolean).sort(),
  fileLineReferences: fileLines,
  profileViewLineNumbers: profileViewLines,
  componentsAndPropsFromBuild: [
    'hideNickname (state)',
    'ye() x2 = generateSocialCard story + wide',
    'shareOrDownloadSocialCard flow',
    'exportData / import handler (zi), alert("Прогресс успешно восстановлен!")',
    'fetchAiSlogan (qi) for progress_summary caption',
    'Two preview URLs (story + wide), message "Карточки готовы: 9:16 и 16:9."',
    '"Пригласить друзей" button, copy invite link',
    'Workshop: confirm "Концепт успешно выкован!...", Telegram, kind start_route card, setActiveTab(active)',
    'Button "АКТИВИРОВАТЬ В ПУТЕВОДИТЕЛЕ"',
  ],
};

const outPath = join(root, 'docs', 'recovery_inventory.json');
writeFileSync(outPath, JSON.stringify(inventory, null, 2), 'utf8');
console.log('Written', outPath);
console.log('Russian strings:', inventory.russianStrings.length);
console.log('File:line refs:', fileLines.length);
console.log('ProfileView line numbers sample:', profileViewLines.slice(0, 20));
