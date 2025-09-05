import React, { useState, useEffect } from 'react';
import ChatBot from './components/ChatBot';
import ChatButton from './components/ChatButton';

// Text processing functions for automatic formatting
const fixDescriptionFormatting = (text: string): string => {
  if (!text) return text;
  
  return text
    // Only add breaks before clear section headers
    .replace(/([.!?])\s*([А-ЯЁ][а-яё]+:)/g, '$1\n\n$2') // Add breaks before section headers like "Цель:", "Примеры:"
    .replace(/([.!?])\s*([А-ЯЁ][а-яё]{2,} [А-ЯЁ][а-яё]+:)/g, '$1\n\n$2') // Add breaks before longer section headers
    // Don't add breaks after every sentence - only after clear section endings
    .replace(/([.!?])\s*([А-ЯЁ][а-яё]{3,} [А-ЯЁ][а-яё]+)/g, '$1\n\n$2') // Add breaks before new topics
    // Don't add breaks before emojis in lists - they should stay inline
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks
    .trim();
};

const fixCriteriaFormatting = (text: string): string => {
  if (!text) return text;
  
  return text
    // Ensure proper spacing for bullet points and checkmarks
    .replace(/([.!?])\s*•/g, '$1\n\n•')
    // Fix section headers in criteria
    .replace(/([.!?])\s*([А-ЯЁ][а-яё]+:)/g, '$1\n\n$2')
    // Add breaks before "Например:" sections
    .replace(/([.!?])\s*Например:/g, '$1\n\nНапример:')
    // Add breaks before "Это может быть:" sections
    .replace(/([.!?])\s*Это может быть:/g, '$1\n\nЭто может быть:')
    // Special handling for bullet point lists - ensure single line breaks between items
    .replace(/(•[^•]*?)\n{2,}(•)/g, '$1\n$2')
    .replace(/(•[^•]*?)\n{3,}(•)/g, '$1\n$2')
    .replace(/(•[^•]*?)\n\n\n(•)/g, '$1\n$2')
    .replace(/(•[^•]*?)\n\n\n\n(•)/g, '$1\n$2')
    // Additional rule to handle any remaining multiple line breaks between bullet points
    .replace(/(•[^•]*?)(\n{2,})(•)/g, '$1\n$3')
    // Special handling for lists that start with "включая:" - ensure proper spacing
    .replace(/(включая:)\n(•)/g, '$1\n\n$2')
    // Don't add breaks before emojis in lists - they should stay inline
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const extractEvidenceSection = (text: string): { mainText: string; evidenceText: string | null } => {
  if (!text) return { mainText: text, evidenceText: null };
  
  const evidenceMatch = text.match(/(Чем подтверждается:.*?)(?=\n\n|$)/s);
  if (evidenceMatch) {
    const evidenceText = evidenceMatch[1].trim();
    const mainText = text.replace(evidenceMatch[0], '').trim();
    return { mainText, evidenceText };
  }
  
  return { mainText: text, evidenceText: null };
};

// Function to check if formatting should be applied
const shouldApplyFormatting = (badgeId: string): boolean => {
  // List of badges where automatic formatting might cause issues
  const skipFormattingFor: string[] = [
    // Add badge IDs here if needed
  ];
  return !skipFormattingFor.includes(badgeId);
};

// Function to get category icon (emoji or image)
const getCategoryIcon = (categoryId: string): string | JSX.Element => {
  switch (categoryId) {
    case '12': // ИИ
      return <img 
        src="./pictures/ии 2.png" 
        alt="ИИ" 
      />;
    case '13': // Категория 13
      return <img 
        className="category-13-icon"
        src="./pictures/софт скиллз.png" 
        alt="Категория 13" 
      />;
    case '2': // Категория 2
      return <img 
        className="category-2-icon"
        src="./pictures/stanpol__kittens_0482e39f-9d2d-4929-a25b-1888131d0cf2.png" 
        alt="Категория 2" 
      />;
    case '3': // Категория 3
      return <img 
        className="category-3-icon"
        src="./pictures/Stan_Pol__beutiful_camera__vector_logo_e16e2508-69e8-4bf6-9cdf-8b7012558c5e.png" 
        alt="Категория 3" 
      />;
    case '8': // Категория 8
      return <img 
        className="category-8-icon"
        src="./pictures/stanpol__kittens_840096ea-9470-4d6c-b8bc-0e8ab4703a38.png" 
        alt="Категория 8" 
      />;
    case '9': // Категория 9
      return <img 
        className="category-9-icon"
        src="./pictures/stanpol__The_mighty_kitten_guardian_of_light_a_halo_of_bright_m_56a19c5f-dfa8-4d0c-beb0-4f2e15d29dbb.png" 
        alt="Категория 9" 
      />;
    case '1': // Категория 1
      return <img 
        src="./pictures/stanpol__soviet_wave__actual_design__yellow_and_red_stars_on_a__326a67a1-e41c-4a9a-be9a-29c51d05b0a9.png" 
        alt="Категория 1" 
      />;
    case '7': // Категория 7
      return <img 
        className="category-7-icon"
        src="./pictures/Stan_Pol__beutiful_electric_guitar__vector_logo_78eadd19-04e1-4a7e-b538-865c6dd62d71.png" 
        alt="Категория 7" 
      />;
    case '6': // Категория 6
      return <img 
        className="category-6-icon"
        src="./pictures/Stan_Pol__magic_broom__4k__vector_logo_bdb44597-56aa-4530-92f6-104178793d0b.png" 
        alt="Категория 6" 
      />;
    case '10': // Категория 10
      return <img 
        className="category-10-icon"
        src="./pictures/Stan_Pol__beutiful_lighthouse__vector_logo_5c815e45-0aa8-48e0-9cd4-9ab06fc0b735.png" 
        alt="Категория 10" 
      />;
    case '11': // Категория 11
      return <img 
        className="category-11-icon"
        src="./pictures/stanpol__A_modern_logo_for_a_Neuro_shift_themed_camp_combining__577b1903-fc11-49cd-85a6-91211e30ec56.png" 
        alt="Категория 11" 
      />;
    case '5': // Категория 5
      return <img 
        className="category-5-icon"
        src="./pictures/Stan_Pol_realistic_campfire__vector_logo__in_the_style_of_a_glo_5b853e9f-93d3-4a2e-aa6a-f3345776e834.png" 
        alt="Категория 5" 
      />;
    case '4': // Категория 4
      return <img 
        className="category-4-icon"
        src="./pictures/Stan_Pol_beautiful_star__neon__4k__vector_logo_fbadf503-7e7b-4c8d-949f-e75c9a43b636.png" 
        alt="Категория 4" 
      />;
    case '14': // Категория 14
      return <img 
        className="category-14-icon"
        src="./pictures/stanpol___kittens_astronauts__against_the_background_of_a_magic_c43ee4e3-1f7c-45c2-8263-065fe08abf49.png" 
        alt="Категория 14" 
      />;
    default:
      return '🏆';
  }
};

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

type View = 'intro' | 'categories' | 'category' | 'badge' | 'badge-level' | 'introduction' | 'additional-material';

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [currentView, setCurrentView] = useState<View>('intro');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedAdditionalMaterial, setSelectedAdditionalMaterial] = useState<{
    type: 'checklist' | 'methodology';
    key: string;
    title: string;
    content: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);


  // Загружаем данные при монтировании
  useEffect(() => {
    console.log('App: Component mounted, loading data');
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('App: Loading data from API...');
      setLoading(true);
      const response = await fetch('/api/data');
      const data = await response.json();
      setCategories(data.categories);
      setBadges(data.badges);
      console.log('App: Data loaded from API:', data.categories.length, 'categories');
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      // Используем данные из perfect_parsed_data.json если API недоступен
      try {
        console.log('App: Loading fallback data...');
        const response = await fetch('/perfect_parsed_data.json');
        const data = await response.json();
        setCategories(data.categories);
        setBadges(data.badges);
        console.log('App: Fallback data loaded:', data.categories.length, 'categories');
      } catch (fallbackError) {
        console.error('Ошибка загрузки fallback данных:', fallbackError);
        // Используем тестовые данные
        console.log('App: Using test data');
        setCategories([
          { id: '1', title: 'За личные достижения', badge_count: 40, expected_badges: 40 },
          { id: '2', title: 'За легендарные дела', badge_count: 9, expected_badges: 9 },
          { id: '3', title: 'Медиа значки', badge_count: 9, expected_badges: 9 },
          { id: '4', title: 'За лагерные дела', badge_count: 10, expected_badges: 10 },
          { id: '5', title: 'За отрядные дела', badge_count: 20, expected_badges: 20 },
          { id: '6', title: 'Гармония и порядок', badge_count: 12, expected_badges: 12 },
          { id: '7', title: 'За творческие достижения', badge_count: 24, expected_badges: 24 },
          { id: '8', title: 'Значки Движков', badge_count: 9, expected_badges: 9 },
          { id: '9', title: 'Значки Бро – Движения', badge_count: 10, expected_badges: 10 },
          { id: '10', title: 'Значки на флаг отряда', badge_count: 3, expected_badges: 3 },
          { id: '11', title: 'Осознанность', badge_count: 16, expected_badges: 16 },
          { id: '12', title: 'ИИ: нейросети для обучения и творчества', badge_count: 35, expected_badges: 35 },
          { id: '13', title: 'Софт-скиллз интенсив — развитие гибких навыков', badge_count: 26, expected_badges: 26 },
          { id: '14', title: 'Значки Инспектора Пользы', badge_count: 19, expected_badges: 19 }
        ]);
      }
    } finally {
      setLoading(false);
      console.log('App: Loading completed');
    }
  };

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
    setSelectedBadge(badge);
    setCurrentView('badge');
    setSelectedLevel('');
  };

  const handleLevelClick = (level: string) => {
    console.log('App: Level clicked:', level);
    setSelectedLevel(level);
    setCurrentView('badge-level');
  };

  const handleIntroductionClick = () => {
    console.log('App: Introduction clicked');
    setCurrentView('introduction');
  };

  const handleAdditionalMaterialClick = (type: 'checklist' | 'methodology', key: string) => {
    console.log('App: Additional material clicked:', type, key);
    if (!selectedCategory?.additional_materials) return;
    
    const material = type === 'checklist' 
      ? selectedCategory.additional_materials.checklists?.[key]
      : selectedCategory.additional_materials.methodology?.[key];
    
    if (material) {
      setSelectedAdditionalMaterial({
        type,
        key,
        title: material.title,
        content: material.html
      });
      setCurrentView('additional-material');
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
      <div className="intro-logo">
        <img src="./pictures/домик_AI.jpg" alt="Логотип" />
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
                                                                                                                                                                                               const getConstellationPosition = (index: number, total: number) => {
          // Простая сетка 4x4 с равномерными интервалами
          const marginX = 20; // Отступ от краев по X (%)
          const marginY = 15; // Отступ от краев по Y (%)
          
          // Определяем строку и позицию в строке
          let row, col;
          
          if (index < 2) {
            // Верхняя строка - 2 пузыря
            row = 0;
            col = index;
          } else if (index < 6) {
            // Вторая строка - 4 пузыря
            row = 1;
            col = index - 2;
          } else if (index < 10) {
            // Третья строка - 4 пузыря
            row = 2;
            col = index - 6;
          } else {
            // Нижняя строка - 4 пузыря
            row = 3;
            col = index - 10;
          }
          
          const availableWidth = 100 - 2 * marginX;
          const availableHeight = 100 - 2 * marginY;
          
          // Простое равномерное распределение
          let x, y;
          
          if (row === 0) {
            // Для верхней строки (2 пузыря) - равномерно по всей ширине
            x = marginX + (col / 1) * availableWidth;
          } else {
            // Для остальных строк (4 пузыря) - равномерно по всей ширине
            x = marginX + (col / 3) * availableWidth;
          }
          
          // Равномерные интервалы по вертикали
          y = marginY + (row / 3) * availableHeight;
          
          // Специальная обработка для ИИ (индекс 11 в массиве) - опускаем ниже, но не слишком
          if (index === 11) {
            y += 8; // Опускаем на 8% ниже (уменьшили с 15%)
          }
          
          return { x, y };
        };

                                                                                                                                                                                               const getCircleSize = (badgeCount: number) => {
            // Размеры круга пропорционально количеству значков
            const minSize = 60;   // Минимальный размер (пиксели)
            const maxSize = 120;  // Максимальный размер (пиксели)
            const minBadges = 3;  // Минимальное количество значков
            const maxBadges = 40; // Максимальное количество значков
            
            // Нормализуем количество значков от 0 до 1
            const normalized = Math.min(Math.max((badgeCount - minBadges) / (maxBadges - minBadges), 0), 1);
            
            // Вычисляем размер с плавным переходом
            const size = minSize + normalized * (maxSize - minSize);
            
            return Math.round(size);
          };

                               const getTextLines = (title: string) => {
           // Система определения количества строк
           if (title.length > 35) return 3; // Очень длинные названия - 3 строки
           if (title.length > 20) return 2; // Длинные названия - 2 строки
           return 1; // Короткие названия - 1 строка
         };

             

               return (
          <div className="categories-screen">
           <div className="header">
             <button onClick={handleBackToIntro} className="back-button">
               ← Назад к приветствию
             </button>
             <h1 style={{color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', fontWeight: 'bold'}}>Категории значков</h1>
             <p style={{color: '#FFA500', textShadow: '1px 1px 2px rgba(0,0,0,0.6)', fontWeight: '600'}}>Выберите категорию для изучения</p>
           </div>
                       <div className="categories-grid">
              {categories.map((category, index) => {
                const circleSize = getCircleSize(category.badge_count);
                const textLines = getTextLines(category.title);
                
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
                       <h3>
                         {category.title}
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

    const categoryBadges = badges.filter(badge => 
      badge.category_id === selectedCategory.id &&
      (badge.level === 'Базовый уровень' || badge.level === 'Одноуровневый' || badge.level === 'Вожатский уровень' ||
       // Для категорий 8 и 9 показываем все значки, включая многоуровневые, кроме подуровней Легендарного Движка
       ((selectedCategory.id === '8' || selectedCategory.id === '9') && badge.id !== '8.5.2' && badge.id !== '8.5.3'))
    );

    return (
      <div className="category-screen">
        <div className="header">
          <button onClick={handleBackToCategories} className="back-button">
            ← Назад к категориям
          </button>
          <div className="header-content">
            <h1 style={{color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', fontWeight: 'bold'}}>{selectedCategory.title}</h1>
            <p style={{color: '#FFA500', textShadow: '1px 1px 2px rgba(0,0,0,0.6)', fontWeight: '600'}}>{categoryBadges.length} базовых значков</p>
            {selectedCategory.introduction?.has_introduction && (
              <button 
                onClick={handleIntroductionClick} 
                className="hint-button"
                title="Показать подсказку по категории"
              >
                💡 Подсказка
              </button>
            )}
            {selectedCategory.id === '14' && selectedCategory.additional_materials && (
              <div className="additional-materials-buttons">
                {selectedCategory.additional_materials.checklists && (
                  <>
                    <button 
                      onClick={() => handleAdditionalMaterialClick('checklist', 'general-checklist.md')}
                      className="material-button"
                      title="Общий чек-лист"
                    >
                      📋 Чек-лист
                    </button>
                    <button 
                      onClick={() => handleAdditionalMaterialClick('checklist', 'challenges-checklist.md')}
                      className="material-button"
                      title="Чек-лист с челленджами"
                    >
                      🎯 Челленджи
                    </button>
                                   <button
                 onClick={() => handleAdditionalMaterialClick('checklist', 'active-checklist.md')}
                 className="material-button"
                 title="Активная версия чек-листа"
               >
                 🚀 Активная версия
               </button>
                  </>
                )}
                {selectedCategory.additional_materials.methodology && (
                  <button 
                    onClick={() => handleAdditionalMaterialClick('methodology', 'inspector-methodology.md')}
                    className="material-button"
                    title="Методика Инспектора Пользы"
                  >
                    📚 Методика
                  </button>
                )}
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
              <div className="badge-card__level">{badge.level}</div>
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
    const baseKey = isMultiLevel ? idSegments.slice(0, 2).join('.') + '.' : selectedBadge.id;

    const badgeLevels = badges.filter(b => {
      if (b.category_id !== selectedBadge.category_id) return false;
      if (isMultiLevel) {
        return (b.id || '').startsWith(baseKey);
      }
      // одноуровневый
      return b.id === selectedBadge.id;
    });

    // Базовый уровень (если есть), для одноуровневых — сам значок
    const baseLevelBadge = isMultiLevel
      ? badgeLevels.find(b => (b.level || '').toLowerCase().includes('базовый')) || null
      : selectedBadge;

    // Получаем критерии базового уровня из данных с автоматическим форматированием
    const getCriteriaFromBadge = (badge: Badge | null) => {
      if (!badge || !badge.criteria) return [] as string[];
      const criteriaText = badge.criteria.replace(/^Как получить значок «[^»]+»:\s*/, '');
      const shouldFormat = shouldApplyFormatting(badge.id);
      const processedCriteria = shouldFormat ? fixCriteriaFormatting(criteriaText) : criteriaText;
      return processedCriteria
        .split('✅')
        .filter(c => c.trim())
        .map(c => c.trim());
    };

    // Получаем критерии и подтверждение из данных значка
    let evidenceText: string | null = null;
    let baseCriteria: string[] = [];
    
    // Для одноуровневых значков используем данные самого значка
    const sourceBadge = baseLevelBadge || selectedBadge;
    
    if (sourceBadge) {
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
            .filter(c => c.trim())
            .map(c => c.trim());
        } else {
          // Если нет отдельного confirmation, используем весь текст criteria
          const { mainText, evidenceText: extractedEvidence } = extractEvidenceSection(processedRaw);
          evidenceText = extractedEvidence;
          const criteriaText = mainText;
          baseCriteria = criteriaText
            .split('✅')
            .filter(c => c.trim())
            .map(c => c.trim());
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
              <h1 style={{color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', fontWeight: 'bold'}}>{selectedBadge.title}</h1>
              <p className="badge-category" style={{color: '#FFA500', textShadow: '1px 1px 2px rgba(0,0,0,0.6)', fontWeight: '600'}}>{selectedCategory?.title}</p>
            </div>
          </div>
        </div>

        <div className="badge-content">
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
                        {mainText}
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
                    <p className="badge-summary__text">{baseLevelBadge.skillTips}</p>
                  </>
                )}

                {baseLevelBadge?.examples && (
                  <>
                    <h4>Примеры</h4>
                    <p className="badge-summary__text">{baseLevelBadge.examples}</p>
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
                    <p className="badge-summary__text">{baseLevelBadge.howToBecome}</p>
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
                      <li key={index}>{criterion}</li>
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
                <div className="levels-grid-bottom">
                  {otherLevels.map(level => (
                    <article key={level.id} className="level-card-bottom" onClick={() => handleLevelClick(level.level)}>
                      <div className="level-card__icon">
                        <span className="level-bubble__emoji">{level.emoji || '🏆'}</span>
                      </div>
                      <h4 className="level-card__title">{level.title}</h4>
                      <div className="level-card__subtitle">{level.level}</div>
                    </article>
                  ))}
                </div>
              )}
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
       const criteria = processedCriteria.split('✅').filter(c => c.trim()).map(c => c.trim());
       
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
          return 'url("./экран 5 фон.png")';
        } else if (selectedLevel === 'Экспертный уровень') {
          return 'url("./экран 6 фон.png")';
        }
        return 'url("./экран 3 фон.png")'; // Дефолтный фон для других уровней
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
               <h1 style={{color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', fontWeight: 'bold'}}>{levelBadge.title}</h1>
               <p className="level-title" style={{color: '#FFA500', textShadow: '1px 1px 2px rgba(0,0,0,0.6)', fontWeight: '600'}}>{selectedLevel}</p>
             </div>
           </div>
         </div>
         
         <div className="level-content">
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
                        {mainText}
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
                    <p className="badge-summary__text">{levelBadge.skillTips}</p>
                  </>
                )}

                {levelBadge.examples && (
                  <>
                    <h4>Примеры</h4>
                    <p className="badge-summary__text">{levelBadge.examples}</p>
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
                    <p className="badge-summary__text">{levelBadge.howToBecome}</p>
                  </>
                )}
               <div className="badge-meta">
                 <div><span>Категория</span><strong>{selectedCategory?.title}</strong></div>
                 <div><span>Уровень</span><strong>{selectedLevel}</strong></div>
                 <div><span>ID</span><strong>{levelBadge.id}</strong></div>
               </div>
             </div>

                           <div className="badge-summary__block">
                <h3>Как получить {selectedLevel.toLowerCase()}</h3>
                {levelCriteria.length > 0 ? (
                  <ul className="badge-steps__list">
                    {levelCriteria.map((criterion, index) => {
                      const hasExamples = criterion.includes('Например:');
                      if (!hasExamples) {
                        return (<li key={index}>{criterion}</li>);
                      }

                                             const exampleSplit = criterion.split('Например:');
                       const headText = exampleSplit[0].trim();
                       const tail = exampleSplit.slice(1).join('Например:');
                       const exampleLines = tail
                         .split('\n')
                         .map(l => l.trim())
                         .filter(l => l.length > 0 && (l.startsWith('•') || l.startsWith('✅') || l.includes('Помочь') || l.includes('Проследить'))); // фильтруем только нужные строки

                       return (
                         <li key={index}>
                           <div className="criterion-text">{headText}</div>
                           {exampleLines.length > 0 && (
                             <div className="criterion-examples">
                               <p className="criterion-example">Например:</p>
                               {exampleLines.map((l, i) => (
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

  // ЭКРАН: Introduction
  const renderIntroduction = () => {
    if (!selectedCategory?.introduction?.has_introduction) return null;
    
    return (
      <div className="introduction-screen">
        <div className="header">
          <button onClick={handleBackToCategoryFromIntroduction} className="back-button">
            ← Назад к категории
          </button>
          <h1 style={{color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', fontWeight: 'bold'}}>💡 Подсказка: {selectedCategory.title}</h1>
        </div>
        <div className="introduction-content">
          <div 
            className="introduction-text"
            dangerouslySetInnerHTML={{ __html: selectedCategory.introduction.html }}
          />
        </div>
      </div>
    );
  };

  // ЭКРАН: Additional Material
  const renderAdditionalMaterial = () => {
    if (!selectedAdditionalMaterial) return null;
    
    return (
      <div className="additional-material-screen">
        <div className="header">
          <button onClick={handleBackToCategoryFromAdditional} className="back-button">
            ← Назад к категории
          </button>
          <h1 style={{color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', fontWeight: 'bold'}}>{selectedAdditionalMaterial.title}</h1>
        </div>
        <div className="additional-material-content">
          <div 
            className="additional-material-text"
            dangerouslySetInnerHTML={{ __html: selectedAdditionalMaterial.content }}
          />
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
            url('./экран 1 фон copy.png') center top / 100% 100% no-repeat;
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
        }

        .intro-logo img {
          width: 180px;
          height: 180px;
          object-fit: cover;
          object-position: center;
          border-radius: 18px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
          background: rgba(255, 255, 255, 0.1);
          padding: 0px;
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
                             url('./экран 2 фон.png') center center / cover no-repeat;
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
                             url('./экран 3 фон.png') center top / cover no-repeat;
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
              url('./pictures/паттерн стикеры — копия (2).jpg') center center / 100% no-repeat;
            padding: 0.3rem; /* Уменьшили padding */
            border-radius: 15px;
            backdrop-filter: blur(5px);
          }

          .category-screen .header {
            background: 
              linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 100%),
              url('./pictures/паттерн значки.jpg') center 71% / 100% no-repeat !important;
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
            white-space: pre-line !important;
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

                                   .category-container:hover .category-card {
            transform: translateY(-5px) scale(1.05);
            box-shadow: none;
            border-color: #4ecdc4;
          }

          .category-container:hover .category-card::before {
            border-color: rgba(78, 205, 196, 0.8);
            animation-duration: 1s;
          }

          .category-container:hover .category-text h3 {
            color: #4ecdc4;
          }

                                                                                                                                                                                                                       .category-icon {
              font-size: clamp(1rem, 2vw, 2rem);
              flex-shrink: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
              height: 100%;
            }
            
            .category-icon img {
              width: 118%;
              height: 118%;
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

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       .category-text h3 {
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
           }

        .badge-card:hover {
          transform: translateY(-5px);
          box-shadow: none;
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
            background: rgba(255, 255, 255, 0.1);
            border-color: #4ecdc4;
            box-shadow: 0 0 20px rgba(78, 205, 196, 0.3);
            transform: scale(1.1);
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
            transform: scale(1.2);
            filter: drop-shadow(0 0 10px rgba(78, 205, 196, 0.5));
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

        .badge-emoji-large {
          font-size: 4rem;
        }

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
        .levels-grid-bottom {
          display: flex;
          justify-content: center; /* центрируем по горизонтали */
          gap: 24px;               /* расстояние между кружочками */
          margin-top: 16px;
          flex-wrap: wrap;
          align-items: flex-start;
        }
        .level-card-bottom { display: flex; flex-direction: column; align-items: center; padding: 0; border-radius: 0; background: transparent; backdrop-filter: none; min-height: auto; cursor: pointer; transition: all 0.3s ease; }
        .level-card-bottom:hover { transform: translateY(-4px); background: transparent; }
        .level-card__icon { width: 100px; height: 100px; border-radius: 50%; display: grid; place-items: center; margin-bottom: 16px; background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.25); transition: all 0.3s ease; }
                 .level-card__title { text-align: center; font-size: 17px; line-height: 1.2; margin: 6px 0 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; word-break: break-word; hyphens: auto; color: #4ecdc4; white-space: pre-line !important; }
        .level-card__subtitle { opacity: .85; font-size: 14px; text-align: center; color: #ccc; }
        
        .level-card-bottom:hover .level-card__icon {
          background: rgba(255, 255, 255, 0.1);
          border-color: #4ecdc4;
          box-shadow: 0 0 20px rgba(78, 205, 196, 0.3);
          transform: scale(1.1);
        }
        
                 .level-bubble__emoji {
           font-size: 2.5rem;
           transition: all 0.3s ease;
         }
         
         .level-card-bottom:hover .level-bubble__emoji {
           transform: scale(1.2);
           filter: drop-shadow(0 0 10px rgba(78, 205, 196, 0.5));
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
        /* Точечные правки для группы 1.4 */
        .badge--group-1-4 .badge-summary__right {
          height: auto;
          min-height: 100%;
          overflow: visible;
          padding-bottom: 24px;
        }
        .badge--group-1-4 .levels-grid-bottom { margin-top: 1rem; }
        .badge-evidence { margin-top: 0.6rem; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 0.6rem; }

        /* Стили для новых экранов */
        .header-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
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
            url('./экран 3 фон.png') center center / cover no-repeat;
        }

        .introduction-content, .additional-material-content {
          max-width: 800px;
          margin: 0 auto;
          background: rgba(0, 0, 0, 0.7);
          padding: 2rem;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .introduction-text, .additional-material-text {
          color: #ffffff;
          line-height: 1.6;
          font-size: 1rem;
        }

        .introduction-text h1, .additional-material-text h1 {
          color: #4ecdc4;
          font-size: 2rem;
          margin-bottom: 1rem;
          text-align: center;
        }

        .introduction-text h2, .additional-material-text h2 {
          color: #4ecdc4;
          font-size: 1.5rem;
          margin: 1.5rem 0 1rem 0;
        }

        .introduction-text h3, .additional-material-text h3 {
          color: #4ecdc4;
          font-size: 1.2rem;
          margin: 1rem 0 0.5rem 0;
        }

        .introduction-text h4, .additional-material-text h4 {
          color: #4ecdc4;
          font-size: 1.1rem;
          margin: 0.8rem 0 0.4rem 0;
        }

        .introduction-text p, .additional-material-text p {
          margin: 0.8rem 0;
        }

        .introduction-text li, .additional-material-text li {
          margin: 0.4rem 0;
        }

        .introduction-text strong, .additional-material-text strong {
          color: #4ecdc4;
        }

        .introduction-text em, .additional-material-text em {
          color: #ffd700;
        }

        .introduction-text pre, .additional-material-text pre {
          background: rgba(0, 0, 0, 0.5);
          padding: 1rem;
          border-radius: 10px;
          overflow-x: auto;
          margin: 1rem 0;
        }

        .introduction-text code, .additional-material-text code {
          background: rgba(0, 0, 0, 0.5);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }

        .introduction-text blockquote, .additional-material-text blockquote {
          border-left: 4px solid #4ecdc4;
          padding-left: 1rem;
          margin: 1rem 0;
          background: rgba(78, 205, 196, 0.1);
          padding: 1rem;
          border-radius: 0 10px 10px 0;
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
            padding: 1rem;
            margin: 0.5rem;
          }

          .introduction-text h1, .additional-material-text h1 {
            font-size: 1.5rem;
          }

          .introduction-text h2, .additional-material-text h2 {
            font-size: 1.3rem;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
