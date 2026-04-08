import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { fireOn401 } from '../../../utils/authStorage';
import { ROLE_LABELS, type UserRole } from '../../../types/authRole';
import type { SquadMineResponse } from '../../../utils/badgeApprovalApi';

const DEFAULT_SHIFT_NAME = 'Реальный Лагерь 2026';

const Icons = {
  Close: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
};

interface OrganizerContainerProps {
  role: UserRole;
  accessToken: string | undefined;
  deviceId: string | undefined;
  canReadShiftsAndSquads: boolean;
  canManageShiftsAndSquads: boolean;
  canDeleteShiftsAndSquads: boolean;
  mySquadInfo: SquadMineResponse | null;
  squadJoinRequestBusyId: string | null;
  onRequestJoinSquad: (squad: { id: string; name: string }) => Promise<void>;
  onOpenSquadCornerFromOrganizer: () => void;
  onOpenSquadFromOrganizer: (squad: { id: string; name: string }) => Promise<void>;
  loadMySquadInfo: () => Promise<void>;
  showHint: (args: { title: string; content: string }) => void;
}

export const OrganizerContainer: React.FC<OrganizerContainerProps> = ({
  role,
  accessToken,
  deviceId,
  canReadShiftsAndSquads,
  canManageShiftsAndSquads,
  canDeleteShiftsAndSquads,
  mySquadInfo,
  squadJoinRequestBusyId,
  onRequestJoinSquad,
  onOpenSquadCornerFromOrganizer,
  onOpenSquadFromOrganizer,
  loadMySquadInfo,
  showHint,
}) => {
  const [organizerShifts, setOrganizerShifts] = useState<Array<{ id: string; name: string; startDate: string; endDate: string; createdAt: string; createdBy?: string }>>([]);
  const [organizerSquadsMap, setOrganizerSquadsMap] = useState<Record<string, Array<{ id: string; shiftId: string; name: string; createdAt: string; avatarUrl?: string | null }>>>({});
  const [organizerShiftFormOpen, setOrganizerShiftFormOpen] = useState(false);
  const [organizerShiftForm, setOrganizerShiftForm] = useState({ name: '', startDate: '', endDate: '' });
  const [organizerSquadFormOpen, setOrganizerSquadFormOpen] = useState(false);
  const [organizerSquadFormShiftId, setOrganizerSquadFormShiftId] = useState('');
  const [organizerSquadFormName, setOrganizerSquadFormName] = useState('');
  const [organizerCodeModalOpen, setOrganizerCodeModalOpen] = useState(false);
  const [organizerCodeForm, setOrganizerCodeForm] = useState({ deviceId: '', role: 'participant' as UserRole, shiftId: '' });
  const [organizerCodeResult, setOrganizerCodeResult] = useState<string | null>(null);
  const [organizerLoading, setOrganizerLoading] = useState(false);
  const [organizerError, setOrganizerError] = useState<string | null>(null);
  const [openingSquadId, setOpeningSquadId] = useState<string | null>(null);

  const organizerApiBase = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
    return useLocal ? '' : ((import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '')).replace(/\/$/, '');
  }, []);

  const canUseOrganizerApiForRead = canReadShiftsAndSquads && (Boolean(accessToken) || (organizerApiBase === '' && role === 'developer'));
  const canUseOrganizerApiForManage = canManageShiftsAndSquads && (Boolean(accessToken) || (organizerApiBase === '' && role === 'developer'));

  const getOrganizerHeaders = useCallback((withJson = false): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (withJson) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return headers;
  }, [accessToken]);

  const formatOrganizerHttpError = useCallback((status: number, payload: { error?: string; reason?: string }, context: string) => {
    const reasonText = payload?.reason ? ` (${payload.reason})` : '';
    if (status === 401) return 'Сессия истекла. Войдите снова.';
    if (status === 403) return `Недостаточно прав: ${context}.${reasonText}`;
    if (status === 500) return `${context}: ошибка сервера 500${reasonText}.`;
    return `${context}: ${payload?.error || `Ошибка ${status}`}${reasonText}`;
  }, []);

  const loadOrganizerData = useCallback(async () => {
    if (!canReadShiftsAndSquads) {
      setOrganizerShifts([]);
      setOrganizerSquadsMap({});
      setOrganizerError(null);
      return;
    }
    if (!canUseOrganizerApiForRead) {
      setOrganizerShifts([]);
      setOrganizerSquadsMap({});
      setOrganizerError('Войдите по коду, чтобы просматривать смены и отряды (или используйте локальный режим разработчика).');
      return;
    }
    setOrganizerLoading(true);
    setOrganizerError(null);
    try {
      const res = await fetch(`${organizerApiBase}/api/shifts`, { headers: getOrganizerHeaders() });
      if (res.status === 401) {
        setOrganizerError('Сессия истекла. Войдите снова.');
        fireOn401();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; reason?: string };
        setOrganizerError(formatOrganizerHttpError(res.status, data, 'Смены'));
        return;
      }
      const data = await res.json().catch(() => ({})) as { shifts?: Array<{ id: string; name: string; startDate: string; endDate: string; createdAt: string; createdBy?: string }> };
      const shifts = [...(data.shifts || [])];
      shifts.sort((a, b) => {
        const aDefault = (a.name || '').trim().toLowerCase() === DEFAULT_SHIFT_NAME.toLowerCase();
        const bDefault = (b.name || '').trim().toLowerCase() === DEFAULT_SHIFT_NAME.toLowerCase();
        if (aDefault && !bDefault) return -1;
        if (!aDefault && bDefault) return 1;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
      setOrganizerShifts(shifts);
      const map: Record<string, Array<{ id: string; shiftId: string; name: string; createdAt: string; avatarUrl?: string | null }>> = {};
      let partialError: string | null = null;
      for (const shift of shifts) {
        const r = await fetch(`${organizerApiBase}/api/shifts/${shift.id}/squads`, { headers: getOrganizerHeaders() });
        if (r.status === 401) {
          setOrganizerError('Сессия истекла. Войдите снова.');
          fireOn401();
          return;
        }
        if (!r.ok) {
          const payload = await r.json().catch(() => ({})) as { error?: string; reason?: string };
          if (!partialError) partialError = formatOrganizerHttpError(r.status, payload, `Отряды смены «${shift.name || shift.id}»`);
          map[shift.id] = [];
          continue;
        }
        const squadData = await r.json().catch(() => ({})) as { squads?: Array<{ id: string; shiftId: string; name: string; createdAt: string; avatarUrl?: string | null }> };
        map[shift.id] = squadData.squads || [];
      }
      setOrganizerSquadsMap(map);
      if (partialError) setOrganizerError(partialError);
    } catch (e) {
      const fallbackMessage = e instanceof Error ? e.message : 'Ошибка загрузки';
      const lower = fallbackMessage.toLowerCase();
      if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('fetch')) {
        setOrganizerError('Backend недоступен. Проверьте, что API запущен на http://localhost:4000 и dev proxy /api активен.');
      } else {
        setOrganizerError(fallbackMessage);
      }
      setOrganizerShifts([]);
      setOrganizerSquadsMap({});
    } finally {
      setOrganizerLoading(false);
    }
  }, [canReadShiftsAndSquads, canUseOrganizerApiForRead, organizerApiBase, getOrganizerHeaders, formatOrganizerHttpError]);

  useEffect(() => {
    void loadOrganizerData();
  }, [loadOrganizerData]);

  const removeShiftWithCleanup = useCallback(async (shift: { id: string; name: string }) => {
    if (!canDeleteShiftsAndSquads || organizerLoading) return;
    if ((shift.name || '').trim().toLowerCase() === DEFAULT_SHIFT_NAME.toLowerCase()) {
      setOrganizerError('Смену по умолчанию удалить нельзя.');
      return;
    }
    if (!window.confirm(`Удалить смену «${shift.name}» вместе со всеми отрядами и данными?`)) return;
    setOrganizerLoading(true);
    setOrganizerError(null);
    try {
      const res = await fetch(`${organizerApiBase}/api/shifts/${encodeURIComponent(shift.id)}`, {
        method: 'DELETE',
        headers: getOrganizerHeaders()
      });
      const data = await res.json().catch(() => ({})) as { error?: string; reason?: string };
      if (!res.ok) {
        if (res.status === 409 && data.reason === 'default_shift') {
          const message = 'Смену по умолчанию удалить нельзя.';
          setOrganizerError(message);
          showHint({ title: 'Удаление недоступно', content: message });
        } else {
          const message = formatOrganizerHttpError(res.status, data, 'Удаление смены');
          setOrganizerError(message);
          showHint({ title: 'Не удалось удалить смену', content: message });
        }
        return;
      }
      await Promise.all([loadOrganizerData(), loadMySquadInfo()]);
      showHint({ title: 'Готово', content: `Смена «${shift.name}» удалена.` });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось удалить смену.';
      setOrganizerError(message);
      showHint({ title: 'Ошибка удаления', content: message });
    } finally {
      setOrganizerLoading(false);
    }
  }, [canDeleteShiftsAndSquads, organizerLoading, organizerApiBase, getOrganizerHeaders, loadOrganizerData, loadMySquadInfo, showHint, formatOrganizerHttpError]);

  const removeSquadWithCleanup = useCallback(async (squadId: string) => {
    if (!canDeleteShiftsAndSquads || organizerLoading) return;
    if (!window.confirm('Удалить отряд и связанные данные?')) return;
    setOrganizerLoading(true);
    setOrganizerError(null);
    try {
      const res = await fetch(`${organizerApiBase}/api/squads/${encodeURIComponent(squadId)}`, {
        method: 'DELETE',
        headers: getOrganizerHeaders()
      });
      const data = await res.json().catch(() => ({})) as { error?: string; reason?: string };
      if (!res.ok) {
        const message = formatOrganizerHttpError(res.status, data, 'Удаление отряда');
        setOrganizerError(message);
        showHint({ title: 'Не удалось удалить отряд', content: message });
        return;
      }
      await Promise.all([loadOrganizerData(), loadMySquadInfo()]);
      showHint({ title: 'Готово', content: 'Отряд удалён.' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось удалить отряд.';
      setOrganizerError(message);
      showHint({ title: 'Ошибка удаления', content: message });
    } finally {
      setOrganizerLoading(false);
    }
  }, [canDeleteShiftsAndSquads, organizerLoading, organizerApiBase, getOrganizerHeaders, loadOrganizerData, loadMySquadInfo, showHint, formatOrganizerHttpError]);

  const handleOpenSquadClick = async (squad: { id: string; name: string }) => {
    setOpeningSquadId(squad.id);
    setOrganizerError(null);
    try {
      await onOpenSquadFromOrganizer(squad);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось открыть кабинет отряда.';
      setOrganizerError(message);
      showHint({ title: 'Ошибка открытия кабинета', content: message });
    } finally {
      setOpeningSquadId(null);
    }
  };

  const renderOrganizerModals = () => {
    if (typeof document === 'undefined') return null;
    if (!organizerShiftFormOpen && !organizerSquadFormOpen && !organizerCodeModalOpen) return null;
    return createPortal(
      <div className="profile-organizer-modals-root" aria-live="polite">
        {organizerShiftFormOpen && (
          <div className="profile-utility-panel-overlay profile-utility-panel-overlay--organizer" onClick={() => setOrganizerShiftFormOpen(false)} aria-hidden="true" />
        )}
        {organizerShiftFormOpen && (
          <div className="profile-utility-panel profile-utility-panel--organizer-modal" role="dialog" aria-modal="true" aria-labelledby="organizer-modal-shift-title" onClick={e => e.stopPropagation()}>
            <div className="profile-utility-panel-header">
              <span id="organizer-modal-shift-title">Создать смену</span>
              <button type="button" className="profile-utility-panel-close" onClick={() => setOrganizerShiftFormOpen(false)} aria-label="Закрыть"><Icons.Close /></button>
            </div>
            <div className="profile-utility-panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label htmlFor="organizer-shift-name" style={{ fontSize: 12, opacity: 0.8 }}>Название смены</label>
                  <input id="organizer-shift-name" value={organizerShiftForm.name} onChange={e => setOrganizerShiftForm(f => ({ ...f, name: e.target.value }))} placeholder="Название смены" style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                </div>
                <div>
                  <label htmlFor="organizer-shift-start" style={{ fontSize: 12, opacity: 0.8 }}>Дата начала</label>
                  <input id="organizer-shift-start" type="date" value={organizerShiftForm.startDate} onChange={e => setOrganizerShiftForm(f => ({ ...f, startDate: e.target.value }))} style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                </div>
                <div>
                  <label htmlFor="organizer-shift-end" style={{ fontSize: 12, opacity: 0.8 }}>Дата окончания</label>
                  <input id="organizer-shift-end" type="date" value={organizerShiftForm.endDate} onChange={e => setOrganizerShiftForm(f => ({ ...f, endDate: e.target.value }))} style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                </div>
                <button type="button" className="btn-primary-gold" aria-label="Создать смену" disabled={!organizerShiftForm.name.trim() || organizerLoading || !canUseOrganizerApiForManage} onClick={async () => {
                  if (!canUseOrganizerApiForManage) {
                    setOrganizerError('Для управления сменами войдите по коду (или используйте локальный режим разработчика).');
                    return;
                  }
                  setOrganizerLoading(true);
                  setOrganizerError(null);
                  try {
                    const res = await fetch(`${organizerApiBase}/api/shifts`, {
                      method: 'POST',
                      headers: getOrganizerHeaders(true),
                      body: JSON.stringify({ name: organizerShiftForm.name.trim(), startDate: organizerShiftForm.startDate, endDate: organizerShiftForm.endDate }),
                    });
                    const data = await res.json().catch(() => ({})) as { shift?: { id: string; name: string; startDate: string; endDate: string; createdAt: string; createdBy?: string }; error?: string; reason?: string };
                    if (res.status === 401) { setOrganizerError('Сессия истекла. Войдите снова.'); fireOn401(); return; }
                    if (!res.ok) { setOrganizerError(formatOrganizerHttpError(res.status, data, 'Создание смены')); return; }
                    if (data.shift) setOrganizerShifts(prev => [...prev, data.shift!]);
                    setOrganizerShiftFormOpen(false);
                    await loadOrganizerData();
                  } finally {
                    setOrganizerLoading(false);
                  }
                }}>Создать</button>
              </div>
            </div>
          </div>
        )}

        {organizerSquadFormOpen && (
          <div className="profile-utility-panel-overlay profile-utility-panel-overlay--organizer" onClick={() => setOrganizerSquadFormOpen(false)} aria-hidden="true" />
        )}
        {organizerSquadFormOpen && (
          <div className="profile-utility-panel profile-utility-panel--organizer-modal" role="dialog" aria-modal="true" aria-labelledby="organizer-modal-squad-title" onClick={e => e.stopPropagation()}>
            <div className="profile-utility-panel-header">
              <span id="organizer-modal-squad-title">Добавить отряд</span>
              <button type="button" className="profile-utility-panel-close" onClick={() => setOrganizerSquadFormOpen(false)} aria-label="Закрыть"><Icons.Close /></button>
            </div>
            <div className="profile-utility-panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label htmlFor="organizer-squad-name" style={{ fontSize: 12, opacity: 0.8 }}>Название отряда</label>
                  <input id="organizer-squad-name" value={organizerSquadFormName} onChange={e => setOrganizerSquadFormName(e.target.value)} placeholder="Название отряда" style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                </div>
                <button type="button" className="btn-primary-gold" aria-label="Добавить отряд" disabled={!organizerSquadFormName.trim() || organizerLoading || !canUseOrganizerApiForManage} onClick={async () => {
                  if (!organizerSquadFormShiftId) return;
                  if (!canUseOrganizerApiForManage) {
                    setOrganizerError('Для управления сменами войдите по коду (или используйте локальный режим разработчика).');
                    return;
                  }
                  setOrganizerLoading(true);
                  setOrganizerError(null);
                  try {
                    const res = await fetch(`${organizerApiBase}/api/shifts/${organizerSquadFormShiftId}/squads`, {
                      method: 'POST',
                      headers: getOrganizerHeaders(true),
                      body: JSON.stringify({ name: organizerSquadFormName.trim() }),
                    });
                    const data = await res.json().catch(() => ({})) as { squad?: { id: string; shiftId: string; name: string; createdAt: string; avatarUrl?: string | null }; error?: string; reason?: string };
                    if (res.status === 401) { setOrganizerError('Сессия истекла. Войдите снова.'); fireOn401(); return; }
                    if (!res.ok) { setOrganizerError(formatOrganizerHttpError(res.status, data, 'Создание отряда')); return; }
                    if (data.squad) {
                      setOrganizerSquadsMap(prev => ({ ...prev, [organizerSquadFormShiftId]: [...(prev[organizerSquadFormShiftId] || []), data.squad!] }));
                    }
                    setOrganizerSquadFormOpen(false);
                    await loadOrganizerData();
                  } finally {
                    setOrganizerLoading(false);
                  }
                }}>Добавить</button>
              </div>
            </div>
          </div>
        )}

        {organizerCodeModalOpen && (
          <div className="profile-utility-panel-overlay profile-utility-panel-overlay--organizer" onClick={() => { setOrganizerCodeModalOpen(false); setOrganizerCodeResult(null); }} aria-hidden="true" />
        )}
        {organizerCodeModalOpen && (
          <div className="profile-utility-panel profile-utility-panel--organizer-modal" role="dialog" aria-modal="true" aria-labelledby="organizer-modal-code-title" onClick={e => e.stopPropagation()}>
            <div className="profile-utility-panel-header">
              <span id="organizer-modal-code-title">Выдать код</span>
              <button type="button" className="profile-utility-panel-close" onClick={() => { setOrganizerCodeModalOpen(false); setOrganizerCodeResult(null); }} aria-label="Закрыть"><Icons.Close /></button>
            </div>
            <div className="profile-utility-panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, opacity: 0.8 }}>deviceId</label>
                  <p style={{ margin: '0 0 4px', fontSize: 11, opacity: 0.75 }}>Идентификатор устройства участника, к которому привязывается код (обычно подставляется автоматически).</p>
                  <input value={organizerCodeForm.deviceId} onChange={e => setOrganizerCodeForm(f => ({ ...f, deviceId: e.target.value }))} placeholder="UUID устройства" style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, opacity: 0.8 }}>Роль</label>
                  <select value={organizerCodeForm.role} onChange={e => setOrganizerCodeForm(f => ({ ...f, role: e.target.value as UserRole }))} style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}>
                    {(['participant', 'parent', 'counselor', 'shift_leader', 'camp_director', 'developer'] as const).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, opacity: 0.8 }}>Смена (опционально)</label>
                  <select value={organizerCodeForm.shiftId} onChange={e => setOrganizerCodeForm(f => ({ ...f, shiftId: e.target.value }))} style={{ display: 'block', width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}>
                    <option value="">— без смены —</option>
                    {organizerShifts.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <button type="button" className="btn-primary-gold" aria-label="Сгенерировать код верификации" disabled={!organizerCodeForm.deviceId.trim() || organizerLoading || !canUseOrganizerApiForManage} onClick={async () => {
                  if (!canUseOrganizerApiForManage) {
                    setOrganizerError('Для управления сменами войдите по коду (или используйте локальный режим разработчика).');
                    return;
                  }
                  setOrganizerLoading(true);
                  setOrganizerCodeResult(null);
                  try {
                    const res = await fetch(`${organizerApiBase}/api/shifts/code`, {
                      method: 'POST',
                      headers: getOrganizerHeaders(true),
                      body: JSON.stringify({
                        deviceId: organizerCodeForm.deviceId.trim(),
                        role: organizerCodeForm.role,
                        shiftId: organizerCodeForm.shiftId || undefined
                      }),
                    });
                    const data = await res.json().catch(() => ({})) as { code?: string; error?: string; reason?: string };
                    if (res.status === 401) { setOrganizerCodeResult('Сессия истекла. Войдите снова.'); fireOn401(); return; }
                    if (!res.ok) { setOrganizerCodeResult(formatOrganizerHttpError(res.status, data, 'Генерация кода')); return; }
                    if (data.code) {
                      setOrganizerCodeResult(`Успешно сгенерирован код:\n\n${data.code}\n\nНикому не передавайте и используйте его для входа.`);
                    }
                  } catch (e) {
                    const fallbackMessage = e instanceof Error ? e.message : 'Ошибка генерации кода';
                    setOrganizerCodeResult(fallbackMessage);
                  } finally {
                    setOrganizerLoading(false);
                  }
                }}>Сгенерировать</button>
                {organizerCodeResult && (
                  <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                    {organizerCodeResult}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>,
      document.body
    );
  };

  return (
    <div id="organizer-shifts-tab-section" className="profile-view-parents-section organizer-shifts-section">
      <h2 className="organizer-shifts-section__heading">Смены и отряды</h2>
      <div className="organizer-empty-state organizer-empty-state--squads organizer-block-darkened" style={{ marginBottom: 12 }}>
        <p className="organizer-empty-state__title">Как открыть кабинет отряда</p>
        <p className="organizer-empty-state__text">1. Создайте смену. 2. Добавьте отряд. 3. Вступите в отряд по коду/ссылке. 4. Перейдите в Отрядный уголок.</p>
      </div>
      <div style={{ padding: 12, borderRadius: 12, background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 12, fontSize: 12, lineHeight: 1.45 }}>
        <strong>Мой отряд</strong>
        {mySquadInfo?.membership ? (
          <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
            <div>Смена: <strong>{mySquadInfo.shift?.name || mySquadInfo.membership.campId || '—'}</strong></div>
            <div>Отряд: <strong>{mySquadInfo.squad?.name || mySquadInfo.membership.squadId || '—'}</strong></div>
            <div style={{ marginTop: 6 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '8px 12px' }}
                onClick={onOpenSquadCornerFromOrganizer}
              >
                Открыть кабинет
              </button>
            </div>
          </div>
        ) : (
          <p style={{ margin: '6px 0 0', opacity: 0.85 }}>Вы пока не состоите в отряде. Вступите по коду ниже.</p>
        )}
      </div>
      {organizerLoading && <p className="organizer-loading">Загрузка…</p>}
      {organizerError && <div className="organizer-error">{organizerError}</div>}
      {!organizerLoading && (
        <>
          <div className="organizer-shifts-list">
            {organizerShifts.map((shift) => (
              <div key={shift.id} className="organizer-shift-card parents-section-block">
                <div className="organizer-shift-card__header">
                  <div>
                    <h3 className="organizer-shift-card__title parents-section-block__heading">{shift.name}</h3>
                    <p className="organizer-shift-card__dates parents-section-block__text">
                      {shift.startDate && shift.endDate ? `${shift.startDate} — ${shift.endDate}` : 'Даты не указаны'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {canManageShiftsAndSquads && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '6px 12px' }}
                        aria-label="Добавить отряд в смену"
                        disabled={!canUseOrganizerApiForManage || organizerLoading}
                        onClick={() => {
                          if (!canUseOrganizerApiForManage) {
                            setOrganizerError('Для управления сменами войдите по коду (или используйте локальный режим разработчика).');
                            return;
                          }
                          setOrganizerSquadFormShiftId(shift.id);
                          setOrganizerSquadFormName('');
                          setOrganizerSquadFormOpen(true);
                        }}
                      >
                        Добавить отряд
                      </button>
                    )}
                    {canDeleteShiftsAndSquads && (shift.name || '').trim().toLowerCase() !== DEFAULT_SHIFT_NAME.toLowerCase() && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '6px 12px' }}
                        aria-label="Удалить смену"
                        disabled={organizerLoading}
                        onClick={() => void removeShiftWithCleanup(shift)}
                      >
                        Удалить смену
                      </button>
                    )}
                  </div>
                </div>
                {(organizerSquadsMap[shift.id] || []).length > 0 ? (
                  <ul className="organizer-squads-list">
                    {(organizerSquadsMap[shift.id] || []).map((s) => (
                      <li key={s.id} className="organizer-squad-row">
                        <button
                          type="button"
                          className="organizer-squad-row__main"
                          aria-label={`Открыть кабинет отряда ${s.name}`}
                          disabled={openingSquadId === s.id || squadJoinRequestBusyId === s.id}
                          onClick={() => {
                            if (role === 'parent') {
                              showHint({
                                title: 'Отряд',
                                content: 'Для родителя вступление доступно по коду приглашения или через кнопку «Подать заявку».',
                              });
                              return;
                            }
                            void handleOpenSquadClick(s);
                          }}
                        >
                          <span className="organizer-squad-row__avatar" aria-hidden>
                            {s.avatarUrl ? <img src={s.avatarUrl} alt="" /> : <span>🏕️</span>}
                          </span>
                          <span className="organizer-squad-row__name">{openingSquadId === s.id ? 'Открываем...' : s.name}</span>
                        </button>
                        {accessToken && !canDeleteShiftsAndSquads && (
                          <button
                            type="button"
                            className="btn-secondary organizer-squad-row__delete"
                            style={{ padding: '4px 10px' }}
                            disabled={Boolean(squadJoinRequestBusyId) || (mySquadInfo?.membership?.squadId || '') === s.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void onRequestJoinSquad(s);
                            }}
                          >
                            {(mySquadInfo?.membership?.squadId || '') === s.id
                              ? 'Вы в отряде'
                              : squadJoinRequestBusyId === s.id
                                ? 'Отправляем...'
                                : 'Подать заявку'}
                          </button>
                        )}
                        {canDeleteShiftsAndSquads && (
                          <button
                            type="button"
                            className="btn-secondary organizer-squad-row__delete"
                            style={{ padding: '4px 10px' }}
                            disabled={organizerLoading || openingSquadId === s.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void removeSquadWithCleanup(s.id);
                            }}
                          >
                            Удалить отряд
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="organizer-empty-state organizer-empty-state--squads">
                    <p className="organizer-empty-state__title">Пока нет отрядов</p>
                    <p className="organizer-empty-state__text">Добавьте первый отряд, чтобы участники могли вступать по коду или ссылке.</p>
                  </div>
                )}
              </div>
            ))}
            {organizerShifts.length === 0 && (
              <div className="organizer-empty-state">
                {!canUseOrganizerApiForRead ? (
                  <>
                    <div className="organizer-empty-state__icon" aria-hidden>🔐</div>
                    <p className="organizer-empty-state__title">Доступ к сменам и отрядам</p>
                    <p className="organizer-empty-state__text">Войдите по коду, чтобы видеть смены и отряды (или используйте локальный режим разработчика).</p>
                  </>
                ) : (
                  <>
                    <div className="organizer-empty-state__icon" aria-hidden>📅</div>
                    <p className="organizer-empty-state__title">Пока нет смен</p>
                    <p className="organizer-empty-state__text">Создайте первую смену, чтобы добавлять отряды и выдавать коды.</p>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="organizer-shifts-actions">
            {canManageShiftsAndSquads && (
              <button
                type="button"
                className="btn-primary-gold"
                style={{ padding: '10px 20px' }}
                aria-label="Создать смену"
                disabled={organizerLoading || !canUseOrganizerApiForManage}
                onClick={() => {
                  if (!canUseOrganizerApiForManage) {
                    setOrganizerError('Для управления сменами войдите по коду (или используйте локальный режим разработчика).');
                    return;
                  }
                  setOrganizerShiftForm({ name: '', startDate: '', endDate: '' });
                  setOrganizerShiftFormOpen(true);
                }}
              >
                Создать смену
              </button>
            )}
            <button type="button" className="btn-secondary" style={{ padding: '10px 20px' }} aria-label="Обновить список смен и отрядов" disabled={organizerLoading || !canUseOrganizerApiForRead} onClick={() => void loadOrganizerData()}>Обновить</button>
            {canManageShiftsAndSquads && (
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '10px 20px' }}
                aria-label="Выдать код верификации"
                disabled={organizerLoading || !canUseOrganizerApiForManage}
                onClick={() => {
                  if (!canUseOrganizerApiForManage) {
                    setOrganizerError('Для управления сменами войдите по коду (или используйте локальный режим разработчика).');
                    return;
                  }
                  setOrganizerCodeForm({ deviceId: deviceId || '', role: 'participant', shiftId: organizerShifts[0]?.id || '' });
                  setOrganizerCodeResult(null);
                  setOrganizerCodeModalOpen(true);
                }}
              >
                Выдать код
              </button>
            )}
          </div>
          {canManageShiftsAndSquads && !canUseOrganizerApiForManage && (
            <p className="organizer-empty-state__text" style={{ marginTop: 8 }}>
              Если кнопка не срабатывает, проверьте вход по коду (или локальный режим разработчика).
            </p>
          )}
        </>
      )}
      {renderOrganizerModals()}
    </div>
  );
};
