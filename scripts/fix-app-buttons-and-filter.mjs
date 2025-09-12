import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const p = resolve(process.cwd(), 'src/App.tsx');
let s = readFileSync(p, 'utf8');
let changed = false;

function replaceBlock(regex, replacement) {
  const before = s;
  s = s.replace(regex, replacement);
  if (s !== before) changed = true;
}

// Normalize back buttons (remove stray ESC and garbled text)
replaceBlock(/<button\s+onClick=\{handleBackToIntro\}\s+className="back-button">[\s\S]*?<\/button>/,
  '<button onClick={handleBackToIntro} className="back-button">\n              ← Назад к категориям\n            </button>');

replaceBlock(/<button\s+onClick=\{handleBackToCategories\}\s+className="back-button">[\s\S]*?<\/button>/,
  '<button onClick={handleBackToCategories} className="back-button">\n            ← Назад к категориям\n          </button>');

replaceBlock(/<button\s+onClick=\{handleBackToCategoryFromAdditional\}\s+className="back-button">[\s\S]*?<\/button>/,
  '<button onClick={handleBackToCategoryFromAdditional} className="back-button">\n            ← Назад к категории\n          </button>');

replaceBlock(/<button\s+onClick=\{handleBackToCategoryFromIntroduction\}\s+className="back-button">[\s\S]*?<\/button>/,
  '<button onClick={handleBackToCategoryFromIntroduction} className="back-button">\n            ← Назад к категории\n          </button>');

replaceBlock(/<button\s+onClick=\{handleBackToAboutCamp\}\s+className="back-button">[\s\S]*?<\/button>/,
  '<button onClick={handleBackToAboutCamp} className="back-button">\n            ← Назад\n          </button>');

// Simplify category badges filter to show all badges in the selected category
replaceBlock(/const\s+categoryBadges\s*=\s*badges\.filter\([\s\S]*?\);/,
  'const categoryBadges = badges.filter(badge => badge.category_id === selectedCategory.id);');

if (changed) {
  writeFileSync(p, s, 'utf8');
  console.log('Patched App.tsx (buttons + category filter)');
} else {
  console.log('No changes applied (patterns not found)');
}

