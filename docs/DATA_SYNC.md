# Data sync: ai-data → public/ai-data → cf-api

**Source of truth:** `ai-data/` (categories, badges, indexes).  
**Runtime:** `public/ai-data/` — the app and chatbot read from here.  
**cf-api:** `cf-api/public/ai-data/` + `cf-api/public/static/guidebook-badges-index.json`.

## Основная синхронизация (приложение)

After any edits in `ai-data/`, sync before build or deploy:

```bash
npm run sync:ai-data
```

Копирует `ai-data/` → `public/ai-data/`.

## Синхронизация в cf-api (боты VK/TG)

Перед деплоем cf-api на Cloudflare выполните из **корня репозитория**:

```bash
npm run sync:cf-api-ai-data
npm run sync:cf-api-prompts
```

- **sync:cf-api-ai-data** — копирует `public/ai-data/` → `cf-api/public/ai-data/` и собирает `guidebook-badges-index.json` в `cf-api/public/static/`.
- **sync:cf-api-prompts** — синхронизирует промпты и факты из `chatbot/prompts/` в cf-api (см. раздел ниже).

## Синхронизация промптов НейроВалюши (backend ↔ cf-api)

**Источник истины:** `chatbot/prompts/` (persona, тон, правила — Python; динамические факты — `facts.json`).

**Команда:** из корня репозитория перед деплоем cf-api:

```bash
npm run sync:cf-api-prompts
```

**Что попадает в cf-api:**

1. **facts.json** → `cf-api/src/neurovalyusha/generated_camp_facts.ts` (объект `CAMP_FACTS`). Тип и `formatCampFacts()` остаются в `camp_facts.ts`.
2. **putevoditel_system_prompt_optimized.py** (основной чат-промпт) → `cf-api/src/neurovalyusha/generated_chat_prompt.ts` (константа `NEUROVALYUSHA_FULL_CHAT_PROMPT`). Используется для режимов чата (chat-basic, chat-with-badge) в `buildSystemPrompt()`.

**Ручное обновление:** два блока в cf-api не подтягиваются скриптом; при изменении источника их нужно править вручную (см. чек-лист ниже).

#### Ручное обновление: когда и что править в cf-api

Файл в cf-api: `cf-api/src/neurovalyusha/constants.ts`. После любых правок — пересборка и при необходимости деплой cf-api.

- **Когда обновлять CAMP_STATIC_INFO:** вы изменили в Python (`chatbot/prompts/putevoditel_system_prompt_optimized.py`) любую из секций: «Медицинские документы», «Связь с ребёнком», «Питание и диетические особенности», «Возраст и формат», «Педагоги и атмосфера», «Мемы и Легенды лагеря», «БРО Движение». Действие: открыть константу `CAMP_STATIC_INFO` в указанном файле и внести те же изменения (сохраняя формат: заголовки, списки, переносы строк).

- **Когда проверять NEUROVALYUSHA_SOCIAL_SYSTEM:** вы изменили в Python тон, правила общения, миссию, стиль или ограничения НейроВалюши (например, грамматический род, запрет markdown, фактчекинг, безопасность). Действие: открыть в том же файле константу `NEUROVALYUSHA_SOCIAL_SYSTEM` и при необходимости обновить текст, чтобы соц-бот (VK/TG) не расходился с обновлённой персоной и правилами. У соц-промпта ограничение по длине и ориентация на посты/комментарии — формулировки можно сокращать, но не менять смысл.

#### Возможная автоматизация

В CI выполняется проверка «промпт vs constants»: скрипт [scripts/check-prompts-constants-sync.mjs](../scripts/check-prompts-constants-sync.mjs) сравнивает время модификации `chatbot/prompts/putevoditel_system_prompt_optimized.py` и `cf-api/src/neurovalyusha/constants.ts`; шаг в [.github/workflows/ci.yml](../.github/workflows/ci.yml) (job lint-and-test). Если промпт новее constants — CI падает с сообщением. При падении обновите вручную CAMP_STATIC_INFO / NEUROVALYUSHA_SOCIAL_SYSTEM по чек-листу выше и перезапустите CI.

- **CAMP_STATIC_INFO:** теоретически можно скриптом извлекать из `putevoditel_system_prompt_optimized.py` секции по заголовкам (Медицинские документы, Связь с ребёнком, …) и формировать содержимое константы. Сложность — единый формат (переносы строк, эмодзи, markdown); при изменении структуры промпта скрипт придётся править. Проверка по датам файлов в CI уже реализована (см. абзац выше).
- **NEUROVALYUSHA_SOCIAL_SYSTEM:** полная автоматизация из Python нецелесообразна: соц-промпт короче, другой формат (посты/комментарии, лимит длины). Остаётся ручное выравнивание при смене тона/правил; проверка «промпт новее constants» в CI напоминает про ручную проверку constants.ts.
