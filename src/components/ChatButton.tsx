import React, { useEffect, useRef, useState } from 'react';

interface ChatButtonProps {
  onClick: () => void;
  isOpen?: boolean;
  className?: string;
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

const ChatButton: React.FC<ChatButtonProps> = ({ onClick, isOpen = false, className = '' }) => {
  const [viewport, setViewport] = useState<ViewportState>(() => getViewportState());
  const isMobile = viewport.width <= 768;
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | undefined>(undefined);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const markScrolling = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsScrolling(false);
      }, 1400);
    };

    const handleScroll = () => markScrolling();
    const handleWheel = () => markScrolling();
    const handleTouchMove = () => markScrolling();

    window.addEventListener('scroll', handleScroll, { passive: true } as EventListenerOptions);
    window.addEventListener('wheel', handleWheel, { passive: true } as EventListenerOptions);
    window.addEventListener('touchmove', handleTouchMove, { passive: true } as EventListenerOptions);
    document.addEventListener('scroll', handleScroll as EventListener, { passive: true } as AddEventListenerOptions);

    return () => {
      window.removeEventListener('scroll', handleScroll as EventListener);
      window.removeEventListener('wheel', handleWheel as EventListener);
      window.removeEventListener('touchmove', handleTouchMove as EventListener);
      document.removeEventListener('scroll', handleScroll as EventListener);
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const safeAreaBottom = Math.max(0, viewport.innerHeight - viewport.height - viewport.offsetTop);
  const safeAreaRight = Math.max(0, viewport.innerWidth - viewport.width - viewport.offsetLeft);
  const baseBottom = (isMobile ? 18 : 24) + safeAreaBottom;
  // Подъем кнопки ТОЛЬКО для мобильных устройств
  const mobileLift = Math.max(180, Math.min(250, viewport.height * 0.3));
  const raisedOffset = isMobile ? mobileLift : 0; // Десктоп остается без изменений
  const buttonBottom = isOpen ? baseBottom + raisedOffset : baseBottom;
  const buttonRight = (isMobile ? 16 : 24) + safeAreaRight;
  
  const buttonBackground = isOpen
    ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.95) 0%, rgba(12, 12, 12, 0.95) 50%, rgba(46, 26, 26, 0.95) 100%)'
    : 'linear-gradient(135deg, rgba(78, 205, 196, 0.95) 0%, rgba(12, 12, 12, 0.95) 50%, rgba(26, 26, 46, 0.95) 100%)';
  const buttonShadow = isOpen
    ? '0 18px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 107, 107, 0.35)'
    : '0 18px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(78, 205, 196, 0.35)';
  const buttonBorder = isOpen
    ? '2px solid rgba(255, 107, 107, 0.6)'
    : '2px solid rgba(78, 205, 196, 0.6)';
  const buttonOpacity = isOpen ? 1 : (isScrolling ? 0.62 : 0.9);
  const avatarSize = isMobile ? 48 : 52;
  const statusDotSize = isMobile ? 14 : 16;

  return (
    <button
      onClick={onClick}
      className={`chat-button ${className}`}
      title={isOpen ? "Закрыть чат" : "Открыть чат"}
      style={{
        position: 'fixed',
        bottom: `${buttonBottom}px`,
        right: `${buttonRight}px`,
        zIndex: 10001,
        background: buttonBackground,
        border: buttonBorder,
        color: 'white',
        padding: isMobile ? '12px 16px' : '16px 22px',
        borderRadius: '28px',
        boxShadow: buttonShadow,
        cursor: 'pointer',
        transition: 'transform 0.25s ease, opacity 0.25s ease, bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1), right 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backdropFilter: 'blur(10px)',
        minWidth: isMobile ? 'auto' : '200px',
        opacity: buttonOpacity,
        overflow: 'visible',
        transform: isOpen ? 'translateY(-8px)' : 'translateY(0)',
        // Временная отладочная индикация
        border: isOpen ? '3px solid #ff0000' : '2px solid rgba(78, 205, 196, 0.6)'
      }}
      onMouseEnter={(e) => {
        if (isOpen) {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 107, 107, 1) 0%, rgba(12, 12, 12, 1) 50%, rgba(46, 26, 26, 1) 100%)';
          e.currentTarget.style.boxShadow = '0 24px 45px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(255, 107, 107, 0.75)';
          e.currentTarget.style.border = '2px solid rgba(255, 107, 107, 1)';
        } else {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(78, 205, 196, 1) 0%, rgba(12, 12, 12, 1) 50%, rgba(26, 26, 46, 1) 100%)';
          e.currentTarget.style.boxShadow = '0 24px 45px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(78, 205, 196, 0.75)';
          e.currentTarget.style.border = '2px solid rgba(78, 205, 196, 1)';
        }
        e.currentTarget.style.transform = isOpen ? 'scale(1.05) translateY(-11px)' : 'scale(1.05) translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = buttonBackground;
        e.currentTarget.style.boxShadow = buttonShadow;
        e.currentTarget.style.border = buttonBorder;
        e.currentTarget.style.transform = isOpen ? 'translateY(-8px)' : 'translateY(0)';
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-18px',
          borderRadius: '999px',
          background: isOpen
            ? 'radial-gradient(circle, rgba(255, 107, 107, 0.45) 0%, rgba(255, 107, 107, 0) 70%)'
            : 'radial-gradient(circle, rgba(78, 205, 196, 0.45) 0%, rgba(78, 205, 196, 0) 70%)',
          opacity: isOpen ? 0.55 : 0.4,
          filter: 'blur(14px)',
          transition: 'all 0.3s ease',
          pointerEvents: 'none'
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              position: 'absolute',
              inset: `-${isMobile ? 6 : 8}px`,
              borderRadius: '50%',
              background: isOpen
                ? 'radial-gradient(circle, rgba(255, 107, 107, 0.6) 0%, rgba(255, 107, 107, 0) 70%)'
                : 'radial-gradient(circle, rgba(78, 205, 196, 0.6) 0%, rgba(78, 205, 196, 0) 70%)',
              filter: 'blur(6px)',
              opacity: 0.75,
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
              border: isOpen
                ? '3px solid rgba(255, 107, 107, 0.7)'
                : '3px solid rgba(78, 205, 196, 0.75)',
              boxShadow: isOpen
                ? '0 0 18px rgba(255, 107, 107, 0.45)'
                : '0 0 18px rgba(78, 205, 196, 0.45)',
              transition: 'all 0.3s ease'
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: `${statusDotSize}px`,
              height: `${statusDotSize}px`,
              background: isOpen ? '#ff6b6b' : '#4ecdc4',
              borderRadius: '50%',
              border: '2px solid rgba(12, 12, 12, 0.95)',
              boxShadow: isOpen
                ? '0 0 10px rgba(255, 107, 107, 0.6)'
                : '0 0 10px rgba(78, 205, 196, 0.6)',
              transition: 'all 0.3s ease'
            }}
          />
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                lineHeight: 1.2,
                color: isOpen ? '#ffb3b3' : '#4ecdc4',
                textShadow: isOpen
                  ? '0 0 12px rgba(255, 107, 107, 0.35)'
                  : '0 0 12px rgba(78, 205, 196, 0.35)',
                transition: 'color 0.3s ease, text-shadow 0.3s ease'
              }}
            >
              НейроВалюша
            </div>
            <div
              style={{
                fontSize: '12px',
                lineHeight: 1.2,
                color: '#cbd5f5',
                fontWeight: 500,
                opacity: 0.9
              }}
            >
              Нейро вожатый
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

export default ChatButton;
