const https = require('https');

async function testCurrentAPI() {
  const baseUrl = 'https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app';

  console.log('🔍 Тестируем текущий Vercel API...');
  console.log('Base URL:', baseUrl);

  // Тест 1: Основной chat endpoint
  console.log('\n📡 Тест 1: Chat API');
  try {
    const chatResponse = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Привет! Сколько категорий значков у вас есть?',
        context: {},
      }),
    });

    const chatData = await chatResponse.json();
    console.log('Chat API ответ:', JSON.stringify(chatData, null, 2));

    if (chatData.response) {
      console.log('✅ Chat API работает');
    } else {
      console.log('❌ Chat API не работает');
    }
  } catch (error) {
    console.log('❌ Chat API ошибка:', error.message);
  }

  // Тест 2: Debug endpoint
  console.log('\n📡 Тест 2: Debug API');
  try {
    const debugResponse = await fetch(`${baseUrl}/api/debug`);
    const debugData = await debugResponse.json();
    console.log('Debug API ответ:', JSON.stringify(debugData, null, 2));
  } catch (error) {
    console.log('❌ Debug API ошибка:', error.message);
  }

  // Тест 3: Test-data endpoint
  console.log('\n📡 Тест 3: Test-data API');
  try {
    const testResponse = await fetch(`${baseUrl}/api/test-data`);
    const testData = await testResponse.json();
    console.log('Test-data API ответ:', JSON.stringify(testData, null, 2));

    if (testData.status === 'success' && testData.data) {
      console.log(
        `✅ Данные загружены: ${testData.data.totalCategories} категорий, ${testData.data.totalBadges} значков`
      );
    } else {
      console.log('❌ Данные не загружены правильно');
    }
  } catch (error) {
    console.log('❌ Test-data API ошибка:', error.message);
  }
}

testCurrentAPI();
