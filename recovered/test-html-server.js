// Скрипт для тестирования подключения к HTML серверу
const http = require('http');

const PORT = process.env.PORT || 4002;
const TEST_URLS = ['/', '/bluenest.html', '/bluenest', '/categories.html', '/categories'];

console.log(`🧪 Тестирование HTML сервера на порту ${PORT}...\n`);

function testConnection(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          dataLength: data.length,
          isHTML: res.headers['content-type']?.includes('text/html'),
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('📋 Тестируемые URL:');
  TEST_URLS.forEach((url) => console.log(`   - http://localhost:${PORT}${url}`));
  console.log('\n');

  for (const path of TEST_URLS) {
    try {
      console.log(`🔍 Тестирую: ${path}...`);
      const result = await testConnection(path);

      if (result.statusCode === 200) {
        console.log(
          `   ✅ Успешно! Статус: ${result.statusCode}, Размер: ${result.dataLength} байт, HTML: ${result.isHTML ? 'Да' : 'Нет'}`
        );
      } else {
        console.log(`   ⚠️  Статус: ${result.statusCode}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`   ❌ Ошибка подключения: Сервер не запущен на порту ${PORT}`);
        console.log(`   💡 Запустите сервер: node server-html.js`);
      } else if (error.message === 'Request timeout') {
        console.log(`   ❌ Таймаут: Сервер не отвечает`);
      } else {
        console.log(`   ❌ Ошибка: ${error.message}`);
      }
    }
    console.log('');
  }

  console.log('🏁 Тестирование завершено!');
}

runTests().catch(console.error);
