# WORKFLOW: Прогресс и планы (консолидированный документ)

**Назначение:** единая картина прогресса, начатых фич и планов для доработки [docs/ROADMAP_2026.md](docs/ROADMAP_2026.md). Статусы и Evidence сверялись с репозиторием; при расхождении приоритет — ROADMAP Evidence и код. Разработка велась несколькими агентами — часть реализаций может не быть явно отмечена в старых планах.

**Связанные документы:**
- [docs/ROADMAP_2026.md](docs/ROADMAP_2026.md) — SSOT для статусов задач (Done/Not started), Evidence, «Где мы сейчас».
- [.cursor/agent orchestration/AGENT_ORCHESTRATION.md](.cursor/agent%20orchestration/AGENT_ORCHESTRATION.md) — Claim Board, сводка кто что сделал, обязательная проверка/запись перед стартом.
- [WORKFLOW_GAME_CONCEPT_PLAN.md](WORKFLOW_GAME_CONCEPT_PLAN.md) — исходный мастер-документ (Product Map, этапы, DoD, Agent Task Contexts).
- [STRATEGY_GAMEDEV_STACK_2026-02-04.md](STRATEGY_GAMEDEV_STACK_2026-02-04.md) — 3 Loops, Vertical Slices, гейты 1.16.1/1.16.2.
- [ANALYSIS_AND_VISION_2026.md](ANALYSIS_AND_VISION_2026.md) — Vision, эпики, Smart Onboarding, метод «Слепок», роли.
- [docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md](docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md) — роли, RBAC, Движки, Совет.
- Планы кабины: [docs/PLAN_PROFILE_SPACESHIP_ISOLATION.md](docs/PLAN_PROFILE_SPACESHIP_ISOLATION.md), [docs/PROFILE_CABIN_COCKPIT_SPEC.md](docs/PROFILE_CABIN_COCKPIT_SPEC.md), [docs/PROFILE_CABIN_SERVER_SETUP.md](docs/PROFILE_CABIN_SERVER_SETUP.md).

---

## 1. Вводная часть

Этот документ объединяет:
- разметку прогресса по этапам WORKFLOW (Done / In progress / Not started);
- реализованные фичи без явного этапа в WORKFLOW (в т.ч. кабина космического корабля, панели ЛК);
- планы и бэклог;
- матрицу «План ↔ Код» для быстрой проверки агентами;
- рекомендации по обновлению ROADMAP_2026.

**Правило:** SSOT для статусов задач остаётся [docs/ROADMAP_2026.md](docs/ROADMAP_2026.md). Данный файл — справочник прогресса и планов при детальном планировании геймдизайна и этапов.

---

## 2. Сводка по источникам

| Документ | Что фиксирует |
|----------|----------------|
| **WORKFLOW_GAME_CONCEPT_PLAN.md** | Роли агентов A–E, Product Map (§9), продакт-документ (§11), этапы 1–8, DoD, чек-листы (§13), Agent Task Contexts (§16), Backlog (§11.25). Исходный SSOT по продукту. |
| **ROADMAP_2026.md** | Таблица инициатив (Done/Evidence), «Где мы сейчас», Completed (do not redo). Единая точка входа для агентов. |
| **STRATEGY_GAMEDEV_STACK_2026-02-04.md** | 3 Loops (Core, Social/Viral, Creator), Vertical Slices 1–5, гейты 1.16.1/1.16.2, контроль качества. |
| **REPORT_2026.md** | Отчёт о реализованных механиках: Инспектор, Движки, Бро, Крылья, Совет, Реальный Дневник и т.д. |
| **ANALYSIS_AND_VISION_2026.md** | Vision, эпики (viral, роли, Smart Onboarding), идеи (ИИ-Манифест, Генератор мемов), метод «Слепок». Ссылается на WORKFLOW при расхождении приоритетов. |
| **FEATURE_PATH_CREATOR.md** | Фича «Создатель Пути»: UGC, Мастерская, разблокировка по 1.16.1/1.16.2. |
| **FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md** | Роли (traveler, participant, parent, counselor, organizer), RBAC, Движки, Бро, Совет Лагеря; частично реализовано. |
| **Планы кабины** | PLAN_PROFILE_SPACESHIP_ISOLATION — изоляция разработки (отдельный entry + CSS для порта 3010). PROFILE_CABIN_COCKPIT_SPEC — спека кабины v2 (пульт, панели). PROFILE_CABIN_SERVER_SETUP — запуск сервера кабины. |

---

## 3. Прогресс по этапам WORKFLOW (§11.8, §13)

Этапы 1–7 из WORKFLOW сопоставлены с таблицей ROADMAP и Evidence.

| Этап | Название | Статус | Evidence / примечание |
|------|----------|--------|----------------------|
| 1 | Определение правил прогресса (уровни vs значки) | **Done** | Прогресс по `N.X.Y`, агрегат по `N.X`; статусы в [userProgress.ts](src/types/userProgress.ts), [ProgressContext.tsx](src/context/ProgressContext.tsx). ROADMAP: множество пунктов (CategoryView фильтры, статусы на карточках). |
| 2 | UI/UX прототип «Твои значки» и «Личный кабинет» | **Done** | ProfileView с табами В пути/Коллекция/Журнал, точки входа из CategoryView/BadgeView. ROADMAP: «Первый вход в ЛК», «Share Center», «Мастерская». |
| 3 | Локальное хранилище прогресса + экспорт/импорт | **Done** | ProgressContext, useUserProgress (логика в контексте), экспорт/импорт в ProfileView. ROADMAP: «Резервная копия», «Share Center (экспорт/импорт)». |
| 4 | Интеграция статусов в карточки и экран значка | **Done** | CategoryView — фильтры «Все»/«Мои»/«В процессе»/«Получены»; CategoriesGrid — подсказка о прогрессе; BadgeView/BadgeLevelView — прогресс, «В путь». ROADMAP: «CategoriesGrid: подсказка о прогрессе», «CategoryView: фильтры по статусу». |
| 5 | Добавление заметок/доказательств для уровней | **Done** | proofForm в ProfileView (Опыт, Реальный вклад, Ссылка, Фото); фиксация уровня с рефлексией и evidence. ROADMAP: «Подробная анкета при подтверждении значка», «План получения значка». |
| 6 | Синхронизация с чатом (новые экраны в контексте) | **Done** | Экран «Личный кабинет» в `current_view`; маппинг profile→«Личный кабинет» в generateWhereAmI; ответы бота на экране ЛК проверены. ROADMAP: «Этап 5: Синхронизация с чатом». |
| 7 | Устранение хардкода чисел/дат | **Done** | useDataLoader возвращает masterIndex; BlueNestLanding, CategoriesGrid, AboutCampView, ProfileView, BroInitiation, Profile4KDashboard — данные из индексов. ROADMAP: «Этап 6: Устранение хардкода чисел/дат». |
| 8 | Роли/авторизация/Движки (post-MVP) | **Частично** | **Done:** роли (authRole.ts), адаптация ЛК (скрытие отрядных блоков для traveler, родитель как участник, панель заявок для counselor/organizer), лимит чата с бэкенда (GET /api/chat/limits), песочница (generate-code, verify-code, JWT, traveler lock). **Not started:** полный RBAC на бэкенде, создание смен/отрядов организатором, «онлайн-Движки» (membership/roles + staff), просмотр прогресса ребёнка родителем по коду. См. [FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md](docs/FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md). |

---

## 4. Реализованные фичи без явного этапа в WORKFLOW

### 4.1. Кабина космического корабля (ЛК)

**Статус: Done.** Единый вид личного кабинета на всех портах (3001, 3002, 3010). Выполнена **унификация** точек входа: одна обёртка и одни стили кабины во всех режимах.

- **Объединение точек входа:** В [main.tsx](src/main.tsx) добавлены обёртка `profile-spaceship-root` и импорт [profile-view-spaceship.css](src/styles/profile-view-spaceship.css) — кабина включается во всех режимах. [profile-desktop.html](profile-desktop.html) переведён на main.tsx (отдельный `main-profile-desktop.tsx` удалён).
- **Layout:** `profile-view-cabin-layout`: слева — Паспорт, Отряд вожатых; сверху — Инспектор; центр — контент выбранной панели; справа — Шеринг, Вожатификатор, 4К, Для родителей; нижняя консоль — кнопки (Отрядный уголок, Реальный Дневник, Движок, Совет, БРО, Мастерская) и терминал с подписью экрана. Консоль отображается через spaceship.css (в profile-view.css убрано `display: none` для `.profile-view-console`).
- **Сборка:** В vite.config.ts включён multi-page build: в dist попадают index.html и profile-desktop.html; в dev-плагине поддержка profile-desktop.html по пути /RL-Guide-book/profile-desktop.html.
- **Порты:** ЛК с кабиной и пузырями единообразен на порту 3001 (`npm run dev`), 3010 (`npm run dev:profile-desktop` — быстрый вход в ЛК), 3002 (`npm run dev:staging`). profile-desktop.html — короткий путь с `__INITIAL_VIEW__ = 'profile'`.
- **Документация:** [docs/PROFILE_CABIN_SERVER_SETUP.md](docs/PROFILE_CABIN_SERVER_SETUP.md), [SERVERS.md](SERVERS.md).

**Изоляция кабины (отдельный entry только для 3010):** **Не актуальна** — вместо неё выполнена унификация: единая точка входа main.tsx, кабина на всех портах. План [PLAN_PROFILE_SPACESHIP_ISOLATION.md](docs/PLAN_PROFILE_SPACESHIP_ISOLATION.md) заменён решением «унификация».

### 4.2. Панели ЛК (реализованы в ProfileView)

Все перечисленные панели открываются через `openCabinPanel` и отображаются в центре кабины. Соответствие [PROFILE_CABIN_COCKPIT_SPEC.md](docs/PROFILE_CABIN_COCKPIT_SPEC.md) и [PROFILE_CABIN_AUDIT.md](docs/PROFILE_CABIN_AUDIT.md):

| Панель | ID / ключ | Компонент |
|--------|-----------|-----------|
| Инспектор | inspector | InspectorDashboard |
| Паспорт | passport | — (редактор паспорта, аватар, ранг) |
| Отряд вожатых | counselor-squad | (SquadArchitect / создание отряда вожатых) |
| Отрядный уголок | squad-corner | SquadCornerDashboard |
| Реальный Дневник | real-diary | RealDiaryDashboard |
| Движок | team | TeamDashboard |
| Совет Лагеря | council | CouncilDashboard |
| БРО | bro | BroInitiation |
| Мастерская | workshop | — (вкладка workshop в контенте) |
| Шеринг | share | Share Center блок |
| Вожатификатор | vozhatifikator | VozhatifikatorChecklist / контент |
| 4К | profile4k | Profile4KDashboard |
| Для родителей | parents | — (роль parent) |
| Штаб Крыла | — | WingDashboard (внутри SquadArchitect/отряд вожатых) |

### 4.3. Дополнительные реализованные инициативы

Полный перечень с Evidence — в таблице инициатив и секции Completed [docs/ROADMAP_2026.md](docs/ROADMAP_2026.md). Кратко: формат событий и Webhook (Telegram/VK), ответ бота при приёме заявки, лента с лайками (Идеи Сообщества), значки на флаг отряда (категория 10), загрузка фото (Движок, Отрядный уголок, Штаб Крыла), план получения значка (качественная генерация + «Дополнить»), карточка прогресса AAA, аналитика 4К, Реальный Отряд, Совет Лагеря, Архитектор Отряда, песочница, роли и адаптация ЛК.

---

## 5. Планы и бэклог

### 5.1. Backlog (WORKFLOW §11.25)

- **P1:** подтверждение куратора, серверная синхронизация.
- **P2:** групповые коллекции/отряды, события в чаты (Telegram/VK).
- **P3:** рекомендации маршрутов, персональные подборки, аналитика прогресса.
- **Фича «Создатель Пути»:** [FEATURE_PATH_CREATOR.md](FEATURE_PATH_CREATOR.md). Разблокировка по 1.16.1/1.16.2 реализована; Мастерская, форма создания значка, «Мои предложения», отправка в сообщество — Done. Остаётся: скины/арты (переключатель в BadgeView), «Карточка Созидателя» 9:16 → модераторам, доработка BadgeIcon под внешние URL.

### 5.2. Vertical Slices (STRATEGY)

- **Slice 1–3:** Done (Social MVP, Smart Onboarding, Creator Workshop — см. ROADMAP).
- **Slice 4 «Мой арт» (локальные скины):** Not started. Идея: кастом-арт в localStorage, переключатель в BadgeView.
- **Slice 5 «Выбор сообщества»:** Частично — лента с лайками (Идеи Сообщества) реализована; сезонные паки скинов/голосование — не делались.

### 5.3. Унификация ЛК (вместо изоляции кабины)

**Статус: Done.** Принято решение об **унификации** личного кабинета: одна точка входа (main.tsx), обёртка `profile-spaceship-root` и стили profile-view-spaceship.css во всех режимах; profile-desktop.html переведён на main.tsx, main-profile-desktop.tsx удалён; multi-page build в Vite (index.html + profile-desktop.html). План «изоляции кабины» ([PLAN_PROFILE_SPACESHIP_ISOLATION.md](docs/PLAN_PROFILE_SPACESHIP_ISOLATION.md)) более не актуален.

### 5.4. FEATURE_AUTH_ROLES — что осталось

- Создание смен/отрядов организатором, полный staff-флоу.
- «Онлайн-Движки»: membership/roles, синхронизация с бэкендом.

---

## 6. Матрица «План ↔ Код»

| Пункт плана | Источник | Статус | Evidence / примечание |
|-------------|----------|--------|------------------------|
| Правила прогресса (уровни N.X.Y, агрегат N.X) | WORKFLOW §11.8 этап 1 | Done | userProgress.ts, ProgressContext.tsx |
| Личный кабинет, табы В пути/Коллекция/Журнал | WORKFLOW §11.8 этап 2 | Done | ProfileView.tsx |
| localStorage + экспорт/импорт | WORKFLOW §11.8 этап 3 | Done | ProfileView, ProgressContext |
| Статусы на карточках, фильтры CategoryView | WORKFLOW §11.8 этап 4 | Done | CategoryView.tsx, CategoriesGrid.tsx |
| Заметки/доказательства, proofForm | WORKFLOW §11.8 этап 5 | Done | ProfileView proofForm, evidence в progress |
| ЛК в current_view, ответы бота | WORKFLOW §11.8 этап 6 | Done | backend/chatbot, generateWhereAmI |
| Числа из индексов, lastUpdated | WORKFLOW §11.8 этап 7 | Done | useDataLoader masterIndex, BlueNestLanding, ProfileView и др. |
| Роли, адаптация ЛК, лимит чата, песочница | WORKFLOW этап 8 / FEATURE_AUTH | Done | authRole.ts, ProfileView, ChatBot, backend |
| Кабина космического корабля (layout, панели, консоль) | PROFILE_CABIN_* | Done | ProfileView cabin layout, profile-view-spaceship.css, main.tsx |
| Унификация ЛК (единая точка входа main.tsx) | — | Done | main.tsx (profile-spaceship-root, spaceship.css); profile-desktop.html → main.tsx; main-profile-desktop.tsx удалён; vite multi-page (index + profile-desktop); docs обновлены |
| Изоляция кабины (отдельный entry 3010) | PLAN_PROFILE_SPACESHIP_ISOLATION | Не актуальна | Заменена решением «унификация» |
| Мастерская (1.16.1/1.16.2, форма, Мои предложения) | FEATURE_PATH_CREATOR | Done | ProfileView workshop, useDataLoader customBadges |
| Slice 4 «Мой арт» | STRATEGY | Not started | — |
| Лента с лайками (Идеи Сообщества) | — | Done | useDataLoader COMMUNITY_LIKES_KEY, ProfileView |
| Webhook Telegram/VK, ответ бота при заявке | — | Done | backend/app.py, EVENTS_AND_WEBHOOKS.md |
| Значки на флаг отряда (10.x) | — | Done | SquadCornerDashboard, ProgressContext, BadgeView/BadgeLevelView |
| План получения значка (Дополнить, levelId) | — | Done | ProfileView, aiService, response_generator.py |
| Просмотр прогресса ребёнка родителем по коду/ссылке | FEATURE_AUTH_ROLES §4.5 | Done | ProfileView (отчёт, ссылка, код, модалки), backend app.py (parent-snapshot), userProgress.ts (ParentReportPayload), tech_context parent-snapshot API. |
| ИИ-изображения во всех кабинетах (OpenAI + РФ провайдеры) | gpt_image_1.5_vision / ROADMAP | Not started | Видение зафиксировано: три опции (загрузить/сгенерировать/обработать), IMAGE_PROVIDER, контексты по разделам. tech_context §ИИ-изображения, STEPA_VISION_LC, ROADMAP_2026. |

---

## 7. Оркестрация агентов (кто что делает)

**Файл:** [.cursor/agent orchestration/AGENT_ORCHESTRATION.md](.cursor/agent%20orchestration/AGENT_ORCHESTRATION.md).

**Правило:** перед началом разработки агент обязан проверить Claim Board и записать: агент (A/B/C/D/E), задачу, дату, логичный следующий шаг. Это предотвращает дублирование задач и даёт понятный маршрут 4 агентов.

**Сводка по отчётам (февраль 2026):**

| Задача | Агент | Отчёт | Файлы |
|--------|-------|-------|-------|
| Роль Organizer (RBAC) | — | AGENT_REPORT_ORGANIZER_ROLE | authRole, authStorage, ProfileView, SANDBOX_TESTING |
| MVP Смены и отряды (staff flow) | — | REPORT_STAFF_FLOW_SHIFTS_SQUADS_MVP | backend/app.py, authRole, ProfileView |
| Герб Движка UI (шаг 1) | **Agent B** | AGENT_B_SESSION_REPORT | teams.ts, TeamContext, TeamDashboard |

---

## 8. Рекомендации для обновления ROADMAP_2026.md

1. **Добавить в таблицу инициатив** строку:
   - **Статус:** Done  
   - **Название:** Кабина космического корабля (ЛК)  
   - **Evidence:** [ProfileView.tsx](src/views/ProfileView.tsx) — cabin layout (`profile-view-cabin-layout`, `panelActiveView`, `openCabinPanel`), панели Инспектор/Паспорт/Отряд вожатых/Отрядный уголок/Реальный Дневник/Движок/Совет/БРО/Мастерская/Шеринг/Вожатификатор/4К/Для родителей; нижняя консоль с кнопками и терминалом. [profile-view-spaceship.css](src/styles/profile-view-spaceship.css), [main.tsx](src/main.tsx) — `profile-spaceship-root`, подключение стилей. Сервер кабины: порт 3010, [profile-desktop.html](profile-desktop.html). [docs/PROFILE_CABIN_SERVER_SETUP.md](docs/PROFILE_CABIN_SERVER_SETUP.md).

2. **Зафиксировать явно (в «Где мы сейчас» или отдельной строкой):** «Изоляция кабины» (отдельный entry только для 3010) — **Not started**, не в приоритете. Evidence не требуется.

3. **Перекрёстные ссылки:** В ROADMAP в блоке источников добавить ссылку на настоящий документ: «Детальный прогресс и матрица планов: [WORKFLOW_PROGRESS_AND_PLANS.md](../WORKFLOW_PROGRESS_AND_PLANS.md)». Пункты из Completed и таблицы ROADMAP имеют соответствие в секциях 3–4 и матрице (секция 6) данного документа.

---

*При завершении новых задач обновлять ROADMAP_2026 (статус, Evidence), при необходимости — данный документ (матрица, раздел 4). Детальный лог — в [.memory-bank/progress.md](.memory-bank/progress.md).*
