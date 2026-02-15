import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const file = resolve(process.cwd(), 'src/App.tsx');
let s = readFileSync(file, 'utf8');

// Ensure import
if (!s.includes("from './views/CategoriesScreen'")) {
  s = s.replace(
    /(import\s+IntroScreen\s+from\s+'\.\/views\/IntroScreen';\s*)/,
    "$1\nimport CategoriesScreen from './views/CategoriesScreen';\n"
  );
}

// Replace renderCategories function block
const pattern = /const\s+renderCategories\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\};/m;
const replacement = `const renderCategories = () => (
    <CategoriesScreen 
      categories={categories}
      onBack={handleBackToIntro}
      onSelectCategory={handleCategoryClick}
    />
  );`;

if (pattern.test(s)) {
  s = s.replace(pattern, replacement);
  writeFileSync(file, s, 'utf8');
  console.log('Patched renderCategories to use CategoriesScreen');
} else {
  console.log('Failed to find renderCategories block');
}

