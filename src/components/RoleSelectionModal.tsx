import React, { useCallback, useState } from 'react';
import { ROLE_LABELS } from '../types/authRole';
import { NAV_HOME_IMAGE } from '../utils/imageSources';
import type { UserRole } from '../types/authRole';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoleFlowResult =
    | { type: 'code-redeemed'; role: UserRole; accessToken: string }
    | { type: 'request-sent'; role: UserRole }
    | { type: 'developer-oauth' }
    | { type: 'dev-pin-ok' }
    | { type: 'cancelled' };

interface RoleSelectionModalProps {
    onResult: (result: RoleFlowResult) => void;
    deviceId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLES: Array<{ id: UserRole; desc: string; muted?: boolean }> = [
    { id: 'participant', desc: 'Я приеду в лагерь как участник' },
    { id: 'counselor', desc: 'Я работаю вожатым в лагере' },
    { id: 'educator', desc: 'Я веду кружки и мастерские' },
    { id: 'shift_leader', desc: 'Руководитель смены' },
    { id: 'camp_director', desc: 'Начальник лагеря' },
    { id: 'parent', desc: 'Мой ребёнок едет в лагерь' },
    { id: 'developer', desc: 'Доступ для разработчиков', muted: true },
];

const LS_KEY = 'rl-selected-role';

type Step = 'select' | 'method' | 'code' | 'request' | 'done' | 'dev-pin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiBase(): string {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
    return useLocal ? '' : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ onResult, deviceId }) => {
    const [step, setStep] = useState<Step>('select');
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Code input state
    const [code, setCode] = useState('');
    const [codeBusy, setCodeBusy] = useState(false);
    const [codeError, setCodeError] = useState<string | null>(null);

    // Request state
    const [reqName, setReqName] = useState('');
    const [reqComment, setReqComment] = useState('');
    const [reqBusy, setReqBusy] = useState(false);
    const [reqDone, setReqDone] = useState(false);
    const [reqError, setReqError] = useState<string | null>(null);

    // Dev PIN state
    const [devPin, setDevPin] = useState('');
    const [devPinError, setDevPinError] = useState<string | null>(null);

    const handleSelectRole = useCallback((roleId: UserRole) => {
        try { localStorage.setItem(LS_KEY, roleId); } catch { /* */ }
        setSelectedRole(roleId);

        if (roleId === 'developer') {
            // Developer → PIN code flow
            setStep('dev-pin');
            return;
        }

        setStep('method');
    }, [onResult]);

    const handleRedeemCode = useCallback(async () => {
        if (!code.trim() || !selectedRole) return;
        setCodeBusy(true);
        setCodeError(null);
        try {
            const base = getApiBase();
            const res = await fetch(`${base}/api/role-codes/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code.trim(), deviceId }),
            });
            const data = await res.json().catch(() => ({})) as Record<string, unknown>;
            if (!res.ok) {
                setCodeError(typeof data.error === 'string' ? data.error : 'Код не найден или истёк');
                return;
            }
            const role = (data.role as UserRole) || selectedRole;
            const accessToken = (data.accessToken as string) || '';
            onResult({ type: 'code-redeemed', role, accessToken });
        } catch {
            setCodeError('Ошибка сети. Попробуйте позже.');
        } finally {
            setCodeBusy(false);
        }
    }, [code, deviceId, selectedRole, onResult]);

    const handleSubmitRequest = useCallback(async () => {
        if (!reqName.trim() || !selectedRole) return;
        setReqBusy(true);
        setReqError(null);
        try {
            const base = getApiBase();
            const res = await fetch(`${base}/api/role-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId,
                    desiredRole: selectedRole,
                    name: reqName.trim(),
                    comment: reqComment.trim() || undefined,
                }),
            });
            const data = await res.json().catch(() => ({})) as Record<string, unknown>;
            if (!res.ok) {
                setReqError(typeof data.error === 'string' ? data.error : 'Ошибка отправки');
                return;
            }
            setReqDone(true);
            setStep('done');
        } catch {
            setReqError('Ошибка сети. Попробуйте позже.');
        } finally {
            setReqBusy(false);
        }
    }, [reqName, reqComment, deviceId, selectedRole]);

    const roleLabel = selectedRole ? ROLE_LABELS[selectedRole] : '';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(9,9,15,0.88)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
        }}>
            <div
                ref={(el) => {
                    if (el) {
                        // Hide webkit scrollbar via JS (no external CSS needed)
                        const style = document.createElement('style');
                        style.textContent = `[data-role-modal]::-webkit-scrollbar { display: none; }`;
                        if (!document.querySelector('style[data-role-modal-style]')) {
                            style.setAttribute('data-role-modal-style', '');
                            document.head.appendChild(style);
                        }
                    }
                }}
                data-role-modal=""
                style={{
                width: '100%', maxWidth: 440, padding: 28, borderRadius: 20,
                background: 'linear-gradient(180deg, rgba(30,27,60,0.95), rgba(15,12,35,0.95))',
                border: '1px solid rgba(255,255,255,0.1)',
                maxHeight: '90vh', overflowY: 'auto',
                scrollbarWidth: 'none',           // Firefox
                msOverflowStyle: 'none',           // IE / Edge legacy
            } as React.CSSProperties}>

                {/* ── Step 1: Role Selection ── */}
                {step === 'select' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <img src={`${import.meta.env.BASE_URL}${NAV_HOME_IMAGE}`} alt="Реальный Лагерь"
                                style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 8px' }} />
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Добро пожаловать!</div>
                            <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>Кто вы в Реальном Лагере?</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {ROLES.map(role => (
                                <button key={role.id} type="button"
                                    onMouseEnter={() => setHoveredId(role.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    onClick={() => handleSelectRole(role.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '12px 14px', borderRadius: 12, border: 'none',
                                        background: hoveredId === role.id ? 'rgba(217,119,6,0.15)' : 'rgba(255,255,255,0.04)',
                                        cursor: 'pointer', textAlign: 'left',
                                        transition: 'background 0.2s',
                                        outline: hoveredId === role.id ? '1px solid rgba(217,119,6,0.3)' : 'none',
                                        opacity: role.muted ? 0.45 : 1,
                                    }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{ROLE_LABELS[role.id]}</div>
                                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{role.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={() => onResult({ type: 'cancelled' })}
                            style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer' }}>
                            Отмена
                        </button>
                    </>
                )}

                {/* ── Step 2: Method Choice ── */}
                {step === 'method' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ fontSize: 14, opacity: 0.5, marginBottom: 4 }}>Вы выбрали</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{roleLabel}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {import.meta.env.DEV && (
                                <button type="button" onClick={() => {
                                    if (selectedRole) {
                                        try { localStorage.setItem(LS_KEY, selectedRole); } catch { /* */ }
                                        // Sandbox: signal role change without fake accessToken.
                                        // Using deviceId as accessToken caused 401s → clearAuth → role wiped.
                                        onResult({ type: 'code-redeemed', role: selectedRole, accessToken: '' });
                                    }
                                }}
                                    style={{
                                        padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(6,182,212,0.3)',
                                        background: 'rgba(6,182,212,0.1)', cursor: 'pointer', textAlign: 'left',
                                        transition: 'background 0.2s',
                                    }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#06b6d4' }}>⚡ Песочница — переключить сразу</div>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Dev-режим: мгновенная смена роли без кода</div>
                                </button>
                            )}
                            <button type="button" onClick={() => setStep('code')}
                                style={{
                                    padding: '14px 16px', borderRadius: 12, border: 'none',
                                    background: 'rgba(34,197,94,0.1)', cursor: 'pointer', textAlign: 'left',
                                    transition: 'background 0.2s',
                                }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#22c55e' }}>📝 У меня есть код</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Ввести одноразовый код доступа</div>
                            </button>
                            <button type="button" onClick={() => setStep('request')}
                                style={{
                                    padding: '14px 16px', borderRadius: 12, border: 'none',
                                    background: 'rgba(59,130,246,0.1)', cursor: 'pointer', textAlign: 'left',
                                    transition: 'background 0.2s',
                                }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#3b82f6' }}>📩 Отправить заявку</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Подать заявку и дождаться одобрения</div>
                            </button>
                        </div>
                        <button type="button" onClick={() => { setStep('select'); setSelectedRole(null); }}
                            style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer' }}>
                            ← Назад к выбору роли
                        </button>
                    </>
                )}

                {/* ── Step 3a: Code Input ── */}
                {step === 'code' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <div style={{ fontSize: 14, opacity: 0.5, marginBottom: 4 }}>{roleLabel}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>Введите код доступа</div>
                        </div>
                        <input
                            type="text"
                            value={code}
                            onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError(null); }}
                            placeholder="RL-VOZ-XXXX"
                            autoFocus
                            style={{
                                width: '100%', padding: '12px 14px', borderRadius: 10,
                                border: `1px solid ${codeError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.15)'}`,
                                background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 15,
                                fontFamily: 'monospace', textAlign: 'center', letterSpacing: 2,
                                boxSizing: 'border-box',
                            }}
                        />
                        {codeError && (
                            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6, textAlign: 'center' }}>{codeError}</div>
                        )}
                        <button type="button" disabled={codeBusy || !code.trim()} onClick={() => void handleRedeemCode()}
                            style={{
                                width: '100%', padding: '12px', borderRadius: 10, border: 'none', marginTop: 12,
                                background: code.trim() ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                                color: code.trim() ? '#22c55e' : 'rgba(255,255,255,0.3)',
                                fontSize: 14, fontWeight: 700, cursor: code.trim() ? 'pointer' : 'default',
                            }}>
                            {codeBusy ? 'Проверяю…' : 'Активировать'}
                        </button>
                        <button type="button" onClick={() => { setStep('method'); setCode(''); setCodeError(null); }}
                            style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer' }}>
                            ← Назад
                        </button>
                    </>
                )}

                {/* ── Step 3b: Request Form ── */}
                {step === 'request' && !reqDone && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <div style={{ fontSize: 14, opacity: 0.5, marginBottom: 4 }}>{roleLabel}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>Заявка на роль</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <input
                                type="text"
                                value={reqName}
                                onChange={e => setReqName(e.target.value)}
                                placeholder="Ваше имя *"
                                autoFocus
                                style={{
                                    width: '100%', padding: '12px 14px', borderRadius: 10,
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 14,
                                    boxSizing: 'border-box',
                                }}
                            />
                            <textarea
                                value={reqComment}
                                onChange={e => setReqComment(e.target.value)}
                                placeholder="Комментарий (необязательно)"
                                rows={2}
                                style={{
                                    width: '100%', padding: '12px 14px', borderRadius: 10,
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13,
                                    resize: 'vertical', boxSizing: 'border-box',
                                }}
                            />
                        </div>
                        {reqError && (
                            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6, textAlign: 'center' }}>{reqError}</div>
                        )}
                        <button type="button" disabled={reqBusy || !reqName.trim()} onClick={() => void handleSubmitRequest()}
                            style={{
                                width: '100%', padding: '12px', borderRadius: 10, border: 'none', marginTop: 12,
                                background: reqName.trim() ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                                color: reqName.trim() ? '#3b82f6' : 'rgba(255,255,255,0.3)',
                                fontSize: 14, fontWeight: 700, cursor: reqName.trim() ? 'pointer' : 'default',
                            }}>
                            {reqBusy ? 'Отправка…' : 'Отправить заявку'}
                        </button>
                        <button type="button" onClick={() => { setStep('method'); setReqError(null); }}
                            style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer' }}>
                            ← Назад
                        </button>
                    </>
                )}

                {/* ── Step: Dev PIN ── */}
                {step === 'dev-pin' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>🔧</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#06b6d4' }}>Доступ для разработчиков</div>
                            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>Введите PIN-код доступа</div>
                        </div>
                        <input
                            type="text"
                            value={devPin}
                            onChange={e => { setDevPin(e.target.value); setDevPinError(null); }}
                            placeholder="PIN-код"
                            autoFocus
                            style={{
                                width: '100%', padding: '12px', borderRadius: 10,
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(6,182,212,0.3)',
                                color: '#fff', fontSize: 18, textAlign: 'center',
                                fontFamily: 'monospace', letterSpacing: 4,
                                outline: 'none',
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    const pin = (import.meta.env.VITE_DEV_PIN as string) || '';
                                    if (pin && devPin.trim() === pin) {
                                        onResult({ type: 'dev-pin-ok' });
                                    } else {
                                        setDevPinError('Неверный PIN-код');
                                    }
                                }
                            }}
                        />
                        {devPinError && (
                            <div style={{ color: '#ef4444', fontSize: 12, textAlign: 'center', marginTop: 8 }}>{devPinError}</div>
                        )}
                        <button type="button"
                            onClick={() => {
                                const pin = (import.meta.env.VITE_DEV_PIN as string) || '';
                                if (pin && devPin.trim() === pin) {
                                    onResult({ type: 'dev-pin-ok' });
                                } else {
                                    setDevPinError('Неверный PIN-код');
                                }
                            }}
                            disabled={!devPin.trim()}
                            style={{
                                width: '100%', padding: '12px', borderRadius: 10, border: 'none', marginTop: 12,
                                background: devPin.trim() ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)',
                                color: devPin.trim() ? '#06b6d4' : 'rgba(255,255,255,0.3)',
                                fontSize: 14, fontWeight: 700, cursor: devPin.trim() ? 'pointer' : 'default',
                            }}>
                            Войти
                        </button>
                        <button type="button" onClick={() => { setStep('select'); setDevPin(''); setDevPinError(null); }}
                            style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer' }}>
                            ← Назад
                        </button>
                    </>
                )}
                {/* ── Step 4: Done ── */}
                {step === 'done' && (
                    <>
                        <div style={{ textAlign: 'center', padding: '10px 0' }}>
                            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>Заявка отправлена!</div>
                            <div style={{ fontSize: 13, opacity: 0.6, lineHeight: 1.5 }}>
                                Ожидайте подтверждения. Вы получите<br />роль <b style={{ color: '#f59e0b' }}>{roleLabel}</b> после одобрения.
                            </div>
                        </div>
                        <button type="button" onClick={() => onResult({ type: 'request-sent', role: selectedRole! })}
                            style={{
                                width: '100%', padding: '12px', borderRadius: 10, border: 'none', marginTop: 16,
                                background: 'rgba(255,255,255,0.08)', color: '#fff',
                                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            }}>
                            Закрыть
                        </button>
                    </>
                )}
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
