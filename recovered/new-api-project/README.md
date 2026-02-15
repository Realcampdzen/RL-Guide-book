# RL Guide API - НейроВалюша

API для чат-бота НейроВалюши проекта "Реальный Лагерь".

## Структура проекта

```
new-api-project/
├── api/
│   ├── chat.js           # Основной API endpoint
│   ├── debug.js          # Диагностический endpoint
│   └── test-data.js      # Тест загрузки данных
├── data_loader_ai_data.js    # Загрузчик данных из ai_data_complete.json
├── context_manager.js        # Управление контекстом диалогов
├── response_generator.js     # Генерация ответов через OpenAI
├── system_prompt.js          # Системный промпт НейроВалюши
├── ai_data_complete.json     # Данные: 14 категорий, 117 значков
├── package.json
├── vercel.json
└── README.md
```

## Деплой на Vercel

### 1. Создать новый репозиторий на GitHub
- Название: `RL-Guide-API` (или любое другое)
- Скопировать файлы из этой папки

### 2. Создать новый проект в Vercel
- Подключить GitHub репозиторий
- Настроить переменные окружения:
  - `OPENAI_API_KEY` - ключ OpenAI API

### 3. Получить URL нового API
- После деплоя получить URL типа: `https://new-api-project.vercel.app`

### 4. Обновить URL в основном проекте
- В файле `src/components/ChatBot.tsx` заменить URL API

## Тестирование

```bash
# Тест основного API
curl -X POST "https://new-api.vercel.app/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Сколько категорий значков у вас есть?"}'

# Тест данных
curl "https://new-api.vercel.app/api/test-data"
```

## Данные

- **14 категорий** значков из реального Путеводителя
- **117 значков** с правильными названиями и описаниями
- **Полный системный промпт** НейроВалюши
- **GPT-4o-mini** для генерации ответов
