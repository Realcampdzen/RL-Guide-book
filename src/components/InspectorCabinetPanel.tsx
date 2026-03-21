import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserProgress } from '../hooks/useUserProgress';
import {
  inspectorMissions,
  INSPECTOR_TAB_IDS,
  SKILL_4K_LABELS,
  type InspectorTabId,
  type Skill4K,
} from '../types/inspector';
import { loadMyBadgeRequests, type BadgeRequestItem } from '../utils/badgeApprovalApi';
import { InspectorDashboard } from './InspectorDashboard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InspectorCabinetPanelProps {
  accessToken?: string;
  deviceId?: string;
  onOpenDiary?: () => void;
  onNavigateToBadge?: (badgeId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const InspectorCabinetPanel: React.FC<InspectorCabinetPanelProps> = ({
  accessToken,
  deviceId,
  onOpenDiary,
  onNavigateToBadge,
}) => {
  const { userData, setInspectorDay } = useUserProgress();
  const [myRequests, setMyRequests] = useState<BadgeRequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [activeMission, setActiveMission] = useState<InspectorTabId | null>(null);
  const nickname = userData?.profile?.nickname || 'Участник';
  const progress = userData?.inspectorProgress || { currentDay: 1, completedTasks: {} };
  const userLevels = userData?.progress || {};

  // Enrollment check — user has started if they have any completed tasks or currentDay > 1
  const isEnrolled = useMemo(() => {
    const hasTasks = Object.values(progress.completedTasks).some(arr => arr && arr.length > 0);
    return hasTasks || progress.currentDay > 1;
  }, [progress]);

  // Load requests
  useEffect(() => {
    if (!accessToken) return;
    setRequestsLoading(true);
    loadMyBadgeRequests(accessToken)
      .then(reqs => {
        const inspectorReqs = reqs.filter(r => {
          const ev = r.evidence as Record<string, unknown> | null | undefined;
          return ev?.source === 'inspector' || inspectorMissions.some(m => m.badgeId === r.levelId);
        });
        setMyRequests(inspectorReqs);
      })
      .catch(() => { /* silent */ })
      .finally(() => setRequestsLoading(false));
  }, [accessToken]);

  // Mission stats
  const missionStats = useMemo(() => {
    return inspectorMissions.map(m => {
      const dayTasks = progress.completedTasks[String(m.day)] || [];
      const total = m.tasks.length;
      const completed = dayTasks.length;
      const badgeStatus = userLevels[m.badgeId]?.status;
      const request = myRequests.find(r => r.levelId === m.badgeId);
      const requestStatus = request?.status;
      return {
        ...m,
        completed,
        total,
        badgeStatus,
        requestStatus,
        isAchieved: badgeStatus === 'achieved',
        isPending: requestStatus === 'pending',
        isRejected: requestStatus === 'rejected',
      };
    });
  }, [progress, userLevels, myRequests]);

  const missionsAchieved = missionStats.filter(m => m.isAchieved).length;
  const missionsPending = missionStats.filter(m => m.isPending).length;
  const isChiefUnlocked = missionsAchieved >= 7;

  // Skills radar
  const developedSkills = useMemo(() => {
    const skillSet = new Set<Skill4K>();
    missionStats.filter(m => m.isAchieved).forEach(m => {
      m.skills?.forEach(s => skillSet.add(s));
    });
    return Array.from(skillSet);
  }, [missionStats]);

  // Total time from evidence
  const totalDurationMs = useMemo(() => {
    return myRequests.reduce((sum, r) => {
      const ev = r.evidence as Record<string, unknown> | null | undefined;
      return sum + (typeof ev?.durationMs === 'number' ? (ev.durationMs as number) : 0);
    }, 0);
  }, [myRequests]);

  const handleEnroll = useCallback(() => {
    setInspectorDay(1);
  }, [setInspectorDay]);

  // ------ INLINE MISSION VIEW ------
  if (activeMission) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
        <button
          type="button"
          onClick={() => setActiveMission(null)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', marginBottom: '12px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
        >
          ← Назад к списку
        </button>
        <InspectorDashboard
          variant="cabin"
          activeTab={activeMission}
          onTabChange={(tab) => setActiveMission(tab)}
          onOpenDiary={onOpenDiary}
          onNavigateToBadge={onNavigateToBadge}
          accessToken={accessToken}
          deviceId={deviceId}
        />
      </div>
    );
  }

  // ------ NOT ENROLLED ------
  if (!isEnrolled) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
        <div className="fade-in cab-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px', color: '#e8f0ff' }}>
            Инспектор Пользы
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.7, margin: '0 0 20px', lineHeight: 1.6 }}>
            7 дней · 7 миссий · 7 суперспособностей<br />
            Стань тем, кто делает лагерь лучше!
          </p>

          <div style={{ display: 'grid', gap: '8px', textAlign: 'left', marginBottom: '24px' }}>
            {[
              { emoji: '🤝', text: 'Миссии дружбы, вежливости, уюта и помощи' },
              { emoji: '⏱', text: 'Таймер: засекай время выполнения каждой миссии' },
              { emoji: '📝', text: 'Рефлексия и фото — отправляй отчёт вожатому' },
              { emoji: '🏆', text: 'Получи 7 значков и стань Главным Инспектором' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '18px' }}>{item.emoji}</span>
                <span style={{ fontSize: '13px', opacity: 0.85 }}>{item.text}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleEnroll}
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg, var(--violet-600), #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
            }}
          >
            Начать путь Инспектора
          </button>

          <p style={{ fontSize: '11px', opacity: 0.4, marginTop: '12px' }}>
            Твой ник будет виден участникам и вожатым
          </p>
        </div>
      </div>
    );
  }

  // ------ ENROLLED: CABINET HUB ------
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', paddingBottom: 80 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Header */}
        <div className="fade-in cab-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: 0.3 }}>Кабинет Инспектора</div>
              <div style={{ fontSize: '13px', opacity: 0.6, marginTop: '4px' }}>
                👤 {nickname}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: missionsAchieved >= 7 ? '#22c55e' : 'var(--violet-600)' }}>
                {missionsAchieved}/7
              </div>
              <div style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Миссий</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: '14px', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${(missionsAchieved / 7) * 100}%`,
              height: '100%',
              background: missionsAchieved >= 7 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, var(--violet-600), #6366f1)',
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              borderRadius: '4px',
            }} />
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', justifyContent: 'center' }}>
            {missionStats.map((m, i) => (
              <div
                key={i}
                title={m.title}
                onClick={() => {
                  const tabId = INSPECTOR_TAB_IDS[m.day - 1] as InspectorTabId;
                  setActiveMission(tabId);
                }}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', cursor: 'pointer',
                  background: m.isAchieved ? 'rgba(34,197,94,0.2)' :
                    m.isPending ? 'rgba(255,193,7,0.2)' :
                      'rgba(255,255,255,0.06)',
                  border: `1px solid ${m.isAchieved ? 'rgba(34,197,94,0.4)' :
                    m.isPending ? 'rgba(255,193,7,0.4)' :
                      'rgba(255,255,255,0.1)'}`,
                  transition: 'all 0.15s',
                }}
              >
                {m.isAchieved ? '✅' : m.isPending ? '⏳' : m.isRejected ? '❌' : `${i + 1}`}
              </div>
            ))}
          </div>

          {isChiefUnlocked && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(255,215,0,0.1)', borderRadius: '12px', border: '1px solid rgba(255,215,0,0.3)', textAlign: 'center' }}>
              <span style={{ fontSize: '16px' }}>👑</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffd700', marginLeft: '8px' }}>Главный Инспектор разблокирован!</span>
            </div>
          )}
        </div>

        {/* Missions list */}
        <div className="fade-in cab-card">
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Миссии</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {missionStats.map((m) => {
              const tabId = INSPECTOR_TAB_IDS[m.day - 1] as InspectorTabId;
              return (
                <div
                  key={m.day}
                  onClick={() => setActiveMission(tabId)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', borderRadius: '12px',
                    cursor: 'pointer',
                    background: m.isAchieved ? 'rgba(34,197,94,0.08)' :
                      m.isPending ? 'rgba(255,193,7,0.08)' :
                        'rgba(255,255,255,0.03)',
                    border: `1px solid ${m.isAchieved ? 'rgba(34,197,94,0.2)' :
                      m.isPending ? 'rgba(255,193,7,0.2)' :
                        'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '20px', width: '32px', textAlign: 'center' }}>{m.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{m.title}</div>
                    <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>
                      {m.isAchieved ? '✅ Подтверждено' :
                        m.isPending ? '⏳ На проверке' :
                          m.isRejected ? '❌ Отклонено' :
                            m.completed > 0 ? `${m.completed}/${m.total} заданий` : 'Не начата'}
                    </div>
                  </div>
                  <div style={{
                    padding: '5px 12px', borderRadius: '8px',
                    background: m.isAchieved ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
                    border: `1px solid ${m.isAchieved ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
                    color: m.isAchieved ? '#22c55e' : '#818cf8',
                    fontSize: '11px', fontWeight: 600,
                  }}>
                    {m.isAchieved ? 'Готово' : m.isPending ? 'Проверка' : m.completed > 0 ? 'Продолжить' : 'Начать'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="fade-in cab-card">
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Статистика</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--violet-600)' }}>{missionsAchieved}</div>
              <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>Миссий пройдено</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#5de4ff' }}>
                {totalDurationMs > 0 ? `${Math.floor(totalDurationMs / 60000)}` : '—'}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>Минут в миссиях</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#22c55e' }}>{missionsPending}</div>
              <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>На проверке</div>
            </div>
          </div>
        </div>

        {/* Skills developed */}
        {developedSkills.length > 0 && (
          <div className="fade-in cab-card">
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Развитые навыки 4К</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {developedSkills.map(skill => {
                const info = SKILL_4K_LABELS[skill];
                return (
                  <div key={skill} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '20px',
                    background: `${info.color}18`, border: `1px solid ${info.color}40`,
                    fontSize: '12px', fontWeight: 600, color: info.color,
                  }}>
                    <span>{info.emoji}</span>
                    <span>{info.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* My requests */}
        {myRequests.length > 0 && (
          <div className="fade-in cab-card">
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Мои заявки</div>
            {requestsLoading ? (
              <div style={{ fontSize: '12px', opacity: 0.5 }}>Загрузка…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {myRequests.map(r => {
                  const ev = r.evidence as Record<string, unknown> | null | undefined;
                  return (
                    <div key={r.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', borderRadius: '10px',
                      background: r.status === 'approved' ? 'rgba(34,197,94,0.06)' :
                        r.status === 'rejected' ? 'rgba(239,68,68,0.06)' :
                          'rgba(255,193,7,0.06)',
                      border: `1px solid ${r.status === 'approved' ? 'rgba(34,197,94,0.15)' :
                        r.status === 'rejected' ? 'rgba(239,68,68,0.15)' :
                          'rgba(255,193,7,0.15)'}`,
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          {ev?.missionTitle ? String(ev.missionTitle) : r.badgeTitle || r.levelId}
                        </div>
                        <div style={{ fontSize: '11px', opacity: 0.5 }}>
                          {r.status === 'pending' ? '⏳ На проверке' :
                            r.status === 'approved' ? '✅ Подтверждено' : '❌ Отклонено'}
                          {ev?.durationMs ? ` · ⏱ ${Math.floor(Number(ev.durationMs) / 60000)} мин` : ''}
                        </div>
                      </div>
                      {r.resolutionNote && (
                        <div style={{ fontSize: '11px', opacity: 0.6, maxWidth: '120px', textAlign: 'right' }}>
                          💬 {r.resolutionNote}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default InspectorCabinetPanel;
