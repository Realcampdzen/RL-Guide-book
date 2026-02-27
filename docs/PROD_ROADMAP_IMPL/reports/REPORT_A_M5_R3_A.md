# REPORT — M5-R3-A: Badge Requests Cleanup + Teams Smoke Flow

**Agent:** A (Data/Backend contracts)  
**Task ID:** M5-R3-A  
**Date:** 2026-02-27  
**Branch:** agentb/m5-stab-s5-auto-sync (current working branch)  
**Status:** ✅ DONE

---

## Summary

Implemented badge request inbox TTL filtering and a cleanup endpoint, added Teams lifecycle smoke coverage (Flow F). All 39 smoke checks pass.

---

## Deliverables

### Deliverable 1 — Badge Requests Inbox TTL Filter

**File:** `backend/app.py`

**Changes:**
- Added env constant at module level:
  ```python
  BADGE_REQUESTS_RESOLVED_TTL_DAYS = int(os.getenv("BADGE_REQUESTS_RESOLVED_TTL_DAYS", "30"))
  ```
- Added `includeResolved` query parameter to `GET /api/badges/requests/inbox`:
  - `includeResolved=false` (default): resolved requests older than `BADGE_REQUESTS_RESOLVED_TTL_DAYS` days are excluded from response
  - `includeResolved=true|1|yes`: all resolved requests returned regardless of TTL
  - Pending requests are **never** filtered by TTL
- Non-breaking: existing clients not passing `includeResolved` get pending + fresh resolved (< 30 days old) — same functionally as before in practice

**Contract:** inbox `includeResolved` param added to §3.1 of `BACKEND_CONTRACT_GUARD.md`

---

### Deliverable 2 — Badge Requests Cleanup Endpoint

**File:** `backend/app.py`

**New route:** `POST /api/badges/requests/cleanup`

**Spec:**
- Auth: `shift_leader | developer` (Bearer JWT)
- Body: `{ "olderThanDays": N }` — optional, default = `BADGE_REQUESTS_RESOLVED_TTL_DAYS`
- Response: `{ "deleted": N }`
- Deletes `approved`/`rejected` requests older than N days from `badge_requests.json`
- Logs: `[BADGE_CLEANUP] deleted=N actor=<sha256[:12]> ts=<ISO8601>`
- Validation: `olderThanDays` must be int ≥ 0

**Contract:** new cleanup endpoint added to §3.1 of `BACKEND_CONTRACT_GUARD.md`

---

### Deliverable 3 — Smoke Flow F (Teams Lifecycle)

**File:** `backend/scripts/smoke_backend_critical.py`

**Added:** `run_flow_f()` method — 8 checks (including 2 auth-verify-code):

| Check | Description |
|-------|-------------|
| auth/verify-code (leader) | HMAC code → JWT for leader participant |
| auth/verify-code (joiner) | HMAC code → JWT for joiner participant |
| F1 | POST /api/teams → 201, id present |
| F2 | GET /api/teams/<id> → 200, name matches |
| F3 | POST /api/teams/<id>/join (joiner) → 200, joiner in members |
| F4 | GET /api/teams/mine (leader) → 200, team id matches |
| F5 | POST /api/teams/<id>/leave (joiner) → 200, status=success |
| F6 | POST /api/teams/<id>/leave (leader, last member) → 200, status=success |

Flow F is called in `run()` after Flow E.

---

## Smoke Output (39/39 PASS)

```
Smoke backend critical flows — http://127.0.0.1:4000
============================================================

[Health]
  PASS  /api/health status

[Flow A] Badge Request: request -> inbox -> approve -> mine
  PASS  auth/verify-code (participant)
  PASS  auth/verify-code (shift_leader)
  PASS  POST /api/badges/requests — id present
  PASS  POST /api/badges/requests — status=pending
  PASS  GET /api/badges/requests/inbox — request present
  PASS  POST approve — status=approved
  PASS  POST approve — resolvedAt present
  PASS  GET /api/badges/requests/mine — request found
  PASS  GET /api/badges/requests/mine — status=approved

[Flow B] Parent Snapshot: create -> read by code -> invalid 404
  PASS  auth/verify-code (participant)
  PASS  POST /api/parent-snapshot — parentLinkCode present
  PASS  GET /api/parent-snapshot — progress present
  PASS  GET /api/parent-snapshot — exportedAt present
  PASS  GET /api/parent-snapshot — progress has entries
  PASS  GET /api/parent-snapshot?code=INVALID — 404

[Flow C] Council Initiatives: create -> list
  PASS  auth/verify-code (shift_leader)
  PASS  POST /api/council/initiatives — id present
  PASS  POST /api/council/initiatives — status=idea
  PASS  POST /api/council/initiatives — title matches
  PASS  GET /api/council/initiatives — list returned
  PASS  GET /api/council/initiatives — new initiative found in list

[Flow D] Mine endpoint: privacy + contract checks
  PASS  GET /api/badges/requests/mine — requests is list
  PASS  GET /api/badges/requests/mine — approved request found
  PASS  GET /api/badges/requests/mine — status=approved
  PASS  GET /api/badges/requests/mine — requestedBy.deviceId absent (privacy)

[Flow E] Image Generation: happy path, prompt truncation, missing fields
  PASS  auth/verify-code (participant)
  PASS  POST /api/images/generate — E-1: 503 (OpenAI not configured, acceptable)
  PASS  POST /api/images/generate — E-2: long prompt not 500
  PASS  POST /api/images/generate — E-3: missing mode -> 400
  PASS  POST /api/images/generate — E-4: missing context -> 400

[Flow F] Teams lifecycle: create -> get -> join -> mine -> leave
  PASS  auth/verify-code (participant)
  PASS  auth/verify-code (participant)
  PASS  POST /api/teams — id present
  PASS  GET /api/teams/<id> — name matches
  PASS  POST /api/teams/<id>/join — joiner in members
  PASS  GET /api/teams/mine — team id matches
  PASS  POST /api/teams/<id>/leave (joiner) — status=success
  PASS  POST /api/teams/<id>/leave (leader/last) — status=success

============================================================
RESULT: ALL 39 CHECKS PASSED
```

---

## Files Changed

| File | Change |
|------|--------|
| `backend/app.py` | `BADGE_REQUESTS_RESOLVED_TTL_DAYS` env const; `GET /api/badges/requests/inbox` — `includeResolved` param + TTL filter + educator auto-scope (M5-R2-B backport); `GET /api/badges/requests/mine` — `_project_mine_row` privacy + expanded roles (M5-R2-B backport); `POST /api/badges/requests/cleanup` — new cleanup endpoint |
| `backend/scripts/smoke_backend_critical.py` | Flow F (Teams lifecycle, 8 checks), updated docstring + warning |
| `docs/BACKEND_CONTRACT_GUARD.md` | Inbox `includeResolved` param + TTL description, cleanup endpoint §3.1, Flow F in smoke table (39 checks total) |
| `docs/PROD_ROADMAP_IMPL/CLAIM_BOARD.md` | M5-R3-A entry ✅ done |
| `docs/ROADMAP_2026.md` | M5-R3-A entry in Status Sync Log |
| `docs/PROD_ROADMAP_IMPL/reports/REPORT_A_M5_R3_A.md` | This file |

---

## Notes

- **Branch context:** This branch (`agentb/m5-stab-s5-auto-sync`) diverged from `master` before M5-R2-B landed in the other branch (`agentb/m3-bf-s4-badge-request-status`). Therefore M5-R2-B changes (`_project_mine_row`, mine expanded roles, inbox educator auto-scope) were re-applied here to maintain consistency.
- **Smoke total went from 31 → 39** (not 37 as planned): Flow F introduced 8 checks because two auth-verify-code calls (leader + joiner) are counted explicitly, providing clearer diagnostic output.
- **No RBAC changes.** No migrations. No structural changes to `badge_requests.json`. Additive contract only.

---

## Handoff

- **Next Agent A task:** awaiting orchestrator direction
- **Contract guard:** `docs/BACKEND_CONTRACT_GUARD.md` fully up to date
- **Smoke baseline:** 39 checks — reference for regression testing going forward
