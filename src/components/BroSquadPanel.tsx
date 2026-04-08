import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface BroMember {
  deviceId: string;
  nickname: string;
  avatar: string;
  squadId: string;
  wingId: string;
  wingName: string;
  completedAt: string;
}

interface BroWing {
  wingId: string;
  wingName: string;
  leaderDeviceId: string;
  leaderNickname: string;
}

const isImageAvatar = (value?: string | null): boolean => Boolean(
  value && (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/'))
);

const glassCard: React.CSSProperties = {
  padding: '18px 20px', borderRadius: 16,
  background: 'rgba(15, 10, 42, 0.35)',
  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(124, 58, 237, 0.12)',
};

export const BroSquadPanel: React.FC = () => {
  const { accessToken, deviceId } = useAuth();
  const [members, setMembers] = useState<BroMember[]>([]);
  const [wings, setWings] = useState<BroWing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const headers = useMemo((): Record<string, string> => {
    const h: Record<string, string> = {};
    if (accessToken) h['Authorization'] = `Bearer ${accessToken}`;
    if (deviceId) h['X-Device-Id'] = deviceId;
    return h;
  }, [accessToken, deviceId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bro/squad', { headers });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setWings(data.wings || []);
        setTotal(data.total || 0);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div className="fade-in" style={glassCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(139,0,255,0.15))',
            border: '1px solid rgba(124,58,237,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>🦅</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#e0d4ff', letterSpacing: '-0.02em' }}>Броотряд</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Сообщество прошедших Бросвящение · {total} участник{total === 1 ? '' : total < 5 ? 'а' : 'ов'}
            </div>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
          Здесь собраны все, кто прошёл Бросвящение — независимо от отрядов и ролей. Один БРО-отряд на весь лагерь.
        </p>
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 20 }}>Загрузка…</div>
      )}

      {/* Wings */}
      {wings.length > 0 && (
        <div className="fade-in" style={glassCard}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e0d4ff', marginBottom: 12 }}>
            🦅 Крылья <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>({wings.length})</span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {wings.map(w => (
              <div key={w.wingId} style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(139,0,255,0.1))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>🦅</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd' }}>{w.wingName || 'Крыло'}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Наставник: {w.leaderNickname}</div>
                </div>
                <div style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: 'rgba(124,58,237,0.12)', color: '#a78bfa',
                }}>Код: {w.wingId.slice(0, 6)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      {!loading && (
        <div className="fade-in" style={glassCard}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e0d4ff', marginBottom: 12 }}>
            👥 Участники <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>({members.length})</span>
          </div>
          {members.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', padding: '20px 0', textAlign: 'center' }}>
              Пока никто не завершил Бросвящение.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
              {members.map(m => (
                <div key={m.deviceId} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'rgba(124,58,237,0.15)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}>
                    {m.avatar && isImageAvatar(m.avatar) ? (
                      <img src={m.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerText = m.nickname ? m.nickname[0].toUpperCase() : '👤'; }} />
                    ) : m.avatar || '👤'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f0ff' }}>{m.nickname}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                      {m.wingName ? `🦅 ${m.wingName}` : ''}
                      {m.squadId ? ` · Отряд: ${m.squadId}` : ''}
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    background: 'rgba(124,58,237,0.12)', color: '#c4b5fd',
                  }}>БРО</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
