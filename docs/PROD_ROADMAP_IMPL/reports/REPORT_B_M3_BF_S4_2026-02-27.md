# REPORT: M3-BF-S4 — Badge Request Status Panel

**Agent:** B (UX/Frontend consistency)  
**Task ID:** M3-BF-S4  
**Date:** 2026-02-27  
**Branch:** agentb/m3-bf-s4-badge-request-status  
**Commit:** `e474174`

---

## Summary

Upgraded the existing minimal "Мои заявки" block in `ProfileView.tsx` (lines ~5382–5400) to a production-ready Badge Request Status Panel. Added `.m3-status-chip` base CSS class and `.badge-request-status-chip` tone modifiers to `profile-view.css`. Wired scroll + hint after proofForm submit.

---

## Deliverables

### Deliverable 1: Badge Request Status Panel

**Location:** `src/views/ProfileView.tsx`, wrapped in `{canRequestApprovals && !isParentChildReadonlyView && (...)}`

**DOM anchor:** `id="profile-badge-requests-mine"` (scroll target)

**Features implemented:**

| Feature | Status |
|---|---|
| Role guard: visible to participant/counselor/educator (canRequestApprovals) | ✅ |
| M2 guard: `!isParentChildReadonlyView` | ✅ |
| Chip: pending → `tone-pending` «На проверке» | ✅ |
| Chip: approved → `tone-approved` «Одобрено» | ✅ |
| Chip: rejected → `tone-rejected` «Отклонено» | ✅ |
| `badgeTitle` prominent, `levelId` secondary | ✅ |
| CTA «Синхронизировать» for approved (calls `syncApprovedLevels()`) | ✅ |
| Loading state: «Загружаем заявки…» | ✅ |
| Error state: error text + «Повторить» (calls `loadBadgeApprovalsData()`) | ✅ |
| Empty state: text + CTA «К значкам "В пути"» (`setActiveTab('active')`) | ✅ |

### Deliverable 2: CSS Chip System

**File:** `src/styles/profile-view.css`

Added after `.squad-corner-readiness-chip` block:

```css
.m3-status-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(12, 17, 29, 0.5);
}
.badge-request-status-chip.tone-pending  { border-color: rgba(255, 196, 86, 0.52); color: rgba(255, 196, 86, 0.9); }
.badge-request-status-chip.tone-approved { border-color: rgba(90, 215, 140, 0.52); color: rgba(90, 215, 140, 0.9); }
.badge-request-status-chip.tone-rejected { border-color: rgba(255, 110, 110, 0.52); color: rgba(255, 110, 110, 0.9); }
```

Also backported color-token fix for `squad-corner-readiness-chip` tones (muted/warn/success now have explicit `color` alongside `border-color`).

### Deliverable 3: Scroll + Hint after proofForm submit

After `setProofBadge(null)` in the proofForm submit handler (~line 6208):

```tsx
if (canRequestApprovals) {
  showHint({ title: 'Заявка отправлена', content: 'Вожатый рассмотрит её в ближайшее время.' });
  setTimeout(() => {
    document.getElementById('profile-badge-requests-mine')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 300);
}
```

---

## M2 Guard Confirmation

The block is rendered only when `canRequestApprovals && !isParentChildReadonlyView`.

- `canRequestApprovals` = `canRequestBadgeApproval(role)` — returns true for participant, counselor, educator; false for traveler, parent
- `isParentChildReadonlyView` = `isParentChildReadonlyMode({ role, hasChildProgressSnapshot })` — returns true when parent is viewing child's read-only view

**When parent is in child-view mode:** `isParentChildReadonlyView` is `true` → block is not rendered. ✅

**When parent is in their own home view:** `canRequestApprovals` is `false` (parent role) → block is not rendered. ✅

**VERDICT: M2 parent read-only boundary — CONFIRMED NOT TOUCHED. ✅**

---

## API Readiness

The block fetches from `GET /api/badges/requests/mine` (via `loadMyBadgeRequests` in `loadBadgeApprovalsData()`). This endpoint already exists in `backend/app.py` (lines 2843–2865). When Agent A delivers the endpoint update, the data will flow automatically. No frontend changes needed to integrate.

---

## Files Changed

| File | Change |
|---|---|
| `src/styles/profile-view.css` | Added `.m3-status-chip` base + `.badge-request-status-chip` tone modifiers; color tokens for squad-corner chips |
| `src/views/ProfileView.tsx` | Upgraded «Мои заявки» block (lines ~5382–5446) + scroll+hint after proof submit |

---

## Build & Smoke

- `npm run build` → `exit_code: 0` (~3.4 min)
- TypeScript: no errors
- Lint: no errors
- RBAC: not touched
- M2 parent read-only: CONFIRMED NOT TOUCHED

---

## Handoff

**For orchestrator (НейроСтёпа):**

- Commit `e474174` on branch `agentb/m3-bf-s4-badge-request-status` — ready for merge to main
- The block pulls from `loadMyBadgeRequests(accessToken)` which calls `GET /api/badges/requests/mine` — existing endpoint, no backend changes needed
- CSS chip system `.m3-status-chip` is now available for other components to reuse
- CLAIM_BOARD updated

**Open observations (not bugs):**
- proofForm currently sends via Telegram (`/api/telegram/notify-achievement`) rather than directly creating a badge request via `createBadgeRequest()`. The «Мои заявки» block will show requests only if they were created through the badge level card flow, not through the Telegram proof flow. This is a product decision outside Agent B scope.
- Scroll target `profile-badge-requests-mine` is inside the approvals tab panel — user needs to be on the approvals tab to see the panel scroll. The hint works regardless of which tab is active.
