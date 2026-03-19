import React, { useState } from 'react';
import { useUserProgress } from '../hooks/useUserProgress';
import { useAuth } from '../context/AuthContext';
import { broMissions as defaultMissions, BroDayMission } from '../types/bro';
import { BroBonfire } from './BroBonfire';

const COUNSELOR_LEVEL_THRESHOLD = 30;

interface BroInitiationProps {
  dynamicBroMissions?: BroDayMission[];
  onUpdateMissions?: (missions: BroDayMission[]) => Promise<boolean>;
  variant?: 'default' | 'cabin';
}

export const BroInitiation: React.FC<BroInitiationProps> = ({ 
  dynamicBroMissions, 
  onUpdateMissions,
  variant = 'default'
}) => {
  const { userData, updateBroDeed, setBroDay, receivePassport, becomeBro } = useUserProgress();
  const { accessToken, role, deviceId } = useAuth();
  const [isRitualActive, setIsRitualActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const missions = (dynamicBroMissions && dynamicBroMissions.length > 0) 
    ? dynamicBroMissions 
    : defaultMissions;

  const progress = userData.broProgress || { 
    isBro: false, 
    hasPassport: false, 
    currentDay: 1, 
    completedDeeds: {} 
  };

  const currentDayIndex = progress.currentDay;
  const currentMission = missions.find(m => m.day === currentDayIndex) || missions[0];
  const completedForDay = progress.completedDeeds[String(currentDayIndex)] || [];
  
  const totalDeeds = missions.reduce((acc, m) => acc + m.deeds.length, 0);
  const totalCompleted = Object.values(progress.completedDeeds).reduce((acc, list) => acc + list.length, 0);
  const isReadyForRitual = totalCompleted === totalDeeds;

  const isCounselor = userData.broProgress?.isBro || userData.profile.stats.totalLevelsAchieved > COUNSELOR_LEVEL_THRESHOLD;

  const handleInitiation = () => {
    setIsRitualActive(true);
  };

  const finishRitual = () => {
    setIsRitualActive(false);
  };

  const requestBroConfirmation = () => {
    const nickname = userData?.profile?.nickname || 'Искатель';
    const text = `Запрос подтверждения Бросвящения (Бропаспорт). Устройство: ${deviceId || '—'}. Псевдоним: ${nickname}.`;
    const href = `https://t.me/Stivanovv?text=${encodeURIComponent(text)}`;
    try {
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = href;
    }
  };

  const confirmBroLocally = () => {
    if (!accessToken && role !== 'developer') {
      alert('Сначала войдите по коду участника смены (Профиль → Разблокировать по коду).');
      return;
    }
    if (!isReadyForRitual) {
      alert('Сначала нужно заполнить Бропаспорт на 100% (выполнить все Бродела).');
      return;
    }
    const ok = confirm('Отметить, что Бросвящение подтверждено вожатым, и открыть Бро‑доступ на этом устройстве?');
    if (!ok) return;
    receivePassport();
    becomeBro();
  };

  if (isRitualActive) {
    return <BroBonfire onComplete={finishRitual} onCancel={finishRitual} usePortal={variant === 'cabin'} />;
  }

  if (progress.isBro) {
    return (
      <div className="fade-in" style={{
        background: 'linear-gradient(135deg, rgba(139, 0, 255, 0.25) 0%, rgba(106, 13, 173, 0.4) 100%)',
        borderRadius: '24px',
        padding: isExpanded ? '32px 24px' : '16px 20px',
        border: '2px solid #8b00ff',
        boxShadow: '0 0 30px rgba(139, 0, 255, 0.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        marginBottom: '24px',
        textAlign: isExpanded ? 'center' : 'left',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setIsExpanded(!isExpanded)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: isExpanded ? '56px' : '32px', filter: 'drop-shadow(0 0 10px #8b00ff)' }}>🟣</span>
            <div>
              <h3 style={{ margin: 0, color: '#c9b8ff', fontSize: isExpanded ? '24px' : '18px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' }}>ТЫ — БРО</h3>
              {!isExpanded && <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.7 }}>Хранитель традиций</p>}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            style={{ background: 'none', border: 'none', color: '#c9b8ff', fontSize: '20px', cursor: 'pointer', padding: '0 4px', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}
          >
            ▾
          </button>
        </div>
        {isExpanded && (
          <>
            <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '16px', color: '#e0d4ff' }}>Хранитель легендарных традиций с 2013 года</p>
            <div style={{ 
              position: 'absolute', top: '15px', right: '15px', 
              background: '#8b00ff', color: 'white', fontSize: '10px', 
              padding: '5px 12px', borderRadius: '100px', fontWeight: 900,
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
            }}>EST. 2013</div>
            <div style={{ marginTop: '24px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>
              Доступ к Категории 9 открыт
            </div>
          </>
        )}
      </div>
    );
  }

  if (!progress.hasPassport) {
    return (
      <div className="fade-in" style={{
        background: 'rgba(20, 10, 40, 0.7)',
        borderRadius: '24px',
        padding: isExpanded ? '32px 24px' : '16px 20px',
        border: '1px solid rgba(139, 0, 255, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        marginBottom: '24px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setIsExpanded(!isExpanded)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: isExpanded ? '48px' : '32px' }}>📘</span>
            <div>
              <h3 style={{ margin: 0, fontSize: isExpanded ? '20px' : '16px', fontWeight: 800 }}>БРОСВЯЩЕНИЕ</h3>
              {!isExpanded && <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>Получи Бропаспорт</p>}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            style={{ background: 'none', border: 'none', color: '#c9b8ff', fontSize: '20px', cursor: 'pointer', padding: '0 4px', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}
          >
            ▾
          </button>
        </div>
        {isExpanded && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <p style={{ fontSize: '14px', opacity: 0.7, lineHeight: '1.5' }}>
              Готов начать путь вожатого? Получи свой цифровой Бропаспорт и начни выполнять Бродела!
            </p>
            <button 
              onClick={receivePassport}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(90deg, #8b00ff, #4dacff)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontWeight: 900,
                fontSize: '14px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(139, 0, 255, 0.3)'
              }}
            >
              ПОЛУЧИТЬ БРОПАСПОРТ
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bro-initiation fade-in" style={{
      background: 'rgba(20, 10, 40, 0.6)',
      borderRadius: '24px',
      padding: '24px',
      border: '1px solid rgba(139, 0, 255, 0.3)',
      marginBottom: '24px',
      position: 'relative',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }}>
      {/* Header with Day Selector + Toggle */}
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? '24px' : 0, cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#8b00ff', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span>Бропаспорт: {totalCompleted} / {totalDeeds}</span>
            {isCounselor && isExpanded && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
                style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700', borderRadius: '4px', padding: '2px 6px', fontSize: '8px', cursor: 'pointer', fontWeight: 800 }}
              >
                {isEditing ? 'ЗАКОНЧИТЬ' : 'РЕДАКТИРОВАТЬ'}
              </button>
            )}
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isExpanded ? (
              <>День {currentMission.day}: {currentMission.title} {currentMission.emoji}</>
            ) : (
              <>Бропаспорт — {totalCompleted}/{totalDeeds} ({Math.round((totalCompleted / (totalDeeds || 1)) * 100)}%)</>
            )}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isExpanded && (
            <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
              {[1, 2, 3].map(d => (
                <button
                  key={d}
                  onClick={() => setBroDay(d)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: currentDayIndex === d ? '#8b00ff' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${currentDayIndex === d ? '#c9b8ff' : 'rgba(255,255,255,0.1)'}`,
                    color: 'white', fontWeight: 800, fontSize: '12px', cursor: 'pointer'
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
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
      {/* Deeds List */}
      <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
        {currentMission.deeds.map(deed => {
          const isDone = completedForDay.includes(deed.id);
          return (
            <div 
              key={deed.id}
              onClick={() => !isEditing && updateBroDeed(currentDayIndex, deed.id, !isDone)}
              style={{
                padding: '16px',
                background: isDone ? 'rgba(139, 0, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                border: `1px solid ${isDone ? 'rgba(139, 0, 255, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                cursor: isEditing ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}
            >
              {!isEditing && (
                <div style={{
                  width: '22px', height: '22px', borderRadius: '6px',
                  border: `2px solid ${isDone ? '#8b00ff' : 'rgba(255,255,255,0.2)'}`,
                  background: isDone ? '#8b00ff' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0
                }}>
                  {isDone && '✓'}
                </div>
              )}
              <div style={{ flex: 1 }}>
                {isEditing ? (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <input 
                      value={deed.text}
                      onChange={(e) => {
                        const newMissions = missions.map(m => {
                          if (m.day === currentDayIndex) {
                            return {
                              ...m,
                              deeds: m.deeds.map(d => d.id === deed.id ? { ...d, text: e.target.value } : d)
                            };
                          }
                          return m;
                        });
                        if (onUpdateMissions) void onUpdateMissions(newMissions);
                      }}
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', padding: '6px 10px', fontSize: '13px' }}
                    />
                    <textarea 
                      value={deed.description}
                      onChange={(e) => {
                        const newMissions = missions.map(m => {
                          if (m.day === currentDayIndex) {
                            return {
                              ...m,
                              deeds: m.deeds.map(d => d.id === deed.id ? { ...d, description: e.target.value } : d)
                            };
                          }
                          return m;
                        });
                        if (onUpdateMissions) void onUpdateMissions(newMissions);
                      }}
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', resize: 'none' }}
                      rows={2}
                    />
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '13px', fontWeight: 700, opacity: isDone ? 0.6 : 1, textDecoration: isDone ? 'line-through' : 'none' }}>
                      {deed.text}
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>{deed.description}</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Footer */}
      <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${(totalCompleted / totalDeeds) * 100}%`, 
            height: '100%', 
            background: 'linear-gradient(90deg, #8b00ff, #c9b8ff)',
            boxShadow: '0 0 10px #8b00ff',
            transition: 'width 0.5s ease'
          }} />
        </div>
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#c9b8ff' }}>{Math.round((totalCompleted / totalDeeds) * 100)}%</span>
      </div>

      {isReadyForRitual && !isRitualActive && !progress.isBro && (
        <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.45 }}>
            Бродела выполнены. Дальше нужен реальный апрув вожатого: запроси подтверждение и только после этого нажми «Мне подтвердили».
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button
              type="button"
              onClick={requestBroConfirmation}
              style={{
                padding: '10px 14px',
                background: 'rgba(255, 215, 0, 0.14)',
                border: '1px solid rgba(255, 215, 0, 0.35)',
                color: '#FFD700',
                borderRadius: 14,
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 12
              }}
            >
              ✉️ Запросить подтверждение
            </button>
            <button
              type="button"
              onClick={confirmBroLocally}
              disabled={!accessToken && role !== 'developer'}
              style={{
                padding: '10px 14px',
                background: !accessToken && role !== 'developer' ? 'rgba(255,255,255,0.08)' : 'rgba(76, 175, 80, 0.18)',
                border: '1px solid rgba(76, 175, 80, 0.35)',
                color: 'rgba(210, 255, 216, 0.95)',
                borderRadius: 14,
                cursor: !accessToken && role !== 'developer' ? 'not-allowed' : 'pointer',
                fontWeight: 800,
                fontSize: 12,
                opacity: !accessToken && role !== 'developer' ? 0.6 : 1
              }}
              title={!accessToken && role !== 'developer' ? 'Сначала войдите по коду участника смены' : undefined}
            >
              ✅ Мне подтвердили
            </button>
          </div>
        </div>
      )}

      {isReadyForRitual && !isRitualActive && (
        <button 
          onClick={handleInitiation}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '18px',
            background: 'linear-gradient(90deg, #8b00ff, #6a0dad)',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            fontWeight: 900,
            fontSize: '15px',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(139, 0, 255, 0.5)',
            animation: 'pulse 2s infinite'
          }}
        >
          ПРОЙТИ ИНИЦИАЦИЮ
        </button>
      )}
        </>
      )}

      <style>{`
        @keyframes pulse { from { transform: scale(1); opacity: 0.8; } to { transform: scale(1.05); opacity: 1; } }
      `}</style>
    </div>
  );
};
