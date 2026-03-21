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
    embedded?: boolean;
    role?: string;
}

type AdminTab = 'inbox' | 'codes';

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

const TYPE_META: Record<string, { letter: string; label: string; color: string }> = {
    badge_request: { letter: 'З', label: 'Значки', color: '#F59E0B' },
    council_initiative: { letter: 'И', label: 'Инициативы', color: '#3B82F6' },
    badge_art: { letter: 'А', label: 'Арты', color: '#A855F7' },
    engine_approve: { letter: 'Д', label: 'Движки', color: '#22C55E' },
    inspector_task: { letter: 'И', label: 'Инспектор', color: '#06B6D4' },
    role_request: { letter: 'Р', label: 'Роли', color: '#8B5CF6' },
    bro_submission: { letter: 'Б', label: 'БРО', color: '#F97316' },
    badge_plan: { letter: 'П', label: 'Планы', color: '#14B8A6' },
    vozhatifikator_proof: { letter: 'В', label: 'Вожатификатор', color: '#EC4899' },
};

const ALL_TYPES = Object.keys(TYPE_META);

const ROLE_OPTIONS = [
    { value: 'participant', label: 'Участник' },
    { value: 'counselor', label: 'Вожатый' },
    { value: 'educator', label: 'Педагог' },
    { value: 'shift_leader', label: 'Ст. вожатый' },
    { value: 'camp_director', label: 'Нач. лагеря' },
    { value: 'parent', label: 'Родитель' },
];

// ---------------------------------------------------------------------------
// Font stack
// ---------------------------------------------------------------------------

const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

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
        if (diff < 3600_000) return `${Math.floor(diff / 60_000)} мин.`;
        if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} ч.`;
        const days = Math.floor(diff / 86400_000);
        if (days < 7) return `${days} дн.`;
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch { return ''; }
}

function humanizeId(id: string): string {
    if (!id) return '';
    return id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getUserName(item: RawInboxItem): string {
    const user = item.user || {};
    const data = item.data || {};
    // Try nickname from user, then from data (badge requests store it differently)
    const nick = user.nickname || (data.nickname as string) || (data.requested_by_nickname as string);
    if (nick) return nick;
    // Fallback: show generic role label instead of raw device ID
    return 'Участник';
}

const ROLE_LABELS_RU: Record<string, string> = {
    counselor: 'Вожатый',
    educator: 'Педагог',
    shift_leader: 'Ст. вожатый',
    camp_director: 'Нач. лагеря',
    developer: 'Dev',
    participant: 'Участник',
};

function getUserRole(item: RawInboxItem): string | null {
    const data = item.data || {};
    const role = (data.userRole as string) || null;
    if (!role || role === 'traveler') return null;
    return ROLE_LABELS_RU[role] || role;
}

function getItemTitle(item: RawInboxItem): string {
    const data = item.data || {};
    switch (item.type) {
        case 'badge_request': {
            const ev = (data.evidence || data) as Record<string, unknown>;
            if (ev.source === 'inspector') {
                const mTitle = (ev.missionTitle as string) || '';
                const mDay = ev.missionDay as number;
                return `🔍 Инспектор · ${mTitle || (mDay ? `Миссия ${mDay}` : 'Миссия')}`;
            }
            return (data.badge_name as string) || humanizeId(data.badge_id as string) || 'Заявка на значок';
        }
        case 'council_initiative': {
            const ciTitle = (data.title as string) || 'Инициатива совета';
            if (data.sourceType === 'ode') return `🎯 ${ciTitle.replace(/^\[ОДэ\]\s*/, '')}`;
            return ciTitle;
        }
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
        case 'bro_submission':
            return (data.task_title as string) || `БРО: ${humanizeId(data.task_id as string)}` || 'БРО-задание';
        case 'badge_plan': {
            const bid = (data.badge_id as string) || '';
            return `План: ${bid ? humanizeId(bid) : 'значок'}`;
        }
        case 'vozhatifikator_proof': {
            const pts = (data.totalPoints as number) || 0;
            const lvl = (data.level as string) || '';
            return `Путеводные огни: ${pts} б. — ${lvl}`;
        }
        default:
            return item.type;
    }
}

function getItemDescription(item: RawInboxItem): string {
    const data = item.data || {};
    switch (item.type) {
        case 'badge_request': {
            // Show evidence details if available
            const ev = (data.evidence || data) as Record<string, unknown>;
            if (ev.source === 'inspector') {
                const parts: string[] = [];
                if (typeof ev.durationMs === 'number') {
                    const mins = Math.floor((ev.durationMs as number) / 60000);
                    const secs = Math.floor(((ev.durationMs as number) % 60000) / 1000);
                    parts.push(`⏱ ${mins} мин ${secs} сек`);
                }
                if (Array.isArray(ev.completedTasks)) {
                    parts.push(`✅ ${ev.completedTasks.length} заданий`);
                }
                if (typeof ev.reflection === 'string' && ev.reflection.trim()) {
                    const refl = ev.reflection.trim();
                    parts.push(`📝 «${refl.slice(0, 80)}${refl.length > 80 ? '…' : ''}»`);
                }
                return parts.length > 0 ? parts.join(' · ') : 'Ожидает проверки вожатого';
            }
            const parts: string[] = [];
            if (typeof ev.reflection === 'string' && ev.reflection.trim()) parts.push(ev.reflection.trim());
            if (typeof ev.impact === 'string' && ev.impact.trim()) parts.push(ev.impact.trim());
            if (typeof ev.link === 'string' && ev.link.trim()) parts.push(`Ссылка: ${ev.link.trim()}`);
            return parts.length > 0 ? parts.join(' · ') : 'Ожидает проверки';
        }
        case 'council_initiative': {
            const ciDesc = (data.description as string) || '';
            if (data.sourceType === 'ode' && ciDesc) {
                // Extract key ODE metadata from the structured description
                const lines = ciDesc.split('\n');
                const meta: string[] = [];
                for (const line of lines) {
                    if (line.startsWith('Длительность:') || line.startsWith('Аудитория:') || line.startsWith('Масштаб:')) {
                        meta.push(line.trim());
                    }
                }
                return meta.length > 0 ? `🎯 ОДэ · ${meta.join(' · ')}` : 'Отрядное дело из конструктора';
            }
            return ciDesc || 'Предложение в совет лагеря';
        }
        case 'badge_art': {
            const source = (data.source as string) || '';
            return source ? `Источник: ${source}` : 'Ожидает модерации';
        }
        case 'engine_approve':
            return 'Ожидает модерации';
        case 'inspector_task':
            return 'Задание выполнено, ожидает подтверждения';
        case 'role_request':
            return (data.comment as string) || 'Ожидает одобрения';
        case 'bro_submission': {
            const txt = (data.text as string) || '';
            return txt ? txt.slice(0, 150) + (txt.length > 150 ? '…' : '') : 'Ожидает проверки';
        }
        case 'badge_plan': {
            const pt = (data.plan_text as string) || '';
            return pt ? pt.slice(0, 150) + (pt.length > 150 ? '…' : '') : 'План на утверждении';
        }
        case 'vozhatifikator_proof': {
            const count = Array.isArray(data.completedIds) ? data.completedIds.length : 0;
            return `Отмечено пунктов: ${count}. Ожидает подтверждения вожатого.`;
        }
        default:
            return '';
    }
}

function getItemPhotos(item: RawInboxItem): string[] {
    const data = item.data || {};
    if (item.type === 'badge_art') {
        const url = (data.image_url as string) || null;
        if (url && !url.startsWith('https://example.com')) return [url];
        return [];
    }
    if (item.type === 'badge_request') {
        // Check evidence.photos (base64 data URLs)
        const ev = (data.evidence || data) as Record<string, unknown>;
        if (Array.isArray(ev.photos) && ev.photos.length > 0) return ev.photos as string[];
        // Legacy: check attachments
        const attachments = data.attachments;
        if (Array.isArray(attachments) && attachments.length > 0) return attachments;
    }
    if (item.type === 'bro_submission') {
        const photoUrl = (data.photo_url as string) || (data.photoUrl as string) || null;
        if (photoUrl) return [photoUrl];
    }
    if (item.type === 'vozhatifikator_proof') {
        if (Array.isArray(data.photos) && data.photos.length > 0) return data.photos as string[];
    }
    return [];
}

function getItemPhotoUrl(item: RawInboxItem): string | null {
    const photos = getItemPhotos(item);
    return photos.length > 0 ? photos[0] : null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ accessToken, onClose, embedded, role: userRole }) => {
    const isDeveloper = userRole === 'developer';
    const [adminTab, setAdminTab] = useState<AdminTab>('inbox');

    // Inbox state
    const [items, setItems] = useState<RawInboxItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<string | null>(null);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);
    const [rejectComment, setRejectComment] = useState('');
    const [toast, setToast] = useState<string | null>(null);

    // Code generation state
    const [codeRole, setCodeRole] = useState('');
    const [codeBusy, setCodeBusy] = useState(false);
    const [codeResult, setCodeResult] = useState<{ code: string; role: string; expiresAt: string } | null>(null);
    const [codeError, setCodeError] = useState<string | null>(null);
    const [codeCopied, setCodeCopied] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Always fetch ALL items so tab counts stay accurate
            const data = await fetchInbox(undefined);
            setItems(data as unknown as RawInboxItem[]);
        } catch { setItems([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const pendingItems = useMemo(() => items.filter(i => i.status === 'pending' || i.status === 'done_pending'), [items]);

    // Client-side filtering — keeps all items in state for accurate tab counts
    const displayItems = useMemo(() => {
        if (!filter) return pendingItems;
        return pendingItems.filter(i => i.type === filter);
    }, [pendingItems, filter]);

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
            setToast(action === 'approve' ? 'Одобрено' : 'Отклонено');
            setRejectTarget(null);
            setRejectComment('');
            setTimeout(() => setToast(null), 2500);
        } catch { /* silent */ }
        finally { setBusy(null); }
    }, [accessToken]);

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
        } finally { setCodeBusy(false); }
    }, [accessToken, codeRole]);

    const handleCopyCode = useCallback(async () => {
        if (!codeResult?.code) return;
        try {
            await navigator.clipboard.writeText(codeResult.code);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2500);
        } catch { /* fallback */ }
    }, [codeResult]);

    // ── Render ──

    return (
        <div style={{
            ...(embedded ? { width: '100%', height: '100%', minHeight: 400 } : { position: 'fixed' as const, inset: 0, zIndex: 900 }),
            background: '#f5f5f7',
            display: 'flex', flexDirection: 'column' as const,
            fontFamily: FONT,
            color: '#1a1a2e',
        }}>
            {/* ═══ Top bar ═══ */}
            <div style={{
                height: 56, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 0,
                padding: '0 20px',
                background: '#fff',
                borderBottom: '1px solid #e8e8ed',
            }}>
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: '#1a1a2e' }}>
                    Пульт управления
                </span>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, marginLeft: 24 }}>
                    {([
                        { id: 'inbox' as AdminTab, label: 'Входящие', count: totalPending },
                        ...(isDeveloper ? [{ id: 'codes' as AdminTab, label: 'Коды на роли', count: 0 }] : []),
                    ]).map(tab => (
                        <button key={tab.id} type="button" onClick={() => setAdminTab(tab.id)}
                            style={{
                                padding: '8px 16px', fontSize: 13, fontWeight: 500,
                                border: 'none', cursor: 'pointer',
                                borderRadius: 8, fontFamily: FONT,
                                background: adminTab === tab.id ? '#f0f0f5' : 'transparent',
                                color: adminTab === tab.id ? '#1a1a2e' : '#888',
                                transition: 'all 0.15s',
                            }}>
                            {tab.label}
                            {tab.count > 0 && (
                                <span style={{
                                    marginLeft: 6, fontSize: 11, fontWeight: 600,
                                    padding: '1px 6px', borderRadius: 10,
                                    background: '#ef4444', color: '#fff',
                                }}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1 }} />

                {adminTab === 'inbox' && (
                    <button type="button" onClick={() => void load()} disabled={loading}
                        style={{
                            padding: '6px 14px', fontSize: 12, fontWeight: 500,
                            border: '1px solid #e0e0e0', borderRadius: 8,
                            background: '#fff', color: '#666', cursor: 'pointer',
                            fontFamily: FONT, opacity: loading ? 0.5 : 1,
                        }}>
                        Обновить
                    </button>
                )}

                {onClose && (
                    <button type="button" onClick={onClose}
                        style={{
                            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', borderRadius: 8, background: 'transparent',
                            color: '#999', cursor: 'pointer', fontSize: 18, marginLeft: 8,
                        }}>
                        ×
                    </button>
                )}
            </div>

            {/* ═══ TAB: Inbox ═══ */}
            {adminTab === 'inbox' && (
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Sidebar */}
                    <div style={{
                        width: 200, flexShrink: 0, padding: '12px 8px',
                        background: '#fff', borderRight: '1px solid #e8e8ed',
                        display: 'flex', flexDirection: 'column', gap: 2,
                        overflowY: 'auto',
                    }}>
                        <SidebarItem
                            label="Все" count={totalPending} active={!filter}
                            color="#1a1a2e" onClick={() => setFilter(null)}
                        />
                        {ALL_TYPES.map(t => {
                            const meta = TYPE_META[t];
                            const count = typeCounts.get(t) ?? 0;
                            return (
                                <SidebarItem
                                    key={t} label={meta.label} count={count}
                                    active={filter === t} color={meta.color}
                                    onClick={() => setFilter(t)}
                                />
                            );
                        })}
                    </div>

                    {/* Main area */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '16px 20px',
                        display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                        {/* Loading */}
                        {loading && pendingItems.length === 0 && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                                <div style={{
                                    width: 28, height: 28,
                                    border: '3px solid #e8e8ed', borderTopColor: '#1a1a2e',
                                    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                                }} />
                            </div>
                        )}

                        {/* Empty state */}
                        {!loading && pendingItems.length === 0 && (
                            <div style={{ padding: 60, textAlign: 'center' }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    background: '#f0f0f5', margin: '0 auto 12px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 20, color: '#bbb',
                                }}>✓</div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>Нет ожидающих запросов</div>
                                <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>Всё обработано</div>
                            </div>
                        )}

                        {/* Items */}
                        {displayItems.map(item => (
                            <InboxCard
                                key={item.id}
                                item={item}
                                isBusy={busy === item.id}
                                isRejectOpen={rejectTarget === item.id}
                                isExpanded={expandedItem === item.id}
                                rejectComment={rejectComment}
                                onApprove={() => void handleAction(item.id, item.type, 'approve')}
                                onToggleReject={() => {
                                    setRejectTarget(rejectTarget === item.id ? null : item.id);
                                    setRejectComment('');
                                }}
                                onRejectCommentChange={setRejectComment}
                                onReject={() => void handleAction(item.id, item.type, 'reject', rejectComment.trim())}
                                onToggleExpand={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ TAB: Code Generation ═══ */}
            {adminTab === 'codes' && (
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '32px 20px',
                    display: 'flex', flexDirection: 'column', gap: 24,
                    maxWidth: 480, margin: '0 auto', width: '100%',
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>
                            Генерация кода
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888', lineHeight: 1.5 }}>
                            Создайте одноразовый код и отправьте получателю.
                        </p>
                    </div>

                    {/* Role selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Роль
                        </span>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {ROLE_OPTIONS.map(r => (
                                <button key={r.value} type="button"
                                    onClick={() => setCodeRole(r.value)}
                                    style={{
                                        padding: '8px 14px', fontSize: 13, fontWeight: 500,
                                        border: codeRole === r.value ? '2px solid #1a1a2e' : '1px solid #e0e0e0',
                                        borderRadius: 10,
                                        background: codeRole === r.value ? '#1a1a2e' : '#fff',
                                        color: codeRole === r.value ? '#fff' : '#444',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                        fontFamily: FONT,
                                    }}>
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate button */}
                    <button type="button" disabled={!codeRole || codeBusy}
                        onClick={() => void handleGenerateCode()}
                        style={{
                            padding: '14px 24px', fontSize: 14, fontWeight: 600,
                            color: '#fff', fontFamily: FONT,
                            background: codeRole ? '#1a1a2e' : '#ccc',
                            border: 'none', borderRadius: 12,
                            cursor: codeRole ? 'pointer' : 'not-allowed',
                            opacity: codeBusy ? 0.6 : 1, transition: 'all 0.2s',
                        }}>
                        {codeBusy ? 'Генерация...' : 'Сгенерировать код'}
                    </button>

                    {/* Error */}
                    {codeError && (
                        <div style={{
                            padding: '12px 16px', borderRadius: 12,
                            background: '#fef2f2', border: '1px solid #fecaca',
                            fontSize: 13, color: '#dc2626',
                        }}>
                            {codeError}
                        </div>
                    )}

                    {/* Result card */}
                    {codeResult && (
                        <div style={{
                            padding: 24, borderRadius: 16,
                            background: '#fff', border: '1px solid #e8e8ed',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{
                                    flex: 1, fontSize: 28, fontWeight: 800, letterSpacing: '0.06em',
                                    color: '#1a1a2e', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                }}>
                                    {codeResult.code}
                                </span>
                                <button type="button" onClick={() => void handleCopyCode()}
                                    style={{
                                        padding: '8px 16px', fontSize: 12, fontWeight: 600,
                                        border: '1px solid #e0e0e0', borderRadius: 8,
                                        background: codeCopied ? '#f0fdf4' : '#fff',
                                        color: codeCopied ? '#16a34a' : '#444',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        fontFamily: FONT,
                                    }}>
                                    {codeCopied ? 'Скопировано' : 'Копировать'}
                                </button>
                            </div>

                            <div style={{ marginTop: 16, display: 'flex', gap: 24 }}>
                                <div>
                                    <div style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>Роль</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginTop: 2 }}>
                                        {ROLE_OPTIONS.find(r => r.value === codeResult.role)?.label || codeResult.role}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>Действует до</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginTop: 2 }}>
                                        {new Date(codeResult.expiresAt).toLocaleDateString('ru-RU')}
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                marginTop: 16, paddingTop: 12,
                                borderTop: '1px solid #f0f0f0',
                                fontSize: 12, color: '#999',
                            }}>
                                Одноразовый, 7 дней. Отправьте получателю.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
                    padding: '10px 20px', borderRadius: 10,
                    background: '#1a1a2e', color: '#fff',
                    fontSize: 13, fontWeight: 500, fontFamily: FONT,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}>
                    {toast}
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SidebarItem: React.FC<{
    label: string; count: number; active: boolean; color: string; onClick: () => void;
}> = ({ label, count, active, onClick }) => (
    <button type="button" onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8,
            border: 'none', cursor: 'pointer',
            background: active ? '#f0f0f5' : 'transparent',
            fontFamily: FONT, textAlign: 'left', width: '100%',
            transition: 'background 0.15s',
        }}>
        <span style={{
            fontSize: 13, fontWeight: active ? 600 : 400,
            color: active ? '#1a1a2e' : '#666', flex: 1,
        }}>
            {label}
        </span>
        <span style={{
            fontSize: 11, fontWeight: 500,
            color: count > 0 ? '#666' : '#ccc',
            minWidth: 20, textAlign: 'right',
        }}>
            {count}
        </span>
    </button>
);

const InboxCard: React.FC<{
    item: RawInboxItem;
    isBusy: boolean;
    isRejectOpen: boolean;
    isExpanded: boolean;
    rejectComment: string;
    onApprove: () => void;
    onToggleReject: () => void;
    onRejectCommentChange: (v: string) => void;
    onReject: () => void;
    onToggleExpand: () => void;
}> = ({ item, isBusy, isRejectOpen, isExpanded, rejectComment, onApprove, onToggleReject, onRejectCommentChange, onReject, onToggleExpand }) => {
    const meta = TYPE_META[item.type] ?? { letter: '?', label: item.type, color: '#888' };
    const userName = getUserName(item);
    const userRoleLabel = getUserRole(item);
    const title = getItemTitle(item);
    const description = getItemDescription(item);
    const photoUrl = getItemPhotoUrl(item);
    const allPhotos = getItemPhotos(item);
    const timeStr = formatDate(item.created_at || item.createdAt);

    // Evidence data for expanded view
    const data = item.data || {};
    const ev = ((data.evidence || data) as Record<string, unknown>);

    return (
        <div style={{
            padding: '14px 16px', borderRadius: 12,
            background: '#fff', border: `1px solid ${isExpanded ? meta.color + '44' : '#e8e8ed'}`,
            transition: 'box-shadow 0.15s, border-color 0.15s',
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Type indicator */}
                <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${meta.color}12`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: meta.color,
                    fontFamily: FONT,
                }}>
                    {meta.letter}
                </div>

                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onToggleExpand}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 7px',
                            borderRadius: 5, background: `${meta.color}12`, color: meta.color,
                            letterSpacing: '0.02em',
                        }}>
                            {meta.label}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#888' }}>
                            {userName}
                        </span>
                        {userRoleLabel && (
                            <span style={{
                                fontSize: 10, fontWeight: 600, padding: '1px 6px',
                                borderRadius: 5, background: '#f0f0f5', color: '#666',
                                letterSpacing: '0.02em',
                            }}>
                                {userRoleLabel}
                            </span>
                        )}
                        {timeStr && (
                            <span style={{ fontSize: 11, color: '#bbb', marginLeft: 'auto' }}>{timeStr}</span>
                        )}
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: '#1a1a2e', lineHeight: 1.35 }}>
                        {title}
                        <span style={{ fontSize: 10, color: '#bbb', marginLeft: 8 }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {/* Description (collapsed: truncated, expanded: hidden since shown below) */}
                    {!isExpanded && description && (
                        <div style={{ fontSize: 12, color: '#888', marginTop: 3, lineHeight: 1.4 }}>
                            {description.slice(0, 150)}{description.length > 150 ? '…' : ''}
                        </div>
                    )}

                    {/* Photo thumbnail (collapsed only) */}
                    {!isExpanded && photoUrl && (
                        <img src={photoUrl} alt="" style={{
                            marginTop: 8, maxWidth: 160, maxHeight: 100,
                            borderRadius: 8, objectFit: 'cover', border: '1px solid #e8e8ed',
                        }} />
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
                    <button type="button" disabled={isBusy} title="Одобрить"
                        onClick={onApprove}
                        style={{
                            padding: '8px 14px', fontSize: 12, fontWeight: 600,
                            border: '1px solid #d1fae5', borderRadius: 8,
                            background: '#f0fdf4', color: '#16a34a',
                            cursor: 'pointer', fontFamily: FONT,
                            transition: 'all 0.15s',
                        }}>
                        Да
                    </button>
                    <button type="button" disabled={isBusy} title="Отклонить"
                        onClick={onToggleReject}
                        style={{
                            padding: '8px 14px', fontSize: 12, fontWeight: 600,
                            border: '1px solid #fecaca', borderRadius: 8,
                            background: isRejectOpen ? '#fef2f2' : '#fff', color: '#dc2626',
                            cursor: 'pointer', fontFamily: FONT,
                            transition: 'all 0.15s',
                        }}>
                        Нет
                    </button>
                </div>
            </div>

            {/* ── Expanded evidence panel ── */}
            {isExpanded && (
                <div style={{
                    marginTop: 12, paddingTop: 12,
                    borderTop: '1px solid #f0f0f0',
                    display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                    {typeof ev.reflection === 'string' && ev.reflection.trim() && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Чему научился(лась)</div>
                            <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{ev.reflection as string}</div>
                        </div>
                    )}
                    {typeof ev.impact === 'string' && ev.impact.trim() && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Реальный вклад</div>
                            <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{ev.impact as string}</div>
                        </div>
                    )}
                    {typeof ev.link === 'string' && ev.link.trim() && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Ссылка</div>
                            <a href={ev.link as string} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 13, color: '#3B82F6', wordBreak: 'break-all' }}>{ev.link as string}</a>
                        </div>
                    )}
                    {/* Photos */}
                    {allPhotos.length > 0 && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Фото ({allPhotos.length})</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {allPhotos.map((url, i) => (
                                    <img key={i} src={url} alt={`Фото ${i + 1}`} style={{
                                        maxWidth: 200, maxHeight: 200, borderRadius: 10,
                                        objectFit: 'cover', border: '1px solid #e8e8ed',
                                        cursor: 'pointer',
                                    }} onClick={() => window.open(url, '_blank')} />
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Show badge_plan specific fields */}
                    {item.type === 'badge_plan' && typeof (data.plan_text as string) === 'string' && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>План</div>
                            <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{data.plan_text as string}</div>
                        </div>
                    )}
                    {item.type === 'bro_submission' && typeof (data.text as string) === 'string' && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Ответ</div>
                            <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{data.text as string}</div>
                        </div>
                    )}
                    {/* Inspector-specific stats */}
                    {item.type === 'badge_request' && ev.source === 'inspector' && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Инспектор Пользы</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {typeof ev.missionDay === 'number' && (
                                    <span style={{ padding: '4px 10px', borderRadius: 6, background: '#f0f0f5', fontSize: 12, fontWeight: 600, color: '#666' }}>
                                        Миссия {ev.missionDay as number}
                                    </span>
                                )}
                                {typeof ev.durationMs === 'number' && (
                                    <span style={{ padding: '4px 10px', borderRadius: 6, background: '#e0f2fe', fontSize: 12, fontWeight: 600, color: '#0284c7' }}>
                                        ⏱ {Math.floor((ev.durationMs as number) / 60000)} мин {Math.floor(((ev.durationMs as number) % 60000) / 1000)} сек
                                    </span>
                                )}
                                {Array.isArray(ev.completedTasks) && (
                                    <span style={{ padding: '4px 10px', borderRadius: 6, background: '#f0fdf4', fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
                                        ✅ {ev.completedTasks.length} заданий
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                    {/* Empty evidence notice */}
                    {!ev.reflection && !ev.impact && !ev.link && allPhotos.length === 0 && !data.plan_text && !data.text && ev.source !== 'inspector' && (
                        <div style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>Доказательства не приложены</div>
                    )}
                </div>
            )}

            {/* Reject input */}
            {isRejectOpen && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <input type="text" value={rejectComment} onChange={e => onRejectCommentChange(e.target.value)}
                        placeholder="Причина отклонения"
                        style={{
                            flex: 1, padding: '8px 12px', borderRadius: 8,
                            border: '1px solid #e0e0e0', background: '#fafafa',
                            color: '#1a1a2e', fontSize: 12, fontFamily: FONT,
                            outline: 'none',
                        }} />
                    <button type="button" disabled={isBusy || !rejectComment.trim()}
                        onClick={onReject}
                        style={{
                            padding: '8px 14px', fontSize: 12, fontWeight: 600,
                            border: 'none', borderRadius: 8,
                            background: rejectComment.trim() ? '#dc2626' : '#e5e5e5',
                            color: rejectComment.trim() ? '#fff' : '#999',
                            cursor: rejectComment.trim() ? 'pointer' : 'default',
                            fontFamily: FONT, transition: 'all 0.15s',
                        }}>
                        Отклонить
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
