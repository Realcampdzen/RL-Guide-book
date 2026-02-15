# ✅ Чек-лист деплоя на прод

## Перед деплоем

### 1. Код и сборка
- [ ] Все изменения закоммичены
- [ ] `npm ci` выполнен успешно
- [ ] `npm run build` выполнен успешно
- [ ] Нет TypeScript ошибок
- [ ] Размер `dist/_worker.js` ~120-121 KB

### 2. Данные о лагере
- [ ] `src/neurovalyusha/camp_facts.ts` содержит актуальные данные
- [ ] Адрес актуален
- [ ] Контакты актуальны (телефон, email, VK, Telegram)
- [ ] Текущая смена актуальна (название, даты, цена, тематика)

### 3. Проверка файлов в dist/
- [ ] `dist/_worker.js` существует
- [ ] `dist/_routes.json` существует
- [ ] `dist/ai-data/MASTER_INDEX.json` существует
- [ ] Все категории в `dist/ai-data/category-*/` присутствуют
- [ ] `dist/static/guidebook-badges-index.json` существует

### 4. Cloudflare настройки
- [ ] Проверены env переменные в Cloudflare Dashboard:
  - [ ] `OPENAI_API_KEY` установлен
  - [ ] `VK_SECRET`, `VK_GROUP_ID`, `VK_ACCESS_TOKEN` (если используется VK)
  - [ ] `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (если используется TG)
- [ ] KV binding `NEUROVALYUSHA_KV` настроен
- [ ] ASSETS binding настроен

## Деплой

- [ ] Открыт Cloudflare Dashboard
- [ ] Переход: Workers & Pages → `real-vibe-ai-studio` → Deployments
- [ ] Создан новый deployment
- [ ] Выбрана папка `cf-api/dist` (не отдельные файлы!)
- [ ] Environment: Production
- [ ] Deploy запущен

## После деплоя

### Health check
- [ ] `GET https://real-vibe-ai-studio.pages.dev/health` → `{"ok":true,"hasOpenAIKey":true}`

### Функциональное тестирование
- [ ] Веб-чат отвечает (проверить на сайте real-vibe.studio)
- [ ] Веб-чат использует данные о лагере (спросить про контакты/адрес)
- [ ] VK бот отвечает на новый пост (если настроен)
- [ ] VK бот использует прогрессивный контекст значков
- [ ] Telegram бот отвечает (если настроен)

### Диагностика KV
- [ ] `nv:vk:lastWallPostNew` (если VK) содержит актуальные данные
- [ ] `nv:vk:lastBadgeDecision` (если VK) показывает корректные решения
- [ ] `nv:tg:lastAutoForward` (если TG) содержит актуальные данные

### Мониторинг
- [ ] Проверены логи Cloudflare Workers (нет критических ошибок)
- [ ] Проверено использование OpenAI API (разумное количество запросов)
- [ ] Нет аномальных всплесков ошибок

## Если что-то пошло не так

- [ ] Проверены KV ключи с ошибками
- [ ] Проверены логи Cloudflare Workers
- [ ] Проверен баланс OpenAI API
- [ ] При необходимости выполнен rollback к предыдущей версии

---

**Дата деплоя:** _______________
**Версия:** _______________
**Кто деплоил:** _______________

