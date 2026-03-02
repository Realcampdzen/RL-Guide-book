# TASK: M17-E2E-SCENARIOS-A — E2E тестовые сценарии

**Агент: A (Data/Backend)**  
**Base:** `main @ 259713c`  
**Branch:** `agent-a/m17-e2e`

## Scope

### 1. Test Seeds

Создать `backend/scripts/seed_test_users.py`:
- Создаёт тестовых пользователей в users table:
  - `test-participant-01` → role=participant
  - `test-counselor-01` → role=counselor
  - `test-educator-01` → role=educator
  - `test-parent-01` → role=parent
- Каждый с уникальным device_id и email

### 2. E2E Flow Y (полный путь участника)

В `smoke_backend_critical.py` добавить Flow Y:
```
Y-1: GET /api/auth/me → user auto-created (participant)
Y-2: POST /api/shifts → create shift
Y-3: POST /api/squads → create squad in shift
Y-4: POST /api/squads/<id>/join → join squad
Y-5: POST /api/squads/<id>/engines → create engine (pending)
Y-6: GET /api/admin/inbox → engine_approve appears
Y-7: POST /api/admin/action (approve engine) → 200
Y-8: POST /api/council-initiatives → submit initiative
Y-9: POST /api/admin/action (approve initiative) → 200
Y-10: GET /api/4k/stats/<deviceId> → has scores
```

### 3. Flow Cleanup

- Каждый flow Y run → cleanup test data after (optional, для dev env)
- Флаг `--full-e2e` для запуска только Flow Y

## DoD
- [ ] seed_test_users.py
- [ ] Flow Y (10 checks) — полный путь
- [ ] `python smoke_backend_critical.py` passes all
