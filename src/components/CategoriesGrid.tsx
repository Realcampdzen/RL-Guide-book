import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Category, View } from '../types/guide';
import type { MasterIndexMeta } from '../hooks/useDataLoader';
import '../styles/categories.css';
import '../styles/categories-tablet.css';
import { toSiblingImageUrl, NAV_HOME_IMAGE } from '../utils/imageSources';
import { useUserProgress } from '../hooks/useUserProgress';



interface CategoriesGridProps {
  categories: Category[];
  onCategoryClick: (category: Category, options?: { origin?: View }) => void;
  onCategoryPrefetch?: (categoryId: string) => void;
  onBackClick: () => void;
  onAboutCampClick: () => void;
  onTelegramContact: () => void;
  onOpenProfile: () => void;
  onChatToggle: () => void;
  isChatOpen: boolean;
  onChatClose: () => void;
  currentView?: string;
  selectedCategory?: {
    id: string;
    title: string;
    emoji?: string;
  };
  selectedBadge?: {
    id: string;
    title: string;
    emoji: string;
    categoryId: string;
  };
  selectedLevel?: string;
  currentLevelBadgeTitle?: string;
  /** Для подсказки «N из M уровней» (опционально) */
  masterIndex?: MasterIndexMeta | null;
  /** Идеи отряда (лента с API) */
  communityBadges?: Array<{ id: string; title: string; emoji?: string; category_id?: string }>;
  communityLikedIds?: Set<string>;
  toggleCommunityLike?: (badgeId: string) => void;
}

const SQUAD_IDEAS_STATIC_MAX = 3;

const getCategoryImagePath = (categoryId: string): string => {
  // Добавляем версию для предотвращения кэширования
  return `${import.meta.env.BASE_URL}category_${categoryId}.png?v=2`;
};

const CategoriesGrid: React.FC<CategoriesGridProps> = ({
  categories,
  onCategoryClick,
  onCategoryPrefetch,
  onBackClick,
  onAboutCampClick,
  onTelegramContact,
  onOpenProfile,
  onChatToggle,
  isChatOpen,
  masterIndex,
  communityBadges = [],
}) => {
  const { userData } = useUserProgress();
  const totalAchieved = userData?.profile?.stats?.totalLevelsAchieved ?? 0;
  const totalLevels = masterIndex?.totalLevels;
  const progressHintText = totalLevels != null && totalLevels > 0
    ? `${totalAchieved} из ${totalLevels} уровней закрыто`
    : totalAchieved > 0
      ? `Закрыто уровней: ${totalAchieved}`
      : null;
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imageKey, setImageKey] = useState(0);
  const [squadIdeasCarouselSteps, setSquadIdeasCarouselSteps] = useState(0);
  /** Подсказка над заблокированной карточкой (Бро/Движки): не влияет на сетку, рендер в портале */
  const [lockTooltip, setLockTooltip] = useState<{ categoryId: string; rect: DOMRect } | null>(null);

  const squadIdeas = useMemo(() => (Array.isArray(communityBadges) ? communityBadges : []).slice(0, 10), [communityBadges]);

  useEffect(() => {
    if (squadIdeas.length === 0) setSquadIdeasCarouselSteps(0);
  }, [squadIdeas.length]);

  const limitedCategories = useMemo(() => categories, [categories]);
  const categoryIndexById = useMemo(() => {
    const m = new Map<string, number>();
    limitedCategories.forEach((c, i) => m.set(c.id, i));
    return m;
  }, [limitedCategories]);
  // Первые 7 категорий идут в right-column (верхний ряд)
  const topRowCategories = useMemo(() => limitedCategories.slice(0, 7), [limitedCategories]);
  // Остальные категории идут в bottom-row (нижний ряд)
  const bottomRowCategories = useMemo(() => limitedCategories.slice(7), [limitedCategories]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Принудительная перезагрузка изображения домика при возврате на страницу
  useEffect(() => {
    // Обновляем ключ изображения при монтировании компонента
    setImageKey((prev) => prev + 1);
  }, []); // Пустой массив зависимостей - срабатывает только при монтировании

  const handleMenuToggle = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleChatToggle = () => {
    setIsMenuOpen(false);
    onChatToggle();
  };

  const handleMenuAction = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  const handleOpenShareCenter = () => {
    if (typeof window !== 'undefined') {
      window.location.hash = '#share';
    }
    onOpenProfile();
  };

  const handleOpenVk = () => {
    window.open('https://vk.com/realcampspb', '_blank', 'noopener,noreferrer');
  };

  const handleImageError = (categoryId: string) => {
    console.error('Image error for category:', categoryId);
    setImageErrors((prev) => new Set(prev).add(categoryId));
  };

  const renderCategoryCard = (category: Category, extraClass?: string) => {
    const imagePath = getCategoryImagePath(category.id);
    const imageWebp = toSiblingImageUrl(imagePath, 'webp');
    const hasImageError = imageErrors.has(category.id);
    const cardIndex = categoryIndexById.get(category.id) ?? 999;
    const isHighPriorityImage = cardIndex >= 0 && cardIndex < 4;
    // Показываем emoji только если есть ошибка загрузки, иначе показываем изображение
    const showEmoji = hasImageError;

    // Bro-Lock Logic
    const isBroCategory = category.id === '9';
    const isBroLocked = isBroCategory && !userData.broProgress?.isBro;

    // Team-Lock Logic (Category 8)
    const isTeamCategory = category.id === '8';
    const hasTeam = localStorage.getItem('rl_my_team_id');
    const isTeamLocked = isTeamCategory && !hasTeam;

    const isLocked = isBroLocked || isTeamLocked;

    return (
      <button
        type="button"
        key={category.id}
        data-categories-card
        className={`card item-card ${isLocked ? 'is-locked' : ''} ${extraClass ?? ''}`.trim()}
        onClick={() => {
          onCategoryClick(category);
        }}
        onMouseEnter={(e) => {
          if (!isMobile) onCategoryPrefetch?.(category.id);
          if (isLocked) setLockTooltip({ categoryId: category.id, rect: e.currentTarget.getBoundingClientRect() });
        }}
        onMouseLeave={() => {
          if (isLocked) setLockTooltip(null);
        }}
        onFocus={(e) => {
          if (!isMobile) onCategoryPrefetch?.(category.id);
          if (isLocked) setLockTooltip({ categoryId: category.id, rect: e.currentTarget.getBoundingClientRect() });
        }}
        onBlur={() => {
          if (isLocked) setLockTooltip(null);
        }}
        onTouchStart={() => { }}
        onTouchMove={() => { }}
        style={{
          backgroundColor: showEmoji ? '#F8F7F2' : undefined,
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          border: 'none', // Reset button border
          padding: 0,     // Reset button padding (handled by CSS class)
          textAlign: 'left', // Ensure text alignment
          fontFamily: 'inherit',
          width: '100%', // Ensure full width
          filter: isLocked ? 'grayscale(0.8) brightness(0.9)' : 'none'
        }}
      >
        {isLocked && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            fontSize: '24px',
            zIndex: 10,
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
          }}>
            🔒
          </div>
        )}
        {showEmoji && (
          <div className="icon-circle" style={{ display: 'flex', zIndex: 2, position: 'relative' }}>
            {category.emoji || '📁'}
          </div>
        )}
        {!showEmoji && (
          <picture>
            {imageWebp && <source type="image/webp" srcSet={imageWebp} />}
            <img
              src={imagePath}
              alt={category.title || 'Категория'}
              className="category-image"
              loading={isHighPriorityImage ? 'eager' : 'lazy'}
              decoding="async"
              fetchpriority={isHighPriorityImage ? 'high' : 'auto'}
              onError={() => {
                console.error('Image load error for category:', category.id, imagePath);
                handleImageError(category.id);
              }}
              onLoad={() => {
                // Убеждаемся, что изображение загружено
                setImageErrors((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(category.id);
                  return newSet;
                });
              }}
            />
          </picture>
        )}
        <div className="card-label">
          <h3
            dangerouslySetInnerHTML={{
              __html: (category.title || '').replace(/(ОСОЗНАННОСТЬ)\s+И(\s|$)/gi, '$1&nbsp;И$2'),
            }}
          />
          <p>{category.badge_count || 0} значков</p>
        </div>
      </button>
    );
  };

  const lockTooltipTitle = 'Категория пока закрыта';
  const lockTooltipBody =
    lockTooltip?.categoryId === '9'
      ? 'Чтобы разблокировать: пройди Бросвящение в Личном кабинете (раздел БРО → Бропаспорт).'
      : lockTooltip?.categoryId === '8'
        ? 'Чтобы разблокировать: создай свой Движок или вступи в команду в Личном кабинете (раздел Движки).'
        : '';

  const tooltipHalfWidth = 160;
  const viewportMargin = 12;
  const tooltipLeft =
    lockTooltip
      ? Math.max(
        tooltipHalfWidth + viewportMargin,
        Math.min(
          typeof window !== 'undefined' ? window.innerWidth - tooltipHalfWidth - viewportMargin : lockTooltip.rect.left + lockTooltip.rect.width / 2,
          lockTooltip.rect.left + lockTooltip.rect.width / 2
        )
      )
      : 0;

  return (
    <div className="categories-page">
      <div className="noise-overlay"></div>

      {lockTooltip &&
        createPortal(
          <div
            className="category-lock-tooltip category-lock-tooltip--portal"
            role="tooltip"
            style={{
              position: 'fixed',
              left: tooltipLeft,
              top: lockTooltip.rect.top - 10,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="category-lock-tooltip__icon">🔒</div>
            <div className="category-lock-tooltip__title">{lockTooltipTitle}</div>
            <div className="category-lock-tooltip__body">{lockTooltipBody}</div>
          </div>,
          document.body
        )}

      {/* GlobalCursor renders the custom cursor layer once at app root */}

      <header className={`mobile-glass-header${isChatOpen ? ' is-chat-open' : ''}`} aria-label="Навигация">
        <button
          type="button"
          className={`mobile-header-logo${isChatOpen ? ' is-active' : ''}`}
          onClick={handleChatToggle}
          aria-label={isChatOpen ? 'Закрыть чат' : 'Открыть чат'}
          aria-pressed={isChatOpen}
        >
          NEUROVALUSHA
        </button>
        <div className="mobile-header-actions">
          <button
            type="button"
            className={`mobile-header-btn mobile-header-menu${isMenuOpen ? ' is-active' : ''}`}
            onClick={handleMenuToggle}
            aria-label="Меню"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu-panel"
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
            <picture>
              <source type="image/webp" srcSet={`${import.meta.env.BASE_URL}Валюша.webp`} />
              <img src={`${import.meta.env.BASE_URL}Валюша.jpg`} alt="НейроВалюша" decoding="async" fetchpriority="high" />
            </picture>
          </button>
        </div>
      </header>

      <div
        className={`mobile-menu-scrim${isMenuOpen ? ' is-open' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      ></div>
      <div
        id="mobile-menu-panel"
        className={`mobile-menu-panel${isMenuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="categories-grid-menu-title"
        aria-hidden={!isMenuOpen}
      >
        <div className="mobile-menu-head">
          <span id="categories-grid-menu-title" className="mobile-menu-title">Меню</span>
          <button type="button" className="mobile-menu-close" onClick={closeMenu} aria-label="Закрыть меню">
            &times;
          </button>
        </div>
        <div className="mobile-menu-list">
          <button type="button" className="mobile-menu-item" onClick={() => handleMenuAction(onBackClick)}>
            <span className="mobile-menu-item-label">Главная</span>
            <span className="mobile-menu-item-icon">&rsaquo;</span>
          </button>
          <button
            type="button"
            className="mobile-menu-item is-active"
            aria-current="page"
            onClick={() => handleMenuAction(() => window.scrollTo({ top: 0, behavior: 'smooth' }))}
          >
            <span className="mobile-menu-item-label">Категории</span>
            <span className="mobile-menu-item-icon">&bull;</span>
          </button>
          <button type="button" className="mobile-menu-item" onClick={() => handleMenuAction(handleOpenShareCenter)}>
            <span className="mobile-menu-item-label">Поделиться прогрессом</span>
            <span className="mobile-menu-item-icon">&rsaquo;</span>
          </button>
          <button type="button" className="mobile-menu-item" onClick={() => handleMenuAction(onAboutCampClick)}>
            <span className="mobile-menu-item-label">О лагере</span>
            <span className="mobile-menu-item-icon">&rsaquo;</span>
          </button>
          <button type="button" className="mobile-menu-item" onClick={() => handleMenuAction(handleOpenVk)}>
            <span className="mobile-menu-item-label">ВКонтакте</span>
            <span className="mobile-menu-item-icon">&rsaquo;</span>
          </button>
          <button type="button" className="mobile-menu-item mobile-menu-item-cta" onClick={() => handleMenuAction(onTelegramContact)}>
            <span className="mobile-menu-item-label">Записаться через Telegram</span>
            <span className="mobile-menu-item-icon">&rsaquo;</span>
          </button>
        </div>
      </div>

      {/* Left Navigation Link */}
      <div
        className="nav-image-container"
        onClick={onAboutCampClick}
        style={{
          position: 'fixed',
          zIndex: 102,
          cursor: 'pointer',
        }}
      >
        <img
          key={`house-image-${imageKey}`}
          src={`${import.meta.env.BASE_URL}${NAV_HOME_IMAGE}?v=${imageKey}`}
          alt="Домик"
          loading="eager"
          decoding="async"
          fetchpriority="high"
          style={{
            height: 'auto',
            filter: 'drop-shadow(0 0 15px rgba(255, 140, 66, 0.8)) drop-shadow(0 0 30px rgba(255, 140, 66, 0.6)) drop-shadow(0 0 45px rgba(255, 140, 66, 0.4))',
            pointerEvents: 'none',
          }}
        />
      </div>
      <button className="nav-link-left hover-target" onClick={onAboutCampClick}>
        О лагере
      </button>

      <main>
        {/* Подсказка прогресса для мобильной: под навигацией, скрыта на десктопе */}
        {progressHintText != null && (
          <div className="categories-mobile-progress-row">
            <p className="categories-progress-hint" aria-live="polite">
              {progressHintText}
            </p>
          </div>
        )}
        {/* Идеи отряда - фиксированный оверлей, карусель (идеи от сообщества или плейсхолдеры) */}
        <div className="community-stars-overlay community-stars-overlay--squad-ideas">
          <div className="card community-stars-card">
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#ff3b30', letterSpacing: '0.1em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }} title="Здесь появятся идеи, предложенные отрядом, когда они будут. Предложи первый значок в Кузнице Смыслов (в Мастерской).">
              Идеи отряда
            </div>
            <div className={`community-stars-carousel${squadIdeas.length > 0 && squadIdeas.length <= SQUAD_IDEAS_STATIC_MAX ? ' community-stars-carousel--static' : ''}`}>
              {squadIdeas.length > SQUAD_IDEAS_STATIC_MAX && (
                <button
                  type="button"
                  className="community-stars-carousel__btn community-stars-carousel__btn--prev"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (squadIdeas.length <= 1) return; setSquadIdeasCarouselSteps((s) => s - 1); }}
                  disabled={squadIdeas.length <= 1}
                  aria-label="Вращать влево"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
              )}
              <div className="community-stars-carousel__viewport">
                {squadIdeas.length === 0 ? (
                  <div className="squad-ideas-placeholders">
                    <div className="squad-ideas-placeholders__circle" aria-hidden>?</div>
                  </div>
                ) : squadIdeas.length <= SQUAD_IDEAS_STATIC_MAX ? (
                  <div className="community-stars-carousel__static-track">
                    {squadIdeas.map((idea) => (
                      <div key={idea.id} className="community-stars-carousel__item community-stars-carousel__item--static">
                        <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }} title={idea.title}>{idea.emoji || '✨'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="community-stars-carousel__track"
                    style={{
                      ['--carousel-rotation-steps' as string]: squadIdeasCarouselSteps,
                      ['--step-deg' as string]: `${360 / squadIdeas.length}deg`,
                      ['--radius' as string]: `${(64 + 16) / (2 * Math.sin(Math.PI / squadIdeas.length))}px`,
                    }}
                  >
                    {squadIdeas.map((idea, slotIndex) => (
                      <div
                        key={`squad-idea-${slotIndex}-${idea.id}`}
                        className="community-stars-carousel__item"
                        style={{ ['--slot-offset' as string]: slotIndex }}
                      >
                        <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }} title={idea.title}>{idea.emoji || '✨'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {squadIdeas.length > SQUAD_IDEAS_STATIC_MAX && (
                <button
                  type="button"
                  className="community-stars-carousel__btn community-stars-carousel__btn--next"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (squadIdeas.length <= 1) return; setSquadIdeasCarouselSteps((s) => s + 1); }}
                  disabled={squadIdeas.length <= 1}
                  aria-label="Вращать вправо"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid-container" id="gridContainer">
          {/* Hero Card */}
          <div className="card hero-card">
            <div className="hero-content">
              <div className="hero-title-wrapper">
                <h1 className="hero-title-mini">
                  <span>Путеводитель</span>
                  <span>по Реальному</span>
                  <span className="highlight">Лагерю.</span>
                </h1>
                <div className="hero-buttons">
                  <button className="hero-nav-btn hero-nav-bot-btn" onClick={onChatToggle}>
                    NEUROVALUSHA
                  </button>
                  <button className="hero-nav-btn" onClick={onAboutCampClick}>
                    О лагере
                  </button>
                  <button className="hero-nav-btn" onClick={onBackClick}>
                    Главная
                  </button>
                </div>
              </div>
              <div className="hero-marquee-mini">
                <div className="marquee-track-mini">
                  <div className="marquee-item-mini">
                    ВЫБИРАЙ ЗВЕЗДУ. ДВИГАЙСЯ ВПЕРЁД. ОСТАВЛЯЙ СЛЕД. ТВОЙ ОПЫТ — ТВОЙ ПУТЬ. РЕАЛЬНЫЕ ЗНАЧКИ ПОДСКАЖУТ, КУДА ИДТИ. •{' '}
                  </div>
                  <div className="marquee-item-mini">
                    ВЫБИРАЙ ЗВЕЗДУ. ДВИГАЙСЯ ВПЕРЁД. ОСТАВЛЯЙ СЛЕД. ТВОЙ ОПЫТ — ТВОЙ ПУТЬ. РЕАЛЬНЫЕ ЗНАЧКИ ПОДСКАЖУТ, КУДА ИДТИ. •{' '}
                  </div>
                </div>
              </div>
              {progressHintText != null && (
                <p className="categories-progress-hint" aria-live="polite">
                  {progressHintText}
                </p>
              )}
            </div>
          </div>

          {/* Top Row Categories — без обёртки, карточки прямо в сетке на главном фоне */}
          {!isMobile &&
            topRowCategories.map((category) => renderCategoryCard(category, 'top-row-card'))}

          {/* Bottom Row Categories - последние 7 категорий */}
          {!isMobile ? (
            <div className="bottom-row" data-categories-bottom-row>
              {bottomRowCategories.map((category) => renderCategoryCard(category))}
            </div>
          ) : (
            <div className="right-column" style={{ gridColumn: '1', gridRow: '1', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {limitedCategories.map((category) => renderCategoryCard(category))}
            </div>
          )}
        </div>
      </main>


    </div>
  );
};

export default CategoriesGrid;
