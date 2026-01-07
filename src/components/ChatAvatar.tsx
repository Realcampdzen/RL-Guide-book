import React, { useEffect, useState } from 'react';

interface ChatAvatarProps {
  onClick: () => void;
  isOpen?: boolean;
}

interface ViewportState {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  offsetTop: number;
  offsetLeft: number;
}

const getViewportState = (): ViewportState => {
  if (typeof window === 'undefined') {
    return {
      width: 1024,
      height: 768,
      innerWidth: 1024,
      innerHeight: 768,
      offsetTop: 0,
      offsetLeft: 0
    };
  }

  const { innerWidth, innerHeight } = window;
  const visualViewport = window.visualViewport;

  return {
    width: visualViewport?.width ?? innerWidth,
    height: visualViewport?.height ?? innerHeight,
    innerWidth,
    innerHeight,
    offsetTop: visualViewport?.offsetTop ?? 0,
    offsetLeft: visualViewport?.offsetLeft ?? 0
  };
};

const ChatAvatar: React.FC<ChatAvatarProps> = ({ onClick, isOpen = false }) => {
  const [viewport, setViewport] = useState<ViewportState>(() => getViewportState());
  const isMobile = viewport.width <= 768;
  const safeAreaBottom = Math.max(0, viewport.innerHeight - viewport.height - viewport.offsetTop);
  const safeAreaRight = Math.max(0, viewport.innerWidth - viewport.width - viewport.offsetLeft);
  
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateViewport = () => {
      setViewport(getViewportState());
    };

    updateViewport();

    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('scroll', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      visualViewport?.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);

  const baseBottom = (isMobile ? 18 : 24) + safeAreaBottom;
  const buttonRight = (isMobile ? 16 : 24) + safeAreaRight;
  const avatarSize = isMobile ? 56 : 64;
  const statusDotSize = isMobile ? 14 : 16;

  return (
    <button
      onClick={onClick}
      className="chat-avatar-button"
      title={isOpen ? "Закрыть чат" : "Открыть чат"}
      style={{
        position: 'fixed',
        bottom: `${baseBottom}px`,
        right: `${buttonRight}px`,
        zIndex: 10002,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        transition: 'transform 0.25s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        pointerEvents: 'auto'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <div style={{ 
        position: 'relative',
        width: `${avatarSize}px`,
        height: `${avatarSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Фиолетово-розовая обводка с эффектом свечения */}
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            left: '-4px',
            width: `${avatarSize + 8}px`,
            height: `${avatarSize + 8}px`,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.8) 0%, rgba(192, 132, 252, 0.8) 50%, rgba(217, 70, 239, 0.8) 100%)',
            filter: 'blur(8px)',
            opacity: isOpen ? 0.9 : 0.7,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-2px',
            left: '-2px',
            width: `${avatarSize + 4}px`,
            height: `${avatarSize + 4}px`,
            borderRadius: '50%',
            border: `3px solid ${isOpen ? 'rgba(217, 70, 239, 1)' : 'rgba(168, 85, 247, 0.9)'}`,
            boxShadow: isOpen
              ? '0 0 20px rgba(217, 70, 239, 0.8), 0 0 40px rgba(217, 70, 239, 0.4)'
              : '0 0 15px rgba(168, 85, 247, 0.6), 0 0 30px rgba(192, 132, 252, 0.3)',
            transition: 'all 0.3s ease',
            pointerEvents: 'none'
          }}
        />
        <img
          src="/RL-Guide-book/Валюша.jpg"
          alt="НейроВалюша"
          style={{
            width: `${avatarSize}px`,
            height: `${avatarSize}px`,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid rgba(15, 10, 31, 0.95)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s ease',
            position: 'relative',
            zIndex: 1,
            display: 'block'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: `${statusDotSize}px`,
            height: `${statusDotSize}px`,
            background: isOpen ? '#d946ef' : '#a855f7',
            borderRadius: '50%',
            border: '2px solid rgba(15, 10, 31, 0.95)',
            boxShadow: isOpen
              ? '0 0 12px rgba(217, 70, 239, 0.8)'
              : '0 0 8px rgba(168, 85, 247, 0.6)',
            transition: 'all 0.3s ease',
            zIndex: 2
          }}
        />
      </div>
    </button>
  );
};

export default React.memo(ChatAvatar);

