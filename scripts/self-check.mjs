import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();

function read(path) {
  try { return readFileSync(resolve(root, path), 'utf8'); } catch { return null; }
}

function section(title) { console.log(`\n=== ${title} ===`); }

// Ports consistency
section('Ports consistency');
const pkg = JSON.parse(read('package.json'));
const viteConfig = read('vite.config.ts') || '';
const startAll = read('start_all_services.bat') || '';

const devScript = pkg.scripts?.dev || '';
const devPortMatch = devScript.match(/--port\s+(\d+)/);
const devPort = devPortMatch ? devPortMatch[1] : 'unknown';
const vitePortMatch = viteConfig.match(/server:\s*\{[\s\S]*?port:\s*(\d+)/);
const vitePort = vitePortMatch ? vitePortMatch[1] : 'unknown';
const batPort = startAll.match(/Web Interface.*(\d{4})/)?.[1] || 'unknown';

console.log(`dev script port: ${devPort}`);
console.log(`vite.config port: ${vitePort}`);
console.log(`start_all_services.bat port line: ${batPort}`);
console.log((devPort === vitePort && vitePort === batPort) ? 'OK: ports are consistent' : 'WARN: ports mismatch');

// Assets
section('Assets');
const assets = [
  'public/badges_photo.jpg',
  'public/pattern_stickers.jpg',
  'public/ai_camp.png',
  'public/category_1.png'
];
for (const a of assets) {
  console.log(`${a}: ${existsSync(resolve(root, a)) ? 'present' : 'MISSING'}`);
}

// CSS references sanity
section('CSS references');
const appInline = read('src/styles/app-inline.css') || '';
console.log(appInline.includes("/ai_camp.png") ? 'OK: intro bg resolved to /ai_camp.png' : 'WARN: intro bg not updated');
console.log(appInline.includes("pattern_stickers.jpg") ? 'OK: benefit bg set' : 'WARN: benefit bg not set');

// Duplicate inline CSS vs public CSS
section('Styles duplication');
console.log(existsSync(resolve(root, 'public/app-inline.css')) ? 'NOTE: Public app-inline.css exists' : '');
console.log(existsSync(resolve(root, 'src/styles/app-inline.css')) ? 'NOTE: Src app-inline.css exists' : '');

// Env sanity
section('Env sanity');
const env = read('.env') || '';
if (env) {
  const hasSecrets = /(sk-|vk1\.a\.|telegram)/i.test(env);
  console.log(hasSecrets ? 'WARN: .env contains real-looking secrets — rotate and keep local only' : '.env present');
} else {
  console.log('.env not present');
}

console.log('\nSelf-check completed.');

