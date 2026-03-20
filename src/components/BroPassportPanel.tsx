import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    fetchBroEvents,
    fetchMyPassport,
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
    nickname?: string;
    userRole?: string;
}

interface BroSubmission {
    id: string;
    passportId: string;
    taskId: string;
    taskTitle: string;
    deviceId: string;
    squadId: string;
    text: string;
    photoUrl?: string | null;
    nickname?: string | null;
    userRole?: string | null;
    status: 'pending' | 'approved' | 'rejected';
    comment?: string | null;
    submittedAt: string;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

interface EditableTask {
    id: string;
    title: string;
    description: string;
}

const DEFAULT_BRO_TASKS: EditableTask[] = [
    { id: 'b1_lecture',    title: 'Прослушать лекцию по лагерной педагогике',      description: 'Основы общения с детьми и принципы Бро-Движения.' },
    { id: 'b1_cases',      title: 'Участие в обсуждении вожатских кейсов',         description: 'Разбор реальных ситуаций из жизни отряда.' },
    { id: 'b1_chants',     title: 'Знать и громко кричать отрядные кричалки',       description: 'Голос отряда — это его энергия!' },
    { id: 'b2_dances',     title: 'Знать и танцевать отрядные танцы',               description: 'Движение в ритме Бро-Движения.' },
    { id: 'b2_traditions', title: 'Знать отрядные традиции',                         description: 'История и ритуалы, которые нас объединяют.' },
    { id: 'b2_meme',       title: 'Знать и понимать отрядный мем',                  description: 'Юмор — важная часть нашей идентичности.' },
    { id: 'b3_activity',   title: 'Провести собственное отрядное дело',             description: 'Практика лидерства и организации.' },
    { id: 'b3_artifact',   title: 'Оформить физический Бропаспорт',                description: 'Создать красивый артефакт с твердой обложкой.' },
    { id: 'b3_approval',   title: 'Получить подписи вожатых и админа',              description: 'Финальный апрув твоего пути в Бро-Движение.' },
];



// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BroPassportPanel: React.FC<BroPassportPanelProps> = ({
    squadId,
    deviceId,
    accessToken,
    canModerate,
    onWingCreated,
    nickname: propNickname,
    userRole: propUserRole,
}) => {
    const [events, setEvents] = useState<BroEvent[]>([]);
    const [passport, setPassport] = useState<BroPassport | null>(null);
    const [submissions, setSubmissions] = useState<BroSubmission[]>([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [wingName, setWingName] = useState('');
    const [showWingModal, setShowWingModal] = useState(false);
    const [showComplete, setShowComplete] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [hasWing, setHasWing] = useState(false);
    // Task editor state for counselor initiation
    const [showTaskEditor, setShowTaskEditor] = useState(false);
    const [editTasks, setEditTasks] = useState<EditableTask[]>(() => DEFAULT_BRO_TASKS.map(t => ({ ...t })));
    // Inline submit form state
    const [submitTaskId, setSubmitTaskId] = useState<string | null>(null);
    const [submitText, setSubmitText] = useState('');
    const [submitPhoto, setSubmitPhoto] = useState<string | null>(null);
    const photoInputRef = React.useRef<HTMLInputElement | null>(null);

    // Dev sandbox: build headers with X-Device-Id instead of Authorization
    const devHeaders = useMemo((): Record<string, string> => {
        if (accessToken) return { Authorization: `Bearer ${accessToken}` };
        if (import.meta.env.DEV && deviceId) return { 'X-Device-Id': deviceId };
        return {};
    }, [accessToken, deviceId]);

    const hasAuth = !!accessToken || (import.meta.env.DEV && !!deviceId);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [evts, pass] = await Promise.all([fetchBroEvents(squadId), fetchMyPassport(deviceId)]);
            setEvents(evts);
            setPassport(pass);
            // Load submissions — load all, client-side filtering by passportId in getTaskSubmission()
            // (squad_id filter removed: backend stores squadId inconsistently — name vs id)
            const subsRes = await fetch(`/api/bro/submissions`, { headers: devHeaders });
            const subsData = await subsRes.json().catch(() => ({ submissions: [] }));
            setSubmissions((subsData.submissions || []) as BroSubmission[]);
            // Check if wing already exists for this device
            try {
                const wingsRes = await fetch(`/api/wings`, { headers: devHeaders });
                const wingsData = await wingsRes.json().catch(() => ({}));
                const myWing = Object.values(wingsData).some(
                    (w: any) => w?.deviceId === deviceId && w?.type === 'bro_wing'
                );
                setHasWing(myWing);
            } catch { setHasWing(false); }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [squadId, deviceId, devHeaders]);

    useEffect(() => { void load(); }, [load]);

    const activeEvent = useMemo(() => events.find(e => e.status === 'active') ?? null, [events]);

    const tasksTotal = passport?.tasks?.length ?? 0;
    const tasksDone = passport?.tasks?.filter(t => t.done).length ?? 0;
    const progressPct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;
    const isComplete = passport?.status === 'completed';

    // Get submission status for a task
    const getTaskSubmission = useCallback((taskId: string): BroSubmission | null => {
        if (!passport) return null;
        // Find the latest submission for this task in this passport
        const matching = submissions
            .filter(s => s.passportId === passport.id && s.taskId === taskId)
            .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
        return matching[0] ?? null;
    }, [submissions, passport]);

    // Handlers
    const handleInitiate = useCallback(async () => {
        if (!hasAuth) return;
        setBusy(true);
        try {
            const customTasks = editTasks
                .filter(t => t.title.trim())
                .map((t, i) => ({ id: t.id, title: t.title.trim(), description: t.description.trim(), order: i + 1 }));
            await fetch(`/api/bro/initiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...devHeaders },
                body: JSON.stringify({ squadId, customTasks: customTasks.length > 0 ? customTasks : undefined }),
            }).then(r => { if (!r.ok) throw new Error('Ошибка'); });
            setShowTaskEditor(false);
            void load();
        } catch { /* silent */ }
        finally { setBusy(false); }
    }, [devHeaders, hasAuth, squadId, editTasks, load]);

    const handleCloseEvent = useCallback(async () => {
        if (!hasAuth || !activeEvent) return;
        if (!confirm('Завершить Бросвящение? Это действие нельзя отменить.')) return;
        setBusy(true);
        try {
            await fetch(`/api/bro/events/${encodeURIComponent(activeEvent.id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...devHeaders },
                body: JSON.stringify({ action: 'complete' }),
            }).then(r => { if (!r.ok) throw new Error('Ошибка'); });
            void load();
        } catch { /* silent */ }
        finally { setBusy(false); }
    }, [devHeaders, hasAuth, activeEvent, load]);

    const handleStart = useCallback(async () => {
        if (!hasAuth || !activeEvent) return;
        setBusy(true);
        try {
            await fetch(`/api/bro/passport`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...devHeaders },
                body: JSON.stringify({ broEventId: activeEvent.id }),
            }).then(r => { if (!r.ok) throw new Error('Ошибка'); });
            void load();
        } catch { /* silent */ }
        finally { setBusy(false); }
    }, [devHeaders, hasAuth, activeEvent, load]);

    const handleSubmitTask = useCallback(async (taskId: string) => {
        if (!hasAuth || !passport || !submitText.trim()) return;
        setBusy(true);
        try {
            const payload: Record<string, string> = { text: submitText.trim() };
            if (submitPhoto) payload.photoUrl = submitPhoto;
            if (propNickname) payload.nickname = propNickname;
            if (propUserRole) payload.userRole = propUserRole;
            const res = await fetch(`/api/bro/passport/${encodeURIComponent(passport.id)}/task/${encodeURIComponent(taskId)}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...devHeaders },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Ошибка');
            }
            setSubmitTaskId(null);
            setSubmitText('');
            setSubmitPhoto(null);
            void load();
        } catch { /* silent */ }
        finally { setBusy(false); }
    }, [devHeaders, hasAuth, passport, submitText, submitPhoto, load]);

    const handleCreateWing = useCallback(async () => {
        if (!hasAuth || !wingName.trim()) return;
        setBusy(true);
        try {
            const wingId = `wing-${Date.now().toString(36)}`;
            await fetch(`/api/wings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...devHeaders },
                body: JSON.stringify({
                    id: wingId,
                    name: wingName.trim(),
                    squadId,
                    type: 'bro_wing',
                    deviceId,
                    createdAt: new Date().toISOString(),
                }),
            }).then(r => { if (!r.ok) throw new Error('Ошибка'); });
            setShowWingModal(false);
            setWingName('');
            setToast(`Крыло "${wingName.trim()}" создано!`);
            setTimeout(() => setToast(null), 3500);
            setHasWing(true);
            onWingCreated?.();
        } catch (e) { console.error('Wing creation failed:', e); setToast('Ошибка при создании крыла'); setTimeout(() => setToast(null), 3500); }
        finally { setBusy(false); }
    }, [devHeaders, hasAuth, squadId, deviceId, wingName, onWingCreated]);

    if (loading && !passport && events.length === 0) {
        return <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Загрузка…</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 100, maxWidth: 680, width: '100%' }}>

            {/* Staff: Initiate */}
            {canModerate && !activeEvent && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button type="button" style={{
                        padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(124,58,237,0.4)',
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(88,28,195,0.25) 100%)',
                        color: '#c4b5fd', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.2s', backdropFilter: 'blur(8px)',
                    }} disabled={busy} onClick={() => showTaskEditor ? void handleInitiate() : setShowTaskEditor(true)}>
                        {busy ? 'Загрузка…' : showTaskEditor ? 'Объявить Бросвящение' : 'Настроить и объявить Бросвящение'}
                    </button>

                    {showTaskEditor && (
                        <div className="fade-in cab-card" style={{ padding: '28px 32px', borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#e0d4ff', marginBottom: 2 }}>
                                Задания Бросвящения
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                                Редактируйте список заданий. Можно добавлять, удалять и переименовывать.
                            </div>

                            {editTasks.map((task, idx) => (
                                <div key={task.id} style={{
                                    padding: '16px', borderRadius: 16,
                                    background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)',
                                    display: 'flex', flexDirection: 'column', gap: 0,
                                    transition: 'border-color 0.2s, background 0.2s',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 10 }}>
                                        <span style={{
                                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                            background: 'rgba(255,255,255,0.08)', color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 13, fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)',
                                        }}>{idx + 1}</span>
                                        <input
                                            type="text" value={task.title}
                                            onChange={e => {
                                                const next = [...editTasks];
                                                next[idx] = { ...next[idx], title: e.target.value };
                                                setEditTasks(next);
                                            }}
                                            placeholder="Название задания"
                                            style={{
                                                flex: 1, padding: '4px 0', fontSize: 15, fontWeight: 600,
                                                background: 'transparent', border: 'none', outline: 'none', color: '#fff',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                        <button type="button" onClick={() => {
                                            setEditTasks(editTasks.filter((_, i) => i !== idx));
                                        }} style={{
                                            width: 32, height: 32, borderRadius: 10, border: '1px solid transparent',
                                            background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                                            fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'color 0.2s',
                                        }} title="Удалить"
                                        onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                                        >×</button>
                                    </div>
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 40, marginBottom: 10 }} />
                                    <input
                                        type="text" value={task.description}
                                        onChange={e => {
                                            const next = [...editTasks];
                                            next[idx] = { ...next[idx], description: e.target.value };
                                            setEditTasks(next);
                                        }}
                                        placeholder="Описание (необязательно)"
                                        style={{
                                            marginLeft: 40, padding: '4px 0', fontSize: 13,
                                            background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.7)',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                            ))}

                            <button type="button" onClick={() => {
                                setEditTasks([...editTasks, {
                                    id: `custom_${Date.now().toString(36)}`,
                                    title: '', description: '',
                                }]);
                            }} style={{
                                padding: '8px 14px', borderRadius: 10,
                                border: '1px dashed rgba(255,255,255,0.15)',
                                background: 'transparent', color: 'rgba(255,255,255,0.4)',
                                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                                + Добавить задание
                            </button>

                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                <button type="button" onClick={() => setEditTasks(DEFAULT_BRO_TASKS.map(t => ({ ...t })))}
                                    style={{
                                        padding: '6px 12px', borderRadius: 8,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)',
                                        fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                                    }}>
                                    Сбросить к стандартным
                                </button>
                                <button type="button" onClick={() => setShowTaskEditor(false)}
                                    style={{
                                        padding: '6px 12px', borderRadius: 8,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)',
                                        fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                                    }}>
                                    Отмена
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Active event — join */}
            {activeEvent && !passport && (
                <div className="fade-in cab-card" style={{ padding: '28px 32px', borderRadius: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
                            boxShadow: '0 0 6px rgba(34,197,94,0.6)', flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#e0d4ff' }}>Бросвящение активно</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10, paddingLeft: 18 }}>
                        Начато {new Date(activeEvent.createdAt).toLocaleDateString()}
                    </div>

                    {hasAuth && (
                        <button type="button" style={{
                            padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(124,58,237,0.4)',
                            background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(88,28,195,0.25) 100%)',
                            color: '#c4b5fd', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'inherit', transition: 'all 0.2s', backdropFilter: 'blur(8px)',
                        }} disabled={busy} onClick={() => void handleStart()}>
                            Начать паспорт БРО
                        </button>
                    )}
                </div>
            )}

            {/* Staff: Close active event (visible regardless of passport state) */}
            {canModerate && activeEvent && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(88,28,195,0.08) 100%)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            background: '#a78bfa',
                            boxShadow: '0 0 8px rgba(167,139,250,0.6)',
                            animation: 'pulse 2s ease-in-out infinite',
                        }} />
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#e0d4ff' }}>
                                Бросвящение активно
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                                с {new Date(activeEvent.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                    <button type="button" style={{
                        padding: '7px 16px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.15s',
                    }} disabled={busy} onClick={() => void handleCloseEvent()}>
                        Завершить
                    </button>
                </div>
            )}

            {/* No events */}
            {!activeEvent && !passport && !canModerate && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', padding: '16px 0' }}>
                    Бросвящение ещё не объявлено в этом отряде.
                </div>
            )}

            {/* ── Passport checklist ── */}
            {passport && (
                <div className="fade-in cab-card" style={{ padding: '28px 32px', borderRadius: 20 }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <h3 style={{ 
                            margin: '0', fontSize: 18, fontWeight: 700, color: '#e8f0ff',
                            letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            Паспорт БРО
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isComplete && (
                                <span style={{
                                    fontSize: 12, padding: '4px 12px', borderRadius: 20,
                                    background: 'rgba(124,58,237,0.25)', color: '#d8b4fe',
                                    fontWeight: 700, letterSpacing: '0.02em',
                                }}>Завершён</span>
                            )}
                            <button type="button" style={{
                                padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.85)',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                transition: 'background 0.15s',
                            }} disabled={loading} onClick={() => void load()}>Обновить</button>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginBottom: 6 }}>
                            <span>{tasksDone} из {tasksTotal} заданий</span>
                            <span style={{ fontWeight: 700, color: '#e0e7ff', fontSize: 14 }}>{progressPct}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <div style={{
                                width: `${progressPct}%`, height: '100%', borderRadius: 3,
                                background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                                transition: 'width 0.4s ease',
                            }} />
                        </div>
                    </div>

                    {/* Task list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(passport.tasks ?? []).sort((a, b) => a.order - b.order).map((task, idx) => {
                            const sub = getTaskSubmission(task.id);
                            const isPending = sub?.status === 'pending';
                            const isRejected = sub?.status === 'rejected';
                            const canSubmit = !task.done && !isPending;

                            return (
                                <div key={task.id} style={{
                                    padding: '14px 16px', borderRadius: 10,
                                    background: task.done
                                        ? 'rgba(109,40,217,0.35)'
                                        : isPending
                                            ? 'rgba(202,138,4,0.35)'
                                            : 'rgba(0,0,0,0.5)',
                                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                                    border: `1px solid ${
                                        task.done ? 'rgba(167,139,250,0.4)'
                                        : isPending ? 'rgba(250,204,21,0.4)'
                                        : 'rgba(255,255,255,0.2)'
                                    }`,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                    opacity: task.done ? 0.85 : 1,
                                    transition: 'all 0.2s',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                        {/* Status indicator */}
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 1,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 14, fontWeight: 800, color: '#fff',
                                            background: task.done
                                                ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                                                : isPending
                                                    ? 'linear-gradient(135deg, #eab308, #ca8a04)'
                                                    : 'rgba(255,255,255,0.06)',
                                            border: task.done || isPending
                                                ? 'none'
                                                : '1.5px solid rgba(255,255,255,0.15)',
                                        }}>
                                            {task.done ? '✓' : isPending ? '…' : (idx + 1)}
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 15, fontWeight: 600, lineHeight: 1.4,
                                                color: task.done ? 'rgba(255,255,255,0.6)' : '#fff',
                                                textDecoration: task.done ? 'line-through' : 'none',
                                                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                                            }}>{task.title}</div>
                                            {task.description && (
                                                <div style={{
                                                    fontSize: 13, color: 'rgba(255,255,255,0.85)',
                                                    marginTop: 4, lineHeight: 1.4,
                                                    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                                                }}>
                                                    {task.description}
                                                </div>
                                            )}
                                        </div>

                                        {/* Status / action */}
                                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                            {isPending && (
                                                <span style={{
                                                    fontSize: 11, padding: '4px 10px', borderRadius: 6,
                                                    background: 'rgba(234,179,8,0.12)', color: '#eab308',
                                                    fontWeight: 600, whiteSpace: 'nowrap',
                                                }}>На проверке</span>
                                            )}
                                            {isRejected && (
                                                <span style={{
                                                    fontSize: 11, padding: '4px 10px', borderRadius: 6,
                                                    background: 'rgba(239,68,68,0.12)', color: '#f87171',
                                                    fontWeight: 600, whiteSpace: 'nowrap',
                                                }}>Отклонено</span>
                                            )}
                                            {canSubmit && hasAuth && (
                                                <button type="button" style={{
                                                    padding: '5px 14px', borderRadius: 7,
                                                    border: '1px solid rgba(124,58,237,0.3)',
                                                    background: 'rgba(124,58,237,0.1)', color: '#a78bfa',
                                                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                                    fontFamily: 'inherit', whiteSpace: 'nowrap',
                                                    transition: 'background 0.15s',
                                                }} disabled={busy}
                                                onClick={() => { setSubmitTaskId(submitTaskId === task.id ? null : task.id); setSubmitText(''); setSubmitPhoto(null); }}>
                                                    Отправить
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rejection comment */}
                                    {isRejected && sub?.comment && (
                                        <div style={{
                                            marginTop: 8, marginLeft: 36, fontSize: 12,
                                            color: '#f87171', fontStyle: 'italic', lineHeight: 1.4,
                                            padding: '6px 10px', borderRadius: 6,
                                            background: 'rgba(239,68,68,0.06)',
                                            borderLeft: '2px solid rgba(239,68,68,0.3)',
                                        }}>
                                            {sub.comment}
                                        </div>
                                    )}

                                    {/* Inline submit form */}
                                    {submitTaskId === task.id && (
                                        <div style={{
                                            marginTop: 10, marginLeft: 36, display: 'flex', flexDirection: 'column', gap: 8,
                                            padding: '14px 16px', borderRadius: 10,
                                            background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)',
                                        }}>
                                            <textarea
                                                placeholder="Опишите выполнение (рефлексия, что сделали, что поняли...)"
                                                value={submitText}
                                                onChange={e => setSubmitText(e.target.value)}
                                                className="cab-input cab-input--purple"
                                                style={{ minHeight: 72, resize: 'vertical' }}
                                            />
                                            {/* Photo upload */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        if (file.size > 5 * 1024 * 1024) { alert('Фото не должно превышать 5 МБ'); return; }
                                                        const reader = new FileReader();
                                                        reader.onload = () => setSubmitPhoto(reader.result as string);
                                                        reader.readAsDataURL(file);
                                                    }} />
                                                <button type="button" style={{
                                                    padding: '6px 14px', borderRadius: 7,
                                                    border: '1px dashed rgba(255,255,255,0.2)',
                                                    background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)',
                                                    fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                                                }} onClick={() => photoInputRef.current?.click()}>
                                                    {submitPhoto ? 'Заменить фото' : 'Добавить фото'}
                                                </button>
                                                {submitPhoto && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <img src={submitPhoto} alt="preview" style={{
                                                            width: 40, height: 40, borderRadius: 6, objectFit: 'cover',
                                                            border: '1px solid rgba(124,58,237,0.25)',
                                                        }} />
                                                        <button type="button" style={{
                                                            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                                                            fontSize: 16, cursor: 'pointer', padding: 2,
                                                        }} onClick={() => setSubmitPhoto(null)}>×</button>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                                <button type="button" style={{
                                                    padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.4)', flex: 1,
                                                    background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(88,28,195,0.25) 100%)',
                                                    color: '#c4b5fd', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                                    fontFamily: 'inherit', opacity: (!submitText.trim()) ? 0.4 : 1,
                                                    transition: 'all 0.2s', backdropFilter: 'blur(8px)',
                                                }}
                                                disabled={busy || !submitText.trim()}
                                                onClick={() => void handleSubmitTask(task.id)}>
                                                    {busy ? 'Отправка…' : 'Отправить на проверку'}
                                                </button>
                                                <button type="button" style={{
                                                    padding: '8px 12px', borderRadius: 8,
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
                                                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                                                }}
                                                onClick={() => { setSubmitTaskId(null); setSubmitPhoto(null); }}>
                                                    Отмена
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Create Wing */}
                    {isComplete && hasAuth && !hasWing && (
                        <button type="button" style={{
                            marginTop: 14, width: '100%', padding: '12px 20px', borderRadius: 10,
                            border: '1px solid rgba(124,58,237,0.4)',
                            background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(88,28,195,0.25) 100%)',
                            color: '#c4b5fd', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'inherit', transition: 'all 0.2s', backdropFilter: 'blur(8px)',
                        }} onClick={() => setShowWingModal(true)}>
                            Создать Крыло
                        </button>
                    )}
                    {isComplete && hasWing && (
                        <div style={{
                            marginTop: 14, padding: '16px 20px', borderRadius: 12,
                            background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.15) 100%)',
                            border: '1px solid rgba(124,58,237,0.3)',
                            textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#e0e7ff' }}>
                                ✨ Крыло успешно создано
                            </div>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                                Перейдите на вкладку «Крыло БРО» в левом меню
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Counselor: Review pending submissions ── */}
            {canModerate && (() => {
                const pending = submissions.filter(s => s.status === 'pending');
                if (pending.length === 0) return null;
                return (
                    <div className="fade-in cab-card" style={{ padding: '28px 32px', borderRadius: 20, borderColor: 'rgba(234,179,8,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <span style={{
                                width: 8, height: 8, borderRadius: '50%', background: '#eab308',
                                boxShadow: '0 0 6px rgba(234,179,8,0.5)', flexShrink: 0,
                            }} />
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#fde68a' }}>
                                Заявки на проверку
                            </span>
                            <span style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 10,
                                background: 'rgba(234,179,8,0.15)', color: '#eab308', fontWeight: 600,
                            }}>{pending.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {pending.map(sub => (
                                <BroSubmissionReviewCard
                                    key={sub.id}
                                    submission={sub}
                                    devHeaders={devHeaders}
                                    busy={busy}
                                    onReviewed={() => void load()}
                                />
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Completion banner */}
            {showComplete && (
                <div className="cab-card" style={{
                    padding: '28px 32px', borderRadius: 20, borderColor: 'rgba(34,197,94,0.25)',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80', marginBottom: 4 }}>Паспорт БРО завершён</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Теперь вы можете создать своё Крыло.</div>
                    <button type="button" style={{
                        marginTop: 10, padding: '4px 14px', borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)',
                        fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                    }} onClick={() => setShowComplete(false)}>Закрыть</button>
                </div>
            )}

            {/* Wing modal */}
            {showWingModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={() => setShowWingModal(false)}>
                    <div style={{
                        background: 'rgba(12, 8, 32, 0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                        borderRadius: 16, padding: 24, maxWidth: 380, width: '90%',
                        border: '1px solid rgba(124,58,237,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    }} onClick={e => e.stopPropagation()}>
                        <h4 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#e0d4ff' }}>Создать Крыло</h4>
                        <input type="text" placeholder="Название Крыла" value={wingName} onChange={e => setWingName(e.target.value)}
                            style={{
                                width: '100%', padding: 12, borderRadius: 10, boxSizing: 'border-box',
                                border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)',
                                color: '#e8f0ff', fontSize: 14, fontFamily: 'inherit', marginBottom: 12,
                            }} />
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" style={{
                                flex: 1, padding: '11px 18px', borderRadius: 10, border: 'none',
                                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                opacity: (!wingName.trim()) ? 0.4 : 1,
                            }} disabled={busy || !wingName.trim()} onClick={() => void handleCreateWing()}>
                                {busy ? 'Создание…' : 'Создать'}
                            </button>
                            <button type="button" style={{
                                padding: '11px 18px', borderRadius: 10,
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
                                fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                            }} onClick={() => setShowWingModal(false)}>Отмена</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast notification */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 120, left: '50%', transform: 'translateX(-50%)', zIndex: 1100,
                    padding: '12px 24px', borderRadius: 12,
                    background: toast.includes('Ошибка') ? 'rgba(220,38,38,0.9)' : 'rgba(34,197,94,0.9)',
                    color: '#fff', fontSize: 14, fontWeight: 600,
                    backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}>
                    {toast}
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Counselor Review Card
// ---------------------------------------------------------------------------

const BroSubmissionReviewCard: React.FC<{
    submission: BroSubmission;
    devHeaders: Record<string, string>;
    busy: boolean;
    onReviewed: () => void;
}> = ({ submission, devHeaders, busy, onReviewed }) => {
    const [rejectComment, setRejectComment] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [localBusy, setLocalBusy] = useState(false);

    const handleReview = async (action: 'approve' | 'reject') => {
        setLocalBusy(true);
        try {
            const res = await fetch(`/api/bro/submissions/${encodeURIComponent(submission.id)}/review`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...devHeaders },
                body: JSON.stringify({ action, comment: action === 'reject' ? rejectComment.trim() || null : null }),
            });
            if (!res.ok) throw new Error('Ошибка');
            onReviewed();
        } catch { /* silent */ }
        finally { setLocalBusy(false); }
    };

    const isBusy = busy || localBusy;

    return (
        <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f0ff', marginBottom: 3 }}>
                {submission.taskTitle || submission.taskId}
            </div>
            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {submission.nickname && (
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                        {submission.nickname}
                    </span>
                )}
                {submission.userRole && submission.userRole !== 'traveler' && (
                    <span style={{
                        fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 6,
                        background: 'rgba(124,58,237,0.15)', color: 'rgba(167,139,250,0.9)',
                        letterSpacing: '0.02em',
                    }}>
                        {submission.userRole === 'counselor' ? 'Вожатый' :
                         submission.userRole === 'educator' ? 'Педагог' :
                         submission.userRole === 'shift_leader' ? 'Ст. вожатый' :
                         submission.userRole === 'camp_director' ? 'Нач. лагеря' :
                         submission.userRole === 'developer' ? 'Dev' :
                         submission.userRole === 'participant' ? 'Участник' :
                         submission.userRole}
                    </span>
                )}
                {!submission.nickname && !submission.userRole && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Участник</span>
                )}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                {new Date(submission.submittedAt).toLocaleString()}
            </div>
            <div style={{
                fontSize: 13, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', marginBottom: 10,
                whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'rgba(255,255,255,0.75)',
                borderLeft: '2px solid rgba(124,58,237,0.3)',
            }}>
                {submission.text}
            </div>
            {submission.photoUrl && (
                <img src={submission.photoUrl} alt="" style={{
                    maxWidth: 200, maxHeight: 140, borderRadius: 8, objectFit: 'cover',
                    border: '1px solid rgba(255,255,255,0.1)', marginBottom: 10, display: 'block',
                }} />
            )}
            {!showRejectForm ? (
                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" style={{
                        padding: '7px 16px', borderRadius: 8, border: 'none', flex: 1,
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }} disabled={isBusy} onClick={() => void handleReview('approve')}>
                        Принять
                    </button>
                    <button type="button" style={{
                        padding: '7px 16px', borderRadius: 8,
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.08)', color: '#f87171',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }} disabled={isBusy} onClick={() => setShowRejectForm(true)}>
                        Отклонить
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input type="text" placeholder="Комментарий (необязательно)"
                        value={rejectComment} onChange={e => setRejectComment(e.target.value)}
                        style={{
                            padding: 10, borderRadius: 8, fontFamily: 'inherit',
                            border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(0,0,0,0.2)',
                            color: '#e8f0ff', fontSize: 12,
                        }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" style={{
                            padding: '7px 16px', borderRadius: 8, flex: 1,
                            border: '1px solid rgba(239,68,68,0.4)',
                            background: 'rgba(239,68,68,0.12)', color: '#f87171',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }} disabled={isBusy} onClick={() => void handleReview('reject')}>
                            Отклонить
                        </button>
                        <button type="button" style={{
                            padding: '7px 12px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
                            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                        }} onClick={() => setShowRejectForm(false)}>
                            Отмена
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BroPassportPanel;
