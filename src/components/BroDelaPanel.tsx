import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BRODELA_TEMPLATES,
  BRODELA_CATEGORY_META,
  BRODELA_TIPS,
  type BroDelaTemplate,
  type BroDelaStep,
  type BroDelaCategory,
} from '../data/broDelaTemplates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BroInitiative {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  votes: Record<string, boolean>;
  status: string;
}

interface ConstructorState {
  templateId: string | null;
  name: string;
  description: string;
  duration: string;
  targetAudience: string;
  steps: BroDelaStep[];
  materials: string;
  relatedBadge: string;
}

const DEFAULT_STATE: ConstructorState = {
  templateId: null,
  name: '',
  description: '',
  duration: '30 мин',
  targetAudience: 'свой отряд',
  steps: [],
  materials: '',
  relatedBadge: '',
};

const uid = () => `bs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const DRAFT_KEY = 'brodela-constructor-draft';
const DRAFT_STEP_KEY = 'brodela-constructor-step';

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const sectionCard: React.CSSProperties = {
  padding: '18px 20px', borderRadius: 14,
  background: '#161230',
  border: '1px solid rgba(124, 58, 237, 0.18)',
};

const fieldStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 10,
  border: '1px solid rgba(124,58,237,0.25)',
  background: 'rgba(124,58,237,0.06)', color: '#e8f0ff',
  fontSize: 13, fontFamily: 'inherit', fontWeight: 500,
  outline: 'none', width: '100%', boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  padding: '10px 22px', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
  color: '#fff', fontSize: 13, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
  transition: 'all 0.15s',
};

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 10,
  border: '1px solid rgba(124,58,237,0.3)',
  background: 'rgba(124,58,237,0.08)', color: '#c4b5fd',
  fontSize: 12, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: '#c4b5fd',
  textTransform: 'uppercase' as const, letterSpacing: 0.5,
  marginBottom: 6, display: 'block',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BroDelaPanel: React.FC = () => {
  const { accessToken, deviceId } = useAuth();
  const [items, setItems] = useState<BroInitiative[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Constructor state
  const [constructorOpen, setConstructorOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [cStep, setCStep] = useState(() => {
    try { const s = localStorage.getItem(DRAFT_STEP_KEY); return s ? Math.max(1, Math.min(3, Number(s))) : 1; } catch { return 1; }
  });
  const [state, setState] = useState<ConstructorState>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) { const parsed = JSON.parse(saved); return { ...DEFAULT_STATE, ...parsed }; }
    } catch { /* ignore */ }
    return { ...DEFAULT_STATE };
  });
  const [categoryFilter, setCategoryFilter] = useState<BroDelaCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTip, setShowTip] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const headers = useMemo((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) h['Authorization'] = `Bearer ${accessToken}`;
    if (deviceId) h['X-Device-Id'] = deviceId;
    return h;
  }, [accessToken, deviceId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // -- Draft persistence --
  useEffect(() => {
    if (!constructorOpen) return;
    try {
      const hasDraft = state.name || state.steps.length > 0;
      if (hasDraft) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
        localStorage.setItem(DRAFT_STEP_KEY, String(cStep));
      }
    } catch { /* quota exceeded */ }
  }, [state, cStep, constructorOpen]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_STEP_KEY);
    setState({ ...DEFAULT_STATE });
    setCStep(1);
    setDraftRestored(false);
    showToast('Черновик очищен');
  }, []);

  const hasDraft = state.name.trim() !== '' || state.steps.length > 0;

  // -- Draft restored notification --
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name || (parsed.steps && parsed.steps.length > 0)) {
          setDraftRestored(true);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // -- Load initiatives --
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bro/initiatives', { headers });
      if (res.ok) {
        const data = await res.json();
        setItems(data.initiatives || []);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  // -- Initiative CRUD (existing) --
  const vote = async (id: string, direction: boolean) => {
    try {
      const res = await fetch(`/api/bro/initiatives/${id}/vote`, {
        method: 'POST', headers, body: JSON.stringify({ vote: direction }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems(prev => prev.map(i => i.id === id ? updated : i));
        showToast(direction ? 'Голос «За» учтён!' : 'Голос «Против» учтён!');
      }
    } catch { /* */ }
  };

  const sendToCouncil = async (id: string) => {
    try {
      const res = await fetch(`/api/bro/initiatives/${id}/send`, {
        method: 'POST', headers, body: '{}',
      });
      if (res.ok) {
        const updated = await res.json();
        setItems(prev => prev.map(i => i.id === id ? updated : i));
        showToast('Бродело отправлено в Совет лагеря!');
      }
    } catch { showToast('Ошибка отправки'); }
  };

  const deleteIni = async (id: string) => {
    try {
      const res = await fetch(`/api/bro/initiatives/${id}`, {
        method: 'DELETE', headers,
      });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== id));
        showToast('Бродело удалено');
      }
    } catch { showToast('Ошибка удаления'); }
  };

  const myVote = (ini: BroInitiative): boolean | null => {
    if (!deviceId || !(deviceId in (ini.votes || {}))) return null;
    return ini.votes[deviceId];
  };
  const votesFor = (ini: BroInitiative) => Object.values(ini.votes || {}).filter(v => v === true).length;
  const votesAgainst = (ini: BroInitiative) => Object.values(ini.votes || {}).filter(v => v === false).length;

  // -- Constructor logic --
  const selectTemplate = useCallback((t: BroDelaTemplate | null) => {
    if (!t) {
      setState({ ...DEFAULT_STATE });
      setCStep(2);
      return;
    }
    setState({
      templateId: t.id,
      name: t.name,
      description: t.description,
      duration: t.duration,
      targetAudience: t.targetAudience,
      steps: t.steps.map(s => ({ ...s, id: uid() })),
      materials: t.materials,
      relatedBadge: t.relatedBadge || '',
    });
    setCStep(2);
  }, []);

  const addStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      steps: [...prev.steps, { id: uid(), title: '', description: '' }],
    }));
  }, []);

  const removeStep = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== id),
    }));
  }, []);

  const moveStep = useCallback((id: string, dir: -1 | 1) => {
    setState(prev => {
      const idx = prev.steps.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.steps.length) return prev;
      const steps = [...prev.steps];
      [steps[idx], steps[next]] = [steps[next], steps[idx]];
      return { ...prev, steps };
    });
  }, []);

  const updateStep = useCallback((id: string, field: keyof BroDelaStep, value: string) => {
    setState(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === id ? { ...s, [field]: value } : s),
    }));
  }, []);

  // -- Create initiative via constructor --
  const handleConstructorCreate = useCallback(async () => {
    if (!state.name.trim()) return;
    setBusy(true);
    try {
      // Serialize steps into markdown description
      const stepsMd = state.steps.map((s, i) =>
        `**${i + 1}. ${s.title}**\n${s.description}${s.duration ? ` (${s.duration})` : ''}${s.materials ? `\nМатериалы: ${s.materials}` : ''}`
      ).join('\n\n');

      const fullDesc = [
        state.description,
        '',
        `Длительность: ${state.duration}`,
        `Аудитория: ${state.targetAudience}`,
        state.materials ? `Материалы: ${state.materials}` : '',
        state.relatedBadge ? `Значок: ${state.relatedBadge}` : '',
        '',
        state.steps.length > 0 ? '--- ПЛАН ---' : '',
        stepsMd,
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/bro/initiatives', {
        method: 'POST', headers,
        body: JSON.stringify({ title: state.name.trim(), description: fullDesc }),
      });
      if (res.ok) {
        const ini = await res.json();
        setItems(prev => [...prev, ini]);
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(DRAFT_STEP_KEY);
        setState({ ...DEFAULT_STATE });
        setCStep(1);
        setConstructorOpen(false);
        showToast('Бродело создано через конструктор!');
      }
    } catch { showToast('Ошибка создания'); }
    finally { setBusy(false); }
  }, [state, headers]);

  // -- Filtered templates --
  const filteredTemplates = useMemo(() => {
    let list = BRODELA_TEMPLATES;
    if (categoryFilter) list = list.filter(t => t.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  }, [categoryFilter, searchQuery]);

  const selectedTemplate = state.templateId ? BRODELA_TEMPLATES.find(t => t.id === state.templateId) : null;

  // -- Validation --
  const emptyStepTitles = state.steps.filter(s => !s.title.trim());
  const canCreate = state.name.trim().length > 0;

  const validateAndProceed = useCallback(() => {
    const errors: string[] = [];
    if (!state.name.trim()) errors.push('Укажите название Бродела');
    if (emptyStepTitles.length > 0) errors.push(`${emptyStepTitles.length} этап(а) без названия`);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setTimeout(() => setValidationErrors([]), 4000);
      return;
    }
    setValidationErrors([]);
    setCStep(3);
  }, [state.name, emptyStepTitles]);

  // -- Reusable tip block --
  const renderTipBlock = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => { setShowTip(true); setTipIndex(Math.floor(Math.random() * BRODELA_TIPS.length)); }}
          style={{ ...btnSecondary, fontSize: 11 }}>Совет из книги</button>
      </div>
      {showTip && (
        <div style={{
          marginTop: 10, padding: '12px 14px', borderRadius: 10,
          background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
          fontSize: 12, color: '#c4b5fd', lineHeight: 1.5, fontWeight: 500,
        }}>
          {BRODELA_TIPS[tipIndex]}
          <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setTipIndex(Math.floor(Math.random() * BRODELA_TIPS.length))}
              style={{ ...btnSecondary, padding: '3px 10px', fontSize: 10 }}>Ещё</button>
            <button type="button" onClick={() => setShowTip(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>Скрыть</button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720, margin: '0 auto', width: '100%', position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          padding: '10px 24px', borderRadius: 12,
          background: 'rgba(124,58,237,0.92)',
          color: '#fff', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>{toast}</div>
      )}

      {/* ================================================================= */}
      {/* CONSTRUCTOR */}
      {/* ================================================================= */}
      {constructorOpen && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Header */}
          <div style={sectionCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#e0d4ff', letterSpacing: 0.5 }}>КОНСТРУКТОР БРОДЕЛ</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontWeight: 500 }}>Собери отрядное дело из шаблонов или с нуля</div>
                {draftRestored && constructorOpen && (
                  <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4, fontWeight: 600 }}>Черновик восстановлен</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {hasDraft && (
                  <button type="button" onClick={clearDraft} style={{
                    padding: '4px 10px', borderRadius: 8, border: 'none',
                    background: 'rgba(239,68,68,0.15)', color: '#f87171',
                    fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', textTransform: 'uppercase' as const,
                  }}>Очистить</button>
                )}
                <button type="button" onClick={() => { setConstructorOpen(false); }} style={{
                  padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'rgba(255,255,255,0.5)',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                }}>Закрыть</button>
              </div>
            </div>

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[1, 2, 3].map(s => (
                <button key={s} type="button" onClick={() => { if (s <= cStep || s === 1) setCStep(s); }}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none',
                    background: s === cStep ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : s < cStep ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)',
                    color: s <= cStep ? '#fff' : 'rgba(255,255,255,0.3)',
                    fontSize: 13, fontWeight: 700, cursor: s <= cStep || s === 1 ? 'pointer' : 'default',
                    fontFamily: 'inherit', transition: 'all 0.2s',
                  }}>
                  {s < cStep ? '\u2713' : s}
                </button>
              ))}
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 8, fontWeight: 500 }}>
                {cStep === 1 ? 'Выбор основы' : cStep === 2 ? 'Настройка' : 'Превью'}
              </span>
            </div>
          </div>

          {/* ---- STEP 1: Template picker ---- */}
          {cStep === 1 && (
            <div style={sectionCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e0d4ff' }}>Выберите основу</div>
                <input
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Поиск шаблона..."
                  style={{ ...fieldStyle, maxWidth: 220, padding: '6px 12px', fontSize: 12 }}
                />
              </div>

              {/* Category filter */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                <button type="button" onClick={() => setCategoryFilter(null)}
                  style={{
                    ...btnSecondary,
                    padding: '5px 12px', fontSize: 11,
                    background: !categoryFilter ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.08)',
                    borderColor: !categoryFilter ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.2)',
                  }}>Все</button>
                {(Object.entries(BRODELA_CATEGORY_META) as [BroDelaCategory, { label: string; icon: string; color: string }][]).map(([key, meta]) => (
                  <button key={key} type="button" onClick={() => setCategoryFilter(key)}
                    style={{
                      ...btnSecondary,
                      padding: '5px 12px', fontSize: 11,
                      background: categoryFilter === key ? `${meta.color}22` : 'rgba(124,58,237,0.08)',
                      borderColor: categoryFilter === key ? `${meta.color}66` : 'rgba(124,58,237,0.2)',
                      color: categoryFilter === key ? meta.color : '#c4b5fd',
                    }}>{meta.label}</button>
                ))}
              </div>

              {/* Template grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
                {/* "From scratch" card */}
                <button type="button" onClick={() => selectTemplate(null)}
                  style={{
                    padding: '14px', borderRadius: 12,
                    border: '2px dashed rgba(124,58,237,0.3)',
                    background: 'rgba(124,58,237,0.04)',
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'inherit', display: 'flex',
                    flexDirection: 'column', gap: 6,
                  }}>
                  <div style={{ fontSize: 22, lineHeight: 1 }}>+</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd' }}>С нуля</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>Создать пустое Бродело без шаблона</div>
                </button>

                {filteredTemplates.map(t => {
                  const catMeta = BRODELA_CATEGORY_META[t.category];
                  return (
                    <button key={t.id} type="button" onClick={() => selectTemplate(t)}
                      style={{
                        padding: '14px', borderRadius: 12,
                        border: `1px solid ${t.color}33`,
                        background: `${t.color}08`,
                        cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'inherit', display: 'flex',
                        flexDirection: 'column', gap: 6,
                        transition: 'all 0.15s',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: `${t.color}22`, color: t.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 800,
                        }}>{t.icon}</div>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{t.duration}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e0d4ff', lineHeight: 1.3 }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{t.description.slice(0, 80)}…</div>
                      <div style={{ fontSize: 10, color: catMeta.color, fontWeight: 600 }}>{catMeta.label}</div>
                    </button>
                  );
                })}
              </div>

              {/* Tip button */}
              {renderTipBlock()}
            </div>
          )}

          {/* ---- STEP 2: Settings ---- */}
          {cStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Name & Description */}
              <div style={sectionCard}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e0d4ff', marginBottom: 14 }}>Основные настройки</div>

                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Название Бродела</label>
                  <input value={state.name} onChange={e => setState(p => ({ ...p, name: e.target.value }))}
                    placeholder="Например: Квест «Тайна Залива»"
                    style={fieldStyle} />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Описание / Цель</label>
                  <textarea value={state.description} onChange={e => setState(p => ({ ...p, description: e.target.value }))}
                    placeholder="Что это за дело? Какая цель? Почему важно?"
                    rows={3}
                    style={{ ...fieldStyle, resize: 'vertical' }} />
                </div>

                {/* Duration buttons */}
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Длительность</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['15 мин', '30 мин', '1 час', '2-3 часа', 'весь день'].map(d => (
                      <button key={d} type="button" onClick={() => setState(p => ({ ...p, duration: d }))}
                        style={{
                          padding: '6px 14px', borderRadius: 8,
                          border: `1px solid ${state.duration === d ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.2)'}`,
                          background: state.duration === d ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.06)',
                          color: state.duration === d ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}>{d}</button>
                    ))}
                  </div>
                </div>

                {/* Target audience */}
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Аудитория</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['свой отряд', 'другой отряд', 'младшие отряды', 'два отряда', 'весь лагерь'].map(a => (
                      <button key={a} type="button" onClick={() => setState(p => ({ ...p, targetAudience: a }))}
                        style={{
                          padding: '6px 14px', borderRadius: 8,
                          border: `1px solid ${state.targetAudience === a ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.2)'}`,
                          background: state.targetAudience === a ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.06)',
                          color: state.targetAudience === a ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}>{a}</button>
                    ))}
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <label style={labelStyle}>Материалы и реквизит</label>
                  <input value={state.materials} onChange={e => setState(p => ({ ...p, materials: e.target.value }))}
                    placeholder="Что нужно подготовить?"
                    style={fieldStyle} />
                </div>
              </div>

              {/* Steps editor */}
              <div style={sectionCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e0d4ff' }}>Этапы ({state.steps.length})</div>
                  <button type="button" onClick={addStep} style={{ ...btnSecondary, fontSize: 11 }}>+ Добавить этап</button>
                </div>

                {state.steps.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0' }}>
                    Добавьте этапы вашего Бродела
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {state.steps.map((s, i) => (
                      <div key={s.id} style={{
                        padding: '12px 14px', borderRadius: 10,
                        background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd' }}>Этап {i + 1}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button type="button" onClick={() => moveStep(s.id, -1)} disabled={i === 0}
                              style={{ padding: '2px 6px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.06)', color: i === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', fontSize: 11, cursor: i === 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                              &#9650;
                            </button>
                            <button type="button" onClick={() => moveStep(s.id, 1)} disabled={i === state.steps.length - 1}
                              style={{ padding: '2px 6px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.06)', color: i === state.steps.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', fontSize: 11, cursor: i === state.steps.length - 1 ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                              &#9660;
                            </button>
                            <button type="button" onClick={() => removeStep(s.id)}
                              style={{ padding: '2px 6px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                              &#10005;
                            </button>
                          </div>
                        </div>
                        <input value={s.title} onChange={e => updateStep(s.id, 'title', e.target.value)}
                          placeholder="Название этапа"
                          style={{ ...fieldStyle, marginBottom: 6 }} />
                        <textarea value={s.description} onChange={e => updateStep(s.id, 'description', e.target.value)}
                          placeholder="Описание: что делать на этом этапе"
                          rows={2}
                          style={{ ...fieldStyle, resize: 'vertical' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tip on step 2 */}
              {renderTipBlock()}

              {/* Validation errors */}
              {validationErrors.length > 0 && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  fontSize: 12, color: '#f87171', lineHeight: 1.5, fontWeight: 600,
                }}>
                  {validationErrors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}

              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" onClick={() => setCStep(1)} style={btnSecondary}>Назад</button>
                <button type="button" onClick={validateAndProceed} disabled={!canCreate}
                  style={{
                    ...btnPrimary,
                    opacity: canCreate ? 1 : 0.4,
                    cursor: canCreate ? 'pointer' : 'default',
                  }}>Далее: Превью</button>
              </div>
            </div>
          )}

          {/* ---- STEP 3: Preview ---- */}
          {cStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={sectionCard}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e0d4ff', marginBottom: 14 }}>Превью Бродела</div>

                {/* Preview card */}
                <div style={{
                  padding: '16px 18px', borderRadius: 12,
                  background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#e0d4ff', marginBottom: 6 }}>{state.name}</div>
                  {state.description && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 10 }}>{state.description}</div>
                  )}

                  {/* Meta info */}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: '#c4b5fd', fontWeight: 600 }}>{state.duration}</span>
                    <span style={{ fontSize: 11, color: '#c4b5fd', fontWeight: 600 }}>{state.targetAudience}</span>
                    {state.relatedBadge && (
                      <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>{state.relatedBadge}</span>
                    )}
                  </div>

                  {/* Materials */}
                  {state.materials && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, color: '#c4b5fd' }}>Материалы: </span>{state.materials}
                    </div>
                  )}

                  {/* Steps list */}
                  {state.steps.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd', marginBottom: 8 }}>ПЛАН ({state.steps.length} этапов)</div>
                      {state.steps.map((s, i) => (
                        <div key={s.id} style={{
                          padding: '8px 0',
                          borderBottom: i < state.steps.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#e0d4ff' }}>{i + 1}. {s.title}</div>
                          {s.description && (
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, marginTop: 2 }}>{s.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedTemplate && (
                    <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                      На основе шаблона: {selectedTemplate.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" onClick={() => setCStep(2)} style={btnSecondary}>Назад</button>
                <button type="button" onClick={() => setShowConfirm(true)} disabled={!canCreate || busy}
                  style={{
                    ...btnPrimary,
                    opacity: canCreate && !busy ? 1 : 0.4,
                    cursor: canCreate && !busy ? 'pointer' : 'default',
                  }}>{busy ? 'Создание...' : 'Создать Бродело'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* CONFIRM DIALOG */}
      {/* ================================================================= */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            ...sectionCard,
            maxWidth: 420, width: '100%',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#e0d4ff', marginBottom: 10 }}>Подтверждение</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 6 }}>
              Создать Бродело <strong style={{ color: '#c4b5fd' }}>«{state.name}»</strong>?
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
              {state.steps.length} этапов · {state.duration} · {state.targetAudience}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
              Бродело будет доступно для голосования и отправки в Совет лагеря.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowConfirm(false)} style={btnSecondary}>Отмена</button>
              <button type="button" onClick={() => { setShowConfirm(false); void handleConstructorCreate(); }} style={btnPrimary}>Подтвердить</button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* INITIATIVES LIST (existing functionality) */}
      {/* ================================================================= */}
      <div className="fade-in" style={sectionCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#e0d4ff' }}>Бродела</span>
          {!constructorOpen && (
            <button type="button" onClick={() => setConstructorOpen(true)} style={{
              ...btnPrimary, padding: '8px 16px', fontSize: 12,
            }}>+ Создать Бродело</button>
          )}
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, fontWeight: 500 }}>
          Бродела — инициативы БРО-сообщества для Совета лагеря. Создай через конструктор, собери голоса — и отправь в Совет!
        </p>

        {loading ? (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Загрузка...</div>
        ) : items.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', padding: '20px 0', textAlign: 'center', fontWeight: 500 }}>
            Инициатив пока нет. Будь первым — создай Бродело!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(ini => {
              const vFor = votesFor(ini);
              const vAgainst = votesAgainst(ini);
              const mv = myVote(ini);
              const statusLabel = ini.status === 'voting' ? 'Голосование'
                : ini.status === 'approved' ? 'Одобрено'
                : ini.status === 'sent_to_council' ? 'В Совете'
                : ini.status === 'rejected' ? 'Отклонено'
                : ini.status;
              const statusColor = ini.status === 'voting' ? '#c4b5fd'
                : ini.status === 'approved' ? '#22c55e'
                : ini.status === 'sent_to_council' ? '#3b82f6'
                : ini.status === 'rejected' ? '#ef4444'
                : '#c4b5fd';
              const isMine = ini.createdBy === deviceId;
              return (
                <div key={ini.id} style={{
                  padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.12)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#e0d4ff' }}>{ini.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 10, color: statusColor, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 6,
                        background: `${statusColor}15`,
                      }}>{statusLabel}</span>
                      {isMine && (
                        <button type="button" onClick={() => { if (confirm('Удалить это Бродело?')) void deleteIni(ini.id); }}
                          title="Удалить" style={{
                          padding: '2px 6px', borderRadius: 6, border: 'none',
                          background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: 11,
                          cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1,
                        }}>&#10005;</button>
                      )}
                    </div>
                  </div>
                  {ini.description && (
                    <div style={{
                      fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 8, lineHeight: 1.5,
                      maxHeight: 60, overflow: 'hidden',
                    }}>{ini.description.length > 150 ? ini.description.slice(0, 150) + '...' : ini.description}</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                      За: {vFor}  ·  Против: {vAgainst}
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{new Date(ini.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }}>
                    <div style={{
                      height: '100%', borderRadius: 2, transition: 'width 0.3s',
                      width: `${Math.min((vFor + vAgainst) > 0 ? (vFor / (vFor + vAgainst)) * 100 : 0, 100)}%`,
                      background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                    }} />
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {ini.status === 'voting' && mv === null && (
                      <>
                        <button type="button" onClick={() => void vote(ini.id, true)} style={{
                          ...btnPrimary, padding: '6px 14px', fontSize: 12,
                        }}>За</button>
                        <button type="button" onClick={() => void vote(ini.id, false)} style={{
                          padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                          background: 'rgba(239,68,68,0.1)',
                          color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}>Против</button>
                      </>
                    )}
                    {ini.status === 'voting' && mv !== null && (
                      <span style={{ fontSize: 11, color: '#c4b5fd', padding: '6px 0', fontWeight: 600 }}>
                        Вы проголосовали {mv ? '«За»' : '«Против»'}
                      </span>
                    )}
                    {ini.status === 'approved' && (
                      <button type="button" onClick={() => void sendToCouncil(ini.id)} style={{
                        ...btnPrimary, padding: '6px 14px', fontSize: 12,
                      }}>Отправить в Совет</button>
                    )}
                    {ini.status === 'sent_to_council' && (
                      <span style={{ fontSize: 11, color: '#3b82f6', padding: '6px 0', fontWeight: 600 }}>Отправлено в Совет лагеря</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
