import React from 'react';

/**
 * Глобальные стили для новых компонентов (BlueNestLanding, CategoriesGrid)
 * Применяются только когда используются новые компоненты
 */
const BluenestGlobalStyles: React.FC = () => {
  return (
    <style>{`
      :root {
        --c-midnight: #0f0a1f;
        --c-deep-blue: #1a0f2e;
        --c-electric-blue: #8b00ff;
        --c-volt: #6a0dad;
        --c-stark: #f4efe4;
        --c-warm: #8b00ff;
        --c-smoke: #f4efe41a;
        --c-volt-glow: rgba(139, 0, 255, 0.35);
        --c-aurora: rgba(139, 0, 255, 0.25);
        --f-display: 'Syne', sans-serif;
        --f-display-nav: 'Syne', 'Montserrat', sans-serif;
        --f-body: 'Space Grotesk', sans-serif;
        --easing: cubic-bezier(0.16, 1, 0.3, 1);
      }
      
      html {
        scroll-behavior: smooth !important;
        background: linear-gradient(135deg, #0f0a1f 0%, #1a0f2e 50%, #2a1a3d 100%) !important;
        color: var(--c-stark) !important;
        cursor: none !important;
        overflow-x: hidden !important;
      }
      
      body {
        font-family: var(--f-body) !important;
        line-height: 1.5 !important;
        -webkit-font-smoothing: antialiased !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        background: 
          linear-gradient(135deg, rgba(15, 10, 31, 0.6) 0%, rgba(26, 15, 46, 0.55) 50%, rgba(42, 26, 61, 0.5) 100%),
          url('/RL-Guide-book/экран 1 фон copy.png') center top / 120% calc(100vh + 5vh) no-repeat !important;
        background-color: #0f0a1f !important;
        background-attachment: fixed !important;
        min-height: 100vh !important;
        position: relative !important;
        color: var(--c-stark) !important;
      }
      
      #root {
        width: 100vw !important;
        min-height: 100vh !important;
        overflow: visible !important;
      }
      
      .app {
        background: transparent !important;
        overflow: visible !important;
        height: auto !important;
        min-height: 100vh !important;
        /* Убираем isolation: isolate чтобы z-index работал правильно */
      }
      
      /* Убираем конфликты с global.css */
      body {
        overflow-y: auto !important;
        overflow-x: hidden !important;
      }
      
      #root {
        overflow: visible !important;
        /* Убираем isolation: isolate чтобы z-index работал правильно */
      }
      
      /* Убеждаемся что marquee выше фона, но ниже hero */
      .marquee {
        position: relative !important;
        z-index: 2 !important;
      }
      
      /* Исправляем z-index иерархию для hero */
      .hero {
        position: relative !important;
        z-index: 0 !important;
        background: transparent !important;
      }
      
      .hero-bg {
        z-index: -1 !important; /* Фон героя должен быть ниже marquee */
      }
      
      .hero-content {
        position: relative !important;
        z-index: 3 !important;
      }
      
      /* В мобильной версии hero должен быть выше marquee, но marquee должна быть выше фона */
      @media (max-width: 768px) {
        .hero {
          z-index: 10 !important;
        }
        .hero-content {
          z-index: 10 !important;
        }
        .hero-bg {
          z-index: -1 !important;
        }
        /* Marquee должна быть выше фона (hero-bg), но ниже hero-content */
        .marquee {
          z-index: 1 !important;
          position: relative !important;
        }
      }
      
      /* В планшетной версии hero должен быть выше marquee */
      @media (min-width: 769px) and (max-width: 1024px) {
        .hero {
          z-index: 10 !important;
        }
        .hero-content {
          z-index: 10 !important;
        }
        .hero-bg {
          z-index: -1 !important;
        }
        /* Marquee должна быть выше фона (hero-bg), но ниже hero-content */
        .marquee {
          z-index: 1 !important;
          position: relative !important;
        }
      }

      /* Custom Cursor Hover State */
      .cursor-hover {
        transform: translate(-50%, -50%) scale(2.3) !important;
        background: var(--c-warm) !important;
        border: none !important;
        mix-blend-mode: difference !important;
      }
    `}</style>
  );
};

export default React.memo(BluenestGlobalStyles);

