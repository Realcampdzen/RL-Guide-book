import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHintOverlay } from '../context/HintOverlayContext';
import { useTeam } from '../context/TeamContext';
import { useUserProgress } from '../hooks/useUserProgress';
import type { EngineProject, TeamPlanGridData } from '../types/teams';
import { EMOJI_CATEGORIES } from '../utils/emojiData';
import { requestImageGenerate } from '../utils/imageGenerateApi';
import { downloadBlob, shareOrDownloadSocialCard } from '../utils/socialGenerator';
import BadgeIcon from './BadgeIcon';
import type { GerbStyle } from './ImageSourceBlock';
import { ImageSourceBlock } from './ImageSourceBlock';
import { ODeConstructorPanel } from './ODeConstructorPanel';
import { SquadChat } from './SquadChat';

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  return useLocal
    ? ''
    : ((import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') as string).replace(
        /\/$/,
        ''
      );
}

const TEAM_ACCENT = '#8b00ff';
const STORAGE_KEY = 'putevoditel_profile_team_collapsed';
const TEAM_GRADIENT =
  'linear-gradient(135deg, rgba(139, 0, 255, 0.1) 0%, rgba(77, 166, 255, 0.15) 100%)';
const TEAM_BORDER = '1px solid rgba(139, 0, 255, 0.3)';

type PlannerGridId = 'planGridA' | 'planGridB';
export type TeamTabId =
  | 'my-engines'
  | 'engine'
  | 'engine-project'
  | 'engine-plan'
  | 'engine-path'
  | 'engine-chat'
  | 'camp-control'
  | 'engine-create'
  | 'ode';

interface TeamDashboardProps {
  onSuggestInitiative?: () => void;
  forceExpanded?: boolean;
  variant?: 'accordion' | 'cabin';
  activeTab?: TeamTabId;
  onTabChange?: (tab: TeamTabId) => void;
  onNavigateToBadge?: (badgeId: string) => void;
}

const PATH_BADGES = [
  { id: '8.1', title: 'Реальный Движок', emoji: '🚀' },
  { id: '8.2', title: 'Фиолетовый Значок Движка', emoji: '🟣' },
  { id: '8.3', title: 'Небесный Значок Движка', emoji: '🔵' },
  { id: '8.4', title: 'Движок Движков', emoji: '🔥' },
  { id: '8.5', title: 'Легендарный Движок', emoji: '🎭' },
  { id: '8.6', title: 'Совет Реального Лагеря', emoji: '👑' },
  { id: '8.7', title: 'Чёрный Значок Движка', emoji: '⚫' },
] as const;

const isImageUrl = (s?: string) => Boolean(s && (s.startsWith('data:') || s.startsWith('http')));
const sanitizeFilename = (s: string) =>
  (s || 'gerb').replace(/[^\w\u0400-\u04FF-]/g, '_').slice(0, 40);
const readCollapsedFromStorage = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};
const defaultPlanGrid = (): TeamPlanGridData => ({ shiftLength: 21, days: {} });
const clonePlanGrid = (grid?: TeamPlanGridData): TeamPlanGridData => {
  if (!grid) return defaultPlanGrid();
  const days: TeamPlanGridData['days'] = {};
  Object.entries(grid.days || {}).forEach(([day, value]) => {
    if (!value || typeof value !== 'object') return;
    days[day] = {
      morning: (value.morning || '').trim() || undefined,
      quietHour: (value.quietHour || '').trim() || undefined,
      day: (value.day || '').trim() || undefined,
      evening: (value.evening || '').trim() || undefined,
      night: (value.night || '').trim() || undefined,
    };
  });
  return { shiftLength: grid.shiftLength === 9 ? 9 : 21, days };
};

const sectionCard: React.CSSProperties = {
  padding: '16px 18px',
  borderRadius: 14,
  background: 'rgba(15, 10, 42, 0.12)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
};

export const TeamDashboard: React.FC<TeamDashboardProps> = ({
  onSuggestInitiative,
  forceExpanded,
  variant = 'accordion',
  activeTab = 'engine',
  onTabChange,
  onNavigateToBadge,
}) => {
  const {
    myTeam,
    myTeams,
    setActiveTeam,
    isLoading,
    loadError,
    syncTeam,
    createTeam,
    updateTeam,
    joinTeam,
    leaveTeam,
    deleteTeam,
    generateInviteUrl,
  } = useTeam();
  const { userData } = useUserProgress();
  const { accessToken, deviceId } = useAuth();
  const { showHint } = useHintOverlay();
  const currentUserId = accessToken ? deviceId : (userData?.profile?.id ?? 'local');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const createLogoInputRef = useRef<HTMLInputElement>(null);

  const [isCollapsed, setIsCollapsed] = useState(() =>
    forceExpanded ? false : readCollapsedFromStorage()
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: '',
    motto: '',
    logo: '🚀',
    firstProject: '',
    scope: 'camp' as 'camp' | 'shift' | 'squad',
    shiftId: '',
    squadId: '',
  });
  const [joinCode, setJoinCode] = useState('');
  const [joinPreview, setJoinPreview] = useState<{
    id: string;
    name: string;
    motto: string;
  } | null>(null);
  const [joinPreviewLoading, setJoinPreviewLoading] = useState(false);
  const [joinPreviewError, setJoinPreviewError] = useState<null | 'not_found' | 'network'>(null);
  const [joinRetryVisible, setJoinRetryVisible] = useState(false);
  const [engineParamApplied, setEngineParamApplied] = useState(false);

  // Engine cabinet edit mode
  const [engineEditing, setEngineEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMotto, setEditMotto] = useState('');
  const [editLogo, setEditLogo] = useState('');

  // Emoji picker for engine creation
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerCat, setEmojiPickerCat] = useState('smileys');
  const emojiPickerEmojis = useMemo(
    () => EMOJI_CATEGORIES.find((c) => c.id === emojiPickerCat)?.emojis || [],
    [emojiPickerCat]
  );

  // Engine projects
  const [engineProjects, setEngineProjects] = useState<EngineProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    plan: '',
    targetBadgeId: '',
    reflection: '',
    scenario: '',
  });
  const [projectPhotos, setProjectPhotos] = useState<string[]>([]);
  const projectPhotoRef = useRef<HTMLInputElement>(null);
  const [projCreating, setProjCreating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Load projects when active team changes
  useEffect(() => {
    if (!myTeam?.id || !accessToken) return;
    setProjectsLoading(true);
    fetch(`${getApiBase()}/api/teams/${encodeURIComponent(myTeam.id)}/projects`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setEngineProjects(data);
      })
      .catch(() => {})
      .finally(() => setProjectsLoading(false));
  }, [myTeam?.id, accessToken]);

  const [activePlannerGrid, setActivePlannerGrid] = useState<PlannerGridId>('planGridA');
  const [plannerDay, setPlannerDay] = useState(1);
  const [localPlanGridA, setLocalPlanGridA] = useState<TeamPlanGridData>(() =>
    clonePlanGrid(myTeam?.planGridA)
  );
  const [localPlanGridB, setLocalPlanGridB] = useState<TeamPlanGridData>(() =>
    clonePlanGrid(myTeam?.planGridB)
  );

  useEffect(() => {
    if (!forceExpanded || variant !== 'accordion') return;
    setIsCollapsed(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'false');
    } catch {
      // ignore
    }
  }, [forceExpanded, variant]);

  useEffect(() => {
    if (variant === 'cabin' && onTabChange) onTabChange(activeTab);
  }, [variant, activeTab, onTabChange]);

  useEffect(() => {
    setLocalPlanGridA(clonePlanGrid(myTeam?.planGridA));
    setLocalPlanGridB(clonePlanGrid(myTeam?.planGridB));
  }, [myTeam?.planGridA, myTeam?.planGridB]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const fetchJoinPreview = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) return;
    setJoinPreviewLoading(true);
    setJoinPreviewError(null);
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(normalized)}`);
      if (res.ok) {
        const data = await res.json();
        setJoinPreview({ id: data.id, name: data.name ?? '', motto: data.motto ?? '' });
      } else if (res.status === 404) {
        setJoinPreview(null);
        setJoinPreviewError('not_found');
      } else {
        setJoinPreview(null);
        setJoinPreviewError('network');
      }
    } catch {
      setJoinPreview(null);
      setJoinPreviewError('network');
    } finally {
      setJoinPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    const normalized = joinCode.trim().toUpperCase();
    if (normalized.length < 4) {
      setJoinPreview(null);
      setJoinPreviewError(null);
      setJoinPreviewLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      void fetchJoinPreview(normalized);
    }, 400);
    return () => clearTimeout(timer);
  }, [joinCode, fetchJoinPreview]);

  useEffect(() => {
    if (engineParamApplied || myTeam) return;
    const params = new URLSearchParams(window.location.search);
    const engineData = params.get('engine');
    if (!engineData) return;
    try {
      const decoded = JSON.parse(atob(engineData)) as {
        id?: string;
        name?: string;
        motto?: string;
      };
      if (decoded?.id && decoded?.name) {
        setJoinCode(decoded.id);
        setJoinPreview({ id: decoded.id, name: decoded.name, motto: decoded.motto ?? '' });
        setIsJoining(true);
        setEngineParamApplied(true);
      }
    } catch {
      // ignore invalid engine param
    }
  }, [engineParamApplied, myTeam]);

  const retryJoinPreview = useCallback(() => {
    if (joinCode.trim().length >= 4) void fetchJoinPreview(joinCode.trim());
  }, [joinCode, fetchJoinPreview]);

  const handleCreate = async () => {
    if (!teamForm.name.trim() || !teamForm.firstProject.trim()) {
      showHint({
        title: 'Нужны имя и проект',
        content: 'Для запуска Движка нужно имя и описание первого проекта.',
      });
      return;
    }
    if (teamForm.scope === 'shift' && !teamForm.shiftId.trim()) {
      showHint({
        title: 'Нужен shiftId',
        content: 'Для движка уровня смены укажи идентификатор смены.',
      });
      return;
    }
    if (teamForm.scope === 'squad' && (!teamForm.shiftId.trim() || !teamForm.squadId.trim())) {
      showHint({
        title: 'Нужны shiftId и squadId',
        content: 'Для движка уровня отряда укажи идентификаторы смены и отряда.',
      });
      return;
    }
    try {
      const createdTeam = await createTeam({
        name: teamForm.name.trim(),
        motto: teamForm.motto.trim(),
        logo: teamForm.logo.trim() || '🚀',
        leaderId: userData?.profile?.id ?? 'local',
        goals: [],
        scope: teamForm.scope,
        shiftId: teamForm.shiftId.trim() || undefined,
        squadId: teamForm.squadId.trim() || undefined,
      });
      // Auto-create first project for badge 8.1
      if (teamForm.firstProject.trim() && createdTeam?.id) {
        try {
          const projRes = await fetch(
            `${getApiBase()}/api/teams/${encodeURIComponent(createdTeam.id)}/projects`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ title: teamForm.firstProject.trim(), targetBadgeId: '8.1' }),
            }
          );
          if (projRes.ok) {
            const proj = await projRes.json();
            setEngineProjects((prev) => [...prev, proj]);
          }
        } catch {
          /* ignore — engine is already created */
        }
      }
      setIsCreating(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'already_in_team') {
        showHint({
          title: 'Уже в Движке',
          content: 'Ты уже состоишь в Движке. Сначала выйди из текущего.',
        });
      } else {
        showHint({ title: 'Ошибка', content: 'Не удалось создать Движок.' });
      }
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      const joined = await joinTeam(joinCode.trim().toUpperCase(), {
        nickname: userData?.profile?.nickname,
        avatar: userData?.profile?.avatar,
      });
      if (joined) {
        setJoinRetryVisible(false);
        setIsJoining(false);
        setJoinCode('');
        setJoinPreview(null);
        setJoinPreviewError(null);
      } else {
        showHint({ title: 'Код не найден', content: 'Проверь символы кода Движка.' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'already_in_another_team') {
        showHint({ title: 'Уже в другом Движке', content: 'Сначала выйди из текущего Движка.' });
      } else {
        setJoinRetryVisible(true);
      }
    }
  };

  const handleDownloadGerb = useCallback(async () => {
    if (!myTeam?.gerbImage || !isImageUrl(myTeam.gerbImage)) return;
    try {
      const res = await fetch(myTeam.gerbImage);
      const blob = await res.blob();
      const filename = `gerb-${sanitizeFilename(myTeam.name)}.png`;
      downloadBlob(blob, filename);
      showHint({ title: 'Скачано', content: `Файл ${filename} сохранён.` });
    } catch {
      showHint({ title: 'Ошибка', content: 'Не удалось скачать герб.' });
    }
  }, [myTeam, showHint]);

  const handleShareGerb = useCallback(async () => {
    if (!myTeam?.gerbImage || !isImageUrl(myTeam.gerbImage)) return;
    try {
      const res = await fetch(myTeam.gerbImage);
      const blob = await res.blob();
      const filename = `gerb-${sanitizeFilename(myTeam.name)}.png`;
      const result = await shareOrDownloadSocialCard({
        blob,
        mimeType: 'image/png',
        filename,
        title: 'Герб Движка',
        text: myTeam.name,
        width: 360,
        height: 640,
      });
      if (result === 'shared') showHint({ title: 'Поделено', content: 'Герб отправлен.' });
      if (result === 'downloaded')
        showHint({ title: 'Скачано', content: `Файл ${filename} сохранён.` });
    } catch {
      showHint({ title: 'Ошибка', content: 'Не удалось поделиться гербом.' });
    }
  }, [myTeam, showHint]);

  const teamLeaderNickname =
    myTeam?.members.find((m) => m.id === myTeam.leaderId)?.nickname ??
    userData?.profile?.nickname ??
    'Искатель';
  const teamChatMembers = useMemo(
    () =>
      (myTeam?.members || []).map((member) => ({
        deviceId: member.id,
        nickname: member.nickname || null,
        avatarUrl: member.avatar || null,
      })),
    [myTeam]
  );

  const currentPlannerGrid = activePlannerGrid === 'planGridA' ? localPlanGridA : localPlanGridB;
  const plannerDays = useMemo(
    () => Array.from({ length: currentPlannerGrid.shiftLength }, (_, index) => index + 1),
    [currentPlannerGrid.shiftLength]
  );
  const plannerDayData = currentPlannerGrid.days[String(plannerDay)] || {};

  useEffect(() => {
    if (plannerDay > currentPlannerGrid.shiftLength) {
      setPlannerDay(currentPlannerGrid.shiftLength);
    }
  }, [plannerDay, currentPlannerGrid.shiftLength]);

  const updateCurrentPlannerGrid = (updater: (prev: TeamPlanGridData) => TeamPlanGridData) => {
    if (activePlannerGrid === 'planGridA') {
      setLocalPlanGridA(updater);
    } else {
      setLocalPlanGridB(updater);
    }
  };

  const setPlannerField = (
    field: 'morning' | 'quietHour' | 'day' | 'evening' | 'night',
    value: string
  ) => {
    const dayKey = String(plannerDay);
    updateCurrentPlannerGrid((prev) => ({
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

  const savePlanner = () => {
    updateTeam({ planGridA: localPlanGridA, planGridB: localPlanGridB });
    showHint({ title: 'Сохранено', content: 'План Движка обновлён.' });
  };

  const renderPathCards = (className = 'team-path-grid') => (
    <div className={className}>
      {PATH_BADGES.map((badge) => {
        const achieved = Boolean(myTeam?.achievements.includes(badge.id));
        return (
          <button
            key={badge.id}
            type="button"
            className={`team-path-card ${achieved ? 'team-path-card--achieved' : 'team-path-card--pending'}`}
            onClick={() => onNavigateToBadge?.(badge.id)}
            aria-label={`Открыть ${badge.title}`}
            title={badge.title}
          >
            <div className="team-path-card__icon">
              <BadgeIcon
                badgeId={badge.id}
                badgeTitle={badge.title}
                categoryId="8"
                emoji={badge.emoji}
                size="responsive"
              />
            </div>
            <span className="team-path-card__title">{badge.title}</span>
          </button>
        );
      })}
    </div>
  );

  const renderEmptyEngine = (withInitiative: boolean) => (
    <div className="fade-in" style={sectionCard}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18 }}>🚀 Твой Движок</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setIsCreating((v) => !v);
              setIsJoining(false);
            }}
          >
            Создать
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setIsJoining((v) => !v);
              setIsCreating(false);
            }}
          >
            Вступить
          </button>
        </div>
      </div>
      {isCreating && (
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            className="w-input"
            placeholder="Название Движка"
            value={teamForm.name}
            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
          />
          <input
            className="w-input"
            placeholder="Девиз"
            value={teamForm.motto}
            onChange={(e) => setTeamForm({ ...teamForm, motto: e.target.value })}
          />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="w-input"
                placeholder="Эмодзи/лого"
                value={isImageUrl(teamForm.logo) ? 'Фото загружено' : teamForm.logo}
                onChange={(e) => setTeamForm({ ...teamForm, logo: e.target.value })}
                style={{ flex: 1 }}
                readOnly={isImageUrl(teamForm.logo)}
              />
              <button
                type="button"
                onClick={() => setEmojiPickerOpen((v) => !v)}
                title="Выбрать эмодзи"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: emojiPickerOpen
                    ? '1px solid rgba(139,0,255,0.5)'
                    : '1px solid rgba(255,255,255,0.15)',
                  background: emojiPickerOpen ? 'rgba(139,0,255,0.15)' : 'rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  fontSize: 20,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                😊
              </button>
              <button
                type="button"
                onClick={() => createLogoInputRef.current?.click()}
                title="Загрузить фото"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  fontSize: 20,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                📷
              </button>
              <input
                ref={createLogoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () =>
                      setTeamForm((f) => ({ ...f, logo: reader.result as string }));
                    reader.readAsDataURL(file);
                  }
                  e.target.value = '';
                }}
              />
              {teamForm.logo &&
                (isImageUrl(teamForm.logo) ? (
                  <img
                    src={teamForm.logo}
                    alt=""
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      objectFit: 'cover',
                      border: '1px solid rgba(139,0,255,0.3)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{teamForm.logo}</span>
                ))}
            </div>
            {emojiPickerOpen && (
              <>
                <div
                  onClick={() => setEmojiPickerOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    zIndex: 101,
                    marginTop: 6,
                    width: 320,
                    background: 'rgba(10, 8, 30, 0.92)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 14,
                    padding: 10,
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 2, marginBottom: 8, overflowX: 'auto' }}>
                    {EMOJI_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        title={cat.label}
                        onClick={() => setEmojiPickerCat(cat.id)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 8,
                          border: 'none',
                          background:
                            emojiPickerCat === cat.id ? 'rgba(139,0,255,0.2)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: 16,
                          lineHeight: 1,
                          flexShrink: 0,
                          transition: 'background 0.12s',
                        }}
                      >
                        {cat.icon}
                      </button>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(8, 1fr)',
                      gap: 2,
                      maxHeight: 200,
                      overflowY: 'auto',
                      padding: 2,
                    }}
                  >
                    {emojiPickerEmojis.map((e, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setTeamForm((f) => ({ ...f, logo: e }));
                          setEmojiPickerOpen(false);
                        }}
                        style={{
                          padding: 4,
                          border: 'none',
                          borderRadius: 6,
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: 20,
                          lineHeight: 1,
                          textAlign: 'center',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(ev) => {
                          ev.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        }}
                        onMouseLeave={(ev) => {
                          ev.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <textarea
            className="w-input"
            rows={2}
            placeholder="Первый проект"
            value={teamForm.firstProject}
            onChange={(e) => setTeamForm({ ...teamForm, firstProject: e.target.value })}
          />
          <button type="button" className="btn-primary-gold" onClick={() => void handleCreate()}>
            Запустить Движок
          </button>
        </div>
      )}
      {isJoining && (
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            className="w-input"
            placeholder="Код Движка"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={() => void handleJoin()}>
            Вступить
          </button>
          {joinPreviewLoading ? (
            <span style={{ fontSize: 12, opacity: 0.8 }}>Проверка…</span>
          ) : null}
          {joinPreview ? (
            <span style={{ fontSize: 12, opacity: 0.85 }}>Найдено: {joinPreview.name}</span>
          ) : null}
          {joinPreviewError === 'not_found' ? (
            <span style={{ fontSize: 12, color: '#fca5a5' }}>Код не найден.</span>
          ) : null}
          {joinPreviewError === 'network' ? (
            <button type="button" className="btn-secondary" onClick={retryJoinPreview}>
              Проверить снова
            </button>
          ) : null}
          {joinRetryVisible ? (
            <span style={{ fontSize: 12, color: '#fca5a5' }}>
              Не удалось вступить, попробуй позже.
            </span>
          ) : null}
        </div>
      )}
      {withInitiative && onSuggestInitiative ? (
        <div style={{ marginTop: 12 }}>
          <button type="button" className="btn-secondary" onClick={onSuggestInitiative}>
            Предложить инициативу в совет лагеря
          </button>
        </div>
      ) : null}
    </div>
  );

  const glassCard: React.CSSProperties = {
    padding: '16px 18px',
    borderRadius: 14,
    background: 'rgba(15, 10, 42, 0.12)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  };

  const startEditing = () => {
    if (!myTeam) return;
    setEditName(myTeam.name);
    setEditMotto(myTeam.motto);
    setEditLogo(myTeam.logo);
    setEngineEditing(true);
  };

  const saveEditing = () => {
    const patch: Partial<typeof myTeam> = {};
    if (editName.trim() && editName.trim() !== myTeam?.name) patch.name = editName.trim();
    if (editMotto.trim() !== myTeam?.motto) patch.motto = editMotto.trim();
    if (editLogo.trim() !== myTeam?.logo) patch.logo = editLogo.trim() || '🚀';
    if (Object.keys(patch).length > 0) {
      updateTeam(patch);
      showHint({ title: 'Сохранено', content: 'Информация Движка обновлена.' });
    }
    setEngineEditing(false);
  };

  const renderActiveEngine = (opts: {
    withInitiative: boolean;
    withPath: boolean;
    showCollapse: boolean;
  }) => {
    if (!myTeam) return null;
    const isLeader = myTeam.leaderId === currentUserId;
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
          paddingBottom: 80,
        }}
      >
        {/* Header card */}
        <div className="fade-in" style={glassCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                border: `1px solid ${TEAM_ACCENT}`,
                background: 'rgba(139,0,255,0.18)',
                overflow: 'hidden',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {myTeam.logo && isImageUrl(myTeam.logo) ? (
                <img
                  src={myTeam.logo}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 28 }}>{myTeam.logo || '🚀'}</span>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.3 }}>{myTeam.name}</div>
              <div style={{ fontSize: 13, fontStyle: 'italic', opacity: 0.76, marginTop: 2 }}>
                «{myTeam.motto}»
              </div>
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>Код: {myTeam.id}</div>
            </div>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => updateTeam({ logo: reader.result as string });
                reader.readAsDataURL(file);
              }
              e.target.value = '';
            }}
          />
        </div>

        {/* Info card with edit mode */}
        <div className="fade-in" style={glassCard}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700 }}>📋 О Движке</span>
            {!engineEditing ? (
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '5px 10px', fontSize: 11 }}
                onClick={startEditing}
              >
                ✏️ Редактировать
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn-primary-gold"
                  style={{ padding: '5px 12px', fontSize: 11 }}
                  onClick={saveEditing}
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '5px 10px', fontSize: 11 }}
                  onClick={() => setEngineEditing(false)}
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
          {engineEditing ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 500, marginBottom: 4 }}>
                  Название
                </div>
                <input
                  className="w-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Название Движка"
                />
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 500, marginBottom: 4 }}>
                  Девиз
                </div>
                <input
                  className="w-input"
                  value={editMotto}
                  onChange={(e) => setEditMotto(e.target.value)}
                  placeholder="Девиз Движка"
                />
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 500, marginBottom: 4 }}>
                  Эмодзи / Лого
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="w-input"
                    style={{ flex: 1 }}
                    value={editLogo}
                    onChange={(e) => setEditLogo(e.target.value)}
                    placeholder="🚀"
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '6px 10px', fontSize: 11 }}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    Загрузить фото
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '6px 14px',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <span style={{ opacity: 0.5, fontWeight: 500 }}>Название</span>
              <span style={{ fontWeight: 700 }}>{myTeam.name}</span>
              <span style={{ opacity: 0.5, fontWeight: 500 }}>Девиз</span>
              <span>{myTeam.motto || '—'}</span>
              <span style={{ opacity: 0.5, fontWeight: 500 }}>Уровень</span>
              <span>
                {myTeam.scope === 'squad' ? 'Отряд' : myTeam.scope === 'shift' ? 'Смена' : 'Лагерь'}
              </span>
              <span style={{ opacity: 0.5, fontWeight: 500 }}>Код</span>
              <span style={{ fontFamily: 'monospace', color: TEAM_ACCENT }}>{myTeam.id}</span>
              <span style={{ opacity: 0.5, fontWeight: 500 }}>Создан</span>
              <span>
                {myTeam.createdAt ? new Date(myTeam.createdAt).toLocaleDateString('ru-RU') : '—'}
              </span>
            </div>
          )}
        </div>

        {/* Photos: Flag + Gerb */}
        <div className="fade-in" style={glassCard}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🖼️ Символика</div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.78 }}>Флаг Движка</div>
              <ImageSourceBlock
                context="team_flag"
                value={myTeam.flagImage ?? null}
                onChange={(url) => updateTeam({ flagImage: url })}
                aspect="free"
                onGenerate={async (optsGenerate) =>
                  requestImageGenerate(
                    { mode: 'generate', context: 'team_flag', prompt: optsGenerate.prompt ?? '' },
                    accessToken ?? null
                  )
                }
                onProcess={async (imageBase64, optsProcess) =>
                  requestImageGenerate(
                    {
                      mode: 'process',
                      context: 'team_flag',
                      imageBase64,
                      prompt: optsProcess?.prompt ?? '',
                    },
                    accessToken ?? null
                  )
                }
              />
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.78 }}>Герб Движка</div>
              <ImageSourceBlock
                context="gerb"
                value={myTeam.gerbImage ?? null}
                onChange={(url) => updateTeam({ gerbImage: url })}
                aspect="9:16"
                onGenerate={async (optsGenerate) =>
                  requestImageGenerate(
                    {
                      mode: 'generate',
                      context: 'gerb',
                      teamId: myTeam.id,
                      teamName: myTeam.name,
                      captainName: teamLeaderNickname,
                      style: (optsGenerate.style as GerbStyle) || 'cosmos',
                      prompt: optsGenerate.prompt ?? '',
                    },
                    accessToken ?? null
                  )
                }
                onProcess={async (imageBase64, optsProcess) =>
                  requestImageGenerate(
                    {
                      mode: 'process',
                      context: 'gerb',
                      teamId: myTeam.id,
                      imageBase64,
                      prompt: optsProcess?.prompt ?? '',
                    },
                    accessToken ?? null
                  )
                }
                contextLine={
                  <>
                    <span style={{ opacity: 0.8 }}>«{myTeam.name}»</span>
                    <span style={{ opacity: 0.6 }}> · {teamLeaderNickname}</span>
                  </>
                }
                onSaved={() => showHint({ title: 'Сохранено', content: 'Герб сохранён.' })}
              />
              {myTeam.gerbImage && isImageUrl(myTeam.gerbImage) ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void handleDownloadGerb()}
                  >
                    Скачать
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void handleShareGerb()}
                  >
                    Поделиться
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Crew card */}
        <div className="fade-in" style={glassCard}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
            Экипаж{' '}
            <span style={{ opacity: 0.5, fontWeight: 400, fontSize: 12 }}>
              ({myTeam.members.length})
            </span>
          </div>
          {myTeam.members.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.65 }}>Пока пусто — пригласите друзей!</div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {myTeam.members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(139,0,255,0.15)',
                        border: '1px solid rgba(139,0,255,0.28)',
                        color: '#fff',
                        flexShrink: 0,
                        fontSize: member.avatar && !isImageUrl(member.avatar) ? 16 : 13,
                        fontWeight: 700,
                      }}
                    >
                      {member.avatar ? (
                        isImageUrl(member.avatar) ? (
                          <img
                            src={member.avatar}
                            alt={member.nickname || ''}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerText = (member.nickname ||
                                'У')[0].toUpperCase();
                            }}
                          />
                        ) : (
                          member.avatar
                        )
                      ) : (
                        (member.nickname || 'У')[0].toUpperCase()
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'inline-block',
                        maxWidth: '140px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        verticalAlign: 'bottom',
                      }}
                    >
                      {member.id === myTeam.leaderId ? '👑 ' : ''}
                      {member.nickname || 'Участник'}
                    </span>
                    {member.rank && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: 'rgba(139,0,255,0.12)',
                          color: 'rgba(139,0,255,0.9)',
                          fontWeight: 600,
                        }}
                      >
                        {member.rank}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite card */}
        <div className="fade-in" style={glassCard}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Пригласить в Движок</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: 12 }}
              onClick={() => {
                void navigator.clipboard.writeText(generateInviteUrl());
                showHint({ title: 'Ссылка скопирована', content: 'Приглашение скопировано.' });
              }}
            >
              📋 Копировать ссылку
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: 12 }}
              onClick={() => {
                void navigator.clipboard.writeText(myTeam.id);
                showHint({ title: 'Код скопирован', content: `Код Движка: ${myTeam.id}` });
              }}
            >
              🔑 Копировать код
            </button>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            padding: '4px 0',
          }}
        >
          {opts.showCollapse ? (
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: 12 }}
              onClick={toggleCollapsed}
            >
              Свернуть
            </button>
          ) : null}
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: 12 }}
            onClick={() => void syncTeam()}
          >
            🔄 Обновить
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: 12, opacity: 0.7 }}
            onClick={() => void leaveTeam()}
          >
            Выйти из Движка
          </button>
          {isLeader ? (
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: 12, opacity: 0.7, color: '#fca5a5' }}
              onClick={() => {
                if (window.confirm('Удалить Движок? Это действие нельзя отменить.'))
                  void deleteTeam();
              }}
            >
              Удалить
            </button>
          ) : null}
        </div>

        {opts.withInitiative && onSuggestInitiative ? (
          <div>
            <button type="button" className="btn-secondary" onClick={onSuggestInitiative}>
              Предложить инициативу в совет лагеря
            </button>
          </div>
        ) : null}
        {opts.withPath ? (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.78, marginBottom: 8 }}>
              Путь Движка
            </div>
            {renderPathCards('team-path-grid team-path-grid--compact')}
          </div>
        ) : null}
      </div>
    );
  };

  const renderMyEngines = () => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
          paddingBottom: 80,
        }}
      >
        <div className="fade-in" style={glassCard}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700 }}>🚀 Мои Движки</span>
            <span style={{ fontSize: 11, opacity: 0.5 }}>{myTeams.length} / 3</span>
          </div>
          {myTeams.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.65, padding: '20px 0', textAlign: 'center' }}>
              У тебя пока нет Движков.
              <br />
              Создай свой первый Движок или вступи по коду!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myTeams.map((t) => {
                const isActive = t.id === myTeam?.id;
                const isLeader = t.leaderId === currentUserId;
                return (
                  <div
                    key={t.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: isActive ? 'rgba(139,0,255,0.12)' : 'rgba(255,255,255,0.04)',
                      border: isActive
                        ? `1px solid ${TEAM_ACCENT}`
                        : '1px solid rgba(255,255,255,0.06)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          background: 'rgba(139,0,255,0.15)',
                          border: `1px solid ${TEAM_ACCENT}`,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {t.logo && isImageUrl(t.logo) ? (
                          <img
                            src={t.logo}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: 10,
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: 20 }}>{t.logo || '🚀'}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                        {t.motto && (
                          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                            «{t.motto}»
                          </div>
                        )}
                        <div style={{ fontSize: 10, opacity: 0.45, marginTop: 3 }}>
                          {t.members.length} чел. · Код: {t.id}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          alignItems: 'flex-end',
                        }}
                      >
                        {isActive ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#4ecdc4',
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: 'rgba(78,205,196,0.15)',
                              border: '1px solid rgba(78,205,196,0.3)',
                            }}
                          >
                            Активен
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '3px 10px', fontSize: 10 }}
                            onClick={() => {
                              setActiveTeam(t.id);
                              onTabChange?.('engine' as any);
                            }}
                          >
                            Открыть →
                          </button>
                        )}
                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: 10,
                            color: 'rgba(255,255,255,0.35)',
                            cursor: 'pointer',
                            padding: '2px 4px',
                          }}
                          onClick={() => {
                            if (
                              window.confirm(
                                isLeader
                                  ? 'Удалить Движок? Это действие необратимо.'
                                  : 'Выйти из Движка?'
                              )
                            ) {
                              void (isLeader ? deleteTeam(t.id) : leaveTeam(t.id));
                            }
                          }}
                        >
                          {isLeader ? 'Удалить' : 'Выйти'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {myTeams.length < 3 && (
            <button
              type="button"
              className="btn-primary-gold"
              style={{ marginTop: 14, width: '100%', padding: '10px 0', fontSize: 13 }}
              onClick={() => onTabChange?.('engine-create' as any)}
            >
              + Создать новый Движок
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCreateEngine = () => {
    if (myTeams.length >= 3) {
      return (
        <div className="fade-in" style={glassCard}>
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Максимум Движков</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              Ты уже состоишь в 3 Движках. Выйди из одного, чтобы создать новый.
            </div>
          </div>
        </div>
      );
    }
    return renderEmptyEngine(false);
  };

  const renderEngineSection = () => {
    if (!myTeam) return renderEmptyEngine(variant === 'accordion');
    return renderActiveEngine({
      withInitiative: variant === 'accordion',
      withPath: variant === 'accordion',
      showCollapse: variant === 'accordion',
    });
  };

  const renderEnginePlanSection = () => (
    <div
      className={`fade-in ${variant === 'cabin' ? 'team-cabin-section' : ''}`}
      style={sectionCard}
    >
      {!myTeam ? (
        <div className="profile-empty-state">
          <p className="profile-empty-state__title">План Движка недоступен</p>
          <p className="profile-empty-state__text">Сначала создай Движок или вступи по коду.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Controls Header */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              paddingBottom: 16,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className={activePlannerGrid === 'planGridA' ? 'cab-btn-accent' : 'cab-btn-glass'}
                style={{ padding: '6px 14px', fontSize: 13 }}
                onClick={() => {
                  setActivePlannerGrid('planGridA');
                  setLocalPlanGridA((prev) => {
                    const days = { ...prev.days };
                    for (let day = 10; day <= 21; day++) delete days[String(day)];
                    return { ...prev, shiftLength: 9, days };
                  });
                  if (plannerDay > 9) setPlannerDay(9);
                }}
              >
                Смена 9 дней
              </button>

              <button
                type="button"
                className={activePlannerGrid === 'planGridB' ? 'cab-btn-accent' : 'cab-btn-glass'}
                style={{ padding: '6px 14px', fontSize: 13 }}
                onClick={() => {
                  setActivePlannerGrid('planGridB');
                  setLocalPlanGridB((prev) => ({ ...prev, shiftLength: 21 }));
                }}
              >
                Смена 21 день
              </button>
            </div>

            {/* Day selector */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {plannerDays.map((day) => (
                <button
                  key={day}
                  type="button"
                  className="cab-btn-glass"
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    background: plannerDay === day ? 'rgba(139,0,255,0.2)' : undefined,
                    borderColor: plannerDay === day ? TEAM_ACCENT : 'rgba(255,255,255,0.1)',
                    color: plannerDay === day ? '#fff' : 'rgba(255,255,255,0.7)',
                    fontWeight: plannerDay === day ? 700 : 500,
                  }}
                  onClick={() => setPlannerDay(day)}
                >
                  День {day}
                </button>
              ))}
            </div>
          </div>

          {/* Textareas */}
          <div style={{ display: 'grid', gap: 14 }}>
            {[
              { id: 'morning', label: 'Утро', placeholder: 'Зарядка, завтрак, отрядное дело...' },
              { id: 'quietHour', label: 'Тихий час', placeholder: 'Отдых, подготовка к вечеру...' },
              { id: 'day', label: 'День', placeholder: 'Кружки, спорт, полдник...' },
              {
                id: 'evening',
                label: 'Вечер',
                placeholder: 'Ужин, общелагерное мероприятие, свечка...',
              },
              { id: 'night', label: 'Ночь', placeholder: 'Планерка, отбой...' },
            ].map((field) => (
              <div key={field.id}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: 0.6,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {field.label}
                </label>
                <textarea
                  className="cab-input"
                  style={{
                    width: '100%',
                    minHeight: 70,
                    resize: 'vertical',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                  placeholder={field.placeholder}
                  value={plannerDayData[field.id as keyof typeof plannerDayData] ?? ''}
                  onChange={(e) => setPlannerField(field.id as any, e.target.value)}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="cab-btn-gold"
            style={{ alignSelf: 'flex-start', padding: '10px 20px', marginTop: 4 }}
            onClick={savePlanner}
          >
            💾 Сохранить расписание
          </button>
        </div>
      )}
    </div>
  );

  const renderEnginePathSection = () => (
    <div
      className={`fade-in ${variant === 'cabin' ? 'team-cabin-section' : ''}`}
      style={sectionCard}
    >
      <h4 style={{ margin: '0 0 8px', fontSize: 16 }}>Путь Движка</h4>
      <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.78 }}>
        Ч/б значки означают, что подтверждение еще не получено.
      </p>
      {renderPathCards()}
    </div>
  );

  const renderEngineChatSection = () => {
    if (!myTeam) {
      return (
        <div
          className={`fade-in ${variant === 'cabin' ? 'team-cabin-section' : ''}`}
          style={sectionCard}
        >
          <div className="profile-empty-state">
            <p className="profile-empty-state__title">Чат недоступен</p>
            <p className="profile-empty-state__text">Сначала создай Движок или вступи по коду.</p>
          </div>
        </div>
      );
    }
    const chatToken = accessToken || deviceId;
    if (!chatToken) {
      return (
        <div
          className={`fade-in ${variant === 'cabin' ? 'team-cabin-section' : ''}`}
          style={sectionCard}
        >
          <div className="profile-empty-state">
            <p className="profile-empty-state__title">Чат Движка</p>
            <p className="profile-empty-state__text">Для доступа к чату необходима авторизация.</p>
          </div>
        </div>
      );
    }
    const nickname = userData?.profile?.nickname || undefined;
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <SquadChat
          squadId={myTeam.id}
          accessToken={chatToken}
          nickname={nickname}
          deviceId={deviceId}
          role={undefined}
          chatType="team"
          members={teamChatMembers}
        />
      </div>
    );
  };

  // Initiative state
  const [initiatives, setInitiatives] = useState<
    {
      id: string;
      teamId: string;
      title: string;
      description: string;
      createdBy: string;
      createdAt: string;
      votes: Record<string, boolean>;
      status: string;
      totalMembers: number;
    }[]
  >([]);
  const [iniLoading, setIniLoading] = useState(false);
  const [iniCreating, setIniCreating] = useState(false);
  const [iniTitle, setIniTitle] = useState('');
  const [iniDesc, setIniDesc] = useState('');

  const loadInitiatives = useCallback(async () => {
    if (!myTeam) return;
    setIniLoading(true);
    try {
      const res = await fetch(
        `${getApiBase()}/api/teams/${encodeURIComponent(myTeam.id)}/initiatives`,
        { headers: { Authorization: `Bearer ${accessToken || ''}`, 'X-Device-Id': deviceId } }
      );
      if (res.ok) {
        const data = await res.json();
        setInitiatives(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    } finally {
      setIniLoading(false);
    }
  }, [accessToken, myTeam]);

  useEffect(() => {
    void loadInitiatives();
  }, [loadInitiatives]);

  const createInitiative = async () => {
    if (!myTeam || !iniTitle.trim()) return;
    try {
      const res = await fetch(
        `${getApiBase()}/api/teams/${encodeURIComponent(myTeam.id)}/initiatives`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken || ''}`,
            'X-Device-Id': deviceId,
          },
          body: JSON.stringify({ title: iniTitle.trim(), description: iniDesc.trim() }),
        }
      );
      if (res.ok) {
        const ini = await res.json();
        setInitiatives((prev) => [...prev, ini]);
        setIniTitle('');
        setIniDesc('');
        setIniCreating(false);
        showHint({ title: 'Инициатива создана', content: 'Участники могут голосовать.' });
      }
    } catch {
      /* ignore */
    }
  };

  const voteOnInitiative = async (iniId: string) => {
    if (!myTeam) return;
    try {
      const res = await fetch(
        `${getApiBase()}/api/teams/${encodeURIComponent(myTeam.id)}/initiatives/${encodeURIComponent(iniId)}/vote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken || ''}`,
            'X-Device-Id': deviceId,
          },
          body: JSON.stringify({ vote: true }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setInitiatives((prev) => prev.map((i) => (i.id === iniId ? updated : i)));
      }
    } catch {
      /* ignore */
    }
  };

  const sendInitiativeToCouncil = async (iniId: string) => {
    if (!myTeam) return;
    try {
      const res = await fetch(
        `${getApiBase()}/api/teams/${encodeURIComponent(myTeam.id)}/initiatives/${encodeURIComponent(iniId)}/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken || ''}`,
            'X-Device-Id': deviceId,
          },
          body: '{}',
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setInitiatives((prev) => prev.map((i) => (i.id === iniId ? updated : i)));
        showHint({ title: 'Отправлено!', content: 'Инициатива отправлена в Совет лагеря.' });
      }
    } catch {
      /* ignore */
    }
  };

  const renderCampControlSection = () => {
    if (!myTeam) {
      return (
        <div
          className={`fade-in ${variant === 'cabin' ? 'team-cabin-section' : ''}`}
          style={sectionCard}
        >
          <div className="profile-empty-state">
            <p className="profile-empty-state__title">Инициативы</p>
            <p className="profile-empty-state__text">Создай Движок, чтобы выдвигать инициативы.</p>
          </div>
        </div>
      );
    }

    const myVoted = (ini: (typeof initiatives)[0]) => !!ini.votes?.[currentUserId];
    const votedCount = (ini: (typeof initiatives)[0]) =>
      Object.values(ini.votes || {}).filter(Boolean).length;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div className="fade-in" style={glassCard}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700 }}>📣 Инициативы Движка</span>
            {!iniCreating ? (
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '5px 12px', fontSize: 11 }}
                onClick={() => setIniCreating(true)}
              >
                + Создать
              </button>
            ) : null}
          </div>

          {iniCreating && (
            <div
              className="fade-in"
              style={{
                display: 'grid',
                gap: 12,
                marginBottom: 16,
                padding: 16,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: 0.6,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Название инициативы *
                </label>
                <input
                  className="cab-input"
                  style={{ width: '100%' }}
                  placeholder="Например: Ночной кинопоказ"
                  value={iniTitle}
                  onChange={(e) => setIniTitle(e.target.value)}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: 0.6,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Описание (необязательно)
                </label>
                <textarea
                  className="cab-input"
                  style={{ width: '100%', resize: 'vertical' }}
                  rows={3}
                  placeholder="В чем суть идеи, зачем это нужно..."
                  value={iniDesc}
                  onChange={(e) => setIniDesc(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="cab-btn-accent"
                  onClick={() => void createInitiative()}
                  disabled={!iniTitle.trim()}
                >
                  Создать инициативу
                </button>
                <button
                  type="button"
                  className="cab-btn-glass"
                  onClick={() => {
                    setIniCreating(false);
                    setIniTitle('');
                    setIniDesc('');
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {iniLoading ? (
            <div style={{ fontSize: 12, opacity: 0.6 }}>Загрузка…</div>
          ) : initiatives.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.65 }}>Инициатив пока нет. Создай первую!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {initiatives.map((ini) => {
                const vc = votedCount(ini);
                const progress = ini.totalMembers > 0 ? (vc / ini.totalMembers) * 100 : 0;
                const statusLabel =
                  ini.status === 'voting'
                    ? '🗳 Голосование'
                    : ini.status === 'approved'
                      ? '✅ Одобрена'
                      : ini.status === 'sent_to_council'
                        ? '📤 Отправлена'
                        : '❌ Отклонена';
                return (
                  <div
                    key={ini.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{ini.title}</div>
                      <span style={{ fontSize: 10, opacity: 0.6, whiteSpace: 'nowrap' }}>
                        {statusLabel}
                      </span>
                    </div>
                    {ini.description && (
                      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
                        {ini.description}
                      </div>
                    )}
                    {/* Progress bar */}
                    <div style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 10,
                          opacity: 0.5,
                          marginBottom: 3,
                        }}
                      >
                        <span>
                          Голосов: {vc}/{ini.totalMembers}
                        </span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div
                        style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}
                      >
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 2,
                            background: ini.status === 'rejected' ? '#ff6b6b' : TEAM_ACCENT,
                            width: `${progress}%`,
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {ini.status === 'voting' && !myVoted(ini) && (
                        <button
                          type="button"
                          className="btn-primary-gold"
                          style={{ padding: '5px 12px', fontSize: 11 }}
                          onClick={() => void voteOnInitiative(ini.id)}
                        >
                          👍 За
                        </button>
                      )}
                      {ini.status === 'voting' && myVoted(ini) && (
                        <span style={{ fontSize: 11, opacity: 0.6, padding: '5px 0' }}>
                          ✓ Вы проголосовали
                        </span>
                      )}
                      {ini.status === 'approved' && (
                        <button
                          type="button"
                          className="btn-primary-gold"
                          style={{ padding: '5px 12px', fontSize: 11 }}
                          onClick={() => void sendInitiativeToCouncil(ini.id)}
                        >
                          📤 Отправить в Совет
                        </button>
                      )}
                      {ini.status === 'sent_to_council' && (
                        <span style={{ fontSize: 11, color: '#4ecdc4', padding: '5px 0' }}>
                          Отправлена в Совет лагеря
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {onSuggestInitiative ? (
          <button type="button" className="btn-secondary" onClick={onSuggestInitiative}>
            Предложить инициативу в совет лагеря (старый формат)
          </button>
        ) : null}
      </div>
    );
  };

  if (isLoading) {
    return (
      <p className="profile-loading" style={{ padding: 20, textAlign: 'center' }}>
        Синхронизация Движка…
      </p>
    );
  }

  if (loadError) {
    const errorBox = (
      <div className="fade-in" style={sectionCard}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Кабинет управления Движка</h3>
        <div className="profile-error">{loadError}</div>
        <button
          type="button"
          className="btn-secondary"
          style={{ marginTop: 10 }}
          onClick={() => void syncTeam()}
        >
          Повторить
        </button>
      </div>
    );
    return variant === 'accordion' ? (
      <div
        id="team-dashboard"
        className="team-dashboard"
        style={{
          background: TEAM_GRADIENT,
          borderRadius: 24,
          padding: 20,
          border: TEAM_BORDER,
          marginBottom: 24,
        }}
      >
        {errorBox}
      </div>
    ) : (
      <div className="team-cabin-content">{errorBox}</div>
    );
  }

  if (variant === 'accordion') {
    return (
      <div
        id="team-dashboard"
        className="team-dashboard"
        style={{
          background: TEAM_GRADIENT,
          borderRadius: 24,
          padding: 20,
          border: TEAM_BORDER,
          marginBottom: 24,
        }}
        aria-expanded={!isCollapsed}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: isCollapsed ? 0 : 12,
          }}
        >
          <div onClick={toggleCollapsed} style={{ cursor: 'pointer' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                color: TEAM_ACCENT,
                letterSpacing: '0.1em',
              }}
            >
              Механика ЛК
            </div>
            <h3 style={{ margin: '4px 0 0', fontSize: 18 }}>Кабинет управления Движка</h3>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            style={{
              background: 'none',
              border: 'none',
              color: TEAM_ACCENT,
              fontSize: 20,
              cursor: 'pointer',
              transform: isCollapsed ? 'none' : 'rotate(180deg)',
            }}
          >
            ▾
          </button>
        </div>
        {!isCollapsed ? <div className="fade-in">{renderEngineSection()}</div> : null}
      </div>
    );
  }

  const summary = (
    <div
      className="team-cabin-section fade-in"
      style={{ display: 'flex', justifyContent: 'space-between', gap: 12, ...sectionCard }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            color: TEAM_ACCENT,
            letterSpacing: '0.1em',
          }}
        >
          Движок
        </div>
        <h3 style={{ margin: '4px 0 0', fontSize: 20 }}>
          {myTeam?.name || 'Кабинет управления Движка'}
        </h3>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.78 }}>
        {myTeam ? `Код: ${myTeam.id}` : 'Создай или вступи'}
      </div>
    </div>
  );

  // ── Render Engine Project ──
  const renderEngineProject = () => {
    if (!myTeam)
      return (
        <div className="fade-in" style={glassCard}>
          <div style={{ textAlign: 'center', opacity: 0.6 }}>Сначала создай Движок</div>
        </div>
      );

    const teamId = myTeam.id;
    const isFirstProject = !engineProjects.some((p) => p.status === 'approved');
    const statusColors: Record<string, string> = {
      draft: '#999',
      in_progress: '#f0ad4e',
      review: '#5bc0de',
      approved: '#5cb85c',
      rejected: '#d9534f',
    };
    const statusLabels: Record<string, string> = {
      draft: '📝 Черновик',
      in_progress: '🔧 В работе',
      review: '📤 На проверке',
      approved: '✅ Утверждён',
      rejected: '❌ Отклонён',
    };

    const createProject = async (badgeIdOverride?: string) => {
      if (!projectForm.title.trim()) return;
      try {
        const payload = {
          ...projectForm,
          targetBadgeId: badgeIdOverride || projectForm.targetBadgeId,
        };
        const res = await fetch(
          `${getApiBase()}/api/teams/${encodeURIComponent(teamId)}/projects`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify(payload),
          }
        );
        if (res.ok) {
          const proj = await res.json();
          setEngineProjects((prev) => [...prev, proj]);
          setProjectForm({
            title: '',
            description: '',
            plan: '',
            targetBadgeId: '',
            reflection: '',
            scenario: '',
          });
          setProjCreating(false);
          setSelectedProjectId(proj.id);
        }
      } catch {
        /* */
      }
    };

    const updateProject = async (projectId: string, patch: Record<string, unknown>) => {
      try {
        const res = await fetch(
          `${getApiBase()}/api/teams/${encodeURIComponent(teamId)}/projects/${encodeURIComponent(projectId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify(patch),
          }
        );
        if (res.ok) {
          const updated = await res.json();
          setEngineProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }
      } catch {
        /* */
      }
    };

    // ── Detail view ──
    const selectedProject = engineProjects.find((p) => p.id === selectedProjectId);
    if (selectedProject) {
      const badge = PATH_BADGES.find((b) => b.id === selectedProject.targetBadgeId);
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            maxWidth: 720,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {/* Back button */}
          <button
            type="button"
            onClick={() => setSelectedProjectId(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: TEAM_ACCENT,
              fontSize: 12,
              padding: 0,
              textAlign: 'left',
            }}
          >
            ← Все проекты
          </button>

          {/* Project header */}
          <div className="fade-in" style={glassCard}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedProject.title}</div>
                {badge && (
                  <button
                    type="button"
                    onClick={() => onNavigateToBadge?.(badge.id)}
                    style={{
                      fontSize: 12,
                      opacity: 0.65,
                      marginTop: 4,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'inherit',
                    }}
                  >
                    {badge.emoji} Цель: {badge.title} →
                  </button>
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 8,
                  background: `${statusColors[selectedProject.status]}22`,
                  color: statusColors[selectedProject.status],
                  border: `1px solid ${statusColors[selectedProject.status]}44`,
                  flexShrink: 0,
                }}
              >
                {statusLabels[selectedProject.status]}
              </span>
            </div>
            {selectedProject.description && (
              <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>
                {selectedProject.description}
              </div>
            )}
            {selectedProject.plan && (
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.6,
                  whiteSpace: 'pre-wrap',
                  background: 'rgba(255,255,255,0.03)',
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                {selectedProject.plan}
              </div>
            )}
          </div>

          {/* Draft → Start */}
          {selectedProject.status === 'draft' && (
            <div className="fade-in" style={glassCard}>
              <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 10px' }}>
                Проект создан! Начните работу над ним.
              </p>
              <button
                type="button"
                className="btn-primary-gold"
                onClick={() => void updateProject(selectedProject.id, { status: 'in_progress' })}
              >
                🚀 Начать работу
              </button>
            </div>
          )}

          {/* In progress → deliverables + submit */}
          {selectedProject.status === 'in_progress' && (
            <div className="fade-in" style={glassCard}>
              <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>📎 Артефакты проекта</h4>
              <p style={{ fontSize: 12, opacity: 0.6, margin: '0 0 10px' }}>
                Добавьте фото, опишите что сделали, прикрепите сценарий — и отправьте вожатому.
              </p>
              <div style={{ display: 'grid', gap: 10 }}>
                {/* Photos */}
                <div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
                    📷 Фото (до 5 шт.)
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {projectPhotos.map((p, i) => (
                      <img
                        key={i}
                        src={p}
                        alt=""
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 8,
                          objectFit: 'cover',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      />
                    ))}
                    {projectPhotos.length < 5 && (
                      <button
                        type="button"
                        onClick={() => projectPhotoRef.current?.click()}
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 8,
                          border: '1px dashed rgba(255,255,255,0.2)',
                          background: 'rgba(255,255,255,0.04)',
                          cursor: 'pointer',
                          fontSize: 20,
                          display: 'grid',
                          placeItems: 'center',
                          color: 'rgba(255,255,255,0.4)',
                        }}
                      >
                        +
                      </button>
                    )}
                    <input
                      ref={projectPhotoRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && projectPhotos.length < 5) {
                          const reader = new FileReader();
                          reader.onload = () =>
                            setProjectPhotos((prev) => [...prev, reader.result as string]);
                          reader.readAsDataURL(file);
                        }
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>
                <textarea
                  className="w-input"
                  rows={3}
                  placeholder="Описание проделанной работы / рефлексия"
                  value={projectForm.reflection}
                  onChange={(e) => setProjectForm((f) => ({ ...f, reflection: e.target.value }))}
                />
                <textarea
                  className="w-input"
                  rows={2}
                  placeholder="Сценарий мероприятия (если было)"
                  value={projectForm.scenario}
                  onChange={(e) => setProjectForm((f) => ({ ...f, scenario: e.target.value }))}
                />
                <button
                  type="button"
                  className="btn-primary-gold"
                  onClick={() =>
                    void updateProject(selectedProject.id, {
                      status: 'review',
                      reflection: projectForm.reflection,
                      scenario: projectForm.scenario,
                      photos: projectPhotos,
                    })
                  }
                >
                  📤 Отправить вожатому на проверку
                </button>
              </div>
            </div>
          )}

          {/* Review → waiting */}
          {selectedProject.status === 'review' && (
            <div className="fade-in" style={glassCard}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Проект на проверке у вожатого</div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
                  Ожидайте подтверждения
                </div>
              </div>
            </div>
          )}

          {/* Approved */}
          {selectedProject.status === 'approved' && (
            <div className="fade-in" style={glassCard}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#5cb85c' }}>
                  Проект утверждён!
                </div>
                {badge && (
                  <div style={{ fontSize: 14, marginTop: 8 }}>
                    {badge.emoji} Значок «{badge.title}» получен!
                  </div>
                )}
                {selectedProject.reviewNote && (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10, fontStyle: 'italic' }}>
                    «{selectedProject.reviewNote}»
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejected */}
          {selectedProject.status === 'rejected' && (
            <div className="fade-in" style={glassCard}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#d9534f' }}>
                  Проект отклонён
                </div>
                {selectedProject.reviewNote && (
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>
                    Комментарий: «{selectedProject.reviewNote}»
                  </div>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginTop: 14 }}
                  onClick={() => void updateProject(selectedProject.id, { status: 'in_progress' })}
                >
                  ✏️ Доработать
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── List view ──
    const effectiveBadgeId = isFirstProject ? '8.1' : projectForm.targetBadgeId;
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div className="fade-in" style={glassCard}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700 }}>📋 Проекты Движка</span>
            {!projCreating && (
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '5px 12px', fontSize: 11 }}
                onClick={() => setProjCreating(true)}
              >
                + Создать
              </button>
            )}
          </div>

          {/* Create form */}
          {projCreating && (
            <div
              style={{
                display: 'grid',
                gap: 8,
                marginBottom: 14,
                padding: 12,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <input
                className="w-input"
                placeholder="Название проекта"
                value={projectForm.title}
                onChange={(e) => setProjectForm((f) => ({ ...f, title: e.target.value }))}
              />
              <textarea
                className="w-input"
                rows={2}
                placeholder="Описание"
                value={projectForm.description}
                onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
              />
              {/* Badge picker */}
              <div>
                <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 8 }}>
                  🎯 Целевой значок{isFirstProject ? ' (первый проект → Реальный Движок)' : ''}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 6,
                  }}
                >
                  {PATH_BADGES.map((b) => {
                    const selected = effectiveBadgeId === b.id;
                    const locked = isFirstProject && b.id !== '8.1';
                    return (
                      <button
                        key={b.id}
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          !isFirstProject && setProjectForm((f) => ({ ...f, targetBadgeId: b.id }))
                        }
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          padding: '8px 4px',
                          borderRadius: 10,
                          cursor: locked ? 'not-allowed' : 'pointer',
                          border: selected
                            ? `2px solid ${TEAM_ACCENT}`
                            : '1px solid rgba(255,255,255,0.08)',
                          background: selected ? 'rgba(139,0,255,0.12)' : 'rgba(255,255,255,0.03)',
                          opacity: locked ? 0.35 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ width: 40, height: 40 }}>
                          <BadgeIcon
                            badgeId={b.id}
                            badgeTitle={b.title}
                            categoryId="8"
                            emoji={b.emoji}
                            size="responsive"
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 9,
                            textAlign: 'center',
                            lineHeight: 1.2,
                            fontWeight: selected ? 700 : 400,
                          }}
                        >
                          {b.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <textarea
                className="w-input"
                rows={2}
                placeholder="План / сценарий"
                value={projectForm.plan}
                onChange={(e) => setProjectForm((f) => ({ ...f, plan: e.target.value }))}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn-primary-gold"
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  onClick={() => void createProject(effectiveBadgeId)}
                  disabled={!projectForm.title.trim()}
                >
                  Создать
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  onClick={() => {
                    setProjCreating(false);
                    setProjectForm({
                      title: '',
                      description: '',
                      plan: '',
                      targetBadgeId: '',
                      reflection: '',
                      scenario: '',
                    });
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* Projects list */}
          {projectsLoading ? (
            <div style={{ fontSize: 12, opacity: 0.6 }}>Загрузка…</div>
          ) : engineProjects.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.65 }}>Проектов пока нет. Создай первый!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {engineProjects.map((proj) => {
                const badge = PATH_BADGES.find((b) => b.id === proj.targetBadgeId);
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => setSelectedProjectId(proj.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {badge && (
                          <div style={{ width: 28, height: 28, flexShrink: 0 }}>
                            <BadgeIcon
                              badgeId={badge.id}
                              badgeTitle={badge.title}
                              categoryId="8"
                              emoji={badge.emoji}
                              size="responsive"
                            />
                          </div>
                        )}
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{proj.title}</div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          opacity: 0.6,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          color: statusColors[proj.status],
                        }}
                      >
                        {statusLabels[proj.status]}
                      </span>
                    </div>
                    {proj.description && (
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.65,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {proj.description}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const cabinContent =
    activeTab === 'my-engines' ? (
      renderMyEngines()
    ) : activeTab === 'engine-create' ? (
      renderCreateEngine()
    ) : activeTab === 'engine' ? (
      renderEngineSection()
    ) : activeTab === 'engine-project' ? (
      renderEngineProject()
    ) : activeTab === 'engine-plan' ? (
      renderEnginePlanSection()
    ) : activeTab === 'engine-path' ? (
      renderEnginePathSection()
    ) : activeTab === 'engine-chat' ? (
      renderEngineChatSection()
    ) : activeTab === 'ode' ? (
      <ODeConstructorPanel />
    ) : (
      renderCampControlSection()
    );

  return (
    <div className="team-cabin-content" style={{ display: 'grid', gap: 14, paddingBottom: 120 }}>
      {summary}
      {cabinContent}
    </div>
  );
};
