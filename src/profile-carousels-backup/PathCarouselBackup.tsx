/**
 * Резервная реализация карусели «В пути» (path-carousel, cylinder, 21 слот, path-card 9:16).
 * Подключение: см. README.md в этой папке.
 */
import type React from 'react';
import { useEffect, useState } from 'react';
import BadgeIcon from '../components/BadgeIcon';
import type { Badge } from '../types/guide';

const DefaultIcons = {
  ArrowLeft: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  ArrowRight: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  Star: ({ filled }: { filled?: boolean }) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? '#FFD700' : 'none'}
      stroke={filled ? '#FFD700' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 12.27 17 17.14 18.18 21.02 12 17.77 5.82 21.02 7 17.14 2 12.27 8.91 8.26 12 2" />
    </svg>
  ),
  Trash: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Send: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
};

export type PathBadgeLookupItem = {
  title?: string;
  category_id?: string;
  emoji?: string;
  level?: string;
  criteria?: string;
  howToBecome?: string;
  nameExplanation?: string;
  skillTips?: string;
  confirmation?: string;
};

export interface PathCarouselBackupProps {
  activeLevels: [string, unknown][];
  badgeLookupMap: Map<string, PathBadgeLookupItem>;
  badges?: Badge[] | null;
  getBaseId: (rawId: string) => string;
  isFavorite: (baseId: string) => boolean;
  toggleFavorite: (baseId: string) => void;
  onNavigateToBadge: (baseId: string) => void;
  onOpenPlan: (params: {
    id: string;
    title: string;
    level?: string;
    criteria?: string;
    nameExplanation?: string;
    skillTips?: string;
    confirmation?: string;
  }) => void;
  onOpenProof: (params: { id: string; title: string }) => void;
  removeRoute: (baseId: string) => void;
  userData?: { diaryProgress?: { currentDay?: number } } | null;
  proofPhotoInputRef?: React.RefObject<HTMLInputElement | null>;
  /** Опционально: иконки из ProfileView (Icons), иначе используются встроенные */
  icons?: typeof DefaultIcons;
}

export default function PathCarouselBackup({
  activeLevels,
  badgeLookupMap,
  badges,
  getBaseId,
  isFavorite,
  toggleFavorite,
  onNavigateToBadge,
  onOpenPlan,
  onOpenProof,
  removeRoute,
  proofPhotoInputRef,
  icons = DefaultIcons,
}: PathCarouselBackupProps) {
  const [pathCarouselRotationSteps, setPathCarouselRotationSteps] = useState(0);
  const Icons = icons;

  useEffect(() => {
    if (activeLevels.length === 0) setPathCarouselRotationSteps(0);
  }, [activeLevels.length]);

  if (activeLevels.length === 0) {
    return (
      <p className="profile-route-details__empty">
        Нет значков в пути. Добавь значок в путь или в избранное.
      </p>
    );
  }

  return (
    <div className="path-carousel path-carousel--cylinder">
      <button
        type="button"
        className="path-carousel__btn path-carousel__btn--prev"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (activeLevels.length <= 1) return;
          setPathCarouselRotationSteps((s) => s - 1);
        }}
        disabled={activeLevels.length <= 1}
        aria-label="Вращать влево"
      >
        <Icons.ArrowLeft />
      </button>
      <div className="path-carousel__viewport path-carousel__viewport--cylinder">
        <div
          className="path-carousel__track path-carousel__track--cylinder"
          style={{ ['--path-rotation-steps' as string]: pathCarouselRotationSteps }}
        >
          {Array.from({ length: 21 }, (_, i) => i - 10).map((slotIndex) => {
            const n = activeLevels.length;
            const itemIndex = ((slotIndex % n) + n) % n;
            const [id] = activeLevels[itemIndex];
            const baseId = getBaseId(id);
            const levelBadge = badgeLookupMap.get(id) || badgeLookupMap.get(baseId);
            const titleFromFind = badges?.find(
              (b: Badge) =>
                String(b.id) === id ||
                String(b.id) === baseId ||
                String(b.id).startsWith(baseId + '.')
            )?.title;
            const displayTitle =
              levelBadge?.title ||
              titleFromFind ||
              (id && id.includes('.') ? `Значок ${baseId}` : id);
            const badgeTitleForImage = levelBadge?.title || titleFromFind || '';
            const isFav = isFavorite(baseId);
            const hubAnchorId = slotIndex === 0 ? `hub-badge-${id.replace(/\./g, '-')}` : undefined;
            return (
              <div
                key={`path-slot-${slotIndex}-${itemIndex}-${id}`}
                id={hubAnchorId}
                className="path-carousel__item path-carousel__item--cylinder"
                style={{ ['--slot-offset' as string]: slotIndex }}
              >
                <div className="path-card path-card--vertical">
                  <div className="path-card__avatar-wrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(baseId);
                      }}
                      className={`path-card__star ${isFav ? 'fav' : ''}`}
                      aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}
                    >
                      <Icons.Star filled={isFav} />
                    </button>
                    <div className="path-card__avatar" onClick={() => onNavigateToBadge(baseId)}>
                      <BadgeIcon
                        badgeId={baseId}
                        badgeTitle={badgeTitleForImage}
                        categoryId={levelBadge?.category_id || baseId.split('.')[0] || '1'}
                        emoji={levelBadge?.emoji || '🏆'}
                        size="responsive"
                        levelId={id !== baseId ? id : undefined}
                        levelTitle={id !== baseId ? levelBadge?.level : undefined}
                      />
                    </div>
                  </div>
                  <div
                    className="path-card__title"
                    onClick={() => onNavigateToBadge(baseId)}
                    title={id}
                  >
                    {displayTitle}
                  </div>
                  <div className="path-card__actions">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPlan({
                          id,
                          title: displayTitle,
                          level: levelBadge?.level,
                          criteria: levelBadge?.criteria || levelBadge?.howToBecome,
                          nameExplanation: levelBadge?.nameExplanation,
                          skillTips: levelBadge?.skillTips,
                          confirmation: levelBadge?.confirmation,
                        });
                      }}
                      className="btn-pill btn-pill--secondary"
                    >
                      Составить план
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (proofPhotoInputRef?.current) proofPhotoInputRef.current.value = '';
                        onOpenProof({ id, title: displayTitle });
                      }}
                      className="btn-pill btn-pill--primary"
                    >
                      Подтвердить <Icons.Send />
                    </button>
                  </div>
                  <div className="path-card__footer">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Удалить?')) removeRoute(baseId);
                      }}
                      className="btn-action-round trash"
                      aria-label="Удалить из пути"
                    >
                      <Icons.Trash />
                    </button>
                    <button
                      type="button"
                      className="btn-action-round btn-go-badge"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToBadge(baseId);
                      }}
                      title="Перейти к значку"
                      aria-label="Перейти к значку"
                    >
                      <Icons.ArrowRight />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        className="path-carousel__btn path-carousel__btn--next"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (activeLevels.length <= 1) return;
          setPathCarouselRotationSteps((s) => s + 1);
        }}
        disabled={activeLevels.length <= 1}
        aria-label="Вращать вправо"
      >
        <Icons.ArrowRight />
      </button>
    </div>
  );
}
