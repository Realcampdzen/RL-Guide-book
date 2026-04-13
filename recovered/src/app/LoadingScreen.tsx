import type React from 'react';

export const LoadingScreen: React.FC = () => (
  <div className="loading-screen">
    <div className="loading-content">
      <div className="loading-spinner"></div>
      <p>Загрузка...</p>
    </div>
  </div>
);
