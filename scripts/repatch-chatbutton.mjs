import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const p = resolve(__dirname, '..', 'src', 'components', 'ChatButton.tsx');
let s = readFileSync(p, 'utf8');

s = s.replace(/title=\{[^}]*\}/, 'title={isOpen ? "Закрыть чат" : "Открыть чат"}');

s = s.replace(/<img\s+([^>]*?)src=\"[^\"]*\"([^>]*)>/, (m, pre, post) => {
  let attrs = `${pre}src=\\"/badges_photo.jpg\\"`;
  let newPost = post;
  if (!/alt=\"/.test(newPost)) {
    newPost += ' alt="Чат-бот"';
  } else {
    newPost = newPost.replace(/alt=\"[^\"]*\"/, 'alt="Чат-бот"');
  }
  return `<img ${attrs}${newPost}>`;
});

s = s.replace(/<div className=\"chat-button-title\">[\s\S]*?<\/div>/, '<div className="chat-button-title">\n          Чат-бот\n        </div>');

s = s.replace(/<div className=\"chat-button-subtitle\">[\s\S]*?<\/div>/, '<div className="chat-button-subtitle">\n          Всегда рядом\n        </div>');

writeFileSync(p, s, 'utf8');
console.log('Re-patched ChatButton.tsx');
