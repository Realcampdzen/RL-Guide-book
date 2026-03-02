import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    fetchChecklists,
    fetchProgress,
    markTaskDone,
    type InspectorChecklist,
    type InspectorTaskProgress,
} from '../utils/inspectorBenefitApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InspectorBenefitPanelProps {
    accessToken?: string | null;
    deviceId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKILL_COLORS: Record<string, { label: string; color: string }> = {
    critical_thinking: { label: 'Критическое мышление', color: '#3b82f6' },
    communication: { label: 'Коммуникация', color: '#f59e0b' },
    creativity: { label: 'Креативность', color: '#a855f7' },
    collaboration: { label: 'Сотрудничество', color: '#22c55e' },
};

const STATUS_ICONS: Record<string, string> = {
    not_started: '⬜',
    done_pending: '🟡',
    approved: '✅',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const InspectorBenefitPanel: React.FC<InspectorBenefitPanelProps> = ({
    accessToken,
    deviceId,
}) => {
    const [checklists, setChecklists] = useState<InspectorChecklist[]>([]);
    const [progress, setProgress] = useState<InspectorTaskProgress[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [busyTask, setBusyTask] = useState<string | null>(null);
    const [completedChecklist, setCompletedChecklist] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [cls, prog] = await Promise.all([fetchChecklists(), fetchProgress(deviceId)]);
            setChecklists(cls.sort((a, b) => a.order - b.order));
            setProgress(prog);
        } catch { setChecklists([]); setProgress([]); }
        finally { setLoading(false); }
    }, [deviceId]);

    useEffect(() => { void load(); }, [load]);

    const progressMap = useMemo(() => {
        const map = new Map<string, InspectorTaskProgress>();
        progress.forEach(p => map.set(p.taskId, p));
        return map;
    }, [progress]);

    const checklistStats = useMemo(() => {
        return checklists.map(cl => {
            const total = cl.tasks.length;
            const done = cl.tasks.filter(t => {
                const p = progressMap.get(t.id);
                return p && (p.status === 'done_pending' || p.status === 'approved');
            }).length;
            const approved = cl.tasks.filter(t => progressMap.get(t.id)?.status === 'approved').length;
            return { id: cl.id, total, done, approved, complete: approved === total && total > 0 };
        });
    }, [checklists, progressMap]);

    const isUnlocked = useCallback((index: number) => {
        if (index === 0) return true;
        return checklistStats[index - 1]?.complete ?? false;
    }, [checklistStats]);

    const handleMarkDone = useCallback(async (taskId: string, checklistId: string) => {
        if (!accessToken) return;
        setBusyTask(taskId);
        try {
            await markTaskDone(accessToken, { taskId });
            await load();
            // Check if checklist just completed
            const cl = checklists.find(c => c.id === checklistId);
            if (cl) {
                const allDone = cl.tasks.every(t => {
                    const p = progressMap.get(t.id);
                    return t.id === taskId || (p && p.status !== 'not_started');
                });
                if (allDone) setCompletedChecklist(cl.title);
            }
        } catch { /* silent */ }
        finally { setBusyTask(null); }
    }, [accessToken, load, checklists, progressMap]);

    if (loading && checklists.length === 0) {
        return <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Загрузка чек-листов…</div>;
    }

    if (checklists.length === 0) {
        return <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Нет чек-листов Инспектора.</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#3b82f6' }}>🔍 Инспектор Пользы</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Игровая система полезных дел. Прокачивает 4К и культуру заботы.</div>

            {checklists.map((cl, idx) => {
                const stats = checklistStats[idx];
                const unlocked = isUnlocked(idx);
                const expanded = expandedId === cl.id;
                const progressPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

                return (
                    <div key={cl.id} style={{
                        borderRadius: 12, padding: 12,
                        background: unlocked ? 'rgba(59,130,246,0.08)' : 'rgba(0,0,0,0.1)',
                        border: `1px solid ${unlocked ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)'}`,
                        opacity: unlocked ? 1 : 0.5,
                    }}>
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: unlocked ? 'pointer' : 'not-allowed' }}
                            onClick={() => unlocked && setExpandedId(expanded ? null : cl.id)}
                        >
                            <span style={{ fontSize: 14 }}>{stats.complete ? '🏆' : unlocked ? '📋' : '🔒'}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{cl.title}</div>
                                <div style={{ fontSize: 10, opacity: 0.7 }}>{stats.done}/{stats.total} выполнено</div>
                            </div>
                            {unlocked && (
                                <div style={{ width: 50, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                                    <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: 3, background: stats.complete ? '#22c55e' : '#3b82f6', transition: 'width 0.3s' }} />
                                </div>
                            )}
                            {!unlocked && <span style={{ fontSize: 9, opacity: 0.6 }}>Завершите предыдущий</span>}
                        </div>

                        {expanded && unlocked && (
                            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {cl.tasks.sort((a, b) => a.order - b.order).map(task => {
                                    const tp = progressMap.get(task.id);
                                    const status = tp?.status ?? 'not_started';
                                    const skill = task.skill4k ? SKILL_COLORS[task.skill4k] : null;

                                    return (
                                        <div key={task.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                                            borderRadius: 8, background: 'rgba(0,0,0,0.15)',
                                        }}>
                                            <span style={{ fontSize: 14 }}>{STATUS_ICONS[status] || '⬜'}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 11, fontWeight: 600 }}>{task.title}</div>
                                                {task.description && <div style={{ fontSize: 10, opacity: 0.6 }}>{task.description}</div>}
                                                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                                                    {skill && (
                                                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: `${skill.color}22`, color: skill.color }}>
                                                            {skill.label}
                                                        </span>
                                                    )}
                                                    {status === 'done_pending' && (
                                                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                                                            Ждёт подтверждения
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {status === 'not_started' && accessToken && (
                                                <button type="button" className="btn-secondary"
                                                    style={{ padding: '3px 8px', fontSize: 10 }}
                                                    disabled={busyTask === task.id}
                                                    onClick={() => void handleMarkDone(task.id, cl.id)}>
                                                    ☑️
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Completion toast */}
            {completedChecklist && (
                <div style={{
                    padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <span style={{ fontSize: 20 }}>🎉</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>Чек-лист «{completedChecklist}» завершён!</div>
                        <div style={{ fontSize: 10, opacity: 0.7 }}>Следующий уровень разблокирован.</div>
                    </div>
                    <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 10 }}
                        onClick={() => setCompletedChecklist(null)}>✕</button>
                </div>
            )}
        </div>
    );
};

export default InspectorBenefitPanel;
