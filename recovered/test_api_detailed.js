// Детальный тест API для диагностики
async function testAPIDetailed() {
  console.log('🧪 Тестируем API подробно...\n');

  const tests = [
    {
      name: 'Простое приветствие',
      message: 'Привет',
      context: {},
    },
    {
      name: 'Вопрос о категории',
      message: 'Расскажи про Бро-значки',
      context: {
        current_view: 'category',
        current_category: { id: 'bro-znachki', title: 'Бро-значки' },
      },
    },
    {
      name: 'Кто ты?',
      message: 'Кто ты?',
      context: {},
    },
  ];

  for (const test of tests) {
    console.log(`\n📋 Тест: ${test.name}`);
    console.log(`💬 Сообщение: "${test.message}"`);
    console.log(`🎯 Контекст:`, JSON.stringify(test.context, null, 2));

    try {
      const response = await fetch(
        'https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: test.message,
            user_id: 'test_user_' + Date.now(),
            context: test.context,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Успех!');
        console.log('🤖 Ответ бота:', data.response);
        console.log(`📏 Длина ответа: ${data.response.length} символов`);

        // Проверяем качество ответа
        if (data.response.includes('НейроВалюша') || data.response.includes('Валюша')) {
          console.log('✅ Бот знает свое имя');
        } else {
          console.log('⚠️ Бот не упоминает свое имя');
        }

        if (data.response.includes('Реальный Лагерь') || data.response.includes('лагер')) {
          console.log('✅ Бот знает о лагере');
        } else {
          console.log('⚠️ Бот не упоминает лагерь');
        }

        if (test.name === 'Вопрос о категории' && data.response.includes('Бро')) {
          console.log('✅ Бот отвечает на вопрос о категории');
        } else if (test.name === 'Вопрос о категории') {
          console.log('❌ Бот НЕ отвечает конкретно на вопрос о категории');
        }
      } else {
        console.log('❌ Ошибка API:', data.error || data.message);
      }
    } catch (error) {
      console.error('❌ Ошибка соединения:', error.message);
    }

    console.log('─'.repeat(50));
  }
}

testAPIDetailed();
