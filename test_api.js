// Тест API для проверки работы
async function testAPI() {
  try {
    const response = await fetch('https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Привет',
        user_id: 'test_user',
        context: {}
      })
    });

    const data = await response.json();
    console.log('API Response:', data);
    
    if (response.ok) {
      console.log('✅ API работает!');
      console.log('Ответ бота:', data.response || data.message);
    } else {
      console.log('❌ API ошибка:', data.error || data.message);
    }
  } catch (error) {
    console.error('❌ Ошибка соединения:', error.message);
  }
}

testAPI();
