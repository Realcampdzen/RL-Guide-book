import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchArts, submitArt, type ArtItem } from '../utils/badgeArtApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArtGallerySectionProps {
    badgeId: string;
    accessToken?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT = '#a78bfa';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ArtGallerySection: React.FC<ArtGallerySectionProps> = ({
    badgeId,
    accessToken,
}) => {
    const [arts, setArts] = useState<ArtItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitUrl, setSubmitUrl] = useState('');
    const [submitSource, setSubmitSource] = useState('');
    const [submitBusy, setSubmitBusy] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const loadArts = useCallback(async () => {
        setLoading(true);
        try {
            const items = await fetchArts(badgeId, 'approved');
            // Also fetch canon arts
            const canonItems = await fetchArts(badgeId, 'canon');
            const all = [...canonItems, ...items];
            // Dedupe by id
            const seen = new Set<string>();
            setArts(all.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; }));
        } catch {
            setArts([]);
        } finally {
            setLoading(false);
        }
    }, [badgeId]);

    useEffect(() => {
        void loadArts();
    }, [loadArts]);

    const sortedArts = useMemo(() => {
        return [...arts].sort((a, b) => {
            if (a.status === 'canon' && b.status !== 'canon') return -1;
            if (b.status === 'canon' && a.status !== 'canon') return 1;
            return 0;
        });
    }, [arts]);

    const handleSubmit = useCallback(async () => {
        if (!accessToken || !submitUrl.trim()) return;
        setSubmitBusy(true);
        setSubmitError(null);
        try {
            await submitArt(accessToken, {
                badgeId,
                imageUrl: submitUrl.trim(),
                source: submitSource.trim() || undefined,
            });
            setShowSubmitModal(false);
            setSubmitUrl('');
            setSubmitSource('');
            void loadArts();
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Не удалось отправить арт.');
        } finally {
            setSubmitBusy(false);
        }
    }, [accessToken, submitUrl, submitSource, badgeId, loadArts]);

    if (loading && arts.length === 0) {
        return <div style={{ fontSize: 12, opacity: 0.6, padding: 8 }}>Загрузка артов…</div>;
    }

    return (
        <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT }}>🎨 Арты сообщества</div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {accessToken && (
                        <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '4px 12px', fontSize: 11, color: ACCENT, borderColor: 'rgba(167,139,250,0.3)' }}
                            onClick={() => setShowSubmitModal(true)}
                        >
                            ＋ Предложить арт
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 11 }}
                        disabled={loading}
                        onClick={() => void loadArts()}
                    >
                        🔄
                    </button>
                </div>
            </div>

            {sortedArts.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.6 }}>Пока нет артов для этого значка.</div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 8,
                }}>
                    {sortedArts.map(art => (
                        <div
                            key={art.id}
                            style={{
                                position: 'relative', borderRadius: 10, overflow: 'hidden',
                                border: art.status === 'canon' ? `2px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.2)',
                            }}
                        >
                            <img
                                src={art.imageUrl}
                                alt="Art"
                                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                                loading="lazy"
                            />
                            {art.status === 'canon' && (
                                <div style={{
                                    position: 'absolute', top: 4, right: 4,
                                    background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '2px 5px',
                                    fontSize: 12,
                                }}>
                                    ⭐
                                </div>
                            )}
                            {art.submittedByNickname && (
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'rgba(0,0,0,0.65)', padding: '3px 6px',
                                    fontSize: 9, color: 'rgba(255,255,255,0.8)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {art.submittedByNickname}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Submit Art Modal */}
            {showSubmitModal && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={() => setShowSubmitModal(false)}
                >
                    <div
                        style={{ background: 'var(--surface-2, #1a1a2e)', borderRadius: 16, padding: 20, maxWidth: 380, width: '90%', border: `1px solid rgba(167,139,250,0.25)` }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h4 style={{ margin: '0 0 12px', color: ACCENT }}>🎨 Предложить арт</h4>
                        <input
                            type="text"
                            placeholder="URL изображения"
                            value={submitUrl}
                            onChange={e => setSubmitUrl(e.target.value)}
                            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
                        />
                        <select
                            value={submitSource}
                            onChange={e => setSubmitSource(e.target.value)}
                            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
                        >
                            <option value="">Источник (необязательно)</option>
                            <option value="original">Оригинальное</option>
                            <option value="ai_generated">Сгенерировано ИИ</option>
                            <option value="found">Найдено в сети</option>
                        </select>
                        {submitError && <div style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 8 }}>{submitError}</div>}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                type="button"
                                className="btn-primary-gold"
                                disabled={submitBusy || !submitUrl.trim()}
                                onClick={() => void handleSubmit()}
                                style={{ flex: 1, padding: '10px 16px' }}
                            >
                                {submitBusy ? 'Отправка…' : 'Отправить'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => setShowSubmitModal(false)} style={{ padding: '10px 16px' }}>Отмена</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArtGallerySection;
