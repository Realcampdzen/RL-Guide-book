import React, { useEffect, useMemo, useState, Suspense } from 'react';
import {
  fixDescriptionFormatting,
  fixCriteriaFormatting,
  extractEvidenceSection,
  shouldApplyFormatting
} from '../utils/textFormatting';
import { useCustomCursor } from '../hooks/useCustomCursor';
import { useScrollReveal } from '../hooks/useScrollReveal';
import BadgeIcon from '../components/BadgeIcon';
import { Skeleton } from '../components/Skeleton';
import { getBadgeImagePath } from '../utils/badgeImages';
import { toSiblingImageUrl } from '../utils/imageSources';
import '../styles/badge-view.css';
import type { Category, Badge } from '../types/guide';

const loadChatBot = () => import('../components/ChatBot');
const loadChatAvatar = () => import('../components/ChatAvatar');
const ChatBot = React.lazy(loadChatBot);
const ChatAvatar = React.lazy(loadChatAvatar);

interface BadgeLevelViewProps {
  category: Category;
  badge: Badge;
  level: string;
  badges: Badge[];
  onBack: () => void;
  onChangeLevel: (level: string) => void;
  // Chat props
  onChatToggle: () => void;
  isChatOpen: boolean;
  onChatClose: () => void;
  // Navigation props
  onOpenCategories: () => void;
  onTelegramContact: () => void;
  onBackToIntro: () => void;
}

const BadgeLevelView: React.FC<BadgeLevelViewProps> = ({
  category,
  badge,
  level,
  badges,
  onBack,
  onChangeLevel,
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
  const [isHeroLoaded, setIsHeroLoaded] = useState(false);

  useEffect(() => {
    initReveal('.reveal-on-scroll');
    window.scrollTo(0, 0);
  }, [initReveal]);

  useEffect(() => {
    setIsHeroLoaded(false);
  }, [badge.id, level]);

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
    setIsMenuOpen((prev: boolean) => !prev);
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

  // Context Logic
  const { levelBadge, otherLevels } = useMemo(() => {
    const badgeId = String(badge.id || '');
    const segments = badgeId.split('.').filter(Boolean);
    const baseTwo = segments.length >= 2 ? `${segments[0]}.${segments[1]}` : badgeId;

    const sameBaseTwo = (a: string, base: string): boolean => {
      const as = String(a || '').split('.').filter(Boolean);
      if (as.length < 2) return false;
      return `${as[0]}.${as[1]}` === base;
    };

    const tiered = badges
      .filter((b) => b.category_id === badge.category_id)
      .filter((b) => sameBaseTwo(String(b.id || ''), baseTwo))
      .filter((b) => String(b.id || '').split('.').filter(Boolean).length === 3);

    const dedupeById = <T extends { id?: any }>(items: T[]): T[] => {
      const seen = new Set<string>();
      const out: T[] = [];
      for (const it of items) {
        const key = String(it.id || '');
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(it);
      }
      return out;
    };

    const tieredUnique = dedupeById(tiered);
    const isMultiLevel = tieredUnique.length > 0;

    const siblingLevels = isMultiLevel
      ? tieredUnique
      : badges.filter((b) => (b.id || '') === (badge.id || ''));

    const levelBadge = siblingLevels.find((b) => String(b.level) === String(level)) || null;

    const toNum = (v: any) => {
      if (typeof v?.level === 'number') return v.level;
      if (typeof v?.level === 'string' && /^\d+$/.test(v.level)) return parseInt(v.level, 10);
      return Number.POSITIVE_INFINITY;
    };

    const levelsAll = siblingLevels.slice().sort((a: any, b: any) => {
      const an = toNum(a);
      const bn = toNum(b);
      if (an !== bn) return an - bn;
      return (a.id || '').localeCompare(b.id || '');
    });

    const otherLevels = levelsAll.filter((l) => String(l.level) !== String(level));

    return { levelBadge: (levelBadge || badge), otherLevels };
  }, [badge, badges, level]);

  // Content Logic
  const { levelCriteria, levelEvidenceText, mainDescription } = useMemo(() => {
    let evidenceText: string | null = null;
    let criteria: string[] = [];

    // Fix: Remove duplicate text if present in description
    let descriptionText = levelBadge.description || badge.description || '';
    descriptionText = descriptionText.replace(/Объяснение ценности значка:\\s*$/, '').trim();

    if (levelBadge.confirmation) {
      const conf: string | string[] = levelBadge.confirmation as string | string[];
      evidenceText = typeof conf === 'string'
        ? conf
        : Array.isArray(conf) ? conf.join('\n') : null;
    }

    if (levelBadge.criteria) {
      const crit: string | string[] = levelBadge.criteria as string | string[];
      const raw = typeof crit === 'string'
        ? crit.replace(/^Как получить значок \«[^»]+\»: \s*/, '')
        : Array.isArray(crit) ? crit.join('\n') : '';

      const shouldFormat = shouldApplyFormatting(levelBadge.id);
      const processedRaw = shouldFormat ? fixCriteriaFormatting(raw) : raw;

      criteria = processedRaw.split('\u2705').filter((c: string) => c.trim()).map((c: string) => c.trim());
    } else {
      // Fallback
      criteria = [
        'Выполнить все базовые требования значка.',
        'Показать более глубокое понимание и навыки.',
        'Демонстрировать постоянное развитие и улучшение.'
      ];
    }

    const shouldFormatDesc = shouldApplyFormatting(levelBadge.id);
    const processedDesc = shouldFormatDesc ? fixDescriptionFormatting(descriptionText) : descriptionText;
    const { mainText: descMain } = extractEvidenceSection(processedDesc);

    return { levelCriteria: criteria, levelEvidenceText: evidenceText, mainDescription: descMain };
  }, [levelBadge, badge]);

  // Determine background class
  const bgType = useMemo(() => {
    const l = String(level).toLowerCase();
    if (l.includes('продвинутый')) return 'advanced';
    if (l.includes('экспертный') || l.includes('вожатский')) return 'expert';
    return 'base';
  }, [level]);

  // Helper for rendering emoji/icon
  const renderIcon = (b: Badge, size: 'large' | 'xlarge', className: string) => {
    const baseBadgeId = String(b.id).split('.').slice(0, 2).join('.');
    const isImageBadge = ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.16'].includes(baseBadgeId);

    if (isImageBadge) {
      return (
        <BadgeIcon
          badgeId={baseBadgeId}
          badgeTitle={badge.title}
          categoryId={badge.category_id || category.id}
          emoji={b.emoji || ''}
          levelId={String(b.id)}
          levelTitle={b.title}
          className={className}
          size={size}
        />
      );
    }
    return <div className={className} style={{fontSize: size === 'large' ? '4rem' : '3rem'}}>{b.emoji || '🏆'}</div>;
  };

  const levelHeroImageUrl = useMemo(() => {
    const baseBadgeId = String(badge.id || '').split('.').slice(0, 2).join('.');
    if (!baseBadgeId) return null;
    const levelId = String(levelBadge?.id || '');
    const levelSegments = levelId.split('.');
    const isTieredLevel = levelSegments.length === 3;
    return {
      realism: getBadgeImagePath(
        baseBadgeId,
        badge.title,
        category.id,
        isTieredLevel ? levelId : undefined,
        isTieredLevel ? levelBadge.title : undefined,
        'realism'
      ),
      fallback: getBadgeImagePath(
        baseBadgeId,
        badge.title,
        category.id,
        isTieredLevel ? levelId : undefined,
        isTieredLevel ? levelBadge.title : undefined,
        'default'
      ),
    };
  }, [badge.id, badge.title, category.id, levelBadge]);

  const [heroSrc, setHeroSrc] = useState<string | null>(null);
  useEffect(() => {
    setHeroSrc(levelHeroImageUrl?.realism || levelHeroImageUrl?.fallback || null);
  }, [levelHeroImageUrl]);
  const heroWebp = useMemo(() => (heroSrc ? toSiblingImageUrl(heroSrc, 'webp') : null), [heroSrc]);

  return (
    <div className="badge-view-container" data-level-bg={bgType}>
      <div className="noise-overlay"></div>
      <div className="cursor-reactor" ref={cursorReactorRef} data-cursor-reactor></div>
      <div className="cursor-dot" ref={cursorDotRef} data-cursor></div>
      <div className="cursor-outline" ref={cursorOutlineRef} data-cursor-outline></div>

      {/* Mobile Navigation Header */}
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
            aria-controls="badge-level-mobile-menu-panel"
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
              <img src="/RL-Guide-book/Валюша.jpg" alt="НейроВалюша" decoding="async" fetchPriority="high" />
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
        id="badge-level-mobile-menu-panel"
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
          <button type="button" className="mobile-menu-item" onClick={() => handleMenuAction(onOpenCategories)}>
            <span className="mobile-menu-item-label">Категории</span>
            <span className="mobile-menu-item-icon">&rsaquo;</span>
          </button>
          <button type="button" className="mobile-menu-item" onClick={() => handleMenuAction(onBack)}>
            <span className="mobile-menu-item-label">Назад</span>
            <span className="mobile-menu-item-icon">&lsaquo;</span>
          </button>
          <button type="button" className="mobile-menu-item mobile-menu-item-cta" onClick={() => handleMenuAction(onTelegramContact)}>
            <span className="mobile-menu-item-label">Записаться через Telegram</span>
            <span className="mobile-menu-item-icon">&rsaquo;</span>
          </button>
        </div>
      </div>

      <div className="sticky-back-nav">
        <button onClick={onBack} className="nav-link-back hover-target">← Назад к значку</button>
      </div>

      <main className="badge-main">
        {/* Header */}
        <section className="badge-hero reveal-on-scroll">
          <div className="badge-hero-icon">
            {renderIcon(levelBadge, 'large', 'hero-emoji')}
          </div>
          <div className="badge-hero-content">
            <h1>{levelBadge.title}</h1>
            <div className="badge-hero-category">{level}</div>
          </div>
        </section>

        {heroSrc && (
          <section className="badge-hero-media reveal-on-scroll">
            <div className="badge-hero-media__frame badge-hero-media__frame--skeleton">
              {!isHeroLoaded && <Skeleton className="skeleton--media badge-hero-media__skeleton" />}
              <picture>
                {heroWebp && <source type="image/webp" srcSet={heroWebp} />}
                <img
                  src={heroSrc}
                  alt={levelBadge.title}
                  className="badge-hero-media__image"
                  loading="lazy"
                  decoding="async"
                  onLoad={() => setIsHeroLoaded(true)}
                  onError={() => {
                    const next = levelHeroImageUrl?.fallback || null;
                    if (next && next !== heroSrc) setHeroSrc(next);
                  }}
                />
              </picture>
            </div>
          </section>
        )}

        {/* Content Grid */}
        <div className="badge-content-grid">
          {/* Left Column */}
          <div className="badge-left-col reveal-on-scroll">
            <div className="content-block">
              <h3>Общая информация</h3>
              <p className="content-text" dangerouslySetInnerHTML={{ __html: mainDescription.replace(/\n/g, '<br/>') }} />

              {levelBadge.nameExplanation && (
                <>
                  <h4>Объяснение названия и ценности</h4>
                  <p className="content-text">{levelBadge.nameExplanation}</p>
                </>
              )}

              {levelBadge.skillTips && (
                <>
                  <h4>Как прокачать навык</h4>
                  <p className="content-text" dangerouslySetInnerHTML={{__html: levelBadge.skillTips.replace(/\n/g, '<br>')}}></p>
                </>
              )}

              {levelBadge.examples && (
                <>
                  <h4>Примеры</h4>
                  <p className="content-text" dangerouslySetInnerHTML={{__html: levelBadge.examples.replace(/\n/g, '<br>')}}></p>
                </>
              )}

              {levelBadge.importance && (
                <>
                  <h4>Почему этот значок важен</h4>
                  <p className="content-text">{levelBadge.importance}</p>
                </>
              )}

              {levelBadge.philosophy && (
                <>
                  <h4>Философия значка</h4>
                  <p className="content-text">{levelBadge.philosophy}</p>
                </>
              )}

              {levelBadge.howToBecome && (
                <>
                  <h4>Как стать</h4>
                  <p className="content-text" dangerouslySetInnerHTML={{__html: levelBadge.howToBecome.replace(/\n/g, '<br>')}}></p>
                </>
              )}

              <div className="badge-meta">
                <div className="meta-item">
                  <span className="meta-label">Категория</span>
                  <span className="meta-value">{category.title}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Уровень</span>
                  <span className="meta-value">{level}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">ID</span>
                  <span className="meta-value">{levelBadge.id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="badge-right-col reveal-on-scroll" style={{ transitionDelay: '0.1s' }}>
            <div className="content-block">
              <h3>Как получить {level.toLowerCase()}</h3>

              {levelCriteria.length > 0 ? (
                <ul className="criteria-list">
                  {levelCriteria.map((criterion, index) => {
                    // Simple example parsing logic if needed
                    return <li key={index} dangerouslySetInnerHTML={{ __html: criterion.replace(/\n/g, '<br>') }} />;
                  })}
                </ul>
              ) : (
                <p className="content-text">Критерии пока не определены.</p>
              )}

              {levelEvidenceText && (
                <>
                  <h4>Чем подтверждается</h4>
                  <p className="content-text" style={{ color: 'var(--c-volt)', fontStyle: 'italic' }}>
                    {levelEvidenceText}
                  </p>
                </>
              )}
            </div>

            {/* Other Levels */}
            {otherLevels.length > 0 && (
              <div className="levels-dock">
                {otherLevels.map(lvl => (
                  <div
                    key={lvl.id}
                    className="level-bubble hover-target"
                    onClick={() => onChangeLevel(String(lvl.level))}
                  >
                    <div className="level-bubble-icon">
                      {renderIcon(lvl, 'xlarge', '')}
                    </div>
                    <div className="level-bubble-title">{lvl.title}</div>
                    <div className="level-bubble-subtitle">{String(lvl.level)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ChatBot and ChatAvatar */}
      <Suspense fallback={null}>
        <ChatAvatar onClick={onChatToggle} isOpen={isChatOpen} />
        <ChatBot
          isOpen={isChatOpen}
          onClose={onChatClose}
          currentView="badge-level"
          currentCategory={category}
          currentBadge={{
            id: badge.id,
            title: badge.title,
            emoji: badge.emoji,
            categoryId: badge.category_id
          }}
          currentLevel={level}
          currentLevelBadgeTitle={levelBadge.title}
        />
      </Suspense>
    </div>
  );
};

export default BadgeLevelView;
