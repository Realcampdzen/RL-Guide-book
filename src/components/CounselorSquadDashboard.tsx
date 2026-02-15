import React, { useMemo, useState } from 'react';
import BadgeIcon from './BadgeIcon';
import { ConfirmModal } from './ConfirmModal';
import { useCounselorSquad } from '../context/CounselorSquadContext';
import { useAuth } from '../context/AuthContext';
import { useUserProgress } from '../hooks/useUserProgress';
import { ImageSourceBlock } from './ImageSourceBlock';
import { requestImageGenerate } from '../utils/imageGenerateApi';
import type { CounselorSquadPlanGridData } from '../types/counselorSquad';
import type { MyActivityKey, ShiftScheduleKey } from '../types/userProgress';
import { ACTIVITY_ITEMS, hasValues, SHIFT_ITEMS } from '../utils/scheduleConstants';

type ScheduleCell = { time?: string; note?: string };

const ACCENT = '#d97706';
const ACCENT_LIGHT = 'rgba(217, 119, 6, 0.25)';
const isImageUrl = (s?: string) => !!s && (s.startsWith('data:') || s.startsWith('http'));

export type CounselorSquadTabId = 'squad' | 'photos' | 'planner' | 'schedule' | 'flag-badges';

interface CounselorSquadDashboardProps {
  variant?: 'accordion' | 'cabin';
  activeTab?: CounselorSquadTabId;
  onTabChange?: (tab: CounselorSquadTabId) => void;
  onNavigateToBadge?: (badgeId: string) => void;
  onShowHint?: (opts: { title: string; content: string }) => void;
}

const defaultPlanGrid = (): CounselorSquadPlanGridData => ({ shiftLength: 21, days: {} });
const PHOTO_FIELDS = [
  { key: 'photoCorner' as const, label: 'Фото отрядного уголка', description: 'Общий вид уголка отряда — стенд, плакаты, украшения' },
  { key: 'photoFlag' as const, label: 'Флаг отряда', description: 'Флаг или символ вашего отряда' },
  { key: 'photoSquad' as const, label: 'Общее отрядное фото', description: 'Фото всего отряда вместе' },
  { key: 'photoWithCounselors' as const, label: 'Фото с вожатыми', description: 'Фото отряда с вожатыми' }
];
const FLAG_BADGE_NAMES: Record<string, string> = { '10.1': 'Мерцающий Маяк', '10.2': 'Алый Парус', '10.3': 'Горящий Факел' };
const FLAG_BADGE_ORDER = ['10.1', '10.2', '10.3'] as const;
const COUNSELOR_TELEGRAM = 'https://t.me/Stivanovv';

export const CounselorSquadDashboard: React.FC<CounselorSquadDashboardProps> = ({
  variant = 'cabin',
  activeTab = 'squad',
  onTabChange,
  onNavigateToBadge,
  onShowHint
}) => {
  const { role, accessToken } = useAuth();
  const { userData, updateDiaryShiftTemplates } = useUserProgress();
  const {
    myCreatedSquad,
    myJoinedSquad,
    activeSquadId,
    activeSquadName,
    activeSquadCard,
    createSquad,
    deleteSquad,
    getInviteCode,
    getInviteLink,
    joinByCode,
    leaveSquad,
    updateActiveSquadCard,
    approveActiveFlagBadgeRequest
  } = useCounselorSquad();

  const canEdit = role === 'shift_leader' || role === 'camp_director' || role === 'developer';
  const canCreateSquad = canEdit;

  const [counselorJoinCode, setCounselorJoinCode] = useState('');
  const [counselorJoinError, setCounselorJoinError] = useState<string | null>(null);
  const [counselorSquadName, setCounselorSquadName] = useState('');
  const [activePlannerGrid, setActivePlannerGrid] = useState<'planGridA' | 'planGridB'>('planGridA');
  const [plannerDay, setPlannerDay] = useState(1);
  const [disbandConfirmOpen, setDisbandConfirmOpen] = useState(false);

  const squad = activeSquadCard ?? {};
  const [localSquadName, setLocalSquadName] = useState(squad.name ?? '');
  const [localSquadMotto, setLocalSquadMotto] = useState(squad.motto ?? '');
  const [localSquadChants, setLocalSquadChants] = useState(squad.chants ?? '');
  const [localSquadGreeting, setLocalSquadGreeting] = useState(squad.greeting ?? '');
  const [localSquadMemes, setLocalSquadMemes] = useState(squad.memes ?? '');
  const [localPhotoCorner, setLocalPhotoCorner] = useState(squad.photoCorner ?? '');
  const [localPhotoFlag, setLocalPhotoFlag] = useState(squad.photoFlag ?? '');
  const [localPhotoSquad, setLocalPhotoSquad] = useState(squad.photoSquad ?? '');
  const [localPhotoWithCounselors, setLocalPhotoWithCounselors] = useState(squad.photoWithCounselors ?? '');
  const [localPlanGridA, setLocalPlanGridA] = useState<CounselorSquadPlanGridData>(() =>
    squad.planGridA ? { shiftLength: squad.planGridA.shiftLength, days: { ...squad.planGridA.days } } : defaultPlanGrid()
  );
  const [localPlanGridB, setLocalPlanGridB] = useState<CounselorSquadPlanGridData>(() =>
    squad.planGridB ? { shiftLength: squad.planGridB.shiftLength, days: { ...squad.planGridB.days } } : defaultPlanGrid()
  );

  const savedShift = userData?.diaryProgress?.shiftSchedule ?? {};
  const savedActivities = userData?.diaryProgress?.myActivities ?? {};
  const [localShift, setLocalShift] = useState<Partial<Record<ShiftScheduleKey, ScheduleCell>>>(savedShift);
  const [localActivities, setLocalActivities] = useState<Partial<Record<MyActivityKey, ScheduleCell>>>(savedActivities);
  const [editingShift, setEditingShift] = useState(!hasValues(savedShift, SHIFT_ITEMS));
  const [editingActivities, setEditingActivities] = useState(!hasValues(savedActivities, ACTIVITY_ITEMS));

  React.useEffect(() => {
    setLocalShift(savedShift);
    if (!hasValues(savedShift, SHIFT_ITEMS)) setEditingShift(true);
  }, [savedShift]);

  React.useEffect(() => {
    setLocalActivities(savedActivities);
    if (!hasValues(savedActivities, ACTIVITY_ITEMS)) setEditingActivities(true);
  }, [savedActivities]);

  const patchCell = <K extends string>(
    setState: React.Dispatch<React.SetStateAction<Partial<Record<K, ScheduleCell>>>>,
    key: K,
    field: 'time' | 'note',
    value: string
  ) => {
    setState((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };
  const saveShift = () => {
    updateDiaryShiftTemplates({ shiftSchedule: localShift });
    setEditingShift(!hasValues(localShift, SHIFT_ITEMS));
  };
  const saveActivities = () => {
    updateDiaryShiftTemplates({ myActivities: localActivities });
    setEditingActivities(!hasValues(localActivities, ACTIVITY_ITEMS));
  };

  React.useEffect(() => {
    const s = activeSquadCard ?? {};
    setLocalSquadName(s.name ?? '');
    setLocalSquadMotto(s.motto ?? '');
    setLocalSquadChants(s.chants ?? '');
    setLocalSquadGreeting(s.greeting ?? '');
    setLocalSquadMemes(s.memes ?? '');
    setLocalPhotoCorner(s.photoCorner ?? '');
    setLocalPhotoFlag(s.photoFlag ?? '');
    setLocalPhotoSquad(s.photoSquad ?? '');
    setLocalPhotoWithCounselors(s.photoWithCounselors ?? '');
    setLocalPlanGridA(s.planGridA ? { shiftLength: s.planGridA.shiftLength, days: { ...s.planGridA.days } } : defaultPlanGrid());
    setLocalPlanGridB(s.planGridB ? { shiftLength: s.planGridB.shiftLength, days: { ...s.planGridB.days } } : defaultPlanGrid());
  }, [activeSquadCard]);

  React.useEffect(() => {
    if (variant === 'cabin' && onTabChange) onTabChange(activeTab);
  }, [variant, activeTab, onTabChange]);

  const getPhoto = (k: (typeof PHOTO_FIELDS)[number]['key']) =>
    k === 'photoCorner' ? localPhotoCorner : k === 'photoFlag' ? localPhotoFlag : k === 'photoSquad' ? localPhotoSquad : localPhotoWithCounselors;
  const setPhoto = (k: (typeof PHOTO_FIELDS)[number]['key'], v: string) => {
    if (k === 'photoCorner') setLocalPhotoCorner(v);
    else if (k === 'photoFlag') setLocalPhotoFlag(v);
    else if (k === 'photoSquad') setLocalPhotoSquad(v);
    else setLocalPhotoWithCounselors(v);
  };
  const currentPlanGrid = activePlannerGrid === 'planGridA' ? localPlanGridA : localPlanGridB;
  const setCurrentPlanGrid = activePlannerGrid === 'planGridA' ? setLocalPlanGridA : setLocalPlanGridB;
  const dayKeys = useMemo(() => Array.from({ length: currentPlanGrid.shiftLength }, (_, i) => i + 1), [currentPlanGrid.shiftLength]);
  const dayData = currentPlanGrid.days[String(plannerDay)] || {};
  React.useEffect(() => {
    if (plannerDay > currentPlanGrid.shiftLength) setPlannerDay(currentPlanGrid.shiftLength);
  }, [plannerDay, currentPlanGrid.shiftLength]);

  const saveSquad = () =>
    updateActiveSquadCard({
      name: localSquadName.trim() || undefined,
      motto: localSquadMotto.trim() || undefined,
      chants: localSquadChants.trim() || undefined,
      greeting: localSquadGreeting.trim() || undefined,
      memes: localSquadMemes.trim() || undefined,
      photoCorner: localPhotoCorner || undefined,
      photoFlag: localPhotoFlag || undefined,
      photoSquad: localPhotoSquad || undefined,
      photoWithCounselors: localPhotoWithCounselors || undefined
    });
  const savePlanner = () => updateActiveSquadCard({ planGridA: localPlanGridA, planGridB: localPlanGridB });
  const setShiftLength = (len: 9 | 21) => {
    setCurrentPlanGrid((prev) => {
      const days = { ...prev.days };
      if (len === 9) for (let d = 10; d <= 21; d++) delete days[String(d)];
      return { shiftLength: len, days };
    });
    if (plannerDay > len) setPlannerDay(len);
  };
  const setDayField = (field: 'morning' | 'quietHour' | 'day' | 'evening' | 'night', value: string) => {
    const key = String(plannerDay);
    setCurrentPlanGrid((prev) => ({
      ...prev,
      days: { ...prev.days, [key]: { ...(prev.days[key] || {}), [field]: value || undefined } }
    }));
  };

  const percent = useMemo(() => {
    const squadScore = [localSquadName, localSquadMotto, localSquadChants, localSquadGreeting, localSquadMemes].filter((v) => v.trim()).length / 5;
    const photosScore = [localPhotoCorner, localPhotoFlag, localPhotoSquad, localPhotoWithCounselors].filter(isImageUrl).length / 4;
    const gridScore = (g: CounselorSquadPlanGridData) => {
      let filled = 0;
      for (let d = 1; d <= g.shiftLength; d++) {
        const x = g.days[String(d)] || {};
        if ((x.morning || '').trim() && (x.quietHour || '').trim() && (x.day || '').trim() && (x.evening || '').trim() && (x.night || '').trim()) filled++;
      }
      return filled / g.shiftLength;
    };
    return Math.min(100, Math.round(((squadScore + photosScore + gridScore(localPlanGridA) + gridScore(localPlanGridB)) / 4) * 100));
  }, [localSquadName, localSquadMotto, localSquadChants, localSquadGreeting, localSquadMemes, localPhotoCorner, localPhotoFlag, localPhotoSquad, localPhotoWithCounselors, localPlanGridA, localPlanGridB]);

  const readOnlyProps = canEdit ? {} : { readOnly: true, disabled: true };

  const sectionWrap = (content: React.ReactNode) => (
    <div className="counselor-squad-cabin-section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {content}
    </div>
  );

  const flagBadgesVisual = (
    <div className="squad-corner-flag-badges-grid">
      {FLAG_BADGE_ORDER.map((id) => {
        const approved = (squad.flagBadgesApproved || []).includes(id);
        return (
          <button
            key={id}
            type="button"
            className={`squad-corner-flag-badge-card${approved ? ' squad-corner-flag-badge-card--approved' : ''}`}
            onClick={() => onNavigateToBadge?.(id)}
            aria-label={`Открыть значок ${FLAG_BADGE_NAMES[id]}`}
            title={FLAG_BADGE_NAMES[id]}
            disabled={!onNavigateToBadge}
          >
            <BadgeIcon badgeId={id} badgeTitle={FLAG_BADGE_NAMES[id]} categoryId="10" emoji="🚩" size="responsive" />
            {approved && <span className="squad-corner-flag-badge-check">✓</span>}
          </button>
        );
      })}
    </div>
  );

  const pendingRequests = (() => {
    const pending = (squad.flagBadgeRequests || []).filter((r) => r.status === 'pending');
    if (!pending.length) return <p className="profile-empty-state__text">Пока нет заявок на рассмотрении</p>;
    const allText = ['Заявки на значки флага отряда:', ...pending.map((req, i) => `${i + 1}. ${FLAG_BADGE_NAMES[req.badgeId] || req.badgeId}`)].join('\n\n');
    return (
      <>
        <a href={`${COUNSELOR_TELEGRAM}?text=${encodeURIComponent(allText)}`} target="_blank" rel="noopener noreferrer" className="btn-primary-gold" style={{ alignSelf: 'flex-start' }}>
          Отправить все заявки
        </a>
        {pending.map((req) => {
          const name = FLAG_BADGE_NAMES[req.badgeId] || req.badgeId;
          return (
            <div key={req.badgeId} style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{name}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a href={`${COUNSELOR_TELEGRAM}?text=${encodeURIComponent(`Заявка на значок флага отряда: ${name}`)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  Отправить вожатому
                </a>
                {canEdit && (
                  <button type="button" className="btn-secondary" onClick={() => approveActiveFlagBadgeRequest(req.badgeId)}>
                    Вожатый утвердил
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </>
    );
  })();

  const squadSection = sectionWrap(
    <>
      <input
        className="w-input"
        style={{ width: '100%' }}
        placeholder="Название отряда"
        value={localSquadName}
        onChange={(e) => setLocalSquadName(e.target.value)}
        {...readOnlyProps}
      />
      <input
        className="w-input"
        style={{ width: '100%' }}
        placeholder="Девиз"
        value={localSquadMotto}
        onChange={(e) => setLocalSquadMotto(e.target.value)}
        {...readOnlyProps}
      />
      <textarea className="w-input" style={{ width: '100%' }} placeholder="Кричалки" value={localSquadChants} onChange={(e) => setLocalSquadChants(e.target.value)} rows={2} {...readOnlyProps} />
      <input
        className="w-input"
        style={{ width: '100%' }}
        placeholder="Приветствие"
        value={localSquadGreeting}
        onChange={(e) => setLocalSquadGreeting(e.target.value)}
        {...readOnlyProps}
      />
      <textarea className="w-input" style={{ width: '100%' }} placeholder="Мемы" value={localSquadMemes} onChange={(e) => setLocalSquadMemes(e.target.value)} rows={2} {...readOnlyProps} />
      {canEdit && (
        <button type="button" className="btn-secondary" onClick={saveSquad} style={{ alignSelf: 'flex-start' }}>
          Сохранить отряд
        </button>
      )}
    </>
  );

  const photosSection = sectionWrap(
    <>
      {PHOTO_FIELDS.map(({ key, label, description }) => (
        <div key={key}>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
          <p style={{ margin: '0 0 8px', fontSize: 11, opacity: 0.7 }}>{description}</p>
          <ImageSourceBlock
            className="squad-corner-image-source-block"
            context="squad_photo"
            value={getPhoto(key) || null}
            onChange={canEdit ? (url) => setPhoto(key, url) : () => {}}
            aspect="square"
            labels={{ placeholder: label }}
            onGenerate={canEdit ? async (o) => requestImageGenerate({ mode: 'generate', context: 'counselor_squad', prompt: o.prompt ?? '' }, accessToken ?? null) : undefined}
            onProcess={canEdit ? async (imageBase64, o) => requestImageGenerate({ mode: 'process', context: 'counselor_squad', imageBase64, prompt: o?.prompt ?? '' }, accessToken ?? null) : undefined}
          />
        </div>
      ))}
      {canEdit && (
        <button type="button" className="btn-secondary" onClick={saveSquad} style={{ alignSelf: 'flex-start' }}>
          Сохранить отряд
        </button>
      )}
    </>
  );

  const plannerSection = sectionWrap(
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['planGridA', 'planGridB'] as const).map((id) => (
          <button key={id} type="button" className="btn-secondary" onClick={() => setActivePlannerGrid(id)} disabled={!canEdit}>
            {id === 'planGridA' ? 'Сетка 1' : 'Сетка 2'}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <label>
          <input type="radio" checked={currentPlanGrid.shiftLength === 9} onChange={() => setShiftLength(9)} disabled={!canEdit} /> 9 дней
        </label>
        <label>
          <input type="radio" checked={currentPlanGrid.shiftLength === 21} onChange={() => setShiftLength(21)} disabled={!canEdit} /> 21 день
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {dayKeys.map((d) => (
          <button key={d} type="button" className="btn-secondary" onClick={() => setPlannerDay(d)} disabled={!canEdit}>
            День {d}
          </button>
        ))}
      </div>
      <textarea
        className="w-input"
        placeholder="Утро"
        value={dayData.morning ?? ''}
        onChange={(e) => setDayField('morning', e.target.value)}
        rows={2}
        {...readOnlyProps}
      />
      <textarea
        className="w-input"
        placeholder="Тихий час"
        value={dayData.quietHour ?? ''}
        onChange={(e) => setDayField('quietHour', e.target.value)}
        rows={2}
        {...readOnlyProps}
      />
      <textarea
        className="w-input"
        placeholder="День"
        value={dayData.day ?? ''}
        onChange={(e) => setDayField('day', e.target.value)}
        rows={2}
        {...readOnlyProps}
      />
      <textarea
        className="w-input"
        placeholder="Вечер"
        value={dayData.evening ?? ''}
        onChange={(e) => setDayField('evening', e.target.value)}
        rows={2}
        {...readOnlyProps}
      />
      <textarea
        className="w-input"
        placeholder="Ночь"
        value={dayData.night ?? ''}
        onChange={(e) => setDayField('night', e.target.value)}
        rows={2}
        {...readOnlyProps}
      />
      {canEdit && (
        <button type="button" className="btn-secondary" onClick={savePlanner} style={{ alignSelf: 'flex-start' }}>
          Сохранить
        </button>
      )}
    </>
  );

  const scheduleText = (v?: string) => (v || '').trim();
  const scheduleCard = <K extends string>(
    title: string,
    items: Array<{ key: K; label: string }>,
    values: Partial<Record<K, ScheduleCell>>,
    editing: boolean,
    onEdit: () => void,
    onSave: () => void,
    onChange: (k: K, field: 'time' | 'note', value: string) => void
  ) => (
    <article className="real-diary-schedule-card">
      <h4 className="real-diary-schedule-card__title">{title}</h4>
      {canEdit && editing ? (
        <div className="real-diary-schedule-editor">
          {items.map(({ key, label }) => (
            <div key={String(key)} className="real-diary-schedule-editor__row">
              <div className="real-diary-schedule-editor__label">{label}</div>
              <input className="w-input real-diary-schedule-editor__time" placeholder="Время" value={values[key]?.time || ''} onChange={(e) => onChange(key, 'time', e.target.value)} />
              <input className="w-input real-diary-schedule-editor__note" placeholder="Заметка" value={values[key]?.note || ''} onChange={(e) => onChange(key, 'note', e.target.value)} />
            </div>
          ))}
          <div className="real-diary-schedule-actions"><button type="button" className="btn-primary-gold" onClick={onSave}>Сохранить</button></div>
        </div>
      ) : (
        <>
          <div className="real-diary-schedule-list">
            {items.map(({ key, label }) => (
              <div key={String(key)} className="real-diary-schedule-row">
                <div className="real-diary-schedule-label">{label}</div>
                <div className="real-diary-schedule-time">{scheduleText(values[key]?.time) || '—'}</div>
                <div className="real-diary-schedule-note">{scheduleText(values[key]?.note) || '—'}</div>
              </div>
            ))}
          </div>
          {canEdit && (
            <div className="real-diary-schedule-actions"><button type="button" className="btn-secondary" onClick={onEdit}>Редактировать</button></div>
          )}
        </>
      )}
    </article>
  );

  const scheduleSection = (
    <div className="counselor-squad-cabin-section">
      <div className="real-diary-schedule-columns">
        {scheduleCard('Распорядок смены', SHIFT_ITEMS, localShift, editingShift, () => setEditingShift(true), saveShift, (k, f, v) => patchCell(setLocalShift, k, f, v))}
        {scheduleCard('Мои занятия (кружки/тренировки)', ACTIVITY_ITEMS, localActivities, editingActivities, () => setEditingActivities(true), saveActivities, (k, f, v) => patchCell(setLocalActivities, k, f, v))}
      </div>
    </div>
  );

  const flagsSection = sectionWrap(
    <>
      {flagBadgesVisual}
      {pendingRequests}
    </>
  );

  const onJoinSubmit = () => {
    if (!counselorJoinCode.trim()) {
      setCounselorJoinError('Введите код');
      return;
    }
    const ok = joinByCode(counselorJoinCode.trim());
    setCounselorJoinError(ok ? null : 'Неверный код');
    if (ok) setCounselorJoinCode('');
  };

  const showCopyHint = (title: string, content: string) => {
    onShowHint?.({ title, content });
  };

  if (!activeSquadId) {
    return (
      <div className="fade-in counselor-squad-cabin-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="counselor-squad-cabin-section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: ACCENT, letterSpacing: '.1em', marginBottom: 4 }}>Вожатский отряд</div>
        </div>
        {myJoinedSquad && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>
              Вы в отряде: <strong>{myJoinedSquad.squadName}</strong>
            </p>
            <button
              type="button"
              onClick={() => {
                leaveSquad();
                setCounselorJoinCode('');
                setCounselorJoinError(null);
              }}
              className="btn-secondary"
              style={{ marginTop: 8, padding: '6px 12px', fontSize: 12 }}
            >
              Выйти из отряда
            </button>
          </div>
        )}
        {!myJoinedSquad && ((role === 'counselor' || role === 'educator') || (canCreateSquad && !myCreatedSquad)) && (
          <div style={{ marginBottom: 14 }} className={(role === 'counselor' || role === 'educator') ? 'organizer-empty-state' : ''}>
            {(role === 'counselor' || role === 'educator') && (
              <>
                <div className="organizer-empty-state__icon" aria-hidden>
                  🔑
                </div>
                <p className="organizer-empty-state__title" style={{ margin: '0 0 6px', fontSize: 14 }}>
                  Войти в отряд вожатых
                </p>
                <p className="organizer-empty-state__text" style={{ margin: '0 0 12px', fontSize: 12, opacity: 0.85 }}>
                  Старший Вожатый (или Разработчик в песочнице) создаёт отряд и даёт код приглашения. Вставьте код, чтобы присоединиться.
                </p>
              </>
            )}
            <label style={{ display: 'block', fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Войти по коду</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={counselorJoinCode}
                onChange={(e) => {
                  setCounselorJoinCode(e.target.value);
                  setCounselorJoinError(null);
                }}
                placeholder="Код приглашения"
                style={{ flex: 1, minWidth: 140, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
              />
              <button type="button" onClick={onJoinSubmit} className="btn-primary-gold" style={{ padding: '8px 14px', fontSize: 12 }}>
                Войти
              </button>
            </div>
            {counselorJoinError && <span style={{ fontSize: 12, color: '#ff6b6b', display: 'block', marginTop: 4 }}>{counselorJoinError}</span>}
          </div>
        )}
        {canCreateSquad && !myCreatedSquad && (
          <div className="organizer-empty-state" style={{ padding: '12px 0' }}>
            <div className="organizer-empty-state__icon" aria-hidden>
              👥
            </div>
            <p className="organizer-empty-state__title" style={{ margin: '0 0 8px' }}>Создать отряд вожатых</p>
            <p className="organizer-empty-state__text" style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.85 }}>
              Введите название и создайте отряд, чтобы приглашать вожатых по коду или ссылке.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={counselorSquadName}
                onChange={(e) => setCounselorSquadName(e.target.value)}
                placeholder="Например: Отряд «Солнышко»"
                style={{ flex: 1, minWidth: 160, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13 }}
              />
              <button
                type="button"
                disabled={!counselorSquadName.trim()}
                title={!counselorSquadName.trim() ? 'Введите название отряда' : undefined}
                onClick={() => {
                  if (counselorSquadName.trim()) {
                    createSquad(counselorSquadName.trim());
                    setCounselorSquadName('');
                  } else {
                    onShowHint?.({ title: 'Введите название', content: 'Укажите название отряда, чтобы создать его.' });
                  }
                }}
                className="btn-primary-gold"
                style={{ padding: '8px 14px', fontSize: 12 }}
              >
                Создать отряд
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const emptyStateCard = !activeSquadCard && (role === 'counselor' || role === 'educator') && (
    <div className="profile-empty-state organizer-empty-state" style={{ padding: 20 }}>
      <p className="profile-empty-state__text">Данные отряда недоступны в этом устройстве без синхронизации.</p>
    </div>
  );

  const summary = (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: ACCENT, letterSpacing: '.1em', marginBottom: 4 }}>Вожатский отряд</div>
            <h3 style={{ margin: 0, fontSize: 18 }}>{activeTab === 'schedule' ? 'Беспорядок дня' : (activeSquadName || localSquadName || 'Отряд').trim()}</h3>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 'min(42%, 360px)', alignSelf: 'flex-start', justifyContent: 'flex-end', flexShrink: 0 }}>
            {PHOTO_FIELDS.map(({ key }) => {
              const v = getPhoto(key);
              return isImageUrl(v) ? (
                <div key={key} style={{ width: 'clamp(72px, 7vw, 96px)', height: 'clamp(72px, 7vw, 96px)', borderRadius: 12, overflow: 'hidden', border: `1px solid ${ACCENT_LIGHT}`, flex: '0 0 auto' }}>
                  <img src={v} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : null;
            })}
          </div>
        </div>
        {myJoinedSquad && (
          <p style={{ margin: '0 0 8px', fontSize: 12, opacity: 0.9 }}>
            Вы в отряде: <strong>{myJoinedSquad.squadName}</strong>
            <button type="button" onClick={leaveSquad} className="btn-secondary" style={{ marginLeft: 12, padding: '4px 10px', fontSize: 11 }}>
              Выйти
            </button>
          </p>
        )}
        {canCreateSquad && myCreatedSquad && (
          <div style={{ marginBottom: 8 }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, opacity: 0.8 }}>Код приглашения:</p>
            <p style={{ margin: '0 0 8px', fontSize: 14, fontFamily: 'monospace', wordBreak: 'break-all' }}>{getInviteCode()}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(getInviteCode());
                  showCopyHint('Скопировано', 'Код скопирован');
                }}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                Копировать код
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(getInviteLink());
                  showCopyHint('Скопировано', 'Ссылка скопирована');
                }}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                Копировать ссылку
              </button>
              <button
                type="button"
                onClick={() => setDisbandConfirmOpen(true)}
                style={{ padding: '6px 12px', fontSize: 12, background: 'rgba(255,77,77,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 8, cursor: 'pointer' }}
              >
                Распустить отряд
              </button>
            </div>
          </div>
        )}
        {activeSquadCard && (
          <div style={{ maxWidth: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700 }}>Заполненность</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: percent === 100 ? ACCENT : 'rgba(255,255,255,.7)' }}>{percent}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.08)' }}>
              <div style={{ width: `${percent}%`, height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${ACCENT}, #f59e0b)` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const cabinContent =
    activeTab === 'squad' ? squadSection : activeTab === 'photos' ? photosSection : activeTab === 'planner' ? plannerSection : activeTab === 'schedule' ? scheduleSection : flagsSection;

  return (
    <div className={`fade-in counselor-squad-cabin-content ${!canEdit ? 'counselor-squad-read-only' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {summary}
      {emptyStateCard || cabinContent}
      <ConfirmModal
        open={disbandConfirmOpen}
        onClose={() => setDisbandConfirmOpen(false)}
        title="Распустить отряд?"
        message="Все данные отряда (название, фото, планёрка, значки) будут удалены безвозвратно."
        confirmLabel="Распустить"
        cancelLabel="Отмена"
        onConfirm={() => deleteSquad()}
        danger
      />
    </div>
  );
};
