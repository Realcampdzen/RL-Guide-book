import React, { useEffect, useRef, Suspense } from 'react';
import { pluralizeRu } from '../utils/textFormatting';
import { useCustomCursor } from '../hooks/useCustomCursor';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTiltCard } from '../hooks/useTiltCard';
import BadgeIcon from '../components/BadgeIcon';
import { getBadgeImagePath } from '../utils/badgeImages'; // Import getBadgeImagePath
import '../styles/category-view.css';
import type { Category, Badge } from '../types/guide';

const loadChatBot = () => import('../components/ChatBot');
const loadChatAvatar = () => import('../components/ChatAvatar');
const ChatBot = React.lazy(loadChatBot);
const ChatAvatar = React.lazy(loadChatAvatar);

interface CategoryViewProps {
  category: Category;
  badges: Badge[]; // Already grouped/processed badges
  onBack: () => void;
  onBadgeClick: (badge: Badge) => void;
  onIntroductionClick: () => void;
  onAdditionalMaterialClick: (type: 'checklists' | 'methodology', filename: string) => void;
  // Chat props
  onChatToggle: () => void;
  isChatOpen: boolean;
  onChatClose: () => void;
}

/**
 * Inner component to handle tilt effect for each card
 */
const TiltBadgeCard: React.FC<{
  badge: Badge;
  index: number;
  category: Category;
  onBadgeClick: (badge: Badge) => void;
}> = ({ badge, index, category, onBadgeClick }) => {
  const cardRef = useRef<HTMLElement>(null);
  useTiltCard(cardRef);

  // Determine which image to use for the background (Realism variant)
  // If multiple levels, use the last one (highest level)
  let realismBgUrl: string | null = null;
  
  // Extract base badge ID (e.g., "1.4" from "1.4.1")
  const badgeIdStr = String(badge.id);
  const baseBadgeId = badgeIdStr.split('.').slice(0, 2).join('.');
  
  if (Array.isArray((badge as any).allLevels) && (badge as any).allLevels.length > 0) {
    const levels = (badge as any).allLevels;
    const targetLevel = levels[levels.length - 1]; // Use the last level
    realismBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, targetLevel.id, targetLevel.title, 'realism');
  } else {
    // Single level
    realismBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, undefined, undefined, 'realism');
  }

  return (
    <article 
      ref={cardRef}
      key={badge.id} 
      className={`badge-card tilt-card hover-target ${(badge.id || '').startsWith('1.15') ? 'badge-centered-row' : ''} reveal-on-scroll`}
      style={{ 
        animationDelay: `${index * 0.05}s`,
        backgroundImage: realismBgUrl ? `url('${realismBgUrl}')` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
      onClick={() => onBadgeClick(badge)}
    >
      <div className="badge-card__icon">
        {(() => {
           const badgeIdStr = String(badge.id);
           const baseBadgeId = badgeIdStr.split('.').slice(0, 2).join('.');
           
           const isImageBadge = ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.16'].includes(baseBadgeId);

           if (isImageBadge) {
             // Find base level (Базовый уровень) from allLevels or use first level
             let baseLevelId: string | undefined;
             let baseLevelTitle: string | undefined;
             
             if (Array.isArray((badge as any).allLevels) && (badge as any).allLevels.length > 0) {
               const baseLevel = (badge as any).allLevels.find((l: any) => 
                 (l.level || '').toLowerCase().includes('базовый') || 
                 (l.level || '').toLowerCase().includes('одноуровнев')
               ) || (badge as any).allLevels[0];
               
               baseLevelId = baseLevel.id;
               baseLevelTitle = baseLevel.title;
             }
             
               return (
               <BadgeIcon
                 badgeId={baseBadgeId}
                 badgeTitle={badge.title}
                 categoryId={badge.category_id || category.id}
                 emoji={badge.emoji || ''}
                 levelId={baseLevelId}
                 levelTitle={baseLevelTitle}
                 className="badge-emoji"
                 size="responsive"
               />
             );
           }
           return <div className="badge-emoji" style={{ fontSize: '1em' }}>{badge.emoji || '🏆'}</div>;
         })()}
      </div>
      
      <h3 className="badge-card__title">{badge.title}</h3>
      
      <div className="badge-card__level">
        {Array.isArray((badge as any).allLevels) && (badge as any).allLevels.length > 1
          ? `${(badge as any).allLevels.length} ${pluralizeRu((badge as any).allLevels.length, ['уровень', 'уровня', 'уровней'])}`
          : 'одноуровневый'}
      </div>
    </article>
  );
};

const CategoryView: React.FC<CategoryViewProps> = ({
  category,
  badges,
  onBack,
  onBadgeClick,
  onIntroductionClick,
  onAdditionalMaterialClick,
  onChatToggle,
  isChatOpen,
  onChatClose,
}) => {
  const { cursorDotRef, cursorOutlineRef, cursorReactorRef } = useCustomCursor();
  const { initReveal } = useScrollReveal();

  useEffect(() => {
    initReveal('.reveal-on-scroll');
    window.scrollTo(0, 0);
  }, [initReveal]);

  const titleWords = (category.title || '').trim().split(/\s+/);
  const titleLastWord = titleWords.pop() || '';
  const titleLead = titleWords.join(' ');

  // Mapping for category header images
  // IDs based on MASTER_INDEX.json order or inspection
  const categoryHeaderMap: Record<string, string> = {
    '1': 'За личные достижения.jpg',
    '2': 'За легендарные дела.jpg',
    '3': 'Медиа значки.jpg',
    '4': 'За лагерные дела.jpg',
    '5': 'За отрядные дела.jpg',
    '6': 'Гармония и порядок.jpg',
    '7': 'За творческие достижения.jpg',
    '8': 'Значки Движков.jpg',
    '9': 'Бро-значки.jpg',
    '10': 'Значки на флаг отряда.jpg',
    '11': 'Реальность осознанность и внимательность.jpg',
    '12': 'ИИ нейросети для обучения и творчества.jpg',
    '13': 'Софт-скиллз Интенсив.jpg',
    '14': 'Значки Инспектора Пользы.jpg',
  };

  const headerImageFile = categoryHeaderMap[category.id];
  // Encode the filename to handle spaces and Cyrillic characters correctly in URL
  const bgUrl = headerImageFile 
    ? `${import.meta.env.BASE_URL}шапки внутри категорий/${encodeURIComponent(headerImageFile)}?v=3`
    : `${import.meta.env.BASE_URL}category_${category.id}.png?v=2`; // Fallback to old icon if not found

  return (
    <div className="category-view-container">
      {/* Noise Overlay */}
      <div className="noise-overlay"></div>

      {/* Custom Cursor */}
      <div className="cursor-reactor" ref={cursorReactorRef} data-cursor-reactor></div>
      <div className="cursor-dot" ref={cursorDotRef} data-cursor></div>
      <div className="cursor-outline" ref={cursorOutlineRef} data-cursor-outline></div>

      {/* Header Bar */}
      <header 
        className="category-header-bar" 
        style={{ '--header-bg': `url('${bgUrl}')` } as React.CSSProperties}
      >
        <div className="category-header-content">
          <button onClick={onBack} className="nav-link-back hover-target">
            <span>← Назад</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="category-main">
        {/* Hero Section */}
        <section className="category-hero reveal-on-scroll">
          <h1 
            className={`category-title hover-target ${category.introduction?.has_introduction ? 'category-title-clickable' : ''}`}
            onClick={category.introduction?.has_introduction ? onIntroductionClick : undefined}
          >
            {titleLead && <span className="category-title-lead">{titleLead}</span>}
            {titleLastWord && (
              <span className={titleLead ? 'category-title-highlight' : 'category-title-lead'}>
                {titleLastWord}
              </span>
            )}
          </h1>
          <p className="category-subtitle">
            {badges.length} {pluralizeRu(badges.length, ['значок', 'значка', 'значков'])} в этой категории.
            Выберите значок, чтобы узнать подробности и критерии получения.
          </p>

          <div className="category-actions">
            {category.id === '14' && (
              <>
                <button 
                  onClick={() => onAdditionalMaterialClick('checklists', 'general-checklist.md')}
                  className="action-btn hover-target"
                >
                  📋 Чек-лист
                </button>
                <button 
                  onClick={() => onAdditionalMaterialClick('checklists', 'challenges-checklist.md')}
                  className="action-btn hover-target"
                >
                  🧩 Челленджи
                </button>
                <button 
                  onClick={() => onAdditionalMaterialClick('checklists', 'active-checklist.md')}
                  className="action-btn hover-target"
                >
                  ✅ Активный
                </button>
                <button 
                  onClick={() => onAdditionalMaterialClick('methodology', 'inspector-methodology.md')}
                  className="action-btn hover-target"
                >
                  📘 Методика
                </button>
                <button 
                  onClick={() => onAdditionalMaterialClick('methodology', 'inspector-codex.md')}
                  className="action-btn hover-target"
                >
                  📜 Кодекс
                </button>
                <button 
                  onClick={() => onAdditionalMaterialClick('methodology', 'friendship-guide.md')}
                  className="action-btn hover-target"
                >
                  🤝 Дружба
                </button>
              </>
            )}
          </div>
        </section>

        {/* Badges Grid */}
        <div className="badges-grid">
          {badges.map((badge, index) => (
            <TiltBadgeCard 
              key={badge.id}
              badge={badge}
              index={index}
              category={category}
              onBadgeClick={onBadgeClick}
            />
          ))}
        </div>
      </main>

      {/* ChatBot and ChatAvatar */}
      <Suspense fallback={null}>
        <ChatAvatar onClick={onChatToggle} isOpen={isChatOpen} />
        <ChatBot 
          isOpen={isChatOpen} 
          onClose={onChatClose} 
          currentView="category"
          currentCategory={category}
        />
      </Suspense>
    </div>
  );
};

export default CategoryView;
