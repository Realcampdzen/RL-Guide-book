// API endpoint для чат-бота НейроВалюши
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

  if (req.method === 'POST') {
    try {
      const { message, user_id = 'web_user', context } = req.body;
      
      if (!message) {
        res.status(400).json({ error: "Сообщение не может быть пустым" });
        return;
      }

      // Обновляем веб-контекст если есть
      if (context) {
        console.log(`🌐 Получен веб-контекст:`, JSON.stringify(context, null, 2));
        contextManager.updateWebContext(user_id, context);
      }

      // Получаем историю сообщений пользователя
      const conversationHistory = contextManager.getConversationHistory(user_id);
      console.log(`💬 История диалога (${conversationHistory.length} сообщений):`, JSON.stringify(conversationHistory.slice(-3), null, 2));
      
      // Получаем обновленный контекст для отладки
      const userContext = contextManager.getUserContext(user_id);
      console.log(`👤 Контекст пользователя после обновления:`, JSON.stringify(userContext, null, 2));
      
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

К сожалению, у меня сейчас технические проблемы, но я могу рассказать о системе значков:

🏆 В "Реальном Лагере" есть 14 категорий значков для развития разных навыков:
- 💪 За личные достижения
- 🌟 За легендарные дела  
- 📱 Медиа значки
- 🏕️ За лагерные дела
- 👥 За отрядные дела
- 🎯 Гармония и порядок
- 🎨 За творческие достижения
- 🚀 Значки Движков
- 💪 Значки Бро – Движения
- 🏴 Значки на флаг отряда
- 🧘 Реальность: осознанность и внимательность
- 🤖 ИИ: нейросети для обучения и творчества
- 💼 Софт-скиллз интенсив
- 🔍 Значки Инспектора Пользы

Попробуйте перезагрузить страницу или задать вопрос позже! 😊`,
        metadata: { source: "fallback", error: error.message }
      });
    }
  } else {
    res.status(405).json({ error: "Метод не поддерживается" });
  }
}
