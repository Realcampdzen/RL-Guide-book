import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const file = resolve(process.cwd(), 'src/App.tsx');
let s = readFileSync(file, 'utf8');

// Fix back button text in introduction
s = s.replace(
  /(onClick=\{handleBackToCategoryFromIntroduction\} className=\"back-button\"\>)[\s\S]*?<\/button>/,
  '$1\n            ← Назад к категории\n          </button>'
);

// Fix title in introduction
s = s.replace(
  /<h1 className=\"app-title\">[\s\S]*\{selectedCategory\.title\}<\/h1>/,
  '<h1 className="app-title">💡 Подсказка: {selectedCategory.title}</h1>'
);

writeFileSync(file, s, 'utf8');
console.log('Introduction strings normalized');

