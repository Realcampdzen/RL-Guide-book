const https = require('https');

async function testSimpleAPI() {
    const url = 'https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/test-data';
    
    console.log('🧪 Тестируем простой API данных...');
    console.log('URL:', url);
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('\n📊 Результат:');
        console.log(JSON.stringify(data, null, 2));
        
        if (data.status === 'success') {
            console.log(`\n✅ Успех! Найдено:`);
            console.log(`- Категорий: ${data.data.totalCategories}`);
            console.log(`- Значков: ${data.data.totalBadges}`);
            console.log(`- Уровней: ${data.data.totalLevels}`);
            
            if (data.data.categories.length > 0) {
                console.log('\n📋 Первые категории:');
                data.data.categories.slice(0, 5).forEach(cat => {
                    console.log(`  - ${cat.name} (${cat.badgeCount} значков)`);
                });
            }
        } else {
            console.log(`\n❌ Ошибка: ${data.message}`);
        }
        
    } catch (error) {
        console.error('❌ Ошибка запроса:', error.message);
    }
}

testSimpleAPI();
