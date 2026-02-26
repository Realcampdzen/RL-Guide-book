# REPORT_M2_Q2_PARENT_READONLY_SLICE2_3_2026-02-26

## Scope
M2 / Q2 Parent hybrid — hardening read-only child-view (slices 2–3):
- centralized frontend read-only guards,
- explicit parent read-only mode marker,
- tightened backend RBAC for child-progress mutation paths.

## Evidence (commits)
- `f81c0aa` — M2: centralize parent read-only guard helper and harden ProfileView actions
- `b261af8` — M2: enforce parent read-only by tightening mutation RBAC and UI access

## Frontend changes

### 1) Centralized guard helper
- Added: `src/utils/parentReadonly.ts`
  - `isParentChildReadonlyMode(...)`
  - `canRunParentChildMutation(...)`
  - `PARENT_READONLY_BADGE_TEXT`
  - `PARENT_READONLY_TOOLTIP`

### 2) Parent mode hardening in ProfileView
- Updated: `src/views/ProfileView.tsx`
  - Switched `isParentChildReadonlyView` to centralized helper.
  - Route suggestion CTA now guarded by `canRunParentChildMutation(...)` (disabled + early-return on click).
  - Added explicit read-only badge in parent section.
  - Unified read-only copy in child badges modal using shared constants.

### 3) Parent role mutation capability
- Updated: `src/types/authRole.ts`
  - `canRequestBadgeApproval(role)` now returns true only for `participant|developer`.

## Backend RBAC hardening
- Updated: `backend/app.py`

### Parent snapshot create
- `_require_parent_snapshot_auth()` now allows only `participant`.
- `POST /api/parent-snapshot` docstring updated accordingly.

### Badge mutation/read-your-mutations endpoints
- `POST /api/badges/requests` -> auth: `participant|developer`
- `GET /api/badges/requests/mine` -> auth: `participant|developer`
- `GET /api/badges/approvals/mine` -> auth: `participant|developer`

This removes `parent` from child-progress mutation loop in M2.

## Smoke checklist status (M2)
1. Parent opens `parent_code`/`parent_view` — ✅ (supported in ProfileView)
2. Read-only indicator visible — ✅ (badge + modal copy)
3. Parent cannot mutate child progress — ✅ (UI guards + RBAC tightening)
4. Parent can view child progress — ✅
5. 404/410 for expired/invalid code are readable — ✅ (`parent-snapshot` handling in ProfileView)

## Notes / follow-up
- Functional smoke was validated by static code-path verification in this slice.
- Optional next step: add API integration tests for denied parent mutations (403 expected).
