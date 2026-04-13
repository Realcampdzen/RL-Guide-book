// Диагностический API endpoint для проверки данных
import { dataLoaderAIData } from '../data_loader_ai_data.js';

export default async function handler(req, res) {
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Добавляем timestamp для принудительного редеплоя
  console.log('🔄 Debug API вызван:', new Date().toISOString());

  if (req.method === 'GET') {
    try {
      console.log('🔍 Диагностика данных...');

      // Загружаем данные
      const data = dataLoaderAIData.loadAllData();

      // Получаем статистику
      const stats = dataLoaderAIData.getStats();

      // Получаем первые 3 категории
      const categories = dataLoaderAIData.getAllCategories();
      const firstCategories = categories.slice(0, 3).map((cat) => ({
        id: cat.id,
        title: cat.title,
        emoji: cat.emoji,
        badge_count: cat.badge_count,
      }));

      // Проверяем значок "Валюша"
      const valushaBadge = dataLoaderAIData.getBadge('1.1');

      const debugInfo = {
        status: 'success',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        data: {
          totalCategories: stats.totalCategories,
          totalBadges: stats.totalBadges,
          totalLevels: stats.totalLevels,
          firstCategories: firstCategories,
          valushaBadge: valushaBadge
            ? {
                id: valushaBadge.id,
                title: valushaBadge.title,
                emoji: valushaBadge.emoji,
                category: valushaBadge.category_title,
              }
            : null,
          allCategories: categories.map((cat) => cat.title),
        },
        errors: [],
      };

      console.log('✅ Диагностика завершена:', debugInfo);

      res.status(200).json(debugInfo);
    } catch (error) {
      console.error('❌ Ошибка диагностики:', error);

      const debugInfo = {
        status: 'error',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        error: {
          message: error.message,
          stack: error.stack,
        },
        data: null,
      };

      res.status(500).json(debugInfo);
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешен' });
  }
}
