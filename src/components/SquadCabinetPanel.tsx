import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserProgress } from '../hooks/useUserProgress';
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
  myNickname?: string;
  mySquadInfo: SquadMineResponse | null;
  onRefresh: () => Promise<void> | void;
  onAfterLeave?: () => void;
  onShowHint?: (opts: { title: string; content: string }) => void;
  onEditCorner?: (targetTab?: 'photos' | 'planner') => void;
  diaryCorner?: Partial<SquadCorner> | null;
}

export const SquadCabinetPanel: React.FC<SquadCabinetPanelProps> = ({
  role,
  deviceId,
  accessToken,
  myNickname: myNicknameProp,
  mySquadInfo,
  onRefresh,
  onAfterLeave,
  onShowHint,
  onEditCorner,
  diaryCorner
}) => {
  // Always prefer the live profile nickname from context (same source as profile display)
  const { userData } = useUserProgress();
  const myNickname = myNicknameProp || userData?.profile?.nickname || undefined;
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
  const [plannerDay, setPlannerDay] = useState(1);

  const squadId = (mySquadInfo?.membership?.squadId || '').trim();
  const squadName = mySquadInfo?.squad?.name || mySquadInfo?.membership?.squadId || 'Отряд';
  const shiftName = mySquadInfo?.shift?.name || mySquadInfo?.membership?.campId || 'Смена';
  const canManage = role === 'counselor' || role === 'shift_leader' || role === 'developer';
  const canEditCorner = role === 'counselor' || role === 'developer';

  useEffect(() => {
    if (!squadId) return;
    if (!accessToken) {
      // No auth: use diary data directly
      if (diaryCorner) {
        setCorner(diaryCorner as SquadCorner);
        setCornerBusy(false);
      }
      return;
    }
    let cancelled = false;
    setCornerBusy(true);
    setCornerError(null);
    fetchSquadCorner(accessToken!, squadId)
      .then((data) => {
        if (cancelled) return;
        setCorner(data?.corner || {});
      })
      .catch((e) => {
        if (cancelled) return;
        // Use diary data as fallback when API is unavailable
        if (diaryCorner) {
          setCorner(diaryCorner as SquadCorner);
          setCornerError(null);
        } else {
          setCornerError(e instanceof Error ? e.message : 'Не удалось загрузить инфо отряда.');
          setCorner(null);
        }
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
    const myDeviceId = mySquadInfo?.membership?.deviceId || deviceId || '';

    // Use mySquadInfo.members (has role) if available
    const membersData = mySquadInfo?.members;
    if (membersData && membersData.length > 0) {
      for (const m of membersData) {
        if (!m?.deviceId) continue;
        fallback.push({ deviceId: m.deviceId, nickname: m.nickname || null, role: m.role || 'participant', joinedAt: m.joinedAt });
      }
    }

    // Add self from membership if not already present
    if (mySquadInfo?.membership?.deviceId) {
      if (!fallback.some((x) => x.deviceId === mySquadInfo.membership!.deviceId)) {
        fallback.push({
          deviceId: mySquadInfo.membership.deviceId,
          nickname: null,
          role: mySquadInfo.membership.role || 'participant',
          joinedAt: mySquadInfo.membership.joinedAt
        });
      }
    }

    // Add remaining participants not yet in list
    for (const p of mySquadInfo?.participants || []) {
      if (!p?.deviceId) continue;
      if (fallback.some((x) => x.deviceId === p.deviceId)) continue;
      fallback.push({ deviceId: p.deviceId, nickname: p.nickname || null, role: 'participant', joinedAt: p.joinedAt });
    }

    // Final pass: ensure current user always has the correct nickname from profile
    if (myNickname && myDeviceId) {
      for (const m of fallback) {
        if (m.deviceId === myDeviceId) {
          m.nickname = myNickname;
        }
      }
    }

    return fallback;
  }, [mySquadInfo, myNickname, deviceId]);

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
    if (joinBusy) return;
    const hasRealToken = !!accessToken;
    const isDevSandbox = import.meta.env.DEV && !hasRealToken && !!deviceId;
    if (!hasRealToken && !isDevSandbox) {
      setStatus('Для вступления в отряд необходима авторизация. Убедитесь, что бэкенд запущен.');
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setStatus('Введите код приглашения.');
      return;
    }
    setJoinBusy(true);
    setStatus(null);
    try {
      let preview: { squadId: string; squadName?: string | null };
      if (hasRealToken) {
        preview = await resolveSquadByInviteCode(accessToken!, code);
      } else {
        // Dev sandbox: send X-Device-Id header, no Authorization (backend allows localhost dev)
        const params = new URLSearchParams({ code });
        const res = await fetch(`/api/squads/by-invite-code?${params.toString()}`, {
          headers: { 'X-Device-Id': deviceId! }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Код не найден');
        preview = data;
      }
      const confirmed = window.confirm(`Вступить в отряд ${preview.squadName ? `«${preview.squadName}»` : preview.squadId}?`);
      if (!confirmed) return;
      if (hasRealToken) {
        await joinSquad(accessToken!, preview.squadId);
      } else {
         const res = await fetch(`/api/squads/${encodeURIComponent(preview.squadId)}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Device-Id': deviceId! },
          body: JSON.stringify({ role })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Не удалось вступить');
      }
      setJoinCode('');
      await onRefresh();
      setStatus('Вы вступили в отряд.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Не удалось вступить в отряд по коду.');
    } finally {
      setJoinBusy(false);
    }
  };

  // Note: accessToken may be undefined in sandbox/dev mode. Component renders with available data.

  if (!squadId) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="profile-empty-state__text">Вы пока не состоите в отряде.</div>
          <div style={{ padding: 12, borderRadius: 14, background: 'rgba(8,20,40,0.45)', backdropFilter: 'blur(14px)', border: '1px solid rgba(93,228,255,0.12)' }}>
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
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', paddingBottom: 80 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Squad header */}
        <div className="fade-in" style={{ padding: '16px 18px', borderRadius: 14, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.3 }}>{squadName}</div>
          <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Смена: {shiftName}</span>
            <span style={{ fontWeight: 600, color: '#c97730', opacity: 1 }}>{mySquadInfo?.shift?.durationDays || 9} дней</span>
          </div>
        </div>

        {/* Corner info */}
        <div className="fade-in" style={{ padding: '16px 18px', borderRadius: 14, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>📋 Уголок отряда</span>
              <span className={`m3-status-chip squad-corner-readiness-chip tone-${getSquadCornerReadinessTone(cornerReadiness)}`} style={{ marginTop: 0 }}>{getSquadCornerReadinessLabel(cornerReadiness)}</span>
            </div>
            {canEditCorner && onEditCorner && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => onEditCorner('photos')}>✏️ Фото</button>
                <button type="button" className="btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => onEditCorner('planner')}>✏️ Планёрка</button>
              </div>
            )}
          </div>

          {cornerBusy && <div style={{ fontSize: 13, opacity: 0.75 }}>Загрузка…</div>}
          {cornerError && <div style={{ fontSize: 13, color: '#ff9b9b' }}>{cornerError}</div>}
          {!cornerBusy && !cornerError && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', fontSize: 13, lineHeight: 1.6 }}>
                <span style={{ opacity: 0.5, fontWeight: 500 }}>Название</span>
                <span style={{ fontWeight: 700 }}>{(corner?.name || squadName) || '—'}</span>
                <span style={{ opacity: 0.5, fontWeight: 500 }}>Девиз</span>
                <span>{corner?.motto || '—'}</span>
                <span style={{ opacity: 0.5, fontWeight: 500 }}>Кричалки</span>
                <span>{corner?.chants || '—'}</span>
                <span style={{ opacity: 0.5, fontWeight: 500 }}>Приветствие</span>
                <span>{corner?.greeting || '—'}</span>
                <span style={{ opacity: 0.5, fontWeight: 500 }}>Мемы</span>
                <span>{corner?.memes || '—'}</span>
              </div>

              {cornerPhotos.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Фото отряда</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {cornerPhotos.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setPhotoZoomUrl(p.url)}
                        style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(93,228,255,0.15)', background: 'rgba(0,0,0,0.3)', padding: 0, cursor: 'pointer' }}
                        title={p.label}
                        aria-label={`Открыть фото: ${p.label}`}
                      >
                        <img src={p.url} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Программа смены</div>
                {(() => {
                  const a = countFilledDays(corner?.planGridA);
                  const b = countFilledDays(corner?.planGridB);
                  const totalFilled = a.filled + b.filled;
                  const shiftDuration = mySquadInfo?.shift?.durationDays || a.total || 9;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                        Расписание: {totalFilled}/{shiftDuration} дней
                      </span>
                      <button type="button" className="btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => { setPlannerDay(1); setPlannerOpen(true); }}>
                        Открыть расписание
                      </button>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {/* Members */}
        <div className="fade-in" style={{ padding: '16px 18px', borderRadius: 14, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Участники <span style={{ opacity: 0.5, fontWeight: 400, fontSize: 12 }}>({members.length})</span></div>
          {members.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.65 }}>Пока пусто — пригласите друзей!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {members.map((m) => {
                const roleLabels: Record<string, string> = {
                  participant: 'Участник', traveler: 'Путешественник', counselor: 'Вожатый',
                  educator: 'Воспитатель', shift_leader: 'Начальник смены',
                  camp_director: 'Директор лагеря', developer: 'Разработчик',
                };
                const roleLabel = roleLabels[m.role] || m.role;
                return (
                  <div key={m.deviceId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{m.nickname || 'Без ника'}</span>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(93,228,255,0.12)', color: 'rgba(93,228,255,0.9)', fontWeight: 600 }}>{roleLabel}</span>
                    </div>
                    {m.deviceId === deviceId ? (
                      <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: 11, opacity: 0.7 }} onClick={() => void handleLeave()} disabled={busy}>
                        Выйти
                      </button>
                    ) : canManage ? (
                      <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => void handleKick(m.deviceId)} disabled={busy}>
                        Исключить
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invite */}
        <div className="fade-in" style={{ padding: '16px 18px', borderRadius: 14, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Пригласить в отряд</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn-secondary" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => void copyText(inviteLink, '✅ Ссылка скопирована!')}>
              📋 Копировать ссылку
            </button>
            {canManage && (
              <button type="button" className="btn-secondary" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => void handleCreateInviteCode()} disabled={busy}>
                🔑 Создать код приглашения
              </button>
            )}
          </div>
          {inviteCode && (
            <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(93,228,255,0.06)', border: '1px solid rgba(93,228,255,0.15)' }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, fontFamily: 'monospace', color: '#5de4ff' }}>{inviteCode}</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                Действует до: {inviteMeta ? new Date(inviteMeta.expiresAt).toLocaleString('ru-RU') : '—'}
              </div>
              <button type="button" className="btn-secondary" style={{ padding: '5px 10px', fontSize: 11, marginTop: 6 }} onClick={() => void copyText(inviteCode, '✅ Код скопирован!')}>
                Копировать код
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <button type="button" className="btn-secondary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => void onRefresh()} disabled={busy}>
            🔄 Обновить
          </button>
          <button type="button" className="btn-secondary" style={{ padding: '8px 16px', fontSize: 12, opacity: 0.7 }} onClick={() => void handleLeave()} disabled={busy}>
            Выйти из отряда
          </button>
        </div>

        {status && <div style={{ fontSize: 12, opacity: 0.9, textAlign: 'center' }}>{status}</div>}

        {(accessToken || (import.meta.env.DEV && deviceId)) && <SquadChat squadId={squadId} accessToken={accessToken || ''} nickname={myNickname || mySquadInfo?.membership?.nickname || undefined} deviceId={deviceId} role={role} />}

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
                <div style={{ fontSize: 14, fontWeight: 800 }}>Программа смены</div>
                <button type="button" className="btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setPlannerOpen(false)}>Закрыть</button>
              </div>
              {(() => {
                const grid = corner?.planGridA;
                const shiftLength = mySquadInfo?.shift?.durationDays || grid?.shiftLength || 9;
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
                      <div style={{ padding: 10, borderRadius: 14, background: 'rgba(8,20,40,0.45)', backdropFilter: 'blur(14px)', border: '1px solid rgba(93,228,255,0.12)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Утро</div>
                        <div style={{ fontSize: 12, opacity: 0.9, whiteSpace: 'pre-wrap' }}>{day.morning || '—'}</div>
                      </div>
                      <div style={{ padding: 10, borderRadius: 14, background: 'rgba(8,20,40,0.45)', backdropFilter: 'blur(14px)', border: '1px solid rgba(93,228,255,0.12)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Тихий час</div>
                        <div style={{ fontSize: 12, opacity: 0.9, whiteSpace: 'pre-wrap' }}>{day.quietHour || '—'}</div>
                      </div>
                      <div style={{ padding: 10, borderRadius: 14, background: 'rgba(8,20,40,0.45)', backdropFilter: 'blur(14px)', border: '1px solid rgba(93,228,255,0.12)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>День</div>
                        <div style={{ fontSize: 12, opacity: 0.9, whiteSpace: 'pre-wrap' }}>{day.day || '—'}</div>
                      </div>
                      <div style={{ padding: 10, borderRadius: 14, background: 'rgba(8,20,40,0.45)', backdropFilter: 'blur(14px)', border: '1px solid rgba(93,228,255,0.12)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Вечер</div>
                        <div style={{ fontSize: 12, opacity: 0.9, whiteSpace: 'pre-wrap' }}>{day.evening || '—'}</div>
                      </div>
                      <div style={{ padding: 10, borderRadius: 14, background: 'rgba(8,20,40,0.45)', backdropFilter: 'blur(14px)', border: '1px solid rgba(93,228,255,0.12)' }}>
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
    </div>
  );
};
