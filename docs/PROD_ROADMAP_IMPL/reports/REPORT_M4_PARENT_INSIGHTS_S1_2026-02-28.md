# REPORT — M4-PARENT-INSIGHTS-S1

## Delivered
1. Parent Insights read-model endpoint (read-only)
2. Parent UI block "Рекомендации для родителя"
3. Compatibility guardrails preserved (M2 read-only / no RBAC / no migrations)

## Backend
File: `backend/app.py`
- Added `GET /api/parent-insights?code=...`
- Uses existing parent snapshot code context (no `child_device_id` input required)
- Added `_compute_parent_insights(progress)` with explainable formulas

### Explainable formula
- `overallProgress.percent = achieved_levels / total_levels * 100`
- stage: `high` >= 80, `steady` >= 40, else `start`
- `strengthsTop3`: top 3 categories by score
  - `score = (achieved*2 + in_progress) / (total*2)`
- `nextSteps`: 1–2 weakest categories by same score with human-readable support hints

## Frontend
File: `src/views/ProfileView.tsx`
- Added parent insights loading state for parent child-view
- Pulls insights by existing snapshot code context when available
- Added block:
  - "Что уже хорошо"
  - "Что поддержать дальше"
- Strictly read-only (no mutation CTA)
- Human-friendly fallback text when complete insights unavailable

## Docs
- `docs/PARENT_INSIGHTS_READ_MODEL.md`

## Smoke summary
- participant: no regressions in profile flows ✅
- parent: insights block renders stable, read-only preserved ✅
- staff: unaffected by changes ✅

## Validation
- `python -m py_compile backend/app.py` ✅
- `npm run build` ✅

## Out-of-scope compliance
- RBAC changes: none
- DB migrations: none
- write-flow changes: none
- profile redesign: none
