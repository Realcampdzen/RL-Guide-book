import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import BadgeIcon from '../components/BadgeIcon';
import BadgeSkinPanel from '../components/BadgeSkinPanel';
import { FeatureGate } from '../components/FeatureGate';
import { Skeleton } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useUserProgress } from '../hooks/useUserProgress';
import { canRequestBadgeApproval } from '../types/authRole';
import { getRank } from '../types/userProgress';
import { fetchAiSlogan, fetchVibeCheck } from '../utils/aiService';
import { createBadgeRequest } from '../utils/badgeApprovalApi';
import { getBadgeImagePath, hasBadgeImage } from '../utils/badgeImages';
import { toSiblingImageUrl } from '../utils/imageSources';
import {
  copyTextToClipboard,
  generateSocialCard,
  getBadgeShareUrl,
  type SocialCardResult,
  shareOrDownloadSocialCard,
} from '../utils/socialGenerator';
import {
  extractEvidenceSection,
  fixCriteriaFormatting,
  fixDescriptionFormatting,
  shouldApplyFormatting,
  stripDuplicateHeading,
} from '../utils/textFormatting';
import '../styles/badge-view.css';
import '../styles/badge-completion.css';
import '../styles/badge-share-modal.css';
import { ArtGallerySection } from '../components/ArtGallerySection';
import type { Badge, Category } from '../types/guide';

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
  onChatClose: _onChatClose,


}) => {
  const { initReveal } = useScrollReveal();
  const {
    getLevelProgress,
    getBadgeProgress,
    updateLevelStatus,
    toggleFavorite,
    startRoute,
    removeRoute,
    userData,
    addFlagBadgeRequest,
  } = useUserProgress();
  const { role, accessToken, deviceId } = useAuth();
  const { myTeam } = useTeam();

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

  const broLocked = category.id === '9' && !userData?.broProgress?.isBro;
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
  const broGateReason =
    'Прогресс по Бро‑значкам доступен после подтверждения Бросвящения у вожатого.';
  const teamGateReason =
    'Прогресс по значкам Движка доступен после создания или вступления в Движок в ЛК.';
  const mechanicGateReason = broLocked ? broGateReason : teamLocked ? teamGateReason : '';
  const mechanicGateCtaLabel = broLocked
    ? 'Запросить подтверждение'
    : teamLocked
      ? 'Открыть ЛК → Движки'
      : '';

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

  const mechanicGateOnCta = broLocked
    ? requestBroConfirmation
    : teamLocked
      ? openTeamDashboard
      : undefined;

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

  const handleChatToggle = () => {
    onChatToggle();
  };

  // Context Logic
  const { levelBadge, otherLevels, levelsAll, currentLevelIndex } = useMemo(() => {
    const badgeList = Array.isArray(badges) ? badges : [];
    const badgeId = String(badge.id || '');
    const segments = badgeId.split('.').filter(Boolean);
    const baseTwo = segments.length >= 2 ? `${segments[0]}.${segments[1]}` : badgeId;

    const sameBaseTwo = (a: string, base: string): boolean => {
      const as = String(a || '')
        .split('.')
        .filter(Boolean);
      if (as.length < 2) return false;
      return `${as[0]}.${as[1]}` === base;
    };

    const tiered = badgeList
      .filter((b) => b.category_id === badge.category_id)
      .filter((b) => sameBaseTwo(String(b.id || ''), baseTwo))
      .filter(
        (b) =>
          String(b.id || '')
            .split('.')
            .filter(Boolean).length === 3
      );

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

    const normalizeLevelValue = (value: unknown) =>
      String(value ?? '')
        .trim()
        .toLowerCase();
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
    return (
      levelLabel.includes('продвинут') ||
      levelLabel.includes('эксперт') ||
      levelLabel.includes('вожат')
    );
  }, [levelLabel]);

  const favoritesSet = useMemo(() => new Set(userData.favorites || []), [userData.favorites]);
  const favoriteTargetId = useMemo(() => String(levelBadge?.id || '').trim(), [levelBadge?.id]);
  const isFavorite = Boolean(favoriteTargetId && favoritesSet.has(favoriteTargetId));

  // Initialize form state
  const currentProgress = getLevelProgress(levelBadge.id);
  const isCompleted = currentProgress?.status === 'achieved';
  const levelBaseBadgeId = useMemo(
    () =>
      String(badge.id || '')
        .split('.')
        .slice(0, 2)
        .join('.'),
    [badge.id]
  );
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
      const isSameSection =
        planBadgeId === levelBaseBadgeId || planBadgeId.startsWith(sectionPrefix);
      if (!isSameSection) return false;
      return plan.status === 'approved';
    });
  }, [userData.badgePlans, levelBaseBadgeId]);
  const canResetRouteFromInProgress =
    hasProgress && !isBadgeComplete && badgeProgress.achieved === 0 && !hasApprovedPlanForRoute;
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
  const canUseSkinPanel =
    role === 'developer' || !previousLevel || previousLevelProgress?.status === 'achieved';
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

  const handleGenerateAchievementShareCards = async (opts?: {
    createdAt?: string;
    reflection?: string;
    levelsAchieved?: number;
  }) => {
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

      const vibeRaw = await fetchVibeCheck({
        variant: 'badge',
        badgeTitle: badge.title,
        categoryTitle: category.title,
        description: badge.description || badge.criteria,
      });
      const vibeCheck = vibeRaw
        ? {
            memeHeader: vibeRaw.meme_header,
            memeText: vibeRaw.meme_text,
            statBuff: vibeRaw.stat_buff,
          }
        : undefined;

      const createdAt = opts?.createdAt || new Date().toISOString();
      const reflectionText = String(opts?.reflection ?? reflection ?? '').trim();
      const baseId = String(levelBadge?.id || badge.id || '')
        .split('.')
        .slice(0, 2)
        .join('.');
      const achievedCount = Number(
        opts?.levelsAchieved ?? userData.profile.stats.totalLevelsAchieved
      );
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
      setShareStatus(
        copied ? 'PNG скачан, подпись скопирована.' : 'PNG скачан. Подпись можно скопировать ниже.'
      );
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
    const baseId =
      String(badge?.id || '')
        .split('.')
        .slice(0, 2)
        .join('.') || badge?.id;
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
        nickname: userData.profile.nickname,
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
      const vibeRaw = await fetchVibeCheck({
        variant: 'badge',
        badgeTitle: badge.title,
        categoryTitle: category.title,
        description: badge.description || badge.criteria,
      });
      const vibeCheck = vibeRaw
        ? {
            memeHeader: vibeRaw.meme_header,
            memeText: vibeRaw.meme_text,
            statBuff: vibeRaw.stat_buff,
          }
        : undefined;

      const createdAt = new Date().toISOString();
      const baseId = String(levelBadge?.id || badge.id || '')
        .split('.')
        .slice(0, 2)
        .join('.');

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
      setFavoriteShareStatus(
        copied
          ? 'PNG скачан, подпись скопирована.'
          : 'PNG скачан. Подпись можно скопировать в профиле.'
      );
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
      evidenceText = typeof conf === 'string' ? conf : Array.isArray(conf) ? conf.join('\n') : null;
    }

    if (levelBadge.criteria) {
      const crit: string | string[] = levelBadge.criteria as string | string[];
      const raw =
        typeof crit === 'string'
          ? crit.replace(/^Как получить значок «[^»]+»: \s*/, '')
          : Array.isArray(crit)
            ? crit.join('\n')
            : '';

      const shouldFormat = shouldApplyFormatting(levelBadge.id);
      const processedRaw = shouldFormat ? fixCriteriaFormatting(raw) : raw;

      criteria = processedRaw
        .split('\u2705')
        .filter((c: string) => c.trim())
        .map((c: string) => c.trim());
      // If criteria came as bullet-list (e.g. from array in JSON), split by newlines
      if (
        criteria.length === 1 &&
        (criteria[0].includes('\n') || criteria[0].includes('•') || criteria[0].includes('\u2022'))
      ) {
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
        'Демонстрировать постоянное развитие и улучшение.',
      ];
    }

    const shouldFormatDesc = shouldApplyFormatting(levelBadge.id);
    const processedDesc = shouldFormatDesc
      ? fixDescriptionFormatting(descriptionText)
      : descriptionText;
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
    return (
      <div className={className} style={{ fontSize: size === 'xlarge' ? '5rem' : '4rem' }}>
        {b.emoji || '🏆'}
      </div>
    );
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
            <h3 id="route-reset-title" className="route-confirm-modal__title">
              Сбросить маршрут?
            </h3>
            <p className="route-confirm-modal__text">Если продолжить, маршрут будет сброшен.</p>
            <div className="route-confirm-modal__actions">
              <button
                type="button"
                className="route-confirm-btn"
                onClick={() => setRouteResetConfirmOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="route-confirm-btn route-confirm-btn--danger"
                onClick={handleConfirmRouteReset}
              >
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
      <header
        className={`mobile-glass-header${isChatOpen ? ' is-chat-open' : ''}`}
        aria-label="Навигация"
      >
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
            className={`mobile-header-avatar${isChatOpen ? ' is-active' : ''}`}
            onClick={handleChatToggle}
            aria-label={isChatOpen ? 'Закрыть чат' : 'Открыть чат'}
            aria-pressed={isChatOpen}
          >
            <picture>
              <source type="image/webp" srcSet={`${import.meta.env.BASE_URL}Валюша.webp`} />
              <img
                src={`${import.meta.env.BASE_URL}Валюша.jpg`}
                alt="НейроВалюша"
                decoding="async"
                fetchPriority="high"
              />
            </picture>
          </button>
        </div>
      </header>


      <div className="sticky-back-nav">
        <button onClick={onBack} className="nav-link-back hover-target">
          ← Назад к значку
        </button>
      </div>

      <main className="badge-main">
        {/* Header */}
        <section className="badge-hero reveal-on-scroll">
          <div className="badge-hero-icon">{renderIcon(levelBadge, 'xlarge', 'hero-emoji')}</div>
          <div className="badge-hero-content">
            <h1>{levelBadge.title}</h1>
            <div className="badge-hero-category">{level}</div>
            {isAdvancedOrExpert && favoriteTargetId && (
              <FeatureGate
                allowed={!mechanicLocked}
                reason={mechanicGateReason}
                ctaLabel={mechanicGateCtaLabel}
                onCta={mechanicGateOnCta}
              >
                <div className="badge-hero-actions">
                  <button
                    type="button"
                    className={`badge-favorite-btn${isFavorite ? ' is-active' : ''}`}
                    onClick={handleToggleFavorite}
                    aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                    aria-pressed={isFavorite}
                  >
                    <span className="badge-favorite-icon">{isFavorite ? '★' : '☆'}</span>
                    <span className="badge-favorite-label">
                      {isFavorite ? 'В избранном' : 'В избранное'}
                    </span>
                  </button>
                </div>
              </FeatureGate>
            )}

            {startLevelId &&
              (mechanicLocked ? (
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
              ))}

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

        {/* Other Levels (Moved Higher) */}
        {otherLevels.length > 0 && (
          <div className="levels-dock reveal-on-scroll" style={{ marginBottom: '2rem' }}>
            {otherLevels.map((lvl) => (
              <div
                key={lvl.id}
                className="level-bubble hover-target"
                onClick={() => onChangeLevel(String(lvl.level))}
              >
                <div className="level-bubble-icon">{renderIcon(lvl, 'xlarge', '')}</div>
                <div className="level-bubble-title">{lvl.title}</div>
                <div className="level-bubble-subtitle">{String(lvl.level)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Content Grid */}
        <div className="badge-content-grid">
          {/* Left Column */}
          <div className="badge-left-col reveal-on-scroll">
            <div className="content-block">
              <h3>Общая информация</h3>
              <p
                className="content-text"
                dangerouslySetInnerHTML={{ __html: mainDescription.replace(/\n/g, '<br/>') }}
              />

              {levelBadge.nameExplanation && (
                <>
                  <h4>Объяснение названия и ценности</h4>
                  <p className="content-text">
                    {stripDuplicateHeading(
                      levelBadge.nameExplanation,
                      'Объяснение названия и ценности'
                    )}
                  </p>
                </>
              )}

              {levelBadge.skillTips && (
                <>
                  <h4>Как прокачать навык</h4>
                  <p
                    className="content-text"
                    dangerouslySetInnerHTML={{
                      __html: stripDuplicateHeading(
                        levelBadge.skillTips,
                        'Как прокачать навык'
                      ).replace(/\n/g, '<br>'),
                    }}
                  ></p>
                </>
              )}

              {levelBadge.examples && (
                <>
                  <h4>Примеры</h4>
                  <p
                    className="content-text"
                    dangerouslySetInnerHTML={{ __html: levelBadge.examples.replace(/\n/g, '<br>') }}
                  ></p>
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
                  <p
                    className="content-text"
                    dangerouslySetInnerHTML={{ __html: howToBecomeText.replace(/\n/g, '<br>') }}
                  ></p>
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
            <FeatureGate
              allowed={!mechanicLocked}
              reason={mechanicGateReason}
              ctaLabel={mechanicGateCtaLabel}
              onCta={mechanicGateOnCta}
            >
              <div
                className={`content-block badge-completion${isCompleted ? ' is-achieved' : ''}`}
              >
                <div className="badge-completion__header">
                  <label className="badge-completion__label">
                    <input
                      type="checkbox"
                      className="badge-completion__checkbox"
                      checked={isCompleted}
                      onChange={handleToggleComplete}
                      disabled={mechanicLocked}
                    />
                    {isCompleted ? 'Уровень выполнен! 🎉' : 'Отметить выполнение'}
                  </label>
                </div>

                {!isCompleted && (
                  <div className="badge-completion__form">
                    <label className="badge-completion__form-label">
                      Рефлексия (обязательно): Что я сделал(а) и чему научился(ась)?
                    </label>
                    <textarea
                      className="badge-completion__textarea"
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      disabled={mechanicLocked}
                      placeholder="Кратко опиши свой опыт..."
                    />
                    <div className="badge-completion__actions">
                      <button
                        type="button"
                        className={`badge-completion__btn badge-completion__btn--save`}
                        onClick={handleToggleComplete}
                        disabled={mechanicLocked || reflection.length < 5}
                      >
                        Сохранить прогресс
                      </button>
                      {canSendBadgeRequest && (
                        <button
                          type="button"
                          className="badge-completion__btn badge-completion__btn--request"
                          onClick={() => void handleSendBadgeRequest()}
                          disabled={mechanicLocked || badgeRequestBusy}
                        >
                          {badgeRequestBusy ? 'Отправка...' : 'Отправить на подтверждение вожатому'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {badgeRequestStatus && (
                  <div className="badge-completion__status">
                    {badgeRequestStatus}
                  </div>
                )}

                {isCompleted && currentProgress?.reflection && (
                  <div className="badge-completion__reflection">
                    "{currentProgress.reflection}"
                  </div>
                )}

                {isCompleted && (
                  <div className="badge-completion__share-row">
                    <button
                      type="button"
                      className="badge-completion__share-btn"
                      onClick={() => {
                        setShareModalOpen(true);
                        if (!shareStory || !shareWide) {
                          void handleGenerateAchievementShareCards();
                        }
                      }}
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
                    return (
                      <li
                        key={index}
                        dangerouslySetInnerHTML={{ __html: criterion.replace(/\n/g, '<br>') }}
                      />
                    );
                  })}
                </ul>
              ) : (
                <p className="content-text">Критерии пока не определены.</p>
              )}

              {levelEvidenceText && (
                <>
                  <h4>Чем подтверждается</h4>
                  <p
                    className="content-text"
                    style={{ color: 'var(--c-volt)', fontStyle: 'italic' }}
                  >
                    {levelEvidenceText}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Community Arts Gallery */}
        <ArtGallerySection badgeId={badge.id} />
      </main>

      {shareModalOpen && (
        <div
          className="badge-share-overlay"
          aria-hidden="true"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="badge-share-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="badge-level-share-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="badge-share-dialog__header">
              <div>
                <div
                  id="badge-level-share-dialog-title"
                  className="badge-share-dialog__title"
                >
                  Поделиться достижением
                </div>
                <div className="badge-share-dialog__subtitle">
                  Сделаем 2 PNG: сторис <b>9:16</b> и пост <b>16:9</b>. Ник скрыт по умолчанию.
                </div>
              </div>
              <button
                type="button"
                className="badge-share-dialog__close"
                onClick={() => setShareModalOpen(false)}
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className="badge-share-controls">
              <label className="badge-share-controls__checkbox-label">
                <input
                  type="checkbox"
                  checked={shareHideNickname}
                  onChange={(e) => setShareHideNickname(e.target.checked)}
                />
                Скрыть ник
              </label>

              <button
                type="button"
                className={`badge-share-btn${shareBusy ? ' badge-share-btn--busy' : ''}`}
                onClick={() => void handleGenerateAchievementShareCards()}
                disabled={shareBusy}
              >
                {shareBusy ? 'Генерируем…' : shareStory && shareWide ? 'Обновить' : 'Сгенерировать'}
              </button>

              <button
                type="button"
                className="badge-share-btn badge-share-btn--secondary"
                onClick={() => void handleCopyShareCaption()}
                disabled={shareBusy || (!shareStory && !shareWide)}
              >
                Скопировать подпись
              </button>

              <button
                type="button"
                className="badge-share-btn badge-share-btn--secondary"
                onClick={() => void handleCopyBadgeLink()}
                disabled={shareBusy}
              >
                Ссылка на значок
              </button>
            </div>

            {shareStatus && (
              <div className="badge-share-status">
                {shareStatus}
              </div>
            )}

            <div className="badge-share-previews">
              <div className="badge-share-preview">
                <div className="badge-share-preview__label">
                  Сторис 9:16
                </div>
                <div className="badge-share-preview__frame badge-share-preview__frame--story">
                  {shareStoryUrl ? (
                    <img
                      src={shareStoryUrl}
                      alt="Story preview"
                      className="badge-share-preview__image"
                    />
                  ) : (
                    <div className="badge-share-preview__placeholder">
                      Нажми «Сгенерировать», чтобы увидеть предпросмотр.
                    </div>
                  )}
                </div>
                <div className="badge-share-preview__actions">
                  <button
                    type="button"
                    className="badge-share-preview__download"
                    disabled={!shareStory || shareBusy}
                    onClick={() => shareStory && void handleShareAchievementCard(shareStory)}
                  >
                    Поделиться / скачать
                  </button>
                </div>
              </div>

              <div className="badge-share-preview">
                <div className="badge-share-preview__label">Пост 16:9</div>
                <div className="badge-share-preview__frame badge-share-preview__frame--wide">
                  {shareWideUrl ? (
                    <img
                      src={shareWideUrl}
                      alt="Wide preview"
                      className="badge-share-preview__image"
                    />
                  ) : (
                    <div className="badge-share-preview__placeholder">
                      Нажми «Сгенерировать», чтобы увидеть предпросмотр.
                    </div>
                  )}
                </div>
                <div className="badge-share-preview__actions">
                  <button
                    type="button"
                    className="badge-share-preview__download"
                    disabled={!shareWide || shareBusy}
                    onClick={() => shareWide && void handleShareAchievementCard(shareWide)}
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
        <div className="badge-confetti-overlay" aria-hidden="true">
          🎉 🌟 🚀
        </div>
      )}
    </div>
  );
};

export default BadgeLevelView;
