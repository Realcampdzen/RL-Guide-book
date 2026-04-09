import type { HintStep } from '../context/HintOverlayContext';
import type { AppController } from '../app/useAppController';

export function getTravelerTourSteps(controller: AppController): HintStep[] {
  return [
    {
      title: 'Привет, Путешественник!',
      content: 'Добро пожаловать на борт масштабной экосистемы Реального Лагеря. Это твой личный проводник в мир сотен значков и достижений. Давай проведем короткий инструктаж, прямо как в крутой игре!',
      beforeAction: () => { controller.setCurrentView('intro'); },
      delayBeforeMeasure: 300,
    },
    {
      title: 'Дерево Навыков (Категории)',
      content: 'Здесь собраны все направления и значки (достижения), которые можно получить на сменах. Это твоя глобальная база знаний!',
      targetSelector: '[data-tour="nav-categories"]',
      beforeAction: () => { controller.setCurrentView('categories'); },
      delayBeforeMeasure: 700,
    },
    {
      title: 'Внутри Категории',
      content: 'Каждая категория хранит десятки уникальных значков. Давай заглянем внутрь направления "За личные достижения".',
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
      content: 'Крутая особенность: этот значок выдаётся за развитие самого Путеводителя! Участники могут сами создавать новые значки и даже целые направления. Эту педагогическую систему, программу смены и игрофикацию формируют сами дети!',
      targetSelector: '.badge-view-hero, .badge-detail-content',
      beforeAction: async () => {
        const entries = await controller.ensureBadgeLoaded('1.16');
        const guideBadge = entries?.find(b => b.id === '1.16') || controller.badges?.find(b => b.id === '1.16');
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
      content: 'Это твой аккаунт. Здесь хранится статистика, заработанные значки и инструменты управления смен.',
      targetSelector: '[data-tour="nav-profile"]',
      beforeAction: () => {
        controller.setCurrentView('profile');
      },
      delayBeforeMeasure: 800,
    },
    {
      title: 'Мастерская (Кузница)',
      content: 'Главное место, где рождаются новые идеи, арты и значки для лагеря. Здесь любой игрок может предложить свою инициативу напрямую в Совет Лагеря!',
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
      content: 'Онлайн-штаб твоего текущего отряда. Расписание, списки участников, чаты и внутренние дела смены будут находиться именно тут.',
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
      content: 'Движок — это объединение по интересам для реализации различных проектов. Создавайте движки, чтобы вместе получать значки и творить великие дела!',
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
      content: 'Главное место для голосований, выборов и принятия глобальных решений. По сути, это высший институт соуправления лагерем.',
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
      title: 'Кабинеты Родителей',
      content: 'Здесь родители следят за достижениями участников. Вообще, платформа поддерживает множество ролей: Участник, Родитель, Педагог/Тренер, Старший Вожатый и Начальник Лагеря!',
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
      content: 'НейроВалюша — это наша мощная нейросеть и продвинутый персональный ИИ-ассистент. Она может помочь с любыми задачами, сгенерировать расписание или подкинуть новые идеи для отряда и смены.',
      targetSelector: '.chat-avatar-button',
      beforeAction: () => { controller.setCurrentView('intro'); },
      delayBeforeMeasure: 500,
    },
    {
      title: 'К полету готов!',
      content: 'Теперь ты знаешь, как устроена вселенная Путеводителя. Исследуй интерфейс, читай про значки и готовься к реальным сменам. Удачи!',
      delayBeforeMeasure: 100,
    }
  ];
}
