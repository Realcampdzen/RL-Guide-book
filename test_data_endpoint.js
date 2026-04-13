async function testDataEndpoint() {
  const url = 'https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/test-data';

  console.log('🔍 Тестируем endpoint test-data...');

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log('📊 Ответ test-data:', JSON.stringify(data, null, 2));

    if (data.status === 'success') {
      console.log(`\n✅ Данные загружены:`);
      console.log(`- Категорий: ${data.data.totalCategories}`);
      console.log(`- Значков: ${data.data.totalBadges}`);
      console.log(`- Уровней: ${data.data.totalLevels}`);

      if (data.data.categories && data.data.categories.length > 0) {
        console.log('\n📋 Первые категории:');
        data.data.categories.slice(0, 5).forEach((cat) => {
          console.log(`  - ${cat.name} (${cat.badgeCount} значков)`);
        });
      }
    } else {
      console.log(`\n❌ Ошибка: ${data.message}`);
      if (data.path) {
        console.log(`📁 Путь к файлу: ${data.path}`);
      }
      if (data.files) {
        console.log(`📂 Файлы с "ai_data": ${data.files.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
  }
}

testDataEndpoint();
