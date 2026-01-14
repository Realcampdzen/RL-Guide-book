import React, { useMemo } from 'react';
import '../styles/mobile-bottom-nav.css';

type MobileNavView =
  | 'intro'
  | 'categories'
  | 'category'
  | 'badge'
  | 'badge-level'
  | 'introduction'
  | 'additional-material'
  | 'about-camp'
  | 'registration-form'
  | string;

type ActiveKey = 'home' | 'categories' | 'about' | 'signup';

interface MobileBottomNavProps {
  currentView: MobileNavView;
  onHome: () => void;
  onCategories: () => void;
  onAboutCamp: () => void;
  onTelegramContact: () => void;
  onOpenVk?: () => void;
}

const getActiveKey = (view: MobileNavView): ActiveKey => {
  if (view === 'intro') return 'home';
  if (view === 'about-camp') return 'about';
  if (view === 'registration-form') return 'signup';
  return 'categories';
};

const scrollToTop = () => {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onHome,
  onCategories,
  onAboutCamp,
  onTelegramContact,
  onOpenVk,
}) => {
  const activeKey = useMemo(() => getActiveKey(currentView), [currentView]);
  const isCategoriesView = currentView === 'categories';

  const handleHome = () => {
    if (activeKey === 'home') {
      scrollToTop();
      return;
    }
    onHome();
  };

  const handleCategories = () => {
    if (isCategoriesView) {
      scrollToTop();
      return;
    }
    onCategories();
  };

  const handleAbout = () => {
    if (activeKey === 'about') {
      scrollToTop();
      return;
    }
    onAboutCamp();
  };

  const handleSignup = () => {
    if (activeKey === 'signup') {
      scrollToTop();
      return;
    }
    onTelegramContact();
  };

  const handleVk = () => {
    if (onOpenVk) {
      onOpenVk();
      return;
    }
    if (typeof window === 'undefined') return;
    window.open('https://vk.com/realcampspb', '_blank', 'noopener,noreferrer');
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Основная навигация">
      <button
        type="button"
        className={`mobile-nav-item${activeKey === 'home' ? ' is-active' : ''}`}
        aria-current={activeKey === 'home' ? 'page' : undefined}
        onClick={handleHome}
      >
        <span className="mobile-nav-icon-wrap">
          <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M4 11.5L12 5l8 6.5v7.5a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 0 1 4 19z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="mobile-nav-label">Главная</span>
      </button>
      <button
        type="button"
        className={`mobile-nav-item${isCategoriesView ? ' is-active' : ''}`}
        aria-current={isCategoriesView ? 'page' : undefined}
        onClick={handleCategories}
      >
        <span className="mobile-nav-icon-wrap">
          <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="4" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <rect x="13" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <rect x="4" y="13" width="7" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <rect x="13" y="13" width="7" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </span>
        <span className="mobile-nav-label">Категории</span>
      </button>
      <button
        type="button"
        className={`mobile-nav-item${activeKey === 'about' ? ' is-active' : ''}`}
        aria-current={activeKey === 'about' ? 'page' : undefined}
        onClick={handleAbout}
      >
        <span className="mobile-nav-icon-wrap">
          <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="M12 10.5v5.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="12" cy="7.5" r="1" fill="currentColor" />
          </svg>
        </span>
        <span className="mobile-nav-label">О лагере</span>
      </button>
      <button
        type="button"
        className={`mobile-nav-item mobile-nav-item-cta${activeKey === 'signup' ? ' is-active' : ''}`}
        aria-current={activeKey === 'signup' ? 'page' : undefined}
        onClick={handleSignup}
      >
        <span className="mobile-nav-icon-wrap">
          <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M4 11.5l15.5-6.2c0.7-0.3 1.4 0.4 1.1 1.1l-5.8 13.6c-0.2 0.6-1 0.7-1.4 0.2l-3.1-3.8-4.4 1.6c-0.6 0.2-1.2-0.4-1-1l1.1-5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M9.8 13.6l9-8.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="mobile-nav-label">Записаться</span>
      </button>
      <button type="button" className="mobile-nav-item mobile-nav-item-vk" onClick={handleVk} aria-label="ВКонтакте">
        <span className="mobile-nav-icon-wrap">
          <span className="mobile-nav-icon mobile-nav-icon-text">VK</span>
        </span>
        <span className="mobile-nav-label">ВК</span>
      </button>
    </nav>
  );
};

export default React.memo(MobileBottomNav);
