# TASK: M17-SMOKE-REBASE-A — Rebase smoke tests на Auth

**Агент: A (Data/Backend)**  
**Base:** `main @ 259713c`  
**Branch:** `agent-a/m17-smoke-rebase`

## Scope

### 1. Test Token Utility

Создать `backend/scripts/test_auth.py`:
```python
def get_test_token(role='participant'):
    """Generate JWT-like auth headers for smoke tests."""
    # For JSON provider: use X-Device-Id with auto-created user
    # For Supabase: use service role key to create test JWT
    ...
```

### 2. Smoke Headers Update

В `smoke_backend_critical.py`:
- Заменить прямой `X-Device-Id` на `get_test_headers(role)` во всех flows
- `get_test_headers(role)` возвращает:
  - `X-Device-Id: smoke_test_{role}_{uuid}` (для совместимости)
  - В будущем: `Authorization: Bearer {token}`

### 3. RBAC Verification

Добавить Flow AB (RBAC checks):
- `AB-1`: participant cannot POST /api/admin/action → 403
- `AB-2`: counselor can approve badge_request → 200
- `AB-3`: developer can access /api/dev/users → 200
- `AB-4`: parent cannot access /api/admin/inbox → 403

### 4. Smoke Summary

После rebase все flows должны проходить:
- Flows A-Z + AA-AB + Y = ~100+ checks total
- Вывод summary: `ALL {N} CHECKS PASSED`

## DoD
- [ ] test_auth.py utility
- [ ] All existing flows use get_test_headers()
- [ ] Flow AB (RBAC, 4 checks)
- [ ] All smoke checks pass
