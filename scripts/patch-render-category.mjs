import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const file = resolve(process.cwd(), 'src/App.tsx');
let s = readFileSync(file, 'utf8');

// Ensure import
if (!s.includes("from './views/CategoryView'")) {
  s = s.replace(
    /(import\s+CategoriesScreen\s+from\s+'\.\/views\/CategoriesScreen';\s*)/,
    "$1\nimport CategoryView from './views/CategoryView';\n"
  );
}

// Replace renderCategory block
const pattern = /const\s+renderCategory\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\};/m;
const replacement = `const renderCategory = () => {
  if (!selectedCategory) {
    return (
      <div className="category-screen">
        <div className="header">
          <button onClick={handleBackToCategories} className="back-button">← Назад к категориям</button>
        </div>
        <div className="category-content">
          <div className="error-message">
            <h2>Категория не выбрана</h2>
            <p>Выберите категорию из списка.</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <CategoryView
      category={selectedCategory}
      badges={badges}
      onBack={handleBackToCategories}
      onBadgeClick={handleBadgeClick}
      onIntroductionClick={handleIntroductionClick}
      onAdditionalMaterialClick={handleAdditionalMaterialClick}
    />
  );
};`;

if (pattern.test(s)) {
  s = s.replace(pattern, replacement);
  writeFileSync(file, s, 'utf8');
  console.log('Patched renderCategory to use CategoryView');
} else {
  console.log('Failed to find renderCategory block');
}

