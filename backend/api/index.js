export default function handler(req, res) {
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      message: "Путеводитель API",
      version: "2.0.0",
      endpoints: {
        "chat": "/api/chat",
        "stats": "/api/stats"
      }
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
