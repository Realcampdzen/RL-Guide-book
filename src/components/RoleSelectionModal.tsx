import React, { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoleSelectionModalProps {
    onSelect: (role: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLES = [
    { id: 'participant', label: 'Участник', icon: '👤', desc: 'Я приеду в лагерь как участник' },
    { id: 'counselor', label: 'Вожатый', icon: '🏕️', desc: 'Я работаю вожатым в лагере' },
    { id: 'educator', label: 'Педагог', icon: '📚', desc: 'Я веду кружки и мастерские' },
    { id: 'parent', label: 'Родитель', icon: '👨‍👩‍👧', desc: 'Мой ребёнок едет в лагерь' },
];

const LS_KEY = 'rl-selected-role';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ onSelect }) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const handleSelect = useCallback((roleId: string) => {
        try { localStorage.setItem(LS_KEY, roleId); } catch { /* */ }
        onSelect(roleId);
    }, [onSelect]);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(9,9,15,0.85)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
        }}>
            <div style={{
                width: '100%', maxWidth: 420, padding: 28, borderRadius: 20,
                background: 'linear-gradient(180deg, rgba(30,27,60,0.95), rgba(15,12,35,0.95))',
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🏕️</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Добро пожаловать!</div>
                    <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>Кто вы в Реальном Лагере?</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ROLES.map(role => (
                        <button key={role.id} type="button"
                            onMouseEnter={() => setHoveredId(role.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={() => handleSelect(role.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '14px 16px', borderRadius: 14, border: 'none',
                                background: hoveredId === role.id ? 'rgba(217,119,6,0.15)' : 'rgba(255,255,255,0.05)',
                                cursor: 'pointer', textAlign: 'left',
                                transition: 'background 0.2s',
                                outline: hoveredId === role.id ? '1px solid rgba(217,119,6,0.3)' : 'none',
                            }}>
                            <span style={{ fontSize: 24, flexShrink: 0 }}>{role.icon}</span>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{role.label}</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{role.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

/** Check if role was previously selected. */
export function hasSelectedRole(): boolean {
    try { return !!localStorage.getItem(LS_KEY); }
    catch { return false; }
}

/** Get the previously selected role (or null). */
export function getSelectedRole(): string | null {
    try { return localStorage.getItem(LS_KEY); }
    catch { return null; }
}

export default RoleSelectionModal;
