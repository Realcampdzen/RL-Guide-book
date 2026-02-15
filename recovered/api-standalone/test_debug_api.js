const https = require('https');

async function testDebugAPI() {
    const url = 'https://backend-fq5f9bm5c-nomorningst-2550s-projects.vercel.app/api/debug';
    
    console.log('🔍 Тестируем диагностический API...');
    console.log('URL:', url);
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('\n📊 Результат диагностики:');
        console.log(JSON.stringify(data, null, 2));
        
        if (data.categories) {
            console.log(`\n📈 Статистика:`);
            console.log(`- Категорий найдено: ${data.categories.length}`);
            console.log(`- Значков найдено: ${data.badges || 0}`);
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

testDebugAPI();
