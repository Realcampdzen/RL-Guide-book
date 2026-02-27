# REPORT — M4-PARENT-INSIGHTS-S2

## Delivered
1. Rule-based dynamic personalization for parent recommendations (no ML)
2. Weekly trend in read-model + parent UI indicator
3. Strict read-only mode preserved

## Backend
File: `backend/app.py`

### Non-breaking read-model extension
`GET /api/parent-insights?code=...` now includes optional/additive fields:
- `weeklyTrend`: `{ direction: up|flat|down, note }`
- `dynamicSignals`: `{ windowDays, currentWindowAchievements, previousWindowAchievements }`

### Trend windows (explicit)
- Current window: last 7 days
- Previous window: prior 7 days
- Metric: number of `achievedAt` events
- Rule:
  - `up` if current > previous
  - `down` if current < previous
  - `flat` if equal
  - fallback with insufficient history: `flat` + human-readable guidance

### Dynamic recommendations (rule-based)
`nextSteps` text is adapted by trend:
- `up`: reinforce current momentum
- `flat`: suggest consistent weekly routine
- `down`: suggest low-pressure recovery step

## Frontend
File: `src/views/ProfileView.tsx`
- Parent child-view now shows weekly trend indicator + explanation text.
- Recommendations block remains read-only (no mutation CTA).
- Human-readable fallback maintained.

## Docs
- Updated: `docs/PARENT_INSIGHTS_READ_MODEL.md`
  - optional fields
  - comparison windows
  - trend criteria

## Smoke summary
- participant: no regressions ✅
- parent: trend + dynamic recommendations visible; read-only preserved ✅
- staff: unaffected ✅

## Validation
- `python -m py_compile backend/app.py` ✅
- `npm run build` ✅

## Guardrails
- M2 read-only guard: untouched
- RBAC changes: none
- DB migrations: none
- breaking contract changes: none
