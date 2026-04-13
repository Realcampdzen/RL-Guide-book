import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MasterIndexMeta } from '../hooks/useDataLoader';
import { useTiltCard } from '../hooks/useTiltCard';
import type { Category } from '../types/guide';
import { getBadgeImagePath } from '../utils/badgeImages';
import { NAV_HOME_IMAGE, toSiblingImageUrl } from '../utils/imageSources';
import { forceUnlock } from '../utils/scrollLock';
import '../styles/bluenest.css';

interface BlueNestLandingProps {
  onStartClick: () => void;
  onAboutCampClick: () => void;
  onCategoryClick: (category: Category) => void;
  onOpenBadgeById?: (badgeId: string) => void;
  onOpenProfile?: () => void;
  onLoginClick?: () => void;
  onStartTour?: () => void;
  onHoverLogin?: () => void;
  onHoverAboutCamp?: () => void;
  onHoverStart?: () => void;
  onChatToggle: () => void;
  isChatOpen: boolean;
  onChatClose: () => void;
  categories: Category[];
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
  masterIndex?: MasterIndexMeta;
}

const BlueNestLanding: React.FC<BlueNestLandingProps> = ({
  onStartClick,
  onAboutCampClick,
  onCategoryClick,
  onOpenBadgeById,
  onLoginClick,
  onStartTour,
  onHoverLogin,
  onHoverAboutCamp,
  onHoverStart,
  onChatToggle,
  categories,
  masterIndex,
}) => {
  const [loaderHidden, setLoaderHidden] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('rl-hero-loaded') === '1';
    }
    return false;
  });
  const [isConceptOpen, setIsConceptOpen] = useState(false);
  const [showContactHint, setShowContactHint] = useState(false);
  const featureCard1Ref = useRef<HTMLDivElement>(null);
  const featureCard2Ref = useRef<HTMLDivElement>(null);
  const conceptWrapRef = useRef<HTMLSpanElement>(null);
  const conceptButtonRef = useRef<HTMLButtonElement>(null);
  const conceptPopoverRef = useRef<HTMLSpanElement>(null);
  const hoverCapableRef = useRef(false);
  const [isHoverCapable, setIsHoverCapable] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  type ConceptAnchor = { top: number; left: number; placement: 'above' | 'below' };
  const [conceptPopoverAnchor, setConceptPopoverAnchor] = useState<ConceptAnchor | null>(null);
  const conceptPopoverAnchorRef = useRef<ConceptAnchor | null>(null);
  const conceptHoverSuppressedRef = useRef(false);
  const carouselInitRef = useRef(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const computeConceptPopoverAnchor = useCallback((): ConceptAnchor | null => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return null;
    const btn = conceptButtonRef.current;
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
    const gap = 8;
    const cardMaxW = Math.min(720, vw - 32);
    const centerX = rect.left + rect.width / 2;
    const left = Math.max(cardMaxW / 2, Math.min(vw - cardMaxW / 2, centerX));
    let top = rect.bottom + gap;
    let placement: 'above' | 'below' = 'below';
    if (top + 400 > vh - 16) {
      const spaceAbove = rect.top - 16 - gap;
      const cardHeight = Math.min(520, Math.max(0, spaceAbove));
      top = Math.max(16, rect.top - gap - cardHeight);
      placement = 'above';
    }
    return { top, left, placement };
  }, []);

  const updateConceptPopoverPosition = useCallback(() => {
    const anchor = computeConceptPopoverAnchor();
    if (anchor) setConceptPopoverAnchor(anchor);
  }, [computeConceptPopoverAnchor]);

  // CTA handlers for Popover
  const handleStartGameCTA = () => {
    setIsConceptOpen(false);
    if (onLoginClick) {
      onLoginClick();
    } else {
      onStartClick();
    }
  };

  const handleStartTourCTA = () => {
    setIsConceptOpen(false);
    if (onStartTour) onStartTour();
  };

  const handleContactCTA = () => {
    setShowContactHint((prev) => !prev);
  };

  const carouselCategories = useMemo(() => {
    const sorted = (categories || []).slice().sort((a, b) => Number(a.id) - Number(b.id));
    return sorted;
  }, [categories]);

  const defaultCarouselIndex = useMemo(() => {
    if (!carouselCategories.length) return 0;
    const categoryOneIndex = carouselCategories.findIndex((category) => category.id === '1');
    return categoryOneIndex >= 0 ? categoryOneIndex : 0;
  }, [carouselCategories]);

  useEffect(() => {
    if (!carouselCategories.length) return;
    if (carouselInitRef.current) return;
    setCarouselIndex(defaultCarouselIndex);
    carouselInitRef.current = true;
  }, [carouselCategories, defaultCarouselIndex]);

  const activeCategory = carouselCategories[carouselIndex];
  const activeCategoryImage = activeCategory
    ? `${import.meta.env.BASE_URL}category_${activeCategory.id}.png?v=2`
    : '';
  const activeCategoryImageWebp = activeCategoryImage
    ? toSiblingImageUrl(activeCategoryImage, 'webp')
    : null;

  const handleCarouselStep = (direction: number) => {
    if (!carouselCategories.length) return;
    setCarouselIndex((prev) => {
      const count = carouselCategories.length;
      return (prev + direction + count) % count;
    });
  };

  const handleOpenCategory = () => {
    if (!activeCategory) return;
    onCategoryClick(activeCategory);
  };

  const formatCategoryTitle = (title: string) => {
    return (title || '').replace(/(ОСОЗНАННОСТЬ)\s+И(\s|$)/gi, '$1&nbsp;И$2');
  };

  const badgeImageVersion = '4';
  const experienceBadgeImage = getBadgeImagePath(
    '1.16',
    'Путеводитель',
    '1',
    undefined,
    undefined,
    'realism'
  );
  const experienceBadgeImageVersioned = experienceBadgeImage
    ? `${experienceBadgeImage}?v=${badgeImageVersion}`
    : null;
  const experienceBadgeWebp = experienceBadgeImageVersioned
    ? toSiblingImageUrl(experienceBadgeImageVersioned, 'webp')
    : null;
  const compassBadgeImage = getBadgeImagePath(
    '1.16',
    'Путеводитель',
    '1',
    '1.16.2',
    'Создатель Новой Категории',
    'realism'
  );
  const compassBadgeImageVersioned = compassBadgeImage
    ? `${compassBadgeImage}?v=${badgeImageVersion}`
    : null;
  const compassBadgeWebp = compassBadgeImageVersioned
    ? toSiblingImageUrl(compassBadgeImageVersioned, 'webp')
    : null;
  const handleBadgeOpen = (badgeId: string) => {
    if (!badgeId) return;
    onOpenBadgeById?.(badgeId);
  };

  useTiltCard(featureCard1Ref);
  useTiltCard(featureCard2Ref);

  // Safety: clear ALL stale scroll locks on body (can persist after HMR or unclean unmounts of ChatBot/HintOverlay)
  useEffect(() => {
    forceUnlock();
  }, []);

  useEffect(() => {
    if (loaderHidden) return;
    const timer = setTimeout(() => {
      setLoaderHidden(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('rl-hero-loaded', '1');
      }
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Запускаем только один раз при монтировании

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => {
      hoverCapableRef.current = media.matches;
      setIsHoverCapable(media.matches);
    };
    update();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalRoot(document.body || document.documentElement);
  }, []);

  useEffect(() => {
    if (isConceptOpen) {
      updateConceptPopoverPosition();
    } else {
      setConceptPopoverAnchor(null);
      conceptPopoverAnchorRef.current = null;
    }
  }, [isConceptOpen, updateConceptPopoverPosition]);

  useEffect(() => {
    if (!isConceptOpen) return;
    const onResize = () => updateConceptPopoverPosition();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isConceptOpen, updateConceptPopoverPosition]);

  useEffect(() => {
    if (!isConceptOpen) return;
    if (hoverCapableRef.current) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || !conceptWrapRef.current) return;
      const inTrigger = conceptWrapRef.current.contains(target);
      const inPopover = conceptPopoverRef.current?.contains(target);
      if (!inTrigger && !inPopover) {
        setIsConceptOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isConceptOpen]);

  useEffect(() => {
    if (!isConceptOpen) return;
    const handleAutoClose = (e: Event) => {
      if (hoverCapableRef.current) return;
      if (e.target && conceptPopoverRef.current?.contains(e.target as Node)) {
        return;
      }
      if (e.target && conceptButtonRef.current?.contains(e.target as Node)) {
        return;
      }
      setIsConceptOpen(false);
    };
    const wheelOptions: AddEventListenerOptions = { passive: true, capture: true };
    window.addEventListener('wheel', handleAutoClose, wheelOptions);
    return () => {
      window.removeEventListener('wheel', handleAutoClose, wheelOptions);
    };
  }, [isConceptOpen]);

  const handleConceptClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const nextOpen = !isConceptOpen;
    if (nextOpen) {
      const anchor = computeConceptPopoverAnchor();
      if (anchor) {
        conceptPopoverAnchorRef.current = anchor;
        setConceptPopoverAnchor(anchor);
      }
      setIsConceptOpen(true);
    } else {
      setIsConceptOpen(false);
    }
  };

  const handleConceptPointerEnter = (event: React.PointerEvent) => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return;
    if (event.pointerType === 'mouse') {
      if (conceptHoverSuppressedRef.current) return;
      const anchor = computeConceptPopoverAnchor();
      if (anchor) {
        conceptPopoverAnchorRef.current = anchor;
        setConceptPopoverAnchor(anchor);
      }
      setIsConceptOpen(true);
    }
  };

  const handleTriggerPointerLeave = (event: React.PointerEvent) => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return;
    if (event.pointerType === 'mouse') {
      conceptHoverSuppressedRef.current = false;
      setIsConceptOpen(false);
    }
  };

  const handlePopoverPointerLeave = (event: React.PointerEvent) => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return;
    if (event.pointerType === 'mouse') {
      setIsConceptOpen(false);
    }
  };

  const effectiveAnchor = conceptPopoverAnchor ?? conceptPopoverAnchorRef.current;

  return (
    <div className="bluenest-landing">
      <div className="noise-overlay"></div>

      {/* GlobalCursor renders the custom cursor layer once at app root */}

      {/* Loading Screen */}
      <div className={`loader ${loaderHidden ? 'hidden' : ''}`}>
        <div className="loader-text">ПУТЕВОДИТЕЛЬ</div>
      </div>

      {/* Navigation */}
      <nav className="nav">
        <ul className="menu-items" style={{ display: 'none' }}>
          {/* Navigation hidden for now */}
        </ul>
      </nav>

      {/* Sticky Navigation Panel (Top Right) */}
      <div className="sticky-nav">
        <button
          type="button"
          className="nav-link nav-bot-btn hover-target"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onChatToggle) {
              onChatToggle();
            } else {
              console.error('onChatToggle is not defined!');
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{
            cursor: 'pointer',
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 1000,
            isolation: 'isolate',
          }}
        >
          NEUROVALUSHA
        </button>
        <button
          className="nav-link hover-target"
          onClick={onStartClick}
          onMouseEnter={onHoverStart}
          onTouchStart={onHoverStart}
        >
          Значки
        </button>
      </div>

      {/* Left Navigation Link */}
      <button
        type="button"
        className="nav-image-container nav-home hover-target"
        onClick={onAboutCampClick}
        onMouseEnter={onHoverAboutCamp}
        aria-label="О лагере"
      >
        <img src={`${import.meta.env.BASE_URL}${NAV_HOME_IMAGE}?v=2`} alt="Домик" />
      </button>
      <button
        className="nav-link-left hover-target"
        onClick={onAboutCampClick}
        onMouseEnter={onHoverAboutCamp}
      >
        О лагере
      </button>

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-bg"></div>
          <div className="hero-content">
            <h1
              className="hero-title hover-target"
              style={{ transitionDelay: '0.2s' }}
            >
              <span className="hero-title-first-word">Путеводитель</span>
              <span>по</span>
              <span>Реальному</span>
              <span className="highlight">Лагерю.</span>
            </h1>
          </div>
        </section>

        {/* Marquee Separator */}
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {/* Дублируем 4 раза для гарантии заполнения огромных экранов и бесшовного цикла */}
            <div className="marquee-item hover-target">
              ВЫБИРАЙ ЗВЕЗДУ. ДВИГАЙСЯ ВПЕРЁД. ОСТАВЛЯЙ СЛЕД. ТВОЙ ОПЫТ — ТВОЙ ПУТЬ. РЕАЛЬНЫЕ ЗНАЧКИ
              ПОДСКАЖУТ, КУДА ИДТИ. •{' '}
            </div>
            <div className="marquee-item hover-target">
              ВЫБИРАЙ ЗВЕЗДУ. ДВИГАЙСЯ ВПЕРЁД. ОСТАВЛЯЙ СЛЕД. ТВОЙ ОПЫТ — ТВОЙ ПУТЬ. РЕАЛЬНЫЕ ЗНАЧКИ
              ПОДСКАЖУТ, КУДА ИДТИ. •{' '}
            </div>
            <div className="marquee-item hover-target">
              ВЫБИРАЙ ЗВЕЗДУ. ДВИГАЙСЯ ВПЕРЁД. ОСТАВЛЯЙ СЛЕД. ТВОЙ ОПЫТ — ТВОЙ ПУТЬ. РЕАЛЬНЫЕ ЗНАЧКИ
              ПОДСКАЖУТ, КУДА ИДТИ. •{' '}
            </div>
            <div className="marquee-item hover-target">
              ВЫБИРАЙ ЗВЕЗДУ. ДВИГАЙСЯ ВПЕРЁД. ОСТАВЛЯЙ СЛЕД. ТВОЙ ОПЫТ — ТВОЙ ПУТЬ. РЕАЛЬНЫЕ ЗНАЧКИ
              ПОДСКАЖУТ, КУДА ИДТИ. •{' '}
            </div>
          </div>
        </div>

        {/* Subtitle Section (after marquee) */}
        <section className="subtitle-section">
          <p className="subtitle-text reveal-on-scroll">
            Добро пожаловать в космическое путешествие по системе значков и достижений!{' '}
            <span
              className="subtitle-popover-wrap"
              ref={conceptWrapRef}
              onPointerEnter={handleConceptPointerEnter}
              onPointerLeave={handleTriggerPointerLeave}
            >
              <button
                type="button"
                className="subtitle-highlight hover-target"
                onClick={handleConceptClick}
                onPointerEnter={handleConceptPointerEnter}
                onPointerLeave={handleTriggerPointerLeave}
                aria-haspopup="dialog"
                aria-expanded={isConceptOpen}
                ref={conceptButtonRef}
              >
                Здесь вы найдете {masterIndex?.totalLevels ?? 241} {((count) => {
                  const mod10 = count % 10;
                  const mod100 = count % 100;
                  if (mod100 >= 11 && mod100 <= 19) return 'значков';
                  if (mod10 === 1) return 'значок';
                  if (mod10 >= 2 && mod10 <= 4) return 'значка';
                  return 'значков';
                })(masterIndex?.totalLevels ?? 241)} в {masterIndex?.totalCategories ?? 14}{' '}
                категориях.
              </button>
            </span>
          </p>
        </section>

        {/* Manifesto Section */}
        <section className="manifesto">
          <div className="manifesto-statement reveal-on-scroll">
            <h2>Значки здесь — не награды, а маршруты развития.</h2>
            <p>
              В Реальном Лагере значки — не просто «ачивки» за выполнение заданий. Это путеводные
              звёзды, которые помогают выбрать твой собственный путь. Каждый значок — не медаль за
              прошлое, а маяк, освещающий направления твоего развития.
            </p>
          </div>
          <div className="manifesto-visual manifesto-carousel reveal-on-scroll">
            <button
              type="button"
              className="manifesto-carousel-btn manifesto-carousel-btn-left hover-target"
              onClick={() => handleCarouselStep(-1)}
              aria-label="Предыдущая категория"
              disabled={carouselCategories.length < 2}
            >
              <span aria-hidden="true">&lsaquo;</span>
            </button>
            <button
              type="button"
              className="manifesto-carousel-btn manifesto-carousel-btn-right hover-target"
              onClick={() => handleCarouselStep(1)}
              aria-label="Следующая категория"
              disabled={carouselCategories.length < 2}
            >
              <span aria-hidden="true">&rsaquo;</span>
            </button>
            <button
              type="button"
              className="manifesto-carousel-card hover-target"
              onClick={handleOpenCategory}
              aria-label={
                activeCategory
                  ? `Открыть значки категории ${activeCategory.title || activeCategory.id}`
                  : 'Категория'
              }
              disabled={!activeCategory}
            >
              {activeCategory ? (
                <picture>
                  {activeCategoryImageWebp && (
                    <source type="image/webp" srcSet={activeCategoryImageWebp} />
                  )}
                  <img src={activeCategoryImage} alt={activeCategory.title || 'Категория'} />
                </picture>
              ) : (
                <div className="manifesto-carousel-placeholder">Категория</div>
              )}
              <div className="manifesto-carousel-overlay" aria-hidden="true"></div>
              <div className="manifesto-carousel-meta" aria-live="polite">
                {activeCategory ? (
                  <>
                    <h3
                      className="manifesto-carousel-title"
                      dangerouslySetInnerHTML={{
                        __html: formatCategoryTitle(activeCategory.title || ''),
                      }}
                    />
                    <p className="manifesto-carousel-count">
                      {activeCategory.badge_count || 0} значков
                    </p>
                  </>
                ) : (
                  <p className="manifesto-carousel-count">Категория</p>
                )}
              </div>
            </button>
          </div>
        </section>

        {/* Features Grid - Philosophy of Badges */}
        <section className="features">
          <div className="features-grid">
            {/* Feature 2 */}
            <div
              className="feature-card tilt-card reveal-on-scroll"
              ref={featureCard1Ref}
              style={{ transitionDelay: '0.1s' }}
            >
              <button
                type="button"
                className="feature-badge-link hover-target"
                onClick={() => handleBadgeOpen('1.16.1')}
                aria-label="Открыть значок Путеводитель"
              >
                {experienceBadgeImageVersioned ? (
                  <picture>
                    {experienceBadgeWebp && (
                      <source type="image/webp" srcSet={experienceBadgeWebp} />
                    )}
                    <img
                      src={experienceBadgeImageVersioned}
                      alt="Значок Путеводитель"
                      width={1920}
                      height={1080}
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                ) : (
                  <div className="feature-badge-placeholder">Путеводитель</div>
                )}
              </button>
              <h3>Реальный Значок = Опыт</h3>
              <p>
                Здесь главная награда — не значок, а опыт и навыки, которые ты получаешь, выполняя
                задания. Новые друзья, настоящие проекты, полезные привычки и идеи — всё это
                остаётся с тобой.
              </p>
            </div>
            {/* Feature 3 */}
            <div
              className="feature-card tilt-card reveal-on-scroll"
              ref={featureCard2Ref}
              style={{ transitionDelay: '0.2s' }}
            >
              <button
                type="button"
                className="feature-badge-link hover-target"
                onClick={() => handleBadgeOpen('1.16.2')}
                aria-label="Открыть значок Создатель Новой Категории"
              >
                {compassBadgeImageVersioned ? (
                  <picture>
                    {compassBadgeWebp && <source type="image/webp" srcSet={compassBadgeWebp} />}
                    <img
                      src={compassBadgeImageVersioned}
                      alt="Значок Создатель Новой Категории"
                      width={1920}
                      height={1080}
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                ) : (
                  <div className="feature-badge-placeholder">Создатель Новой Категории</div>
                )}
              </button>
              <h3>Реальный Значок — компас</h3>
              <p>
                Только ты выбираешь, какие значки будут на твоём пути. Вожатые и Путеводитель
                предложат варианты, но выбор и движение всегда за тобой.
                <span className="feature-welcome">
                  Добро пожаловать в Реальный Лагерь.
                  <br />
                  Выбирай звезду, двигайся вперёд, оставляй след.
                  <br />
                  Реальные Значки подскажут, куда идти.
                </span>
              </p>
            </div>
          </div>
          <div className="features-welcome-center reveal-on-scroll">
            <p>
              Добро пожаловать в Реальный Лагерь.
              <br />
              Выбирай звезду, двигайся вперёд, оставляй след.
              <br />
              Реальные Значки подскажут, куда идти.
            </p>
          </div>
        </section>

        {/* Final Footer CTA */}
        <footer className="footer">
          <h2 className="reveal-on-scroll">Поехали?</h2>
          <button
            className="btn-agency hover-target reveal-on-scroll"
            onClick={onStartClick}
            onMouseEnter={onHoverStart}
            onTouchStart={onHoverStart}
            id="footer-start-btn"
          >
            <span>Начать путешествие</span>
          </button>

          <div className="footer-links">
            <button
              className="hover-target"
              onClick={onStartClick}
              onMouseEnter={onHoverStart}
              onTouchStart={onHoverStart}
            >
              Значки
            </button>
            <button
              className="hover-target"
              onClick={onAboutCampClick}
              onMouseEnter={onHoverAboutCamp}
              onTouchStart={onHoverAboutCamp}
            >
              О лагере
            </button>
            <a
              href="https://vk.com/realcampspb"
              className="hover-target"
              target="_blank"
              rel="noopener noreferrer"
            >
              ВКонтакте
            </a>
          </div>
        </footer>
      </main>

      {isConceptOpen &&
        portalRoot &&
        createPortal(
          <>
            <div
              className={`subtitle-hint-backdrop${isHoverCapable ? ' is-hover' : ''}`}
              aria-hidden="true"
            ></div>
            <span
              className="subtitle-hint"
              role="dialog"
              aria-modal="true"
              aria-label="О концепции игры"
              data-placement={effectiveAnchor ? 'anchor' : 'center'}
              data-anchor-side={effectiveAnchor?.placement}
              ref={conceptPopoverRef}
              onPointerEnter={handleConceptPointerEnter}
              onPointerLeave={handlePopoverPointerLeave}
              style={
                effectiveAnchor
                  ? {
                      position: 'fixed',
                      top: effectiveAnchor.top,
                      left: effectiveAnchor.left,
                      transform: 'translate(-50%, 0)',
                      maxWidth: 'min(720px, calc(100vw - 32px))',
                      maxHeight: `calc(100vh - ${effectiveAnchor.top + 16}px)`,
                      overflowY: 'auto',
                    }
                  : {
                      position: 'fixed',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      maxHeight: '85vh',
                      overflowY: 'auto',
                      width: 'min(90vw, 720px)',
                    }
              }
            >
              <button
                className="hover-target"
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '4px',
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConceptOpen(false);
                  conceptHoverSuppressedRef.current = true;
                }}
                aria-label="Закрыть"
              >
                &times;
              </button>
              <span
                className="subtitle-hint-title"
                style={{
                  display: 'block',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: '#c9b8ff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '20px',
                  lineHeight: '1.3',
                  paddingRight: '24px',
                }}
              >
                Игра, которая развивает участников и Лагерь
              </span>
              <div className="subtitle-hint-body">
                <p>
                  В Реальном Лагере ребята становятся организаторами и развивают 4К навыки на
                  практике. Запускают проекты, проводят мастер-классы и целые тематические дни.
                  Объединяются в Движки, изучают вожатское мастерство и наполняют программу лагеря
                  живыми традициями.
                </p>
                <p>
                  Это авторская цифровая экосистема, доступная для интеграции. Вы можете внедрить её
                  игровые и педагогические механики в свою смену или заказать адаптацию закрытой
                  платформы под ваш коллектив.
                </p>
                <p>
                  Игровые механики здесь — это инструменты соуправления. Значки — это не виртуальная
                  валюта для обмена на призы. Каждый значок выдаётся только за реальные достижения:
                  когда участник осваивает новый навык, приносит пользу команде и учится
                  анализировать свой опыт.
                </p>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleStartGameCTA}
                    onMouseEnter={onHoverLogin}
                    onTouchStart={onHoverLogin}
                    className="hover-target"
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)',
                      border: 'none',
                      color: '#1a1a2e',
                      fontSize: '13px',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      flex: '1 1 auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Войти в игру
                  </button>
                  <button
                    onClick={handleContactCTA}
                    className="hover-target"
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      background: 'linear-gradient(90deg, #8b00ff, #ffd700)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      flex: '1 1 auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: 'none',
                    }}
                  >
                    Сотрудничество
                  </button>
                  <button onClick={handleStartTourCTA} className="hover-target btn-space-tutorial">
                    Пройти обучение
                  </button>
                </div>

                {showContactHint && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '16px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      animation: 'rl-fade-in 0.3s ease-out',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        color: 'rgba(255,255,255,0.9)',
                      }}
                    >
                      Для обсуждения внедрения платформы напишите в сообщения нашей группы ВКонтакте
                      или напрямую основателю экосистемы (Степан Иванов).
                    </p>
                    <a
                      href="https://vk.com/realcampspb"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover-target"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#ffd700',
                        fontSize: '13px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Перейти в группу ВК →
                    </a>
                  </div>
                )}
              </div>
              <span className="subtitle-hint-note">
                С наилучшими пожеланиями всем настоящим и будущим Реальным Вожатым, Степан Иванов
              </span>
            </span>
          </>,
          portalRoot
        )}
    </div>
  );
};

export default BlueNestLanding;
