# REPORT: M5-R5-D — Lobster Bots Operational Readiness

**Агент:** D (Infra/Release/Operations)  
**Task ID:** M5-R5-D  
**Branch:** `agent-d/m5-r5-d` (от `main @ 358856a`)  
**Date:** 2026-02-27  
**Priority:** P1 — operational readiness

---

## Summary

M5-R4-D закрыл env audit (все критичные env VERIFIED). В M5-R5-D появились три новых Telegram-бота (лобстеры: NeuroStepa, Cat Bro, Dev Bro 1) и Agent C реализует `/api/telegram/agent-post`. Задача — операционная готовность: документирование новых env, runbook и обновление pre-release checklist.

**Характер задачи:** docs-only, без изменений кода.

---

## Deliverable 1: OPS_SNAPSHOT_M5_GO.md §3 — обновлён

**Файл:** `docs/OPS_SNAPSHOT_M5_GO.md`

Добавлены 3 новых строки в env matrix с статусом `NEEDS_VERCEL_ADD`:

| Var | Status | Evidence |
|-----|--------|----------|
| `NEURO_STEPA_BOT_TOKEN` | **NEEDS_VERCEL_ADD** | .env: token present (M5-R5-D). Not yet in Vercel Production. |
| `CAT_BRO_BOT_TOKEN` | **NEEDS_VERCEL_ADD** | .env: token present (M5-R5-D). Not yet in Vercel Production. |
| `DEV_BRO_1_BOT_TOKEN` | **NEEDS_VERCEL_ADD** | .env: token present (M5-R5-D). Not yet in Vercel Production. |

Summary обновлён: "Lobster bot tokens (3/3) NEEDS_VERCEL_ADD — present in .env, must be added to Vercel Production."

---

## Deliverable 2: docs/LOBSTERS_RUNBOOK.md — создан

**Файл:** `docs/LOBSTERS_RUNBOOK.md` (новый)

Содержание:
- Таблица лобстеров (NeuroStepa / Cat Bro / Dev Bro 1) с handles, ролями, env vars, Vercel статусом
- Endpoint `POST /api/telegram/agent-post`: auth (developer | shift_leader), body schema, agent→env маппинг, response codes
- Smoke-команды I-1 / I-2 / I-3 (curl, JWT required)
- Диагностика: 3 шага (Vercel env → I-1/I-2/I-3 smoke → Telegram Bot API getMe)
- Добавление нового лобстера: 5-шаговая процедура (BotFather → .env → AGENT_BOT_TOKENS → Vercel → обновить таблицу)

---

## Deliverable 3: PROD_RELEASE_PLAYBOOK.md §5.3 — добавлен

**Файл:** `docs/PROD_RELEASE_PLAYBOOK.md`

Добавлен раздел `### §5.3 Lobster bots checklist`:
```
- [ ] Lobster bot tokens добавлены в Vercel Production
      (NEURO_STEPA_BOT_TOKEN, CAT_BRO_BOT_TOKEN, DEV_BRO_1_BOT_TOKEN)
- [ ] POST /api/telegram/agent-post smoke I-1/I-2/I-3 пройден (HTTP 200 для всех трёх)
```
Ссылка на `docs/LOBSTERS_RUNBOOK.md` для инструкции.

---

## Files changed

| File | Action |
|------|--------|
| `docs/OPS_SNAPSHOT_M5_GO.md` | §3: 3 новых строки NEEDS_VERCEL_ADD, обновлены header и summary |
| `docs/LOBSTERS_RUNBOOK.md` | created |
| `docs/PROD_RELEASE_PLAYBOOK.md` | §5.3 lobster checklist добавлен |
| `docs/PROD_ROADMAP_IMPL/CLAIM_BOARD.md` | M5-R5-D ✅ done |
| `docs/PROD_ROADMAP_IMPL/reports/REPORT_D_M5_R5_D.md` | this file |

---

## DoD checklist

- [x] `OPS_SNAPSHOT_M5_GO.md §3` обновлён (3 новых env строки — NEEDS_VERCEL_ADD)
- [x] `LOBSTERS_RUNBOOK.md` создан
- [x] `PROD_RELEASE_PLAYBOOK.md §5` обновлён (§5.3 lobster checklist)
- [x] `CLAIM_BOARD.md` обновлён (M5-R5-D done)
- [x] Без изменений кода — только docs
- [x] Первая строка отчёта: Агент: D (Infra/Release/Operations)
- [x] DONE-пакет: commit + файлы + report

---

## Следующий шаг (после M5-R5-C)

Когда Agent C завершит `/api/telegram/agent-post`:
1. Добавить 3 токена в Vercel Production (Vercel Dashboard → Settings → Environment Variables)
2. Прогнать I-1/I-2/I-3 smoke против Vercel Preview
3. Обновить статус в OPS_SNAPSHOT с `NEEDS_VERCEL_ADD` на `VERIFIED_OPTIONAL`
