import React, { useMemo, useState } from 'react';
import BadgeIcon from './BadgeIcon';
import { useUserProgress } from '../hooks/useUserProgress';
import { useAuth } from '../context/AuthContext';
import { ImageSourceBlock } from './ImageSourceBlock';
import { requestImageGenerate } from '../utils/imageGenerateApi';

const ACCENT = '#d97706';
const ACCENT_LIGHT = 'rgba(217, 119, 6, 0.25)';
const GRADIENT = 'linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(120, 53, 15, 0.12) 100%)';
const isImageUrl = (s?: string) => !!s && (s.startsWith('data:') || s.startsWith('http'));

type PlanGridData = { shiftLength: 9 | 21; days: Record<string, { morning?: string; quietHour?: string; day?: string; evening?: string; night?: string }> };
export type SquadCornerTabId = 'squad' | 'photos' | 'planner' | 'flag-badges';

interface SquadCornerDashboardProps {
  variant?: 'accordion' | 'cabin';
  activeTab?: SquadCornerTabId;
  onTabChange?: (tab: SquadCornerTabId) => void;
  onNavigateToBadge?: (badgeId: string) => void;
}

const defaultPlanGrid = (): PlanGridData => ({ shiftLength: 21, days: {} });
const PHOTO_FIELDS = [
  { key: 'photoCorner' as const, label: 'Фото отрядного уголка', description: 'Общий вид уголка отряда — стенд, плакаты, украшения' },
  { key: 'photoFlag' as const, label: 'Флаг отряда', description: 'Флаг или символ вашего отряда' },
  { key: 'photoSquad' as const, label: 'Общее отрядное фото', description: 'Фото всего отряда вместе' },
  { key: 'photoWithCounselors' as const, label: 'Фото с вожатыми', description: 'Фото отряда с вожатыми' }
];
const FLAG_BADGE_NAMES: Record<string, string> = { '10.1': 'Мерцающий Маяк', '10.2': 'Алый Парус', '10.3': 'Горящий Факел' };
const FLAG_BADGE_ORDER = ['10.1', '10.2', '10.3'] as const;
const COUNSELOR_TELEGRAM = 'https://t.me/Stivanovv';

export const SquadCornerDashboard: React.FC<SquadCornerDashboardProps> = ({
  variant = 'accordion',
  activeTab = 'squad',
  onTabChange,
  onNavigateToBadge
}) => {
  const { userData, updateDiarySquad, approveFlagBadgeRequest } = useUserProgress();
  const { accessToken } = useAuth();
  const progress = userData.diaryProgress || { currentDay: 1, squad: undefined };
  const squad = progress.squad || {};

  const [isExpanded, setIsExpanded] = useState(false);
  const [squadExpanded, setSquadExpanded] = useState(false);
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [plannerExpanded, setPlannerExpanded] = useState(false);
  const [flagBadgesExpanded, setFlagBadgesExpanded] = useState(false);
  const [activePlannerGrid, setActivePlannerGrid] = useState<'planGridA' | 'planGridB'>('planGridA');
  const [plannerDay, setPlannerDay] = useState(1);

  const [localSquadName, setLocalSquadName] = useState(squad.name ?? '');
  const [localSquadMotto, setLocalSquadMotto] = useState(squad.motto ?? '');
  const [localSquadChants, setLocalSquadChants] = useState(squad.chants ?? '');
  const [localSquadGreeting, setLocalSquadGreeting] = useState(squad.greeting ?? '');
  const [localSquadMemes, setLocalSquadMemes] = useState(squad.memes ?? '');
  const [localPhotoCorner, setLocalPhotoCorner] = useState(squad.photoCorner ?? '');
  const [localPhotoFlag, setLocalPhotoFlag] = useState(squad.photoFlag ?? '');
  const [localPhotoSquad, setLocalPhotoSquad] = useState(squad.photoSquad ?? '');
  const [localPhotoWithCounselors, setLocalPhotoWithCounselors] = useState(squad.photoWithCounselors ?? '');
  const [localPlanGridA, setLocalPlanGridA] = useState<PlanGridData>(() => (squad.planGridA ? { shiftLength: squad.planGridA.shiftLength, days: { ...squad.planGridA.days } } : defaultPlanGrid()));
  const [localPlanGridB, setLocalPlanGridB] = useState<PlanGridData>(() => (squad.planGridB ? { shiftLength: squad.planGridB.shiftLength, days: { ...squad.planGridB.days } } : defaultPlanGrid()));

  React.useEffect(() => {
    const s = progress.squad || {};
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
  }, [progress.squad]);

  React.useEffect(() => {
    if (variant === 'cabin' && onTabChange) onTabChange(activeTab);
  }, [variant, activeTab, onTabChange]);

  const getPhoto = (k: typeof PHOTO_FIELDS[number]['key']) => (k === 'photoCorner' ? localPhotoCorner : k === 'photoFlag' ? localPhotoFlag : k === 'photoSquad' ? localPhotoSquad : localPhotoWithCounselors);
  const setPhoto = (k: typeof PHOTO_FIELDS[number]['key'], v: string) => {
    if (k === 'photoCorner') setLocalPhotoCorner(v);
    else if (k === 'photoFlag') setLocalPhotoFlag(v);
    else if (k === 'photoSquad') setLocalPhotoSquad(v);
    else setLocalPhotoWithCounselors(v);
  };
  const currentPlanGrid = activePlannerGrid === 'planGridA' ? localPlanGridA : localPlanGridB;
  const setCurrentPlanGrid = activePlannerGrid === 'planGridA' ? setLocalPlanGridA : setLocalPlanGridB;
  const dayKeys = useMemo(() => Array.from({ length: currentPlanGrid.shiftLength }, (_, i) => i + 1), [currentPlanGrid.shiftLength]);
  const dayData = currentPlanGrid.days[String(plannerDay)] || {};
  React.useEffect(() => { if (plannerDay > currentPlanGrid.shiftLength) setPlannerDay(currentPlanGrid.shiftLength); }, [plannerDay, currentPlanGrid.shiftLength]);

  const saveSquad = () => updateDiarySquad({
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
  const savePlanner = () => updateDiarySquad({ planGridA: localPlanGridA, planGridB: localPlanGridB });
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
    setCurrentPlanGrid((prev) => ({ ...prev, days: { ...prev.days, [key]: { ...(prev.days[key] || {}), [field]: value || undefined } } }));
  };

  const percent = useMemo(() => {
    const squadScore = [localSquadName, localSquadMotto, localSquadChants, localSquadGreeting, localSquadMemes].filter((v) => v.trim()).length / 5;
    const photosScore = [localPhotoCorner, localPhotoFlag, localPhotoSquad, localPhotoWithCounselors].filter(isImageUrl).length / 4;
    const gridScore = (g: PlanGridData) => {
      let filled = 0;
      for (let d = 1; d <= g.shiftLength; d++) {
        const x = g.days[String(d)] || {};
        if ((x.morning || '').trim() && (x.quietHour || '').trim() && (x.day || '').trim() && (x.evening || '').trim() && (x.night || '').trim()) filled++;
      }
      return filled / g.shiftLength;
    };
    return Math.min(100, Math.round(((squadScore + photosScore + gridScore(localPlanGridA) + gridScore(localPlanGridB)) / 4) * 100));
  }, [localSquadName, localSquadMotto, localSquadChants, localSquadGreeting, localSquadMemes, localPhotoCorner, localPhotoFlag, localPhotoSquad, localPhotoWithCounselors, localPlanGridA, localPlanGridB]);

  const card: React.CSSProperties = { padding: 16, background: 'rgba(0,0,0,.15)', borderRadius: 16, border: '1px solid rgba(255,255,255,.06)' };
  const headerBtn: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', color: ACCENT, fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.05em' };
  const sectionWrap = (open: boolean, content: React.ReactNode, title: string, onToggle: () => void) => (
    <div className={variant === 'cabin' ? 'squad-corner-cabin-section' : undefined} style={variant === 'accordion' ? card : {}}>
      {variant === 'accordion' && <button type="button" onClick={onToggle} style={headerBtn}>{title}<span style={{ transform: open ? 'rotate(180deg)' : 'none' }}>▾</span></button>}
      {(variant === 'cabin' || open) && <div style={{ marginTop: variant === 'accordion' ? 16 : 0, display: 'flex', flexDirection: 'column', gap: 12 }}>{content}</div>}
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
        <a href={`${COUNSELOR_TELEGRAM}?text=${encodeURIComponent(allText)}`} target="_blank" rel="noopener noreferrer" className="btn-primary-gold" style={{ alignSelf: 'flex-start' }}>Отправить все заявки</a>
        {pending.map((req) => {
          const name = FLAG_BADGE_NAMES[req.badgeId] || req.badgeId;
          return (
            <div key={req.badgeId} style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{name}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a href={`${COUNSELOR_TELEGRAM}?text=${encodeURIComponent(`Заявка на значок флага отряда: ${name}`)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">Отправить вожатому</a>
                <button type="button" className="btn-secondary" onClick={() => approveFlagBadgeRequest(req.badgeId)}>Вожатый утвердил</button>
              </div>
            </div>
          );
        })}
      </>
    );
  })();

  const squadSection = sectionWrap(squadExpanded, (
    <>
      <input className="w-input" style={{ width: '100%' }} placeholder="Название отряда" value={localSquadName} onChange={(e) => setLocalSquadName(e.target.value)} />
      <input className="w-input" style={{ width: '100%' }} placeholder="Девиз" value={localSquadMotto} onChange={(e) => setLocalSquadMotto(e.target.value)} />
      <textarea className="w-input" style={{ width: '100%' }} placeholder="Кричалки" value={localSquadChants} onChange={(e) => setLocalSquadChants(e.target.value)} rows={2} />
      <input className="w-input" style={{ width: '100%' }} placeholder="Приветствие" value={localSquadGreeting} onChange={(e) => setLocalSquadGreeting(e.target.value)} />
      <textarea className="w-input" style={{ width: '100%' }} placeholder="Мемы" value={localSquadMemes} onChange={(e) => setLocalSquadMemes(e.target.value)} rows={2} />
      <button type="button" className="btn-secondary" onClick={saveSquad} style={{ alignSelf: 'flex-start' }}>Сохранить отряд</button>
    </>
  ), 'Отряд', () => setSquadExpanded((v) => !v));

  const photosSection = sectionWrap(photosExpanded, (
    <>
      {PHOTO_FIELDS.map(({ key, label, description }) => (
        <div key={key}>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
          <p style={{ margin: '0 0 8px', fontSize: 11, opacity: .7 }}>{description}</p>
          <ImageSourceBlock
            className="squad-corner-image-source-block"
            context="squad_photo"
            value={getPhoto(key) || null}
            onChange={(url) => setPhoto(key, url)}
            aspect="square"
            labels={{ placeholder: label }}
            onGenerate={async (o) => requestImageGenerate({ mode: 'generate', context: key === 'photoWithCounselors' ? 'counselor_squad' : 'squad_corner', prompt: o.prompt ?? '' }, accessToken ?? null)}
            onProcess={async (imageBase64, o) => requestImageGenerate({ mode: 'process', context: key === 'photoWithCounselors' ? 'counselor_squad' : 'squad_corner', imageBase64, prompt: o?.prompt ?? '' }, accessToken ?? null)}
          />
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={saveSquad} style={{ alignSelf: 'flex-start' }}>Сохранить отряд</button>
    </>
  ), 'Добавить фото в отряд', () => setPhotosExpanded((v) => !v));

  const plannerSection = sectionWrap(plannerExpanded, (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['planGridA', 'planGridB'] as const).map((id) => <button key={id} type="button" className="btn-secondary" onClick={() => setActivePlannerGrid(id)}>{id === 'planGridA' ? 'Сетка 1' : 'Сетка 2'}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <label><input type="radio" checked={currentPlanGrid.shiftLength === 9} onChange={() => setShiftLength(9)} /> 9 дней</label>
        <label><input type="radio" checked={currentPlanGrid.shiftLength === 21} onChange={() => setShiftLength(21)} /> 21 день</label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{dayKeys.map((d) => <button key={d} type="button" className="btn-secondary" onClick={() => setPlannerDay(d)}>День {d}</button>)}</div>
      <textarea className="w-input" placeholder="Утро" value={dayData.morning ?? ''} onChange={(e) => setDayField('morning', e.target.value)} rows={2} />
      <textarea className="w-input" placeholder="Тихий час" value={dayData.quietHour ?? ''} onChange={(e) => setDayField('quietHour', e.target.value)} rows={2} />
      <textarea className="w-input" placeholder="День" value={dayData.day ?? ''} onChange={(e) => setDayField('day', e.target.value)} rows={2} />
      <textarea className="w-input" placeholder="Вечер" value={dayData.evening ?? ''} onChange={(e) => setDayField('evening', e.target.value)} rows={2} />
      <textarea className="w-input" placeholder="Ночь" value={dayData.night ?? ''} onChange={(e) => setDayField('night', e.target.value)} rows={2} />
      <button type="button" className="btn-secondary" onClick={savePlanner} style={{ alignSelf: 'flex-start' }}>Сохранить</button>
    </>
  ), 'Планёрка', () => setPlannerExpanded((v) => !v));

  const flagsSection = sectionWrap(flagBadgesExpanded, (
    <>
      {flagBadgesVisual}
      {pendingRequests}
    </>
  ), 'Значки на флаг отряда', () => setFlagBadgesExpanded((v) => !v));

  const summary = (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: variant === 'accordion' && isExpanded ? 20 : 12 }}>
      <div onClick={variant === 'accordion' ? () => setIsExpanded((v) => !v) : undefined} style={{ cursor: variant === 'accordion' ? 'pointer' : 'default', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: ACCENT, letterSpacing: '.1em', marginBottom: 4 }}>Отрядный уголок</div><h3 style={{ margin: 0, fontSize: 18 }}>{localSquadName.trim() || 'Отряд'}</h3></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 'min(42%, 360px)', alignSelf: 'flex-start', justifyContent: 'flex-end', flexShrink: 0 }}>{PHOTO_FIELDS.map(({ key }) => { const v = getPhoto(key); return isImageUrl(v) ? <div key={key} style={{ width: 'clamp(72px, 7vw, 96px)', height: 'clamp(72px, 7vw, 96px)', borderRadius: 12, overflow: 'hidden', border: `1px solid ${ACCENT_LIGHT}`, flex: '0 0 auto' }}><img src={v} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div> : null; })}</div>
        </div>
        <div style={{ maxWidth: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 10, fontWeight: 700 }}>Заполненность</span><span style={{ fontSize: 12, fontWeight: 800, color: percent === 100 ? ACCENT : 'rgba(255,255,255,.7)' }}>{percent}%</span></div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.08)' }}><div style={{ width: `${percent}%`, height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${ACCENT}, #f59e0b)` }} /></div>
        </div>
      </div>
      {variant === 'accordion' && <button type="button" onClick={() => setIsExpanded((v) => !v)} style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 20, cursor: 'pointer', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</button>}
    </div>
  );

  if (variant === 'accordion') {
    return (
      <div className="squad-corner-dashboard" style={{ background: GRADIENT, borderRadius: 24, padding: 20, border: `1px solid ${ACCENT_LIGHT}`, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: ACCENT, filter: 'blur(50px)', opacity: .08, pointerEvents: 'none' }} />
        {summary}
        {isExpanded && <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>{squadSection}{photosSection}{plannerSection}{flagsSection}</div>}
      </div>
    );
  }

  const cabinContent = activeTab === 'squad' ? squadSection : activeTab === 'photos' ? photosSection : activeTab === 'planner' ? plannerSection : flagsSection;
  return (
    <div className="fade-in squad-corner-cabin-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {summary}
      {cabinContent}
    </div>
  );
};
