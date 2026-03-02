import React, { useCallback, useEffect, useState } from 'react';
import { fetchArtsInbox, reviewArt, type ArtItem } from '../utils/badgeArtApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArtInboxTabProps {
    accessToken: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT = '#a78bfa';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ArtInboxTab: React.FC<ArtInboxTabProps> = ({ accessToken }) => {
    const [items, setItems] = useState<ArtItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rejectNoteId, setRejectNoteId] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchArtsInbox(accessToken);
            setItems(data);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleReview = useCallback(async (id: string, status: 'approved' | 'rejected' | 'canon', note?: string) => {
        if (busyId) return;
        setBusyId(id);
        try {
            await reviewArt(accessToken, id, { status, note });
            setItems(prev => prev.filter(item => item.id !== id));
            setRejectNoteId(null);
            setRejectNote('');
        } catch { /* silent */ }
        finally { setBusyId(null); }
    }, [accessToken, busyId]);

    if (loading && items.length === 0) {
        return <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Загрузка артов…</div>;
    }

    if (items.length === 0) {
        return <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Нет артов на модерацию.</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>🎨 Арты ({items.length})</span>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} disabled={loading} onClick={() => void load()}>
                    🔄
                </button>
            </div>

            {items.map(art => (
                <div
                    key={art.id}
                    style={{
                        display: 'flex', gap: 10, padding: 10, borderRadius: 12,
                        background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.08)',
                        alignItems: 'start',
                    }}
                >
                    <img
                        src={art.imageUrl}
                        alt="Art preview"
                        style={{
                            width: 72, height: 72, objectFit: 'cover', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0,
                        }}
                        loading="lazy"
                    />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{art.badgeTitle || art.badgeId}</div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>
                            {art.submittedByNickname || 'Аноним'} · {art.source || '—'} · {new Date(art.createdAt).toLocaleDateString('ru-RU')}
                        </div>

                        {rejectNoteId === art.id ? (
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                <input
                                    type="text"
                                    placeholder="Причина отклонения"
                                    value={rejectNote}
                                    onChange={e => setRejectNote(e.target.value)}
                                    style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 11 }}
                                />
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: 10, color: '#ff6b6b' }}
                                    disabled={busyId === art.id}
                                    onClick={() => void handleReview(art.id, 'rejected', rejectNote || undefined)}
                                >
                                    ❌
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: 10 }}
                                    onClick={() => { setRejectNoteId(null); setRejectNote(''); }}
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: 10, color: '#4ade80' }}
                                    disabled={busyId === art.id}
                                    onClick={() => void handleReview(art.id, 'approved')}
                                >
                                    ✅ Одобрить
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: 10, color: '#ff6b6b' }}
                                    disabled={busyId === art.id}
                                    onClick={() => setRejectNoteId(art.id)}
                                >
                                    ❌ Отклонить
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: 10, color: '#fbbf24' }}
                                    disabled={busyId === art.id}
                                    onClick={() => void handleReview(art.id, 'canon')}
                                >
                                    ⭐ Канон
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ArtInboxTab;
