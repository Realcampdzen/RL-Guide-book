import React from 'react';

interface IntroScreenProps {
  onLogoClick: () => void;
  onStartClick: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onLogoClick, onStartClick }) => (
  <div className="intro-screen">
    <div className="intro-logo" onClick={onLogoClick}>
      <img src="/RL-Guide-book/домик_AI.jpg" alt="Логотип" />
      <div className="logo-hover-text">Звёздный Городок 2025</div>
    </div>
    <div className="intro-content">
      <h1>Путеводитель по Реальному Лагерю</h1>
      <p>
        Здесь знакомимся с уникальной системой значков и достижений!
      </p>
      <div className="philosophy-section">
        <p className="philosophy-main">
          <strong>Значки — это поступки, а не картинки.</strong>
        </p>
        <div className="philosophy-points">
          <div className="point">
            <span className="point-icon">⭐</span>
            <div>
              <strong>Каждый значок = путь.</strong><br/>
              Это путь действия — от замысла к делу, от идеи к полезности.
            </div>
          </div>
          <div className="point">
            <span className="point-icon">🚀</span>
            <div>
              <strong>Значки — это опыт и развитие.</strong><br/>
              Мы ценим вклад, инициативу, ответственность и практику.
            </div>
          </div>
        </div>
      </div>
      <p className="start-instruction">
        Нажмите кнопку, чтобы перейти к категориям.
      </p>
      <button onClick={onStartClick} className="start-button">
        К категориям
      </button>
    </div>
  </div>
);

export default IntroScreen;