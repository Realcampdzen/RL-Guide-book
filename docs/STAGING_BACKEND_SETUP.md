# Staging Backend Setup

**Автор:** Agent D (Infra/Release/Operations)  
**Дата:** 2026-02-27 (M5-R4-D)

---

## Проблема

`pult.staging.well-telecom.ru` — ISP биллинг-система Well Telecom, не наш Flask backend.  
Staging Flask API отсутствует.

**Следствие:** pre-release smoke невозможен против изолированного staging. Сейчас smoke прогоняется только против prod (read-only endpoints), что создаёт риск при изменении логики backend.

---

## Рекомендации (приоритет)

### 1. Vercel Preview (рекомендуется — быстро)

При каждом PR Vercel автоматически создаёт preview deployment Flask backend.

**URL pattern:** `https://backend-murex-one-40-<branch-slug>-<hash>.vercel.app`

**Как получить:**
- GitHub PR → секция "Checks" → ссылка "Vercel — Preview" → "Visit Preview"
- Или: Vercel Dashboard → Project `backend-murex-one-40` → Deployments → фильтр по ветке

**Команда запуска smoke:**
```bash
AUTH_SECRET=<auth_secret_from_env> python backend/scripts/smoke_backend_critical.py \
  --base-url https://backend-murex-one-40-<preview-hash>.vercel.app
```

**Ожидаемый результат:** `RESULT: ALL 43 CHECKS PASSED`

**Плюсы:**
- Автоматически создаётся для каждого PR
- Использует реальный Supabase (тот же, что и prod — осторожно с тестовыми данными)
- Не требует отдельной инфраструктуры

**Минусы:**
- Общий Supabase с prod (тестовые данные попадают в prod БД)
- URL нестабильный (меняется с каждым деплоем)

---

### 2. Local smoke (текущий workaround)

Запустить backend локально и прогнать smoke:

```bash
# Запустить backend
cd backend
USE_SUPABASE=false python app.py  # или с Supabase

# В другом терминале
AUTH_SECRET=<secret> python scripts/smoke_backend_critical.py \
  --base-url http://localhost:4000
```

**Плюсы:** изолирован от prod данных (при `USE_SUPABASE=false`)  
**Минусы:** проверяет только локальную копию, не реальный Vercel enviroment

---

### 3. Dedicated staging Vercel project (долгосрочно)

Создать отдельный Vercel project для staging:

- Проект: `backend-staging-putevoditel` (или аналогичный)
- Env vars: `SUPABASE_URL` → staging Supabase instance (отдельный от prod)
- `USE_SUPABASE=true`, `ENVIRONMENT=staging`
- Деплой: автоматически при push в `develop` или `staging` ветку

**Преимущества:**
- Полная изоляция от prod данных
- Стабильный URL
- Реальная Vercel/Supabase связка

---

## Action items (M6-цикл)

| Priority | Action | Owner |
|----------|--------|-------|
| P1 | Добавить в PROD_RELEASE_PLAYBOOK §4.1: pre-release smoke via Vercel Preview | ✅ Done (M5-R4-D) |
| P1 | Документировать URL pattern Vercel Preview deployments | ✅ Done (M5-R4-D) |
| P2 | Создать отдельный staging Vercel project с изолированным Supabase | Agent D / Ops |
| P3 | Добавить staging env vars set в `.env.staging.example` | Agent D |
| P3 | Настроить CI: автоматически прогонять smoke против Vercel Preview перед merge | Agent D / CI |

---

## Связанные документы

- [`docs/PROD_RELEASE_PLAYBOOK.md §4.1`](PROD_RELEASE_PLAYBOOK.md) — инструкция по smoke via Vercel Preview
- [`docs/OPS_SNAPSHOT_M5_GO.md`](OPS_SNAPSHOT_M5_GO.md) — env matrix, текущий статус
- [`docs/PROD_ROADMAP_IMPL/reports/REPORT_D_STAGING_SMOKE_M5_2026-02-27.md`](PROD_ROADMAP_IMPL/reports/REPORT_D_STAGING_SMOKE_M5_2026-02-27.md) — отчёт M5-R3-D
