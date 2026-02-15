import React from 'react';
import {
  VOZHATIFIKATOR_CHECKLIST_ITEMS,
  getVozhatifikatorLevel,
} from '../data/vozhatifikatorChecklist';

interface VozhatifikatorChecklistProps {
  completedIds: string[];
  onToggle: (itemId: string, completed: boolean) => void;
}

export const VozhatifikatorChecklist: React.FC<VozhatifikatorChecklistProps> = ({
  completedIds,
  onToggle,
}) => {
  const totalPoints = VOZHATIFIKATOR_CHECKLIST_ITEMS.reduce(
    (sum, item) => (completedIds.includes(item.id) ? sum + item.points : sum),
    0
  );
  const level = getVozhatifikatorLevel(totalPoints);
  const totalMax = VOZHATIFIKATOR_CHECKLIST_ITEMS.reduce((s, i) => s + i.points, 0);

  return (
    <div className="vozhatifikator-checklist">
      <h2 className="vozhatifikator-checklist__title">Путеводные огни</h2>
      <p className="vozhatifikator-checklist__intro">
        Отмечайте достижения — так вы увидите свой уровень вожатификации по шкале из книги.
      </p>
      <div className="vozhatifikator-checklist__score">
        <span className="vozhatifikator-checklist__points">
          {totalPoints.toFixed(1)} / {totalMax.toFixed(1)}
        </span>
        <span className="vozhatifikator-checklist__level" title={level.description}>
          {level.label}
        </span>
      </div>
      <p className="vozhatifikator-checklist__level-desc">{level.description}</p>
      <ul className="vozhatifikator-checklist__list" aria-label="Пункты чек-листа">
        {VOZHATIFIKATOR_CHECKLIST_ITEMS.map((item) => {
          const isDone = completedIds.includes(item.id);
          return (
            <li key={item.id} className="vozhatifikator-checklist__item">
              <button
                type="button"
                onClick={() => onToggle(item.id, !isDone)}
                className={`vozhatifikator-checklist__checkbox ${isDone ? 'vozhatifikator-checklist__checkbox--done' : ''}`}
                aria-pressed={isDone}
                aria-label={isDone ? `Снять отметку: ${item.title}` : `Отметить: ${item.title}`}
              >
                {isDone ? '\u2713' : ''}
              </button>
              <span className={`vozhatifikator-checklist__label ${isDone ? 'vozhatifikator-checklist__label--done' : ''}`}>
                {item.title}
              </span>
              <span className="vozhatifikator-checklist__pts">+{item.points}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
