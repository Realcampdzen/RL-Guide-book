import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { useUserProgress } from '../hooks/useUserProgress';
import { useAuth } from '../context/AuthContext';
import { useHintOverlay } from '../context/HintOverlayContext';
import { downloadBlob, shareOrDownloadSocialCard } from '../utils/socialGenerator';
import BadgeIcon from './BadgeIcon';
import { requestImageGenerate } from '../utils/imageGenerateApi';
import { ImageSourceBlock } from './ImageSourceBlock';
import type { GerbStyle } from './ImageSourceBlock';
import type { TeamPlanGridData } from '../types/teams';

const TEAM_ACCENT = '#8b00ff';
const STORAGE_KEY = 'putevoditel_profile_team_collapsed';
const TEAM_GRADIENT = 'linear-gradient(135deg, rgba(139, 0, 255, 0.1) 0%, rgba(77, 166, 255, 0.15) 100%)';
const TEAM_BORDER = '1px solid rgba(139, 0, 255, 0.3)';

type PlannerGridId = 'planGridA' | 'planGridB';
export type TeamTabId = 'engine' | 'engine-plan' | 'engine-path' | 'camp-control';

interface TeamDashboardProps {
  onSuggestInitiative?: () => void;
  forceExpanded?: boolean;
  variant?: 'accordion' | 'cabin';
  activeTab?: TeamTabId;
  onTabChange?: (tab: TeamTabId) => void;
  onNavigateToBadge?: (badgeId: string) => void;
}

const PATH_BADGES = [
  { id: '8.1', title: 'Реальный Движок', emoji: '⚙️' },
  { id: '8.2', title: 'Движок Прогресса', emoji: '📈' },
  { id: '8.3', title: 'Командный Дух', emoji: '🔥' },
  { id: '8.4', title: 'Масштабирование', emoji: '🚀' }
] as const;

const isImageUrl = (s?: string) => Boolean(s && (s.startsWith('data:') || s.startsWith('http')));
const sanitizeFilename = (s: string) => (s || 'gerb').replace(/[^\w\u0400-\u04FF-]/g, '_').slice(0, 40);
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
      night: (value.night || '').trim() || undefined
    };
  });
  return { shiftLength: grid.shiftLength === 9 ? 9 : 21, days };
};

const sectionCard: React.CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(0,0,0,0.18)'
};

export const TeamDashboard: React.FC<TeamDashboardProps> = ({
  onSuggestInitiative,
  forceExpanded,
  variant = 'accordion',
  activeTab = 'engine',
  onTabChange,
  onNavigateToBadge
}) => {
  const { myTeam, isLoading, loadError, syncTeam, createTeam, updateTeam, joinTeam, leaveTeam, deleteTeam, generateInviteUrl } = useTeam();
  const { userData } = useUserProgress();
  const { accessToken, deviceId } = useAuth();
  const { showHint } = useHintOverlay();
  const currentUserId = accessToken ? deviceId : (userData?.profile?.id ?? 'local');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [isCollapsed, setIsCollapsed] = useState(() => (forceExpanded ? false : readCollapsedFromStorage()));
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '', motto: '', logo: '🚀', firstProject: '' });
  const [joinCode, setJoinCode] = useState('');
  const [joinPreview, setJoinPreview] = useState<{ id: string; name: string; motto: string } | null>(null);
  const [joinPreviewLoading, setJoinPreviewLoading] = useState(false);
  const [joinPreviewError, setJoinPreviewError] = useState<null | 'not_found' | 'network'>(null);
  const [joinRetryVisible, setJoinRetryVisible] = useState(false);
  const [engineParamApplied, setEngineParamApplied] = useState(false);

  const [activePlannerGrid, setActivePlannerGrid] = useState<PlannerGridId>('planGridA');
  const [plannerDay, setPlannerDay] = useState(1);
  const [localPlanGridA, setLocalPlanGridA] = useState<TeamPlanGridData>(() => clonePlanGrid(myTeam?.planGridA));
  const [localPlanGridB, setLocalPlanGridB] = useState<TeamPlanGridData>(() => clonePlanGrid(myTeam?.planGridB));

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
      const decoded = JSON.parse(atob(engineData)) as { id?: string; name?: string; motto?: string };
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
      showHint({ title: 'Нужны имя и проект', content: 'Для запуска Движка нужно имя и описание первого проекта.' });
      return;
    }
    try {
      await createTeam({
        name: teamForm.name.trim(),
        motto: teamForm.motto.trim(),
        logo: teamForm.logo.trim() || '🚀',
        leaderId: userData?.profile?.id ?? 'local',
        goals: []
      });
      setIsCreating(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'already_in_team') {
        showHint({ title: 'Уже в Движке', content: 'Ты уже состоишь в Движке. Сначала выйди из текущего.' });
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
        avatar: userData?.profile?.avatar
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
        height: 640
      });
      if (result === 'shared') showHint({ title: 'Поделено', content: 'Герб отправлен.' });
      if (result === 'downloaded') showHint({ title: 'Скачано', content: `Файл ${filename} сохранён.` });
    } catch {
      showHint({ title: 'Ошибка', content: 'Не удалось поделиться гербом.' });
    }
  }, [myTeam, showHint]);

  const teamLeaderNickname =
    myTeam?.members.find((m) => m.id === myTeam.leaderId)?.nickname ??
    userData?.profile?.nickname ??
    'Искатель';

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

  const setPlannerShiftLength = (next: 9 | 21) => {
    updateCurrentPlannerGrid((prev) => {
      const days = { ...prev.days };
      if (next === 9) {
        for (let day = 10; day <= 21; day += 1) delete days[String(day)];
      }
      return { shiftLength: next, days };
    });
    if (plannerDay > next) setPlannerDay(next);
  };

  const setPlannerField = (field: 'morning' | 'quietHour' | 'day' | 'evening' | 'night', value: string) => {
    const dayKey = String(plannerDay);
    updateCurrentPlannerGrid((prev) => ({
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
              <BadgeIcon badgeId={badge.id} badgeTitle={badge.title} categoryId="8" emoji={badge.emoji} size="responsive" />
            </div>
            <span className="team-path-card__title">{badge.title}</span>
          </button>
        );
      })}
    </div>
  );

  const renderEmptyEngine = (withInitiative: boolean) => (
    <div style={sectionCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>🚀 Твой Движок</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-secondary" onClick={() => { setIsCreating((v) => !v); setIsJoining(false); }}>Создать</button>
          <button type="button" className="btn-secondary" onClick={() => { setIsJoining((v) => !v); setIsCreating(false); }}>Вступить</button>
        </div>
      </div>
      {isCreating && (
        <div style={{ display: 'grid', gap: 10 }}>
          <input className="w-input" placeholder="Название Движка" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} />
          <input className="w-input" placeholder="Девиз" value={teamForm.motto} onChange={(e) => setTeamForm({ ...teamForm, motto: e.target.value })} />
          <input className="w-input" placeholder="Эмодзи/лого" value={teamForm.logo} onChange={(e) => setTeamForm({ ...teamForm, logo: e.target.value })} />
          <textarea className="w-input" rows={2} placeholder="Первый проект" value={teamForm.firstProject} onChange={(e) => setTeamForm({ ...teamForm, firstProject: e.target.value })} />
          <button type="button" className="btn-primary-gold" onClick={() => void handleCreate()}>Запустить Движок</button>
        </div>
      )}
      {isJoining && (
        <div style={{ display: 'grid', gap: 10 }}>
          <input className="w-input" placeholder="Код Движка" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
          <button type="button" className="btn-secondary" onClick={() => void handleJoin()}>Вступить</button>
          {joinPreviewLoading ? <span style={{ fontSize: 12, opacity: 0.8 }}>Проверка…</span> : null}
          {joinPreview ? <span style={{ fontSize: 12, opacity: 0.85 }}>Найдено: {joinPreview.name}</span> : null}
          {joinPreviewError === 'not_found' ? <span style={{ fontSize: 12, color: '#fca5a5' }}>Код не найден.</span> : null}
          {joinPreviewError === 'network' ? <button type="button" className="btn-secondary" onClick={retryJoinPreview}>Проверить снова</button> : null}
          {joinRetryVisible ? <span style={{ fontSize: 12, color: '#fca5a5' }}>Не удалось вступить, попробуй позже.</span> : null}
        </div>
      )}
      {withInitiative && onSuggestInitiative ? (
        <div style={{ marginTop: 12 }}>
          <button type="button" className="btn-secondary" onClick={onSuggestInitiative}>Предложить инициативу в совет лагеря</button>
        </div>
      ) : null}
    </div>
  );

  const renderActiveEngine = (opts: { withInitiative: boolean; withPath: boolean; showCollapse: boolean }) => {
    if (!myTeam) return null;
    return (
      <div style={sectionCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <div style={{ width: 64, height: 64, borderRadius: 14, border: `1px solid ${TEAM_ACCENT}`, background: 'rgba(139,0,255,0.18)', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
              {myTeam.logo && isImageUrl(myTeam.logo) ? <img src={myTeam.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>{myTeam.logo || '🚀'}</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: TEAM_ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Код: {myTeam.id}</div>
              <h3 style={{ margin: '2px 0', fontSize: 20 }}>{myTeam.name}</h3>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.76, fontStyle: 'italic' }}>«{myTeam.motto}»</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {opts.showCollapse ? <button type="button" className="btn-secondary" onClick={toggleCollapsed}>Свернуть</button> : null}
            <button type="button" className="btn-secondary" onClick={() => logoInputRef.current?.click()}>Лого</button>
            {myTeam.logo && isImageUrl(myTeam.logo) ? <button type="button" className="btn-secondary" onClick={() => updateTeam({ logo: '🚀' })}>Эмодзи</button> : null}
            <button type="button" className="btn-secondary" onClick={() => { void navigator.clipboard.writeText(generateInviteUrl()); showHint({ title: 'Ссылка скопирована', content: 'Приглашение скопировано.' }); }}>Ссылка</button>
            <button type="button" className="btn-secondary" onClick={() => void leaveTeam()}>Выйти</button>
            {myTeam.leaderId === currentUserId ? <button type="button" className="btn-secondary" onClick={() => void deleteTeam()}>Удалить</button> : null}
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

        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.78 }}>Флаг Движка</div>
            <ImageSourceBlock
              context="team_flag"
              value={myTeam.flagImage ?? null}
              onChange={(url) => updateTeam({ flagImage: url })}
              aspect="free"
              onGenerate={async (optsGenerate) => requestImageGenerate({ mode: 'generate', context: 'team_flag', prompt: optsGenerate.prompt ?? '' }, accessToken ?? null)}
              onProcess={async (imageBase64, optsProcess) => requestImageGenerate({ mode: 'process', context: 'team_flag', imageBase64, prompt: optsProcess?.prompt ?? '' }, accessToken ?? null)}
            />
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.78 }}>Герб Движка</div>
            <ImageSourceBlock
              context="gerb"
              value={myTeam.gerbImage ?? null}
              onChange={(url) => updateTeam({ gerbImage: url })}
              aspect="9:16"
              onGenerate={async (optsGenerate) => requestImageGenerate({ mode: 'generate', context: 'gerb', teamId: myTeam.id, teamName: myTeam.name, captainName: teamLeaderNickname, style: (optsGenerate.style as GerbStyle) || 'cosmos', prompt: optsGenerate.prompt ?? '' }, accessToken ?? null)}
              onProcess={async (imageBase64, optsProcess) => requestImageGenerate({ mode: 'process', context: 'gerb', teamId: myTeam.id, imageBase64, prompt: optsProcess?.prompt ?? '' }, accessToken ?? null)}
              contextLine={<><span style={{ opacity: 0.8 }}>«{myTeam.name}»</span><span style={{ opacity: 0.6 }}> · {teamLeaderNickname}</span></>}
              onSaved={() => showHint({ title: 'Сохранено', content: 'Герб сохранён.' })}
            />
            {myTeam.gerbImage && isImageUrl(myTeam.gerbImage) ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn-secondary" onClick={() => void handleDownloadGerb()}>Скачать</button>
                <button type="button" className="btn-secondary" onClick={() => void handleShareGerb()}>Поделиться</button>
              </div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.78 }}>Экипаж ({myTeam.members.length})</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {myTeam.members.map((member) => (
                <div key={member.id} style={{ padding: '6px 8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.04)', fontSize: 12 }}>
                  {member.id === myTeam.leaderId ? '👑 ' : ''}{member.nickname || 'Участник'}
                </div>
              ))}
            </div>
          </div>
        </div>

        {opts.withInitiative && onSuggestInitiative ? (
          <div style={{ marginTop: 14 }}>
            <button type="button" className="btn-secondary" onClick={onSuggestInitiative}>Предложить инициативу в совет лагеря</button>
          </div>
        ) : null}
        {opts.withPath ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.78, marginBottom: 8 }}>Путь Движка</div>
            {renderPathCards('team-path-grid team-path-grid--compact')}
          </div>
        ) : null}
      </div>
    );
  };

  const renderEngineSection = () => {
    if (!myTeam) return renderEmptyEngine(variant === 'accordion');
    return renderActiveEngine({
      withInitiative: variant === 'accordion',
      withPath: variant === 'accordion',
      showCollapse: variant === 'accordion'
    });
  };

  const renderEnginePlanSection = () => (
    <div className={variant === 'cabin' ? 'team-cabin-section' : undefined} style={sectionCard}>
      {!myTeam ? (
        <div className="profile-empty-state">
          <p className="profile-empty-state__title">План Движка недоступен</p>
          <p className="profile-empty-state__text">Сначала создай Движок или вступи по коду.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['planGridA', 'planGridB'] as const).map((gridId) => (
              <button key={gridId} type="button" className="btn-secondary" onClick={() => setActivePlannerGrid(gridId)}>
                {gridId === 'planGridA' ? 'Сетка 1' : 'Сетка 2'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label><input type="radio" checked={currentPlannerGrid.shiftLength === 9} onChange={() => setPlannerShiftLength(9)} /> 9 дней</label>
            <label><input type="radio" checked={currentPlannerGrid.shiftLength === 21} onChange={() => setPlannerShiftLength(21)} /> 21 день</label>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {plannerDays.map((day) => (
              <button key={day} type="button" className="btn-secondary" style={{ border: plannerDay === day ? `1px solid ${TEAM_ACCENT}` : undefined }} onClick={() => setPlannerDay(day)}>
                День {day}
              </button>
            ))}
          </div>
          <textarea className="w-input" rows={2} placeholder="Утро" value={plannerDayData.morning ?? ''} onChange={(e) => setPlannerField('morning', e.target.value)} />
          <textarea className="w-input" rows={2} placeholder="Тихий час" value={plannerDayData.quietHour ?? ''} onChange={(e) => setPlannerField('quietHour', e.target.value)} />
          <textarea className="w-input" rows={2} placeholder="День" value={plannerDayData.day ?? ''} onChange={(e) => setPlannerField('day', e.target.value)} />
          <textarea className="w-input" rows={2} placeholder="Вечер" value={plannerDayData.evening ?? ''} onChange={(e) => setPlannerField('evening', e.target.value)} />
          <textarea className="w-input" rows={2} placeholder="Ночь" value={plannerDayData.night ?? ''} onChange={(e) => setPlannerField('night', e.target.value)} />
          <button type="button" className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={savePlanner}>Сохранить</button>
        </div>
      )}
    </div>
  );

  const renderEnginePathSection = () => (
    <div className={variant === 'cabin' ? 'team-cabin-section' : undefined} style={sectionCard}>
      <h4 style={{ margin: '0 0 8px', fontSize: 16 }}>Путь Движка</h4>
      <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.78 }}>Ч/б значки означают, что подтверждение еще не получено.</p>
      {renderPathCards()}
    </div>
  );

  const renderCampControlSection = () => (
    <div className={variant === 'cabin' ? 'team-cabin-section' : undefined} style={sectionCard}>
      <h4 style={{ margin: '0 0 8px', fontSize: 16 }}>Управление Лагерем</h4>
      <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.78 }}>Инициативы из Движка отправляются в Совет лагеря.</p>
      {onSuggestInitiative ? (
        <button type="button" className="btn-primary-gold" onClick={onSuggestInitiative}>Предложить инициативу в совет лагеря</button>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.82 }}>Для этой функции сейчас нет доступа.</div>
      )}
    </div>
  );

  if (isLoading) {
    return <p className="profile-loading" style={{ padding: 20, textAlign: 'center' }}>Синхронизация Движка…</p>;
  }

  if (loadError) {
    const errorBox = (
      <div style={sectionCard}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Кабинет управления Движка</h3>
        <div className="profile-error">{loadError}</div>
        <button type="button" className="btn-secondary" style={{ marginTop: 10 }} onClick={() => void syncTeam()}>Повторить</button>
      </div>
    );
    return variant === 'accordion'
      ? <div id="team-dashboard" className="team-dashboard" style={{ background: TEAM_GRADIENT, borderRadius: 24, padding: 20, border: TEAM_BORDER, marginBottom: 24 }}>{errorBox}</div>
      : <div className="team-cabin-content">{errorBox}</div>;
  }

  if (variant === 'accordion') {
    return (
      <div id="team-dashboard" className="team-dashboard" style={{ background: TEAM_GRADIENT, borderRadius: 24, padding: 20, border: TEAM_BORDER, marginBottom: 24 }} aria-expanded={!isCollapsed}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isCollapsed ? 0 : 12 }}>
          <div onClick={toggleCollapsed} style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: TEAM_ACCENT, letterSpacing: '0.1em' }}>Механика ЛК</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 18 }}>Кабинет управления Движка</h3>
          </div>
          <button type="button" onClick={toggleCollapsed} style={{ background: 'none', border: 'none', color: TEAM_ACCENT, fontSize: 20, cursor: 'pointer', transform: isCollapsed ? 'none' : 'rotate(180deg)' }}>▾</button>
        </div>
        {!isCollapsed ? <div className="fade-in">{renderEngineSection()}</div> : null}
      </div>
    );
  }

  const summary = (
    <div className="team-cabin-section" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, ...sectionCard }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: TEAM_ACCENT, letterSpacing: '0.1em' }}>Движок</div>
        <h3 style={{ margin: '4px 0 0', fontSize: 20 }}>{myTeam?.name || 'Кабинет управления Движка'}</h3>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.78 }}>{myTeam ? `Код: ${myTeam.id}` : 'Создай или вступи'}</div>
    </div>
  );

  const cabinContent = activeTab === 'engine'
    ? renderEngineSection()
    : activeTab === 'engine-plan'
      ? renderEnginePlanSection()
      : activeTab === 'engine-path'
        ? renderEnginePathSection()
        : renderCampControlSection();

  return (
    <div className="fade-in team-cabin-content" style={{ display: 'grid', gap: 14 }}>
      {summary}
      {cabinContent}
    </div>
  );
};
