import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTiltCard } from '../hooks/useTiltCard';
import '../styles/bluenest.css';

const loadChatBot = () => import('./ChatBot');
const loadChatAvatar = () => import('./ChatAvatar');
const ChatBot = React.lazy(loadChatBot);
const ChatAvatar = React.lazy(loadChatAvatar);

interface BlueNestLandingProps {
  onStartClick: () => void;
  onLogoClick: () => void;
  onAboutCampClick: () => void;
  onChatToggle: () => void;
  isChatOpen: boolean;
  onChatClose: () => void;
  currentView?: string;
  selectedCategory?: {
    id: string;
    title: string;
    emoji?: string;
  };
  selectedBadge?: {
    id: string;
    title: string;
    emoji: string;
    categoryId: string;
  };
  selectedLevel?: string;
  currentLevelBadgeTitle?: string;
}

const BlueNestLanding: React.FC<BlueNestLandingProps> = ({
  onStartClick,
  onAboutCampClick,
  onChatToggle,
  isChatOpen,
  onChatClose,
  currentView = 'intro',
  selectedCategory,
  selectedBadge,
  selectedLevel,
  currentLevelBadgeTitle,
}) => {
  const { initReveal } = useScrollReveal();
  const [loaderHidden, setLoaderHidden] = useState(false);
  const featureCard1Ref = useRef<HTMLDivElement>(null);
  const featureCard2Ref = useRef<HTMLDivElement>(null);

  useTiltCard(featureCard1Ref);
  useTiltCard(featureCard2Ref);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaderHidden(true);
      initReveal('.reveal-item');
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Запускаем только один раз при монтировании

  return (
    <>
      <div className="noise-overlay"></div>

      {/* GlobalCursor renders the custom cursor layer once at app root */}

      {/* Loading Screen */}
      <div className={`loader ${loaderHidden ? 'hidden' : ''}`}>
        <div className="loader-text">ПУТЕВОДИТЕЛЬ</div>
      </div>

      {/* Navigation */}
      <nav className="nav">
        <ul className="menu-items" style={{ display: 'none' }}>
          {/* Navigation hidden for now */}
        </ul>
      </nav>

      {/* Sticky Navigation Panel (Top Right) */}
      <div className="sticky-nav">
        <button 
          type="button"
          className="nav-link nav-bot-btn hover-target" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onChatToggle) {
              onChatToggle();
            } else {
              console.error('onChatToggle is not defined!');
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{ 
            cursor: 'pointer', 
            pointerEvents: 'auto', 
            position: 'relative', 
            zIndex: 1000,
            isolation: 'isolate'
          }}
        >
          NEUROVALUSHA
        </button>
        <button 
          className="nav-link hover-target" 
          onClick={onStartClick}
        >
          Значки
        </button>
      </div>

      {/* Left Navigation Link */}
      <button
        type="button"
        className="nav-image-container nav-home hover-target"
        onClick={onAboutCampClick}
        aria-label="О лагере"
      >
        <img
          src={`${import.meta.env.BASE_URL}Gemini_Generated_Image_ct40o9ct40o9ct40.png?v=2`}
          alt="Домик"
        />
      </button>
      <button className="nav-link-left hover-target" onClick={onAboutCampClick}>
        О лагере
      </button>

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-bg"></div>
          <div className="hero-content">
            <h1 className="hero-title reveal-item hover-target" style={{ transitionDelay: '0.2s' }}>
              <span className="hero-title-first-word">Путеводитель</span>
              <span>по</span>
              <span>Реальному</span>
              <span className="highlight">Лагерю.</span>
            </h1>
          </div>
        </section>

        {/* Marquee Separator */}
        <div className="marquee">
          <div className="marquee-track">
            <div className="marquee-item hover-target">
              ВЫБИРАЙ ЗВЕЗДУ. ДВИГАЙСЯ ВПЕРЁД. ОСТАВЛЯЙ СЛЕД. ТВОЙ ОПЫТ — ТВОЙ ПУТЬ. РЕАЛЬНЫЕ ЗНАЧКИ ПОДСКАЖУТ, КУДА ИДТИ. •{' '}
            </div>
            <div className="marquee-item hover-target">
              ВЫБИРАЙ ЗВЕЗДУ. ДВИГАЙСЯ ВПЕРЁД. ОСТАВЛЯЙ СЛЕД. ТВОЙ ОПЫТ — ТВОЙ ПУТЬ. РЕАЛЬНЫЕ ЗНАЧКИ ПОДСКАЖУТ, КУДА ИДТИ. •{' '}
            </div>
          </div>
        </div>

        {/* Subtitle Section (after marquee) */}
        <section className="subtitle-section">
          <p className="subtitle-text reveal-on-scroll">
            Добро пожаловать в космическое путешествие по системе значков и достижений!{' '}
            <button className="subtitle-highlight hover-target" onClick={onStartClick}>
              Здесь вы найдете 242 значка в 14 категориях.
            </button>
          </p>
        </section>

        {/* Manifesto Section */}
        <section className="manifesto">
          <div className="manifesto-statement reveal-on-scroll">
            <h2>Значки здесь — не награды, а маршруты развития.</h2>
            <p>
              В Реальном Лагере значки — не просто «ачивки» за выполнение заданий. Это путеводные звёзды, которые помогают выбрать твой собственный путь. Каждый значок — не медаль за прошлое, а маяк, освещающий направления твоего развития.
            </p>
          </div>
          <div className="manifesto-visual reveal-on-scroll">
            <div className="manifesto-sticker">
              <img src={`${import.meta.env.BASE_URL}image.png`} alt="Стикер" className="sticker-image" />
            </div>
            <div className="orb orb-1"></div>
            <div className="orb orb-2"></div>
          </div>
        </section>

        {/* Features Grid - Philosophy of Badges */}
        <section className="features">
          <div className="features-grid">
            {/* Feature 2 */}
            <div className="feature-card tilt-card reveal-on-scroll" ref={featureCard1Ref} style={{ transitionDelay: '0.1s' }}>
              <img
                src={`${import.meta.env.BASE_URL}image (24).jpg`}
                alt="Реальный Значок = Опыт"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '16px',
                  marginBottom: '1.5rem',
                  objectFit: 'cover',
                  boxShadow: '0 20px 60px rgba(139, 0, 255, 0.4), 0 10px 30px rgba(139, 0, 255, 0.3)',
                }}
              />
              <h3>Реальный Значок = Опыт</h3>
              <p>
                Здесь главная награда — не значок, а опыт и навыки, которые ты получаешь, выполняя задания. Новые друзья, настоящие проекты, полезные привычки и идеи — всё это остаётся с тобой.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="feature-card tilt-card reveal-on-scroll" ref={featureCard2Ref} style={{ transitionDelay: '0.2s' }}>
              <img
                src={`${import.meta.env.BASE_URL}image (1).png`}
                alt="Реальный Значок — компас"
                style={{
                  width: '100%',
                  height: 'auto',
                  marginBottom: '1.5rem',
                  background: 'transparent',
                  display: 'block',
                  filter: 'drop-shadow(0 30px 80px rgba(139, 0, 255, 0.6)) drop-shadow(0 15px 50px rgba(139, 92, 246, 0.5))',
                  transform: 'scale(1.5)',
                  transformOrigin: 'center top',
                }}
              />
              <h3>Реальный Значок — компас</h3>
              <p>Только ты выбираешь, какие значки будут на твоём пути. Вожатые и Путеводитель предложат варианты, но выбор и движение всегда за тобой.</p>
            </div>
          </div>
        </section>

        {/* Final Footer CTA */}
        <footer className="footer">
          <h2 className="reveal-on-scroll">Готов начать?</h2>
          <button className="btn-agency hover-target reveal-on-scroll" onClick={onStartClick} id="footer-start-btn">
            <span>Начать путешествие</span>
          </button>

          <div className="footer-links">
            <button className="hover-target" onClick={onStartClick}>
              Значки
            </button>
            <button className="hover-target" onClick={onAboutCampClick}>
              О лагере
            </button>
            <a href="https://vk.com/realcampspb" className="hover-target" target="_blank" rel="noopener noreferrer">
              ВКонтакте
            </a>
          </div>
        </footer>
      </main>

      {/* ChatBot and ChatAvatar */}
      <Suspense fallback={null}>
        <ChatAvatar 
          onClick={onChatToggle} 
          isOpen={isChatOpen} 
        />
        <ChatBot 
          isOpen={isChatOpen} 
          onClose={onChatClose} 
          currentView={currentView}
          currentCategory={selectedCategory}
          currentBadge={selectedBadge}
          currentLevel={selectedLevel}
          currentLevelBadgeTitle={currentLevelBadgeTitle}
        />
      </Suspense>
    </>
  );
};

export default BlueNestLanding;

