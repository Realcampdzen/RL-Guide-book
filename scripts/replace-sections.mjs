import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const file = resolve(process.cwd(), 'src/App.tsx');
let s = readFileSync(file, 'utf8');

// Replace renderIntroduction with clean Russian texts
const introPattern = /const\s+renderIntroduction\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\};/m;
const introReplacement = `const renderIntroduction = () => {
    if (!selectedCategory?.introduction?.has_introduction) return null;
    const cleanedHtml = cleanHtmlContent(selectedCategory.introduction.html);
    return (
      <div className="introduction-screen">
        <div className="header">
          <button onClick={handleBackToCategoryFromIntroduction} className="back-button">
            ← Назад к категории
          </button>
          <h1 className="app-title">💡 Подсказка: {selectedCategory.title}</h1>
        </div>
        <div className="introduction-content">
          <div 
            className="introduction-text"
            dangerouslySetInnerHTML={{ __html: cleanedHtml }}
          />
        </div>
      </div>
    );
  };`;
console.log('introPattern match:', introPattern.test(s));
if (introPattern.test(s)) s = s.replace(introPattern, introReplacement);

// Replace renderAboutCamp with clean Russian texts
const aboutPattern = /const\s+renderAboutCamp\s*=\s*\(\)\s*=>\s*\([\s\S]*?\n\s*\);/m;
const aboutReplacement = `const renderAboutCamp = () => (
    <div className="about-camp-screen">
      <div className="header">
        <button onClick={handleBackToIntro} className="back-button">
          ← Назад к введению
        </button>
        <h1 className="app-title">О лагере</h1>
      </div>
      <div className="about-camp-content">
        <div className="camp-description">
          <h2>Реальный лагерь — территория роста!</h2>
          <p>
            У нас ребята пробуют новое и растут, создают свой лагерь вместе со взрослыми — 
            <strong>инициатива, творчество, ответственность, команда и вклад в общее дело.</strong>
          </p>
          <p>
            <strong>7 дней в смене</strong> — это возможность проявить себя в разных ролях, 
            найти дело по душе и собрать свои достижения.
          </p>

          <h3>Что вас ждёт</h3>
          <div className="benefits-grid">
            <div className="benefit-item clickable" style={{
              background:
                'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("/skills_4k.png") center/cover no-repeat',
              cursor: 'pointer'
            }} onClick={() => {
              const category = categories.find(c => c.id === '13');
              if (category) handleCategoryClick(category);
            }}>
              <h4 style={{ color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', fontWeight: 'bold' }}>Навыки 4K</h4>
              <p style={{ color: '#fff', fontWeight: '600', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                🎨 Творчество<br/>
                🤝 Командность<br/>
                🧠 Мышление<br/>
                💡 Инициатива
              </p>
            </div>

            <div className="benefit-item clickable" style={{
              background:
                'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("/ai_camp.png") center/cover no-repeat',
              cursor: 'pointer'
            }} onClick={() => {
              const category = categories.find(c => c.id === '12');
              if (category) handleCategoryClick(category);
            }}>
              <h4 style={{ color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', fontWeight: 'bold' }}>ИИ‑технологии — учёба и творчество</h4>
              <p style={{ color: '#fff', fontWeight: '600', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                Проекты, творчество и учёба с ИИ: подсказки, идеи, развитие навыков и интересов.
              </p>
            </div>

            <div className="benefit-item clickable" style={{
              background:
                'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("/co_management.png") center/cover no-repeat',
              cursor: 'pointer'
            }} onClick={() => {
              const category = categories.find(c => c.id === '9');
              if (category) handleCategoryClick(category);
            }}>
              <h4 style={{ color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', fontWeight: 'bold' }}>Совместное управление и полезные дела</h4>
              <p style={{ color: '#fff', fontWeight: '600', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                Учимся договариваться, брать ответственность и делать добро вместе — для отряда и лагеря.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );`;
console.log('aboutPattern match:', aboutPattern.test(s));
if (aboutPattern.test(s)) s = s.replace(aboutPattern, aboutReplacement);

writeFileSync(file, s, 'utf8');
console.log('Replaced renderIntroduction and renderAboutCamp with clean texts');
