// Простой HTTP сервер для staging
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const HTML_FILE = path.join(__dirname, 'bluenest.html');
const CATEGORIES_FILE = path.join(__dirname, 'categories.html');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'ai_data_complete.json');

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // Обслуживаем bluenest.html
  if (url === '/bluenest.html' || url === '/bluenest' || url === '/') {
    if (fs.existsSync(HTML_FILE)) {
      const html = fs.readFileSync(HTML_FILE, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });
      res.end(html);
      return;
    }
  }

  // Обслуживаем categories.html
  if (url === '/categories.html' || url === '/categories') {
    if (fs.existsSync(CATEGORIES_FILE)) {
      const html = fs.readFileSync(CATEGORIES_FILE, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });
      res.end(html);
      return;
    }
  }

  // Обслуживаем ai_data_complete.json
  if (url === '/ai_data_complete.json') {
    if (fs.existsSync(DATA_FILE)) {
      const json = fs.readFileSync(DATA_FILE, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(json);
      return;
    }
  }

  // Обслуживаем статические файлы из public (для изображений и других ресурсов)
  if (url.startsWith('/RL-Guide-book/') || url.startsWith('/public/')) {
    try {
      // Декодируем URL для правильной обработки кириллицы
      const decodedUrl = decodeURIComponent(url);
      let filePath;

      if (decodedUrl.startsWith('/RL-Guide-book/')) {
        const fileName = decodedUrl.replace('/RL-Guide-book/', '');
        filePath = path.join(PUBLIC_DIR, fileName);
      } else if (decodedUrl.startsWith('/public/')) {
        const fileName = decodedUrl.replace('/public/', '');
        filePath = path.join(PUBLIC_DIR, fileName);
      }

      if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.json': 'application/json',
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';
        const fileContent = fs.readFileSync(filePath);

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        });
        res.end(fileContent);
        return;
      } else {
        console.log('File not found:', filePath);
      }
    } catch (err) {
      console.error('Error serving static file:', err.message);
    }
  }

  // 404 для остальных запросов
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Staging server запущен на http://localhost:${PORT}`);
  console.log(`📄 Главная: http://localhost:${PORT}/bluenest.html`);
  console.log(`📄 Категории: http://localhost:${PORT}/categories.html`);
});
