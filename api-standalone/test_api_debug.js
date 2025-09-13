// Диагностический тест для отладки загрузки данных
async function testAPIDebug() {
  console.log('🧪 Диагностика API с подробным логированием...\n');

  try {
    const response = await fetch('https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Отладочный запрос: покажи точное количество категорий и первые 3 названия',
        user_id: 'debug_test_' + Date.now(),
        context: {}
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API отвечает');
      console.log('🤖 Ответ:', data.response);
      console.log(`📏 Длина ответа: ${data.response.length} символов`);
      
      // Ищем конкретные числа
      const numberMatches = data.response.match(/(\d+)\s*категори/gi);
      if (numberMatches) {
        console.log('🔢 Найденные числа категорий:', numberMatches);
      }
      
      // Ищем правильные названия категорий
      const correctCategories = [
        'За личные достижения',
        'За легендарные дела',
        'Медиа значки',
        'Бро-значки',
        'Значки Движков'
      ];
      
      console.log('\n📋 Поиск правильных категорий:');
      correctCategories.forEach(category => {
        const found = data.response.includes(category);
        console.log(`${found ? '✅' : '❌'} ${category}: ${found ? 'найдено' : 'НЕ найдено'}`);
      });
      
      // Проверяем, есть ли упоминания ai-data в ответе
      if (data.response.includes('ai-data') || data.response.includes('MASTER_INDEX')) {
        console.log('✅ Есть упоминания ai-data');
      } else {
        console.log('❌ НЕТ упоминаний ai-data');
      }
      
    } else {
      console.log('❌ API ошибка:', data.error || data.message);
    }
  } catch (error) {
    console.error('❌ Ошибка соединения:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  
  // Тест 2: Проверяем конкретный значок
  try {
    console.log('\n🧪 Тест 2 - Поиск конкретного значка...');
    
    const response2 = await fetch('https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Расскажи про значок "Валюша"',
        user_id: 'debug_valusha_' + Date.now(),
        context: {}
      })
    });

    const data2 = await response2.json();
    
    if (response2.ok) {
      console.log('🤖 Ответ про Валюшу:', data2.response);
      
      if (data2.response.includes('Валюша') && data2.response.includes('личные достижения')) {
        console.log('✅ Значок "Валюша" найден правильно!');
      } else {
        console.log('❌ Значок "Валюша" НЕ найден или неправильно описан');
      }
    } else {
      console.log('❌ Тест 2 не прошел:', data2.error);
    }
    
  } catch (error) {
    console.error('❌ Ошибка теста 2:', error.message);
  }
}

testAPIDebug();
