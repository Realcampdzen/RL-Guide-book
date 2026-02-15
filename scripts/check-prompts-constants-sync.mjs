/**
 * Check that Python prompt file is not newer than cf-api constants.ts
 * without a corresponding update (reminds to manually update CAMP_STATIC_INFO / NEUROVALYUSHA_SOCIAL_SYSTEM).
 * See docs/DATA_SYNC.md.
 * Run from repo root.
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const pyPath = path.join(root, 'chatbot/prompts/putevoditel_system_prompt_optimized.py');
const tsPath = path.join(root, 'cf-api/src/neurovalyusha/constants.ts');

const pyStat = fs.statSync(pyPath, { throwIfNoEntry: false });
const tsStat = fs.statSync(tsPath, { throwIfNoEntry: false });

if (!pyStat || !tsStat) {
  process.exit(0);
}

if (pyStat.mtimeMs > tsStat.mtimeMs) {
  console.error(
    'Промпт Python новее constants.ts. Проверьте ручное обновление CAMP_STATIC_INFO и NEUROVALYUSHA_SOCIAL_SYSTEM (см. docs/DATA_SYNC.md).'
  );
  process.exit(1);
}

process.exit(0);
