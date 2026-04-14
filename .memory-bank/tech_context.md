# Technical Context

## Tech Stack
- **Frontend:** React 19 (TypeScript 6.0), Vite 8, Three.js (3D Scenes).
- **Backend:** Python (FastAPI/Flask) - Chatbot logic, webhooks, community badges.
- **Data:** Static JSON/Markdown in `ai-data/`.
- **Deployment:** Vercel (rl-guide-book + backend), Cloudflare (cf-api — боты VK/TG), GitHub Pages (frontend static). См. [docs/ARCHITECTURE_AND_RESOURCES.md](docs/ARCHITECTURE_AND_RESOURCES.md).

## Data Architecture (Source of Truth)
1. **Source:** `ai-data/` (Categories, Badges, Index).
2. **Build:** `python update_indexes.py` - recalculates `MASTER_INDEX.json` and category indexes.
3. **Runtime:** `public/ai-data/` - This is where the app and chatbot actually read data from.
4. **Sync Rule:** Always sync `ai-data/` -> `public/ai-data/` after changes. Run before build/deploy.
   - **Recommended:** `npm run sync:ai-data` (cross-platform, uses `scripts/sync-ai-data.mjs`).
   - Windows (manual): `robocopy .\ai-data .\public\ai-data /E`
   - Linux (manual): `rsync -a --delete ai-data/ public/ai-data/`
   - See [docs/DATA_SYNC.md](docs/DATA_SYNC.md) for details.

## Image Assets (Badges)
- **Path:** `public/Новые значки/<category>/<badge>/`
- **Rule:** Every `.jpg/.png` must have a sibling `.webp`.
- **Commands:** 
  - `npm run verify:webp` (check siblings)
  - `npm run images:webp` (generate webp)

## Мой арт (локальные скины)
- **Модель:** `userData.customBadgeImages` — `Record<BadgeBaseId, string>` (data URL); `userData.selectedSkins[id] = 'custom'` при выборе «Мой арт».
- **Контекст:** [ProgressContext.tsx](../src/context/ProgressContext.tsx) — `setCustomBadgeImage(badgeBaseId, dataUrl | null)`; миграция legacy data URL из `selectedSkins` в `customBadgeImages` при загрузке.
- **UI:** В [BadgeView.tsx](../src/views/BadgeView.tsx) переключатель: Авто / Классика / Реализм / «Мой арт» или «Загрузить свой арт»; hero и [BadgeIcon](src/components/BadgeIcon.tsx) используют custom image по baseBadgeId. В Мастерской (Кузница Смыслов) — необязательная загрузка изображения при создании значка.
- **Хранение:** localStorage (ключ прогресса); data URL могут быть большими — сжатие/лимит не в MVP.

## ИИ-изображения

- **Провайдеры:** OpenAI GPT Image 1.5 (по умолчанию), Fusion Brain (Kandinsky), YandexART, GigaChat, Alice AI. Конфиг: `IMAGE_PROVIDER` (env, по умолчанию `openai`) + API-ключи в env. Реализован только OpenAI; остальные — заглушки (return None).
- **Эндпоинты:** **POST /api/images/generate** (универсальный, в т.ч. герб Движка context=gerb) — см. контракт ниже.
- **Три режима:** generate (с нуля), process (обработка загруженного по imageBase64), upload (без ИИ, на клиенте).
- **Generate:** контекст задаёт формат раздела ЛК и базовый промпт. **Допустимые context:** `squad_corner`, `wing`, `passport`, `workshop`, `badge_skins`, `team_flag`, `gerb`, `counselor_squad`, `bro_passport` (при неизвестном — нейтральный промпт). Для `context=gerb`: generate — обязателен `teamId`, опц. `style` (cosmos|cyberpunk|realism); process — опц. `teamId` для промпта.
- **Process:** вход — imageBase64 + prompt; сохранить особенности изображения и дополнить айдентикой РЛ. При неподдержке провайдером — 501.
- **Целевые разделы ЛК:** Отрядный уголок, Крыло, Паспорт, Мастерская, скины значков, флаг Движка, герб Движка, отряд вожатых, Бропаспорт.
- **Единый UI-паттерн:** компонент [ImageSourceBlock.tsx](../src/components/ImageSourceBlock.tsx) (Upload / Generate / Process). Контексты: `gerb`, `team_flag`, `squad_photo`, `wing_avatar`, `passport_avatar`, `workshop_badge`. Generate вызывается через `onGenerate`; при появлении POST /api/images/generate родители подключают его в `onGenerate`/`onProcess`. Стили модалки и ошибок: классы `proof-modal-overlay`, `proof-modal`, `profile-error`, `profile-loading`, `btn-secondary` (profile-view.css).

## API Contracts
- **GET /api/health:** liveness probe, без авторизации. Всегда 200, тело `{"status": "ok"}`. Назначение: мониторинг, Vercel, CI. Отдельно GET /health — проверка с данными (DATA_FILE), может возвращать 503.

### Chatbot (/chat)
- **POST /api/chat:** обязателен заголовок `Authorization: Bearer <accessToken>` (JWT с ролью из CHAT_ALLOWED_ROLES). Без токена или с невалидным/истёкшим токеном — **401** `{"error": "Authorization required"}` или `{"error": "Invalid or expired token"}`. Роль не из списка (в т.ч. traveler) — **403** `{"error": "Access denied for this role"}`. При превышении дневного лимита сообщений (по deviceId из JWT) — **429** `{"error": "Daily limit exceeded", "retryAfter": "tomorrow"}`.
- **Request:** `ChatRequest { message: string, user_id: string, context: WebContext }`
- **WebContext:** `{ current_view, current_category, current_badge, current_level }`
- **Response:** `ChatResponse { response: string, suggestions: string[], metadata: object }`

### Telegram: карточка Созидателя
- **POST /api/telegram/notify-creator-card:** тело `{ imageBase64, badgeTitle, description? }`. Отправляет изображение карточки 9:16 в канал (TELEGRAM_CHANNEL_ID) с подписью «Карточка Созидателя: [badgeTitle]. [description]». 400 при отсутствии imageBase64, 503 при ненастроенном Telegram.

### Онлайн-Движки (teams API)
- Требуется **Authorization: Bearer &lt;accessToken&gt;** (JWT); роль не traveler (participant, parent, counselor, shift_leader, organizer, developer). Идентификатор участника в members = deviceId из JWT.
- **GET /api/teams/mine:** 200 — команда, в которой текущий пользователь в members; 404 — не в команде; 401/403 при ошибке auth. При ошибке загрузки (сеть, 5xx, 401) UI показывает сообщение и кнопку «Повторить» (повторный запрос mine).
- **POST /api/teams** без `id` в теле: создание с membership; тело `name`, `motto`, `logo`, `goals`, опц. `nickname`, `avatar`, `rank`; 201 — созданная команда; 409 — уже в команде.
- **POST /api/teams/:id/join:** тело опц. `nickname`, `avatar`; 200 — обновлённая команда; 404 — команда не найдена; 409 — уже в другой команде.
- **POST /api/teams/:id/leave:** 200; участник удаляется из members; если members пустой — команда удаляется.
- **PATCH /api/teams/:id:** только лидер (leaderId === deviceId); тело — частичное обновление (name, motto, logo, goals, achievements, flagImage, gerbImage); 200 — команда; 403 — не лидер.
- **DELETE /api/teams/:id:** только лидер; 200; 403 — не лидер.
- **GET /api/teams/:id:** без auth, публичное чтение команды по id (для пригласительных ссылок и предпросмотра по коду при вступлении).
### Engine Projects (проекты Движков)
- Требуется **Authorization: Bearer** (JWT), членство в Движке. **⚠️ Хранение: flat file `engine_projects.json` (legacy, не через StorageProvider).**
- **GET /api/teams/:team_id/projects:** 200 — массив проектов для данного Движка.
- **POST /api/teams/:team_id/projects:** создание проекта; тело `{ title, description?, plan?, targetBadgeId? }`; 201 — проект (status=draft); 403 — не член.
- **PATCH /api/teams/:team_id/projects/:project_id:** обновление полей (title, description, plan, targetBadgeId, photos[], reflection, scenario, status). Переходы статусов: draft→in_progress, in_progress→review (submittedAt), in_progress→draft, rejected→in_progress.
- **POST /api/teams/:team_id/projects/:project_id/review:** рецензия вожатого; тело `{ action: "approve"|"reject", note? }`; при approve — badge добавляется в achievements Движка; 400 если не в статусе review.
### Engine Initiatives (инициативы Движков)
- Требуется **Authorization: Bearer** (JWT), членство в Движке. **⚠️ Хранение: flat file `initiatives.json` (legacy, не через StorageProvider).**
- **GET /api/teams/:team_id/initiatives:** 200 — массив инициатив.
- **POST /api/teams/:team_id/initiatives:** создание; тело `{ title, description? }`; автоматический голос «за» от создателя; status=voting; 201.
- **POST /api/teams/:team_id/initiatives/:ini_id/vote:** голосование; тело `{ vote: true|false }`; автопроверка: если все проголосовали → approved (все «за») или rejected; 400 если голосование завершено.
- **POST /api/teams/:team_id/initiatives/:ini_id/send:** отправка одобренной инициативы в Совет Лагеря; создаёт запись в `council_initiatives` (StorageProvider); status→sent_to_council; 400 если не approved.
### POST /api/images/generate (универсальные ИИ-изображения для разделов ЛК)
- **Authorization:** обязателен заголовок `Authorization: Bearer <accessToken>` (JWT). Роли те же, что у teams/chat: participant, parent, counselor, shift_leader, organizer, developer. 401 при отсутствии/невалидном токене, 403 при роли traveler.
- **Rate limit:** N запросов в минуту (N задаётся `IMAGES_GENERATE_RATE_LIMIT`, по умолчанию 10) на ключ: deviceId из JWT, при отсутствии — IP. При превышении — **429** `{"error": "Слишком много запросов генерации. Подождите минуту.", "retryAfter": 60}`.
- **Request (JSON):** `{ mode: "generate" | "process", context: string, prompt?: string, imageBase64?: string, teamId?: string, style?: string }`. `context` — идентификатор раздела (squad_corner, wing, passport, workshop, badge_skins, team_flag, gerb, counselor_squad, bro_passport). Для `mode: "process"` поле `imageBase64` обязательно. Для `context=gerb`: generate — обязателен `teamId`, опц. `style` (cosmos|cyberpunk|realism); process — опц. `teamId` для контекста в промпте.
- **Response 200:** `{ imageBase64: string }`.
- **Ошибки:** 400 — неверный или пустой mode, пустой context; для process — отсутствует imageBase64. 401/403 — как у других защищённых эндпоинтов. 429 — превышен лимит запросов в минуту (см. Rate limit). 501 — режим process не поддерживается текущим провайдером. 503 — генерация недоступна (нет ключа, ошибка провайдера).

### Parent snapshot (родитель по коду)
- **POST /api/parent-snapshot:** заголовок `Authorization: Bearer <accessToken>` (JWT, роль participant или parent). Body: `{ progress: object, profile?: { nickname?, totalLevelsAchieved? }, exportedAt: string }`. Ответ: `{ parentLinkCode: string, expiresAt: number }`. 400 при неверном body, 401/403 при ошибке авторизации.
- **GET /api/parent-snapshot?code=XXX:** без авторизации. 200: `{ progress, profile?, exportedAt }`. 404 — код не найден, 410 — срок действия истёк.

### Community badges (Идеи Сообщества / Мастерская)
- **GET /api/community/badges:** без авторизации. 200 — массив значков (id, title, description?, emoji?, category_id?, is_community?). Кэш на клиенте в localStorage.
- **POST /api/community/badges:** без авторизации. Rate limit: 5 запросов в минуту по IP. При превышении — **429** `{"error": "Слишком много отправок. Подождите минуту."}`. При невалидном теле — **400** `{"error": "<текст>"}` (например «Поле title обязательно и должно быть непустой строкой»). Тело: `{ id?, title, description?, emoji?, category_id? }`. 201 — успех. Лента на бэкенде хранится в файле, макс. 100 записей.

## Мастерская (ЛК)
- **Разблокировка:** по значкам 1.16.1 или 1.16.2 (в пути или достигнуты). Без доступа: блок «Идеи Сообщества» (id `workshop-section-community-locked`) и «Как открыть»; с доступом: Архитектор отряда, Кузница Смыслов, Мои предложения, Идеи Сообщества.
- **Кузница:** форма (название, описание, опциональное ИИ-изображение) → addCustomBadge (localStorage `rl_custom_badges_v1`), модалка «Концепт выкован» → Telegram + generateSocialCard (creator_proposal) + POST /api/telegram/notify-creator-card.
- **Мои предложения:** хранятся в localStorage (`rl_custom_badges_v1`), входят в резервную копию (экспорт/импорт в блоке «Резервная копия»). «Отправить в сообщество» → POST /api/community/badges; при 429/400 UI показывает ошибку через showHint.
- **Идеи Сообщества:** GET /api/community/badges, кэш и лайки в localStorage; оффлайн-очередь отправки при восстановлении сети.

## Architecture & Resources
- **GitHub Pages:** frontend static deploy — basePath `/RL-Guide-book/`, workflow [.github/workflows/deploy-simple.yml](.github/workflows/deploy-simple.yml), push `main`. Pre-deploy: sync:ai-data, verify:webp, self-check, build. См. [docs/DEPLOY_GITHUB_PAGES.md](docs/DEPLOY_GITHUB_PAGES.md).
- **Vercel:** 2 проекта в аккаунте `nomorningst-2550`:
  - `rl-guide-book` → фронтенд (деплой через GitHub Actions, не напрямую из CLI)
  - `backend` → Flask Python API. **Production URL:** `https://backend-murex-one-40.vercel.app` (alias: `https://backend-nomorningst-2550s-projects.vercel.app`). Деплоится: push `main` → GitHub Actions → Vercel auto-deploy.
- **Vercel Backend env vars (Production):** `USE_SUPABASE=true`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`, `AUTH_JWT_SECRET`, `AUTH_GENERATE_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `OPENAI_API_KEY`. **ВАЖНО:** все env vars заданы через Vercel dashboard / CLI. При добавлении новых — нужен redeploy (push чего-либо в main).
- **Supabase:** project `inkhtjcrzblzsfqvceid` (URL: `https://inkhtjcrzblzsfqvceid.supabase.co`). Миграции 001–018 применены (25+ таблиц; см. `backend/migrations/`). **USE_SUPABASE=true на prod — активен**, JSON-файлы используются только при локальной разработке (USE_SUPABASE=false).
- **GitHub Variables (для GitHub Actions build):** `VITE_API_URL`, `VITE_BACKEND_URL=https://backend-murex-one-40.vercel.app` — встроены в frontend bundle Vite при сборке. Настроены в Settings → Variables (не Secrets, т.к. не секретные).
- **cf-api (Cloudflare):** Bots VK/TG (NeuroValyusha in social). Not in Python.
- **Roles (implemented):** Путешественник (traveler), Участник (participant), Родитель (parent), Вожатый (counselor), Старший вожатый (shift_leader), Педагог (educator), Директор (camp_director), Разработчик (developer). See [docs/ARCHITECTURE_AND_RESOURCES.md](docs/ARCHITECTURE_AND_RESOURCES.md).

## StorageProvider (backend/storage/)
- **Паттерн:** абстракция `get_store(name)` из `backend/storage/__init__.py`. Все данные через `get_store('shifts').load()` / `.save(data)`.
- **JSON provider** (default, `USE_SUPABASE=false`): файлы в `backend/data/*.json` — только для локальной разработки.
- **Supabase provider** (`USE_SUPABASE=true`): таблицы в Supabase Postgres — prod/staging.
- **Ключи сторов (25 штук):** `shifts`, `memberships`, `squad_corners`, `squad_invites`, `squad_messages`, `badge_requests`, `badge_plans`, `parent_snapshots`, `chat_daily_usage`, `council_initiatives`, `council_members`, `council_protocols`, `teams`, `badge_arts`, `engines`, `engine_members`, `inspector_progress`, `bro_events`, `bro_passports`, `bro_submissions`, `bro_initiatives`, `shift_schedule`, `workshops`, `parent_suggestions`, `users`, `workshop_proposals`, `role_requests`, `family_links`, `engine_join_requests`.
- **НЕ в StorageProvider (legacy):** `engine_projects` и `initiatives` (инициативы Движков) — всё ещё используют прямой `open()/json.dump()` в `app.py` через `ENGINE_PROJECTS_FILE` / `INITIATIVES_FILE`. Это не работает на Vercel (serverless).
- **ВАЖНО для агентов:** не добавляй новые `_xxx_load/_xxx_save` напрямую — добавляй новый Store в `base.py`, реализуй в `json_provider.py` и `supabase_provider.py`, регистрируй в `__init__.py`. Миграцию SQL клади в `backend/migrations/NNN_name.sql`.

## Auth Flow (prod)
- **Коды авторизации:** `POST /api/auth/generate-code` (требует заголовок `X-Generate-Code-Secret: <AUTH_GENERATE_SECRET>`). Генерирует код на ~40 минут. Роль задаётся в теле (`role: "participant"|"shift_leader"|...`).
- **Верификация:** `POST /api/auth/verify-code` (тело: `{code, deviceId}`). Возвращает `{accessToken, role, campId, exp}`. `accessToken` = JWT.
- **JWT payload:** `{role, campId, deviceId, exp}`. Подписан `AUTH_JWT_SECRET`.
- **Фронтенд:** хранит `accessToken` в localStorage через `authStorage.ts`. При expired/отсутствии — `role = 'traveler'`.
- **Prod smoke-test (2026-02-21):** Полный цикл проверен: generate-code → verify-code → создание смены → создание отряда → join → squads/mine — всё работает через Supabase.

## Backend for participants (future)
When implementing sync/backend for camp participants (Participant role, KV store by anonymous ID + secret code):
- **Preserve counselor confirmation:** Final fixation of a level as «achieved» in the system must require or reflect confirmation by a counselor (вожатый). The pedagogical model is not token-based: proof by counselor + peers + artifact is required in the methodology; the app should not allow «achieved» to become the sole source of truth without that step (e.g. «pending_confirmation» until counselor approves, or UI that clearly separates «I claim this» from «confirmed by counselor»). See [docs/PEDAGOGY_NOT_TOKEN_SYSTEM.md](docs/PEDAGOGY_NOT_TOKEN_SYSTEM.md).

## Real Diary (Реальный Дневник) — baseline
- **Компонент:** `src/components/RealDiaryDashboard.tsx`
- **Модель:** `src/types/userProgress.ts` — `diaryProgress.entries[day]` с полями `morningText/Emoji`, `dayText/Emoji`, `eveningText/Emoji`, `memorableText/Emoji`, `mainMoments`, `friends`, `conclusions`.
- **Важно:** Базовая реализация (Утро/День/Вечер/Чем запомнился день + Рефлексия) принята и нравится заказчику. Не терять этот функционал при развитии.

## Кабина корабля: нижняя приборная панель
- **Спека восстановления:** [docs/PROFILE_CABIN_LOWER_PANEL_SPEC.md](docs/PROFILE_CABIN_LOWER_PANEL_SPEC.md)
- **Элементы (снизу вверх):** нижняя навигация (mobile-bottom-nav), пузыри (6 шт.), консоль-терминал («Экран: В пути»).
- **Стили:** `src/styles/profile-view-spaceship.css` — `.profile-view-console`, `.console-cluster`, `.console-terminal`, `.console-btn`.
- При поломке — восстанавливать по спеке. Не трогать `.console-terminal` при правках пузырей.

## UI: окна, выпадашки, скролл (обязательно дорабатывать до конца)
- **Правило:** при добавлении окошек (модалки, popover), выпадающих списков или скроллируемых блоков — сразу стилизуем до конца. Не оставляем белые, неадаптированные, системные элементы (скроллбары, рамки, стрелки и т.п.).
- **Пустые состояния и ошибки в ЛК:** в блоках Движок (TeamDashboard), Совет (CouncilDashboard), отрядный уголок (SquadCornerDashboard) и панель входящих заявок (ProfileView) при ошибке загрузки показывается единый блок: заголовок, текст «Проверь подключение к интернету» (или аналогичный), кнопка «Повторить». Пустые состояния — через классы `.profile-empty-state`, `.profile-error` в [profile-view.css](src/styles/profile-view.css).
- **Скроллбар:** для тёмной темы — `scrollbar-width: thin`, `scrollbar-color` (Firefox); `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb` (Chrome/Edge). Цвета — в тон фона (тёмные, с акцентным цветом для thumb).
- **Пример:** [src/styles/profile-view.css](mdc:src/styles/profile-view.css) — `.profile-sandbox-role__menu`, `.camp-program-day-card__activities`.

## Mobile & UI Performance Constraints (Safari / iOS)
Опираясь на опыт стабилизации ChatBot и мобильных модалок, зафиксированы строгие правила для Frontend UI:
- **Viewport thrashing:** Никогда не используйте `100vh` для полноэкранных мобильных контейнеров (вызывает скачки при скролле адресной строки). Используйте `100svh` или резервные слои на `100lvh`.
- **Backdrop-filter crashes:** Крайне опасно использовать `backdrop-filter: blur()` одновременно с анимациями появления/скроллом на мобильных (особенно iOS Safari) — это вызывает black screen flash и checkerboard GPU rendering crash. Отключайте blur или заменяйте на полупрозрачные фоны для мобилок.
- **Layer thrashing & FPS:** Избегайте динамического переключения теней (`box-shadow`) и бесконечных спиннеров внутри часто рендерящихся или анимированных блоков. Они переполняют очередь композитинга. Ограничивайтесь `transform` и `opacity` с аппаратным ускорением (`will-change: transform`).
- **CSS Bleed (Специфичность):** При декомпозиции CSS на доменные модули нельзя оставлять глобальные селекторы широкого спектра. Они могут "протечь" и скрыть глобальные SPA-компоненты (как ChatAvatar на других экранах).

## Critical Pitfalls (Грабли)
- **Cyrillic Paths:** Be careful with file names in `public/`. Vite is configured to handle them, but OS operations might fail if encoding is wrong.
- **CamelCase vs snake_case:** `categoryId` (JSON/Frontend) vs `category_id` (Backend logic).
- **History Limit:** NeuroValyusha remembers only the last 20 messages.
- **Vercel/Node API:** Uses `data_loader_ai_data_new.js` which mimics the Python lazy loading logic.

## Development: Test Mode (только для разработки)
- **Ключ:** `localStorage['rl_guide_test_mode'] === 'true'`.
- **По умолчанию:** выключен. Для обычных пользователей прогресс не подменяется.
- **Назначение:** при включении подставляются тестовые достижения (`TEST_DEFAULT_ACHIEVED_LEVELS` в `ProgressContext.tsx`) для проверки UI (ранг, коллекция, Share Center и т.д.).
- **Использовать только локально:** не включать в продакшене; явно не рекламировать конечным пользователям.

## Safety & Integrity Protocols (CRITICAL)
- **Git Shadowing**: Before any modification, run `git add .`. This creates recoverable blobs in `.git/objects` even if not committed.
- **Manual Backups**: For files >500 lines (especially `ProfileView.tsx`), create a `.bak` copy before using `write_file` or `replace`.
- **No Total Overwrites**: Avoid `write_file` for large, logic-heavy files. Use atomic `replace` calls with at least 5 lines of context.
- **Verification**: After every edit, verify the dev server status. Use `cmd /c "npx vite > startup.log 2>&1"` to capture crash logs.
- **Recovery Path**: If a file is lost and no git commit exists, check `dist/assets/` for the latest successful build. Logic can be extracted from transpiled JS.
