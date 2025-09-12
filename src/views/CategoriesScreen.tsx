import React from 'react';
import getCategoryIcon from '../components/CategoryIcon';

type CategoryLite = {
  id: string;
  title: string;
  emoji?: string;
  badge_count: number;
};

interface CategoriesScreenProps {
  categories: CategoryLite[];
  onBack: () => void;
  onSelectCategory: (category: any) => void;
}

const getCircleSize = (badgeCount: number) => {
  const minSize = 60;
  const maxSize = 120;
  const minBadges = 3;
  const maxBadges = 40;
  const normalized = Math.min(Math.max((badgeCount - minBadges) / (maxBadges - minBadges), 0), 1);
  const size = minSize + normalized * (maxSize - minSize);
  return Math.round(size);
};

const CategoriesScreen: React.FC<CategoriesScreenProps> = ({ categories, onBack, onSelectCategory }) => {
  return (
    <div className="categories-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">
          ← Назад к введению
        </button>
        <h1 className="app-title">Категории значков</h1>
        <p className="app-subtitle">Выберите категорию для просмотра</p>
      </div>

      <div className="categories-grid">
        {categories.map((category, index) => {
          const circleSize = getCircleSize(category.badge_count);
          return (
            <div
              key={category.id}
              className="category-container floating"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div
                className="category-card"
                style={{ width: `${circleSize}px`, height: `${circleSize}px` }}
                onClick={() => onSelectCategory(category)}
              >
                <div className="category-icon">{getCategoryIcon(category.id)}</div>
              </div>
              <div className="category-text">
                <h3>{category.title}</h3>
                <p>{category.badge_count} значков</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoriesScreen;
