import React, { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '../utils/supabaseClient';

import { ROLE_LABELS } from '../types/authRole';

import { NAV_HOME_IMAGE } from '../utils/imageSources';

import type { UserRole } from '../types/authRole';



/** localStorage key for pending OAuth role (survives redirect) */

const LS_OAUTH_ROLE = 'rl-pending-oauth-role';



// ---------------------------------------------------------------------------

// Types

// ---------------------------------------------------------------------------



export type RoleFlowResult =

    | { type: 'code-redeemed'; role: UserRole; accessToken: string }

    | { type: 'request-sent'; role: UserRole }

    | { type: 'request-approved'; role: UserRole; accessToken: string }

    | { type: 'oauth-started' }

    | { type: 'developer-oauth' }

    | { type: 'dev-pin-ok'; accessToken: string }

    | { type: 'cancelled' };



/** Retrieve and clear the pending OAuth desired role */

export function getPendingOAuthRole(): string | null {

    try { return localStorage.getItem(LS_OAUTH_ROLE); } catch { return null; }

}

export function clearPendingOAuthRole(): void {

    try { localStorage.removeItem(LS_OAUTH_ROLE); } catch { /* */ }

}



interface RoleSelectionModalProps {

    onResult: (result: RoleFlowResult) => void;

    deviceId: string;

    legacyRoleOwner?: UserRole;

}



// ---------------------------------------------------------------------------

// Constants

// ---------------------------------------------------------------------------



const ROLES: Array<{ id: UserRole; desc: string; muted?: boolean; highlighted?: boolean }> = [

    { id: 'participant', desc: 'Я приеду в лагерь как участник' },

    { id: 'counselor', desc: 'Я работаю вожатым в лагере' },

    { id: 'educator', desc: 'Я веду кружки и мастерские' },

    { id: 'shift_leader', desc: 'Руководитель смены' },

    { id: 'camp_director', desc: 'Начальник лагеря' },

    { id: 'parent', desc: 'Мой ребёнок едет в лагерь', highlighted: true },

    { id: 'developer', desc: 'Доступ для разработчиков', muted: true },

];



const LS_KEY = 'rl-selected-role';



type Step = 'select' | 'method' | 'code' | 'request' | 'oauth-verify' | 'done' | 'dev-pin';



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

// Component

// ---------------------------------------------------------------------------



interface SubmittedRequest {

    id: string;

    desiredRole: string;

}



export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ onResult, deviceId, legacyRoleOwner }) => {

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

    const [reqEmail, setReqEmail] = useState('');

    const [reqBusy, setReqBusy] = useState(false);

    const [reqDone, setReqDone] = useState(false);

    const [reqError, setReqError] = useState<string | null>(null);

    const [submittedReq, setSubmittedReq] = useState<SubmittedRequest | null>(null);





    // Dev PIN state

    const [devPin, setDevPin] = useState('');

    const [devPinError, setDevPinError] = useState<string | null>(null);

    const [devPinBusy, setDevPinBusy] = useState(false);



    const handleDevPinSubmit = useCallback(async () => {

        const trimmed = devPin.trim();

        if (!trimmed) return;

        // Client-side quick check (optional, for instant feedback in dev mode)

        const clientPin = (import.meta.env.VITE_DEV_PIN as string) || '';

        // Always try backend first to get a real JWT

        setDevPinBusy(true);

        setDevPinError(null);

        try {

            const base = getApiBase();

            const res = await fetch(`${base}/api/auth/dev-pin`, {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({ pin: trimmed, deviceId }),

            });

            const data = await res.json().catch(() => ({})) as Record<string, unknown>;

            if (res.ok && data.accessToken) {

                try { localStorage.setItem('rl-dev-pin', trimmed); } catch {}
                onResult({ type: 'dev-pin-ok', accessToken: data.accessToken as string });

                return;

            }

            // Backend rejected — fallback to client-side check (dev only)

            if (clientPin && trimmed === clientPin) {

                try { localStorage.setItem('rl-dev-pin', trimmed); } catch {}
                onResult({ type: 'dev-pin-ok', accessToken: '' });

                return;

            }

            setDevPinError((typeof data.error === 'string' && data.error) || 'Неверный PIN-код');

        } catch {

            // Network error — fallback to client-side check

            if (clientPin && trimmed === clientPin) {

                try { localStorage.setItem('rl-dev-pin', trimmed); } catch {}
                onResult({ type: 'dev-pin-ok', accessToken: '' });

                return;

            }

            setDevPinError('Ошибка сети');

        } finally {

            setDevPinBusy(false);

        }

    }, [devPin, deviceId, onResult]);



    // Email magic link state

    const [emailInput, setEmailInput] = useState('');

    const [emailSending, setEmailSending] = useState(false);

    const [emailSent, setEmailSent] = useState(false);

    const [emailError, setEmailError] = useState<string | null>(null);



    const handleEmailMagicLink = useCallback(async () => {

        if (!emailInput.trim()) return;

        setEmailSending(true);

        setEmailError(null);

        try {

            if (selectedRole) {

                try { localStorage.setItem(LS_OAUTH_ROLE, selectedRole); } catch { /* */ }

            }

            const { error } = await supabase.auth.signInWithOtp({

                email: emailInput.trim(),

                options: { emailRedirectTo: window.location.origin + window.location.pathname },

            });

            if (error) {

                setEmailError(error.message);

                try { localStorage.removeItem(LS_OAUTH_ROLE); } catch { /* */ }

            } else {

                setEmailSent(true);

            }

        } catch (e) {

            setEmailError('Ошибка отправки');

        } finally {

            setEmailSending(false);

        }

    }, [emailInput, selectedRole]);



    // Poll for approval after request submitted

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {

        if (step !== 'done' || !submittedReq || !deviceId) return;

        const base = getApiBase();

        const check = async () => {

            try {

                const res = await fetch(`${base}/api/role-requests?deviceId=${encodeURIComponent(deviceId)}`);

                if (!res.ok) return;

                const data = await res.json() as { requests?: Array<{ id: string; status: string; desiredRole: string; accessToken?: string }> };
                const req = (data.requests || []).find(r => r.id === submittedReq.id);
                if (req?.status === 'approved') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    onResult({ type: 'request-approved', role: req.desiredRole as UserRole, accessToken: req.accessToken || '' });
                }
            } catch { /* retry next poll */ }

        };

        void check();

        pollRef.current = setInterval(() => { void check(); }, 10_000);

        return () => { if (pollRef.current) clearInterval(pollRef.current); };

    // eslint-disable-next-line react-hooks/exhaustive-deps

    }, [step, submittedReq?.id, deviceId]);





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



    const handleOAuth = useCallback(async (provider: 'google' | 'yandex' | 'vk') => {

        if (!selectedRole) return;

        try { localStorage.setItem(LS_OAUTH_ROLE, selectedRole); } catch { /* */ }

        try {

            const { error } = await supabase.auth.signInWithOAuth({

                provider: provider === 'yandex' ? ('yandex' as 'google') : provider === 'vk' ? ('vk' as 'google') : provider,

                options: { redirectTo: window.location.origin + window.location.pathname },

            });

            if (error) {

                // OAuth failed — show error, don't close modal

                try { localStorage.removeItem(LS_OAUTH_ROLE); } catch { /* */ }

                console.error('OAuth error:', error.message);

                alert(`Ошибка входа: ${error.message}`);

                return;

            }

            // If successful, the browser redirects — onResult won't be called here

            onResult({ type: 'oauth-started' });

        } catch {

            try { localStorage.removeItem(LS_OAUTH_ROLE); } catch { /* */ }

        }

    }, [selectedRole, onResult]);





    const handleRedeemCode = useCallback(async () => {

        if (!code.trim() || !selectedRole) return;

        setCodeBusy(true);

        setCodeError(null);

        try {

            const base = getApiBase();

            // Get supabaseUserId if user has an active session (ensures unique identity per person)
            let supabaseUserId: string | undefined;
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                supabaseUserId = currentSession?.user?.id || undefined;
            } catch { /* no session — fine */ }

            const res = await fetch(`${base}/api/role-codes/redeem`, {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({
                    code: code.trim(),
                    deviceId,
                    legacyRoleOwner: legacyRoleOwner || undefined,
                    supabaseUserId: supabaseUserId || undefined,
                }),

            });

            const data = await res.json().catch(() => ({})) as Record<string, unknown>;

            if (!res.ok) {

                setCodeError(typeof data.error === 'string' ? data.error : 'Код не найден или истёк');

                return;

            }

            const role = (data.role as UserRole) || selectedRole;

            const accessToken = (data.accessToken as string) || '';

            // Code provides a valid JWT — apply immediately, no OAuth needed

            onResult({ type: 'code-redeemed', role, accessToken });

        } catch {

            setCodeError('Ошибка сети. Попробуйте позже.');

        } finally {

            setCodeBusy(false);

        }

    }, [code, deviceId, legacyRoleOwner, selectedRole, onResult]);



    const handleSubmitRequest = useCallback(async () => {
        const trimmedName = reqName.trim();
        const trimmedEmail = reqEmail.trim().toLowerCase();
        if (!trimmedName || !selectedRole) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setReqError('Введите корректный email');
            return;
        }
        setReqBusy(true);
        setReqError(null);
        try {
            const base = getApiBase();

            // Get supabaseUserId if user has an active session
            let supabaseUserId: string | undefined;
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                supabaseUserId = currentSession?.user?.id || undefined;
            } catch { /* no session — fine */ }

            const res = await fetch(`${base}/api/role-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId,
                    desiredRole: selectedRole,
                    name: trimmedName,
                    email: trimmedEmail,
                    comment: reqComment.trim() || undefined,
                    legacyRoleOwner: legacyRoleOwner || undefined,
                    supabaseUserId: supabaseUserId || undefined,
                }),
            });
            const data = await res.json().catch(() => ({})) as Record<string, unknown>;

            if (!res.ok) {

                setReqError(typeof data.error === 'string' ? data.error : 'Ошибка отправки');

                return;

            }

            const rr = (data.roleRequest || {}) as { id?: string; desiredRole?: string };

            setSubmittedReq(rr.id ? { id: rr.id, desiredRole: rr.desiredRole || selectedRole || '' } : null);

            setReqDone(true);

            // Go directly to done — email is already collected in the form

            setStep('done');

        } catch {

            setReqError('Ошибка сети. Попробуйте позже.');

        } finally {
            setReqBusy(false);
        }
    }, [reqName, reqComment, reqEmail, deviceId, legacyRoleOwner, selectedRole]);

    const roleLabel = selectedRole ? ROLE_LABELS[selectedRole] : '';
    const isReqEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reqEmail.trim());
    const canSubmitRequest = Boolean(reqName.trim() && isReqEmailValid);


    return (

        <div

            onClick={() => onResult({ type: 'cancelled' })}

            style={{

            position: 'fixed', inset: 0, zIndex: 1000,

            background: 'rgba(9,9,15,0.88)', backdropFilter: 'blur(12px)',

            display: 'flex', alignItems: 'center', justifyContent: 'center',

            padding: 16,

        }}>

            <div

                onClick={e => e.stopPropagation()}

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

                                        background: hoveredId === role.id ? 'rgba(217,119,6,0.15)' : role.highlighted ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.04)',

                                        cursor: 'pointer', textAlign: 'left',

                                        transition: 'background 0.2s',

                                        outline: hoveredId === role.id ? '1px solid rgba(217,119,6,0.3)' : role.highlighted ? '1px solid rgba(59,130,246,0.2)' : 'none',

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
                            style={{ 
                                display: 'block', margin: '20px auto 0', padding: '10px 24px', 
                                borderRadius: 12, background: 'rgba(255,255,255,0.05)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600,
                                cursor: 'pointer', transition: 'background 0.2s, color 0.2s' 
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                        >
                            Войти как Путешественник (без авторизации)
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

                            <input

                                type="email"

                                value={reqEmail}

                                onChange={e => setReqEmail(e.target.value)}

                                placeholder="Ваш email *"

                                style={{

                                    width: '100%', padding: '12px 14px', borderRadius: 10,

                                    border: `1px solid ${reqEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reqEmail.trim()) ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.15)'}`,

                                    background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 14,

                                    boxSizing: 'border-box',

                                }}

                            />

                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: -6 }}>

                                На этот адрес придёт уведомление о подтверждении

                            </div>

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

                        <button type="button" disabled={reqBusy || !canSubmitRequest} onClick={() => void handleSubmitRequest()}
                            style={{
                                width: '100%', padding: '12px', borderRadius: 10, border: 'none', marginTop: 12,
                                background: canSubmitRequest ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                                color: canSubmitRequest ? '#3b82f6' : 'rgba(255,255,255,0.3)',
                                fontSize: 14, fontWeight: 700, cursor: canSubmitRequest ? 'pointer' : 'default',
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

                                if (e.key === 'Enter') void handleDevPinSubmit();

                            }}

                        />

                        {devPinError && (

                            <div style={{ color: '#ef4444', fontSize: 12, textAlign: 'center', marginTop: 8 }}>{devPinError}</div>

                        )}

                        <button type="button"

                            onClick={() => void handleDevPinSubmit()}

                            disabled={devPinBusy || !devPin.trim()}

                            style={{

                                width: '100%', padding: '12px', borderRadius: 10, border: 'none', marginTop: 12,

                                background: devPin.trim() ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)',

                                color: devPin.trim() ? '#06b6d4' : 'rgba(255,255,255,0.3)',

                                fontSize: 14, fontWeight: 700, cursor: devPin.trim() ? 'pointer' : 'default',

                            }}>

                            {devPinBusy ? 'Проверка…' : 'Войти'}

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

                            <div style={{ fontSize: 13, opacity: 0.6, lineHeight: 1.5, marginBottom: 8 }}>

                                Мы проверим вашу заявку и отправим<br />код доступа на почту{reqEmail ? <> <b style={{ color: '#d97706' }}>{reqEmail}</b></> : ''}.

                            </div>

                            <div style={{ fontSize: 12, opacity: 0.4, lineHeight: 1.4, marginBottom: 16 }}>

                                Обычно это занимает до 24 часов.<br />Роль: <b style={{ color: '#f59e0b' }}>{roleLabel}</b>

                            </div>

                            {/* Polling indicator */}

                            {submittedReq && (

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>

                                    <span style={{

                                        width: 8, height: 8, borderRadius: '50%',

                                        background: '#22c55e',

                                        animation: 'pulse 1.5s ease-in-out infinite',

                                    }} />

                                    Страница автоматически обновится при одобрении

                                </div>

                            )}

                        </div>

                        <button type="button" onClick={() => onResult({ type: 'request-sent', role: selectedRole! })}

                            style={{

                                width: '100%', padding: '12px', borderRadius: 10, border: 'none', marginTop: 16,

                                background: 'rgba(255,255,255,0.08)', color: '#fff',

                                fontSize: 14, fontWeight: 600, cursor: 'pointer',

                            }}>

                            Закрыть (войти позже)

                        </button>

                    </>

                )}

                {/* ── Step oauth-verify: Email Identity Confirmation (for role requests only) ── */}

                {step === 'oauth-verify' && (

                    <>

                        <div style={{ textAlign: 'center', marginBottom: 16 }}>

                            <div style={{ fontSize: 28, marginBottom: 8 }}>🔑</div>

                            <div style={{ fontSize: 15, fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}>Заявка отправлена!</div>

                            <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.5 }}>

                                Войдите через почту, чтобы мы знали кто вы.<br />Админ одобрит заявку на <b style={{ color: '#f59e0b' }}>{roleLabel}</b>

                            </div>

                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                            <button type="button" onClick={() => void handleOAuth('google')}

                                style={{

                                    width: '100%', padding: '13px 16px', borderRadius: 12, border: 'none',

                                    background: '#fff', color: '#333', fontSize: 14, fontWeight: 600,

                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,

                                }}>

                                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>

                                Войти через Google

                            </button>

                            {/* Divider */}

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>

                                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />

                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>или</span>

                                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />

                            </div>

                            {/* Email magic link */}

                            {emailSent ? (

                                <div style={{ textAlign: 'center', padding: '12px 0' }}>

                                    <div style={{ fontSize: 24, marginBottom: 6 }}>📧</div>

                                    <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>Ссылка отправлена!</div>

                                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>Проверьте <b>{emailInput}</b> и нажмите на ссылку</div>

                                </div>

                            ) : (

                                <div style={{ display: 'flex', gap: 6 }}>

                                    <input

                                        type="email"

                                        value={emailInput}

                                        onChange={e => { setEmailInput(e.target.value); setEmailError(null); }}

                                        placeholder="Ваш email"

                                        style={{

                                            flex: 1, padding: '11px 14px', borderRadius: 10,

                                            border: '1px solid rgba(255,255,255,0.15)',

                                            background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13,

                                            boxSizing: 'border-box', outline: 'none',

                                        }}

                                        onKeyDown={e => { if (e.key === 'Enter') void handleEmailMagicLink(); }}

                                    />

                                    <button type="button" disabled={emailSending || !emailInput.trim()}

                                        onClick={() => void handleEmailMagicLink()}

                                        style={{

                                            padding: '11px 16px', borderRadius: 10, border: 'none',

                                            background: emailInput.trim() ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',

                                            color: emailInput.trim() ? '#3b82f6' : 'rgba(255,255,255,0.3)',

                                            fontSize: 13, fontWeight: 600, cursor: emailInput.trim() ? 'pointer' : 'default',

                                            whiteSpace: 'nowrap',

                                        }}>

                                        {emailSending ? '...' : '📨 Войти'}

                                    </button>

                                </div>

                            )}

                            {emailError && (

                                <div style={{ fontSize: 11, color: '#ef4444', textAlign: 'center' }}>{emailError}</div>

                            )}

                        </div>

                        <button type="button"

                            onClick={() => onResult({ type: 'request-sent', role: selectedRole! })}

                            style={{ display: 'block', margin: '16px auto 0', padding: '10px 24px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', position: 'relative', zIndex: 10 }}>

                            Закрыть (войти позже)

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





