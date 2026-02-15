// Тест локального data_loader_ai_data.js
import { DataLoaderAIData } from './data_loader_ai_data.js';

console.log('🧪 Тестируем локальный data_loader_ai_data.js...\n');

try {
  const dataLoader = new DataLoaderAIData();
  console.log('✅ DataLoaderAIData создан');
  
  const data = dataLoader.loadAllData();
  console.log('✅ Данные загружены:', {
    categories: data.totalCategories,
    badges: data.totalBadges,
    levels: data.totalLevels
  });
  
  // Проверяем первые 3 категории
  const categories = dataLoader.getAllCategories();
  console.log('\n📋 Первые 3 категории:');
  categories.slice(0, 3).forEach(category => {
    console.log(`- ${category.emoji} ${category.title} (${category.badge_count} значков)`);
  });
  
  // Проверяем конкретный значок
  const valushaBadge = dataLoader.getBadge('1.1');
  if (valushaBadge) {
    console.log(`\n✅ Значок "Валюша" найден:`, {
      id: valushaBadge.id,
      title: valushaBadge.title,
      emoji: valushaBadge.emoji,
      category: valushaBadge.category_title
    });
  } else {
    console.log('\n❌ Значок "Валюша" НЕ найден');
  }
  
  // Проверяем категорию "За личные достижения"
  const personalCategory = dataLoader.getCategory('1');
  if (personalCategory) {
    console.log(`\n✅ Категория "За личные достижения" найдена:`, {
      id: personalCategory.id,
      title: personalCategory.title,
      badges: personalCategory.badges.length
    });
  } else {
    console.log('\n❌ Категория "За личные достижения" НЕ найдена');
  }
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  console.error('Stack:', error.stack);
}
