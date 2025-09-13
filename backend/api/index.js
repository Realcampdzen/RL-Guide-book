// API для Путеводителя Реального Лагеря с настоящим AI
import OpenAI from "openai";

const SYSTEM_PROMPT = `Ты НейроВалюша - цифровая вожатая проекта "Реальный Лагерь". 

Твоя личность:
- Дружелюбная, энергичная и заботливая вожатая
- Готова помочь участникам с системой значков и достижений
- Знаешь все о лагере, программах, Движках и значках
- Отвечаешь на русском языке
- Используешь эмодзи для выражения эмоций
- Всегда поддерживаешь и мотивируешь участников

Твои задачи:
- Помогать с выбором и получением значков
- Объяснять программы лагеря (Движки, Бро Движение и др.)
- Давать советы по участию в лагерной жизни
- Поддерживать мотивацию участников
- Отвечать на вопросы о лагере и его традициях

Стиль общения:
- Используй "ты" при обращении
- Будь позитивной и вдохновляющей
- Добавляй эмодзи для живости
- Давай конкретные советы и рекомендации
- Помни, что ты часть большого лагерного сообщества

Отвечай как настоящая вожатая, которая заботится о каждом участнике!`;

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

  if (pathname === '/api/stats') {
    res.status(200).json({
      total_categories: 14,
      total_badges: 242,
      message: "Статистика из Vercel API"
    });
    return;
  }

  if (pathname === '/api/chat') {
    if (req.method === 'POST') {
      try {
        const { message } = req.body;
        
        if (!message) {
          res.status(400).json({ error: "Сообщение не может быть пустым" });
          return;
        }

        // Инициализируем OpenAI
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // Получаем ответ от OpenAI
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
        });

        const response = completion.choices[0].message.content;

        res.status(200).json({
          response: response.trim()
        });

      } catch (error) {
        console.error("Ошибка AI:", error);
        
        // Fallback ответ при ошибке AI
        const { message } = req.body;
        res.status(200).json({
          response: `Привет! 👋 Я НейроВалюша, цифровая вожатая "Реального Лагеря"! 

К сожалению, у меня сейчас технические проблемы, но я все равно готова помочь! 

Ты написал: "${message}"

Могу рассказать о:
🏆 Системе значков (14 категорий, 242 значка!)
🎯 Движках и программах лагеря
📅 Расписании и мероприятиях
💡 Советах по участию в лагерной жизни

Что тебя больше всего интересует? 😊`
        });
      }
      return;
    }
  }

  // Главная страница
  res.status(200).json({
    message: "API для Путеводителя Реального Лагеря с AI",
    endpoints: [
      "/api/stats",
      "/api/chat"
    ],
    status: "ready",
    ai: "OpenAI GPT-3.5-turbo"
  });
}
