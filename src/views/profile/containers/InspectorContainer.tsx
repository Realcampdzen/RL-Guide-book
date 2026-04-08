import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { InspectorDashboard } from '../../../components/InspectorDashboard';
import { useUserProgress } from '../../../hooks/useUserProgress';
import { type InspectorTabId, INSPECTOR_TAB_IDS, INSPECTOR_TAB_BADGE_IDS } from '../../../types/inspector';

const inspectorTabItems: { id: InspectorTabId; label: string; icon: string }[] = [
  { id: 'friendship', label: 'Дружбы', icon: '🤝' },
  { id: 'politeness', label: 'Вежливости', icon: '🎩' },
  { id: 'comfort', label: 'Уюта', icon: '🏠' },
  { id: 'help', label: 'Помощи', icon: '🚀' },
  { id: 'involvement', label: 'Вовлечённости', icon: '🎲' },
  { id: 'peacemaker', label: 'Спокойствия', icon: '🕊️' },
  { id: 'mood', label: 'Настроения', icon: '😊' },
  { id: 'chief', label: 'Главный', icon: '👑' }
];

interface InspectorContainerProps {
  onOpenDiary: () => void;
  onNavigateToBadge: (badgeId: string) => void;
}

export const InspectorContainer: React.FC<InspectorContainerProps> = ({ onOpenDiary, onNavigateToBadge }) => {
  const { userData } = useUserProgress();
  const [activeTab, setActiveTab] = useState<InspectorTabId>('friendship');
  const [dockRendered, setDockRendered] = useState(false);

  useEffect(() => {
    // We delay the portal rendering slightly to ensure the dock container is painted by the parent
    setDockRendered(true);
    
    // External tab opener event listener
    const handleOpenTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.panel === 'inspector' && customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };
    window.addEventListener('profile:openTab', handleOpenTab);
    return () => window.removeEventListener('profile:openTab', handleOpenTab);
  }, []);

  const isInspectorTabUnlocked = (tabId: InspectorTabId): boolean => {
    const idx = INSPECTOR_TAB_IDS.indexOf(tabId);
    if (idx <= 0) return true;
    const userProgress = userData?.progress || {};
    if (tabId === 'chief') {
      return [14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8].every(
        (base) => userProgress[`${base}.1`]?.status === 'achieved'
      );
    }
    const prevTab = INSPECTOR_TAB_IDS[idx - 1];
    const prevBadgeId = INSPECTOR_TAB_BADGE_IDS[prevTab];
    return userProgress[prevBadgeId]?.status === 'achieved';
  };

  const dockContainer = dockRendered ? document.getElementById('profile-dock-container') : null;

  return (
    <>
      <InspectorDashboard
        variant="cabin"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenDiary={onOpenDiary}
        onNavigateToBadge={onNavigateToBadge}
      />
      
      {dockContainer && createPortal(
        <div className="profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--inspector" role="tablist" aria-label="Разделы Инспектора Пользы">
          {inspectorTabItems.map((t) => {
            const unlocked = isInspectorTabUnlocked(t.id);
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`inspector-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="inspector-tabpanel"
                aria-disabled={!unlocked}
                data-label={t.label}
                title={!unlocked ? 'Сначала заверши предыдущую миссию' : undefined}
                className={isActive ? 'active' : ''}
                disabled={!unlocked}
                onClick={() => unlocked && setActiveTab(t.id)}
                style={!unlocked ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
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
