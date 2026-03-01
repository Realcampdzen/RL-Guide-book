import React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SquadMember {
    deviceId: string;
    nickname?: string | null;
    role?: string;
    joinedAt?: string;
}

interface StaffDashboardPanelProps {
    pendingRequests: number;
    pendingPlans: number;
    approvedToday: number;
    squadMembers: SquadMember[];
    onOpenRequestsInbox: () => void;
    onOpenPlansInbox: () => void;
    onRefresh: () => void;
    busy: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CARD_STYLE: React.CSSProperties = {
    flex: '1 1 0',
    minWidth: 90,
    padding: '14px 12px',
    borderRadius: 14,
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.08)',
};

const roleBadge = (role?: string) => {
    if (!role) return null;
    const map: Record<string, { label: string; color: string }> = {
        counselor: { label: 'Вожатый', color: 'rgba(245,158,11,0.7)' },
        educator: { label: 'Педагог', color: 'rgba(99,179,237,0.7)' },
        shift_leader: { label: 'Ст. вожатый', color: 'rgba(167,139,250,0.7)' },
        camp_director: { label: 'Директор', color: 'rgba(248,113,113,0.7)' },
        participant: { label: 'Участник', color: 'rgba(255,255,255,0.25)' },
        developer: { label: 'Dev', color: 'rgba(52,211,153,0.7)' },
    };
    const entry = map[role] || { label: role, color: 'rgba(255,255,255,0.25)' };
    return (
        <span style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 6,
            background: entry.color,
            color: '#fff',
            fontWeight: 600,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
        }}>
            {entry.label}
        </span>
    );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StaffDashboardPanel: React.FC<StaffDashboardPanelProps> = ({
    pendingRequests,
    pendingPlans,
    approvedToday,
    squadMembers,
    onOpenRequestsInbox,
    onOpenPlansInbox,
    onRefresh,
    busy,
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ---------- Counter cards ---------- */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ ...CARD_STYLE, background: 'rgba(245,158,11,0.12)' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b', lineHeight: 1.1 }}>{pendingRequests}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Заявок на проверке</div>
                </div>
                <div style={{ ...CARD_STYLE, background: 'rgba(245,158,11,0.12)' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b', lineHeight: 1.1 }}>{pendingPlans}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Планов на проверке</div>
                </div>
                <div style={{ ...CARD_STYLE, background: 'rgba(52,211,153,0.12)' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399', lineHeight: 1.1 }}>{approvedToday}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Одобрено сегодня</div>
                </div>
            </div>

            {/* ---------- Quick actions ---------- */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '8px 14px', fontSize: 12 }}
                    onClick={onOpenRequestsInbox}
                >
                    📬 Входящие заявки{pendingRequests > 0 ? ` (${pendingRequests})` : ''}
                </button>
                <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '8px 14px', fontSize: 12 }}
                    onClick={onOpenPlansInbox}
                >
                    📋 Входящие планы{pendingPlans > 0 ? ` (${pendingPlans})` : ''}
                </button>
                <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '8px 14px', fontSize: 12 }}
                    disabled={busy}
                    onClick={onRefresh}
                >
                    {busy ? 'Обновляем…' : '🔄 Обновить'}
                </button>
            </div>

            {/* ---------- Squad members ---------- */}
            <div style={{
                padding: 12,
                borderRadius: 12,
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>
                    Участники отряда ({squadMembers.length})
                </div>
                {squadMembers.length === 0 ? (
                    <div style={{ fontSize: 12, opacity: 0.6 }}>Нет участников. Привяжите отряд через код приглашения.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                        {squadMembers.map((m) => (
                            <div
                                key={m.deviceId}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '4px 6px',
                                    borderRadius: 6,
                                    background: 'rgba(255,255,255,0.03)',
                                    fontSize: 12,
                                }}
                            >
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {m.nickname || 'Без ника'}
                                </span>
                                {roleBadge(m.role)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffDashboardPanel;
