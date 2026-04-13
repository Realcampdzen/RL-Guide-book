// Простой тест для проверки загрузки данных
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('🧪 Тестируем загрузку данных...');

    // Проверяем файл ai_data_complete.json
    const dataPath = path.join(process.cwd(), 'ai_data_complete.json');
    console.log('📁 Путь к данным:', dataPath);
    console.log('📂 Файл существует:', fs.existsSync(dataPath));

    if (!fs.existsSync(dataPath)) {
      return res.status(200).json({
        status: 'error',
        message: 'Файл ai_data_complete.json не найден',
        path: dataPath,
        cwd: process.cwd(),
        files: fs.readdirSync(process.cwd()).filter((f) => f.includes('ai_data')),
      });
    }

    // Читаем файл
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    res.status(200).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        totalCategories: data.totalCategories,
        totalBadges: data.totalBadges,
        totalLevels: data.totalLevels,
        categories: data.categories.map((c) => ({
          id: c.id,
          name: c.name,
          badgeCount: c.badges ? c.badges.length : 0,
        })),
        firstCategory: data.categories[0],
        sampleBadge: data.badges[0],
      },
    });
  } catch (error) {
    console.error('❌ Ошибка в test-data API:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack,
    });
  }
}
