import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const file = resolve(process.cwd(), 'src/App.tsx');
let s = readFileSync(file, 'utf8');

// Ensure imports
if (!s.includes("from './views/BadgeView'")) {
  s = s.replace(
    /(import\s+CategoriesScreen\s+from\s+'\.\/views\/CategoriesScreen';\s*)/,
    "$1\nimport BadgeView from './views/BadgeView';\n" 
  );
}
if (!s.includes("from './views/BadgeLevelView'")) {
  s = s.replace(
    /(import\s+BadgeView\s+from\s+'\.\/views\/BadgeView';\s*)/,
    "$1\nimport BadgeLevelView from './views/BadgeLevelView';\n" 
  );
}

// Replace renderBadge block
const patternBadge = /const\s+renderBadge\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\};/m;
const replacementBadge = `const renderBadge = () => {
  if (!selectedBadge) {
    return (
      <div className=\"badge-screen\">\n        <div className=\"header\">\n          <button onClick={handleBackToCategories} className=\"back-button\">← Назад к категориям</button>\n        </div>\n        <div className=\"badge-content\">\n          <div className=\"error-message\">\n            <h2>Значок не выбран</h2>\n            <p>Выберите значок в категории.</p>\n          </div>\n        </div>\n      </div>
    );
  }
  return (
    <BadgeView
      category={selectedCategory!}
      badge={selectedBadge}
      badges={badges}
      onBack={handleBackToCategories}
      onLevelSelect={(lvl) => setSelectedLevel(lvl as string)}
    />
  );
};`;

if (patternBadge.test(s)) {
  s = s.replace(patternBadge, replacementBadge);
}

// Replace renderBadgeLevel block
const patternLevel = /const\s+renderBadgeLevel\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\};/m;
const replacementLevel = `const renderBadgeLevel = () => {
  if (!selectedBadge || !selectedLevel) return null;
  return (
    <BadgeLevelView
      category={selectedCategory!}
      badge={selectedBadge}
      level={selectedLevel}
      badges={badges}
      onBack={() => setCurrentView('badge')}
      onChangeLevel={(lvl) => setSelectedLevel(lvl as string)}
    />
  );
};`;

if (patternLevel.test(s)) {
  s = s.replace(patternLevel, replacementLevel);
}

writeFileSync(file, s, 'utf8');
console.log('Patched renderBadge and renderBadgeLevel to use views');

