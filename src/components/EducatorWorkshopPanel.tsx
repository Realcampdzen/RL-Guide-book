import React, { useCallback, useEffect, useState } from 'react';
import {
    fetchWorkshop,
    updateWorkshop,
    addParticipant,
    addBadge,
    removeBadge,
    confirmBadge,
    type Workshop,
} from '../utils/workshopApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EducatorWorkshopPanelProps {
    workshopId: string;
    accessToken?: string | null;
    canEdit?: boolean;
}

type TabId = 'info' | 'participants' | 'badges' | 'confirmations';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT = '#a855f7';
const TABS: Array<{ id: TabId; label: string; icon: string }> = [
    { id: 'info', label: 'Информация', icon: '📝' },
    { id: 'participants', label: 'Участники', icon: '👥' },
    { id: 'badges', label: 'Значки', icon: '🏅' },
    { id: 'confirmations', label: 'Подтверждения', icon: '✅' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const EducatorWorkshopPanel: React.FC<EducatorWorkshopPanelProps> = ({
    workshopId,
    accessToken,
    canEdit,
}) => {
    const [ws, setWs] = useState<Workshop | null>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<TabId>('info');
    const [busy, setBusy] = useState(false);

    // Form state
    const [editName, setEditName] = useState('');
    const [editDir, setEditDir] = useState('');
    const [addDeviceId, setAddDeviceId] = useState('');
    const [addNickname, setAddNickname] = useState('');
    const [addBadgeId, setAddBadgeId] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchWorkshop(workshopId);
            setWs(data);
            setEditName(data.name);
            setEditDir(data.direction ?? '');
        } catch { setWs(null); }
        finally { setLoading(false); }
    }, [workshopId]);

    useEffect(() => { void load(); }, [load]);

    const handleSaveInfo = useCallback(async () => {
        if (!accessToken || !editName.trim()) return;
        setBusy(true);
        try { await updateWorkshop(accessToken, workshopId, { name: editName.trim(), direction: editDir.trim() || undefined }); void load(); }
        catch { /* */ }
        finally { setBusy(false); }
    }, [accessToken, workshopId, editName, editDir, load]);

    const handleAddParticipant = useCallback(async () => {
        if (!accessToken || !addDeviceId.trim()) return;
        setBusy(true);
        try { await addParticipant(accessToken, workshopId, { deviceId: addDeviceId.trim(), nickname: addNickname.trim() || undefined }); setAddDeviceId(''); setAddNickname(''); void load(); }
        catch { /* */ }
        finally { setBusy(false); }
    }, [accessToken, workshopId, addDeviceId, addNickname, load]);

    const handleAddBadge = useCallback(async () => {
        if (!accessToken || !addBadgeId.trim()) return;
        setBusy(true);
        try { await addBadge(accessToken, workshopId, addBadgeId.trim()); setAddBadgeId(''); void load(); }
        catch { /* */ }
        finally { setBusy(false); }
    }, [accessToken, workshopId, addBadgeId, load]);

    const handleRemoveBadge = useCallback(async (badgeId: string) => {
        if (!accessToken) return;
        setBusy(true);
        try { await removeBadge(accessToken, workshopId, badgeId); void load(); }
        catch { /* */ }
        finally { setBusy(false); }
    }, [accessToken, workshopId, load]);

    const handleConfirm = useCallback(async (badgeId: string, deviceId: string) => {
        if (!accessToken) return;
        setBusy(true);
        try { await confirmBadge(accessToken, workshopId, badgeId, deviceId); void load(); }
        catch { /* */ }
        finally { setBusy(false); }
    }, [accessToken, workshopId, load]);

    if (loading && !ws) return <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Загрузка мастерской…</div>;
    if (!ws) return <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Мастерская не найдена.</div>;

    const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 12, marginBottom: 6, boxSizing: 'border-box' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: ACCENT }}>🎓 {ws.name}</span>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} disabled={loading} onClick={() => void load()}>🔄</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {TABS.map(t => (
                    <button key={t.id} type="button" className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 10, background: tab === t.id ? `${ACCENT}22` : undefined, color: tab === t.id ? ACCENT : undefined, border: tab === t.id ? `1px solid ${ACCENT}44` : undefined }}
                        onClick={() => setTab(t.id)}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Info tab */}
            {tab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Название мастерской" style={inputStyle} disabled={!canEdit} />
                    <input type="text" value={editDir} onChange={e => setEditDir(e.target.value)} placeholder="Направление" style={inputStyle} disabled={!canEdit} />
                    {canEdit && <button type="button" className="btn-secondary" disabled={busy} onClick={() => void handleSaveInfo()} style={{ alignSelf: 'flex-start', padding: '6px 14px', fontSize: 11 }}>💾 Сохранить</button>}
                </div>
            )}

            {/* Participants tab */}
            {tab === 'participants' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ws.participants.length === 0 ? (
                        <div style={{ fontSize: 12, opacity: 0.6 }}>Нет участников.</div>
                    ) : ws.participants.map(p => (
                        <div key={p.deviceId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.12)' }}>
                            <span style={{ fontSize: 14 }}>👤</span>
                            <span style={{ flex: 1, fontSize: 12 }}>{p.nickname || p.deviceId.slice(0, 8)}</span>
                        </div>
                    ))}
                    {canEdit && (
                        <div style={{ padding: 10, borderRadius: 10, background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Добавить участника</div>
                            <input type="text" value={addDeviceId} onChange={e => setAddDeviceId(e.target.value)} placeholder="Device ID" style={inputStyle} />
                            <input type="text" value={addNickname} onChange={e => setAddNickname(e.target.value)} placeholder="Никнейм (необязательно)" style={inputStyle} />
                            <button type="button" className="btn-primary-gold" disabled={busy || !addDeviceId.trim()} onClick={() => void handleAddParticipant()} style={{ padding: '6px 14px', fontSize: 11 }}>Добавить</button>
                        </div>
                    )}
                </div>
            )}

            {/* Badges tab */}
            {tab === 'badges' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ws.badges.length === 0 ? (
                        <div style={{ fontSize: 12, opacity: 0.6 }}>Нет привязанных значков.</div>
                    ) : ws.badges.map(b => (
                        <div key={b.badgeId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.12)' }}>
                            <span style={{ fontSize: 14 }}>🏅</span>
                            <span style={{ flex: 1, fontSize: 12 }}>{b.badgeTitle || b.badgeId}</span>
                            <span style={{ fontSize: 10, opacity: 0.5 }}>{b.confirmations.length} подтв.</span>
                            {canEdit && (
                                <button type="button" className="btn-secondary" style={{ padding: '2px 6px', fontSize: 10, color: '#ef4444' }}
                                    disabled={busy} onClick={() => void handleRemoveBadge(b.badgeId)}>🗑</button>
                            )}
                        </div>
                    ))}
                    {canEdit && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <input type="text" value={addBadgeId} onChange={e => setAddBadgeId(e.target.value)} placeholder="ID значка"
                                style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 11 }} />
                            <button type="button" className="btn-primary-gold" disabled={busy || !addBadgeId.trim()} onClick={() => void handleAddBadge()} style={{ padding: '6px 12px', fontSize: 11 }}>＋</button>
                        </div>
                    )}
                </div>
            )}

            {/* Confirmations tab */}
            {tab === 'confirmations' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ws.badges.length === 0 ? (
                        <div style={{ fontSize: 12, opacity: 0.6 }}>Добавьте значки, чтобы подтверждать получение.</div>
                    ) : ws.badges.map(b => (
                        <div key={b.badgeId} style={{ padding: 10, borderRadius: 10, background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>🏅 {b.badgeTitle || b.badgeId}</div>
                            {ws.participants.map(p => {
                                const confirmed = b.confirmations.some(c => c.deviceId === p.deviceId);
                                return (
                                    <div key={p.deviceId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                                        <span style={{ fontSize: 12 }}>{confirmed ? '✅' : '⬜'}</span>
                                        <span style={{ flex: 1, fontSize: 11 }}>{p.nickname || p.deviceId.slice(0, 8)}</span>
                                        {!confirmed && canEdit && (
                                            <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: 10, color: '#22c55e' }}
                                                disabled={busy} onClick={() => void handleConfirm(b.badgeId, p.deviceId)}>✅</button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EducatorWorkshopPanel;
