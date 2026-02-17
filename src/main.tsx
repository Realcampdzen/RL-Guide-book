import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import { ProgressProvider } from './context/ProgressContext'
import { HintOverlayProvider } from './context/HintOverlayContext'
import { TeamProvider } from './context/TeamContext'
import { CounselorSquadProvider } from './context/CounselorSquadContext'
import { AuthProvider } from './context/AuthContext'

import './styles/tailwind.css'
import './styles/profile-view-spaceship.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ProgressProvider>
          <TeamProvider>
          <CounselorSquadProvider>
          <HintOverlayProvider>
            <div className="profile-spaceship-root" data-profile-mode="spaceship">
              <App />
            </div>
          </HintOverlayProvider>
          </CounselorSquadProvider>
        </TeamProvider>
      </ProgressProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

// Register Service Worker only in production builds (avoid dev caching headaches).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).catch(() => {
      // Silent: SW must never break app startup.
    });
  });
}
