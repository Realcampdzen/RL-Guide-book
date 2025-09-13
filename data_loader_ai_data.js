// Загрузчик данных значков из папки ai-data/ для Vercel
import fs from 'fs';
import path from 'path';

// Кэш для данных
let badgeDataCache = null;
let categoriesCache = new Map();
let badgesCache = new Map();

export class DataLoaderAIData {
  constructor() {
    // В Vercel файлы находятся в корне проекта
    this.aiDataPath = path.join(process.cwd(), 'ai-data');
    this.masterIndexPath = path.join(this.aiDataPath, 'MASTER_INDEX.json');
    console.log('📁 Путь к ai-data:', this.aiDataPath);
    console.log('📁 Путь к MASTER_INDEX:', this.masterIndexPath);
  }

  // Загружает все данные значков из ai-data/
  loadAllData() {
    if (badgeDataCache) {
      console.log('📦 Используем кэшированные данные из ai-data');
      return badgeDataCache;
    }

    try {
      console.log('📂 Загружаем данные из ai-data...');
      
      // Загружаем MASTER_INDEX
      const masterIndex = JSON.parse(fs.readFileSync(this.masterIndexPath, 'utf8'));
      console.log('✅ MASTER_INDEX загружен:', {
        categories: masterIndex.totalCategories,
        badges: masterIndex.totalBadges,
        levels: masterIndex.totalLevels
      });
      
      // Загружаем категории
      const categories = masterIndex.categories.map(catInfo => {
        const categoryPath = path.join(this.aiDataPath, catInfo.path);
        const categoryIndexPath = path.join(categoryPath, 'index.json');
        
        let categoryData = null;
        try {
          categoryData = JSON.parse(fs.readFileSync(categoryIndexPath, 'utf8'));
        } catch (error) {
          console.warn(`⚠️ Не удалось загрузить ${categoryIndexPath}:`, error.message);
          categoryData = {
            categoryId: catInfo.id,
            title: catInfo.title,
            badges: 0,
            levels: 0,
            badgesData: []
          };
        }
        
        const category = {
          id: catInfo.id,
          title: catInfo.title,
          emoji: catInfo.emoji,
          path: catInfo.path,
          badges: categoryData.badgesData || [],
          badge_count: categoryData.badges || 0,
          introduction: null,
          philosophy: null
        };
        
        categoriesCache.set(category.id, category);
        return category;
      });

      // Загружаем значки из всех категорий
      let allBadges = [];
      categories.forEach(category => {
        category.badges.forEach(badgeData => {
          const badge = {
            id: badgeData.id,
            title: badgeData.title,
            emoji: badgeData.emoji,
            category_id: category.id,
            category_title: category.title,
            levels: badgeData.levels || [],
            description: `${badgeData.title} - значок категории "${category.title}"`,
            criteria: `Критерии для получения значка "${badgeData.title}"`,
            benefits: `Польза от получения значка "${badgeData.title}"`
          };
          
          badgesCache.set(badge.id, badge);
          allBadges.push(badge);
        });
      });

      // Создаем кэш данных
      badgeDataCache = {
        categories: categories,
        badges: allBadges,
        totalCategories: masterIndex.totalCategories,
        totalBadges: masterIndex.totalBadges,
        totalLevels: masterIndex.totalLevels
      };

      console.log('✅ Данные из ai-data загружены:', {
        categories: badgeDataCache.totalCategories,
        badges: badgeDataCache.totalBadges,
        levels: badgeDataCache.totalLevels
      });

      return badgeDataCache;
    } catch (error) {
      console.error('❌ Ошибка загрузки данных из ai-data:', error.message);
      console.error('📁 Путь к ai-data:', this.aiDataPath);
      console.error('📂 Папка существует:', fs.existsSync(this.aiDataPath));
      
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
