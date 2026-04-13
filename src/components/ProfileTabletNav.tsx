import React from 'react';
import '../styles/profile-cabin-tablet-nav.css';

export interface ProfileTabletNavProps {
  onHome: () => void;
  onCategories: () => void;
  onAboutCamp: () => void;
  onTelegramContact: () => void;
  onProfile: () => void;
  onOpenVk?: () => void;
}

const ProfileTabletNav: React.FC<ProfileTabletNavProps> = ({
  onHome,
  onCategories,
  onAboutCamp,
  onTelegramContact,
  onProfile,
  onOpenVk,
}) => {
  const handleVk = () => {
    if (onOpenVk) {
      onOpenVk();
      return;
    }
    if (typeof window === 'undefined') return;
    window.open('https://vk.com/realcampspb', '_blank', 'noopener,noreferrer');
  };

  return (
    <nav className="profile-cabin-tablet-nav" aria-label="Навигация по приложению">
      <button
        type="button"
        className="profile-cabin-tablet-nav__item"
        onClick={onHome}
        aria-label="Главная"
      >
        <span className="profile-cabin-tablet-nav__icon-wrap">
          <svg
            className="profile-cabin-tablet-nav__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
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
        <span className="profile-cabin-tablet-nav__label">Главная</span>
      </button>
      <button
        type="button"
        className="profile-cabin-tablet-nav__item"
        onClick={onCategories}
        aria-label="Значки"
      >
        <span className="profile-cabin-tablet-nav__icon-wrap">
          <svg
            className="profile-cabin-tablet-nav__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <rect
              x="4"
              y="4"
              width="7"
              height="7"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <rect
              x="13"
              y="4"
              width="7"
              height="7"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <rect
              x="4"
              y="13"
              width="7"
              height="7"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <rect
              x="13"
              y="13"
              width="7"
              height="7"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
          </svg>
        </span>
        <span className="profile-cabin-tablet-nav__label">Значки</span>
      </button>
      <button
        type="button"
        className="profile-cabin-tablet-nav__item profile-cabin-tablet-nav__item--active"
        onClick={onProfile}
        aria-current="page"
        aria-label="Мой путь"
      >
        <span className="profile-cabin-tablet-nav__icon-wrap">
          <svg
            className="profile-cabin-tablet-nav__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="profile-cabin-tablet-nav__label">Мой путь</span>
      </button>
      <button
        type="button"
        className="profile-cabin-tablet-nav__item"
        onClick={onAboutCamp}
        aria-label="О лагере"
      >
        <span className="profile-cabin-tablet-nav__icon-wrap">
          <svg
            className="profile-cabin-tablet-nav__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M12 10.5v5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <circle cx="12" cy="7.5" r="1" fill="currentColor" />
          </svg>
        </span>
        <span className="profile-cabin-tablet-nav__label">О лагере</span>
      </button>
      <button
        type="button"
        className="profile-cabin-tablet-nav__item profile-cabin-tablet-nav__item--cta"
        onClick={onTelegramContact}
        aria-label="Записаться"
      >
        <span className="profile-cabin-tablet-nav__icon-wrap">
          <svg
            className="profile-cabin-tablet-nav__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M4 11.5l15.5-6.2c0.7-0.3 1.4 0.4 1.1 1.1l-5.8 13.6c-0.2 0.6-1 0.7-1.4 0.2l-3.1-3.8-4.4 1.6c-0.6 0.2-1.2-0.4-1-1l1.1-5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9.8 13.6l9-8.1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="profile-cabin-tablet-nav__label">Записаться</span>
      </button>
      <button
        type="button"
        className="profile-cabin-tablet-nav__item profile-cabin-tablet-nav__item--vk"
        onClick={handleVk}
        aria-label="ВКонтакте"
      >
        <span className="profile-cabin-tablet-nav__icon-wrap">
          <span className="profile-cabin-tablet-nav__icon profile-cabin-tablet-nav__icon--text">
            VK
          </span>
        </span>
        <span className="profile-cabin-tablet-nav__label">ВК</span>
      </button>
    </nav>
  );
};

export default React.memo(ProfileTabletNav);
