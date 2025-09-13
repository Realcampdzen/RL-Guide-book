// Загрузчик данных значков из папки ai-data/ для Vercel
import fs from 'fs';
import path from 'path';

// Кэш для данных
let badgeDataCache = null;
let categoriesCache = new Map();
let badgesCache = new Map();

export class DataLoaderAIData {
  constructor() {
    // В Vercel используем единый JSON файл с данными
    this.dataPath = path.join(process.cwd(), 'ai_data_complete.json');
    console.log('📁 Путь к данным:', this.dataPath);
  }

  // Загружает все данные значков из ai_data_complete.json
  loadAllData() {
    if (badgeDataCache) {
      console.log('📦 Используем кэшированные данные');
      return badgeDataCache;
    }

    try {
      console.log('📂 Загружаем данные из ai_data_complete.json...');
      
      // Загружаем данные из единого JSON файла
      const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
      console.log('✅ Данные загружены:', {
        categories: data.totalCategories,
        badges: data.totalBadges,
        levels: data.totalLevels
      });
      
      // Создаем кэш категорий
      data.categories.forEach(category => {
        categoriesCache.set(category.id, category);
      });
      
      // Создаем кэш значков
      data.badges.forEach(badge => {
        badgesCache.set(badge.id, badge);
      });

      // Сохраняем в кэш
      badgeDataCache = {
        categories: data.categories,
        badges: data.badges,
        totalCategories: data.totalCategories,
        totalBadges: data.totalBadges,
        totalLevels: data.totalLevels
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
    return badgeDataCache.badges.filter(badge => badge.category_id === categoryId);
  }

  // Получает статистику
  getStats() {
    if (!badgeDataCache) {
      this.loadAllData();
    }
    return {
      totalCategories: badgeDataCache.totalCategories,
      totalBadges: badgeDataCache.totalBadges,
      totalLevels: badgeDataCache.totalLevels
    };
  }
}

// Создаем глобальный экземпляр
export const dataLoaderAIData = new DataLoaderAIData();
