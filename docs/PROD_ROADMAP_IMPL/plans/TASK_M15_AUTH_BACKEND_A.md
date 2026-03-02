# TASK: M15-AUTH-BACKEND-A — Supabase Auth: серверная интеграция

**Агент: A (Data/Backend)**  
**Base:** `main @ fe78075`  
**Branch:** `agent-a/m15-auth`

## Контекст

Переход с device_id на Supabase Auth (OAuth). Текущее: device_id (UUID в localStorage) + codes. Новое: Google/Яндекс/VK ID OAuth + Magic Link + таблица users + обратная совместимость.

## Scope

### 1. Migration `014_users.sql`

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_id UUID UNIQUE,
  legacy_device_id TEXT,
  email TEXT,
  nickname TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'participant'
    CHECK (role IN ('participant','counselor','educator','shift_leader','camp_director','parent','developer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_auth ON users(supabase_auth_id);
CREATE INDEX IF NOT EXISTS idx_users_device ON users(legacy_device_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 2. Auth Middleware

В `app.py` создать `resolve_user(request)`:
- Если есть header `Authorization: Bearer <JWT>` → декодировать Supabase JWT → найти user по `supabase_auth_id`
- Если есть header `X-Device-Id` → найти user по `legacy_device_id`
- Если user не найден → auto-create (для миграции)
- Возвращает: `{id, email, role, nickname, avatar_url}`

Все существующие endpoints: добавить `user = resolve_user(request)` вместо прямого `device_id`.

### 3. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/link-device` | Привязать device_id к Supabase user (для миграции) |
| GET | `/api/auth/me` | Текущий профиль + роль + permissions |
| PATCH | `/api/auth/me` | Обновить nickname/avatar |

### 4. OAuth Providers Config

В Supabase Dashboard (ручная настройка):
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Яндекс: Custom OIDC → `https://oauth.yandex.ru`
- VK ID: OAuth 2.1 + PKCE → `https://id.vk.com/authorize`

Документировать все переменные окружения в `docs/AUTH_SETUP.md`.

### 5. Smoke Flow Z (3 checks)
- `Z-1`: GET /api/auth/me with device_id → 200 + auto-created user
- `Z-2`: POST /api/auth/link-device → 200
- `Z-3`: GET /api/auth/me with JWT → 200 + same user

## DoD
- [ ] Migration 014 + resolve_user middleware + 3 endpoints + Flow Z
- [ ] `docs/AUTH_SETUP.md` with OAuth config instructions
- [ ] Backwards compatible: all old endpoints still work with device_id
