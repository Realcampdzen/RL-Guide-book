// Простой HTTP сервер для отдачи HTML страниц (порт 4002 по умолчанию)
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 4002;
const HTML_FILE = path.join(__dirname, 'bluenest.html');
const CATEGORIES_FILE = path.join(__dirname, 'categories.html');
const INDEX_FILE = path.join(__dirname, 'index.html');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DIST_DIR = path.join(__dirname, 'dist');
const DIST_INDEX_FILE = path.join(DIST_DIR, 'index.html');
const DATA_FILE = path.join(__dirname, 'ai_data_complete.json');
const FLASK_API_PORT = process.env.FLASK_PORT || 4000;
const FLASK_API_URL = `http://127.0.0.1:${FLASK_API_PORT}`;

// Проверка существования файлов при запуске
if (!fs.existsSync(HTML_FILE)) {
  console.error(`❌ Ошибка: Файл ${HTML_FILE} не найден!`);
  process.exit(1);
}

if (!fs.existsSync(CATEGORIES_FILE)) {
  console.warn(`⚠️  Предупреждение: Файл ${CATEGORIES_FILE} не найден!`);
}

if (!fs.existsSync(DATA_FILE)) {
  console.warn(
    `⚠️  Предупреждение: Файл ${DATA_FILE} не найден! Страница categories.html может не работать.`
  );
}

if (!fs.existsSync(PUBLIC_DIR)) {
  console.warn(
    `⚠️  Предупреждение: Папка ${PUBLIC_DIR} не найдена! Изображения могут не загружаться.`
  );
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const timestamp = new Date().toISOString();

  // Логирование запросов
  console.log(`[${timestamp}] ${req.method} ${url} - ${req.socket.remoteAddress}`);

  try {
    // Обслуживаем bluenest.html
    if (url === '/bluenest.html' || url === '/bluenest' || url === '/') {
      if (fs.existsSync(HTML_FILE)) {
        try {
          const html = fs.readFileSync(HTML_FILE, 'utf-8');
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          });
          res.end(html);
          console.log(`[${timestamp}] ✅ Отдан bluenest.html`);
          return;
        } catch (err) {
          console.error(`[${timestamp}] ❌ Ошибка чтения bluenest.html:`, err.message);
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Internal Server Error: ' + err.message);
          return;
        }
      } else {
        console.error(`[${timestamp}] ❌ Файл bluenest.html не найден`);
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('File not found: bluenest.html');
        return;
      }
    }

    // Обслуживаем categories.html
    if (url === '/categories.html' || url === '/categories') {
      if (fs.existsSync(CATEGORIES_FILE)) {
        try {
          const html = fs.readFileSync(CATEGORIES_FILE, 'utf-8');
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          });
          res.end(html);
          console.log(`[${timestamp}] ✅ Отдан categories.html`);
          return;
        } catch (err) {
          console.error(`[${timestamp}] ❌ Ошибка чтения categories.html:`, err.message);
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Internal Server Error: ' + err.message);
          return;
        }
      } else {
        console.error(`[${timestamp}] ❌ Файл categories.html не найден`);
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('File not found: categories.html');
        return;
      }
    }

    // Обслуживаем ai_data_complete.json
    if (url === '/ai_data_complete.json') {
      if (fs.existsSync(DATA_FILE)) {
        try {
          const json = fs.readFileSync(DATA_FILE, 'utf-8');
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(json);
          console.log(`[${timestamp}] ✅ Отдан ai_data_complete.json`);
          return;
        } catch (err) {
          console.error(`[${timestamp}] ❌ Ошибка чтения ai_data_complete.json:`, err.message);
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Internal Server Error: ' + err.message);
          return;
        }
      } else {
        console.error(`[${timestamp}] ❌ Файл ai_data_complete.json не найден`);
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('File not found: ai_data_complete.json');
        return;
      }
    }

    // Прокси для /api/chat к Flask backend
    if (url === '/api/chat' && req.method === 'POST') {
      try {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          const options = {
            hostname: '127.0.0.1',
            port: FLASK_API_PORT,
            path: '/api/chat',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
            },
          };

          const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            });
            proxyRes.pipe(res);
          });

          proxyReq.on('error', (err) => {
            console.error(`[${timestamp}] ❌ Ошибка прокси к Flask:`, err.message);
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Chat service unavailable', message: err.message }));
          });

          proxyReq.write(body);
          proxyReq.end();
        });
        return;
      } catch (err) {
        console.error(`[${timestamp}] ❌ Ошибка обработки /api/chat:`, err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', message: err.message }));
        return;
      }
    }

    // Обработка OPTIONS для CORS
    if (req.method === 'OPTIONS' && url === '/api/chat') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    // Обслуживаем index.html (React приложение)
    if (url === '/index.html' || url === '/index') {
      const indexPath = fs.existsSync(DIST_INDEX_FILE) ? DIST_INDEX_FILE : INDEX_FILE;
      if (fs.existsSync(indexPath)) {
        try {
          const html = fs.readFileSync(indexPath, 'utf-8');
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          });
          res.end(html);
          console.log(`[${timestamp}] ✅ Отдан ${path.basename(indexPath)}`);
          return;
        } catch (err) {
          console.error(`[${timestamp}] ❌ Ошибка чтения index.html:`, err.message);
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Internal Server Error: ' + err.message);
          return;
        }
      } else {
        console.error(`[${timestamp}] ❌ Файл index.html не найден`);
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('File not found: index.html');
        return;
      }
    }

    // Обслуживаем статические файлы React из /dist/
    if (url.startsWith('/dist/') || url.startsWith('/src/') || url.startsWith('/assets/')) {
      try {
        let filePath;
        if (url.startsWith('/dist/')) {
          const fileName = url.replace('/dist/', '');
          filePath = path.join(DIST_DIR, fileName);
        } else if (url.startsWith('/src/')) {
          const fileName = url.replace('/src/', '');
          filePath = path.join(__dirname, 'src', fileName);
        } else if (url.startsWith('/assets/')) {
          const fileName = url.replace('/assets/', '');
          const distAssetPath = path.join(DIST_DIR, 'assets', fileName);
          const legacyAssetPath = path.join(__dirname, 'assets', fileName);
          filePath = fs.existsSync(distAssetPath) ? distAssetPath : legacyAssetPath;
        }

        if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentTypes = {
            '.js': 'application/javascript',
            '.mjs': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject',
          };

          const contentType = contentTypes[ext] || 'application/octet-stream';
          const fileContent = fs.readFileSync(filePath);

          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(fileContent);
          console.log(`[${timestamp}] ✅ Отдан статический файл React: ${url}`);
          return;
        } else {
          console.log(`[${timestamp}] ⚠️  Файл React не найден: ${filePath}`);
        }
      } catch (err) {
        console.error(
          `[${timestamp}] ❌ Ошибка обслуживания статического файла React:`,
          err.message
        );
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
            '.webp': 'image/webp',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
          };

          const contentType = contentTypes[ext] || 'application/octet-stream';
          const fileContent = fs.readFileSync(filePath);

          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(fileContent);
          console.log(`[${timestamp}] ✅ Отдан статический файл: ${url}`);
          return;
        } else {
          console.log(`[${timestamp}] ⚠️  Файл не найден: ${filePath}`);
        }
      } catch (err) {
        console.error(`[${timestamp}] ❌ Ошибка обслуживания статического файла:`, err.message);
      }
    }

    // 404 для остальных запросов
    console.log(`[${timestamp}] ⚠️  404 для ${url}`);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found: ' + url);
  } catch (error) {
    console.error(`[${timestamp}] ❌ Критическая ошибка:`, error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error: ' + error.message);
  }
});

// Обработка ошибок сервера
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Ошибка: Порт ${PORT} уже занят!`);
    console.error(`💡 Попробуйте использовать другой порт: PORT=4003 node server-html.js`);
    console.error(`💡 Или найдите и завершите процесс, использующий порт ${PORT}`);
  } else {
    console.error(`❌ Ошибка сервера:`, err);
  }
  process.exit(1);
});

// Обработка ошибок клиентских соединений
server.on('clientError', (err, socket) => {
  console.error(`❌ Ошибка клиентского соединения:`, err.message);
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ HTML сервер успешно запущен!`);
  console.log(`📄 Порт: ${PORT}`);
  console.log(`\n📋 Доступные страницы:`);
  console.log(`   📄 Главная: http://localhost:${PORT}/bluenest.html`);
  console.log(`   📄 Категории: http://localhost:${PORT}/categories.html`);
  console.log(`   📄 React приложение: http://localhost:${PORT}/index.html`);
  console.log(`   📄 Корень: http://localhost:${PORT}/`);
  console.log(`\n📦 Поддерживаемые ресурсы:`);
  console.log(`   📊 JSON данные: http://localhost:${PORT}/ai_data_complete.json`);
  console.log(`   🖼️  Статические файлы: http://localhost:${PORT}/RL-Guide-book/...`);
  console.log(`   ⚛️  React файлы: http://localhost:${PORT}/dist/...`);
  console.log(`\n🤖 API прокси:`);
  console.log(`   💬 Чат-бот: POST http://localhost:${PORT}/api/chat → Flask (${FLASK_API_PORT})`);
  console.log(
    `\n💡 Примечание: Порт изменен на ${PORT} для избежания конфликта с Flask API (${FLASK_API_PORT})`
  );
  console.log(`💡 Для остановки нажмите Ctrl+C\n`);
});
