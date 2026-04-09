import type { HintStep } from '../context/HintOverlayContext';
import type { AppController } from '../app/useAppController';

export function getTravelerTourSteps(controller: AppController): HintStep[] {
  return [
    {
      title: 'Привет, Путешественник!',
      content: 'Добро пожаловать в Путеводитель "Реального Лагеря". Это твой проводник в мир наших смен. Давай проведем короткий инструктаж, как в крутой видеоигре. Жми "Далее"!',
      beforeAction: () => { controller.setCurrentView('intro'); },
      delayBeforeMeasure: 300,
    },
    {
      title: 'Дерево Навыков (Категории)',
      content: 'Здесь собраны все направления и значки (внутрилагерные достижения), которые можно получить на сменах. Это твоя база знаний!',
      targetSelector: '[data-tour="nav-categories"]',
      beforeAction: () => { controller.setCurrentView('categories'); },
      delayBeforeMeasure: 700,
    },
    {
      title: 'Внутри Категории',
      content: 'Каждая категория хранит десятки значков. Давай заглянем внутрь направления "Лидерство и Навыки Жизни".',
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
      content: 'Например, этот значок выдаётся за развитие самого Путеводителя! Участники могут сами создавать значки и даже новые направления. Игроки сами создают эту базу знаний.',
      targetSelector: '.badge-view-hero, .badge-detail-content',
      beforeAction: async () => {
        const guideBadge = controller.badges?.find(b => b.id === '1.16');
        if (guideBadge) {
          controller.setSelectedBadge(guideBadge);
          controller.setCurrentView('badge');
        } else {
          controller.setCurrentView('category');
        }
      },
      delayBeforeMeasure: 800,
    },
    {
      title: 'Личный Кабинет',
      content: 'Здесь хранится твой цифровой профиль, заработанные значки и статистика. Для сохранения прогресса в будущем нужно будет зарегистрироваться.',
      targetSelector: '[data-tour="nav-profile"]',
      beforeAction: () => {
        controller.setCurrentView('profile');
      },
      delayBeforeMeasure: 800,
    },
    {
      title: 'Мастерская (Кузница Смыслов)',
      content: 'Место, где рождаются новые идеи, арты и значки для лагеря. Здесь ты можешь предложить свою инициативу!',
      targetSelector: 'button[data-console-section="workshop"]',
      beforeAction: () => {
        // Just highlight the button on the panel
        controller.setCurrentView('profile');
      },
      delayBeforeMeasure: 500,
    },
    {
      title: 'Отрядный уголок',
      content: 'Онлайн-штаб твоего текущего отряда. Расписание, списки участников и внутренние дела.',
      targetSelector: 'button[data-console-section="squad-corner"], .profile-view-cabin-card--squad-corner',
      delayBeforeMeasure: 300,
    },
    {
      title: 'Движок',
      content: 'Движок — это команда проектной работы или отряд по интересам. Создавайте движки, чтобы вместе получать значки и творить!',
      targetSelector: 'button[data-console-section="team"], .profile-view-cabin-nav-btn[aria-label*="Движ"]',
      delayBeforeMeasure: 300,
    },
    {
      title: 'Совет Лагеря',
      content: 'Место для голосований, выборов и принятия глобальных лагерных решений. Тут правит демократия.',
      targetSelector: 'button[data-console-section="council"]',
      delayBeforeMeasure: 300,
    },
    {
      title: 'Кабинеты Ролей',
      content: 'Здесь родители следят за достижениями участников. Платформа поддерживает множество ролей: Участники, Вожатые, Тренеры, Старшие Вожатые и Начальники Лагеря!',
      targetSelector: '.profile-view-cabin-nav-btn[aria-label*="Родител"]',
      delayBeforeMeasure: 300,
    },
    {
      title: 'ИИ-Ассистент НейроВалюша',
      content: 'Если ты потерялся или хочешь узнать о лагере больше — спроси у НейроВалюши! Это наша фирменная нейросеть.',
      targetSelector: '.chat-avatar-button',
      beforeAction: () => { controller.setCurrentView('intro'); },
      delayBeforeMeasure: 500,
    },
    {
      title: 'К полету готов!',
      content: 'Теперь ты знаешь, как устроен Путеводитель. Исследуй интерфейс, читай про значки и готовься к реальным сменам. Удачи!',
      delayBeforeMeasure: 100,
    }
  ];
}
