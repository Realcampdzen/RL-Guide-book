import type React from 'react';

export interface ChildRouteModalProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export const ChildRouteModal: React.FC<ChildRouteModalProps> = ({
  open,
  value,
  onChange,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="proof-modal-overlay" onClick={onClose}>
      <div
        className="proof-modal proof-modal--mobile-sheet proof-modal--wide fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-child-route-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="profile-modal-child-route-title" style={{ marginTop: 0, marginBottom: 8 }}>
          Маршрут развития для ребёнка
        </h3>
        <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>
          Опишите желательные направления или значки для ребёнка — вожатый или организатор учтёт это
          при поддержке.
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Например: хотелось бы, чтобы попробовал значки по лидерству и творчеству…"
          rows={4}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(0,0,0,0.2)',
            color: '#fff',
            fontSize: 14,
            resize: 'vertical',
            marginBottom: 12,
          }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            href={`https://t.me/Stivanovv?text=${encodeURIComponent('Маршрут развития для ребёнка (от родителя):\n\n' + (value || '(родитель не указал текст)'))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary-gold"
            style={{ padding: '10px 20px', textDecoration: 'none' }}
          >
            Отправить вожатому в Telegram
          </a>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};
