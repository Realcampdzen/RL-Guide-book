import React, { useEffect, useMemo, useState } from 'react';
import { useUserProgress } from '../hooks/useUserProgress';
import { useAuth } from '../context/AuthContext';
import { SquadArchitect } from './SquadArchitect';
import { ImageSourceBlock } from './ImageSourceBlock';
import { requestImageGenerate } from '../utils/imageGenerateApi';
import type { WingPlanGridData } from '../types/userProgress';

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
    if (morning || quietHour || dayText || evening || night) days[day] = { morning, quietHour, day: dayText, evening, night };
  });
  return { shiftLength: grid.shiftLength === 9 ? 9 : 21, days };
};

interface WingDashboardProps {
  /** Открыть модалку «Предложить инициативу в совет лагеря» */
  onSuggestInitiative?: () => void;
  variant?: 'default' | 'cabin';
}

export const WingDashboard: React.FC<WingDashboardProps> = ({ onSuggestInitiative, variant = 'default' }) => {
  const { userData, setWingAvatar, setWingName, selectWingMentor, updateBroWingPlans } = useUserProgress();
  const { accessToken } = useAuth();
  const [showArchitect, setShowArchitect] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [activePlannerGrid, setActivePlannerGrid] = useState<'wingPlanGridA' | 'wingPlanGridB'>('wingPlanGridA');
  const [plannerDay, setPlannerDay] = useState(1);
  const [plannerSaved, setPlannerSaved] = useState(false);
  const bro = userData.broProgress;
  const hasWing = !!bro?.wingId;
  const isFullBro = bro?.isBro ?? false;
  const wingName = (bro?.wingName || '').trim() || 'Моё Крыло';
  const [localWingPlanGridA, setLocalWingPlanGridA] = useState<WingPlanGridData>(() => cloneWingPlanGrid(bro?.wingPlanGridA));
  const [localWingPlanGridB, setLocalWingPlanGridB] = useState<WingPlanGridData>(() => cloneWingPlanGrid(bro?.wingPlanGridB));
  const showWingPlanner = variant === 'cabin';
  const currentWingPlanGrid = activePlannerGrid === 'wingPlanGridA' ? localWingPlanGridA : localWingPlanGridB;
  const setCurrentWingPlanGrid = activePlannerGrid === 'wingPlanGridA' ? setLocalWingPlanGridA : setLocalWingPlanGridB;
  const plannerDayKeys = useMemo(
    () => Array.from({ length: currentWingPlanGrid.shiftLength }, (_, index) => index + 1),
    [currentWingPlanGrid.shiftLength]
  );
  const plannerDayData = currentWingPlanGrid.days[String(plannerDay)] || {};
  const activePlannerButtonStyle: React.CSSProperties = {
    background: 'rgba(255, 215, 0, 0.2)',
    borderColor: 'rgba(255, 215, 0, 0.6)',
    color: '#ffd700'
  };
  const activePlannerDayStyle: React.CSSProperties = {
    background: 'rgba(139, 0, 255, 0.3)',
    borderColor: 'rgba(201, 184, 255, 0.8)',
    color: '#fff'
  };

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

  const setPlannerField = (field: 'morning' | 'quietHour' | 'day' | 'evening' | 'night', value: string) => {
    const dayKey = String(plannerDay);
    setPlannerSaved(false);
    setCurrentWingPlanGrid((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...(prev.days[dayKey] || {}),
          [field]: value.trim() ? value : undefined
        }
      }
    }));
  };

  const saveWingPlans = () => {
    updateBroWingPlans({
      wingPlanGridA: localWingPlanGridA,
      wingPlanGridB: localWingPlanGridB
    });
    setPlannerSaved(true);
  };

  if (!hasWing) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 100%)',
        borderRadius: '24px',
        padding: '24px',
        border: '1px solid rgba(139, 0, 255, 0.3)',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-50px', right: '-50px',
          width: '150px', height: '150px', background: '#8b00ff',
          filter: 'blur(60px)', opacity: 0.2
        }} />
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#c9b8ff', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
          ШТАБ КРЫЛА
        </div>
        <div className="profile-empty-state profile-empty-state--squads">
          <div className="profile-empty-state__icon" aria-hidden>🦅</div>
          <p className="profile-empty-state__title">Твоё Крыло</p>
          <p className="profile-empty-state__text">Сформируй Крыло, чтобы добавлять фото аватара Крыла, участвовать в делах наставников и предлагать инициативы в Совет лагеря.</p>
          <button
            type="button"
            onClick={() => selectWingMentor('', 'Моё Крыло')}
            style={{
              padding: '12px 24px',
              background: 'rgba(139, 0, 255, 0.4)',
              border: '1px solid #8b00ff',
              color: '#c9b8ff',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Сформировать Крыло
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={variant === 'cabin' ? 'bro-cabin-section' : undefined} style={{
      background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 100%)',
      borderRadius: '24px',
      padding: isExpanded ? '24px' : '16px 20px',
      border: '1px solid rgba(139, 0, 255, 0.3)',
      marginBottom: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: '-50px', right: '-50px',
        width: '150px', height: '150px', background: '#8b00ff',
        filter: 'blur(60px)', opacity: 0.2
      }} />

      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? '20px' : 0, cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#c9b8ff', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            {isFullBro ? 'ТВОЕ КРЫЛО (ШТАБ)' : 'КРЫЛО (КАНДИДАТ)'}
          </div>
          <h3 style={{ margin: 0, fontSize: isExpanded ? '20px' : '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🦅 {wingName}
            {!isExpanded && <span style={{ fontSize: '12px', opacity: 0.7 }}>— {isFullBro ? 'БРО-НАСТАВНИК' : 'ПРОХОЖДЕНИЕ'}</span>}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isExpanded && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}
              aria-label="Переименовать Крыло"
              title="Переименовать Крыло"
            >
              ✏️ Название
            </button>
          )}
          {isExpanded && (
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #222 50%, #8b00ff 50%)',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }} title="Двухцветный галстук Наставника" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            style={{ background: 'none', border: 'none', color: '#c9b8ff', fontSize: '20px', cursor: 'pointer', padding: '0 4px', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}
          >
            ▾
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px', opacity: 0.7 }}>АВАТАР КРЫЛА</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  {bro?.wingAvatar && isImageUrl(bro.wingAvatar) ? (
                    <img src={bro.wingAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', opacity: 0.5 }}>🦅</div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px' }}>
              <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '4px' }}>НАСТАВНИК</div>
              <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                👑 Степан И. <span style={{ fontSize: '10px', background: '#000', padding: '2px 6px', borderRadius: '4px', border: '1px solid #333' }}>BLACK</span>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px' }}>
              <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '4px' }}>СТАТУС</div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: isFullBro ? '#38ef7d' : '#ffd700' }}>
                {isFullBro ? 'БРО-НАСТАВНИК' : 'ПРОХОЖДЕНИЕ'}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', opacity: 0.6 }}>АВАТАР КРЫЛА</div>
            <ImageSourceBlock
              context="wing_avatar"
              value={bro?.wingAvatar ?? null}
              onChange={setWingAvatar}
              aspect="square"
              onGenerate={async (opts) =>
                requestImageGenerate({ mode: 'generate', context: 'wing', prompt: opts.prompt ?? '' }, accessToken ?? null)
              }
              onProcess={async (imageBase64, opts) =>
                requestImageGenerate({ mode: 'process', context: 'wing', imageBase64, prompt: opts?.prompt ?? '' }, accessToken ?? null)
              }
            />
          </div>

          {isEditingName && (
            <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 16, padding: 16, marginBottom: 16 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, opacity: 0.75 }}>НАЗВАНИЕ КРЫЛА</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)', color: '#fff' }}
                  aria-label="Название Крыла"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement | null;
                    setWingName(input?.value ?? wingName);
                    setIsEditingName(false);
                  }}
                  style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255, 215, 0, 0.18)', color: '#FFD700', fontWeight: 800, cursor: 'pointer' }}
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsEditingName(false); }}
                  style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer' }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {showWingPlanner && (
            <div className="bro-wing-planner bro-cabin-section" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, opacity: 0.6 }}>ПЛАНИРОВАНИЕ СМЕНЫ КРЫЛА</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['wingPlanGridA', 'wingPlanGridB'] as const).map((gridId) => (
                    <button
                      key={gridId}
                      type="button"
                      className="btn-secondary"
                      aria-pressed={activePlannerGrid === gridId}
                      onClick={() => {
                        setPlannerSaved(false);
                        setActivePlannerGrid(gridId);
                      }}
                      style={activePlannerGrid === gridId ? activePlannerButtonStyle : undefined}
                    >
                      {gridId === 'wingPlanGridA' ? 'Сетка 1' : 'Сетка 2'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <label><input type="radio" checked={currentWingPlanGrid.shiftLength === 9} onChange={() => setPlannerShiftLength(9)} /> 9 дней</label>
                  <label><input type="radio" checked={currentWingPlanGrid.shiftLength === 21} onChange={() => setPlannerShiftLength(21)} /> 21 день</label>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {plannerDayKeys.map((day) => (
                    <button
                      key={day}
                      type="button"
                      className="btn-secondary"
                      aria-pressed={plannerDay === day}
                      onClick={() => setPlannerDay(day)}
                      style={plannerDay === day ? activePlannerDayStyle : undefined}
                    >
                      День {day}
                    </button>
                  ))}
                </div>
                <textarea className="w-input" placeholder="Утро" value={plannerDayData.morning ?? ''} onChange={(e) => setPlannerField('morning', e.target.value)} rows={2} />
                <textarea className="w-input" placeholder="Тихий час" value={plannerDayData.quietHour ?? ''} onChange={(e) => setPlannerField('quietHour', e.target.value)} rows={2} />
                <textarea className="w-input" placeholder="День" value={plannerDayData.day ?? ''} onChange={(e) => setPlannerField('day', e.target.value)} rows={2} />
                <textarea className="w-input" placeholder="Вечер" value={plannerDayData.evening ?? ''} onChange={(e) => setPlannerField('evening', e.target.value)} rows={2} />
                <textarea className="w-input" placeholder="Ночь" value={plannerDayData.night ?? ''} onChange={(e) => setPlannerField('night', e.target.value)} rows={2} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary" onClick={saveWingPlans} style={{ alignSelf: 'flex-start' }}>Сохранить</button>
                  {plannerSaved && (
                    <span style={{ fontSize: 12, color: 'rgba(176, 255, 196, 0.95)' }} role="status">
                      Сохранено
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {(isFullBro || onSuggestInitiative) && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', opacity: 0.6 }}>{isFullBro ? 'УПРАВЛЕНИЕ:' : 'СОВЕТ ЛАГЕРЯ:'}</div>
              {onSuggestInitiative && (
                <button
                  type="button"
                  onClick={onSuggestInitiative}
                  style={{ width: '100%', padding: '12px', background: 'rgba(255, 215, 0, 0.15)', border: '1px solid rgba(255, 215, 0, 0.5)', color: '#FFD700', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', marginBottom: '12px' }}
                >
                  💡 Предложить инициативу в совет лагеря
                </button>
              )}
              {isFullBro && (
                <>
                  <button
                    onClick={() => setShowArchitect(!showArchitect)}
                    style={{ width: '100%', padding: '12px', background: 'rgba(139, 0, 255, 0.2)', border: '1px solid #8b00ff', color: '#c9b8ff', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', marginBottom: '12px' }}
                  >
                    {showArchitect ? 'ЗАКРЫТЬ АРХИТЕКТОР' : '🏗️ СОЗДАТЬ ПОСВЯЩЕНИЕ ОТРЯДА'}
                  </button>
                  {showArchitect && <SquadArchitect />}
                  {!showArchitect && (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {['Организовать сюрприз для младших', 'Провести "Свечку" в отряде', 'Помочь вожатому с документами'].map((task, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)' }} />
                          {task}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
