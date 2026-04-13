// Новый DataLoader для Vercel с поддержкой ai-data структуры
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Получаем __dirname для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Кэш для данных
let masterIndexCache = null;
const categoriesCache = new Map();
const badgesCache = new Map();
const introductionsCache = new Map();

// Статистика загрузки
const loadStats = {
  masterIndexLoads: 0,
  categoryLoads: 0,
  badgeLoads: 0,
  introductionLoads: 0,
};

export class DataLoaderAIDataNew {
  constructor(basePath = null) {
    if (basePath === null) {
      // Автоматически определяем путь к ai-data
      const possiblePaths = [
        path.join(process.cwd(), 'public/ai-data'),
        path.join(process.cwd(), '../public/ai-data'),
        path.join(__dirname, '../public/ai-data'),
        path.join(__dirname, '../../public/ai-data'),
      ];

      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(path.join(possiblePath, 'MASTER_INDEX.json'))) {
          this.basePath = possiblePath;
          break;
        }
      }

      if (!this.basePath) {
        throw new Error('Не найдена папка ai-data с MASTER_INDEX.json');
      }
    } else {
      this.basePath = path.join(process.cwd(), basePath);
    }

    console.log('📁 Путь к ai-data:', this.basePath);
  }

  // Загружает MASTER_INDEX.json
  getMasterIndex() {
    if (masterIndexCache) {
      return masterIndexCache;
    }

    try {
      const masterIndexPath = path.join(this.basePath, 'MASTER_INDEX.json');
      const data = JSON.parse(fs.readFileSync(masterIndexPath, 'utf8'));

      masterIndexCache = data;
      loadStats.masterIndexLoads++;

      console.log('✅ MASTER_INDEX загружен:', {
        categories: data.totalCategories,
        badges: data.totalBadges,
        levels: data.totalLevels,
      });

      return data;
    } catch (error) {
      console.error('❌ Ошибка загрузки MASTER_INDEX:', error.message);
      return {};
    }
  }

  // Получает информацию о категории из MASTER_INDEX
  getCategoryInfo(categoryId) {
    const masterIndex = this.getMasterIndex();
    return masterIndex.categories?.find((cat) => cat.id === categoryId);
  }

  // Загружает категорию с её значками
  getCategory(categoryId) {
    if (categoriesCache.has(categoryId)) {
      return categoriesCache.get(categoryId);
    }

    try {
      const categoryInfo = this.getCategoryInfo(categoryId);
      if (!categoryInfo) {
        return null;
      }

      // Загружаем index.json категории
      const categoryPath = path.join(this.basePath, categoryInfo.path, 'index.json');
      const categoryData = JSON.parse(fs.readFileSync(categoryPath, 'utf8'));

      // Загружаем introduction.md если есть
      const introduction = this.getCategoryIntroduction(categoryId);

      // Загружаем все значки категории
      const badges = [];
      for (const badgeInfo of categoryData.badgesData || []) {
        const badge = this.getBadge(badgeInfo.id);
        if (badge) {
          badges.push(badge);
        }
      }

      // Создаем объект категории
      const category = {
        id: categoryId,
        title: categoryData.title,
        emoji: categoryInfo.emoji || '',
        path: categoryInfo.path,
        badges: badges,
        introduction: introduction,
        totalBadges: categoryData.badges || 0,
        totalLevels: categoryData.levels || 0,
      };

      categoriesCache.set(categoryId, category);
      loadStats.categoryLoads++;

      console.log(`✅ Категория ${categoryId} загружена:`, {
        badges: badges.length,
        hasIntroduction: !!introduction,
      });

      return category;
    } catch (error) {
      console.error(`❌ Ошибка загрузки категории ${categoryId}:`, error.message);
      return null;
    }
  }

  // Загружает конкретный значок
  getBadge(badgeId) {
    if (badgesCache.has(badgeId)) {
      return badgesCache.get(badgeId);
    }

    try {
      // Определяем категорию по ID значка
      const categoryId = badgeId.split('.')[0];
      const categoryInfo = this.getCategoryInfo(categoryId);
      if (!categoryInfo) {
        return null;
      }

      // Загружаем файл значка
      const badgePath = path.join(this.basePath, categoryInfo.path, `${badgeId}.json`);

      if (!fs.existsSync(badgePath)) {
        console.warn(`⚠️ Файл значка не найден: ${badgePath}`);
        return null;
      }

      const badgeData = JSON.parse(fs.readFileSync(badgePath, 'utf8'));

      badgesCache.set(badgeId, badgeData);
      loadStats.badgeLoads++;

      return badgeData;
    } catch (error) {
      console.error(`❌ Ошибка загрузки значка ${badgeId}:`, error.message);
      return null;
    }
  }

  // Загружает introduction.md категории
  getCategoryIntroduction(categoryId) {
    if (introductionsCache.has(categoryId)) {
      return introductionsCache.get(categoryId);
    }

    try {
      const categoryInfo = this.getCategoryInfo(categoryId);
      if (!categoryInfo) {
        return null;
      }

      const introductionPath = path.join(this.basePath, categoryInfo.path, 'introduction.md');

      if (!fs.existsSync(introductionPath)) {
        return null;
      }

      const introduction = fs.readFileSync(introductionPath, 'utf8');

      introductionsCache.set(categoryId, introduction);
      loadStats.introductionLoads++;

      return introduction;
    } catch (error) {
      console.error(`❌ Ошибка загрузки introduction для категории ${categoryId}:`, error.message);
      return null;
    }
  }

  // Поиск значков по запросу
  searchBadges(query) {
    const queryLower = query.toLowerCase();
    const results = [];

    // Сначала ищем в кэше
    for (const [badgeId, badge] of badgesCache) {
      if (
        badge.title.toLowerCase().includes(queryLower) ||
        (badge.description && badge.description.toLowerCase().includes(queryLower)) ||
        (badge.skillTips && badge.skillTips.toLowerCase().includes(queryLower))
      ) {
        results.push({ badge, matchType: 'exact', score: 1.0 });
      }
    }

    // Если недостаточно результатов, загружаем категории
    if (results.length < 5) {
      const masterIndex = this.getMasterIndex();
      for (const categoryInfo of masterIndex.categories || []) {
        const category = this.getCategory(categoryInfo.id);
        if (category) {
          for (const badge of category.badges) {
            const existingMatch = results.find((r) => r.badge.id === badge.id);
            if (!existingMatch) {
              if (
                badge.title.toLowerCase().includes(queryLower) ||
                (badge.description && badge.description.toLowerCase().includes(queryLower)) ||
                (badge.skillTips && badge.skillTips.toLowerCase().includes(queryLower))
              ) {
                results.push({ badge, matchType: 'category', score: 0.8 });
              }
            }
          }
        }
      }
    }

    // Сортировка по релевантности
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, 10); // Возвращаем максимум 10 результатов
  }

  // Поиск категорий по запросу
  searchCategories(query) {
    const queryLower = query.toLowerCase();
    const results = [];

    const masterIndex = this.getMasterIndex();
    for (const categoryInfo of masterIndex.categories || []) {
      if (categoryInfo.title.toLowerCase().includes(queryLower)) {
        results.push({ category: categoryInfo, matchType: 'title', score: 1.0 });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5); // Возвращаем максимум 5 результатов
  }

  // Получает все категории
  getAllCategories() {
    return this.getMasterIndex().categories || [];
  }

  // Получает все значки
  getAllBadges() {
    const allBadges = [];
    const masterIndex = this.getMasterIndex();

    for (const categoryInfo of masterIndex.categories || []) {
      const category = this.getCategory(categoryInfo.id);
      if (category) {
        allBadges.push(...category.badges);
      }
    }

    return allBadges;
  }

  // Получает значки по категории
  getBadgesByCategory(categoryId) {
    const category = this.getCategory(categoryId);
    return category ? category.badges : [];
  }

  // Получает статистику
  getStats() {
    return {
      ...loadStats,
      cachedCategories: categoriesCache.size,
      cachedBadges: badgesCache.size,
      cachedIntroductions: introductionsCache.size,
    };
  }

  // Очищает кэш
  clearCache() {
    masterIndexCache = null;
    categoriesCache.clear();
    badgesCache.clear();
    introductionsCache.clear();
    console.log('🧹 Кэш очищен');
  }

  // Предзагружает популярные категории
  preloadPopularCategories() {
    const popularCategories = ['1', '2', '7', '8', '11', '14'];
    for (const categoryId of popularCategories) {
      this.getCategory(categoryId);
    }
    console.log(`🚀 Предзагружены популярные категории: ${popularCategories.join(', ')}`);
  }

  // Получает контекст категории (introduction)
  getCategoryContext(categoryId) {
    return this.getCategoryIntroduction(categoryId);
  }
}

// Создаем глобальный экземпляр
export const dataLoaderAIDataNew = new DataLoaderAIDataNew();
