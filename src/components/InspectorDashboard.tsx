import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUserProgress } from '../hooks/useUserProgress';
import {
  INSPECTOR_TAB_BADGE_IDS,
  INSPECTOR_TAB_IDS,
  type InspectorDayMission,
  type InspectorTabId,
  inspectorMissions,
  SKILL_4K_LABELS,
} from '../types/inspector';
import { getRank } from '../types/userProgress';
import {
  type BadgeRequestItem,
  createBadgeRequest,
  loadMyBadgeRequests,
} from '../utils/badgeApprovalApi';
import { generateSocialCard, shareOrDownloadSocialCard } from '../utils/socialGenerator';

const INSPECTOR_ACCENT = 'var(--violet-600)';
const INSPECTOR_ACCENT_RGB = '53, 48, 89';

const INSPECTOR_RULES = [
  'Говори прямо и вежливо, чего хочешь.',
  'Используй "Я-сообщения" вместо обвинений.',
  'Будь примером: не командуй, а приглашай участвовать.',
  'Слушай, хвали и поддерживай других.',
  'Участвуй в общих делах и помогай, когда можешь.',
];

const INSPECTOR_TAB_LABELS: Record<InspectorTabId, { label: string; emoji: string }> = {
  friendship: { label: 'Инспектор Дружбы', emoji: '🤝' },
  politeness: { label: 'Инспектор Вежливости', emoji: '🎩' },
  comfort: { label: 'Инспектор Уюта', emoji: '🏠' },
  help: { label: 'Инспектор Помощи', emoji: '🚀' },
  involvement: { label: 'Инспектор Вовлечённости', emoji: '🎲' },
  peacemaker: { label: 'Инспектор Спокойствия', emoji: '🕊' },
  mood: { label: 'Инспектор Настроения', emoji: '😊' },
  chief: { label: 'Главный Инспектор', emoji: '👑' },
};

interface InspectorDashboardProps {
  variant?: 'accordion' | 'cabin';
  activeTab?: InspectorTabId;
  onTabChange?: (tab: InspectorTabId) => void;
  onOpenDiary?: () => void;
  onNavigateToBadge?: (badgeId: string) => void;
  accessToken?: string;
  deviceId?: string;
}

export const InspectorDashboard: React.FC<InspectorDashboardProps> = ({
  variant = 'accordion',
  activeTab: controlledActiveTab,
  onTabChange,
  onOpenDiary,
  onNavigateToBadge,
  accessToken,
  deviceId,
}) => {
  const { userData, updateInspectorTask, setInspectorDay } = useUserProgress();
  const [internalActiveTab, setInternalActiveTab] = useState<InspectorTabId>('friendship');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [lockedTabHint, setLockedTabHint] = useState<string | null>(null);
  const [showMechanism, setShowMechanism] = useState(false);

  // Timer state
  const [missionStartedAt, setMissionStartedAt] = useState<number | null>(null);
  const [missionEndedAt, setMissionEndedAt] = useState<number | null>(null);
  const [timerDisplay, setTimerDisplay] = useState('00:00');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Evidence form state
  const [evidenceReflection, setEvidenceReflection] = useState('');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [evidenceLink, setEvidenceLink] = useState('');
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  // Existing request status for current badge
  const [existingRequest, setExistingRequest] = useState<BadgeRequestItem | null>(null);

  const isMissionActive = missionStartedAt !== null && missionEndedAt === null;
  const isMissionStopped = missionStartedAt !== null && missionEndedAt !== null;
  const durationMs = isMissionStopped ? missionEndedAt! - missionStartedAt! : 0;

  // Timer tick
  useEffect(() => {
    if (!isMissionActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const tick = () => {
      const elapsed = Date.now() - missionStartedAt!;
      const mins = Math.floor(elapsed / 60000);
      const secs = Math.floor((elapsed % 60000) / 1000);
      setTimerDisplay(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMissionActive, missionStartedAt]);

  // Reset timer/form when tab changes
  useEffect(() => {
    setMissionStartedAt(null);
    setMissionEndedAt(null);
    setTimerDisplay('00:00');
    setEvidenceReflection('');
    setEvidencePhotos([]);
    setEvidenceLink('');
    setSubmitStatus(null);
    setExistingRequest(null);
    setShowMechanism(false);
  }, [controlledActiveTab]);

  // Load existing request status for this badge
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const currentBadgeIdForRequest = INSPECTOR_TAB_BADGE_IDS[activeTab] || '';
  useEffect(() => {
    if (!accessToken || !currentBadgeIdForRequest || activeTab === 'chief') return;
    loadMyBadgeRequests(accessToken)
      .then((reqs) => {
        const match = reqs.find((r) => r.levelId === currentBadgeIdForRequest);
        setExistingRequest(match || null);
      })
      .catch(() => {
        /* silent */
      });
  }, [accessToken, currentBadgeIdForRequest, activeTab]);

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

  // Reset mission: clear tasks + timer + form
  const handleResetMission = useCallback(
    (dayNum: number) => {
      // Uncheck all tasks for this day
      const existing = progress.completedTasks[String(dayNum)] || [];
      existing.forEach((taskId) => updateInspectorTask(dayNum, taskId, false));
      // Reset timer & form
      setMissionStartedAt(null);
      setMissionEndedAt(null);
      setTimerDisplay('00:00');
      setEvidenceReflection('');
      setEvidencePhotos([]);
      setEvidenceLink('');
      setSubmitStatus(null);
    },
    [progress.completedTasks, updateInspectorTask]
  );

  // Photo upload helper
  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const remaining = 3 - evidencePhotos.length;
      const toProcess = Array.from(files).slice(0, remaining);
      toProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const MAX = 800;
            let w = img.width,
              h = img.height;
            if (w > MAX || h > MAX) {
              const ratio = Math.min(MAX / w, MAX / h);
              w = Math.round(w * ratio);
              h = Math.round(h * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setEvidencePhotos((prev) => (prev.length < 3 ? [...prev, dataUrl] : prev));
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    },
    [evidencePhotos.length]
  );

  // Submit mission to counselor
  const handleSubmitMission = useCallback(
    async (mission: InspectorDayMission, completedTaskIds: string[]) => {
      if (!accessToken || submitBusy) return;
      const reflText = evidenceReflection.trim();
      if (reflText.length < 20) {
        setSubmitStatus('Минимум 20 символов в рефлексии.');
        return;
      }
      setSubmitBusy(true);
      setSubmitStatus(null);
      try {
        const req = await createBadgeRequest(
          accessToken,
          {
            levelId: mission.badgeId,
            badgeTitle: mission.resultTitle,
            evidence: {
              source: 'inspector',
              reflection: reflText,
              photos: evidencePhotos.length > 0 ? evidencePhotos : undefined,
              link: evidenceLink.trim() || undefined,
              durationMs,
              completedTasks: completedTaskIds,
              missionDay: mission.day,
              missionTitle: mission.title,
            },
            nickname: userData.profile.nickname,
          },
          deviceId
        );
        setExistingRequest(req);
        setSubmitStatus('✅ Заявка отправлена вожатому!');
      } catch (err) {
        setSubmitStatus(err instanceof Error ? err.message : 'Не удалось отправить заявку.');
      } finally {
        setSubmitBusy(false);
      }
    },
    [
      accessToken,
      deviceId,
      evidenceReflection,
      evidencePhotos,
      evidenceLink,
      durationMs,
      submitBusy,
      userData.profile.nickname,
    ]
  );

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
            rank: getRank(userData.profile.stats.totalLevelsAchieved),
          },
          badge: {
            title: mission.title,
            emoji: mission.emoji,
            categoryId: '14',
            levelLabel: mission.resultTitle,
          },
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
      <div
        id="inspector-dashboard"
        className="inspector-dashboard inspector-dashboard--cabin"
        style={{
          position: 'relative',
          background: 'rgba(5, 12, 28, 0.4)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
          marginTop: '16px',
          color: '#e8f0ff',
        }}
      >
        {/* Rules block - always visible at top */}
        <div
          className="inspector-dashboard__rules"
          style={{
            padding: '16px 20px',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '16px',
            marginBottom: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.1em',
              margin: '0 0 10px',
            }}
          >
            Правила Инспектора Пользы
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: '20px',
              fontSize: '14px',
              opacity: 0.85,
              lineHeight: 1.6,
            }}
          >
            {INSPECTOR_RULES.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </div>

        {/* Tab nav: only when tabs controlled internally (no onTabChange from parent); otherwise tabs are in ProfileView dock */}
        {!onTabChange && (
          <div
            className="inspector-dashboard__tabs"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}
            role="tablist"
            aria-label="Разделы Инспектора"
          >
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
                    padding: '10px 14px',
                    background: isActive
                      ? 'rgba(255, 255, 255, 0.15)'
                      : tabUnlocked
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(255,255,255,0.02)',
                    border: isActive
                      ? '1px solid rgba(255, 255, 255, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    color: tabUnlocked
                      ? isActive
                        ? '#fff'
                        : 'rgba(255,255,255,0.7)'
                      : 'rgba(255,255,255,0.3)',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: tabUnlocked ? 'pointer' : 'not-allowed',
                    opacity: tabUnlocked ? 1 : 0.6,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {lockedTabHint && (
          <div
            style={{
              padding: '14px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '13px',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            {lockedTabHint}
          </div>
        )}

        {/* Content */}
        {!unlocked ? (
          <div style={{ padding: '32px', textAlign: 'center', opacity: 0.6 }}>
            <p>Сначала заверши предыдущую миссию.</p>
          </div>
        ) : isChiefTab ? (
          <div
            className="inspector-dashboard__chief"
            style={{
              padding: '24px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '20px' }}>👑 Главный Инспектор</h3>
            <p style={{ fontSize: '15px', opacity: 0.85, marginBottom: '20px', lineHeight: 1.5 }}>
              Выполни все 7 базовых миссий и получи не менее 3 значков из серии Инспектора Пользы.
            </p>
            <p style={{ fontSize: '14px', opacity: 0.7 }}>
              Когда условия выполнены — ты Главный Инспектор!
            </p>
            {onNavigateToBadge && (
              <button
                type="button"
                onClick={() => onNavigateToBadge('14.9')}
                style={{
                  marginTop: '20px',
                  padding: '12px 20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')
                }
              >
                Открыть значок 14.9
              </button>
            )}
          </div>
        ) : mission ? (
          <div className="inspector-dashboard__mission">
            {/* Goal + description */}
            <div
              style={{
                padding: '18px 20px',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                marginBottom: '16px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: 600, opacity: 0.9, margin: 0 }}>
                🎯 Цель: {mission.goal}
              </p>
              <p style={{ fontSize: '13px', opacity: 0.7, margin: '8px 0 0', lineHeight: 1.5 }}>
                {mission.description}
              </p>
            </div>

            {/* 4К Skills tags */}
            <SkillTagsRow skills={mission.skills} skillDetails={mission.skillDetails} />

            {/* Mechanism + Benefit collapsible */}
            <MethodologyBlock
              mission={mission}
              isOpen={showMechanism}
              onToggle={() => setShowMechanism(!showMechanism)}
            />

            {onOpenDiary && (
              <div
                style={{
                  padding: '16px 20px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: '16px',
                }}
              >
                <p style={{ fontSize: '13px', margin: '0 0 12px', opacity: 0.85 }}>
                  Перед миссией полезно записать рефлексию в Реальном Дневнике.
                </p>
                <button
                  type="button"
                  onClick={onOpenDiary}
                  style={{
                    padding: '10px 18px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')
                  }
                >
                  Открыть Дневник
                </button>
              </div>
            )}

            {/* Timer controls */}
            {!alreadyAchieved && !existingRequest && (
              <div
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 18px',
                  background: isMissionActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.04)',
                  borderRadius: '14px',
                  border: `1px solid ${isMissionActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.3s',
                }}
              >
                {!missionStartedAt ? (
                  <button
                    type="button"
                    onClick={() => setMissionStartedAt(Date.now())}
                    style={{
                      padding: '10px 20px',
                      background: '#22c55e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    ▶️ НАЧАТЬ МИССИЮ
                  </button>
                ) : isMissionActive ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#22c55e',
                          animation: 'pulse 1.5s infinite',
                        }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>
                        Миссия идёт
                      </span>
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          color: '#fff',
                          marginLeft: 'auto',
                        }}
                      >
                        {timerDisplay}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMissionEndedAt(Date.now())}
                      disabled={completedForDay.length === 0}
                      style={{
                        padding: '8px 16px',
                        background:
                          completedForDay.length > 0
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'rgba(255,255,255,0.05)',
                        color: completedForDay.length > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)',
                        border: `1px solid ${completedForDay.length > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: completedForDay.length > 0 ? 'pointer' : 'not-allowed',
                      }}
                    >
                      ⏹ ЗАВЕРШИТЬ
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '13px', opacity: 0.7 }}>⏱ Время выполнения:</span>
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        color: '#5de4ff',
                      }}
                    >
                      {Math.floor(durationMs / 60000)}:
                      {String(Math.floor((durationMs % 60000) / 1000)).padStart(2, '0')}
                    </span>
                  </div>
                )}
                {!missionStartedAt && (
                  <span style={{ fontSize: '11px', opacity: 0.5, flex: 1, textAlign: 'right' }}>
                    Нажми «Начать», чтобы открыть задания
                  </span>
                )}
              </div>
            )}

            {/* Existing request status */}
            {existingRequest && (
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '14px',
                  marginBottom: '16px',
                  background:
                    existingRequest.status === 'approved'
                      ? 'rgba(34,197,94,0.12)'
                      : existingRequest.status === 'rejected'
                        ? 'rgba(239,68,68,0.12)'
                        : 'rgba(255,193,7,0.12)',
                  border: `1px solid ${existingRequest.status === 'approved' ? 'rgba(34,197,94,0.3)' : existingRequest.status === 'rejected' ? 'rgba(239,68,68,0.3)' : 'rgba(255,193,7,0.3)'}`,
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                  {existingRequest.status === 'pending' && '⏳ Заявка на проверке у вожатого'}
                  {existingRequest.status === 'approved' && '✅ Миссия подтверждена вожатым!'}
                  {existingRequest.status === 'rejected' && '❌ Заявка отклонена'}
                </div>
                {existingRequest.resolutionNote && (
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                    Комментарий: {existingRequest.resolutionNote}
                  </div>
                )}
                {existingRequest.status === 'rejected' && (
                  <button
                    type="button"
                    onClick={() => {
                      setExistingRequest(null);
                      setMissionStartedAt(null);
                      setMissionEndedAt(null);
                    }}
                    style={{
                      marginTop: '8px',
                      padding: '6px 14px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Попробовать снова
                  </button>
                )}
              </div>
            )}

            {/* Tasks — locked unless timer started or already achieved/pending */}
            <div
              style={{
                display: 'grid',
                gap: '8px',
                opacity: !missionStartedAt && !alreadyAchieved && !existingRequest ? 0.4 : 1,
                pointerEvents:
                  !missionStartedAt && !alreadyAchieved && !existingRequest ? 'none' : 'auto',
                transition: 'opacity 0.3s',
              }}
            >
              {mission.tasks.map((task) => {
                const isCompleted = completedForDay.includes(task.id);
                const taskLocked = isMissionStopped && !isCompleted;
                return (
                  <div
                    key={task.id}
                    onClick={() =>
                      !taskLocked &&
                      !existingRequest &&
                      updateInspectorTask(mission.day, task.id, !isCompleted)
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px 20px',
                      background: isCompleted
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '16px',
                      border: isCompleted
                        ? '1px solid rgba(255, 255, 255, 0.2)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      cursor: taskLocked || !!existingRequest ? 'default' : 'pointer',
                      transition: 'all 0.25s ease',
                      boxShadow: isCompleted ? '0 4px 16px rgba(0,0,0,0.1)' : 'none',
                      opacity: taskLocked ? 0.5 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '8px',
                        border: isCompleted ? 'none' : '2px solid rgba(255, 255, 255, 0.3)',
                        background: isCompleted ? '#fff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        color: '#0f172a',
                        fontWeight: 800,
                      }}
                    >
                      {isCompleted && '✓'}
                    </div>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        opacity: isCompleted ? 0.6 : 1,
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        flex: 1,
                        lineHeight: 1.4,
                      }}
                    >
                      {task.text}
                    </span>
                    {task.isChallenge && (
                      <span title="Челлендж" style={{ fontSize: '16px' }}>
                        🔥
                      </span>
                    )}
                    {task.isCoop && (
                      <span title="Кооператив" style={{ fontSize: '16px' }}>
                        👥
                      </span>
                    )}
                    {task.isCamp && (
                      <span title="Лагерное" style={{ fontSize: '16px' }}>
                        ✨
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  flex: 1,
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${totalTasks ? (completedForDay.length / totalTasks) * 100 : 0}%`,
                    height: '100%',
                    background: '#fff',
                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.8 }}>
                {completedForDay.length} / {totalTasks}
              </span>
            </div>

            {/* Restart button — shown when there's progress but not yet approved */}
            {completedForDay.length > 0 && !alreadyAchieved && !existingRequest && (
              <div style={{ marginTop: '10px', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Сбросить все задания и начать миссию заново?'))
                      handleResetMission(mission.day);
                  }}
                  style={{
                    padding: '5px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px dashed rgba(255,255,255,0.2)',
                    borderRadius: 0,
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.02em',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
                    e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.2)';
                  }}
                >
                  Начать заново
                </button>
              </div>
            )}

            {/* Evidence form — shown after timer stopped and all tasks done */}
            {isMissionStopped && isDayComplete && !alreadyAchieved && !existingRequest && (
              <div
                className="fade-in"
                style={{
                  marginTop: '16px',
                  padding: '20px',
                  background: `rgba(${INSPECTOR_ACCENT_RGB}, 0.15)`,
                  borderRadius: '16px',
                  border: `1px solid ${INSPECTOR_ACCENT}`,
                }}
              >
                <div style={{ fontSize: '28px', marginBottom: '8px', textAlign: 'center' }}>🏆</div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '15px',
                    color: INSPECTOR_ACCENT,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                  }}
                >
                  Миссия выполнена!
                </div>
                <div
                  style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px', textAlign: 'center' }}
                >
                  Ты — <strong>{mission.resultTitle}</strong>
                </div>

                {/* Benefit */}
                <div
                  style={{
                    margin: '16px 0',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: INSPECTOR_ACCENT,
                      marginBottom: '4px',
                    }}
                  >
                    Польза этой миссии
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: 1.5, opacity: 0.85 }}>
                    {mission.benefit}
                  </div>
                </div>

                {/* Auto-stats */}
                <div
                  style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}
                >
                  <div
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      background: 'rgba(93,228,255,0.1)',
                      border: '1px solid rgba(93,228,255,0.2)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#5de4ff',
                    }}
                  >
                    ⏱ {Math.floor(durationMs / 60000)} мин {Math.floor((durationMs % 60000) / 1000)}{' '}
                    сек
                  </div>
                  <div
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      background: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.2)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#22c55e',
                    }}
                  >
                    ✅ {completedForDay.length} / {totalTasks} заданий
                  </div>
                </div>

                {/* Reflection textarea */}
                <div style={{ marginBottom: '14px' }}>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'rgba(255,255,255,0.5)',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    📝 Рефлексия миссии *
                  </label>
                  <textarea
                    value={evidenceReflection}
                    onChange={(e) => setEvidenceReflection(e.target.value)}
                    placeholder="Что было легко? Что далось с трудом? Кому помог? Какой навык прокачал?"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      color: '#e8f0ff',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div
                    style={{ fontSize: '10px', opacity: 0.4, marginTop: '4px', textAlign: 'right' }}
                  >
                    {evidenceReflection.length} / 20+ символов
                  </div>
                </div>

                {/* Photo uploader */}
                <div style={{ marginBottom: '14px' }}>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'rgba(255,255,255,0.5)',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    📸 Фото (до 3)
                  </label>
                  <div
                    style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}
                  >
                    {evidencePhotos.map((p, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          width: '64px',
                          height: '64px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.15)',
                        }}
                      >
                        <img
                          src={p}
                          alt={`Фото ${i + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEvidencePhotos((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.7)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {evidencePhotos.length < 3 && (
                      <label
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '10px',
                          border: '2px dashed rgba(255,255,255,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '22px',
                          opacity: 0.5,
                          transition: 'opacity 0.2s',
                        }}
                      >
                        +
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Artifact link */}
                <div style={{ marginBottom: '16px' }}>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'rgba(255,255,255,0.5)',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    📎 Ссылка на артефакт
                  </label>
                  <input
                    type="url"
                    value={evidenceLink}
                    onChange={(e) => setEvidenceLink(e.target.value)}
                    placeholder="Сценарий, план, документ…"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#e8f0ff',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Submit status */}
                {submitStatus && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: submitStatus.startsWith('✅')
                        ? 'rgba(34,197,94,0.12)'
                        : 'rgba(239,68,68,0.12)',
                      border: `1px solid ${submitStatus.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      fontSize: '13px',
                      marginBottom: '12px',
                    }}
                  >
                    {submitStatus}
                  </div>
                )}

                {/* Submit button */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    alignItems: 'center',
                  }}
                >
                  {accessToken ? (
                    <button
                      type="button"
                      disabled={submitBusy || evidenceReflection.trim().length < 20}
                      onClick={() => handleSubmitMission(mission, completedForDay)}
                      style={{
                        padding: '12px 24px',
                        background:
                          evidenceReflection.trim().length >= 20
                            ? INSPECTOR_ACCENT
                            : 'rgba(255,255,255,0.1)',
                        color:
                          evidenceReflection.trim().length >= 20 ? '#fff' : 'rgba(255,255,255,0.4)',
                        border: 'none',
                        borderRadius: '100px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: evidenceReflection.trim().length >= 20 ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                      }}
                    >
                      {submitBusy ? 'Отправка…' : '📨 ОТПРАВИТЬ НА ПРОВЕРКУ'}
                    </button>
                  ) : (
                    <div style={{ fontSize: '12px', opacity: 0.6, textAlign: 'center' }}>
                      Для отправки заявки нужен код участника смены.
                    </div>
                  )}
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      color: INSPECTOR_ACCENT,
                      border: `1px solid ${INSPECTOR_ACCENT}`,
                      borderRadius: '100px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareReport();
                    }}
                  >
                    ОТПРАВИТЬ РАПОРТ 9:16
                  </button>
                </div>
              </div>
            )}

            {/* Already achieved badge */}
            {alreadyAchieved && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'rgba(34,197,94,0.12)',
                  borderRadius: '14px',
                  border: '1px solid rgba(34,197,94,0.3)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>✅</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>
                  Значок получен
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  /* Accordion variant (non-cabin) */
  const currentDayIndex = progress.currentDay;
  const currentMission =
    inspectorMissions.find((m) => m.day === currentDayIndex) || inspectorMissions[0];
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
          rank: getRank(userData.profile.stats.totalLevelsAchieved),
        },
        badge: {
          title: currentMission.title,
          emoji: currentMission.emoji,
          categoryId: '14',
          levelLabel: currentMission.resultTitle,
        },
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

  /* Inspector Path summary */
  const completedMissions = inspectorMissions.filter((m) => {
    const badge = INSPECTOR_TAB_BADGE_IDS[INSPECTOR_TAB_IDS[m.day - 1]];
    return userProgress[badge]?.status === 'achieved';
  });
  const allSkillsUsed = new Set(completedMissions.flatMap((m) => m.skills));

  const wrapperStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, rgba(${INSPECTOR_ACCENT_RGB}, 0.1) 0%, rgba(var(--teal-600-rgb), 0.15) 100%)`,
    borderRadius: '24px',
    padding: '20px',
    border: `1px solid ${isDayComplete ? INSPECTOR_ACCENT : `rgba(${INSPECTOR_ACCENT_RGB}, 0.3)`}`,
    marginBottom: '24px',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <>
      {/* Inspector Path summary */}
      {completedMissions.length > 0 && (
        <InspectorPathSummary
          completedMissions={completedMissions}
          totalMissions={inspectorMissions.length}
          allSkillsUsed={allSkillsUsed}
          userProgress={userProgress}
        />
      )}

      <div id="inspector-dashboard" className="inspector-dashboard" style={wrapperStyle}>
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            background: INSPECTOR_ACCENT,
            filter: 'blur(50px)',
            opacity: isDayComplete ? 0.2 : 0.1,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: isExpanded ? '20px' : '0',
          }}
        >
          <div onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer', flex: 1 }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: INSPECTOR_ACCENT,
                letterSpacing: '0.1em',
                marginBottom: '4px',
              }}
            >
              Ветка: Инспектор Пользы
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              День {currentMission.day}: {currentMission.title} {currentMission.emoji}
            </h3>
            {!isExpanded && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      flex: 1,
                      height: '4px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(completedForDay.length / totalTasks) * 100}%`,
                        height: '100%',
                        background: INSPECTOR_ACCENT,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '12px', opacity: 0.6 }}>
                    {completedForDay.length} / {totalTasks}
                  </span>
                </div>
                {/* Compact skills row when collapsed */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {currentMission.skills.map((sk) => {
                    const meta = SKILL_4K_LABELS[sk];
                    return (
                      <span
                        key={sk}
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background: `${meta.color}18`,
                          color: meta.color,
                          fontWeight: 600,
                        }}
                      >
                        {meta.emoji} {meta.label}
                      </span>
                    );
                  })}
                </div>
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
                cursor: 'pointer',
              }}
            >
              СЛЕД. ДЕНЬ
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: 'none',
                border: 'none',
                color: INSPECTOR_ACCENT,
                fontSize: '20px',
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
          <div className="fade-in" style={{ display: 'grid', gap: '12px' }}>
            {/* Goal + description */}
            <div
              style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px' }}
            >
              <p style={{ fontSize: '13px', opacity: 0.8, fontStyle: 'italic', margin: 0 }}>
                🎯 Цель: {currentMission.goal}
              </p>
              <p style={{ fontSize: '12px', opacity: 0.6, margin: '6px 0 0', lineHeight: 1.5 }}>
                {currentMission.description}
              </p>
            </div>

            {/* 4К Skills tags */}
            <SkillTagsRow
              skills={currentMission.skills}
              skillDetails={currentMission.skillDetails}
            />

            {onOpenDiary && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p style={{ fontSize: '12px', margin: '0 0 10px', opacity: 0.9 }}>
                  Перед миссией полезно записать рефлексию в Реальном Дневнике.
                </p>
                <button
                  type="button"
                  onClick={onOpenDiary}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(255,255,255,0.08)',
                    border: `1px solid rgba(${INSPECTOR_ACCENT_RGB}, 0.4)`,
                    color: INSPECTOR_ACCENT,
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
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
                    background: isCompleted
                      ? `rgba(${INSPECTOR_ACCENT_RGB}, 0.15)`
                      : 'rgba(255,255,255,0.03)',
                    borderRadius: '14px',
                    border: `1px solid ${isCompleted ? `rgba(${INSPECTOR_ACCENT_RGB}, 0.4)` : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '6px',
                      border: `2px solid ${isCompleted ? INSPECTOR_ACCENT : 'rgba(255,255,255,0.3)'}`,
                      background: isCompleted ? INSPECTOR_ACCENT : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                    }}
                  >
                    {isCompleted && '✓'}
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      opacity: isCompleted ? 0.6 : 1,
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      flex: 1,
                    }}
                  >
                    {task.text}
                  </span>
                  {task.isChallenge && (
                    <span title="Челлендж" style={{ fontSize: '14px' }}>
                      🔥
                    </span>
                  )}
                  {task.isCoop && (
                    <span title="Кооператив" style={{ fontSize: '14px' }}>
                      👥
                    </span>
                  )}
                  {task.isCamp && (
                    <span title="Лагерное" style={{ fontSize: '14px' }}>
                      ✨
                    </span>
                  )}
                </div>
              );
            })}

            {isDayComplete && (
              <div
                className="fade-in"
                style={{
                  marginTop: '12px',
                  padding: '16px',
                  background: `rgba(${INSPECTOR_ACCENT_RGB}, 0.2)`,
                  borderRadius: '16px',
                  textAlign: 'center',
                  border: `1px solid ${INSPECTOR_ACCENT}`,
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏆</div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '14px',
                    color: INSPECTOR_ACCENT,
                    textTransform: 'uppercase',
                  }}
                >
                  Миссия выполнена!
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                  Сегодня ты — <strong>{currentMission.resultTitle}</strong>
                </div>
                {shareError ? (
                  <div
                    className="profile-error profile-error--not-found"
                    style={{ marginTop: 12, textAlign: 'left' }}
                  >
                    {shareError}
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ marginTop: 8 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareReport();
                      }}
                    >
                      Повторить
                    </button>
                  </div>
                ) : isSharing ? (
                  <p className="profile-loading" style={{ marginTop: 12 }}>
                    Генерируем рапорт…
                  </p>
                ) : (
                  <button
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      background: INSPECTOR_ACCENT,
                      color: '#0b1b16',
                      border: 'none',
                      borderRadius: '100px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
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
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Skill Tags Row                                                       */
/* ------------------------------------------------------------------ */
const SkillTagsRow: React.FC<{
  skills: import('../types/inspector').Skill4K[];
  skillDetails: Record<string, string>;
}> = ({ skills, skillDetails }) => {
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.45)',
          marginBottom: '8px',
        }}
      >
        Навыки 4К
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {skills.map((sk) => {
          const meta = SKILL_4K_LABELS[sk];
          const isExpanded = expandedSkill === sk;
          return (
            <button
              key={sk}
              type="button"
              onClick={() => setExpandedSkill(isExpanded ? null : sk)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: isExpanded ? `${meta.color}25` : `${meta.color}12`,
                border: `1px solid ${isExpanded ? `${meta.color}55` : `${meta.color}22`}`,
                color: meta.color,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>
      {expandedSkill && skillDetails[expandedSkill] && (
        <div
          className="fade-in"
          style={{
            marginTop: '8px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: `${SKILL_4K_LABELS[expandedSkill as keyof typeof SKILL_4K_LABELS]?.color || '#5de4ff'}10`,
            border: `1px solid ${SKILL_4K_LABELS[expandedSkill as keyof typeof SKILL_4K_LABELS]?.color || '#5de4ff'}22`,
            fontSize: '13px',
            lineHeight: 1.5,
            opacity: 0.85,
          }}
        >
          <strong>{SKILL_4K_LABELS[expandedSkill as keyof typeof SKILL_4K_LABELS]?.emoji}</strong>{' '}
          {skillDetails[expandedSkill]}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Methodology Block (Mechanism + Benefit)                              */
/* ------------------------------------------------------------------ */
const MethodologyBlock: React.FC<{
  mission: InspectorDayMission;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ mission, isOpen, onToggle }) => (
  <div style={{ marginBottom: '16px' }}>
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '12px 16px',
        borderRadius: '12px',
        background: isOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        color: '#e8f0ff',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: '14px' }}>📚</span>
      <span style={{ flex: 1 }}>Почему это важно?</span>
      <span
        style={{
          fontSize: '12px',
          opacity: 0.5,
          transform: isOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.3s',
        }}
      >
        ▾
      </span>
    </button>
    {isOpen && (
      <div
        className="fade-in"
        style={{
          padding: '16px',
          marginTop: '8px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.45)',
              marginBottom: '8px',
            }}
          >
            Механизм пользы
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {mission.mechanism.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  opacity: 0.85,
                }}
              >
                <span style={{ color: '#5de4ff', fontWeight: 700, flexShrink: 0 }}>→</span>
                <span>{m}</span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(93, 228, 255, 0.06)',
            borderRadius: '10px',
            border: '1px solid rgba(93, 228, 255, 0.12)',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#5de4ff',
              marginBottom: '4px',
            }}
          >
            Результат
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.5, opacity: 0.85 }}>{mission.benefit}</div>
        </div>
      </div>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* Inspector Path Summary                                               */
/* ------------------------------------------------------------------ */
const InspectorPathSummary: React.FC<{
  completedMissions: InspectorDayMission[];
  totalMissions: number;
  allSkillsUsed: Set<import('../types/inspector').Skill4K>;
  userProgress: Record<string, { status?: string }>;
}> = ({ completedMissions, totalMissions, allSkillsUsed, userProgress }) => {
  const chiefAchieved = userProgress['14.9.1']?.status === 'achieved';

  return (
    <div
      style={{
        background: 'rgba(5, 12, 28, 0.4)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '20px',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '22px' }}>🗺️</span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e8f0ff' }}>
            Мой путь Инспектора
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
            {completedMissions.length} из {totalMissions} миссий завершено
            {chiefAchieved && ' · 👑 Главный Инспектор!'}
          </div>
        </div>
      </div>

      {/* Mission progress dots */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {Array.from({ length: totalMissions }, (_, i) => {
          const m = inspectorMissions[i];
          const done = completedMissions.includes(m);
          return (
            <div
              key={i}
              title={`${m.title} ${done ? '✅' : '⬜'}`}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                background: done ? '#5de4ff' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.3s',
              }}
            />
          );
        })}
      </div>

      {/* Completed missions list */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        {completedMissions.map((m) => (
          <span
            key={m.day}
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              background: 'rgba(93, 228, 255, 0.1)',
              border: '1px solid rgba(93, 228, 255, 0.2)',
              fontSize: '11px',
              fontWeight: 600,
              color: '#5de4ff',
            }}
          >
            {m.emoji} {m.resultTitle}
          </span>
        ))}
      </div>

      {/* Skills radar */}
      <div>
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '8px',
          }}
        >
          Развитые навыки
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {Object.entries(SKILL_4K_LABELS).map(([key, meta]) => {
            const active = allSkillsUsed.has(key as import('../types/inspector').Skill4K);
            return (
              <span
                key={key}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: active ? `${meta.color}20` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? `${meta.color}33` : 'rgba(255,255,255,0.06)'}`,
                  color: active ? meta.color : 'rgba(255,255,255,0.25)',
                  fontSize: '10px',
                  fontWeight: 600,
                  transition: 'all 0.3s',
                }}
              >
                {meta.emoji} {meta.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
