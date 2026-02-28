# REPORT_D_M6_VERCEL_LOBSTERS

**Агент:** D (Infra/Release/Operations)  
**Дата:** 2026-02-28  
**Ветка:** `agent-d/m6-vercel-lobsters`  
**Base:** `main @ 4915674`  
**Статус:** ✅ DONE

---

## Задача

Добавить 3 токена лобстеров в Vercel Production, обновить статус в `OPS_SNAPSHOT_M5_GO.md §3`, прогнать smoke I-1.

---

## Deliverable 1 — Vercel Production env vars

Добавлены через Vercel Dashboard (аккаунт `nomorningst-2550`), проект `backend-murex-one-40`, скоуп **Production**:

| Var | Vercel ID | Статус |
|-----|-----------|--------|
| `NEURO_STEPA_BOT_TOKEN` | `EHHkQrok1aX5tdxO` | ✅ Created (encrypted) |
| `CAT_BRO_BOT_TOKEN` | `mibVmKMsHcJn23eU` | ✅ Created (encrypted) |
| `DEV_BRO_1_BOT_TOKEN` | `AHfNaf4pDynHsLBA` | ✅ Created (encrypted) |

**Redeploy:** Выполнен. Deployment ID: `dpl_D6BWFGnY1GpfyvrnX1UYaW83DQ52`  
**Deployment state:** READY  
**Prod URL:** `https://backend-murex-one-40.vercel.app`

---

## Deliverable 2 — Smoke I-1 (no auth, expect 401)

Команда:
```powershell
Invoke-WebRequest -Method POST -Uri "https://backend-murex-one-40.vercel.app/api/telegram/agent-post" `
  -ContentType "application/json" `
  -Body '{"agent":"neuro_stepa","text":"I-1 smoke","root_message_id":1}'
```

**Результат:**
```
HTTP 401 Unauthorized
{"error": "Authorization required"}
```

✅ Endpoint активен, auth guard работает.

---

## Deliverable 3 — OPS_SNAPSHOT обновлён

`docs/OPS_SNAPSHOT_M5_GO.md §3`:
- `NEURO_STEPA_BOT_TOKEN`: `NEEDS_VERCEL_ADD` → **VERIFIED_OPTIONAL**
- `CAT_BRO_BOT_TOKEN`: `NEEDS_VERCEL_ADD` → **VERIFIED_OPTIONAL**
- `DEV_BRO_1_BOT_TOKEN`: `NEEDS_VERCEL_ADD` → **VERIFIED_OPTIONAL**
- `Last audit`: обновлён на `2026-02-28 (M6-VERCEL-LOBSTERS)`
- `Summary`: обновлён — все 3 лобстер-токена теперь `VERIFIED_OPTIONAL`

---

## Итог

| DoD | Статус |
|-----|--------|
| 3 токена добавлены в Vercel Production | ✅ |
| OPS_SNAPSHOT §3 обновлён (NEEDS_VERCEL_ADD → VERIFIED_OPTIONAL) | ✅ |
| Smoke I-1: 401 | ✅ |
| Commit на agent-d/m6-vercel-lobsters | ✅ (см. ниже) |

---

## Связанные документы

- `docs/OPS_SNAPSHOT_M5_GO.md §3` — env matrix (все env теперь VERIFIED/VERIFIED_OPTIONAL)
- `docs/LOBSTERS_RUNBOOK.md` — статус ботов обновлён, предупреждение о недоступности снято
- `docs/PROD_RELEASE_PLAYBOOK.md §5.3` — lobster checklist
