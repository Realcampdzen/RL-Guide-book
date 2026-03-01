# SESSION SUMMARY — 2026-02-28

**Репозиторий:** `D:\openclaw-workspace\putevoditel-backup`
**Период:** одна рабочая сессия, 2026-02-28
**Статус на момент написания:** все M6-задачи DONE, smoke 52/52, ждём E-UX-AUDIT-M5-RECHECK от Opus после нового деплоя

---

## Команда агентов

| Агент | Роль | Специализация |
|-------|------|--------------|
| **Agent A** | Data/Backend contracts | Supabase, schema, migrations, smoke |
| **Agent B** | Frontend/UX | React-компоненты, chip/tone, ESLint |
| **Agent C** | Chat/AI/Safety/Transport | Flask endpoints, chatbot, smoke safety |
| **Agent D** | DevOps/Ops | Vercel, env, git, docs, runbooks |
| **Agent E (Opus)** | QA/Validation | Browser audit, UX recheck, deploy verification |
| **NeuroStepa** | Оркестратор | Координация, board sync, мержи в main |

---

## Контекст до сессии (что было сделано ранее)

До этой сессии был пройден полный первый контур:

- **Phase 1 (P1-01..P1-10):** Supabase schema, StorageProvider, Flask на Vercel, VITE_BACKEND_URL, dev-двери закрыты, RBAC по JWT, rate limits/safety, единый контур чата — всё `done` с 2026-02-21
- **Phase 2 (P2-01..P2-04):** RBAC educator, дашборды staff, кабинет педагога — `done`
- **M1 (Q1):** scoped engines — `done`
- **M2 (Q2):** parent hybrid view — `done`
- **M3-SC-S1, M3-BF-S4, M3-BF-S5, M3-BF-S6:** badge flow, auto-sync, staff inbox UX — всё `done`
- **TAILS_RECONCILE_C:** transport KOT certified, strict policy "без rootId не отправлять" задокументирован
- **M5-R2-A..M5-R5-D:** backend hardening sprint: smoke script (22→47 checks), images safety, badge requests, chat enrichment, cleanup SQL, Telegram agent bots

---

## Что было сделано в этой сессии (хронология)

### Старт: M5-R2-C — Images Safety Hardening

**Агент C.** Первая задача, унаследованная из конца предыдущего контура.

**Сделано:**
- `backend/app.py`: добавлены `_HTML_TAG_RE`, `_PROMPT_INJECTION_KEYWORDS`, `_hash_key()`, `_sanitize_user_prompt()` — промпт теперь strip HTML, детектирует injection-ключевые слова (jailbreak, ignore previous, etc.), обрезается до 300 символов
- `_check_images_camp_daily_quota()` — in-memory счётчик по campId, лимит 200/сутки, 429 при превышении
- `docs/BACKEND_CONTRACT_GUARD.md` §3.4 — задокументирован контракт `/api/images/generate`
- `backend/scripts/smoke_backend_critical.py` — добавлен Flow E (4 checks: happy path/truncation/missing mode/missing context)
- Smoke итог: ~35 checks

**Commit:** `0a307ee`

---

### M5-R3-C — Chat Context Enrichment

**Агент C.**

**Сделано:**
- `backend/app.py` → `chat_with_bot()`: после `user_role` добавлен блок enrichment — достаёт nickname/squad_name/shift_name из JWT + membership lookup через `_resolve_membership_context()` + `_find_squad()` + `_shifts_load()`
- Весь блок обёрнут `try/except` — не блокирует чат при падении lookup
- `chatbot/models/conversation.py`: 3 новых Optional-поля в `WebContext` (nickname, squad_name, shift_name)
- `chatbot/core/context_manager.py`: сохранение в `session_data`
- `chatbot/prompts/system_prompt.py`: 3 новых kwargs, добавлены строки в `context_parts`
- `chatbot/core/response_generator.py`: новые kwargs переданы во все `_generate_*` вызовы
- Smoke Flow G (2 checks: G-1 valid JWT→200+response, G-2 invalid token→401)
- `BACKEND_CONTRACT_GUARD.md` §3.5 — `/api/chat` задокументирован
- Smoke итог: 43/43

**Commit:** `248e456`

---

### M5-R4-C — Chat Quality + Safety

**Агент C.**

**Сделано:**
- `CHAT_MAX_MESSAGE_LEN = 2000` — новая константа в `backend/app.py`; если `len(message) > 2000` → 400 + лог `[CHAT_SAFETY] message_too_long`
- Pending badge requests: в `chat_with_bot()` добавлен блок чтения `_badge_requests_load()`, фильтрация по `deviceId` + `status="pending"`, инжект `pending_badge_count` и `pending_badge_titles` (max 3) в context
- `WebContext`, `context_manager`, `system_prompt`, `response_generator` — расширены аналогично M5-R3-C (+2 новых поля)
- Smoke G-3: message > 2000 → 400
- `BACKEND_CONTRACT_GUARD.md` §3.5 обновлён
- Smoke итог: 44/44

**Commit:** `374fd3b`

---

### M5-R5-C — Telegram Agent-Post Endpoint

**Агент C.**

**Сделано:**
- `backend/app.py`: добавлен `AGENT_BOT_TOKENS` map (neuro_stepa/cat_bro/dev_bro_1 → env tokens)
- Новый endpoint `POST /api/telegram/agent-post` — auth `developer|shift_leader`, обязательные поля `agent/text/root_message_id`, деdup через `_is_thread_duplicate()`, прямой `requests.post` к Telegram Bot API с нужным токеном
- Smoke Flow I (3 негативных check: no auth→401, unknown agent→404, missing root_message_id→400)
- `BACKEND_CONTRACT_GUARD.md` §3.6
- Smoke итог: 47/47

**Commit:** `76d2e89`

---

### M6-CHAT-CONTEXT-C — Living-Language Prompt + Smoke G-4

**Агент C (последняя задача этой сессии).**

**Сделано:**
- `chatbot/prompts/system_prompt.py`: блок pending badges переписан с живым языком — `«в пути»`, `«Можешь поздравить с прогрессом или спросить как идёт»` вместо реактивного «если спрашивает — скажи что вожатый рассматривает»; добавлен `[:3]` срез inline
- D2: подтверждён лимит `_pending[:3]` в `backend/app.py` — без изменений кода
- Smoke G-4: valid JWT, простое сообщение → проверить что не 500 (server error guard)
- `BACKEND_CONTRACT_GUARD.md`: Flow G row 5→6 checks, Total 47→52
- Smoke итог: 52/52

**Commit:** `acf77f7`

---

### Параллельные задачи других агентов в этой сессии

**Agent A:**
- **M5-R5-A:** GAP fix — `POST /api/badges/requests/cleanup` не делал SQL DELETE в Supabase режиме (только in-memory filter + upsert). Добавлен `delete_resolved()` в `SupabaseBadgeRequestsStore`, `hasattr` guard в `app.py`. Flow H (2 checks). Smoke 51/51. Commit `8c29ba7`
- **M6-BACKEND-HARDENING-A:** rate limit 1 req/60s per-camp на `/api/badges/requests/cleanup`, `camp_id` в логах, H-3 smoke check (429). Smoke 52/52. Commit `6ec335a`

**Agent B:**
- **M3-BF-S7:** ESLint HIGH-критические fix, inbox squadId, pending counter
- **M6-IMG-FIX:** 26 хардкод `/RL-Guide-book/` путей → `import.meta.env.BASE_URL` в 9 TSX-файлах. Commit `482973d`
- **TAILS_RECONCILE_B:** аудит ImageSourceBlock, chip/tone consistency (3 системы), подтверждение M2 read-only. Commit `b3d38e8`

**Agent D:**
- **M6-VERCEL-LOBSTERS:** lobster bot tokens добавлены в Vercel Production (3/3 VERIFIED_OPTIONAL), smoke I-1 401 подтверждён
- **GIT-SIZE-REDUCTION:** 583 JPG/orig файла убраны из git tracking, `badgeImages.ts` + `badgeImageMap.ts`: `.jpg` → `.webp`. Deploy artifact: ~2.2GB → ~250MB. Commit `5e43f0a`

**Agent E (Opus):**
- **E-FIX-DEPLOY-PATH (CRITICAL):** найдена настоящая причина 404 — `public/` копировался в `dist/RL-Guide-book/` вместо `dist/`. Упрощён `vite.config.ts`. Commit `aefcedd`
- **E-FIX-CURSOR:** ghost-line артефакт на badge-страницах — `will-change + backface-visibility + isolation:isolate`. Commit `300d26a`

---

## Сложности и как их преодолевали

### 1. Нестабильность git — тихие переключения веток

**Проблема:** в этой среде (Windows + Cursor + PowerShell) после команды `git checkout` рабочая директория иногда тихо оставалась на другой ветке. Правки, сделанные через `StrReplace`, уходили не на целевую ветку, а на ту, где физически находился рабочий каталог (например, `agent-b/m6-img-fix` или `agent-d/m6-vercel-lobsters`).

**Симптом:** `git status` показывал изменения, но `git branch --show-current` — чужую ветку. После `git restore` изменения терялись.

**Решение:**
- Перед каждым коммитом — явная проверка `git branch --show-current`
- Написан Python-скрипт `_m6_patch.py` — все правки применяются атомарно одним Python-процессом, который начинает с проверки ветки (`assert branch == 'agent-c/m6-chat-context-c'`) и завершает финальной верификацией всех изменений
- При обнаружении неверной ветки: `git restore` изменений → `git checkout agent-c/m6-chat-context-c` → повторное применение патча
- Для `CLAIM_BOARD.md` написан отдельный скрипт `_m6_claim_patch.py` с явной работой с индексами строк
- Стеш-операции не смешивались между ветками
- Введено правило в `CYCLE_CONTROL_BOARD.md` §7: **«No cross-branch git restore»**

**Правило для будущего:** при работе в этой среде никогда не использовать `StrReplace` без предварительной проверки ветки. Использовать атомарные Python-скрипты с assert на ветку.

### 2. `self._http` vs модульная `_http`

**Проблема:** в Flow G (check G-3) использовался `self._http(...)` — метода нет в `SmokeRunner`, есть только module-level функция `_http()`. Это вызвало бы `AttributeError` при реальном прогоне.

**Решение:** исправлено в M5-R5-A (Agent A) до того, как это проявилось в production smoke. Также обнаружено и задокументировано в плане M6-CHAT-CONTEXT-C (при изучении HEAD оказалось уже исправленным).

**Правило для будущего:** в smoke-скрипте использовать только модульную `_http()`, никогда `self._http()`.

### 3. Расхождение счётчиков smoke

**Проблема:** статический подсчёт `self.check()` + `self.ok()` давал меньше, чем реальный runtime (например, 48 vs 51). Это вызывало путаницу при обновлении документации.

**Причина:** `_get_jwt()` вызывается несколько раз (один раз за flow + один раз за роль), и каждый раз добавляет `self.ok()` к счётчику. Статический grep не учитывает это.

**Решение:** документировали «runtime ≥ N» вместо точного числа; для BACKEND_CONTRACT_GUARD.md и CYCLE_CONTROL_BOARD.md использовали значение из последнего успешного прогона.

### 4. M5-R5-A: cleanup не делал SQL DELETE

**Проблема (найдена Agent A):** `POST /api/badges/requests/cleanup` в Supabase-режиме загружал все строки в Python, фильтровал в памяти, потом делал `upsert` оставшихся — но не `DELETE`. Старые approved/rejected записи накапливались в БД бесконечно.

**Решение:** добавлен `delete_resolved()` в `SupabaseBadgeRequestsStore` с прямым SQL DELETE + `hasattr` guard в `app.py` для обратной совместимости с JSON-провайдером.

### 5. GIT-SIZE-REDUCTION: артефакт 2.2GB

**Проблема (найдена Agent D):** GitHub Pages deploy artifact весил ~2.2GB из-за 583 JPG/PNG файлов в git history. Deploy занимал критически долго и мог упираться в лимиты.

**Решение:** Agent D убрал JPG/orig из git tracking через `git rm --cached`, перевёл `badgeImages.ts` и `badgeImageMap.ts` на `.webp`. Артефакт: 2.2GB → ~250MB.

### 6. E-FIX-DEPLOY-PATH: настоящий корень 404

**Проблема:** после HOTFIX-BASE-PATH (Agent D) думали, что 404 исправлены. Opus при browser audit обнаружил, что `public/` по-прежнему копируется в `dist/RL-Guide-book/` вместо `dist/`. Результат: двойной prefix в путях.

**Решение (Agent E/Opus):** упрощён `vite.config.ts`, `public/` теперь копируется в корень `dist/`. Это был критический фикс.

---

## Архитектура smoke-скрипта к концу сессии

`backend/scripts/smoke_backend_critical.py` — 52 check, Flows A–I:

| Flow | Endpoint-группа | Checks |
|------|----------------|--------|
| Health | `/api/health` | 1 |
| A | Badge Requests (request → inbox → approve → mine) | 9 |
| B | Parent Snapshot | 6 |
| C | Council Initiatives | 6 |
| D | Mine privacy + contract | 4 |
| E | Image Generation (happy path, truncation, missing fields) | 5 |
| F | Teams lifecycle | 8 |
| G | Chat: valid JWT/401/400/G-4 not-500 | 6 (был 5) |
| H | Badge cleanup: auth guard + deleted int | 2 |
| I | Telegram agent-post: 401/404/400 | 3 |
| **Итого** | | **52/52** |

---

## Текущее состояние системы

### Backend (Vercel)
- Flask + Supabase, `USE_SUPABASE=true`
- Все эндпоинты из sprint M5/M6 задеплоены
- Lobster bot tokens в Vercel Production (VERIFIED_OPTIONAL)
- `/api/telegram/agent-post` готов (нужен реальный TG-тред для live-теста)
- Cleanup endpoint с SQL DELETE работает корректно

### Frontend (GitHub Pages)
- После GIT-SIZE-REDUCTION и E-FIX-DEPLOY-PATH — новый деплой с исправленными путями
- Ожидается E-UX-AUDIT-M5-RECHECK от Opus

### Chatbot (НейроВалюша)
- Знает роль, nickname, название отряда, название смены
- Знает pending badge заявки (max 3 названия)
- Промпт формулируется на живом языке: «заявки на значки «в пути»», позитивный тон
- Валидация длины сообщений: > 2000 символов → 400

### Safety
- `/api/images/generate`: sanitize prompt (HTML strip + injection detection + truncation 300 chars), per-camp daily quota 200/сутки
- Rate limits: per-device per-minute (images), per-camp daily (images), per-camp 1/60s (cleanup)
- Все события логируются: `[IMAGES_SANITIZE]`, `[IMAGES_SAFETY]`, `[IMAGES_QUOTA]`, `[CHAT_SAFETY]`, `[AGENT_POST]`

---

## Где находимся сейчас

- Все M6-задачи: **DONE** (A/B/C/D)
- Smoke baseline: **52/52** (стабильно)
- Branch `agent-c/m6-chat-context-c` смержена в `main` (`b25ad1e`)
- Pending: **E-UX-AUDIT-M5-RECHECK** (Opus) — ждёт стабильного GitHub Pages с новым артефактом

---

## Что делаем дальше

1. **E-UX-AUDIT-M5-RECHECK** — Opus проводит browser-аудит на проде: категории, изображения, логотип, role walkthrough. Ждём результат.
2. **После E-UX-AUDIT:** если нет критических блокеров → переход к следующему спринту (M7 или следующий срез по roadmap)
3. **Lobsters live-test** — когда будет живой TG-тред: проверить реальную отправку через `/api/telegram/agent-post` от имени NeuroStepa/Cat Bro/Dev Bro 1
4. **Ops:** мониторинг cleanup quota (per-camp 1/60s в prod), убедиться что лимит не слишком агрессивный для реальной смены

---

## Правила, введённые по итогам сессии

1. **Branch discipline:** каждый TASK содержит `Base: main @ <hash>` и `Branch: agent-X/<task-id>`. После DONE — оркестратор мержит в main перед следующим TASK.
2. **No cross-branch git restore** — `git restore --source=<чужая-ветка>` запрещён.
3. **No git stash on branch switch** — новое правило 3b в ORCHESTRATOR_AGENT_BOOTSTRAP.md.
4. **Atomic Python patches** — при нестабильной git-среде: применять изменения через единый Python-скрипт с `assert branch ==` в начале и финальной проверкой всех изменений в конце.
5. **Smoke baseline gate: 52/52** — регрессия = REWORK.
6. **Первая строка отчёта:** `Агент: X (роль)` — без этого REWORK.
