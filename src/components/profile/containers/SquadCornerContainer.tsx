import type React from 'react';
import { useEffect, useState } from 'react';
import { FeatureGate } from '../../../components/FeatureGate';
import { SquadCabinetPanel } from '../../../components/SquadCabinetPanel';
import { SquadCornerDashboard } from '../../../components/SquadCornerDashboard';
import type { SquadCorner } from '../../../utils/badgeApprovalApi';

export type SquadCornerTabId = 'squad' | 'photos' | 'planner' | 'flag-badges';

interface SquadCornerContainerProps {
  travelerMode: boolean;
  travelerGateReason: string | null | undefined;
  openUnlockByCode: () => void;
  mySquadInfo: any;
  canEditSquadCorner: boolean;
  squadCornerReturnToOrganizer: boolean;
  setSquadCornerReturnToOrganizer: (val: boolean) => void;
  setActiveTab: (tab: any) => void;
  openCabinPanel: (panel: any, side: any) => void;
  role: string | null;
  deviceId: string | null | undefined;
  accessToken: string | null | undefined;
  userData: any;
  loadMySquadInfo: () => Promise<void>;
  showHint: (hint: { title: string; content: string }) => void;
  isSpaceshipMode: boolean;
  onNavigateToBadge: (id: string) => void;
  hasSquadMembership: boolean;
  persistSquadCorner: (payload: Partial<SquadCorner>) => Promise<any>;
  createSquadFromCorner: (payload: Partial<SquadCorner>) => Promise<any>;
}

export const SquadCornerContainer: React.FC<SquadCornerContainerProps> = ({
  travelerMode,
  travelerGateReason,
  openUnlockByCode,
  mySquadInfo,
  canEditSquadCorner,
  squadCornerReturnToOrganizer,
  setSquadCornerReturnToOrganizer,
  setActiveTab,
  openCabinPanel,
  role,
  deviceId,
  accessToken,
  userData,
  loadMySquadInfo,
  showHint,
  isSpaceshipMode,
  onNavigateToBadge,
  hasSquadMembership,
  persistSquadCorner,
  createSquadFromCorner,
}) => {
  const [squadCornerActiveTab, setSquadCornerActiveTab] = useState<SquadCornerTabId>('squad');

  // Listen for external tab switching
  useEffect(() => {
    const handleOpenTab = (e: any) => {
      if (e.detail?.panel === 'squad-corner' && e.detail?.tab) {
        setSquadCornerActiveTab(e.detail.tab as SquadCornerTabId);
      }
    };
    window.addEventListener('profile:openTab', handleOpenTab);
    return () => window.removeEventListener('profile:openTab', handleOpenTab);
  }, []);

  const handleBackToShifts = () => {
    setSquadCornerReturnToOrganizer(false);
    setActiveTab('active');
    openCabinPanel(null, null);
    setTimeout(
      () =>
        document
          .getElementById('organizer-shifts-tab-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      80
    );
  };

  const handleOpenShifts = () => {
    setActiveTab('squads');
    openCabinPanel(null, null);
    setTimeout(
      () =>
        document
          .getElementById('organizer-shifts-tab-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      80
    );
  };

  const renderContent = () => {
    if (Boolean(mySquadInfo?.membership?.squadId) && squadCornerActiveTab === 'squad') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(canEditSquadCorner || squadCornerReturnToOrganizer) && (
            <div
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}
            >
              {squadCornerReturnToOrganizer ? (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 12px' }}
                  onClick={handleBackToShifts}
                >
                  Назад к Сменам и отрядам
                </button>
              ) : (
                <span />
              )}
              {canEditSquadCorner && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 12px' }}
                  onClick={() => setSquadCornerActiveTab('photos')}
                >
                  Редактировать уголок
                </button>
              )}
            </div>
          )}
          <SquadCabinetPanel
            role={role || 'traveler'}
            deviceId={deviceId || undefined}
            accessToken={accessToken || undefined}
            myNickname={userData?.profile?.nickname || undefined}
            mySquadInfo={mySquadInfo}
            onRefresh={loadMySquadInfo}
            onAfterLeave={() => setSquadCornerActiveTab('squad')}
            onShowHint={({ title, content }) => showHint({ title, content })}
            onEditCorner={
              canEditSquadCorner
                ? (t) => setSquadCornerActiveTab(t === 'planner' ? 'planner' : 'photos')
                : undefined
            }
          />
        </div>
      );
    }

    if (isSpaceshipMode) {
      return (
        <SquadCornerDashboard
          variant="cabin"
          activeTab={squadCornerActiveTab}
          onTabChange={setSquadCornerActiveTab}
          onNavigateToBadge={onNavigateToBadge}
          hasSquadMembership={hasSquadMembership}
          mySquadName={mySquadInfo?.squad?.name || undefined}
          canEditCorner={canEditSquadCorner}
          canCreateSquadFromCorner={canEditSquadCorner}
          onOpenCabinet={() => setSquadCornerActiveTab('squad')}
          onOpenShiftsAndSquads={handleOpenShifts}
          onPersistCorner={persistSquadCorner}
          onCreateSquadFromCorner={createSquadFromCorner}
        />
      );
    }

    return (
      <SquadCornerDashboard
        onNavigateToBadge={onNavigateToBadge}
        hasSquadMembership={hasSquadMembership}
        mySquadName={mySquadInfo?.squad?.name || undefined}
        canEditCorner={canEditSquadCorner}
        canCreateSquadFromCorner={canEditSquadCorner}
        onOpenCabinet={() => setSquadCornerActiveTab('squad')}
        onOpenShiftsAndSquads={handleOpenShifts}
        onPersistCorner={persistSquadCorner}
        onCreateSquadFromCorner={createSquadFromCorner}
      />
    );
  };

  if (travelerMode) {
    return (
      <FeatureGate
        allowed={false}
        reason={travelerGateReason || undefined}
        ctaLabel="Разблокировать по коду"
        onCta={openUnlockByCode}
      >
        {renderContent()}
      </FeatureGate>
    );
  }

  return renderContent();
};
