import React, { Suspense, useEffect, useMemo, useState } from 'react';
import type { Category, View } from '../types/guide';
import '../styles/categories.css';
import { toSiblingImageUrl } from '../utils/imageSources';

const loadChatBot = () => import('./ChatBot');
const loadChatAvatar = () => import('./ChatAvatar');
const ChatBot = React.lazy(loadChatBot);
const ChatAvatar = React.lazy(loadChatAvatar);

interface CategoriesGridProps {
  categories: Category[];
  onCategoryClick: (category: Category, options?: { origin?: View }) => void;
  onCategoryPrefetch?: (categoryId: string) => void;
  onBackClick: () => void;
  onAboutCampClick: () => void;
  onTelegramContact: () => void;
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
}

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
  onChatToggle,
  isChatOpen,
  onChatClose,
  currentView = 'categories',
  selectedCategory,
  selectedBadge,
  selectedLevel,
  currentLevelBadgeTitle,
}) => {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imageKey, setImageKey] = useState(0);

  const limitedCategories = useMemo(() => categories.slice(0, 14), [categories]);
  const categoryIndexById = useMemo(() => {
    const m = new Map<string, number>();
    limitedCategories.forEach((c, i) => m.set(c.id, i));
    return m;
  }, [limitedCategories]);
  // Первые 7 категорий идут в right-column (верхний ряд)
  const topRowCategories = useMemo(() => limitedCategories.slice(0, 7), [limitedCategories]);
  // Последние 7 категорий идут в bottom-row (нижний ряд)
  const bottomRowCategories = useMemo(() => limitedCategories.slice(7, 14), [limitedCategories]);

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

  const handleOpenVk = () => {
    window.open('https://vk.com/realcampspb', '_blank', 'noopener,noreferrer');
  };

  const handleImageError = (categoryId: string) => {
    console.error('Image error for category:', categoryId);
    setImageErrors((prev) => new Set(prev).add(categoryId));
  };

  const renderCategoryCard = (category: Category) => {
    const imagePath = getCategoryImagePath(category.id);
    const imageWebp = toSiblingImageUrl(imagePath, 'webp');
    const hasImageError = imageErrors.has(category.id);
    const cardIndex = categoryIndexById.get(category.id) ?? 999;
    const isHighPriorityImage = cardIndex >= 0 && cardIndex < 4;
    // Показываем emoji только если есть ошибка загрузки, иначе показываем изображение
    const showEmoji = hasImageError;

    return (
      <button
        type="button"
        key={category.id}
        className="card item-card"
        onClick={() => {
          onCategoryClick(category);
        }}
        onMouseEnter={() => {
          if (!isMobile) {
            onCategoryPrefetch?.(category.id);
          }
        }}
        onFocus={() => {
          if (!isMobile) {
            onCategoryPrefetch?.(category.id);
          }
        }}
        onTouchStart={() => {
          // Touch start handled
        }}
        onTouchMove={() => {
          // Touch move handled
        }}
        style={{
          backgroundColor: showEmoji ? '#F8F7F2' : undefined,
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          border: 'none', // Reset button border
          padding: 0, // Reset button padding (handled by CSS class)
          textAlign: 'left', // Ensure text alignment
          fontFamily: 'inherit',
          width: '100%', // Ensure full width
        }}
      >
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

  return (
    <div className="categories-page">
      <div className="noise-overlay"></div>

      {/* GlobalCursor renders the custom cursor layer once at app root */}

      <header
        className={`mobile-glass-header${isChatOpen ? ' is-chat-open' : ''}`}
        aria-label="Навигация"
      >
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
              <source type="image/webp" srcSet="/RL-Guide-book/Валюша.webp" />
              <img
                src="/RL-Guide-book/Валюша.jpg"
                alt="НейроВалюша"
                decoding="async"
                fetchpriority="high"
              />
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
        aria-label="Меню"
        aria-hidden={!isMenuOpen}
      >
        <div className="mobile-menu-head">
          <span className="mobile-menu-title">Меню</span>
          <button
            type="button"
            className="mobile-menu-close"
            onClick={closeMenu}
            aria-label="Закрыть меню"
          >
            &times;
          </button>
        </div>
        <div className="mobile-menu-list">
          <button
            type="button"
            className="mobile-menu-item"
            onClick={() => handleMenuAction(onBackClick)}
          >
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
          <button
            type="button"
            className="mobile-menu-item"
            onClick={() => handleMenuAction(onAboutCampClick)}
          >
            <span className="mobile-menu-item-label">О лагере</span>
            <span className="mobile-menu-item-icon">&rsaquo;</span>
          </button>
          <button
            type="button"
            className="mobile-menu-item"
            onClick={() => handleMenuAction(handleOpenVk)}
          >
            <span className="mobile-menu-item-label">ВКонтакте</span>
            <span className="mobile-menu-item-icon">&rsaquo;</span>
          </button>
          <button
            type="button"
            className="mobile-menu-item mobile-menu-item-cta"
            onClick={() => handleMenuAction(onTelegramContact)}
          >
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
          src={`${import.meta.env.BASE_URL}Gemini_Generated_Image_ct40o9ct40o9ct40.png?v=${imageKey}`}
          alt="Домик"
          loading="eager"
          decoding="async"
          fetchpriority="high"
          style={{
            height: 'auto',
            filter:
              'drop-shadow(0 0 15px rgba(255, 140, 66, 0.8)) drop-shadow(0 0 30px rgba(255, 140, 66, 0.6)) drop-shadow(0 0 45px rgba(255, 140, 66, 0.4))',
            pointerEvents: 'none',
          }}
        />
      </div>
      <button className="nav-link-left hover-target" onClick={onAboutCampClick}>
        О лагере
      </button>

      <main>
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
                    ВЫБИРАЙ ЗВЕЗДУ. ДВИГАЙСЯ ВПЕРЁД. ОСТАВЛЯЙ СЛЕД. ТВОЙ ОПЫТ — ТВОЙ ПУТЬ. РЕАЛЬНЫЕ
                    ЗНАЧКИ ПОДСКАЖУТ, КУДА ИДТИ. •{' '}
                  </div>
                  <div className="marquee-item-mini">
                    ВЫБИРАЙ ЗВЕЗДУ. ДВИГАЙСЯ ВПЕРЁД. ОСТАВЛЯЙ СЛЕД. ТВОЙ ОПЫТ — ТВОЙ ПУТЬ. РЕАЛЬНЫЕ
                    ЗНАЧКИ ПОДСКАЖУТ, КУДА ИДТИ. •{' '}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Row Categories (right-column) - первые 7 категорий */}
          {!isMobile && (
            <div className="right-column">
              {topRowCategories.map((category) => renderCategoryCard(category))}
            </div>
          )}

          {/* Bottom Row Categories - последние 7 категорий */}
          {!isMobile ? (
            <div className="bottom-row">
              {bottomRowCategories.map((category) => renderCategoryCard(category))}
            </div>
          ) : (
            <div
              className="right-column"
              style={{
                gridColumn: '1',
                gridRow: '1',
                width: '100%',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
              }}
            >
              {limitedCategories.map((category) => renderCategoryCard(category))}
            </div>
          )}
        </div>
      </main>

      {/* ChatBot and ChatAvatar */}
      <Suspense fallback={null}>
        <ChatAvatar onClick={onChatToggle} isOpen={isChatOpen} />
        <ChatBot
          isOpen={isChatOpen}
          onClose={onChatClose}
          currentView={currentView}
          currentCategory={selectedCategory}
          currentBadge={selectedBadge}
          currentLevel={selectedLevel}
          currentLevelBadgeTitle={currentLevelBadgeTitle}
        />
      </Suspense>
    </div>
  );
};

export default CategoriesGrid;
