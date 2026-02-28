# Ops Snapshot — M5 GO (TAILS_RECONCILE_D)

**Date:** 2026-02-27  
**Verdict:** GO  
**LKG:** `a008797`

Компактный pre-release операционный чеклист. Всё перечисленное должно быть зелёным перед релиз-катом.

---

## 1) Gateway checks (must be green)

| Gate | How to verify | Expected result |
|---|---|---|
| Backend liveness | `GET https://backend-murex-one-40.vercel.app/api/health` | `{"status":"ok"}` 200 |
| Dev-door closed | `POST /api/dev/login` | 404 (production guard active) |
| Auth flow | generate-code → verify-code → JWT decode | JWT с корректным `role`, `deviceId` |
| Participant RBAC | `GET /api/badge-requests/inbox` без токена | 401 |
| Organizer RBAC | `GET /api/shifts` без токена | 401 |
| Chat RBAC | `POST /api/chat` с `traveler` JWT | 403 |
| Rate limit (squad msg) | POST squad message > limit/min | 429 |
| Safety filter | POST squad message с URL | 400 |

---

## 2) Runtime checks (build + assets)

| Check | Status | Evidence |
|---|---|---|
| `npm run build` | ✅ pass | M5-R1, R1.1, R1.2 |
| Unresolved runtime-path warnings | ✅ 0 | `REPORT_M5_R1_2_RUNTIME_WARNINGS_2026-02-28.md` |
| Critical CSS assets present in `public/RL-Guide-book/` | ✅ verified | R1.2 closure table (8 assets) |
| `python -m py_compile backend/app.py` | ✅ pass | M5-R1, R1.1 |

---

## 3) Environment / secrets checklist

**Last audit:** 2026-02-28 (M6-VERCEL-LOBSTERS — lobster tokens added to Vercel Production)  
**Method:** observable side effects (read-only probes) + local .env inspection confirming key presence. No prod secrets recorded in this document. Legend: `VERIFIED` = confirmed set and functional. `VERIFIED_OPTIONAL` = key confirmed present and non-default; not smoke-tested end-to-end; not required for core flows.

| Var | Scope | Required | Policy | Status (M5-R4-D final) | Evidence basis |
|---|---|---|---|---|---|
| `USE_SUPABASE` | backend (Vercel env) | `true` | Must be `true` in production | **VERIFIED** | CLAIM_BOARD (2026-02-21): "USE_SUPABASE=true" explicit in DEPLOY entry |
| `SUPABASE_URL` | backend | yes | Service-side only, never frontend | **VERIFIED** | CLAIM_BOARD: Supabase instance `inkhtjcrzblzsfqvceid` confirmed active; migrations applied |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | yes | Service-side only, never frontend | **VERIFIED** | Badge request flow A smoke (2026-02-21): DB write/read cycle confirmed. .env: key present, valid JWT format (service_role). |
| `AUTH_SECRET` | backend | yes | HMAC for unlock codes | **VERIFIED** | CLAIM_BOARD smoke (2026-02-21): generate-code → verify-code flow passed; HMAC round-trip confirmed |
| `AUTH_JWT_SECRET` | backend | yes | JWT signing | **VERIFIED** | RBAC gates: 401 on protected endpoints without token; JWT auth working in smoke |
| `ENVIRONMENT` | backend | `production` | Enables dev-door guard | **VERIFIED** | `POST /api/dev/login` → 404 (M5-R3-D probe); dev-door guard active |
| `CHAT_MESSAGES_PER_DAY` | backend | yes | Daily AI chat quota | **VERIFIED** | `GET /api/chat/limits` → `{"messagesPerDay":20}` HTTP 200 (M5-R4-D probe, 2026-02-27). Value=20. |
| `TELEGRAM_BOT_TOKEN` | backend | optional | Required for webhook/notifications | **VERIFIED_OPTIONAL** | .env inspection (M5-R4-D): token present, non-default, real bot ID format confirmed. Endpoint `POST /api/telegram/thread-post` exists (a4c3b2f). Not smoke-tested end-to-end. |
| `TELEGRAM_CHANNEL_ID` | backend | optional | Required for notifications | **VERIFIED_OPTIONAL** | .env inspection (M5-R4-D): channel ID present (non-default numeric ID), confirmed in ops context. |
| `VITE_BACKEND_URL` | GitHub Variable (frontend build) | yes | Set to `https://backend-murex-one-40.vercel.app` | **VERIFIED** | CLAIM_BOARD DEPLOY entry: "VITE_BACKEND_URL в GitHub Variable"; frontend builds confirmed |

| `NEURO_STEPA_BOT_TOKEN` | backend | optional | Lobster orchestrator bot token | **VERIFIED_OPTIONAL** | M6-VERCEL-LOBSTERS (2026-02-28): added to Vercel Production (ID: EHHkQrok1aX5tdxO), redeploy READY. Smoke I-1: 401 ✅ confirms auth guard active. |
| `CAT_BRO_BOT_TOKEN` | backend | optional | Lobster SMM/content bot token | **VERIFIED_OPTIONAL** | M6-VERCEL-LOBSTERS (2026-02-28): added to Vercel Production (ID: mibVmKMsHcJn23eU), redeploy READY. |
| `DEV_BRO_1_BOT_TOKEN` | backend | optional | Lobster developer bot token | **VERIFIED_OPTIONAL** | M6-VERCEL-LOBSTERS (2026-02-28): added to Vercel Production (ID: AHfNaf4pDynHsLBA), redeploy READY. |

**Summary (M6-VERCEL-LOBSTERS):** All critical env vars (7/7) **VERIFIED**. Telegram env vars (2/2) **VERIFIED_OPTIONAL**. Lobster bot tokens (3/3) **VERIFIED_OPTIONAL** — added to Vercel Production (2026-02-28), redeploy READY, smoke I-1 401 confirmed.

## 4) DB / migrations evidence

| Migration | File | Applied to | Status |
|---|---|---|---|
| 001: schema v1 (9 tables) | `backend/migrations/001_schema_v1.sql` | `inkhtjcrzblzsfqvceid` | ✅ applied |
| 002: council_initiatives | `backend/migrations/002_council_initiatives.sql` | `inkhtjcrzblzsfqvceid` | ✅ applied |

No new migrations in M3/M4/M5 tracks. Schema is stable.

Reference: `docs/SUPABASE_SCHEMA_AND_MIGRATION.md`

---

## 5) Role smoke matrix (pre-release drill, <30 min)

| Role | Scenario | Expected |
|---|---|---|
| participant | unlock → join squad → badge "В путь" → submit proof | proof in inbox, badge status chip correct |
| participant | open Council initiatives list | list renders, status chips visible, filters work |
| participant | open Squad Corner | readiness chip renders (empty/partial/ready) |
| parent | open child-view via parent_code | read-only mode, no mutation CTA, insights block visible |
| parent | insights block | progress / trend / recommendations / explainability visible, fallback texts human-readable |
| counselor | open approvals inbox | badge requests visible with status filter |
| shift_leader | create shift, create squad | shift appears in list, squad joinable |

---

## 6) Known-risk watchlist (at release cut)

**Updated:** 2026-02-27 (M5-R3-D)

| # | Risk | Status | Action |
|---|---|---|---|
| R5 | Thread-transport (`backend/app.py` — KOT_THREAD_TRANSPORT_FIX_V1.1) | ✅ resolved | Committed by Agent C in `a4c3b2f` (TAILS_RECONCILE_C). Backward-compat confirmed. |
| R1 | Parent read-only leakage | ✅ controlled | Verify no new CTA in parent child-view. |
| R2 | Optional read-model fields | ✅ controlled | Defensive rendering in place. |
| R3 | Status wording drift | ✅ controlled | Wording harmonized in M5-KICKOFF. |
| R4 | Sparse data fallback | ✅ controlled | Human-readable fallbacks confirmed. |

---

## 7) Rollback readiness

| Item | Status |
|---|---|
| LKG documented | ✅ `a008797` (GO), `78f8bd5` (stable R1 anchor) |
| Rollback procedure | ✅ `docs/RELEASE_NOTE_M5_FINAL.md §Rollback` |
| Smoke gates rerunnable | ✅ <30 min (see §5 above) |
| DB migration rollback needed | ✅ no (M5 has no migrations) |
| Vercel fast rollback available | ✅ yes (promote previous deployment) |

---

## 8) Incident escalation path

1. 5xx burst or service down → `docs/CAMP_RUNBOOK.md §6.3`
2. Auth/RBAC anomaly (401/403 spike) → `docs/CAMP_RUNBOOK.md §6.1–6.2`
3. Parent read-only invariant violation → immediate NEEDS_REVIEW → НейроСтёпа
4. Any M2 guard regression → release-blocking → freeze + escalate
