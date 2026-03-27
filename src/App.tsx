import React from 'react';
import { LoadingScreen } from './app/LoadingScreen';
import { AppViewRouter } from './app/AppViewRouter';
import { useAppController } from './app/useAppController';
import { PathFavToast } from './components/PathFavToast';
import { useKeyboardDetection } from './hooks/useKeyboardDetection';

const App: React.FC = () => {
  const controller = useAppController();
  
  // Отслеживаем программную клавиатуру на мобильных
  useKeyboardDetection();

  return (
    <div className="app">
      <AppViewRouter controller={controller} fallback={<LoadingScreen />} />
      <PathFavToast />
    </div>
  );
};

export default App;
