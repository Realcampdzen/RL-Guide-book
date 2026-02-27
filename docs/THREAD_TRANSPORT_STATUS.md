# THREAD_TRANSPORT_STATUS.md

**Агент C (Chat/Safety/Transport)**  
**Задача:** TAILS_RECONCILE_C  
**Дата:** 2026-02-27  
**Статус документа:** OPERATIONAL (живой, обновляется при изменениях)

---

## 1. Обзор контура (что есть и где)

Thread-comment transport реализован в **двух независимых слоях**. Они не пересекаются и обслуживают разные сценарии.

| Слой | Репозиторий | Платформа | Назначение |
|------|-------------|-----------|------------|
| **Backend Flask** | `putevoditel-backup/backend/app.py` | Vercel (Python) | Ручные посты из ЛК/API — achievement notifications, creator cards, council initiatives |
| **cf-api Workers** | `putevoditel-backup/cf-api/src/neurovalyusha/handlers.ts` | Cloudflare Workers (TypeScript) | Автоматические AI-комментарии НейроВалюши под постами в TG-канале/VK |

---

## 2. Статус по слоям

### 2.1 Backend Flask (Vercel) — реализовано в `a4c3b2f`

| Компонент | Статус | Где |
|-----------|--------|-----|
| `send_telegram_message(text, root_message_id)` | ✅ READY | `backend/app.py` L778 |
| `send_telegram_to_chat(chat_id, text, root_message_id)` | ✅ READY | `backend/app.py` L806 |
| `send_telegram_photo(bytes, caption, root_message_id)` | ✅ READY | `backend/app.py` L831 |
| `_is_thread_duplicate(chat_id, text)` — dedup 60s | ✅ READY | `backend/app.py` L874 |
| `POST /api/telegram/thread-post` endpoint | ✅ READY | `backend/app.py` L1563 |
| rootId guard (400 без rootId) | ✅ ENFORCED | в endpoint |
| JWT auth (CHAT_ALLOWED_ROLES) | ✅ ENFORCED | в endpoint |
| Anti-duplicate guard (409) | ✅ ENFORCED | в endpoint |

**Backward compat:** все существующие вызовы без `root_message_id` работают — параметр `Optional[int]`.

**Ограничение:** Backend-слой не знает о `rootId` автоматически. Caller (frontend/ЛК) должен передать `root_message_id` явно. Если rootId неизвестен — post в канал без thread (стандартное поведение).

---

### 2.2 cf-api Workers (Cloudflare) — уже работает, не менялось в V1.1

cf-api имеет **собственный полноценный transport-слой** (`tgSendMessage` в handlers.ts):

| Компонент | Статус | Где |
|-----------|--------|-----|
| `tgSendMessage({ replyToMessageId })` | ✅ READY | `handlers.ts` L1916 |
| `allow_sending_without_reply: true` | ✅ READY | `handlers.ts` L1933 (graceful fallback) |
| rootId вычисление для автофорварда | ✅ READY | `handlers.ts` L1477-1484 |
| rootId для media groups (albums) | ✅ READY | `handlers.ts` L1276-1289 |
| `resolveTelegramRootId` для reply-chain | ✅ READY | `handlers.ts` L1896 |
| KV-dedup по `update_id` | ✅ READY | `handlers.ts` L1369-1370 |
| KV-dedup по `postKey` (one-comment-per-post) | ✅ READY | `handlers.ts` L1513-1523 |
| `nv:tg:root:{chatId}:{msgId}` mapping | ✅ READY | KV persistence |
| `nv:tg:myMessage:{chatId}:{msgId}` tracking | ✅ READY | KV persistence |
| Kill-switches: `NV_DISABLE_SOCIAL`, `NV_DISABLE_TG` | ✅ READY | `handlers.ts` L1380 |
| TELEGRAM_DISCUSSION_GROUP_ID guard | ✅ READY | `handlers.ts` L1391-1394 |
| TELEGRAM_CHANNEL_ID/USERNAME filter | ✅ READY | `handlers.ts` L1408-1467 |

**cf-api полностью автономен**: он получает webhook от Telegram, сам вычисляет rootId, сам постит reply. **Никакой координации с backend Flask не требуется** — это разные каналы.

---

## 3. Gap-анализ: что требует ручных действий

Следующее **не может быть автоматизировано кодом** и требует ручного шага при каждой первой публикации:

### GAP-1: rootId для backend-постов из ЛК — нет автоматического lookup

**Проблема:** Когда participant в ЛК нажимает «Отправить достижение в Telegram» или создаёт карточку Мастерской, backend должен знать `message_id` нужного поста в канале, чтобы reply попал в правильный thread.

**Текущее состояние:** `rootId` должен прийти от клиента (frontend).

**Что нужно вручную:**
- При создании нового поста в TG-канале — записать его `message_id` (он виден в Telegram Web или через Bot API getUpdates).
- Передать этот `message_id` во фронтенд (env variable, config, или context из API).

**Workaround (уже доступен):** если `root_message_id` не передан — сообщение уходит в канал как обычный пост (не thread reply). Это безопасный fallback, но не thread-комментарий.

### GAP-2: cf-api не требует ручного rootId — он self-contained

cf-api вычисляет rootId сам из автофорварда (is_automatic_forward) + KV-маппинг. Ручных действий не требуется после первоначальной настройки env:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_DISCUSSION_GROUP_ID` (optional, но рекомендуется)
- `TELEGRAM_CHANNEL_ID` или `TELEGRAM_CHANNEL_ID_USERNAME` (optional, для фильтрации)

### GAP-3: первичная верификация rootId в prod

**Что нужно сделать один раз:**
1. Опубликовать тестовый пост в TG-канале.
2. Проверить, что cf-api auto-forward обработался: смотреть KV `nv:tg:lastAutoForward`.
3. Убедиться, что reply ушёл с `replyToMessageId == message_id` поста.
4. Записать `message_id` если нужен для backend-постов (GAP-1).

**Где смотреть диагностику cf-api:**
```
KV namespace: NEUROVALYUSHA_KV
Ключи для мониторинга:
  nv:tg:lastAutoForward     — последнее auto-forward событие
  nv:tg:lastSendError       — последняя ошибка отправки
  nv:tg:lastBadgeDecision   — последнее решение по значку
  nv:tg:lastOpenAIError     — ошибки OpenAI
  nv:tg:lastDisabled        — если бот был отключён kill-switch
```

---

## 4. Strict Policy: без rootId не отправлять (для Backend-слоя)

> **ПОЛИТИКА:** Backend-endpoint `POST /api/telegram/thread-post` **физически не отправит** сообщение в Telegram без `root_message_id`. Любой запрос без него получает `400 Bad Request`.

### Почему это важно

- Blind-post (пост без rootId) создаёт отдельный thread или уходит в канал без привязки к обсуждению.
- В контексте Путеводителя это означает, что комментарий достижения не будет виден в нужном обсуждении.
- Дублирование через несколько постов в одном канале засоряет ленту.

### Как применяется

```
Endpoint: POST /api/telegram/thread-post
Auth: Bearer JWT (CHAT_ALLOWED_ROLES)

Обязательные поля:
  root_message_id (integer) — message_id корневого поста в канале
  text (string, non-empty)

Без root_message_id → 400 {"error": "root_message_id required"}
```

### Для cf-api (NeuroValyusha)

cf-api применяет эквивалентную политику через код:
- Автофорвард → rootId = message_id поста (всегда известен).
- Reply chain → rootId разрешается через `resolveTelegramRootId` из KV.
- Если rootId не может быть разрешён → `tgSendMessage` вызывается с `allow_sending_without_reply: true` (graceful degradation, пост уходит без reply — это единственное допустимое исключение для AI-бота, т.к. TG API может не принять reply к удалённому посту).

---

## 5. Certification Checklist: KOT_THREAD_TRANSPORT_FIX_V1.1

Использовать при каждой проверке production-готовности transport-контура.

### 5.1 Backend Flask (Vercel)

```
□ TEST#A: POST /api/telegram/thread-post с root_message_id → 200 {"ok":true,"sent":true}
□ TEST#B: POST /api/telegram/thread-post БЕЗ root_message_id → 400 {"error":"root_message_id required"}
□ TEST#C: Два одинаковых POST за < 60s → первый 200, второй 409 {"error":"duplicate"}
□ TEST#D: POST без JWT → 401 {"error":"Authorization required"}
□ TEST#E: POST с JWT невалидной роли (traveler) → 403 {"error":"Access denied for this role"}
□ TEST#F: send_telegram_message(text, root_message_id=42) → в Telegram payload есть reply_to_message_id=42
□ TEST#G: send_telegram_message(text) без root_message_id → payload БЕЗ reply_to_message_id (backward compat)
```

**Pass criteria:**
- A: HTTP 200, body содержит `ok: true` и `root_message_id`
- B: HTTP 400, body содержит `error: "root_message_id required"`
- C: первый 200, второй 409
- D: HTTP 401
- E: HTTP 403
- F: Telegram API получил `reply_to_message_id` — проверяется через getUpdates или Telegram Web
- G: Telegram API НЕ получил `reply_to_message_id`

**Required logs при TEST#A:**
```json
{
  "ok": true,
  "sent": true,
  "root_message_id": <integer>,
  "source": "<optional label>"
}
```

---

### 5.2 cf-api Workers (Cloudflare)

```
□ CF-TEST#A: Новый пост в TG-канале → через < 10s НейроВалюша оставляет reply в thread
□ CF-TEST#B: KV nv:tg:lastAutoForward содержит decision:"sent" и valid rootId
□ CF-TEST#C: Повторный форвард того же поста → decision:"skip_already" (dedup работает)
□ CF-TEST#D: NV_DISABLE_TG=1 → bot не постит, KV nv:tg:lastDisabled обновляется
□ CF-TEST#E: Reply пользователя в thread → if shouldReplyToText → НейроВалюша отвечает с replyToMessageId=msg.message_id
```

**Pass criteria:**
- A: Комментарий от бота виден в Telegram как reply к посту (не как отдельный топ-левел комментарий)
- B: `decision: "sent"`, `rootId` = `message_id` оригинального поста
- C: `decision: "skip_already"` при повторе
- D: `reason: "disabled"` в KV
- E: Ответ бота является reply к сообщению пользователя (chain preserved)

**Required KV evidence при CF-TEST#A:**
```json
{
  "ts": <timestamp>,
  "decision": "sent",
  "rootId": <message_id of original channel post>,
  "sent_message_id": <message_id of bot's reply>,
  "commentPreview": "<first 160 chars of comment>"
}
```

---

### 5.3 Интеграционная матрица

| Сценарий | Слой | Статус | Примечание |
|----------|------|--------|------------|
| НейроВалюша → auto-comment под новым постом | cf-api | ✅ READY | Автономно через webhook |
| НейроВалюша → reply на комментарий пользователя | cf-api | ✅ READY | `shouldReplyToText` trigger |
| Achievement notification из ЛК | backend | ✅ READY | Требует `root_message_id` от frontend |
| Creator card (Мастерская) → TG | backend | ✅ READY | Требует `root_message_id` от frontend |
| Council initiative → TG | backend | ✅ READY | Требует `root_message_id` от frontend |
| Blind-post (без rootId) через backend | backend | 🚫 BLOCKED | 400 по политике |
| Blind-post (без rootId) через cf-api | cf-api | ⚠️ DEGRADED | allow_sending_without_reply=true |

---

## 6. Что нужно вручную в cf-api (чеклист для оператора)

Перед запуском cf-api в prod проверить:

```
□ TELEGRAM_BOT_TOKEN установлен в Cloudflare Worker env
□ TELEGRAM_WEBHOOK_SECRET установлен и совпадает с зарегистрированным webhook
□ TELEGRAM_DISCUSSION_GROUP_ID установлен (рекомендуется: -100<group_id>)
□ TELEGRAM_CHANNEL_ID установлен (числовой ID канала или @username)
□ OPENAI_API_KEY установлен
□ NEUROVALYUSHA_KV привязан к Worker
□ Webhook зарегистрирован: POST https://api.telegram.org/bot<token>/setWebhook
    с url=<worker-url>/api/neurovalyusha/tg/<secret>
□ Проверить KV nv:tg:lastAutoForward после первого поста в канале
```

---

## 7. Расхождения между слоями (non-blocking)

| Аспект | Backend Flask | cf-api Workers |
|--------|--------------|----------------|
| Dedup mechanism | In-memory SHA-256 (60s window) | KV-based по update_id + postKey |
| rootId source | От caller (обязателен) | Вычисляется из webhook автоматически |
| allow_sending_without_reply | Нет (strict 400) | Да (graceful degradation) |
| Badge context | Нет | Да (scoreBadges + loadBadgeData) |
| Reply chain tracking | Нет | Да (KV root mapping) |
| Media group support | Нет | Да (900ms sleep + ctx merge) |

Эти расхождения **намеренны** — слои обслуживают разные use-case. Унификация не нужна.

---

*Последнее обновление: Agent C — TAILS_RECONCILE_C — 2026-02-27*
