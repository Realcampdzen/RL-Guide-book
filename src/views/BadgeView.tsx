import React, { useEffect, useMemo, useState, Suspense } from 'react';
import {
  fixDescriptionFormatting,
  fixCriteriaFormatting,
  extractEvidenceSection,
  shouldApplyFormatting
} from '../utils/textFormatting';
import BadgeIcon from '../components/BadgeIcon';
import BadgeSkinPanel from '../components/BadgeSkinPanel';
import { Skeleton } from '../components/Skeleton';
import { getBadgeImagePath, hasBadgeImage } from '../utils/badgeImages';
import { toSiblingImageUrl } from '../utils/imageSources';
import { useUserProgress } from '../hooks/useUserProgress';
import { useTeam } from '../context/TeamContext';
import FeatureGate from '../components/FeatureGate';
import { copyTextToClipboard, generateSocialCard, getBadgeShareUrl, shareOrDownloadSocialCard } from '../utils/socialGenerator';
import { fetchAiSlogan, fetchVibeCheck } from '../utils/aiService';
import { getBadge4kSkills, getSkillLabel } from '../utils/profile4k';
import '../styles/badge-view.css';
import type { Category, Badge } from '../types/guide';

const loadChatBot = () => import('../components/ChatBot');
const loadChatAvatar = () => import('../components/ChatAvatar');
const ChatBot = React.lazy(loadChatBot);
const ChatAvatar = React.lazy(loadChatAvatar);

interface BadgeViewProps {
  category: Category;
  badge: Badge;
  badges: Badge[];
  onBack: () => void;
  onLevelSelect: (level: string) => void;
  onBadgeClick: (badge: Badge) => void;
  // Chat props
  onChatToggle: () => void;
  isChatOpen: boolean;
  onChatClose: () => void;
  // Navigation props
  onOpenCategories: () => void;
  onTelegramContact: () => void;
  onBackToIntro: () => void;
}

const BadgeView: React.FC<BadgeViewProps> = ({ 
  category, 
  badge, 
  badges, 
  onBack, 
  onLevelSelect,
  onBadgeClick: _onBadgeClick,
  onChatToggle,
  isChatOpen,
  onChatClose,
  onOpenCategories,
  onTelegramContact,
  onBackToIntro,
}) => {
  const { userData, getBadgeProgress, startRoute, removeRoute, toggleFavorite, addFlagBadgeRequest } = useUserProgress();
  const { myTeam } = useTeam();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHeroLoaded, setIsHeroLoaded] = useState(false);
  const [useHeroWebp, setUseHeroWebp] = useState(true);
  const [startShareOpen, setStartShareOpen] = useState(false);
  const [startShareBusy, setStartShareBusy] = useState(false);
  const [startShareStatus, setStartShareStatus] = useState<string | null>(null);
  const [routeResetConfirmOpen, setRouteResetConfirmOpen] = useState(false);
  const [routeResetNotice, setRouteResetNotice] = useState<string | null>(null);

  const baseBadgeId = useMemo(() => {
    return String(badge.id || '').split('.').slice(0, 2).join('.');
  }, [badge.id]);

  const isFavorite = useMemo(() => {
    return (userData.favorites || []).some(
      (id) => String(id).split('.').slice(0, 2).join('.') === baseBadgeId
    );
  }, [userData.favorites, baseBadgeId]);

  const handleToggleFavorite = () => {
    toggleFavorite(baseBadgeId, { onAdded: () => {}, onLimit: () => {} });
  };

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
  const broLocked = category.id === '9' && !Boolean(userData?.broProgress?.isBro);
  const teamLocked = category.id === '8' && !hasTeam;
  const mechanicLocked = broLocked || teamLocked;
  const mechanicGateReason = broLocked
    ? 'Добавлять в путь и в избранное можно после прохождения Бросвящения в ЛК.'
    : 'Добавлять в путь и в избранное можно после создания или вступления в Движок в ЛК.';
  const openMechanicCta = () => {
    const openProfilePanel = (window as any)?.openProfilePanel;
    if (typeof openProfilePanel === 'function') {
      openProfilePanel(broLocked ? 'bro' : 'engines');
      return;
    }
    const openProfile = (window as any)?.openProfile;
    if (typeof openProfile === 'function') openProfile();
  };

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

  const handleChatToggle = () => {
    setIsMenuOpen(false);
    onChatToggle();
  };

  const handleMenuAction = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  // Context Logic (ported from App.tsx)
  const { badgeLevels, baseLevelBadge, otherLevels, isMultiLevel } = useMemo(() => {
    const badgeId = String(badge.id || '');
    const segments = badgeId.split('.').filter(Boolean);
    const baseTwo = segments.length >= 2 ? `${segments[0]}.${segments[1]}` : badgeId;

    const sameBaseTwo = (a: string, base: string): boolean => {
      const as = String(a || '').split('.').filter(Boolean);
      if (as.length < 2) return false;
      return `${as[0]}.${as[1]}` === base;
    };

    // For multi-level badges we ONLY want tiered entries (3 segments), not a possible 2-segment summary entry.
    const badgeList = Array.isArray(badges) ? badges : [];
    const tiered = badgeList
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
    const isMulti = tieredUnique.length > 0;

    const effectiveLevels = isMulti ? tieredUnique : badgeList.filter((b) => (b.id || '') === (badge.id || ''));

    const base = isMulti
      ? (effectiveLevels.find((b) => String(b.level || '').toLowerCase().includes('баз')) ||
         effectiveLevels.find((b) => String(b.level || '').toLowerCase().includes('одноуровнев')) ||
         effectiveLevels[0] ||
         badge)
      : badge;

    const others = (isMulti ? effectiveLevels : effectiveLevels).filter((b) => {
      const isBase = base && b.id === base.id;
      const isSingle = String(b.level || '').toLowerCase().includes('одноуровнев');
      return !isBase && !isSingle;
    });

    return { badgeLevels: effectiveLevels, baseLevelBadge: base, otherLevels: others, isMultiLevel: isMulti };
  }, [badge, badges]);

  // Content Logic
  const { baseCriteria, evidenceText, mainDescription } = useMemo(() => {
    let evidenceText: string | null = null;
    let baseCriteria: string[] = [];
    
    const sourceBadge = baseLevelBadge || badge;
    
    let descriptionText = sourceBadge.description || '';
    // Fix: Remove duplicate text if present
    descriptionText = descriptionText.replace(/Объяснение ценности значка:\s*$/, '').trim();

    if (sourceBadge) {
      if (sourceBadge.confirmation) {
        evidenceText = sourceBadge.confirmation;
      }
      
      if (sourceBadge.criteria) {
        const raw = sourceBadge.criteria.replace(/^Как получить значок «[^»]+»:\s*/, '');
        const shouldFormat = shouldApplyFormatting(sourceBadge.id);
        const processedRaw = shouldFormat ? fixCriteriaFormatting(raw) : raw;
        
        if (sourceBadge.confirmation) {
          const { mainText, evidenceText: extracted } = extractEvidenceSection(processedRaw);
          evidenceText = extracted || sourceBadge.confirmation;
          baseCriteria = mainText.split('✅').filter(c => c.trim()).map(c => c.trim());
        } else {
          const { mainText, evidenceText: extracted } = extractEvidenceSection(processedRaw);
          evidenceText = extracted;
          baseCriteria = mainText.split('✅').filter(c => c.trim()).map(c => c.trim());
        }
        // If criteria came as bullet-list (e.g. from array in JSON), split by newlines
        if (baseCriteria.length === 1 && (baseCriteria[0].includes('\n') || baseCriteria[0].includes('•') || baseCriteria[0].includes('\u2022'))) {
          baseCriteria = baseCriteria[0]
            .split('\n')
            .map((line: string) => line.replace(/^[\s\u2022•]+/, '').trim())
            .filter(Boolean);
        }
        baseCriteria = baseCriteria.filter((line) => !/^как получить/i.test(line.trim()));
      }
    }

    const shouldFormatDesc = shouldApplyFormatting(sourceBadge.id);
    const processedDesc = shouldFormatDesc ? fixDescriptionFormatting(descriptionText) : descriptionText;
    const { mainText: descMain, evidenceText: descEvidence } = extractEvidenceSection(processedDesc);
    
    // If evidence wasn't found in criteria, maybe it's in description
    if (!evidenceText && descEvidence) {
      evidenceText = descEvidence;
    }

    return { baseCriteria, evidenceText, mainDescription: descMain };
  }, [baseLevelBadge, badge]);

  const showHowToBecome = Boolean(baseLevelBadge?.howToBecome) && baseCriteria.length === 0;
  const howToBecomeText = showHowToBecome
    ? baseLevelBadge!.howToBecome!.replace(/^Как получить[^\n]*\n?/i, '').trim()
    : '';

  // Helper for rendering emoji/icon
  const renderIcon = (b: Badge, size: 'large' | 'xlarge', className: string) => {
    const idSegments = String(b.id).split('.').filter(Boolean);
    const baseBadgeId = idSegments.slice(0, 2).join('.');
    const isTieredLevel = idSegments.length === 3;
    const isImageBadge = hasBadgeImage(
      baseBadgeId,
      badge.title,
      badge.category_id || category.id,
      isTieredLevel ? String(b.id) : undefined,
      isTieredLevel ? b.title : undefined
    );
    
    if (isImageBadge) {
      // Используем ту же логику, что и в BadgeLevelView.tsx
      // Для каждого уровня передаем его собственный id и title
      return (
        <BadgeIcon
          badgeId={baseBadgeId}
          badgeTitle={badge.title}
          categoryId={badge.category_id || category.id}
          emoji={b.emoji || ''}
          levelId={isTieredLevel ? String(b.id) : undefined}
          levelTitle={isTieredLevel ? b.title : undefined}
          className={className}
          size={size}
        />
      );
    }
    return <div className={className} style={{fontSize: size === 'xlarge' ? '5rem' : '4rem'}}>{b.emoji || '🏆'}</div>;
  };

  const badgeHeroImageUrl = useMemo(() => {
    const sourceBadge = baseLevelBadge || badge;
    const heroBaseId = String(sourceBadge?.id || badge.id || '').split('.').slice(0, 2).join('.');
    if (!heroBaseId) return null;
    const sourceTitle = sourceBadge?.title || badge.title;
    if (!sourceTitle) return null;
    return {
      realism: getBadgeImagePath(heroBaseId, sourceTitle, category.id, undefined, undefined, 'realism'),
      fallback: getBadgeImagePath(heroBaseId, sourceTitle, category.id, undefined, undefined, 'default'),
    };
  }, [baseLevelBadge, badge, category.id]);

  const effectiveHeroSrc = useMemo(() => {
    return badgeHeroImageUrl?.realism || badgeHeroImageUrl?.fallback || null;
  }, [badgeHeroImageUrl]);

  const [heroSrc, setHeroSrc] = useState<string | null>(null);
  useEffect(() => {
    setHeroSrc(effectiveHeroSrc);
  }, [effectiveHeroSrc]);
  useEffect(() => {
    setUseHeroWebp(true);
  }, [heroSrc]);
  const heroWebp = useMemo(
    () => (heroSrc && useHeroWebp ? toSiblingImageUrl(heroSrc, 'webp') : null),
    [heroSrc, useHeroWebp]
  );

  const progress = getBadgeProgress(baseBadgeId);
  const totalLevels = badgeLevels.length || 1; // Override total with actual levels count
  const startLevelId = String(baseLevelBadge?.id || badgeLevels[0]?.id || badge.id || '');
  const hasStarted = progress.started > 0;
  const hasProgress = hasStarted || progress.achieved > 0;
  const isComplete = totalLevels > 0 && progress.achieved >= totalLevels;
  const hasApprovedPlanForRoute = useMemo(() => {
    const plans = userData.badgePlans || {};
    const sectionPrefix = `${baseBadgeId}.`;
    return Object.values(plans).some((plan) => {
      if (!plan) return false;
      const planBadgeId = String(plan.badgeId || '');
      if (!planBadgeId) return false;
      const isSameSection = planBadgeId === baseBadgeId || planBadgeId.startsWith(sectionPrefix);
      if (!isSameSection) return false;
      return plan.status === 'approved';
    });
  }, [userData.badgePlans, baseBadgeId]);
  const canResetRouteFromInProgress = hasProgress && !isComplete && progress.achieved === 0 && !hasApprovedPlanForRoute;
  const routeResetBlockedReason = useMemo(() => {
    if (!hasProgress || isComplete) return null;
    if (progress.achieved > 0) {
      return 'Сброс недоступен: уже получен минимум один значок в этом разделе.';
    }
    if (hasApprovedPlanForRoute) {
      return 'Сброс недоступен: план получения значка уже утверждён.';
    }
    return null;
  }, [hasProgress, isComplete, progress.achieved, hasApprovedPlanForRoute]);
  const collectionCount = progress.achieved;
  const collectionHint = isComplete
    ? 'Все уровни в коллекции'
    : progress.achieved > 0
      ? `В коллекции ${progress.achieved} из ${totalLevels} уровней`
      : 'Пока ни одного уровня в коллекции';

  useEffect(() => {
    if (!canResetRouteFromInProgress && routeResetConfirmOpen) {
      setRouteResetConfirmOpen(false);
    }
  }, [canResetRouteFromInProgress, routeResetConfirmOpen]);

  useEffect(() => {
    if (!routeResetNotice) return;
    const timeoutId = window.setTimeout(() => setRouteResetNotice(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [routeResetNotice]);

  useEffect(() => {
    if (!startShareOpen) return;
    if (startShareBusy) return;
    const id = window.setTimeout(() => setStartShareOpen(false), 9500);
    return () => window.clearTimeout(id);
  }, [startShareOpen, startShareBusy]);

  const handleStartRoute = () => {
    if (!startLevelId) return;
    if (hasProgress || isComplete) return;
    startRoute(startLevelId, {
      onAdded: () => {
        if (['10.1', '10.2', '10.3'].includes(baseBadgeId)) {
          addFlagBadgeRequest(baseBadgeId);
        }
        setStartShareStatus(null);
        setStartShareOpen(true);
      },
      onLimit: () => {},
    });
  };

  const handleShareStart = async () => {
    if (startShareBusy) return;
    if (!baseBadgeId || !startLevelId) return;

    setStartShareBusy(true);
    setStartShareStatus('Генерируем манифест маршрута…');
    try {
      const skills = getBadge4kSkills(startLevelId);
      const manifestSkill = skills.length ? getSkillLabel(skills[0]) : (category?.title || 'навыки');

      const challengeRaw = await fetchAiSlogan({
        kind: 'route_manifest_challenge',
        badgeTitle: badge.title,
      });
      const challengeLine = (challengeRaw != null && typeof challengeRaw === 'string')
        ? challengeRaw.trim()
        : (typeof challengeRaw === 'object' && challengeRaw && 'slogan' in challengeRaw && challengeRaw.slogan)
          ? String(challengeRaw.slogan).trim()
          : 'сделать первый шаг по значку и записать результат.';
      const manifestCaption = `Мой вызов на сегодня — ${challengeLine}`;

      const vibeRaw = await fetchVibeCheck({ variant: 'badge', badgeTitle: badge.title, categoryTitle: category.title, description: badge.description || badge.criteria });
      const vibeCheck = vibeRaw ? { memeHeader: vibeRaw.meme_header, memeText: vibeRaw.meme_text, statBuff: vibeRaw.stat_buff } : undefined;

      const createdAt = new Date().toISOString();
      const story = await generateSocialCard({
        kind: 'start_route',
        format: 'story',
        hideNickname: true,
        profile: {
          nickname: userData.profile.nickname,
          rank: '',
          avatar: '',
          totalLevelsAchieved: userData.profile.stats.totalLevelsAchieved,
          totalBadgesStarted: userData.profile.stats.totalBadgesStarted,
        },
        badge: {
          id: startLevelId,
          baseId: baseBadgeId,
          title: badge.title,
          emoji: badge.emoji || baseLevelBadge?.emoji || '🏆',
          categoryId: String(badge.category_id || category.id || ''),
          levelLabel: String(baseLevelBadge?.level || badge.level || ''),
        },
        createdAt,
        manifestSkill,
        customCaption: manifestCaption,
        vibeCheck,
      });

      const outcome = await shareOrDownloadSocialCard(story);
      if (outcome === 'canceled') {
        setStartShareStatus('Отмена.');
        return;
      }
      if (outcome === 'shared') {
        setStartShareStatus('Отправлено через системное меню шеринга.');
        window.setTimeout(() => setStartShareOpen(false), 1600);
        return;
      }

      const copied = await copyTextToClipboard(story.text);
      setStartShareStatus(copied ? 'PNG скачан, подпись скопирована.' : 'PNG скачан. Подпись можно скопировать в профиле.');
      window.setTimeout(() => setStartShareOpen(false), 2600);
    } catch (e) {
      console.error(e);
      setStartShareStatus('Не удалось сделать карточку. Попробуй ещё раз.');
    } finally {
      setStartShareBusy(false);
    }
  };

  const handleOpenShareCenter = () => {
    try {
      window.location.hash = '#share';
    } catch {
      // ignore
    }

    const openProfile = (window as any)?.openProfile;
    if (typeof openProfile === 'function') {
      openProfile();
      return;
    }

    setStartShareStatus('Открой профиль: Share Center уже готов.');
  };

  const handleCopyBadgeLink = async () => {
    const url = getBadgeShareUrl(baseBadgeId);
    if (!url) return;
    const ok = await copyTextToClipboard(url);
    setStartShareStatus(ok ? 'Ссылка на значок скопирована.' : 'Не удалось скопировать ссылку.');
  };

  const handleOpenWorkshopForCategory = () => {
    const categoryId = String(category?.id ?? badge?.category_id ?? '8');
    try {
      window.location.hash = `#workshop?categoryId=${encodeURIComponent(categoryId)}`;
      sessionStorage.setItem('rl_open_workshop', categoryId);
    } catch {
      // ignore
    }
    const openProfile = (window as any)?.openProfile;
    if (typeof openProfile === 'function') {
      openProfile();
    }
  };

  const handleConfirmRouteReset = () => {
    if (!baseBadgeId || !canResetRouteFromInProgress) return;
    removeRoute(baseBadgeId);
    setRouteResetNotice(null);
    setRouteResetConfirmOpen(false);
  };

  const handleAttemptRouteReset = () => {
    if (!hasProgress || isComplete) return;
    if (!canResetRouteFromInProgress) {
      if (routeResetBlockedReason) {
        setRouteResetNotice(routeResetBlockedReason);
      }
      return;
    }
    setRouteResetNotice(null);
    setRouteResetConfirmOpen(true);
  };

  return (
    <div className="badge-view-container">
      <div className="noise-overlay"></div>
      {/* GlobalCursor renders the custom cursor layer once at app root */}

      {startShareOpen && (
        <div className="badge-share-toast" role="status" aria-live="polite">
          <div className="badge-share-toast__text">
            {startShareStatus || 'Маршрут добавлен в путь. Сделать сторис старта?'}
          </div>
          <div className="badge-share-toast__actions">
            <button
              type="button"
              className="badge-share-toast__btn"
              onClick={handleShareStart}
              disabled={startShareBusy}
            >
              {startShareBusy ? 'Генерируем…' : 'Поделиться'}
            </button>
            <button
              type="button"
              className="badge-share-toast__btn"
              onClick={handleOpenShareCenter}
              disabled={startShareBusy}
            >
              Share Center
            </button>
            <button
              type="button"
              className="badge-share-toast__btn"
              onClick={handleCopyBadgeLink}
              disabled={startShareBusy}
            >
              Ссылка на значок
            </button>
            <button
              type="button"
              className="badge-share-toast__btn badge-share-toast__btn--ghost"
              onClick={() => setStartShareOpen(false)}
              disabled={startShareBusy}
            >
              Не сейчас
            </button>
          </div>
        </div>
      )}

      {routeResetConfirmOpen && (
        <div className="route-confirm-overlay" onClick={() => setRouteResetConfirmOpen(false)}>
          <div
            className="route-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="route-reset-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="route-reset-title" className="route-confirm-modal__title">Сбросить маршрут?</h3>
            <p className="route-confirm-modal__text">Если продолжить, маршрут будет сброшен.</p>
            <div className="route-confirm-modal__actions">
              <button type="button" className="route-confirm-btn" onClick={() => setRouteResetConfirmOpen(false)}>
                Отмена
              </button>
              <button type="button" className="route-confirm-btn route-confirm-btn--danger" onClick={handleConfirmRouteReset}>
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}

      {routeResetNotice && (
        <div className="badge-route-toast" role="status" aria-live="polite">
          {routeResetNotice}
        </div>
      )}

      {/* Mobile Navigation Header */}
      <header className={`mobile-glass-header${isChatOpen ? ' is-chat-open' : ''}`} aria-label="Навигация">
        <div className="mobile-header-left">
          <button type="button" className="mobile-header-back" onClick={onBack} aria-label="Назад">
            ←
          </button>
        </div>
        <div className="mobile-badge-title" aria-label="Значок">
          <span className="mobile-badge-title-main">{badge.title}</span>
        </div>
        <div className="mobile-header-actions">
          <button
            type="button"
            className={`mobile-header-btn mobile-header-menu${isMenuOpen ? ' is-active' : ''}`}
            onClick={handleMenuToggle}
            aria-label="Меню"
            aria-expanded={isMenuOpen}
            aria-controls="badge-mobile-menu-panel"
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
              <img src="/RL-Guide-book/Валюша.jpg" alt="НейроВалюша" decoding="async" fetchpriority="high" />
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
        id="badge-mobile-menu-panel"
        className={`mobile-menu-panel${isMenuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-menu-title"
        aria-hidden={!isMenuOpen}
      >
        <div className="mobile-menu-head">
          <span id="badge-menu-title" className="mobile-menu-title">Меню</span>
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
        <button onClick={onBack} className="nav-link-back hover-target">← Назад к категории</button>
      </div>

      <main className="badge-main">
        {/* Header */}
        <section className="badge-hero reveal-on-scroll">
          <div className="badge-hero-icon">
            {renderIcon(badge, 'xlarge', 'hero-emoji')}
          </div>
          <div className="badge-hero-content">
            <h1>{badge.title}</h1>
            <div className="badge-hero-category">{category.title}</div>

            <BadgeSkinPanel
              badgeTitle={badge.title}
              badgeBaseId={baseBadgeId}
              categoryId={category.id}
              categoryTitle={category.title}
              inProgressCount={collectionCount}
              inProgressMax={totalLevels}
              inProgressHint={collectionHint}
            />

            {startLevelId && (
              mechanicLocked ? (
                <FeatureGate
                  allowed={false}
                  reason={mechanicGateReason}
                  ctaLabel={broLocked ? 'Бросвящение в ЛК' : 'Открыть ЛК → Движки'}
                  onCta={openMechanicCta}
                  mode="replace"
                >
                  <span />
                </FeatureGate>
              ) : (
                <div className="badge-cta-row">
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className={`badge-like-btn${isFavorite ? ' is-liked' : ''}`}
                    aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                    aria-pressed={isFavorite}
                  >
                    <span aria-hidden="true">{isFavorite ? '❤️' : '🤍'}</span>
                  </button>

                  {isComplete ? (
                    <button type="button" className="badge-cta is-complete" disabled>
                      Маршрут завершён
                    </button>
                  ) : hasProgress ? (
                    <button
                      type="button"
                      onClick={handleAttemptRouteReset}
                      className={`badge-cta${canResetRouteFromInProgress ? '' : ' is-disabled'}`}
                      aria-disabled={!canResetRouteFromInProgress}
                      title={routeResetBlockedReason || 'Нажми, чтобы сбросить маршрут'}
                    >
                      Уже в пути
                    </button>
                  ) : (
                    <button type="button" className="badge-cta" onClick={handleStartRoute}>
                      В мой путь
                    </button>
                  )}
                </div>
              )
            )}
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
                  alt={baseLevelBadge?.title || badge.title}
                  className="badge-hero-media__image"
                  loading="lazy"
                  decoding="async"
                  onLoad={() => setIsHeroLoaded(true)}
                  onError={() => {
                    if (useHeroWebp) {
                      setUseHeroWebp(false);
                      return;
                    }
                    const next = badgeHeroImageUrl?.fallback || null;
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

              {baseLevelBadge?.nameExplanation && (
                <>
                  <h4>Объяснение названия и ценности</h4>
                  <p className="content-text">{baseLevelBadge.nameExplanation}</p>
                </>
              )}

              {baseLevelBadge?.skillTips && (
                <>
                  <h4>Как прокачать навык</h4>
                  <p className="content-text" dangerouslySetInnerHTML={{__html: baseLevelBadge.skillTips.replace(/\n/g, '<br>')}}></p>
                </>
              )}

              {baseLevelBadge?.importance && (
                <>
                  <h4>Почему этот значок важен</h4>
                  <p className="content-text">{baseLevelBadge.importance}</p>
                </>
              )}

              {baseLevelBadge?.examples && (
                <>
                  <h4>Примеры</h4>
                  <p className="content-text" dangerouslySetInnerHTML={{__html: baseLevelBadge.examples.replace(/\n/g, '<br>')}}></p>
                </>
              )}

              {baseLevelBadge?.philosophy && (
                <>
                  <h4>Философия значка</h4>
                  <p className="content-text">{baseLevelBadge.philosophy}</p>
                </>
              )}

              {showHowToBecome && (
                <>
                  <h4>Как получить</h4>
                  <p className="content-text" dangerouslySetInnerHTML={{__html: howToBecomeText.replace(/\n/g, '<br>')}}></p>
                </>
              )}

              <div className="badge-meta">
                <div className="meta-item">
                  <span className="meta-label">Категория</span>
                  <span className="meta-value">{category.title}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Уровней</span>
                  <span className="meta-value">{badgeLevels.length}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">ID</span>
                  <span className="meta-value">{badge.id}</span>
                </div>
              </div>

              <FeatureGate
                allowed={!mechanicLocked}
                reason={mechanicGateReason}
                ctaLabel={broLocked ? 'Бросвящение в ЛК' : 'Открыть ЛК → Движки'}
                onCta={openMechanicCta}
                mode="replace"
              >
                <div className="badge-workshop-cta" style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,215,0,0.06)', borderRadius: '16px', border: '1px solid rgba(255,215,0,0.15)', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '14px', opacity: 0.9 }}>Этого мало? Предложи свой вариант</p>
                  <button type="button" onClick={handleOpenWorkshopForCategory} className="badge-cta" style={{ width: '100%', padding: '12px 16px', fontSize: '13px' }}>
                    Открыть Мастерскую в эту категорию
                  </button>
                </div>
              </FeatureGate>
            </div>
          </div>

          {/* Right Column */}
          <div className="badge-right-col reveal-on-scroll" style={{ transitionDelay: '0.1s' }}>
            <div className="content-block">
              <h3>{isMultiLevel ? 'Как получить базовый уровень' : 'Как получить значок'}</h3>
              
              {baseCriteria.length > 0 ? (
                <ul className="criteria-list">
                  {baseCriteria.map((criterion, index) => (
                    <li key={index} dangerouslySetInnerHTML={{ __html: criterion.replace(/\n/g, '<br>') }} />
                  ))}
                </ul>
              ) : (
                <p className="content-text">Критерии пока не определены.</p>
              )}

              {evidenceText && (
                <>
                  <h4>Чем подтверждается</h4>
                  <p className="content-text" style={{ color: 'var(--c-volt)', fontStyle: 'italic' }}>
                    {evidenceText}
                  </p>
                </>
              )}
            </div>

            {/* Other Levels */}
            {otherLevels.length > 0 && (
              <div className="levels-dock">
                {otherLevels.map(level => (
                  <div 
                    key={level.id} 
                    className="level-bubble hover-target"
                    onClick={() => onLevelSelect(String(level.level))}
                  >
                    <div className="level-bubble-icon">
                      {renderIcon(level, 'xlarge', '')}
                    </div>
                    <div className="level-bubble-title">{level.title}</div>
                    <div className="level-bubble-subtitle">{String(level.level)}</div>
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
          currentView="badge"
          currentCategory={category}
          currentBadge={{
            id: badge.id,
            title: badge.title,
            emoji: badge.emoji,
            categoryId: badge.category_id
          }}
        />
      </Suspense>
    </div>
  );
};

export default BadgeView;
