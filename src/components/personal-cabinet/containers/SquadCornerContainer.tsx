import type React from 'react';
import { patchSquadCorner, type SquadCorner } from '../../../utils/badgeApprovalApi';
import { CampProgramByDays } from '../../CampProgramByDays';
import { RealDiaryDashboard } from '../../RealDiaryDashboard';
import { SquadCabinetPanel } from '../../SquadCabinetPanel';
import { SquadChat } from '../../SquadChat';
import { SquadCornerDashboard } from '../../SquadCornerDashboard';

interface SquadCornerContainerProps {
  squadCornerTab: string;
  setSquadCornerTab: (tab: string) => void;
  currentRole: string | null;
  hasSquadMembership: boolean;
  mySquadInfo: any;
  userData: any;
  deviceId: string;
  accessToken: string | null;
  canEditSquadCorner: boolean;
  loadSquadInfo: () => Promise<void>;
  navigateToBadge?: (id: string, action?: 'plan' | 'confirm') => void | Promise<void>;
  defaultShiftLength: any;
  nickname?: string;
  squadChatMembers: any[];
  hasAuth: boolean;
  setActiveSection: (sec: any) => void;
}

export const SquadCornerContainer: React.FC<SquadCornerContainerProps> = ({
  squadCornerTab,
  setSquadCornerTab,
  currentRole,
  hasSquadMembership,
  mySquadInfo,
  userData,
  deviceId,
  accessToken,
  canEditSquadCorner,
  loadSquadInfo,
  navigateToBadge,
  defaultShiftLength,
  nickname,
  squadChatMembers,
  hasAuth,
  setActiveSection,
}) => {
  return (
    <div style={{ width: '100%', paddingBottom: squadCornerTab === 'chat' ? 0 : 100 }}>
      {currentRole !== 'traveler' && squadCornerTab === 'squad' ? (
        !(hasSquadMembership || userData?.diaryProgress?.squad?.name) ? (
          <SquadCabinetPanel
            key="squad-cabinet-join"
            role={currentRole as any}
            deviceId={deviceId || undefined}
            accessToken={accessToken || undefined}
            mySquadInfo={null}
            onRefresh={loadSquadInfo}
            onAfterLeave={() => setSquadCornerTab('squad')}
            diaryCorner={null}
          />
        ) : (
          <SquadCabinetPanel
            key="squad-cabinet"
            role={currentRole as any}
            deviceId={deviceId || undefined}
            accessToken={accessToken || undefined}
            mySquadInfo={mySquadInfo}
            onRefresh={loadSquadInfo}
            onAfterLeave={() => setSquadCornerTab('squad')}
            onEditCorner={
              canEditSquadCorner
                ? (t) =>
                    setSquadCornerTab(
                      t === 'planner' ? 'planner' : t === 'squad' ? 'edit-squad' : 'photos'
                    )
                : undefined
            }
            diaryCorner={userData?.diaryProgress?.squad || null}
          />
        )
      ) : squadCornerTab === 'chat' ? (
        (() => {
          const sid = (
            mySquadInfo?.membership?.squadId ||
            userData?.diaryProgress?.squad?.name ||
            ''
          ).trim();
          const isDev = import.meta.env.DEV;
          if (!sid)
            return (
              <div key="chat-empty-nosquad" className="cab-empty-state fade-in">
                <div className="cab-empty-state__icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="cab-empty-state__title">Чат недоступен</div>
                <div className="cab-empty-state__desc">
                  Сначала вступите в отряд, чтобы начать общаться.
                </div>
              </div>
            );
          if (!hasAuth)
            return (
              <div key="chat-empty-noauth" className="cab-empty-state fade-in">
                <div className="cab-empty-state__icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="cab-empty-state__title">Чат недоступен</div>
                <div className="cab-empty-state__desc">
                  {isDev
                    ? 'Для работы чата необходим бэкенд. Запустите python backend/app.py и авторизуйтесь.'
                    : 'Для доступа к чату необходимо войти в систему.'}
                </div>
              </div>
            );
          return (
            <SquadChat
              key="chat-active"
              squadId={sid}
              accessToken={accessToken || ''}
              nickname={nickname}
              deviceId={deviceId}
              role={currentRole || undefined}
              members={squadChatMembers}
              height="calc(100vh - 126px)"
              minHeight={0}
            />
          );
        })()
      ) : squadCornerTab === 'schedule' ? (
        <RealDiaryDashboard
          key="schedule-container"
          variant="cabin"
          activeTab="schedule"
          onNavigateToBadge={navigateToBadge as any}
        />
      ) : squadCornerTab === 'program' ? (
        <CampProgramByDays defaultShiftLength={defaultShiftLength} />
      ) : squadCornerTab === 'edit-squad' ? (
        <SquadCornerDashboard
          key="edit-squad"
          variant="cabin"
          activeTab="squad"
          onTabChange={(tab) => {
            // 'squad' tab in editor means go back to cabinet view
            if (tab === 'squad') setSquadCornerTab('squad');
            else setSquadCornerTab(tab);
          }}
          onNavigateToBadge={navigateToBadge as any}
          hasSquadMembership={hasSquadMembership}
          mySquadName={userData?.diaryProgress?.squad?.name || undefined}
          canEditCorner={canEditSquadCorner}
          canCreateSquadFromCorner={false}
          onOpenCabinet={() => setSquadCornerTab('squad')}
          onOpenShiftsAndSquads={() => setActiveSection('shifts')}
          onPersistCorner={
            accessToken && mySquadInfo?.membership?.squadId
              ? async (payload: Partial<SquadCorner>) => {
                  await patchSquadCorner(accessToken, mySquadInfo!.membership!.squadId, payload);
                }
              : undefined
          }
        />
      ) : (
        <SquadCornerDashboard
          key={squadCornerTab}
          variant="cabin"
          activeTab={squadCornerTab as any}
          onTabChange={setSquadCornerTab as any}
          onNavigateToBadge={navigateToBadge as any}
          hasSquadMembership={hasSquadMembership}
          mySquadName={userData?.diaryProgress?.squad?.name || undefined}
          canEditCorner={canEditSquadCorner}
          canCreateSquadFromCorner={canEditSquadCorner}
          onOpenCabinet={() => setSquadCornerTab('squad')}
          onOpenShiftsAndSquads={() => setActiveSection('shifts')}
          onPersistCorner={
            accessToken && mySquadInfo?.membership?.squadId
              ? async (payload: Partial<SquadCorner>) => {
                  await patchSquadCorner(accessToken, mySquadInfo!.membership!.squadId, payload);
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
