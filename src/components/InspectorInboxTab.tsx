import React, { useCallback, useEffect, useState } from 'react';
import {
    fetchProgress,
    fetchChecklists,
    approveTask,
    type InspectorChecklist,
    type InspectorTaskProgress,
} from '../utils/inspectorBenefitApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InspectorInboxTabProps {
    accessToken: string;
}

interface PendingItem {
    taskId: string;
    taskTitle: string;
    checklistTitle: string;
    skill4k?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const InspectorInboxTab: React.FC<InspectorInboxTabProps> = ({ accessToken }) => {
    const [pending, setPending] = useState<PendingItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [checklists, progress] = await Promise.all([
                fetchChecklists(),
                // Fetch all progress — inbox endpoint would filter to pending, here we filter client-side
                fetchProgress('__inbox__'),
            ]);
            const taskMap = new Map<string, { title: string; checklistTitle: string; skill4k?: string }>();
            checklists.forEach((cl: InspectorChecklist) => {
                cl.tasks.forEach(t => taskMap.set(t.id, { title: t.title, checklistTitle: cl.title, skill4k: t.skill4k }));
            });
            const items: PendingItem[] = progress
                .filter((p: InspectorTaskProgress) => p.status === 'done_pending')
                .map((p: InspectorTaskProgress) => {
                    const info = taskMap.get(p.taskId);
                    return {
                        taskId: p.taskId,
                        taskTitle: info?.title ?? p.taskId,
                        checklistTitle: info?.checklistTitle ?? '',
                        skill4k: info?.skill4k,
                    };
                });
            setPending(items);
        } catch { setPending([]); }
        finally { setLoading(false); }
    }, [accessToken]);

    useEffect(() => { void load(); }, [load]);

    const handleApprove = useCallback(async (taskId: string) => {
        if (busyId) return;
        setBusyId(taskId);
        try {
            await approveTask(accessToken, taskId);
            setPending(prev => prev.filter(p => p.taskId !== taskId));
        } catch { /* silent */ }
        finally { setBusyId(null); }
    }, [accessToken, busyId]);

    if (loading && pending.length === 0) {
        return <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Загрузка заданий…</div>;
    }

    if (pending.length === 0) {
        return <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Нет заданий на подтверждение.</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>🔍 Инспектор ({pending.length})</span>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} disabled={loading} onClick={() => void load()}>🔄</button>
            </div>

            {pending.map(item => (
                <div key={item.taskId} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 10, background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <span style={{ fontSize: 16 }}>🟡</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{item.taskTitle}</div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>{item.checklistTitle}{item.skill4k ? ` · ${item.skill4k}` : ''}</div>
                    </div>
                    <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 10, color: '#22c55e' }}
                        disabled={busyId === item.taskId}
                        onClick={() => void handleApprove(item.taskId)}>
                        ✅ Подтвердить
                    </button>
                </div>
            ))}
        </div>
    );
};

export default InspectorInboxTab;
