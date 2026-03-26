import React, { useCallback, useEffect, useState } from 'react';
import { fetchAllRoleRequests, approveRoleRequest, rejectRoleRequest } from '../utils/roleRequestAdminApi';
import type { RoleRequestAdmin } from '../utils/roleRequestAdminApi';
import { ROLE_LABELS } from '../types/authRole';
import type { UserRole } from '../types/authRole';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RoleRequestsAdminPanelProps {
    accessToken: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RoleRequestsAdminPanel: React.FC<RoleRequestsAdminPanelProps> = ({ accessToken }) => {
    const [requests, setRequests] = useState<RoleRequestAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionBusy, setActionBusy] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAllRoleRequests(accessToken);
            // Sort: pending first, then by date desc
            data.sort((a, b) => {
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (a.status !== 'pending' && b.status === 'pending') return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setRequests(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ошибка загрузки');
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => { void loadRequests(); }, [loadRequests]);

    const handleApprove = useCallback(async (id: string) => {
        setActionBusy(id);
        try {
            const result = await approveRoleRequest(accessToken, id);
            // Update local state
            setRequests(prev => prev.map(r =>
                r.id === id
                    ? {
                        ...r,
                        ...result.request,
                        roleCode: result.roleCode || result.request.roleCode,
                        accessToken: result.accessToken || result.request.accessToken,
                        emailDelivery: result.emailDelivery || result.request.emailDelivery,
                    }
                    : r
            ));
            if (result.roleCode) {
                setCopiedCode(result.roleCode);
                try { await navigator.clipboard.writeText(result.roleCode); } catch { /* */ }
                setTimeout(() => setCopiedCode(null), 5000);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ошибка');
        } finally {
            setActionBusy(null);
        }
    }, [accessToken]);

    const handleReject = useCallback(async (id: string) => {
        setActionBusy(id);
        try {
            const result = await rejectRoleRequest(accessToken, id);
            setRequests(prev => prev.map(r =>
                r.id === id ? { ...r, ...result.request } : r
            ));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ошибка');
        } finally {
            setActionBusy(null);
        }
    }, [accessToken]);

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    const statusColors = {
        pending: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Ожидает' },
        approved: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Одобрено' },
        rejected: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'Отклонено' },
    };

    const formatDate = (iso: string) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        } catch { return iso; }
    };

    return (
        <div style={{ marginBottom: 24 }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 12,
            }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                    Заявки на роли
                </span>
                {pendingCount > 0 && (
                    <span style={{
                        padding: '2px 8px', borderRadius: 10,
                        background: 'rgba(245,158,11,0.2)', color: '#f59e0b',
                        fontSize: 11, fontWeight: 600,
                    }}>
                        {pendingCount}
                    </span>
                )}
                <button
                    type="button"
                    onClick={() => void loadRequests()}
                    style={{
                        marginLeft: 'auto', background: 'none', border: 'none',
                        color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer',
                    }}
                >
                    Обновить
                </button>
            </div>

            {/* Copied code toast */}
            {copiedCode && (
                <div style={{
                    padding: '8px 12px', borderRadius: 8, marginBottom: 8,
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                    fontSize: 12, color: '#22c55e',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <span>Код скопирован:</span>
                    <code style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>{copiedCode}</code>
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{
                    padding: '8px 12px', borderRadius: 8, marginBottom: 8,
                    background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 12,
                }}>
                    {error}
                    <button
                        type="button"
                        onClick={() => { setError(null); void loadRequests(); }}
                        style={{
                            marginLeft: 8, background: 'none', border: 'none',
                            color: '#ef4444', cursor: 'pointer', fontSize: 11, textDecoration: 'underline',
                        }}
                    >
                        Повторить
                    </button>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div style={{ textAlign: 'center', padding: 16, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                    Загрузка заявок…
                </div>
            )}

            {/* Empty state */}
            {!loading && requests.length === 0 && !error && (
                <div style={{
                    textAlign: 'center', padding: 20,
                    color: 'rgba(255,255,255,0.3)', fontSize: 13,
                }}>
                    Заявок пока нет
                </div>
            )}

            {/* Requests list */}
            {!loading && requests.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {requests.map(req => {
                        const st = statusColors[req.status] || statusColors.pending;
                        const roleLabel = ROLE_LABELS[req.desiredRole as UserRole] || req.desiredRole;
                        const isBusy = actionBusy === req.id;
                        return (
                            <div key={req.id} style={{
                                padding: '12px 14px', borderRadius: 12,
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                {/* Top row: name + status */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', flex: 1 }}>
                                        {req.name || '—'}
                                    </span>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: 6,
                                        background: st.bg, color: st.color,
                                        fontSize: 10, fontWeight: 600,
                                    }}>
                                        {st.label}
                                    </span>
                                </div>

                                {/* Details */}
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <div>Роль: <span style={{ color: '#f59e0b' }}>{roleLabel}</span></div>
                                    {req.email && <div>Email: {req.email}</div>}
                                    {req.comment && <div>Комментарий: {req.comment}</div>}
                                    <div>{formatDate(req.createdAt)}</div>
                                </div>

                                {/* Approved: show role code */}
                                {req.status === 'approved' && req.roleCode && (
                                    <div style={{
                                        marginTop: 8, padding: '6px 10px', borderRadius: 6,
                                        background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                                        fontSize: 11, color: '#22c55e',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                    }}>
                                        <span>Код:</span>
                                        <code style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>{req.roleCode}</code>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(req.roleCode!);
                                                    setCopiedCode(req.roleCode!);
                                                    setTimeout(() => setCopiedCode(null), 3000);
                                                } catch { /* */ }
                                            }}
                                            style={{
                                                marginLeft: 'auto', background: 'none', border: 'none',
                                                color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 10,
                                            }}
                                        >
                                            Копировать
                                        </button>
                                    </div>
                                )}
                                {req.status === 'approved' && req.emailDelivery && (
                                    <div style={{
                                        marginTop: 6, fontSize: 11,
                                        color: req.emailDelivery.sent ? '#22c55e' : '#f59e0b',
                                    }}>
                                        {req.emailDelivery.sent
                                            ? 'Email отправлен'
                                            : `Email не отправлен${req.emailDelivery.error ? `: ${req.emailDelivery.error}` : ''}`}
                                    </div>
                                )}

                                {/* Actions for pending */}
                                {req.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => void handleApprove(req.id)}
                                            style={{
                                                flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                                                background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                                                fontSize: 12, fontWeight: 600,
                                                cursor: isBusy ? 'wait' : 'pointer',
                                                opacity: isBusy ? 0.5 : 1,
                                            }}
                                        >
                                            {isBusy ? '…' : 'Одобрить'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => void handleReject(req.id)}
                                            style={{
                                                padding: '8px 12px', borderRadius: 8, border: 'none',
                                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                                fontSize: 12, fontWeight: 600,
                                                cursor: isBusy ? 'wait' : 'pointer',
                                                opacity: isBusy ? 0.5 : 1,
                                            }}
                                        >
                                            {isBusy ? '…' : 'Отклонить'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default RoleRequestsAdminPanel;
