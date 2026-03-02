# TASK: M14-PARENT-AUTH-A — Родитель: email логин + маршруты

**Агент: A (Data/Backend)**  
**Base:** `main @ ff4878e`  
**Branch:** `agent-a/m14-parent-auth`

## Контекст

Из видения: «Родители должны иметь возможность логиниться через email (Google, Яндекс), предлагать маршруты развития своих детей, бронировать путёвки.»

Текущее: роль `parent` есть, parent_code/QR работает, read-only витрина.

## Scope

### 1. Magic Link Email Auth

Простой flow (без OAuth для MVP):
- POST `/api/auth/email/request` → отправить magic link на email (через Supabase Auth или простой token)
- GET `/api/auth/email/verify?token=xxx` → вернуть JWT с role=parent

Для MVP: stub endpoint, который возвращает JWT по email без реальной отправки (dev mode). В production → интеграция с Supabase Auth.

### 2. Parent → Child маршруты

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| POST | `/api/parent/suggest-route` | parent | Предложить маршрут (набор значков) |
| GET | `/api/parent/suggestions/<childDeviceId>` | parent+staff | Список предложений |

Модель: `{parentId, childDeviceId, badges[], note, status: 'suggested'|'reviewed'}`

### 3. Бронирование путёвок (CTA stub)

Endpoint не нужен — это будет внешняя ссылка на сайт лагеря. В UI добавим CTA кнопку.

### 4. Smoke Flow W (2 checks)
- `W-1`: POST auth/email/request → 200
- `W-2`: POST parent/suggest-route → 201

## DoD
- [ ] Email auth stub + parent routes API + Flow W
