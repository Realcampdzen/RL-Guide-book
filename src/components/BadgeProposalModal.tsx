import React, { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BadgeProposalModalProps {
    badgeId: string;
    badgeTitle: string;
    open: boolean;
    onClose: () => void;
}

type ChangeField = 'description' | 'criteria' | 'name' | 'other';

interface Proposal {
    id: string;
    badgeId: string;
    badgeTitle: string;
    field: ChangeField;
    text: string;
    status: 'proposed' | 'reviewing' | 'accepted' | 'rejected';
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<ChangeField, string> = {
    description: 'Описание',
    criteria: 'Критерии получения',
    name: 'Название',
    other: 'Другое',
};

const STATUS_CHIPS: Record<string, { label: string; color: string }> = {
    proposed: { label: 'Предложено', color: '#3b82f6' },
    reviewing: { label: 'На модерации', color: '#f59e0b' },
    accepted: { label: 'Принято', color: '#22c55e' },
    rejected: { label: 'Отклонено', color: '#ef4444' },
};

const LS_KEY = 'rl-badge-proposals';

function loadProposals(): Proposal[] {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as Proposal[]; }
    catch { return []; }
}

function saveProposals(items: Proposal[]) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch { /* */ }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BadgeProposalModal: React.FC<BadgeProposalModalProps> = ({
    badgeId,
    badgeTitle,
    open,
    onClose,
}) => {
    const [field, setField] = useState<ChangeField>('description');
    const [text, setText] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = useCallback(() => {
        if (!text.trim()) return;
        const proposal: Proposal = {
            id: `prop-${Date.now()}`,
            badgeId,
            badgeTitle,
            field,
            text: text.trim(),
            status: 'proposed',
            createdAt: new Date().toISOString(),
        };
        const all = loadProposals();
        all.push(proposal);
        saveProposals(all);
        setSubmitted(true);
        setTimeout(() => { setSubmitted(false); setText(''); onClose(); }, 1500);
    }, [badgeId, badgeTitle, field, text, onClose]);

    if (!open) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={onClose}>
            <div style={{ background: 'var(--surface-2, #1a1a2e)', borderRadius: 16, padding: 20, maxWidth: 400, width: '90%', border: '1px solid rgba(59,130,246,0.25)' }}
                onClick={e => e.stopPropagation()}>
                <h4 style={{ margin: '0 0 4px', color: '#3b82f6' }}>✏️ Предложить изменение</h4>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 12 }}>Значок: {badgeTitle} ({badgeId})</div>

                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Что изменить:</label>
                <select value={field} onChange={e => setField(e.target.value as ChangeField)}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}>
                    {(Object.keys(FIELD_LABELS) as ChangeField[]).map(f => (
                        <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                    ))}
                </select>

                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ваше предложение:</label>
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Опишите, что вы хотите изменить…"
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13, marginBottom: 8, minHeight: 80, boxSizing: 'border-box' }} />

                {submitted ? (
                    <div style={{ padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 12, textAlign: 'center' }}>
                        ✅ Предложение отправлено!
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="btn-primary-gold" disabled={!text.trim()} onClick={handleSubmit} style={{ flex: 1, padding: '10px 16px' }}>
                            Отправить
                        </button>
                        <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '10px 16px' }}>Отмена</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export { loadProposals, saveProposals, STATUS_CHIPS, FIELD_LABELS };
export type { Proposal, ChangeField };
export default BadgeProposalModal;
