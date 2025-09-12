import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const p = resolve(__dirname, '..', 'src', 'components', 'ChatButton.tsx');
let s = readFileSync(p, 'utf8');

// Normalize title attribute
s = s.replace(/title=\{\s*isOpen\s*\?\s*"[^"]*"\s*:\s*"[^"]*"\s*\}/, 'title={isOpen ? "Закрыть чат" : "Открыть чат"}');

// Replace avatar src and add onError fallback once
s = s.replace(/<img\s+([^>]*?)src=\"[^\"]*\"([^>]*)>/, (m, pre, post) => {
  let attrs = `${pre}src="/avatar.jpg" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/�����.jpg'; }}`;
  // ensure alt exists and is readable
  if (!/alt=\"/.test(post)) {
    post += ' alt="Чат-бот"';
  } else {
    post = post.replace(/alt=\"[^\"]*\"/, 'alt="Чат-бот"');
  }
  return `<img ${attrs}${post}>`;
});

// Fix title text
s = s.replace(/<div className=\"chat-button-title\">[\s\S]*?<\/div>/, '<div className="chat-button-title">\n          Чат-бот\n        </div>');

// Fix subtitle text
s = s.replace(/<div className=\"chat-button-subtitle\">[\s\S]*?<\/div>/, '<div className="chat-button-subtitle">\n          Всегда рядом\n        </div>');

writeFileSync(p, s, 'utf8');
console.log('Patched ChatButton.tsx');

