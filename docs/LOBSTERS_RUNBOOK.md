# LOBSTERS_RUNBOOK.md

**Автор:** Agent D (Infra/Release/Operations)  
**Дата:** 2026-02-27 (M5-R5-D)  
**Статус:** operational

---

## Агенты-боты (лобстеры)

| Bot | Handle | Роль | Env var | Vercel status |
|-----|--------|------|---------|---------------|
| NeuroStepa | @NeuroStepa_bot | Оркестратор | `NEURO_STEPA_BOT_TOKEN` | NEEDS_VERCEL_ADD |
| Cat Bro | @Cat_Bro_bot | СММ/контент | `CAT_BRO_BOT_TOKEN` | NEEDS_VERCEL_ADD |
| Dev Bro 1 | @Dev_Bro_1_bot | Разработчик | `DEV_BRO_1_BOT_TOKEN` | NEEDS_VERCEL_ADD |

> **Важно:** все три токена присутствуют в `.env` (подтверждено M5-R5-D).  
> До добавления в Vercel Production endpoint `/api/telegram/agent-post` не будет работать в prod.

---

## Endpoint

**`POST /api/telegram/agent-post`** — реализован Agent C (M5-R5-C)

**Auth:** `developer` | `shift_leader` (JWT required)

**Request body:**
```json
{
  "agent": "neuro_stepa",
  "text": "Сообщение от лобстера",
  "root_message_id": 123,
  "chat_id": -1001855664932
}
```

**Поле `agent`** — маппинг на env var:

| agent value | Env var |
|-------------|---------|
| `neuro_stepa` | `NEURO_STEPA_BOT_TOKEN` |
| `cat_bro` | `CAT_BRO_BOT_TOKEN` |
| `dev_bro_1` | `DEV_BRO_1_BOT_TOKEN` |

**Поле `chat_id`** — опционально; если не указан, используется `TELEGRAM_CHANNEL_ID` из env.

**Responses:**

| Code | Meaning |
|------|---------|
| 200 | Message sent successfully |
| 401 | Missing or invalid JWT |
| 403 | Role not allowed (not developer/shift_leader) |
| 400 | Missing required fields / unknown agent |
| 409 | Duplicate message (dedup guard active) |
| 500 | Telegram API error (token missing or invalid) |

---

## Smoke-проверки (I-1 / I-2 / I-3)

Запускать с Vercel Preview URL или prod (read-only POST, не создаёт пользовательских данных):

**I-1 — NeuroStepa:**
```bash
curl -X POST https://<backend-url>/api/telegram/agent-post \
  -H "Authorization: Bearer <developer-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"agent":"neuro_stepa","text":"I-1 smoke","root_message_id":1}'
```

**I-2 — Cat Bro:**
```bash
curl -X POST https://<backend-url>/api/telegram/agent-post \
  -H "Authorization: Bearer <developer-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"agent":"cat_bro","text":"I-2 smoke","root_message_id":1}'
```

**I-3 — Dev Bro 1:**
```bash
curl -X POST https://<backend-url>/api/telegram/agent-post \
  -H "Authorization: Bearer <developer-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"agent":"dev_bro_1","text":"I-3 smoke","root_message_id":1}'
```

**Ожидаемый результат:** HTTP 200 для всех трёх.

---

## Диагностика

Если бот не отвечает или endpoint возвращает 500:

**Шаг 1 — Проверить Vercel env:**
- Vercel Dashboard → Project `backend-murex-one-40` → Settings → Environment Variables
- Убедиться что `NEURO_STEPA_BOT_TOKEN` / `CAT_BRO_BOT_TOKEN` / `DEV_BRO_1_BOT_TOKEN` добавлены в Production

**Шаг 2 — Прогнать I-1/I-2/I-3 smoke:**
- Выполнить curl-команды выше против prod или Vercel Preview
- При HTTP 500: токен не найден в env или невалиден
- При HTTP 401/403: проблема с JWT, не с ботом

**Шаг 3 — Проверить Telegram Bot API напрямую:**
```bash
# Заменить <TOKEN> на значение из .env
curl https://api.telegram.org/bot<TOKEN>/getMe
```
Ожидаемый ответ: `{"ok":true,"result":{"id":...,"username":"NeuroStepa_bot",...}}`

Если `"ok":false` — токен невалиден, нужно пересоздать через @BotFather.

---

## Добавление нового лобстера

1. **Создать бота** через @BotFather в Telegram → получить токен

2. **Добавить в `.env`:**
   ```
   NEW_BOT_TOKEN=<token-from-botfather>
   ```

3. **Добавить в `AGENT_BOT_TOKENS` маппинг в `backend/app.py`:**
   ```python
   AGENT_BOT_TOKENS = {
       "neuro_stepa": os.getenv("NEURO_STEPA_BOT_TOKEN"),
       "cat_bro": os.getenv("CAT_BRO_BOT_TOKEN"),
       "dev_bro_1": os.getenv("DEV_BRO_1_BOT_TOKEN"),
       "new_bot": os.getenv("NEW_BOT_TOKEN"),  # добавить сюда
   }
   ```

4. **Добавить в Vercel Production env:**
   - Vercel Dashboard → Settings → Environment Variables → Add
   - Var: `NEW_BOT_TOKEN`, Value: `<token>`, Environment: Production

5. **Обновить таблицу лобстеров** в этом документе (раздел "Агенты-боты")

---

## Связанные документы

- [`docs/OPS_SNAPSHOT_M5_GO.md §3`](OPS_SNAPSHOT_M5_GO.md) — env matrix со статусом NEEDS_VERCEL_ADD
- [`docs/PROD_RELEASE_PLAYBOOK.md §5`](PROD_RELEASE_PLAYBOOK.md) — pre-release checklist (lobster tokens)
- [`docs/STAGING_BACKEND_SETUP.md`](STAGING_BACKEND_SETUP.md) — как получить Vercel Preview URL для smoke
