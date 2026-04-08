import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FeatureGate } from '../../../components/FeatureGate';
import { BroInitiation } from '../../../components/BroInitiation';
import { WingDashboard } from '../../../components/WingDashboard';

export type BroTabId = 'initiation' | 'wing';

const broTabItems = [
  { id: 'initiation' as const, label: 'БРОСВЯЩЕНИЕ', icon: '📘' },
  { id: 'wing' as const, label: 'Крыло', icon: '🦅' },
] satisfies Array<{ id: BroTabId; label: string; icon: string }>;

interface BroContainerProps {
  isSpaceshipMode: boolean;
  travelerMode: boolean;
  travelerGateReason: string | null | undefined;
  openUnlockByCode: () => void;
  userData: any;
  openInitiativeModal: () => void;
}

export const BroContainer: React.FC<BroContainerProps> = ({
  isSpaceshipMode,
  travelerMode,
  travelerGateReason,
  openUnlockByCode,
  userData,
  openInitiativeModal,
}) => {
  const [broActiveTab, setBroActiveTab] = useState<BroTabId>('initiation');

  useEffect(() => {
    const handleOpenTab = (e: CustomEvent<{ panel: string; tab: string }>) => {
      if (e.detail?.panel === 'bro' && e.detail?.tab) {
        setBroActiveTab(e.detail.tab as BroTabId);
      }
    };
    window.addEventListener('profile:openTab', handleOpenTab as EventListener);
    return () => window.removeEventListener('profile:openTab', handleOpenTab as EventListener);
  }, []);

  const renderBroTabsNav = (className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--bro') => (
    <div className={className} role="tablist" aria-label="Разделы БРО">
      {broTabItems.map((t) => (
        <button
          key={t.id}
          id={`bro-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={broActiveTab === t.id}
          aria-controls="bro-tabpanel"
          data-label={t.label}
          className={broActiveTab === t.id ? 'active' : ''}
          onClick={() => setBroActiveTab(t.id)}
        >
          <span className="profile-tabs-nav__icon" aria-hidden="true">{t.icon}</span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const renderContent = () => {
    if (isSpaceshipMode) {
      return (
        <div className="fade-in bro-cabin-content">
          {broActiveTab === 'initiation' ? (
            <div id="bro-section-passport" className="bro-cabin-section">
              {travelerMode ? (
                <FeatureGate allowed={false} reason={travelerGateReason || undefined} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
                  <BroInitiation variant="cabin" />
                </FeatureGate>
              ) : (
                <BroInitiation variant="cabin" />
              )}
            </div>
          ) : (
            <div id="bro-section-wing" className="bro-cabin-section">
              {travelerMode ? (
                <FeatureGate allowed={false} reason={travelerGateReason || undefined} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
                  <WingDashboard variant="cabin" onSuggestInitiative={undefined} />
                </FeatureGate>
              ) : (
                <FeatureGate
                  allowed={Boolean(userData?.broProgress?.isBro)}
                  reason="Крылья и роли БРО открываются после 100% Бропаспорта и подтверждения Бросвящения у вожатого."
                  ctaLabel="К Бропаспорту"
                  onCta={() => setBroActiveTab('initiation')}
                >
                  <WingDashboard variant="cabin" onSuggestInitiative={undefined} />
                </FeatureGate>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="profile-view-bro-two-columns">
        <div id="bro-section-passport" className="profile-view-bro-column">
          {travelerMode ? (
            <FeatureGate allowed={false} reason={travelerGateReason || undefined} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
              <BroInitiation />
            </FeatureGate>
          ) : (
            <BroInitiation />
          )}
        </div>
        <div id="bro-section-wing" className="profile-view-bro-column">
          {travelerMode ? (
            <FeatureGate allowed={false} reason={travelerGateReason || undefined} ctaLabel="Разблокировать по коду" onCta={openUnlockByCode}>
              <WingDashboard onSuggestInitiative={openInitiativeModal} />
            </FeatureGate>
          ) : (
            <FeatureGate
              allowed={Boolean(userData?.broProgress?.isBro)}
              reason="Крылья и роли БРО открываются после 100% Бропаспорта и подтверждения Бросвящения у вожатого."
              ctaLabel="К Бропаспорту"
              onCta={() => document.getElementById('bro-section-passport')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              <WingDashboard onSuggestInitiative={openInitiativeModal} />
            </FeatureGate>
          )}
        </div>
      </div>
    );
  };

  const dockedContainer = document.getElementById('profile-dock-container');

  return (
    <>
      {renderContent()}
      {dockedContainer && createPortal(renderBroTabsNav(), dockedContainer)}
    </>
  );
};
