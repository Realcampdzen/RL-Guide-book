# REPORT: Staging Smoke — M5-R3-D

**Task ID:** M5-R3-D  
**Agent:** D (Infra/Release/Operations)  
**Date:** 2026-02-27  
**Verdict:** STAGING_BACKEND_NOT_DEPLOYED

---

## Summary

Staging backend (`pult.staging.well-telecom.ru`) не содержит Flask API Путеводителя.
Ресурс принадлежит биллинговой системе ISP Well Telecom и возвращает 401/404 с маршрутизатором формата `{"message":"The route X could not be found."}`.

Smoke-скрипт `backend/scripts/smoke_backend_critical.py` против staging URL запустить невозможно:
`/api/health` возвращает 404 (не наш backend), auth-flows бессмысленны.

Вместо этого зафиксированы baseline-проверки **prod backend** как контрольная точка.

---

## §1 Staging discovery — STAGING_BACKEND_NOT_DEPLOYED

| Probe | URL | Result | Interpretation |
|-------|-----|--------|----------------|
| `GET /api/health` | `https://pult.staging.well-telecom.ru/api/health` | `HTTP 404` `{"message":"The route api/health could not be found."}` | ISP router, not Flask |
| `GET /health` | `https://pult.staging.well-telecom.ru/health` | `HTTP 404` `{"message":"The route health could not be found."}` | ISP router, not Flask |
| `GET /` | `https://pult.staging.well-telecom.ru/` | `HTTP 401` `<h1>401 Unauthorized</h1>` | Well Telecom billing panel, HTTP Basic Auth |
| `GET /api/` | `https://pult.staging.well-telecom.ru/api/` | `HTTP 404` | ISP router |

**Вывод:** `pult.staging.well-telecom.ru` — это административная панель ISP (Well Telecom billing), не Flask API Путеводителя. Staging backend **не задеплоен**.

---

## §2 Prod backend baseline checks (контрольная точка)

Smoke-скрипт без `AUTH_SECRET` (auth-flows пропущены):

```
python backend/scripts/smoke_backend_critical.py \
  --base-url https://backend-murex-one-40.vercel.app
```

| Check | Result |
|-------|--------|
| `GET /api/health` → `{"status":"ok"}` | PASS |
| Flow A (auth required) | SKIP — no AUTH_SECRET |
| Flow B (auth required) | SKIP — no AUTH_SECRET |
| Flow C (auth required) | SKIP — no AUTH_SECRET |
| Flow D (auth required) | SKIP — no AUTH_SECRET |

**RESULT: 1/1 CHECKS PASSED** (health gate)

### Дополнительные ручные RBAC-проверки (без AUTH_SECRET)

| Check | URL | Expected | Result |
|-------|-----|----------|--------|
| Dev-door closed | `POST /api/dev/login` | 404 | PASS — `{"error":"Not found"}` |
| Shifts RBAC gate | `GET /api/shifts` (no token) | 401 | PASS — `{"error":"Authorization required"}` |
| Badge inbox RBAC gate | `GET /api/badges/requests/inbox` (no token) | 401 | PASS — HTTP 401 |

**Prod baseline: все 4 проверки PASS.**

---

## §3 Smoke-скрипт: текущее состояние

Скрипт `backend/scripts/smoke_backend_critical.py` (M5-R2-A + M5-R2-B):

| Flow | Checks | Description |
|------|--------|-------------|
| Health | 1 | `GET /api/health` |
| Flow A | 9 | Badge request lifecycle: request → inbox → approve → mine |
| Flow B | 4 | Parent insights: snapshot → insights read → invalid-code 404 |
| Flow C | 4 | Council initiatives: create → list |
| Flow D | 3 | Mine privacy + contract checks |
| **Total** | **~21** | All require AUTH_SECRET except Health |

Запуск против staging невозможен — URL не наш backend.  
Полный прогон возможен только при наличии `AUTH_SECRET` против prod или задеплоенного staging.

---

## §4 Рекомендации

1. **Деплой Flask backend на staging:**
   - Создать Vercel Preview deployment из ветки `devbro/m5-r1-2-runtime-warnings` (или `main` после merge).
   - Настроить env vars: `USE_SUPABASE`, `ENVIRONMENT=staging`, `AUTH_SECRET` (staging-specific secret), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — указать на staging Supabase project (или использовать prod Supabase с ограниченными правами).
   - Зафиксировать staging URL в `OPS_SNAPSHOT_M5_GO.md §1`.

2. **AUTH_SECRET для полного smoke:**
   - Получить prod `AUTH_SECRET` из Vercel env → запустить полный прогон (21 check) против prod.
   - Команда: `AUTH_SECRET=<secret> python backend/scripts/smoke_backend_critical.py --base-url https://backend-murex-one-40.vercel.app`
   - Ожидаемый результат: `ALL 21 CHECKS PASSED`.

3. **Staging Supabase:**
   - При деплое staging рекомендуется отдельный Supabase project чтобы избежать загрязнения prod данных smoke-тестами (badge requests, council initiatives, parent snapshots).

---

## §5 DoD-чеклист

| Criterion | Status |
|-----------|--------|
| Staging URL проверен | ✅ |
| Вердикт зафиксирован | ✅ STAGING_BACKEND_NOT_DEPLOYED |
| Prod baseline проверен | ✅ 4/4 PASS |
| Smoke-скрипт статус задокументирован | ✅ |
| Рекомендации по деплою staging даны | ✅ |

---

## Связанные артефакты

- `backend/scripts/smoke_backend_critical.py` — smoke script (M5-R2-A + M5-R2-B)
- `docs/OPS_SNAPSHOT_M5_GO.md` — env matrix (обновлён в M5-R3-D)
- `docs/RELEASE_NOTE_M5_FINAL.md` — финальный release note (обновлён в M5-R3-D)
- `docs/PROD_RELEASE_PLAYBOOK.md §5.3` — команда запуска smoke
