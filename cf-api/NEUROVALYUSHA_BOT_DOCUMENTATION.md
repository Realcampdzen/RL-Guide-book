# НейроВалюша: Полная документация бота

## 📋 Оглавление

1. [Описание проделанной работы](#описание-проделанной-работы)
2. [Архитектура бота](#архитектура-бота)
3. [Компоненты системы](#компоненты-системы)
4. [Потоки данных](#потоки-данных)
5. [Мониторинг и диагностика](#мониторинг-и-диагностика)
6. [Рекомендации по улучшению](#рекомендации-по-улучшению)
7. [Чек-лист проверки](#чек-лист-проверки)

---

## Описание проделанной работы

### Этап 1: Модульная система промптов для чата

**Цель:** Интегрировать большой экспертный промпт (~7,057 токенов) по значкам без увеличения стоимости каждого запроса.

**Что сделано:**
- Создан модульный подход к промптам через `buildSystemPrompt(mode)`
- Режимы промптов:
  - `chat-basic` — базовый промпт для чата без контекста значков
  - `chat-with-badge` — базовый промпт + экспертный промпт по значкам
  - `social` — промпт для VK/TG (без экспертного промпта)
- Экспертный промпт (`NEUROVALYUSHA_BADGE_EXPERTISE`) добавляется только когда есть `context.current_badge`
- Динамическая подгрузка данных значков через `ai_data_loader.ts` с кэшированием в KV (TTL 10 минут)

**Файлы:**
- `cf-api/src/neurovalyusha/constants.ts` — модульная система промптов
- `cf-api/src/neurovalyusha/ai_data_loader.ts` — загрузчик данных значков
- `cf-api/src/index.tsx` — интеграция в `/api/valyusha/chat`

### Этап 2: Прогрессивный контекст значков для соцсетей

**Цель:** Улучшить качество комментариев в VK/TG, добавляя детальную информацию о значках когда это уместно, без увеличения количества API вызовов.

**Что сделано:**
- Создан `selectSocialBadgeDecision()` — умный резолвер, который определяет:
  - Нужен ли значок (по явному ID или scoring)
  - Уровень детализации (`minimal` / `standard`)
  - Intent пользователя (`mention` / `explain` / `how_to_get`)
- Добавлены утилиты:
  - `extractExplicitBadgeId()` — поиск явного ID значка в тексте
  - `classifyBadgeIntent()` — классификация намерения (без LLM, на правилах)
  - `formatSocialBadgeContextMinimal()` / `formatSocialBadgeContextStandard()` — форматирование контекста
- Интеграция во все 4 точки обработки (VK/TG new post + reply)
- Диагностика через KV ключи `nv:vk:lastBadgeDecision` / `nv:tg:lastBadgeDecision`

**Ограничения (соблюдены):**
- ✅ 1 запрос к OpenAI на событие
- ✅ 1 запрос к VK API / TG API на событие
- ✅ Дополнительные запросы только к ASSETS (не внешние API)
- ✅ Fallback на текущее поведение при ошибках

**Файлы:**
- `cf-api/src/neurovalyusha/handlers.ts` — основная логика обработки событий

### Этап 3: Интеграция данных о лагере

**Цель:** Научить бота ориентироваться в контактах, документах, месте смены, названии лагеря, адресе и других важных фактах.

**Что сделано:**
- Создан `camp_facts.ts` для динамических данных (адрес, контакты, текущая смена)
- Добавлена константа `CAMP_STATIC_INFO` со статическими данными:
  - Медицинские документы
  - Связь с ребёнком
  - Питание и диетические особенности
  - Возраст и формат
  - Педагоги и атмосфера
  - Мемы и легенды лагеря
  - БРО движение
- Интегрировано в промпты через `buildSystemPrompt()`:
  - Для чата: полная статическая информация + динамические факты
  - Для соцсетей: полная статическая информация + динамические факты

**Файлы:**
- `cf-api/src/neurovalyusha/camp_facts.ts` — данные о лагере
- `cf-api/src/neurovalyusha/constants.ts` — интеграция в промпты

---

## Архитектура бота

### Общая схема

```
┌─────────────────┐
│  VK Callback    │
│  Telegram API   │
│  Web Chat API   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│         index.tsx / handlers.ts     │
│  • Роутинг событий                  │
│  • Валидация запросов               │
│  • Обработка событий                │
└────────┬────────────────────────────┘
         │
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   VK Bot     │  │ Telegram Bot │  │  Web Chat    │
│              │  │              │  │              │
│ • New Post   │  │ • Auto Fwd   │  │ • Basic      │
│ • Reply      │  │ • Reply      │  │ • With Badge │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   OpenAI     │  │   KV Store   │  │   ASSETS     │
│   API        │  │              │  │              │
│              │  │ • Memory     │  │ • ai-data    │
│ • GPT-4o     │  │ • Cache      │  │ • Badges     │
│ • 1 call     │  │ • Decisions  │  │ • Categories │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Ключевые принципы

1. **Один запрос OpenAI на событие** — строго соблюдается
2. **Один запрос к внешнему API на отправку** — VK API / TG API
3. **Кэширование** — KV для памяти, решений, кэша данных (TTL 10 минут для ai-data)
4. **Fallback** — при ошибках бот не падает, возвращается к безопасному поведению
5. **Модульность** — промпты собираются динамически в зависимости от контекста

---

## Компоненты системы

### 1. Роутинг и обработка событий (`index.tsx`)

**Эндпоинты:**
- `POST /api/vk/callback` — события от VK Callback API
- `POST /api/telegram/webhook` — события от Telegram Bot API
- `POST /api/valyusha/chat` — чат из веб-приложения

**Ключевые функции:**
- `handleVkCallback()` — валидация и маршрутизация VK событий
- `handleTelegramWebhook()` — валидация и маршрутизация TG событий
- `handleBotChat()` — обработка чата с веб-интерфейса

### 2. Обработка социальных сетей (`handlers.ts`)

#### VK Bot

**События:**
- `wall_post_new` — новый пост в группе
  - Проверка дубликатов (`nv:vk:post:{ownerId}:{postId}:commented`)
  - Подбор значка через `selectSocialBadgeDecision()`
  - Загрузка данных значка (если нужно)
  - Генерация комментария через `generateValyushaText()`
  - Отправка через `vkCreateComment()`
  - Сохранение в память разговора

- `wall_reply_new` — новый комментарий в ветке
  - Проверка: ответ ли на наш комментарий или есть триггер (`shouldReplyToText()`)
  - Загрузка памяти разговора из KV
  - Подбор значка с учётом контекста ветки
  - Генерация ответа
  - Отправка ответа
  - Сохранение в память

#### Telegram Bot

**События:**
- Автопересылка из канала в группу обсуждения
  - Проверка дубликатов и блокировок
  - Обработка медиагрупп (альбомов)
  - Получение URL изображений
  - Подбор значка и генерация комментария
  - Отправка в группу обсуждения

- Ответ в ветке обсуждения
  - Аналогично VK, но с учётом специфики TG API

#### Утилиты для значков

**`selectSocialBadgeDecision()`:**
- Вход: `triggerText`, `searchText`, `threadMemory`, `platform`
- Выход: `{ badgeId, fields, intent, reason, score, titleHits, explicit }`
- Логика:
  1. Поиск явного ID значка в тексте
  2. Если не найден — scoring через `scoreBadges()`
  3. Проверка порога релевантности (`score >= 8 || (score >= 6 && titleHits > 0)`)
  4. Ротация (избегание повторений)
  5. Классификация intent (`mention` / `explain` / `how_to_get`)
  6. Выбор уровня детализации (`minimal` для mention, `standard` для explain/how_to_get)

**`classifyBadgeIntent()`:**
- Правила (без LLM):
  - `how_to_get` — если есть слова "как получить", "критерии", "условия", "что нужно"
  - `explain` — если есть "что за", "расскажи", "объясни", "почему" + упоминание значка
  - `mention` — по умолчанию

**`formatSocialBadgeContextMinimal()`:**
- ID + название + краткое описание (клипнуто до 140 символов)

**`formatSocialBadgeContextStandard()`:**
- ID + название + описание + советы + примеры + критерии (все поля клипнуты)

### 3. Система промптов (`constants.ts`)

**Модульная структура:**

```typescript
buildSystemPrompt(mode: PromptMode, includeFacts: boolean = true)
```

**Режимы:**
- `social` — для VK/TG
  - Базовый промпт `NEUROVALYUSHA_SOCIAL_SYSTEM`
  - Статическая информация `CAMP_STATIC_INFO`
  - Динамические факты `formatCampFacts(CAMP_FACTS)`

- `chat-basic` — для чата без контекста значка
  - Базовый промпт `NEUROVALYUSHA_CHAT_SYSTEM`
  - Статическая информация `CAMP_STATIC_INFO`
  - Динамические факты `formatCampFacts(CAMP_FACTS)`

- `chat-with-badge` — для чата с контекстом значка
  - Базовый промпт `NEUROVALYUSHA_CHAT_SYSTEM`
  - Экспертный промпт `NEUROVALYUSHA_BADGE_EXPERTISE`
  - Статическая информация `CAMP_STATIC_INFO`
  - Динамические факты `formatCampFacts(CAMP_FACTS)`

### 4. Загрузка данных (`ai_data_loader.ts`)

**Функции:**
- `loadBadgeIndex()` — загрузка индекса всех значков
- `loadCategoryIndex()` — загрузка индекса категории
- `loadBadgeData()` — загрузка данных значка с кэшированием

**Кэширование:**
- Ключ: `nv:ai-data:badge:{badgeId}:{fields}`
- TTL: 10 минут (600 секунд)
- Источник: `env.ASSETS.fetch` → `/ai-data/category-{id}/{badgeId}.json`

**Режимы загрузки:**
- `minimal` — только ID, название, emoji, краткое описание
- `standard` — добавляет categoryId, skillTips
- `full` — все поля (для чата)

### 5. Работа с памятью (`memory.ts`)

**Структура:**
- Ключ: `nv:{platform}:conv:{ownerId}:{postId}` или `nv:tg:conv:{chatId}:{rootId}`
- Формат: массив `MemoryMessage[]` с `role`, `content`, `ts`
- Лимит: 10 последних сообщений в `getConversationMemory()`

### 6. KV Store — диагностика

**Ключи для VK:**
- `nv:vk:lastWallPostNew` — последний обработанный новый пост
- `nv:vk:lastWallReplyNew` — последний обработанный ответ
- `nv:vk:lastBadgeDecision` — последнее решение по значку
- `nv:vk:recentBadges` — список недавних значков (для ротации)
- `nv:vk:post:{ownerId}:{postId}:commented` — маркер комментирования поста
- `nv:vk:myComment:{commentId}` — маркер наших комментариев
- `nv:vk:conv:{ownerId}:{postId}` — память разговора

**Ключи для Telegram:**
- `nv:tg:lastAutoForward` — последняя автопересылка
- `nv:tg:lastBadgeDecision` — последнее решение по значку
- `nv:tg:recentBadges` — список недавних значков
- `nv:tg:conv:{chatId}:{rootId}` — память разговора
- `nv:tg:myMessage:{chatId}:{messageId}` — маркер наших сообщений

---

## Потоки данных

### Сценарий 1: Новый пост в VK

```
1. VK Callback API → POST /api/vk/callback
   └─> event: wall_post_new

2. processVkCallbackEvent()
   ├─> Валидация (group_id, secret)
   └─> handleVkWallPostNew()

3. handleVkWallPostNew()
   ├─> Проверка дубликата (KV: nv:vk:post:{ownerId}:{postId}:commented)
   ├─> Сохранение поста в память (KV: nv:vk:conv:{ownerId}:{postId})
   ├─> selectSocialBadgeDecision()
   │   ├─> extractExplicitBadgeId() → проверка явного ID
   │   ├─> scoreBadges() → поиск по индексу
   │   ├─> Проверка порога релевантности
   │   ├─> Ротация (избегание повторений)
   │   └─> classifyBadgeIntent() → определение уровня детализации
   ├─> loadBadgeData() (если нужен контекст)
   │   ├─> Проверка кэша KV
   │   ├─> ASSETS.fetch если нет кэша
   │   └─> Сохранение в кэш (TTL 10 мин)
   ├─> formatSocialBadgeContextMinimal() / formatSocialBadgeContextStandard()
   ├─> buildMessagesForNewPost()
   │   └─> buildSystemPrompt('social') → сборка промпта
   ├─> generateValyushaText()
   │   └─> callOpenAIChat() → 1 запрос к OpenAI
   ├─> vkCreateComment()
   │   └─> fetch(VK API) → 1 запрос к VK API
   └─> Сохранение результата в KV (nv:vk:lastWallPostNew, nv:vk:lastBadgeDecision)
```

### Сценарий 2: Чат из веб-приложения

```
1. Web App → POST /api/valyusha/chat
   └─> body: { message, context: { current_badge } }

2. handleBotChat()
   ├─> Определение режима: current_badge ? 'chat-with-badge' : 'chat-basic'
   ├─> buildSystemPrompt(mode)
   │   ├─> Базовый промпт
   │   ├─> Экспертный промпт (если chat-with-badge)
   │   ├─> CAMP_STATIC_INFO
   │   └─> formatCampFacts(CAMP_FACTS)
   ├─> loadBadgeData() (если current_badge)
   ├─> formatBadgeContext()
   ├─> callOpenAI()
   └─> Возврат ответа
```

---

## Мониторинг и диагностика

### Ключевые метрики в KV

**Для каждого события сохраняется:**
- `ts` — timestamp события
- `ok` — успешность обработки
- `reason` — причина пропуска/ошибки
- `badgeId` — выбранный значок (если есть)
- `score`, `titleHits` — метрики релевантности

**Пример проверки в Cloudflare Dashboard:**
```
KV Namespace → Browse → Ключ: nv:vk:lastBadgeDecision
```

**Что смотреть:**
- `fields: 'standard'` — бот решил дать детальный контекст
- `fields: 'minimal'` — бот решил упомянуть кратко
- `fields: null` — значок не выбран
- `explicit: true` — найден явный ID в тексте
- `reason: 'weak_match'` — релевантность слабая

### Типичные проблемы и диагностика

**1. Бот не отвечает на посты**
- Проверить: `nv:vk:lastWallPostNew` → `ok: false`, `reason`
- Возможные причины:
  - `missing_vk_access_token` → проверить env переменную
  - `bad_owner_id` → проверить VK_GROUP_ID
  - `already_commented` → пост уже обработан

**2. Бот не выбирает значки**
- Проверить: `nv:vk:lastBadgeDecision` → `reason`, `score`
- Возможные причины:
  - `no_index` → проблема с загрузкой индекса
  - `weak_match` → релевантность ниже порога
  - `no_match` → нет совпадений в индексе

**3. Ошибки OpenAI API**
- Проверить: логи в Cloudflare Dashboard → Workers → Logs
- Возможные причины:
  - Недостаточно средств на счету OpenAI
  - Превышен rate limit
  - Неверный API ключ

**4. Ошибки VK API**
- Проверить: `nv:vk:lastCreateCommentError` (если есть)
- Возможные причины:
  - `403 Forbidden` → проверить права группы
  - `access_token` истёк
  - Группа не в режиме комментариев

---

## Рекомендации по улучшению

### 1. Надёжность

#### Текущее состояние
- ✅ Fallback на безопасное поведение при ошибках
- ✅ Кэширование данных значков (TTL 10 минут)
- ✅ Проверка дубликатов перед обработкой

#### Рекомендации

**А) Добавить retry-логику для критичных операций:**
```typescript
async function callOpenAIWithRetry(params, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callOpenAIChat(params)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await sleep(1000 * (i + 1)) // экспоненциальная задержка
    }
  }
}
```

**Б) Улучшить обработку ошибок ASSETS:**
- Текущее: возвращается `null` при ошибке
- Рекомендуется: логировать ошибки в KV для диагностики
```typescript
await kvPutJson(kv, `nv:error:assets:${badgeId}`, {
  ts: nowTs(),
  error: error.message,
  badgeId,
}, { ttlSeconds: 60 * 60 })
```

**В) Добавить circuit breaker для внешних API:**
- Отслеживать процент ошибок за последние 5 минут
- При превышении порога (например, 50%) временно отключать бота

### 2. Оптимизация

#### Текущее состояние
- ✅ Один запрос OpenAI на событие
- ✅ Кэширование данных значков
- ✅ Клиппинг длинных полей

#### Рекомендации

**А) Оптимизация размера промптов:**
- Текущий размер `CAMP_STATIC_INFO` + `formatCampFacts()` может быть большим для соцсетей
- Рекомендуется: создать облегчённую версию для соцсетей (только самое важное)
```typescript
export const CAMP_STATIC_INFO_LITE = `Возраст: 12-17 лет. Педагоги: Стёпа и Валя. Документы: справка 079/У, прививки, анализы.`
```

**Б) Улучшить кэширование индекса значков:**
- Текущее: индекс загружается при каждом вызове `selectSocialBadgeDecision()`
- Рекомендуется: кэшировать индекс в памяти Workers (с TTL)
```typescript
let badgeIndexCache: { data: BadgeIndexEntry[], expires: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 минут

async function getCachedBadgeIndex(env) {
  if (badgeIndexCache && badgeIndexCache.expires > Date.now()) {
    return badgeIndexCache.data
  }
  const index = await loadBadgeIndex(env)
  badgeIndexCache = { data: index, expires: Date.now() + CACHE_TTL }
  return index
}
```

**В) Оптимизация памяти разговора:**
- Текущее: сохраняется весь текст сообщений
- Рекомендуется: обрезать старые сообщения до ключевых фраз при превышении лимита токенов

### 3. Качество работы

#### Текущее состояние
- ✅ Умный подбор значков (scoring + ротация)
- ✅ Определение intent без LLM
- ✅ Прогрессивный контекст (minimal/standard)

#### Рекомендации

**А) Улучшить scoring значков:**
- Текущее: простой подсчёт совпадений токенов
- Рекомендуется: учитывать синонимы, категории, контекст разговора
```typescript
// Пример улучшенного scoring
function scoreBadgesAdvanced(index: BadgeIndexEntry[], text: string, context: ConversationContext): ScoredBadge[] {
  // Учитывать:
  // - Синонимы (через словарь или embeddings)
  // - Контекст разговора (уже упомянутые темы)
  // - Время года (сезонные значки)
  // - Категорию текущего обсуждения
}
```

**Б) A/B тестирование промптов:**
- Создать варианты промптов (например, более формальный vs более дружелюбный)
- Сохранять в KV какой вариант использовался
- Анализировать метрики (вовлеченность, количество вопросов)

**В) Обратная связь от пользователей:**
- Добавить реакцию "👍" / "👎" на комментарии бота
- Сохранять в KV для анализа качества

**Г) Улучшить определение intent:**
- Текущее: правила на ключевых словах
- Рекомендуется: использовать embeddings для более точного определения (но без дополнительных API вызовов, можно через встроенный векторный поиск)

### 4. Мониторинг и алерты

#### Рекомендации

**А) Метрики для отслеживания:**
- Количество обработанных событий в час
- Процент успешных ответов
- Среднее время обработки события
- Процент событий с выбранными значками
- Процент событий с детальным контекстом (`standard`)

**Б) Алёрты:**
- Если процент ошибок OpenAI > 10% за 5 минут → алерт
- Если бот не ответил ни на один пост за час → алерт
- Если размер ответа OpenAI > 2000 токенов → предупреждение (возможна переоплата)

**В) Дашборд:**
- Создать простой дашборд (например, через Grafana или Cloudflare Analytics)
- Отображать: события/час, успешность, популярные значки, средний score

### 5. Безопасность

#### Текущее состояние
- ✅ Валидация secret для VK и Telegram
- ✅ Проверка group_id для VK
- ✅ Санитизация текста перед отправкой

#### Рекомендации

**А) Rate limiting:**
- Ограничить количество запросов от одного IP
- Защита от спама (если один пользователь задаёт много вопросов)

**Б) Валидация входных данных:**
- Проверить длину текста перед отправкой в OpenAI
- Санитизация специальных символов

**В) Логирование подозрительной активности:**
- Сохранять в KV подозрительные паттерны (много запросов, странные символы)

---

## Чек-лист проверки

### Перед деплоем

- [ ] Проверить, что все env переменные настроены:
  - `OPENAI_API_KEY`
  - `VK_SECRET`, `VK_GROUP_ID`, `VK_ACCESS_TOKEN`
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
  - `NEUROVALYUSHA_KV` (binding)
  - `ASSETS` (binding)

- [ ] Проверить сборку: `npm run build` проходит без ошибок

- [ ] Проверить, что `camp_facts.ts` содержит актуальные данные (синхронизировано с `chatbot/prompts/facts.json`)

- [ ] Проверить, что `CAMP_STATIC_INFO` содержит актуальную информацию
  - При изменении тона/правил или статических блоков в `chatbot/prompts/` вручную проверить и обновить константы `CAMP_STATIC_INFO` и `NEUROVALYUSHA_SOCIAL_SYSTEM` в `constants.ts`. Подробности — [docs/DATA_SYNC.md](../docs/DATA_SYNC.md) в корне репозитория.

### После деплоя

- [ ] Проверить health endpoint: `GET /health` возвращает `200 OK`

- [ ] Проверить VK Callback:
  - Создать тестовый пост в группе
  - Проверить KV: `nv:vk:lastWallPostNew` содержит `ok: true`
  - Проверить, что комментарий появился под постом

- [ ] Проверить Telegram:
  - Переслать пост из канала
  - Проверить KV: `nv:tg:lastAutoForward` содержит `decision: 'sent'`
  - Проверить, что комментарий появился в группе обсуждения

- [ ] Проверить подбор значков:
  - Создать пост с явным ID значка (например, "что за значок 12.3?")
  - Проверить KV: `nv:vk:lastBadgeDecision` содержит `explicit: true`, `fields: 'standard'`

- [ ] Проверить чат:
  - Отправить сообщение без контекста → должен использоваться `chat-basic`
  - Отправить сообщение с `context.current_badge` → должен использоваться `chat-with-badge`

- [ ] Проверить кэширование:
  - Запросить один и тот же значок дважды
  - Второй запрос должен быть быстрее (данные из кэша)

### Регулярные проверки (раз в неделю)

- [ ] Проверить KV на наличие ошибок:
  - `nv:vk:lastWallPostNew`, `nv:vk:lastWallReplyNew`
  - Посмотреть на `ok: false` и разобраться с причинами

- [ ] Проверить актуальность данных:
  - Сверить `CAMP_FACTS` с реальной информацией о текущей смене
  - Обновить если нужно

- [ ] Проверить логи Cloudflare Workers на наличие ошибок

- [ ] Проверить использование OpenAI API:
  - Сколько токенов потребляется
  - Нет ли аномальных всплесков

### При проблемах

1. **Бот не отвечает:**
   - Проверить KV ключи последних событий
   - Проверить логи Cloudflare Workers
   - Проверить баланс OpenAI API

2. **Бот выбирает нерелевантные значки:**
   - Проверить `nv:*:lastBadgeDecision` → `score`, `titleHits`
   - Возможно, нужно повысить порог релевантности

3. **Бот слишком много токенов использует:**
   - Проверить размер промптов
   - Возможно, нужно использовать `CAMP_STATIC_INFO_LITE` для соцсетей

4. **Бот повторяет одни и те же значки:**
   - Проверить логику ротации в `selectSocialBadgeDecision()`
   - Возможно, нужно увеличить размер списка "недавних" значков

---

## Структура файлов

### Основные файлы

```
cf-api/src/
├── index.tsx                          # Главный роутер и обработка веб-чата
└── neurovalyusha/
    ├── handlers.ts                    # Обработка VK/TG событий (основная логика)
    ├── constants.ts                   # Промпты и константы
    ├── camp_facts.ts                  # Данные о лагере (динамические)
    ├── ai_data_loader.ts              # Загрузка данных значков из ASSETS
    ├── guidebook_index.ts             # Индекс значков и scoring
    ├── openai.ts                      # Клиент OpenAI API
    ├── kv.ts                          # Утилиты для работы с KV
    └── memory.ts                      # Управление памятью разговоров
```

### Ключевые зависимости

- **Hono** — веб-фреймворк для Cloudflare Workers
- **@cloudflare/workers-types** — типы для Workers API
- **OpenAI API** — GPT-4o для генерации ответов

### Важные файлы данных

- `cf-api/prompts/facts.json` — источник данных для `camp_facts.ts` (нужно синхронизировать)
- `cf-api/public/static/guidebook-badges-index.json` — индекс всех значков
- `cf-api/public/ai-data/` — структурированные данные значков (MASTER_INDEX.json, category-*/)

---

## Зависимости и обновления данных

### Синхронизация данных о лагере

**Важно:** При изменении данных о лагере нужно обновить два места:

1. **`cf-api/prompts/facts.json`** (Python версия бота)
2. **`cf-api/src/neurovalyusha/camp_facts.ts`** (TypeScript версия)

**Что синхронизировать:**
- Адрес и маршрут
- Контакты
- Текущая смена (название, даты, цена, тематика)

### Обновление данных значков

1. Обновить файлы в `cf-api/public/ai-data/`
2. Обновить `cf-api/public/static/guidebook-badges-index.json`
3. Кэш в KV обновится автоматически (TTL 10 минут)
4. При необходимости можно очистить кэш через Cloudflare Dashboard → KV → Delete keys (паттерн: `nv:ai-data:badge:*`)

---

## Ссылки и ресурсы

- **Репозиторий:** [путь к репозиторию]
- **Cloudflare Dashboard:** https://dash.cloudflare.com/
- **VK Callback API Docs:** https://dev.vk.com/api/callback/getting-started
- **Telegram Bot API Docs:** https://core.telegram.org/bots/api
- **OpenAI API Docs:** https://platform.openai.com/docs/api-reference

---

## Контакты для поддержки

- **Разработчик:** [ваше имя]
- **Дата последнего обновления:** 2025-01-21
- **Версия документа:** 1.0

