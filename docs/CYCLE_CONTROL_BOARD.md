# CYCLE_CONTROL_BOARD.md

Единый дашборд оркестратора для управления текущим циклом мультиагентной разработки.

---

## Cycle

- Cycle ID: 2026-03-01-M7
- Mode: Execution — Sprint M7 «Partial mechanics completion»
- Orchestrator: NeuroStepa
- Updated at: 2026-03-01 (M7 sprint kickoff — 5 tasks: plan workflow, plan UI, educator RBAC, requiresApproval, share triggers)

---

## Agent Status Matrix

| Agent | Current Task | Branch | Status | Last Commit | Risks/Blockers | Next Action | Owner |
|---|---|---|---|---|---|---|---|
| Agent A | M7-PLAN-WORKFLOW-A | `main` (direct) | DONE | Endpoints verified | None | Ждёт M7-EDUCATOR-RBAC-A (после B) | Agent A |
| Agent B | M7-PLAN-UI-B + M7-SHARE-TRIGGERS-B | `main` (direct) | DONE | tsc clean | None | Ждёт следующего TASK | Agent B |
| Agent C | M7-REQUIRESAPPROVAL-C | `main` (direct) | DONE CERTIFIED | tsc clean | None | Ждёт следующего TASK | Agent C |
| Agent D | — | — | STANDBY | `00d320a` | None | Standby this sprint | Agent D |
| Agent E (Opus) | E-UX-AUDIT-M5-RECHECK | `cloud/e-validation-m5` | PENDING | `f603943` | Ждёт GitHub Pages deploy | Провести recheck после деплоя | Opus |
| Kot Bro | KOT_THREAD_TRANSPORT_FIX_V1.1 | n/a | CERTIFIED | `70ecd58` | GAP-1 non-blocking | Closed | Kot Bro |
| Fin Bro | Standby | n/a | STANDBY | — | None | По запросу | Fin Bro |
| NeuroStepa | Orchestration + board sync | `main` | ACTIVE | `00d320a` | None | Выдать TASK Agent A + Agent C | NeuroStepa |

---

## Active Quality Gates

1. **No fake DONE** — commit hash + files + validation + smoke output.
2. **Branch discipline** — каждый TASK содержит явное `Base: main @ <hash>` и `Branch: agent-X/<task-id>`.
3. **Report identity** — первая строка: `Агент: X (роль)`. Без этого — REWORK.
4. **M3 Badge Flow gate** — no RBAC changes, no DB migrations, no breaking changes.
5. **M2 Parent read-only gate** — any impact requires NEEDS_REVIEW.
6. **Smoke gate** — baseline **52/52**. Регрессия = REWORK.
7. **No cross-branch git restore** — запрещён `git restore --source=<чужая-ветка>`. Синхронизация только через `main`.

---

## Decision Log (current cycle)

- M3-BF-S1: DONE (`9d99bc8`)
- M3-BF-S2: DONE (`8fcbac5`)
- M3-BF-S3/M3-SC-S1: DONE (`35609d9`)
- M5-R2-A: DONE (`a995a1b`) — smoke 22/22 + contract guard + playbook §5.3
- TAILS_RECONCILE_B: DONE (`9e7ab96`) — chip tokens + ImageSourceBlock
- M5-R2-B: DONE (`debe941`) — badge /mine privacy + educator inbox + smoke 31/31
- TAILS_RECONCILE_C: DONE CERTIFIED (`70ecd58`) — transport certified, GAP-1 non-blocking
- TAILS_RECONCILE_D: DONE (`4f3cebf`) — release readiness + GO note + risk matrix R1–R6
- E-VALIDATION-M5: CERTIFIED (`009a5d3`) — Opus runtime validation VERIFIED
- M5-R2-C: DONE CERTIFIED (`0a307ee`) — images safety + smoke Flow E
- M3-BF-S4: DONE (`e474174`) — badge status panel + M2 guard. Agent B
- M5-R3-A: DONE (`84ef633`) — badge TTL + cleanup + smoke Flow F 39/39. Agent A
- M3-BF-S5: DONE (`44533b0`) — auto-sync + celebration + reject reason. Agent B
- M5-R3-C: DONE CERTIFIED (`248e456`) — chat enrichment squad/shift/nickname + smoke 43/43. Agent C
- M5-R4-C: DONE CERTIFIED (`374fd3b`) — pending badges context + CHAT_MAX_MESSAGE_LEN + smoke 44/44. Agent C
- M3-BF-S6: DONE (`14914fd`) — staff inbox localize + inline reject + optimistic UI + evidence accordion. Agent B
- M5-R3-D: DONE (`131460b`) — staging smoke (NOT_DEPLOYED) + env matrix audit + RELEASE_NOTE Known Issues. Agent D
- M5-R4-A: DONE (`2f6139d`) — Supabase badge gap fix + load_inbox SQL. Agent A
- M5-R4-D: DONE (`d130639`) — env verification VERIFIED/VERIFIED_OPTIONAL + STAGING_BACKEND_SETUP.md. Agent D
- E-ESLINT-TRIAGE-M5: DONE (`bc4627a`) — CRITICAL=0, HIGH=24 (non-blocking), NOISE=169 (88%). Opus
- **GIT_DISCIPLINE_FIX**: main обновлён (`724eb8f`). Смержены: agent-c (13 commits), agent-b (2), agent-a (1), agent-d (cherry-pick M5-R4-D). Правила изоляции веток зафиксированы в ORCHESTRATOR_AGENT_BOOTSTRAP.md §8b.
- M5-R5-C: DONE CERTIFIED (`76d2e89`) — `/api/telegram/agent-post` + AGENT_BOT_TOKENS (neuro_stepa/cat_bro/dev_bro_1) + Flow I 3 checks. Smoke baseline 47/47. Agent C
- M5-R5-D: DONE (`ac37faa`) — LOBSTERS_RUNBOOK.md + OPS_SNAPSHOT §3 NEEDS_VERCEL_ADD + PROD_RELEASE_PLAYBOOK §5.3. Agent D
- HOTFIX-BASE-PATH: DONE CRITICAL (`9a26f54`) — двойной путь vite.config.ts устранён. dist/RL-Guide-book/RL-Guide-book NOT EXISTS. Build verified. Agent D
- M5-R5-A: DONE (`8c29ba7`) — delete_resolved() SQL + hasattr guard + Flow H+I. Smoke 51/51. Agent A
- M6-IMG-FIX: DONE (`482973d`) — 26 хардкод /RL-Guide-book/ → BASE_URL в 9 файлах. Build clean. Agent B
- M3-BF-S7: DONE (`fa05be9`) — ESLint HIGH fix + inbox squadId + pending counter. Agent B
- TAILS_RECONCILE_B: DONE (`b3d38e8`) — ImageSourceBlock audit, chip/tone consistency (3 systems), M2 confirmed. Agent B
- M6-CHAT-CONTEXT-C: DONE CERTIFIED (`acf77f7`) — living-language pending badges prompt + G-4 smoke. Agent C
- M6-VERCEL-LOBSTERS: DONE (`c981b5f`) — lobsters VERIFIED_OPTIONAL, smoke I-1 401 confirmed. Agent D
- M6-BACKEND-HARDENING-A: DONE (`6ec335a`) — cleanup rate limit 429 + camp_id log + H-3 check. Smoke **52/52**. Agent A
- **GitHub Pages**: нужен новый push с M6-IMG-FIX для проверки Опусом.
- M6-CHAT-CONTEXT-C: DONE CERTIFIED — living-language pending badges prompt, [:3] confirmed, smoke G-4 (not 500 guard). Smoke **52/52**. Agent C
- GIT-SIZE-REDUCTION: DONE (`5e43f0a`, merge `57f0729`) — JPG/orig убраны из git tracking (583 files); badgeImages.ts + badgeImageMap.ts: .jpg → .webp; artifact 2.2GB → ~250MB. Agent D
- E-FIX-DEPLOY-PATH: DONE CRITICAL (`aefcedd`, merge `e99a579`) — настоящий корень 404: public/ копировался в dist/RL-Guide-book/ вместо dist/. vite.config.ts упрощён. dist/ = 752MB. Agent E (Opus)
- E-FIX-CURSOR: DONE (`2c22669`, cherry-pick `300d26a`) — cursor ghost-line artifact: will-change + backface-visibility + isolation:isolate на hover. GPU-промоушн без изменения визуала. Agent E (Opus)

---

## Smoke Baseline

| Version | Checks | Status |
|---------|--------|--------|
| M5-R2-A | 22/22 | ✅ |
| M5-R2-B (Flow D) | 31/31 | ✅ |
| M5-R2-C (Flow E) | ~35 | ✅ |
| M5-R3-A (Flow F) | 39/39 | ✅ |
| M5-R3-C (Flow G) | 43/43 | ✅ |
| M5-R4-C (G-3) | 44/44 | ✅ |
| M5-R5-C (Flow I) | 47/47 | ✅ |
| M5-R5-A (Flow H+I+fixes) | **51/51** | ✅ |
| M6-CHAT-CONTEXT-C (G-4) | 52/52 | ✅ |
| M6-HARDENING-A (H-3 rate limit) | **52/52** | ✅ CURRENT |

---

## Git Branch Discipline (введено GIT_DISCIPLINE_FIX)

**Проблема (2026-02-27):** agent-c/m5-r4-c стала де-факто общей веткой для A, B, C, D.
Следствие: git restore --source=<чужая-ветка>, конфликты, потеря изменений.

**Исправление:** см. ORCHESTRATOR_AGENT_BOOTSTRAP.md §8b.

**Шаблон TASK (обязателен с этого момента):**
```
Branch: agent-X/<task-id>
Base: main @ <hash>
```

**После каждого DONE:** оркестратор мержит ветку в main ПЕРЕД выдачей следующего TASK.

---

## Telegram Agent Bots (лобстеры)

| Bot | Handle | Role | Env var |
|-----|--------|------|---------|
| НейроВалюша | @Neiro_Valyusha_bot | Основной чат-бот | `TELEGRAM_BOT_TOKEN` |
| NeuroStepa | @NeuroStepa_bot | Оркестратор/архитектор | `NEURO_STEPA_BOT_TOKEN` |
| Cat Bro | @Cat_Bro_bot | СММ/контент | `CAT_BRO_BOT_TOKEN` |
| Dev Bro 1 | @Dev_Bro_1_bot | Разработчик | `DEV_BRO_1_BOT_TOKEN` |

---

## Update Protocol

Board = primary source. Forwarded chat messages = raw input only.
Each update: status delta + commit delta + risk delta + next action.
