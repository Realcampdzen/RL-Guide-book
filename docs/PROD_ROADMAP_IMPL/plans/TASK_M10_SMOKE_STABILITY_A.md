# TASK: M10-SMOKE-STABILITY-A — Smoke stability: Flow E fix + integration test

**Агент: A (Data/Backend)**  
**Base:** `main @ 73c0531`  
**Branch:** `agent-a/m10-smoke-stability`

## Scope

### 1. Fix Flow E timeout

В `backend/scripts/smoke_backend_critical.py`:
- Wrap Flow E в `try/except` с timeout guard
- При timeout → пометить как `SKIP (OpenAI timeout)` вместо `FAIL`
- Альтернатива: использовать `IMAGE_PROVIDER=stub` для smoke → Flow E проходит с placeholder

### 2. Integration smoke: new endpoints on prod

Добавить мини-flow для проверки всех новых endpoints в одном прогоне:
- Flow O (Integration, 5 checks):
  - `O-1`: POST badge plan → 201
  - `O-2`: POST council initiative → 201
  - `O-3`: POST badge art → 201
  - `O-4`: GET council initiatives → 200
  - `O-5`: GET badge arts → 200

### 3. Supabase provider для новых stores

Проверить что `SupabaseBadgePlansStore`, council и arts stores корректно работают с `USE_SUPABASE=true` (а не только JSON fallback).

## DoD
- [ ] Flow E не FAIL (skip или stub)
- [ ] Flow O → 5/5 pass
- [ ] Smoke 100% pass (≥ 77/77 или 76/76 без E)
