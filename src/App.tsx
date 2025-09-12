import React, { useState, useEffect } from 'react';
import ChatBot from './components/ChatBot';
import ChatButton from './components/ChatButton';
import { 
  pluralizeRu, 
  fixDescriptionFormatting, 
  fixCriteriaFormatting, 
  extractEvidenceSection,
  shouldApplyFormatting
} from './utils/textFormatting';

// Normalize level values coming from AI data
const canonicalizeLevel = (lvl: unknown): string => {
  const raw = String(lvl ?? '').trim();
  if (!raw) return '';
  const low = raw.toLowerCase();
  if (low === '1' || low === 'базовый' || low === 'базовый уровень') return 'Базовый уровень';
  if (low === '2' || low === 'продвинутый' || low === 'продвинутый уровень') return 'Продвинутый уровень';
  if (low === '3' || low === 'экспертный' || low === 'экспертный уровень' || low === 'вожатский' || low === 'вожатский уровень') return 'Экспертный уровень';
  return raw;
};

// Split-safe badge id helpers
const splitId = (id: string | undefined | null): string[] => String(id ?? '').split('.');
const sameBaseTwoSegments = (a: string, b: string): boolean => {
  const as = splitId(a);
  const bs = splitId(b);
  return as.length >= 2 && bs.length >= 2 && as[0] === bs[0] && as[1] === bs[1];
};

// Fallback emoji mapping for categories when AI data lacks proper emojis
const getFallbackEmojiFor = (categoryId: string, _title?: string): string => {
  switch (categoryId) {
    case '12': // ИИ
      return '🤖';
    case '11': // Инспектор пользы
      return '🕵️';
    case '14': // Лидерство / Бро-движения
      return '⭐';
    default:
      return '✨';
  }
};

// Function to get category icon (emoji or image)
const getCategoryIcon = (categoryId: string): string | JSX.Element => {
  switch (categoryId) {
    case '1': // Категория 1
      return <img 
        className="category-1-icon"
        src="/category_1.png" 
        alt="Категория 1" 
      />;
    case '2': // Категория 2
      return <img 
        className="category-2-icon"
        src="/category_2.png" 
        alt="Категория 2" 
      />;
    case '3': // Категория 3
      return <img 
        className="category-3-icon"
        src="/category_3.png" 
        alt="Категория 3" 
      />;
    case '4': // Категория 4
      return <img 
        className="category-4-icon"
        src="/category_4.png" 
        alt="Категория 4" 
      />;
    case '5': // Категория 5
      return <img 
        className="category-5-icon"
        src="/category_5.png" 
        alt="Категория 5" 
      />;
    case '6': // Категория 6
      return <img 
        className="category-6-icon"
        src="/category_6.png" 
        alt="Категория 6" 
      />;
    case '7': // Категория 7
      return <img 
        className="category-7-icon"
        src="/category_7.png" 
        alt="Категория 7" 
      />;
    case '8': // Категория 8
      return <img 
        className="category-8-icon"
        src="/category_8.png" 
        alt="Категория 8" 
      />;
    case '9': // Категория 9
      return <img 
        className="category-9-icon"
        src="/category_9.png" 
        alt="Категория 9" 
      />;
    case '10': // Категория 10
      return <img 
        className="category-10-icon"
        src="/category_10.png" 
        alt="Категория 10" 
      />;
    case '11': // Категория 11
      return <img 
        className="category-11-icon"
        src="/category_11.png" 
        alt="Категория 11" 
      />;
    case '12': // ИИ
      return <img 
        className="category-12-icon"
        src="/category_12.png" 
        alt="ИИ" 
      />;
    case '13': // Категория 13
      return <img 
        className="category-13-icon"
        src="/category_13.png" 
        alt="Категория 13" 
      />;
    case '14': // Категория 14
      return <img 
        className="category-14-icon"
        src="/category_14.png" 
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

interface Category {
  id: string;
  title: string;
  emoji?: string;
  badge_count: number;
  expected_badges: number;
  description?: string;
  introduction?: {
    markdown: string;
    html: string;
    has_introduction: boolean;
  };
  additional_materials?: {
    checklists?: {
      [key: string]: {
        title: string;
        markdown: string;
        html: string;
      };
    };
    methodology?: {
      [key: string]: {
        title: string;
        markdown: string;
        html: string;
      };
    };
  };
}

interface Badge {
  id: string;
  title: string;
  emoji: string;
  category_id: string;
  level: string;
  description?: string;
  criteria?: string;
  confirmation?: string;
  nameExplanation?: string; // Объяснение названия значка
  skillTips?: string; // Как прокачать навык
  examples?: string; // Примеры идей/достижений
  importance?: string; // Почему этот значок важен
  philosophy?: string; // Философия значка
  howToBecome?: string; // Как стать...
}

type View = 'intro' | 'categories' | 'category' | 'badge' | 'badge-level' | 'introduction' | 'additional-material' | 'about-camp' | 'registration-form';

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [currentView, setCurrentView] = useState<View>('intro');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedAdditionalMaterial, setSelectedAdditionalMaterial] = useState<{
    type: 'checklists' | 'methodology';
    key: string;
    title: string;
    content: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    childName: '',
    parentName: '',
    phone: '',
    email: '',
    childAge: '',
    specialRequests: ''
  });


  // Загружаем данные при монтировании
  useEffect(() => {
    console.log('App: Component mounted, loading data');
    loadDataFromAi();
  }, []);

  // very small markdown to html (headings, lists, paragraphs, bold/italics)
  const markdownToHtml = (md: string): string => {
    if (!md) return '';

    // Normalize new lines
    let html = md.replace(/\r\n?/g, '\n');

    // Headings (support # to ######)
    html = html
      .replace(/^(#{1,6})\s+(.+)$/gm, (_m, hashes: string, text: string) => {
        const level = Math.min(6, Math.max(1, hashes.length));
        return `<h${level}>${text}<\/h${level}>`;
      })
      // Simple lists
      .replace(/^\*\s+(.*)$/gim, '<li>$1<\/li>')
      .replace(/^\-\s+(.*)$/gim, '<li>$1<\/li>')
      // Ordered list items like `1. text`
      .replace(/^\d+\.\s+(.*)$/gim, '<li>$1<\/li>')
      // Horizontal rule
      .replace(/^\s*---\s*$/gm, '<hr>')
      // Blockquote lines starting with `>`
      .replace(/^>\s+(.*)$/gm, '<blockquote>$1<\/blockquote>');

    // Inline formatting: bold and italics
    // Bold first to avoid interfering with italics
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1<\/strong>');
    // Italic: avoid matching list markers and bold
    html = html.replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2<\/em>');

    // Wrap plain lines to <p>
    html = html
      .split('\n')
      .map((line) => /<\/?(h\d|li|ul|ol|p|blockquote|pre|code|strong|em|hr)>/i.test(line) || /<\/li>/.test(line)
        ? line
        : (line.trim() ? `<p>${line}<\/p>` : ''))
      .join('\n');

    // Group list items into <ul> blocks (naive but sufficient for our simple md)
    html = html
      // Group list items into a single unordered list block (simple heuristic)
      .replace(/(<p><li>)/g, '<ul><li>')
      .replace(/<\/li><\/p>(\n?<p><li>)/g, '<\/li>$1')
      .replace(/<\/li><\/p>/g, '<\/li><\/ul>');

    return html;
  };


  const loadCategoryIntroduction = async (categoryId: string) => {
    try {
      const res = await fetch(`/ai-data/category-${categoryId}/introduction.md`);
      if (!res.ok) return;
      const md = await res.text();
      const html = markdownToHtml(md);
      const cleaned = cleanHtmlContent(html);
      setSelectedCategory(prev => prev && prev.id === categoryId
        ? ({ ...prev, introduction: { has_introduction: true, html: cleaned, markdown: '' } })
        : prev);
    } catch (e) {
      console.error('App: failed to load introduction.md for category', categoryId, e);
    }
  };

  const loadDataFromAi = async () => {
    try {
      console.log('App: Loading AI data...');
      setLoading(true);
      const masterRes = await fetch('/ai-data/MASTER_INDEX.json');
      const master = await masterRes.json();

      const categoriesData: any[] = [];
      const badgesData: any[] = [];

      for (const aiCategory of master.categories) {
        const idxRes = await fetch(`/ai-data/${aiCategory.path}index.json`);
        const catIndex = await idxRes.json();

        categoriesData.push({
          id: aiCategory.id,
          title: aiCategory.title,
          emoji: aiCategory.emoji,
          badge_count: catIndex.levels || catIndex.totalLevels || aiCategory.badges,
          expected_badges: catIndex.levels || catIndex.totalLevels || aiCategory.badges,
          introduction: { has_introduction: true, html: '' },
          additional_materials: catIndex.additional_materials
        });


        for (const badgeIndex of (catIndex.badgesData || [])) {
          const badgeRes = await fetch(`/ai-data/${aiCategory.path}${badgeIndex.id}.json`);
          const aiBadge = await badgeRes.json();

          if (aiBadge.levels && aiBadge.levels.length) {
            for (const level of aiBadge.levels) {
                const rawCriteria = (level as any).criteria as unknown;
                const rawConfirmation = (level as any).confirmation as unknown;
                const criteriaText = Array.isArray(rawCriteria)
                  ? (rawCriteria as any[]).map((s) => String(s).trim()).filter(Boolean).map((s) => `• ${s}`).join('\n')
                  : (rawCriteria as string) || '';
                const confirmationText = Array.isArray(rawConfirmation)
                  ? (rawConfirmation as any[]).map((s) => String(s).trim()).filter(Boolean).map((s) => `• ${s}`).join('\n')
                  : (rawConfirmation as string) || '';
              badgesData.push({
                id: (level as any).id,
                title: aiBadge.title,
                emoji: ((typeof ((level as any).emoji ?? aiBadge.emoji) === 'string' && (((level as any).emoji ?? aiBadge.emoji).replace(/\?/g, '').trim().length > 0)) ? ((level as any).emoji ?? aiBadge.emoji) : getFallbackEmojiFor(aiCategory.id, aiBadge.title)),
                category_id: aiCategory.id,
                  level: canonicalizeLevel((level as any).level ?? level),
                description: aiBadge.description,
                  criteria: criteriaText,
                  confirmation: confirmationText,
                nameExplanation: aiBadge.nameExplanation,
                skillTips: aiBadge.skillTips,
                examples: aiBadge.examples,
                importance: aiBadge.importance,
                philosophy: aiBadge.philosophy,
                howToBecome: aiBadge.howToBecome
              });
            }
          } else {
              const rawCriteria = (aiBadge as any).criteria as unknown;
              const rawConfirmation = (aiBadge as any).confirmation as unknown;
              const criteriaText = Array.isArray(rawCriteria)
                ? (rawCriteria as any[]).map((s) => String(s).trim()).filter(Boolean).map((s) => `• ${s}`).join('\n')
                : (rawCriteria as string) || '';
              const confirmationText = Array.isArray(rawConfirmation)
                ? (rawConfirmation as any[]).map((s) => String(s).trim()).filter(Boolean).map((s) => `• ${s}`).join('\n')
                : (rawConfirmation as string) || '';
            badgesData.push({
              id: aiBadge.id,
              title: aiBadge.title,
              emoji: ((typeof aiBadge.emoji === 'string' && aiBadge.emoji.replace(/\?/g, '').trim().length > 0) ? aiBadge.emoji : getFallbackEmojiFor(aiCategory.id, aiBadge.title)),
              category_id: aiCategory.id,
              level: 'Описание',
              description: aiBadge.description,
                criteria: criteriaText,
                confirmation: confirmationText,
              nameExplanation: aiBadge.nameExplanation,
              skillTips: aiBadge.skillTips,
              examples: aiBadge.examples,
              importance: aiBadge.importance,
              philosophy: aiBadge.philosophy,
              howToBecome: aiBadge.howToBecome
            });
          }
        }
      }

      setCategories(categoriesData);
      setBadges(badgesData);
      console.log('App: AI data loaded:', categoriesData.length, 'categories,', badgesData.length, 'badges');
    } catch (e) {
      console.error('App: Error loading AI data', e);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      console.log('App: Loading data...');
      setLoading(true);
      
      // Используем встроенные данные категорий с правильным количеством уровней
      const categoriesData = [
        { id: '1', title: 'За личные достижения', badge_count: 38, expected_badges: 38 },
        { id: '2', title: 'За легендарные дела', badge_count: 9, expected_badges: 9 },
        { id: '3', title: 'Медиа значки', badge_count: 9, expected_badges: 9 },
        { id: '4', title: 'За лагерные дела', badge_count: 10, expected_badges: 10 },
        { id: '5', title: 'За отрядные дела', badge_count: 20, expected_badges: 20 },
        { id: '6', title: 'Гармония и порядок', badge_count: 12, expected_badges: 12 },
        { id: '7', title: 'За творческие достижения', badge_count: 24, expected_badges: 24 },
        { id: '8', title: 'Значки Движков', badge_count: 9, expected_badges: 9 },
        { id: '9', title: 'Значки Бро – Движения', badge_count: 10, expected_badges: 10 },
        { id: '10', title: 'Значки на флаг отряда', badge_count: 3, expected_badges: 3 },
        { id: '11', title: 'Реальность: осознанность и внимательность', badge_count: 16, expected_badges: 16 },
        { id: '12', title: 'ИИ: нейросети для обучения и творчества', badge_count: 35, expected_badges: 35 },
        { id: '13', title: 'Софт-скиллз интенсив — развитие гибких навыков', badge_count: 26, expected_badges: 26 },
        { id: '14', title: 'Значки Инспектора Пользы', badge_count: 19, expected_badges: 19 }
      ];
      
      setCategories(categoriesData);
      setBadges([]);
      console.log('App: Data loaded:', categoriesData.length, 'categories');
      
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      // Fallback данные с правильным количеством уровней
      setCategories([
        { id: '1', title: 'За личные достижения', badge_count: 38, expected_badges: 38 },
        { id: '2', title: 'За легендарные дела', badge_count: 9, expected_badges: 9 },
        { id: '3', title: 'Медиа значки', badge_count: 9, expected_badges: 9 },
        { id: '4', title: 'За лагерные дела', badge_count: 10, expected_badges: 10 },
        { id: '5', title: 'За отрядные дела', badge_count: 20, expected_badges: 20 },
        { id: '6', title: 'Гармония и порядок', badge_count: 12, expected_badges: 12 },
        { id: '7', title: 'За творческие достижения', badge_count: 24, expected_badges: 24 },
        { id: '8', title: 'Значки Движков', badge_count: 9, expected_badges: 9 },
        { id: '9', title: 'Значки Бро – Движения', badge_count: 10, expected_badges: 10 },
        { id: '10', title: 'Значки на флаг отряда', badge_count: 3, expected_badges: 3 },
        { id: '11', title: 'Реальность: осознанность и внимательность', badge_count: 16, expected_badges: 16 },
        { id: '12', title: 'ИИ: нейросети для обучения и творчества', badge_count: 35, expected_badges: 35 },
        { id: '13', title: 'Софт-скиллз интенсив — развитие гибких навыков', badge_count: 26, expected_badges: 26 },
        { id: '14', title: 'Значки Инспектора Пользы', badge_count: 19, expected_badges: 19 }
      ]);
    } finally {
      setLoading(false);
      console.log('App: Loading completed');
    }
  };

  // Prevent TS noUnusedLocals error for legacy helper
  void loadData;
  const handleIntroClick = () => {
    console.log('App: Intro clicked - switching to categories view');
    setCurrentView('categories');
    setSelectedCategory(null);
    setSelectedBadge(null);
    setSelectedLevel('');
  };

  const handleCategoryClick = (category: Category) => {
    console.log('Клик по категории:', category.title);
    setSelectedCategory(category);
    setCurrentView('category');
    setSelectedBadge(null);
    setSelectedLevel('');
    console.log('Установлен currentView:', 'category');
  };

  const handleBadgeClick = (badge: Badge) => {
    console.log('App: Badge clicked:', badge.title);
    // Ensure selectedCategory matches the badge's category for proper navigation/back
    const cat = categories.find((c) => c.id === badge.category_id);
    if (cat) setSelectedCategory(cat);
    setSelectedBadge(badge);
    setCurrentView('badge');
    setSelectedLevel('');
  };

  const handleLevelClick = (level: string) => {
    console.log('App: Level clicked:', level);
    setSelectedLevel(level);
    setCurrentView('badge-level');
  };

  // Helper: get category title by id
  const categoryTitleById = (cid: string): string => {
    const c = categories.find((x) => x.id === cid);
    return c ? c.title : '';
  };

  const handleIntroductionClick = async () => {
    try {
      if (selectedCategory) {
        await loadCategoryIntroduction(selectedCategory.id);
      }
    } finally {
      setCurrentView('introduction');
    }
  };

  const handleTelegramContact = () => {
    setCurrentView('registration-form');
  };

  const handleFormSubmit = () => {
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
  };

  const handleFormInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBackToAboutCamp = () => {
    setCurrentView('about-camp');
  };

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

  // Delegated click handler for CSP-safe interactive links
  const handleInteractiveLinkClick = (e: React.MouseEvent) => {
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
  };


  const handleAdditionalMaterialClick = async (type: 'checklists' | 'methodology', key: string) => {
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
      const primaryPath = `/ai-data/category-${selectedCategory.id}/${type}/${normalizedKey}`;
      let response = await fetch(primaryPath);
      
      // Если файл отсутствует в категории, пробуем стандартную папку категории 14
      if (!response.ok) {
        const fallbackPath = `/ai-data/category-14/${type}/${normalizedKey}`;
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
  };

  const handleBackToCategories = () => {
    console.log('App: Back to categories clicked');
    setCurrentView('categories');
    setSelectedCategory(null);
    setSelectedBadge(null);
    setSelectedLevel('');
  };

  const handleBackToBadge = () => {
    console.log('App: Back to badge clicked');
    setCurrentView('badge');
    setSelectedLevel('');
  };

  const handleBackToIntro = () => {
    setCurrentView('intro');
    setSelectedCategory(null);
    setSelectedBadge(null);
    setSelectedLevel('');
  };

  const handleLogoClick = () => {
    setCurrentView('about-camp');
  };

  const handleBackToCategory = () => {
    console.log('App: Back to category clicked');
    setCurrentView('category');
    setSelectedBadge(null);
    setSelectedLevel('');
    setSelectedAdditionalMaterial(null);
  };

  const handleBackToCategoryFromIntroduction = () => {
    console.log('App: Back to category from introduction clicked');
    setCurrentView('category');
  };

  const handleBackToCategoryFromAdditional = () => {
    console.log('App: Back to category from additional material clicked');
    setCurrentView('category');
    setSelectedAdditionalMaterial(null);
  };



  // ЭКРАН 1: Приветствие
  const renderIntro = () => (
    <div className="intro-screen">
      <div className="intro-logo" onClick={handleLogoClick}>
        <img src="/домик_AI.jpg" alt="Логотип" />
        <div className="logo-hover-text">ОСЕННЯЯ СМЕНА 2025</div>
      </div>
      <div className="intro-content">
        <h1>Путеводитель по Реальному Лагерю</h1>
        <p>
          Добро пожаловать в космическое путешествие по системе значков и достижений!
          Здесь вы найдете 242 значка в 14 категориях.
        </p>
        <div className="philosophy-section">
          <p className="philosophy-main">
            <strong>Значки здесь — не награды, а маршруты развития.</strong>
          </p>
          <p>
            В Реальном Лагере значки — не просто «ачивки» за выполнение заданий. 
            Это путеводные звёзды, которые помогают выбрать твой собственный путь. 
            Каждый значок — не медаль за прошлое, а маяк, освещающий направления твоего развития.
          </p>
          <div className="philosophy-points">
            <div className="point">
              <span className="point-icon">🎯</span>
              <div>
                <strong>Реальный Значок = Опыт.</strong><br/>
                Здесь главная награда — не значок, а опыт и навыки, которые ты получаешь, выполняя задания. 
                Новые друзья, настоящие проекты, полезные привычки и идеи — всё это остаётся с тобой.
              </div>
            </div>
            <div className="point">
              <span className="point-icon">🧭</span>
              <div>
                <strong>Реальный Значок — не награда, а компас.</strong><br/>
                Только ты выбираешь, какие значки будут на твоём пути. Вожатые и Путеводитель предложат варианты, 
                но выбор и движение всегда за тобой.
              </div>
            </div>
          </div>
          <p className="philosophy-ending">
            <strong>🔥 Добро пожаловать в Реальный Лагерь.</strong><br/>
            Выбирай звезду, двигайся вперёд, оставляй след.<br/>
            Твой опыт — твой путь. Реальные Значки подскажут, куда идти.
          </p>
        </div>
        <p className="start-instruction">
          Нажмите кнопку, чтобы начать исследование созвездий значков.
        </p>
        <button onClick={handleIntroClick} className="start-button">
          Начать путешествие
        </button>
      </div>
    </div>
  );

     // ЭКРАН 2: 14 категорий
   const renderCategories = () => {
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
              {categories.slice().sort((a,b) => Number(a.id) - Number(b.id)).map((category, index) => {
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

    // Группируем по базовому ключу (первые две части id)
    const grouped: Record<string, any[]> = {};
    badges.forEach((b) => {
      if (b.category_id !== selectedCategory.id) return;
      const parts = (b.id || '').split('.');
      const baseKey = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : (b.id || '');
      if (!grouped[baseKey]) grouped[baseKey] = [];
      grouped[baseKey].push(b);
    });
    const categoryBadges = Object.values(grouped).map((list: any[]) => {
      const base = list.find(x => (x.level || '').toLowerCase().includes('баз')) || list[0];
      (base as any).allLevels = list.length > 1 ? list.sort((a: any,b: any)=> (a.id||'').localeCompare(b.id||'')) : [];
      return base;
    });

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
    if (!selectedBadge) return null;

    // Все уровни конкретного значка (группируем по префиксу ID, например 1.1.x)
    const idSegments = (selectedBadge.id || '').split('.');
    const isMultiLevel = idSegments.length === 3;
    // const baseKey = isMultiLevel ? idSegments.slice(0, 2).join('.') + '.' : selectedBadge.id;

    const badgeLevels = badges.filter(b => {
      if (b.category_id !== selectedBadge.category_id) return false;
      if (isMultiLevel) {
        // Только уровни выбранного значка: совпадают первые две части ID и всего 3 сегмента
        const seg = (b.id || '').split('.');
        return seg.length === 3 && sameBaseTwoSegments(b.id, selectedBadge.id);
      }
      // Одноуровневый — показываем только сам значок
      return (b.id || '') === (selectedBadge.id || '');
    });

    // Базовый уровень (если есть), для одноуровневых — сам значок
    const baseLevelBadge = isMultiLevel
      ? badgeLevels.find(b => (b.level || '').toLowerCase().includes('базовый')) || null
      : selectedBadge;

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

    // Другие уровни (кружочки)
    const otherLevels = badgeLevels.filter(b => {
      const isBase = baseLevelBadge && b.id === baseLevelBadge.id;
      const isSingle = (b.level || '').toLowerCase().includes('одноуровнев');
      return !isBase && !isSingle;
    });

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
    if (!selectedBadge || !selectedLevel) return null;

          // Ищем значок уровня по ID префиксу и уровню
     const idSegments = (selectedBadge.id || '').split('.');
     const isMultiLevel = idSegments.length === 3;
     const baseKey = isMultiLevel ? idSegments.slice(0, 2).join('.') + '.' : selectedBadge.id;
     
     const levelBadge = badges.find(b => {
       if (b.category_id !== selectedBadge.category_id) return false;
       if (isMultiLevel) {
         return (b.id || '').startsWith(baseKey) && b.level === selectedLevel;
       }
       return b.id === selectedBadge.id && b.level === selectedLevel;
     });

    if (!levelBadge) return null;

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
          return 'url("/экран 5 фон.png")';
        } else if (selectedLevel === 'Экспертный уровень') {
          return 'url("/экран 6 фон.png")';
        }
        return 'url("/экран 3 фон.png")'; // Дефолтный фон для других уровней
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
    // Keep level bubbles visible in level view as a quick switcher
    const siblingLevels = badges.filter(b => {
      if (b.category_id !== selectedBadge.category_id) return false;
      if (isMultiLevel) {
        const seg = (b.id || '').split('.');
        return seg.length === 3 && sameBaseTwoSegments(b.id, selectedBadge.id);
      }
      return (b.id || '') === (selectedBadge.id || '');
    });
    // Stable order: by numeric level if possible, then by id
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
    // Only show alternative levels (exclude currently selected)
    const otherLevels = levelsAll.filter(l => String(l.level) !== String(selectedLevel));

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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Загрузка космической карты значков...</p>
        </div>
      </div>
    );
  }

  // Функция для очистки HTML от лишних пробелов и разрывов
  const cleanHtmlContent = (html: string) => {
    return html
      // Убираем множественные пробелы
      .replace(/\s+/g, ' ')
      // Убираем множественные переносы строк
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Убираем пробелы в начале и конце строк
      .replace(/^\s+|\s+$/gm, '')
      // Убираем пустые параграфы
      .replace(/<p>\s*<\/p>/g, '')
      // Убираем множественные <br>
      .replace(/(<br\s*\/?>)\s*(<br\s*\/?>)/g, '<br>')
      // Убираем пробелы между тегами
      .replace(/>\s+</g, '><')
      // Убираем лишние пробелы в тексте
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

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
        <h1 className="heading-gold">🌟 Реальный Лагерь</h1>
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
                    'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("/skills_4k.png") center/cover no-repeat',
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
                'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("/ai_camp.png") center/cover no-repeat',
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
                'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("/co_management.png") center/cover no-repeat',
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
                <img src="/pictures/Wr8s1lqBl95mo9__Pw4CSouLulbnCQRdCt31tWGcKWGlLmXRD60QviGdQG1ASrS3KkfW4t6wFumMhG4myCTZEaKT.jpg" alt="Пост 1" />
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
                <img src="/pictures/HvRgNN4EUqGaVKKmQYwOnSESzm3zhN8NLN7psGe2xTbuscFg5h0oIIxbtlYIkCIO1zj2TUQYoFAKy9pYquEpfGrR.jpg" alt="Пост 2" />
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
                <img src="/pictures/wa1Ma_l5j4S2gV8sBeNLTw0cftt3WLplAEvXI9RW-qd5-uWJCslMqRRXGcFhKFEIr0Ck2teKZBiFzyRIeMfWLiLE.jpg" alt="Пост 3" />
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
                <img src="/pictures/2025-09-11_05-28-13.png" alt="Пост 4" />
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
                <img src="/pictures/4pCDWvEw_uyf3q8yQbhfsPpfDSVOMYkkexIZCudbxTsmqN8iA3jIT8TwpNtXbGliD_YCpD2nZhQZXajz4-0KFg-1.jpg" alt="Пост 5" />
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
                <img src="/pictures/w38A7umTNl1ECHO8HtrN9KRFmpwNLoCd19DGmO1qdPcLBENPbYsFQuzJOoDej_zxEcHDnRvDGUayZgs1mOMSkam3.jpg" alt="Пост 6" />
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
                <img src="/pictures/2025-09-11_05-25-15.png" alt="Пост 7" />
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
                <img src="/pictures/vKjyH96aNgNYbg14n545f0j1tZqG12tBI3L83kyz-8ofHa9DnmG-p41grb0hrbwUoNGteh0fdssSerJNH2GXffZN.jpg" alt="Пост 8" />
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
                <img src="/pictures/2025-09-11_05-21-21.png" alt="Пост 9" />
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
          <div className="session-info clickable cursor-pointer" onClick={handleTelegramContact}>
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

  return (
    <div className="app">
      {currentView === 'intro' && renderIntro()}
      {currentView === 'categories' && renderCategories()}
      {currentView === 'category' && renderCategory()}
      {currentView === 'badge' && renderBadge()}
      {currentView === 'badge-level' && renderBadgeLevel()}
      {currentView === 'introduction' && renderIntroduction()}
      {currentView === 'additional-material' && renderAdditionalMaterial()}
      {currentView === 'about-camp' && renderAboutCamp()}
      {currentView === 'registration-form' && renderRegistrationForm()}
      
      {/* Чат-бот НейроВалюша */}
      <ChatButton 
        onClick={() => setIsChatOpen(!isChatOpen)} 
        isOpen={isChatOpen}
      />
      <ChatBot 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentView={currentView}
        currentCategory={selectedCategory ? {
          id: selectedCategory.id,
          title: selectedCategory.title,
          emoji: selectedCategory.emoji
        } : undefined}
        currentBadge={selectedBadge ? {
          id: selectedBadge.id,
          title: selectedBadge.title,
          emoji: selectedBadge.emoji,
          categoryId: selectedBadge.category_id
        } : undefined}
        currentLevel={selectedLevel || undefined}
        currentLevelBadgeTitle={
          currentView === 'badge-level' && selectedBadge && selectedLevel ? (() => {
            const idSegments = (selectedBadge.id || '').split('.');
            const isMultiLevel = idSegments.length === 3;
            const baseKey = isMultiLevel ? idSegments.slice(0, 2).join('.') + '.' : selectedBadge.id;
            const lb = badges.find(b => {
              if (b.category_id !== selectedBadge.category_id) return false;
              if (isMultiLevel) {
                return (b.id || '').startsWith(baseKey) && String(b.level) === String(selectedLevel);
              }
              return b.id === selectedBadge.id && String(b.level) === String(selectedLevel);
            });
            return lb?.title;
          })() : undefined
        }
      />
      
      <style>{`
        .app {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          font-family: 'Arial', sans-serif;
          color: white;
          background: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%);
        }

        /* Global scrollbar styling (WebKit) */
        *::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        *::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 8px;
        }
        *::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(78,205,196,0.9), rgba(46,134,222,0.9));
          border-radius: 8px;
          border: 2px solid rgba(0, 0, 0, 0.3);
        }
        *::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(78,205,196,1), rgba(46,134,222,1));
        }

        /* Firefox */
        * {
          scrollbar-width: thin;               /* auto | thin | none */
          scrollbar-color: rgba(78,205,196,0.9) rgba(255,255,255,0.06);
        }

        .loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .loading-content {
          text-align: center;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #4ecdc4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

                 .intro-screen {
           position: absolute;
           top: 0;
           left: 0;
           width: 100%;
           height: 100%;
           display: flex;
           justify-content: center;
           align-items: center;
           background: 
             linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            url('/экран 1 фон copy.png') center top / 100% 100% no-repeat;
           backdrop-filter: blur(10px);
         }

        .intro-logo {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          transition: all 0.3s ease;
        }

        .intro-logo img {
          width: 180px;
          height: 180px;
          object-fit: cover;
          object-position: center;
          border-radius: 18px;
          box-shadow: 
            0 6px 20px rgba(0, 0, 0, 0.4),
            0 0 0 2px rgba(255, 215, 0, 1),
            0 0 20px rgba(255, 215, 0, 0.5),
            0 0 40px rgba(255, 215, 0, 0.3),
            inset 0 0 0 1px rgba(255, 255, 0, 0.8),
            inset 0 0 20px rgba(255, 215, 0, 0.4),
            inset 0 0 40px rgba(255, 215, 0, 0.2);
          background: rgba(255, 255, 255, 0.1);
          padding: 0px;
          transition: all 0.3s ease;
        }

        .intro-logo:hover {
          transform: scale(1.02);
        }

        .intro-logo:hover img {
          box-shadow: 
            0 12px 32px rgba(0, 0, 0, 0.5),
            0 0 0 3px rgba(255, 215, 0, 1),
            0 0 30px rgba(255, 215, 0, 0.8),
            0 0 60px rgba(255, 215, 0, 0.6),
            0 0 100px rgba(255, 215, 0, 0.4),
            inset 0 0 0 2px rgba(255, 255, 0, 1),
            inset 0 0 30px rgba(255, 215, 0, 0.6),
            inset 0 0 60px rgba(255, 215, 0, 0.3);
        }

        .logo-hover-text {
          position: absolute;
          bottom: -40px;
          left: 50%;
          transform: translateX(-50%);
          color: #FFD700;
          font-size: 14px;
          font-weight: bold;
          text-shadow: 
            0 0 10px rgba(255, 215, 0, 0.8),
            0 0 20px rgba(255, 215, 0, 0.6),
            0 0 30px rgba(255, 215, 0, 0.4);
          opacity: 0;
          transition: all 0.3s ease;
          white-space: nowrap;
          letter-spacing: 1px;
        }

        .intro-logo:hover .logo-hover-text {
          opacity: 1;
          transform: translateX(-50%) translateY(-5px);
        }

        .about-camp-screen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            url('/экран 1 фон copy.png') center top / 100% 100% no-repeat;
          backdrop-filter: blur(10px);
          overflow-y: auto;
        }

        .about-camp-content {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 20px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(4px);
        }

        .camp-description h2 {
          color: #FFD700;
          font-size: 1.8rem;
          margin-bottom: 1rem;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }

        .camp-description h3 {
          color: #FFA500;
          font-size: 1.4rem;
          margin: 1.5rem 0 1rem 0;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
        }

        .camp-description p {
          color: #E6F7FF;
          line-height: 1.6;
          margin-bottom: 1rem;
          font-size: 1rem;
        }

        .camp-description ul {
          color: #E6F7FF;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }

        .camp-description li {
          margin-bottom: 0.5rem;
        }

        .links-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .camp-link {
          color: #4ECDC4;
          text-decoration: none;
          padding: 0.8rem 1.2rem;
          background: rgba(78, 205, 196, 0.1);
          border: 1px solid rgba(78, 205, 196, 0.3);
          border-radius: 10px;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .camp-link:hover {
          background: rgba(78, 205, 196, 0.2);
          border-color: rgba(78, 205, 196, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
        }

        .session-info {
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 15px;
          padding: 1.5rem;
          margin-top: 1rem;
        }

        .session-info h4 {
          color: #FFD700;
          font-size: 1.2rem;
          margin-bottom: 1rem;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
        }

        .session-info p {
          margin-bottom: 0.8rem;
        }

        .session-info ul {
          margin: 0.5rem 0 1rem 1.5rem;
        }

        .session-info li {
          margin-bottom: 0.3rem;
        }

        .posts-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .post-link {
          color: #FFA500;
          text-decoration: none;
          padding: 1rem;
          background: rgba(255, 165, 0, 0.1);
          border: 1px solid rgba(255, 165, 0, 0.3);
          border-radius: 10px;
          transition: all 0.3s ease;
          font-weight: 500;
          text-align: center;
          display: block;
        }

        .post-link:hover {
          background: rgba(255, 165, 0, 0.2);
          border-color: rgba(255, 165, 0, 0.5);
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(255, 165, 0, 0.3);
        }

        .post-image {
          width: 100%;
          height: 150px;
          overflow: hidden;
          border-radius: 8px;
          margin-bottom: 0.8rem;
        }

        .post-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transition: transform 0.3s ease;
        }

        .post-link:hover .post-image img {
          transform: scale(1.05);
        }

        /* Benefits Grid */
        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .benefit-item {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.1) 100%);
          border: 2px solid rgba(255, 215, 0, 0.3);
          border-radius: 15px;
          padding: 20px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .benefit-item:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(255, 215, 0, 0.2);
          border-color: rgba(255, 215, 0, 0.6);
        }

        .benefit-item.clickable {
          cursor: pointer;
          position: relative;
          overflow: hidden;
          background: 
            linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
            url('/pictures/Stan_Pol__beutiful_camera__vector_logo_e16e2508-69e8-4bf6-9cdf-8b7012558c5e.png') center/cover no-repeat;
        }

        .benefit-item.clickable::after {
          content: '👆';
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 16px;
          opacity: 0.7;
          transition: all 0.3s ease;
        }

        .benefit-item.clickable:hover::after {
          opacity: 1;
          transform: scale(1.2);
        }

        .benefit-item.clickable:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 15px 35px rgba(255, 215, 0, 0.3);
          border-color: rgba(255, 215, 0, 0.8);
        }

        .benefit-item h4 {
          color: #FFD700;
          margin-bottom: 10px;
          font-size: 18px;
        }

        .benefit-item.clickable h4 {
          color: #FFD700;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          font-weight: bold;
        }

        .benefit-item p {
          color: #333;
          font-size: 14px;
          line-height: 1.4;
        }

        .benefit-item.clickable p {
          color: #fff;
          font-weight: 600;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        /* Daily Activities */
        .daily-activities {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }

        .activity-item {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .activity-item:hover {
          transform: translateX(5px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .activity-icon {
          font-size: 32px;
          margin-right: 15px;
          min-width: 40px;
        }

        .activity-item div {
          flex: 1;
        }

        .activity-item strong {
          color: #2c3e50;
          font-size: 16px;
          display: block;
          margin-bottom: 5px;
        }

        .activity-item p {
          color: #666;
          font-size: 13px;
          margin: 0;
          line-height: 1.3;
        }

        /* CTA Section */
        .cta-section {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.15) 100%);
          border: 3px solid rgba(255, 215, 0, 0.4);
          border-radius: 20px;
          padding: 25px;
          text-align: center;
          margin: 30px 0;
          box-shadow: 0 8px 25px rgba(255, 215, 0, 0.2);
        }

        .cta-section h3 {
          color: #FFD700;
          font-size: 24px;
          margin-bottom: 15px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .cta-section p {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 10px;
        }

        .cta-section p:last-child {
          margin-bottom: 0;
          font-size: 14px;
          color: #e74c3c;
          font-weight: bold;
        }

        .post-link:nth-child(1) .post-image img {
          object-position: center 10%;
        }

        .post-link:nth-child(2) .post-image img {
          object-position: center 30%;
        }

        .post-link:nth-child(3) .post-image img {
          object-position: center 20%;
          transform: scale(1.4);
        }

        .post-link:nth-child(4) .post-image img {
          object-position: center 25%;
        }

        .post-link:nth-child(6) .post-image img {
          object-position: center 30%;
        }

        .post-link:nth-child(8) .post-image img {
          object-position: center 30%;
        }

        .post-link:nth-child(9) .post-image img {
          object-position: center 30%;
        }

        /* Reviews Section Styles */
        .reviews-section {
          margin: 2rem 0;
        }

        .reviews-container {
          background: rgba(255, 165, 0, 0.1);
          border: 1px solid rgba(255, 165, 0, 0.3);
          border-radius: 15px;
          padding: 0;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .reviews-container:hover {
          background: rgba(255, 165, 0, 0.15);
          border-color: rgba(255, 165, 0, 0.5);
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(255, 165, 0, 0.3);
        }

        .reviews-image {
          position: relative;
          width: 100%;
          height: 200px;
          border-radius: 15px;
          background: 
            linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)),
            url('/pictures/nCaCWzejfe1KQgvdwHWHGKONG2w1lF7h9SxMAlW-iojQZrvq7_gmxF4ZJyNBFuXZkuPE5WE489c9OXvgknit3wsR.jpg') center/50% no-repeat;
          transition: all 0.3s ease;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 1rem;
        }

        .reviews-container:hover .reviews-image {
          background: 
            linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1)),
            url('/pictures/nCaCWzejfe1KQgvdwHWHGKONG2w1lF7h9SxMAlW-iojQZrvq7_gmxF4ZJyNBFuXZkuPE5WE489c9OXvgknit3wsR.jpg') center/50% no-repeat;
          transform: scale(1.02);
        }

        .reviews-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 1rem;
        }

        .reviews-content h4 {
          color: #FFD700;
          font-size: 1.3rem;
          margin-bottom: 0.8rem;
          font-weight: bold;
        }

        .reviews-content p {
          color: #ffffff;
          font-size: 1rem;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }

        .reviews-button {
          display: inline-block;
          background: rgba(255, 215, 0, 0.2);
          color: #FFD700;
          padding: 12px 24px;
          border-radius: 25px;
          text-decoration: none;
          font-weight: bold;
          font-size: 1rem;
          transition: all 0.3s ease;
          border: 2px solid rgba(255, 215, 0, 0.5);
        }

        .reviews-button:hover {
          background: rgba(255, 215, 0, 0.4);
          border-color: rgba(255, 215, 0, 0.8);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 215, 0, 0.3);
        }

        /* Mobile responsiveness for reviews */
        @media (max-width: 768px) {
          .reviews-image {
            height: 150px;
            background-size: 80%;
          }

          .reviews-content {
            padding: 0.8rem;
          }

          .reviews-content h4 {
            font-size: 1.1rem;
          }

          .reviews-content p {
            font-size: 0.9rem;
          }
        }

        .post-title {
          font-size: 0.9rem;
          line-height: 1.3;
        }

        .post-main-title {
          font-size: 1rem;
          font-weight: bold;
          color: #FFD700;
          margin-bottom: 0.3rem;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
        }

        .post-subtitle {
          font-size: 0.8rem;
          color: #E6F7FF;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }

        .post-highlights {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
          justify-content: center;
        }

        .highlight {
          font-size: 0.7rem;
          background: rgba(78, 205, 196, 0.2);
          color: #4ECDC4;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          border: 1px solid rgba(78, 205, 196, 0.3);
        }



                                                                       .intro-content {
             text-align: center;
             max-width: 1000px;
             padding: 1rem;
             background: rgba(0, 0, 0, 0.3);
             border-radius: 20px;
             border: 1px solid rgba(255, 255, 255, 0.1);
             box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
             margin: 1rem;
             backdrop-filter: blur(4px);
           }

                 .intro-content h1 {
           font-size: 2rem;
           margin-bottom: 18px;
           font-weight: 800;
           letter-spacing: -0.01em;
           background: linear-gradient(45deg, #4ecdc4, #44a08d);
           -webkit-background-clip: text;
           -webkit-text-fill-color: transparent;
           background-clip: text;
         }

                 .intro-content p {
           font-size: 0.9rem;
           line-height: 1.45;
           margin-bottom: 0.6rem;
           color: #E6F7FF;
           max-width: 70ch;
           margin-left: auto;
           margin-right: auto;
         }

                                                                       .philosophy-section {
             margin: 1rem 0;
             padding: 0.6rem;
             background: rgba(255, 255, 255, 0.03);
             border: 1px solid rgba(255, 255, 255, 0.05);
             border-radius: 15px;
             backdrop-filter: blur(2px);
             gap: 16px;
           }

                 .philosophy-main {
           font-size: 1rem !important;
           color: #CFEAF5 !important;
           text-align: center;
           margin-bottom: 0.6rem !important;
         }

                 .philosophy-points {
           margin: 0.6rem 0;
         }

                                                                       .point {
             display: grid;
             grid-template-columns: auto 1fr;
             gap: 12px;
             align-items: flex-start;
             margin-bottom: 0.6rem;
             padding: 0.5rem;
             background: rgba(255, 255, 255, 0.02);
             border-radius: 10px;
             border-left: 3px solid #62FFD0;
           }

                 .point-icon {
           font-size: 1.1rem;
           grid-column: 1;
           align-self: start;
         }

        .point div {
          grid-column: 2;
        }

                 .point strong {
           color: #62FFD0;
           display: block;
           margin-bottom: 0.2rem;
         }

                                                                       .philosophy-ending {
             text-align: center;
             font-size: 0.9rem !important;
             color: #62FFD0 !important;
             margin-top: 0.6rem !important;
             padding: 0.5rem;
             background: rgba(98, 255, 208, 0.05);
             border-radius: 10px;
           }

                 .start-instruction {
           text-align: center;
           font-size: 0.9rem;
           color: #ccc;
           margin: 0.6rem 0;
         }

                 .start-button {
           background: linear-gradient(45deg, #4ecdc4, #44a08d);
           border: none;
           padding: 0.6rem 1.2rem;
           font-size: 0.95rem;
           color: white;
           border-radius: 50px;
           cursor: pointer;
           transition: all 0.3s ease;
           box-shadow: 0 10px 20px rgba(78, 205, 196, 0.3);
           margin-top: 0.2rem;
         }

        .start-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(78, 205, 196, 0.4);
        }

                                   .categories-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            padding: 1rem;
            background: 
              linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
                             url('/экран 2 фон.png') center center / cover no-repeat;
          }

                   .category-screen,
          .badge-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 1rem;
            background: 
              linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
                             url('/экран 3 фон.png') center top / cover no-repeat;
          }

          .badge-level-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 1rem;
          }

                                   .header {
            margin-bottom: 0.4rem; /* Уменьшили отступ снизу */
            background: 
              linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%),
              url('/pattern_stickers.jpg') center center / 100% no-repeat;
            padding: 0.3rem; /* Уменьшили padding */
            border-radius: 15px;
            backdrop-filter: blur(5px);
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.4rem;
          }

          .category-screen .header {
            background: 
              linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%),
              url('/badges_photo.jpg') center 71% / 100% no-repeat !important;
            position: relative;
          }

          .category-screen .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
              radial-gradient(circle at 15% 25%, rgba(0, 0, 0, 0.4) 0%, transparent 30%),
              radial-gradient(circle at 85% 15%, rgba(0, 0, 0, 0.3) 0%, transparent 25%),
              radial-gradient(circle at 25% 75%, rgba(0, 0, 0, 0.35) 0%, transparent 35%),
              radial-gradient(circle at 75% 85%, rgba(0, 0, 0, 0.3) 0%, transparent 30%),
              radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.2) 0%, transparent 40%);
            filter: hue-rotate(270deg) saturate(1.5) brightness(0.8);
            pointer-events: none;
            z-index: 1;
          }

          .category-screen .header > * {
            position: relative;
            z-index: 2;
          }

                 .back-button {
           background: rgba(255, 255, 255, 0.1);
           border: 1px solid rgba(255, 255, 255, 0.2);
           color: white;
           padding: 0.4rem 0.8rem;
           border-radius: 25px;
           cursor: pointer;
           transition: all 0.3s ease;
           margin-bottom: 0.8rem;
           font-size: 0.9rem;
         }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

                                   .header h1 {
            color: #4ecdc4;
            font-size: 1.1rem; /* Уменьшили размер заголовка */
            margin: 0 0 0.1rem 0; /* Уменьшили отступ */
            white-space: normal; /* не ломаем переносы в заголовке */
            line-height: 1.25;
          }

                  .header p {
            color: #ccc;
            font-size: 0.7rem; /* Уменьшили размер текста */
            margin: 0;
          }

                                                                                                                                                                               .categories-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                width: 100%;
                height: calc(100vh - 120px);
                padding: 1rem;
                overflow: hidden;
              }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               .category-container {
                   display: flex;
                   align-items: center;
                   gap: 0.8rem; /* Увеличили отступ между пузырем и текстом */
                    cursor: pointer;
                    padding: 0;
                    background: transparent;
                    border: none;
                    border-radius: 0;
                    backdrop-filter: none;
                    transition: all 0.3s ease;
                 }

                                                                                                                                                                               .category-card {
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                padding: 0.5rem;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                text-align: center;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
                aspect-ratio: 1;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                min-width: 60px;
                min-height: 60px;
                overflow: hidden;
                flex-shrink: 0;
              }

                                       
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    -
                   display: flex;
                   align-items: center;
                   gap: 0;
                   cursor: pointer;
                   padding: 0;
                   background: transparent;
                   border: none;
                   border-radius: 0;
                   backdrop-filter: none;
                   transition: all 0.3s ease;
                 }

                                                                                                                                                                               .category-card {
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                padding: 0.5rem;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
                text-align: center;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
                aspect-ratio: 1;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                min-width: 60px;
                min-height: 60px;
                overflow: hidden;
                flex-shrink: 0;
                animation: breath 3s ease-in-out infinite;
              }

                                       .category-container {
             z-index: 9999;
           }

                                       .category-container.floating {
             animation: float 6s ease-in-out infinite;
           }
 
           @keyframes float {
             0%, 100% {
               transform: translateY(0px);
             }
             50% {
               transform: translateY(-8px);
             }
           }

         .category-card::before {
           content: '';
           position: absolute;
           top: 50%;
           left: 50%;
           width: 80%;
           height: 80%;
           border: 1px solid rgba(78, 205, 196, 0.3);
           border-radius: 50%;
           transform: translate(-50%, -50%);
           pointer-events: none;
           animation: pulse 3s ease-in-out infinite;
           box-shadow: 0 0 15px rgba(78, 205, 196, 0.2);
         }
         
         .category-card::after {
           content: '';
           position: absolute;
           top: 50%;
           left: 50%;
           width: 60%;
           height: 60%;
           border: 1px solid rgba(78, 205, 196, 0.1);
           border-radius: 50%;
           transform: translate(-50%, -50%);
           pointer-events: none;
           animation: pulse 2s ease-in-out infinite reverse;
         }

         @keyframes pulse {
           0%, 100% { 
             transform: translate(-50%, -50%) scale(1);
             opacity: 0.3;
           }
           50% { 
             transform: translate(-50%, -50%) scale(1.1);
             opacity: 0.6;
           }
         }
         
         @keyframes emojiFloat {
           0%, 100% { 
             transform: scale(1.25) rotate(5deg) translateY(0px);
           }
           50% { 
             transform: scale(1.25) rotate(5deg) translateY(-3px);
           }
         }
         
         @keyframes activeGlow {
           0%, 100% { 
             box-shadow: 
               0 0 25px rgba(78, 205, 196, 0.6),
               0 0 40px rgba(78, 205, 196, 0.3),
               inset 0 0 15px rgba(78, 205, 196, 0.1);
           }
           50% { 
             box-shadow: 
               0 0 35px rgba(78, 205, 196, 0.8),
               0 0 60px rgba(78, 205, 196, 0.4),
               inset 0 0 20px rgba(78, 205, 196, 0.15);
           }
         }

          /* Pulsing glow for the currently selected badge bubble in header */
          @keyframes selectedGlow {
            0%, 100% {
              box-shadow:
                0 6px 18px rgba(0, 0, 0, 0.6),
                0 0 30px rgba(78, 205, 196, 0.68),
                0 0 55px rgba(78, 205, 196, 0.35),
                inset 0 0 16px rgba(78, 205, 196, 0.18);
            }
            50% {
              box-shadow:
                0 8px 22px rgba(0, 0, 0, 0.65),
                0 0 42px rgba(78, 205, 196, 0.9),
                0 0 75px rgba(78, 205, 196, 0.55),
                inset 0 0 22px rgba(78, 205, 196, 0.24);
            }
          }

                                    .category-container:hover .category-card {
            transform: translateY(-8px) scale(1.08);
            box-shadow: 
              0 0 30px rgba(78, 205, 196, 0.8),
              0 0 60px rgba(78, 205, 196, 0.4),
              inset 0 0 20px rgba(78, 205, 196, 0.1);
            border-color: #4ecdc4;
            filter: brightness(1.1);
          }

          .category-container:hover .category-card::before {
            border-color: rgba(78, 205, 196, 0.8);
            animation-duration: 1s;
            box-shadow: 0 0 25px rgba(78, 205, 196, 0.6);
          }
          
          .category-container:hover .category-card::after {
            border-color: rgba(78, 205, 196, 0.4);
            animation-duration: 0.8s;
            box-shadow: 0 0 15px rgba(78, 205, 196, 0.3);
          }

          .category-container:hover .category-text h3 {
            color: #4ecdc4;
          }
          
          .category-container:hover .category-icon {
            filter: drop-shadow(0 0 15px rgba(78, 205, 196, 0.6));
            transform: scale(1.1);
          }

                                                                                                                                                                                                                       .category-icon {
              font-size: clamp(1rem, 2vw, 2rem);
              flex-shrink: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
              height: 100%;
              transition: all 0.3s ease;
            }
            
            .category-icon img {
              width: 140%;
              height: 140%;
              object-fit: cover;
              object-position: center;
            }

            .category-2-icon {
              width: 140% !important;
              height: 140% !important;
            }

            .category-5-icon {
              width: 138% !important;
              height: 138% !important;
            }

            .category-8-icon {
              width: 138% !important;
              height: 138% !important;
            }

            .category-9-icon {
              width: 145% !important;
              height: 145% !important;
            }

            .category-14-icon {
              width: 138% !important;
              height: 138% !important;
            }

                .category-13-icon {
      width: 138% !important;
      height: 138% !important;
    }

    .category-11-icon {
      width: 160% !important;
      height: 160% !important;
    }

    .category-3-icon {
      width: 200% !important;
      height: 200% !important;
    }

    .category-4-icon {
      width: 140% !important;
      height: 140% !important;
    }

    .category-7-icon {
      width: 140% !important;
      height: 140% !important;
    }

    .category-6-icon {
      width: 140% !important;
      height: 140% !important;
    }

    .category-10-icon {
      width: 160% !important;
      height: 160% !important;
            }

                     .category-text {
             display: flex;
             flex-direction: column;
             gap: 0.1rem; /* Уменьшили отступ между элементами */
             min-width: 0;
             flex: 1;
           }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ... [truncated]
                      margin: 0;
                      color: #4ecdc4;
                      font-size: clamp(0.6rem, 1.5vw, 0.9rem);
                      line-height: 1.2;
                      word-wrap: break-word;
                      text-align: left;
                      max-width: 500px;
                    }

                                                                                       .category-text p {
               margin: 0;
               color: #ccc;
               font-size: clamp(0.4rem, 1vw, 0.6rem);
               text-align: left;
               margin-top: 0.05rem;
             }

                                     .badges-grid {
             display: grid;
             grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
             gap: 18px;
             align-items: start;
             justify-content: center;
             overflow-x: hidden;
             box-sizing: border-box;
             padding: 16px;
             width: 100%;
             height: auto;
             min-height: calc(100vh - 120px);
             overflow-y: visible;
             max-width: 1400px;
             margin: 0 auto;
           }

                                     .badge-card {
             display: flex;
             flex-direction: column;
             align-items: center;
             justify-content: space-between;
             padding: 0;
             border-radius: 0;
             background: transparent;
             backdrop-filter: none;
             box-shadow: none;
             min-height: auto;
             height: auto;
             cursor: pointer;
             transition: all 0.3s ease;
             box-sizing: border-box;
             z-index: 9999;
           }

        .badge-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 
            0 0 25px rgba(78, 205, 196, 0.6),
            0 0 50px rgba(78, 205, 196, 0.3);
          filter: brightness(1.05);
        }

                                     .badge-card__icon {
             width: 80px;
             height: 80px;
             border-radius: 50%;
             display: grid;
             place-items: center;
             flex: 0 0 auto;
             background: rgba(0, 0, 0, 0.4);
             border: 1px solid rgba(255, 255, 255, 0.2);
             transition: all 0.3s ease;
           }

                  .badge-card:hover .badge-card__icon {
            background: rgba(255, 255, 255, 0.15);
            border-color: #4ecdc4;
            box-shadow: 
              0 0 25px rgba(78, 205, 196, 0.5),
              0 0 40px rgba(78, 205, 196, 0.2),
              inset 0 0 15px rgba(78, 205, 196, 0.1);
            transform: scale(1.15);
          }

                                     .badge-card__title {
             margin-top: 16px;
             text-align: center;
             font-size: 15px;
             line-height: 1.2;
             max-width: 100%;
             white-space: pre-line !important;
             word-break: break-word;
             hyphens: auto;
             color: #4ecdc4;
             margin: 0;
           }

                                     .badge-card__level {
             margin-top: 12px;
             font-size: 13px;
             color: #ccc;
             opacity: 0.8;
             text-align: center;
           }

                                     .badge-emoji {
             font-size: 3.5rem;
             transition: all 0.3s ease;
           }

                  .badge-card:hover .badge-emoji {
            transform: scale(1.25) rotate(5deg);
            filter: 
              drop-shadow(0 0 15px rgba(78, 205, 196, 0.7))
              drop-shadow(0 0 25px rgba(78, 205, 196, 0.4))
              brightness(1.1);
            animation: emojiFloat 2s ease-in-out infinite;
          }

                                     @media (min-width: 576px) {
             .badges-grid { 
               grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
               max-width: 1200px;
             }
           }
           @media (min-width: 768px) {
             .badges-grid { 
               grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
               max-width: 1300px;
             }
           }
           @media (min-width: 1200px) {
             .badges-grid { 
               grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
               max-width: 1400px;
             }
           }



                                   .badge-card h3 {
            margin: 0 0 0.2rem 0;
            color: #4ecdc4;
            font-size: clamp(0.6rem, 1.5vw, 0.9rem);
            line-height: 1.2;
            word-wrap: break-word;
          }

                                   .badge-level {
            margin: 0;
            color: #ccc;
            font-size: clamp(0.4rem, 1vw, 0.6rem);
            margin-top: 0.05rem;
          }

        .badge-header,
        .level-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        /* Badge screen: keep the emoji inside a glowing bubble */
        .badge-emoji-large {
          width: 92px;
          height: 92px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at 50% 45%, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.7) 65%, rgba(0, 0, 0, 0.55) 100%);
          border: 1.5px solid rgba(78, 205, 196, 0.5);
          box-shadow:
            0 6px 18px rgba(0, 0, 0, 0.6), /* отрыв от баннера */
            0 0 30px rgba(78, 205, 196, 0.7),
            0 0 55px rgba(78, 205, 196, 0.35),
            inset 0 0 18px rgba(78, 205, 196, 0.18);
          font-size: 4rem; /* emoji size */
          line-height: 1;
          animation: selectedGlow 2.6s ease-in-out infinite;
        }

        /* Category screen: remove rectangular glow on hover; keep only circular bubble glow */
        .category-screen .badge-card:hover { box-shadow: none; }
        .category-screen .badge-card { box-shadow: none; }

        .badge-category,
        .level-title {
          color: #4ecdc4;
          font-size: 1.1rem;
          margin: 0;
        }

        .badge-content,
        .level-content {
          margin-top: 1rem;
        }

        .badge-summary {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.8rem;
        }
        @media (min-width: 992px) {
          .badge-summary {
            grid-template-columns: 1.2fr 0.8fr;
            align-items: start;
          }
        }

        .badge-summary__block {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.8rem;
          height: auto;
          min-height: fit-content;
        }
        .badge-summary__block--tall {
          min-height: 460px;
        }
        .badge-summary__right { 
          display: grid; 
          gap: 0.8rem; 
          align-items: start;
          height: auto;
          min-height: 100%;
          overflow: visible;
        }

        .badge-summary__text {
          color: #ddd;
          margin: 0.2rem 0 0.6rem 0;
          line-height: 1.6;
          white-space: pre-line;
          max-height: none;
          overflow: visible;
        }

        .badge-summary__block h4 {
          font-size: 18px;
          font-weight: 600;
          color: #4ecdc4;
          margin: 24px 0 12px 0;
          padding: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 8px;
        }

        .badge-evidence {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          color: #9ec;
          font-style: italic;
        }

        .criterion-text {
          margin-bottom: 8px;
        }

        .criterion-examples {
          margin-top: 8px;
          padding-left: 16px;
        }

        .criterion-example {
          margin: 4px 0;
          font-size: 0.95em;
          opacity: 0.9;
        }
        .badge-summary__block--tall .badge-summary__text {
          max-height: var(--info-max-em, 28em);
        }
        .badge-summary__block--tall-override .badge-summary__text {
          max-height: 32em;
        }

        .badge-meta {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 0.6rem;
        }
        .badge-meta div {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0.6rem 0.8rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .badge-meta div + div { margin-left: 10px; }
        .badge-meta div span { margin-right: 8px; }
        .badge-meta span { color: #9ec; }
        .badge-meta strong { color: #fff; font-weight: 600; }

        .badge-description,
        .level-description,
        .level-criteria {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .badge-description h3,
        .level-description h3,
        .level-criteria h3 {
          color: #4ecdc4;
          margin: 0 0 1rem 0;
        }

        .badge-description p,
        .level-description p,
        .level-criteria p {
          color: #ccc;
          line-height: 1.6;
          margin: 0;
        }

        .badge-levels h3 {
          color: #4ecdc4;
          margin: 0 0 1rem 0;
        }

        .levels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        /* Компактная сетка карточек уровней, идентичная стилю базовых значков */
        .levels-grid-compact {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          align-items: start;
        }
        .level-compact {
          min-height: 120px;
        }
        .levels-grid-compact .badge-card__title {
          display: block;
          -webkit-line-clamp: initial;
          -webkit-box-orient: initial;
          white-space: normal;
          overflow: visible;
          font-size: 13px;
        }

        .level-card {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .level-card__head { display: flex; align-items: center; gap: 0.6rem; }
        .level-card__emoji { font-size: 1.4rem; }
        .level-card__criteria { color: #ccc; margin: 0.4rem 0 0.2rem 0; white-space: pre-line; max-height: 10em; overflow: hidden; }
        .level-card__desc { color: #bbb; margin: 0; }
        .level-card__btn {
          margin-top: 0.8rem;
          background: rgba(78, 205, 196, 0.2);
          color: #4ecdc4;
          border: 1px solid rgba(78, 205, 196, 0.6);
          border-radius: 8px;
          padding: 0.4rem 0.8rem;
          cursor: pointer;
        }
        .level-card__btn:hover { background: rgba(78, 205, 196, 0.35); }

        .level-card:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: #4ecdc4;
        }

        .level-card h4 {
          color: #4ecdc4;
          margin: 0 0 0.5rem 0;
        }

        .level-card p {
          color: #ccc;
          margin: 0;
          font-size: 0.9rem;
        }

        /* Steps (right panel) */
        .badge-steps { background: rgba(255,255,255,0.06); border-radius: 16px; padding: 20px 24px; backdrop-filter: blur(6px); }
        .badge-steps__title { margin: 0 0 12px; font-size: 20px; font-weight: 700; }
        .badge-steps__list { margin: 0; padding-left: 0; list-style: none; }
        .badge-steps__list li { position: relative; padding-left: 28px; margin: 10px 0; white-space: pre-line; }
        .badge-steps__list li::before { content: '✅'; position: absolute; left: 0; top: 0; line-height: 1.1; }

        /* Bottom levels grid */
        .levels-grid-bottom { display:flex; justify-content:flex-end; gap:24px; margin-top:0; margin-right: 300px; flex-wrap:nowrap; align-items:center; position: relative; z-index: 9999; }
        /* Stick by top so it visually sits near the bottom of the viewport,
           but keep it aligned to the viewport's right edge regardless of inner container width */
        .levels-dock {
          position: relative; /* sits right under the block above */
          right: auto;
          bottom: auto;
          z-index: 9999;
          display: flex;
          justify-content: flex-end;
          margin-top: 0;
          margin-right: 300px;
        }
        @media (max-width: 900px) {
          .levels-dock { margin-top: 0; margin-right: 300px; }
        }
        .level-card-bottom { display: flex; flex-direction: column; align-items: center; padding: 0; border-radius: 0; background: transparent; backdrop-filter: none; min-height: auto; cursor: pointer; transition: all 0.3s ease; position: relative; z-index: 9999; }
        .level-card-bottom:hover { 
          transform: translateY(-6px) scale(1.05); 
          background: transparent;
          filter: brightness(1.1);
        }
        .level-card__icon { width: 100px; height: 100px; border-radius: 50%; display: grid; place-items: center; margin-bottom: 16px; background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.25); transition: all 0.3s ease; z-index: 9999; }
                 .level-card__title { text-align: center; font-size: 17px; line-height: 1.2; margin: 6px 0 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; word-break: break-word; hyphens: auto; color: #4ecdc4; white-space: pre-line !important; }
        .level-card__subtitle { opacity: .85; font-size: 14px; text-align: center; color: #ccc; }
        
        .level-card-bottom:hover .level-card__icon {
          background: rgba(255, 255, 255, 0.15);
          border-color: #4ecdc4;
          box-shadow: 
            0 0 25px rgba(78, 205, 196, 0.5),
            0 0 40px rgba(78, 205, 196, 0.2),
            inset 0 0 15px rgba(78, 205, 196, 0.1);
          transform: scale(1.15);
        }
        .level-card-bottom.active .level-card__icon {
          background: rgba(78, 205, 196, 0.2);
          border-color: #4ecdc4;
          box-shadow: 
            0 0 25px rgba(78, 205, 196, 0.6),
            0 0 40px rgba(78, 205, 196, 0.3),
            inset 0 0 15px rgba(78, 205, 196, 0.1);
          animation: activeGlow 2s ease-in-out infinite;
        }
        
                 .level-bubble__emoji {
           font-size: 2.5rem;
           transition: all 0.3s ease;
         }
         
         .level-card-bottom:hover .level-bubble__emoji {
           transform: scale(1.25) rotate(3deg);
           filter: 
             drop-shadow(0 0 15px rgba(78, 205, 196, 0.7))
             drop-shadow(0 0 25px rgba(78, 205, 196, 0.4))
             brightness(1.1);
           animation: emojiFloat 2s ease-in-out infinite;
         }

                 @media (max-width: 768px) {
           .intro-content {
             max-width: 95vw;
             max-height: 95vh;
             padding: 1rem;
             margin: 1rem;
           }

           .intro-content h1 {
             font-size: 1.8rem;
           }

           .intro-content p {
             font-size: 0.9rem;
           }

           .philosophy-main {
             font-size: 1rem !important;
           }

           .point {
             flex-direction: column;
             text-align: center;
             padding: 0.6rem;
           }

           .point-icon {
             align-self: center;
             font-size: 1.2rem;
           }

           .philosophy-ending {
             font-size: 0.9rem !important;
             padding: 0.6rem;
           }

           .start-instruction {
             font-size: 0.9rem;
           }

           .start-button {
             padding: 0.6rem 1.2rem;
             font-size: 1rem;
           }

           .categories-grid,
           .badges-grid {
             grid-template-columns: 1fr;
           }

                       .header h1 {
              font-size: 1.8rem;
            }

           .badge-header,
           .level-header {
             flex-direction: column;
             text-align: center;
           }
         }
        /* Универсальные стили для всех экранов значков - фиксированная позиция пузырей */
        .badge-screen .badge-summary__right {
          height: auto;
          min-height: 100%;
          overflow: visible;
          padding-bottom: 24px;
        }
        /* ЕДИНЫЕ стили для экранов значка и уровня — пузыри фиксируются в одном месте */
        .badge-screen .levels-grid-bottom,
        .badge-level-screen .levels-grid-bottom { 
          display:flex !important; 
          justify-content:flex-start !important; 
          gap:24px !important; 
          margin-top:0 !important; 
          margin-right: 0 !important; 
          flex-wrap:nowrap !important; 
          align-items:center !important; 
          position: relative !important;
        }
        /* Снимаем отступ-«пришвартовку» справа для дока на экране уровня тоже */
        .badge-level-screen .levels-dock { 
          margin-right: 0 !important; 
          justify-content: flex-start !important;
        }
        
        /* Точечные правки для группы 1.4 */
        .badge--group-1-4 .badge-summary__right {
          height: auto;
          min-height: 100%;
          overflow: visible;
          padding-bottom: 24px;
        }
        .badge-evidence { margin-top: 0.6rem; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 0.6rem; }

        /* Стили для новых экранов */
        .header-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }
        /* Center header texts on screens 2 and 3 */
        .categories-screen .header-content,
        .category-screen .header-content {
          align-items: center;
          text-align: center;
          width: 100%;
        }

        .hint-button, .material-button {
          background: rgba(0, 0, 0, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.2), inset 0 0 10px rgba(0, 0, 0, 0.3);
        }

        .hint-button:hover, .material-button:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.8);
          background: rgba(0, 0, 0, 0.3);
          box-shadow: 0 0 25px rgba(255, 255, 255, 0.4), inset 0 0 15px rgba(0, 0, 0, 0.4);
        }

        .additional-materials-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 0.5rem;
          max-width: 100%;
        }
        
        .material-button {
          font-size: 0.8rem;
          padding: 0.4rem 0.6rem;
          white-space: nowrap;
          min-width: fit-content;
          transition: all 0.3s ease;
          border: 1px solid rgba(78, 205, 196, 0.3);
          background: rgba(78, 205, 196, 0.1);
        }
        
        .material-button:hover {
          background: rgba(78, 205, 196, 0.2);
          border-color: #4ecdc4;
          box-shadow: 0 0 15px rgba(78, 205, 196, 0.4);
          transform: translateY(-2px) scale(1.05);
        }

        .introduction-screen, .additional-material-screen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 1rem;
          background: 
            linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            url('/экран 3 фон.png') center center / cover no-repeat;
        }

        .introduction-content, .additional-material-content {
          max-width: 700px;
          margin: 0 auto;
          background: rgba(0, 0, 0, 0.4);
          padding: 1.5rem;
          border-radius: 15px;
          backdrop-filter: blur(15px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 215, 0, 0.3);
          position: relative;
          overflow: hidden;
        }

        .introduction-content::before, .additional-material-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        .introduction-text, .additional-material-text {
          color: #ffffff;
          line-height: 1.5;
          font-size: 0.95rem;
          position: relative;
          z-index: 1;
          white-space: pre-line;
        }

        /* Нормализация текста - убираем лишние пробелы и разрывы */
        .introduction-text *, .additional-material-text * {
          white-space: normal;
        }

        .introduction-text p, .additional-material-text p {
          white-space: pre-line;
        }

        /* Убираем двойные пробелы и нормализуем текст */
        .introduction-text, .additional-material-text {
          text-rendering: optimizeLegibility;
          font-variant-ligatures: none;
        }

        /* Нормализация пробелов в тексте */
        .introduction-text p, .additional-material-text p {
          text-align: justify;
          word-spacing: normal;
          letter-spacing: normal;
        }

        /* Убираем лишние отступы в начале и конце */
        .introduction-text p:first-child, .additional-material-text p:first-child {
          margin-top: 0;
        }

        .introduction-text p:last-child, .additional-material-text p:last-child {
          margin-bottom: 0;
        }

        /* Обработка HTML контента с лишними пробелами */
        .introduction-text br + br, .additional-material-text br + br {
          display: none;
        }

        .introduction-text p:empty, .additional-material-text p:empty {
          display: none;
        }

        /* Убираем лишние разрывы между абзацами */
        .introduction-text p + p, .additional-material-text p + p {
          margin-top: 0.1rem !important;
        }

        /* Убираем лишние разрывы после заголовков */
        .introduction-text h1 + p, .additional-material-text h1 + p,
        .introduction-text h2 + p, .additional-material-text h2 + p,
        .introduction-text h3 + p, .additional-material-text h3 + p,
        .introduction-text h4 + p, .additional-material-text h4 + p {
          margin-top: 0.1rem !important;
        }

        /* Убираем лишние разрывы перед заголовками */
        .introduction-text p + h1, .additional-material-text p + h1,
        .introduction-text p + h2, .additional-material-text p + h2,
        .introduction-text p + h3, .additional-material-text p + h3,
        .introduction-text p + h4, .additional-material-text p + h4 {
          margin-top: 0.2rem !important;
        }

        /* Нормализация пробелов в HTML */
        .introduction-text, .additional-material-text {
          font-kerning: normal;
          text-transform: none;
        }

        /* Агрессивное убирание всех лишних отступов */
        .introduction-text *, .additional-material-text * {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }

        /* Восстанавливаем минимальные отступы только там, где нужно */
        .introduction-text p, .additional-material-text p {
          margin-top: 0.1rem !important;
          margin-bottom: 0.1rem !important;
        }

        .introduction-text h1, .additional-material-text h1 {
          margin-top: 0 !important;
          margin-bottom: 0.1rem !important;
        }

        .introduction-text h2, .additional-material-text h2 {
          margin-top: 0.2rem !important;
          margin-bottom: 0.1rem !important;
        }

        .introduction-text h3, .additional-material-text h3 {
          margin-top: 0.2rem !important;
          margin-bottom: 0.1rem !important;
        }

        .introduction-text h4, .additional-material-text h4 {
          margin-top: 0.1rem !important;
          margin-bottom: 0.05rem !important;
        }


        /* Убираем лишние отступы между заголовками и параграфами */
        .introduction-text h1 + p, .additional-material-text h1 + p,
        .introduction-text h2 + p, .additional-material-text h2 + p,
        .introduction-text h3 + p, .additional-material-text h3 + p,
        .introduction-text h4 + p, .additional-material-text h4 + p {
          margin-top: 0.1rem;
        }

        .introduction-text p + h1, .additional-material-text p + h1,
        .introduction-text p + h2, .additional-material-text p + h2,
        .introduction-text p + h3, .additional-material-text p + h3,
        .introduction-text p + h4, .additional-material-text p + h4 {
          margin-top: 0.2rem;
        }

        .introduction-text h1 + h2, .additional-material-text h1 + h2,
        .introduction-text h2 + h3, .additional-material-text h2 + h3,
        .introduction-text h3 + h4, .additional-material-text h3 + h4 {
          margin-top: 0.1rem;
        }

        .introduction-text h1, .additional-material-text h1 {
          color: #FFD700;
          font-size: 1.8rem;
          margin-top: 0;
          margin-bottom: 0.1rem;
          text-align: center;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          font-weight: bold;
        }

        .introduction-text h2, .additional-material-text h2 {
          color: #FFA500;
          font-size: 1.4rem;
          margin-top: 0.2rem;
          margin-bottom: 0.1rem;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
          font-weight: 600;
        }

        .introduction-text h3, .additional-material-text h3 {
          color: #FFD700;
          font-size: 1.1rem;
          margin-top: 0.2rem;
          margin-bottom: 0.1rem;
          font-weight: 600;
        }

        .introduction-text h4, .additional-material-text h4 {
          color: #FFA500;
          font-size: 1rem;
          margin-top: 0.1rem;
          margin-bottom: 0.05rem;
          font-weight: 600;
        }

        .introduction-text p, .additional-material-text p {
          margin-top: 0.1rem;
          margin-bottom: 0.1rem;
          color: #e8e8e8;
          opacity: 0.95;
        }

        .introduction-text ul, .additional-material-text ul,
        .introduction-text ol, .additional-material-text ol {
          margin-top: 0.1rem;
          margin-bottom: 0.1rem;
          padding-left: 1.2rem;
        }

        .introduction-text li, .additional-material-text li {
          margin-top: 0.02rem;
          margin-bottom: 0.02rem;
          color: #e8e8e8;
          opacity: 0.95;
        }

        .introduction-text strong, .additional-material-text strong {
          color: #FFD700;
          font-weight: bold;
          opacity: 1;
        }

        .introduction-text em, .additional-material-text em {
          color: #FFA500;
          font-style: italic;
          opacity: 1;
        }

        .introduction-text pre, .additional-material-text pre {
          background: rgba(0, 0, 0, 0.6);
          padding: 0.6rem;
          border-radius: 8px;
          overflow-x: auto;
          margin-top: 0.1rem;
          margin-bottom: 0.1rem;
          border: 1px solid rgba(255, 215, 0, 0.2);
        }

        .introduction-text code, .additional-material-text code {
          background: rgba(0, 0, 0, 0.6);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          color: #FFD700;
          border: 1px solid rgba(255, 215, 0, 0.2);
        }

        .introduction-text blockquote, .additional-material-text blockquote {
          border-left: 3px solid #FFD700;
          padding-left: 0.6rem;
          margin-top: 0.1rem;
          margin-bottom: 0.1rem;
          background: rgba(255, 215, 0, 0.1);
          padding: 0.6rem;
          border-radius: 0 8px 8px 0;
        }

        /* Адаптивность для мобильных устройств */
        @media (max-width: 768px) {
          .additional-materials-buttons {
            flex-direction: column;
            align-items: center;
          }

          .material-button {
            width: 100%;
            max-width: 200px;
          }

          .introduction-content, .additional-material-content {
            padding: 1.2rem;
            margin: 0.5rem;
            max-width: 95%;
          }

          .introduction-text h1, .additional-material-text h1 {
            font-size: 1.6rem;
          }

          .introduction-text h2, .additional-material-text h2 {
            font-size: 1.3rem;
          }

          .introduction-text h3, .additional-material-text h3 {
            font-size: 1.1rem;
          }

          .introduction-text h4, .additional-material-text h4 {
            font-size: 1rem;
          }
        }

        /* Session Info Styles */
        .session-info {
          background: 
            linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)),
            url('/pictures/Stan_Pol__beutiful_camera__vector_logo_e16e2508-69e8-4bf6-9cdf-8b7012558c5e.png') center 10%/50% no-repeat;
          border: 2px solid rgba(255, 215, 0, 0.6);
          border-radius: 15px;
          padding: 15px;
          margin: 15px 0;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(5px);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .session-info::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { background-position: 200% 0; }
          50% { background-position: -200% 0; }
        }

        .session-info.clickable:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(255, 215, 0, 0.3);
          border-color: rgba(255, 215, 0, 0.9);
          background: 
            linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
            url('/pictures/Stan_Pol__beutiful_camera__vector_logo_e16e2508-69e8-4bf6-9cdf-8b7012558c5e.png') center 10%/50% no-repeat;
        }

        .session-info h4 {
          color: #FFD700;
          margin-bottom: 10px;
          font-size: 16px;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }

        .session-info p {
          color: #ffffff;
          margin-bottom: 8px;
          font-size: 13px;
          line-height: 1.4;
        }

        .session-info ul {
          color: #ffffff;
          margin: 10px 0;
          padding-left: 20px;
        }

        .session-info li {
          margin-bottom: 5px;
          font-size: 13px;
          line-height: 1.3;
        }

        .session-info em {
          color: #FFD700;
          font-weight: bold;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .session-image {
          width: 100%;
          max-width: 300px;
          height: auto;
          border-radius: 10px;
          margin-bottom: 12px;
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        }

        .session-info:hover .session-image {
          transform: scale(1.02);
          box-shadow: 0 12px 25px rgba(255, 215, 0, 0.2);
        }

        /* Registration Form Styles */
        .registration-form-screen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 1rem;
          background: 
            linear-gradient(135deg, rgba(12, 12, 12, 0.3) 0%, rgba(26, 26, 46, 0.3) 50%, rgba(22, 33, 62, 0.3) 100%),
            url('/экран 3 фон.png') center center / cover no-repeat;
        }

        .registration-form-content {
          max-width: 500px;
          margin: 0 auto;
          padding: 1.5rem 0;
        }

        .form-container {
          background: rgba(0, 0, 0, 0.4);
          padding: 1.5rem;
          border-radius: 15px;
          backdrop-filter: blur(15px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 215, 0, 0.5);
          position: relative;
          overflow: hidden;
        }

        .form-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        .form-container h2 {
          color: #FFD700;
          font-size: 22px;
          margin-bottom: 8px;
          text-align: center;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          font-weight: bold;
        }

        .form-container p {
          color: #ffffff;
          text-align: center;
          margin-bottom: 25px;
          font-size: 14px;
          opacity: 0.8;
          line-height: 1.4;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          color: #FFD700;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 6px;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid rgba(255, 215, 0, 0.4);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.3);
          color: #ffffff;
          font-size: 14px;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: rgba(255, 215, 0, 0.8);
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
          background: rgba(0, 0, 0, 0.5);
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 70px;
        }

        .submit-button {
          width: 100%;
          padding: 12px 20px;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          color: #2c3e50;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(255, 215, 0, 0.3);
          margin-top: 15px;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4);
          background: linear-gradient(135deg, #FFE55C 0%, #FFB84D 100%);
        }

        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        /* Адаптивность для мобильных устройств */
        @media (max-width: 768px) {
          .registration-form-content {
            padding: 1rem 0;
            max-width: 90%;
          }

          .form-container {
            padding: 1.2rem;
            margin: 0 0.5rem;
          }

          .form-container h2 {
            font-size: 18px;
          }

          .form-container p {
            font-size: 13px;
          }

          .form-group input,
          .form-group textarea {
            font-size: 16px; /* Предотвращает зум на iOS */
            padding: 12px 14px;
          }

          .submit-button {
            padding: 14px 20px;
            font-size: 16px;
          }
        }
        /* Override: banners */
        .header { 
          background: 
            linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%),
            url('/pattern_stickers.jpg') center top / cover no-repeat !important;
        }
        .category-screen .header { 
          background: 
            linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%),
            url('/badges_photo.jpg') center 40% / cover no-repeat !important;
        }
        .badge-screen .header { 
          background: 
            linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%),
            url('/pattern_stickers.jpg') center top / cover no-repeat !important;
        }
        /* Unify header heights between categories (screen 2) and category (screen 3) */
        .categories-screen .header,
        .category-screen .header {
          min-height: 140px;
          display: block;
          padding: 0.6rem 0.8rem;
        }
        /* Center content within header on screens 2 and 3 */
        .categories-screen .header,
        .category-screen .header {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .categories-screen .header .back-button,
        .category-screen .header .back-button {
          position: absolute;
          left: 8px;
          top: 8px;
          margin-bottom: 0;
          z-index: 5;
          pointer-events: auto;
        }
        /* Normalize About Camp banner and center content */
        .about-camp-screen .header {
          background:
            linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%),
            url('/pattern_stickers.jpg') center top / cover no-repeat !important;
          min-height: 140px;
          padding: 0.6rem 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .about-camp-screen .header .back-button {
          position: absolute;
          left: 8px;
          top: 8px;
          margin-bottom: 0;
          z-index: 5;
          pointer-events: auto;
        }
        /* Center header content on other screens as well */
        .introduction-screen .header,
        .additional-material-screen .header,
        .registration-form-screen .header,
        .badge-screen .header,
        .badge-level-screen .header {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 0.6rem 0.8rem;
          min-height: 140px; /* align with other screens */
        }
        .introduction-screen .header .back-button,
        .additional-material-screen .header .back-button,
        .registration-form-screen .header .back-button,
        .badge-screen .header .back-button,
        .badge-level-screen .header .back-button {
          position: absolute;
          left: 8px;
          top: 8px;
          margin-bottom: 0;
          z-index: 5;
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
};

export default App;
