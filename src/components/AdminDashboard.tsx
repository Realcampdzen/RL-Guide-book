import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    fetchInbox,
    performAction,
    generateRoleCode,
} from '../utils/adminApi';
import { ROLE_LABELS } from '../types/authRole';
import type { UserRole } from '../types/authRole';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminDashboardProps {
    accessToken: string;
    onClose?: () => void;
}

type AdminTab = 'inbox' | 'codes';

// Raw item shape from backend
interface RawInboxItem {
    type: string;
    id: string;
    user?: { device_id?: string; nickname?: string; email?: string };
    data?: Record<string, unknown>;
    status: string;
    created_at?: string;
    createdAt?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
    badge_request: { icon: '🏅', label: 'Значки', color: '#f59e0b' },
    council_initiative: { icon: '📋', label: 'Инициативы', color: '#3b82f6' },
    badge_art: { icon: '🎨', label: 'Арты', color: '#a855f7' },
    engine_approve: { icon: '⚙️', label: 'Движки', color: '#22c55e' },
    inspector_task: { icon: '🔍', label: 'Инспектор', color: '#06b6d4' },
    role_request: { icon: '🙋', label: 'Роли', color: '#8b5cf6' },
};

const ALL_TYPES = Object.keys(TYPE_META);

const ROLE_OPTIONS = [
    { value: 'participant', label: '👤 Участник' },
    { value: 'counselor', label: '🏕️ Вожатый' },
    { value: 'educator', label: '📚 Педагог' },
    { value: 'shift_leader', label: '⭐ Ст.вожатый' },
    { value: 'camp_director', label: '👑 Нач.лагеря' },
    { value: 'parent', label: '👨‍👩‍👧 Родитель' },
];

// ---------------------------------------------------------------------------
// Pill button helper
// ---------------------------------------------------------------------------

const pillStyle = (active: boolean, color: string): React.CSSProperties => ({
    padding: '7px 14px',
    fontSize: 12,
    fontWeight: 600,
    border: `1px solid ${active ? color : 'rgba(255,255,255,0.15)'}`,
    borderRadius: 999,
    background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
    color: active ? color : 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(raw?: string): string {
    if (!raw) return '';
    try {
        const d = new Date(raw);
        if (isNaN(d.getTime())) return '';
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 60_000) return 'только что';
        if (diff < 3600_000) return `${Math.floor(diff / 60_000)} мин назад`;
        if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} ч назад`;
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch { return ''; }
}

function humanizeId(id: string): string {
    if (!id) return '';
    return id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getUserName(item: RawInboxItem): string {
    const user = item.user || {};
    if (user.nickname) return user.nickname;
    if (user.device_id) return `Устройство ${user.device_id.slice(0, 8)}…`;
    return 'Аноним';
}

function getItemTitle(item: RawInboxItem): string {
    const data = item.data || {};
    switch (item.type) {
        case 'badge_request':
            return (data.badge_name as string) || humanizeId(data.badge_id as string) || 'Заявка на значок';
        case 'council_initiative':
            return (data.title as string) || 'Инициатива совета';
        case 'badge_art': {
            const name = humanizeId(data.badge_id as string) || 'значок';
            return `Новый арт: ${name}`;
        }
        case 'engine_approve':
            return (data.title as string) || 'Новый движок';
        case 'inspector_task':
            return `Инспекция: задание ${(data.task_id as string) || ''}`;
        case 'role_request': {
            const desired = (data.desired_role as string) || '';
            const label = desired ? (ROLE_LABELS[desired as UserRole] || desired) : 'роль';
            return `Хочет стать: ${label}`;
        }
        default:
            return item.type;
    }
}

function getItemDescription(item: RawInboxItem): string {
    const data = item.data || {};
    switch (item.type) {
        case 'badge_request':
            return 'Запрос на получение значка. Проверьте доказательства.';
        case 'council_initiative': {
            const desc = (data.description as string) || '';
            return desc || 'Предложение от участника в совет лагеря.';
        }
        case 'badge_art': {
            const source = (data.source as string) || 'неизвестно';
            return `Источник: ${source}. Одобрите для публикации.`;
        }
        case 'engine_approve':
            return 'Новый движок ожидает модерации.';
        case 'inspector_task':
            return 'Задание выполнено, ожидает подтверждения.';
        case 'role_request': {
            const comment = (data.comment as string);
            return comment || 'Заявка на смену роли. Одобрите или отклоните.';
        }
        default:
            return '';
    }
}

function getItemPhotoUrl(item: RawInboxItem): string | null {
    const data = item.data || {};
    if (item.type === 'badge_art') {
        const url = (data.image_url as string) || null;
        if (url && url.startsWith('https://example.com')) return null; // skip test URLs
        return url;
    }
    if (item.type === 'badge_request') {
        const attachments = data.attachments;
        if (Array.isArray(attachments) && attachments.length > 0) return attachments[0];
    }
    return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ accessToken, onClose }) => {
    const [adminTab, setAdminTab] = useState<AdminTab>('inbox');

    // ── Inbox state ──
    const [items, setItems] = useState<RawInboxItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);
    const [rejectComment, setRejectComment] = useState('');
    const [toast, setToast] = useState<string | null>(null);

    // ── Code generation state ──
    const [codeRole, setCodeRole] = useState('');
    const [codeBusy, setCodeBusy] = useState(false);
    const [codeResult, setCodeResult] = useState<{ code: string; role: string; expiresAt: string } | null>(null);
    const [codeError, setCodeError] = useState<string | null>(null);
    const [codeCopied, setCodeCopied] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchInbox(filter as any ?? undefined);
            setItems(data as unknown as RawInboxItem[]);
        } catch { setItems([]); }
        finally { setLoading(false); }
    }, [filter]);

    useEffect(() => { void load(); }, [load]);

    const pendingItems = useMemo(() => items.filter(i => i.status === 'pending' || i.status === 'done_pending'), [items]);

    const typeCounts = useMemo(() => {
        const map = new Map<string, number>();
        pendingItems.forEach(i => map.set(i.type, (map.get(i.type) ?? 0) + 1));
        return map;
    }, [pendingItems]);

    const totalPending = pendingItems.length;

    const handleAction = useCallback(async (itemId: string, itemType: string, action: 'approve' | 'reject', comment?: string) => {
        setBusy(itemId);
        try {
            await performAction(accessToken, itemType as any, itemId, action, comment);
            setItems(prev => prev.filter(i => i.id !== itemId));
            setToast(action === 'approve' ? '✅ Одобрено' : '❌ Отклонено');
            setRejectTarget(null);
            setRejectComment('');
            setTimeout(() => setToast(null), 2000);
        } catch { /* silent */ }
        finally { setBusy(null); }
    }, [accessToken]);

    const handleBulkApprove = useCallback(async () => {
        if (!window.confirm(`Одобрить все ${pendingItems.length} запросов?`)) return;
        for (const item of pendingItems) {
            try { await performAction(accessToken, item.type as any, item.id, 'approve'); }
            catch { /* skip */ }
        }
        setToast(`✅ Одобрено ${pendingItems.length} запросов`);
        setTimeout(() => setToast(null), 2000);
        void load();
    }, [accessToken, pendingItems, load]);

    const handleGenerateCode = useCallback(async () => {
        if (!codeRole) return;
        setCodeBusy(true);
        setCodeError(null);
        setCodeResult(null);
        setCodeCopied(false);
        try {
            const result = await generateRoleCode(accessToken, codeRole);
            setCodeResult(result);
        } catch (e) {
            setCodeError(e instanceof Error ? e.message : 'Ошибка генерации');
        } finally {
            setCodeBusy(false);
        }
    }, [accessToken, codeRole]);

    const handleCopyCode = useCallback(async () => {
        if (!codeResult?.code) return;
        try {
            await navigator.clipboard.writeText(codeResult.code);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        } catch { /* fallback */ }
    }, [codeResult]);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 900,
            background: 'rgba(10,8,32,0.98)', backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Header with tabs */}
            <div style={{
                padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>🎛️ Пульт Управления</span>

                {/* Tab buttons */}
                <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
                    <button type="button" onClick={() => setAdminTab('inbox')} style={{
                        padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 999, cursor: 'pointer',
                        border: `1px solid ${adminTab === 'inbox' ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`,
                        background: adminTab === 'inbox' ? 'rgba(245,158,11,0.15)' : 'transparent',
                        color: adminTab === 'inbox' ? '#f59e0b' : 'rgba(255,255,255,0.6)',
                        transition: 'all 0.2s',
                    }}>
                        📥 Входящие {totalPending > 0 && `(${totalPending})`}
                    </button>
                    <button type="button" onClick={() => setAdminTab('codes')} style={{
                        padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 999, cursor: 'pointer',
                        border: `1px solid ${adminTab === 'codes' ? '#8b5cf6' : 'rgba(255,255,255,0.15)'}`,
                        background: adminTab === 'codes' ? 'rgba(139,92,246,0.15)' : 'transparent',
                        color: adminTab === 'codes' ? '#8b5cf6' : 'rgba(255,255,255,0.6)',
                        transition: 'all 0.2s',
                    }}>
                        🔑 Коды на роли
                    </button>
                </div>

                <div style={{ flex: 1 }} />
                {adminTab === 'inbox' && totalPending > 0 && (
                    <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 10, color: '#22c55e' }}
                        onClick={() => void handleBulkApprove()}>
                        ✅ Одобрить все ({totalPending})
                    </button>
                )}
                {adminTab === 'inbox' && (
                    <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} disabled={loading} onClick={() => void load()}>🔄</button>
                )}
                {onClose && <button type="button" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16 }} onClick={onClose}>✕</button>}
            </div>

            {/* ── TAB: Inbox ── */}
            {adminTab === 'inbox' && (
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Sidebar */}
                    <div style={{
                        width: 190, flexShrink: 0, padding: 12, borderRight: '1px solid rgba(255,255,255,0.06)',
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
                    <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                            const meta = TYPE_META[item.type] ?? { icon: '📄', label: item.type, color: '#888' };
                            const isBusy = busy === item.id;
                            const userName = getUserName(item);
                            const title = getItemTitle(item);
                            const description = getItemDescription(item);
                            const photoUrl = getItemPhotoUrl(item);
                            const timeStr = formatDate(item.created_at || item.createdAt);

                            return (
                                <div key={item.id} style={{
                                    padding: 14, borderRadius: 14,
                                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${meta.color}15`,
                                    transition: 'border-color 0.2s',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                        {/* Type icon */}
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10,
                                            background: `${meta.color}15`, border: `1px solid ${meta.color}30`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 18, flexShrink: 0,
                                        }}>
                                            {meta.icon}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {/* Header row: type label + time */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <span style={{
                                                    fontSize: 9, padding: '2px 6px', borderRadius: 4,
                                                    background: `${meta.color}22`, color: meta.color, fontWeight: 600,
                                                }}>
                                                    {meta.label}
                                                </span>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
                                                    от {userName}
                                                </span>
                                                {timeStr && (
                                                    <span style={{ fontSize: 10, opacity: 0.35, marginLeft: 'auto' }}>{timeStr}</span>
                                                )}
                                            </div>

                                            {/* Title */}
                                            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 5, color: '#fff' }}>
                                                {title}
                                            </div>

                                            {/* Description */}
                                            {description && (
                                                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 3, lineHeight: 1.4 }}>
                                                    {description.slice(0, 150)}{description.length > 150 ? '…' : ''}
                                                </div>
                                            )}

                                            {/* Photo */}
                                            {photoUrl && (
                                                <img src={photoUrl} alt="" style={{ marginTop: 6, maxWidth: 140, maxHeight: 90, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)' }} />
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                                            <button type="button" className="btn-secondary" disabled={isBusy}
                                                title="Одобрить"
                                                style={{ padding: '8px 14px', fontSize: 12, color: '#22c55e', borderRadius: 8 }}
                                                onClick={() => void handleAction(item.id, item.type, 'approve')}>
                                                ✅
                                            </button>
                                            <button type="button" className="btn-secondary" disabled={isBusy}
                                                title="Отклонить"
                                                style={{ padding: '8px 14px', fontSize: 12, color: '#ef4444', borderRadius: 8 }}
                                                onClick={() => setRejectTarget(rejectTarget === item.id ? null : item.id)}>
                                                ❌
                                            </button>
                                        </div>
                                    </div>

                                    {/* Reject comment */}
                                    {rejectTarget === item.id && (
                                        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                                            <input type="text" value={rejectComment} onChange={e => setRejectComment(e.target.value)}
                                                placeholder="Причина отклонения (обязательно)"
                                                style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 11 }} />
                                            <button type="button" className="btn-secondary" disabled={isBusy || !rejectComment.trim()}
                                                style={{ padding: '6px 10px', fontSize: 11, color: '#ef4444' }}
                                                onClick={() => void handleAction(item.id, item.type, 'reject', rejectComment.trim())}>
                                                Отклонить
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── TAB: Code Generation ── */}
            {adminTab === 'codes' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520, margin: '0 auto', width: '100%' }}>
                    <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                            🔑 Генерация кода на роль
                        </h3>
                        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                            Сгенерируйте одноразовый код и отправьте его получателю в Телеграм.
                        </p>
                    </div>

                    {/* Role pills */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Выберите роль:</span>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {ROLE_OPTIONS.map(r => (
                                <button
                                    key={r.value}
                                    type="button"
                                    style={pillStyle(codeRole === r.value, '#8b5cf6')}
                                    onClick={() => setCodeRole(r.value)}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate button */}
                    <button
                        type="button"
                        disabled={!codeRole || codeBusy}
                        onClick={() => void handleGenerateCode()}
                        style={{
                            padding: '12px 20px',
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#fff',
                            background: codeRole ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(255,255,255,0.06)',
                            border: 'none',
                            borderRadius: 12,
                            cursor: codeRole ? 'pointer' : 'not-allowed',
                            opacity: codeBusy ? 0.6 : 1,
                            transition: 'opacity 0.2s',
                        }}
                    >
                        {codeBusy ? '⏳ Генерация...' : '🔑 Сгенерировать код'}
                    </button>

                    {/* Error */}
                    {codeError && (
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 13, color: '#ef4444' }}>
                            {codeError}
                        </div>
                    )}

                    {/* Result card */}
                    {codeResult && (
                        <div style={{
                            padding: 20, borderRadius: 16,
                            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
                            display: 'flex', flexDirection: 'column', gap: 12,
                        }}>
                            {/* Code display */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                    flex: 1, fontSize: 24, fontWeight: 800, letterSpacing: '0.08em',
                                    color: '#fff', fontFamily: 'monospace',
                                }}>
                                    {codeResult.code}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => void handleCopyCode()}
                                    style={{
                                        padding: '8px 12px', fontSize: 12, fontWeight: 600,
                                        border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8,
                                        background: codeCopied ? 'rgba(34,197,94,0.15)' : 'rgba(139,92,246,0.15)',
                                        color: codeCopied ? '#22c55e' : '#8b5cf6',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                >
                                    {codeCopied ? '✅ Скопировано' : '📋 Копировать'}
                                </button>
                            </div>

                            {/* Meta */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                                    Роль: <strong style={{ color: '#8b5cf6' }}>{ROLE_OPTIONS.find(r => r.value === codeResult.role)?.label || codeResult.role}</strong>
                                </span>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                                    Действует до: <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{new Date(codeResult.expiresAt).toLocaleDateString('ru-RU')}</strong>
                                </span>
                            </div>

                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                                Код одноразовый, действует 7 дней. Отправь код в Телеграм получателю.
                            </div>
                        </div>
                    )}
                </div>
            )}

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
