import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import {
  BLOCK_LIBRARY,
  BLOCK_TYPE_META,
  type BlockType,
  INITIATION_TEMPLATES,
  type InitiationBlock,
  type InitiationTemplate,
  TIPS,
} from '../data/initiationTemplates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConstructorState {
  templateId: string | null; // null = с нуля
  name: string;
  symbol: string;
  durationDays: number;
  timeOfDay: string;
  blocks: InitiationBlock[];
  hasOgonyok: boolean;
  hasKapusta: boolean;
  hasPhoto: boolean;
}

interface InitiationConstructorProps {
  onCreated?: () => void;
  onSwitchToWing?: () => void;
}

const DEFAULT_STATE: ConstructorState = {
  templateId: null,
  name: '',
  symbol: '',
  durationDays: 1,
  timeOfDay: 'вечер',
  blocks: [],
  hasOgonyok: false,
  hasKapusta: false,
  hasPhoto: false,
};

const uid = () => `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const DRAFT_KEY = 'init-constructor-draft';
const DRAFT_STEP_KEY = 'init-constructor-step';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const InitiationConstructor: React.FC<InitiationConstructorProps> = ({
  onCreated,
  onSwitchToWing: _onSwitchToWing,
}) => {
  const { accessToken, deviceId } = useAuth();
  const { activeTeam } = useTeam();
  const squadId = activeTeam?.squadId || activeTeam?.id;

  const [step, setStep] = useState(() => {
    try {
      const s = localStorage.getItem(DRAFT_STEP_KEY);
      return s ? Math.max(1, Math.min(4, Number(s))) : 1;
    } catch {
      return 1;
    }
  });
  const [state, setState] = useState<ConstructorState>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch {
      /* ignore */
    }
    return { ...DEFAULT_STATE };
  });
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  // -- draft persistence --
  useEffect(() => {
    try {
      const hasDraft = state.name || state.blocks.length > 0;
      if (hasDraft) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
        localStorage.setItem(DRAFT_STEP_KEY, String(step));
      }
    } catch {
      /* quota exceeded — ignore */
    }
  }, [state, step]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_STEP_KEY);
    setState({ ...DEFAULT_STATE });
    setStep(1);
    setToast('Черновик очищен');
    setTimeout(() => setToast(null), 2000);
  }, []);

  const hasDraft = state.name.trim() !== '' || state.blocks.length > 0;

  const headers = useMemo((): Record<string, string> => {
    if (accessToken)
      return { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    if (deviceId) return { 'Content-Type': 'application/json', 'X-Device-Id': deviceId };
    return { 'Content-Type': 'application/json' };
  }, [accessToken, deviceId]);

  // -- template picker --
  const selectTemplate = useCallback((t: InitiationTemplate | null) => {
    if (!t) {
      setState({ ...DEFAULT_STATE });
      setStep(2);
      return;
    }
    setState({
      templateId: t.id,
      name: t.name,
      symbol: t.symbol,
      durationDays: t.durationDays,
      timeOfDay: t.timeOfDay,
      blocks: t.blocks.map((b) => ({ ...b, id: uid() })),
      hasOgonyok: t.blocks.some((b) => b.type === 'bonfire'),
      hasKapusta: t.blocks.some(
        (b) =>
          b.title.toLowerCase().includes('капуста') || b.title.toLowerCase().includes('обнимашк')
      ),
      hasPhoto: false,
    });
    setStep(2);
  }, []);

  // -- block manipulation --
  const addBlock = useCallback((block: InitiationBlock) => {
    setState((prev) => ({
      ...prev,
      blocks: [...prev.blocks, { ...block, id: uid() }],
    }));
  }, []);

  const removeBlock = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
  }, []);

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setState((prev) => {
      const idx = prev.blocks.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.blocks.length) return prev;
      const blocks = [...prev.blocks];
      [blocks[idx], blocks[next]] = [blocks[next], blocks[idx]];
      return { ...prev, blocks };
    });
  }, []);

  const updateBlockField = useCallback(
    (id: string, field: keyof InitiationBlock, value: string) => {
      setState((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
      }));
    },
    []
  );

  const addCustomBlock = useCallback(() => {
    addBlock({
      id: uid(),
      type: 'custom',
      title: '',
      description: '',
      emoji: '✨',
    });
  }, [addBlock]);

  // -- creation --
  const handleCreate = useCallback(async () => {
    if (!squadId || !state.name.trim() || state.blocks.length === 0) return;
    setBusy(true);
    try {
      const tasks = state.blocks.map((b, i) => ({
        id: b.id,
        title: `${BLOCK_TYPE_META[b.type].emoji} ${b.title}`,
        description: [
          b.description,
          b.materials && `📦 ${b.materials}`,
          b.location && `📍 ${b.location}`,
          b.duration && `⏱ ${b.duration}`,
        ]
          .filter(Boolean)
          .join('\n'),
        order: i + 1,
      }));
      // Add final elements as tasks
      if (state.hasOgonyok && !state.blocks.some((b) => b.type === 'bonfire')) {
        tasks.push({
          id: uid(),
          title: '🔥 Огонёк / Костёр',
          description: 'Финальный Огонёк у костра',
          order: tasks.length + 1,
        });
      }
      if (state.hasKapusta) {
        tasks.push({
          id: uid(),
          title: '🤗 Капуста (обнимашки)',
          description: 'Массовые обнимашки в финале',
          order: tasks.length + 1,
        });
      }
      if (state.hasPhoto) {
        tasks.push({
          id: uid(),
          title: '📸 Фото на память',
          description: 'Общее фото отряда для истории',
          order: tasks.length + 1,
        });
      }

      const description = [
        state.symbol && `Символ: ${state.symbol}`,
        `Длительность: ${state.durationDays} ${state.durationDays === 1 ? 'день' : 'дня'}`,
        `Время: ${state.timeOfDay}`,
        state.templateId &&
          `Шаблон: ${INITIATION_TEMPLATES.find((t) => t.id === state.templateId)?.name || ''}`,
      ]
        .filter(Boolean)
        .join(' · ');

      const res = await fetch('/api/wing/initiations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          squadId,
          name: state.name.trim(),
          description,
          tasks,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Ошибка');
      }
      setToast('Посвящение создано!');
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_STEP_KEY);
      setTimeout(() => {
        setToast(null);
        onCreated?.();
      }, 2000);
      setState({ ...DEFAULT_STATE });
      setStep(1);
    } catch (e: any) {
      setToast(e.message || 'Ошибка');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setBusy(false);
    }
  }, [squadId, state, headers, onCreated]);

  // -- library filtering --
  const filteredLibrary = useMemo(() => {
    if (!libraryFilter) return BLOCK_LIBRARY;
    return BLOCK_LIBRARY.filter(
      (b) => b.sourceTemplate === libraryFilter || b.type === libraryFilter
    );
  }, [libraryFilter]);

  const selectedTemplate = state.templateId
    ? INITIATION_TEMPLATES.find((t) => t.id === state.templateId)
    : null;

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="init-constructor">
      {/* Header */}
      <div className="init-constructor__header">
        <div className="init-constructor__header-top">
          <div>
            <div className="init-constructor__label">КОНСТРУКТОР ПОСВЯЩЕНИЙ</div>
            <h3 className="init-constructor__title">
              {step === 1
                ? 'Выбери основу'
                : step === 2
                  ? 'Настрой посвящение'
                  : step === 3
                    ? 'Собери этапы'
                    : 'Финальные штрихи'}
            </h3>
          </div>
          <div className="init-constructor__steps">
            {hasDraft && (
              <button
                type="button"
                className="init-constructor__clear-draft"
                onClick={clearDraft}
                title="Очистить черновик"
              >
                Очистить
              </button>
            )}
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                type="button"
                className={`init-constructor__step-dot${step === s ? ' active' : ''}${step > s ? ' done' : ''}`}
                onClick={() => {
                  if (s <= step || (s === 2 && step >= 1)) setStep(s);
                }}
                disabled={s > step + 1}
              >
                {step > s ? '✓' : s}
              </button>
            ))}
          </div>
        </div>
        {/* Progress line */}
        <div className="init-constructor__progress-track">
          <div
            className="init-constructor__progress-fill"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Step 1: Template Picker ── */}
      {step === 1 && (
        <div className="init-constructor__section">
          <div className="init-template-grid">
            {/* "С нуля" card */}
            <button
              type="button"
              className="init-template-card init-template-card--scratch"
              onClick={() => selectTemplate(null)}
            >
              <span
                className="init-template-card__icon"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                +
              </span>
              <span className="init-template-card__name">С нуля</span>
              <span className="init-template-card__desc">Создай своё уникальное посвящение</span>
            </button>

            {INITIATION_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="init-template-card"
                onClick={() => selectTemplate(t)}
                style={{ '--accent': t.color } as React.CSSProperties}
              >
                <span className="init-template-card__icon" style={{ background: t.color }}>
                  {t.name.charAt(0)}
                </span>
                <span className="init-template-card__name">{t.name}</span>
                <span className="init-template-card__squad">{t.squadName}</span>
                <span className="init-template-card__desc">
                  {t.blocks.length} этапов · {t.durationDays}д
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Settings ── */}
      {step === 2 && (
        <div className="init-constructor__section">
          {selectedTemplate && (
            <div
              className="init-constructor__template-hint"
              style={{ borderLeftColor: selectedTemplate.color }}
            >
              <span>
                Основа: <strong>{selectedTemplate.name}</strong> —{' '}
                {selectedTemplate.description.slice(0, 80)}…
              </span>
            </div>
          )}

          <div className="init-constructor__form">
            <label className="init-constructor__field">
              <span className="init-constructor__field-label">Название посвящения</span>
              <input
                type="text"
                className="init-constructor__input"
                value={state.name}
                onChange={(e) => setState((p) => ({ ...p, name: e.target.value }))}
                placeholder="Например: Котосвящение, Разведвление"
              />
            </label>

            <label className="init-constructor__field">
              <span className="init-constructor__field-label">Физический символ</span>
              <input
                type="text"
                className="init-constructor__input"
                value={state.symbol}
                onChange={(e) => setState((p) => ({ ...p, symbol: e.target.value }))}
                placeholder="Галстук, значок, нить, лента, жест…"
              />
            </label>

            <div className="init-constructor__row">
              <label className="init-constructor__field" style={{ flex: 1 }}>
                <span className="init-constructor__field-label">Длительность (дней)</span>
                <div className="init-constructor__duration-picker">
                  {[1, 2, 3].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`init-constructor__duration-btn${state.durationDays === d ? ' active' : ''}`}
                      onClick={() => setState((p) => ({ ...p, durationDays: d }))}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </label>

              <label className="init-constructor__field" style={{ flex: 1 }}>
                <span className="init-constructor__field-label">Время проведения</span>
                <select
                  className="init-constructor__select"
                  value={state.timeOfDay}
                  onChange={(e) => setState((p) => ({ ...p, timeOfDay: e.target.value }))}
                >
                  <option value="утро">Утро</option>
                  <option value="тихий час">Тихий час</option>
                  <option value="день">День</option>
                  <option value="вечер">Вечер</option>
                  <option value="весь день">Весь день</option>
                  <option value="весь день → вечер">Весь день → Вечер</option>
                </select>
              </label>
            </div>
          </div>

          <div className="init-constructor__nav">
            <button
              type="button"
              className="init-constructor__btn-secondary"
              onClick={() => setStep(1)}
            >
              ← Назад
            </button>
            <button
              type="button"
              className="init-constructor__btn-primary"
              disabled={!state.name.trim()}
              onClick={() => setStep(3)}
            >
              Далее: этапы →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Block Builder ── */}
      {step === 3 && (
        <div className="init-constructor__section">
          {/* Block list */}
          <div className="init-constructor__blocks">
            {state.blocks.length === 0 && (
              <div className="init-constructor__empty">
                Добавь этапы из библиотеки или создай свой!
              </div>
            )}
            {state.blocks.map((block, idx) => {
              const meta = BLOCK_TYPE_META[block.type];
              return (
                <div
                  key={block.id}
                  className="init-block"
                  style={{ '--block-color': meta.color } as React.CSSProperties}
                >
                  <div className="init-block__header">
                    <span className="init-block__type-badge">{meta.label}</span>
                    <div className="init-block__actions">
                      <button
                        type="button"
                        className="init-block__move"
                        disabled={idx === 0}
                        onClick={() => moveBlock(block.id, -1)}
                        title="Вверх"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="init-block__move"
                        disabled={idx === state.blocks.length - 1}
                        onClick={() => moveBlock(block.id, 1)}
                        title="Вниз"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="init-block__remove"
                        onClick={() => removeBlock(block.id)}
                        title="Удалить"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    className="init-block__title-input"
                    value={block.title}
                    onChange={(e) => updateBlockField(block.id, 'title', e.target.value)}
                    placeholder="Название этапа"
                  />
                  <textarea
                    className="init-block__desc-input"
                    value={block.description}
                    onChange={(e) => updateBlockField(block.id, 'description', e.target.value)}
                    placeholder="Описание…"
                    rows={2}
                  />
                  <div className="init-block__meta-row">
                    <input
                      type="text"
                      className="init-block__meta-input"
                      value={block.materials || ''}
                      onChange={(e) => updateBlockField(block.id, 'materials', e.target.value)}
                      placeholder="Материалы"
                    />
                    <input
                      type="text"
                      className="init-block__meta-input"
                      value={block.location || ''}
                      onChange={(e) => updateBlockField(block.id, 'location', e.target.value)}
                      placeholder="Место"
                    />
                    <input
                      type="text"
                      className="init-block__meta-input"
                      value={block.duration || ''}
                      onChange={(e) => updateBlockField(block.id, 'duration', e.target.value)}
                      placeholder="Время"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add block buttons */}
          <div className="init-constructor__add-row">
            <button type="button" className="init-constructor__btn-add" onClick={addCustomBlock}>
              + Свой этап
            </button>
            <button
              type="button"
              className="init-constructor__btn-library"
              onClick={() => setShowLibrary(true)}
            >
              Библиотека · {BLOCK_LIBRARY.length} блоков
            </button>
          </div>

          {/* Quick add by type */}
          <div className="init-constructor__type-row">
            {(
              Object.entries(BLOCK_TYPE_META) as [BlockType, (typeof BLOCK_TYPE_META)[BlockType]][]
            ).map(([type, meta]) => (
              <button
                key={type}
                type="button"
                className="init-constructor__type-chip"
                style={{ '--chip-color': meta.color } as React.CSSProperties}
                onClick={() =>
                  addBlock({ id: uid(), type, title: '', description: '', emoji: meta.emoji })
                }
                title={`Добавить: ${meta.label}`}
              >
                {meta.label.charAt(0)}
              </button>
            ))}
          </div>

          <div className="init-constructor__nav">
            <button
              type="button"
              className="init-constructor__btn-secondary"
              onClick={() => setStep(2)}
            >
              ← Назад
            </button>
            <button
              type="button"
              className="init-constructor__btn-primary"
              disabled={state.blocks.length === 0 || state.blocks.every((b) => !b.title.trim())}
              onClick={() => setStep(4)}
            >
              Далее: финал →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Final ── */}
      {step === 4 && (
        <div className="init-constructor__section">
          {/* Summary */}
          <div className="init-constructor__summary">
            <div className="init-constructor__summary-title">{state.name}</div>
            <div className="init-constructor__summary-meta">
              {state.symbol && <span>Символ: {state.symbol}</span>}
              <span>
                {state.durationDays} {state.durationDays === 1 ? 'день' : 'дня'}
              </span>
              <span>{state.timeOfDay}</span>
              <span>{state.blocks.filter((b) => b.title.trim()).length} этапов</span>
            </div>
          </div>

          {/* Timeline preview */}
          <div className="init-constructor__timeline">
            {state.blocks
              .filter((b) => b.title.trim())
              .map((block, idx) => {
                const meta = BLOCK_TYPE_META[block.type];
                return (
                  <div key={block.id} className="init-timeline__item">
                    <div className="init-timeline__dot" style={{ background: meta.color }}>
                      {meta.label.charAt(0)}
                    </div>
                    <div className="init-timeline__content">
                      <div className="init-timeline__title">{block.title}</div>
                      {block.description && (
                        <div className="init-timeline__desc">{block.description.slice(0, 60)}…</div>
                      )}
                    </div>
                    <div className="init-timeline__number">{idx + 1}</div>
                  </div>
                );
              })}
          </div>

          {/* Final options */}
          <div className="init-constructor__finals">
            <label className="init-constructor__check">
              <input
                type="checkbox"
                checked={state.hasOgonyok}
                onChange={(e) => setState((p) => ({ ...p, hasOgonyok: e.target.checked }))}
              />
              <span>Финальный Огонёк / Костёр</span>
            </label>
            <label className="init-constructor__check">
              <input
                type="checkbox"
                checked={state.hasKapusta}
                onChange={(e) => setState((p) => ({ ...p, hasKapusta: e.target.checked }))}
              />
              <span>Капуста (массовые обнимашки)</span>
            </label>
            <label className="init-constructor__check">
              <input
                type="checkbox"
                checked={state.hasPhoto}
                onChange={(e) => setState((p) => ({ ...p, hasPhoto: e.target.checked }))}
              />
              <span>Фото на память для истории</span>
            </label>
          </div>

          {/* Tips */}
          <button
            type="button"
            className="init-constructor__tips-toggle"
            onClick={() => {
              setShowTips(!showTips);
              setTipIndex(Math.floor(Math.random() * TIPS.length));
            }}
          >
            {showTips ? 'Скрыть советы' : 'Советы из Вожатификатора'}
          </button>
          {showTips && (
            <div className="init-constructor__tips">
              <div className="init-constructor__tip">
                <span>{TIPS[tipIndex]}</span>
              </div>
              <button
                type="button"
                className="init-constructor__tip-next"
                onClick={() => setTipIndex((tipIndex + 1) % TIPS.length)}
              >
                Ещё совет →
              </button>
            </div>
          )}

          <div className="init-constructor__nav">
            <button
              type="button"
              className="init-constructor__btn-secondary"
              onClick={() => setStep(3)}
            >
              ← Назад к этапам
            </button>
            <button
              type="button"
              className="init-constructor__btn-launch"
              disabled={busy || !state.name.trim() || state.blocks.every((b) => !b.title.trim())}
              onClick={() => setShowConfirm(true)}
            >
              {busy ? 'Создание…' : 'ЗАПУСТИТЬ ПОСВЯЩЕНИЕ'}
            </button>
          </div>
        </div>
      )}

      {/* ── Block Library Modal ── */}
      {showLibrary && (
        <div className="init-library-overlay" onClick={() => setShowLibrary(false)}>
          <div className="init-library" onClick={(e) => e.stopPropagation()}>
            <div className="init-library__header">
              <h4 className="init-library__title">Библиотека блоков</h4>
              <button
                type="button"
                className="init-library__close"
                onClick={() => setShowLibrary(false)}
              >
                ×
              </button>
            </div>

            {/* Filter chips */}
            <div className="init-library__filters">
              <button
                type="button"
                className={`init-library__filter${!libraryFilter ? ' active' : ''}`}
                onClick={() => setLibraryFilter(null)}
              >
                Все
              </button>
              {INITIATION_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`init-library__filter${libraryFilter === t.id ? ' active' : ''}`}
                  onClick={() => setLibraryFilter(libraryFilter === t.id ? null : t.id)}
                  style={{ '--accent': t.color } as React.CSSProperties}
                >
                  {t.squadName}
                </button>
              ))}
            </div>

            {/* Blocks */}
            <div className="init-library__list">
              {filteredLibrary.map((block) => {
                const meta = BLOCK_TYPE_META[block.type];
                const srcTemplate = INITIATION_TEMPLATES.find((t) => t.id === block.sourceTemplate);
                return (
                  <button
                    key={block.id}
                    type="button"
                    className="init-library__item"
                    onClick={() => {
                      addBlock(block);
                      setShowLibrary(false);
                    }}
                    title="Нажми, чтобы добавить"
                  >
                    <div className="init-library__item-top">
                      <span className="init-library__item-badge" style={{ background: meta.color }}>
                        {meta.label.charAt(0)}
                      </span>
                      <span className="init-library__item-title">{block.title}</span>
                      {srcTemplate && (
                        <span className="init-library__item-source">
                          {srcTemplate.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="init-library__item-desc">
                      {block.description.slice(0, 80)}
                      {block.description.length > 80 ? '…' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`init-constructor__toast${toast.includes('Ошибка') ? ' error' : ''}`}>
          {toast}
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="init-library-overlay" onClick={() => setShowConfirm(false)}>
          <div className="init-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="init-confirm__title">Запустить посвящение?</div>
            <div className="init-confirm__details">
              <div className="init-confirm__name">{state.name}</div>
              <div className="init-confirm__meta">
                {state.blocks.filter((b) => b.title.trim()).length} этапов · {state.durationDays}{' '}
                {state.durationDays === 1 ? 'день' : 'дня'} · {state.timeOfDay}
              </div>
            </div>
            <div className="init-confirm__hint">
              После запуска посвящение будет создано и станет доступно участникам отряда.
            </div>
            <div className="init-confirm__actions">
              <button
                type="button"
                className="init-constructor__btn-secondary"
                onClick={() => setShowConfirm(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="init-constructor__btn-launch"
                disabled={busy}
                onClick={() => {
                  setShowConfirm(false);
                  handleCreate();
                }}
              >
                {busy ? 'Создание…' : 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
