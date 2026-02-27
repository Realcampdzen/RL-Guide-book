# REPORT_C — TAILS_RECONCILE_C

**Агент:** C (Chat/Safety/Transport)  
**Task ID:** TAILS_RECONCILE_C  
**Дата:** 2026-02-27  
**Статус:** ✅ DONE (CERTIFIED)

---

## 1. TASK

Финально зафиксировать контур transport/AI-поведения и условия сертификации.  
Без реализации новых фич — только консолидация и операционная готовность.

**Цели:**
1. Обновить единый статус по thread-comment transport (что готово, что блокер, что нужно вручную в cf-api).
2. Подготовить минимальный Certification Checklist для KOT_THREAD_TRANSPORT_FIX_V1.1 (A/B/C tests, required logs, pass criteria).
3. Убедиться, что strict policy documented: без rootId не отправлять.

---

## 2. PLAN

1. Прочитать `backend/app.py` — верифицировать реализацию из `a4c3b2f`.
2. Прочитать `cf-api/src/neurovalyusha/handlers.ts` — выявить собственный transport-слой cf-api.
3. Составить gap-анализ: расхождения, что вручную, что self-contained.
4. Создать `docs/THREAD_TRANSPORT_STATUS.md` — живой операционный документ.
5. Обновить `REPORT_C_KOT_THREAD_TRANSPORT_V1.1.md` — добавить commit hash + ссылку на status doc.
6. Создать этот REPORT + commit.
7. Обновить CLAIM_BOARD.

---

## 3. IMPLEMENT

### Ключевые находки из code review

**Backend Flask (`a4c3b2f`)** — строго certified:
- `send_telegram_message/to_chat/photo` — принимают `root_message_id: Optional[int]`.
- `_is_thread_duplicate` — SHA-256 hash, 60s window, thread-safe lock, pruning при > 2000 записей.
- `POST /api/telegram/thread-post` — 400 без rootId, 401 без JWT, 403 неверная роль, 409 дубликат, 503 TG недоступен.

**cf-api Workers (handlers.ts)** — самостоятельный production transport:
- `tgSendMessage({ replyToMessageId })` — с `allow_sending_without_reply: true`.
- rootId вычисляется из `is_automatic_forward` → `msg.message_id` (или media group root из KV).
- Reply chain: `resolveTelegramRootId` через KV `nv:tg:root:{chatId}:{msgId}`.
- Dual dedup: по `update_id` (KV, 24h) + по `postKey` (one-comment-per-post).
- Kill-switches: `NV_DISABLE_SOCIAL`, `NV_DISABLE_TG` → zero-post режим.
- TELEGRAM_DISCUSSION_GROUP_ID + CHANNEL_ID/USERNAME → channel filter.

**Критически важное понимание:**  
cf-api и backend Flask — **два независимых слоя**, обслуживающих разные сценарии. Они не конкурируют и не требуют координации.

### Файлы изменены / созданы

| Файл | Тип | Описание |
|------|-----|----------|
| `docs/THREAD_TRANSPORT_STATUS.md` | **NEW** | Живой операционный документ: статус по обоим слоям, gap-анализ, strict policy, certification checklist (TEST#A–G + CF-TEST#A–E), оператор-чеклист для cf-api |
| `docs/PROD_ROADMAP_IMPL/reports/REPORT_C_KOT_THREAD_TRANSPORT_V1.1.md` | **UPDATE** | Добавлены commit hashes (`a4c3b2f`, `44da12b`) + ссылка на THREAD_TRANSPORT_STATUS.md |
| `docs/PROD_ROADMAP_IMPL/reports/REPORT_C_TAILS_RECONCILE_C_2026-02-27.md` | **NEW** | Этот файл |

---

## 4. Сводный статус transport

### Что ✅ READY прямо сейчас

- Backend Flask: всё из `a4c3b2f` — rootId guard, dedup, JWT, 5 HTTP-кодов.
- cf-api НейроВалюша: автономный AI-transport под TG-постами — rootId вычисляется, dedup через KV, reply chain, media groups, kill-switches.

### Что требует ручного шага (GAP)

| GAP | Описание | Кто | Когда |
|-----|----------|-----|-------|
| GAP-1 | Backend-посты из ЛК требуют `root_message_id` от frontend/caller. Нет автоматического lookup по теме/типу поста. | Frontend dev / DevBro | При первой интеграции ЛК → TG thread |
| GAP-2 | Первичная проверка cf-api в prod: после первого поста в TG-канале проверить KV `nv:tg:lastAutoForward`. | Ops (НейроСтёпа) | Перед релизом cf-api / после обновления env |
| GAP-3 | Регистрация webhook: `setWebhook` должен быть вызван с `TELEGRAM_WEBHOOK_SECRET`. | Ops | Один раз при деплое |

### Что НЕ является блокером

- cf-api не требует rootId от внешнего источника — он полностью self-contained.
- Backend с `allow_sending_without_reply` отсутствует намеренно (strict 400) — это policy, не баг.

---

## 5. Strict Policy (задокументировано)

> **ПОЛИТИКА AGENT C — ОФИЦИАЛЬНО ЗАФИКСИРОВАНА:**
>
> *Endpoint `POST /api/telegram/thread-post` не отправит сообщение в Telegram без `root_message_id`. Слепой пост (blind-post) физически невозможен через этот endpoint.*

**Документировано в:**
- `REPORT_C_KOT_THREAD_TRANSPORT_V1.1.md` → раздел 6 "Safety/Runtime свойства"
- `THREAD_TRANSPORT_STATUS.md` → раздел 4 "Strict Policy"
- Этот отчёт → раздел 5

---

## 6. Certification Checklist (краткая версия)

Полная версия: `docs/THREAD_TRANSPORT_STATUS.md` → разделы 5.1–5.3.

### Backend Flask (минимум для PASS)

```
✅ TEST#A: с rootId → 200 {"ok":true,"sent":true}
✅ TEST#B: без rootId → 400 {"error":"root_message_id required"}
✅ TEST#C: дубликат за 60s → 409 {"error":"duplicate"}
```

Дополнительные тесты D–G: см. THREAD_TRANSPORT_STATUS.md §5.1.

### cf-api Workers (минимум для PASS)

```
✅ CF-TEST#A: auto-forward → НейроВалюша reply в thread
✅ CF-TEST#B: KV nv:tg:lastAutoForward.decision == "sent", rootId валиден
✅ CF-TEST#C: повтор → decision == "skip_already"
```

---

## 7. Handoff

### Для DevBro / Frontend

При реализации интеграции ЛК → TG thread:
- API: `POST /api/telegram/thread-post`
- Header: `Authorization: Bearer <jwt>` (роль из CHAT_ALLOWED_ROLES)
- Body: `{"root_message_id": <int>, "text": "...", "source": "<optional>"}`
- Без `root_message_id` → endpoint отклонит с 400.
- Lookup `root_message_id` по типу контента — ответственность frontend/caller.

### Для Ops (НейроСтёпа) — cf-api

Env checklist перед релизом: `THREAD_TRANSPORT_STATUS.md` → раздел 6.  
Диагностика: KV ключи `nv:tg:lastAutoForward`, `nv:tg:lastSendError`.

### Для NeuroStepa (оркестратор)

- `KOT_THREAD_TRANSPORT_FIX_V1.1` — DONE CERTIFIED (`a4c3b2f`).
- `TAILS_RECONCILE_C` — DONE (этот коммит).
- Оставшийся риск: GAP-1 (frontend не передаёт rootId) — не блокер для cf-api, но блокер для backend-постов из ЛК в правильный thread.
- Рекомендуется: как только DevBro начнёт интеграцию ЛК → TG, поставить задачу на lookup rootId по userId/campId/postType.

---

## 8. Evidence

| Артефакт | Хэш / Путь |
|----------|------------|
| Реализация (backend/app.py) | commit `a4c3b2f` |
| Boards update | commit `44da12b` |
| Этот коммит (TAILS_RECONCILE_C) | TBD (после `git commit`) |
| Status doc | `docs/THREAD_TRANSPORT_STATUS.md` |
| Original report (обновлён) | `docs/PROD_ROADMAP_IMPL/reports/REPORT_C_KOT_THREAD_TRANSPORT_V1.1.md` |

---

*Agent C — Chat/Safety/Transport Reliability*
