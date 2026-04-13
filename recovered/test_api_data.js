// Тест загрузки данных в API
async function testAPIData() {
  console.log('🧪 Тестируем загрузку данных в API...\n');

  try {
    // Проверяем загрузку данных
    const response = await fetch(
      'https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Сколько категорий значков в лагере?',
          user_id: 'test_data_' + Date.now(),
          context: {},
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log('✅ API отвечает');
      console.log('🤖 Ответ:', data.response);
      console.log(`📏 Длина ответа: ${data.response.length} символов`);

      // Проверяем, знает ли бот о категориях
      if (data.response.includes('категори') || data.response.includes('14')) {
        console.log('✅ Бот знает о категориях');
      } else {
        console.log('⚠️ Бот НЕ упоминает категории');
      }

      // Проверяем, знает ли бот о значках
      if (data.response.includes('значк') || data.response.includes('бейдж')) {
        console.log('✅ Бот знает о значках');
      } else {
        console.log('⚠️ Бот НЕ упоминает значки');
      }

      // Проверяем системный промпт
      if (data.response.includes('НейроВалюша') || data.response.includes('Валюша')) {
        console.log('✅ Системный промпт загружен (знает имя)');
      } else {
        console.log('❌ Системный промпт НЕ загружен');
      }

      if (data.response.includes('Реальный Лагерь')) {
        console.log('✅ Знает о лагере');
      } else {
        console.log('⚠️ НЕ упоминает лагерь');
      }
    } else {
      console.log('❌ API ошибка:', data.error || data.message);
    }
  } catch (error) {
    console.error('❌ Ошибка соединения:', error.message);
  }

  console.log('\n' + '='.repeat(50));

  // Тест 2: Проверяем знание конкретных категорий
  console.log('\n🧪 Тест 2: Знание конкретных категорий...');

  try {
    const response2 = await fetch(
      'https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Расскажи про значки за личные достижения',
          user_id: 'test_data2_' + Date.now(),
          context: {},
        }),
      }
    );

    const data2 = await response2.json();

    if (response2.ok) {
      console.log(
        '🤖 Ответ на вопрос о личных достижениях:',
        data2.response.substring(0, 200) + '...'
      );

      if (data2.response.includes('личн') || data2.response.includes('достижен')) {
        console.log('✅ Знает о личных достижениях');
      } else {
        console.log('⚠️ НЕ знает о личных достижениях');
      }
    }
  } catch (error) {
    console.error('❌ Ошибка теста 2:', error.message);
  }
}

testAPIData();
