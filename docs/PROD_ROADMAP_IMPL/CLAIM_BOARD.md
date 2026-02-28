# CLAIM_BOARD — Живая доска задач (PROD_ROADMAP_IMPL)

**Назначение:** единая точка координации 4 агентов. Перед взятием задачи — обязательно проверить этот файл.  
**Полный список задач:** [`TASKS.md`](TASKS.md)  
**Инструкция:** [`AGENT_INSTRUCTIONS.md`](AGENT_INSTRUCTIONS.md)

---

## Как обновлять

- При **старте** задачи: добавить строку со статусом `in_progress`.
- При **завершении**: изменить статус на `done`, добавить ссылку на отчёт.
- Если задача **заблокирована**: поставить `blocked` и указать причину.

**Правило:** если задача уже `in_progress` — не бери её. Выбери другую.

---

## ✅ Первый срез подтверждён (smoke-test 2026-02-21)

**Prod backend:** `https://backend-murex-one-40.vercel.app` (Flask + Supabase, USE_SUPABASE=true)
**Supabase:** `inkhtjcrzblzsfqvceid` — все миграции применены (001 + 002)
**Frontend:** VITE_BACKEND_URL встроен в GitHub Pages bundle через GitHub Variable
**Smoke-test:** generate-code → verify-code → создание смены → отряд «Дельфины» → join → squads/mine — всё через Supabase ✅

---

## Текущий Claim Board (Фаза 1)

| Агент | Task ID | Задача | Статус | Дата начала | Следующий шаг | Отчёт |
|-------|---------|--------|--------|-------------|---------------|-------|
| **Agent A** | P1-01 | Supabase schema v1 | ✅ done | 2026-02-21 | — | `backend/migrations/001_schema_v1.sql` |
| **Agent A** | P1-02 | StorageProvider + Supabase (основные домены) | ✅ done | 2026-02-21 | — | `backend/storage/` (4 файла) + рефакторинг `app.py` |
| **Agent A** | P1-03 | Supabase для badge_requests/parent_snapshots/chat | ✅ done | 2026-02-21 | — | Включено в P1-02 (все 8 сторов сразу) |
|| **Agent A** | DEPLOY | Деплой Flask на Vercel + Supabase prod | ✅ done | 2026-02-21 | — | backend-murex-one-40.vercel.app; USE_SUPABASE=true; VITE_BACKEND_URL в GitHub Variable |
|| **Agent A** | SMOKE  | Smoke-test первого среза | ✅ done | 2026-02-21 | — | Все API: auth/shifts/squads/join/mine через Supabase — passed |
| **Agent D** | P1-04 | Закрыть dev-двери в production | ✅ done | 2026-02-21 | — | [REPORT_D_P1-04.md](reports/REPORT_D_P1-04.md) |
| **Agent B** | P1-05 | Убрать forced traveler | done | 2026-02-21 | P1-09 следующим | [REPORT_B_P1-05.md](reports/REPORT_B_P1-05.md) |
| **Agent D** | P1-06 | Server-side RBAC по JWT | ✅ done | 2026-02-21 | — | [REPORT_D_P1-06.md](reports/REPORT_D_P1-06.md) |
| **Agent C** | P1-07 | Rate limits + safety-фильтры чата | ✅ done | 2026-02-21 | — | [REPORT_C_P1-07.md](reports/REPORT_C_P1-07.md) |
| **Agent C** | P1-08 | Единый контур чата через backend | ✅ done | 2026-02-21 | — | [REPORT_C_P1-08.md](reports/REPORT_C_P1-08.md) |
| **Agent B** | P1-09 | UX smoke-сценарии | done | 2026-02-21 | E2E с Supabase ждёт P1-03 | [REPORT_B_P1-09.md](reports/REPORT_B_P1-09.md) |
| **Agent D** | P1-10 | Docs: staging checklist + monitoring | ✅ done | 2026-02-21 | — | [REPORT_D_P1-10.md](reports/REPORT_D_P1-10.md) |

---

## Текущий Claim Board (Фаза 2)

*Приступать только после завершения всех задач Фазы 1.*

| Агент | Task ID | Задача | Статус | Дата начала | Следующий шаг | Отчёт |
|-------|---------|--------|--------|-------------|---------------|-------|
| **Agent D** | P2-01 | RBAC для educator | ✅ done | 2026-02-21 | — | [REPORT_D_P2-01.md](reports/REPORT_D_P2-01.md) |
| **Agent B** | P2-02 | Дашборды staff | done | 2026-02-21 | inbox-фильтры, статистика, участники, educator join | [REPORT_B_P2-02.md](reports/REPORT_B_P2-02.md) |
| **Agent C** | P2-03 | Совет Лагеря — инициативы | ✅ done | 2026-02-21 | — | [REPORT_C_P2-03.md](reports/REPORT_C_P2-03.md) |
| **Agent B** | P2-04 | Кабинет педагога v1 | done | 2026-02-21 | EducatorCabinetPanel → кабина, 3 вкладки | [REPORT_B_P2-04.md](reports/REPORT_B_P2-04.md) |

---

## Текущий параллельный спринт (решение от 2026-02-25)

| Трек | ID | Задача | Статус | Дата старта | Следующий шаг | План |
|------|----|--------|--------|-------------|---------------|------|
| **Ops** | O1 | НейроСтёпа как операционный слой (SMM/FAQ/objections/runbook) | in_progress | 2026-02-25 | KPI-лог + 7-дневный цикл + ретро-патчи | [PLAN_O1_M1_2026-02-25.md](plans/PLAN_O1_M1_2026-02-25.md) |
| **Mechanics** | M1 (Q1) | Scoped engines: `scope camp|shift|squad` + `shiftId/squadId` | done | 2026-02-25 | Closed: roadmap synced, evidence package attached | [PLAN_M1_SCOPED_ENGINES_TECHSPEC.md](plans/PLAN_M1_SCOPED_ENGINES_TECHSPEC.md); [PLAN_M1_UI_SMOKE_CHECKLIST.md](plans/PLAN_M1_UI_SMOKE_CHECKLIST.md); [REPORT_M1_Q1_SCOPE_SLICE_2026-02-25.md](reports/REPORT_M1_Q1_SCOPE_SLICE_2026-02-25.md); [REPORT_M1_Q1_SCOPE_SLICE2_2026-02-25.md](reports/REPORT_M1_Q1_SCOPE_SLICE2_2026-02-25.md); [REPORT_M1_Q1_SCOPE_SLICE3_2026-02-26.md](reports/REPORT_M1_Q1_SCOPE_SLICE3_2026-02-26.md); [REPORT_M1_Q1_STAGING_VALIDATION_DONE_2026-02-26.md](reports/REPORT_M1_Q1_STAGING_VALIDATION_DONE_2026-02-26.md); [REPORT_M1_UI_SMOKE_AUTOTEST_PREP_2026-02-26.md](reports/REPORT_M1_UI_SMOKE_AUTOTEST_PREP_2026-02-26.md); [REPORT_M1_UI_SMOKE_MANUAL_2026-02-26.md](reports/REPORT_M1_UI_SMOKE_MANUAL_2026-02-26.md); [REPORT_M1_Q1_CLOSEOUT_DRAFT_2026-02-26.md](reports/REPORT_M1_Q1_CLOSEOUT_DRAFT_2026-02-26.md) |
| **Mechanics** | M2 (Q2) | Parent hybrid: свой ЛК + read-only витрина ребёнка | done | 2026-02-26 | Closed: parent-home vs child-view split delivered, read-only UX finalized | [PLAN_M2_Q2_PARENT_HYBRID_TECHSPEC.md](plans/PLAN_M2_Q2_PARENT_HYBRID_TECHSPEC.md); [REPORT_M2_Q2_KICKOFF_2026-02-26.md](reports/REPORT_M2_Q2_KICKOFF_2026-02-26.md); [REPORT_M2_Q2_PARENT_READONLY_SLICE2_3_2026-02-26.md](reports/REPORT_M2_Q2_PARENT_READONLY_SLICE2_3_2026-02-26.md); [REPORT_M2_Q2_PARENT_HYBRID_CLOSEOUT_2026-02-26.md](reports/REPORT_M2_Q2_PARENT_HYBRID_CLOSEOUT_2026-02-26.md) |
| **Mechanics** | M3-SC-S1 | Squad Corner stabilized readiness slice | done | 2026-02-27 | Closed: readiness model + chip consistency + normalization | [REPORT_M3_SC_S1_2026-02-27.md](reports/REPORT_M3_SC_S1_2026-02-27.md) |
| **Agent B** | M3-BF-S4 | Badge Request Status Panel: chip tones, empty state CTA, Sync CTA, M2 guard, scroll+hint after proof submit | done | 2026-02-27 | Closed: build clean, lint clean, M2 guard confirmed; commit e474174 | [REPORT_B_M3_BF_S4_2026-02-27.md](reports/REPORT_B_M3_BF_S4_2026-02-27.md) |
| **Agent B** | M3-BF-S5 | Auto-sync approved levels on mount + celebration hint (startTutorial) + reject reason in «Мои заявки» | done | 2026-02-27 | Closed: build clean, lint clean, M2 guard confirmed; commit 44533b0 | [REPORT_B_M3_BF_S5_2026-02-27.md](reports/REPORT_B_M3_BF_S5_2026-02-27.md) |
| **Agent B** | M3-BF-S6 | Staff inbox UX: локализация кнопок + inline reject form + optimistic UI + evidence accordion | done | 2026-02-27 | Closed: build clean, M2 guard confirmed | [REPORT_B_M3_BF_S6_2026-02-27.md](reports/REPORT_B_M3_BF_S6_2026-02-27.md) |

---

## Backend Hardening (M5-R2 / M5-R3, 2026-02-27)

| Агент | Task ID | Задача | Статус | Дата | Отчёт |
|-------|---------|--------|--------|------|-------|
| **Agent A** | M5-R2-A | Backend Release Hardening: smoke script (22 checks), contract guard doc, playbook §5.3 | ✅ done | 2026-02-27 | [REPORT_A_M5_R2_A.md](reports/REPORT_A_M5_R2_A.md) |
| **Agent C** | M5-R2-C | Images Safety Hardening: prompt sanitization + per-camp daily quota + BACKEND_CONTRACT_GUARD §3.4 + smoke Flow E | ✅ done (CERTIFIED) | 2026-02-27 | [REPORT_C_M5_R2_C_2026-02-27.md](reports/REPORT_C_M5_R2_C_2026-02-27.md) |
| **Agent A** | M5-R2-B | Badge Requests: inbox educator auto-scope + /mine privacy + smoke Flow D (31 checks total) | ✅ done | 2026-02-27 | [REPORT_A_M5_R2_B.md](reports/REPORT_A_M5_R2_B.md) |
| **Agent A** | M5-R3-A | Badge Requests Cleanup + Teams Smoke: inbox TTL filter (`includeResolved`), cleanup endpoint, smoke Flow F (Teams lifecycle), 39 checks total | ✅ done | 2026-02-27 | [REPORT_A_M5_R3_A.md](reports/REPORT_A_M5_R3_A.md) |
| **Agent C** | M5-R3-C | Chat Context Enrichment: squad_name/shift_name/nickname в системный промпт + smoke Flow G + BACKEND_CONTRACT_GUARD §3.5, 43 checks total | ✅ done (CERTIFIED) | 2026-02-27 | [REPORT_C_M5_R3_C_2026-02-27.md](reports/REPORT_C_M5_R3_C_2026-02-27.md) |
| **Agent D** | M5-R3-D | Staging smoke (STAGING_BACKEND_NOT_DEPLOYED), env matrix audit (VERIFIED/UNVERIFIED), RELEASE_NOTE Known Issues (R5→Resolved) | ✅ done | 2026-02-27 | [REPORT_D_STAGING_SMOKE_M5_2026-02-27.md](reports/REPORT_D_STAGING_SMOKE_M5_2026-02-27.md) |
| **Agent C** | M5-R4-C | Chat Quality+Safety: pending badges context injection, CHAT_MAX_MESSAGE_LEN validation (400), G-3 smoke check, BACKEND_CONTRACT_GUARD §3.5 update, 44 checks total | ✅ done (CERTIFIED) | 2026-02-27 | [REPORT_C_M5_R4_C_2026-02-27.md](reports/REPORT_C_M5_R4_C_2026-02-27.md) |
| **Agent A** | M5-R4-A | Supabase GAP fix: requestedBy schema mismatch + load_inbox() SQL filtering. Smoke 39/39 | ✅ done | 2026-02-28 | [REPORT_A_M5_R4_A.md](reports/REPORT_A_M5_R4_A.md) |
| **Agent D** | M5-R4-D | Env verification (SUPABASE_SERVICE_ROLE_KEY + CHAT_MESSAGES_PER_DAY VERIFIED, TELEGRAM_* VERIFIED_OPTIONAL), STAGING_BACKEND_SETUP.md, PROD_RELEASE_PLAYBOOK §4.1 Vercel Preview smoke | ✅ done | 2026-02-27 | [REPORT_D_M5_R4_2026-02-27.md](reports/REPORT_D_M5_R4_2026-02-27.md) |
|| **Agent D** | TAILS_RECONCILE_D | Release ops consolidation: LKG/rollback/checklist links, OPS_SNAPSHOT_M5_GO.md created, known-risk matrix populated | ✅ done | 2026-02-27 | [REPORT_D_TAILS_RECONCILE_2026-02-27.md](reports/REPORT_D_TAILS_RECONCILE_2026-02-27.md) |
|| **Agent D** | M5-R5-D | Lobster bots ops readiness: OPS_SNAPSHOT §3 (NEEDS_VERCEL_ADD), LOBSTERS_RUNBOOK.md, PROD_RELEASE_PLAYBOOK §5.3 | ✅ done | 2026-02-27 | [REPORT_D_M5_R5_D.md](reports/REPORT_D_M5_R5_D.md) |
|| **Agent D** | HOTFIX-BASE-PATH | Fix vite.config.ts double-path bug: public/RL-Guide-book/ merged into dist/RL-Guide-book/ directly. Build verified: ai-data EXISTS, RL-Guide-book/RL-Guide-book NOT EXISTS | ✅ done | 2026-02-27 | [REPORT_D_HOTFIX_BASE_PATH.md](reports/REPORT_D_HOTFIX_BASE_PATH.md) |
|| **Agent C** | M5-R5-C | `/api/telegram/agent-post`: AGENT_BOT_TOKENS map (neuro_stepa/cat_bro/dev_bro_1), auth developer/shift_leader, 400/404/409, smoke Flow I 3 checks, 47 checks total, BACKEND_CONTRACT_GUARD §3.6 | ✅ done (CERTIFIED) | 2026-02-28 | — |
|| **Agent A** | M5-R5-A | Badge requests cleanup SQL delete + hasattr guard. Smoke Flow H (2 checks), 51 checks total | ✅ done (CERTIFIED) | 2026-02-28 | [REPORT_A_M5_R5_A.md](reports/REPORT_A_M5_R5_A.md) |
|| **Agent C** | M6-CHAT-CONTEXT-C | Chat context: living-language pending badges prompt, [:3] limit confirmed, smoke G-4 (not 500 guard), 52 checks total, BACKEND_CONTRACT_GUARD §G updated | ✅ done (CERTIFIED) | 2026-02-28 | [REPORT_C_M6_CHAT_CONTEXT_C.md](reports/REPORT_C_M6_CHAT_CONTEXT_C.md) |
|| **Agent E (Opus)** | E-UX-AUDIT-M5-RECHECK | Повторный browser-аудит после HOTFIX-BASE-PATH — категории, изображения, логотип, role walkthrough на проде | 🔜 pending | — | Ждёт GitHub Pages deploy | — |
|| **Agent D** | M6-VERCEL-LOBSTERS | Lobster tokens added to Vercel Production (3/3 VERIFIED_OPTIONAL), redeploy READY, smoke I-1 401 ✅ | ✅ done | 2026-02-28 | [REPORT_D_M6_VERCEL_LOBSTERS.md](reports/REPORT_D_M6_VERCEL_LOBSTERS.md) |
|| **Agent B** | M6-IMG-FIX | Replace hardcoded /RL-Guide-book/ img paths with import.meta.env.BASE_URL in 9 TSX components (26 occurrences). Build clean. | ✅ done | 2026-02-28 | [REPORT_B_M6_IMG_FIX.md](reports/REPORT_B_M6_IMG_FIX.md) |
|| **Agent B** | TAILS_RECONCILE_B | UX tail reconciliation: ImageSourceBlock audit table, chip/tone consistency (3 systems), M2 parent read-only confirm | ✅ done | 2026-02-28 | [REPORT_B_TAILS_RECONCILE_B_2026-02-28.md](reports/REPORT_B_TAILS_RECONCILE_B_2026-02-28.md) |
|| **Agent A** | M6-BACKEND-HARDENING-A | Rate limit (1/60s per-camp) на `POST /api/badges/requests/cleanup` + `camp_id` в лог-строку + H-3 smoke check (429). Smoke 52/52 PASSED | ✅ done | 2026-02-28 | [REPORT_A_M6_HARDENING_A.md](reports/REPORT_A_M6_HARDENING_A.md) |

---

## История выполненных задач (архив)

| Агент | Task ID | Задача | Дата завершения | Отчёт |
|-------|---------|--------|-----------------|-------|
| Agent B | P1-05 | Убрать forced traveler | 2026-02-21 | [REPORT_B_P1-05.md](reports/REPORT_B_P1-05.md) |
| Agent B | P1-09 | UX smoke-сценарии | 2026-02-21 | [REPORT_B_P1-09.md](reports/REPORT_B_P1-09.md) |
| Agent D | P1-04 | Закрыть dev-двери в production | 2026-02-21 | [REPORT_D_P1-04.md](reports/REPORT_D_P1-04.md) |
| Agent D | P1-06 | Server-side RBAC по JWT | 2026-02-21 | [REPORT_D_P1-06.md](reports/REPORT_D_P1-06.md) |
| Agent D | P1-10 | Docs: staging checklist + monitoring | 2026-02-21 | [REPORT_D_P1-10.md](reports/REPORT_D_P1-10.md) |
| Agent D | P2-01 | RBAC для educator | 2026-02-21 | [REPORT_D_P2-01.md](reports/REPORT_D_P2-01.md) |
| Agent B | P2-02 | Дашборды staff | 2026-02-21 | [REPORT_B_P2-02.md](reports/REPORT_B_P2-02.md) |
| Agent B | P2-04 | Кабинет педагога v1 | 2026-02-21 | [REPORT_B_P2-04.md](reports/REPORT_B_P2-04.md) |
| Agent C | P1-07 | Rate limits + safety-фильтры чата | 2026-02-21 | [REPORT_C_P1-07.md](reports/REPORT_C_P1-07.md) |
| Agent C | P1-08 | Единый контур чата через backend | 2026-02-21 | [REPORT_C_P1-08.md](reports/REPORT_C_P1-08.md) |
| Agent C | P2-03 | Совет Лагеря — инициативы | 2026-02-21 | [REPORT_C_P2-03.md](reports/REPORT_C_P2-03.md) |

---

## Зависимости (граф)

```
P1-01 ──► P1-02 ──► P1-03 ──► P1-09
                               ▲
P1-04 ──────────────────────────┤
P1-05 (depends P1-06) ──────────┤
P1-06 ──► P1-05, P1-08 ─────────┘
P1-07 (независимо)
P1-08 (depends P1-06) ──► P1-09
P1-10 (независимо, параллельно)

P2-01 (depends P1-06) ──► P2-02, P2-04
P2-03 (depends P1-01)
```
