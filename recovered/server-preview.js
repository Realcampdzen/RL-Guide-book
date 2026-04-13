// Preview сервер для тестирования production build с base path /RL-Guide-book/
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4002;
const DIST_DIR = path.join(__dirname, 'dist');
const BASE_PATH = '/RL-Guide-book';

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];

  // Убираем base path из URL
  if (url.startsWith(BASE_PATH)) {
    url = url.substring(BASE_PATH.length);
  }

  // Если корневой путь, отдаем index.html
  if (url === '/' || url === '') {
    url = '/index.html';
  }

  // Убираем ведущий слэш для работы с path.join
  if (url.startsWith('/')) {
    url = url.substring(1);
  }

  const filePath = path.join(DIST_DIR, url);

  // Проверяем существование файла
  if (!fs.existsSync(filePath)) {
    // Если файл не найден, пробуем index.html (для SPA routing)
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  // Проверяем, что это файл, а не директория
  const stats = fs.statSync(filePath);
  if (stats.isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  // Читаем и отдаем файл
  try {
    const content = fs.readFileSync(filePath);
    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  } catch (error) {
    console.error('Error reading file:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Preview server запущен на http://localhost:${PORT}${BASE_PATH}`);
  console.log(`📱 Откройте в браузере: http://localhost:${PORT}${BASE_PATH}`);
  console.log(`📱 Для мобильного тестирования используйте IP вашего компьютера`);
  console.log(`💡 Пример: http://192.168.1.X:${PORT}${BASE_PATH}`);
});
