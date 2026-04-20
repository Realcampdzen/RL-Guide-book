import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { CounselorSquadProvider } from './context/CounselorSquadContext';
import { HintOverlayProvider } from './context/HintOverlayContext';
import { ProgressProvider } from './context/ProgressContext';
import { TeamProvider } from './context/TeamContext';
import { DataProvider } from './context/DataContext';
import { setupGodModeInterceptor } from './utils/godModeInterceptor';

import './styles/tailwind.css';
import './styles/profile-view-spaceship.css';

import { SpeedInsights } from '@vercel/speed-insights/react';

// Init Presenter God Mode early
setupGodModeInterceptor();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <DataProvider>
        <AuthProvider>
          <ProgressProvider>
            <TeamProvider>
              <CounselorSquadProvider>
                <HintOverlayProvider>
                  <div className="profile-spaceship-root" data-profile-mode="spaceship">
                    <App />
                    <SpeedInsights />
                  </div>
                </HintOverlayProvider>
              </CounselorSquadProvider>
            </TeamProvider>
          </ProgressProvider>
        </AuthProvider>
      </DataProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Register Service Worker only in production builds.
// Extra safety: when running a production build on localhost, auto-unregister any SW to avoid "stale UI" from cache.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  window.addEventListener('load', () => {
    if (isLocalhost) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          for (const r of regs) r.unregister();
        })
        .catch(() => {
          // Silent: SW must never break app startup.
        });
      return;
    }

    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).catch(() => {
      // Silent: SW must never break app startup.
    });
  });
}
