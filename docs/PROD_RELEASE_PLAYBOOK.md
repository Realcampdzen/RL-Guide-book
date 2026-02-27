# PROD_RELEASE_PLAYBOOK — пилотный прод‑релиз (Vercel + Supabase)

**Срез:** 2026‑02‑21  
**Назначение:** короткий и исполняемый чеклист “как релизить и поддерживать пилот на смене”, не смешивая это с описанием механик в SSOT.

Связанные документы:
- SSOT: [`docs/PRODUCT_MECHANICS_AND_ROADMAP.md`](PRODUCT_MECHANICS_AND_ROADMAP.md)
- Runbook смены: [`docs/CAMP_RUNBOOK.md`](CAMP_RUNBOOK.md)
- Supabase схема/миграция: [`docs/SUPABASE_SCHEMA_AND_MIGRATION.md`](SUPABASE_SCHEMA_AND_MIGRATION.md)
- Архитектура ресурсов (as‑is): [`docs/ARCHITECTURE_AND_RESOURCES.md`](ARCHITECTURE_AND_RESOURCES.md)
- **M5 release readiness baseline:** [`docs/RELEASE_READINESS_BASELINE_M5.md`](RELEASE_READINESS_BASELINE_M5.md)
- **M5 final release note (GO):** [`docs/RELEASE_NOTE_M5_FINAL.md`](RELEASE_NOTE_M5_FINAL.md)
- **Ops snapshot (pre-release checklist):** [`docs/OPS_SNAPSHOT_M5_GO.md`](OPS_SNAPSHOT_M5_GO.md)

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

### §4.1 — Pre-release smoke via Vercel Preview (добавлен M5-R4-D)

**Цель:** прогнать автоматический smoke перед merge в main, используя Vercel Preview deployment как staging-окружение.

**Как получить Vercel Preview URL:**
1. GitHub PR → секция "Checks" → "Vercel — Preview" → "Visit Preview".
2. Или: Vercel Dashboard → Project `backend-murex-one-40` → Deployments → найти по ветке/PR.
3. URL pattern: `https://backend-murex-one-40-<branch-slug>.vercel.app`

**Команда запуска:**
```bash
AUTH_SECRET=<auth_secret> python backend/scripts/smoke_backend_critical.py \
  --base-url https://backend-murex-one-40-<preview-hash>.vercel.app
```

**Ожидаемый результат:** `RESULT: ALL 43 CHECKS PASSED`

**Что проверяется (43 checks):**

| Flow | Description |
|------|-------------|
| Health | `/api/health` |
| A — Badge Request | request → inbox → approve → mine (9 checks) |
| B — Parent Insights | snapshot → insights → invalid-404 (4 checks) |
| C — Council Initiatives | create → list (4 checks) |
| D — Mine Privacy | privacy + contract (3 checks) |
| E — Image Safety | prompt sanitization + quota (M5-R2-C) |
| F — Teams | badge cleanup + teams smoke (M5-R3-A) |

**Подробнее о staging-окружении:** [`docs/STAGING_BACKEND_SETUP.md`](STAGING_BACKEND_SETUP.md)

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

### §5.2 Расширенный smoke‑checklist (M3/M4 surfaces — добавлен TAILS_RECONCILE_D)

Участник:
- Открыть Council Dashboard → список инициатив отображается → статус‑чипы (new/reviewing/accepted/done) корректны → additive‑фильтр работает.
- Открыть Squad Corner → чип readiness (empty/partial/ready) виден → данные корректны.
- Badge flow → статус‑чипы бейджей корректны (in‑progress/achieved) → без артефактов в UI.

Родитель (read‑only):
- Открыть child‑view по parent_code → режим read‑only активен → **нет мутирующих CTA** (кнопок «Отправить», «Изменить» и т.д.).
- Блок Parent Insights → прогресс/тренд/рекомендации/explainability отображаются → fallback‑тексты читаемы (не технические placeholder'ы).
- Открыть child‑view с частичными/пустыми данными → graceful fallback, не ошибка.

Staff:
- Панель approvals → inbox badge requests с фильтром статуса → approve/reject работает.
- Squad Corner как counselor → readiness chip обновляется при сохранении данных.
- Educator Cabinet (если educator role) → 3 вкладки доступны.

Полный drill‑расчёт: <30 мин. Эталон: [`docs/OPS_SNAPSHOT_M5_GO.md §5`](OPS_SNAPSHOT_M5_GO.md).

### §5.3 Lobster bots checklist (добавлен M5-R5-D)

- [ ] Lobster bot tokens добавлены в Vercel Production
      (`NEURO_STEPA_BOT_TOKEN`, `CAT_BRO_BOT_TOKEN`, `DEV_BRO_1_BOT_TOKEN`)
- [ ] `POST /api/telegram/agent-post` smoke I-1/I-2/I-3 пройден (HTTP 200 для всех трёх ботов)

Инструкция по smoke и диагностике: [`docs/LOBSTERS_RUNBOOK.md`](LOBSTERS_RUNBOOK.md)

---

## 6) Rollback

Frontend/back:
- **Fast rollback:** Vercel Dashboard → Deployments → “Promote to Production” на предыдущий успешный build.
- **Git‑based rollback:** см. полную процедуру в [\docs/RELEASE_NOTE_M5_FINAL.md §Rollback\](RELEASE_NOTE_M5_FINAL.md).
- **LKG:** \008797\ (GO), anchor 8f8bd5\ (stable pre‑R1.2).

DB:
- Для пилота предпочитать “forward‑only migrations”.
- M5 track: **нет новых миграций** — откат DB не требуется.
- Перед новым релизным треком иметь точку восстановления (backup) и отдельный staging для проверки миграций.

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

