import React, { useMemo } from 'react';
import { pluralizeRu } from '../utils/textFormatting';

type Category = {
  id: string;
  title: string;
  emoji?: string;
  introduction?: { has_introduction?: boolean; html?: string };
  additional_materials?: {
    checklists?: boolean | Record<string, unknown>;
    methodology?: boolean | Record<string, unknown>;
  };
};

type Badge = {
  id: string;
  title: string;
  emoji?: string;
  level?: string;
  criteria?: string;
  confirmation?: string;
  category_id: string;
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

interface CategoryViewProps {
  category: Category;
  badges: Badge[];
  onBack: () => void;
  onBadgeClick: (badge: any) => void;
  onIntroductionClick: () => void;
  onAdditionalMaterialClick: (type: 'checklist' | 'methodology', filename: string) => void;
}

const CategoryView: React.FC<CategoryViewProps> = ({
  category,
  badges,
  onBack,
  onBadgeClick,
  onIntroductionClick,
  onAdditionalMaterialClick,
}) => {
  const categoryBadges = useMemo(() => {
    const groups = new Map<string, Badge[]>();
    badges.forEach((badge) => {
      if (badge.category_id !== category.id) return;
      const key = badge.badgeGroup || badge.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(badge);
    });

    const result: Badge[] = [];
    groups.forEach((groupBadges) => {
      groupBadges.sort((a, b) => a.id.localeCompare(b.id));
      const base = groupBadges[0];
      if (base) {
        base.allLevels = groupBadges.map((b) => ({
          id: b.id,
          level: b.level,
          title: b.title,
          emoji: b.emoji,
          criteria: b.criteria || '',
          confirmation: b.confirmation || '',
        }));
        result.push(base);
      }
    });
    result.sort((a, b) => a.id.localeCompare(b.id));
    return result;
  }, [badges, category.id]);

  if (categoryBadges.length === 0) {
    return (
      <div className="category-screen">
        <div className="header">
          <button onClick={onBack} className="back-button">
            ← Назад к категориям
          </button>
          <h1 className="category-title">{category.title}</h1>
        </div>
        <div className="category-content">
          <div className="error-message">
            <h2>Значки не найдены</h2>
            <p>В этой категории пока нет значков. Проверьте данные или попробуйте позже.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="category-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">
          ← Назад к категориям
        </button>
        <div className="header-content">
          <h1 className="app-title">{category.title}</h1>
          <p className="app-subtitle">{categoryBadges.length} сгруппированных значков</p>
          {category.introduction?.has_introduction && (
            <button
              onClick={onIntroductionClick}
              className="hint-button"
              title="Подсказка по категории"
            >
              💡 Подсказка
            </button>
          )}

          {category.id === '14' && category.additional_materials && (
            <div className="additional-materials-buttons">
              {category.additional_materials.checklists && (
                <>
                  <button
                    onClick={() => onAdditionalMaterialClick('checklist', 'general-checklist.md')}
                    className="material-button"
                    title="Общий чек‑лист"
                  >
                    📋 Общий чек‑лист
                  </button>
                  <button
                    onClick={() => onAdditionalMaterialClick('checklist', 'challenges-checklist.md')}
                    className="material-button"
                    title="Челленджи и задания"
                  >
                    🧩 Челленджи
                  </button>
                  <button
                    onClick={() => onAdditionalMaterialClick('checklist', 'active-checklist.md')}
                    className="material-button"
                    title="Активный чек‑лист"
                  >
                    ✅ Активный чек‑лист
                  </button>
                </>
              )}
              {category.additional_materials.methodology && (
                <button
                  onClick={() => onAdditionalMaterialClick('methodology', 'inspector-methodology.md')}
                  className="material-button"
                  title="Методология Инспектора"
                >
                  📘 Методология
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="badges-grid">
        {categoryBadges.map((badge, index) => (
          <article
            key={badge.id}
            className="badge-card floating"
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => onBadgeClick(badge)}
          >
            <div className="badge-card__icon">
              <div className="badge-emoji">
                {(badge.emoji || badge.badgeGroupEmoji) as React.ReactNode}
              </div>
            </div>
            <h3 className="badge-card__title">{badge.badgeGroupTitle || badge.title}</h3>
            <div className="badge-card__level">
              {badge.allLevels && badge.allLevels.length > 1
                ? `${badge.allLevels.length} ${pluralizeRu(badge.allLevels.length, ['уровень', 'уровня', 'уровней'])}`
                : 'одноуровневый'}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default CategoryView;
