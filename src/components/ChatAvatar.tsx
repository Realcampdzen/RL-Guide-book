import React from 'react';
import '../styles/chat-avatar.css';
import { toSiblingImageUrl } from '../utils/imageSources';

interface ChatAvatarProps {
  onClick: () => void;
  isOpen?: boolean;
}

const ChatAvatar: React.FC<ChatAvatarProps> = ({ onClick, isOpen = false }) => {
  const avatarJpg = '/RL-Guide-book/Валюша.jpg';
  const avatarWebp = toSiblingImageUrl(avatarJpg, 'webp');

  return (
    <button
      onClick={onClick}
      className={`chat-avatar-button ${isOpen ? 'is-open' : ''}`}
      title={isOpen ? "Закрыть чат" : "Открыть чат"}
      aria-label={isOpen ? "Закрыть чат" : "Открыть чат"}
      aria-pressed={isOpen}
    >
      <div className="chat-avatar-container">
        {/* Фиолетово-розовая обводка с эффектом свечения */}
        <div className="chat-avatar-glow" />
        <div className="chat-avatar-ring" />
        <picture>
          {avatarWebp && <source type="image/webp" srcSet={avatarWebp} />}
          <img
            src={avatarJpg}
            alt="НейроВалюша"
            className="chat-avatar-img"
            decoding="async"
            fetchPriority="high"
          />
        </picture>
        <div className="chat-avatar-status" />
      </div>
    </button>
  );
};

export default React.memo(ChatAvatar);
