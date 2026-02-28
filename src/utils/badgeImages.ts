/**
 * Утилиты для работы с изображениями значков
 * Структура: public/Новые значки/[Название категории]/[Название значка]/[Номер] [Название уровня].webp
 */
import { badgeImagePathOverrides } from './badgeImageMap';

// Маппинг ID категорий на названия папок
const categoryFolderMap: Record<string, string> = {
  '1': 'За личные достижения',
  '2': 'за легендарные дела',
  '3': 'медия значки',
  '4': 'за лагерные дела',
  '5': 'за отрядные дела',
  '6': 'гармония и порядок',
  '7': 'за творческие достижения',
  '8': 'значки движков',
  '9': 'бро-значки',
  '10': 'значки на флаг отряда',
  '11': 'реальность осознанность и внимательность',
  '12': 'ии нейросети для обучения и творчества',
  '13': 'софт-скиллз интенсив',
  '14': 'значки инспектора пользы',
};

// Нормализуем название значка для папки (убираем лишние символы, приводим к нижнему регистру)
const normalizeFolderName = (name: string): string => {
  let out = name.toLowerCase();

  // Special-case dot-separated abbreviations like "Д.А.Р.Л.":
  // turn dots into spaces so file names can be "д а р л".
  const compact = out.replace(/\s+/g, '');
  if (/^(?:[a-zа-яё]\.){2,}[a-zа-яё]\.?$/i.test(compact)) {
    out = out.replace(/\./g, ' ');
  }

  return out
    .replace(/ё/g, 'е') // Заменяем все ё на е
    // Normalize different dash characters to spaces (e.g. мастер‑класс -> мастер класс)
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, ' ')
    .replace(/[^\w\sа-яе-]/gi, '')
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
};

const badgeFolderOverrides: Record<string, string> = {
  // Category 12 (explicit folder casing on disk)
  '12.1': 'Реальный AI-Композитор',
  '12.6': 'реальный вайбкодер',
  // Category 13 (folders use Title Case on disk)
  '13.1': 'Путь Вожатого',
  '13.2': 'Командный Игрок',
  '13.3': 'Реальный Конфликтолог',
  '13.4': 'Творческий подход',
  '13.5': 'Управление Временем',
  '13.6': 'Реальный Оратор',
  '13.7': 'Реальный Переговорщик',
  '13.8': 'Интеллектуальный Оркестр',
  '13.9': 'Реальный Фасилитатор',
  '13.10': 'Реальная Логика',
  '13.11': 'Реальный Изобретатель',
  '13.12': 'Критическое мышление',
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

  // Категория 2: точечные исключения под текущую структуру папок
  // (например, папка на диске с заглавными буквами)
  if (badgeId === '2.4') return 'Реальный Лагерь';

  // Категория 4: точечные исключения под папки на диске
  if (badgeId === '4.2') return 'реальаня зарядка';
  if (badgeId === '4.3') return 'реальный мастер-класс';
  if (badgeId === '4.4') return 'Шерлок';

  const override = badgeFolderOverrides[badgeId];
  if (override) return override;

  return normalizeFolderName(badgeTitle);
};

const realismOnlyCategoryIds = new Set(['8', '9', '10', '11', '12', '13']);

export const getPreferredBadgeImageVariant = (categoryId: string): 'default' | 'realism' => {
  return realismOnlyCategoryIds.has(String(categoryId)) ? 'realism' : 'default';
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
  const pathPrefix = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const overrideKey = levelId || badgeId;
  const overridePath = overrideKey ? badgeImagePathOverrides[overrideKey] : undefined;
  if (overridePath) {
    if (variant === 'realism') {
      const hasRealismSegment =
        overridePath.includes('%D1%80%D0%B5%D0%B0%D0%BB%D0%B8%D0%B7%D0%BC') ||
        overridePath.includes('реализм');
      if (hasRealismSegment) {
        return pathPrefix + overridePath;
      }
      const parts = overridePath.split('/');
      if (parts.length >= 4) {
        const realismSegment = encodeURIComponent('реализм');
        const insertIndex = parts.length - 1;
        const withRealism = [
          ...parts.slice(0, insertIndex),
          realismSegment,
          ...parts.slice(insertIndex)
        ].join('/');
        return pathPrefix + withRealism;
      }
    } else {
      return pathPrefix + overridePath;
    }
  }

  const categoryFolder = categoryFolderMap[categoryId];
  
  if (!categoryFolder) return null;

  const badgeFolderName = getBadgeFolderName(badgeTitle, badgeId, levelTitle);
  
  let fileName = '';
  
  if (levelId && levelTitle) {
    const levelNumber = levelId.split('.').pop();
    if (levelNumber) {
      // File names in assets use spaces more often than hyphens.
      let levelFileName = normalizeFolderName(levelTitle.replace(/-/g, ' '));
      fileName = `${levelNumber} ${levelFileName}.webp`;
    }
  } else {
    // Базовый уровень
    // Category 4.4: base icon should be the first level ("Шерлок"), not "Д.А.Р.Л."
    if (badgeId === '4.4') {
      fileName = '1 шерлок.webp';
    } else {
      let baseLevelTitle = badgeTitle;
      if (!baseLevelTitle) baseLevelTitle = getBadgeFolderName(badgeTitle, badgeId, levelTitle);
      if (baseLevelTitle.includes(' или ')) baseLevelTitle = baseLevelTitle.split(' или ')[0].trim();
      if (baseLevelTitle.includes('\n')) baseLevelTitle = baseLevelTitle.split('\n')[0].trim();

      let baseLevelName = normalizeFolderName(baseLevelTitle.replace(/-/g, ' '));
      fileName = `1 ${baseLevelName}.webp`;
    }
  }

  if (!fileName) return null;

  // Badge 12.6 uses "вайб кодер" in filenames on disk.
  if (badgeId === '12.6') {
    fileName = fileName.replace('вайбкодер', 'вайб кодер');
  }

  // Формируем путь
  // Важно: на GitHub Pages пути чувствительны к регистру и символам
  // Используем encodeURIComponent для каждого сегмента пути отдельно
  // Убеждаемся, что baseUrl заканчивается на /
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
