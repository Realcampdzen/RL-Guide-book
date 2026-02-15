import React, { useState } from 'react';
import { useUserProgress } from '../hooks/useUserProgress';
import {
  inspectorMissions,
  type InspectorTabId,
  INSPECTOR_TAB_IDS,
  INSPECTOR_TAB_BADGE_IDS
} from '../types/inspector';
import { generateSocialCard, shareOrDownloadSocialCard } from '../utils/socialGenerator';
import { getRank } from '../types/userProgress';

const INSPECTOR_RULES = [
  'Говори прямо и вежливо, чего хочешь.',
  'Используй "Я-сообщения" вместо обвинений.',
  'Будь примером: не командуй, а приглашай участвовать.',
  'Слушай, хвали и поддерживай других.',
  'Участвуй в общих делах и помогай, когда можешь.'
];

const INSPECTOR_TAB_LABELS: Record<InspectorTabId, { label: string; emoji: string }> = {
  friendship: { label: 'Инспектор Дружбы', emoji: '🤝' },
  politeness: { label: 'Инспектор Вежливости', emoji: '🎩' },
  comfort: { label: 'Инспектор Уюта', emoji: '🏠' },
  help: { label: 'Инспектор Помощи', emoji: '🚀' },
  involvement: { label: 'Инспектор Вовлечённости', emoji: '🎲' },
  peacemaker: { label: 'Инспектор Спокойствия', emoji: '🕊' },
  mood: { label: 'Инспектор Настроения', emoji: '😊' },
  chief: { label: 'Главный Инспектор', emoji: '👑' }
};

interface InspectorDashboardProps {
  variant?: 'accordion' | 'cabin';
  activeTab?: InspectorTabId;
  onTabChange?: (tab: InspectorTabId) => void;
  onOpenDiary?: () => void;
  onNavigateToBadge?: (badgeId: string) => void;
}

export const InspectorDashboard: React.FC<InspectorDashboardProps> = ({
  variant = 'accordion',
  activeTab: controlledActiveTab,
  onTabChange,
  onOpenDiary,
  onNavigateToBadge
}) => {
  const { userData, updateInspectorTask, setInspectorDay, updateLevelStatus } = useUserProgress();
  const [internalActiveTab, setInternalActiveTab] = useState<InspectorTabId>('friendship');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [lockedTabHint, setLockedTabHint] = useState<string | null>(null);

  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = onTabChange ?? setInternalActiveTab;

  const progress = userData.inspectorProgress || { currentDay: 1, completedTasks: {} };
  const userProgress = userData.progress || {};

  const isTabUnlocked = (tabId: InspectorTabId): boolean => {
    const idx = INSPECTOR_TAB_IDS.indexOf(tabId);
    if (idx <= 0) return true;
    if (tabId === 'chief') {
      return [14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8].every(
        (base) => userProgress[`${base}.1`]?.status === 'achieved'
      );
    }
    const prevTab = INSPECTOR_TAB_IDS[idx - 1];
    const prevBadgeId = INSPECTOR_TAB_BADGE_IDS[prevTab];
    return userProgress[prevBadgeId]?.status === 'achieved';
  };

  const getLockedMessage = (tabId: InspectorTabId): string => {
    const idx = INSPECTOR_TAB_IDS.indexOf(tabId);
    if (idx <= 0) return '';
    if (tabId === 'chief') return 'Сначала заверши все 7 миссий.';
    const prev = INSPECTOR_TAB_LABELS[INSPECTOR_TAB_IDS[idx - 1]];
    return `Сначала заверши миссию «${prev.label}».`;
  };

  const missionForTab = (tabId: InspectorTabId) => {
    if (tabId === 'chief') return null;
    const day = INSPECTOR_TAB_IDS.indexOf(tabId) + 1;
    return inspectorMissions.find((m) => m.day === day) ?? null;
  };

  const handleConfirmMission = (badgeId: string) => {
    updateLevelStatus(badgeId as '14.2.1', 'achieved');
  };

  if (variant === 'cabin') {
    const mission = missionForTab(activeTab);
    const isChiefTab = activeTab === 'chief';
    const unlocked = isTabUnlocked(activeTab);
    const completedForDay = mission ? progress.completedTasks[String(mission.day)] || [] : [];
    const totalTasks = mission?.tasks.length ?? 0;
    const isDayComplete = mission && totalTasks > 0 && completedForDay.length === totalTasks;
    const badgeId = mission?.badgeId ?? '14.9.1';
    const alreadyAchieved = userProgress[badgeId]?.status === 'achieved';

    const handleShareReport = async () => {
      if (!mission) return;
      setShareError(null);
      setIsSharing(true);
      try {
        const result = await generateSocialCard({
          format: 'story',
          kind: 'inspector_mission',
          profile: {
            nickname: userData.profile.nickname,
            avatar: userData.profile.avatar,
            rank: getRank(userData.profile.stats.totalLevelsAchieved)
          },
          badge: {
            title: mission.title,
            emoji: mission.emoji,
            categoryId: '14',
            levelLabel: mission.resultTitle
          }
        });
        await shareOrDownloadSocialCard(result);
      } catch (err) {
        console.error('Failed to generate report', err);
        setShareError('Не удалось создать рапорт. Попробуй ещё раз.');
      } finally {
        setIsSharing(false);
      }
    };

    return (
      <div id="inspector-dashboard" className="inspector-dashboard inspector-dashboard--cabin" style={{ position: 'relative' }}>
        {/* Rules block - always visible at top */}
        <div className="inspector-dashboard__rules" style={{
          padding: '12px 16px',
          background: 'rgba(56, 239, 125, 0.08)',
          borderRadius: '12px',
          marginBottom: '16px',
          border: '1px solid rgba(56, 239, 125, 0.2)'
        }}>
          <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#38ef7d', letterSpacing: '0.1em', margin: '0 0 8px' }}>Правила Инспектора Пользы</p>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', opacity: 0.9, lineHeight: 1.6 }}>
            {INSPECTOR_RULES.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </div>

        {/* Tab nav: only when tabs controlled internally (no onTabChange from parent); otherwise tabs are in ProfileView dock */}
        {!onTabChange && (
        <div className="inspector-dashboard__tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }} role="tablist" aria-label="Разделы Инспектора">
          {INSPECTOR_TAB_IDS.map((tabId) => {
            const meta = INSPECTOR_TAB_LABELS[tabId];
            const tabUnlocked = isTabUnlocked(tabId);
            const isActive = activeTab === tabId;
            return (
              <button
                key={tabId}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-disabled={!tabUnlocked}
                data-label={meta.label}
                className={isActive ? 'active' : ''}
                disabled={!tabUnlocked}
                title={!tabUnlocked ? getLockedMessage(tabId) : undefined}
                onClick={() => {
                  if (tabUnlocked) {
                    setActiveTab(tabId);
                    setLockedTabHint(null);
                  } else {
                    setLockedTabHint(getLockedMessage(tabId));
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: isActive ? 'rgba(56, 239, 125, 0.2)' : tabUnlocked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? '#38ef7d' : tabUnlocked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '10px',
                  color: tabUnlocked ? (isActive ? '#38ef7d' : 'rgba(255,255,255,0.95)') : 'rgba(255,255,255,0.4)',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: tabUnlocked ? 'pointer' : 'not-allowed',
                  opacity: tabUnlocked ? 1 : 0.6
                }}
              >
                <span aria-hidden>{meta.emoji}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
        )}

        {lockedTabHint && (
          <div style={{ padding: '12px', background: 'rgba(255,193,7,0.15)', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>
            {lockedTabHint}
          </div>
        )}

        {/* Content */}
        {!unlocked ? (
          <div style={{ padding: '24px', textAlign: 'center', opacity: 0.8 }}>
            <p>Сначала заверши предыдущую миссию.</p>
          </div>
        ) : isChiefTab ? (
          <div className="inspector-dashboard__chief" style={{ padding: '16px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px' }}>👑 Главный Инспектор</h3>
            <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '16px' }}>
              Выполни все 7 базовых миссий и получи не менее 3 значков из серии Инспектора Пользы.
            </p>
            <p style={{ fontSize: '13px', opacity: 0.8 }}>
              Когда условия выполнены — ты Главный Инспектор!
            </p>
            {onNavigateToBadge && (
              <button
                type="button"
                onClick={() => onNavigateToBadge('14.9')}
                style={{
                  marginTop: '16px',
                  padding: '10px 18px',
                  background: 'rgba(56, 239, 125, 0.2)',
                  border: '1px solid #38ef7d',
                  color: '#38ef7d',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Открыть значок 14.9
              </button>
            )}
          </div>
        ) : mission ? (
          <div className="inspector-dashboard__mission">
            <p style={{ fontSize: '13px', opacity: 0.8, fontStyle: 'italic', padding: '10px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', marginBottom: '12px' }}>
              🎯 Цель: {mission.goal}
            </p>

            {onOpenDiary && (
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '12px' }}>
                <p style={{ fontSize: '12px', margin: '0 0 10px', opacity: 0.9 }}>
                  Перед миссией полезно записать рефлексию в Реальном Дневнике.
                </p>
                <button
                  type="button"
                  onClick={onOpenDiary}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(56, 239, 125, 0.4)',
                    color: '#38ef7d',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Открыть Дневник
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              {mission.tasks.map((task) => {
                const isCompleted = completedForDay.includes(task.id);
                return (
                  <div
                    key={task.id}
                    onClick={() => updateInspectorTask(mission.day, task.id, !isCompleted)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: isCompleted ? 'rgba(56, 239, 125, 0.15)' : 'rgba(255,255,255,0.03)',
                      borderRadius: '14px',
                      border: `1px solid ${isCompleted ? 'rgba(56, 239, 125, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '6px',
                      border: `2px solid ${isCompleted ? '#38ef7d' : 'rgba(255,255,255,0.3)'}`,
                      background: isCompleted ? '#38ef7d' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}>
                      {isCompleted && '✓'}
                    </div>
                    <span style={{
                      fontSize: '13px',
                      opacity: isCompleted ? 0.6 : 1,
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      flex: 1
                    }}>
                      {task.text}
                    </span>
                    {task.isChallenge && <span title="Челлендж" style={{ fontSize: '14px' }}>🔥</span>}
                    {task.isCoop && <span title="Кооператив" style={{ fontSize: '14px' }}>👥</span>}
                    {task.isCamp && <span title="Лагерное" style={{ fontSize: '14px' }}>✨</span>}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  width: `${totalTasks ? (completedForDay.length / totalTasks) * 100 : 0}%`,
                  height: '100%',
                  background: '#38ef7d',
                  transition: 'width 0.5s ease'
                }} />
              </div>
              <span style={{ fontSize: '12px', opacity: 0.6 }}>{completedForDay.length} / {totalTasks}</span>
            </div>

            {isDayComplete && (
              <div className="fade-in" style={{
                marginTop: '16px',
                padding: '16px',
                background: 'rgba(56, 239, 125, 0.2)',
                borderRadius: '16px',
                textAlign: 'center',
                border: '1px solid #38ef7d'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏆</div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: '#38ef7d', textTransform: 'uppercase' }}>
                  Миссия выполнена!
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                  Ты — <strong>{mission.resultTitle}</strong>
                </div>
                {alreadyAchieved ? (
                  <p style={{ marginTop: '12px', fontSize: '13px', opacity: 0.8 }}>Значок уже получен.</p>
                ) : (
                  <>
                    {shareError ? (
                      <div className="profile-error profile-error--not-found" style={{ marginTop: 12, textAlign: 'left' }}>
                        {shareError}
                        <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={(e) => { e.stopPropagation(); handleShareReport(); }}>Повторить</button>
                      </div>
                    ) : isSharing ? (
                      <p className="profile-loading" style={{ marginTop: 12 }}>Генерируем рапорт…</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', alignItems: 'center' }}>
                        <button
                          style={{
                            padding: '8px 16px',
                            background: '#38ef7d',
                            color: '#0b1b16',
                            border: 'none',
                            borderRadius: '100px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmMission(badgeId);
                          }}
                        >
                          ПОДТВЕРДИТЬ МИССИЮ
                        </button>
                        <button
                          style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            color: '#38ef7d',
                            border: '1px solid #38ef7d',
                            borderRadius: '100px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          onClick={(e) => { e.stopPropagation(); handleShareReport(); }}
                        >
                          ОТПРАВИТЬ РАПОРТ 9:16
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  /* Accordion variant (non-cabin) */
  const currentDayIndex = progress.currentDay;
  const currentMission = inspectorMissions.find((m) => m.day === currentDayIndex) || inspectorMissions[0];
  const completedForDay = progress.completedTasks[String(currentDayIndex)] || [];
  const totalTasks = currentMission.tasks.length;
  const isDayComplete = completedForDay.length === totalTasks;

  const handleShareReport = async () => {
    setShareError(null);
    setIsSharing(true);
    try {
      const result = await generateSocialCard({
        format: 'story',
        kind: 'inspector_mission',
        profile: {
          nickname: userData.profile.nickname,
          avatar: userData.profile.avatar,
          rank: getRank(userData.profile.stats.totalLevelsAchieved)
        },
        badge: {
          title: currentMission.title,
          emoji: currentMission.emoji,
          categoryId: '14',
          levelLabel: currentMission.resultTitle
        }
      });
      await shareOrDownloadSocialCard(result);
      setShareError(null);
    } catch (err) {
      console.error('Failed to generate report', err);
      setShareError('Не удалось создать рапорт. Попробуй ещё раз.');
    } finally {
      setIsSharing(false);
    }
  };

  const wrapperStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(56, 239, 125, 0.1) 0%, rgba(17, 153, 142, 0.15) 100%)',
    borderRadius: '24px',
    padding: '20px',
    border: `1px solid ${isDayComplete ? '#38ef7d' : 'rgba(56, 239, 125, 0.3)'}`,
    marginBottom: '24px',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <div id="inspector-dashboard" className="inspector-dashboard" style={wrapperStyle}>
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '100px',
        height: '100px',
        background: '#38ef7d',
        filter: 'blur(50px)',
        opacity: isDayComplete ? 0.2 : 0.1,
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isExpanded ? '20px' : '0' }}>
        <div onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer', flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#38ef7d', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Ветка: Инспектор Пользы
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            День {currentMission.day}: {currentMission.title} {currentMission.emoji}
          </h3>
          {!isExpanded && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  width: `${(completedForDay.length / totalTasks) * 100}%`,
                  height: '100%',
                  background: '#38ef7d',
                  transition: 'width 0.5s ease'
                }} />
              </div>
              <span style={{ fontSize: '12px', opacity: 0.6 }}>{completedForDay.length} / {totalTasks}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              const next = currentDayIndex < inspectorMissions.length ? currentDayIndex + 1 : 1;
              setInspectorDay(next);
            }}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '4px 8px',
              color: 'white',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            СЛЕД. ДЕНЬ
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: '#38ef7d',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 4px',
              transform: isExpanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.3s ease'
            }}
          >
            ▾
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="fade-in" style={{ display: 'grid', gap: '12px' }}>
          <p style={{ fontSize: '13px', opacity: 0.8, fontStyle: 'italic', padding: '10px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', marginBottom: '8px' }}>
            🎯 Цель: {currentMission.goal}
          </p>

          {onOpenDiary && (
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '12px', margin: '0 0 10px', opacity: 0.9 }}>
                Перед миссией полезно записать рефлексию в Реальном Дневнике.
              </p>
              <button
                type="button"
                onClick={onOpenDiary}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(56, 239, 125, 0.4)',
                  color: '#38ef7d',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Открыть Дневник
              </button>
            </div>
          )}

          {currentMission.tasks.map((task) => {
            const isCompleted = completedForDay.includes(task.id);
            return (
              <div
                key={task.id}
                onClick={() => updateInspectorTask(currentDayIndex, task.id, !isCompleted)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: isCompleted ? 'rgba(56, 239, 125, 0.15)' : 'rgba(255,255,255,0.03)',
                  borderRadius: '14px',
                  border: `1px solid ${isCompleted ? 'rgba(56, 239, 125, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  border: `2px solid ${isCompleted ? '#38ef7d' : 'rgba(255,255,255,0.3)'}`,
                  background: isCompleted ? '#38ef7d' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>
                  {isCompleted && '✓'}
                </div>
                <span style={{
                  fontSize: '13px',
                  opacity: isCompleted ? 0.6 : 1,
                  textDecoration: isCompleted ? 'line-through' : 'none',
                  flex: 1
                }}>
                  {task.text}
                </span>
                {task.isChallenge && <span title="Челлендж" style={{ fontSize: '14px' }}>🔥</span>}
                {task.isCoop && <span title="Кооператив" style={{ fontSize: '14px' }}>👥</span>}
                {task.isCamp && <span title="Лагерное" style={{ fontSize: '14px' }}>✨</span>}
              </div>
            );
          })}

          {isDayComplete && (
            <div className="fade-in" style={{
              marginTop: '12px',
              padding: '16px',
              background: 'rgba(56, 239, 125, 0.2)',
              borderRadius: '16px',
              textAlign: 'center',
              border: '1px solid #38ef7d'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏆</div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#38ef7d', textTransform: 'uppercase' }}>
                Миссия выполнена!
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                Сегодня ты — <strong>{currentMission.resultTitle}</strong>
              </div>
              {shareError ? (
                <div className="profile-error profile-error--not-found" style={{ marginTop: 12, textAlign: 'left' }}>
                  {shareError}
                  <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={(e) => { e.stopPropagation(); handleShareReport(); }}>Повторить</button>
                </div>
              ) : isSharing ? (
                <p className="profile-loading" style={{ marginTop: 12 }}>Генерируем рапорт…</p>
              ) : (
                <button
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    background: '#38ef7d',
                    color: '#0b1b16',
                    border: 'none',
                    borderRadius: '100px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShareReport();
                  }}
                >
                  ОТПРАВИТЬ РАПОРТ 9:16
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
