import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDataLoader } from '../hooks/useDataLoader';
import { useNavigation } from '../hooks/useNavigation';
import { useUserProgress } from '../hooks/useUserProgress';
import type { Badge, View } from '../types/guide';
import { cleanHtmlContent, markdownToHtml, processIntroductionHtml } from '../utils/markdown';
import { forceUnlock } from '../utils/scrollLock';

export type AppController = ReturnType<typeof useAppController>;

export function useAppController() {
  const {
    categories,
    badges,
    customBadges,
    communityBadges,
    communityPendingCount,
    communitySyncing,
    communityLikedIds,
    toggleCommunityLike,
    loading,
    loadCategoryIntroduction,
    ensureCategoryBadgesLoaded,
    ensureBadgeLoaded,
    addCustomBadge,
    restoreCustomBadges,
    removeCustomBadge,
    publishBadgeToCommunity,
    dynamicBroMissions,
    updateBroMissionsOnServer,
    categoryBadgeLoadState,
    categoryBadgeLoadError,
    masterIndex,
  } = useDataLoader();

  const { userData, completeTutorial, updateBadgeSkin, setCustomBadgeImage } = useUserProgress();

  const navigation = useNavigation({ categories });

  const {
    currentView,
    selectedCategory,
    selectedBadge,
    selectedLevel,
    selectedAdditionalMaterial,
    formData,
    setCurrentView,
    setSelectedCategory,
    setSelectedAdditionalMaterial,
    handleIntroClick,
    handleCategoryClick,
    handleBadgeClick,
    handleLevelClick,
    handleTelegramContact,
    handleFormInputChange,
    handleBackToAboutCamp,
    handleBackToCategories,
    handleBackToBadge,
    handleBackToIntro,
    handleLogoClick,
    handleBackToCategory,
    categoryBackTarget,
  } = navigation;

  const handleCategoryBack = useCallback(() => {
    if (categoryBackTarget === 'about-camp') {
      handleBackToAboutCamp();
      return;
    }
    handleBackToCategories();
  }, [categoryBackTarget, handleBackToAboutCamp, handleBackToCategories]);

  // ----------------------------
  // Scroll restoration
  // Forward navigation -> scroll top
  // Back navigation -> restore previous scroll position
  // ----------------------------
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const pendingScrollActionRef = useRef<'none' | 'top' | 'restore'>('none');

  const getViewKey = useCallback(() => {
    const catId = selectedCategory?.id || '';
    const badgeId = selectedBadge?.id || '';
    const levelId = selectedLevel || '';
    return `${currentView}|c:${catId}|b:${badgeId}|l:${levelId}`;
  }, [currentView, selectedBadge?.id, selectedCategory?.id, selectedLevel]);

  const saveScrollForCurrentView = useCallback(() => {
    if (typeof window === 'undefined') return;
    const key = getViewKey();
    scrollPositionsRef.current[key] = window.scrollY || 0;
  }, [getViewKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.history.scrollRestoration = 'manual';
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const action = pendingScrollActionRef.current;
    if (action === 'none') return;

    const key = getViewKey();
    const targetY = action === 'restore' ? (scrollPositionsRef.current[key] ?? 0) : 0;
    pendingScrollActionRef.current = 'none';

    // Defer until layout is ready
    requestAnimationFrame(() => {
      window.scrollTo({ top: targetY, behavior: 'auto' as ScrollBehavior });
    });
  }, [getViewKey]);

  // Safety: forcefully clear any leaked scroll locks on every view transition.
  // This prevents the common bug where body overflow:hidden persists after
  // overlays (ChatBot, HintOverlay, BroBonfire) unmount during navigation.
  useEffect(() => {
    forceUnlock();
  }, [currentView]);

  const wrapForward = useCallback(
    <T extends (...args: any[]) => any>(fn: T) => {
      return ((...args: Parameters<T>) => {
        saveScrollForCurrentView();
        pendingScrollActionRef.current = 'top';
        return fn(...args);
      }) as T;
    },
    [saveScrollForCurrentView]
  );

  const wrapBack = useCallback(
    <T extends (...args: any[]) => any>(fn: T) => {
      return ((...args: Parameters<T>) => {
        saveScrollForCurrentView();
        pendingScrollActionRef.current = 'restore';
        return fn(...args);
      }) as T;
    },
    [saveScrollForCurrentView]
  );

  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatOpenRequestedRef = useRef(false);
  const urlParamsProcessedRef = useRef(false);

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const handleOpenVk = useCallback(() => {
    window.open('https://vk.com/realcampspb', '_blank', 'noopener,noreferrer');
  }, []);

  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 769 : false
  );

  // Perf-lite mode (reduce heavy visual effects on weak devices, especially mobile).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    const detectPerfLite = () => {
      const navAny = navigator as any;
      const conn = navAny.connection || navAny.mozConnection || navAny.webkitConnection;
      const saveData = !!conn?.saveData;
      const deviceMemory =
        typeof navAny.deviceMemory === 'number' ? (navAny.deviceMemory as number) : undefined;
      const cores =
        typeof navAny.hardwareConcurrency === 'number'
          ? (navAny.hardwareConcurrency as number)
          : undefined;

      const isMobileLayout = window.matchMedia('(max-width: 768px)').matches;
      const isCoarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

      const isWeak =
        saveData ||
        (typeof deviceMemory === 'number' && deviceMemory <= 2) ||
        (typeof cores === 'number' && cores <= 4);

      return isWeak && (isMobileLayout || isCoarsePointer);
    };

    const apply = () => {
      try {
        const lite = detectPerfLite();
        if (lite) root.setAttribute('data-perf', 'lite');
        else root.removeAttribute('data-perf');
      } catch {
        // Never break the app due to a detection failure.
        root.removeAttribute('data-perf');
      }
    };

    apply();

    // Re-evaluate on viewport changes (orientation/resize).
    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('orientationchange', apply, { passive: true } as any);

    return () => {
      window.removeEventListener('resize', apply as any);
      window.removeEventListener('orientationchange', apply as any);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 769px)');
    const handleResize = () => {
      setIsDesktopViewport(mediaQuery.matches);
    };
    handleResize();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleResize);
      return () => mediaQuery.removeEventListener('change', handleResize);
    }
    mediaQuery.addListener(handleResize);
    return () => mediaQuery.removeListener(handleResize);
  }, []);

  // URL deep-links handling
  useEffect(() => {
    if (loading) return;
    if (urlParamsProcessedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const joinSquadId = (params.get('join_squad') || '').trim();
    const view = params.get('view');
    const categoryId = params.get('categoryId');
    const badgeId = params.get('badgeId');

    if (joinSquadId) {
      setCurrentView('profile');
      urlParamsProcessedRef.current = true;
      return;
    }

    if (view === 'category' && categoryId) {
      const category = categories.find((c) => c.id === categoryId);
      if (category) {
        handleCategoryClick(category);
        void ensureCategoryBadgesLoaded(category.id);
        urlParamsProcessedRef.current = true;
      }
    } else if (view === 'about-camp') {
      setCurrentView('about-camp');
      urlParamsProcessedRef.current = true;
    } else if (view === 'categories') {
      setCurrentView('categories');
      urlParamsProcessedRef.current = true;
    } else if (view === 'badge' && badgeId) {
      const openFromLoaded = (candidate: Badge | undefined) => {
        if (!candidate) return false;
        handleBadgeClick(candidate);
        urlParamsProcessedRef.current = true;
        return true;
      };

      const already = badges.find((b) => b.id === badgeId);
      if (openFromLoaded(already)) return;

      void (async () => {
        const entries = await ensureBadgeLoaded(badgeId);
        const exact = entries?.find((b) => b.id === badgeId);
        const fallback = exact || entries?.[0];
        if (!openFromLoaded(fallback)) {
          urlParamsProcessedRef.current = true;
        }
      })();
    } else if (view) {
      urlParamsProcessedRef.current = true;
    }
  }, [
    loading,
    categories,
    badges,
    handleCategoryClick,
    handleBadgeClick,
    setCurrentView,
    ensureCategoryBadgesLoaded,
    ensureBadgeLoaded,
  ]);

  // When entering a category screen, ensure badges are loaded for that category.
  useEffect(() => {
    if (loading) return;
    if (currentView !== 'category') return;
    if (!selectedCategory) return;
    void ensureCategoryBadgesLoaded(selectedCategory.id);
  }, [loading, currentView, selectedCategory, ensureCategoryBadgesLoaded]);

  // Open chat by URL parameter after data is loaded.
  useEffect(() => {
    if (loading) return;

    const params = new URLSearchParams(window.location.search);
    const chat = params.get('chat');
    if (chat !== 'true') return;

    if (isChatOpen) {
      chatOpenRequestedRef.current = true;
      return;
    }

    if (chatOpenRequestedRef.current) return;

    let didCancel = false;
    let timer: number | undefined;

    const openChat = async () => {
      if (didCancel) return;
      timer = window.setTimeout(() => {
        if (didCancel) return;
        chatOpenRequestedRef.current = true;
        setIsChatOpen(true);
      }, 800);
    };

    void openChat();

    return () => {
      didCancel = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [loading, isChatOpen]);

  const sortedCategories = useMemo(
    () => categories.slice().sort((a, b) => Number(a.id) - Number(b.id)),
    [categories]
  );

  const categoryBadges = useMemo(() => {
    if (!selectedCategory) return [];
    const grouped: Record<string, Badge[]> = {};
    badges.forEach((b) => {
      if (b.category_id !== selectedCategory.id) return;
      const parts = (b.id || '').split('.');
      const baseKey = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : b.id || '';
      if (!grouped[baseKey]) grouped[baseKey] = [];
      grouped[baseKey].push(b);
    });

    const result = Object.values(grouped).map((list) => {
      const base =
        list.find((x) => {
          const levelLower = (x.level || '').toLowerCase();
          const isBase = levelLower.includes('баз');
          const isSingle = levelLower.includes('одноуровнев');
          return isBase || isSingle;
        }) || list[0];

      (base as any).allLevels =
        list.length > 1 ? list.slice().sort((a, b) => (a.id || '').localeCompare(b.id || '')) : [];
      return base;
    });

    if (selectedCategory.id === '1') {
      result.sort((a, b) => {
        const aId = a.id.split('.')[1] || '';
        const bId = b.id.split('.')[1] || '';
        const aNum = parseInt(aId, 10);
        const bNum = parseInt(bId, 10);

        if (aNum === 15 && bNum !== 15) return 1;
        if (bNum === 15 && aNum !== 15) return -1;

        if (aNum !== bNum) return aNum - bNum;
        return (a.id || '').localeCompare(b.id || '');
      });
    } else {
      result.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    }

    return result;
  }, [badges, selectedCategory]);

  const currentLevelBadgeTitle = useMemo(() => {
    if (currentView !== 'badge-level' || !selectedBadge || !selectedLevel) return undefined;
    const idSegments = (selectedBadge.id || '').split('.');
    const isMultiLevel = idSegments.length === 3;
    const baseKey = isMultiLevel ? idSegments.slice(0, 2).join('.') + '.' : selectedBadge.id;
    const lb = badges.find((b) => {
      if (b.category_id !== selectedBadge.category_id) return false;
      if (isMultiLevel) {
        return (b.id || '').startsWith(baseKey) && String(b.level) === String(selectedLevel);
      }
      return b.id === selectedBadge.id && String(b.level) === String(selectedLevel);
    });
    return lb?.title;
  }, [badges, currentView, selectedBadge, selectedLevel]);

  const handleIntroductionClick = useCallback(async () => {
    try {
      if (selectedCategory) {
        const introduction = await loadCategoryIntroduction(selectedCategory.id);
        if (introduction) {
          setSelectedCategory((prev) =>
            prev && prev.id === selectedCategory.id
              ? {
                  ...prev,
                  introduction: {
                    has_introduction: true,
                    html: introduction.html,
                    markdown: introduction.markdown,
                  },
                }
              : prev
          );
        }
      }
    } finally {
      // forward navigation
      pendingScrollActionRef.current = 'top';
      setCurrentView('introduction');
    }
  }, [loadCategoryIntroduction, selectedCategory, setCurrentView, setSelectedCategory]);

  const handleFormSubmit = useCallback(() => {
    const message = `🎪 Заявка на осеннюю смену "Осенний 4К-вайб в Реальном Лагере"\n\n👶 Имя ребёнка: ${
      formData.childName
    }\n👨‍👩‍👧‍👦 Имя родителя: ${formData.parentName}\n📞 Телефон: ${formData.phone}\n📧 Email: ${
      formData.email
    }\n🎂 Возраст ребёнка: ${formData.childAge}\n💭 Особые пожелания: ${
      formData.specialRequests
    }\n\nГотовы записаться на смену! 🚀`;

    const telegramUrl = `https://t.me/Stivanovv?text=${encodeURIComponent(message)}`;
    window.open(telegramUrl, '_blank');
  }, [formData]);

  const handleAdditionalMaterialClick = useCallback(
    async (type: 'checklists' | 'methodology', key: string) => {
      if (!selectedCategory) return;
      try {
        const alias = (k: string) => {
          const map: Record<string, string> = {
            'inspector-codex.md': 'inspector-methodology.md',
            'i-messages-guide.md': 'inspector-methodology.md',
            'friendship-rules.md': 'inspector-methodology.md',
            'friendship-guide.md': 'inspector-methodology.md',
          };
          return map[k] || k;
        };
        const normalizedKey = alias(key);

        const baseUrl = import.meta.env.BASE_URL || '/';
        const prefix = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        const aiDataRoot = `${prefix}ai-data`;

        const primaryPath = `${aiDataRoot}/category-${selectedCategory.id}/${type}/${normalizedKey}`;
        let response = await fetch(primaryPath);

        if (!response.ok) {
          const fallbackPath = `${aiDataRoot}/category-14/${type}/${normalizedKey}`;
          response = await fetch(fallbackPath);
          if (!response.ok) {
            return;
          }
        }

        if (!response.ok) return;

        const markdownContent = await response.text();
        const htmlContent = markdownToHtml(markdownContent);

        const titleMap: Record<string, string> = {
          'general-checklist.md': '📋 Общий чек-лист',
          'challenges-checklist.md': '🎯 Чек-лист с челленджами',
          'active-checklist.md': '🚀 Активная версия чек-листа',
          'inspector-methodology.md': '📚 Методика Инспектора Пользы',
          'inspector-codex.md': '📜 Кодекс Инспектора Реального Лагеря',
          'friendship-guide.md': '🤝 Памятка как получить значки Инспектора Дружбы',
          'i-messages-guide.md': '💬 Памятка Я сообщений для Инспектора Дружбы',
          'friendship-rules.md': '📋 Список правил Инспектора Дружбы',
        };

        setSelectedAdditionalMaterial({
          type,
          key,
          title: titleMap[key] || key.replace('.md', '').replace(/-/g, ' '),
          content: htmlContent,
        });
        // forward navigation
        pendingScrollActionRef.current = 'top';
        setCurrentView('additional-material');
      } catch {
        // ignore
      }
    },
    [selectedCategory, setCurrentView, setSelectedAdditionalMaterial]
  );

  // window hooks for HTML content links
  useEffect(() => {
    (window as any).handleMaterialClick = (type: string, filename: string) => {
      void handleAdditionalMaterialClick(type as 'checklists' | 'methodology', filename);
    };

    (window as any).openProfile = () => {
      try {
        pendingScrollActionRef.current = 'top';
      } catch {
        // ignore
      }
      setCurrentView('profile');
    };

    (window as any).openProfilePanel = (panelId: string) => {
      try {
        (window as any).__OPEN_PROFILE_PANEL__ = panelId;
        pendingScrollActionRef.current = 'top';
      } catch {
        // ignore
      }
      setCurrentView('profile');
    };

    (window as any).openBadgeById = (
      rawId: string,
      options?: { origin?: View; action?: 'plan' | 'confirm' }
    ) => {
      try {
        const parts = (rawId || '').split('.');
        const baseKey = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : rawId;
        const group = badges.filter(
          (b) => (b.id || '').startsWith(baseKey + '.') || b.id === baseKey
        );
        if (!group.length) return;
        const base =
          group.find((b) =>
            String(b.level || '')
              .toLowerCase()
              .includes('базов')
          ) || group[0];
        const cat = categories.find((c) => c.id === base.category_id);
        if (cat) {
          setSelectedCategory(cat);
          setCurrentView('category');
        }
        handleBadgeClick(base, options?.origin ? { origin: options.origin } : undefined);
      } catch {
        // ignore
      }
    };
  }, [
    badges,
    categories,
    handleAdditionalMaterialClick,
    handleBadgeClick,
    setCurrentView,
    setSelectedCategory,
  ]);

  const introductionHtml = useMemo(() => {
    if (!selectedCategory?.introduction?.has_introduction) return null;
    const processedHtml = processIntroductionHtml(selectedCategory.introduction.html);
    return cleanHtmlContent(processedHtml);
  }, [selectedCategory]);

  const additionalMaterialHtml = useMemo(() => {
    if (!selectedAdditionalMaterial) return null;
    return cleanHtmlContent(selectedAdditionalMaterial.content);
  }, [selectedAdditionalMaterial]);

  return {
    // data
    categories,
    badges,
    customBadges,
    communityBadges,
    communityPendingCount,
    communitySyncing,
    communityLikedIds,
    toggleCommunityLike,
    loading,
    categoryBadgeLoadState,
    categoryBadgeLoadError,
    masterIndex,
    ensureCategoryBadgesLoaded,
    ensureBadgeLoaded,
    addCustomBadge,
    restoreCustomBadges,
    removeCustomBadge,
    publishBadgeToCommunity,
    dynamicBroMissions,
    updateBroMissionsOnServer,

    // progress
    userData,
    completeTutorial,
    updateBadgeSkin,
    setCustomBadgeImage,

    // navigation (wrapped with scroll behavior)
    ...navigation,
    setCurrentView: wrapForward(navigation.setCurrentView),
    handleCategoryBack: wrapBack(handleCategoryBack),

    // ui state
    isChatOpen,
    toggleChat,
    closeChat,
    isDesktopViewport,
    handleOpenVk,

    // derived
    sortedCategories,
    categoryBadges,
    currentLevelBadgeTitle,
    introductionHtml,
    additionalMaterialHtml,

    // actions
    handleIntroductionClick,
    handleFormSubmit,
    handleAdditionalMaterialClick,
    handleTelegramContact: wrapForward(handleTelegramContact),
    handleFormInputChange,
    handleBackToAboutCamp: wrapBack(handleBackToAboutCamp),
    handleBackToCategories: wrapBack(handleBackToCategories),
    handleBackToBadge: wrapBack(handleBackToBadge),
    handleBackToIntro: wrapBack(handleBackToIntro),
    handleLogoClick: wrapForward(handleLogoClick),
    handleBackToCategory: wrapBack(handleBackToCategory),
    handleLevelClick: wrapForward(handleLevelClick),
    handleBadgeClick: wrapForward(handleBadgeClick),
    handleCategoryClick: wrapForward(handleCategoryClick),
    handleIntroClick: wrapForward(handleIntroClick),
  };
}
