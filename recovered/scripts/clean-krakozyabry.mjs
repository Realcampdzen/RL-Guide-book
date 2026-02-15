import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const file = resolve(process.cwd(), 'src/App.tsx');
let s = readFileSync(file, 'utf8');

// Introduction screen header fixes
s = s.replace(
  /<h1 className=\"app-title\">\?\? .*Подсказка:.*\{selectedCategory\.title\}<\/h1>/,
  '<h1 className="app-title">💡 Подсказка: {selectedCategory.title}</h1>'
);

// Introduction back button label (to category)
s = s.replace(
  /(onClick=\{handleBackToCategoryFromIntroduction\} className=\"back-button\"\>)[\s\S]*?<\/button>/,
  '$1\n            ← Назад к категории\n          </button>'
);

// About camp header title
s = s.replace(
  /<h1 className=\"app-title\">\?\? [^<]*<\/h1>/,
  '<h1 className="app-title">О лагере</h1>'
);

// About camp back button text (to intro)
s = s.replace(
  /(onClick=\{handleBackToIntro\} className=\"back-button\"\>)[\s\S]*?<\/button>/,
  '$1\n          ← Назад к введению\n        </button>'
);

// About camp h2 lead title
s = s.replace(
  /<h2>\?\? [^<]*<\/h2>/,
  '<h2>Реальный лагерь — территория роста!</h2>'
);

// About camp benefits section title
s = s.replace(
  /<h3>\?\? [^<]*<\/h3>/,
  '<h3>Что вас ждёт</h3>'
);

// Benefit #1 title
s = s.replace(
  />\?\? [^<]*4K<\/h4>/,
  '>Навыки 4K</h4>'
);

// Benefit #1 bullets
s = s.replace(
  /<p style=\{[\s\S]*?\}>[\s\S]*?<\/p>/,
  `<p style={{
                    color: '#fff',
                    fontWeight: '600',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    🎨 Творчество<br/>
                    🤝 Командность<br/>
                    🧠 Мышление<br/>
                    💡 Инициатива
                  </p>`
);

// Benefit #2 title (AI)
s = s.replace(
  />\?[^<]*AI[^<]*<\/h4>/,
  '>ИИ‑технологии — учёба и творчество</h4>'
);

// Benefit #3 title (co-management)
s = s.replace(
  />\?\? [^<]*<\/h4>/,
  '>Совместное управление и полезные дела</h4>'
);

writeFileSync(file, s, 'utf8');
console.log('Cleaned common mojibake in App.tsx');

