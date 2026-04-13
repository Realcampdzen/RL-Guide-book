async function testAPIDirect() {
  const url = 'https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/chat';

  console.log('🔍 Тестируем API напрямую...');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Привет! Какая модель используется?',
        user_id: 'test_user',
        context: {},
      }),
    });

    console.log('📊 Статус ответа:', response.status);
    console.log('📋 Заголовки:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('📄 Ответ API:', JSON.stringify(data, null, 2));

    if (data.response) {
      console.log('\n✅ API работает! Ответ:', data.response);
    } else if (data.error) {
      console.log('\n❌ API ошибка:', data.error);
    } else {
      console.log('\n⚠️ Неожиданный ответ:', data);
    }
  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
  }
}

testAPIDirect();
