# Council Initiative Status Model (M3-CN-S1)

Unified lifecycle:
`new -> reviewing -> accepted|rejected|done`

## Legacy mapper (required)
Old statuses are normalized as:
- `idea`, `draft` -> `new`
- `discussion`, `in_review`, `under_review` -> `reviewing`
- `approved`, `accepted_v1` -> `accepted`
- `declined`, `denied` -> `rejected`
- `implemented`, `completed` -> `done`
- unknown -> `new`

## Read-model
`GET /api/council/initiatives` adds non-breaking fields:
- `createdAt` fallback from `created_at`
- `readStatus` normalized status for UI

Default behavior unchanged: list sorted by freshness (newest first).
