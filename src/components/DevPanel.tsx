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
                background: '#fff', borderRadius: expanded ? 16 : 24,
                padding: expanded ? 16 : 0, minWidth: expanded ? 220 : 0,
                transition: 'all 0.2s ease-out',
                boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            }}>
                {!expanded ? (
                    <button type="button" onClick={() => setExpanded(true)}
                        style={{
                            width: 44, height: 44, borderRadius: 22, border: 'none',
                            background: '#fff', color: '#1a1a2e',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            letterSpacing: '-0.02em',
                        }}>
                        Dev
                    </button>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#1a1a2e', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Developer</span>
                            <button type="button" onClick={() => setExpanded(false)}
                                style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
                        </div>

                        {/* Current role */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px', borderRadius: 8,
                            background: '#f5f5f5',
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: 3, background: roleColor }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{currentRoleInfo.label}</span>
                        </div>

                        {/* Role dropdown */}
                        <select value={currentRole} onChange={e => void handleSwitch(e.target.value)} disabled={busy}
                            style={{
                                width: '100%', padding: '8px 10px', borderRadius: 8,
                                border: '1px solid #e5e5e5', background: '#fff',
                                color: '#1a1a2e', fontSize: 12, fontWeight: 500,
                                outline: 'none', cursor: 'pointer',
                                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                            }}>
                            {ROLES.map(r => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                        </select>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button"
                                style={{
                                    flex: 1, padding: '7px 8px', fontSize: 11, fontWeight: 600,
                                    border: '1px solid #e5e5e5', borderRadius: 8,
                                    background: '#fff', color: '#666',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                }}
                                onClick={() => void handleSwitch('developer')}>
                                Reset
                            </button>
                            {onOpenDashboard && (
                                <button type="button"
                                    style={{
                                        flex: 1, padding: '7px 8px', fontSize: 11, fontWeight: 600,
                                        border: 'none', borderRadius: 8,
                                        background: '#1a1a2e', color: '#fff',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                    }}
                                    onClick={onOpenDashboard}>
                                    Пульт
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
                    background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    color: '#1a1a2e', fontSize: 12, fontWeight: 500,
                    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                }}>
                    {toast}
                </div>
            )}
        </>
    );
};

export default DevPanel;
