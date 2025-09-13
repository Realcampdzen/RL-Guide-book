export default function handler(req, res) {
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
      const { message } = req.body;
      
      const responses = [
        "Привет! Я НейроВалюша, цифровая вожатая проекта 'Реальный Лагерь'! 🌟",
        "В 'Реальном Лагере' есть 14 категорий значков для развития разных навыков!",
        "Система значков помогает отслеживать прогресс и достижения участников лагеря!",
        "Хочешь узнать о значках? Посмотри категории в главном меню!",
        "Каждый значок имеет свой уровень сложности: базовый, продвинутый, экспертный!"
      ];
      
      let response;
      if (message && message.toLowerCase().includes('привет')) {
        response = responses[0];
      } else if (message && message.toLowerCase().includes('значк')) {
        response = responses[1];
      } else if (message && message.toLowerCase().includes('систем')) {
        response = responses[2];
      } else if (message && message.toLowerCase().includes('категори')) {
        response = responses[3];
      } else if (message && message.toLowerCase().includes('уровен')) {
        response = responses[4];
      } else {
        response = responses[0];
      }
      
      res.status(200).json({
        response: response,
        suggestions: [
          "Покажи все категории значков",
          "Расскажи о системе значков"
        ]
      });
    } catch (error) {
      res.status(500).json({
        error: "Ошибка при обращении к чат-боту",
        message: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
