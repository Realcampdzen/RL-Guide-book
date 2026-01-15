import React from 'react';
import '../styles/introduction.css';

type IntroductionViewProps = {
  title: string;
  contentHtml: string;
  onBack: () => void;
};

const IntroductionView: React.FC<IntroductionViewProps> = ({ title, contentHtml, onBack }) => {
  return (
    <div className="introduction-view">
      <header className="introduction-topbar" aria-label="Навигация">
        <div className="introduction-topbar-inner">
          <button type="button" onClick={onBack} className="introduction-back">
            <span aria-hidden="true">←</span>
            <span>Назад</span>
          </button>
          <h1 className="introduction-title">{title}</h1>
        </div>
      </header>

      <main className="introduction-content">
        <article className="introduction-prose" dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </main>
    </div>
  );
};

export default IntroductionView;

