import React from 'react';

interface AboutCampViewProps {
  onBack: () => void;
}

const AboutCampView: React.FC<AboutCampViewProps> = ({ onBack }) => (
  <div className="about-camp-screen">
    <div className="header">
      <button onClick={onBack} className="back-button">← Назад к введению</button>
      <h1 className="app-title">О лагере</h1>
    </div>
    <div className="about-camp-content">
      <div className="camp-description">
        <h2>Реальный лагерь — территория роста!</h2>
        <p>
          Здесь ребята пробуют новое, создают проекты и берут ответственность. Мы ценим
          инициативу, творчество, команду и вклад в общее дело.
        </p>
        <p>
          За смену у каждого есть шанс собрать собственный путь достижений и значков.
        </p>
      </div>
    </div>
  </div>
);

export default AboutCampView;

