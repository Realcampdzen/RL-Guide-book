/**
 * Утилиты для работы с изображениями значков
 * Структура: public/Новые значки/[Название категории]/[Название значка]/[Номер] [Название уровня].jpg
 */

// Маппинг ID категорий на названия папок
const categoryFolderMap: Record<string, string> = {
  '1': 'За личные достижения',
  // Добавим остальные по мере необходимости
};

// Нормализуем название значка для папки (убираем лишние символы, приводим к нижнему регистру)
const normalizeFolderName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/ё/g, 'е') // Заменяем все ё на е
    .replace(/[^\w\sа-яе-]/gi, '')
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
};

const getBadgeFolderName = (badgeTitle: string, badgeId: string, _levelTitle?: string): string => {
  // Явные маппинги для всех значков категории 1, теперь всё в нижнем регистре для стабильности
  if (badgeId === '1.1') return 'валюша';
  if (badgeId === '1.2') return 'беспорядок дня';
  if (badgeId === '1.3') return 'реальный победитель';
  if (badgeId === '1.4') return 'реальная звёздочка';
  if (badgeId === '1.5') return 'реальный умник';
  if (badgeId === '1.6') return 'котенок по имени бро';
  if (badgeId === '1.7') return 'влагере';
  if (badgeId === '1.8') return 'реальное чтение';
  if (badgeId === '1.9') return 'реальная сила';
  if (badgeId === '1.10') return 'реальный движ';
  if (badgeId === '1.11') return 'значок бесконечности';
  if (badgeId === '1.12') return 'конфетное дерево';
  if (badgeId === '1.13') return 'помощник вожатого';
  if (badgeId === '1.14') return 'реальный язык';
  if (badgeId === '1.15') return 'светлячок';
  if (badgeId === '1.16') return 'путеводитель';

  return normalizeFolderName(badgeTitle);
};

/**
 * Получает путь к изображению значка или уровня
 */
export const getBadgeImagePath = (
  badgeId: string,
  badgeTitle: string,
  categoryId: string,
  levelId?: string,
  levelTitle?: string,
  variant: 'default' | 'realism' = 'default'
): string | null => {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const categoryFolder = categoryFolderMap[categoryId];
  
  if (!categoryFolder) return null;

  const badgeFolderName = getBadgeFolderName(badgeTitle, badgeId, levelTitle);
  
  let fileName = '';
  
  if (levelId && levelTitle) {
    const levelNumber = levelId.split('.').pop();
    if (levelNumber) {
      let levelFileName = normalizeFolderName(levelTitle);
      fileName = `${levelNumber} ${levelFileName}.jpg`;
    }
  } else {
    // Базовый уровень
    let baseLevelTitle = badgeTitle;
    if (baseLevelTitle.includes(' или ')) baseLevelTitle = baseLevelTitle.split(' или ')[0].trim();
    if (baseLevelTitle.includes('\n')) baseLevelTitle = baseLevelTitle.split('\n')[0].trim();
    
    let baseLevelName = normalizeFolderName(baseLevelTitle);
    fileName = `1 ${baseLevelName}.jpg`;
  }

  if (!fileName) return null;

  // Формируем путь
  // Важно: на GitHub Pages пути чувствительны к регистру и символам
  // Используем encodeURIComponent для каждого сегмента пути отдельно
  // Убеждаемся, что baseUrl заканчивается на /
  const pathPrefix = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  
  let finalPath: string;
  if (variant === 'realism') {
    // Собираем путь из сегментов, кодируя каждый отдельно
    const segments = [
      'Новые значки',
      categoryFolder,
      badgeFolderName,
      'реализм',
      fileName
    ];
    finalPath = pathPrefix + segments.map(seg => encodeURIComponent(seg)).join('/');
  } else {
    const segments = [
      'Новые значки',
      categoryFolder,
      badgeFolderName,
      fileName
    ];
    finalPath = pathPrefix + segments.map(seg => encodeURIComponent(seg)).join('/');
  }

  return finalPath;
};

export const hasBadgeImage = (
  badgeId: string,
  badgeTitle: string,
  categoryId: string,
  levelId?: string,
  levelTitle?: string
): boolean => {
  const path = getBadgeImagePath(badgeId, badgeTitle, categoryId, levelId, levelTitle);
  return path !== null;
};