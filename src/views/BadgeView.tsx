import React, { useMemo } from 'react';
import { fixDescriptionFormatting } from '../utils/textFormatting';

type Category = {
  id: string;
  title: string;
};

type Badge = {
  id: string;
  title: string;
  emoji?: string;
  description?: string;
  criteria?: string;
  confirmation?: string;
  category_id: string;
  level?: string;
  badgeGroup?: string;
  badgeGroupTitle?: string;
  badgeGroupEmoji?: string;
  allLevels?: Array<{
    id: string;
    level?: string;
    title: string;
    emoji?: string;
    criteria?: string;
    confirmation?: string;
  }>;
};

interface BadgeViewProps {
  category: Category;
  badge: Badge;
  badges: Badge[];
  onBack: () => void;
  onLevelSelect: (level: string, levelId: string) => void;
}

const BadgeView: React.FC<BadgeViewProps> = ({ category, badge, badges, onBack, onLevelSelect }) => {
  // Compute levels for this badge (group by baseKey if 3 segments)
  const { levels, isMulti } = useMemo(() => {
    const idSegments = (badge.id || '').split('.');
    const isMulti = idSegments.length === 3;
    const list = badges
      .filter((b) => {
        if (b.category_id !== badge.category_id) return false;
        if (isMulti) {
          const seg = (b.id || '').split('.');
          return seg.length === 3 && seg[0] === idSegments[0] && seg[1] === idSegments[1];
        }
        return (b.id || '') === (badge.id || '');
      })
      .sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    return { levels: list, isMulti };
  }, [badge, badges]);

  const formattedDescription = useMemo(() => {
    const raw = badge.description || '';
    return fixDescriptionFormatting(raw);
  }, [badge.description]);

  return (
    <div className={`badge-screen ${badge.id?.startsWith('1.4.') ? 'badge--group-1-4' : ''}`}>
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад к категориям</button>
        <div className="header-content">
          <h1 className="app-title">{badge.title}</h1>
          <p className="badge-category">{category?.title}</p>
        </div>
      </div>

      <div className="badge-content">
        <div className="badge-info">
          <div className="badge-description pre-wrap">
            {formattedDescription || 'Описание пока не найдено.'}
          </div>
        </div>

        {levels && levels.length > 0 && (
          <div className="badge-levels">
            <h3 className="level-title">Уровни</h3>
            <div className="levels-list">
              {levels.map((lvl) => (
                <button
                  key={lvl.id}
                  className={`level-button ${lvl.id === badge.id ? 'active' : ''}`}
                  onClick={() => onLevelSelect(lvl.level || '', lvl.id)}
                  title={lvl.title}
                >
                  {isMulti ? (lvl.level || '') : 'Описание'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgeView;
