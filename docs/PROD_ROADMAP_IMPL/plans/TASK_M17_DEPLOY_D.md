# TASK: M17-DEPLOY-D — Deploy миграций 007-014 + Auth настройка

**Агент: D (Ops — ты, Stepa)**  
**Base:** `main @ 259713c`

## Scope

### 1. Supabase: миграции 007-014

Применить в SQL Editor последовательно:
1. `007_engines.sql` — engines + engine_members
2. `008_inspector.sql` — inspector_progress
3. `009_bro.sql` — bro_events + bro_passports + engines.type
4. `010_shift_schedule.sql` — shift_schedule_events
5. `011_workshops.sql` — workshops + 3 related tables
6. `012_director_proposal.sql` — council_initiatives.proposal_type
7. `013_parent_suggestions.sql` — parent_suggestions
8. `014_users.sql` — users table

### 2. Supabase Auth: OAuth провайдеры

В Supabase Dashboard → Authentication → Providers:
- **Google**: Client ID + Secret из Google Cloud Console
- **Яндекс**: Custom OIDC provider → `https://oauth.yandex.ru`
- **VK ID**: OAuth 2.1 + PKCE → настройка из id.vk.com

### 3. Vercel: Environment Variables

Добавить/обновить:
- `DEV_EMAILS=stepa@...,test@...`
- Остальные Auth env vars из `docs/AUTH_SETUP.md`

### 4. Vercel Redeploy

Redeploy backend с новыми env vars.

### 5. Проверка

SQL query для верификации:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
Ожидаемо: 15+ таблиц.

## DoD
- [ ] Миграции 007-014 applied
- [ ] OAuth providers configured
- [ ] Vercel redeployed
- [ ] Verification query passed
