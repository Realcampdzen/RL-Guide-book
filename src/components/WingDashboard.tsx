import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useUserProgress } from '../hooks/useUserProgress';
import type { WingPlanGridData } from '../types/userProgress';
import { requestImageGenerate } from '../utils/imageGenerateApi';
import { ImageSourceBlock } from './ImageSourceBlock';

const isImageUrl = (s: string | undefined) => s && (s.startsWith('data:') || s.startsWith('http'));

const defaultWingPlanGrid = (): WingPlanGridData => ({ shiftLength: 21, days: {} });
const cloneWingPlanGrid = (grid?: WingPlanGridData): WingPlanGridData => {
  if (!grid) return defaultWingPlanGrid();
  const days: WingPlanGridData['days'] = {};
  Object.entries(grid.days || {}).forEach(([day, value]) => {
    if (!value || typeof value !== 'object') return;
    const morning = (value.morning || '').trim() || undefined;
    const quietHour = (value.quietHour || '').trim() || undefined;
    const dayText = (value.day || '').trim() || undefined;
    const evening = (value.evening || '').trim() || undefined;
    const night = (value.night || '').trim() || undefined;
    if (morning || quietHour || dayText || evening || night)
      days[day] = { morning, quietHour, day: dayText, evening, night };
  });
  return { shiftLength: grid.shiftLength === 9 ? 9 : 21, days };
};

interface WingDashboardProps {
  onSuggestInitiative?: () => void;
  variant?: 'default' | 'cabin';
}

export const WingDashboard: React.FC<WingDashboardProps> = ({
  onSuggestInitiative,
  variant = 'default',
}) => {
  const { userData, setWingAvatar, setWingName, selectWingMentor, updateBroWingPlans } =
    useUserProgress();
  const { accessToken, deviceId } = useAuth();
  const [showInitForm, setShowInitForm] = useState(false);
  const [inviteCopied, setInviteCopied] = useState<'link' | 'code' | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [activePlannerGrid, _setActivePlannerGrid] = useState<'wingPlanGridA' | 'wingPlanGridB'>(
    'wingPlanGridA'
  );
  const [plannerDay, setPlannerDay] = useState(1);
  const [plannerSaved, setPlannerSaved] = useState(false);
  const bro = userData.broProgress;
  const hasWing = !!bro?.wingId;
  const isFullBro = bro?.isBro ?? false;
  const wingName = (bro?.wingName || '').trim() || 'Моё Крыло';
  const [localWingPlanGridA, setLocalWingPlanGridA] = useState<WingPlanGridData>(() =>
    cloneWingPlanGrid(bro?.wingPlanGridA)
  );
  const [localWingPlanGridB, setLocalWingPlanGridB] = useState<WingPlanGridData>(() =>
    cloneWingPlanGrid(bro?.wingPlanGridB)
  );
  const showWingPlanner = variant === 'cabin';
  const currentWingPlanGrid =
    activePlannerGrid === 'wingPlanGridA' ? localWingPlanGridA : localWingPlanGridB;
  const setCurrentWingPlanGrid =
    activePlannerGrid === 'wingPlanGridA' ? setLocalWingPlanGridA : setLocalWingPlanGridB;
  const plannerDayKeys = useMemo(
    () => Array.from({ length: currentWingPlanGrid.shiftLength }, (_, index) => index + 1),
    [currentWingPlanGrid.shiftLength]
  );
  const plannerDayData = currentWingPlanGrid.days[String(plannerDay)] || {};

  useEffect(() => {
    setLocalWingPlanGridA(cloneWingPlanGrid(userData.broProgress?.wingPlanGridA));
    setLocalWingPlanGridB(cloneWingPlanGrid(userData.broProgress?.wingPlanGridB));
    setPlannerSaved(false);
  }, [userData.broProgress?.wingPlanGridA, userData.broProgress?.wingPlanGridB]);

  useEffect(() => {
    if (plannerDay <= currentWingPlanGrid.shiftLength) return;
    setPlannerDay(currentWingPlanGrid.shiftLength);
  }, [plannerDay, currentWingPlanGrid.shiftLength]);

  useEffect(() => {
    if (!plannerSaved) return;
    const timeoutId = window.setTimeout(() => setPlannerSaved(false), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [plannerSaved]);

  const setPlannerShiftLength = (nextLength: 9 | 21) => {
    setPlannerSaved(false);
    setCurrentWingPlanGrid((prev) => {
      const days = { ...prev.days };
      if (nextLength === 9) {
        for (let day = 10; day <= 21; day += 1) delete days[String(day)];
      }
      return { shiftLength: nextLength, days };
    });
    if (plannerDay > nextLength) setPlannerDay(nextLength);
  };

  const setPlannerField = (
    field: 'morning' | 'quietHour' | 'day' | 'evening' | 'night',
    value: string
  ) => {
    const dayKey = String(plannerDay);
    setPlannerSaved(false);
    setCurrentWingPlanGrid((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...(prev.days[dayKey] || {}),
          [field]: value.trim() ? value : undefined,
        },
      },
    }));
  };

  const saveWingPlans = () => {
    updateBroWingPlans({
      wingPlanGridA: localWingPlanGridA,
      wingPlanGridB: localWingPlanGridB,
    });
    setPlannerSaved(true);
  };

  if (!hasWing) {
    return (
      <div
        className="fade-in cab-card"
        style={{
          width: '100%',
          padding: '28px 32px',
          borderRadius: 20,
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            background: '#8b00ff',
            filter: 'blur(60px)',
            opacity: 0.2,
          }}
        />
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 4,
          }}
        >
          ШТАБ КРЫЛА
        </div>
        <div className="profile-empty-state profile-empty-state--squads" style={{ marginTop: 24 }}>
          <div className="profile-empty-state__icon" aria-hidden>
            🦅
          </div>
          <p className="profile-empty-state__title">Твоё Крыло</p>
          <p className="profile-empty-state__text" style={{ maxWidth: 400, margin: '0 auto 24px' }}>
            Сформируй Крыло, чтобы добавлять фото аватара, участвовать в делах наставников и
            предлагать инициативы в Совет лагеря.
          </p>
          <button
            type="button"
            className="cab-btn-accent"
            onClick={() => selectWingMentor('', 'Моё Крыло')}
            style={{ fontSize: 15, padding: '14px 28px' }}
          >
            Сформировать Крыло
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fade-in cab-card${variant === 'cabin' ? ' bro-cabin-section' : ''}`}
      style={{
        width: '100%',
        padding: isExpanded ? '28px 32px' : '20px 24px',
        borderRadius: 20,
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '150px',
          height: '150px',
          background: '#8b00ff',
          filter: 'blur(60px)',
          opacity: 0.2,
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isExpanded ? 24 : 0,
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 6,
            }}
          >
            {isFullBro ? 'ТВОЕ КРЫЛО (ШТАБ)' : 'КРЫЛО (КАНДИДАТ)'}
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: isExpanded ? 22 : 18,
              fontWeight: 700,
              color: '#e8f0ff',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            🦅 {wingName}
            {!isExpanded && (
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                — {isFullBro ? 'БРО-НАСТАВНИК' : 'ПРОХОЖДЕНИЕ'}
              </span>
            )}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isExpanded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingName(true);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
              aria-label="Переименовать Крыло"
              title="Переименовать Крыло"
            >
              Изменить название
            </button>
          )}
          {isExpanded && (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                flexShrink: 0,
                background: 'linear-gradient(135deg, #222 50%, #8b00ff 50%)',
                border: '2px solid rgba(255,255,255,0.15)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
              title="Крыло Наставника"
            />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 24,
              cursor: 'pointer',
              padding: '0 4px',
              transform: isExpanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.3s ease',
            }}
          >
            ▾
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '12px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px', opacity: 0.7 }}>
                АВАТАР КРЫЛА
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.05)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    flexShrink: 0,
                  }}
                >
                  {bro?.wingAvatar && isImageUrl(bro.wingAvatar) ? (
                    <img
                      src={bro.wingAvatar}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        opacity: 0.5,
                      }}
                    >
                      🦅
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '16px',
              }}
            >
              <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '4px' }}>НАСТАВНИК</div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                👑 Степан И.{' '}
                <span
                  style={{
                    fontSize: '10px',
                    background: '#000',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid #333',
                  }}
                >
                  BLACK
                </span>
              </div>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '16px',
              }}
            >
              <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '4px' }}>СТАТУС</div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '14px',
                  color: isFullBro ? '#38ef7d' : '#ffd700',
                }}
              >
                {isFullBro ? 'БРО-НАСТАВНИК' : 'ПРОХОЖДЕНИЕ'}
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', opacity: 0.6 }}>
              АВАТАР КРЫЛА
            </div>
            <ImageSourceBlock
              context="wing_avatar"
              value={bro?.wingAvatar ?? null}
              onChange={setWingAvatar}
              aspect="square"
              onGenerate={async (opts) =>
                requestImageGenerate(
                  { mode: 'generate', context: 'wing', prompt: opts.prompt ?? '' },
                  accessToken ?? null
                )
              }
              onProcess={async (imageBase64, opts) =>
                requestImageGenerate(
                  { mode: 'process', context: 'wing', imageBase64, prompt: opts?.prompt ?? '' },
                  accessToken ?? null
                )
              }
            />
          </div>

          {isEditingName && (
            <div
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 16,
                padding: '20px 24px',
                marginBottom: 20,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 12,
                  color: 'rgba(255,255,255,0.85)',
                  textTransform: 'uppercase',
                }}
              >
                Название Крыла
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  defaultValue={wingName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = (e.target as HTMLInputElement).value;
                      setWingName(value);
                      setIsEditingName(false);
                    }
                    if (e.key === 'Escape') {
                      setIsEditingName(false);
                    }
                  }}
                  placeholder="Например: Небесные Стражи"
                  className="cab-input"
                  style={{ flex: 1, padding: '12px 14px', fontSize: 14 }}
                  aria-label="Название Крыла"
                  autoFocus
                />
                <button
                  type="button"
                  className="cab-btn-accent-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const input = e.currentTarget.parentElement?.querySelector(
                      'input'
                    ) as HTMLInputElement | null;
                    setWingName(input?.value ?? wingName);
                    setIsEditingName(false);
                  }}
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingName(false);
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* Invite block */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '16px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 10,
                opacity: 0.6,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              ПРИГЛАСИТЬ В КРЫЛО
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('wing', bro?.wingId || '');
                  void navigator.clipboard.writeText(url.toString());
                  setInviteCopied('link');
                  setTimeout(() => setInviteCopied(null), 2500);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: '1px solid rgba(6,182,212,0.4)',
                  background:
                    'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(124,58,237,0.15) 100%)',
                  color: '#67e8f9',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {inviteCopied === 'link' ? '✓ Сохранено' : '📋 Копировать ссылку'}
              </button>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(bro?.wingId || '');
                  setInviteCopied('code');
                  setTimeout(() => setInviteCopied(null), 2500);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >
                {inviteCopied === 'code' ? '✓ Скопировано' : '🔑 Копировать код'}
              </button>
            </div>
            {bro?.wingId && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                Код Крыла:{' '}
                <span style={{ fontFamily: 'monospace', color: '#a78bfa' }}>{bro.wingId}</span>
              </div>
            )}
          </div>

          {showWingPlanner && (
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.1)',
                paddingTop: '16px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 12,
                  opacity: 0.6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                ПЛАНИРОВАНИЕ СМЕНЫ КРЫЛА
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Grid selector + shift length */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {([9, 21] as const).map((len) => {
                    const isActive = currentWingPlanGrid.shiftLength === len;
                    return (
                      <button
                        key={len}
                        type="button"
                        onClick={() => setPlannerShiftLength(len)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 10,
                          fontFamily: 'inherit',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: `1px solid ${isActive ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.12)'}`,
                          background: isActive ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                          color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {len} дней
                      </button>
                    );
                  })}
                </div>
                {/* Day selector */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {plannerDayKeys.map((day) => {
                    const isActive = plannerDay === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setPlannerDay(day)}
                        style={{
                          width: 36,
                          height: 32,
                          borderRadius: 8,
                          fontFamily: 'inherit',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: `1px solid ${isActive ? 'rgba(201,184,255,0.7)' : 'rgba(255,255,255,0.08)'}`,
                          background: isActive ? 'rgba(139,0,255,0.3)' : 'rgba(255,255,255,0.03)',
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                {/* Time slots */}
                {(['morning', 'quietHour', 'day', 'evening', 'night'] as const).map((field) => {
                  const labels: Record<string, string> = {
                    morning: 'Утро',
                    quietHour: 'Тихий час',
                    day: 'День',
                    evening: 'Вечер',
                    night: 'Ночь',
                  };
                  return (
                    <textarea
                      key={field}
                      placeholder={labels[field]}
                      value={(plannerDayData as any)[field] ?? ''}
                      onChange={(e) => setPlannerField(field, e.target.value)}
                      rows={2}
                      className="cab-input"
                      style={{
                        padding: '12px 14px',
                        fontSize: 13,
                        resize: 'vertical',
                      }}
                    />
                  );
                })}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button type="button" className="cab-btn-accent-sm" onClick={saveWingPlans}>
                    Сохранить
                  </button>
                  {plannerSaved && (
                    <span style={{ fontSize: 12, color: '#c4b5fd' }} role="status">
                      Сохранено ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {(true || onSuggestInitiative) && (
            <WingInitiationSection
              deviceId={deviceId || undefined}
              accessToken={accessToken || undefined}
              onSuggestInitiative={onSuggestInitiative}
              showInitForm={showInitForm}
              setShowInitForm={setShowInitForm}
            />
          )}
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// WingInitiationSection — Squad Initiation management from Wing
// ---------------------------------------------------------------------------

interface InitTask {
  id: string;
  title: string;
  description: string;
}

interface WingInitiationSectionProps {
  deviceId?: string;
  accessToken?: string;
  onSuggestInitiative?: () => void;
  showInitForm: boolean;
  setShowInitForm: (v: boolean) => void;
}

interface SquadInitiation {
  id: string;
  name: string;
  description?: string;
  status: string;
  customTasks?: { id: string; title: string; description?: string }[];
  createdAt: string;
}

const WingInitiationSection: React.FC<WingInitiationSectionProps> = ({
  deviceId,
  accessToken,
  onSuggestInitiative,
  showInitForm,
  setShowInitForm,
}) => {
  const { activeTeam } = useTeam();
  const squadId = activeTeam?.squadId || activeTeam?.id;
  const [initiations, setInitiations] = useState<SquadInitiation[]>([]);
  const [initName, setInitName] = useState('');
  const [initDesc, setInitDesc] = useState('');
  const [initTasks, setInitTasks] = useState<InitTask[]>([
    { id: 'si_1', title: '', description: '' },
  ]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const headers = useMemo((): Record<string, string> => {
    if (accessToken)
      return { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    if (deviceId) return { 'Content-Type': 'application/json', 'X-Device-Id': deviceId };
    return { 'Content-Type': 'application/json' };
  }, [accessToken, deviceId]);

  const loadInitiations = useCallback(async () => {
    if (!squadId) return;
    try {
      const res = await fetch(`/api/wing/initiations?squad_id=${encodeURIComponent(squadId)}`);
      const data = await res.json().catch(() => ({ initiations: [] }));
      setInitiations(data.initiations || []);
    } catch {
      /* silent */
    }
  }, [squadId]);

  useEffect(() => {
    void loadInitiations();
  }, [loadInitiations]);

  const handleCreate = async () => {
    if (!squadId || !initName.trim()) return;
    const tasks = initTasks
      .filter((t) => t.title.trim())
      .map((t, i) => ({
        id: t.id,
        title: t.title.trim(),
        description: t.description.trim(),
        order: i + 1,
      }));
    if (tasks.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/wing/initiations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          squadId,
          name: initName.trim(),
          description: initDesc.trim(),
          tasks,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Ошибка');
      }
      setShowInitForm(false);
      setInitName('');
      setInitDesc('');
      setInitTasks([{ id: `si_${Date.now().toString(36)}`, title: '', description: '' }]);
      setToast('Посвящение создано!');
      setTimeout(() => setToast(null), 3000);
      void loadInitiations();
    } catch (e: any) {
      setToast(e.message || 'Ошибка');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm('Завершить посвящение?')) return;
    setBusy(true);
    try {
      await fetch(`/api/wing/initiations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action: 'complete' }),
      });
      void loadInitiations();
    } catch {
      /* silent */
    } finally {
      setBusy(false);
    }
  };

  const activeInits = initiations.filter((i) => i.status === 'active');
  const completedInits = initiations.filter((i) => i.status === 'completed');

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 12,
          opacity: 0.6,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Посвящения отряда
      </div>

      {onSuggestInitiative && (
        <button
          type="button"
          onClick={onSuggestInitiative}
          style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(255, 215, 0, 0.15)',
            border: '1px solid rgba(255, 215, 0, 0.5)',
            color: '#FFD700',
            borderRadius: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '12px',
            fontFamily: 'inherit',
          }}
        >
          Предложить инициативу в совет лагеря
        </button>
      )}

      {/* Active initiations */}
      {activeInits.map((init) => (
        <div
          key={init.id}
          style={{
            padding: '14px 16px',
            borderRadius: 14,
            marginBottom: 10,
            background:
              'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(88,28,195,0.08) 100%)',
            border: '1px solid rgba(124,58,237,0.2)',
          }}
        >
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#a78bfa',
                    boxShadow: '0 0 6px rgba(167,139,250,0.6)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#e0d4ff' }}>{init.name}</span>
              </div>
              {init.description && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 4,
                    paddingLeft: 16,
                  }}
                >
                  {init.description}
                </div>
              )}
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.3)',
                  marginTop: 4,
                  paddingLeft: 16,
                }}
              >
                {init.customTasks?.length || 0} заданий · с{' '}
                {new Date(init.createdAt).toLocaleDateString()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleClose(init.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                flexShrink: 0,
              }}
              disabled={busy}
            >
              Завершить
            </button>
          </div>
        </div>
      ))}

      {/* Completed initiations summary */}
      {completedInits.length > 0 && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
          Завершено посвящений: {completedInits.length}
        </div>
      )}

      {/* Create button */}
      <button
        type="button"
        onClick={() => setShowInitForm(!showInitForm)}
        style={{
          width: '100%',
          padding: '12px 20px',
          borderRadius: 10,
          border: '1px solid rgba(124,58,237,0.4)',
          background: showInitForm
            ? 'rgba(255,255,255,0.06)'
            : 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(88,28,195,0.25) 100%)',
          color: showInitForm ? 'rgba(255,255,255,0.5)' : '#c4b5fd',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: showInitForm ? 12 : 0,
          fontFamily: 'inherit',
          fontSize: 14,
          transition: 'all 0.15s',
          backdropFilter: 'blur(8px)',
        }}
      >
        {showInitForm ? 'Отмена' : 'Создать Посвящение отряда'}
      </button>

      {/* Create form */}
      {showInitForm && (
        <div
          style={{
            padding: '16px',
            borderRadius: 14,
            background: 'rgba(12, 8, 32, 0.55)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(124, 58, 237, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e0d4ff' }}>Новое Посвящение</div>

          <input
            type="text"
            value={initName}
            onChange={(e) => setInitName(e.target.value)}
            placeholder="Название (например: Посвящение в Морские Волки)"
            className="cab-input"
            style={{ padding: '12px 14px', fontSize: 13 }}
          />

          <textarea
            value={initDesc}
            onChange={(e) => setInitDesc(e.target.value)}
            placeholder="Описание / сеттинг (необязательно)"
            rows={2}
            className="cab-input"
            style={{ padding: '12px 14px', fontSize: 12, resize: 'vertical' }}
          />

          <div
            style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}
          >
            Задания
          </div>

          {initTasks.map((task, idx) => (
            <div
              key={task.id}
              style={{
                padding: '16px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 10 }}>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => {
                    const n = [...initTasks];
                    n[idx] = { ...n[idx], title: e.target.value };
                    setInitTasks(n);
                  }}
                  placeholder="Название задания"
                  style={{
                    flex: 1,
                    padding: '4px 0',
                    fontSize: 15,
                    fontWeight: 600,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontFamily: 'inherit',
                  }}
                />
                {initTasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setInitTasks(initTasks.filter((_, i) => i !== idx))}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      border: '1px solid transparent',
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                      fontSize: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s',
                    }}
                    title="Удалить"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#f87171';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
              <div
                style={{
                  height: 1,
                  background: 'rgba(255,255,255,0.05)',
                  marginLeft: 40,
                  marginBottom: 10,
                }}
              />
              <input
                type="text"
                value={task.description}
                onChange={(e) => {
                  const n = [...initTasks];
                  n[idx] = { ...n[idx], description: e.target.value };
                  setInitTasks(n);
                }}
                placeholder="Описание (необязательно)"
                style={{
                  padding: '4px 0',
                  marginLeft: 40,
                  fontSize: 13,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setInitTasks([
                ...initTasks,
                { id: `si_${Date.now().toString(36)}`, title: '', description: '' },
              ])
            }
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px dashed rgba(255,255,255,0.15)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            + Добавить задание
          </button>

          <button
            type="button"
            className="cab-btn-accent"
            onClick={handleCreate}
            disabled={busy || !initName.trim() || initTasks.every((t) => !t.title.trim())}
            style={{
              marginTop: 4,
              width: '100%',
              opacity: busy || !initName.trim() ? 0.5 : 1,
            }}
          >
            {busy ? 'Создание...' : 'Запустить Посвящение'}
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 120,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            padding: '12px 24px',
            borderRadius: 12,
            background: toast.includes('Ошибка') ? 'rgba(220,38,38,0.9)' : 'rgba(34,197,94,0.9)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};
