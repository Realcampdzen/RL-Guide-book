import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppStyles from './components/AppStyles';
import BluenestGlobalStyles from './components/BluenestGlobalStyles';
import { useDataLoader } from './hooks/useDataLoader';
import { useNavigation } from './hooks/useNavigation';
import BlueNestLanding from './components/BlueNestLanding';
import CategoriesGrid from './components/CategoriesGrid';
import { 
  pluralizeRu, 
  fixDescriptionFormatting, 
  fixCriteriaFormatting, 
  extractEvidenceSection,
  shouldApplyFormatting
} from './utils/textFormatting';
import { cleanHtmlContent, markdownToHtml } from './utils/markdown';
import type { Badge } from './types/guide';

// Split-safe badge id helpers
const splitId = (id: string | undefined | null): string[] => String(id ?? '').split('.');
const sameBaseTwoSegments = (a: string, b: string): boolean => {
  const as = splitId(a);
  const bs = splitId(b);
  return as.length >= 2 && bs.length >= 2 && as[0] === bs[0] && as[1] === bs[1];
};

// Function to get category icon (emoji or image)
const getCategoryIcon = (categoryId: string): string | JSX.Element => {
  switch (categoryId) {
    case '1': // Категория 1
      return <img 
        className="category-1-icon"
        src="/RL-Guide-book/category_1.png" 
        alt="Категория 1" 
      />;
    case '2': // Категория 2
      return <img 
        className="category-2-icon"
        src="/RL-Guide-book/category_2.png" 
        alt="Категория 2" 
      />;
    case '3': // Категория 3
      return <img 
        className="category-3-icon"
        src="/RL-Guide-book/category_3.png" 
        alt="Категория 3" 
      />;
    case '4': // Категория 4
      return <img 
        className="category-4-icon"
        src="/RL-Guide-book/category_4.png" 
        alt="Категория 4" 
      />;
    case '5': // Категория 5
      return <img 
        className="category-5-icon"
        src="/RL-Guide-book/category_5.png" 
        alt="Категория 5" 
      />;
    case '6': // Категория 6
      return <img 
        className="category-6-icon"
        src="/RL-Guide-book/category_6.png" 
        alt="Категория 6" 
      />;
    case '7': // Категория 7
      return <img 
        className="category-7-icon"
        src="/RL-Guide-book/category_7.png" 
        alt="Категория 7" 
      />;
    case '8': // Категория 8
      return <img 
        className="category-8-icon"
        src="/RL-Guide-book/category_8.png" 
        alt="Категория 8" 
      />;
    case '9': // Категория 9
      return <img 
        className="category-9-icon"
        src="/RL-Guide-book/category_9.png" 
        alt="Категория 9" 
      />;
    case '10': // Категория 10
      return <img 
        className="category-10-icon"
        src="/RL-Guide-book/category_10.png" 
        alt="Категория 10" 
      />;
    case '11': // Категория 11
      return <img 
        className="category-11-icon"
        src="/RL-Guide-book/category_11.png" 
        alt="Категория 11" 
      />;
    case '12': // ИИ
      return <img 
        className="category-12-icon"
        src="/RL-Guide-book/pictures/stanpol__vector_logo_symbol_of_AI_and_creativity_for_children_a_a7e3ac1a-6ecd-48ee-a84b-11cca3a6047f.png" 
        alt="ИИ" 
      />;
    case '13': // Категория 13
      return <img 
        className="category-13-icon"
        src="/RL-Guide-book/category_13.png" 
        alt="Категория 13" 
      />;
    case '14': // Категория 14
      return <img 
        className="category-14-icon"
        src="/RL-Guide-book/category_14.png" 
        alt="Категория 14" 
      />;
    default:
      return '🏆';
  }
};

// Feature toggles
const SHOW_RELATED = false; // Показывать ли блок "Похожие значки"

// Layout configuration overrides for specific badge groups
const layoutOverrides = {
  '1.1': {
    tallOn: ['1.1.1', '1.1.2', '1.1.3'],
    textMaxEm: 32
  },
  '1.2': {
    tallOn: ['1.2.1', '1.2.2', '1.2.3'],
    textMaxEm: 32
  },
  '1.3': {
    tallOn: ['1.3.1', '1.3.2', '1.3.3'],
    textMaxEm: 32
  },
  '1.4': {
    tallOn: ['1.4.1', '1.4.2'],
    textMaxEm: 32
  },
  '1.5': {
    tallOn: ['1.5.1', '1.5.2', '1.5.3'],
    textMaxEm: 32
  },
  '2.1': {
    tallOn: ['2.1.1', '2.1.2'],
    textMaxEm: 32
  },
  '2.2': {
    tallOn: ['2.2.1', '2.2.2'],
    textMaxEm: 32
  },
  '2.3': {
    tallOn: ['2.3.1', '2.3.2'],
    textMaxEm: 32
  },
  '2.4': {
    tallOn: ['2.4.1', '2.4.2'],
    textMaxEm: 32
  },
  '2.5': {
    tallOn: ['2.5'],
    textMaxEm: 32
  },
  '2.6': {
    tallOn: ['2.6.1', '2.6.2'],
    textMaxEm: 32
  },
  '2.7': {
    tallOn: ['2.7.1', '2.7.2'],
    textMaxEm: 32
  },
  '2.8': {
    tallOn: ['2.8.1', '2.8.2'],
    textMaxEm: 32
  },
  '2.9': {
    tallOn: ['2.9.1', '2.9.2'],
    textMaxEm: 32
  },
  // Category 3 - Media Badges
  '3.1': {
    tallOn: ['3.1.1', '3.1.2', '3.1.3'],
    textMaxEm: 32
  },
  '3.2': {
    tallOn: ['3.2.1', '3.2.2', '3.2.3'],
    textMaxEm: 32
  },
  '3.3': {
    tallOn: ['3.3.1', '3.3.2', '3.3.3'],
    textMaxEm: 32
  },
  // Category 4 - Camp Activities
  '4.1': {
    tallOn: ['4.1'],
    textMaxEm: 32
  },
  '4.2': {
    tallOn: ['4.2.1', '4.2.2', '4.2.3'],
    textMaxEm: 32
  },
  '4.3': {
    tallOn: ['4.3.1', '4.3.2', '4.3.3'],
    textMaxEm: 32
  },
  '4.4': {
    tallOn: ['4.4.1', '4.4.2', '4.4.3'],
    textMaxEm: 32
  },
  // Category 5 - Squad Activities
  '5.1': {
    tallOn: ['5.1.1', '5.1.2', '5.1.3'],
    textMaxEm: 32
  },
  '5.2': {
    tallOn: ['5.2'],
    textMaxEm: 32
  },
  '5.3': {
    tallOn: ['5.3'],
    textMaxEm: 32
  },
                '5.4': {
                tallOn: ['5.4.1', '5.4.2', '5.4.3'],
                textMaxEm: 32
              },
              '5.5': {
                tallOn: ['5.5.1', '5.5.2', '5.5.3'],
                textMaxEm: 32
              },
              '5.6': {
                tallOn: ['5.6.1', '5.6.2', '5.6.3'],
                textMaxEm: 32
              },
                             '5.7': {
                 tallOn: ['5.7.1', '5.7.2', '5.7.3'],
                 textMaxEm: 32
               },
               // Category 6 - Harmony and Order
               '6.1': {
                 tallOn: ['6.1.1', '6.1.2', '6.1.3'],
                 textMaxEm: 32
               },
               '6.2': {
                 tallOn: ['6.2.1', '6.2.2', '6.2.3'],
                 textMaxEm: 32
               },
               '6.3': {
                 tallOn: ['6.3.1', '6.3.2', '6.3.3'],
                 textMaxEm: 32
               },
               '6.4': {
                 tallOn: ['6.4.1', '6.4.2', '6.4.3'],
                 textMaxEm: 32
               }
  // Add more groups as needed
};

const App: React.FC = () => {
  const { categories, badges, loading, loadCategoryIntroduction } = useDataLoader();
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
    handleBackToCategoryFromIntroduction,
    handleBackToCategoryFromAdditional,
  } = useNavigation({ categories });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatOpenRequestedRef = useRef(false);
  const urlParamsProcessedRef = useRef(false);
  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
  }, []);
  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  useEffect(() => {
    if (loading) return; // Ждем завершения загрузки данных
    if (urlParamsProcessedRef.current) return; // Уже обработали URL параметры
    
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const categoryId = params.get('categoryId');
    const badgeId = params.get('badgeId');
    
    console.log('App: Processing URL params:', { view, categoryId, badgeId, categoriesCount: categories.length, badgesCount: badges.length });
    
    if (view === 'category' && categoryId) {
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        console.log('App: Opening category from URL:', category.title, category.id);
        handleCategoryClick(category);
        urlParamsProcessedRef.current = true;
      } else {
        console.warn('App: Category not found for ID:', categoryId, 'Available categories:', categories.map(c => c.id));
      }
    } else if (view === 'about-camp') {
      console.log('App: Opening about-camp from URL');
      setCurrentView('about-camp');
      urlParamsProcessedRef.current = true;
    } else if (view === 'categories') {
      console.log('App: Opening categories from URL');
      setCurrentView('categories');
      urlParamsProcessedRef.current = true;
    } else if (view === 'badge' && badgeId) {
      const badge = badges.find(b => b.id === badgeId);
      if (badge) {
        console.log('App: Opening badge from URL:', badge.title, badge.id);
        handleBadgeClick(badge);
        urlParamsProcessedRef.current = true;
      } else {
        console.warn('App: Badge not found for ID:', badgeId);
      }
    } else if (view) {
      // Если есть view параметр, но не обработали его выше, помечаем как обработанный
      urlParamsProcessedRef.current = true;
    }
  }, [loading, categories, badges, handleCategoryClick, handleBadgeClick, setCurrentView]);

  // Открываем чат по URL параметру после полной загрузки данных и prefetch ChatBot
  useEffect(() => {
    if (loading) return;

    const params = new URLSearchParams(window.location.search);
    const chat = params.get('chat');
    if (chat !== 'true') {
      if (chat !== null) {
        console.log('Chat param present but not true, skipping auto-open:', chat);
      }
      return;
    }

    if (isChatOpen) {
      chatOpenRequestedRef.current = true;
      console.log('Chat already open, marking URL request handled.');
      return;
    }

    if (chatOpenRequestedRef.current) return;

    console.log('Chat param detected, preloading ChatBot...');

    let didCancel = false;
    let timer: number | undefined;

    const openChat = async () => {
      try {
        // ChatBot is lazy loaded, no need to preload
        console.log('Scheduling chat open.');
      } catch (error) {
        console.warn('Chat open failed.', error);
      }

      if (didCancel) return;

      timer = window.setTimeout(() => {
        if (didCancel) return;
        chatOpenRequestedRef.current = true;
        console.log('Opening chat from URL after delay.');
        setIsChatOpen(true);
      }, 800);
    };

    void openChat();

    return () => {
      didCancel = true;
      if (timer) {
        window.clearTimeout(timer);
      }
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
      const baseKey = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : (b.id || '');
      if (!grouped[baseKey]) grouped[baseKey] = [];
      grouped[baseKey].push(b);
    });
    return Object.values(grouped).map((list) => {
      const base = list.find((x) => (x.level || '').toLowerCase().includes('баз')) || list[0];
      (base as any).allLevels = list.length > 1
        ? list.slice().sort((a, b) => (a.id || '').localeCompare(b.id || ''))
        : [];
      return base;
    });
  }, [badges, selectedCategory]);

  const categoryTitleMap = useMemo(() => new Map(categories.map((c) => [c.id, c.title])), [categories]);
  const categoryTitleById = useCallback((cid: string): string => {
    return categoryTitleMap.get(cid) || '';
  }, [categoryTitleMap]);

  const badgeContext = useMemo(() => {
    if (!selectedBadge) return null;
    const idSegments = (selectedBadge.id || '').split('.');
    const isMultiLevel = idSegments.length === 3;
    const badgeLevels = badges.filter((b) => {
      if (b.category_id !== selectedBadge.category_id) return false;
      if (isMultiLevel) {
        const seg = (b.id || '').split('.');
        return seg.length === 3 && sameBaseTwoSegments(b.id, selectedBadge.id);
      }
      return (b.id || '') === (selectedBadge.id || '');
    });
    const baseLevelBadge = isMultiLevel
      ? badgeLevels.find((b) => (b.level || '').toLowerCase().includes('базовый')) || null
      : selectedBadge;
    const otherLevels = badgeLevels.filter((b) => {
      const isBase = baseLevelBadge && b.id === baseLevelBadge.id;
      const isSingle = (b.level || '').toLowerCase().includes('одноуровнев');
      return !isBase && !isSingle;
    });
    return { badgeLevels, baseLevelBadge, otherLevels, isMultiLevel };
  }, [badges, selectedBadge]);

  const levelContext = useMemo(() => {
    if (!selectedBadge || !selectedLevel) return null;
    const idSegments = (selectedBadge.id || '').split('.');
    const isMultiLevel = idSegments.length === 3;
    const baseKey = isMultiLevel ? idSegments.slice(0, 2).join('.') + '.' : selectedBadge.id;
    const levelBadge = badges.find((b) => {
      if (b.category_id !== selectedBadge.category_id) return false;
      if (isMultiLevel) {
        return (b.id || '').startsWith(baseKey) && b.level === selectedLevel;
      }
      return b.id === selectedBadge.id && b.level === selectedLevel;
    });
    if (!levelBadge) return null;
    const siblingLevels = badges.filter((b) => {
      if (b.category_id !== selectedBadge.category_id) return false;
      if (isMultiLevel) {
        const seg = (b.id || '').split('.');
        return seg.length === 3 && sameBaseTwoSegments(b.id, selectedBadge.id);
      }
      return (b.id || '') === (selectedBadge.id || '');
    });
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
    const otherLevels = levelsAll.filter((l) => String(l.level) !== String(selectedLevel));
    return { levelBadge, otherLevels };
  }, [badges, selectedBadge, selectedLevel]);

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
          setSelectedCategory((prev) => prev && prev.id === selectedCategory.id
            ? ({ ...prev, introduction: { has_introduction: true, html: introduction.html, markdown: introduction.markdown } })
            : prev);
        }
      }
    } finally {
      setCurrentView('introduction');
    }
  }, [loadCategoryIntroduction, selectedCategory, setCurrentView, setSelectedCategory]);

  const handleFormSubmit = useCallback(() => {
    const message = `🎪 Заявка на осеннюю смену "Осенний 4К-вайб в Реальном Лагере"

👶 Имя ребёнка: ${formData.childName}
👨‍👩‍👧‍👦 Имя родителя: ${formData.parentName}
📞 Телефон: ${formData.phone}
📧 Email: ${formData.email}
🎂 Возраст ребёнка: ${formData.childAge}
💭 Особые пожелания: ${formData.specialRequests}

Готовы записаться на смену! 🚀`;

    const telegramUrl = `https://t.me/Stivanovv?text=${encodeURIComponent(message)}`;
    window.open(telegramUrl, '_blank');
  }, [formData]);

  // Функция для обработки интерактивных ссылок в тексте
  const processInteractiveLinks = (text: string): string => {
    // Заменяем ссылки формата [текст](checklist:filename.md) или [текст](methodology:filename.md)
    return text.replace(/\[([^\]]+)\]\((checklist|methodology|checklists):([^)]+)\)/g, (_, linkText, type, filename) => {
      const actualType = type === 'checklist' ? 'checklists' : type;
      return `<a href="#" onclick="window.handleMaterialClick('${actualType}', '${filename}'); return false;" style="color: #4ecdc4; text-decoration: underline; cursor: pointer;">${linkText}</a>`;
    });
  };

  // Расширенная обработка: добавляет автоссылки на значки по шаблонам "см. 11.1", "см. раздел 3.2"
  const processInteractiveLinksPlus = (text: string): string => {
    const base = processInteractiveLinks(text || '');
    return base.replace(/\bсм\.?\s*(?:раздел|значок)?\s*(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\b/gi, (_m: string, bid: string) => {
      const safeId = bid;
      return `<a href="#" onclick="window.openBadgeById('${safeId}'); return false;" style="color: #4ecdc4; text-decoration: underline; cursor: pointer;">см. ${safeId}</a>`;
    });
  };
  // CSP-safe version without inline JS/CSS
  const processInteractiveLinksSafe = (text: string): string => {
    return text.replace(/\[([^\]]+)\]\((checklist|methodology|checklists):([^)]+)\)/g, (_, linkText, type, filename) => {
      const actualType = type === 'checklist' ? 'checklists' : type;
      return `<a href=\"#\" data-material-type=\"${actualType}\" data-filename=\"${filename}\" class=\"interactive-link\">${linkText}</a>`;
    });
  };

  // CSP-safe extended linking: also link references like "см. 11.1" or "см. раздел 3.2"
  const processInteractiveLinksPlusSafe = (text: string): string => {
    const base = processInteractiveLinksSafe(text || '');
    return base.replace(/\bсм\.?\s*(?:раздел|значок)?\s*(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\b/gi, (_m: string, bid: string) => {
      const safeId = bid;
      return `<a href=\"#\" data-badge-id=\"${safeId}\" class=\"interactive-link\">см. ${safeId}</a>`;
    });
  };
  // Keep referenced to avoid TS noUnusedLocals error if not used
  void processInteractiveLinksSafe;

  // Глобальная функция для обработки кликов по ссылкам
  (window as any).handleMaterialClick = (type: string, filename: string) => {
    handleAdditionalMaterialClick(type as 'checklists' | 'methodology', filename);
  };

  // Глобальная функция: открыть значок по его ID (для автоссылок)
  (window as any).openBadgeById = (rawId: string) => {
    try {
      const parts = (rawId || '').split('.');
      const baseKey = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : rawId;
      const group = badges.filter((b) => (b.id || '').startsWith(baseKey + '.') || b.id === baseKey);
      if (!group.length) return;
      const base = group.find((b) => String(b.level || '').toLowerCase().includes('базов')) || group[0];
      const cat = categories.find((c) => c.id === base.category_id);
      if (cat) {
        setSelectedCategory(cat);
        setCurrentView('category');
      }
      handleBadgeClick(base);
    } catch (e) {
      console.warn('openBadgeById error', e);
    }
  };

  const handleAdditionalMaterialClick = useCallback(async (type: 'checklists' | 'methodology', key: string) => {
    console.log('App: Additional material clicked:', type, key);
    if (!selectedCategory) return;
    
    try {
      // Нормализуем часто встречающиеся псевдонимы файлов
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

      // Путь по текущей категории
      const primaryPath = `/RL-Guide-book/ai-data/category-${selectedCategory.id}/${type}/${normalizedKey}`;
      let response = await fetch(primaryPath);
      
      // Если файл отсутствует в категории, пробуем стандартную папку категории 14
      if (!response.ok) {
        const fallbackPath = `/RL-Guide-book/ai-data/category-14/${type}/${normalizedKey}`;
        console.warn('Primary material not found, trying fallback:', primaryPath, '->', fallbackPath);
        response = await fetch(fallbackPath);
        if (!response.ok) {
          console.error('Failed to load additional material:', response.status, response.statusText);
          return;
        }
      }

      if (!response.ok) {
        console.error('Failed to load additional material:', response.status, response.statusText);
        return;
      }
      
      const markdownContent = await response.text();

      // Преобразуем markdown в HTML, используя общий мини‑парсер
      const htmlContent = markdownToHtml(markdownContent);
      
      // Создаем более читаемый заголовок
      const titleMap: { [key: string]: string } = {
        'general-checklist.md': '📋 Общий чек-лист',
        'challenges-checklist.md': '🎯 Чек-лист с челленджами', 
        'active-checklist.md': '🚀 Активная версия чек-листа',
        'inspector-methodology.md': '📚 Методика Инспектора Пользы',
        'inspector-codex.md': '📜 Кодекс Инспектора Реального Лагеря',
        'friendship-guide.md': '🤝 Памятка как получить значки Инспектора Дружбы',
        'i-messages-guide.md': '💬 Памятка Я сообщений для Инспектора Дружбы',
        'friendship-rules.md': '📋 Список правил Инспектора Дружбы'
      };
      
      setSelectedAdditionalMaterial({
        type,
        key,
        title: titleMap[key] || key.replace('.md', '').replace(/-/g, ' '),
        content: htmlContent
      });
      setCurrentView('additional-material');
    } catch (error) {
      console.error('Error loading additional material:', error);
    }
  }, [selectedCategory, setCurrentView, setSelectedAdditionalMaterial]);

  // Delegated click handler for CSP-safe interactive links
  const handleInteractiveLinkClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (!anchor) return;
    const matType = anchor.getAttribute('data-material-type');
    const matFile = anchor.getAttribute('data-filename');
    const badgeId = anchor.getAttribute('data-badge-id');

    if (matType && matFile) {
      e.preventDefault();
      handleAdditionalMaterialClick(matType as 'checklists' | 'methodology', matFile);
      return;
    }
    if (badgeId) {
      e.preventDefault();
      (window as any).openBadgeById?.(badgeId);
      return;
    }
  }, [handleAdditionalMaterialClick]);
  // Legacy functions removed - они сохранены в ветке legacy
  // ЭКРАН 2: 14 категорий (legacy - не используется, сохранено для совместимости)
  // @ts-ignore - legacy function, kept for compatibility
  const _renderCategories = () => {
    // const getConstellationPosition = (index: number, _total: number) => {
    //       // Простая сетка 4x4 с равномерными интервалами
    //       const marginX = 20; // Отступ от краев по X (%)
    //       const marginY = 15; // Отступ от краев по Y (%)
    //       
    //       // Определяем строку и позицию в строке
    //       let row, col;
    //       
    //       if (index < 2) {
    //         // Верхняя строка - 2 пузыря
    //         row = 0;
    //         col = index;
    //       } else if (index < 6) {
    //         // Вторая строка - 4 пузыря
    //         row = 1;
    //         col = index - 2;
    //       } else if (index < 10) {
    //         // Третья строка - 4 пузыря
    //         row = 2;
    //         col = index - 6;
    //       } else {
    //         // Нижняя строка - 4 пузыря
    //         row = 3;
    //         col = index - 10;
    //       }
    //       
    //       const availableWidth = 100 - 2 * marginX;
    //       const availableHeight = 100 - 2 * marginY;
    //       
    //       // Простое равномерное распределение
    //       let x, y;
    //       
    //       if (row === 0) {
    //         // Для верхней строки (2 пузыря) - равномерно по всей ширине
    //         x = marginX + (col / 1) * availableWidth;
    //       } else {
    //         // Для остальных строк (4 пузыря) - равномерно по всей ширине
    //         x = marginX + (col / 3) * availableWidth;
    //       }
    //       
    //       // Равномерные интервалы по вертикали
    //       y = marginY + (row / 3) * availableHeight;
    //       
    //       // Специальная обработка для ИИ (индекс 11 в массиве) - опускаем ниже, но не слишком
    //       if (index === 11) {
    //         y += 8; // Опускаем на 8% ниже (уменьшили с 15%)
    //       }
    //       
    //       return { x, y };
    //     };

                                                                                                                                                                                               const getCircleSize = (badgeCount: number) => {
            // Размеры круга пропорционально количеству значков
            const minSize = 72;   // Минимальный размер (пиксели)
            const maxSize = 140;  // Максимальный размер (пиксели)
            const minBadges = 3;  // Минимальное количество значков
            const maxBadges = 40; // Максимальное количество значков (обновлено для новых данных)
            
            // Нормализуем количество значков от 0 до 1
            const normalized = Math.min(Math.max((badgeCount - minBadges) / (maxBadges - minBadges), 0), 1);
            
            // Вычисляем размер с плавным переходом
            const size = minSize + normalized * (maxSize - minSize);
            
            return Math.round(size);
          };

                               // const getTextLines = (title: string) => {
           // // Система определения количества строк
           // if (title.length > 35) return 3; // Очень длинные названия - 3 строки
           // if (title.length > 20) return 2; // Длинные названия - 2 строки
           // return 1; // Короткие названия - 1 строка
         // };

             

               return (
          <div className="categories-screen">
           <div className="header">
             <button onClick={handleBackToIntro} className="back-button">
              ← Назад к введению
            </button>
            <div className="header-content">
             <h1 className="heading-gold">Категории значков</h1>
             <p className="subtitle-orange">Выберите категорию для изучения</p>
            </div>
           </div>
                       <div className="categories-grid">
              {sortedCategories.map((category, index) => {
                const circleSize = getCircleSize(category.badge_count);
                // const textLines = getTextLines(category.title);
                
                return (
                  <div 
                    key={category.id} 
                    className="category-container floating"
                    style={{
                      animationDelay: `${index * 0.2}s`
                    }}
                  >
                    <div 
                      className="category-card"
                      style={{
                        width: `${circleSize}px`,
                        height: `${circleSize}px`
                      }}
                      onClick={() => handleCategoryClick(category)}
                    >
                      <div className="category-icon">{getCategoryIcon(category.id)}</div>
                    </div>
                                         <div className="category-text">
                       <h3 style={{ whiteSpace: 'pre-line' }}>
                         {category.id === '5' ? 'За Отрядные Дела\nОДэ 😈' : category.title}
                       </h3>
                       <p>{category.badge_count} значков</p>
                     </div>
                  </div>
                );
              })}
            </div>
         </div>
       );
   };

  // ЭКРАН 3: Конкретная категория (только базовые/одноуровневые значки)
  const renderCategory = () => {
    console.log('renderCategory вызван, selectedCategory:', selectedCategory);
    if (!selectedCategory) {
      console.log('selectedCategory отсутствует, возвращаем null');
      return null;
    }

    return (
      <div className="category-screen">
        <div className="header">
          <button onClick={handleBackToCategories} className="back-button">
            ← Назад к категориям
          </button>
          <div className="header-content">
            <h1 className="heading-gold">{selectedCategory.title}</h1>
            <p className="subtitle-orange">{categoryBadges.length} базовых значков</p>
            {selectedCategory.introduction?.has_introduction && (
              <button 
                onClick={handleIntroductionClick} 
                className="hint-button"
                title="Показать подсказку по категории"
              >
                💡 Подсказка
              </button>
            )}
            {selectedCategory.id === '14' && (
              <div className="additional-materials-buttons">
                  <>
                    <button 
                    onClick={() => handleAdditionalMaterialClick('checklists', 'general-checklist.md')}
                      className="material-button"
                      title="Общий чек-лист"
                    >
                      📋 Чек-лист
                    </button>
                    <button 
                    onClick={() => handleAdditionalMaterialClick('checklists', 'challenges-checklist.md')}
                      className="material-button"
                      title="Чек-лист с челленджами"
                    >
                      🎯 Челленджи
                    </button>
                                   <button
                    onClick={() => handleAdditionalMaterialClick('checklists', 'active-checklist.md')}
                 className="material-button"
                 title="Активная версия чек-листа"
               >
                 🚀 Активная версия
               </button>
                  <button 
                    onClick={() => handleAdditionalMaterialClick('methodology', 'inspector-methodology.md')}
                    className="material-button"
                    title="Методика Инспектора Пользы"
                  >
                    📚 Методика
                  </button>
                  <button 
                    onClick={() => handleAdditionalMaterialClick('methodology', 'inspector-codex.md')}
                    className="material-button"
                    title="Кодекс Инспектора Реального Лагеря"
                  >
                    📜 Кодекс
                  </button>
                  <button 
                    onClick={() => handleAdditionalMaterialClick('methodology', 'friendship-guide.md')}
                    className="material-button"
                    title="Памятка как получить значки Инспектора Дружбы"
                  >
                    🤝 Памятка Дружбы
                  </button>
                  <button 
                    onClick={() => handleAdditionalMaterialClick('methodology', 'i-messages-guide.md')}
                    className="material-button"
                    title="Памятка Я сообщений для Инспектора Дружбы"
                  >
                    💬 Я-сообщения
                  </button>
                  <button 
                    onClick={() => handleAdditionalMaterialClick('methodology', 'friendship-rules.md')}
                    className="material-button"
                    title="Список правил Инспектора Дружбы"
                  >
                    📋 Правила Дружбы
                  </button>
                </>
              </div>
            )}
          </div>
        </div>
        <div className="badges-grid">
          {categoryBadges.map((badge, index) => (
            <article 
              key={badge.id} 
              className="badge-card floating"
              style={{
                animationDelay: `${index * 0.1}s`
              }}
              onClick={() => handleBadgeClick(badge)}
            >
                             <div className="badge-card__icon">
                 <div className="badge-emoji">{badge.emoji || (badge.id === '1.11' ? '♾️' : '')}</div>
               </div>
              <h3 className="badge-card__title">{badge.title}</h3>
              <div className="badge-card__level">
                {Array.isArray((badge as any).allLevels) && (badge as any).allLevels.length > 1
                  ? `${(badge as any).allLevels.length} ${pluralizeRu((badge as any).allLevels.length, ['уровень', 'уровня', 'уровней'])}`
                  : 'одноуровневый'}
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  };

  // ЭКРАН 4: Конкретный значок с общей инфой и уровнями
  const renderBadge = () => {
    if (!selectedBadge || !badgeContext) return null;
    const { badgeLevels, baseLevelBadge, otherLevels, isMultiLevel } = badgeContext;

    // Получаем критерии базового уровня из данных с автоматическим форматированием
    // const _getCriteriaFromBadge = (badge: Badge | null) => {
    //   if (!badge || !badge.criteria) return [] as string[];
    //   const criteriaText = badge.criteria.replace(/^Как получить значок «[^»]+»:\s*/, '');
    //   const shouldFormat = shouldApplyFormatting(badge.id);
    //   const processedCriteria = shouldFormat ? fixCriteriaFormatting(criteriaText) : criteriaText;
    //   return processedCriteria
    //     .split('✅')
    //     .filter(c => c.trim())
    //     .map(c => c.trim());
    // };

    // Получаем критерии и подтверждение из данных значка
    let evidenceText: string | null = null;
    let baseCriteria: string[] = [];
    
    // Для одноуровневых значков используем данные самого значка
    const sourceBadge = baseLevelBadge || selectedBadge;
    
    if (sourceBadge) {
      try {
      // Используем поле confirmation если оно есть, иначе извлекаем из criteria
      if (sourceBadge.confirmation) {
        evidenceText = sourceBadge.confirmation;
      }
      
      if (sourceBadge.criteria) {
        const raw = sourceBadge.criteria.replace(/^Как получить значок «[^»]+»:\s*/, '');
        const shouldFormat = shouldApplyFormatting(sourceBadge.id);
        const processedRaw = shouldFormat ? fixCriteriaFormatting(raw) : raw;
        
        // Если есть confirmation, то извлекаем evidence из criteria, иначе используем весь текст
        if (sourceBadge.confirmation) {
          const { mainText, evidenceText: extractedEvidence } = extractEvidenceSection(processedRaw);
          evidenceText = extractedEvidence || sourceBadge.confirmation;
          const criteriaText = mainText;
          baseCriteria = criteriaText
            .split('✅')
            .filter((c: string) => c.trim())
            .map((c: string) => c.trim());
        } else {
          // Если нет отдельного confirmation, используем весь текст criteria
          const { mainText, evidenceText: extractedEvidence } = extractEvidenceSection(processedRaw);
          evidenceText = extractedEvidence;
          const criteriaText = mainText;
          baseCriteria = criteriaText
            .split('✅')
            .filter((c: string) => c.trim())
            .map((c: string) => c.trim());
        }
      }
      } catch (err) {
        const rawCriteriaAny = (sourceBadge as any)?.criteria;
        if (Array.isArray(rawCriteriaAny)) {
          baseCriteria = rawCriteriaAny.map((c: any) => String(c).trim()).filter(Boolean);
        }
        const confAny = (sourceBadge as any)?.confirmation;
        if (!evidenceText && confAny) {
          evidenceText = Array.isArray(confAny) ? confAny.map((c: any) => String(c)).join('\n') : String(confAny);
        }
      }
    }

    // Оценка длины описания для выбора высокого контейнера
    const baseDescriptionText = (baseLevelBadge?.description || selectedBadge.description || '');
    
    // Определяем группу значка (например, 2.1 из 2.1.1)
    const badgeGroup = selectedBadge.id?.split('.').slice(0, 2).join('.');
    const groupOverride = layoutOverrides[badgeGroup as keyof typeof layoutOverrides];
    
    // Используем реестр настроек или автоматическое определение
    const isTallInfo = groupOverride?.tallOn?.includes(selectedBadge.id) || 
                      baseDescriptionText.length > 400 || 
                      baseDescriptionText.split('\n').length > 6;
    
    // Применяем CSS переменную для максимальной высоты текста
    const textMaxEm = groupOverride?.textMaxEm || 28;

    const selectedEmoji = selectedBadge.emoji || (selectedBadge.id === '1.11' ? '♾️' : '');

    return (
      <div className={`badge-screen ${selectedBadge.id?.startsWith('1.4.') ? 'badge--group-1-4' : ''}`}>
        <div className="header">
          <button onClick={handleBackToCategory} className="back-button">
            ← Назад к категории
          </button>
          <div className="badge-header">
            <div className="badge-emoji-large">{selectedEmoji}</div>
            <div>
              <h1 className="heading-gold">{selectedBadge.title}</h1>
              <p className="badge-category subtitle-orange">{selectedCategory?.title}</p>
            </div>
          </div>
        </div>

        <div className="badge-content" onClick={handleInteractiveLinkClick}>
          <section className="badge-summary">
                          <div 
              className={`badge-summary__block ${isTallInfo ? 'badge-summary__block--tall' : ''}`}
              style={isTallInfo ? { '--info-max-em': `${textMaxEm}em` } as React.CSSProperties : {}}
            >
                              <h3>Общая информация</h3>
                <p className="badge-summary__text">
                  {(() => {
                    const rawDescription = baseLevelBadge?.description || selectedBadge.description || 'Общая информация пока не найдена в данных. Содержание будет подгружено автоматически после обновления Путеводителя.';
                    const shouldFormat = shouldApplyFormatting(selectedBadge.id);
                    const processedDescription = shouldFormat ? fixDescriptionFormatting(rawDescription) : rawDescription;
                    const { mainText, evidenceText: descEvidenceText } = extractEvidenceSection(processedDescription);
                    return (
                      <>
                        <span dangerouslySetInnerHTML={{__html: processInteractiveLinksPlusSafe(mainText.replace(/\n/g, '<br>'))}}></span>
                        {descEvidenceText && (
                          <>
                            <br /><br />
                            <span className="badge-evidence">{descEvidenceText}</span>
                          </>
                        )}
                      </>
                    );
                  })()}
                </p>

                {/* New sections */}
                {baseLevelBadge?.nameExplanation && (
                  <>
                    <h4>Объяснение названия</h4>
                    <p className="badge-summary__text">{baseLevelBadge.nameExplanation}</p>
                  </>
                )}

                {baseLevelBadge?.skillTips && (
                  <>
                    <h4>Как прокачать навык</h4>
                    <p className="badge-summary__text" dangerouslySetInnerHTML={{__html: processInteractiveLinksPlusSafe(baseLevelBadge.skillTips.replace(/\n/g, '<br>'))}}></p>
                  </>
                )}

                {baseLevelBadge?.examples && (
                  <>
                    <h4>Примеры</h4>
                    <p className="badge-summary__text" dangerouslySetInnerHTML={{__html: processInteractiveLinksPlusSafe(baseLevelBadge.examples.replace(/\n/g, '<br>'))}}></p>
                  </>
                )}

                {baseLevelBadge?.importance && (
                  <>
                    <h4>Почему этот значок важен</h4>
                    <p className="badge-summary__text">{baseLevelBadge.importance}</p>
                  </>
                )}

                {baseLevelBadge?.philosophy && (
                  <>
                    <h4>Философия значка</h4>
                    <p className="badge-summary__text">{baseLevelBadge.philosophy}</p>
                  </>
                )}

                {baseLevelBadge?.howToBecome && (
                  <>
                    <h4>Как стать</h4>
                    <p className="badge-summary__text" dangerouslySetInnerHTML={{__html: processInteractiveLinksPlusSafe(baseLevelBadge.howToBecome.replace(/\n/g, '<br>'))}}></p>
                  </>
                )}
              <div className="badge-meta">
                <div><span>Категория</span><strong>{selectedCategory?.title}</strong></div>
                <div><span>Всего уровней</span><strong>{badgeLevels.length}</strong></div>
                <div><span>ID</span><strong>{selectedBadge.id}</strong></div>
              </div>
            </div>

            <div className="badge-summary__right">
                             <div className="badge-summary__block">
                 <h3>{isMultiLevel ? 'Как получить базовый уровень' : 'Как получить значок'}</h3>
                {baseCriteria.length > 0 ? (
                  <ul className="badge-steps__list">
                    {baseCriteria.map((criterion, index) => (
                      <li key={index}>
                        <span dangerouslySetInnerHTML={{ __html: processInteractiveLinksPlusSafe(String(criterion).replace(/\n/g, '<br>')) }} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="badge-summary__text">
                    Критерии для базового уровня пока не определены.
                  </p>
                )}
                {evidenceText && (
                  <>
                    <h4>Чем подтверждается</h4>
                    <p className="badge-summary__text badge-evidence">
                      {evidenceText}
                    </p>
                  </>
                )}
              </div>

              {otherLevels.length > 0 && (
                <div className="levels-grid-bottom levels-dock">
                  {otherLevels.map(level => (
                    <article key={level.id} className="level-card-bottom" onClick={() => handleLevelClick(String(level.level))}>
                      <div className="level-card__icon">
                        <span className="level-bubble__emoji">{level.emoji || '🏆'}</span>
                      </div>
                      <h4 className="level-card__title">{level.title}</h4>
                      <div className="level-card__subtitle">{String(level.level)}</div>
                    </article>
                  ))}
                </div>
              )}

              {SHOW_RELATED && (() => {
                // Inline related-badges calculation using lightweight topical keywords
                const TOPICS: Record<string, string[]> = {
                  'ИИ/Медиа': [' ии', 'нейросет', 'chatgpt', 'чатgpt', 'midjourney', 'stable', 'изображен', 'видео', 'монтаж', 'аудио', 'подкаст', 'канал', 'пост', 'статья', 'контент', 'медиа'],
                  'Творчество/Сцена': ['сцена', 'концерт', 'музык', 'танц', 'театр', 'песня', 'рису', 'жюри', 'выступ', 'шоу', 'творч'],
                  'Организация/Лидерство': ['организ', 'лидер', 'ведущ', 'отряд', 'план', 'ответствен', 'инициатив', 'координац', 'расписан'],
                  'Команда/Коммуникации': ['команд', 'общен', 'коммуник', 'конфликт', 'договор', 'дружб', 'уважен', 'вежлив', 'помощ', 'вовлеч', 'модерац', 'обратн'],
                  'Порядок/Быт': ['уборк', 'поряд', 'чист', 'уют', 'зона', 'декор', 'гармони', 'распорядок'],
                  'Осознанность/Психо': ['осознан', 'внимател', 'эмоци', 'настроен', 'стресс', 'спокойств', 'фокус', 'медита', 'рефлекс'],
                };
                const textOf = (b: Badge | null | undefined): string => {
                  if (!b) return '';
                  const anyB = b as any;
                  return [anyB.description, anyB.importance, anyB.skillTips, anyB.examples, anyB.howToBecome]
                    .map((v) => (typeof v === 'string' ? v : ''))
                    .join('\n');
                };
                const topicsFor = (txt: string): string[] => {
                  const tset = new Set<string>();
                  const low = ` ${txt.toLowerCase()} `;
                  Object.entries(TOPICS).forEach(([t, keys]) => {
                    if (keys.some((k) => low.includes(k))) tset.add(t);
                  });
                  return Array.from(tset);
                };
                const baseKey = (id: string) => {
                  const parts = (id || '').split('.');
                  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : id;
                };
                const sameGroup = (a: string, b: string) => baseKey(a) === baseKey(b);
                const pickBase = (list: Badge[]): Badge => {
                  const found = list.find((x) => (x.level || '').toLowerCase().includes('базовый'));
                  return found || list.sort((a, b) => (a.id || '').localeCompare(b.id || ''))[0];
                };
                // Build representatives by group
                const grouped: Record<string, Badge[]> = {};
                badges.forEach((b) => {
                  const key = baseKey(b.id);
                  (grouped[key] ||= []).push(b);
                });
                const representatives = Object.entries(grouped).map(([, list]) => pickBase(list));
                // Topics of current
                const currentTopics = new Set(topicsFor(textOf(baseLevelBadge || selectedBadge)));
                if (currentTopics.size === 0) return null;
                // Score reps by overlap, prefer different categories
                type Scored = { badge: Badge; score: number };
                const scored: Scored[] = [];
                for (const rb of representatives) {
                  if (sameGroup(rb.id, selectedBadge.id)) continue;
                  if (rb.category_id === selectedBadge.category_id) continue; // перекрёстные — в другие категории
                  const t = new Set(topicsFor(textOf(rb)));
                  let overlap = 0;
                  t.forEach((x) => { if (currentTopics.has(x)) overlap++; });
                  if (overlap > 0) scored.push({ badge: rb, score: overlap });
                }
                scored.sort((a, b) => b.score - a.score || a.badge.title.localeCompare(b.badge.title));
                const related = scored.slice(0, 6).map((s) => s.badge);
                if (related.length === 0) return null;
                return (
                  <div className="levels-grid-bottom levels-dock">
                    {related.map((rb) => (
                      <article key={rb.id} className="level-card-bottom" onClick={() => handleBadgeClick(rb)} title={categoryTitleById(rb.category_id)}>
                        <div className="level-card__icon">
                          <span className="level-bubble__emoji">{rb.emoji || '🏅'}</span>
                        </div>
                        <h4 className="level-card__title">{rb.title}</h4>
                        <div className="level-card__subtitle">{categoryTitleById(rb.category_id)}</div>
                      </article>
                    ))}
                  </div>
                );
              })()}
            </div>
          </section>
        </div>
      </div>
    );
  };

     // ЭКРАН 5: Конкретный уровень значка
     const renderBadgeLevel = () => {
    if (!selectedBadge || !selectedLevel || !levelContext) return null;
    const { levelBadge, otherLevels } = levelContext;

                // Получаем критерии и подтверждение из данных значка с автоматическим форматированием
     const getLevelCriteria = (badge: Badge) => {
       if (!badge.criteria) {
         // Fallback критерии если данных нет
         return [
           'Выполнить все базовые требования значка.',
           'Показать более глубокое понимание и навыки.',
           'Демонстрировать постоянное развитие и улучшение.'
         ];
       }
       
       // Парсим критерии из строки с автоматическим форматированием
       const criteriaText = badge.criteria.replace(/^Как получить значок «[^»]+»:\s*/, '');
       const shouldFormat = shouldApplyFormatting(badge.id);
       const processedCriteria = shouldFormat ? fixCriteriaFormatting(criteriaText) : criteriaText;
       const criteria = processedCriteria.split('✅').filter((c: string) => c.trim()).map((c: string) => c.trim());
       
       return criteria.length > 0 ? criteria : [
         'Выполнить все базовые требования значка.',
         'Показать более глубокое понимание и навыки.',
         'Демонстрировать постоянное развитие и улучшение.'
       ];
     };

     const levelCriteria = getLevelCriteria(levelBadge);
     
     // Получаем подтверждение для уровня
     const levelEvidenceText = levelBadge.confirmation || null;

           // Определяем фон в зависимости от уровня
      const getBackgroundImage = () => {
        if (selectedLevel === 'Продвинутый уровень' || selectedLevel === 'Продвинутый уровень ') {
          return 'url("/RL-Guide-book/screen5_bg.png")';
        } else if (selectedLevel === 'Экспертный уровень') {
          return 'url("/RL-Guide-book/screen6_bg.png")';
        }
        return 'url("/RL-Guide-book/screen3_bg.png")'; // Дефолтный фон для других уровней
      };

    // Определяем группу значка для уровня
    const levelBadgeGroup = levelBadge.id?.split('.').slice(0, 2).join('.');
    const levelGroupOverride = layoutOverrides[levelBadgeGroup as keyof typeof layoutOverrides];
    
    const isTallInfoLevel = levelGroupOverride?.tallOn?.includes(levelBadge.id) || (
      levelBadge.id === '1.1.2' ||
      levelBadge.id === '1.1.3' ||
      levelBadge.id === '1.2.2' ||
      levelBadge.id === '1.2.3' ||
      levelBadge.id === '1.3.2' ||
      levelBadge.id === '1.3.3' ||
      levelBadge.id === '1.4.2'
    );
    
    // Применяем CSS переменную для максимальной высоты текста
    const levelTextMaxEm = levelGroupOverride?.textMaxEm || 28;

    return (
      <div 
        className="badge-level-screen"
        style={{
          background: `
            linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            ${getBackgroundImage()} center center / 100% no-repeat
          `
        }}
      >
         <div className="header">
           <button onClick={handleBackToBadge} className="back-button">
             ← Назад к значку
           </button>
           <div className="level-header">
             <div className="badge-emoji-large">{levelBadge.emoji || '🏆'}</div>
             <div>
               <h1 className="heading-gold">{levelBadge.title}</h1>
               <p className="level-title subtitle-orange">{selectedLevel}</p>
             </div>
           </div>
         </div>
         
        <div className="level-content" onClick={handleInteractiveLinkClick}>
           <section className="badge-summary">
             <div 
               className={`badge-summary__block ${isTallInfoLevel ? 'badge-summary__block--tall' : ''}`}
               style={isTallInfoLevel ? { '--info-max-em': `${levelTextMaxEm}em` } as React.CSSProperties : {}}
             >
                               <h3>Общая информация</h3>
                <p className="badge-summary__text">
                  {(() => {
                    const rawDescription = selectedBadge.description || levelBadge.description || 'Общая информация пока не найдена в данных. Содержание будет подгружено автоматически после обновления Путеводителя.';
                    const shouldFormat = shouldApplyFormatting(levelBadge.id);
                    const processedDescription = shouldFormat ? fixDescriptionFormatting(rawDescription) : rawDescription;
                    const { mainText, evidenceText: descEvidenceText } = extractEvidenceSection(processedDescription);
                    return (
                      <>
                        <span dangerouslySetInnerHTML={{__html: processInteractiveLinksPlusSafe(mainText.replace(/\n/g, '<br>'))}}></span>
                        {descEvidenceText && (
                          <>
                            <br /><br />
                            <span className="badge-evidence">{descEvidenceText}</span>
                          </>
                        )}
                      </>
                    );
                  })()}
                </p>

                {/* New sections for level badge */}
                {levelBadge.nameExplanation && (
                  <>
                    <h4>Объяснение названия</h4>
                    <p className="badge-summary__text">{levelBadge.nameExplanation}</p>
                  </>
                )}

                {levelBadge.skillTips && (
                  <>
                    <h4>Как прокачать навык</h4>
                    <p className="badge-summary__text" dangerouslySetInnerHTML={{__html: processInteractiveLinksPlusSafe(levelBadge.skillTips.replace(/\n/g, '<br>'))}}></p>
                  </>
                )}

                {levelBadge.examples && (
                  <>
                    <h4>Примеры</h4>
                    <p className="badge-summary__text" dangerouslySetInnerHTML={{__html: processInteractiveLinksPlusSafe(levelBadge.examples.replace(/\n/g, '<br>'))}}></p>
                  </>
                )}

                {levelBadge.importance && (
                  <>
                    <h4>Почему этот значок важен</h4>
                    <p className="badge-summary__text">{levelBadge.importance}</p>
                  </>
                )}

                {levelBadge.philosophy && (
                  <>
                    <h4>Философия значка</h4>
                    <p className="badge-summary__text">{levelBadge.philosophy}</p>
                  </>
                )}

                {levelBadge.howToBecome && (
                  <>
                    <h4>Как стать</h4>
                    <p className="badge-summary__text" dangerouslySetInnerHTML={{__html: processInteractiveLinksPlusSafe(levelBadge.howToBecome.replace(/\n/g, '<br>'))}}></p>
                  </>
                )}
               <div className="badge-meta">
                 <div><span>Категория</span><strong>{selectedCategory?.title}</strong></div>
                 <div><span>Уровень</span><strong>{selectedLevel}</strong></div>
                 <div><span>ID</span><strong>{levelBadge.id}</strong></div>
               </div>
             </div>

             <div className="badge-summary__right">
               <div className="badge-summary__block">
                <h3>Как получить {selectedLevel.toLowerCase()}</h3>
                {levelCriteria.length > 0 ? (
                  <ul className="badge-steps__list">
                    {levelCriteria.map((criterion: string, index: number) => {
                      const hasExamples = criterion.includes('Например:');
                      if (!hasExamples) {
                        return (
                          <li key={index}>
                            <span
                              dangerouslySetInnerHTML={{
                                __html: processInteractiveLinksPlus(String(criterion).replace(/\n/g, '<br>')),
                              }}
                            />
                          </li>
                        );
                      }

                                             const exampleSplit = criterion.split('Например:');
                       const headText = exampleSplit[0].trim();
                       const tail = exampleSplit.slice(1).join('Например:');
                       const exampleLines = tail
                         .split('\n')
                         .map((l: string) => l.trim())
                         .filter((l: string) => l.length > 0 && (l.startsWith('•') || l.startsWith('✅') || l.includes('Помочь') || l.includes('Проследить'))); // фильтруем только нужные строки

                       return (
                         <li key={index}>
                           <div className="criterion-text" dangerouslySetInnerHTML={{__html: processInteractiveLinksPlus(headText.replace(/\n/g, '<br>'))}}></div>
                           {exampleLines.length > 0 && (
                             <div className="criterion-examples">
                               <p className="criterion-example">Например:</p>
                               {exampleLines.map((l: string, i: number) => (
                                 <p className="criterion-example" key={i}>{l}</p>
                               ))}
                             </div>
                           )}
                         </li>
                       );
                    })}
                  </ul>
                ) : (
                  <p className="badge-summary__text">
                    Критерии для получения {selectedLevel.toLowerCase()} пока не определены. 
                    Обратитесь к вожатым для получения подробной информации.
                  </p>
                )}
                {levelEvidenceText && (
                  <>
                    <h4>Чем подтверждается</h4>
                    <p className="badge-summary__text badge-evidence">
                      {levelEvidenceText}
                    </p>
                  </>
                )}
              </div>

              {otherLevels.length > 0 && (
                <div className="levels-grid-bottom levels-dock">
                  {otherLevels.map(level => (
                    <article
                      key={level.id}
                      className="level-card-bottom"
                      onClick={() => handleLevelClick(String(level.level))}
                    >
                      <div className="level-card__icon">
                        <span className="level-bubble__emoji">{level.emoji || '??'}</span>
                      </div>
                      <h4 className="level-card__title">{level.title}</h4>
                      <div className="level-card__subtitle">{String(level.level)}</div>
                    </article>
                  ))}
                </div>
              )}

              {SHOW_RELATED && (() => {
                // Похожие значки (уровневый экран): используем ту же логику, что и на экране значка
                const TOPICS: Record<string, string[]> = {
                  'ИИ/Медиа': [' ии', 'нейросет', 'chatgpt', 'чатgpt', 'midjourney', 'stable', 'изображен', 'видео', 'монтаж', 'аудио', 'подкаст', 'канал', 'пост', 'статья', 'контент', 'медиа'],
                  'Творчество/Сцена': ['сцена', 'концерт', 'музык', 'танц', 'театр', 'песня', 'рису', 'жюри', 'выступ', 'шоу', 'творч'],
                  'Организация/Лидерство': ['организ', 'лидер', 'ведущ', 'отряд', 'план', 'ответствен', 'инициатив', 'координац', 'расписан'],
                  'Команда/Коммуникации': ['команд', 'общен', 'коммуник', 'конфликт', 'договор', 'дружб', 'уважен', 'вежлив', 'помощ', 'вовлеч', 'модерац', 'обратн'],
                  'Порядок/Быт': ['уборк', 'поряд', 'чист', 'уют', 'зона', 'декор', 'гармони', 'распорядок'],
                  'Осознанность/Психо': ['осознан', 'внимател', 'эмоци', 'настроен', 'стресс', 'спокойств', 'фокус', 'медита', 'рефлекс'],
                };
                const textOf = (b: Badge | null | undefined): string => {
                  if (!b) return '';
                  const anyB = b as any;
                  return [anyB.description, anyB.importance, anyB.skillTips, anyB.examples, anyB.howToBecome]
                    .map((v) => (typeof v === 'string' ? v : ''))
                    .join('\n');
                };
                const topicsFor = (txt: string): string[] => {
                  const tset = new Set<string>();
                  const low = ` ${txt.toLowerCase()} `;
                  Object.entries(TOPICS).forEach(([t, keys]) => {
                    if (keys.some((k) => low.includes(k))) tset.add(t);
                  });
                  return Array.from(tset);
                };
                const baseKey = (id: string) => {
                  const parts = (id || '').split('.');
                  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : id;
                };
                const sameGroup = (a: string, b: string) => baseKey(a) === baseKey(b);
                const pickBase = (list: Badge[]): Badge => {
                  const found = list.find((x) => (x.level || '').toLowerCase().includes('базовый'));
                  return found || list.sort((a, b) => (a.id || '').localeCompare(b.id || ''))[0];
                };
                const grouped: Record<string, Badge[]> = {};
                badges.forEach((b) => {
                  const key = baseKey(b.id);
                  (grouped[key] ||= []).push(b);
                });
                 const representatives = Object.entries(grouped).map(([, list]) => pickBase(list));
                const currentTopics = new Set(topicsFor(textOf(levelBadge)));
                if (currentTopics.size === 0) return null;
                type Scored = { badge: Badge; score: number };
                const scored: Scored[] = [];
                for (const rb of representatives) {
                  if (sameGroup(rb.id, levelBadge.id)) continue;
                  if (rb.category_id === levelBadge.category_id) continue;
                  const t = new Set(topicsFor(textOf(rb)));
                  let overlap = 0;
                  t.forEach((x) => { if (currentTopics.has(x)) overlap++; });
                  if (overlap > 0) scored.push({ badge: rb, score: overlap });
                }
                scored.sort((a, b) => b.score - a.score || a.badge.title.localeCompare(b.badge.title));
                const related = scored.slice(0, 6).map((s) => s.badge);
                if (related.length === 0) return null;
                return (
                  <div className="levels-grid-bottom levels-dock">
                    {related.map((rb) => (
                      <article key={rb.id} className="level-card-bottom" onClick={() => handleBadgeClick(rb)} title={categoryTitleById(rb.category_id)}>
                        <div className="level-card__icon">
                          <span className="level-bubble__emoji">{rb.emoji || '🏅'}</span>
                        </div>
                        <h4 className="level-card__title">{rb.title}</h4>
                        <div className="level-card__subtitle">{categoryTitleById(rb.category_id)}</div>
                      </article>
                    ))}
                  </div>
                );
              })()}
             </div>
           </section>
         </div>
       </div>
     );
   };

  // Используем новые компоненты как основные (убрали режим v2)
  if (loading) {
    return (
      <>
        <BluenestGlobalStyles />
        <div className="app">
          <BlueNestLanding
            onStartClick={handleIntroClick}
            onLogoClick={handleLogoClick}
            onAboutCampClick={() => setCurrentView('about-camp')}
            onChatToggle={toggleChat}
            isChatOpen={isChatOpen}
            onChatClose={closeChat}
            currentView={currentView}
            selectedCategory={selectedCategory ? {
              id: selectedCategory.id,
              title: selectedCategory.title,
              emoji: selectedCategory.emoji
            } : undefined}
            selectedBadge={selectedBadge ? {
              id: selectedBadge.id,
              title: selectedBadge.title,
              emoji: selectedBadge.emoji,
              categoryId: selectedBadge.category_id
            } : undefined}
            selectedLevel={selectedLevel || undefined}
            currentLevelBadgeTitle={currentLevelBadgeTitle}
          />
        </div>
      </>
    );
  }
  
  // ЭКРАН: Introduction
  const renderIntroduction = () => {
    if (!selectedCategory?.introduction?.has_introduction) return null;
    
    const cleanedHtml = cleanHtmlContent(selectedCategory.introduction.html);
    
    return (
      <div className="introduction-screen">
        <div className="header">
          <button onClick={handleBackToCategoryFromIntroduction} className="back-button">
            ← Назад к категории
          </button>
          <h1 className="heading-gold">💡 Подсказка: {selectedCategory.title}</h1>
        </div>
        <div className="introduction-content">
          <div 
            className="introduction-text"
            dangerouslySetInnerHTML={{ __html: cleanedHtml }}
          />
        </div>
      </div>
    );
  };

  // ЭКРАН: О лагере
  const renderAboutCamp = () => (
    <div className="about-camp-screen">
      <div className="header">
        <button onClick={handleBackToIntro} className="back-button">
          ← Назад к главной
        </button>
        <h1 className="heading-gold heading-neon">🌟 Реальный Лагерь</h1>
      </div>
      <div className="about-camp-content">
        <div className="camp-description">
          <h2>🚀 Реальный Лагерь — развиваем навыки будущего!</h2>
          <p>
            За смену подростки получают навыки и опыт, которые будут полезны далеко за пределами лагеря и школы: 
            <strong>лидерство, креативность, коммуникативность, работа с ИИ и умение работать в команде.</strong>
          </p>
          <p>
            <strong>7 событий в день</strong> — от создания музыки с нейросетями до организации собственных мероприятий и душевных вечеров с песнями под гитару и скрипку. 
            Ваш ребёнок вернётся домой <strong>с новым взглядом на себя и мир.</strong>
          </p>
          
          <h3>🎯 Что мы развиваем</h3>
          <div className="benefits-grid">
                            <div className="benefit-item clickable" style={{
                  background: 
                    'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("/RL-Guide-book/skills_4k.png") center/cover no-repeat',
                  cursor: 'pointer'
                }} onClick={() => {
                  const category = categories.find(c => c.id === "13");
                  if (category) {
                    handleCategoryClick(category);
                  }
                }}>
                  <h4 style={{
                    color: '#FFD700',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                    fontWeight: 'bold'
                  }}>🧩 Навыки 4K</h4>
                  <p style={{
                    color: '#fff',
                    fontWeight: '600',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                  }}>
                    🎨 Креативность<br/>
                    💬 Коммуникация<br/>
                    🤝 Коллаборация<br/>
                    🧠 Критическое мышление
                  </p>
                </div>
            <div className="benefit-item clickable" style={{
              background: 
                'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("/RL-Guide-book/ai_camp.png") center/cover no-repeat',
              cursor: 'pointer'
            }} onClick={() => {
              const category = categories.find(c => c.id === "12");
              if (category) {
                handleCategoryClick(category);
              }
            }}>
              <h4 style={{
                color: '#FFD700',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                fontWeight: 'bold'
              }}>✨Нейролагерь – нейросети для детей</h4>
              <p style={{
                color: '#fff',
                fontWeight: '600',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
              }}>Изучаем нейросети как инструмент для обучения, творчества, проектной деятельности, создания стратегий.</p>
            </div>
            <div className="benefit-item clickable" style={{
              background: 
                'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("/RL-Guide-book/co_management.png") center/cover no-repeat',
              cursor: 'pointer'
            }} onClick={() => {
              const category = categories.find(c => c.id === "9");
              if (category) {
                handleCategoryClick(category);
              }
            }}>
              <h4 style={{
                color: '#FFD700',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                fontWeight: 'bold'
              }}>🔥 Соуправление и лидерские качества</h4>
              <p style={{
                color: '#fff',
                fontWeight: '600',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
              }}>Организация мероприятий, помощь другим, ответственность — качества настоящего лидера</p>
            </div>
          </div>



          <h3>📸 Как это выглядит на практике</h3>
          <div className="posts-section">
            <a href="https://vk.com/wall-57701087_9100" target="_blank" rel="noopener noreferrer" className="post-link">
              <div className="post-image">
                <img src="/RL-Guide-book/pictures/Wr8s1lqBl95mo9__Pw4CSouLulbnCQRdCt31tWGcKWGlLmXRD60QviGdQG1ASrS3KkfW4t6wFumMhG4myCTZEaKT.jpg" alt="Пост 1" />
              </div>
              <div className="post-title">
                <div className="post-main-title">🔥 Вожатские кейсы и педагогика</div>
                <div className="post-subtitle">Разбор сложных ситуаций: от ночных посиделок до буллинга</div>
                <div className="post-highlights">
                  <span className="highlight">💡 Практические навыки</span>
                  <span className="highlight">🎭 Ролевые игры</span>
                  <span className="highlight">🚀 Значок "Реальный Фасилитатор"</span>
                </div>
              </div>
            </a>
            <a href="https://vk.com/wall-57701087_9080" target="_blank" rel="noopener noreferrer" className="post-link">
              <div className="post-image">
                <img src="/RL-Guide-book/pictures/HvRgNN4EUqGaVKKmQYwOnSESzm3zhN8NLN7psGe2xTbuscFg5h0oIIxbtlYIkCIO1zj2TUQYoFAKy9pYquEpfGrR.jpg" alt="Пост 2" />
              </div>
              <div className="post-title">
                <div className="post-main-title">🚀 Дети сами организуют отрядные дела!</div>
                <div className="post-subtitle">Игра "Бросвящение": от кинематографа до оригами</div>
                <div className="post-highlights">
                  <span className="highlight">🎬 Игра по станциям</span>
                  <span className="highlight">🎨 Мастер-классы</span>
                  <span className="highlight">🔥 Лидерство</span>
                </div>
              </div>
            </a>
            <a href="https://vk.com/wall-57701087_9072" target="_blank" rel="noopener noreferrer" className="post-link">
              <div className="post-image">
                <img src="/RL-Guide-book/pictures/wa1Ma_l5j4S2gV8sBeNLTw0cftt3WLplAEvXI9RW-qd5-uWJCslMqRRXGcFhKFEIr0Ck2teKZBiFzyRIeMfWLiLE.jpg" alt="Пост 3" />
              </div>
              <div className="post-title">
                <div className="post-main-title">🎨 Нейродизайн и агентные системы</div>
                <div className="post-subtitle">От идеи до реального значка: Genspark, FLUX, ChatGPT</div>
                <div className="post-highlights">
                  <span className="highlight">🤖 Итерационный подход</span>
                  <span className="highlight">🎯 Реальные продукты</span>
                  <span className="highlight">🧠 Метапромтинг</span>
                </div>
              </div>
            </a>
            <a href="https://vk.com/wall-57701087_9049" target="_blank" rel="noopener noreferrer" className="post-link">
              <div className="post-image">
                <img src="/RL-Guide-book/pictures/2025-09-11_05-28-13.png" alt="Пост 4" />
              </div>
              <div className="post-title">
                <div className="post-main-title">🏴‍☠️ Пираты похитили Бурыча!</div>
                <div className="post-subtitle">Форт Боярд в лагере: эстафеты, головоломки, спасение</div>
                <div className="post-highlights">
                  <span className="highlight">⚔️ Командные испытания</span>
                  <span className="highlight">🧩 Головоломки</span>
                  <span className="highlight">🎯 Форт Боярд</span>
                </div>
              </div>
            </a>
            <a href="https://vk.com/wall-57701087_9009" target="_blank" rel="noopener noreferrer" className="post-link">
              <div className="post-image">
                <img src="/RL-Guide-book/pictures/4pCDWvEw_uyf3q8yQbhfsPpfDSVOMYkkexIZCudbxTsmqN8iA3jIT8TwpNtXbGliD_YCpD2nZhQZXajz4-0KFg-1.jpg" alt="Пост 5" />
              </div>
              <div className="post-title">
                <div className="post-main-title">🎶 Музыкальный продюсер с Suno AI</div>
                <div className="post-subtitle">От текста до готового трека: творчество без границ</div>
                <div className="post-highlights">
                  <span className="highlight">🎹 Создание треков</span>
                  <span className="highlight">🎤 Запись голоса</span>
                  <span className="highlight">🎵 Значок "AI-Композитор"</span>
                </div>
              </div>
            </a>
            <a href="https://vk.com/wall-57701087_9006" target="_blank" rel="noopener noreferrer" className="post-link">
              <div className="post-image">
                <img src="/RL-Guide-book/pictures/w38A7umTNl1ECHO8HtrN9KRFmpwNLoCd19DGmO1qdPcLBENPbYsFQuzJOoDej_zxEcHDnRvDGUayZgs1mOMSkam3.jpg" alt="Пост 6" />
              </div>
              <div className="post-title">
                <div className="post-main-title">🥊 Мастер-класс по самообороне</div>
                <div className="post-subtitle">С Тимофеем: ценные уроки и невероятная атмосфера</div>
                <div className="post-highlights">
                  <span className="highlight">🥊 Самооборона</span>
                  <span className="highlight">🌟 Мастерство</span>
                  <span className="highlight">🙌 Ценные уроки</span>
                </div>
              </div>
            </a>
            <a href="https://vk.com/wall-57701087_8995" target="_blank" rel="noopener noreferrer" className="post-link">
              <div className="post-image">
                <img src="/RL-Guide-book/pictures/2025-09-11_05-25-15.png" alt="Пост 7" />
              </div>
              <div className="post-title">
                <div className="post-main-title">🕯️ Огонёк откровений</div>
                <div className="post-subtitle">Безопасное пространство для открытого общения</div>
                <div className="post-highlights">
                  <span className="highlight">🫂 Принятие</span>
                  <span className="highlight">🎯 Доверие</span>
                  <span className="highlight">🏡 Семейные отношения</span>
                </div>
              </div>
            </a>
            <a href="https://vk.com/wall-57701087_8994" target="_blank" rel="noopener noreferrer" className="post-link">
              <div className="post-image">
                <img src="/RL-Guide-book/pictures/vKjyH96aNgNYbg14n545f0j1tZqG12tBI3L83kyz-8ofHa9DnmG-p41grb0hrbwUoNGteh0fdssSerJNH2GXffZN.jpg" alt="Пост 8" />
              </div>
              <div className="post-title">
                <div className="post-main-title">🚀 EggX: лётно-конструкторские испытания</div>
                <div className="post-subtitle">Инженерный челлендж: яйцелёты с высоты 3 метров</div>
                <div className="post-highlights">
                  <span className="highlight">🧪 Конструкторские бюро</span>
                  <span className="highlight">🔬 Техническая смекалка</span>
                  <span className="highlight">👨‍🚀 Командная работа</span>
                </div>
              </div>
            </a>
            <a href="https://vk.com/wall-57701087_8927" target="_blank" rel="noopener noreferrer" className="post-link">
              <div className="post-image">
                <img src="/RL-Guide-book/pictures/2025-09-11_05-21-21.png" alt="Пост 9" />
              </div>
              <div className="post-title">
                <div className="post-main-title">😎 Сигма-Бро в Реальном Лагере</div>
                <div className="post-subtitle">Лето, Soft Skills, нейросети и добро круглый год</div>
                <div className="post-highlights">
                  <span className="highlight">☀️ Родительский час</span>
                  <span className="highlight">💜 Атмосфера</span>
                  <span className="highlight">🌟 Воспоминания</span>
                </div>
              </div>
            </a>
          </div>

          <h3>💬 Отзывы родителей</h3>
          <div className="reviews-section">
            <div className="reviews-container">
              <div className="reviews-image">
                <div className="reviews-content">
                  <h4>🌟 Что говорят родители о Реальном Лагере</h4>
                  <p>Читайте реальные отзывы родителей, чьи дети уже побывали в нашем лагере и получили незабываемые впечатления!</p>
                  <a href="https://vk.com/realcampspb?from=groups&ref=group_menu&w=app6326142_-57701087" target="_blank" rel="noopener noreferrer" className="reviews-button">
                    📖 Читать отзывы
                  </a>
                </div>
              </div>
            </div>
          </div>

          <h3>🔗 Полезные ссылки</h3>
          <div className="links-section">
            <a href="https://realcampspb.ru" target="_blank" rel="noopener noreferrer" className="camp-link">
              🌐 Официальный сайт: realcampspb.ru
            </a>
            <a href="https://vk.com/realcampspb" target="_blank" rel="noopener noreferrer" className="camp-link">
              📱 ВКонтакте: vk.com/realcampspb - блог лагеря
            </a>
            <a href="https://zen.yandex.ru/realcamp" target="_blank" rel="noopener noreferrer" className="camp-link">
              📝 Наш блог в Яндекс.Дзен: zen.yandex.ru/realcamp
            </a>
            <a href="https://www.coo-molod.ru/" target="_blank" rel="noopener noreferrer" className="camp-link">
              🏛️ Сертификаты: coo-molod.ru
            </a>
          </div>

          <h3>📅 ОСЕННЯЯ СМЕНА 2025</h3>
          <div
            className="session-info session-info--cta clickable cursor-pointer"
            onClick={handleTelegramContact}
          >
            <h4>🎪 "Осенний 4К-вайб в Реальном Лагере: навыки будущего + нейросети для обучения и творчества"</h4>
            <p><strong>Когда:</strong> с 25 октября по 2 ноября 2025 года</p>
            <p><strong>Стоимость:</strong></p>
            <ul>
              <li>30 500 ₽ — со скидкой по сертификату СПб</li>
              <li>35 500 ₽ — полная стоимость</li>
            </ul>
            <p><em>Читайте отзывы родителей в нашей группе ВКонтакте!</em></p>
          </div>
        </div>
      </div>
    </div>
  );

  // ЭКРАН: Additional Material
  const renderAdditionalMaterial = () => {
    if (!selectedAdditionalMaterial) return null;
    
    const cleanedHtml = cleanHtmlContent(selectedAdditionalMaterial.content);
    
    return (
      <div className="additional-material-screen">
        <div className="header">
          <button onClick={handleBackToCategoryFromAdditional} className="back-button">
            ← Назад к категории
          </button>
          <h1 className="heading-gold">{selectedAdditionalMaterial.title}</h1>
        </div>
        <div className="additional-material-content">
          <div 
            className="additional-material-text"
            dangerouslySetInnerHTML={{ __html: cleanedHtml }}
          />
        </div>
      </div>
    );
  };

  // ЭКРАН: Registration Form
  const renderRegistrationForm = () => {
    return (
      <div className="registration-form-screen">
        <div className="header">
          <button onClick={handleBackToAboutCamp} className="back-button">
            ← Назад
          </button>
          <h1 className="heading-gold">
            🎪 Запись на осеннюю смену
          </h1>
        </div>
        
        <div className="registration-form-content">
          <div className="form-container">
            <h2>📝 Заполните форму для записи</h2>
            <p>Мы свяжемся с вами в течение дня для подтверждения записи</p>
            
            <div className="form-group">
              <label>👶 Имя ребёнка *</label>
              <input
                type="text"
                value={formData.childName}
                onChange={(e) => handleFormInputChange('childName', e.target.value)}
                placeholder="Введите имя ребёнка"
                required
              />
            </div>
            
            <div className="form-group">
              <label>👨‍👩‍👧‍👦 Имя родителя *</label>
              <input
                type="text"
                value={formData.parentName}
                onChange={(e) => handleFormInputChange('parentName', e.target.value)}
                placeholder="Введите ваше имя"
                required
              />
            </div>
            
            <div className="form-group">
              <label>📞 Телефон *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleFormInputChange('phone', e.target.value)}
                placeholder="+7 (999) 123-45-67"
                required
              />
            </div>
            
            <div className="form-group">
              <label>📧 Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleFormInputChange('email', e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            
            <div className="form-group">
              <label>🎂 Возраст ребёнка *</label>
              <input
                type="number"
                value={formData.childAge}
                onChange={(e) => handleFormInputChange('childAge', e.target.value)}
                placeholder="8"
                min="6"
                max="17"
                required
              />
            </div>
            
            <div className="form-group">
              <label>💭 Особые пожелания</label>
              <textarea
                value={formData.specialRequests}
                onChange={(e) => handleFormInputChange('specialRequests', e.target.value)}
                placeholder="Аллергии, особенности питания, медицинские показания..."
                rows={3}
              />
            </div>
            
            <button 
              className="submit-button"
              onClick={handleFormSubmit}
              disabled={!formData.childName || !formData.parentName || !formData.phone || !formData.childAge}
            >
              🚀 Отправить заявку в Telegram
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Определяем, нужны ли старые стили (AppStyles) или новые (BluenestGlobalStyles)
  const needsOldStyles = ['category', 'badge', 'badge-level', 'introduction', 'additional-material', 'about-camp', 'registration-form'].includes(currentView);
  const needsNewStyles = ['intro', 'categories'].includes(currentView);
  
  return (
    <>
      {needsOldStyles && <AppStyles />}
      {needsNewStyles && <BluenestGlobalStyles />}
      <div className="app">
        {currentView === 'intro' && (
          <BlueNestLanding
            onStartClick={handleIntroClick}
            onLogoClick={handleLogoClick}
            onAboutCampClick={() => setCurrentView('about-camp')}
            onChatToggle={toggleChat}
            isChatOpen={isChatOpen}
            onChatClose={closeChat}
            currentView={currentView}
            selectedCategory={selectedCategory ? {
              id: selectedCategory.id,
              title: selectedCategory.title,
              emoji: selectedCategory.emoji
            } : undefined}
            selectedBadge={selectedBadge ? {
              id: selectedBadge.id,
              title: selectedBadge.title,
              emoji: selectedBadge.emoji,
              categoryId: selectedBadge.category_id
            } : undefined}
            selectedLevel={selectedLevel || undefined}
            currentLevelBadgeTitle={currentLevelBadgeTitle}
          />
        )}
        {currentView === 'categories' && (
          <CategoriesGrid
            categories={sortedCategories}
            onCategoryClick={handleCategoryClick}
            onBackClick={() => setCurrentView('intro')}
            onAboutCampClick={() => setCurrentView('about-camp')}
            onChatToggle={toggleChat}
            isChatOpen={isChatOpen}
            onChatClose={closeChat}
            currentView={currentView}
            selectedCategory={selectedCategory ? {
              id: selectedCategory.id,
              title: selectedCategory.title,
              emoji: selectedCategory.emoji
            } : undefined}
            selectedBadge={selectedBadge ? {
              id: selectedBadge.id,
              title: selectedBadge.title,
              emoji: selectedBadge.emoji,
              categoryId: selectedBadge.category_id
            } : undefined}
            selectedLevel={selectedLevel || undefined}
            currentLevelBadgeTitle={currentLevelBadgeTitle}
          />
        )}
        {currentView === 'category' && renderCategory()}
        {currentView === 'badge' && renderBadge()}
        {currentView === 'badge-level' && renderBadgeLevel()}
        {currentView === 'introduction' && renderIntroduction()}
        {currentView === 'additional-material' && renderAdditionalMaterial()}
        {currentView === 'about-camp' && renderAboutCamp()}
        {currentView === 'registration-form' && renderRegistrationForm()}
        
        {/* ChatBot and ChatAvatar are handled inside BlueNestLanding and CategoriesGrid */}
      </div>
    </>
  );
};

export default App;
