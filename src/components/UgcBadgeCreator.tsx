import type React from 'react';
import { useCallback, useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UgcBadgeCreatorProps {
  categories: Array<{ id: string; title: string }>;
  onCreated?: () => void;
}

interface UgcBadge {
  id: string;
  title: string;
  categoryId: string;
  description: string;
  criteria: string;
  level: string;
  status: 'draft' | 'proposed' | 'approved' | 'rejected';
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_KEY = 'rl-ugc-badges';
const LEVELS = ['Начинающий', 'Продвинутый', 'Эксперт'];

function loadUgcBadges(): UgcBadge[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as UgcBadge[];
  } catch {
    return [];
  }
}

function saveUgcBadges(items: UgcBadge[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    /* */
  }
}

const STATUS_COLORS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Черновик', color: '#6b7280' },
  proposed: { label: 'Предложен', color: '#3b82f6' },
  approved: { label: 'Одобрен', color: '#22c55e' },
  rejected: { label: 'Отклонён', color: '#ef4444' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const UgcBadgeCreator: React.FC<UgcBadgeCreatorProps> = ({ categories, onCreated }) => {
  const [badges, setBadges] = useState<UgcBadge[]>(loadUgcBadges);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [catId, setCatId] = useState(categories[0]?.id ?? '');
  const [desc, setDesc] = useState('');
  const [criteria, setCriteria] = useState('');
  const [level, setLevel] = useState(LEVELS[0]);

  const save = useCallback((next: UgcBadge[]) => {
    setBadges(next);
    saveUgcBadges(next);
  }, []);

  const handleCreate = useCallback(() => {
    if (!title.trim()) return;
    const badge: UgcBadge = {
      id: `ugc-${Date.now()}`,
      title: title.trim(),
      categoryId: catId,
      description: desc.trim(),
      criteria: criteria.trim(),
      level,
      status: 'proposed',
      createdAt: new Date().toISOString(),
    };
    save([...badges, badge]);
    setTitle('');
    setDesc('');
    setCriteria('');
    setShowForm(false);
    onCreated?.();
  }, [title, catId, desc, criteria, level, badges, save, onCreated]);

  const handleRemove = useCallback(
    (id: string) => {
      save(badges.filter((b) => b.id !== id));
    },
    [badges, save]
  );

  const catName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.title]));
    return (id: string) => map.get(id) ?? id;
  }, [categories]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#a855f7' }}>🏷️ Мои значки</span>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '4px 12px', fontSize: 11, color: '#a855f7' }}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕' : '＋ Создать значок'}
        </button>
      </div>

      {/* Creation form */}
      {showForm && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: 'rgba(168,85,247,0.08)',
            border: '1px solid rgba(168,85,247,0.2)',
          }}
        >
          <input
            type="text"
            placeholder="Название значка"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: 13,
              marginBottom: 6,
              boxSizing: 'border-box',
            }}
          />

          <select
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: 13,
              marginBottom: 6,
              boxSizing: 'border-box',
            }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Описание значка…"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: 13,
              marginBottom: 6,
              minHeight: 50,
              boxSizing: 'border-box',
            }}
          />

          <textarea
            placeholder="Критерии получения…"
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: 13,
              marginBottom: 6,
              minHeight: 40,
              boxSizing: 'border-box',
            }}
          />

          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
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
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          {/* Preview card */}
          {title.trim() && (
            <div
              style={{
                padding: 10,
                borderRadius: 10,
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 2 }}>Превью:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🏷️</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{title}</div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>
                    {catName(catId)} · {level}
                  </div>
                </div>
              </div>
              {desc && (
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                  {desc.slice(0, 100)}
                  {desc.length > 100 ? '…' : ''}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="btn-primary-gold"
            disabled={!title.trim()}
            onClick={handleCreate}
            style={{ width: '100%', padding: '10px 16px' }}
          >
            Предложить значок
          </button>
        </div>
      )}

      {/* Badge list */}
      {badges.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.6 }}>Нет предложенных значков.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {badges.map((b) => {
            const s = STATUS_COLORS[b.status] ?? STATUS_COLORS.draft;
            return (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.12)',
                }}
              >
                <span style={{ fontSize: 14 }}>🏷️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{b.title}</div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>
                    {catName(b.categoryId)} · {b.level}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: `${s.color}22`,
                    color: s.color,
                  }}
                >
                  {s.label}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '2px 6px', fontSize: 10, color: '#ef4444' }}
                  onClick={() => handleRemove(b.id)}
                >
                  🗑
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export type { UgcBadge };
export { loadUgcBadges, saveUgcBadges };
export default UgcBadgeCreator;
