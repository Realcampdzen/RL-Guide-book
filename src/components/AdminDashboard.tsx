import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    fetchInbox,
    performAction,
    type InboxItem,
    type InboxItemType,
} from '../utils/adminApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminDashboardProps {
    accessToken: string;
    onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
    badge: { icon: '🏅', label: 'Значки', color: '#f59e0b' },
    initiative: { icon: '📋', label: 'Инициативы', color: '#3b82f6' },
    art: { icon: '🎨', label: 'Арты', color: '#a855f7' },
    engine: { icon: '⚙️', label: 'Движки', color: '#22c55e' },
    inspector: { icon: '🔍', label: 'Инспектор', color: '#06b6d4' },
    ugc: { icon: '🏷️', label: 'UGC', color: '#ec4899' },
    tradition: { icon: '🏛️', label: 'Традиции', color: '#d97706' },
};

const ALL_TYPES: InboxItemType[] = ['badge', 'initiative', 'art', 'engine', 'inspector', 'ugc', 'tradition'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ accessToken, onClose }) => {
    const [items, setItems] = useState<InboxItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<InboxItemType | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);
    const [rejectComment, setRejectComment] = useState('');
    const [toast, setToast] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try { setItems(await fetchInbox(filter ?? undefined)); }
        catch { setItems([]); }
        finally { setLoading(false); }
    }, [filter]);

    useEffect(() => { void load(); }, [load]);

    const pendingItems = useMemo(() => items.filter(i => i.status === 'pending'), [items]);

    const typeCounts = useMemo(() => {
        const map = new Map<string, number>();
        pendingItems.forEach(i => map.set(i.type, (map.get(i.type) ?? 0) + 1));
        return map;
    }, [pendingItems]);

    const totalPending = pendingItems.length;

    const handleAction = useCallback(async (itemId: string, action: 'approve' | 'reject', comment?: string) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        setBusy(itemId);
        try {
            await performAction(accessToken, item.type, itemId, action, comment);
            setItems(prev => prev.filter(i => i.id !== itemId));
            setToast(action === 'approve' ? '✅ Одобрено' : '❌ Отклонено');
            setRejectTarget(null);
            setRejectComment('');
            setTimeout(() => setToast(null), 2000);
        } catch { /* silent */ }
        finally { setBusy(null); }
    }, [accessToken, items]);

    const handleBulkApprove = useCallback(async () => {
        if (!window.confirm(`Одобрить все ${pendingItems.length} запросов?`)) return;
        for (const item of pendingItems) {
            try { await performAction(accessToken, item.type, item.id, 'approve'); }
            catch { /* skip */ }
        }
        setToast(`✅ Одобрено ${pendingItems.length} запросов`);
        setTimeout(() => setToast(null), 2000);
        void load();
    }, [accessToken, pendingItems, load]);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 900,
            background: 'rgba(10,8,32,0.98)', backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Header */}
            <div style={{
                padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b', flex: 1 }}>🎛️ Пульт Управления</span>
                {totalPending > 0 && (
                    <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 10, color: '#22c55e' }}
                        onClick={() => void handleBulkApprove()}>
                        ✅ Одобрить все ({totalPending})
                    </button>
                )}
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} disabled={loading} onClick={() => void load()}>🔄</button>
                {onClose && <button type="button" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16 }} onClick={onClose}>✕</button>}
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Sidebar */}
                <div style={{
                    width: 180, flexShrink: 0, padding: 12, borderRight: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto',
                }}>
                    <button type="button" className="btn-secondary"
                        style={{
                            padding: '8px 10px', fontSize: 11, textAlign: 'left', justifyContent: 'flex-start',
                            background: !filter ? 'rgba(245,158,11,0.12)' : undefined, color: !filter ? '#f59e0b' : undefined,
                        }}
                        onClick={() => setFilter(null)}>
                        📥 Все ({totalPending})
                    </button>
                    {ALL_TYPES.map(t => {
                        const meta = TYPE_META[t];
                        const count = typeCounts.get(t) ?? 0;
                        return (
                            <button key={t} type="button" className="btn-secondary"
                                style={{
                                    padding: '8px 10px', fontSize: 11, textAlign: 'left', justifyContent: 'flex-start',
                                    background: filter === t ? `${meta.color}22` : undefined, color: filter === t ? meta.color : undefined,
                                    opacity: count === 0 ? 0.4 : 1,
                                }}
                                onClick={() => setFilter(t)}>
                                {meta.icon} {meta.label} ({count})
                            </button>
                        );
                    })}
                </div>

                {/* Main area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {loading && pendingItems.length === 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}>
                            <div style={{ width: 24, height: 24, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        </div>
                    )}

                    {!loading && pendingItems.length === 0 && (
                        <div style={{ padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#22c55e' }}>Нет ожидающих запросов</div>
                            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>Всё обработано!</div>
                        </div>
                    )}

                    {pendingItems.map(item => {
                        const meta = TYPE_META[item.type] ?? TYPE_META.badge;
                        const isBusy = busy === item.id;
                        return (
                            <div key={item.id} style={{
                                padding: 12, borderRadius: 12,
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                    {/* Avatar */}
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                                        {item.avatarUrl ? <img src={item.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} /> : '👤'}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 12, fontWeight: 600 }}>{item.nickname || 'user'}</span>
                                            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: `${meta.color}22`, color: meta.color }}>{meta.icon} {meta.label}</span>
                                            <span style={{ fontSize: 9, opacity: 0.4, marginLeft: 'auto' }}>{new Date(item.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{item.title}</div>
                                        {item.preview && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{item.preview.slice(0, 120)}{item.preview.length > 120 ? '…' : ''}</div>}
                                        {item.photoUrl && <img src={item.photoUrl} alt="" style={{ marginTop: 4, maxWidth: 120, maxHeight: 80, borderRadius: 6, objectFit: 'cover' }} />}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                        <button type="button" className="btn-secondary" disabled={isBusy}
                                            style={{ padding: '6px 10px', fontSize: 11, color: '#22c55e' }}
                                            onClick={() => void handleAction(item.id, 'approve')}>
                                            ✅
                                        </button>
                                        <button type="button" className="btn-secondary" disabled={isBusy}
                                            style={{ padding: '6px 10px', fontSize: 11, color: '#ef4444' }}
                                            onClick={() => setRejectTarget(rejectTarget === item.id ? null : item.id)}>
                                            ❌
                                        </button>
                                    </div>
                                </div>

                                {/* Reject comment */}
                                {rejectTarget === item.id && (
                                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                        <input type="text" value={rejectComment} onChange={e => setRejectComment(e.target.value)}
                                            placeholder="Причина отклонения (обязательно)"
                                            style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 11 }} />
                                        <button type="button" className="btn-secondary" disabled={isBusy || !rejectComment.trim()}
                                            style={{ padding: '6px 10px', fontSize: 11, color: '#ef4444' }}
                                            onClick={() => void handleAction(item.id, 'reject', rejectComment.trim())}>
                                            Отклонить
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
                    padding: '10px 20px', borderRadius: 10,
                    background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(245,158,11,0.3)',
                    color: '#fff', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}>
                    {toast}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
