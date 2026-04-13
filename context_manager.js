// Система управления контекстом пользователя для Vercel
import { dataLoaderAIDataNew } from './data_loader_ai_data_new.js';

// В памяти храним контексты (в продакшене лучше использовать Redis)
const userContexts = new Map();
const conversationHistories = new Map();

export class ContextManager {
  constructor() {
    this.dataLoader = dataLoaderAIDataNew;
  }

  // Получает контекст пользователя
  getUserContext(userId) {
    if (!userContexts.has(userId)) {
      userContexts.set(userId, {
        user_id: userId,
        current_category: null,
        current_badge: null,
        interests: [],
        level: 'beginner',
        session_data: {},
      });
    }
    return userContexts.get(userId);
  }

  // Обновляет контекст пользователя
  updateUserContext(userId, updates) {
    const context = this.getUserContext(userId);

    Object.assign(context, updates);
    userContexts.set(userId, context);

    return context;
  }

  // Обновляет веб-контекст
  updateWebContext(userId, webContext) {
    const context = this.getUserContext(userId);

    // Обновляем контекст на основе веб-интерфейса
    if (webContext.current_category) {
      context.current_category = webContext.current_category.id || webContext.current_category;
    }

    if (webContext.current_badge) {
      const rawBadgeId = webContext.current_badge.id || webContext.current_badge;
      // Нормализуем ID значка: если это уровень вида 11.3.2 -> приводим к базовому 11.3
      if (typeof rawBadgeId === 'string' && rawBadgeId.split('.').length >= 3) {
        const parts = rawBadgeId.split('.');
        context.current_badge = parts.slice(0, 2).join('.');
      } else {
        context.current_badge = rawBadgeId;
      }

      // Убеждаемся, что категория установлена
      if (webContext.current_badge.category_id) {
        context.current_category = webContext.current_badge.category_id;
      }
    }

    // Если веб-контекст явно не задаёт категорию/значок — очищаем
    if (webContext.current_badge === null) {
      context.current_badge = null;
    }
    if (webContext.current_category === null && context.current_badge === null) {
      context.current_category = null;
    }

    // Сохраняем информацию о текущем экране
    context.session_data.current_view = webContext.current_view;
    context.session_data.web_category = webContext.current_category;
    context.session_data.web_badge = webContext.current_badge;
    context.session_data.current_level = webContext.current_level;
    context.session_data.current_level_badge_title = webContext.current_level_badge_title;

    userContexts.set(userId, context);

    console.log(`🔄 Обновлен контекст для пользователя ${userId}:`);
    console.log(`   📱 Экран: ${webContext.current_view}`);
    console.log(`   📁 Категория: ${context.current_category}`);
    console.log(`   🏆 Значок: ${context.current_badge}`);
    if (webContext.current_level_badge_title) {
      console.log(`   🎯 Название уровня: ${webContext.current_level_badge_title}`);
    }

    return context;
  }

  // Определяет контекст из сообщения
  detectContextFromMessage(userId, message) {
    const context = this.getUserContext(userId);
    const messageLower = message.toLowerCase();

    // Поиск упоминаний категорий (только если не установлена из веб-контекста)
    if (!context.current_category) {
      const categories = this.dataLoader.getAllCategories();
      for (const category of categories) {
        const categoryTitleLower = category.title.toLowerCase();
        if (
          categoryTitleLower === messageLower ||
          messageLower.includes(categoryTitleLower) ||
          category.emoji === message ||
          messageLower.includes(`категория ${category.id}`) ||
          messageLower.includes(`категории ${category.id}`)
        ) {
          context.current_category = category.id;
          context.current_badge = null; // Сбрасываем значок при смене категории
          break;
        }
      }
    }

    // Поиск упоминаний значков (только если не установлен из веб-контекста)
    if (!context.current_badge) {
      const allBadges = this.dataLoader.getAllBadges();
      for (const badge of allBadges) {
        const badgeTitleLower = badge.title.toLowerCase();
        if (
          badgeTitleLower === messageLower ||
          messageLower.includes(badgeTitleLower) ||
          badge.emoji === message ||
          messageLower.includes(`значок ${badge.id}`) ||
          messageLower.includes(`значка ${badge.id}`)
        ) {
          context.current_badge = badge.id;
          if (!context.current_category) {
            context.current_category = badge.categoryId;
          }
          break;
        }
      }
    }

    // Определение интересов по ключевым словам
    const interestKeywords = {
      творчество: ['творчество', 'рисование', 'музыка', 'танцы', 'театр'],
      спорт: ['спорт', 'бег', 'футбол', 'плавание', 'фитнес'],
      наука: ['наука', 'эксперименты', 'математика', 'физика', 'химия'],
      природа: ['природа', 'экология', 'животные', 'растения', 'лес'],
      технологии: ['технологии', 'программирование', 'роботы', 'компьютеры'],
      общение: ['общение', 'дружба', 'команда', 'лидерство', 'помощь'],
    };

    const detectedInterests = [];
    for (const [interest, keywords] of Object.entries(interestKeywords)) {
      if (keywords.some((keyword) => messageLower.includes(keyword))) {
        if (!context.interests.includes(interest)) {
          detectedInterests.push(interest);
        }
      }
    }

    if (detectedInterests.length > 0) {
      context.interests.push(...detectedInterests);
      context.interests = [...new Set(context.interests)]; // Убираем дубликаты
    }

    // Определение уровня по ключевым словам
    if (
      messageLower.includes('новичок') ||
      messageLower.includes('начинающий') ||
      messageLower.includes('первый раз')
    ) {
      context.level = 'beginner';
    } else if (
      messageLower.includes('опытный') ||
      messageLower.includes('продвинутый') ||
      messageLower.includes('уже делал')
    ) {
      context.level = 'advanced';
    } else if (
      messageLower.includes('эксперт') ||
      messageLower.includes('мастер') ||
      messageLower.includes('профессионал')
    ) {
      context.level = 'expert';
    }

    userContexts.set(userId, context);
    return context;
  }

  // Получает историю сообщений
  getConversationHistory(userId) {
    if (!conversationHistories.has(userId)) {
      conversationHistories.set(userId, []);
    }
    return conversationHistories.get(userId);
  }

  // Добавляет сообщение в историю
  addMessageToHistory(userId, message) {
    const history = this.getConversationHistory(userId);
    history.push({
      role: message.role,
      content: message.content,
      timestamp: new Date().toISOString(),
      metadata: message.metadata || {},
    });

    // Ограничиваем историю последними 20 сообщениями
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    conversationHistories.set(userId, history);
  }

  // Получает персонализированные рекомендации
  getPersonalizedRecommendations(userId, limit = 5) {
    const context = this.getUserContext(userId);
    const recommendations = [];

    // Получаем все значки
    const allBadges = this.dataLoader.getAllBadges();

    for (const badge of allBadges) {
      const score = this.calculateBadgeScore(badge, context);
      if (score > 0) {
        recommendations.push({
          badge: badge,
          category: this.dataLoader.getCategory(badge.categoryId),
          score: score,
          reason: this.getRecommendationReason(badge, context),
        });
      }
    }

    // Сортируем по релевантности
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations.slice(0, limit);
  }

  // Вычисляет релевантность значка для пользователя
  calculateBadgeScore(badge, context) {
    let score = 0.0;

    // Базовый балл
    score += 1.0;

    // Бонус за соответствие интересам
    if (context.interests.length > 0) {
      const badgeText = `${badge.title} ${badge.description}`.toLowerCase();
      for (const interest of context.interests) {
        if (badgeText.includes(interest.toLowerCase())) {
          score += 2.0;
        }
      }
    }

    // Бонус за текущую категорию
    if (context.current_category && badge.categoryId === context.current_category) {
      score += 1.5;
    }

    // Бонус за уровень сложности
    if (context.level === 'beginner' && badge.levels.length <= 2) {
      score += 1.0;
    } else if (context.level === 'advanced' && badge.levels.length >= 3) {
      score += 1.0;
    }

    return score;
  }

  // Получает причину рекомендации значка
  getRecommendationReason(badge, context) {
    const reasons = [];

    if (context.interests.length > 0) {
      const badgeText = `${badge.title} ${badge.description}`.toLowerCase();
      for (const interest of context.interests) {
        if (badgeText.includes(interest.toLowerCase())) {
          reasons.push(`соответствует вашему интересу к ${interest}`);
        }
      }
    }

    if (context.current_category && badge.categoryId === context.current_category) {
      reasons.push('из вашей текущей категории');
    }

    if (context.level === 'beginner' && badge.levels.length <= 2) {
      reasons.push('подходит для начинающих');
    } else if (context.level === 'advanced' && badge.levels.length >= 3) {
      reasons.push('подходит для продвинутых');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'может быть интересен';
  }
}

// Создаем глобальный экземпляр
export const contextManager = new ContextManager();
