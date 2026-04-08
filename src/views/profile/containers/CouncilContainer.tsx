import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CouncilDashboard } from '../../../components/CouncilDashboard';
import { type CouncilTabId } from '../../../components/CouncilDashboard';

const councilTabItems: Array<{ id: CouncilTabId; label: string; icon: string }> = [
  { id: 'council', label: 'Совет', icon: '👑' },
  { id: 'engines', label: 'Движки', icon: '🚀' },
  { id: 'camp-management', label: 'Инициативы', icon: '🏕️' },
  { id: 'management', label: 'Управление', icon: '📊' }, // We'll conditionally show this
  { id: 'badge', label: 'Значок', icon: '🎖️' },
];

interface CouncilContainerProps {
  variant?: 'accordion' | 'cabin';
  onNavigateToBadge: (badgeId: string) => void;
  onOpenTeamPanel: () => void;
  onScrollToTeam: () => void;
  onSuggestInitiative?: () => void;
  canModerate?: boolean;
}

export const CouncilContainer: React.FC<CouncilContainerProps> = ({
  variant = 'accordion',
  onNavigateToBadge,
  onOpenTeamPanel,
  onScrollToTeam,
  onSuggestInitiative,
  canModerate = false,
}) => {
  const [activeTab, setActiveTab] = useState<CouncilTabId>('council');
  const [dockRendered, setDockRendered] = useState(false);

  useEffect(() => {
    setDockRendered(true);
    
    // External tab opener event listener
    const handleOpenTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.panel === 'council' && customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };
    window.addEventListener('profile:openTab', handleOpenTab);
    return () => window.removeEventListener('profile:openTab', handleOpenTab);
  }, []);

  const dockContainer = dockRendered && variant === 'cabin' ? document.getElementById('profile-dock-container') : null;

  // Filter out the 'management' tab if the user cannot moderate
  const activeTabs = councilTabItems.filter(t => t.id === 'management' ? canModerate : true);

  return (
    <>
      <CouncilDashboard
        variant={variant}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNavigateToBadge={onNavigateToBadge}
        onOpenTeamPanel={onOpenTeamPanel}
        onScrollToTeam={onScrollToTeam}
        onSuggestInitiative={onSuggestInitiative}
        canModerate={canModerate}
      />
      
      {dockContainer && createPortal(
        <div className="profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--council" role="tablist" aria-label="Разделы Совета Лагеря">
          {activeTabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`council-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="council-tabpanel"
                data-label={t.label}
                className={isActive ? 'active' : ''}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
                <span className="profile-tabs-nav__label">{t.label}</span>
              </button>
            );
          })}
        </div>
      , dockContainer)}
    </>
  );
};
