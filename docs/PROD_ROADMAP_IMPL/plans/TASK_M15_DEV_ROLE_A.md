# TASK: M15-DEV-ROLE-A — Dev superuser + role switch API

**Агент: A (Data/Backend)**  
**Base:** `main @ fe78075`  
**Branch:** `agent-a/m15-dev-role`

## Scope

### 1. Dev Email Whitelist

Env: `DEV_EMAILS=stepa@gmail.com,test-dev@example.com` (comma-separated)

В `resolve_user()`: если `user.email` in DEV_EMAILS → `user.role = 'developer'`.

Developer role = все RBAC проверки пропускаются (всё разрешено).

### 2. API Endpoints

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| POST | `/api/dev/switch-role` | developer only | Временно переключить роль |
| GET | `/api/dev/users` | developer only | Список всех юзеров |
| PATCH | `/api/dev/users/<id>/role` | developer only | Изменить роль юзера |

`switch-role`: сохраняет override role в session/header. Позволяет видеть приложение глазами другой роли. Объект ответа: `{original_role, current_role}`.

### 3. Permissions Map

GET `/api/auth/me` возвращает permissions:
```json
{
  "role": "developer",
  "permissions": {
    "can_approve_badges": true,
    "can_manage_squads": true,
    "can_moderate_arts": true,
    "can_view_dashboard": true,
    "can_switch_role": true,
    "can_manage_users": true
  }
}
```

Permissions map по ролям:
- participant: can_submit
- counselor: +can_approve, +can_manage_squad
- educator: +can_manage_workshop
- shift_leader: +can_manage_shifts, +can_approve_all
- camp_director: +can_view_overview
- parent: can_view_child, can_suggest_route
- developer: ALL

### 4. Smoke
- Добавить в существующий Flow Z: Z-4 switch-role → 200

## DoD
- [ ] DEV_EMAILS whitelist + auto-assign developer role
- [ ] 3 dev API endpoints
- [ ] Permissions map in /api/auth/me
