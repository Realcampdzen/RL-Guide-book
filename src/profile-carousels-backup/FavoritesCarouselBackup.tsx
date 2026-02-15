/**
 * Резервная реализация карусели «Избранное» (shelf, cylinder, 21 слот).
 * Подключение: см. README.md в этой папке.
 */
import { useEffect, useState } from 'react';
import BadgeIcon from '../components/BadgeIcon';

const DefaultIcons = {
  ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  ArrowRight: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  XCircle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10" opacity="0.3"/><path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>,
};

export type BadgeLookupItem = { category_id?: string; emoji?: string; title?: string };

export interface FavoritesCarouselBackupProps {
  favorites: string[];
  badgeLookupMap: Map<string, BadgeLookupItem>;
  getBaseId: (rawId: string) => string;
  toggleFavorite: (baseId: string) => void;
  onNavigateToBadge: (baseId: string) => void;
  /** Опционально: иконки из ProfileView (Icons), иначе используются встроенные */
  icons?: typeof DefaultIcons;
}

export default function FavoritesCarouselBackup({
  favorites,
  badgeLookupMap,
  getBaseId,
  toggleFavorite,
  onNavigateToBadge,
  icons = DefaultIcons,
}: FavoritesCarouselBackupProps) {
  const [carouselRotationSteps, setCarouselRotationSteps] = useState(0);
  const Icons = icons;

  useEffect(() => {
    if (favorites.length === 0) setCarouselRotationSteps(0);
  }, [favorites.length]);

  return (
    <div className="favorites-shelf-container">
      <div className="shelf-header">Избранное ⭐</div>
      {favorites.length > 0 ? (
        <div className="shelf-carousel shelf-carousel--cylinder">
          <button
            type="button"
            className="shelf-carousel__btn shelf-carousel__btn--prev"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (favorites.length <= 1) return;
              setCarouselRotationSteps((s) => s - 1);
            }}
            disabled={favorites.length <= 1}
            aria-label="Вращать влево"
          >
            <Icons.ArrowLeft />
          </button>
          <div className="shelf-viewport shelf-viewport--cylinder">
            <div
              className="shelf-track shelf-track--cylinder"
              style={{ ['--carousel-rotation-steps' as string]: carouselRotationSteps }}
            >
              {Array.from({ length: 21 }, (_, i) => i - 10).map((slotIndex) => {
                const n = favorites.length;
                const favIndex = ((slotIndex % n) + n) % n;
                const id = favorites[favIndex];
                return (
                  <div
                    key={`slot-${slotIndex}-${favIndex}-${id}`}
                    className="shelf-item shelf-item--cylinder"
                    style={{ ['--slot-offset' as string]: slotIndex }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToBadge(getBaseId(id));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onNavigateToBadge(getBaseId(id));
                        }
                      }}
                    >
                      <BadgeIcon
                        badgeId={getBaseId(id)}
                        badgeTitle=""
                        categoryId={badgeLookupMap.get(getBaseId(id))?.category_id || getBaseId(id).split('.')[0] || '1'}
                        emoji={badgeLookupMap.get(getBaseId(id))?.emoji || '🏆'}
                        size="small"
                      />
                    </div>
                    <button
                      className="btn-shelf-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(getBaseId(id));
                      }}
                    >
                      <Icons.XCircle />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            className="shelf-carousel__btn shelf-carousel__btn--next"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (favorites.length <= 1) return;
              setCarouselRotationSteps((s) => s + 1);
            }}
            disabled={favorites.length <= 1}
            aria-label="Вращать вправо"
          >
            <Icons.ArrowRight />
          </button>
        </div>
      ) : (
        <p className="favorites-shelf-container__empty">Пока пусто</p>
      )}
    </div>
  );
}
