# Данные для подключения бота НейроВалюши к Cloudflare

Этот документ содержит все необходимые данные и конфигурации для развертывания чат-бота НейроВалюши на Cloudflare Workers/Pages.

## 1. API ключи и конфигурация OpenAI

### Переменные окружения (Environment Variables)

```bash
# Обязательные
OPENAI_API_KEY=sk-...                    # Ключ OpenAI API
OPENAI_MODEL=gpt-4o-mini                 # Модель (фиксированная)
OPENAI_BASE_URL=https://api.openai-proxy.com/v1  # Прокси (опционально, если нужен обход региональных ограничений)

# Настройки генерации (опционально, можно оставить дефолты)
OPENAI_MAX_TOKENS=1000                   # Максимальное количество токенов в ответе
OPENAI_TEMPERATURE=0.7                   # Температура генерации (0.0-1.0)
```

**Где используется:**
- `chatbot/core/openai_client.py` - инициализация клиента OpenAI
- `chatbot/config.py` - конфигурация по умолчанию

**Важно:**
- Если используется прокси `api.openai-proxy.com`, убедитесь что он доступен из Cloudflare
- Если прокси не нужен, используйте стандартный `https://api.openai.com/v1`
- **Для работы без VPN в РФ:** Установите `OPENAI_BASE_URL=https://api.openai-proxy.com/v1` в переменных окружения Cloudflare
- Код автоматически использует `OPENAI_BASE_URL` из переменных окружения, если он установлен
- Если `OPENAI_BASE_URL` не установлен, используется стандартный `https://api.openai.com/v1`

## 2. Структура данных Путеводителя

### Расположение данных

**Каноничное место:** `public/ai-data/`

**Структура:**
```
public/ai-data/
├── MASTER_INDEX.json                    # Главный индекс всех категорий
├── category-1/
│   ├── index.json                       # Индекс категории 1
│   ├── introduction.md                  # Введение в категорию
│   ├── 1.1.json                         # Данные значка 1.1
│   ├── 1.2.json                         # Данные значка 1.2
│   └── ...
├── category-2/
│   └── ...
└── category-14/
    ├── index.json
    ├── introduction.md
    ├── checklists/                      # Доп. материалы (только для категории 14)
    │   └── *.md
    ├── methodology/                      # Доп. материалы (только для категории 14)
    │   └── *.md
    └── *.json
```

### Формат MASTER_INDEX.json

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-XX",
  "categories": [
    {
      "id": "1",
      "title": "За личные достижения",
      "emoji": "⭐",
      "path": "category-1/",
      "badges": 16
    },
    ...
  ]
}
```

### Формат category-N/index.json

```json
{
  "levels": 38,
  "totalLevels": 38,
  "badgesData": [
    { "id": "1.1" },
    { "id": "1.2" },
    ...
  ],
  "additional_materials": {
    "checklists": [...],
    "methodology": [...]
  }
}
```

### Формат N.X.json (данные значка)

```json
{
  "id": "11.3",
  "title": "Помнящий Факты",
  "emoji": "🧠",
  "description": "...",
  "nameExplanation": "...",
  "skillTips": "...",
  "examples": "...",
  "importance": "...",
  "philosophy": "...",
  "howToBecome": "...",
  "criteria": ["...", "..."],
  "confirmation": ["...", "..."],
  "levels": [
    {
      "id": "11.3.1",
      "level": "Базовый уровень",
      "emoji": "🧠",
      "criteria": ["...", "..."],
      "confirmation": ["...", "..."]
    },
    ...
  ]
}
```

**Как загрузить в Cloudflare:**
- Вариант 1: Static Assets (для Workers/Pages) - загрузить всю папку `public/ai-data/` в assets
- Вариант 2: R2 Bucket - загрузить в R2 и читать через `R2Bucket.get()`
- Вариант 3: KV (не рекомендуется для больших файлов, только для индексов)

## 3. Системный промпт

### Основной промпт (Python версия)

**Файл:** `chatbot/prompts/putevoditel_system_prompt_optimized.py`

**Функция:** `get_system_prompt_optimized()` возвращает строку с промптом (~4000 токенов)

**Содержание:**
- Личность бота (НейроВалюша - дружелюбный вожатый)
- Стиль общения (эмодзи, живой язык, мотивация)
- Правила использования эмодзи
- Правила кросс-ссылок (`см. N.X`)
- Адрес и маршрут лагеря
- Контакты
- Текущая смена
- Медицинские документы
- Мемы и легенды лагеря
- БРО движение
- Структура системы значков

### JS версия промпта (для кликабельных ссылок)

**Файл:** `system_prompt.js`

**Отличия:** Требует использовать кликабельные ссылки формата:
- `checklists:название-файла` → открывает `/RL-Guide-book/ai-data/category-14/checklists/название-файла.md`
- `methodology:название-файла` → открывает `/RL-Guide-book/ai-data/category-14/methodology/название-файла.md`
- `см. N.X` → открывает значок N.X

**Какой использовать:**
- Если фронтенд поддерживает кликабельные ссылки → JS версия
- Если нет → Python версия

### Динамические факты

**Файл:** `chatbot/prompts/facts.json`

**Содержание:**
```json
{
  "address": {
    "campName": "Реальный Лагерь",
    "base": "Град Детинец",
    "address": "Ленинградская область, Выборгский район, ...",
    "route": "от м. Гражданский проспект и м. Проспект Просвещения маршрутка №827"
  },
  "contacts": {
    "phone": "+79319515489",
    "email": "realcampspb@yandex.ru",
    "vk": "https://vk.com/realcampspb",
    "site": "https://realcampspb.ru/",
    "telegram": "https://t.me/realcampspb",
    "organizer": "https://t.me/Stivanovv"
  },
  "currentSeason": {
    "name": "Осенний 4К-вайб в Реальном Лагере: ...",
    "dates": "25.10.2025 — 02.11.2025 (9 дней)",
    "price": "23 750 рублей (с учётом сертификата СПб)",
    "theme": "4К-навыки + нейросети для творчества"
  }
}
```

**Как использовать:**
- Подмешивать в системный промпт при инициализации
- Обновлять при изменении смены/контактов

**Файл логики:** `chatbot/prompts/system_prompt.py` - функция `get_system_prompt_with_context()`

## 4. Модели данных (API контракт)

### ChatRequest (запрос к боту)

**Файл:** `chatbot/models/conversation.py`

```typescript
interface ChatRequest {
  message: string;                        // Текст сообщения пользователя
  user_id: string;                       // ID пользователя (например, "web_user_...")
  context?: WebContext;                  // Контекст из веб-интерфейса (опционально)
}

interface WebContext {
  current_view?: string;                 // "intro" | "categories" | "category" | "badge" | "badge-level" | ...
  current_category?: {                   // Текущая категория
    id: string;
    title: string;
    emoji?: string;
  };
  current_badge?: {                      // Текущий значок
    id: string;                          // Например, "11.3" или "11.3.2"
    title: string;
    emoji?: string;
    categoryId: string;
  };
  current_level?: string;                // "Базовый уровень" | "Продвинутый уровень" | "Экспертный уровень"
  current_level_badge_title?: string;    // Название конкретного уровня значка
}
```

### ChatResponse (ответ бота)

```typescript
interface ChatResponse {
  response: string;                      // Текст ответа бота
  suggestions?: string[];                // Предложения для пользователя (опционально)
  context_updates?: UserContext;         // Обновления контекста (опционально)
  metadata?: {                           // Метаданные (опционально)
    request_type?: string;               // Тип запроса: "badge_explanation", "category_info", "creative_ideas", ...
    timestamp?: string;
  };
}

interface UserContext {
  user_id: string;
  current_category?: string;
  current_badge?: string;
  interests?: string[];
  level?: string;                        // "beginner" | "intermediate" | "advanced"
}
```

### Endpoint

**POST** `/chat`

**Content-Type:** `application/json`

**Пример запроса:**
```json
{
  "message": "Что такое значок Помнящий Факты?",
  "user_id": "web_user_12345",
  "context": {
    "current_view": "badge",
    "current_category": {
      "id": "11",
      "title": "Реальность: осознанность и внимательность",
      "emoji": "🕵️"
    },
    "current_badge": {
      "id": "11.3",
      "title": "Помнящий Факты",
      "emoji": "🧠",
      "categoryId": "11"
    }
  }
}
```

**Пример ответа:**
```json
{
  "response": "🧠 **Помнящий Факты** — это значок про развитие памяти и внимательности...",
  "suggestions": [
    "Как получить этот значок?",
    "Какие есть уровни?"
  ],
  "metadata": {
    "request_type": "badge_explanation",
    "timestamp": "2025-01-XX..."
  }
}
```

## 5. Логика обработки запросов

### Классификация типа запроса (request_type)

**Файл:** `chatbot/core/response_generator.py` - метод `_analyze_request_type()`

**Типы запросов:**

| request_type | Когда срабатывает | Какие экраны усиливают |
|--------------|-------------------|------------------------|
| `where_am_i` | "где я / что за экран / на какой странице..." | любой |
| `badge_level_explanation` | "объясни/что такое/как получить/критерии/подтверждение..." | `badge-level` + есть `current_level` |
| `badge_explanation` | "что за значок/объясни/что такое/как получить..." | `badge` (или есть `current_badge`) |
| `badge_levels_explanation` | "уровни/ступени/базовый/продвинутый/экспертный" | `badge` |
| `creative_ideas` | "идеи/примеры/варианты/как сделать" | `badge`, `badge-level` (или в общем случае) |
| `recommendations` | "рекомендуй/посоветуй/что выбрать/подходящий" | `category` (или в общем случае) |
| `category_info` | "что такое категория/расскажи/объясни..." | `category`, `intro`, `introduction` |
| `philosophy` | "философия/зачем/почему/смысл/награды/ачивки..." | `intro` (и частично `category`) |
| `general` | всё остальное; отдельно "ии/нейросети/ai" принудительно ведёт сюда | любой |

**Ключевые слова для определения типа:**
- См. код в `response_generator.py` строки ~200-300

### Генерация ответов

**Файл:** `chatbot/core/response_generator.py`

**Методы генерации:**
- `_generate_badge_explanation()` - объяснение значка
- `_generate_badge_level_explanation()` - объяснение конкретного уровня
- `_generate_creative_ideas()` - креативные идеи
- `_generate_recommendations()` - рекомендации
- `_generate_category_info()` - информация о категории
- `_generate_philosophy()` - философия системы
- `_generate_where_am_i()` - где находится пользователь
- `_generate_general()` - общий диалог

**Важно:**
- Каждый метод использует свой `max_tokens` (см. таблицу в AGENT_REPO_GUIDE.md)
- Данные о значках загружаются лениво (только нужные)
- Ответы постобрабатываются: удаление markdown, ограничение длины (~2500 символов)

## 6. Контекст и память диалога

### Структура контекста пользователя

**Файл:** `chatbot/core/context_manager.py`

**UserContext:**
```typescript
{
  user_id: string;
  current_category?: string;            // ID категории (например, "11")
  current_badge?: string;                // ID значка (например, "11.3" или "11.3.2")
  interests?: string[];                  // Интересы пользователя
  level?: string;                        // "beginner" | "intermediate" | "advanced"
}
```

**Важно:**
- Нормализация ID: `11.3.2` → `11.3` (уровень хранится отдельно в `current_level`)
- Web-контекст имеет приоритет над автоопределением из сообщения

### История диалога

**Ограничения:**
- Максимум 20 сообщений в памяти (ContextManager)
- Максимум 10 сообщений отправляется в OpenAI API (openai_client.py)

**Формат сообщения:**
```typescript
{
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: object;
}
```

### Хранение в Cloudflare

**Рекомендуемые варианты:**
1. **Durable Objects** (предпочтительно) - для хранения контекста и истории по `user_id`
2. **KV** (альтернатива) - для простых случаев, но хуже для частых обновлений

**Структура в Durable Object:**
```typescript
{
  user_id: string;
  context: UserContext;
  messages: Message[];                    // Последние 20 сообщений
  updated_at: string;
}
```

## 7. Cloudflare конфигурация

### Bindings (привязки)

**KV Namespace:**
- `NEUROVALYUSHA_KV` (опционально) - для кэширования данных или простого хранения контекста

**R2 Bucket:**
- `AI_DATA_BUCKET` (опционально) - для хранения `ai-data/` если не используете static assets

**Durable Objects:**
- `UserContextDO` - для хранения контекста и истории диалогов по `user_id`

**Environment Variables:**
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1  # или прокси
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
```

### Routes (маршруты)

**Workers:**
- `/chat` → POST endpoint для чата
- `/health` → GET endpoint для проверки работоспособности (опционально)

**Pages:**
- Если используете Pages Functions, маршруты настраиваются через файловую структуру

## 8. Файлы для переноса

### Обязательные файлы

1. **Системный промпт:**
   - `chatbot/prompts/putevoditel_system_prompt_optimized.py` (или `system_prompt.js`)
   - `chatbot/prompts/facts.json`

2. **Логика обработки:**
   - `chatbot/core/response_generator.py` - логика классификации и генерации
   - `chatbot/core/context_manager.py` - логика управления контекстом (адаптировать под Durable Objects/KV)

3. **Модели данных:**
   - `chatbot/models/conversation.py` - ChatRequest, ChatResponse, WebContext

4. **Данные:**
   - Вся папка `public/ai-data/` (загрузить в static assets или R2)

### Файлы для справки (не обязательно переносить)

- `chatbot/core/openai_client.py` - пример работы с OpenAI (адаптировать под Workers)
- `chatbot/core/data_loader.py` - пример загрузки данных (адаптировать под fetch/R2)
- `chatbot/main.py` - пример FastAPI endpoint (адаптировать под Workers)

## 9. Чек-лист для агента

- [ ] Настроить переменные окружения (OPENAI_API_KEY, модель, прокси если нужен)
- [ ] Загрузить данные `public/ai-data/` в static assets или R2
- [ ] Перенести системный промпт (Python или JS версия)
- [ ] Перенести `facts.json` и логику подмешивания в промпт
- [ ] Реализовать классификацию `request_type` (из `response_generator.py`)
- [ ] Реализовать генераторы ответов для каждого типа запроса
- [ ] Настроить хранение контекста (Durable Objects или KV)
- [ ] Реализовать нормализацию ID (`11.3.2` → `11.3`)
- [ ] Реализовать ограничение истории (20 сообщений в памяти, 10 в API)
- [ ] Реализовать POST `/chat` endpoint с контрактом ChatRequest/ChatResponse
- [ ] Настроить CORS для фронтенда
- [ ] Протестировать работу с реальными запросами

## 10. Дополнительные материалы

### Документация

- `AGENT_REPO_GUIDE.md` - подробный гайд по репозиторию
- `chatbot/README.md` - документация бота

### Важные детали

1. **Нормализация badge ID:**
   - `11.3.2` (уровень) → `11.3` (значок)
   - Уровень хранится отдельно в `current_level`

2. **Ленивая загрузка данных:**
   - Загружать только нужные категории/значки
   - Кэшировать загруженные данные

3. **Оптимизация токенов:**
   - Системный промпт: ~4000 токенов
   - История: максимум 10 сообщений
   - Данные о значках: только текущий значок в контексте

4. **Постобработка ответов:**
   - Удаление markdown (если не нужен)
   - Ограничение длины (~2500 символов)
   - Нормализация эмодзи

## 11. Настройка для работы без VPN в РФ

### Проблема

OpenAI API может быть недоступен для пользователей из РФ, даже если запросы идут с сервера Cloudflare. Для решения этой проблемы нужно использовать прокси-сервис.

### Решение

1. **Установите переменную окружения `OPENAI_BASE_URL` в Cloudflare Dashboard:**
   - Откройте Cloudflare Dashboard → Workers & Pages → `real-vibe-ai-studio`
   - Перейдите в Settings → Environment Variables
   - Добавьте переменную:
     - **Name:** `OPENAI_BASE_URL`
     - **Value:** `https://api.openai-proxy.com/v1`
   - Сохраните изменения

2. **Альтернативные прокси-сервисы:**
   - `https://api.openai-proxy.com/v1` - публичный прокси (рекомендуется)
   - `https://openrouter.ai/api/v1` - OpenRouter API (требует отдельный API ключ)
   - Другие прокси-сервисы, которые работают в РФ

3. **Проверка работы:**
   - После настройки проверьте работу бота на продакшене
   - Проверьте логи в Cloudflare Dashboard для диагностики ошибок
   - Убедитесь, что прокси-сервис доступен из Cloudflare

### Важно

- Код автоматически использует `OPENAI_BASE_URL` из переменных окружения
- Если `OPENAI_BASE_URL` не установлен, используется стандартный `https://api.openai.com/v1`
- Убедитесь, что прокси-сервис работает и доступен из Cloudflare
- Для локальной разработки можно установить `OPENAI_BASE_URL` в `.env` файле

## Контакты для вопросов

Если у агента возникнут вопросы по структуре данных или логике, можно обратиться к:
- Документации в `AGENT_REPO_GUIDE.md`
- Коду в `chatbot/core/response_generator.py` для логики обработки
- Коду в `chatbot/prompts/system_prompt.py` для формирования промпта

