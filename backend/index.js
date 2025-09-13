// Простой API для Путеводителя Реального Лагеря
export default function handler(req, res) {
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
      const { message } = req.body;
      res.status(200).json({
        response: `НейроВалюша: Привет! Я получила твое сообщение: "${message}". Я цифровая вожатая проекта "Реальный Лагерь" и готова помочь с системой значков!`
      });
      return;
    }
  }

  // Главная страница
  res.status(200).json({
    message: "API для Путеводителя Реального Лагеря",
    endpoints: [
      "/api/stats",
      "/api/chat"
    ],
    status: "ready"
  });
}
