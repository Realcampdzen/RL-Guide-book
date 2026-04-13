import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Shift {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  durationDays?: number;
  createdAt: string;
  createdBy?: string;
  avatarUrl?: string | null;
}

interface Squad {
  id: string;
  shiftId: string;
  name: string;
  createdAt: string;
  avatarUrl?: string | null;
}

interface ShiftsAndSquadsDashboardProps {
  onNavigateToSquadCorner?: () => void;
  onSquadCreated?: () => void;
  onRequestJoinSquad?: (squad: { id: string; name: string }) => Promise<void>;
  onRequestLogin?: () => void;
  mySquadId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
const DEFAULT_SHIFT_NAME = 'Весенняя Смена 2026';

// CAN_READ_ROLES removed — shifts/squads are public read
const CAN_MANAGE_SHIFTS_ROLES = new Set(['camp_director', 'developer']);
const CAN_MANAGE_SQUADS_ROLES = new Set([
  'counselor',
  'shift_leader',
  'camp_director',
  'developer',
]);

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  return useLocal
    ? ''
    : (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ShiftsAndSquadsDashboard: React.FC<ShiftsAndSquadsDashboardProps> = ({
  onNavigateToSquadCorner,
  onSquadCreated,
  onRequestJoinSquad,
  onRequestLogin,
  mySquadId,
}) => {
  const { role, accessToken } = useAuth();

  const apiBase = useMemo(() => getApiBase(), []);
  const devFallback = apiBase === '' && import.meta.env.DEV;
  const hasAccess = Boolean(accessToken) || devFallback || role === 'developer';
  // Shifts/squads API is public — everyone can read
  const canRead = true;
  const isGuest = !role || role === 'traveler';
  const canManageShifts = CAN_MANAGE_SHIFTS_ROLES.has(role || '') && hasAccess;
  const canManageSquads = CAN_MANAGE_SQUADS_ROLES.has(role || '') && hasAccess;

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [squadsMap, setSquadsMap] = useState<Record<string, Squad[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinBusyId, setJoinBusyId] = useState<string | null>(null);

  // avatars
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingShiftId, setUploadingShiftId] = useState<string | null>(null);

  // forms
  const [shiftFormOpen, setShiftFormOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    durationDays: 9,
  });
  const [squadFormShiftId, setSquadFormShiftId] = useState('');
  const [squadFormName, setSquadFormName] = useState('');

  const headers = useCallback(
    (withJson = false): Record<string, string> => {
      const h: Record<string, string> = {};
      if (withJson) h['Content-Type'] = 'application/json';
      if (accessToken) h.Authorization = `Bearer ${accessToken}`;
      else {
        try {
          const pin = localStorage.getItem('rl-dev-pin');
          if (pin) h['X-Dev-Pin'] = pin;
        } catch {}
      }
      return h;
    },
    [accessToken]
  );

  const loadData = useCallback(async () => {
    if (!canRead) {
      setShifts([]);
      setSquadsMap({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/shifts`, { headers: headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { shifts?: Shift[] };
      const sorted = [...(data.shifts || [])].sort((a, b) => {
        const aD = (a.name || '').trim().toLowerCase() === DEFAULT_SHIFT_NAME.toLowerCase();
        const bD = (b.name || '').trim().toLowerCase() === DEFAULT_SHIFT_NAME.toLowerCase();
        if (aD && !bD) return -1;
        if (!aD && bD) return 1;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
      setShifts(sorted);

      const map: Record<string, Squad[]> = {};
      for (const shift of sorted) {
        try {
          const r = await fetch(`${apiBase}/api/shifts/${shift.id}/squads`, { headers: headers() });
          if (r.ok) {
            const sd = (await r.json()) as { squads?: Squad[] };
            map[shift.id] = sd.squads || [];
          } else {
            map[shift.id] = [];
          }
        } catch {
          map[shift.id] = [];
        }
      }
      setSquadsMap(map);
    } catch (e) {
      // Dev fallback: if backend is not running, show seed data
      if (import.meta.env.DEV) {
        const devShifts: Shift[] = [
          {
            id: '64f3ca208702',
            name: 'Весенняя смена 2026',
            startDate: '',
            endDate: '',
            createdAt: '2026-02-25T22:06:08Z',
            createdBy: 'seed-dev-mode',
          },
          {
            id: 'b8a1e47c3d59',
            name: 'Летняя смена 2026',
            startDate: '2026-06-01',
            endDate: '2026-06-21',
            createdAt: '2026-03-06T00:00:00Z',
            createdBy: 'seed-dev-mode',
          },
        ];
        const devSquads: Record<string, Squad[]> = {
          '64f3ca208702': [
            {
              id: '9f555852b996',
              shiftId: '64f3ca208702',
              name: 'СТО ЛЕТ ЛЕТА',
              createdAt: '2026-02-28T03:48:12Z',
            },
          ],
          b8a1e47c3d59: [],
        };
        setShifts(devShifts);
        setSquadsMap(devSquads);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
        setShifts([]);
        setSquadsMap({});
      }
    } finally {
      setLoading(false);
    }
  }, [canRead, apiBase, headers]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const createShift = useCallback(async () => {
    if (!shiftForm.name.trim()) return;
    try {
      const res = await fetch(`${apiBase}/api/shifts`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ ...shiftForm, durationDays: shiftForm.durationDays }),
      });
      if (!res.ok) {
        setError(`Ошибка создания: ${res.status}`);
        return;
      }
      setShiftFormOpen(false);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }, [shiftForm, apiBase, headers, loadData]);

  const createSquad = useCallback(async () => {
    if (!squadFormName.trim() || !squadFormShiftId) return;
    try {
      const res = await fetch(`${apiBase}/api/shifts/${squadFormShiftId}/squads`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ name: squadFormName }),
      });
      if (!res.ok) {
        setError(`Ошибка создания: ${res.status}`);
        return;
      }
      setSquadFormShiftId('');
      setSquadFormName('');
      await loadData();
      onSquadCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }, [squadFormShiftId, squadFormName, apiBase, headers, loadData]);

  const deleteShift = useCallback(
    async (shiftId: string, shiftName: string) => {
      if (!confirm(`Удалить смену «${shiftName}» и все её отряды?`)) return;
      try {
        const res = await fetch(`${apiBase}/api/shifts/${shiftId}`, {
          method: 'DELETE',
          headers: headers(),
        });
        if (!res.ok) {
          setError(`Ошибка удаления: ${res.status}`);
          return;
        }
        setSelectedShiftId(null);
        await loadData();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      }
    },
    [apiBase, headers, loadData]
  );

  const deleteSquad = useCallback(
    async (squadId: string, squadName: string) => {
      if (!confirm(`Удалить отряд «${squadName}»?`)) return;
      try {
        const res = await fetch(`${apiBase}/api/squads/${squadId}`, {
          method: 'DELETE',
          headers: headers(),
        });
        if (!res.ok) {
          setError(`Ошибка удаления: ${res.status}`);
          return;
        }
        await loadData();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      }
    },
    [apiBase, headers, loadData]
  );

  const handleAvatarClick = (e: React.MouseEvent, shiftId: string) => {
    e.stopPropagation();
    if (!canManageSquads) return;
    setUploadingShiftId(shiftId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingShiftId) return;
    setLoading(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const maxDim = 400;
      let w = bitmap.width;
      let h = bitmap.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w *= ratio;
        h *= ratio;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(bitmap, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      const res = await fetch(`${apiBase}/api/shifts/${uploadingShiftId}`, {
        method: 'PATCH',
        headers: headers(true),
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      if (!res.ok) throw new Error(`Ошибка загрузки аватара: ${res.status}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обработки изображения');
    } finally {
      setLoading(false);
      setUploadingShiftId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const cardStyle: React.CSSProperties = {
    padding: 20,
    borderRadius: 16,
    background: 'rgba(15, 10, 42, 0.12)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };
  const btnStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e8f0ff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: FONT,
  };
  const btnPrimaryStyle: React.CSSProperties = {
    ...btnStyle,
    background: 'rgba(93,228,255,0.15)',
    color: '#5de4ff',
    borderColor: 'rgba(93,228,255,0.25)',
  };

  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const selectedShift = shifts.find((s) => s.id === selectedShiftId);
  const selectedSquads = selectedShiftId ? squadsMap[selectedShiftId] || [] : [];

  if (!canRead) {
    return (
      <div className="fade-in" style={{ ...cardStyle, textAlign: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(93,228,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5de4ff"
            strokeWidth="1.5"
            width="20"
            height="20"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#e8f0ff' }}>
          Доступ к сменам и отрядам
        </h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          Войдите по коду, чтобы видеть смены и отряды.
        </p>
      </div>
    );
  }

  // ── LEVEL 2: Inside a shift → show squads ──
  if (selectedShift) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            style={{
              ...btnStyle,
              padding: '6px 12px',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={() => setSelectedShiftId(null)}
          >
            ← Назад
          </button>
          <div
            onClick={(e) => handleAvatarClick(e, selectedShift.id)}
            title={canManageSquads ? 'Изменить аватар смены' : ''}
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              flexShrink: 0,
              background: selectedShift.name.toLowerCase().includes('весен')
                ? 'linear-gradient(135deg, rgba(77,205,196,0.3), rgba(93,228,255,0.2))'
                : selectedShift.name.toLowerCase().includes('лет')
                  ? 'linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,159,67,0.2))'
                  : 'linear-gradient(135deg, rgba(138,130,255,0.3), rgba(93,228,255,0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 700,
              color: '#e8f0ff',
              overflow: 'hidden',
              cursor: canManageSquads ? 'pointer' : 'default',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {selectedShift.avatarUrl ? (
              <img
                src={selectedShift.avatarUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              (selectedShift.name || '?')[0].toUpperCase()
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e8f0ff' }}>
              {selectedShift.name}
            </div>
            <div style={{ fontSize: 14, color: '#c97730', fontWeight: 700 }}>
              {selectedShift.startDate && selectedShift.endDate
                ? `${selectedShift.startDate} — ${selectedShift.endDate}`
                : 'Даты не указаны'}
            </div>
          </div>
          {canManageSquads && (
            <button
              type="button"
              style={btnPrimaryStyle}
              onClick={() => {
                setSquadFormShiftId(selectedShift.id);
                setSquadFormName('');
              }}
            >
              + Отряд
            </button>
          )}
        </div>

        {/* Squads grid */}
        {selectedSquads.length > 0 ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {selectedSquads.map((s) => (
              <button
                key={s.id}
                type="button"
                className="fade-in"
                onClick={() => onNavigateToSquadCorner?.()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: 'rgba(15, 10, 42, 0.12)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: FONT,
                  transition: 'all 0.15s',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    flexShrink: 0,
                    background:
                      'linear-gradient(135deg, rgba(138,130,255,0.3), rgba(93,228,255,0.2))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#e8f0ff',
                    overflow: 'hidden',
                  }}
                >
                  {s.avatarUrl ? (
                    <img
                      src={s.avatarUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    (s.name || '?')[0].toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#e8f0ff' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                    Создан {new Date(s.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                {/* Guest: Подать заявку opens role modal */}
                {isGuest && onRequestLogin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestLogin();
                    }}
                    style={{
                      ...btnStyle,
                      padding: '6px 14px',
                      background: 'rgba(245,158,11,0.15)',
                      color: '#f59e0b',
                      borderColor: 'rgba(245,158,11,0.3)',
                    }}
                  >
                    Подать заявку
                  </button>
                )}
                {/* Authenticated non-admin: squad join request */}
                {onRequestJoinSquad &&
                  accessToken &&
                  !isGuest &&
                  !canManageSquads &&
                  (mySquadId || '') !== s.id && (
                    <button
                      type="button"
                      disabled={joinBusyId === s.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setJoinBusyId(s.id);
                        onRequestJoinSquad(s).finally(() => setJoinBusyId(null));
                      }}
                      style={{
                        ...btnStyle,
                        padding: '6px 14px',
                        background: 'rgba(93,228,255,0.12)',
                        color: '#5de4ff',
                        borderColor: 'rgba(93,228,255,0.25)',
                        opacity: joinBusyId === s.id ? 0.5 : 1,
                      }}
                    >
                      {joinBusyId === s.id ? 'Отправляем...' : 'Подать заявку'}
                    </button>
                  )}
                {(mySquadId || '') === s.id && (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      background: 'rgba(46,204,113,0.12)',
                      color: '#2ecc71',
                      border: '1px solid rgba(46,204,113,0.25)',
                    }}
                  >
                    Вы в отряде
                  </span>
                )}
                {canManageSquads && (
                  <button
                    type="button"
                    title="Удалить отряд"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteSquad(s.id, s.name);
                    }}
                    style={{
                      ...btnStyle,
                      padding: '6px 10px',
                      fontSize: 14,
                      color: '#ff6b6b',
                      borderColor: 'rgba(255,107,107,0.2)',
                    }}
                  >
                    ×
                  </button>
                )}
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)' }}>→</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="fade-in" style={{ ...cardStyle, textAlign: 'center' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(93,228,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5de4ff"
                strokeWidth="1.5"
                width="20"
                height="20"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              Пока нет отрядов. Добавьте первый.
            </p>
          </div>
        )}

        {/* Inline squad form */}
        {squadFormShiftId === selectedShift.id && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={squadFormName}
              onChange={(e) => setSquadFormName(e.target.value)}
              placeholder="Название отряда"
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: '#e8f0ff',
                fontSize: 13,
                fontFamily: FONT,
              }}
            />
            <button type="button" style={btnPrimaryStyle} onClick={() => void createSquad()}>
              Создать
            </button>
            <button type="button" style={btnStyle} onClick={() => setSquadFormShiftId('')}>
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── LEVEL 1: Shift list ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e8f0ff' }}>
          Выберите смену
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={btnStyle} disabled={loading} onClick={() => void loadData()}>
            {loading ? 'Загрузка…' : 'Обновить'}
          </button>
          {canManageShifts && (
            <button type="button" style={btnPrimaryStyle} onClick={() => setShiftFormOpen(true)}>
              + Смена
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: 'rgba(255,107,107,0.1)',
            border: '1px solid rgba(255,107,107,0.2)',
            fontSize: 12,
            color: '#ff6b6b',
          }}
        >
          {error}
        </div>
      )}

      {/* Shift cards grid */}
      {shifts.map((shift) => {
        const squadCount = (squadsMap[shift.id] || []).length;
        return (
          <button
            key={shift.id}
            type="button"
            className="fade-in"
            onClick={() => setSelectedShiftId(shift.id)}
            style={{
              ...cardStyle,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: FONT,
              transition: 'all 0.15s',
            }}
          >
            <div
              onClick={(e) => handleAvatarClick(e, shift.id)}
              title={canManageSquads ? 'Изменить аватар смены' : ''}
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                flexShrink: 0,
                background: shift.name.toLowerCase().includes('весен')
                  ? 'linear-gradient(135deg, rgba(77,205,196,0.3), rgba(93,228,255,0.2))'
                  : shift.name.toLowerCase().includes('лет')
                    ? 'linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,159,67,0.2))'
                    : 'linear-gradient(135deg, rgba(138,130,255,0.3), rgba(93,228,255,0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700,
                color: '#e8f0ff',
                overflow: 'hidden',
              }}
            >
              {shift.avatarUrl ? (
                <img
                  src={shift.avatarUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (shift.name || '?')[0].toUpperCase()
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e8f0ff' }}>{shift.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                {shift.startDate && shift.endDate
                  ? `${shift.startDate} — ${shift.endDate}`
                  : 'Даты не указаны'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                {squadCount > 0
                  ? `${squadCount} отряд${squadCount > 1 ? (squadCount < 5 ? 'а' : 'ов') : ''}`
                  : 'Нет отрядов'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {canManageShifts && (
                <button
                  type="button"
                  title="Удалить смену"
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteShift(shift.id, shift.name);
                  }}
                  style={{
                    ...btnStyle,
                    padding: '6px 10px',
                    fontSize: 14,
                    color: '#ff6b6b',
                    borderColor: 'rgba(255,107,107,0.2)',
                  }}
                >
                  ×
                </button>
              )}
              <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.3)' }}>→</span>
            </div>
          </button>
        );
      })}

      {shifts.length === 0 && !loading && (
        <div className="fade-in" style={{ ...cardStyle, textAlign: 'center' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(93,228,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5de4ff"
              strokeWidth="1.5"
              width="20"
              height="20"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Пока нет смен. Создайте первую.
          </p>
        </div>
      )}

      {/* Shift form */}
      {shiftFormOpen && (
        <div className="fade-in" style={cardStyle}>
          <h4 style={{ margin: '0 0 12px', fontSize: 15, color: '#e8f0ff' }}>Новая смена</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              value={shiftForm.name}
              onChange={(e) => setShiftForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Название смены"
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: '#e8f0ff',
                fontSize: 13,
                fontFamily: FONT,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date"
                value={shiftForm.startDate}
                onChange={(e) => setShiftForm((f) => ({ ...f, startDate: e.target.value }))}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#e8f0ff',
                  fontSize: 13,
                  fontFamily: FONT,
                }}
              />
              <input
                type="date"
                value={shiftForm.endDate}
                onChange={(e) => setShiftForm((f) => ({ ...f, endDate: e.target.value }))}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#e8f0ff',
                  fontSize: 13,
                  fontFamily: FONT,
                }}
              />
            </div>
            {/* Duration selector */}
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                Длительность смены
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  style={{
                    ...btnStyle,
                    ...(shiftForm.durationDays === 9
                      ? {
                          background: 'rgba(93,228,255,0.15)',
                          color: '#5de4ff',
                          borderColor: 'rgba(93,228,255,0.25)',
                        }
                      : {}),
                  }}
                  onClick={() => setShiftForm((f) => ({ ...f, durationDays: 9 }))}
                >
                  9 дней
                </button>
                <button
                  type="button"
                  style={{
                    ...btnStyle,
                    ...(shiftForm.durationDays === 21
                      ? {
                          background: 'rgba(93,228,255,0.15)',
                          color: '#5de4ff',
                          borderColor: 'rgba(93,228,255,0.25)',
                        }
                      : {}),
                  }}
                  onClick={() => setShiftForm((f) => ({ ...f, durationDays: 21 }))}
                >
                  21 день
                </button>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={shiftForm.durationDays}
                  onChange={(e) =>
                    setShiftForm((f) => ({
                      ...f,
                      durationDays: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  style={{
                    width: 60,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#e8f0ff',
                    fontSize: 13,
                    fontFamily: FONT,
                    textAlign: 'center',
                  }}
                />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>дн.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={btnPrimaryStyle} onClick={() => void createShift()}>
                Создать смену
              </button>
              <button type="button" style={btnStyle} onClick={() => setShiftFormOpen(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
    </div>
  );
};
