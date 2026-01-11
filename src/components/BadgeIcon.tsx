import React, { useState, useEffect } from 'react';
import { getBadgeImagePath } from '../utils/badgeImages';

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
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const imagePath = getBadgeImagePath(badgeId, badgeTitle, categoryId, levelId, levelTitle);

  // Проверяем, загружено ли изображение сразу (для кэшированных изображений)
  useEffect(() => {
    if (imagePath && !imageError && !imageLoaded) {
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
      };
      img.onerror = () => {
        setImageError(true);
      };
      img.src = imagePath;
    }
  }, [imagePath, imageError, imageLoaded]);

  // Отладочное логирование для значков 1.2 и 1.4
  if (badgeId === '1.2' || badgeId === '1.4') {
    console.log('BadgeIcon debug:', {
      badgeId,
      badgeTitle,
      categoryId,
      levelId,
      levelTitle,
      imagePath,
      hasPath: !!imagePath
    });
  }

  // Если изображение не найдено или произошла ошибка, показываем эмодзи
  if (!imagePath || imageError) {
    if ((badgeId === '1.2' || badgeId === '1.4') && !imagePath) {
      console.warn('BadgeIcon: imagePath is null', { badgeId, categoryId, badgeTitle, levelId, levelTitle });
    }
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
      <img
        src={imagePath}
        alt={levelTitle || badgeTitle}
        className="badge-image"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          position: 'relative',
          zIndex: 10,
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        onLoad={(e) => {
          const img = e.currentTarget;
          console.log('BadgeIcon: image loaded successfully (onLoad)', { 
            imagePath, 
            badgeId, 
            levelId, 
            imgWidth: img.naturalWidth,
            imgHeight: img.naturalHeight,
          });
          setImageLoaded(true);
        }}
        onError={(e) => {
          console.error('BadgeIcon: image load error', { imagePath, badgeId, levelId, error: e });
          setImageError(true);
          setImageLoaded(false);
        }}
      />
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
      return '4.5rem';
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
      return '158px'; // Пузыри внизу справа - заполняет контейнер 160px почти полностью
    case 'responsive':
      return '100%';
    default:
      return '145px';
  }
};

export default BadgeIcon;
