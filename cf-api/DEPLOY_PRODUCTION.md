# 🚀 Деплой НейроВалюши на прод

## Подготовка к деплою

### 1. Проверка сборки

Убедитесь, что сборка прошла успешно:

```bash
cd cf-api
npm ci
npm run build
```

Проверьте, что в папке `dist/` есть:
- `dist/_worker.js` (должен быть ~120-121 KB)
- `dist/_routes.json`
- `dist/ai-data/` (все категории и значки)
- `dist/static/guidebook-badges-index.json`

### 2. Проверка изменений

**Что было обновлено в этом деплое:**

1. ✅ Модульная система промптов (экспертный промпт только когда нужно)
2. ✅ Прогрессивный контекст значков для VK/TG (minimal/standard)
3. ✅ Интеграция данных о лагере (контакты, адрес, документы, мемы, БРО)

**Файлы, которые изменились:**
- `src/neurovalyusha/constants.ts` - промпты и данные о лагере
- `src/neurovalyusha/handlers.ts` - логика обработки VK/TG
- `src/neurovalyusha/camp_facts.ts` - **НОВЫЙ** файл с данными о лагере
- `src/index.tsx` - интеграция модульных промптов

### 3. Синхронизация данных и промптов (из корня репозитория)

Перед деплоем выполните:

```bash
npm run sync:cf-api-ai-data
npm run sync:cf-api-prompts
```

Это обновит в cf-api: ai-data, динамические факты из `chatbot/prompts/facts.json` (generated_camp_facts.ts) и основной чат-промпт из Python (generated_chat_prompt.ts).

**Проверка данных о лагере:** после синхронизации убедитесь, что в `chatbot/prompts/facts.json` актуальны адрес, контакты и текущая смена. При изменении facts.json достаточно заново запустить `npm run sync:cf-api-prompts`.

Если в этом релизе в Python меняли статические блоки (меддокументы, связь с ребёнком, питание, педагоги, мемы, БРО) или тон/правила НейроВалюши — вручную проверить и при необходимости обновить константы `CAMP_STATIC_INFO` и `NEUROVALYUSHA_SOCIAL_SYSTEM` в `cf-api/src/neurovalyusha/constants.ts`. Подробности и чек-лист — [docs/DATA_SYNC.md](../docs/DATA_SYNC.md) в корне репозитория.

---

## Деплой API в Cloudflare Pages

### Шаг 1: Подготовка dist папки

Соберите проект (если ещё не сделано):

```bash
cd cf-api
npm run build
```

Убедитесь, что `dist/` содержит все необходимые файлы.

### Шаг 2: Загрузка в Cloudflare

1. Откройте [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Перейдите: **Workers & Pages** → `real-vibe-ai-studio`
3. Перейдите: **Deployments** → **Create deployment**
4. Выберите:
   - **Environment**: `Production`
   - **Upload**: выберите **папку `cf-api/dist`** (не отдельные файлы, а именно папку)
5. Нажмите **Save and deploy**

### Шаг 3: Проверка деплоя

После деплоя проверьте:

```bash
# Health check
curl https://real-vibe-ai-studio.pages.dev/health

# Ожидаемый ответ:
# {"ok":true,"hasOpenAIKey":true}
```

### Шаг 4: Тестирование API

**Тест веб-чата:**
```bash
curl -X POST https://real-vibe-ai-studio.pages.dev/api/valyusha/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Привет! Как дела?"}'
```

**Проверка работы VK/TG (если настроены webhooks):**
- Создайте тестовый пост в VK группе
- Проверьте KV: `nv:vk:lastBadgeDecision` (должен появиться после обработки)
- Проверьте, что комментарий появился под постом

---

## Проверка после деплоя

### Чек-лист

- [ ] Health endpoint возвращает `{"ok":true,"hasOpenAIKey":true}`
- [ ] Веб-чат отвечает (проверить на сайте)
- [ ] VK бот отвечает на новые посты (если настроен)
- [ ] Telegram бот отвечает (если настроен)
- [ ] Данные о лагере используются (контакты, адрес упоминаются при вопросах)

### Диагностика в KV

Проверьте KV ключи для диагностики:

**VK:**
- `nv:vk:lastWallPostNew` - последний обработанный пост
- `nv:vk:lastBadgeDecision` - последнее решение по значку

**Telegram:**
- `nv:tg:lastAutoForward` - последняя автопересылка
- `nv:tg:lastBadgeDecision` - последнее решение по значку

### Типичные проблемы

**1. Бот не отвечает:**
- Проверить KV ключи последних событий
- Проверить логи Cloudflare Workers
- Проверить баланс OpenAI API

**2. Ошибки сборки:**
- Убедиться что `npm ci` выполнен успешно
- Проверить TypeScript ошибки: `npm run build`

**3. API возвращает ошибки:**
- Проверить env переменные в Cloudflare Dashboard
- Проверить KV binding `NEUROVALYUSHA_KV`
- Проверить ASSETS binding

---

## Откат (rollback)

Если что-то пошло не так:

1. В Cloudflare Dashboard → **Deployments**
2. Найдите предыдущую успешную версию
3. Нажмите **...** → **Promote to production**

---

## Дополнительные ресурсы

- Полная документация: `cf-api/NEUROVALYUSHA_BOT_DOCUMENTATION.md`
- Детальный ранбук: `DEPLOY_CLOUDFLARE_BOTS.md`

