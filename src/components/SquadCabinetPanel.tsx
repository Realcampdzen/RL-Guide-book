import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createSquadInviteCode,
  fetchSquadCorner,
  joinSquad,
  kickSquadMember,
  leaveSquad,
  resolveSquadByInviteCode,
  type SquadCorner,
  type SquadMineResponse
} from '../utils/badgeApprovalApi';
import { SquadChat } from './SquadChat';
import { getSquadCornerReadiness, getSquadCornerReadinessLabel, getSquadCornerReadinessTone } from '../utils/squadCornerReadiness';

interface SquadCabinetPanelProps {
  role: string;
  deviceId?: string;
  accessToken?: string;
  mySquadInfo: SquadMineResponse | null;
  onRefresh: () => Promise<void> | void;
  onAfterLeave?: () => void;
  onShowHint?: (opts: { title: string; content: string }) => void;
  onEditCorner?: (targetTab?: 'photos' | 'planner') => void;
}

export const SquadCabinetPanel: React.FC<SquadCabinetPanelProps> = ({
  role,
  deviceId,
  accessToken,
  mySquadInfo,
  onRefresh,
  onAfterLeave,
  onShowHint,
  onEditCorner
}) => {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteMeta, setInviteMeta] = useState<{ createdAt: string; expiresAt: string } | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [cornerBusy, setCornerBusy] = useState(false);
  const [cornerError, setCornerError] = useState<string | null>(null);
  const [corner, setCorner] = useState<SquadCorner | null>(null);
  const [photoZoomUrl, setPhotoZoomUrl] = useState<string | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerGridId, setPlannerGridId] = useState<'planGridA' | 'planGridB'>('planGridA');
  const [plannerDay, setPlannerDay] = useState(1);

  const squadId = (mySquadInfo?.membership?.squadId || '').trim();
  const squadName = mySquadInfo?.squad?.name || mySquadInfo?.membership?.squadId || 'Отряд';
  const shiftName = mySquadInfo?.shift?.name || mySquadInfo?.membership?.campId || 'Смена';
  const canManage = role === 'counselor' || role === 'shift_leader' || role === 'developer';
  const canEditCorner = role === 'counselor' || role === 'developer';

  useEffect(() => {
    if (!accessToken || !squadId) return;
    let cancelled = false;
    setCornerBusy(true);
    setCornerError(null);
    fetchSquadCorner(accessToken, squadId)
      .then((data) => {
        if (cancelled) return;
        setCorner(data?.corner || {});
      })
      .catch((e) => {
        if (cancelled) return;
        setCornerError(e instanceof Error ? e.message : 'Не удалось загрузить инфо отряда.');
        setCorner(null);
      })
      .finally(() => {
        if (!cancelled) setCornerBusy(false);
      });
    return () => { cancelled = true; };
  }, [accessToken, squadId]);

  const cornerPhotos = useMemo(() => {
    const c = corner || {};
    const items: Array<{ key: string; label: string; url: string }> = [];
    const push = (key: string, label: string, url?: string | null) => {
      const u = (url || '').trim();
      if (!u) return;
      items.push({ key, label, url: u });
    };
    push('photoCorner', 'Уголок', c.photoCorner);
    push('photoFlag', 'Флаг', c.photoFlag);
    push('photoSquad', 'Отряд', c.photoSquad);
    push('photoWithCounselors', 'С вожатыми', c.photoWithCounselors);
    return items;
  }, [corner]);

  const cornerReadiness = useMemo(() => getSquadCornerReadiness(corner), [corner]);

  const countFilledDays = useCallback((grid?: SquadCorner['planGridA'] | null) => {
    if (!grid || typeof grid !== 'object') return { filled: 0, total: 0 };
    const shiftLength = (grid as any).shiftLength;
    const days = (grid as any).days;
    if ((shiftLength !== 9 && shiftLength !== 21) || typeof days !== 'object' || !days) return { filled: 0, total: 0 };
    let filled = 0;
    for (let d = 1; d <= shiftLength; d++) {
      const x = (days as any)[String(d)] || {};
      if ((x.morning || '').trim() && (x.quietHour || '').trim() && (x.day || '').trim() && (x.evening || '').trim() && (x.night || '').trim()) filled++;
    }
    return { filled, total: shiftLength };
  }, []);

  const members = useMemo(() => {
    const fallback: Array<{ deviceId: string; nickname: string | null; role: string; joinedAt?: string }> = [];

    if (mySquadInfo?.membership?.deviceId) {
      fallback.push({
        deviceId: mySquadInfo.membership.deviceId,
        nickname: mySquadInfo.membership.nickname || null,
        role: mySquadInfo.membership.role || 'participant',
        joinedAt: mySquadInfo.membership.joinedAt
      });
    }

    for (const p of mySquadInfo?.participants || []) {
      if (!p?.deviceId) continue;
      if (fallback.some((x) => x.deviceId === p.deviceId)) continue;
      fallback.push({ deviceId: p.deviceId, nickname: p.nickname || null, role: 'participant', joinedAt: p.joinedAt });
    }

    return fallback;
  }, [mySquadInfo]);

  const inviteLink = useMemo(() => {
    if (!squadId || typeof window === 'undefined') return '';
    return `${window.location.origin}/?join_squad=${encodeURIComponent(squadId)}`;
  }, [squadId]);

  const copyText = async (value: string, okText: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatus(okText);
    } catch {
      setStatus('Не удалось скопировать в буфер обмена.');
    }
  };

  const handleLeave = async () => {
    if (!accessToken || !squadId || busy) return;
    if (!window.confirm('Выйти из этого отряда?')) return;
    setBusy(true);
    setStatus(null);
    try {
      await leaveSquad(accessToken, squadId);
      await onRefresh();
      onAfterLeave?.();
      setStatus('Вы вышли из отряда.');
      onShowHint?.({ title: 'Готово', content: 'Вы вышли из отряда.' });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Не удалось выйти из отряда.');
    } finally {
      setBusy(false);
    }
  };

  const handleKick = async (targetDeviceId: string) => {
    if (!accessToken || !squadId || busy) return;
    if (!targetDeviceId || targetDeviceId === deviceId) return;
    if (!window.confirm('Исключить участника из отряда?')) return;
    setBusy(true);
    setStatus(null);
    try {
      await kickSquadMember(accessToken, squadId, targetDeviceId);
      await onRefresh();
      setStatus('Участник исключён.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Не удалось исключить участника.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateInviteCode = async () => {
    if (!accessToken || !squadId || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const created = await createSquadInviteCode(accessToken, squadId);
      setInviteCode(created.code);
      setInviteMeta({ createdAt: created.createdAt, expiresAt: created.expiresAt });
      setStatus('Код приглашения создан.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Не удалось создать код приглашения.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!accessToken || joinBusy) return;
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setStatus('Введите код приглашения.');
      return;
    }
    setJoinBusy(true);
    setStatus(null);
    try {
      const preview = await resolveSquadByInviteCode(accessToken, code);
      const confirmed = window.confirm(`Вступить в отряд ${preview.squadName ? `«${preview.squadName}»` : preview.squadId}?`);
      if (!confirmed) return;
      await joinSquad(accessToken, preview.squadId);
      setJoinCode('');
      await onRefresh();
      setStatus('Вы вступили в отряд.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Не удалось вступить в отряд по коду.');
    } finally {
      setJoinBusy(false);
    }
  };

  if (!accessToken) {
    return <div className="profile-empty-state__text">Войдите по коду, чтобы открыть кабинет отряда.</div>;
  }

  if (!squadId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="profile-empty-state__text">Вы пока не состоите в отряде.</div>
        <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Вступить по коду</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setStatus(null); }}
              placeholder="Введите код приглашения"
              style={{ flex: 1, minWidth: 180, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
            />
            <button type="button" className="btn-primary-gold" style={{ padding: '8px 14px' }} onClick={() => void handleJoinByCode()} disabled={joinBusy}>
              {joinBusy ? 'Проверка...' : 'Вступить'}
            </button>
          </div>
        </div>
        {status && <div style={{ fontSize: 12, opacity: 0.9 }}>{status}</div>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{squadName}</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Смена: {shiftName}</div>
      </div>

      <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Инфо отряда <span className={`squad-corner-readiness-chip tone-${getSquadCornerReadinessTone(cornerReadiness)}`} style={{ marginTop: 0, marginLeft: 8 }}>{getSquadCornerReadinessLabel(cornerReadiness)}</span></div>
          {canEditCorner && onEditCorner && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => onEditCorner('photos')}>
                Редактировать фото
              </button>
              <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => onEditCorner('planner')}>
                Редактировать планёрку
              </button>
            </div>
          )}
        </div>

        {cornerBusy && <div style={{ fontSize: 12, opacity: 0.75 }}>Загрузка…</div>}
        {cornerError && <div style={{ fontSize: 12, opacity: 0.9 }}>{cornerError}</div>}
        {!cornerBusy && !cornerError && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, lineHeight: 1.5, opacity: 0.92 }}>
              <div><span style={{ opacity: 0.7 }}>Название:</span> <strong>{(corner?.name || squadName) || '—'}</strong></div>
              <div><span style={{ opacity: 0.7 }}>Девиз:</span> {(corner?.motto || '—')}</div>
              <div><span style={{ opacity: 0.7 }}>Кричалки:</span> {(corner?.chants || '—')}</div>
              <div><span style={{ opacity: 0.7 }}>Приветствие:</span> {(corner?.greeting || '—')}</div>
              <div><span style={{ opacity: 0.7 }}>Мемы:</span> {(corner?.memes || '—')}</div>
            </div>

            {cornerPhotos.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Фото</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {cornerPhotos.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPhotoZoomUrl(p.url)}
                      style={{ width: 92, height: 92, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.25)', padding: 0, cursor: 'pointer' }}
                      title={p.label}
                      aria-label={`Открыть фото: ${p.label}`}
                    >
                      <img src={p.url} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9 }}>Планёрка</div>
              {(() => {
                const a = countFilledDays(corner?.planGridA);
                const b = countFilledDays(corner?.planGridB);
                const best = (a.filled + a.total) >= (b.filled + b.total) ? { id: 'planGridA' as const, ...a } : { id: 'planGridB' as const, ...b };
                return (
                  <>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      Сетка 1: {a.filled}/{a.total || '—'} · Сетка 2: {b.filled}/{b.total || '—'}
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '8px 12px', alignSelf: 'flex-start' }}
                      onClick={() => { setPlannerGridId(best.id); setPlannerDay(1); setPlannerOpen(true); }}
                    >
                      Открыть планёрку
                    </button>
                  </>
                );
              })()}
            </div>
          </>
        )}
      </div>

      <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Участники</div>
        {members.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.8 }}>Список участников пока пуст.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {members.map((m) => (
              <div key={m.deviceId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12 }}>
                  {(m.nickname || 'Без ника')} · {m.role || 'participant'} · {m.deviceId}
                </div>
                {canManage && m.deviceId !== deviceId && (
                  <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => void handleKick(m.deviceId)} disabled={busy}>
                    Исключить
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Пригласить в отряд</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.85, wordBreak: 'break-all' }}>{inviteLink}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => void copyText(inviteLink, 'Ссылка скопирована.')}>
              Копировать ссылку
            </button>
            {canManage && (
              <button type="button" className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => void handleCreateInviteCode()} disabled={busy}>
                Создать код приглашения
              </button>
            )}
          </div>
          {inviteCode && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1.4, fontFamily: 'monospace' }}>{inviteCode}</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>
                Действует до: {inviteMeta ? new Date(inviteMeta.expiresAt).toLocaleString('ru-RU') : '—'}
              </div>
              <button type="button" className="btn-secondary" style={{ padding: '6px 12px', marginTop: 6 }} onClick={() => void copyText(inviteCode, 'Код скопирован.')}>
                Копировать код
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <button type="button" className="btn-secondary" style={{ padding: '8px 14px' }} onClick={() => void onRefresh()} disabled={busy}>
          Обновить
        </button>
        <button type="button" className="btn-secondary" style={{ padding: '8px 14px' }} onClick={() => void handleLeave()} disabled={busy}>
          Выйти из отряда
        </button>
      </div>

      {status && <div style={{ fontSize: 12, opacity: 0.9 }}>{status}</div>}

      <SquadChat squadId={squadId} accessToken={accessToken} />

      {photoZoomUrl && (
        <div
          className="proof-modal-overlay"
          onClick={() => setPhotoZoomUrl(null)}
          style={{ zIndex: 10200, alignItems: 'center', justifyContent: 'center' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(92vw, 900px)', maxHeight: '90vh', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.65)' }}>
            <img src={photoZoomUrl} alt="" style={{ width: '100%', height: '100%', maxHeight: '90vh', objectFit: 'contain', display: 'block' }} />
          </div>
        </div>
      )}

      {plannerOpen && (
        <div className="proof-modal-overlay" onClick={() => setPlannerOpen(false)} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="proof-modal proof-modal--mobile-sheet proof-modal--wide fade-in" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ width: 'min(92vw, 860px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Планёрка отряда</div>
              <button type="button" className="btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setPlannerOpen(false)}>Закрыть</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <button type="button" className="btn-secondary" style={{ padding: '6px 10px', opacity: plannerGridId === 'planGridA' ? 1 : 0.75 }} onClick={() => setPlannerGridId('planGridA')}>Сетка 1</button>
              <button type="button" className="btn-secondary" style={{ padding: '6px 10px', opacity: plannerGridId === 'planGridB' ? 1 : 0.75 }} onClick={() => setPlannerGridId('planGridB')}>Сетка 2</button>
            </div>
            {(() => {
              const grid = plannerGridId === 'planGridA' ? corner?.planGridA : corner?.planGridB;
              const shiftLength = grid?.shiftLength || 21;
              const dayKeys = Array.from({ length: shiftLength }, (_, i) => i + 1);
              const day = (grid?.days || {})[String(plannerDay)] || {};
              return (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {dayKeys.map((d) => (
                      <button key={d} type="button" className="btn-secondary" style={{ padding: '6px 10px', opacity: plannerDay === d ? 1 : 0.75 }} onClick={() => setPlannerDay(d)}>
                        День {d}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Утро</div>
                      <div style={{ fontSize: 12, opacity: 0.9, whiteSpace: 'pre-wrap' }}>{day.morning || '—'}</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Тихий час</div>
                      <div style={{ fontSize: 12, opacity: 0.9, whiteSpace: 'pre-wrap' }}>{day.quietHour || '—'}</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>День</div>
                      <div style={{ fontSize: 12, opacity: 0.9, whiteSpace: 'pre-wrap' }}>{day.day || '—'}</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Вечер</div>
                      <div style={{ fontSize: 12, opacity: 0.9, whiteSpace: 'pre-wrap' }}>{day.evening || '—'}</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Ночь</div>
                      <div style={{ fontSize: 12, opacity: 0.9, whiteSpace: 'pre-wrap' }}>{day.night || '—'}</div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
