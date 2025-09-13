// Главная страница для Vercel
export default function handler(req, res) {
  res.status(200).json({
    message: "API для Путеводителя Реального Лагеря",
    endpoints: [
      "/api/stats",
      "/api/chat"
    ],
    status: "ready"
  });
}
