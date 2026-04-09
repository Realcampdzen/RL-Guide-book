import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getBadgeImagePath, getPreferredBadgeImageVariant } from '../utils/badgeImages';
import { toSiblingImageUrl } from '../utils/imageSources';
import { useUserProgress } from '../hooks/useUserProgress';
import { parseAiSkinSlotIndex, parseApprovedArtSkinSlotIndex } from '../utils/badgeSkins';

interface BadgeIconProps {
  badgeId: string;
  badgeTitle: string;
  categoryId: string;
  emoji: string;
  levelId?: string;
  levelTitle?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'responsive';
}

/**
 * Компонент для отображения значка (изображение или эмодзи fallback)
 */
const BadgeIcon: React.FC<BadgeIconProps> = ({
  badgeId,
  badgeTitle,
  categoryId,
  emoji,
  levelId,
  levelTitle,
  className = '',
  size = 'medium',
}) => {
  const { userData } = useUserProgress();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [pathIndex, setPathIndex] = useState(0);
  const [useWebp, setUseWebp] = useState(true);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const baseBadgeId = useMemo(() => {
    const parts = String(badgeId || '').split('.').filter(Boolean);
    return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : badgeId;
  }, [badgeId]);

  const selectedSkin = useMemo(() => {
    return userData.selectedSkins?.[baseBadgeId] ?? userData.selectedSkins?.[badgeId];
  }, [userData.selectedSkins, baseBadgeId, badgeId]);

  const generatedSkins = useMemo(() => {
    return userData.generatedBadgeSkins?.[baseBadgeId] || [];
  }, [userData.generatedBadgeSkins, baseBadgeId]);

  const approvedSkins = useMemo(() => {
    return userData.approvedBadgeSkins?.[baseBadgeId] || [];
  }, [userData.approvedBadgeSkins, baseBadgeId]);

  const aiSkinImageUrl = useMemo(() => {
    const aiSlot = parseAiSkinSlotIndex(selectedSkin);
    if (aiSlot === null) return null;
    return generatedSkins[aiSlot] || null;
  }, [generatedSkins, selectedSkin]);

  const approvedSkinImageUrl = useMemo(() => {
    const approvedSlot = parseApprovedArtSkinSlotIndex(selectedSkin);
    if (approvedSlot === null) return null;
    return approvedSkins[approvedSlot] || null;
  }, [approvedSkins, selectedSkin]);

  const customImageUrl = useMemo(() => {
    if (selectedSkin === 'custom' && userData.customBadgeImages?.[baseBadgeId]) {
      return userData.customBadgeImages[baseBadgeId];
    }
    if (selectedSkin && (selectedSkin.startsWith('data:') || selectedSkin.startsWith('http') || selectedSkin.startsWith('/'))) {
      return selectedSkin;
    }
    return null;
  }, [selectedSkin, userData.customBadgeImages, baseBadgeId]);

  const variant = getPreferredBadgeImageVariant(categoryId);
  const variantOrder = useMemo<('default' | 'realism')[]>(
    () => {
      if (selectedSkin === 'realism') return ['realism', 'default'];
      if (selectedSkin === 'default') return ['default', 'realism'];
      return variant === 'realism' ? ['realism', 'default'] : ['default', 'realism'];
    },
    [variant, selectedSkin]
  );

  const imageCandidates = useMemo(() => {
    const candidates: string[] = [];
    const push = (path: string | null) => {
      if (!path) return;
      if (candidates.includes(path)) return;
      candidates.push(path);
      if (/\.jpg$/i.test(path)) {
        const pngPath = path.replace(/\.jpg$/i, '.png');
        if (!candidates.includes(pngPath)) {
          candidates.push(pngPath);
        }
      }
    };

    if (aiSkinImageUrl) {
      push(aiSkinImageUrl);
    }

    if (approvedSkinImageUrl) {
      push(approvedSkinImageUrl);
    }

    if (customImageUrl) {
      push(customImageUrl);
    }

    const altBadgeTitle = badgeTitle ? badgeTitle.replace(/-/g, ' ').replace(/\s+/g, ' ').trim() : badgeTitle;
    const altLevelTitle = levelTitle ? levelTitle.replace(/-/g, ' ').replace(/\s+/g, ' ').trim() : levelTitle;
    const hasAltTitle = altBadgeTitle !== badgeTitle || altLevelTitle !== levelTitle;

    if (levelId && levelTitle) {
      variantOrder.forEach((v) => {
        push(getBadgeImagePath(badgeId, badgeTitle, categoryId, levelId, levelTitle, v));
      });
      if (levelTitle !== badgeTitle) {
        variantOrder.forEach((v) => {
          push(getBadgeImagePath(badgeId, badgeTitle, categoryId, levelId, badgeTitle, v));
        });
      }

      if (hasAltTitle) {
        variantOrder.forEach((v) => {
          push(getBadgeImagePath(badgeId, altBadgeTitle || badgeTitle, categoryId, levelId, altLevelTitle, v));
        });
        if (altLevelTitle !== altBadgeTitle) {
          variantOrder.forEach((v) => {
            push(getBadgeImagePath(badgeId, altBadgeTitle || badgeTitle, categoryId, levelId, altBadgeTitle || badgeTitle, v));
          });
        }
      }
    }

    variantOrder.forEach((v) => {
      push(getBadgeImagePath(badgeId, badgeTitle, categoryId, undefined, undefined, v));
    });

    if (hasAltTitle) {
      variantOrder.forEach((v) => {
        push(getBadgeImagePath(badgeId, altBadgeTitle || badgeTitle, categoryId, undefined, undefined, v));
      });
    }

    return candidates;
  }, [badgeId, badgeTitle, categoryId, levelId, levelTitle, variantOrder, customImageUrl, aiSkinImageUrl, approvedSkinImageUrl]);

  const imagePath = imageCandidates[pathIndex] ?? null;
  const imageWebp = useWebp && imagePath ? toSiblingImageUrl(imagePath, 'webp') : null;

  // Stable key so the reset only fires when the actual URLs change, not on every re-render.
  const candidatesKey = imageCandidates.join('|');

  // Reset load/error state when the image source changes.
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
    setPathIndex(0);
    setUseWebp(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatesKey]);

  useEffect(() => {
    setUseWebp(true);
  }, [imagePath]);

  // If the image is already in cache, onLoad may not fire reliably in all browsers.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, [imagePath]);

  // Keep UI fast/quiet: no debug logs here.

  // Если изображение не найдено или произошла ошибка, показываем эмодзи
  if (!imagePath || imageError) {
    return (
      <div className={`badge-emoji ${className}`} style={{ fontSize: getEmojiSize(size) }}>
        {emoji}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: getImageSize(size),
        height: getImageSize(size),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: getImageSize(size),
        minHeight: getImageSize(size),
        overflow: 'hidden',
        borderRadius: '50%',
      }}
    >
      {!imageLoaded && !imageError && (
        <div className="badge-emoji" style={{ fontSize: getEmojiSize(size), opacity: 0.3, position: 'absolute', pointerEvents: 'none', zIndex: 1 }}>
          {emoji}
        </div>
      )}
      <picture>
        {imageWebp && <source type="image/webp" srcSet={imageWebp} />}
        <img
          ref={imgRef}
          src={imagePath}
          alt={levelTitle || badgeTitle}
          className="badge-image"
          loading="lazy"
          decoding="async"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            position: 'relative',
            zIndex: 10,
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          onLoad={(e) => {
            // Guard: if src changes quickly, make sure we mark the current one as loaded.
            if (e.currentTarget !== imgRef.current) {
              imgRef.current = e.currentTarget;
            }
            setImageLoaded(true);
          }}
          onError={(e) => {
            if (useWebp) {
              setUseWebp(false);
              setImageLoaded(false);
              return;
            }
            if (pathIndex < imageCandidates.length - 1) {
              setPathIndex((prev) => Math.min(prev + 1, imageCandidates.length - 1));
              setImageLoaded(false);
              setImageError(false);
              return;
            }
            console.error('BadgeIcon: image load error', { imagePath, badgeId, levelId, error: e });
            setImageError(true);
            setImageLoaded(false);
          }}
        />
      </picture>
    </div>
  );
};

// Размеры для эмодзи
const getEmojiSize = (size: 'small' | 'medium' | 'large' | 'xlarge' | 'responsive'): string => {
  switch (size) {
    case 'small':
      return '2rem';
    case 'medium':
      return '3rem';
    case 'large':
      return '4rem';
    case 'xlarge':
      return '2.7rem';
    case 'responsive':
      return '1em';
    default:
      return '3rem';
  }
};

// Размеры для изображений
// small: 48px - для маленьких элементов
// medium: 145px - для экрана категории (badge-card__icon 150px)
// large: 110px - для шапки значка (badge-hero-icon 120px)
// xlarge: 158px - для пузырей внизу справа (level-card__icon 160px, заполняет почти полностью)
// responsive: 100% - для контейнеров с динамическим размером
const getImageSize = (size: 'small' | 'medium' | 'large' | 'xlarge' | 'responsive'): string => {
  switch (size) {
    case 'small':
      return '48px';
    case 'medium':
      return '145px'; // Увеличено до 145px (контейнер 150px)
    case 'large':
      return '110px'; // Увеличено до 110px (контейнер 120px)
    case 'xlarge':
      return '100%'; // Для пузырей/контейнеров: заполняем доступный круг
    case 'responsive':
      return '100%';
    default:
      return '145px';
  }
};

export default BadgeIcon;
