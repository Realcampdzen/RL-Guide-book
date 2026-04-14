# M3 Read-Models Mini Spec (stabilization baseline)

Single source for lightweight M3 read-model contracts and fallback behavior.

## 1) Council initiatives read-model
Endpoint: `GET /api/council/initiatives`

Returned list item keeps legacy fields and adds non-breaking normalized fields:
- `createdAt` (fallback from legacy `created_at`)
- `readStatus` normalized lifecycle status

Unified lifecycle:
`new -> reviewing -> accepted|rejected|done`

Legacy status mapper:
- `idea|draft -> new`
- `discussion|in_review|under_review -> reviewing`
- `approved|accepted_v1 -> accepted`
- `declined|denied -> rejected`
- `implemented|completed -> done`
- unknown -> `new`

Sorting default: by freshness (newest first).

## 2) Squad Corner readiness read-model (FE)
Source of truth util: `src/utils/squadCornerReadiness.ts`

Readiness values:
- `empty` — no valid text and no valid photo
- `partial` — some valid data exists but not enough for ready
- `ready` — at least 2 text fields + at least 1 valid photo

Normalization:
- trim strings
- ignore null/empty/non-string
- photo valid only for `data:` or `http`

## 3) Badge Flow read baseline (current compatibility path)
Current stable read path for badge approvals:
- `GET /api/badges/requests/mine`
- `GET /api/badges/requests/inbox`

Stability rule:
- additive-only response changes,
- no breaking field removals/renames,
- fallback-safe handling of missing optional fields in UI.
