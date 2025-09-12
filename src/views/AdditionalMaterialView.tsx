import React from 'react';

interface AdditionalMaterialViewProps {
  title: string;
  contentHtml: string;
  onBack: () => void;
}

const AdditionalMaterialView: React.FC<AdditionalMaterialViewProps> = ({ title, contentHtml, onBack }) => (
  <div className="additional-material-screen">
    <div className="header">
      <button onClick={onBack} className="back-button">← Назад к категории</button>
      <h1 className="app-title">{title}</h1>
    </div>
    <div className="additional-material-content">
      <div className="additional-material-text" dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </div>
  </div>
);

export default AdditionalMaterialView;

