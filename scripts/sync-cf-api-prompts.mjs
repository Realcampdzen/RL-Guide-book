#!/usr/bin/env node
import { execSync } from 'child_process';
/**
 * Sync prompts from chatbot/prompts to cf-api.
 * 1. facts.json -> cf-api/src/neurovalyusha/generated_camp_facts.ts
 * 2. Python system prompt -> cf-api/src/neurovalyusha/generated_chat_prompt.ts
 * Run from repo root. Before deploying cf-api run: npm run sync:cf-api-ai-data && npm run sync:cf-api-prompts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// --- 1. facts.json -> generated_camp_facts.ts ---
const factsPath = path.join(root, 'chatbot', 'prompts', 'facts.json');
const outCampFactsPath = path.join(
  root,
  'cf-api',
  'src',
  'neurovalyusha',
  'generated_camp_facts.ts'
);

if (!fs.existsSync(factsPath)) {
  console.error('chatbot/prompts/facts.json not found');
  process.exit(1);
}

const facts = JSON.parse(fs.readFileSync(factsPath, 'utf-8'));

function toTSLiteral(obj) {
  if (obj === null || obj === undefined) return 'undefined';
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(toTSLiteral).join(', ') + ']';
  }
  const entries = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${toTSLiteral(v)}`);
  return '{ ' + entries.join(', ') + ' }';
}

const tsContent = `/**
 * Auto-generated from chatbot/prompts/facts.json - do not edit by hand.
 * Run from repo root: npm run sync:cf-api-prompts
 */
export const CAMP_FACTS = ${toTSLiteral(facts)}
`;

fs.mkdirSync(path.dirname(outCampFactsPath), { recursive: true });
fs.writeFileSync(outCampFactsPath, tsContent, 'utf-8');
console.log(
  'Synced chatbot/prompts/facts.json -> cf-api/src/neurovalyusha/generated_camp_facts.ts'
);

// --- 2. Python system prompt -> generated_chat_prompt.ts ---
const exportScriptPath = path.join(root, 'chatbot', 'scripts', 'export_system_prompt.py');
const outChatPromptPath = path.join(
  root,
  'cf-api',
  'src',
  'neurovalyusha',
  'generated_chat_prompt.ts'
);

if (!fs.existsSync(exportScriptPath)) {
  console.error('chatbot/scripts/export_system_prompt.py not found');
  process.exit(1);
}

let rawPrompt;
try {
  rawPrompt = execSync(`python "${exportScriptPath}"`, {
    cwd: root,
    encoding: 'utf-8',
    maxBuffer: 2 * 1024 * 1024,
  });
} catch (e) {
  if (e.status === 1 && e.message && e.message.includes('python')) {
    try {
      rawPrompt = execSync(`py "${exportScriptPath}"`, {
        cwd: root,
        encoding: 'utf-8',
        maxBuffer: 2 * 1024 * 1024,
      });
    } catch (e2) {
      console.error(
        'Failed to run Python export script. Ensure Python 3 is available (python or py).',
        e2.message
      );
      process.exit(1);
    }
  } else {
    console.error('Python export script failed:', e.message);
    process.exit(1);
  }
}

// Escape for use inside a TS template literal: \ -> \\, ` -> \`, ${ -> \${
const escaped = rawPrompt.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const chatPromptTs = `/**
 * Auto-generated from chatbot/prompts/putevoditel_system_prompt_optimized.py - do not edit by hand.
 * Run from repo root: npm run sync:cf-api-prompts
 */
export const NEUROVALYUSHA_FULL_CHAT_PROMPT = \`${escaped}\`
`;

fs.mkdirSync(path.dirname(outChatPromptPath), { recursive: true });
fs.writeFileSync(outChatPromptPath, chatPromptTs, 'utf-8');
console.log('Synced chatbot/prompts (Python) -> cf-api/src/neurovalyusha/generated_chat_prompt.ts');
