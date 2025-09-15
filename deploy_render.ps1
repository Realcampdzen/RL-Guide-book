# Скрипт для деплоя на Render (PowerShell)
Write-Host "🚀 Деплой проекта Путеводитель на Render..." -ForegroundColor Green

# Проверяем наличие необходимых файлов
if (-not (Test-Path "render.yaml")) {
    Write-Host "❌ Файл render.yaml не найден!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "chatbot/requirements.txt")) {
    Write-Host "❌ Файл chatbot/requirements.txt не найден!" -ForegroundColor Red
    exit 1
}

# Проверяем переменные окружения
if (-not $env:RENDER_API_TOKEN) {
    Write-Host "❌ Переменная RENDER_API_TOKEN не установлена!" -ForegroundColor Red
    Write-Host "Установите её командой: `$env:RENDER_API_TOKEN='rnd_h0aJfxLMhjWzHNJx1lGouoyEEQnP'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Все необходимые файлы найдены" -ForegroundColor Green
Write-Host "🔑 API токен: $($env:RENDER_API_TOKEN.Substring(0,10))..." -ForegroundColor Cyan

# Проверяем статус сервисов
Write-Host "🔍 Проверяем статус сервисов на Render..." -ForegroundColor Blue
try {
    $headers = @{
        'Authorization' = "Bearer $env:RENDER_API_TOKEN"
        'Content-Type' = 'application/json'
    }
    
    $response = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Headers $headers
    Write-Host "📊 Найдено сервисов: $($response.Count)" -ForegroundColor Green
    
    foreach ($service in $response) {
        Write-Host "  - $($service.name)" -ForegroundColor White
    }
} catch {
    Write-Host "⚠️ Ошибка при проверке статуса: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Для завершения деплоя:" -ForegroundColor Yellow
Write-Host "1. Откройте https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Нажмите 'New +' -> 'Blueprint'" -ForegroundColor White
Write-Host "3. Подключите GitHub репозиторий" -ForegroundColor White
Write-Host "4. Выберите render.yaml" -ForegroundColor White
Write-Host "5. Настройте переменные окружения:" -ForegroundColor White
Write-Host "   - OPENAI_API_KEY: ваш ключ OpenAI" -ForegroundColor Cyan
Write-Host "   - RENDER_API_TOKEN: $env:RENDER_API_TOKEN" -ForegroundColor Cyan
Write-Host "6. Нажмите 'Apply' для деплоя" -ForegroundColor White

Write-Host ""
Write-Host "🎉 Готово к деплою на Render!" -ForegroundColor Green
