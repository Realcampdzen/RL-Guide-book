import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { pluralizeRu } from '../utils/textFormatting';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTiltCard } from '../hooks/useTiltCard';
import BadgeIcon from '../components/BadgeIcon';
import { getBadgeImagePath, hasBadgeImage } from '../utils/badgeImages'; // Import getBadgeImagePath
import DataErrorState from '../components/DataErrorState';
import { Skeleton } from '../components/Skeleton';
import '../styles/category-view.css';
import { useUserProgress } from '../hooks/useUserProgress';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
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
  progress?: { total: number; achieved: number; started: number };
  onBadgeClick: (badge: Badge) => void;
}> = ({ badge, index, category, progress, onBadgeClick }) => {
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
      {/* Progress Chip */}
      {progress && (progress.achieved > 0 || progress.started > 0) && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: progress.achieved === progress.total && progress.total > 0 ? '#4caf50' : 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 'bold',
          border: '1px solid rgba(255,255,255,0.2)',
          zIndex: 5
        }}>
          {progress.achieved === progress.total && progress.total > 0 ? '✓ Готово' : `${progress.achieved}/${progress.total}`}
        </div>
      )}

      <div className={`badge-card__icon ${isIconExpanded ? 'is-expanded' : ''}`}>
        {(() => {
           const badgeIdStr = String(badge.id);
           const baseBadgeId = badgeIdStr.split('.').slice(0, 2).join('.');
           const categoryId = badge.category_id || category.id;
           const isImageBadge = hasBadgeImage(baseBadgeId, badge.title, categoryId);

           if (isImageBadge) {
               return (
               <BadgeIcon
                 badgeId={baseBadgeId}
                 badgeTitle={badge.title}
                 categoryId={categoryId}
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
  const { initReveal } = useScrollReveal();
  const { getBadgeProgress, userData } = useUserProgress();
  const { deviceId } = useAuth();
  const { myTeam } = useTeam();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  type BadgeFilter = 'all' | 'mine' | 'in_progress';
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const prefetchedCategoryIdRef = useRef<string | null>(null);
  const broGateRef = useRef<HTMLDivElement | null>(null);

  const isBroCategory = category.id === '9';
  const isBroUnlocked = Boolean(userData?.broProgress?.isBro);

  const isTeamCategory = category.id === '8';
  const hasTeam = Boolean(
    myTeam ??
    (typeof localStorage !== 'undefined' &&
      (localStorage.getItem('rl_my_team_id') ||
        (() => {
          try {
            const v = localStorage.getItem('rl_my_team_v1');
            return v ? !!JSON.parse(v)?.id : false;
          } catch {
            return false;
          }
        })()))
  );
  const isTeamUnlocked = hasTeam;

  const openBroTelegramRequest = () => {
    const nickname = userData?.profile?.nickname || 'Искатель';
    const text = `Запрос подтверждения Бросвящения (Бро‑движение). Устройство: ${deviceId || '—'}. Псевдоним: ${nickname}.`;
    const href = `https://t.me/Stivanovv?text=${encodeURIComponent(text)}`;
    try {
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = href;
    }
  };

  const openBroPassport = () => {
    const openProfilePanel = (window as any)?.openProfilePanel;
    if (typeof openProfilePanel === 'function') {
      openProfilePanel('bro');
      return;
    }
    const openProfile = (window as any)?.openProfile;
    if (typeof openProfile === 'function') openProfile();
  };

  const openTeamDashboard = () => {
    const openProfilePanel = (window as any)?.openProfilePanel;
    if (typeof openProfilePanel === 'function') {
      openProfilePanel('engines');
      return;
    }
    const openProfile = (window as any)?.openProfile;
    if (typeof openProfile === 'function') openProfile();
  };

  const filteredBadges = useMemo(() => {
    if (!badges || badges.length === 0) return [];
    if (badgeFilter === 'all') return badges;
    return badges.filter((badge) => {
      const baseId = String(badge.id).split('.').slice(0, 2).join('.');
      const p = getBadgeProgress(baseId);
      if (badgeFilter === 'mine') return p.achieved > 0;
      if (badgeFilter === 'in_progress') return p.started > 0;
      return true;
    });
  }, [badges, badgeFilter, getBadgeProgress]);

  useEffect(() => {
    initReveal('.reveal-on-scroll');
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
  const badgeCount = filteredBadges.length;
  const maxLevelCount = filteredBadges.reduce((max, badge) => {
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
    <div
      className="category-view-container"
      style={{ '--category-mobile-header-bg': `url('${bgUrl}')` } as React.CSSProperties}
    >
      {/* Noise Overlay */}
      <div className="noise-overlay"></div>

      {/* Custom Cursor */}
      {/* GlobalCursor renders the custom cursor layer once at app root */}

      {/* Mobile Navigation Header */}
      <header
        className={`mobile-glass-header${isChatOpen ? ' is-chat-open' : ''}`}
        aria-label="Навигация"
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
            <img src={`${import.meta.env.BASE_URL}Валюша.jpg`} alt="НейроВалюша" />
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
        aria-labelledby="category-menu-title"
        aria-hidden={!isMenuOpen}
      >
        <div className="mobile-menu-head">
          <span id="category-menu-title" className="mobile-menu-title">Меню</span>
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
            <button
              type="button"
              onClick={() => {
                const categoryId = String(category?.id ?? '8');
                try {
                  window.location.hash = `#workshop?categoryId=${encodeURIComponent(categoryId)}`;
                  sessionStorage.setItem('rl_open_workshop', categoryId);
                } catch {
                  // ignore
                }
                const openProfile = (window as any)?.openProfile;
                if (typeof openProfile === 'function') openProfile();
              }}
              className="action-btn action-btn--round hover-target"
              title="Предложи значок в эту категорию"
              aria-label="Предложи значок в эту категорию"
              style={{ marginBottom: category.id === '14' ? 0 : undefined }}
            >
              ⚒️
            </button>
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

        {/* Badge filters */}
        {isTeamCategory && (
          <div className="bro-gate-card reveal-on-scroll" role="region" aria-label="Движок — доступ к действиям">
            <div className="bro-gate-head">
              <div>
                <div className="bro-gate-kicker">Значки Движков</div>
                <div className="bro-gate-title">Движок</div>
                <div className="bro-gate-subtitle">
                  Просмотр открыт всем. Добавлять значки в путь и пользоваться действиями можно после создания или вступления в Движок в Личном кабинете.
                </div>
              </div>
              <div className={`bro-gate-status${isTeamUnlocked ? ' is-unlocked' : ''}`}>
                {isTeamUnlocked ? 'Открыто' : 'Закрыто'}
              </div>
            </div>

            {!isTeamUnlocked ? (
              <div className="bro-gate-actions">
                <button type="button" className="action-btn hover-target" onClick={openTeamDashboard}>
                  🚀 Открыть ЛК → Движки
                </button>
                <div className="bro-gate-note">Создай свой Движок или вступи в команду по коду в разделе «Движки» личного кабинета.</div>
              </div>
            ) : (
              <div className="bro-gate-note">
                Движок активен. Значки категории можно добавлять в путь и выполнять.
              </div>
            )}
          </div>
        )}

        {isBroCategory && (
          <div ref={broGateRef} className="bro-gate-card reveal-on-scroll" role="region" aria-label="Бросвящение — вход в Бро‑движение">
            <div className="bro-gate-head">
              <div>
                <div className="bro-gate-kicker">Вход в Бро‑тему</div>
                <div className="bro-gate-title">Бросвящение</div>
                <div className="bro-gate-subtitle">
                  Просмотр значков открыт всем. Прогресс и Бро‑фичи — только после подтверждения Бросвящения.
                </div>
              </div>
              <div className={`bro-gate-status${isBroUnlocked ? ' is-unlocked' : ''}`}>
                {isBroUnlocked ? 'Открыто' : 'Закрыто'}
              </div>
            </div>

            {!isBroUnlocked ? (
              <div className="bro-gate-actions">
                <button type="button" className="action-btn hover-target" onClick={openBroPassport}>
                  📘 Открыть Бропаспорт (ЛК → БРО)
                </button>
                <button type="button" className="action-btn hover-target" onClick={openBroTelegramRequest}>
                  ✉️ Запросить подтверждение в Telegram
                </button>
                <div className="bro-gate-note">Точка входа в Бросвящение — в личном кабинете: БРО → Бропаспорт.</div>
              </div>
            ) : (
              <div className="bro-gate-note">
                Бро‑доступ активен на этом устройстве. Значки категории 9 можно выполнять и отправлять на подтверждение.
              </div>
            )}
          </div>
        )}

        {!(isLoadingBadges && badges.length === 0) && badges.length > 0 && (
          <div className="category-badge-filters" role="tablist" aria-label="Фильтр значков">
            {[
              { key: 'all' as const, label: 'Все' },
              { key: 'mine' as const, label: 'Мои' },
              { key: 'in_progress' as const, label: 'В процессе' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={badgeFilter === key}
                className={`category-filter-btn hover-target${badgeFilter === key ? ' is-active' : ''}`}
                onClick={() => setBadgeFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Badges Grid */}
        {!(isLoadingBadges && badges.length === 0) && (
          <>
            {filteredBadges.length === 0 ? (
              <p className="category-filter-empty" style={{ padding: '2rem 1rem', color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>
                {badgeFilter === 'all' ? 'В этой категории пока нет значков.' : 'Нет значков по выбранному фильтру. Выбери «Все» или добавь значки в путь.'}
              </p>
            ) : (
          <div className="badges-grid">
            {filteredBadges.map((badge, index) => {
              const baseId = String(badge.id).split('.').slice(0, 2).join('.');
              // For single level badges without levels array, treat as 1 total.
              // If we have allLevels array, total is length.
              // getBadgeProgress returns what's stored. We might need to adjust 'total' here based on actual badge data.
              
              const storedProgress = getBadgeProgress(baseId);
              let totalLevels = 1;
              if (Array.isArray((badge as any).allLevels) && (badge as any).allLevels.length > 0) {
                totalLevels = (badge as any).allLevels.length;
              }
              
              // Override stored total with actual data total to be safe
              const progress = { ...storedProgress, total: totalLevels };

              return (
                <TiltBadgeCard
                  key={badge.id}
                  badge={badge}
                  index={index}
                  category={category}
                  progress={progress}
                  onBadgeClick={onBadgeClick}
                />
              );
            })}
          </div>
            )}
          </>
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
