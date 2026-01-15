import React from 'react';
import '../styles/additional-material.css';

interface AdditionalMaterialViewProps {
  title: string;
  contentHtml: string;
  onBack: () => void;
}

const AdditionalMaterialView: React.FC<AdditionalMaterialViewProps> = ({ title, contentHtml, onBack }) => (
  <div className="additional-material-view">
    <header className="additional-material-topbar" aria-label="Навигация">
      <div className="additional-material-topbar-inner">
        <button type="button" onClick={onBack} className="additional-material-back">
          <span aria-hidden="true">←</span>
          <span>Назад</span>
        </button>
        <h1 className="additional-material-title">{title}</h1>
      </div>
    </header>

    <main className="additional-material-content">
      <article className="additional-material-prose" dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </main>
  </div>
);

export default AdditionalMaterialView;

