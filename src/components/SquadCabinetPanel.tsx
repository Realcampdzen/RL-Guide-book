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

const isImageAvatar = (value?: string | null): boolean => Boolean(
  value && (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/'))
);

interface SquadCabinetPanelProps {
  role: string;
  deviceId?: string;
  accessToken?: string;
  myNickname?: string;
  mySquadInfo: SquadMineResponse | null;
  onRefresh: () => Promise<void> | void;
  onAfterLeave?: () => void;
  onShowHint?: (opts: { title: string; content: string }) => void;
  onEditCorner?: (targetTab?: 'photos' | 'planner' | 'squad') => void;
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
    const fallback: Array<{ deviceId: string; nickname: string | null; role: string; joinedAt?: string; avatarUrl?: string | null }> = [];
    const myDeviceId = mySquadInfo?.membership?.deviceId || deviceId || '';
    const myAvatarUrl = userData?.profile?.avatar || null;

    // Use mySquadInfo.members (has role) if available
    const membersData = mySquadInfo?.members;
    if (membersData && membersData.length > 0) {
      for (const m of membersData) {
        if (!m?.deviceId) continue;
        fallback.push({ deviceId: m.deviceId, nickname: m.nickname || null, role: m.role || 'participant', joinedAt: m.joinedAt, avatarUrl: m.avatarUrl || null });
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
      fallback.push({ deviceId: p.deviceId, nickname: p.nickname || null, role: 'participant', joinedAt: p.joinedAt, avatarUrl: p.avatarUrl || null });
    }

    // Final pass: ensure current user always has the correct nickname and avatar from profile
    if (myDeviceId || myNickname) {
      for (const m of fallback) {
        if ((myDeviceId && m.deviceId === myDeviceId) || (myNickname && m.nickname === myNickname)) {
          if (myNickname) m.nickname = myNickname;
          if (myAvatarUrl) m.avatarUrl = myAvatarUrl;
        }
      }
    }

    return fallback;
  }, [mySquadInfo, myNickname, deviceId, userData?.profile?.avatar]);

  const inviteLink = useMemo(() => {
    if (!squadId || typeof window === 'undefined') return '';
    const appUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '');
    const base = appUrl ?? (window.location.origin + (import.meta.env.BASE_URL ?? '/').replace(/\/$/, ''));
    return `${base}/?join_squad=${encodeURIComponent(squadId)}`;
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
    const hasDeviceId = !!deviceId;
    if (!hasRealToken && !hasDeviceId) {
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
      // Build fallback headers for non-JWT auth (developer dev-pin)
      const fallbackHeaders: Record<string, string> = {};
      if (deviceId) fallbackHeaders['X-Device-Id'] = deviceId;
      try { const pin = localStorage.getItem('rl-dev-pin'); if (pin) fallbackHeaders['X-Dev-Pin'] = pin; } catch {}
      const apiBase = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

      let preview: { squadId: string; squadName?: string | null };
      if (hasRealToken) {
        preview = await resolveSquadByInviteCode(accessToken!, code);
      } else {
        const params = new URLSearchParams({ code });
        const res = await fetch(`${apiBase}/api/squads/by-invite-code?${params.toString()}`, {
          headers: fallbackHeaders
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
        const res = await fetch(`${apiBase}/api/squads/${encodeURIComponent(preview.squadId)}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...fallbackHeaders },
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
      <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="profile-empty-state__text">Вы пока не состоите в отряде.</div>
          <div className="cab-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#e8f0ff' }}>Вступить по коду</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setStatus(null); }}
                placeholder="Введите код приглашения"
                className="cab-input"
                style={{ flex: 1, minWidth: 180, padding: '10px 14px', fontSize: 14 }}
              />
              <button type="button" className="cab-btn-accent" style={{ padding: '8px 18px', fontSize: 14 }} onClick={() => void handleJoinByCode()} disabled={joinBusy}>
                {joinBusy ? 'Проверка...' : 'Вступить'}
              </button>
            </div>
          </div>
          {status && <div style={{ fontSize: 12, opacity: 0.9 }}>{status}</div>}
        </div>
      </div>
    );
  }

  const squadPhotoUrl = cornerPhotos.find(p => p.key === 'photoSquad')?.url || cornerPhotos[0]?.url;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Squad header */}
        <div className="fade-in cab-card" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '24px 28px' }}>
          {squadPhotoUrl ? (
            <div style={{ width: 80, height: 80, borderRadius: 20, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
              <img src={squadPhotoUrl} alt="Squad" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
              🚀
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, background: 'linear-gradient(90deg, #ffffff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {squadName}
            </div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>Смена: {shiftName}</span>
              <span style={{ fontWeight: 700, color: '#fbbf24', padding: '4px 8px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: 8 }}>
                {mySquadInfo?.shift?.durationDays || 9} дней
              </span>
            </div>
          </div>
        </div>

        {/* Corner info */}
        <div className="fade-in cab-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Уголок отряда</span>
              <span className={`m3-status-chip squad-corner-readiness-chip tone-${getSquadCornerReadinessTone(cornerReadiness)}`} style={{ marginTop: 0 }}>{getSquadCornerReadinessLabel(cornerReadiness)}</span>
            </div>
            {canEditCorner && onEditCorner && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" style={{
                  padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: '#fff', letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(79,70,229,0.4)',
                }} onClick={() => onEditCorner('squad')}>Отряд</button>
                <button type="button" style={{
                  padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #0891b2, #0e7490)',
                  color: '#fff', letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(8,145,178,0.4)',
                }} onClick={() => onEditCorner('photos')}>Фото</button>
                <button type="button" style={{
                  padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  color: '#fff', letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(5,150,105,0.4)',
                }} onClick={() => onEditCorner('planner')}>Планёрка</button>
              </div>
            )}
          </div>

          {cornerBusy && <div style={{ fontSize: 13, opacity: 0.75 }}>Загрузка…</div>}
          {cornerError && <div style={{ fontSize: 13, color: '#ff9b9b' }}>{cornerError}</div>}
          {!cornerBusy && !cornerError && (
            <>
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 8 
              }}>
                {[
                  { label: 'Название', value: (corner?.name || squadName) },
                  { label: 'Девиз', value: corner?.motto },
                  { label: 'Кричалки', value: corner?.chants },
                  { label: 'Приветствие', value: corner?.greeting },
                  { label: 'Мемы', value: corner?.memes }
                ].map((prop, idx) => (
                  <div key={idx} style={{ 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    border: '1px solid rgba(255, 255, 255, 0.05)', 
                    borderRadius: 16, padding: '12px 16px' 
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                      {prop.label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f0ff', lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {prop.value || '—'}
                    </div>
                  </div>
                ))}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                        Расписание: <span style={{ color: '#fbbf24' }}>{totalFilled}/{shiftDuration}</span> дней
                      </span>
                      <button type="button" className="cab-btn-accent" style={{ padding: '8px 16px', fontSize: 12, borderRadius: 12, boxShadow: '0 4px 12px rgba(93, 228, 255, 0.15)' }} onClick={() => { setPlannerDay(1); setPlannerOpen(true); }}>
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
        <div className="fade-in cab-card">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Участники <span style={{ opacity: 0.5, fontWeight: 400, fontSize: 12 }}>({members.length})</span></div>
          {members.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.65 }}>Пока пусто — пригласите друзей!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 200, overflowY: 'auto' }}>
              {members.map((m) => {
                const roleLabels: Record<string, string> = {
                  participant: 'Участник', traveler: 'Путешественник', counselor: 'Вожатый',
                  educator: 'Воспитатель', shift_leader: 'Начальник смены',
                  camp_director: 'Директор лагеря', developer: 'Разработчик',
                  parent: 'Родитель',
                };
                const roleLabel = roleLabels[m.role] || m.role;
                const isCounselor = m.role === 'counselor' || m.role === 'shift_leader' || m.role === 'developer';
                const initial = (m.nickname || 'Б')[0].toUpperCase();

                return (
                  <div key={m.deviceId} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, 
                    padding: '12px 16px', 
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.04)',
                    marginBottom: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {m.avatarUrl && isImageAvatar(m.avatarUrl) ? (
                        <div style={{ 
                          width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', 
                          border: `1px solid ${isCounselor ? 'rgba(244,114,182,0.3)' : 'rgba(93,228,255,0.2)'}`,
                          flexShrink: 0
                        }}>
                          <img src={m.avatarUrl} alt={m.nickname || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : m.avatarUrl ? (
                        <div style={{ 
                          width: 40, height: 40, borderRadius: '50%', 
                          background: isCounselor ? 'linear-gradient(135deg, rgba(244,114,182,0.2), rgba(251,146,60,0.2))' : 'linear-gradient(135deg, rgba(93,228,255,0.15), rgba(165,180,252,0.15))',
                          border: `1px solid ${isCounselor ? 'rgba(244,114,182,0.3)' : 'rgba(93,228,255,0.2)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: 18, color: isCounselor ? '#fdf2f8' : '#e8f0ff',
                          flexShrink: 0
                        }}>
                          {m.avatarUrl}
                        </div>
                      ) : (
                        <div style={{ 
                          width: 40, height: 40, borderRadius: '50%', 
                          background: isCounselor ? 'linear-gradient(135deg, rgba(244,114,182,0.2), rgba(251,146,60,0.2))' : 'linear-gradient(135deg, rgba(93,228,255,0.15), rgba(165,180,252,0.15))',
                          border: `1px solid ${isCounselor ? 'rgba(244,114,182,0.3)' : 'rgba(93,228,255,0.2)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: 16, fontWeight: 800, color: isCounselor ? '#fdf2f8' : '#e8f0ff',
                          flexShrink: 0
                        }}>
                          {initial}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#e8f0ff' }}>{m.nickname || 'Без ника'}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: isCounselor ? '#f472b6' : '#60a5fa', textTransform: 'uppercase', letterSpacing: 0.5 }}>{roleLabel}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {m.deviceId === deviceId ? (
                        <button type="button" style={{
                          padding: '6px 14px', fontSize: 12, fontWeight: 700, borderRadius: 10, border: 'none', cursor: busy ? 'default' : 'pointer',
                          background: busy ? '#7f1d1d' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                          color: '#fff', boxShadow: busy ? 'none' : '0 2px 8px rgba(220,38,38,0.45)',
                          opacity: busy ? 0.6 : 1,
                        }} onClick={() => void handleLeave()} disabled={busy}>
                          Выйти
                        </button>
                      ) : canManage ? (
                        <button type="button" style={{
                          padding: '6px 14px', fontSize: 12, fontWeight: 700, borderRadius: 10, border: 'none', cursor: busy ? 'default' : 'pointer',
                          background: busy ? '#78350f' : 'linear-gradient(135deg, #d97706, #b45309)',
                          color: '#fff', boxShadow: busy ? 'none' : '0 2px 8px rgba(217,119,6,0.45)',
                          opacity: busy ? 0.6 : 1,
                        }} onClick={() => void handleKick(m.deviceId)} disabled={busy}>
                          Исключить
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invite */}
        <div className="fade-in cab-card">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Пригласить в отряд</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
              color: '#fff', boxShadow: '0 2px 8px rgba(29,78,216,0.4)',
            }} onClick={() => void copyText(inviteLink, 'Ссылка скопирована!')}>
              Ссылка
            </button>
            {canManage && (
              <button type="button" style={{
                padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 10, border: 'none', cursor: busy ? 'default' : 'pointer',
                background: busy ? '#1e3a5f' : 'linear-gradient(135deg, #0891b2, #0e7490)',
                color: '#fff', boxShadow: busy ? 'none' : '0 2px 8px rgba(8,145,178,0.4)',
                opacity: busy ? 0.6 : 1,
              }} onClick={() => void handleCreateInviteCode()} disabled={busy}>
                Создать код
              </button>
            )}
          </div>
          {inviteCode && (
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(93,228,255,0.06)', border: '1px solid rgba(93,228,255,0.15)' }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, fontFamily: 'monospace', color: '#5de4ff' }}>{inviteCode}</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                Действует до: {inviteMeta ? new Date(inviteMeta.expiresAt).toLocaleString('ru-RU') : '—'}
              </div>
              <button type="button" style={{
                  padding: '6px 12px', fontSize: 11, fontWeight: 700, marginTop: 10, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                  color: '#fff', boxShadow: '0 2px 6px rgba(29,78,216,0.4)',
                }} onClick={() => void copyText(inviteCode, 'Код скопирован!')}>
                Скопировать код
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', marginTop: 12 }}>
          <button type="button" style={{
            padding: '10px 20px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', cursor: busy ? 'default' : 'pointer',
            background: busy ? '#1e3a5f' : 'linear-gradient(135deg, #1d4ed8, #1e40af)',
            color: '#fff', boxShadow: busy ? 'none' : '0 4px 14px rgba(29,78,216,0.4)',
            opacity: busy ? 0.6 : 1,
          }} onClick={() => void onRefresh()} disabled={busy}>
            Обновить
          </button>
          <button type="button" style={{
            padding: '10px 20px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', cursor: busy ? 'default' : 'pointer',
            background: busy ? '#7f1d1d' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
            color: '#fff', boxShadow: busy ? 'none' : '0 4px 14px rgba(220,38,38,0.45)',
            opacity: busy ? 0.6 : 1,
          }} onClick={() => void handleLeave()} disabled={busy}>
            Выйти из отряда
          </button>
        </div>

        {status && <div style={{ fontSize: 12, opacity: 0.9, textAlign: 'center' }}>{status}</div>}

        {(accessToken || (import.meta.env.DEV && deviceId)) && <SquadChat squadId={squadId} accessToken={accessToken || ''} nickname={myNickname || mySquadInfo?.membership?.nickname || undefined} deviceId={deviceId} role={role} members={members} />}

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e8f0ff', margin: 0 }}>Программа смены</h3>
                <button type="button" style={{
                  padding: '6px 10px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #374151, #1f2937)',
                  color: '#9ca3af', boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }} onClick={() => setPlannerOpen(false)}>Закрыть</button>
              </div>
              {(() => {
                const grid = corner?.planGridA;
                const shiftLength = mySquadInfo?.shift?.durationDays || grid?.shiftLength || 9;
                const dayKeys = Array.from({ length: shiftLength }, (_, i) => i + 1);
                const day = (grid?.days || {})[String(plannerDay)] || {};
                return (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {dayKeys.map((d) => (
                        <button key={d} type="button" style={{
                          padding: '6px 12px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: plannerDay === d ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'rgba(255,255,255,0.07)',
                          color: plannerDay === d ? '#fff' : 'rgba(255,255,255,0.55)',
                          boxShadow: plannerDay === d ? '0 2px 8px rgba(124,58,237,0.45)' : 'none',
                          transition: 'all 0.15s',
                        }} onClick={() => setPlannerDay(d)}>
                          День {d}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#e0d4ff' }}>Утро</div>
                        <div style={{ fontSize: 13, opacity: 0.8, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{day.morning || '—'}</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#e0d4ff' }}>Тихий час</div>
                        <div style={{ fontSize: 13, opacity: 0.8, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{day.quietHour || '—'}</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#e0d4ff' }}>День</div>
                        <div style={{ fontSize: 13, opacity: 0.8, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{day.day || '—'}</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#e0d4ff' }}>Вечер</div>
                        <div style={{ fontSize: 13, opacity: 0.8, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{day.evening || '—'}</div>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#e0d4ff' }}>Ночь</div>
                        <div style={{ fontSize: 13, opacity: 0.8, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{day.night || '—'}</div>
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
