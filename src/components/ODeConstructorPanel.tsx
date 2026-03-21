import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ODE_TEMPLATES,
  ODE_CATEGORY_META,
  ODE_AGE_META,
  ODE_TIPS,
  type ODeTemplate,
  type ODeStep,
  type ODeCategory,
  type ODeAgeGroup,
  type ODeScale,
} from '../data/odeTemplates';

const ODE_SCALE_META: Record<ODeScale, { label: string; emoji: string }> = {
  squad: { label: 'Отрядное', emoji: '👥' },
  inter: { label: 'Межотрядное', emoji: '🔗' },
  camp:  { label: 'Общелагерное', emoji: '🏕️' },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ODeInitiative {
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
  ageGroup: ODeAgeGroup;
  scale: ODeScale;
  steps: ODeStep[];
  materials: string;
  relatedBadge: string;
  roles: string[];
}

const DEFAULT_STATE: ConstructorState = {
  templateId: null,
  name: '',
  description: '',
  duration: '40 мин',
  targetAudience: 'свой отряд',
  ageGroup: 'all',
  scale: 'squad',
  steps: [],
  materials: '',
  relatedBadge: '',
  roles: [],
};

const DURATION_OPTIONS = ['20 мин', '40 мин', '1 час', '1.5 часа', '2+ часа'];
const AUDIENCE_OPTIONS = ['свой отряд', 'другой отряд', 'младшие отряды', 'два отряда', 'весь лагерь'];

const uid = () => `ode_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const DRAFT_KEY = 'ode-constructor-draft';
const DRAFT_STEP_KEY = 'ode-constructor-step';

// ---------------------------------------------------------------------------
// Shared styles (same palette as BroDelaPanel but with cyan accent)
// ---------------------------------------------------------------------------

const sectionCard: React.CSSProperties = {
  padding: '18px 20px', borderRadius: 16,
  background: 'rgba(15, 10, 42, 0.35)',
  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(124, 58, 237, 0.12)',
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

export const ODeConstructorPanel: React.FC = () => {
  const { accessToken, deviceId } = useAuth();
  const [items, setItems] = useState<ODeInitiative[]>([]);
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
  const [categoryFilter, setCategoryFilter] = useState<ODeCategory | null>(null);
  const [ageFilter, setAgeFilter] = useState<ODeAgeGroup | null>(null);
  const [scaleFilter, setScaleFilter] = useState<ODeScale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTip, setShowTip] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<ODeTemplate | null>(null);

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

  // -- Load initiatives (reuse same endpoint as BroDela) --
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

  // -- Initiative CRUD --
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
        showToast('ОДэ отправлено в Совет лагеря!');
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
        showToast('ОДэ удалено');
      }
    } catch { showToast('Ошибка удаления'); }
  };

  const myVote = (ini: ODeInitiative): boolean | null => {
    if (!deviceId || !(deviceId in (ini.votes || {}))) return null;
    return ini.votes[deviceId];
  };
  const votesFor = (ini: ODeInitiative) => Object.values(ini.votes || {}).filter(v => v === true).length;
  const votesAgainst = (ini: ODeInitiative) => Object.values(ini.votes || {}).filter(v => v === false).length;

  // -- Constructor logic --
  const selectTemplate = useCallback((t: ODeTemplate | null) => {
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
      ageGroup: t.ageGroup,
      scale: t.scale,
      steps: t.steps.map(s => ({ ...s, id: uid() })),
      materials: t.materials,
      relatedBadge: t.relatedBadge || '',
      roles: t.roles ? [...t.roles] : [],
    });
    setPreviewTemplate(null);
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

  const updateStep = useCallback((id: string, field: keyof ODeStep, value: string) => {
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
      const stepsMd = state.steps.map((s, i) =>
        `**${i + 1}. ${s.title}**\n${s.description}${s.duration ? ` (${s.duration})` : ''}${s.materials ? `\nМатериалы: ${s.materials}` : ''}`
      ).join('\n\n');

      const fullDesc = [
        '🎯 ОТРЯДНОЕ ДЕЛО (ОДэ)',
        state.description,
        '',
        `Длительность: ${state.duration}`,
        `Аудитория: ${state.targetAudience}`,
        `Возраст: ${ODE_AGE_META[state.ageGroup].label}`,
        `Масштаб: ${ODE_SCALE_META[state.scale].label}`,
        state.materials ? `Материалы: ${state.materials}` : '',
        state.roles.length > 0 ? `Роли: ${state.roles.join(', ')}` : '',
        state.relatedBadge ? `Значок: ${state.relatedBadge}` : '',
        '',
        state.steps.length > 0 ? '--- ПЛАН ОДэ ---' : '',
        stepsMd,
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/bro/initiatives', {
        method: 'POST', headers,
        body: JSON.stringify({ title: `[ОДэ] ${state.name.trim()}`, description: fullDesc }),
      });
      if (res.ok) {
        const ini = await res.json();
        // Auto-send to council so it appears in Совет лагеря + Пульт управления
        try {
          const sendRes = await fetch(`/api/bro/initiatives/${ini.id}/send`, {
            method: 'POST', headers, body: '{}',
          });
          if (sendRes.ok) {
            const updated = await sendRes.json();
            setItems(prev => [...prev, updated]);
          } else {
            setItems(prev => [...prev, ini]);
          }
        } catch {
          setItems(prev => [...prev, ini]);
        }
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(DRAFT_STEP_KEY);
        setState({ ...DEFAULT_STATE });
        setCStep(1);
        setConstructorOpen(false);
        showToast('ОДэ создано и отправлено в Совет лагеря!');
      }
    } catch { showToast('Ошибка создания'); }
    finally { setBusy(false); }
  }, [state, headers]);

  // -- Filtered templates --
  const filteredTemplates = useMemo(() => {
    let list = ODE_TEMPLATES;
    if (categoryFilter) list = list.filter(t => t.category === categoryFilter);
    if (ageFilter) list = list.filter(t => t.ageGroup === ageFilter || t.ageGroup === 'all');
    if (scaleFilter) list = list.filter(t => t.scale === scaleFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  }, [categoryFilter, ageFilter, scaleFilter, searchQuery]);

  const selectedTemplate = state.templateId ? ODE_TEMPLATES.find(t => t.id === state.templateId) : null;

  // -- Validation --
  const emptyStepTitles = state.steps.filter(s => !s.title.trim());
  const canCreate = state.name.trim().length > 0;

  const validateAndProceed = useCallback(() => {
    const errors: string[] = [];
    if (!state.name.trim()) errors.push('Укажите название ОДэ');
    if (emptyStepTitles.length > 0) errors.push(`${emptyStepTitles.length} этап(а) без названия`);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setTimeout(() => setValidationErrors([]), 4000);
      return;
    }
    setValidationErrors([]);
    setCStep(3);
  }, [state.name, emptyStepTitles]);

  // -- Tip block helper (contextual: template tips first, then general) --
  const contextualTips = useMemo(() => {
    const tips: string[] = [];
    if (selectedTemplate?.tips) tips.push(`📚 ${selectedTemplate.tips}`);
    tips.push(...ODE_TIPS.map(t => `💡 ${t}`));
    return tips;
  }, [selectedTemplate]);

  const renderTipBlock = () => (
    <div style={{ marginTop: 12 }}>
      <button type="button" onClick={() => { setShowTip(v => !v); if (!showTip) setTipIndex(0); }}
        style={{ ...btnSecondary, width: '100%', textAlign: 'center', borderColor: 'rgba(255,255,255,0.1)' }}>
        {showTip ? '🔽 Скрыть совет' : '📖 Совет из Вожатификатора'}
      </button>
      {showTip && (
        <div style={{
          marginTop: 8, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 12, color: '#e8f0ff', lineHeight: 1.5, fontStyle: 'italic',
        }}>
          {contextualTips[tipIndex % contextualTips.length]}
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <button type="button" onClick={() => setTipIndex((tipIndex + 1) % contextualTips.length)}
              style={{ ...btnSecondary, fontSize: 11, padding: '4px 10px' }}>Ещё →</button>
          </div>
        </div>
      )}
    </div>
  );

  // -- Template detail modal helper --
  const renderTemplateDetailModal = () => {
    if (!previewTemplate) return null;
    const t = previewTemplate;
    const catMeta = ODE_CATEGORY_META[t.category];
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }} onClick={() => setPreviewTemplate(null)}>
        <div style={{
          ...sectionCard, maxWidth: 480, width: '100%',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          maxHeight: '80vh', overflowY: 'auto',
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 32 }}>{t.icon}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#e8f0ff' }}>{t.name}</h3>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${catMeta.color}22`, color: catMeta.color }}>
                  {catMeta.icon} {catMeta.label}
                </span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: '#c4b5fd' }}>
                  {ODE_AGE_META[t.ageGroup].emoji} {ODE_AGE_META[t.ageGroup].label}
                </span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: '#c4b5fd' }}>
                  ⏱️ {t.duration}
                </span>
              </div>
            </div>
          </div>

          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{t.description}</p>

          {t.steps.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', marginBottom: 6 }}>ПЛАН ({t.steps.length} этапов)</div>
              {t.steps.map((s, i) => (
                <div key={s.id} style={{ padding: '6px 10px', borderRadius: 8, marginBottom: 3, background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid rgba(124, 58, 237, 0.4)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#e8f0ff' }}>{i + 1}. {s.title}</span>
                  {s.duration && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>({s.duration})</span>}
                </div>
              ))}
            </div>
          )}

          {t.materials && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>📦 <strong>Материалы:</strong> {t.materials}</div>
          )}
          {t.roles && t.roles.length > 0 && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>🎭 <strong>Роли:</strong> {t.roles.join(', ')}</div>
          )}
          {t.relatedBadge && (
            <div style={{ fontSize: 11, color: '#fbbf24', marginBottom: 8 }}>🏅 <strong>Значок:</strong> {t.relatedBadge}</div>
          )}

          {t.tips && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#e8f0ff', lineHeight: 1.5, fontStyle: 'italic', marginBottom: 12 }}>
              📚 {t.tips}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setPreviewTemplate(null)} style={btnSecondary}>Закрыть</button>
            <button type="button" onClick={() => selectTemplate(t)} style={btnPrimary}>Использовать шаблон</button>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 24px', borderRadius: 12, background: 'rgba(124,58,237,0.92)', color: '#fff',
          fontSize: 13, fontWeight: 600, zIndex: 10000, boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
        }}>{toast}</div>
      )}

      {/* Header */}
      <div className="fade-in" style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>🎯</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#e8f0ff' }}>ОДэ Генератор</h3>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontWeight: 500 }}>
              Конструктор Отрядных Дел из Вожатификатора
            </div>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          Собери ОДэ из готовых шаблонов или создай своё с нуля. Каждый шаблон —
          проверенная активность из книги с подробными шагами, материалами и советами.
        </p>

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => { setConstructorOpen(true); setCStep(1); }}
            style={btnPrimary}>
            Открыть конструктор
          </button>
          {hasDraft && (
            <button type="button" onClick={clearDraft} style={btnSecondary}>
              🗑️ Сбросить черновик
            </button>
          )}
        </div>
        {draftRestored && constructorOpen && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#34d399', fontWeight: 600 }}>
            ✅ Черновик восстановлен из прошлой сессии
          </div>
        )}
      </div>

      {/* Constructor */}
      {constructorOpen && (
        <div className="fade-in" style={sectionCard}>
          {/* Stepper */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['Шаблон', 'Настройки', 'Предпросмотр'].map((label, i) => (
              <button type="button" key={label}
                onClick={() => { if (i + 1 < cStep) setCStep(i + 1 as 1 | 2 | 3); }}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                  background: cStep === i + 1 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                  color: cStep === i + 1 ? '#c4b5fd' : 'rgba(255,255,255,0.35)',
                  fontSize: 11, fontWeight: 700, cursor: i + 1 < cStep ? 'pointer' : 'default',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                {i + 1}. {label}
              </button>
            ))}
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 12,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              fontSize: 12, color: '#fca5a5', lineHeight: 1.5,
            }}>
              ⚠️ {validationErrors.join('. ')}
            </div>
          )}

          {/* Step 1: Template selection */}
          {cStep === 1 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f0ff', marginBottom: 12 }}>
                Выберите шаблон или начните с нуля
              </div>

              {/* Search */}
              <input
                type="text" placeholder="🔍 Поиск шаблона…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ ...fieldStyle, marginBottom: 10 }}
              />

              {/* Category filter pills */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                <button type="button"
                  onClick={() => setCategoryFilter(null)}
                  style={{
                    ...btnSecondary, fontSize: 10, padding: '4px 8px',
                    background: !categoryFilter ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                    color: !categoryFilter ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                  }}>Все</button>
                {(Object.entries(ODE_CATEGORY_META) as [ODeCategory, typeof ODE_CATEGORY_META[ODeCategory]][]).map(([key, meta]) => (
                  <button type="button" key={key}
                    onClick={() => setCategoryFilter(categoryFilter === key ? null : key)}
                    style={{
                      ...btnSecondary, fontSize: 10, padding: '4px 8px',
                      background: categoryFilter === key ? `${meta.color}22` : 'rgba(255,255,255,0.04)',
                      color: categoryFilter === key ? meta.color : 'rgba(255,255,255,0.4)',
                      borderColor: categoryFilter === key ? `${meta.color}44` : 'rgba(255,255,255,0.06)',
                    }}>
                    {meta.icon} {meta.label}
                  </button>
                ))}
              </div>

              {/* Age filter pills */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, alignSelf: 'center', marginRight: 4 }}>Возраст:</span>
                <button type="button"
                  onClick={() => setAgeFilter(null)}
                  style={{
                    ...btnSecondary, fontSize: 10, padding: '4px 8px',
                    background: !ageFilter ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                    color: !ageFilter ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                  }}>Все</button>
                {(Object.entries(ODE_AGE_META) as [ODeAgeGroup, typeof ODE_AGE_META[ODeAgeGroup]][]).map(([key, meta]) => (
                  <button type="button" key={key}
                    onClick={() => setAgeFilter(ageFilter === key ? null : key as ODeAgeGroup)}
                    style={{
                      ...btnSecondary, fontSize: 10, padding: '4px 8px',
                      background: ageFilter === key ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                      color: ageFilter === key ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                    }}>
                    {meta.emoji} {meta.label}
                  </button>
                ))}
              </div>

              {/* Scale filter pills */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, alignSelf: 'center', marginRight: 4 }}>Масштаб:</span>
                <button type="button"
                  onClick={() => setScaleFilter(null)}
                  style={{
                    ...btnSecondary, fontSize: 10, padding: '4px 8px',
                    background: !scaleFilter ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                    color: !scaleFilter ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                  }}>Все</button>
                {(Object.entries(ODE_SCALE_META) as [ODeScale, typeof ODE_SCALE_META[ODeScale]][]).map(([key, meta]) => (
                  <button type="button" key={key}
                    onClick={() => setScaleFilter(scaleFilter === key ? null : key as ODeScale)}
                    style={{
                      ...btnSecondary, fontSize: 10, padding: '4px 8px',
                      background: scaleFilter === key ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                      color: scaleFilter === key ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                    }}>
                    {meta.emoji} {meta.label}
                  </button>
                ))}
              </div>

              {/* Template grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 8, marginBottom: 12,
              }}>
                {/* "From scratch" card */}
                <button type="button" onClick={() => selectTemplate(null)}
                  style={{
                    padding: 14, borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(124, 58, 237, 0.4)',
                    color: '#c4b5fd', textAlign: 'left', cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>✨</div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>С нуля</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Своё ОДэ</div>
                </button>

                {filteredTemplates.map(t => (
                  <div key={t.id} style={{
                    padding: 14, borderRadius: 12,
                    background: `${t.color}0D`, border: `1px solid ${t.color}33`,
                    color: '#e8f0ff', textAlign: 'left', cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                    position: 'relative',
                  }}>
                    <div onClick={() => selectTemplate(t)} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{t.icon}</div>
                        <button type="button" onClick={e => { e.stopPropagation(); setPreviewTemplate(t); }}
                          title="Подробнее"
                          style={{
                            padding: '2px 6px', borderRadius: 6, border: 'none',
                            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
                            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                          }}>ℹ️</button>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                        {t.description.length > 60 ? t.description.slice(0, 60) + '…' : t.description}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: `${t.color}22`, color: t.color }}>
                        {ODE_CATEGORY_META[t.category].icon} {ODE_CATEGORY_META[t.category].label}
                      </span>
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                        {ODE_AGE_META[t.ageGroup].emoji}
                      </span>
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                        ⏱️ {t.duration}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredTemplates.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                  Шаблоны не найдены. Попробуйте изменить фильтры.
                </div>
              )}

              {renderTipBlock()}
            </div>
          )}

          {/* Step 2: Settings + Steps editor */}
          {cStep === 2 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f0ff', marginBottom: 12 }}>
                Настройки ОДэ {selectedTemplate ? `(${selectedTemplate.name})` : '(с нуля)'}
              </div>

              {/* Name */}
              <label style={labelStyle}>Название ОДэ *</label>
              <input type="text" value={state.name} onChange={e => setState(p => ({ ...p, name: e.target.value }))}
                placeholder="Например: Минное поле" style={{ ...fieldStyle, marginBottom: 12 }} />

              {/* Description */}
              <label style={labelStyle}>Описание</label>
              <textarea value={state.description} onChange={e => setState(p => ({ ...p, description: e.target.value }))}
                placeholder="Краткое описание активности…" rows={3}
                style={{ ...fieldStyle, marginBottom: 12, resize: 'vertical' }} />

              {/* Duration — chip buttons */}
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Длительность</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DURATION_OPTIONS.map(d => (
                    <button key={d} type="button" onClick={() => setState(p => ({ ...p, duration: d }))}
                      style={{
                        padding: '6px 14px', borderRadius: 8,
                        border: `1px solid ${state.duration === d ? 'rgba(124, 58, 237, 0.6)' : 'rgba(255,255,255,0.08)'}`,
                        background: state.duration === d ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                        color: state.duration === d ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>{d}</button>
                  ))}
                </div>
              </div>

              {/* Audience — chip buttons */}
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Аудитория</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {AUDIENCE_OPTIONS.map(a => (
                    <button key={a} type="button" onClick={() => setState(p => ({ ...p, targetAudience: a }))}
                      style={{
                        padding: '6px 14px', borderRadius: 8,
                        border: `1px solid ${state.targetAudience === a ? 'rgba(124, 58, 237, 0.6)' : 'rgba(255,255,255,0.08)'}`,
                        background: state.targetAudience === a ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                        color: state.targetAudience === a ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>{a}</button>
                  ))}
                </div>
              </div>

              {/* Age + Scale row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Возраст</label>
                  <select value={state.ageGroup} onChange={e => setState(p => ({ ...p, ageGroup: e.target.value as ODeAgeGroup }))}
                    style={{ ...fieldStyle, cursor: 'pointer' }}>
                    {(Object.entries(ODE_AGE_META) as [ODeAgeGroup, typeof ODE_AGE_META[ODeAgeGroup]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Масштаб</label>
                  <select value={state.scale} onChange={e => setState(p => ({ ...p, scale: e.target.value as ODeScale }))}
                    style={{ ...fieldStyle, cursor: 'pointer' }}>
                    {(Object.entries(ODE_SCALE_META) as [ODeScale, typeof ODE_SCALE_META[ODeScale]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Materials */}
              <label style={labelStyle}>Материалы и реквизит</label>
              <input type="text" value={state.materials} onChange={e => setState(p => ({ ...p, materials: e.target.value }))}
                placeholder="Мелки, ватман, верёвки…" style={{ ...fieldStyle, marginBottom: 12 }} />

              {/* Roles (if present) */}
              {state.roles.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Роли</label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {state.roles.map((r, i) => (
                      <span key={i} style={{
                        fontSize: 11, padding: '4px 10px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                        color: '#c4b5fd',
                      }}>🎭 {r}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps editor */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ ...labelStyle, margin: 0 }}>Этапы ({state.steps.length})</label>
                <button type="button" onClick={addStep} style={{ ...btnSecondary, fontSize: 11 }}>+ Этап</button>
              </div>

              {state.steps.map((step, idx) => (
                <div key={step.id} style={{
                  padding: '12px 14px', borderRadius: 10, marginBottom: 8,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd' }}>Этап {idx + 1}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" onClick={() => moveStep(step.id, -1)} disabled={idx === 0}
                        style={{ ...btnSecondary, fontSize: 10, padding: '2px 6px', opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                      <button type="button" onClick={() => moveStep(step.id, 1)} disabled={idx === state.steps.length - 1}
                        style={{ ...btnSecondary, fontSize: 10, padding: '2px 6px', opacity: idx === state.steps.length - 1 ? 0.3 : 1 }}>↓</button>
                      <button type="button" onClick={() => removeStep(step.id)}
                        style={{ ...btnSecondary, fontSize: 10, padding: '2px 6px', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>✕</button>
                    </div>
                  </div>
                  <input type="text" value={step.title} onChange={e => updateStep(step.id, 'title', e.target.value)}
                    placeholder="Название этапа *" style={{ ...fieldStyle, marginBottom: 6, fontSize: 12 }} />
                  <textarea value={step.description} onChange={e => updateStep(step.id, 'description', e.target.value)}
                    placeholder="Описание…" rows={2}
                    style={{ ...fieldStyle, fontSize: 11, resize: 'vertical' }} />
                </div>
              ))}

              {state.steps.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                  Пока нет этапов. Нажмите «+ Этап» чтобы добавить.
                </div>
              )}

              {renderTipBlock()}

              {/* Navigation */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" onClick={() => setCStep(1)} style={btnSecondary}>← Назад</button>
                <button type="button" onClick={validateAndProceed} style={btnPrimary}>Предпросмотр →</button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {cStep === 3 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f0ff', marginBottom: 12 }}>
                Предпросмотр ОДэ
              </div>

              <div style={{
                padding: 16, borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{selectedTemplate?.icon || '🎯'}</div>
                <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#e8f0ff' }}>{state.name}</h4>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{state.description}</p>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#c4b5fd' }}>
                    ⏱️ {state.duration}
                  </span>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#c4b5fd' }}>
                    👥 {state.targetAudience}
                  </span>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#c4b5fd' }}>
                    {ODE_AGE_META[state.ageGroup].emoji} {ODE_AGE_META[state.ageGroup].label}
                  </span>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#c4b5fd' }}>
                    {ODE_SCALE_META[state.scale].emoji} {ODE_SCALE_META[state.scale].label}
                  </span>
                  {state.relatedBadge && (
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
                      🏅 {state.relatedBadge}
                    </span>
                  )}
                </div>

                {state.materials && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
                    📦 <strong>Материалы:</strong> {state.materials}
                  </div>
                )}

                {state.roles.length > 0 && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
                    🎭 <strong>Роли:</strong> {state.roles.join(', ')}
                  </div>
                )}

                {state.steps.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', marginBottom: 6 }}>ПЛАН ({state.steps.length} этапов)</div>
                    {state.steps.map((s, i) => (
                      <div key={s.id} style={{
                        padding: '8px 12px', borderRadius: 8, marginBottom: 4,
                        background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid rgba(124, 58, 237, 0.4)',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#e8f0ff' }}>{i + 1}. {s.title}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{s.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" onClick={() => setCStep(2)} style={btnSecondary}>← Редактировать</button>
                <button type="button" onClick={() => setShowConfirm(true)}
                  disabled={!canCreate || busy}
                  style={{ ...btnPrimary, opacity: canCreate && !busy ? 1 : 0.5 }}>
                  {busy ? '⏳ Создание…' : '🚀 Создать ОДэ'}
                </button>
              </div>

              {/* Confirm dialog is rendered as a modal below */}
            </div>
          )}

          {/* Close constructor */}
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button type="button" onClick={() => setConstructorOpen(false)}
              style={{ ...btnSecondary, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              Закрыть конструктор
            </button>
          </div>
        </div>
      )}

      {/* Template detail modal */}
      {renderTemplateDetailModal()}

      {/* Confirm modal with backdrop blur */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            ...sectionCard, maxWidth: 420, width: '100%',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#e8f0ff', marginBottom: 10 }}>Подтверждение</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 6 }}>
              Создать ОДэ <strong style={{ color: '#c4b5fd' }}>«{state.name}»</strong>?
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
              {state.steps.length} этапов · {state.duration} · {state.targetAudience} · {ODE_SCALE_META[state.scale].label}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
              ОДэ будет доступно для голосования и отправки в Совет лагеря.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowConfirm(false)} style={btnSecondary}>Отмена</button>
              <button type="button" onClick={() => { setShowConfirm(false); void handleConstructorCreate(); }}
                style={btnPrimary}>✅ Подтвердить</button>
            </div>
          </div>
        </div>
      )}

      {/* Existing ОДэ initiatives list */}
      <div className="fade-in" style={sectionCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e8f0ff' }}>
            📋 Созданные ОДэ
          </h4>
          <button type="button" onClick={() => void load()} disabled={loading}
            style={{ ...btnSecondary, fontSize: 11 }}>
            {loading ? 'Загрузка…' : 'Обновить'}
          </button>
        </div>

        {/* Filter only ОДэ-tagged initiatives */}
        {items.filter(i => i.title.startsWith('[ОДэ]')).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            Пока нет созданных ОДэ. Используй конструктор выше!
          </div>
        ) : (
          items.filter(i => i.title.startsWith('[ОДэ]')).map(ini => (
            <div key={ini.id} style={{
              padding: '14px 16px', borderRadius: 12, marginBottom: 8,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f0ff' }}>
                    {ini.title.replace('[ОДэ] ', '')}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 1.4 }}>
                    {ini.description.length > 150 ? ini.description.slice(0, 150) + '…' : ini.description}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, marginLeft: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: '#34d399' }}>👍 {votesFor(ini)}</span>
                  <span style={{ fontSize: 11, color: '#f87171' }}>👎 {votesAgainst(ini)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => vote(ini.id, true)}
                  disabled={myVote(ini) === true}
                  style={{ ...btnSecondary, fontSize: 10, opacity: myVote(ini) === true ? 0.4 : 1 }}>👍 За</button>
                <button type="button" onClick={() => vote(ini.id, false)}
                  disabled={myVote(ini) === false}
                  style={{ ...btnSecondary, fontSize: 10, opacity: myVote(ini) === false ? 0.4 : 1 }}>👎 Против</button>
                {ini.status !== 'sent' && (
                  <button type="button" onClick={() => sendToCouncil(ini.id)}
                    style={{ ...btnSecondary, fontSize: 10, color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }}>
                    В Совет
                  </button>
                )}
                <button type="button" onClick={() => deleteIni(ini.id)}
                  style={{ ...btnSecondary, fontSize: 10, color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}>
                  🗑️ Удалить
                </button>
              </div>

              {ini.status === 'sent' && (
                <div style={{ marginTop: 6, fontSize: 10, color: '#34d399', fontWeight: 600 }}>
                  ✅ Отправлено в Совет лагеря
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
