import React, { useEffect, useRef, useState, Suspense } from 'react';
import { pluralizeRu } from '../utils/textFormatting';
import { useCustomCursor } from '../hooks/useCustomCursor';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTiltCard } from '../hooks/useTiltCard';
import BadgeIcon from '../components/BadgeIcon';
import { getBadgeImagePath } from '../utils/badgeImages'; // Import getBadgeImagePath
import DataErrorState from '../components/DataErrorState';
import { Skeleton } from '../components/Skeleton';
import '../styles/category-view.css';
import type { Category, Badge } from '../types/guide';

const loadChatBot = () => import('../components/ChatBot');
const loadChatAvatar = () => import('../components/ChatAvatar');
const ChatBot = React.lazy(loadChatBot);
const ChatAvatar = React.lazy(loadChatAvatar);

const PREFETCH_BADGE_BG_COUNT = 12;

function shouldPrefetchBadgeBackgrounds(): boolean {
  if (typeof window === 'undefined') return false;
  // Respect our perf-lite mode and user's data-saver hints.
  if (document.documentElement?.dataset?.perf === 'lite') return false;
  const connection = (navigator as any).connection;
  if (connection?.saveData === true) return false;
  if (connection?.effectiveType && ['2g', 'slow-2g'].includes(connection.effectiveType)) return false;
  return true;
}

function computeBadgeBackgroundLayerUrls(badge: Badge, category: Category): string[] {
  let realismBgUrl: string | null = null;
  let defaultBgUrl: string | null = null;
  let realismBaseBgUrl: string | null = null;
  let defaultBaseBgUrl: string | null = null;

  const badgeIdStr = String(badge.id);
  const baseBadgeId = badgeIdStr.split('.').slice(0, 2).join('.');

  if (Array.isArray((badge as any).allLevels) && (badge as any).allLevels.length > 0) {
    const levels = (badge as any).allLevels;
    const targetLevel = levels[levels.length - 1];
    realismBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, targetLevel.id, targetLevel.title, 'realism');
    defaultBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, targetLevel.id, targetLevel.title, 'default');
  } else {
    realismBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, undefined, undefined, 'realism');
    defaultBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, undefined, undefined, 'default');
  }

  // Base (level-agnostic) fallback. Some badges have only "1 ..." images even if they have multiple levels.
  realismBaseBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, undefined, undefined, 'realism');
  defaultBaseBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, undefined, undefined, 'default');

  return [realismBgUrl, realismBaseBgUrl, defaultBgUrl, defaultBaseBgUrl].filter(Boolean) as string[];
}

function warmImageCache(url: string) {
  if (!url || typeof window === 'undefined') return;
  const img = new Image();
  img.decoding = 'async';
  img.loading = 'eager';
  img.src = url;
}

interface CategoryViewProps {
  category: Category;
  badges: Badge[]; // Already grouped/processed badges
  isLoadingBadges?: boolean;
  errorState?: { message: string };
  onRetryBadges?: () => void;
  onBack: () => void;
  onBadgeClick: (badge: Badge) => void;
  onIntroductionClick: () => void;
  onAdditionalMaterialClick: (type: 'checklists' | 'methodology', filename: string) => void;
  // Chat props
  onChatToggle: () => void;
  isChatOpen: boolean;
  onChatClose: () => void;
  // Navigation props
  onOpenCategories: () => void;
  onTelegramContact: () => void;
  onBackToIntro: () => void;
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
  const [isIconExpanded, setIsIconExpanded] = useState(false);
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useTiltCard(cardRef);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
    };
  }, []);

  // Determine which image to use for the background (Realism variant)
  // If multiple levels, use the last one (highest level)
  let realismBgUrl: string | null = null;
  let defaultBgUrl: string | null = null;
  let realismBaseBgUrl: string | null = null;
  let defaultBaseBgUrl: string | null = null;
  
  // Extract base badge ID (e.g., "1.4" from "1.4.1")
  const badgeIdStr = String(badge.id);
  const baseBadgeId = badgeIdStr.split('.').slice(0, 2).join('.');
  
  if (Array.isArray((badge as any).allLevels) && (badge as any).allLevels.length > 0) {
    const levels = (badge as any).allLevels;
    const targetLevel = levels[levels.length - 1]; // Use the last level
    realismBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, targetLevel.id, targetLevel.title, 'realism');
    defaultBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, targetLevel.id, targetLevel.title, 'default');
  } else {
    // Single level
    realismBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, undefined, undefined, 'realism');
    defaultBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, undefined, undefined, 'default');
  }

  // Base (level-agnostic) fallback. Some badges have only "1 ..." images even if they have multiple levels.
  realismBaseBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, undefined, undefined, 'realism');
  defaultBaseBgUrl = getBadgeImagePath(baseBadgeId, badge.title, category.id, undefined, undefined, 'default');

  const bgLayers = [realismBgUrl, realismBaseBgUrl, defaultBgUrl, defaultBaseBgUrl].filter(Boolean) as string[];
  const cardBg = bgLayers.length ? bgLayers.map((u) => `url('${u}')`).join(', ') : undefined;

  const handleCardClick = () => {
    // Увеличиваем значок при клике
    setIsIconExpanded(true);
    
    // Очищаем предыдущий таймер, если он есть
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
    }
    
    // Через 600ms возвращаем значок обратно
    expandTimeoutRef.current = setTimeout(() => {
      setIsIconExpanded(false);
    }, 600);
    
    onBadgeClick(badge);
  };

  return (
    <article 
      ref={cardRef}
      key={badge.id} 
      className={`badge-card tilt-card hover-target ${(badge.id || '').startsWith('1.15') ? 'badge-centered-row' : ''} reveal-on-scroll`}
      role="button"
      tabIndex={0}
      aria-label={`Значок: ${badge.title}`}
      style={{ 
        animationDelay: `${index * 0.05}s`,
        backgroundImage: cardBg,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        cursor: 'pointer'
      }}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      onTouchStart={() => {
        // Touch start logic if any, currently empty
      }}
      onMouseEnter={() => {
        // Mouse enter logic if any, currently empty
      }}
    >
      <div className={`badge-card__icon ${isIconExpanded ? 'is-expanded' : ''}`}>
        {(() => {
           const badgeIdStr = String(badge.id);
           const baseBadgeId = badgeIdStr.split('.').slice(0, 2).join('.');
           
           const isImageBadge = ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.16'].includes(baseBadgeId);

           if (isImageBadge) {
               return (
               <BadgeIcon
                 badgeId={baseBadgeId}
                 badgeTitle={badge.title}
                 categoryId={badge.category_id || category.id}
                 emoji={badge.emoji || ''}
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
  isLoadingBadges = false,
  errorState,
  onRetryBadges,
  onBack,
  onBadgeClick,
  onIntroductionClick,
  onAdditionalMaterialClick,
  onChatToggle,
  isChatOpen,
  onChatClose,
  onOpenCategories,
  onTelegramContact,
  onBackToIntro,
}) => {
  const { cursorDotRef, cursorOutlineRef, cursorReactorRef } = useCustomCursor();
  const { initReveal } = useScrollReveal();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const prefetchedCategoryIdRef = useRef<string | null>(null);

  useEffect(() => {
    initReveal('.reveal-on-scroll');
    window.scrollTo(0, 0);
  }, [initReveal]);

  useEffect(() => {
    if (isLoadingBadges) return;
    if (!badges || badges.length === 0) return;
    if (!shouldPrefetchBadgeBackgrounds()) return;
    if (prefetchedCategoryIdRef.current === category.id) return;
    prefetchedCategoryIdRef.current = category.id;

    const topBadges = badges.slice(0, PREFETCH_BADGE_BG_COUNT);
    const urls = new Set<string>();
    for (const badge of topBadges) {
      const layers = computeBadgeBackgroundLayerUrls(badge, category);
      // Prefetch only the topmost layer that will be shown (usually Realism). This avoids downloading all fallbacks.
      if (layers[0]) urls.add(layers[0]);
    }

    const run = () => {
      for (const url of urls) warmImageCache(url);
    };

    // Prefer idle time so we don't compete with critical rendering; fall back to a small delay.
    const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: { timeout: number }) => number);
    if (typeof ric === 'function') {
      ric(run, { timeout: 1200 });
    } else {
      window.setTimeout(run, 80);
    }
  }, [category.id, isLoadingBadges, badges]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  const handleMenuToggle = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (!isMenuOpen) return;
    // Focus first actionable element in the panel for keyboard users
    const panel = document.getElementById('category-mobile-menu-panel');
    const firstFocusable = panel?.querySelector<HTMLButtonElement>('button, [href], [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();
  }, [isMenuOpen]);

  useEffect(() => {
    if (isMenuOpen) return;
    // Restore focus to the menu button after closing
    menuButtonRef.current?.focus();
  }, [isMenuOpen]);

  const handleChatToggle = () => {
    setIsMenuOpen(false);
    onChatToggle();
  };

  const handleMenuAction = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  const titleWords = (category.title || '').trim().split(/\s+/);
  const titleKicker = titleWords.length > 0 && titleWords[0].toLowerCase() === 'за'
    ? titleWords.shift() || ''
    : '';
  const titleLastWord = titleWords.pop() || '';
  const titleLead = titleWords.join(' ');
  const breadcrumbLabel = titleKicker
    ? [titleLead, titleLastWord].filter(Boolean).join(' ') || category.title
    : category.title;
  const badgeCount = badges.length;
  const maxLevelCount = badges.reduce((max, badge) => {
    const levels = Array.isArray((badge as any).allLevels) ? (badge as any).allLevels.length : 0;
    return Math.max(max, levels || 1);
  }, 1);
  const showLevelCount = maxLevelCount > 1;

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

      {/* Mobile Navigation Header */}
      <header
        className={`mobile-glass-header${isChatOpen ? ' is-chat-open' : ''}`}
        aria-label="Навигация"
        style={{ '--category-mobile-header-bg': `url('${bgUrl}')` } as React.CSSProperties}
      >
        <div className="mobile-header-left">
          <button
            type="button"
            className="mobile-header-back"
            onClick={onBack}
            aria-label="Назад"
          >
            ←
          </button>
        </div>

        <button
          type="button"
          className={`mobile-category-title${category.introduction?.has_introduction ? ' is-clickable' : ''}`}
          onClick={category.introduction?.has_introduction ? onIntroductionClick : undefined}
          aria-label={category.introduction?.has_introduction ? 'Открыть введение категории' : 'Категория'}
          disabled={!category.introduction?.has_introduction}
        >
          {titleKicker && <span className="category-title-kicker">{titleKicker}</span>}
          <span className="mobile-category-title-main">
            {titleLead && <span className="category-title-lead">{titleLead}</span>}
            {titleLastWord && (
              <span className={titleLead ? 'category-title-highlight' : 'category-title-lead'}>
                {titleLastWord}
              </span>
            )}
            {!titleLead && !titleLastWord && <span className="category-title-lead">{category.title}</span>}
          </span>
        </button>

        <div className="mobile-header-actions">
          <button
            type="button"
            className={`mobile-header-btn mobile-header-menu${isMenuOpen ? ' is-active' : ''}`}
            onClick={handleMenuToggle}
            aria-label="Меню"
            aria-expanded={isMenuOpen}
            aria-controls="category-mobile-menu-panel"
            ref={menuButtonRef}
          >
            <span className="menu-line"></span>
            <span className="menu-line"></span>
            <span className="menu-line"></span>
          </button>
          <button
            type="button"
            className={`mobile-header-avatar${isChatOpen ? ' is-active' : ''}`}
            onClick={handleChatToggle}
            aria-label={isChatOpen ? 'Закрыть чат' : 'Открыть чат'}
            aria-pressed={isChatOpen}
          >
            <img src="/RL-Guide-book/Валюша.jpg" alt="НейроВалюша" />
          </button>
        </div>
      </header>

      <div
        className={`mobile-menu-scrim${isMenuOpen ? ' is-open' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      ></div>
      <div
        id="category-mobile-menu-panel"
        className={`mobile-menu-panel${isMenuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Меню"
        aria-hidden={!isMenuOpen}
      >
        <div className="mobile-menu-head">
          <span className="mobile-menu-title">Меню</span>
          <button type="button" className="mobile-menu-close" onClick={closeMenu} aria-label="Закрыть меню">
            &times;
          </button>
        </div>
        <div className="mobile-menu-list">
          <button type="button" className="mobile-menu-item" onClick={() => handleMenuAction(onBackToIntro)}>
            <span className="mobile-menu-item-label">Главная</span>
            <span className="mobile-menu-item-icon">&rsaquo;</span>
          </button>
          <button
            type="button"
            className="mobile-menu-item is-active"
            aria-current="page"
            onClick={() => handleMenuAction(onOpenCategories)}
          >
            <span className="mobile-menu-item-label">Категории</span>
            <span className="mobile-menu-item-icon">&bull;</span>
          </button>
          <button type="button" className="mobile-menu-item mobile-menu-item-cta" onClick={() => handleMenuAction(onTelegramContact)}>
            <span className="mobile-menu-item-label">Записаться через Telegram</span>
            <span className="mobile-menu-item-icon">&rsaquo;</span>
          </button>
        </div>
      </div>

      {/* Header Bar */}
      <header 
        className="category-header-bar" 
        style={{ '--header-bg': `url('${bgUrl}')` } as React.CSSProperties}
      >
        <div className="category-topbar">
          <button onClick={onBack} className="nav-link-back hover-target">
            <span>← Назад</span>
          </button>
          <div className="category-breadcrumbs">
            <span className="breadcrumb-root">Категории</span>
            <span className="breadcrumb-sep">→</span>
            <span className="breadcrumb-current">{breadcrumbLabel}</span>
          </div>
          <div className="category-crumbs-meta">
            <span>
              {badgeCount} {pluralizeRu(badgeCount, ['значок', 'значка', 'значков'])}
            </span>
            {showLevelCount && (
              <span>
                • {maxLevelCount} {pluralizeRu(maxLevelCount, ['уровень', 'уровня', 'уровней'])}
              </span>
            )}
          </div>
        </div>
          <div className={`category-hero-content${!titleKicker ? ' category-hero-no-kicker' : ''}`}>
          {titleKicker && <span className="category-title-kicker">{titleKicker}</span>}
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
        </div>
      </header>

      {/* Main Content */}
      <main className="category-main">
        {isLoadingBadges && badges.length === 0 && !errorState && (
          <>
            <div style={{ padding: '10px 0', opacity: 0.85 }}>
              Загрузка значков…
            </div>
            <div className="badges-grid" aria-label="Загрузка значков">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="skeleton--card" />
              ))}
            </div>
          </>
        )}
        {errorState && (
          <DataErrorState
            title="Не удалось загрузить значки"
            details={errorState.message}
            onRetry={onRetryBadges}
          />
        )}
        {/* Hero Section */}
        <section className="category-hero reveal-on-scroll">
          <p className="category-subtitle">
            {badgeCount} {pluralizeRu(badgeCount, ['значок', 'значка', 'значков'])} в этой категории.
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
        {!(isLoadingBadges && badges.length === 0) && (
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
        )}
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
