import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const p = resolve(process.cwd(), 'src/App.tsx');
const s = readFileSync(p, 'utf8');

const startMarker = 'const renderIntro = () => (';
const idx = s.indexOf(startMarker);
if (idx === -1) {
  console.error('Start marker not found');
  process.exit(1);
}

const head = s.slice(0, idx);

const tail = `const renderIntro = () => (
    <IntroScreen onLogoClick={handleLogoClick} onStartClick={handleIntroClick} />
  );

  const renderCategories = () => (
    <CategoriesScreen
      categories={categories}
      onBack={handleBackToIntro}
      onSelectCategory={handleCategoryClick}
    />
  );

  const renderCategory = () => {
    if (!selectedCategory) return null;
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
  };

  const renderBadge = () => {
    if (!selectedBadge || !selectedCategory) return null;
    return (
      <BadgeView
        category={selectedCategory}
        badge={selectedBadge}
        badges={badges}
        onBack={handleBackToCategories}
        onLevelSelect={(lvl) => { setSelectedLevel(lvl as string); setSelectedLevelBadgeTitle(selectedBadge.title); setCurrentView('badge-level'); }}
      />
    );
  };

  const renderBadgeLevel = () => {
    if (!selectedBadge || !selectedCategory || !selectedLevel) return null;
    return (
      <BadgeLevelView
        category={selectedCategory}
        badge={selectedBadge}
        level={selectedLevel}
        badges={badges}
        onBack={() => setCurrentView('badge')}
        onChangeLevel={(lvl) => setSelectedLevel(lvl as string)}
      />
    );
  };

  const renderIntroduction = () => {
    if (!selectedCategory?.introduction?.has_introduction) return null;
    const cleanedHtml = cleanHtmlContent(selectedCategory.introduction.html);
    return (
      <div className="introduction-screen">
        <div className="header">
          <button onClick={handleBackToCategoryFromIntroduction} className="back-button">← Назад к категории</button>
          <h1 className="app-title">💡 Подсказка: {selectedCategory.title}</h1>
        </div>
        <div className="introduction-content">
          <div className="introduction-text" dangerouslySetInnerHTML={{ __html: cleanedHtml }} />
        </div>
      </div>
    );
  };

  const renderAdditionalMaterial = () => {
    if (!selectedAdditionalMaterial) return null;
    return (
      <div className="additional-material-screen">
        <div className="header">
          <button onClick={handleBackToCategoryFromAdditional} className="back-button">← Назад к категории</button>
          <h1 className="app-title">{selectedAdditionalMaterial.title}</h1>
        </div>
        <div className="additional-material-content">
          <div className="additional-material-text" dangerouslySetInnerHTML={{ __html: selectedAdditionalMaterial.content }} />
        </div>
      </div>
    );
  };

  const renderAboutCamp = () => (
    <div className="about-camp-screen">
      <div className="header">
        <button onClick={handleBackToIntro} className="back-button">← Назад к введению</button>
        <h1 className="app-title">О лагере</h1>
      </div>
      <div className="about-camp-content">
        <div className="camp-description">
          <h2>Реальный лагерь — территория роста!</h2>
          <p>У нас ребята пробуют новое и растут, создают свой лагерь вместе со взрослыми.</p>
        </div>
      </div>
    </div>
  );

  const renderRegistrationForm = () => (
    <div className="registration-form-screen">
      <div className="header">
        <button onClick={handleBackToIntro} className="back-button">← Назад к введению</button>
        <h1 className="app-title">Запись в лагерь</h1>
      </div>
      <div className="registration-form-content">
        <div className="form-container">
          <h2>Заполните анкету</h2>
          <p>Мы свяжемся с вами в ближайшее время.</p>
          <div className="form-group">
            <label>Имя ребёнка *</label>
            <input type="text" value={formData.childName} onChange={(e) => handleFormInputChange('childName', e.target.value)} placeholder="Иван" required />
          </div>
          <div className="form-group">
            <label>Имя и фамилия родителя *</label>
            <input type="text" value={formData.parentName} onChange={(e) => handleFormInputChange('parentName', e.target.value)} placeholder="Мария Иванова" required />
          </div>
          <div className="form-group">
            <label>Телефон *</label>
            <input type="tel" value={formData.phone} onChange={(e) => handleFormInputChange('phone', e.target.value)} placeholder="+7 (999) 123-45-67" required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={formData.email} onChange={(e) => handleFormInputChange('email', e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Возраст ребёнка *</label>
            <input type="number" value={formData.childAge} onChange={(e) => handleFormInputChange('childAge', e.target.value)} min="6" max="17" required />
          </div>
          <div className="form-group">
            <label>Пожелания</label>
            <textarea value={formData.specialRequests} onChange={(e) => handleFormInputChange('specialRequests', e.target.value)} placeholder="Аллергии, особенности здоровья, пожелания..." rows={3} />
          </div>
          <button className="submit-button" onClick={handleFormSubmit} disabled={!formData.childName || !formData.parentName || !formData.phone || !formData.childAge}>
            Отправить в Telegram
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app">
      {currentView === 'intro' && renderIntro()}
      {currentView === 'categories' && renderCategories()}
      {currentView === 'category' && renderCategory()}
      {currentView === 'badge' && renderBadge()}
      {currentView === 'badge-level' && renderBadgeLevel()}
      {currentView === 'introduction' && renderIntroduction()}
      {currentView === 'additional-material' && renderAdditionalMaterial()}
      {currentView === 'about-camp' && renderAboutCamp()}
      {currentView === 'registration-form' && renderRegistrationForm()}

      <ChatButton onClick={() => setIsChatOpen(!isChatOpen)} isOpen={isChatOpen} />
      <ChatBot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentView={currentView}
        currentCategory={selectedCategory ? { id: selectedCategory.id, title: selectedCategory.title, emoji: selectedCategory.emoji } : undefined}
        currentBadge={selectedBadge ? { id: selectedBadge.id, title: selectedBadge.title, emoji: selectedBadge.emoji, categoryId: selectedBadge.category_id } : undefined}
        currentLevel={selectedLevel || undefined}
        currentLevelBadgeTitle={selectedLevelBadgeTitle || undefined}
      />
    </div>
  );
};

export default App;
`;

writeFileSync(p, head + tail, 'utf8');
console.log('Rewrote App.tsx tail from renderIntro to EOF');
