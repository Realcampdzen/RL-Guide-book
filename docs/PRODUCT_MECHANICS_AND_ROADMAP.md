# PRODUCT SSOT — Путеводитель «Реальный Лагерь»: механики и дорожная карта

**Срез реализации (фиксируем как факт):** 2026‑02‑21  
**Назначение:** единый канонический документ по **механикам продукта** и **roadmap по фазам**.  
**Где смотреть “текущие dev‑статусы задач / Done‑evidence”:** [`docs/ROADMAP_2026.md`](ROADMAP_2026.md).  
**Источник видения по ЛК:** [`docs/STEPA_VISION_LC.md`](STEPA_VISION_LC.md).  
**Философия продукта и циклы прогресса:** [`../.memory-bank/product_logic.md`](../.memory-bank/product_logic.md).

**Изменения с 2026‑02‑19 (кратко):**
- Появился **кабинет отряда** (участники, инвайты, выход/исключение, чат) в связке с `Отрядным уголком`.
- `Отрядный уголок` стал **hybrid**: локальный черновик + общий серверный контент по `squadId`.
- Добавлены серверные API/хранилища для отрядов: `corner`, `invite-code`, `by-invite-code`, `preview`, `leave/kick`, `messages` + JSON-файлы в `backend/data/`.
- Deep link приглашения в отряд по ссылке: `?join_squad=<squadId>` (с preview + confirm + join).
- В dev окружении сидится default смена **«Реальный Лагерь 2026»** для тестов.
- Усилен RBAC для organizer/squad-flow, включая роль `camp_director` (уровень `shift_leader`) для смен/отрядов.

---

## 0) Как пользоваться этим документом

### 0.0. Prod Target (Pilot): “тест на смене” = настоящее hosted‑приложение
**Цель пилота:** подключить детей/родителей/вожатых на реальной смене так, чтобы приложение работало как сервис: данные не теряются, роли и доступы железные, чат/онлайн‑фичи безопасны.

**Что считаем “prod” для пилота (целевой стенд):**
- Frontend: Vercel (основной), GitHub Pages остаётся как демо‑хост (не как основная среда смены).
- Backend: Vercel (API), без file‑storage как источника истины.
- DB: Supabase Postgres (персистентность критичных доменов) + опционально Supabase Storage для картинок (отряд/флаг/прочее).
- cf‑api (Cloudflare) остаётся отдельным контуром ботов, но для web‑прода **все** вызовы ИИ/чат‑лимитов идут через наш backend.

**Pilot roles (минимальный состав для запуска смены):**
- `participant` (ребёнок на смене)
- `parent` (родитель, read‑only витрина ребёнка)
- `counselor` (вожатый)
- `shift_leader` (старший вожатый / руководитель смены)

**P0 сценарии пилота (must):**
- Participant: unlock по коду → вступление в отряд → “Отрядный уголок” (таб “Отряд” = кабинет) → чат отряда → заявки на значки.
- Counselor: вступление → кабинет отряда → invite/kick/leave → редактирование уголка (название/атрибутика/фото/планёрка) → изменения видны участникам.
- Shift leader: создать смену/отряды → выдавать коды (unlock и инвайты) → модерировать inbox заявок (approve/reject) → видеть стабильную орг‑картину.
- Parent: получить `parent_code/QR` → открыть read‑only отчёт (без возможности что‑то “сломать” ребёнку).

**P0 non‑functional (must):**
- Персистентность: данные смен/отрядов/уголка/чата/заявок переживают деплой и рестарт (Supabase).
- Dev‑двери закрыты в проде: dev login/sandbox UI отключены; forced traveler снят (Q5).
- Safety: минимальные лимиты и фильтры (чат/ИИ/сообщения/картинки), запрет ссылок, ограничение длины/частоты.
- Наблюдаемость: логи + алерты по 5xx/429, диагностика “что делать staff” при инцидентах.

**Runbooks / спецификации (как запускать и как мигрировать storage):**
- [`docs/CAMP_RUNBOOK.md`](CAMP_RUNBOOK.md) — как “провести смену” (T‑0 → ежедневная работа → финиш).
- [`docs/PROD_RELEASE_PLAYBOOK.md`](PROD_RELEASE_PLAYBOOK.md) — чеклисты релиза, стенды, секреты, откат, мониторинг.
- [`docs/SUPABASE_SCHEMA_AND_MIGRATION.md`](SUPABASE_SCHEMA_AND_MIGRATION.md) — схема БД и план миграции с `backend/data/*.json`.

### 0.1. Что это (и что это не)
- Это **SSOT по механикам**: как работает продукт, что уже есть, что ещё нужно, где evidence в коде.
- Это **high‑level roadmap по фазам релизов** (MVP → Beta → v1.0 → vNext), без привязки к датам.
- Это **не** список мелких тасок и не замена `docs/ROADMAP_2026.md` (там — операционный трекинг задач и “не перереализовывать Done”).

### 0.2. Область действия (scope)
Внутри:
- Web‑приложение (React/Vite) + личный кабинет (кабина).
- Backend API (Python) для: чата, ролей/кодов, смен/отрядов, Движков, заявок, картинок, родительских снепшотов, webhooks.
- Чат‑бот “НейроВалюша” как подсистема (UI + API контракты; подробности кода бота — в `chatbot/`).

Снаружи (отдельные треки / будущие фазы):
- “Мобильная игра” как отдельный продуктовый трек.
- Полный “бизнес‑продукт лагеря” (оплаты/подписки/мульти‑лагерь) — описываем как планы, если подтверждается.

### 0.3. Принципы
- Фундамент: **значки → маршруты развития**, а не “награды‑жетоны”.  
  Ориентиры: [`docs/STEPA_VISION_LC.md`](STEPA_VISION_LC.md), [`../.memory-bank/project_brief.md`](../.memory-bank/project_brief.md).
- Если непонятно, “что делает” раздел/механика: найти соответствующую **категорию/значок/уровень** в каталоге и прочитать методику там (сначала была система значков, потом поверх неё строится ЛК).
- Фокус: **4К навыки** (Коллаборация, Критическое мышление, Креативность, Коммуникация), развитие и творчество.
- Не приоритет: соревновательность (рейтинги/битвы) — только если явно решаем.

### 0.4. Определения статусов (Done / Partial / Planned)
- **Done** — механика реализована end‑to‑end в текущем репозитории: есть UI, хранение/контракты, базовые ошибки/пустые состояния.
- **Partial** — есть часть реализации, но отсутствует важный кусок (модерация, связность сущностей, серверная часть, прод‑ограничения и т.п.).
- **Planned** — описываем как целевое поведение, но в коде этого нет.

---

## 1) Источники истины (что читать и чему верить)

### 1.1. Продукт / смыслы
- Видение ЛК: [`docs/STEPA_VISION_LC.md`](STEPA_VISION_LC.md)
- Логика циклов и ролей: [`../.memory-bank/product_logic.md`](../.memory-bank/product_logic.md)
- Бриф: [`../.memory-bank/project_brief.md`](../.memory-bank/project_brief.md)

### 1.2. Текущий “Done” по задачам и Evidence
- Операционный трекер: [`docs/ROADMAP_2026.md`](ROADMAP_2026.md)

### 1.3. Техническая правда (как реально устроено)
- Техконтекст: [`../.memory-bank/tech_context.md`](../.memory-bank/tech_context.md)
- Архитектура ресурсов: [`docs/ARCHITECTURE_AND_RESOURCES.md`](ARCHITECTURE_AND_RESOURCES.md)
- Бэкенд API: [`../backend/app.py`](../backend/app.py)
- Основной UI:
  - Entry: [`../src/main.tsx`](../src/main.tsx)
 - Router: [`../src/app/AppViewRouter.tsx`](../src/app/AppViewRouter.tsx)
  - Controller: [`../src/app/useAppController.ts`](../src/app/useAppController.ts)
  - ЛК (кабина): [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx)
- Supabase (infra note): в `.env` уже есть `SUPABASE_URL` (и MCP Supabase настроен). Для hosted‑пилота/prod file‑based JSON в `backend/data/*` **нельзя** (Vercel FS ephemeral + конкуренция записей), поэтому целевой storage: Supabase Postgres (+ Storage для картинок). План миграции: [`docs/SUPABASE_SCHEMA_AND_MIGRATION.md`](SUPABASE_SCHEMA_AND_MIGRATION.md). Multi‑camp и server‑sync прогресса остаются отдельными эпиками Фазы 3/4.

---

## 2) Глоссарий и доменная модель

### 2.1. Термины (единые)
- **Категория** — группа значков (например, “БРО”, “Инспектор Пользы”).
- **Значок (Badge Base)** — сущность “маршрута” (например, `8.6`).
- **Уровень значка (Badge Level)** — конкретная ступень внутри значка (например, `8.6.1`), в UI часто живёт как отдельная страница.
- **Маршрут (“В путь”)** — пометка уровня как цели (`status=in_progress`).
- **Коллекция** — закрытые уровни (`status=achieved`).
- **Избранное** — список “хочу/важно” (baseId или levelId).
- **Пруф / подтверждение** — доказательство выполнения уровня (текст/ссылка/фото) + заявка staff (опционально/обязательно — продуктовая политика).
- **План получения значка** — чек‑лист и текст плана (ИИ + ручной черновик), с (будущей) модерацией вожатым.
- **Смена (Shift)** — организационная единица (камп/период).
- **Отряд (Squad)** — коллектив детей внутри смены (имеет “кабинет” и уголок).
- **Движок (Engine / Team)** — проектная мини‑команда по интересам, с айдентикой, планом и целями.
- **Совет Лагеря** — слой координации инициатив (идеи → обсуждение → решения → задачи → артефакты).
- **БРО** — движение подготовки будущих вожатых: Бропаспорт → Бродела → Инициация → Крыло.
- **Крыло** — мини‑отряд/структура БРО (айдентика + планирование + “посвящение отряда” через архитектор).
- **Мастерская / UGC** — контур “создателя”: предложить значок/арт/категорию, довести до канона.

### 2.2. As‑is доменная модель (как в коде сейчас)

```mermaid
flowchart TD
  subgraph StaticData[Статические данные]
    AiData[public/ai-data/*]
  end

  subgraph Client[Web-app (React)]
    Catalog[Каталог: категории/значки/уровни]
    LK[ЛК: кабина ProfileView]
    Progress[Прогресс (localStorage)]
    Auth[Роли/код/токен (localStorage)]
  end

  subgraph Backend[Backend API (Python)]
    Chat[/POST /api/chat/]
    Limits[/GET /api/chat/limits/]
    Teams[/api/teams* (Движки)/]
    Shifts[/api/shifts* (Смены)/]
    Squads[/api/squads* (Отряды)/]
    BadgeReq[/api/badges/requests* (заявки)/]
    ParentSnap[/api/parent-snapshot (код+QR)/]
    Images[/api/images/generate (ИИ картинки)/]
    Community[/api/community/badges (идеи сообщества)/]
    Webhooks[/api/webhook/* (TG/VK)/]
  end

  Catalog --> AiData
  LK --> Progress
  LK --> Auth
  LK --> Backend
```

### 2.2.1. Фрактал РЛ (camp → shift → squad → engine) — продуктовый концепт
Базовая идея из видения (и из `.cursor/putevoditel_prodroadmap_demo.md`): лагерь устроен как фрактал, где “большое отражается в малом”.

- **Camp** (лагерь/инсталляция) содержит смены.
- **Shift** (смена) создаётся staff (старший вожатый/начальник/разработчик) и задаёт рамку периода.
- **Squad** (отряд смены) создаётся staff (вожатый/старший/разработчик), участники вступают по коду/ссылке.
- **Engine / Team** (движок) — микро‑команда/проект “внутри отряда” (As‑is в коде: отдельная сущность `Team`; To‑be: гибридный scope `camp|shift|squad` по Q1).

**Ключевое расхождение с “фрактальным” видением:**  
в коде **Движок (Team)** и **Отряд (Squad)** — параллельные сущности и пока не связаны как “отряд → движки внутри отряда”.

### 2.3. To‑be доменная модель (целевое видение продукта)

```mermaid
flowchart TD
  Camp[Лагерь / Camp] --> Shift[Смена]
  Shift --> Squad[Отряд]
  Squad --> Engine[Движок (проектная группа)]

  Engine --> Council[Совет Лагеря]
  Squad --> Council
  Staff[Вожатые/Орги] --> Council

  Badges[Система значков] --> Routes[Маршруты]
  Routes --> RealActions[Реальные действия]
  RealActions --> Proofs[Пруфы/заявки]
  Proofs --> Growth[Рост 4К и прогресс]

  Workshop[Мастерская (UGC)] --> Badges
  Workshop --> Skins[Арты/скины]
```

### 2.4. Явные продуктовые расхождения (фиксируем, не “решаем молча”)
- **Движки внутри отрядов/смен** (To‑be) vs **Движки как отдельная сущность** (As‑is).  
  → **Решено (Q1):** гибридная модель — у движка есть `scope: camp | shift | squad` + опциональные `shiftId/squadId`. В коде As‑is `Team` глобальный; To‑be — добавляем scope и связи.
- **Родитель как read‑only наблюдатель** (To‑be/описано в черновике) vs **родитель как участник + доп. просмотр ребёнка** (частично As‑is).  
  → **Решено (Q2):** hybrid — у родителя есть свой ЛК/прогресс, а “режим ребёнка” всегда строго read‑only (отдельная витрина).
- **Подтверждение достижений**: что “можно отметить самому”, а что “только через staff”.  
  → **Решено (Q3):** mixed — безопасное/рефлексивное self‑claim, ключевое/социально‑значимое через staff‑апрув.
- **Совет Лагеря**: сейчас есть “обзор + генерация инициатив”, но нет протоколов/голосований.  
  → **Решено (Q4):** оставляем генератор в ближайшей фазе, добавляем персистентный список инициатив (чтобы не “улетало в воздух”); протоколы/голосования — позже.

---

## 3) Роли и доступ (матрица)

### 3.1. Роли (продуктовые определения)
Ниже — определения, которыми пользуемся в продукте (они должны совпадать с UX‑копирайтом и политикой доступов).

- **traveler / Путешественник** — режим “посмотреть и попробовать”: каталог + локальный прогресс, но без “дорогих” онлайн‑фич (чат/ИИ/модерации/онлайн‑синхронизаций).
- **participant / Участник смены** — основной пользователь MVP “на смене”: чат, ИИ‑помощь, подтверждения, принадлежность к смене/отряду, шэринг прогресса.
- **parent / Родитель** — отдельный пользователь с “своим ЛК”, плюс просмотр прогресса ребёнка через отчёт/код (см. §7.19).  
  **Решено (Q2):** hybrid — у родителя есть свой ЛК/прогресс, а “режим ребёнка” всегда строго read‑only (отдельная витрина).
- **counselor / Вожатый** — staff‑роль: разбор входящих заявок по значкам, контур отрядов/смен (в т.ч. просмотр участников).
- **educator / Педагог** — staff‑роль уровня counselor: чат, inbox заявок/планов, чтение смен/отрядов, управление отрядами (на уровне counselor). Done (M7-EDUCATOR-RBAC-A).
- **shift_leader / Старший Вожатый** — руководитель смены: staff‑flow (создание смен/отрядов, выдача кодов), модерация.
- **camp_director / Начальник лагеря** — верхняя staff‑роль уровня `shift_leader` для контуров смен/отрядов и модерации (в актуальном бэкенде включена в RBAC для organizer/squad-flow).
- **developer / Разработчик** — песочница и отладка: роль для локального dev‑входа и тестирования систем.

### 3.2. Вход / “разблокировка по коду” (As‑is в коде)
**Данные авторизации на клиенте:**
- `localStorage: rl_device_id_v1` — deviceId устройства (создаётся автоматически). Evidence: [`../src/utils/authStorage.ts`](../src/utils/authStorage.ts).
- `localStorage: rl_auth_v1` — `{ role, accessToken?, campId?, exp?, deviceId }`. Evidence: [`../src/utils/authStorage.ts`](../src/utils/authStorage.ts), [`../src/context/AuthContext.tsx`](../src/context/AuthContext.tsx).

**Основной “продовый” вход (через код):**
- UI в ЛК: “ввести код” (unlock). Evidence: [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).
- API: `POST /api/auth/verify-code` → выдаёт `accessToken` (JWT) + `role` + `campId` + `exp`. Evidence: [`../backend/app.py`](../backend/app.py).

**Песочница / dev‑ускорение:**
- `POST /api/dev/login` (только localhost) → выдаёт JWT без кода. Evidence: [`../backend/app.py`](../backend/app.py), UI-кнопки dev login в [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).
- Переключатель роли в UI (sandbox) вызывает `setRole()` и **сбрасывает старый JWT**, чтобы не было “токена от другой роли”. Evidence: [`../src/context/AuthContext.tsx`](../src/context/AuthContext.tsx), [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).

**Критичное ограничение As‑is (влияет на production):**
- В production‑сборке (`import.meta.env.PROD`) клиент **принудительно возвращает роль `traveler`**, даже если в `rl_auth_v1` записано другое.  
  Это safety‑ограничение, но оно делает роли/чат/часть staff‑фич **фактически отключёнными в проде**, пока не будет принято продуктово‑инженерное решение. Evidence: [`../src/utils/authStorage.ts`](../src/utils/authStorage.ts).

### 3.3. Матрица доступов (As‑is, срез 2026‑02‑21)
Легенда: **Да** / **Нет** / **Частично** (есть UI, но ограничено ролью/токеном/бэкендом).

| Действие / механика | traveler | participant | parent | counselor | educator | shift_leader | camp_director | developer |
|---|---|---|---|---|---|---|---|---|
| Смотреть каталог (категории/значки/уровни) | Да | Да | Да | Да | Да | Да | Да | Да |
| Вести локальный прогресс (В путь/Коллекция/Журнал/Избранное) | Да | Да | Да | Да | Да | Да | Да | Да |
| Чат “НейроВалюша” (POST /api/chat) | Нет | Да | Да | Да | Нет | Да | Да | Да |
| “Дорогие” онлайн‑действия (ИИ‑планы, ИИ‑картинки и т.п.) | Нет | Да | Да | Да | Нет | Да | Да | Да |
| Отправить заявку на подтверждение уровня | Нет | Да | Да | Нет | Нет | Нет | Нет | Да |
| Разбирать входящие заявки (inbox) | Нет | Нет | Нет | Да | Да | Да | Да | Да |
| Список смен/отрядов (read-only) | Нет | Да | Нет | Да | Да | Да | Да | Да |
| Управление сменами/отрядами (создать/удалить/выдать код) | Нет | Нет | Нет | **Частично** | **Частично** | Да | Да | Да |
| Вступить в отряд (join по `squadId`, из кода/ссылки) | Нет | Да | Нет | Да | Да | Да | Да | Да |
| Кабинет/участники отряда (через /api/squads/mine) | Нет | Да | Нет | Да | Да | Да | Да | Да |
| Просмотр прогресса ребёнка (отчёт/код/QR) | Да | Да | Да | Да | Да | Да | Да | Да |
| UGC: кастомные значки (локально) | Да | Да | Да | Да | Да | Да | Да | Да |
| UGC: публикация в сообщество (API /api/community/badges) | Да | Да | Да | Да | Да | Да | Да | Да |

### 3.4. Несостыковки RBAC (As‑is) и продуктовые решения
Фиксируем расхождения как “требует решения”, а не как “мелкий баг”.

- **PROD‑ограничение роли (`traveler` forced)** ломает часть смысловых ролей в production UX (чат, staff, модерация).  
  → см. Q5 (добавлено): политика ролей в проде.
- **`educator`**: роль полностью включена в backend RBAC на уровне counselor: чат, inbox заявок/планов, shifts/squads read и management. Done (M7-EDUCATOR-RBAC-A).
- **`camp_director`**: на срез 2026‑02‑21 роль уже включена в server RBAC для organizer/squad-flow (уровень `shift_leader`). Ранее отмеченный mismatch закрыт.

---

## 4) Игровые циклы (loops)

### 4.1. Core Loop: “Маршрут развития”
1) Пользователь открывает каталог → находит значок/уровень.  
2) Добавляет уровень **“В путь”** → появляется маршрут и (опционально) план получения.  
3) Делает действия в реальности → фиксирует рефлексию/пруф.  
4) Завершает уровень: либо сам отмечает (если политика разрешит), либо отправляет заявку staff.  
5) Получает “achieved” → растёт Ранг → сохраняется в Коллекции и Журнале → появляется возможность поделиться карточкой прогресса.

Evidence: каталог (`src/views/*`, `public/ai-data/*`), прогресс (`src/context/ProgressContext.tsx`), ЛК (`src/views/ProfileView.tsx`), заявки (`src/utils/badgeApprovalApi.ts`, `backend/app.py`).

### 4.2. Social / Viral Loop: “Карточки и приглашения”
- При ачивках и ключевых действиях продукт предлагает **создать карточку** (stories 9:16 / wide 16:9), сохранить/поделиться.  
- Есть “Пригласить друзей” и шаринг ссылок на значки (`?view=badge&badgeId=...`).  
- Отдельный контур: “родительский просмотр” (отчёт/код/QR) как безопасный шаринг прогресса ребёнка.

Evidence: [`../src/utils/socialGenerator.ts`](../src/utils/socialGenerator.ts), [`../src/app/useAppController.ts`](../src/app/useAppController.ts), “Parents” в [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx), `backend/app.py` (`/api/parent-snapshot`).

### 4.3. Creator Loop: “UGC / Мастерская”
1) Пользователь в Мастерской создаёт кастомный значок / арт / инициативу.  
2) Публикует в “сообщество” → получает реакции (лайки) → (опционально) Telegram‑уведомление “карточка созидателя”.  
3) Лучшие идеи переводятся в канон (To‑be: через модерацию и data‑pipeline в `public/ai-data`).

Evidence: [`../src/hooks/useDataLoader.ts`](../src/hooks/useDataLoader.ts), [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx), `backend/app.py` (`/api/community/badges`, `/api/telegram/notify-creator-card`).

---

## 5) Поверхности продукта (Public + ЛК)

### 5.1. Public (до входа в ЛК)
Поверхности из роутера (фактически SSOT по “экранам”):
- Intro/Landing: `BlueNestLanding` (старт, быстрые входы, чат). Evidence: [`../src/components/BlueNestLanding.tsx`](../src/components/BlueNestLanding.tsx), [`../src/app/AppViewRouter.tsx`](../src/app/AppViewRouter.tsx).
- Категории: `CategoriesGrid`, `CategoriesScreen`. Evidence: [`../src/components/CategoriesGrid.tsx`](../src/components/CategoriesGrid.tsx), [`../src/views/CategoriesScreen.tsx`](../src/views/CategoriesScreen.tsx).
- Страница категории: `CategoryView`. Evidence: [`../src/views/CategoryView.tsx`](../src/views/CategoryView.tsx).
- Страница значка: `BadgeView`. Evidence: [`../src/views/BadgeView.tsx`](../src/views/BadgeView.tsx).
- Уровень значка: `BadgeLevelView`. Evidence: [`../src/views/BadgeLevelView.tsx`](../src/views/BadgeLevelView.tsx).
- Подсказка по категории: `IntroductionView` (markdown → HTML). Evidence: [`../src/views/IntroductionView.tsx`](../src/views/IntroductionView.tsx), [`../src/utils/markdown.ts`](../src/utils/markdown.ts).
- Доп. материалы: `AdditionalMaterialView`. Evidence: [`../src/views/AdditionalMaterialView.tsx`](../src/views/AdditionalMaterialView.tsx).
- “О лагере”: `AboutCampView`. Evidence: [`../src/views/AboutCampView.tsx`](../src/views/AboutCampView.tsx).
- Форма записи: `RegistrationFormView`. Evidence: [`../src/views/RegistrationFormView.tsx`](../src/views/RegistrationFormView.tsx).
- Вход в ЛК: `ProfileView` (через `currentView === 'profile'`). Evidence: [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx), [`../src/app/AppViewRouter.tsx`](../src/app/AppViewRouter.tsx).

### 5.2. ЛК “Космическая кабина” (ProfileView)
**Метафора:** кабина — это хаб прогресса + “панели управления” механиками лагеря.

**Runbook/операционка (pilot/prod):**
- [`docs/CAMP_RUNBOOK.md`](CAMP_RUNBOOK.md)
- [`docs/PROD_RELEASE_PLAYBOOK.md`](PROD_RELEASE_PLAYBOOK.md)
- [`docs/SUPABASE_SCHEMA_AND_MIGRATION.md`](SUPABASE_SCHEMA_AND_MIGRATION.md)

**Навигационные слои As‑is:**
- **Табы (центральный контент):** `active` (В пути), `favorites` (Избранное), `collection` (Коллекция), `journal` (Журнал), `squads` (Смены и отряды), `workshop` (служебный/глубокий вход, открывается по `#workshop`). Evidence: [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).
- **Панели кабины (panel views):** `passport`, `inspector`, `profile4k`, `wing`, `team`, `council`, `bro`, `squad-corner`, `real-diary`, `vozhatifikator`, `workshop`, `share`, `parents`. Evidence: [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).
- **To‑be (продуктово):** отдельный вход/панель “Отряд вожатых” (см. §7.7.1) как ключевая механика staff-коллектива. Сейчас в коде есть локальный контур (`CounselorSquadContext`), но нет стабильного UX-входа в `ProfileView.tsx`.
- **Пузырьки-утилиты:** роль (sandbox), “войти по коду”, входящие заявки, и т.д. Evidence: [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).

**Технические особенности UX:**
- “Spaceship mode” задаётся обёрткой `.profile-spaceship-root` и стилями. Evidence: [`../src/main.tsx`](../src/main.tsx), [`../src/styles/profile-view-spaceship.css`](../src/styles/profile-view-spaceship.css).
- Онбординг‑туториал с подсветкой элементов. Evidence: [`../src/context/HintOverlayContext.tsx`](../src/context/HintOverlayContext.tsx), [`../src/components/SmartHint.tsx`](../src/components/SmartHint.tsx), сценарий в [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).

---

## 6) Feature Inventory (инвентаризация механо‑поверхностей из кода)

Цель раздела — “быстрый индекс” по продукту: что есть, где это в UI, где данные/сервер, и какой статус на срез 2026‑02‑21.  
Детали каждой механики раскрыты в §7.

| Механика / раздел | Статус | Evidence (UI) | Evidence (данные / API / хранилище) |
|---|---|---|---|
| 1) Каталог значков (категории → значки → уровни) | Done | `src/views/CategoriesScreen.tsx`, `src/views/CategoryView.tsx`, `src/views/BadgeView.tsx`, `src/views/BadgeLevelView.tsx`, `src/components/CategoriesGrid.tsx` | `public/ai-data/*`, загрузка: `src/hooks/useDataLoader.ts`, кэш: `src/utils/dataCache.ts`, `public/sw.js` |
| 2) Прогресс: “В путь / Избранное / Коллекция / Журнал” + лимиты + Ранг | Done | `src/views/ProfileView.tsx` (табы), `src/components/BadgeIcon.tsx` | `src/context/ProgressContext.tsx` (`rl_guide_progress_v1`, лимиты MAX_PATH_BADGES/MAX_FAVORITES), `src/types/userProgress.ts` (`getRank`) |
| 3) План получения значка (ИИ + ручной план + чеклист) | Partial | `src/views/ProfileView.tsx` (модал “План получения”) | `src/types/userProgress.ts` (`IBadgePlan`), `src/utils/aiService.ts` (`fetchBadgePlan`, `structureUserPlan`), хранение в `rl_guide_progress_v1` |
| 4) Подтверждение уровней (заявки → inbox staff → approve/reject) + Telegram уведомления | Done | `src/views/BadgeLevelView.tsx` (форма пруфа), `src/views/ProfileView.tsx` (пузырёк “Входящие заявки”) | `src/utils/badgeApprovalApi.ts`, `backend/app.py` (`/api/badges/requests*`, `/api/telegram/notify-achievement`), локальное применение: `ProgressContext.applyApprovedLevel()` |
| 5) Арты/скины значков (classic/realism/AI/мой арт) + лимиты | Partial | `src/components/BadgeSkinPanel.tsx`, `src/views/BadgeView.tsx`, `src/views/BadgeLevelView.tsx` | `ProgressContext` (`generatedBadgeSkins`, `customBadgeImages`, `approvedBadgeSkins`, `badgeArtProposals`), `backend/app.py` (`/api/images/generate`) |
| 6) Движки (Team/Engine): создать/вступить/инвайт, цели, флаг/герб, план-сетки, путь | Done | `src/components/TeamDashboard.tsx`, `src/views/ProfileView.tsx` (панель `team`) | `src/context/TeamContext.tsx`, `backend/app.py` (`/api/teams*`, `/api/images/generate` context=gerb/team_flag) |
| 7) Смены и отряды (Shift/Squad): список, создание/удаление, вступление по коду/ссылке | Done | `src/views/ProfileView.tsx` (таб `squads`, organizer‑модалки, “Мой отряд”) | `backend/app.py` (`/api/shifts*`, `/api/shifts/<id>/squads*`, `DELETE /api/shifts/<id>`, `DELETE /api/squads/<id>`), `backend/data/shifts.json` |
| 7.1) Кабинет отряда (server squad cabinet): участники, инвайты, leave/kick, чат, инфо уголка | Done | `src/components/SquadCabinetPanel.tsx`, `src/components/SquadChat.tsx`, `src/views/ProfileView.tsx` (панель `squad-corner`, таб “Отряд”) | `backend/app.py` (`/api/squads/mine`, `/api/squads/<id>/invite-code`, `/api/squads/by-invite-code`, `/api/squads/<id>/preview`, `/api/squads/<id>/leave`, `/api/squads/<id>/members/<deviceId>`, `/api/squads/<id>/messages`), `backend/data/memberships.json`, `backend/data/squad_invites.json`, `backend/data/squad_messages.json`, `backend/data/squad_corners.json` |
| 7.2) Отряд вожатых (Counselor Squad): отдельная игровая механика staff‑коллектива | Partial | `src/context/CounselorSquadContext.tsx`, `src/components/CounselorSquadDashboard.tsx` | localStorage: `rl_counselor_squad_*`, deep‑link `?counselor_squad=...`; To‑be: server‑синхронизация уровня Squad (участники/чат/план/атрибутика) |
| 8) Отрядный уголок (Squad Corner): hybrid (локальный черновик + server shared) | Done (hybrid) | `src/components/SquadCornerDashboard.tsx`, `src/views/ProfileView.tsx` (панель `squad-corner`) | local draft: `rl_guide_progress_v1` (`userData.diaryProgress.squad`), server shared: `GET/PATCH /api/squads/<id>/corner` → `backend/data/squad_corners.json` |
| 9) Совет Лагеря (обзор + ИИ‑инициативы) | Partial | `src/components/CouncilDashboard.tsx`, `src/views/ProfileView.tsx` (панель `council`) | `src/utils/aiService.ts` (`fetchCouncilInitiative` → `/api/chat`), связь с Движками через `useTeam` |
| 10) Реальный Дневник (записи, “беспорядок дня”, карточка/шеринг) | Done | `src/components/RealDiaryDashboard.tsx`, `src/views/ProfileView.tsx` (панель `real-diary`) | `userData.diaryProgress` (`rl_guide_progress_v1`), шэринг: `src/utils/socialGenerator.ts`, Telegram share link в `RealDiaryDashboard` |
| 11) Инспектор Пользы (миссии/чеклисты, прогрессия, связь с дневником) | Done | `src/components/InspectorDashboard.tsx`, `src/views/ProfileView.tsx` (панель `inspector`) | `src/types/inspector.ts`, `userData.inspectorProgress` (`rl_guide_progress_v1`) |
| 12) БРО (бропаспорт/бродела/инициация) | Done | `src/components/BroInitiation.tsx`, `src/views/ProfileView.tsx` (панель `bro`) | `userData.broProgress` (`rl_guide_progress_v1`), миссии: `backend/app.py` (`/api/bro-missions`) |
| 13) Крыло (айдентика, планёрки/план‑сетки, “посвящение отряда”) | Done | `src/components/WingDashboard.tsx`, `src/components/SquadArchitect.tsx` | `userData.broProgress.wing*` (`rl_guide_progress_v1`), картинки: `/api/images/generate` (контекст “wing” в UI) |
| 14) 4К‑профиль и программа РЛ 2026 (расчёт + ИИ‑характеристика) | Done | `src/components/Profile4KDashboard.tsx`, `src/views/ProfileView.tsx` (панель `profile4k`) | `src/utils/profile4k.ts`, `src/utils/aiService.ts` (`fetchPedagogy4k`) |
| 15) Вожатификатор + “Путеводные огни” (чеклист) | Done | `src/components/VozhatifikatorChecklist.tsx`, viewer в `ProfileView` | `src/data/vozhatifikatorChecklist.ts`, `userData.vozhatifikatorChecklist` (`rl_guide_progress_v1`) |
| 16) Мастерская/UGC (кастомные значки, публикация, лента/лайки, карточка созидателя) | Done | `src/views/ProfileView.tsx` (панель `workshop`) | `src/hooks/useDataLoader.ts` (custom/community + лайки), `backend/app.py` (`/api/community/badges`, `/api/telegram/notify-creator-card`) |
| 17) Соцкарточки / Share Center (+ карточки прогресса) | Partial | `src/views/ProfileView.tsx` (панель `share`) + точки входа | `src/utils/socialGenerator.ts` (kinds/formats), deep‑links `?view=badge` в `src/app/useAppController.ts` (To‑be: триггеры “в моменте”) |
| 18) НейроВалюша (чат + контекст + лимиты) | Partial | `src/components/ChatBot.tsx` (Radix Dialog), триггеры в landing/каталоге/ЛК | `backend/app.py` (`/api/chat`, `/api/chat/limits`), Cloudflare endpoint fallback (см. `ChatBot.tsx`, `aiService.ts`) |
| 19) Экспорт/импорт/сброс + родительский просмотр (file/link/code/QR) | Done | `src/views/ProfileView.tsx` (раздел “Для родителей”, модалки) | `ProgressContext.exportData/importData/resetProgress`, `src/types/userProgress.ts` (`buildParentReportPayload`), `backend/app.py` (`/api/parent-snapshot`) |
| 20) Онбординг/подсказки (tutorial + SmartHint) | Done | `ProfileView` tutorial, `TeamDashboard` hints | `src/context/HintOverlayContext.tsx`, `src/components/SmartHint.tsx` |
| 21) Service Worker / offline‑first кэш | Done | регистрация в `src/main.tsx` | `public/sw.js` (HTML network‑first, ai‑data SWR, assets/images cache‑first), локальный ai‑data кэш: `src/utils/dataCache.ts` |

---

## 7) Механики (как “должно работать”) + срез реализации (As‑is) + To‑be

Шаблон для каждой механики:
- **Зачем пользователю (value)**
- **UX (экраны/панели/CTA)**
- **Данные/состояния** (localStorage vs backend)
- **Гейты/разблокировки** (роли, лимиты, “дорогие” действия)
- **Интеграции** (ИИ, Telegram/VK, шеринг, лимиты)
- **Статус** (Done / Partial / Planned) на срез 2026‑02‑21
- **Evidence** (ключевые файлы/эндпоинты)
- **Открытые вопросы** (`[Вопрос к Стёпе]`)

### 7.1. Система значков: категории → значки → уровни

- **Value:** единая “карта развития” лагерных (и творческих) навыков; контент, который объясняет, что и как делать.
- **UX:**
  - Категории → карточка категории → список значков → карточка значка → карточка уровня.
  - Подсказки/введение по категории и дополнительные материалы (как “учебник + методика” внутри каталога).
- **Данные/состояния (As‑is):**
  - Источник: `public/ai-data/*` (JSON значков + markdown интро/материалов). Evidence: [`../public/ai-data`](../public/ai-data).
  - Загрузка и нормализация: [`../src/hooks/useDataLoader.ts`](../src/hooks/useDataLoader.ts).
  - Кэш: `localStorage` через [`../src/utils/dataCache.ts`](../src/utils/dataCache.ts) + офлайн‑кэш через Service Worker [`../public/sw.js`](../public/sw.js).
  - ID‑схема: “baseId” берётся как первые 2 сегмента `X.Y` (уровни `X.Y.1`, `X.Y.2`…), что важно для прогресса/скинов/шеринга. Evidence: `baseBadgeIdFrom()` в [`../src/hooks/useDataLoader.ts`](../src/hooks/useDataLoader.ts).
- **Гейты:** каталог доступен всем ролям; гейтятся не страницы, а “дорогие” действия (ИИ/чат/онлайн‑модерация) — см. §3.
- **Интеграции:** deep‑link на значок `?view=badge&badgeId=...`. Evidence: [`../src/app/useAppController.ts`](../src/app/useAppController.ts).
- **Статус:** **Done**.
- **Evidence (UI):** [`../src/views/CategoriesScreen.tsx`](../src/views/CategoriesScreen.tsx), [`../src/views/CategoryView.tsx`](../src/views/CategoryView.tsx), [`../src/views/BadgeView.tsx`](../src/views/BadgeView.tsx), [`../src/views/BadgeLevelView.tsx`](../src/views/BadgeLevelView.tsx).
- **Evidence (API):** у бэкенда есть `GET /api/categories`/`/api/badges`, но текущий web‑клиент их **не использует** (источник — `public/ai-data`). Evidence: [`../backend/app.py`](../backend/app.py).

### 7.2. Прогресс и коллекционирование: “В путь / Избранное / Коллекция / Журнал” + Ранг

- **Value:** дать игроку ясный “пульт управления” развитием: выбрать маршруты, фиксировать достижения, видеть рост.
- **UX (As‑is):**
  - ЛК: табы **В пути / Избранное / Коллекция / Журнал**.
  - В карточках значков/уровней: CTA “В путь”, “Избранное”, “Получено/Достигнуто”, “Рефлексия/пруф”.
  - “Паспорт” показывает ник/статус/био и агрегированный прогресс (ранг/счётчики).
- **Данные/состояния (As‑is):**
  - Главный стор: `localStorage: rl_guide_progress_v1` (schemaVersion=2). Evidence: [`../src/context/ProgressContext.tsx`](../src/context/ProgressContext.tsx).
  - Статусы уровня: `locked | available | in_progress | achieved`. Evidence: [`../src/types/userProgress.ts`](../src/types/userProgress.ts).
  - Лимиты: `MAX_PATH_BADGES=10`, `MAX_FAVORITES=10`. Evidence: [`../src/context/ProgressContext.tsx`](../src/context/ProgressContext.tsx).
  - Ранг: вычисляется по числу достигнутых уровней. Evidence: `getRank()` в [`../src/types/userProgress.ts`](../src/types/userProgress.ts).
- **Гейты:** traveler может вести локальный прогресс, но не может отправлять “дорогие” запросы (см. §3).
- **Интеграции:** соцкарточки и “манифест маршрута” используют этот прогресс как вход (см. §7.17).
- **Статус:** **Done**.
- **Evidence (UI):** [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx), [`../src/components/BadgeIcon.tsx`](../src/components/BadgeIcon.tsx).

### 7.3. План получения значка (ИИ + ручной черновик + чеклист)

- **Value:** помочь ребёнку превратить “хочу значок” в понятный план действий и шагов на смену.
- **UX (As‑is):**
  - В ЛК открывается модал “План получения: <значок>” с контекстом смены (день/длина) и полями (план‑сетка/приоритет/черновик).
  - Два режима: **ИИ‑генерация** и **ручной список** (с возможной “структуризацией” ИИ по черновику).
  - Чеклист шагов отмечается по мере выполнения.
- **Данные/состояния (As‑is):**
  - Модель: `IBadgePlan` (status + context + planText + checklist). Evidence: [`../src/types/userProgress.ts`](../src/types/userProgress.ts).
  - Хранение: внутри `rl_guide_progress_v1` (`userData.badgePlans`). Evidence: [`../src/context/ProgressContext.tsx`](../src/context/ProgressContext.tsx).
  - ИИ: `fetchBadgePlan()` и `structureUserPlan()` используют `/api/chat` (локально) или Cloudflare endpoint (в прод‑режиме). Evidence: [`../src/utils/aiService.ts`](../src/utils/aiService.ts).
- **Гейты:** traveller не может вызывать ИИ; нужен unlock по коду (см. §3).
- **Интеграции:** план можно переслать в Telegram как текст (As‑is реализовано через ссылку `t.me/...`). Evidence: [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).
- **Статус:** **Partial** (есть генерация/сохранение/чеклист, но нет нормализованного staff‑workflow “отправить план → апрув вожатого → статус approved на сервере”).
- **Evidence (UI):** [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).
- **Evidence (AI):** [`../src/utils/aiService.ts`](../src/utils/aiService.ts), `backend/app.py` (`/api/chat`).
- **Решено:** должна быть возможность апрува плана вожатым, но план можно использовать и как личный инструмент.
- **Решено (истина):** hybrid — local draft + backend (offline-first + sync). As‑is план хранится в `rl_guide_progress_v1`; To‑be добавляем server‑workflow и статусы/апрув.

### 7.4. Подтверждение/модерация достижений: заявки, inbox staff, approve/reject, Telegram

- **Value:** сохранить “реальность” достижений и при этом не убить мотивацию: ребёнок фиксирует опыт, staff подтверждает важное.
- **UX (As‑is):**
  - Уровень значка: форма пруфа (рефлексия/влияние/ссылка + опционально фото) → “Отправить заявку”.
  - ЛК: “Входящие заявки” (staff) + “Мои заявки” (участник) + “Синхронизировать подтверждения” (применить approvals к локальному прогресс‑стору).
- **Данные/состояния (As‑is):**
  - Backend хранит заявки в `backend/data/badge_requests.json` (status: pending/approved/rejected) + метаданные campId/squadId. Evidence: [`../backend/app.py`](../backend/app.py).
  - Клиент создаёт/читает заявки через [`../src/utils/badgeApprovalApi.ts`](../src/utils/badgeApprovalApi.ts).
  - После апрува staff пользователь подтягивает “мои approvals” и локально применяет `applyApprovedLevel(levelId, evidence)`. Evidence: [`../src/context/ProgressContext.tsx`](../src/context/ProgressContext.tsx).
- **Гейты/разблокировки:**
  - Отправка заявки требует `accessToken` и роли `participant|parent|developer`. Evidence: `canRequestBadgeApproval()` в [`../src/types/authRole.ts`](../src/types/authRole.ts), `backend/app.py` (`/api/badges/requests`).
  - Разбор inbox доступен на сервере `counselor|shift_leader|camp_director|developer`. Evidence: `backend/app.py` (`/api/badges/requests/inbox`).
- **Интеграции (As‑is):**
  - Telegram‑уведомление о достижении/заявке: `POST /api/telegram/notify-achievement`. Evidence: [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx), [`../backend/app.py`](../backend/app.py).
- **Статус:** **Done** (end‑to‑end: заявка → inbox → approve/reject → синк в прогресс).
- **Решено (Q3):** mixed — “бытовые/рефлексивные/безопасные” self‑claim, “ключевые/БРО/социально значимые/с риском читинга” через staff.
- **To‑be:** зафиксировать это в контенте (ai-data) флагом типа `requiresApproval`, чтобы UX был однозначный.

### 7.5. Арты/скины значков (classic/realism/AI/мой арт) + предложения арта

- **Value:** визуальная идентичность значков и “творческий слой” поверх прогресса: ребёнок делает значок “своим”.
- **UX (As‑is):**
  - На странице значка/уровня — панель “Скин”: переключение варианта (default/realism/AI/мой арт/одобренные).
  - Генерация ИИ‑скина в модалке: превью → сохранить в слот (до лимита).
  - “Мой арт”: загрузка изображения (dataURL) и использование как основной иконки.
  - “Предложить арт”: формирование заявки‑предложения (локально) для будущей модерации.
- **Данные/состояния (As‑is):**
  - `selectedSkins[badgeBaseId]` + `generatedBadgeSkins` + `customBadgeImages` + `approvedBadgeSkins` + `badgeArtProposals`. Evidence: [`../src/types/userProgress.ts`](../src/types/userProgress.ts), [`../src/context/ProgressContext.tsx`](../src/context/ProgressContext.tsx).
  - Лимиты: `MAX_BADGE_AI_SKINS`, `MAX_BADGE_APPROVED_ARTS`. Evidence: [`../src/utils/badgeSkins.ts`](../src/utils/badgeSkins.ts).
  - ИИ‑генерация: `POST /api/images/generate` (`context=badge_skins`, mode generate/process). Evidence: [`../src/components/BadgeSkinPanel.tsx`](../src/components/BadgeSkinPanel.tsx), [`../backend/app.py`](../backend/app.py).
- **Гейты:** traveler не может вызывать ИИ; “мой арт” доступен как локальная функция, но продуктово можем тоже гейтить (решение).
- **Статус:** **Partial** (UX и локальная модель есть; но “канонизация арта” и модерация/публикация в общий каталог пока не сведены в серверный workflow).
- **Решено:** нужно и локальное (“мой арт”), и серверная модерация/канон/список одобренных (To‑be: workflow публикации + модерации).

### 7.6. Движки (Team/Engine): создание/вступление/инвайт, цели, флаг/герб, планёрка, “путь Движка”

- **Value:** микро‑сообщество по интересам: ребёнок учится соуправлению, инициативам и проектной деятельности.
- **UX (As‑is):**
  - “Мой Движок”: создать или вступить по коду (`T-XXXXXX`), видеть экипаж, цели/девиз.
  - “План Движка”: план‑сетки (две сетки, 9/21 день, поля “утро/тихий час/день/вечер/ночь”).
  - “Путь Движка”: подборка значков Движка (категория 8) как “требования и рост Движка”.
  - Инвайт по ссылке: URL param `?engine=<base64(JSON)>` автозаполняет вступление. Evidence: [`../src/components/TeamDashboard.tsx`](../src/components/TeamDashboard.tsx).
  - Визуал Движка: флаг + герб (с генерацией/обработкой ИИ, 9:16 для герба).
- **Данные/состояния (As‑is):**
  - Backend: `GET/POST /api/teams`, `GET /api/teams/mine`, `POST /api/teams/<id>/join`, `POST /api/teams/<id>/leave`, `PATCH /api/teams/<id>`. Evidence: [`../backend/app.py`](../backend/app.py).
  - Клиентский контекст: [`../src/context/TeamContext.tsx`](../src/context/TeamContext.tsx).
  - ИИ‑картинки: `POST /api/images/generate` (`context=team_flag|gerb`). Evidence: [`../src/components/TeamDashboard.tsx`](../src/components/TeamDashboard.tsx), [`../src/components/ImageSourceBlock.tsx`](../src/components/ImageSourceBlock.tsx), [`../backend/app.py`](../backend/app.py).
- **Гейты:** для серверных операций нужен `accessToken` (unlock по коду). Traveler видит UI, но должен “разблокировать” дорогие действия. Evidence: `FeatureGate` в [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).
- **Статус:** **Done (As‑is)** — движки работают как отдельная сущность `Team`.
- **Решено (Q1):** To‑be гибрид — у движка есть `scope: camp | shift | squad` + опциональные `shiftId/squadId` (с постепенной привязкой к отряду/смене без ломки As‑is).
- **To‑be (roadmap):**
  - Добавить `scope` и связи в модель движка (и отображение “Движки моего отряда” в кабинете отряда).
  - Доработать RBAC/видимость движков в рамках `shift/squad`.

### 7.7. Смены и отряды (Shift/Squad): список, создание, вступление, кабинет отряда

- **Value:** организационный контур лагеря: “кто в какой смене/отряде”, доступы staff и общие поверхности отряда (уголок/кабинет/чат).
- **UX (As‑is, срез 2026‑02‑21):**
  - В ЛК есть таб **“Смены и отряды”**: список смен/отрядов + блок **“Мой отряд”**.
  - Участник видит read‑only список отрядов смены и может вступить:
    - **по коду приглашения** (resolve → confirm → join),
    - **по ссылке** `?join_squad=<squadId>` (preview → confirm → join).
  - Клик по строке отряда в списке:
    - если уже в этом отряде → сразу открывается кабинет (через “Отрядный уголок”),
    - если в другом → confirm → join (одно membership на устройство) → открыть кабинет.
  - Staff (и частично counselor) управляет сменами/отрядами: создать смену/отряд, удалить, выдать инвайт‑код.
  - В dev окружении для тестов сидится default смена **“Реальный Лагерь 2026”**.
- **Данные/состояния (As‑is):**
  - Хранилища:
    - смены/отряды: `backend/data/shifts.json`,
    - membership устройства: `backend/data/memberships.json`.
  - API смен/отрядов:
    - `GET/POST /api/shifts`, `DELETE /api/shifts/<shiftId>` (409 `reason=default_shift` для seeded‑смены),
    - `GET/POST /api/shifts/<shiftId>/squads` (в `GET` добавляется `avatarUrl`, агрегированный из уголка),
    - `DELETE /api/squads/<squadId>` (hard delete + чистка связанных данных).
  - API вступления/кабинета:
    - `POST /api/squads/<squadId>/join`,
    - `GET /api/squads/mine` (membership + `members` + `participants` + meta отряда/смены),
    - инвайты: `POST /api/squads/<squadId>/invite-code` → `GET /api/squads/by-invite-code?code=...` → `join`,
    - preview для join‑ссылки: `GET /api/squads/<squadId>/preview`.
- **RBAC / гейты (As‑is):**
  - Read‑only список смен/отрядов: `participant|counselor|shift_leader|camp_director|developer` (traveler не читает).
  - Управление сменами/отрядами: `shift_leader|camp_director|developer`; `counselor` может создавать отряды только в своей смене (campId), а в dev‑sandbox допускается без `campId` только для seeded‑смены.
  - Membership: **одно активное membership на устройство**; join в другой отряд заменяет текущую привязку (поэтому в UI отряд может быть в списке, но вы в нём не состоите).
- **Prod notes (pilot/prod):**
  - File‑storage в `backend/data/*.json` подходит для local dev, но не для hosted prod → для пилота обязателен Supabase (см. [`docs/SUPABASE_SCHEMA_AND_MIGRATION.md`](SUPABASE_SCHEMA_AND_MIGRATION.md)).
  - Одно membership на устройство = UX должен явно показывать “вы сейчас в отряде X” и запрашивать confirm перед join в другой отряд.
- **Статус:** **Done** (экосистема смен/отрядов + кабинет отряда как продуктовый MVP).
- **Evidence:** [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx), [`../src/components/SquadCabinetPanel.tsx`](../src/components/SquadCabinetPanel.tsx), [`../backend/app.py`](../backend/app.py).

#### 7.7.1. Отряд вожатых (Counselor Squad) — ключевая механика staff‑коллектива (As‑is: локальный прототип)

- **Продуктовый смысл:** у вожатых есть “свой отряд” (коллектив) с лидером **Старший вожатый (`shift_leader`)**: традиции, планёрка, расписание, атрибутика, чат и рабочие артефакты.
- **Целевая аудитория (To‑be):** `counselor|educator|shift_leader|camp_director` (+ `developer` в sandbox).
- **As‑is в коде (честно):**
  - Есть локальный контур `CounselorSquadContext` + `CounselorSquadDashboard`.
  - Вступление по коду/ссылке через `?counselor_squad=CODE`, хранение в localStorage (`rl_counselor_squad_*`).
  - **Нет стабильного UX‑входа в ЛК** (в `ProfileView.tsx` сейчас нет panel view/кнопки “Отряд вожатых”), поэтому механика фактически “спрятана”.
  - Нет server‑shared состояния, участников и чата (в отличие от `Squad`).
- **Статус:** **Partial** (механика важная, но не доведена до продуктового уровня).
- **To‑be (roadmap):**
  - Довести “Отряд вожатых” до уровня server‑Squad‑кабинета: участники, инвайты, чат, общий уголок/план/атрибутика.
  - Решить доменную модель:
    - отдельная server‑сущность `StaffSquad`, или
    - расширение `Squad` с `kind: participant|staff` (и отдельным RBAC/видимостью).
- **Evidence:** [`../src/context/CounselorSquadContext.tsx`](../src/context/CounselorSquadContext.tsx), [`../src/components/CounselorSquadDashboard.tsx`](../src/components/CounselorSquadDashboard.tsx).

### 7.8. Отрядный уголок (Squad Corner): hybrid (локальный черновик + server shared) + вход в кабинет

- **Value:** общий “дом отряда” и единая точка входа в кабинет: традиции, атрибутика, планирование, чат и участники.
- **UX (As‑is):**
  - Панель “Отрядный уголок” (`panel=squad-corner`) с табами: “Отряд”, “Фото”, “Планёрка”, “Значки на флаг”.
  - Таб **“Отряд”**:
    - если membership есть → рендерим **кабинет отряда** (участники/инвайты/чат + read‑only инфо уголка),
    - если membership нет → показываем wizard (что нужно заполнить/сделать) + вступление/создание.
  - Редактирование уголка доступно staff‑ролям (в первую очередь `counselor`; dev‑sandbox тоже), участники читают контент через кабинет.
- **Данные/состояния (As‑is):**
  - Local draft: `rl_guide_progress_v1` (`userData.diaryProgress.squad`).
  - Server shared: `GET/PATCH /api/squads/<squadId>/corner` → `backend/data/squad_corners.json` (лимит PATCH: 5 MB).
  - Кабинет тянет read‑only инфо уголка через `GET /api/squads/<squadId>/corner`.
- **Prod notes (pilot/prod):**
  - Фото сейчас хранятся как base64 внутри corner JSON и легко выбивают лимит 5MB → в hosted prod выносим фото в object storage (Supabase Storage) и в corner храним ссылки + метаданные.
  - Нужны компрессия/thumbnail и лимиты на размер файлов (иначе медленный UX и рост расходов).
- **Решено (§7.8):** уголок синхронизируем на сервер (общий доступ отряду); local остаётся черновиком/кэшем.
- **Статус:** **Done (hybrid)**.
- **Evidence:** [`../src/components/SquadCornerDashboard.tsx`](../src/components/SquadCornerDashboard.tsx), [`../src/components/SquadCabinetPanel.tsx`](../src/components/SquadCabinetPanel.tsx), [`../backend/app.py`](../backend/app.py).

### 7.9. Совет Лагеря: обзор + связь с Движками + ИИ‑инициативы (To‑be: обсуждение/голосование/протоколы)

- **Value:** верхний слой соуправления: идеи → решения → реализация → артефакты.
- **UX (As‑is):**
  - Обзорная панель “Совет Лагеря” + вкладки “Совет/Движки/Управление/Значок”.
  - Список Движков (GET /api/teams) и CTA “заявка на вступление в Движок” (через Telegram).
  - CTA “Предложить инициативу” (открывает модал генерации инициативы ИИ в ProfileView).
- **Данные/состояния (As‑is):**
  - Персистентного списка инициатив в приложении **нет** (сейчас это информационная панель + генератор текста инициативы).
  - ИИ‑генерация инициативы: `fetchCouncilInitiative()` → `/api/chat` (или Cloudflare endpoint). Evidence: [`../src/utils/aiService.ts`](../src/utils/aiService.ts), [`../src/components/CouncilDashboard.tsx`](../src/components/CouncilDashboard.tsx).
- **Статус:** **Partial**.
- **To‑be (roadmap):** хранение инициатив, статусы, обсуждения, голосования, протоколы, связи “инициатива ↔ Движок ↔ отряд ↔ значки”.
- **Решено (Q4):** ближайшая фаза — “обзор + генератор инициатив” + **персистентный список инициатив** (чтобы не “улетало в воздух”); протоколы/голосования — позже.

### 7.10. Реальный Дневник: дневные записи + “беспорядок дня” + презентация/шеринг

- **Value:** осмысление опыта смены, фиксация воспоминаний и рост через рефлексию.
- **UX (As‑is):**
  - Вкладки: “Дневник”, “Рефлексия”, “Беспорядок дня”, “Карточка дневника”.
  - Есть CTA “копировать/отправить в Telegram” (share итогов).
  - Связь с Инспектором: подсказки и CTA “открыть дневник” из Инспектора.
- **Данные/состояния (As‑is):**
  - Хранение: `userData.diaryProgress` (entries + schedule + squad‑данные). Evidence: [`../src/types/userProgress.ts`](../src/types/userProgress.ts), [`../src/context/ProgressContext.tsx`](../src/context/ProgressContext.tsx).
  - UI: [`../src/components/RealDiaryDashboard.tsx`](../src/components/RealDiaryDashboard.tsx).
- **Интеграции:** шэринг через Telegram‑ссылку + соцкарточки (см. §7.17).
- **Статус:** **Done**.

### 7.11. Инспектор Пользы: миссии/чеклисты, прогрессия, связность с Дневником

- **Value:** “геймификация заботы” и полезных дел: маленькие действия, которые прокачивают культуру отряда и 4К.
- **UX (As‑is):**
  - Панель “Инспектор Пользы” с ветками инспекторов (Дружба/Вежливость/Уют/Помощь/…).
  - Чеклисты миссий отмечаются по дням; есть CTA перейти в Дневник (связность “делаю → фиксирую”).
- **Данные/состояния (As‑is):**
  - Каталог миссий: [`../src/types/inspector.ts`](../src/types/inspector.ts).
  - Прогресс: `userData.inspectorProgress` (currentDay + completedTasks) в `rl_guide_progress_v1`. Evidence: [`../src/types/userProgress.ts`](../src/types/userProgress.ts), [`../src/context/ProgressContext.tsx`](../src/context/ProgressContext.tsx).
- **Интеграции:**
  - Соцкарточка вида `inspector_mission` в share‑центре. Evidence: [`../src/utils/socialGenerator.ts`](../src/utils/socialGenerator.ts).
  - Связность с Дневником: `onOpenDiary` в `InspectorDashboard` и подсказки в `RealDiaryDashboard`. Evidence: [`../src/components/InspectorDashboard.tsx`](../src/components/InspectorDashboard.tsx), [`../src/components/RealDiaryDashboard.tsx`](../src/components/RealDiaryDashboard.tsx).
- **Статус:** **Done** (как игровая механика и UX).
- **Решено:** “переход” = при подтверждении выполнения чеклиста он закрывается и открывается следующий (это прогрессия чеклистов/миссий). Методика описана в соответствующих материалах.

### 7.12. БРО: бропаспорт → бродела → инициация (To‑be: подтверждение у вожатого)

- **Value:** трек “будущего вожатого” и ответственность: пройти обучение через реальные дела и артефакты.
- **UX (As‑is):**
  - Панель “БРО” с вкладками “Бросвящение” и “Крыло” (крыло гейтится после БРО‑прогресса).
  - Чеклист бропаспорта/деяний; визуальные маркеры прогресса.
- **Данные/состояния (As‑is):**
  - `userData.broProgress` (isBro, hasPassport, completedDeeds, wing*…). Evidence: [`../src/types/userProgress.ts`](../src/types/userProgress.ts).
  - UI: [`../src/components/BroInitiation.tsx`](../src/components/BroInitiation.tsx), интеграция в [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).
  - Доп. контент/миссии: `GET/POST /api/bro-missions`. Evidence: [`../backend/app.py`](../backend/app.py), `useDataLoader` (dynamicBroMissions).
- **Гейты:** traveler должен разблокировать по коду для продвинутых действий; “Крыло” дополнительно гейтится `userData.broProgress.isBro`. Evidence: FeatureGate в [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).
- **Статус:** **Done** (как текущий интерактивный трек).
- **Решено:** нужен обязательный staff‑апрув “Бросвящения”.  
  **To‑be:** оформить это как серверный workflow (заявка → inbox staff → approve/reject) с понятным UX‑статусом.

### 7.13. Крыло: айдентика, план‑сетки, наставничество, “посвящение отряда”

- **Value:** следующий уровень после БРО: команда, традиции, планирование, формирование будущего “отряда вожатых”.
- **UX (As‑is):**
  - Вкладка “Крыло” внутри панели БРО: аватар, название, статус, план‑сетки (две сетки).
  - Мастерская → “Архитектор отряда”: генерация/сохранение сценария посвящения (артефакт).
- **Данные/состояния (As‑is):**
  - `broProgress.wingName/wingAvatar/wingPlanGridA/B`. Evidence: [`../src/types/userProgress.ts`](../src/types/userProgress.ts), [`../src/context/ProgressContext.tsx`](../src/context/ProgressContext.tsx).
  - “Сценарий Архитектора” хранится в `userData.meta.squadArchitectScenario`. Evidence: [`../src/types/userProgress.ts`](../src/types/userProgress.ts).
  - UI: [`../src/components/WingDashboard.tsx`](../src/components/WingDashboard.tsx), [`../src/components/SquadArchitect.tsx`](../src/components/SquadArchitect.tsx).
  - ИИ‑картинки: `POST /api/images/generate` (`context=wing`, mode generate/process). Evidence: `WingDashboard.tsx`, [`../backend/app.py`](../backend/app.py).
- **Статус:** **Done**.
- **Решено:** Крыло остаётся **отдельным типом**, не мигрирует в `Squad` (staff‑flow).

### 7.14. 4К‑профиль и “Программа РЛ 2026”: расчёт + ИИ‑характеристика

- **Value:** переводить прогресс по значкам в понятную “картину навыков” и рекомендации: что прокачивается, куда двигаться.
- **UX (As‑is):**
  - Панель “4К” с вкладками “Твои 4К навыки” и “Реальный Лагерь прогресс”.
  - Доп. текст от ИИ (педагогическая строка/характеристика) поверх вычисленной аналитики.
- **Данные/состояния (As‑is):**
  - Расчёт: [`../src/utils/profile4k.ts`](../src/utils/profile4k.ts).
  - ИИ: `fetchPedagogy4k()` через `aiService` → `/api/chat`. Evidence: [`../src/utils/aiService.ts`](../src/utils/aiService.ts).
  - UI: [`../src/components/Profile4KDashboard.tsx`](../src/components/Profile4KDashboard.tsx).
- **Статус:** **Done**.

### 7.15. Вожатификатор + “Путеводные огни”

- **Value:** “книга лагерной педагогики” + практический чеклист для вожатых.
- **UX (As‑is):**
  - Viewer книги внутри ЛК: оглавление (TOC) + контент.
  - Чеклист “Путеводные огни” с отметками прогресса.
  - Ссылка на скачивание редактируемой версии (DOCX).
- **Данные/состояния (As‑is):**
  - Контент книги: исходник `docs/вожатификатор.md`, в приложении загружается как `vozhatifikator.md` и конвертируется в HTML (с heading ids). Evidence: [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx), [`../vite.config.ts`](../vite.config.ts), [`../src/utils/markdown.ts`](../src/utils/markdown.ts).
  - DOCX: `VZhTFKTR.docx` (download). Evidence: `ProfileView.tsx`.
  - Чеклист: [`../src/data/vozhatifikatorChecklist.ts`](../src/data/vozhatifikatorChecklist.ts) + `userData.vozhatifikatorChecklist` в `rl_guide_progress_v1`. Evidence: [`../src/context/ProgressContext.tsx`](../src/context/ProgressContext.tsx).
- **Статус:** **Done** (как механика; наполнение книги — продуктовый контент‑трек).
- **Решено:** нужны UI‑маркеры “в разработке” для разделов/глав, которые ещё не дописаны (чтобы это читалось как контент‑план, а не баг).

### 7.16. Мастерская / UGC: “Кузница смыслов”, кастомные значки, публикация, лента, карточка созидателя

- **Value:** сделать Путеводитель “конструктором” и включить детей/вожатых в развитие экосистемы значков и традиций.
- **UX (As‑is):**
  - Панель “Мастерская” с вкладками: “Архитектор отряда”, “Кузница смыслов”, “Идеи отряда”, “Мои предложения”.
  - Создание кастомного значка (минимальный набор полей) + загрузка/генерация изображения.
  - Публикация кастомного значка в “сообщество” + лайки.
  - Отправка “карточки созидателя” в Telegram (опционально).
- **Данные/состояния (As‑is):**
  - Кастомные значки: `localStorage: rl_custom_badges_v1` (через `useDataLoader`). Evidence: [`../src/hooks/useDataLoader.ts`](../src/hooks/useDataLoader.ts).
  - Лента сообщества: `GET/POST /api/community/badges` + кэш `rl_community_badges_cache_v1`. Evidence: [`../backend/app.py`](../backend/app.py), `useDataLoader.ts`.
  - Лайки: `localStorage: rl_community_badge_likes_v1`. Evidence: `useDataLoader.ts`.
  - Telegram notify: `POST /api/telegram/notify-creator-card`. Evidence: [`../backend/app.py`](../backend/app.py), [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).
- **Гейты:** часть действий может требовать unlock по коду (по политике “дорогих” действий); сейчас UGC в основном локальный.
- **Статус:** **Done** (как UGC‑MVP).
- **To‑be (roadmap):** модерация и перевод в канон (pipeline в `public/ai-data`), предложения категорий, роли педагога/мастерской как сущности.
- **Решено:** “кабинет мастерской педагога” нужен уже в v1 (как отдельная сущность/поверхность в рамках Мастерской).

### 7.17. Социальные карточки / Share Center (stories + wide) + приглашения

- **Value:** усиливать мотивацию и вирусность через красивый артефакт прогресса, который легко показать друзьям/родителям.
- **UX (As‑is):**
  - Панель “Шеринг”: вкладки “Создать карточку” и “Пригласить друзей”.
  - Карточки создаются в двух форматах: `story` (9:16) и `wide` (16:9).
- **Данные/интеграции (As‑is):**
  - Генерация карточек на canvas: `generateSocialCard()`. Evidence: [`../src/utils/socialGenerator.ts`](../src/utils/socialGenerator.ts).
  - Виды карточек (kinds): `progress_summary`, `start_route`, `achieved_level`, `favorite`, `inspector_mission`, `creator_proposal`. Evidence: `SocialCardKind` в `socialGenerator.ts`.
  - Share UX: `navigator.share` (если доступно) → иначе download. Evidence: `shareOrDownloadSocialCard()` в `socialGenerator.ts`.
  - Приглашение/шаринг значка: `?view=badge&badgeId=...`. Evidence: `getBadgeShareUrl()` в `socialGenerator.ts`, deep‑link обработка в [`../src/app/useAppController.ts`](../src/app/useAppController.ts).
- **Карточки прогресса (To‑be):** продуктовые триггеры и сценарии шеринга, которые должны “всплывать в моменте”:
  - при `В путь` (start_route),
  - при `achieved` (achieved_level),
  - при 100% заполнении дневника/уголка/чеклиста,
  - при ключевых “разблокировках” разделов/ранга.
- **Статус:** **Partial** (генератор карточек Done, но “моменты” и продуктовые сценарии шеринга требуют доводки).
- **Prod notes (pilot/prod):** карточки не должны содержать `deviceId`, JWT или внутренние id; только безопасные поля (nickname, агрегаты прогресса).

### 7.18. НейроВалюша: чат, контекст (категория/значок/уровень), лимиты, роли

- **Value:** ИИ‑проводник, который объясняет требования значков, помогает строить планы и генерирует текст/артефакты (инициативы, характеристики и т.п.).
- **UX (As‑is):**
  - Чат как модал (Dialog), доступен из landing/каталога/ЛК.
  - Для traveler показывается CTA “разблокировать по коду” (чат закрыт без роли).
- **Данные/интеграции (As‑is):**
  - Лимит: `GET /api/chat/limits` (локально) или Cloudflare endpoint (в прод‑режиме UI). Evidence: [`../src/components/ChatBot.tsx`](../src/components/ChatBot.tsx), [`../backend/app.py`](../backend/app.py).
  - Чат: `POST /api/chat` (локально) или Cloudflare endpoint (в прод‑режиме AI‑запросов). Evidence: `ChatBot.tsx`, [`../src/utils/aiService.ts`](../src/utils/aiService.ts), [`../backend/app.py`](../backend/app.py).
  - Контекст: UI передаёт `currentView/currentCategory/currentBadge/currentLevel` и т.п.; бэкенд подмешивает `user_role` из JWT в web_context. Evidence: `ChatBot.tsx`, `backend/app.py` (`chat_with_bot()`).
  - Ограничение по сообщениям: бэкенд возвращает 429 при превышении дневного лимита. Evidence: [`../backend/app.py`](../backend/app.py).
- **Гейты/разблокировки:** `canUseChat` по роли (см. `CHAT_ALLOWED_ROLES`) + наличие `accessToken`. Evidence: [`../src/types/authRole.ts`](../src/types/authRole.ts), [`../src/context/AuthContext.tsx`](../src/context/AuthContext.tsx).
- **Статус:** **Partial** (механика в коде есть, но в PROD сейчас действует “traveler forced”, а также есть зависимость от внешнего endpoint в прод‑режиме).
- **Решено:** единая продовая схема через наш backend (без Cloudflare‑обходов).  
  **To‑be:** закрыть dev‑двери в проде, добавить rate limits/квоты и перевести прод‑вызовы чата на `/api/chat`.
- **Prod notes (pilot/prod):**
  - В проде запрещаем прямые вызовы внешних endpoint’ов с клиента; весь чат/лимиты идут через backend для RBAC, фильтров, квот и логов.
  - Минимальная safety: запрет ссылок, базовый мат‑фильтр, лимиты по длине/частоте, мониторинг 429/5xx.

### 7.19. Резервная копия/экспорт‑импорт/сброс + родительский просмотр (file/link/code/QR)

- **Value:** “страховка” прогресса и безопасный режим “показать родителям”, не раскрывая всё и не ломая локальный стор.
- **UX (As‑is):**
  - Экспорт прогресса в JSON (download) + импорт из файла.
  - Сброс прогресса (с подтверждением).
  - Режим “Для родителей”:  
    - Phase 1: ссылка `?parent_view=...` (встроенный payload с achieved‑прогрессом) + загрузка JSON отчёта.  
    - Phase 2: короткий код + QR (через API `parent-snapshot`).
- **Данные/состояния (As‑is):**
  - Экспорт/импорт: `ProgressContext.exportData()` / `importData()` / `resetProgress()`. Evidence: [`../src/context/ProgressContext.tsx`](../src/context/ProgressContext.tsx).
  - Payload отчёта родителю: `ParentReportPayload`, `buildParentReportPayload()` (берём только achieved уровни). Evidence: [`../src/types/userProgress.ts`](../src/types/userProgress.ts).
  - `parent_view`: кодирование base64url в ссылку и парсинг на загрузке. Evidence: [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).
  - `parent_code`: `POST/GET /api/parent-snapshot?code=...` + TTL (7 дней). Evidence: [`../backend/app.py`](../backend/app.py), UI/QR: `ProfileView.tsx` (QRCodeSVG).
- **Статус:** **Done**.
- **Решено (Q2):** hybrid — у родителя есть свой ЛК/прогресс, а “режим ребёнка” всегда строго read‑only (отдельная витрина/отчёт).

### 7.20. Онбординг/подсказки (tutorial, SmartHint)

- **Value:** снизить порог входа в сложный продукт (много механик), при этом не “обучать в лоб”.
- **UX (As‑is):**
  - Overlay‑подсказки (SmartHint) + пошаговый tutorial ProfileView (подсветка ключевых UI‑элементов).
  - Tutorial автоматически стартует для нового пользователя, затем помечается как пройденный.
- **Данные/состояния (As‑is):**
  - Контекст подсказок: [`../src/context/HintOverlayContext.tsx`](../src/context/HintOverlayContext.tsx).
  - UI: [`../src/components/SmartHint.tsx`](../src/components/SmartHint.tsx), сценарий `PROFILE_TUTORIAL_STEPS` в [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).
  - Флаг completion хранится в `userData.meta.hasCompletedTutorial` внутри `rl_guide_progress_v1`. Evidence: [`../src/types/userProgress.ts`](../src/types/userProgress.ts).
- **Статус:** **Done**.

### 7.21. Service Worker / offline‑first: кэш ai‑data и ассетов

- **Value:** быстрые повторные визиты и “работает даже при плохой связи” (критично для лагеря).
- **UX (As‑is):**
  - В прод‑сборке регистрируется SW; пользователь не видит отдельного экрана, но получает ускорение и офлайн‑поведение.
- **Данные/техника (As‑is):**
  - Регистрация: `src/main.tsx` (только `import.meta.env.PROD`). Evidence: [`../src/main.tsx`](../src/main.tsx).
  - Политика кэша: `public/sw.js`: HTML network‑first; `ai-data` stale‑while‑revalidate; assets/images cache‑first; trim caches. Evidence: [`../public/sw.js`](../public/sw.js).
  - Доп. кэш ai‑data в localStorage: `src/utils/dataCache.ts`. Evidence: [`../src/utils/dataCache.ts`](../src/utils/dataCache.ts).
- **Статус:** **Done**.

---

## 8) Сверка: код ↔ твой черновик (`.cursor/putevoditel_prodroadmap_demo.md`)

### 8.1. Что уже реализовано в коде, но в черновике было неявно/не зафиксировано как механика
- **Родительский просмотр прогресса** (Phase 1 `parent_view` + Phase 2 `parent_code`/QR + API). Evidence: [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx), [`../src/types/userProgress.ts`](../src/types/userProgress.ts), [`../backend/app.py`](../backend/app.py).
- **Серверный контур подтверждений уровней** (requests/inbox/approve/reject + “синк approvals”). Evidence: [`../src/utils/badgeApprovalApi.ts`](../src/utils/badgeApprovalApi.ts), [`../backend/app.py`](../backend/app.py).
- **Экосистема смен/отрядов + кабинет отряда** (join/invite/leave/kick/chat + инфо уголка) в связке с “Отрядным уголком”. Evidence: [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx), [`../src/components/SquadCabinetPanel.tsx`](../src/components/SquadCabinetPanel.tsx), [`../backend/app.py`](../backend/app.py).
- **UGC лента/лайки + publish queue** для кастомных значков (community). Evidence: [`../src/hooks/useDataLoader.ts`](../src/hooks/useDataLoader.ts), `backend/app.py` (`/api/community/badges`).
- **Онбординг SmartHint + tutorial** как отдельная механика “ввести в продукт”. Evidence: [`../src/context/HintOverlayContext.tsx`](../src/context/HintOverlayContext.tsx), [`../src/views/ProfileView.tsx`](../src/views/ProfileView.tsx).
- **Service Worker/offline caching** как продуктовый слой (быстрота/устойчивость). Evidence: [`../public/sw.js`](../public/sw.js), [`../src/main.tsx`](../src/main.tsx).
- **Отряд вожатых (локальный MVP)** как отдельная сущность (не server Squad). Evidence: [`../src/context/CounselorSquadContext.tsx`](../src/context/CounselorSquadContext.tsx), [`../src/components/CounselorSquadDashboard.tsx`](../src/components/CounselorSquadDashboard.tsx).
- **Паттерн “ImageSourceBlock”** (загрузить/сгенерировать/обработать ИИ) как общая инфраструктура. Evidence: [`../src/components/ImageSourceBlock.tsx`](../src/components/ImageSourceBlock.tsx), `backend/app.py` (`/api/images/generate`).
- **Точное перечисление видов соцкарточек** (6 kinds, 2 formats) и их генерация на canvas. Evidence: [`../src/utils/socialGenerator.ts`](../src/utils/socialGenerator.ts).
- **Вебхуки Telegram/VK** как подсистема (не пользовательская механика, но важная интеграция). Evidence: `backend/app.py` (`/api/webhook/*`, `/api/telegram/notify-*`).

### 8.2. Что описано в черновике, но в коде отсутствует или Partial
- **“Фрактал” связей: Shift → Squad → Engines внутри отряда** — в коде Движки (Team) и отряды (Squad) пока параллельны. Status: Partial/Planned (см. Q1).
- **Голосования/протоколы Совета Лагеря** (внутри приложения). Status: Planned (см. §7.9).
- **Кабинет мастерской педагога** как сущность (расписание, группы, задания, проверки). Status: Planned (нужно в v1; см. §7.16).
- **Бизнес‑контур лагеря** (запись/бронь/оплата/подписки/мульти‑лагерь). Status: Planned (см. Фаза 4).
- **Мобильная игра** как отдельный продуктовый трек. Status: Planned (см. Фаза 5).

### 8.3. Места, где “видение ↔ код” требуют решения, чтобы roadmap был честным
- Роли в production (сейчас forced traveler). См. Q5.
- Родитель: read‑only или “играет как участник”. См. Q2.
- Политика подтверждений: self‑claim vs staff‑апрув. См. Q3.

---

## 9) Roadmap по фазам релизов (product roadmap)

> Принцип: этот roadmap — по **фазам** и **продуктовым эпикам**. Операционный dev‑трекер задач остаётся в [`docs/ROADMAP_2026.md`](ROADMAP_2026.md).

### Фаза 0 — “Срез текущего продукта (As‑is)” (зафиксировано на 2026‑02‑21)
**Цель:** не перепридумывать реализованное и честно видеть пробелы.

**В продукте уже есть (высокий уровень):**
- Каталог значков + уровни + материалы.
- ЛК “кабина” + ключевые панели (Паспорт, Движок, Совет, БРО/Крыло, Дневник, Инспектор, 4К, Вожатификатор, Шеринг, Мастерская, Для родителей).
- Система заявок на подтверждение уровней (сервер) и синк подтверждений в локальный прогресс.
- UGC: кастомные значки + публикация в сообщество + лайки.
- Родительский просмотр (файл/ссылка/код/QR).
- Service Worker и кэш ai‑data.

**Главные пробелы, которые влияют на прод‑MVP:**
- Production политика ролей/разблокировок (forced traveler).
- Движки пока не связаны с отрядами/сменами (Q1) и не видны “внутри отряда” как часть фрактала.
- Совет Лагеря пока без хранения инициатив в приложении (персистентного списка) и без протоколов/голосований.
- “Отряд вожатых” важен продуктово, но сейчас это локальный прототип без server‑синхронизации и без UX‑входа в ЛК.
- `educator`: роль полностью включена в backend RBAC (Done, M7-EDUCATOR-RBAC-A).

### Фаза 1 — Production MVP “Участник смены” (стабилизация + UX‑склейка)
**Цель:** ребёнок на смене + вожатый + родитель проходят ключевой путь без “дыр”.

**Эпики (рекомендуемый состав):**
1) **Prod Hardening (hosted‑готовность)**
   - Персистентность: вынести критичные домены из `backend/data/*.json` в Supabase (shifts/squads/memberships/corners/invite‑codes/messages/badge_requests/parent_snapshots).
   - Dev‑двери выключены в prod: `/api/dev/login` недоступен, sandbox UI скрыт, forced traveler снят (Q5).
   - Safety‑минимум: rate limits + запрет ссылок + длины/частоты сообщений + базовые фильтры (чат/отрядный чат/ИИ картинки).
   - Staging + smoke‑проверки перед релизом (см. [`docs/PROD_RELEASE_PLAYBOOK.md`](PROD_RELEASE_PLAYBOOK.md)).
2) **Роли в production и безопасная авторизация**
   - Решить Q5: как включаем роли/чат/онлайн‑фичи в проде без “dev‑дыр”.
   - DoD: пользователь может разблокировать доступ по коду; traveler‑ограничения понятны; 401/expired‑токены ведут к понятному UX.
3) **Отряд (стабилизация + UX‑склейка)**
   - База уже реализована: `Смены и отряды` + вступление по коду/ссылке + кабинет отряда (участники/чат/инвайты/leave/kick) + hybrid‑уголок.
   - Довести UX: понятные “что дальше” подсказки, стабильные переходы в кабинет, корректные пустые состояния, меньше дублирования информации.
   - To‑be: связать отряд ↔ движки (Q1) и отобразить “Движки отряда” в кабинете.
4) **Значки: маршрут → пруф → подтверждение**
   - Политика Q3, единые состояния “pending/approved/rejected”, понятный журнал действий.
   - DoD: участник отправляет заявку; staff подтверждает; участник синхронизирует и видит achieved.
5) **Дневник ↔ Инспектор**
   - Усилить связность: подсказки/CTA, минимум “что делать сегодня”.
6) **Страховка: экспорт/импорт + родительский просмотр**
   - DoD: родитель получает ссылку/код/QR и смотрит только achieved‑прогресс ребёнка.
7) **НФ‑требования**
   - Производительность на слабых устройствах, офлайн‑поведение ai‑data, устойчивость к ошибкам API.

**Definition of Done (Pilot Prod):**
- Все P0 сценарии по ролям из §0.0 проходят без ручных “правок в базе”.
- Данные смен/отрядов/уголка/чата/заявок переживают деплой и рестарт (Supabase).
- В проде нет dev‑дверей; forced traveler выключен; RBAC решается на backend по JWT.
- Есть лимиты на чат/ИИ/сообщения и минимальная safety‑политика (с логированием и 429).
- Есть staging‑стенд и smoke‑регрессия перед релизом.

**Метрики (для MVP):**
- % участников, которые добавили ≥1 уровень “В путь”.
- % участников, которые отправили ≥1 подтверждение.
- Время до первого “achieved” и до первого шеринга карточки.
- Доля родителей, которые открыли отчёт по ссылке/коду.

### Фаза 2 — Staff & Camp Ops (масштабирование на организаторов/педагогов)
**Цель:** продукт работает как инструмент лагеря, а не только “игра ребёнка”.

**Эпики:**
- Полный RBAC на сервере для staff‑ролей (educator, camp_director) + согласование прав (Q6).
- Дашборды staff: смены/отряды, модерация заявок, списки детей (минимально: nickname snapshot), базовая статистика.
- Совет Лагеря: протоколирование решений (MVP) и связи инициатив с Движками/отрядами.
- “Кабинет мастерской педагога” (educator) — v1 must-have: расписание, группы, задания, проверки.

### Фаза 3 — Creator/UGC “конструктор Путеводителя”
**Цель:** вывести UGC в управляемый процесс и переводить лучшее в канон.

**Эпики:**
- Предложения значков/категорий: улучшение формы + модерация + статус‑жизненный цикл.
- Арты/скины: workflow “предложить → модерация → канон → выбор в UI”.
- Единый паттерн ИИ‑картинок “везде, где есть картинки” (контексты, лимиты, UX ошибок).
- Community: ранжирование, подборки “лучшее недели”, карточки созидателя как нормальный share‑артефакт.

### Фаза 4 — Business & Multi‑camp (если подтверждается как часть продукта “Путеводителя”)
**Цель:** масштабирование на несколько лагерей/организаций и коммерческий контур.

**Эпики:**
- CampConfig и изоляция данных (multi‑camp).
- Организационные аккаунты, лимиты, тарифы/подписки.
- Запись/бронь/оплата (если не отдельная система).

### Фаза 5 — Mobile Game (отдельный стратегический трек)
**Цель:** выделить мобильную игру как продукт, не смешивая с web‑SSOT.

**Условия старта:** стабилизация core loop + доменная модель (Q1/Q7) + подтверждённые метрики вовлечения web‑версии.

---

## 10) Открытые вопросы (реестр)

> На срез 2026‑02‑21 ключевые вопросы Q1–Q7 продуктово **решены**. Ниже фиксируем решения как SSOT и оставляем открытыми только детали реализации.

### Q1 — Движки: внутри отряда/смены или глобальные команды?
- **Решено:** гибрид — у движка есть `scope: camp | shift | squad` + опциональные `shiftId/squadId`.
- **As‑is:** `Team` глобальный и живёт параллельно `Squad` (без связей).
- **To‑be:** добавить `scope` + связность в кабинете отряда (“Движки моего отряда”), RBAC и миграцию данных.

### Q2 — Родитель: read‑only наблюдатель или “играет как участник + наблюдает”?
- **Решено:** hybrid — у родителя есть свой ЛК/прогресс, а “режим ребёнка” всегда строго read‑only (отдельная витрина/отчёт).

### Q3 — Подтверждение достижений: self‑claim vs staff‑апрув
- **Решено:** mixed — “бытовые/рефлексивные/безопасные” self‑claim, “ключевые/БРО/социально значимые/с риском читинга” через staff.
- **To‑be:** помечать в контенте (ai-data) флаг `requiresApproval`, чтобы UX был однозначный.

### Q4 — Совет Лагеря: ближайшая фаза
- **Решено:** оставляем “обзор + генератор инициатив” и добавляем персистентный список инициатив; протоколы/голосования — позже.

### Q5 — Политика ролей в production (forced traveler сейчас)
- **Решено:** убираем “демо‑режим” (forced traveler) — прод становится “настоящим приложением”: роли работают всегда и везде.
- **Требования (must):**
  - RBAC железный на сервере (всё решается по JWT, не по словам клиента).
  - `POST /api/dev/login` и любые dev‑двери закрыты в проде.
  - Лимиты/рейткейпы на чат/ИИ (иначе расходы/абьюз).
- **As‑is:** клиент в `import.meta.env.PROD` принудительно форсит `traveler` (это временная safety‑политика).

### Q6 — Staff‑роли: educator и camp_director
- **Решено:** полный набор staff‑ролей в v1, включая `educator` (мастерская/кружки) + `camp_director`.
- **As‑is:** `camp_director` уже включён в server RBAC для organizer/squad-flow; `educator` в backend RBAC пока отсутствует (см. §3.4).
- **To‑be:** довести backend RBAC и поверхности “кабинета педагога” в Мастерской.

### Q7 — Синхронизация прогресса: только localStorage или сервер + мульти‑девайс?
- **Решено:** (a) для Фазы 1, (b) как отдельный эпик Фазы 3/4 (когда появится multi‑camp).

### Открытые вопросы (остаток)
- Доменная модель server‑версии “Отряд вожатых”: отдельная сущность vs `Squad(kind=staff)` (см. §7.7.1).
- Миграционный путь движков на hybrid scope без ломки As‑is `Team`.
- Минимальная схема “инициатив” для Совета (статусы, ownership, связи с движком/отрядом).

---

## 11) Проверка качества документа (acceptance + coverage-check)

### 11.1. Acceptance criteria для этого SSOT
- Описаны все панели ЛК из `ProfileView.tsx` и все public‑экраны из `AppViewRouter.tsx`.
- Для каждой механики (раздел §7) есть: value, UX, данные, гейты, статус, evidence, вопросы.
- Есть As‑is vs To‑be доменная модель (§2) и список расхождений (§2.4 + §8.3).
- Roadmap разбит по фазам (§9), у каждой фазы есть цели/эпики/DoD/метрики.
- Все непонятные места либо выяснены, либо помечены `[Вопрос к Стёпе]` и вынесены в реестр (§10).

### 11.2. Coverage-check (тех. валидация)
Быстрый чек после правок документа:
- Пройтись по ключевым файлам/поверхностям и убедиться, что они упомянуты:  
  `src/views/ProfileView.tsx`, `src/app/AppViewRouter.tsx`, `src/context/*`, `src/components/*` (ключевые дашборды), `backend/app.py`, `public/sw.js`, `public/ai-data/*`.
- Сверить статусы “Done” с [`docs/ROADMAP_2026.md`](ROADMAP_2026.md): не помечать как Planned то, что уже Done по evidence.
