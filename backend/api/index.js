// API для Путеводителя Реального Лагеря с полной архитектурой локального бота
import { dataLoader } from '../data_loader.js';
import { contextManager } from '../context_manager.js';
import { responseGenerator } from '../response_generator.js';

export default async function handler(req, res) {
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  // Инициализируем компоненты при первом запросе
  try {
    if (!dataLoader.badgeDataCache) {
      dataLoader.loadAllData();
    }
  } catch (error) {
    console.error("Ошибка инициализации данных:", error);
  }

  if (pathname === '/api/stats') {
    try {
      const stats = dataLoader.getStats();
      res.status(200).json({
        ...stats,
        message: "Статистика из Vercel API с полной базой данных"
      });
    } catch (error) {
      res.status(200).json({
        total_categories: 14,
        total_badges: 119,
        total_levels: 242,
        message: "Статистика из Vercel API (fallback)"
      });
    }
    return;
  }

  if (pathname === '/api/chat') {
    if (req.method === 'POST') {
      try {
        const { message, user_id = 'web_user', context } = req.body;
        
        if (!message) {
          res.status(400).json({ error: "Сообщение не может быть пустым" });
          return;
        }

        // Обновляем веб-контекст если есть
        if (context) {
          contextManager.updateWebContext(user_id, context);
        }

        // Получаем историю сообщений пользователя
        const conversationHistory = contextManager.getConversationHistory(user_id);
        
        // Добавляем новое сообщение пользователя в историю
        contextManager.addMessageToHistory(user_id, {
          role: "user",
          content: message,
          metadata: {}
        });
        
        // Генерируем ответ
        const response = await responseGenerator.generateResponse(
          message,
          user_id,
          conversationHistory
        );
        
        // Добавляем ответ бота в историю
        contextManager.addMessageToHistory(user_id, {
          role: "assistant",
          content: response.response,
          metadata: response.metadata
        });
        
        res.status(200).json(response);

      } catch (error) {
        console.error("Ошибка AI:", error);
        
        // Fallback ответ при ошибке AI
        const { message } = req.body;
        res.status(200).json({
          response: `Привет! 👋 Я НейроВалюша, цифровая вожатая "Реального Лагеря"! 

К сожалению, у меня сейчас технические проблемы, но я все равно готова помочь! 

Ты написал: "${message}"

Могу рассказать о:
🏆 Системе значков (14 категорий, 119 значков!)
🎯 Движках и программах лагеря
📅 Расписании и мероприятиях
💡 Советах по участию в лагерной жизни

Что тебя больше всего интересует? 😊`,
          suggestions: [
            "Покажи все категории значков",
            "Рекомендуй значки по моим интересам",
            "Объясни философию системы значков"
          ],
          context_updates: null,
          metadata: {
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
      return;
    }
  }

  // Главная страница
  res.status(200).json({
    message: "API для Путеводителя Реального Лагеря с полной архитектурой",
    endpoints: [
      "/api/stats",
      "/api/chat"
    ],
    status: "ready",
    ai: "OpenAI GPT-3.5-turbo",
    features: [
      "Полная база данных значков (119 значков, 14 категорий)",
      "Контекстный анализ запросов",
      "История диалога",
      "Персонализированные рекомендации",
      "Умный анализ типов запросов"
    ]
  });
}
