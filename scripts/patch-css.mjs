import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function patchFile(relPath, patches) {
  const p = resolve(__dirname, '..', relPath);
  let content = readFileSync(p, 'utf8');
  const before = content;
  for (const [pattern, replacement] of patches) {
    content = content.replace(pattern, replacement);
  }
  if (content !== before) {
    writeFileSync(p, content, 'utf8');
    console.log(`Patched: ${relPath}`);
  } else {
    console.log(`No changes: ${relPath}`);
  }
}

patchFile('src/styles/app-inline.css', [
  [/url\('\/.*copy\.png'\)/g, "url('/ai_camp.png')"],
  [/url\('\.\/pictures\/[^']+'\)/g, "url('/pattern_stickers.jpg')"],
  [/url\('\/hero-1\.png'\)/g, "url('/ai_camp.png')"],
]);

console.log('CSS patch complete.');
