import type React from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TeamDashboard, type TeamTabId } from '../../../components/TeamDashboard';

const teamTabItems: Array<{ id: TeamTabId; label: string; icon: string }> = [
  { id: 'engine', label: 'Мой Движок', icon: '🚀' },
  { id: 'engine-plan', label: 'План Движка', icon: '🗓️' },
  { id: 'engine-path', label: 'Путь Движка', icon: '🧩' },
  { id: 'camp-control', label: 'Управление Лагерем', icon: '🏕️' },
];

interface TeamContainerProps {
  variant?: 'accordion' | 'cabin';
  forceExpanded?: boolean;
  onNavigateToBadge: (badgeId: string) => void;
  onSuggestInitiative?: () => void;
}

export const TeamContainer: React.FC<TeamContainerProps> = ({
  variant = 'accordion',
  forceExpanded,
  onNavigateToBadge,
  onSuggestInitiative,
}) => {
  const [activeTab, setActiveTab] = useState<TeamTabId>('engine');
  const [dockRendered, setDockRendered] = useState(false);

  useEffect(() => {
    setDockRendered(true);

    // External tab opener event listener
    const handleOpenTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.panel === 'team' && customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };
    window.addEventListener('profile:openTab', handleOpenTab);
    return () => window.removeEventListener('profile:openTab', handleOpenTab);
  }, []);

  const dockContainer =
    dockRendered && variant === 'cabin' ? document.getElementById('profile-dock-container') : null;

  return (
    <>
      <TeamDashboard
        variant={variant}
        forceExpanded={forceExpanded}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNavigateToBadge={onNavigateToBadge}
        onSuggestInitiative={onSuggestInitiative}
      />

      {dockContainer &&
        createPortal(
          <div
            className="profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--team"
            role="tablist"
            aria-label="Разделы Движка"
          >
            {teamTabItems.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  id={`team-tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="team-tabpanel"
                  data-label={t.label}
                  className={isActive ? 'active' : ''}
                  onClick={() => setActiveTab(t.id)}
                >
                  <span className="profile-tabs-nav__icon" aria-hidden="true">
                    {t.icon}
                  </span>
                  <span className="profile-tabs-nav__label">{t.label}</span>
                </button>
              );
            })}
          </div>,
          dockContainer
        )}
    </>
  );
};
