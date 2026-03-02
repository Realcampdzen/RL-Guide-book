import React, { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DevPanelProps {
    currentRole: string;
    onRoleSwitch: (role: string) => void;
    onOpenDashboard?: () => void;
    accessToken?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLES = [
    { id: 'participant', label: 'Участник', icon: '👤' },
    { id: 'counselor', label: 'Вожатый', icon: '🏕️' },
    { id: 'educator', label: 'Педагог', icon: '📚' },
    { id: 'shift_leader', label: 'Старший Вожатый', icon: '⭐' },
    { id: 'camp_director', label: 'Начальник Лагеря', icon: '🏛️' },
    { id: 'parent', label: 'Родитель', icon: '👨‍👩‍👧' },
    { id: 'developer', label: 'Разработчик', icon: '🔧' },
];

const ROLE_COLORS: Record<string, string> = {
    participant: '#6b7280',
    counselor: '#22c55e',
    educator: '#a855f7',
    shift_leader: '#f59e0b',
    camp_director: '#ef4444',
    parent: '#3b82f6',
    developer: '#06b6d4',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiBase(): string {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
    return useLocal ? '' : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DevPanel: React.FC<DevPanelProps> = ({
    currentRole,
    onRoleSwitch,
    onOpenDashboard,
    accessToken,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const currentRoleInfo = ROLES.find(r => r.id === currentRole) ?? ROLES[0];
    const roleColor = ROLE_COLORS[currentRole] ?? '#6b7280';

    const handleSwitch = useCallback(async (roleId: string) => {
        if (!accessToken) { onRoleSwitch(roleId); return; }
        setBusy(true);
        try {
            const base = getApiBase();
            await fetch(`${base}/api/dev/switch-role`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ role: roleId }),
            });
            onRoleSwitch(roleId);
            const info = ROLES.find(r => r.id === roleId);
            setToast(`Вы сейчас как: ${info?.label ?? roleId} ${info?.icon ?? ''}`);
            setTimeout(() => setToast(null), 2500);
        } catch { /* silent */ }
        finally { setBusy(false); }
    }, [accessToken, onRoleSwitch]);

    return (
        <>
            {/* Floating panel */}
            <div style={{
                position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
                background: 'rgba(15,12,41,0.95)', backdropFilter: 'blur(12px)',
                borderRadius: expanded ? 16 : 30, border: `1px solid ${roleColor}44`,
                padding: expanded ? 14 : 0, minWidth: expanded ? 220 : 0,
                transition: 'all 0.2s ease-out',
                boxShadow: `0 4px 20px ${roleColor}22`,
            }}>
                {!expanded ? (
                    <button type="button" onClick={() => setExpanded(true)}
                        style={{
                            width: 48, height: 48, borderRadius: 24, border: 'none',
                            background: `${roleColor}22`, color: roleColor,
                            fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        {currentRoleInfo.icon}
                    </button>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#06b6d4' }}>🔧 DEV</span>
                            <button type="button" onClick={() => setExpanded(false)}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                        </div>

                        {/* Current role chip */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, background: `${roleColor}22` }}>
                            <span style={{ fontSize: 14 }}>{currentRoleInfo.icon}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: roleColor }}>{currentRoleInfo.label}</span>
                        </div>

                        {/* Role dropdown */}
                        <select value={currentRole} onChange={e => void handleSwitch(e.target.value)} disabled={busy}
                            style={{
                                width: '100%', padding: '8px 10px', borderRadius: 8,
                                border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.4)',
                                color: '#fff', fontSize: 11,
                            }}>
                            {ROLES.map(r => (
                                <option key={r.id} value={r.id}>{r.icon} {r.label}</option>
                            ))}
                        </select>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button type="button" className="btn-secondary"
                                style={{ flex: 1, padding: '6px 8px', fontSize: 10, color: '#06b6d4' }}
                                onClick={() => void handleSwitch('developer')}>
                                🔧 Reset
                            </button>
                            {onOpenDashboard && (
                                <button type="button" className="btn-secondary"
                                    style={{ flex: 1, padding: '6px 8px', fontSize: 10, color: '#f59e0b' }}
                                    onClick={onOpenDashboard}>
                                    📊 Пульт
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 80, right: 16, zIndex: 10000,
                    padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(15,12,41,0.95)', border: `1px solid ${roleColor}44`,
                    color: '#fff', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    animation: 'fadeIn 0.3s ease-in',
                }}>
                    {toast}
                </div>
            )}
        </>
    );
};

export default DevPanel;
