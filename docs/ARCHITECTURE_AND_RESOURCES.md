# Архитектура и ресурсы — единый обзор

Документ фиксирует подключённые ресурсы, их назначение, разделение ответственности и реализованные роли.

> **Последнее обновление:** апрель 2026

---

## Подключённые ресурсы

| Ресурс | Назначение | Триггер деплоя | URL |
|--------|------------|----------------|-----|
| **GitHub Pages** | Основной хост фронтенда (React/Vite SPA) | Push в `main` → GH Actions | `realcampdzen.github.io/RL-Guide-book/` |
| **Vercel: rl-guide-book** | Альтернативный хост фронтенда | Push в `main` → auto-deploy | — |
| **Vercel: backend** | Flask Python API (auth, смены, отряды, chat, badges, images) | Push в `main` → auto-deploy | `backend-murex-one-40.vercel.app` |
| **Supabase** | Postgres БД (25+ таблиц, prod storage) | Миграции вручную через Dashboard | `inkhtjcrzblzsfqvceid.supabase.co` |
| **cf-api (Cloudflare)** | Боты VK/TG (NeuroValyusha в соцсетях) | Ручной / CI | `real-vibe-ai-studio.pages.dev` |

---

## Разделение ответственности

### GitHub Pages (Frontend)
- **SPA Путеводителя:** React 19, TypeScript 6.0, Vite 8, Three.js (3D).
- **Build-time vars:** `VITE_BACKEND_URL` встраивается из GitHub Variables при сборке.
- **BasePath:** `/RL-Guide-book/`
- **Deploy:** `.github/workflows/deploy-simple.yml` → sync:ai-data → verify:webp → self-check → build → deploy.

### Vercel Backend (Python API)
- **Flask Serverless API** — авторизация (JWT), RBAC по 8 ролям, управление сменами/отрядами, чат (NeuroValyusha), заявки на значки, ИИ-изображения, Community Badges, webhooks (Telegram, VK).
- **Хранение:** Supabase Postgres (`USE_SUPABASE=true`). JSON-файлы — только для local dev.
- **StorageProvider:** 25 сторов через абстракцию `get_store(name)` (см. `backend/storage/__init__.py`).
- **Env vars (Production):** `USE_SUPABASE`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`, `AUTH_JWT_SECRET`, `AUTH_GENERATE_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `OPENAI_API_KEY`.

### Supabase (Database)
- **Project:** `inkhtjcrzblzsfqvceid`
- **Миграции:** 001–018 применены (backend/migrations/*.sql). 25+ таблиц. См. [SUPABASE_SCHEMA_AND_MIGRATION.md](SUPABASE_SCHEMA_AND_MIGRATION.md).
- **RLS:** Включён, но backend использует `service_role_key` и сам реализует RBAC по JWT.

### cf-api (Cloudflare)
- **Боты:** автокомментарии VK (wall_post_new, wall_reply_new), обсуждение в TG-группе.
- **Память:** Cloudflare KV (ветки, дедупликация).
- **Стек:** Hono/TypeScript. **Не переносить в Python.**

---

## Auth Flow (реализовано)

```
[Организатор] → POST /api/auth/generate-code (X-Generate-Code-Secret) → {code, role, expiresAt}
[Участник]    → POST /api/auth/verify-code ({code, deviceId}) → {accessToken (JWT), role, campId, exp}
[Frontend]    → Authorization: Bearer <accessToken> → все защищённые эндпоинты
```

- JWT payload: `{role, campId, deviceId, exp}`, подписан `AUTH_JWT_SECRET`.
- При expired/отсутствующем токене → `role = 'traveler'`.
- Подробности: [tech_context.md](../.memory-bank/tech_context.md) § Auth Flow.

---

## Реализованные роли (8)

| # | Роль | Ключ | Адаптация ЛК |
|---|------|------|-------------|
| 1 | Путешественник | `traveler` | Базовый ЛК, без ИИ-чата, localStorage only |
| 2 | Участник смены | `participant` | ИИ-чат, синхронизация, Движки, Реальный Дневник |
| 3 | Родитель | `parent` | Read-only прогресс ребёнка, рекомендации, свой ЛК |
| 4 | Вожатый | `counselor` | Inbox заявок на значки, панель отряда, отряд вожатых |
| 5 | Педагог | `educator` | Кабинет педагога (задания, расписание, группы), inbox |
| 6 | Старший вожатый | `shift_leader` | Создание смен/отрядов, выдача кодов, аналитика |
| 7 | Директор лагеря | `camp_director` | Организаторский уровень, полное управление |
| 8 | Разработчик | `developer` | Полный доступ, песочница, обход авторизации на localhost |

**Источник истины:** [authRole.ts](../src/types/authRole.ts)

---

## Панели Личного Кабинета (15+)

| Панель | Доступ | Компонент |
|--------|--------|-----------|
| Паспорт | Все | ProfileView |
| Реальный Отряд (Дневник) | Все | RealDiaryDashboard |
| Движок (Команда) | participant+ | TeamDashboard |
| Совет Лагеря | participant+ | CouncilDashboard |
| Инспектор Пользы | participant+ | InspectorDashboard |
| БРО Движение | participant+ | BroContainer |
| Штаб Крыла | participant+ | WingDashboard |
| Мастерская | 1.16.1/1.16.2 gate | WorkshopContainer |
| Отрядный уголок | participant+ | SquadCornerDashboard |
| Шеринг / Share Center | Все | ProfileView |
| 4К Аналитика | participant+ | Profile4KDashboard |
| Вожатификатор | counselor+ | ProfileView |
| Кабинет педагога | educator+ | EducatorCabinetPanel |
| Смены и отряды | shift_leader+ | ShiftsAndSquadsDashboard |
| Для родителей | parent | ProfileView |

---

## Связь с документами

- [active_context.md](../.memory-bank/active_context.md) — текущий фокус и статус.
- [ROADMAP_2026.md](ROADMAP_2026.md) — архив реализованных задач с Evidence.
- [tech_context.md](../.memory-bank/tech_context.md) — стек, API контракты, StorageProvider, грабли.
- [SUPABASE_SCHEMA_AND_MIGRATION.md](SUPABASE_SCHEMA_AND_MIGRATION.md) — схема БД, реестр миграций.
- [BACKEND_CONTRACT_GUARD.md](BACKEND_CONTRACT_GUARD.md) — обязательные/опциональные поля эндпоинтов.
- [PROD_RELEASE_PLAYBOOK.md](PROD_RELEASE_PLAYBOOK.md) — чеклист деплоя и smoke-тесты.
