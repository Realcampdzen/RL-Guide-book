#!/bin/bash

# Скрипт для деплоя на Render
echo "🚀 Деплой проекта Путеводитель на Render..."

# Проверяем наличие необходимых файлов
if [ ! -f "render.yaml" ]; then
    echo "❌ Файл render.yaml не найден!"
    exit 1
fi

if [ ! -f "chatbot/requirements.txt" ]; then
    echo "❌ Файл chatbot/requirements.txt не найден!"
    exit 1
fi

# Проверяем переменные окружения
if [ -z "$RENDER_API_TOKEN" ]; then
    echo "❌ Переменная RENDER_API_TOKEN не установлена!"
    echo "Установите её командой: export RENDER_API_TOKEN=rnd_h0aJfxLMhjWzHNJx1lGouoyEEQnP"
    exit 1
fi

echo "✅ Все необходимые файлы найдены"
echo "🔑 API токен: ${RENDER_API_TOKEN:0:10}..."

# Проверяем статус сервисов
echo "🔍 Проверяем статус сервисов на Render..."
curl -H "Authorization: Bearer $RENDER_API_TOKEN" \
     https://api.render.com/v1/services \
     | jq '.[].name' 2>/dev/null || echo "⚠️ jq не установлен, пропускаем форматирование"

echo ""
echo "📝 Для завершения деплоя:"
echo "1. Откройте https://dashboard.render.com"
echo "2. Нажмите 'New +' -> 'Blueprint'"
echo "3. Подключите GitHub репозиторий"
echo "4. Выберите render.yaml"
echo "5. Настройте переменные окружения:"
echo "   - OPENAI_API_KEY: ваш ключ OpenAI"
echo "   - RENDER_API_TOKEN: $RENDER_API_TOKEN"
echo "6. Нажмите 'Apply' для деплоя"

echo ""
echo "🎉 Готово к деплою на Render!"
