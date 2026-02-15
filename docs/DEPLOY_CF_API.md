# Деплой cf-api (боты VK/TG) на Cloudflare

cf-api — Hono/TypeScript приложение для ботов NeuroValyusha в VK и Telegram. Деплоится на Cloudflare Pages.

---

## Предварительные требования

1. **Синхронизация ai-data** — перед сборкой выполнить:

```bash
npm run sync:cf-api-ai-data
```

Копирует `public/ai-data/` → `cf-api/public/ai-data/` и собирает `guidebook-badges-index.json`.

2. **Переменные окружения** — создать `.dev.vars` в `cf-api/` по образцу `.dev.vars.example`. В Cloudflare Dashboard настроить Secrets (Production):

- `OPENAI_API_KEY`
- `VK_GROUP_ID`, `VK_SECRET`, `VK_CONFIRMATION_CODE`, `VK_ACCESS_TOKEN`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `DISCUSSION_GROUP_ID`

3. **KV Namespace** — создать KV и добавить binding `NEUROVALYUSHA_KV` в `wrangler.jsonc`.

---

## Сборка и деплой

```bash
cd cf-api
npm ci
npm run build
npm run deploy
```

Или через wrangler напрямую:

```bash
cd cf-api
npx wrangler pages deploy dist --project-name webapp
```

---

## Содержимое dist/

- `_worker.js` — код Workers
- `_routes.json` — роутинг
- `ai-data/` — данные значков (из sync:cf-api-ai-data)
- `static/` — guidebook-badges-index.json и др.

---

## Проверка после деплоя

```bash
curl https://real-vibe-ai-studio.pages.dev/health
# Ожидается: {"ok":true,"hasOpenAIKey":true}
```

---

## Документация в cf-api/

- `cf-api/DEPLOY_README.md` — обзор готовности
- `cf-api/DEPLOY_PRODUCTION.md` — детальная инструкция
- `cf-api/DEPLOY_CHECKLIST.md` — чек-лист
- `cf-api/NEUROVALYUSHA_BOT_DOCUMENTATION.md` — документация бота

---

## Связь с проектом

- [ARCHITECTURE_AND_RESOURCES.md](ARCHITECTURE_AND_RESOURCES.md) — архитектура (Vercel + cf-api)
- [DATA_SYNC.md](DATA_SYNC.md) — синхронизация ai-data
