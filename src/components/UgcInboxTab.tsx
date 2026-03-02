import React, { useCallback, useState } from 'react';
import { loadProposals, saveProposals, STATUS_CHIPS, FIELD_LABELS, type Proposal } from './BadgeProposalModal';
import { loadUgcBadges, saveUgcBadges, type UgcBadge } from './UgcBadgeCreator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UgcInboxTabProps {
    accessToken: string;
}

interface CategoryProposal {
    id: string;
    title: string;
    description: string;
    badges?: string;
    status: 'proposed' | 'approved' | 'rejected';
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CAT_LS_KEY = 'rl-ugc-categories';

function loadCatProposals(): CategoryProposal[] {
    try { return JSON.parse(localStorage.getItem(CAT_LS_KEY) || '[]') as CategoryProposal[]; }
    catch { return []; }
}

function saveCatProposals(items: CategoryProposal[]) {
    try { localStorage.setItem(CAT_LS_KEY, JSON.stringify(items)); } catch { /* */ }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const UgcInboxTab: React.FC<UgcInboxTabProps> = ({ accessToken: _accessToken }) => {
    const [proposals, setProposals] = useState<Proposal[]>(loadProposals);
    const [ugcBadges, setUgcBadges] = useState<UgcBadge[]>(loadUgcBadges);
    const [catProposals, setCatProposals] = useState<CategoryProposal[]>(loadCatProposals);
    const [rejectNote, setRejectNote] = useState('');
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);

    const refresh = useCallback(() => {
        setProposals(loadProposals());
        setUgcBadges(loadUgcBadges());
        setCatProposals(loadCatProposals());
    }, []);

    // Proposal actions
    const handleProposalAction = useCallback((id: string, status: 'accepted' | 'rejected') => {
        const next = proposals.map(p => p.id === id ? { ...p, status } : p);
        setProposals(next);
        saveProposals(next);
    }, [proposals]);

    // Badge actions
    const handleBadgeAction = useCallback((id: string, status: 'approved' | 'rejected') => {
        const next = ugcBadges.map(b => b.id === id ? { ...b, status } : b);
        setUgcBadges(next);
        saveUgcBadges(next);
    }, [ugcBadges]);

    // Category actions
    const handleCatAction = useCallback((id: string, status: 'approved' | 'rejected') => {
        const next = catProposals.map(c => c.id === id ? { ...c, status } : c);
        setCatProposals(next);
        saveCatProposals(next);
    }, [catProposals]);

    const pendingProposals = proposals.filter(p => p.status === 'proposed');
    const pendingBadges = ugcBadges.filter(b => b.status === 'proposed');
    const pendingCats = catProposals.filter(c => c.status === 'proposed');
    const totalPending = pendingProposals.length + pendingBadges.length + pendingCats.length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#a855f7' }}>🏷️ UGC Модерация ({totalPending})</span>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={refresh}>🔄</button>
            </div>

            {totalPending === 0 && (
                <div style={{ fontSize: 12, opacity: 0.6 }}>Нет материалов на модерации.</div>
            )}

            {/* Badge edit proposals */}
            {pendingProposals.length > 0 && (
                <div>
                    <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, marginBottom: 4 }}>✏️ Предложения изменений</div>
                    {pendingProposals.map(p => {
                        const s = STATUS_CHIPS[p.status];
                        return (
                            <div key={p.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.12)', marginBottom: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: 11, fontWeight: 600 }}>{p.badgeTitle} ({p.badgeId})</div>
                                <div style={{ fontSize: 10, opacity: 0.6 }}>Поле: {FIELD_LABELS[p.field]}</div>
                                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2, whiteSpace: 'pre-wrap' }}>{p.text.slice(0, 200)}{p.text.length > 200 ? '…' : ''}</div>
                                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: `${s.color}22`, color: s.color }}>{s.label}</span>
                                    <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: 10, color: '#22c55e' }}
                                        onClick={() => handleProposalAction(p.id, 'accepted')}>✅</button>
                                    <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: 10, color: '#ef4444' }}
                                        onClick={() => handleProposalAction(p.id, 'rejected')}>❌</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* New badge proposals */}
            {pendingBadges.length > 0 && (
                <div>
                    <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, marginBottom: 4 }}>🏷️ Новые значки</div>
                    {pendingBadges.map(b => (
                        <div key={b.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.12)', marginBottom: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: 11, fontWeight: 600 }}>{b.title}</div>
                            <div style={{ fontSize: 10, opacity: 0.6 }}>{b.categoryId} · {b.level}</div>
                            {b.description && <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>{b.description.slice(0, 150)}{b.description.length > 150 ? '…' : ''}</div>}
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: 10, color: '#22c55e' }}
                                    onClick={() => handleBadgeAction(b.id, 'approved')}>✅ Одобрить</button>
                                <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: 10, color: '#ef4444' }}
                                    onClick={() => { setRejectTarget(b.id); setRejectNote(''); }}>❌ Отклонить</button>
                            </div>
                            {rejectTarget === b.id && (
                                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                    <input type="text" value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Причина…"
                                        style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 11 }} />
                                    <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: 10, color: '#ef4444' }}
                                        onClick={() => { handleBadgeAction(b.id, 'rejected'); setRejectTarget(null); }}>✓</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Category proposals */}
            {pendingCats.length > 0 && (
                <div>
                    <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, marginBottom: 4 }}>📁 Новые категории</div>
                    {pendingCats.map(c => (
                        <div key={c.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.12)', marginBottom: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: 11, fontWeight: 600 }}>{c.title}</div>
                            {c.description && <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>{c.description}</div>}
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: 10, color: '#22c55e' }}
                                    onClick={() => handleCatAction(c.id, 'approved')}>✅</button>
                                <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: 10, color: '#ef4444' }}
                                    onClick={() => handleCatAction(c.id, 'rejected')}>❌</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export { loadCatProposals, saveCatProposals };
export type { CategoryProposal };
export default UgcInboxTab;
