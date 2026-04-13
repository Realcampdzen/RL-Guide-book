import type React from 'react';
import { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SquadTraditionsSectionProps {
  squadId: string;
  canApprove?: boolean;
  role?: string | null;
  onNavigateToBadge?: (badgeId: string) => void;
}

type TraditionScope = 'squad' | 'camp' | 'director_proposal';

interface SquadTradition {
  id: string;
  title: string;
  description: string;
  scope: TraditionScope;
  status: 'proposed' | 'approved';
  proposedBy: string;
  linkedBadgeId?: string;
  linkedBadgeTitle?: string;
  fromEngineId?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT = '#d97706';

const SCOPE_LABELS: Record<TraditionScope, { label: string; icon: string; color: string }> = {
  squad: { label: 'Отряд', icon: '🏕️', color: '#3b82f6' },
  camp: { label: 'Лагерь', icon: '🏛️', color: '#a855f7' },
  director_proposal: { label: 'Начальник', icon: '👔', color: '#ef4444' },
};

function lsKey(squadId: string) {
  return `rl-squad-traditions-${squadId}`;
}

function loadTraditions(squadId: string): SquadTradition[] {
  try {
    return JSON.parse(localStorage.getItem(lsKey(squadId)) || '[]') as SquadTradition[];
  } catch {
    return [];
  }
}

function saveTraditions(squadId: string, items: SquadTradition[]) {
  try {
    localStorage.setItem(lsKey(squadId), JSON.stringify(items));
  } catch {
    /* */
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SquadTraditionsSection: React.FC<SquadTraditionsSectionProps> = ({
  squadId,
  canApprove,
  role,
  onNavigateToBadge,
}) => {
  const [traditions, setTraditions] = useState<SquadTradition[]>(() => loadTraditions(squadId));
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [badgeTitle, setBadgeTitle] = useState('');
  const [scope, setScope] = useState<TraditionScope>('squad');
  const [toast, setToast] = useState<string | null>(null);

  const save = useCallback(
    (next: SquadTradition[]) => {
      setTraditions(next);
      saveTraditions(squadId, next);
    },
    [squadId]
  );

  const handleCreate = useCallback(() => {
    if (!title.trim()) return;
    const isDirector = role === 'camp_director';
    const t: SquadTradition = {
      id: `trad-${Date.now()}`,
      title: title.trim(),
      description: desc.trim(),
      scope: isDirector ? 'director_proposal' : scope,
      status: 'proposed',
      proposedBy: role ?? 'participant',
      linkedBadgeId: badgeId.trim() || undefined,
      linkedBadgeTitle: badgeTitle.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    save([...traditions, t]);
    setTitle('');
    setDesc('');
    setBadgeId('');
    setBadgeTitle('');
    setShowForm(false);
    if (t.linkedBadgeTitle || t.linkedBadgeId) {
      setToast(`Традиция создана! Связанный значок: ${t.linkedBadgeTitle || t.linkedBadgeId}`);
      setTimeout(() => setToast(null), 3000);
    }
  }, [title, desc, scope, badgeId, badgeTitle, role, traditions, save]);

  const handleApprove = useCallback(
    (id: string) => {
      save(traditions.map((t) => (t.id === id ? { ...t, status: 'approved' as const } : t)));
    },
    [traditions, save]
  );

  const handleRemove = useCallback(
    (id: string) => {
      save(traditions.filter((t) => t.id !== id));
    },
    [traditions, save]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>🏛️ Традиции</span>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '4px 12px', fontSize: 11, color: ACCENT }}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕' : '＋ Предложить'}
        </button>
      </div>

      {/* Creation form */}
      {showForm && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: 'rgba(217,119,6,0.08)',
            border: '1px solid rgba(217,119,6,0.2)',
          }}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название традиции"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: 12,
              marginBottom: 6,
              boxSizing: 'border-box',
            }}
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Описание…"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: 12,
              marginBottom: 6,
              minHeight: 40,
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {(['squad', 'camp'] as TraditionScope[]).map((s) => (
              <button
                key={s}
                type="button"
                className="btn-secondary"
                style={{
                  padding: '4px 8px',
                  fontSize: 10,
                  background: scope === s ? `${SCOPE_LABELS[s].color}22` : undefined,
                  color: scope === s ? SCOPE_LABELS[s].color : undefined,
                }}
                onClick={() => setScope(s)}
              >
                {SCOPE_LABELS[s].icon} {SCOPE_LABELS[s].label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input
              type="text"
              value={badgeId}
              onChange={(e) => setBadgeId(e.target.value)}
              placeholder="ID значка"
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.2)',
                color: '#fff',
                fontSize: 11,
              }}
            />
            <input
              type="text"
              value={badgeTitle}
              onChange={(e) => setBadgeTitle(e.target.value)}
              placeholder="Название значка"
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.2)',
                color: '#fff',
                fontSize: 11,
              }}
            />
          </div>

          <button
            type="button"
            className="btn-primary-gold"
            disabled={!title.trim()}
            onClick={handleCreate}
            style={{ width: '100%', padding: '8px 14px', fontSize: 11 }}
          >
            Предложить традицию
          </button>
        </div>
      )}

      {/* List */}
      {traditions.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.6 }}>Нет традиций. Предложите первую!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {traditions.map((t) => {
            const sc = SCOPE_LABELS[t.scope] ?? SCOPE_LABELS.squad;
            return (
              <div
                key={t.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: t.status === 'approved' ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.12)',
                  border: `1px solid ${t.status === 'approved' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{t.title}</span>
                  <span
                    style={{
                      fontSize: 8,
                      padding: '1px 4px',
                      borderRadius: 4,
                      background: `${sc.color}22`,
                      color: sc.color,
                    }}
                  >
                    {sc.icon} {sc.label}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      padding: '1px 4px',
                      borderRadius: 4,
                      background:
                        t.status === 'approved' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)',
                      color: t.status === 'approved' ? '#22c55e' : '#f59e0b',
                    }}
                  >
                    {t.status === 'approved' ? '✅' : '⏳'}
                  </span>
                  {t.fromEngineId && (
                    <span
                      style={{
                        fontSize: 8,
                        padding: '1px 4px',
                        borderRadius: 4,
                        background: 'rgba(22,163,74,0.15)',
                        color: '#16a34a',
                      }}
                    >
                      ⚙️
                    </span>
                  )}
                </div>
                {t.description && (
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{t.description}</div>
                )}
                {t.linkedBadgeId && (
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.6,
                      marginTop: 2,
                      cursor: onNavigateToBadge ? 'pointer' : 'default',
                    }}
                    onClick={() => t.linkedBadgeId && onNavigateToBadge?.(t.linkedBadgeId)}
                  >
                    🔗 {t.linkedBadgeTitle || t.linkedBadgeId}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {t.status === 'proposed' && canApprove && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '2px 8px', fontSize: 10, color: '#22c55e' }}
                      onClick={() => handleApprove(t.id)}
                    >
                      ✅ Утвердить
                    </button>
                  )}
                  {canApprove && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '2px 8px', fontSize: 10, color: '#ef4444' }}
                      onClick={() => handleRemove(t.id)}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            background: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.3)',
            fontSize: 12,
            color: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>🏅</span>
          <span style={{ flex: 1 }}>{toast}</span>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '2px 6px', fontSize: 10 }}
            onClick={() => setToast(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default SquadTraditionsSection;
