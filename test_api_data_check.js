async function testAPIDataCheck() {
  const url = 'https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/chat';

  console.log('🔍 Проверяем данные в API...');

  const testMessages = [
    'Сколько категорий значков у вас есть?',
    'Расскажи про категорию Бро-значки',
    'Какие значки есть в категории "За личные достижения"?',
    'Покажи все категории значков',
  ];

  for (const message of testMessages) {
    console.log(`\n📝 Тест: "${message}"`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          user_id: 'test_user',
          context: {},
        }),
      });

      const data = await response.json();

      if (data.response) {
        console.log('✅ Ответ:', data.response.substring(0, 200) + '...');

        // Проверяем, упоминает ли ответ количество категорий
        if (data.response.includes('14') || data.response.includes('категори')) {
          console.log('🎯 Упоминает категории!');
        }

        // Проверяем, знает ли про Бро-значки
        if (data.response.toLowerCase().includes('бро')) {
          console.log('🎯 Знает про Бро-значки!');
        }
      } else {
        console.log('❌ Нет ответа');
      }
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Небольшая пауза между запросами
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

testAPIDataCheck();
