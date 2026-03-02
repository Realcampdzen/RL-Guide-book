import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    initiateBro,
    fetchBroEvents,
    fetchMyPassport,
    startPassport,
    markTask,
    createWing,
    type BroEvent,
    type BroPassport,
} from '../utils/broApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BroPassportPanelProps {
    squadId: string;
    deviceId: string;
    accessToken?: string | null;
    canModerate?: boolean;
    onWingCreated?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT = '#7c3aed';
const ACCENT_LIGHT = 'rgba(124, 58, 237, 0.12)';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BroPassportPanel: React.FC<BroPassportPanelProps> = ({
    squadId,
    deviceId,
    accessToken,
    canModerate,
    onWingCreated,
}) => {
    const [events, setEvents] = useState<BroEvent[]>([]);
    const [passport, setPassport] = useState<BroPassport | null>(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [wingName, setWingName] = useState('');
    const [showWingModal, setShowWingModal] = useState(false);
    const [showComplete, setShowComplete] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [evts, pass] = await Promise.all([fetchBroEvents(squadId), fetchMyPassport(deviceId)]);
            setEvents(evts);
            setPassport(pass);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [squadId, deviceId]);

    useEffect(() => { void load(); }, [load]);

    const activeEvent = useMemo(() => events.find(e => e.status === 'active') ?? null, [events]);

    const tasksTotal = passport?.tasks?.length ?? 0;
    const tasksDone = passport?.tasks?.filter(t => t.done).length ?? 0;
    const progressPct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;
    const isComplete = passport?.status === 'completed';

    // Handlers
    const handleInitiate = useCallback(async () => {
        if (!accessToken) return;
        setBusy(true);
        try { await initiateBro(accessToken, squadId); void load(); }
        catch { /* silent */ }
        finally { setBusy(false); }
    }, [accessToken, squadId, load]);

    const handleStart = useCallback(async () => {
        if (!accessToken || !activeEvent) return;
        setBusy(true);
        try { await startPassport(accessToken, activeEvent.id); void load(); }
        catch { /* silent */ }
        finally { setBusy(false); }
    }, [accessToken, activeEvent, load]);

    const handleMarkTask = useCallback(async (taskId: string) => {
        if (!accessToken || !passport) return;
        setBusy(true);
        try {
            const res = await markTask(accessToken, passport.id, taskId);
            setPassport(res.passport);
            if (res.passport.status === 'completed') setShowComplete(true);
        } catch { /* silent */ }
        finally { setBusy(false); }
    }, [accessToken, passport]);

    const handleCreateWing = useCallback(async () => {
        if (!accessToken || !wingName.trim()) return;
        setBusy(true);
        try {
            await createWing(accessToken, squadId, { name: wingName.trim() });
            setShowWingModal(false);
            setWingName('');
            onWingCreated?.();
        } catch { /* silent */ }
        finally { setBusy(false); }
    }, [accessToken, squadId, wingName, onWingCreated]);

    if (loading && !passport && events.length === 0) {
        return <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Загрузка…</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: ACCENT }}>🦅 БРО</span>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} disabled={loading} onClick={() => void load()}>🔄</button>
            </div>

            {/* Staff: Initiate */}
            {canModerate && !activeEvent && (
                <button type="button" className="btn-primary-gold" style={{ padding: '10px 16px' }}
                    disabled={busy} onClick={() => void handleInitiate()}>
                    {busy ? 'Загрузка…' : '🎭 Объявить Бросвящение в отряде'}
                </button>
            )}

            {/* Active event info */}
            {activeEvent && !passport && (
                <div style={{ padding: 12, borderRadius: 10, background: ACCENT_LIGHT, border: '1px solid rgba(124,58,237,0.2)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: ACCENT }}>🎭 Бросвящение активно!</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Начато: {new Date(activeEvent.createdAt).toLocaleDateString()}</div>
                    {accessToken && (
                        <button type="button" className="btn-primary-gold" style={{ marginTop: 8, padding: '8px 14px', fontSize: 12 }}
                            disabled={busy} onClick={() => void handleStart()}>
                            Начать паспорт БРО
                        </button>
                    )}
                </div>
            )}

            {/* No events */}
            {!activeEvent && !passport && !canModerate && (
                <div style={{ fontSize: 12, opacity: 0.6 }}>Бросвящение ещё не объявлено в этом отряде.</div>
            )}

            {/* Passport checklist */}
            {passport && (
                <div style={{ padding: 14, borderRadius: 12, background: ACCENT_LIGHT, border: '1px solid rgba(124,58,237,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>📋 Паспорт БРО</span>
                        {isComplete && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>Завершён ✅</span>}
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.7, marginBottom: 2 }}>
                            <span>{tasksDone}/{tasksTotal} заданий</span>
                            <span>{progressPct}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                            <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: 3, background: isComplete ? '#22c55e' : ACCENT, transition: 'width 0.3s' }} />
                        </div>
                    </div>

                    {/* Tasks */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(passport.tasks ?? []).sort((a, b) => a.order - b.order).map(task => (
                            <div key={task.id} style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                                borderRadius: 8, background: 'rgba(0,0,0,0.15)',
                                opacity: task.done ? 0.6 : 1,
                            }}>
                                <span style={{ fontSize: 14 }}>{task.done ? '✅' : '⬜'}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</div>
                                    {task.description && <div style={{ fontSize: 10, opacity: 0.6 }}>{task.description}</div>}
                                </div>
                                {!task.done && accessToken && (
                                    <button type="button" className="btn-secondary" style={{ padding: '3px 8px', fontSize: 10 }}
                                        disabled={busy} onClick={() => void handleMarkTask(task.id)}>
                                        ☑️
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Create Wing */}
                    {isComplete && accessToken && (
                        <button type="button" className="btn-primary-gold" style={{ marginTop: 10, padding: '10px 16px', width: '100%' }}
                            onClick={() => setShowWingModal(true)}>
                            🦅 Создать Крыло
                        </button>
                    )}
                </div>
            )}

            {/* Completion animation */}
            {showComplete && (
                <div style={{
                    padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                    textAlign: 'center', animation: 'fadeIn 0.5s ease-in',
                }}>
                    <div style={{ fontSize: 32, marginBottom: 4 }}>🎉🦅🎉</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>Паспорт БРО завершён!</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Теперь вы можете создать своё Крыло.</div>
                    <button type="button" className="btn-secondary" style={{ marginTop: 6, padding: '4px 10px', fontSize: 10 }}
                        onClick={() => setShowComplete(false)}>✕</button>
                </div>
            )}

            {/* Wing modal */}
            {showWingModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={() => setShowWingModal(false)}>
                    <div style={{ background: 'var(--surface-2, #1a1a2e)', borderRadius: 16, padding: 20, maxWidth: 360, width: '90%', border: '1px solid rgba(124,58,237,0.25)' }}
                        onClick={e => e.stopPropagation()}>
                        <h4 style={{ margin: '0 0 12px', color: ACCENT }}>🦅 Создать Крыло</h4>
                        <input type="text" placeholder="Название Крыла" value={wingName} onChange={e => setWingName(e.target.value)}
                            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn-primary-gold" disabled={busy || !wingName.trim()} onClick={() => void handleCreateWing()} style={{ flex: 1, padding: '10px 16px' }}>
                                {busy ? 'Создание…' : 'Создать'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => setShowWingModal(false)} style={{ padding: '10px 16px' }}>Отмена</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BroPassportPanel;
