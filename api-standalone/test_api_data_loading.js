// Диагностический тест загрузки данных в API
async function testDataLoading() {
  console.log('🧪 Тестируем загрузку данных в API...\n');

  try {
    // Тест 1: Проверяем количество категорий
    const response1 = await fetch(
      'https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Сколько всего категорий значков в лагере? Назови все категории.',
          user_id: 'test_data_loading_' + Date.now(),
          context: {},
        }),
      }
    );

    const data1 = await response1.json();

    if (response1.ok) {
      console.log('✅ Тест 1 - Количество категорий:');
      console.log('🤖 Ответ:', data1.response);

      // Ищем число категорий в ответе
      const categoryMatch = data1.response.match(/(\d+)\s*категори/i);
      if (categoryMatch) {
        const count = parseInt(categoryMatch[1]);
        console.log(`📊 Найдено категорий: ${count}`);
        if (count === 14) {
          console.log('✅ Правильное количество категорий!');
        } else {
          console.log(`❌ Неправильное количество! Ожидается 14, получено ${count}`);
        }
      } else {
        console.log('⚠️ Не удалось определить количество категорий из ответа');
      }
    } else {
      console.log('❌ Тест 1 не прошел:', data1.error);
    }
  } catch (error) {
    console.error('❌ Ошибка теста 1:', error.message);
  }

  console.log('\n' + '='.repeat(50));

  // Тест 2: Проверяем конкретные категории
  try {
    console.log('\n🧪 Тест 2 - Проверяем конкретные категории...');

    const response2 = await fetch(
      'https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Назови первые 5 категорий значков в лагере',
          user_id: 'test_categories_' + Date.now(),
          context: {},
        }),
      }
    );

    const data2 = await response2.json();

    if (response2.ok) {
      console.log('🤖 Ответ:', data2.response);

      // Проверяем наличие известных категорий
      const expectedCategories = [
        'За личные достижения',
        'За легендарные дела',
        'Медиа значки',
        'Бро-значки',
        'Значки Движков',
      ];

      let foundCategories = 0;
      expectedCategories.forEach((category) => {
        if (data2.response.includes(category)) {
          console.log(`✅ Найдена категория: ${category}`);
          foundCategories++;
        } else {
          console.log(`❌ НЕ найдена категория: ${category}`);
        }
      });

      console.log(
        `📊 Найдено правильных категорий: ${foundCategories}/${expectedCategories.length}`
      );
    } else {
      console.log('❌ Тест 2 не прошел:', data2.error);
    }
  } catch (error) {
    console.error('❌ Ошибка теста 2:', error.message);
  }

  console.log('\n' + '='.repeat(50));

  // Тест 3: Проверяем системный промпт
  try {
    console.log('\n🧪 Тест 3 - Проверяем системный промпт...');

    const response3 = await fetch(
      'https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Представься, назови свое имя и объясни, кто ты',
          user_id: 'test_system_prompt_' + Date.now(),
          context: {},
        }),
      }
    );

    const data3 = await response3.json();

    if (response3.ok) {
      console.log('🤖 Ответ:', data3.response);

      // Проверяем системный промпт
      const systemChecks = [
        { key: 'НейроВалюша', found: data3.response.includes('НейроВалюша') },
        { key: 'Валюша', found: data3.response.includes('Валюша') },
        { key: 'Реальный Лагерь', found: data3.response.includes('Реальный Лагерь') },
        { key: 'цифровая вожатая', found: data3.response.includes('цифровая вожатая') },
        { key: 'эмпатичная', found: data3.response.includes('эмпатичная') },
      ];

      systemChecks.forEach((check) => {
        console.log(
          `${check.found ? '✅' : '❌'} ${check.key}: ${check.found ? 'найдено' : 'НЕ найдено'}`
        );
      });

      const foundCount = systemChecks.filter((c) => c.found).length;
      console.log(
        `📊 Системный промпт работает на: ${foundCount}/${systemChecks.length} (${Math.round((foundCount / systemChecks.length) * 100)}%)`
      );
    } else {
      console.log('❌ Тест 3 не прошел:', data3.error);
    }
  } catch (error) {
    console.error('❌ Ошибка теста 3:', error.message);
  }
}

testDataLoading();
