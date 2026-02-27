# Parent Insights Read Model (M4-PARENT-INSIGHTS-S1)

Endpoint: `GET /api/parent-insights?code=<parentLinkCode>`

Uses existing parent snapshot code context (no explicit `child_device_id` required).
Read-only response for parent view.

## Response shape
- `overallProgress`:
  - `percent` (0..100)
  - `stage` (`start|steady|high`)
  - `achieved`, `total`
- `weeklyTrend` (optional, additive):
  - `direction` (`up|flat|down`)
  - `note` (human-readable)
- `dynamicSignals` (optional, additive):
  - `windowDays`
  - `currentWindowAchievements`
  - `previousWindowAchievements`
- `whyThisSuggestion` (optional, additive): 1–2 sentence explanation
- `basedOn` (optional, additive): compact factors
  - `trend`
  - `strongestAreas` (titles only)
  - `weakestAreas` (titles only)
  - `activityWindow`
- `strengthsTop3` (up to 3 items)
- `nextSteps` (1..2 items)
- optional: `source`

## Formula (explainable)
1. Progress base:
   - `percent = achieved_levels / total_levels * 100`
   - `stage`: `high` (>=80), `steady` (>=40), else `start`.
2. `strengthsTop3`:
   - per-category score = `(achieved*2 + in_progress) / (total*2)`
   - top 3 categories by score.
3. `nextSteps`:
   - take 1–2 weakest categories by same score,
   - generate parent-friendly support hints (no mutation actions),
   - hint wording adapts to trend (`up|flat|down`) in rule-based mode.

## Weekly trend windows (reproducible)
- `current window`: last 7 days from now.
- `previous window`: 7 days before current window.
- Metric: count of `achievedAt` events in each window.
- Rule:
  - `up` when current > previous,
  - `down` when current < previous,
  - `flat` when equal or when history is insufficient (with human-friendly note).

## Fallback behavior
- Empty or partial data returns human-readable guidance text (not technical "no data").
- Unknown/legacy values handled safely; endpoint remains non-breaking.

## Explainability and tone
- `whyThisSuggestion` is intentionally short and stable for small fluctuations.
- `basedOn` is compact and safe: no PII, no internal ids.
- `activityWindow` is human-readable (e.g., "последние 7 дней и предыдущие 7 дней").
- Recommendation tone is supportive and non-judgmental for `up|flat|down` scenarios.
