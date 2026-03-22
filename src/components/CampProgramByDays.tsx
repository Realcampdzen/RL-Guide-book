import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const getCampProgramUrl = () => {
  const base = (import.meta.env.BASE_URL || '').replace(/\/*$/, '');
  return `${base}${base ? '/' : ''}ai-data/camp-program-template.json`;
};

const getApiBase = () => {
  if (typeof window === 'undefined') return '';
  const h = window.location.hostname;
  return (import.meta.env.DEV || h === 'localhost' || h === '127.0.0.1')
    ? '' : ((import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '')).replace(/\/$/, '');
};

export interface Skill4kDetail { skill: string; via: string[]; }
export interface PedagogyTech { name: string; code?: number; examples: string[]; }
export interface DayPedagogy { skills4k: Skill4kDetail[]; technologies: PedagogyTech[]; }
export interface ActivityItem { name: string; description?: string; }

export interface CampProgramDay {
  day: number;
  theme: string;
  activities: (string | ActivityItem)[];
  pedagogy?: DayPedagogy;
}

const actName = (a: string | ActivityItem): string => typeof a === 'string' ? a : a.name;
const actDesc = (a: string | ActivityItem): string => typeof a === 'string' ? '' : (a.description ?? '');

export interface CampProgramData {
  title: string;
  description: string;
  days: CampProgramDay[];
  days_9?: CampProgramDay[];
}

const SKILL_COLOR: Record<string, string> = {
  'Коммуникация': '#63b3ed',
  'Коллаборация': '#68d391',
  'Креативность': '#f6ad55',
  'Критическое мышление': '#b794f4',
};

export const CampProgramByDays: React.FC<{ defaultShiftLength?: 9 | 21 }> = ({ defaultShiftLength = 21 }) => {
  const { accessToken } = useAuth();
  const apiBase = useMemo(() => getApiBase(), []);

  const [data, setData] = useState<CampProgramData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shiftLength, setShiftLength] = useState<9 | 21>(defaultShiftLength);
  const [activeDay, setActiveDay] = useState<number>(1);
  const [teacherMode, setTeacherMode] = useState(false);

  // Sync shiftLength when prop changes (e.g. async squad data loads in parent)
  useEffect(() => {
    setShiftLength(defaultShiftLength);
    setActiveDay(1);
  }, [defaultShiftLength]);


  // Auto-detect shift length from user's squad/shift membership
  const detectShift = React.useCallback(async (token: string | null) => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const r = await fetch(`${apiBase}/api/squads/mine`, { headers });
      if (!r.ok) return;
      const res = await r.json() as { shift?: { durationDays?: number; name?: string } };
      const shift = res?.shift;
      if (!shift) return;
      let dur: 9 | 21 | null = null;
      if (shift.durationDays === 9 || shift.durationDays === 21) {
        dur = shift.durationDays;
      } else if (shift.name) {
        dur = shift.name.toLowerCase().includes('лет') ? 21 : 9;
      }
      if (dur !== null) { setShiftLength(dur); setActiveDay(1); }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  // Try on mount (works in dev/localhost without token)
  useEffect(() => { void detectShift(null); }, [detectShift]);
  // Retry when token becomes available (for production login)
  useEffect(() => { if (accessToken) void detectShift(accessToken); }, [accessToken, detectShift]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(getCampProgramUrl() + '?_=' + Date.now(), { cache: 'no-store' })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: CampProgramData) => { if (!cancelled) setData(json); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);


  const days = shiftLength === 9
    ? (data?.days_9 ?? data?.days?.slice(0, 9) ?? [])
    : (data?.days ?? []);
  const currentDay = days.find(d => d.day === activeDay) ?? days[0];
  const hasPedagogy = !!(currentDay?.pedagogy?.skills4k?.length || currentDay?.pedagogy?.technologies?.length);

  return (
    <div style={{ fontFamily: 'inherit', color: '#fff' }}>

      {/* Шапка */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 16px 0', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
            Программа смены
          </div>
          {currentDay?.theme && (
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fde68a', marginTop: 2 }}>
              День {activeDay}: {currentDay.theme}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          {/* Режим педагога */}
          {hasPedagogy && (
            <button type="button" onClick={() => setTeacherMode(v => !v)} style={{
              padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: 'none', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
              background: teacherMode ? 'rgba(154,230,180,0.25)' : 'rgba(255,255,255,0.1)',
              color: teacherMode ? '#68d391' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.15s',
            }}>
              🎓 {teacherMode ? 'Педагог ✓' : 'Педагог'}
            </button>
          )}
          {/* Переключатель длины смены */}
          {([21, 9] as const).map(n => (
            <button key={n} type="button" onClick={() => { setShiftLength(n); setActiveDay(1); }} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: 'none', fontFamily: 'inherit',
              background: shiftLength === n ? 'rgba(199,119,48,0.5)' : 'rgba(255,255,255,0.1)',
              color: shiftLength === n ? '#fde68a' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.15s',
            }}>
              {n} дней
            </button>
          ))}
        </div>
      </div>

      {/* Закладки дней */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '10px 16px 0', alignItems: 'flex-end' }}>
        {days.map(d => {
          const isActive = d.day === activeDay;
          return (
            <button key={d.day} type="button" onClick={() => setActiveDay(d.day)} style={{
              padding: '6px 12px 5px', fontSize: 12, fontWeight: isActive ? 700 : 500,
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
              border: isActive ? '2px solid rgba(199,119,48,0.85)' : '1.5px solid rgba(255,255,255,0.18)',
              borderBottom: 'none', borderRadius: '10px 10px 0 0',
              background: isActive
                ? 'linear-gradient(160deg, rgba(199,119,48,0.45) 0%, rgba(120,53,15,0.55) 100%)'
                : 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              color: isActive ? '#fde68a' : 'rgba(255,255,255,0.7)',
              boxShadow: isActive ? '0 -3px 10px rgba(199,119,48,0.18)' : 'none',
              transition: 'color 0.14s, background 0.14s, box-shadow 0.14s',
              position: 'relative', top: isActive ? 2 : 0,
            }}>
              {d.day}
            </button>
          );
        })}
      </div>

      {/* Линия под табами */}
      <div style={{ height: 2, margin: '0 16px', background: 'linear-gradient(to right, rgba(199,119,48,0.6), transparent 85%)', borderRadius: 2 }} />

      {loading && <p style={{ opacity: 0.5, margin: '14px 16px', fontSize: 13 }}>Загрузка…</p>}
      {error && <p style={{ color: '#f59e0b', margin: '14px 16px', fontSize: 13 }}>⚠️ {error}</p>}

      {/* Канбан-сетка карточек + педагогика рядом */}
      {!loading && !error && currentDay && (
        <div style={{ display: 'flex', gap: 0, padding: '12px 16px 20px' }}>

          {/* Карточки активностей */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
            flex: 1,
          }}>
            {currentDay.activities.map((activity, i) => {
              const name = actName(activity);
              const desc = actDesc(activity);
              return (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', gap: 6,
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14, padding: '10px 14px',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 2, color: 'rgba(253,230,138,0.7)' }}>✦</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.95)', lineHeight: 1.45, fontWeight: 700 }}>
                      {name}
                    </span>
                  </div>
                  {desc && (
                    <div style={{
                      fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6,
                      paddingLeft: 24, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 6,
                    }}>
                      {desc}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Педагогический попап-сайдбар */}
          {teacherMode && hasPedagogy && currentDay.pedagogy && (
            <div style={{
              width: 280, flexShrink: 0, marginLeft: 14,
              background: 'rgba(20,30,50,0.75)',
              backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(154,230,180,0.2)',
              borderRadius: 18, padding: '16px 18px',
              display: 'flex', flexDirection: 'column', gap: 16,
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: '#68d391', textTransform: 'uppercase' }}>
                🎓 Педагогический разбор
              </div>

              {/* 4К навыки */}
              {currentDay.pedagogy.skills4k.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    🎯 4К-навыки дня
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {currentDay.pedagogy.skills4k.map((s, i) => {
                      const color = SKILL_COLOR[s.skill] ?? 'rgba(255,255,255,0.6)';
                      return (
                        <div key={i} style={{ borderLeft: `2px solid ${color}60`, paddingLeft: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 3 }}>{s.skill}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                            {s.via.join(' · ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Педагогические технологии */}
              {currentDay.pedagogy.technologies.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    🧩 Педтехнологии
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {currentDay.pedagogy.technologies.map((t, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 2 }}>
                          {t.name}{t.code ? <span style={{ opacity: 0.45, fontWeight: 400 }}> (#{t.code})</span> : null}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                          {t.examples.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
