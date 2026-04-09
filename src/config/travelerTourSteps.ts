import type { HintStep } from '../context/HintOverlayContext';
import type { AppController } from '../app/useAppController';

export function getTravelerTourSteps(controller: AppController): HintStep[] {
  return [
    {
      title: 'Привет, Путешественник!',
      content: 'Добро пожаловать в цифровую вселенную «Реального Лагеря»! Это не просто приложение, а полноценная операционная система для смен нового поколения. Давай пройдем короткий инструктаж.',
      beforeAction: () => { controller.setCurrentView('intro'); },
      delayBeforeMeasure: 300,
    },
    {
      title: 'Дерево Навыков (Категории)',
      content: 'Твоя персональная матрица компетенций. Здесь собрана глобальная база знаний из сотен значков. Выбирай свой путь развития и превращай обучение в увлекательный квест!',
      targetSelector: '[data-tour="nav-categories"]',
      beforeAction: () => { controller.setCurrentView('categories'); },
      delayBeforeMeasure: 700,
    },
    {
      title: 'Внутри Категории',
      content: 'Каждое направление — это отдельная вселенная со своими уникальными значками. Давай заглянем внутрь категории "За личные достижения".',
      targetSelector: '.badge-item, .category-badge-list',
      beforeAction: async () => {
        const cat1 = controller.categories?.find(c => c.id === '1');
        if (cat1) {
          controller.setSelectedCategory(cat1);
          controller.setCurrentView('category');
          await controller.ensureCategoryBadgesLoaded('1');
        }
      },
      delayBeforeMeasure: 1000,
    },
    {
      title: 'Значок "Путеводитель"',
      content: 'Этот значок выдаётся за развитие системы! Придумай собственный значок, реализуй его в лагере, и он появится здесь. Участники сами формируют программу смены. Будущее лагеря в ваших руках.',
      targetSelector: '.badge-view-hero, .badge-detail-content',
      beforeAction: async () => {
        const entries = await controller.ensureBadgeLoaded('1.16');
        const guideBadge = entries?.find(b => b.id === '1.16') || controller.badges?.find(b => b.id === '1.16');
        if (guideBadge) {
          controller.handleBadgeClick(guideBadge, { origin: 'category' });
          await new Promise(r => setTimeout(r, 400));
        } else {
          controller.setCurrentView('category');
        }
      },
      delayBeforeMeasure: 800,
    },
    {
      title: 'Уровни значков',
      content: 'У большинства значков 2 или 3 уровня сложности: базовый, продвинутый и экспертный. Например, продвинутый уровень значка Путеводитель — это «Создатель Новой Категории».',
      targetSelector: '.level-detail-content, .selected',
      beforeAction: async () => {
        controller.handleLevelClick('Продвинутый уровень');
        await new Promise(r => setTimeout(r, 400));
      },
      delayBeforeMeasure: 500,
    },
    {
      title: 'Реальный ИИ-Композитор',
      content: 'Но правила созданы, чтобы их нарушать! Значок «Реальный ИИ-композитор» выдаётся за создание и продюсирование собственной музыки с применением нейросетей, и у него целых 4 уровня!',
      targetSelector: '.badge-view-hero, .levels-scroll-container, .badge-detail-content',
      beforeAction: async () => {
        const entries = await controller.ensureBadgeLoaded('12.1');
        const aiBadge = entries?.find(b => b.id === '12.1') || controller.badges?.find(b => b.id === '12.1');
        if (aiBadge) {
          controller.handleBadgeClick(aiBadge, { origin: 'category' });
          await new Promise(r => setTimeout(r, 600));
        }
      },
      delayBeforeMeasure: 800,
    },
    {
      title: 'Личный Кабинет',
      content: 'Твой цифровой профиль. Здесь фиксируется твой реальный лагерный опыт и коллекция заработанных значков. Участники выстраивают свой путь развития, а вожатые получают мощный инвентарь для координации отрядных дел.',
      targetSelector: '[data-tour="nav-profile"]',
      beforeAction: () => {
        controller.setCurrentView('profile');
      },
      delayBeforeMeasure: 800,
    },
    {
      title: 'Мастерская (Кузница)',
      content: 'Центр созидания и наша цифровая песочница. Здесь рождаются новые проекты, арты и значки. Любой игрок может предложить свою смелую инициативу в Совет Лагеря!',
      targetSelector: '[data-tour="sidebar-workshop"]',
      beforeAction: async () => {
        controller.setCurrentView('profile');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tour-nav-cabinet-section', { detail: { section: 'workshop' } }));
        }
        await new Promise(r => setTimeout(r, 400));
      },
      delayBeforeMeasure: 500,
    },
    {
      title: 'Отрядный Уголок',
      content: 'Электронный штаб твоего отряда. Здесь кипит жизнь: актуальное расписание, командные чаты, списки участников и координация всех внутренних дел смены.',
      targetSelector: '[data-tour="sidebar-squad-corner"]',
      beforeAction: async () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tour-nav-cabinet-section', { detail: { section: 'squad-corner' } }));
        }
        await new Promise(r => setTimeout(r, 400));
      },
      delayBeforeMeasure: 400,
    },
    {
      title: 'Движок',
      content: 'Проектные команды внутри смены. «Движок» — это объединение по интересам. Собирайте команды, запускайте совместные стартапы и творите великие дела вместе!',
      targetSelector: '[data-tour="sidebar-engine"]',
      beforeAction: async () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tour-nav-cabinet-section', { detail: { section: 'engine' } }));
        }
        await new Promise(r => setTimeout(r, 400));
      },
      delayBeforeMeasure: 400,
    },
    {
      title: 'Совет Лагеря',
      content: 'Высший институт демократии и соуправления. Именно здесь проходят глобальные голосования, электронные выборы и принимаются ключевые решения всей смены.',
      targetSelector: '[data-tour="sidebar-council"]',
      beforeAction: async () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tour-nav-cabinet-section', { detail: { section: 'council' } }));
        }
        await new Promise(r => setTimeout(r, 400));
      },
      delayBeforeMeasure: 400,
    },
    {
      title: 'Управление лагерем',
      content: 'Здесь реализован мощный пульт управления всей системой! Роль Начальника Лагеря позволяет подключить весь лагерь к экосистеме значков и программе «Реальный Лагерь», получая отчётность и инструменты канбан-планирования для интеграции готовых план-сеток. Родители тут бронируют путёвки и видят успехи детей. Вожатые координируют прогресс участников с программой «на земле» и генерируют отрядные дела. Старший вожатый ведёт чаты педколлектива, а для кружководов и тренеров есть свои цифровые инструменты.',
      targetSelector: '[data-tour="sidebar-parents"]',
      beforeAction: async () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tour-nav-cabinet-section', { detail: { section: 'parents' } }));
        }
        await new Promise(r => setTimeout(r, 400));
      },
      delayBeforeMeasure: 400,
    },
    {
      title: 'ИИ-Ассистент НейроВалюша',
      content: 'НейроВалюша — это твой персональный ИИ-ассистент и один из интеллектуальных агентов в мультиагентной системе проекта. Она может помочь с любыми задачами, сгенерировать расписание или подкинуть новые идеи для отряда и смены.',
      targetSelector: '.chat-avatar-button',
      beforeAction: () => { controller.setCurrentView('intro'); },
      delayBeforeMeasure: 500,
    },
    {
      title: 'К полету готов!',
      content: 'Теперь ты знаешь всё! Исследуй вселенную реальных значков и достижений. Придумывай отрядные дела и мастер-классы, изучай вожатское мастерство и параллельно создавай ботов в нейросетях. Общайся в чатах, составляй свои планы достижений и обсуждай их с вожатыми, друзьями и нейровожатыми. Открывай новые арты, предлагай идеи и создавай собственные значки — они станут частью Путеводителя. Вперёд к крутой смене!',
      delayBeforeMeasure: 100,
    }
  ];
}
