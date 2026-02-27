# PROD_RELEASE_PLAYBOOK — пилотный прод‑релиз (Vercel + Supabase)

**Срез:** 2026‑02‑21  
**Назначение:** короткий и исполняемый чеклист “как релизить и поддерживать пилот на смене”, не смешивая это с описанием механик в SSOT.

Связанные документы:
- SSOT: [`docs/PRODUCT_MECHANICS_AND_ROADMAP.md`](PRODUCT_MECHANICS_AND_ROADMAP.md)
- Runbook смены: [`docs/CAMP_RUNBOOK.md`](CAMP_RUNBOOK.md)
- Supabase схема/миграция: [`docs/SUPABASE_SCHEMA_AND_MIGRATION.md`](SUPABASE_SCHEMA_AND_MIGRATION.md)
- Архитектура ресурсов (as‑is): [`docs/ARCHITECTURE_AND_RESOURCES.md`](ARCHITECTURE_AND_RESOURCES.md)

---

## 1) Архитектура прод‑стенда (pilot target)

**Цель пилота:** hosted‑продукт, который выдерживает смену: персистентность данных + RBAC + минимальная safety для чата/ИИ.

Компоненты:
- **Frontend:** Vercel (основной канал для смены).
- **Backend:** Vercel (API). В проде backend не хранит state в filesystem.
- **DB:** Supabase Postgres (основная истина для staff/squad‑домена и модерации).
- **Storage (images):** Supabase Storage (To‑be для углов/флагов/фото).
- **cf‑api (Cloudflare):** боты VK/TG и их KV. Для web‑прода не должен быть “обходным” каналом ИИ/чата.

---

## 2) Матрица окружений (Env Matrix)

### 2.1. Local dev
- Frontend: `npm run dev`
- Backend: локально (Flask), API на `http://127.0.0.1:4000`
- Storage: file‑based JSON (`backend/data/*`)

Цель: быстро итератировать UI/механику.

### 2.2. Staging (preview)
- Vercel preview deploy (frontend + backend).
- Отдельный Supabase проект/схема для staging (не смешивать с prod).

Цель: поймать регрессии до смены, прогнать smoke сценарии.

### 2.3. Production (pilot)
- Vercel production deploy.
- Supabase production проект.

Цель: “работает на смене”.

---

## 3) Secrets / Env Vars (policy)

### 3.1. Backend (server‑only, никогда не на клиент)
Auth:
- `AUTH_SECRET` (HMAC для кодов)
- `AUTH_JWT_SECRET` (подпись JWT; общий между сервисами, если нужно)
- `AUTH_GENERATE_SECRET` (если генерация кодов защищена отдельным секретом)

Supabase:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (только backend; service role ключ нельзя отдавать фронту)

Лимиты:
- `CHAT_MESSAGES_PER_DAY` (дневная квота)
- `IMAGES_GENERATE_RATE_LIMIT` (минутный лимит на генерацию картинок; опционально)

### 3.2. Frontend (public env)
- Не хранить секреты.  
  Всё, что связано с Supabase service‑role, токенами, лимитами, модерацией и доступами, должно проходить через backend.

---

## 4) Prod gates (нельзя релизить без этого)

1) **Dev doors off**
- `/api/dev/login` недоступен в production.
- Sandbox UI / role switch скрыт в production (или работает только в dev/staging).

2) **Forced traveler выключен**
- Роли определяются по JWT на backend, а не “режимом демо”.

3) **Единый контур чата/ИИ через backend**
- Никаких прямых вызовов внешних endpoint’ов с клиента в prod.
- Backend применяет RBAC + квоты + фильтры + логирование.

4) **Персистентность**
- Критичные домены (shifts/squads/memberships/corners/invites/messages/badge_requests/parent_snapshots) живут в Supabase.

---

## 5) Pre‑release checklist (перед выкладкой)

Код/сборка:
1. `npm run build`
2. (опционально) `BACKEND_URL=http://localhost:4000 npm run self-check`

DB/migrations:
1. Миграции Supabase применены (schema соответствует `docs/SUPABASE_SCHEMA_AND_MIGRATION.md`).
2. Проверены индексы/уникальности (membership one‑per‑device, активный invite‑код на отряд).

API health (smoke):
1. `GET /api/health`
2. `GET /api/shifts`
3. `GET /api/shifts/<id>/squads`
4. `POST /api/auth/verify-code` (unlock)
5. `POST /api/squads/<id>/join` + `GET /api/squads/mine`
6. `POST /api/squads/<id>/messages` + `GET /api/squads/<id>/messages`

UI smoke (минимум руками):
1. unlock → вступление в отряд → кабинет → отправить сообщение → выйти из отряда
2. заявка на значок → inbox approve → синк → achieved
3. parent snapshot: создать код/QR → открыть read‑only

### §5.3 — Backend Critical Flows (автоматический, ~5 мин)

**M5-R2-A smoke script** покрывает три критических flow одной командой:

```bash
# Полный прогон (22 checks) — требует AUTH_SECRET от backend-контура:
AUTH_SECRET=<ваш_auth_secret> python backend/scripts/smoke_backend_critical.py \
  --base-url https://backend-murex-one-40.vercel.app

# Против локального backend:
AUTH_SECRET=<secret> python backend/scripts/smoke_backend_critical.py \
  --base-url http://localhost:4000

# Health-only (без секрета):
python backend/scripts/smoke_backend_critical.py --base-url https://backend-murex-one-40.vercel.app
```

**Что проверяет:**

| Flow | Шаги | Checks |
|------|------|--------|
| **A — Badge Request** | request→inbox→approve→mine | 9 checks |
| **B — Parent Insights** | snapshot→insights→invalid-404 | 6 checks |
| **C — Council Initiatives** | create→list | 5 checks |
| **Health** | /api/health | 1 check |

**Ожидаемый вывод при успехе:**
```
RESULT: ALL 22 CHECKS PASSED
```

**Интерпретация провалов:**
- `FAIL auth/verify-code` — AUTH_SECRET не совпадает с prod или backend недоступен
- `FAIL POST /api/badges/requests` — 401/403: RBAC regression; 500: Supabase unavailable
- `FAIL GET /api/parent-insights — overallProgress present` — breaking change в contract
- `FAIL GET /api/council/initiatives — new initiative found in list` — storage layer failure

Контракты (mandatory fields, breaking-change policy): [`docs/BACKEND_CONTRACT_GUARD.md`](BACKEND_CONTRACT_GUARD.md)

---

## 6) Rollback

Frontend/back:
- Откатить деплой в Vercel на предыдущий успешный build (быстрое восстановление UI/API).

DB:
- Для пилота предпочитать “forward‑only migrations”.
- Перед релизом иметь точку восстановления (backup) и отдельный staging для проверки миграций.

---

## 7) Monitoring (минимально необходимое)

Сигналы:
- % 5xx по backend.
- 429 (лимиты): всплески = спам/абьюз/неправильная квота.
- Ошибки авторизации 401/403 (сессии/role mismatch).

Что логировать:
- `requestId`/correlation id (если внедрено).
- тип действия: verify‑code/join/invite/messages/badge‑inbox.
- агрегаты (без персональных данных сверх нужного).

Операционка:
- staff должен иметь понятный путь “что делать при ошибке” (см. `docs/CAMP_RUNBOOK.md`).

