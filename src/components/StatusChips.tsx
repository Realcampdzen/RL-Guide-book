import type React from 'react';

export interface StatusChipItem {
  id: string;
  title: string;
  count: number;
  max: number;
  hint: string;
  active?: boolean;
  onClick?: () => void;
}

interface StatusChipsProps {
  items: StatusChipItem[];
}

const StatusChips: React.FC<StatusChipsProps> = ({ items }) => {
  return (
    <div className="badge-status-panel">
      <div className="badge-status-panel__head">
        <div className="badge-status-panel__chips">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`badge-status-chip${item.active ? ' is-active' : ''}`}
              onClick={item.onClick}
              aria-pressed={item.active}
            >
              <div className="badge-status-chip__line">
                <span className="badge-status-chip__title">{item.title}</span>
                <span className="badge-status-chip__count">
                  {item.count}/{item.max}
                </span>
              </div>
              <div className="badge-status-chip__hint">{item.hint}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatusChips;
