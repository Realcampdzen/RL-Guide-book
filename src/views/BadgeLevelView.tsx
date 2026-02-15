import React, { useEffect, useMemo, useState, Suspense } from 'react';
import {
  fixDescriptionFormatting,
  fixCriteriaFormatting,
  extractEvidenceSection,
  shouldApplyFormatting
} from '../utils/textFormatting';
import { useScrollReveal } from '../hooks/useScrollReveal';
import BadgeIcon from '../components/BadgeIcon';
import BadgeSkinPanel from '../components/BadgeSkinPanel';
import { FeatureGate } from '../components/FeatureGate';
import { Skeleton } from '../components/Skeleton';
import { getBadgeImagePath, hasBadgeImage } from '../utils/badgeImages';
import { toSiblingImageUrl } from '../utils/imageSources';
import { useUserProgress } from '../hooks/useUserProgress';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { canRequestBadgeApproval } from '../types/authRole';
import { createBadgeRequest } from '../utils/badgeApprovalApi';
import { getRank } from '../types/userProgress';
import {
  copyTextToClipboard,
  generateSocialCard,
  getBadgeShareUrl,
  shareOrDownloadSocialCard,
  type SocialCardResult,
} from '../utils/socialGenerator';
import { fetchAiSlogan, fetchVibeCheck } from '../utils/aiService';
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
  const { initReveal } = useScrollReveal();
  const { getLevelProgress, getBadgeProgress, updateLevelStatus, toggleFavorite, startRoute, removeRoute, userData, addFlagBadgeRequest } = useUserProgress();
  const { role, accessToken, deviceId } = useAuth();
  const { myTeam } = useTeam();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHeroLoaded, setIsHeroLoaded] = useState(false);
  const [useHeroWebp, setUseHeroWebp] = useState(true);
  
  // State for completion form
  const [reflection, setReflection] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [badgeRequestBusy, setBadgeRequestBusy] = useState(false);
  const [badgeRequestStatus, setBadgeRequestStatus] = useState<string | null>(null);

  // Share Achievement (MVP)
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shareHideNickname, setShareHideNickname] = useState(true);
  const [shareStory, setShareStory] = useState<SocialCardResult | null>(null);
  const [shareWide, setShareWide] = useState<SocialCardResult | null>(null);
  const [shareStoryUrl, setShareStoryUrl] = useState<string | null>(null);
  const [shareWideUrl, setShareWideUrl] = useState<string | null>(null);

  // Share Favorite (MVP)
  const [favoriteShareOpen, setFavoriteShareOpen] = useState(false);
  const [favoriteShareBusy, setFavoriteShareBusy] = useState(false);
  const [favoriteShareStatus, setFavoriteShareStatus] = useState<string | null>(null);
  const [routeResetConfirmOpen, setRouteResetConfirmOpen] = useState(false);
  const [routeResetNotice, setRouteResetNotice] = useState<string | null>(null);

  const broLocked = category.id === '9' && !Boolean(userData?.broProgress?.isBro);
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
  const teamLocked = category.id === '8' && !hasTeam;
  const mechanicLocked = broLocked || teamLocked;
  const broGateReason = 'Прогресс по Бро‑значкам доступен после подтверждения Бросвящения у вожатого.';
  const teamGateReason = 'Прогресс по значкам Движка доступен после создания или вступления в Движок в ЛК.';
  const mechanicGateReason = broLocked ? broGateReason : teamLocked ? teamGateReason : '';
  const mechanicGateCtaLabel = broLocked ? 'Запросить подтверждение' : teamLocked ? 'Открыть ЛК → Движки' : '';

  const requestBroConfirmation = () => {
    const nickname = userData?.profile?.nickname || 'Искатель';
    const text = `Запрос подтверждения Бросвящения (Бро‑значки). Устройство: ${deviceId || '—'}. Псевдоним: ${nickname}.`;
    const href = `https://t.me/Stivanovv?text=${encodeURIComponent(text)}`;
    try {
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = href;
    }
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

  const mechanicGateOnCta = broLocked ? requestBroConfirmation : teamLocked ? openTeamDashboard : undefined;

  // Derive current level ID safely
  // Assuming levelBadge is correctly derived below, we use its ID.
  // But we need it here for hooks if possible, or later.
  // We'll wait for levelBadge to be derived.

  useEffect(() => {
    initReveal('.reveal-on-scroll');
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
  const { levelBadge, otherLevels, levelsAll, currentLevelIndex } = useMemo(() => {
    const badgeList = Array.isArray(badges) ? badges : [];
    const badgeId = String(badge.id || '');
    const segments = badgeId.split('.').filter(Boolean);
    const baseTwo = segments.length >= 2 ? `${segments[0]}.${segments[1]}` : badgeId;

    const sameBaseTwo = (a: string, base: string): boolean => {
      const as = String(a || '').split('.').filter(Boolean);
      if (as.length < 2) return false;
      return `${as[0]}.${as[1]}` === base;
    };

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
    const isMultiLevel = tieredUnique.length > 0;

    const siblingLevels = isMultiLevel
      ? tieredUnique
      : badgeList.filter((b) => (b.id || '') === (badge.id || ''));

    const normalizeLevelValue = (value: unknown) => String(value ?? '').trim().toLowerCase();
    const requestedLevel = normalizeLevelValue(level);
    const requestedById = String(level || '').trim();
    const levelBadge =
      siblingLevels.find((b) => normalizeLevelValue(b.level) === requestedLevel) ||
      siblingLevels.find((b) => String(b.id || '').trim() === requestedById) ||
      null;

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

    const resolvedLevelBadge = levelBadge || badge;
    const currentLevelId = String(resolvedLevelBadge.id || '');
    const currentLevelIndex = levelsAll.findIndex((l) => String(l.id || '') === currentLevelId);
    const otherLevels = levelsAll.filter((l) => String(l.id || '') !== currentLevelId);

    return { levelBadge: resolvedLevelBadge, otherLevels, levelsAll, currentLevelIndex };
  }, [badge, badges, level]);

  const levelLabel = useMemo(() => {
    return String(levelBadge?.level || level || '').toLowerCase();
  }, [levelBadge?.level, level]);

  const isAdvancedOrExpert = useMemo(() => {
    return levelLabel.includes('продвинут') || levelLabel.includes('эксперт') || levelLabel.includes('вожат');
  }, [levelLabel]);

  const favoritesSet = useMemo(() => new Set(userData.favorites || []), [userData.favorites]);
  const favoriteTargetId = useMemo(() => String(levelBadge?.id || '').trim(), [levelBadge?.id]);
  const isFavorite = Boolean(favoriteTargetId && favoritesSet.has(favoriteTargetId));

  // Initialize form state
  const currentProgress = getLevelProgress(levelBadge.id);
  const isCompleted = currentProgress?.status === 'achieved';
  const levelBaseBadgeId = useMemo(() => String(badge.id || '').split('.').slice(0, 2).join('.'), [badge.id]);
  const badgeProgress = getBadgeProgress(levelBaseBadgeId);
  const totalLevels = levelsAll.length || 1;
  const startLevelId = String(levelsAll[0]?.id || levelBadge.id || '');
  const hasStarted = badgeProgress.started > 0;
  const hasProgress = hasStarted || badgeProgress.achieved > 0;
  const isBadgeComplete = totalLevels > 0 && badgeProgress.achieved >= totalLevels;
  const hasApprovedPlanForRoute = useMemo(() => {
    const plans = userData.badgePlans || {};
    const sectionPrefix = `${levelBaseBadgeId}.`;
    return Object.values(plans).some((plan) => {
      if (!plan) return false;
      const planBadgeId = String(plan.badgeId || '');
      if (!planBadgeId) return false;
      const isSameSection = planBadgeId === levelBaseBadgeId || planBadgeId.startsWith(sectionPrefix);
      if (!isSameSection) return false;
      return plan.status === 'approved';
    });
  }, [userData.badgePlans, levelBaseBadgeId]);
  const canResetRouteFromInProgress = hasProgress && !isBadgeComplete && badgeProgress.achieved === 0 && !hasApprovedPlanForRoute;
  const routeResetBlockedReason = useMemo(() => {
    if (!hasProgress || isBadgeComplete) return null;
    if (badgeProgress.achieved > 0) {
      return 'Сброс недоступен: уже получен минимум один значок в этом разделе.';
    }
    if (hasApprovedPlanForRoute) {
      return 'Сброс недоступен: план получения значка уже утверждён.';
    }
    return null;
  }, [hasProgress, isBadgeComplete, badgeProgress.achieved, hasApprovedPlanForRoute]);
  const collectionCount = badgeProgress.achieved;
  const collectionHint = isBadgeComplete
    ? 'Все уровни в коллекции'
    : badgeProgress.achieved > 0
      ? `В коллекции ${badgeProgress.achieved} из ${totalLevels} уровней`
      : 'Пока ни одного уровня в коллекции';

  const previousLevel = currentLevelIndex > 0 ? levelsAll[currentLevelIndex - 1] : null;
  const previousLevelProgress = previousLevel ? getLevelProgress(previousLevel.id) : undefined;
  const canUseSkinPanel = role === 'developer' || !previousLevel || previousLevelProgress?.status === 'achieved';
  const skinPanelLockHint = previousLevel
    ? `Арты откроются после получения предыдущего уровня «${previousLevel.title || previousLevel.level || previousLevel.id}».`
    : 'Арты этого уровня пока недоступны.';
  const canSendBadgeRequest = canRequestBadgeApproval(role);

  useEffect(() => {
    if (currentProgress?.reflection) {
      setReflection(currentProgress.reflection);
    }
  }, [currentProgress]);

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
    return () => {
      if (shareStoryUrl) URL.revokeObjectURL(shareStoryUrl);
      if (shareWideUrl) URL.revokeObjectURL(shareWideUrl);
    };
  }, [shareStoryUrl, shareWideUrl]);

  useEffect(() => {
    setShareStory(null);
    setShareWide(null);
    setShareStoryUrl(null);
    setShareWideUrl(null);
    setShareStatus(null);
  }, [shareHideNickname]);

  useEffect(() => {
    if (!favoriteShareOpen) return;
    if (favoriteShareBusy) return;
    const id = window.setTimeout(() => setFavoriteShareOpen(false), 9500);
    return () => window.clearTimeout(id);
  }, [favoriteShareOpen, favoriteShareBusy]);

  const handleGenerateAchievementShareCards = async (opts?: { createdAt?: string; reflection?: string; levelsAchieved?: number }) => {
    if (shareBusy) return;
    setShareBusy(true);
    setShareStatus('Запрашиваем слоган у НейроВалюши…');
    try {
      const raw = await fetchAiSlogan({
        kind: 'achieved_level',
        badgeTitle: badge.title,
        levelLabel: levelBadge.title || level,
      });
      const slogan = raw == null ? null : typeof raw === 'string' ? raw : raw.slogan;

      const vibeRaw = await fetchVibeCheck({ variant: 'badge', badgeTitle: badge.title, categoryTitle: category.title, description: badge.description || badge.criteria });
      const vibeCheck = vibeRaw ? { memeHeader: vibeRaw.meme_header, memeText: vibeRaw.meme_text, statBuff: vibeRaw.stat_buff } : undefined;

      const createdAt = opts?.createdAt || new Date().toISOString();
      const reflectionText = String(opts?.reflection ?? reflection ?? '').trim();
      const baseId = String(levelBadge?.id || badge.id || '').split('.').slice(0, 2).join('.');
      const achievedCount = Number(opts?.levelsAchieved ?? userData.profile.stats.totalLevelsAchieved);
      const rank = getRank(achievedCount);

      const profilePayload = {
        nickname: userData.profile.nickname,
        rank,
      };

      const badgePayload = {
        id: levelBadge.id,
        baseId,
        title: badge.title,
        emoji: badge.emoji || levelBadge.emoji,
        categoryId: badge.category_id || category.id,
        levelLabel: levelBadge.title || level,
      };

      const story = await generateSocialCard({
        kind: 'achieved_level',
        format: 'story',
        hideNickname: shareHideNickname,
        profile: profilePayload,
        badge: badgePayload,
        reflection: reflectionText,
        createdAt,
        customCaption: slogan || undefined,
        vibeCheck,
      });

      const wide = await generateSocialCard({
        kind: 'achieved_level',
        format: 'wide',
        hideNickname: shareHideNickname,
        profile: profilePayload,
        badge: badgePayload,
        reflection: reflectionText,
        createdAt,
        customCaption: slogan || undefined,
        vibeCheck,
      });

      setShareStory(story);
      setShareWide(wide);
      setShareStoryUrl(URL.createObjectURL(story.blob));
      setShareWideUrl(URL.createObjectURL(wide.blob));
      setShareStatus('Карточки готовы: 9:16 и 16:9.');
    } catch (e) {
      console.error(e);
      setShareStatus('Не удалось сгенерировать карточки. Попробуй ещё раз.');
    } finally {
      setShareBusy(false);
    }
  };

  const handleShareAchievementCard = async (result: SocialCardResult) => {
    if (shareBusy) return;
    setShareBusy(true);
    setShareStatus(null);
    try {
      const outcome = await shareOrDownloadSocialCard(result);
      if (outcome === 'canceled') {
        setShareStatus('Отмена.');
        return;
      }
      if (outcome === 'shared') {
        setShareStatus('Отправлено через системное меню шеринга.');
        return;
      }

      const copied = await copyTextToClipboard(result.text);
      setShareStatus(copied ? 'PNG скачан, подпись скопирована.' : 'PNG скачан. Подпись можно скопировать ниже.');
    } catch (e) {
      console.error(e);
      setShareStatus('Не удалось поделиться/скачать. Попробуй ещё раз.');
    } finally {
      setShareBusy(false);
    }
  };

  const handleCopyShareCaption = async () => {
    const text = shareStory?.text || shareWide?.text || '';
    if (!text) return;
    const ok = await copyTextToClipboard(text);
    setShareStatus(ok ? 'Подпись скопирована.' : 'Не удалось скопировать подпись.');
  };

  const handleCopyBadgeLink = async () => {
    const baseId = String(badge?.id || '').split('.').slice(0, 2).join('.') || badge?.id;
    const url = getBadgeShareUrl(baseId);
    if (!url) return;
    const ok = await copyTextToClipboard(url);
    setShareStatus(ok ? 'Ссылка на значок скопирована.' : 'Не удалось скопировать ссылку.');
  };

  const handleToggleComplete = () => {
    if (mechanicLocked) {
      setBadgeRequestStatus(mechanicGateReason);
      return;
    }
    if (isCompleted) {
      if (confirm('Снять отметку о выполнении?')) {
        updateLevelStatus(levelBadge.id, 'locked'); // Or 'in_progress' if we had that flow
      }
    } else {
      const reflectionText = String(reflection || '').trim();
      updateLevelStatus(levelBadge.id, 'achieved', reflectionText);
      const levelIdStr = String(levelBadge?.id || '');
      if (['10.1.1', '10.2.1', '10.3.1'].includes(levelIdStr)) {
        const baseId = levelIdStr.split('.').slice(0, 2).join('.');
        addFlagBadgeRequest(baseId, { reflection: reflectionText });
      }
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      void handleGenerateAchievementShareCards({
        createdAt: new Date().toISOString(),
        reflection: reflectionText,
        levelsAchieved: userData.profile.stats.totalLevelsAchieved + 1,
      });
      window.setTimeout(() => setShareModalOpen(true), 450);
    }
  };

  const handleToggleFavorite = () => {
    if (!favoriteTargetId) return;
    const wasFavorite = isFavorite;
    if (wasFavorite) {
      toggleFavorite(favoriteTargetId);
      setFavoriteShareOpen(false);
    } else {
      toggleFavorite(favoriteTargetId, {
        onAdded: () => {
          setFavoriteShareStatus(null);
          setFavoriteShareOpen(true);
        },
        onLimit: () => {},
      });
    }
  };

  const handleSendBadgeRequest = async () => {
    if (mechanicLocked) {
      setBadgeRequestStatus(mechanicGateReason);
      return;
    }
    if (!canSendBadgeRequest) return;
    if (!accessToken) {
      setBadgeRequestStatus('Сначала разблокируй доступ по коду участника смены.');
      return;
    }
    if (badgeRequestBusy) return;

    setBadgeRequestBusy(true);
    setBadgeRequestStatus(null);
    try {
      const reflectionText = String(reflection || '').trim();
      await createBadgeRequest(accessToken, {
        levelId: String(levelBadge.id || ''),
        badgeTitle: String(levelBadge.title || badge.title || '').trim(),
        evidence: reflectionText ? { reflection: reflectionText } : undefined,
        nickname: userData.profile.nickname
      });
      setBadgeRequestStatus('Заявка отправлена вожатому.');
    } catch (e) {
      setBadgeRequestStatus(e instanceof Error ? e.message : 'Не удалось отправить заявку.');
    } finally {
      setBadgeRequestBusy(false);
    }
  };

  const handleStartRoute = () => {
    if (mechanicLocked) {
      setBadgeRequestStatus(mechanicGateReason);
      return;
    }
    if (!startLevelId) return;
    if (hasProgress || isBadgeComplete) return;
    startRoute(startLevelId, {
      onAdded: () => {
        if (['10.1', '10.2', '10.3'].includes(levelBaseBadgeId)) {
          addFlagBadgeRequest(levelBaseBadgeId);
        }
      },
      onLimit: () => {},
    });
  };

  const handleConfirmRouteReset = () => {
    if (!canResetRouteFromInProgress) return;
    removeRoute(levelBaseBadgeId);
    setRouteResetNotice(null);
    setRouteResetConfirmOpen(false);
  };

  const handleAttemptRouteReset = () => {
    if (!hasProgress || isBadgeComplete) return;
    if (!canResetRouteFromInProgress) {
      if (routeResetBlockedReason) {
        setRouteResetNotice(routeResetBlockedReason);
      }
      return;
    }
    setRouteResetNotice(null);
    setRouteResetConfirmOpen(true);
  };

  const handleShareFavorite = async () => {
    if (favoriteShareBusy) return;
    if (!favoriteTargetId) return;

    setFavoriteShareBusy(true);
    setFavoriteShareStatus('Генерируем карточку…');

    try {
      const vibeRaw = await fetchVibeCheck({ variant: 'badge', badgeTitle: badge.title, categoryTitle: category.title, description: badge.description || badge.criteria });
      const vibeCheck = vibeRaw ? { memeHeader: vibeRaw.meme_header, memeText: vibeRaw.meme_text, statBuff: vibeRaw.stat_buff } : undefined;

      const createdAt = new Date().toISOString();
      const baseId = String(levelBadge?.id || badge.id || '').split('.').slice(0, 2).join('.');

      const profilePayload = {
        nickname: userData.profile.nickname,
        rank: '',
      };

      const badgePayload = {
        id: levelBadge.id,
        baseId,
        title: badge.title,
        emoji: badge.emoji || levelBadge.emoji,
        categoryId: badge.category_id || category.id,
        levelLabel: levelBadge.title || level,
      };

      const story = await generateSocialCard({
        kind: 'favorite',
        format: 'story',
        hideNickname: true,
        profile: profilePayload,
        badge: badgePayload,
        createdAt,
        vibeCheck,
      });

      const outcome = await shareOrDownloadSocialCard(story);
      if (outcome === 'canceled') {
        setFavoriteShareStatus('Отмена.');
        return;
      }
      if (outcome === 'shared') {
        setFavoriteShareStatus('Отправлено через системное меню шеринга.');
        window.setTimeout(() => setFavoriteShareOpen(false), 1600);
        return;
      }

      const copied = await copyTextToClipboard(story.text);
      setFavoriteShareStatus(copied ? 'PNG скачан, подпись скопирована.' : 'PNG скачан. Подпись можно скопировать в профиле.');
      window.setTimeout(() => setFavoriteShareOpen(false), 2600);
    } catch (e) {
      console.error(e);
      setFavoriteShareStatus('Не удалось сделать карточку. Попробуй ещё раз.');
    } finally {
      setFavoriteShareBusy(false);
    }
  };

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
      // If criteria came as bullet-list (e.g. from array in JSON), split by newlines
      if (criteria.length === 1 && (criteria[0].includes('\n') || criteria[0].includes('•') || criteria[0].includes('\u2022'))) {
        criteria = criteria[0]
          .split('\n')
          .map((line: string) => line.replace(/^[\s\u2022•]+/, '').trim())
          .filter(Boolean);
      }
      criteria = criteria.filter((line: string) => !/^как получить/i.test(line.trim()));
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

  const showHowToBecome = Boolean(levelBadge.howToBecome) && levelCriteria.length === 0;
  const howToBecomeText = showHowToBecome
    ? levelBadge.howToBecome!.replace(/^Как получить[^\n]*\n?/i, '').trim()
    : '';

  // Determine background class
  const bgType = useMemo(() => {
    const l = String(level).toLowerCase();
    if (l.includes('продвинутый')) return 'advanced';
    if (l.includes('экспертный') || l.includes('вожатский')) return 'expert';
    return 'base';
  }, [level]);

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

  const levelHeroImageUrl = useMemo(() => {
    if (!levelBaseBadgeId) return null;
    const levelId = String(levelBadge?.id || '');
    const levelSegments = levelId.split('.');
    const isTieredLevel = levelSegments.length === 3;
    return {
      realism: getBadgeImagePath(
        levelBaseBadgeId,
        badge.title,
        category.id,
        isTieredLevel ? levelId : undefined,
        isTieredLevel ? levelBadge.title : undefined,
        'realism'
      ),
      fallback: getBadgeImagePath(
        levelBaseBadgeId,
        badge.title,
        category.id,
        isTieredLevel ? levelId : undefined,
        isTieredLevel ? levelBadge.title : undefined,
        'default'
      ),
    };
  }, [levelBaseBadgeId, badge.title, category.id, levelBadge]);

  const effectiveLevelHeroSrc = useMemo(() => {
    return levelHeroImageUrl?.realism || levelHeroImageUrl?.fallback || null;
  }, [levelHeroImageUrl]);

  const [heroSrc, setHeroSrc] = useState<string | null>(null);
  useEffect(() => {
    setHeroSrc(effectiveLevelHeroSrc);
  }, [effectiveLevelHeroSrc]);
  useEffect(() => {
    setUseHeroWebp(true);
  }, [heroSrc]);
  const heroWebp = useMemo(
    () => (heroSrc && useHeroWebp ? toSiblingImageUrl(heroSrc, 'webp') : null),
    [heroSrc, useHeroWebp]
  );

  return (
    <div className="badge-view-container" data-level-bg={bgType}>
      <div className="noise-overlay"></div>
      {/* GlobalCursor renders the custom cursor layer once at app root */}

      {favoriteShareOpen && (
        <div className="badge-share-toast" role="status" aria-live="polite">
          <div className="badge-share-toast__text">
            {favoriteShareStatus || 'Добавлено в избранное. Сделать сторис wishlist?'}
          </div>
          <div className="badge-share-toast__actions">
            <button
              type="button"
              className="badge-share-toast__btn"
              onClick={handleShareFavorite}
              disabled={favoriteShareBusy}
            >
              {favoriteShareBusy ? 'Генерируем…' : 'Поделиться'}
            </button>
            <button
              type="button"
              className="badge-share-toast__btn badge-share-toast__btn--ghost"
              onClick={() => setFavoriteShareOpen(false)}
              disabled={favoriteShareBusy}
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
          <span className="mobile-badge-title-main">{levelBadge.title}</span>
        </div>
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
        id="badge-level-mobile-menu-panel"
        className={`mobile-menu-panel${isMenuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-level-menu-title"
        aria-hidden={!isMenuOpen}
      >
        <div className="mobile-menu-head">
          <span id="badge-level-menu-title" className="mobile-menu-title">Меню</span>
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
            {renderIcon(levelBadge, 'xlarge', 'hero-emoji')}
          </div>
          <div className="badge-hero-content">
            <h1>{levelBadge.title}</h1>
            <div className="badge-hero-category">{level}</div>
            {isAdvancedOrExpert && favoriteTargetId && (
              <FeatureGate allowed={!mechanicLocked} reason={mechanicGateReason} ctaLabel={mechanicGateCtaLabel} onCta={mechanicGateOnCta}>
                <div className="badge-hero-actions">
                  <button
                    type="button"
                    className={`badge-favorite-btn${isFavorite ? ' is-active' : ''}`}
                    onClick={handleToggleFavorite}
                    aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                    aria-pressed={isFavorite}
                  >
                    <span className="badge-favorite-icon">{isFavorite ? '★' : '☆'}</span>
                    <span className="badge-favorite-label">{isFavorite ? 'В избранном' : 'В избранное'}</span>
                  </button>
                </div>
              </FeatureGate>
            )}

            <BadgeSkinPanel
              badgeTitle={badge.title}
              badgeBaseId={levelBaseBadgeId}
              categoryId={category.id}
              categoryTitle={category.title}
              inProgressCount={collectionCount}
              inProgressMax={totalLevels}
              inProgressHint={collectionHint}
              disabled={!canUseSkinPanel}
              disabledHint={skinPanelLockHint}
            />

            {startLevelId && (
              mechanicLocked ? (
                <FeatureGate
                  allowed={false}
                  reason={mechanicGateReason}
                  ctaLabel={mechanicGateCtaLabel}
                  onCta={mechanicGateOnCta}
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

                  {isBadgeComplete ? (
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
                  alt={levelBadge.title}
                  className="badge-hero-media__image"
                  loading="lazy"
                  decoding="async"
                  onLoad={() => setIsHeroLoaded(true)}
                  onError={() => {
                    if (useHeroWebp) {
                      setUseHeroWebp(false);
                      return;
                    }
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
            {/* Completion Widget */}
            <FeatureGate allowed={!mechanicLocked} reason={mechanicGateReason} ctaLabel={mechanicGateCtaLabel} onCta={mechanicGateOnCta}>
              <div className="content-block" style={{ borderLeft: isCompleted ? '4px solid #4caf50' : '4px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>
                    <input 
                      type="checkbox" 
                      checked={isCompleted} 
                      onChange={handleToggleComplete}
                      disabled={mechanicLocked}
                      style={{ width: '24px', height: '24px', marginRight: '10px', accentColor: '#4caf50' }}
                    />
                    {isCompleted ? 'Уровень выполнен! 🎉' : 'Отметить выполнение'}
                  </label>
                </div>
              
              {!isCompleted && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', opacity: 0.8 }}>
                    Рефлексия (обязательно): Что я сделал(а) и чему научился(ась)?
                  </label>
                  <textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    disabled={mechanicLocked}
                    placeholder="Кратко опиши свой опыт..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(0,0,0,0.2)',
                      color: 'white',
                      fontFamily: 'inherit'
                    }}
                  />
                  <button
                    onClick={handleToggleComplete}
                    disabled={mechanicLocked || reflection.length < 5}
                    style={{
                      marginTop: '10px',
                      padding: '8px 16px',
                      background: !mechanicLocked && reflection.length >= 5 ? '#4caf50' : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: !mechanicLocked && reflection.length >= 5 ? 'pointer' : 'not-allowed',
                      opacity: !mechanicLocked && reflection.length >= 5 ? 1 : 0.5,
                      fontWeight: 'bold'
                    }}
                  >
                    Сохранить прогресс
                  </button>
                  {canSendBadgeRequest && (
                    <button
                      type="button"
                      onClick={() => void handleSendBadgeRequest()}
                      disabled={mechanicLocked || badgeRequestBusy}
                      style={{
                        marginTop: '10px',
                        marginLeft: '10px',
                        padding: '8px 16px',
                        background: 'rgba(255, 215, 0, 0.18)',
                        color: '#FFD700',
                        border: '1px solid rgba(255, 215, 0, 0.45)',
                        borderRadius: '20px',
                        cursor: badgeRequestBusy ? 'not-allowed' : 'pointer',
                        opacity: badgeRequestBusy ? 0.6 : 1,
                        fontWeight: 'bold'
                      }}
                    >
                      {badgeRequestBusy ? 'Отправка...' : 'Отправить на подтверждение вожатому'}
                    </button>
                  )}
                </div>
              )}
              {badgeRequestStatus && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.86 }}>{badgeRequestStatus}</div>
              )}

              {isCompleted && currentProgress?.reflection && (
                <div style={{ 
                  background: 'rgba(76, 175, 80, 0.1)', 
                  padding: '10px', 
                  borderRadius: '8px', 
                  fontSize: '14px',
                  fontStyle: 'italic',
                  marginTop: '10px'
                }}>
                  "{currentProgress.reflection}"
                </div>
              )}

              {isCompleted && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShareModalOpen(true);
                      if (!shareStory || !shareWide) {
                        void handleGenerateAchievementShareCards();
                      }
                    }}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(90deg, #8b00ff, #4dacff)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 800,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      boxShadow: '0 4px 15px rgba(139, 0, 255, 0.3)',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                  >
                    🚀 Поделиться успехом
                  </button>
                </div>
              )}
              </div>
            </FeatureGate>

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

      {shareModalOpen && (
        <div
          aria-hidden="true"
          onClick={() => setShareModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 8, 18, 0.72)',
            backdropFilter: 'blur(6px)',
            zIndex: 12000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="badge-level-share-dialog-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(920px, 100%)',
              maxHeight: '90vh',
              overflow: 'auto',
              background: 'rgba(18, 18, 32, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '18px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.45)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div id="badge-level-share-dialog-title" style={{ fontSize: '16px', fontWeight: 800 }}>Поделиться достижением</div>
                <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px', lineHeight: 1.4 }}>
                  Сделаем 2 PNG: сторис <b>9:16</b> и пост <b>16:9</b>. Ник скрыт по умолчанию.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={shareHideNickname}
                  onChange={(e) => setShareHideNickname(e.target.checked)}
                />
                Скрыть ник
              </label>

              <button
                type="button"
                onClick={() => void handleGenerateAchievementShareCards()}
                disabled={shareBusy}
                style={{
                  padding: '10px 14px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: shareBusy ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
                  color: 'white',
                  cursor: shareBusy ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                }}
              >
                {shareBusy ? 'Генерируем…' : shareStory && shareWide ? 'Обновить' : 'Сгенерировать'}
              </button>

              <button
                type="button"
                onClick={() => void handleCopyShareCaption()}
                disabled={shareBusy || (!shareStory && !shareWide)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  cursor: shareBusy || (!shareStory && !shareWide) ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Скопировать подпись
              </button>

              <button
                type="button"
                onClick={() => void handleCopyBadgeLink()}
                disabled={shareBusy}
                style={{
                  padding: '10px 12px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  cursor: shareBusy ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Ссылка на значок
              </button>
            </div>

            {shareStatus && (
              <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.85 }}>
                {shareStatus}
              </div>
            )}

            <div style={{ marginTop: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 260px', minWidth: '260px' }}>
                <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>Сторис 9:16</div>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '9 / 16',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    overflow: 'hidden',
                    background: 'rgba(0,0,0,0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {shareStoryUrl ? (
                    <img src={shareStoryUrl} alt="Story preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ padding: '14px', fontSize: '12px', opacity: 0.55, textAlign: 'center', lineHeight: 1.4 }}>
                      Нажми «Сгенерировать», чтобы увидеть предпросмотр.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <button
                    type="button"
                    disabled={!shareStory || shareBusy}
                    onClick={() => shareStory && void handleShareAchievementCard(shareStory)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.08)',
                      color: 'white',
                      cursor: !shareStory || shareBusy ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Поделиться / скачать
                  </button>
                </div>
              </div>

              <div style={{ flex: '1 1 260px', minWidth: '260px' }}>
                <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>Пост 16:9</div>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    overflow: 'hidden',
                    background: 'rgba(0,0,0,0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {shareWideUrl ? (
                    <img src={shareWideUrl} alt="Wide preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ padding: '14px', fontSize: '12px', opacity: 0.55, textAlign: 'center', lineHeight: 1.4 }}>
                      Нажми «Сгенерировать», чтобы увидеть предпросмотр.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <button
                    type="button"
                    disabled={!shareWide || shareBusy}
                    onClick={() => shareWide && void handleShareAchievementCard(shareWide)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.08)',
                      color: 'white',
                      cursor: !shareWide || shareBusy ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Поделиться / скачать
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfetti && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '5rem',
          animation: 'fade-out 3s forwards'
        }}>
          🎉 🌟 🚀
        </div>
      )}
    </div>
  );
};

export default BadgeLevelView;
