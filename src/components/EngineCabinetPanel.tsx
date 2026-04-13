import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  approveEngine,
  approveGoal,
  createEngine,
  type EngineItem,
  fetchEngines,
  joinEngine,
  leaveEngine,
  updateGoal,
} from '../utils/engineApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EngineCabinetPanelProps {
  squadId: string;
  accessToken?: string | null;
  canModerate?: boolean;
  onInitiativePropose?: (engineId: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT = '#16a34a';
const ACCENT_LIGHT = 'rgba(22, 163, 74, 0.12)';

const GOAL_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Черновик', color: '#9ca3af' },
  submitted: { label: 'На утверждении', color: '#f59e0b' },
  approved: { label: 'Утверждена', color: '#22c55e' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const EngineCabinetPanel: React.FC<EngineCabinetPanelProps> = ({
  squadId,
  accessToken,
  canModerate,
  onInitiativePropose,
}) => {
  const [engines, setEngines] = useState<EngineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createAvatar, setCreateAvatar] = useState('');
  const [createBusy, setCreateBusy] = useState(false);

  // Goal edit
  const [editGoal, setEditGoal] = useState('');
  const [goalBusy, setGoalBusy] = useState(false);

  // Category proposal modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catTitle, setCatTitle] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const [busyAction, setBusyAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchEngines(squadId);
      setEngines(items);
    } catch {
      setEngines([]);
    } finally {
      setLoading(false);
    }
  }, [squadId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = engines.find((e) => e.id === selectedId) ?? null;

  // Handlers
  const handleCreate = useCallback(async () => {
    if (!accessToken || !createName.trim()) return;
    setCreateBusy(true);
    try {
      await createEngine(accessToken, squadId, {
        name: createName.trim(),
        avatarUrl: createAvatar.trim() || undefined,
      });
      setShowCreate(false);
      setCreateName('');
      setCreateAvatar('');
      void load();
    } catch {
      /* silent */
    } finally {
      setCreateBusy(false);
    }
  }, [accessToken, squadId, createName, createAvatar, load]);

  const handleJoin = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      setBusyAction(id);
      try {
        await joinEngine(accessToken, id);
        void load();
      } catch {
        /* silent */
      } finally {
        setBusyAction(null);
      }
    },
    [accessToken, load]
  );

  const handleLeave = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      setBusyAction(id);
      try {
        await leaveEngine(accessToken, id);
        void load();
      } catch {
        /* silent */
      } finally {
        setBusyAction(null);
      }
    },
    [accessToken, load]
  );

  const handleApproveEngine = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      setBusyAction(id);
      try {
        await approveEngine(accessToken, id);
        void load();
      } catch {
        /* silent */
      } finally {
        setBusyAction(null);
      }
    },
    [accessToken, load]
  );

  const handleGoalSubmit = useCallback(async () => {
    if (!accessToken || !selected || !editGoal.trim()) return;
    setGoalBusy(true);
    try {
      await updateGoal(accessToken, selected.id, editGoal.trim());
      void load();
    } catch {
      /* silent */
    } finally {
      setGoalBusy(false);
    }
  }, [accessToken, selected, editGoal, load]);

  const handleGoalApprove = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      setBusyAction(id);
      try {
        await approveGoal(accessToken, id);
        void load();
      } catch {
        /* silent */
      } finally {
        setBusyAction(null);
      }
    },
    [accessToken, load]
  );

  if (loading && engines.length === 0) {
    return <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Загрузка движков…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: ACCENT }}>⚙️ Движки</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {accessToken && (
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 12px', fontSize: 11, color: ACCENT }}
              onClick={() => setShowCreate(true)}
            >
              ＋ Создать
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '4px 10px', fontSize: 11 }}
            disabled={loading}
            onClick={() => void load()}
          >
            🔄
          </button>
        </div>
      </div>

      {/* Engine List */}
      {engines.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.6 }}>Нет движков в этом отряде. Создай первый!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {engines.map((eng) => (
            <div
              key={eng.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 10,
                background: selectedId === eng.id ? ACCENT_LIGHT : 'rgba(0,0,0,0.12)',
                border: `1px solid ${selectedId === eng.id ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.05)'}`,
                cursor: 'pointer',
              }}
              onClick={() => setSelectedId(selectedId === eng.id ? null : eng.id)}
            >
              <span style={{ fontSize: 20 }}>{eng.avatarUrl ? '🔧' : '⚙️'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{eng.name}</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>
                  {eng.status === 'pending'
                    ? '⏳ Ожидает одобрения'
                    : `${eng.members?.length ?? 0} участн.`}
                  {eng.goal
                    ? ` · Цель: ${eng.goal.slice(0, 40)}${eng.goal.length > 40 ? '…' : ''}`
                    : ''}
                </div>
              </div>
              {eng.status === 'pending' && canModerate && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: 10, color: '#22c55e' }}
                  disabled={busyAction === eng.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleApproveEngine(eng.id);
                  }}
                >
                  ✅
                </button>
              )}
              {eng.status === 'approved' && accessToken && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: 10 }}
                  disabled={busyAction === eng.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleJoin(eng.id);
                  }}
                >
                  Вступить
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected Engine Cabinet */}
      {selected && selected.status === 'approved' && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: ACCENT_LIGHT,
            border: '1px solid rgba(22,163,74,0.2)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, marginBottom: 8 }}>
            🔧 {selected.name}
          </div>

          {/* Members */}
          {selected.members && selected.members.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>
                Участники:
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selected.members.map((m) => (
                  <span
                    key={m.deviceId}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 8,
                      background: 'rgba(0,0,0,0.2)',
                      fontSize: 11,
                    }}
                  >
                    {m.nickname || m.deviceId.slice(0, 6)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Goal */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>Цель:</span>
              {selected.goalStatus && GOAL_STATUS_LABELS[selected.goalStatus] && (
                <span
                  style={{
                    fontSize: 9,
                    padding: '1px 6px',
                    borderRadius: 6,
                    background: 'rgba(0,0,0,0.3)',
                    color: GOAL_STATUS_LABELS[selected.goalStatus].color,
                  }}
                >
                  {GOAL_STATUS_LABELS[selected.goalStatus].label}
                </span>
              )}
            </div>
            {selected.goal ? (
              <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>{selected.goal}</div>
            ) : (
              <div style={{ fontSize: 11, opacity: 0.5 }}>Цель не задана</div>
            )}
            {accessToken && (
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input
                  type="text"
                  value={editGoal}
                  onChange={(e) => setEditGoal(e.target.value)}
                  placeholder="Новая цель…"
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: 11,
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: 10, color: ACCENT }}
                  disabled={goalBusy || !editGoal.trim()}
                  onClick={() => void handleGoalSubmit()}
                >
                  💾
                </button>
              </div>
            )}
            {canModerate && selected.goalStatus === 'submitted' && (
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 4, padding: '4px 8px', fontSize: 10, color: '#22c55e' }}
                disabled={busyAction === selected.id}
                onClick={() => void handleGoalApprove(selected.id)}
              >
                ✅ Утвердить цель
              </button>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {onInitiativePropose && (
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: 10 }}
                onClick={() => onInitiativePropose(selected.id)}
              >
                📋 Инициатива в Совет
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: 10 }}
              onClick={() => setShowCategoryModal(true)}
            >
              💡 Предложить категорию
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: 10, color: '#ef4444' }}
              disabled={busyAction === selected.id}
              onClick={() => void handleLeave(selected.id)}
            >
              🚪 Покинуть
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={{
              background: 'var(--surface-2, #1a1a2e)',
              borderRadius: 16,
              padding: 20,
              maxWidth: 360,
              width: '90%',
              border: '1px solid rgba(22,163,74,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 12px', color: ACCENT }}>⚙️ Создать Движок</h4>
            <input
              type="text"
              placeholder="Название"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: 13,
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />
            <input
              type="text"
              placeholder="URL аватара (необязательно)"
              value={createAvatar}
              onChange={(e) => setCreateAvatar(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: 13,
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-primary-gold"
                disabled={createBusy || !createName.trim()}
                onClick={() => void handleCreate()}
                style={{ flex: 1, padding: '10px 16px' }}
              >
                {createBusy ? 'Создание…' : 'Создать'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCreate(false)}
                style={{ padding: '10px 16px' }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Proposal Modal */}
      {showCategoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            style={{
              background: 'var(--surface-2, #1a1a2e)',
              borderRadius: 16,
              padding: 20,
              maxWidth: 360,
              width: '90%',
              border: '1px solid rgba(22,163,74,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 12px', color: ACCENT }}>💡 Предложить категорию</h4>
            <input
              type="text"
              placeholder="Название категории"
              value={catTitle}
              onChange={(e) => setCatTitle(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: 13,
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />
            <textarea
              placeholder="Описание…"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: 13,
                marginBottom: 8,
                minHeight: 60,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-primary-gold"
                disabled={!catTitle.trim()}
                style={{ flex: 1, padding: '10px 16px' }}
                onClick={() => {
                  setShowCategoryModal(false);
                  setCatTitle('');
                  setCatDesc('');
                }}
              >
                Отправить
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCategoryModal(false)}
                style={{ padding: '10px 16px' }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EngineCabinetPanel;
