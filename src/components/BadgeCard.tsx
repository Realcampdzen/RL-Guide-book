import { memo } from 'react';
import BadgeIcon from './BadgeIcon';

const Icons = {
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
  ArrowRight: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
};

export interface BadgeCardProps {
  baseId: string;
  levelId?: string;
  displayTitle: string;
  badgeTitleForImage: string;
  categoryId: string;
  emoji: string;
  level?: string;
  criteria?: string;
  howToBecome?: string;
  nameExplanation?: string;
  skillTips?: string;
  confirmation?: string;
  isFav: boolean;
  onNavigateToBadge: (id: string) => void;
  onRemoveRoute: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const BadgeCard = memo(
  ({
    baseId,
    levelId,
    displayTitle,
    badgeTitleForImage,
    categoryId,
    emoji,
    level,
    criteria,
    howToBecome,
    nameExplanation,
    skillTips,
    confirmation,
    isFav,
    onNavigateToBadge,
    onRemoveRoute,
    onToggleFavorite,
  }: BadgeCardProps) => {
    const idValue = levelId && levelId !== baseId ? levelId : undefined;

    return (
      <div className="path-card path-card--vertical">
        <div className="path-card__avatar-wrap">
          <div className="path-card__avatar" onClick={() => onNavigateToBadge(baseId)}>
            <BadgeIcon
              badgeId={baseId}
              badgeTitle={badgeTitleForImage}
              categoryId={categoryId}
              emoji={emoji}
              size="responsive"
              levelId={idValue}
              levelTitle={idValue ? level : undefined}
            />
          </div>
        </div>
        <div className="path-card__actions">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(
                new CustomEvent('profile:openBadgePlan', {
                  detail: {
                    badgeInfo: {
                      id: levelId || baseId,
                      title: displayTitle,
                      level,
                      criteria: criteria || howToBecome,
                      nameExplanation,
                      skillTips,
                      confirmation,
                    },
                  },
                })
              );
            }}
            className="btn-pill btn-pill--secondary"
          >
            Составить план
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(
                new CustomEvent('profile:openBadgeProof', {
                  detail: {
                    badgeInfo: {
                      id: baseId,
                      title: displayTitle,
                    },
                  },
                })
              );
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
              if (window.confirm('Удалить?')) onRemoveRoute(baseId);
            }}
            className="btn-action-round trash"
            aria-label="Удалить из пути"
          >
            <Icons.Trash />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(baseId);
            }}
            className={`path-card__star ${isFav ? 'fav' : ''}`}
            aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}
          >
            <Icons.Star filled={isFav} />
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
    );
  }
);

BadgeCard.displayName = 'BadgeCard';
