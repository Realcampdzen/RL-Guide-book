import React from 'react';
import { BroDelaPanel } from '../../BroDelaPanel';
import { BroPassportPanel } from '../../BroPassportPanel';
import { ODeConstructorPanel } from '../../ODeConstructorPanel';
import { BroSquadPanel } from '../../BroSquadPanel';
import { SquadChat } from '../../SquadChat';
import { InitiationConstructor } from '../../InitiationConstructor';
import { WingDashboard } from '../../WingDashboard';

interface BroDashboardProps {
    broTab: string;
    setBroTab: any;
    broPassportComplete: boolean;
    userData: any;
    deviceId: string;
    accessToken: string | null;
    role: string | null;
    mySquadInfo: any;
}

export const BroDashboard: React.FC<BroDashboardProps> = ({
    broTab,
    setBroTab,
    broPassportComplete,
    userData,
    deviceId,
    accessToken,
    role,
    mySquadInfo
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {broTab === 'brodela' ? (
                <BroDelaPanel />
            ) : broTab === 'ode' ? (
                <ODeConstructorPanel />
            ) : broTab === 'brosquad' ? (
                <BroSquadPanel />
            ) : broTab === 'chat' ? (
                <SquadChat
                    squadId={userData?.broProgress?.wingId || 'wing-default'}
                    accessToken={accessToken || deviceId || ''}
                    nickname={userData?.profile?.nickname || undefined}
                    deviceId={deviceId || ''}
                    role={undefined}
                    chatType="wing"
                    members={[{ deviceId: deviceId || '', nickname: userData?.profile?.nickname || null, avatarUrl: userData?.profile?.avatar || null }]}
                />
            ) : broTab === 'constructor' ? (
                <InitiationConstructor
                    onCreated={() => setBroTab('wing')}
                    onSwitchToWing={() => setBroTab('wing')}
                />
            ) : broTab === 'wing' ? (
                broPassportComplete ? (
                    <WingDashboard variant="cabin" />
                ) : (
                    <div className="fade-in" style={{
                        padding: '48px 24px', textAlign: 'center',
                        background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)', borderRadius: 16,
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🦅</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                            Крыло БРО
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, maxWidth: 340, margin: '0 auto' }}>
                            Создание своего Крыла откроется после завершения Посвящения.
                            Пройди Бросвящение, чтобы получить доступ к категории БРО и сформировать Крыло.
                        </div>
                        <button type="button" onClick={() => setBroTab('initiation')}
                            style={{
                                marginTop: 20, padding: '10px 24px', borderRadius: 12,
                                border: '1px solid rgba(124,58,237,0.4)',
                                background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'inherit', transition: 'background 0.15s',
                            }}>
                            Перейти к Бросвящению →
                        </button>
                    </div>
                )
            ) : (
                <BroPassportPanel
                    squadId={mySquadInfo?.membership?.squadId || userData?.diaryProgress?.squad?.name || 'dev-squad'}
                    deviceId={deviceId || 'dev-device'}
                    accessToken={accessToken || ''}
                    canModerate={role === 'counselor' || role === 'educator' || role === 'shift_leader' || role === 'camp_director' || role === 'developer'}
                    nickname={userData?.profile?.nickname || undefined}
                    userRole={role || undefined}
                    onWingCreated={() => setBroTab('wing')}
                />
            )}
        </div>
    );
};
