# Краткая справка: Данные для Cloudflare бота

## 🔑 Обязательные переменные окружения

```bash
OPENAI_API_KEY=sk-...                    # Ключ OpenAI API
OPENAI_MODEL=gpt-4o-mini                 # Модель (фиксированная)
OPENAI_BASE_URL=https://api.openai.com/v1  # Или прокси: https://api.openai-proxy.com/v1
```

## 📁 Данные для загрузки

**Папка:** `public/ai-data/` (вся папка целиком)

**Структура:**
- `MASTER_INDEX.json` - главный индекс
- `category-1/` до `category-14/` - данные категорий и значков
- В каждой категории: `index.json`, `introduction.md`, `N.X.json` файлы

**Куда загрузить:**
- Static Assets (предпочтительно для Workers/Pages)
- Или R2 Bucket

## 📝 Системный промпт

**Файлы:**
- `chatbot/prompts/putevoditel_system_prompt_optimized.py` - Python версия
- `system_prompt.js` - JS версия (если нужны кликабельные ссылки)

**Факты:**
- `chatbot/prompts/facts.json` - адрес, контакты, текущая смена

## 🔌 API Endpoint

**POST** `/chat`

**Request:**
```json
{
  "message": "текст",
  "user_id": "web_user_...",
  "context": {
    "current_view": "badge",
    "current_category": { "id": "11", "title": "...", "emoji": "..." },
    "current_badge": { "id": "11.3", "title": "...", "emoji": "...", "categoryId": "11" },
    "current_level": "Базовый уровень"
  }
}
```

**Response:**
```json
{
  "response": "текст ответа",
  "suggestions": ["...", "..."],
  "metadata": { "request_type": "badge_explanation" }
}
```

## 🧠 Логика обработки

**Файл:** `chatbot/core/response_generator.py`

**Типы запросов:**
- `badge_explanation` - объяснение значка
- `badge_level_explanation` - объяснение уровня
- `creative_ideas` - идеи и примеры
- `recommendations` - рекомендации
- `category_info` - информация о категории
- `philosophy` - философия системы
- `where_am_i` - где находится пользователь
- `general` - общий диалог

## 💾 Хранение контекста

**Рекомендуется:** Durable Objects по `user_id`

**Структура:**
- UserContext (current_category, current_badge, interests, level)
- История диалога (максимум 20 сообщений, в API отправляется 10)

## ✅ Чек-лист

- [ ] Настроить OPENAI_API_KEY
- [ ] Загрузить `public/ai-data/` в static assets или R2
- [ ] Перенести системный промпт
- [ ] Реализовать POST `/chat` endpoint
- [ ] Настроить хранение контекста (Durable Objects/KV)
- [ ] Реализовать классификацию request_type
- [ ] Протестировать

## 📚 Подробная документация

См. `CLOUDFLARE_BOT_SETUP_DATA.md` для полной информации.

