// Загрузчик данных значков из папки ai-data/ для Vercel
import fs from 'fs';
import path from 'path';

// Кэш для данных
let badgeDataCache = null;
const categoriesCache = new Map();
const badgesCache = new Map();

export class DataLoaderAIData {
  constructor() {
    // В Vercel используем тот же файл данных, что и FastAPI
    this.dataPath = path.join(process.cwd(), 'perfect_parsed_data.json');
    console.log('📁 Путь к данным:', this.dataPath);
  }

  // Загружает все данные значков из perfect_parsed_data.json
  loadAllData() {
    if (badgeDataCache) {
      console.log('📦 Используем кэшированные данные');
      return badgeDataCache;
    }

    try {
      console.log('📂 Загружаем данные из perfect_parsed_data.json...');

      // Загружаем данные из единого JSON файла
      const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
      console.log('✅ Данные загружены:', {
        categories: data.totalCategories,
        badges: data.totalBadges,
        levels: data.totalLevels,
      });

      // Создаем кэш категорий
      data.categories.forEach((category) => {
        categoriesCache.set(category.id, category);
      });

      // Создаем кэш значков
      data.badges.forEach((badge) => {
        badgesCache.set(badge.id, badge);
      });

      // Сохраняем в кэш
      badgeDataCache = {
        categories: data.categories,
        badges: data.badges,
        totalCategories: data.totalCategories,
        totalBadges: data.totalBadges,
        totalLevels: data.totalLevels,
      };

      console.log('✅ Данные успешно загружены и кэшированы');
      return badgeDataCache;
    } catch (error) {
      console.error('❌ Ошибка загрузки данных:', error.message);
      console.error('📁 Путь к файлу:', this.dataPath);
      console.error('📂 Файл существует:', fs.existsSync(this.dataPath));

      // Возвращаем пустые данные вместо краша
      return { categories: [], badges: [] };
    }
  }

  // Получает категорию по ID
  getCategory(categoryId) {
    if (!badgeDataCache) {
      this.loadAllData();
    }
    return categoriesCache.get(categoryId);
  }

  // Получает значок по ID
  getBadge(badgeId) {
    if (!badgeDataCache) {
      this.loadAllData();
    }
    return badgesCache.get(badgeId);
  }

  // Получает все категории
  getAllCategories() {
    if (!badgeDataCache) {
      this.loadAllData();
    }
    return badgeDataCache.categories;
  }

  // Получает все значки
  getAllBadges() {
    if (!badgeDataCache) {
      this.loadAllData();
    }
    return badgeDataCache.badges;
  }

  // Получает значки по категории
  getBadgesByCategory(categoryId) {
    if (!badgeDataCache) {
      this.loadAllData();
    }
    return badgeDataCache.badges.filter((badge) => badge.category_id === categoryId);
  }

  // Получает статистику
  getStats() {
    if (!badgeDataCache) {
      this.loadAllData();
    }
    return {
      totalCategories: badgeDataCache.totalCategories,
      totalBadges: badgeDataCache.totalBadges,
      totalLevels: badgeDataCache.totalLevels,
    };
  }

  // Простой поиск по названию и описанию (аналог RAG для Vercel)
  searchBadges(query) {
    if (!badgeDataCache) {
      this.loadAllData();
    }

    const queryLower = query.toLowerCase();
    const results = [];

    // Поиск по названию значка
    for (const badge of badgeDataCache.badges) {
      if (badge.title.toLowerCase().includes(queryLower)) {
        results.push({ badge, matchType: 'title', score: 1.0 });
      }
    }

    // Поиск по описанию
    for (const badge of badgeDataCache.badges) {
      if (badge.description && badge.description.toLowerCase().includes(queryLower)) {
        // Проверяем, не добавили ли уже по названию
        const existingMatch = results.find((r) => r.badge.id === badge.id);
        if (!existingMatch) {
          results.push({ badge, matchType: 'description', score: 0.8 });
        }
      }
    }

    // Сортировка по релевантности
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, 5); // Возвращаем топ-5 результатов
  }

  // Поиск категории по названию
  searchCategories(query) {
    if (!badgeDataCache) {
      this.loadAllData();
    }

    const queryLower = query.toLowerCase();
    const results = [];

    for (const category of badgeDataCache.categories) {
      if (category.title.toLowerCase().includes(queryLower)) {
        results.push({ category, matchType: 'title', score: 1.0 });
      }
      if (category.description && category.description.toLowerCase().includes(queryLower)) {
        const existingMatch = results.find((r) => r.category.id === category.id);
        if (!existingMatch) {
          results.push({ category, matchType: 'description', score: 0.8 });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 3); // Возвращаем топ-3 результата
  }
}

// Создаем глобальный экземпляр
export const dataLoaderAIData = new DataLoaderAIData();
