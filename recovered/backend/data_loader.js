// Загрузчик данных значков для Vercel
import fs from 'fs';
import path from 'path';

// Кэш для данных
let badgeDataCache = null;
let categoriesCache = new Map();
let badgesCache = new Map();

export class DataLoader {
  constructor() {
    this.dataPath = path.join(process.cwd(), 'perfect_parsed_data.json');
  }

  // Загружает все данные значков
  loadAllData() {
    if (badgeDataCache) {
      return badgeDataCache;
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
      
      // Загружаем категории
      const categories = data.categories.map(catInfo => {
        const category = {
          id: catInfo.id,
          title: catInfo.title,
          emoji: this.getCategoryEmoji(catInfo.id),
          path: `category-${catInfo.id}`,
          badges: [],
          introduction: null,
          philosophy: null
        };
        
        categoriesCache.set(category.id, category);
        return category;
      });

      // Загружаем значки
      const badgeGroups = new Map();
      
      data.badges.forEach(badgeData => {
        const badgeId = badgeData.id;
        const baseId = badgeId.includes('.') ? badgeId.split('.').slice(0, 2).join('.') : badgeId;
        
        if (!badgeGroups.has(baseId)) {
          badgeGroups.set(baseId, []);
        }
        badgeGroups.get(baseId).push(badgeData);
      });

      // Создаем значки с уровнями
      badgeGroups.forEach((badgeGroup, baseId) => {
        const mainBadge = badgeGroup[0];
        
        // Создаем уровни
        const levels = badgeGroup.map(levelData => ({
          id: levelData.id,
          level: levelData.level || "Базовый уровень",
          title: levelData.title,
          emoji: levelData.emoji,
          criteria: levelData.criteria || "",
          confirmation: levelData.confirmation || ""
        }));

        // Создаем значок
        const badge = {
          id: baseId,
          title: mainBadge.title,
          emoji: mainBadge.emoji,
          categoryId: mainBadge.category_id,
          description: mainBadge.description || "",
          nameExplanation: mainBadge.nameExplanation || null,
          skillTips: mainBadge.skillTips || null,
          examples: mainBadge.examples || null,
          philosophy: mainBadge.philosophy || null,
          howToBecome: mainBadge.howToBecome || null,
          levels: levels
        };

        badgesCache.set(badge.id, badge);
        
        // Добавляем значок в категорию
        const category = categoriesCache.get(badge.categoryId);
        if (category) {
          category.badges.push(badge);
        }
      });

      badgeDataCache = {
        project: "Путеводитель",
        version: "1.0",
        totalCategories: categories.length,
        totalBadges: badgesCache.size,
        categories: categories
      };

      return badgeDataCache;
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      throw error;
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
    return Array.from(badgesCache.values());
  }

  // Поиск значков по запросу
  searchBadges(query) {
    if (!badgeDataCache) {
      this.loadAllData();
    }
    
    const queryLower = query.toLowerCase();
    return Array.from(badgesCache.values()).filter(badge => 
      badge.title.toLowerCase().includes(queryLower) ||
      badge.description.toLowerCase().includes(queryLower)
    );
  }

  // Получает эмодзи для категории
  getCategoryEmoji(categoryId) {
    const emojis = {
      '1': '⭐',
      '2': '🌟', 
      '3': '📱',
      '4': '🏕',
      '5': '👥',
      '6': '🎵',
      '7': '🎨',
      '8': '🚀',
      '9': '💪',
      '10': '🏁',
      '11': '🧘',
      '12': '🤖',
      '13': '💪',
      '14': '🔍'
    };
    return emojis[categoryId] || '📋';
  }

  // Получает статистику
  getStats() {
    if (!badgeDataCache) {
      this.loadAllData();
    }
    
    return {
      totalCategories: badgeDataCache.totalCategories,
      totalBadges: badgeDataCache.totalBadges,
      totalLevels: Array.from(badgesCache.values()).reduce((sum, badge) => sum + badge.levels.length, 0)
    };
  }
}

// Создаем глобальный экземпляр
export const dataLoader = new DataLoader();
