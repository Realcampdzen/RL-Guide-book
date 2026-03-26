import React from 'react';
import { LoadingScreen } from './app/LoadingScreen';
import { AppViewRouter } from './app/AppViewRouter';
import { useAppController } from './app/useAppController';
import { PathFavToast } from './components/PathFavToast';

const App: React.FC = () => {
  const controller = useAppController();

  return (
    <div className="app">
      <AppViewRouter controller={controller} fallback={<LoadingScreen />} />
      <PathFavToast />
    </div>
  );
};

export default App;
