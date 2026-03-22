import React, { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampDirectorPanelProps {
    accessToken: string;
}

interface CampOverview {
    shifts: number;
    squads: number;
    engines: number;
    workshops: number;
    initiatives: number;
    badges: number;
    inspectorTasks: number;
    broPassports: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiBase(): string {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
    return useLocal ? '' : ((import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '')).replace(/\/$/, '');
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAT_CARDS: Array<{ key: keyof CampOverview; label: string; icon: string; color: string }> = [
    { key: 'shifts', label: 'Смены', icon: '📅', color: '#3b82f6' },
    { key: 'squads', label: 'Отряды', icon: '🏕️', color: '#22c55e' },
    { key: 'engines', label: 'Движки', icon: '⚙️', color: '#16a34a' },
    { key: 'workshops', label: 'Мастерские', icon: '🎓', color: '#a855f7' },
    { key: 'initiatives', label: 'Инициативы', icon: '📋', color: '#f59e0b' },
    { key: 'badges', label: 'Значки выдано', icon: '🏅', color: '#d97706' },
    { key: 'inspectorTasks', label: 'Инспектор', icon: '🔍', color: '#3b82f6' },
    { key: 'broPassports', label: 'БРО паспорта', icon: '🦅', color: '#7c3aed' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CampDirectorPanel: React.FC<CampDirectorPanelProps> = ({ accessToken }) => {
    const [overview, setOverview] = useState<CampOverview | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const base = getApiBase();
            const res = await fetch(`${base}/api/camp/overview`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json() as CampOverview;
            setOverview(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ошибка загрузки');
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => { void load(); }, [load]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>👔 Кабинет Начальника</span>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} disabled={loading} onClick={() => void load()}>🔄</button>
            </div>

            {loading && !overview && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                    <div style={{ width: 24, height: 24, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
            )}

            {error && (
                <div style={{ padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#ef4444' }}>
                    ⚠️ {error}
                    <button type="button" className="btn-secondary" style={{ marginLeft: 8, padding: '2px 8px', fontSize: 10 }} onClick={() => void load()}>Повторить</button>
                </div>
            )}

            {overview && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                    {STAT_CARDS.map(card => (
                        <div key={card.key} style={{
                            padding: 12, borderRadius: 12, background: `${card.color}11`, border: `1px solid ${card.color}33`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        }}>
                            <span style={{ fontSize: 20 }}>{card.icon}</span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: card.color }}>{overview[card.key]}</span>
                            <span style={{ fontSize: 10, opacity: 0.7 }}>{card.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Parent CTA */}
            <a href="https://realcamp.ru/booking" target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', padding: '14px 20px', borderRadius: 12, background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                🎫 Забронировать путёвку
            </a>
        </div>
    );
};

export default CampDirectorPanel;
