# Оркестрация агентов — координация 4 параллельных агентов

**Назначение:** единая точка координации, чтобы агенты не дублировали задачи, не переписывали сделанное и понимали маршрут разработки Путеводителя.

**Связанные документы:** [agent.md](../../agent.md), [HOW_TO_BRIEF_AGENTS.md](../../docs/HOW_TO_BRIEF_AGENTS.md), [active_context.md](../../.memory-bank/active_context.md), [ROADMAP_2026.md](../../docs/ROADMAP_2026.md), [AGENT_ROLES.md](AGENT_ROLES.md).

**Production Roadmap (Фазы 1–5):** координация по реализации `PRODUCT_MECHANICS_AND_ROADMAP.md` — отдельная система в [`docs/PROD_ROADMAP_IMPL/`](../../docs/PROD_ROADMAP_IMPL/):
- Задачи по фазам: [`TASKS.md`](../../docs/PROD_ROADMAP_IMPL/TASKS.md)
- Живой Claim Board prod-roadmap: [`CLAIM_BOARD.md`](../../docs/PROD_ROADMAP_IMPL/CLAIM_BOARD.md)
- Планы реализации: [`plans/`](../../docs/PROD_ROADMAP_IMPL/plans/)
- Отчёты агентов: [`reports/`](../../docs/PROD_ROADMAP_IMPL/reports/)

---

## 1. Роли агентов (из active_context)

| Агент | Фокус | Зоны ответственности |
|-------|-------|----------------------|
| **Agent A** | Data & Domain | `public/ai-data`, модели прогресса |
| **Agent B** | UX & Navigation | `src/views/`, `src/components/`, согласованность UI/UX |
| **Agent C** | AI & Communication | `chatbot/`, system prompts, NeuroValyusha |
| **Agent D/E** | Meanings & Infrastructure | «О лагере», GitHub Pages, backend, технические ограничения |

---

## 2. Обязательное действие перед началом разработки

**Каждый агент перед взятием задачи обязан:**

1. Открыть этот файл (AGENT_ORCHESTRATION.md).
2. Проверить раздел **«Claim Board»** — не занята ли выбранная задача другим агентом.
3. Записать в Claim Board:
   - **Агент** (A / B / C / D/E)
   - **Задача** (название из ROADMAP или краткое описание)
   - **Дата/время** (когда начал)
   - **Логичный следующий шаг** (что логично делать после этой задачи, чтобы другие агенты понимали контекст)
4. Только после этого приступать к разработке.

**Правило:** если задача уже в Claim Board и статус не «Done» — не бери её. Выбери другую или уточни у пользователя.

---

## 3. Департаментные Доски Задач (Department Claim Boards)

Каждый агент **обязан** записывать свои задачи в доску того Отдела, к которому он прикреплен. Записывайте позывной агента (и грейд), саму задачу, статус, дату и логичный следующий шаг.

### 🏛️ 1. Отдел Архитектуры и Рефакторинга (Core Infrastructure & Refactoring)
*Поиск технического долга, переписывание легаси (Strangler Fig), управление масштабированием.*
| Агент (Роль) | Задача | Статус | Дата | Логичный следующий шаг |
|--------------|--------|--------|------|------------------------|
| **Agent Opus (L5 Arch)** | Рефакторинг `ProfileView.tsx` (Strangler Fig). Фаза 2 и переход к Фазе 3 (Контейнеры). | In progress | 2026-04-08 | Интеграция `CustomEvent` для управления табами извне. Достижение 0 typescript errors. |
| **Agent D/E (L5 SRE)** | Подготовка бекенда (health checks, CI/CD, rate limits). | Done | 2026-02-09 | Аудит деплоя на Vercel (опционально). |
| **Agent R (L5 Arch)** | Онбординг в отдел рефакторинга. Подготовка к Фазе 5. | Done | 2026-04-09 | Ожидание целей для рефакторинга. |

### 🎨 2. Отдел Продуктовой Разработки (Feature Development)
*Верстка, создание новых страниц и внедрение фичей ЛК.*
| Агент (Роль) | Задача | Статус | Дата | Логичный следующий шаг |
|--------------|--------|--------|------|------------------------|
| **Agent B (L4 SWE)** | Tiger Team: Починка багов UI (Таймауты рендера `ProfileView` для Traveler/Parent). | In progress | 2026-04-08 | Взять следующий UI-тикет из `BUG_TRACKER.md`. |
| **Agent B (SWE L4)** | Починка багов UI (по результатам QA Grid / BUG_TRACKER.md) | In progress | 2026-04-08 | После: Переход к Phase 3 Архитектурного рефакторинга по аппруву Staff Agent. |
| **Agent D (SRE L4)** | M10-DEPLOY-D: Запуск prod smoke тестов после апдейта Vercel/Supabase | In progress | 2026-04-08 | После: Закрыть M10, обновить ROADMAP_2026 |

### 🛡️ 3. Отдел поиска багов, Тестирования и Безопасности (QA, Bug-Hunting & Security)
*Поиск дыр, профилирование безопасности (RBAC), написание E2E тестов и закрытие уязвимостей багов.*
| Агент (Роль) | Задача | Статус | Дата | Логичный следующий шаг |
|--------------|--------|--------|------|------------------------|
| **Gemini (L6 Staff)**| Написание и запуск E2E автотестов (Playwright QA Grid). Выявлены падения. | Done | 2026-04-08 | Передать отчет в Tiger Team (`BUG_TRACKER.md`). |
| **Agent QA (TBD)** | QA/Audit: Проверка видимости аватаров и никнеймов во всех кабинетах, чатах, списках отрядов/движков (local + prod). | Backlog | 2026-04-08 | Запуск визуальных тестов и мануальный проход по всем UI-спискам. |
| **Agent Gamma (L5 SRE/Arch)** | God Mode (Presenter): Финализация и безопасный релиз презентационного режима в Production. | Done | 2026-04-08 | Провести рефакторинг или код-ревью. |

### 🧠 4. Отдел ИИ и Контента (AI & Domain Data)
*Синхронизация промптов, графы знаний, нейро-ассистенты.*
| Агент (Роль) | Задача | Статус | Дата | Логичный следующий шаг |
|--------------|--------|--------|------|------------------------|
| **Agent C (Data)** | Синхронизация промптов (единый тон NeuroValyusha). | Done | 2026-02-09 | Проверить изменения в `cf-api`. |

### 🔍 5. Отдел Код-Ревью и Аудита планов (Code/Plan Review & Standards)
*Независимая оценка чужого кода, контроль качества архитектурных планов, проверка соответствия стилю.*
| Агент (Роль) | Задача | Статус | Дата | Логичный следующий шаг |
|--------------|--------|--------|------|------------------------|

### 📊 6. Отдел Системного Анализа и ТЗ (System Analysis & SDD)
*Бриф пользователей (CEO), генерация динамических машинночитаемых Спецификаций (Specs) перед кодингом.*
| Агент (Роль) | Задача | Статус | Дата | Логичный следующий шаг |
|--------------|--------|--------|------|------------------------|
| **Antigravity (Principal Arch)** | Прохождение онбординга, анализ контекста проекта | Done | 2026-04-13 | Получение и декомпозиция следующей задачи от пользователя. |

### 📚 7. Отдел Техдокументации и Синхронизации Реальности (Tech Writer & Audit)
*Сверка старых дизайн-документов с реальным кодом. Удаление мертвых концепций, написание README, поддержка единой картины мира.*
| Агент (Роль) | Задача | Статус | Дата | Логичный следующий шаг |
|--------------|--------|--------|------|------------------------|

**Как обновлять:**
- При **старте** задачи: добавить свою строку в таблицу нужного департамента.
- При **завершении**: сменить статус на «Done» и создать отчёт.

> **Production Roadmap (Фазы 1–5):** Глобальные задачи по механикам по-прежнему управляются в [`docs/PROD_ROADMAP_IMPL/CLAIM_BOARD.md`](../../docs/PROD_ROADMAP_IMPL/CLAIM_BOARD.md).

---

## 4. Кто что сделал (сводка из отчётов)

Отчёты лежат в этой папке: [.cursor/agent orchestration/](../../.cursor/agent%20orchestration/).

| Задача | Агент/Отчёт | Файлы | Дата |
|--------|-------------|-------|------|
| CI и доки (ROADMAP §5, BACKEND_URL, progress): «Где мы сейчас», §5 оркестрации, BACKEND_URL в README/QUICK_START/DEPLOYMENT, три пункта в progress.md | **D/E** — [AGENT_D_E_SESSION_REPORT_CI_DOCS_2026-02-09](AGENT_D_E_SESSION_REPORT_CI_DOCS_2026-02-09.md) | docs/ROADMAP_2026.md, AGENT_ORCHESTRATION.md, README.md, QUICK_START.md, DEPLOYMENT.md, .memory-bank/progress.md | 9.02.2026 |
| UX-полировка 429/503 для ИИ-изображений | **D/E** — [SESSION_REPORT_CHAT_2026-02-09](SESSION_REPORT_CHAT_2026-02-09.md) | imageGenerateApi.ts (userMessageFromStatus), backend/app.py (русские 503/501) | 9.02.2026 |
| Герб Движка шаг 2 — унификация, Process | **D/E** | backend/app.py, imageGenerateApi.ts, TeamDashboard, ImageSourceBlock, image-contexts, tech_context | 9.02.2026 |
| Аудит категории 8 ai-data | **Agent A** — AGENT_A_SESSION_REPORT_CATEGORY_8_AUDIT | CATEGORY_8_SOURCE_AUDIT_REPORT.md, 8.1–8.7.json, MASTER_INDEX | 9.02.2026 |
| Программа аудитов категорий 1–14 ai-data — завершена | **Agent A** | docs/CATEGORY_AUDITS_COMPLETE.md, AGENT_ORCHESTRATION, AGENT_A_SESSION_REPORT_CATEGORY_8_AUDIT | 9.02.2026 |
| Роль Organizer (RBAC) | AGENT_REPORT_ORGANIZER_ROLE | authRole.ts, authStorage.ts, ProfileView.tsx, SANDBOX_TESTING.md | 9.02.2025 |
| MVP «Смены и отряды» (staff flow) | REPORT_STAFF_FLOW_SHIFTS_SQUADS_MVP | backend/app.py, authRole.ts, ProfileView.tsx | 9.02.2026 |
| Герб Движка — UI (шаг 1) | **Agent B** — AGENT_B_SESSION_REPORT | teams.ts, TeamContext.tsx, TeamDashboard.tsx | 9.02.2026 |
| Герб Движка — UX (шаг 1.5) | **Agent B** | TeamDashboard.tsx: Скачать, Поделиться, Загрузить своё фото, Заменить (downloadBlob, shareOrDownloadSocialCard) | 9.02.2026 |
| UX-шлифовка «Смены и отряды» | **Agent B** — AGENT_B_SESSION_REPORT_UX_SHIFTS_SQUADS | ProfileView.tsx, profile-view.css: пустые состояния, классы, скроллбар модалок, адаптив | 9.02.2026 |
| Консистентность пустых состояний и ошибок в ЛК | **Agent B** — AGENT_B_SESSION_REPORT_EMPTY_STATES_CONSISTENCY | profile-view.css, SquadCornerDashboard, ProfileView, TeamDashboard: profile-empty-state, profile-error, profile-loading | 9.02.2026 |
| UX TeamDashboard — единообразие ошибок и повтора | **Agent B** — AGENT_B_SESSION_REPORT_TEAMDASHBOARD_ERRORS | TeamDashboard.tsx: profile-error, profile-loading, dead code removal, joinRetryVisible → profile-error--not-found + btn-secondary | 9.02.2026 |

**Примечание:** отчёты Organizer и Staff flow не указывают явно букву агента (A/B/C/D). По зонам: Organizer — UX+types (B или общий); Staff flow — backend + ProfileView (D/E + B). Конвенция: при создании отчёта указывать агента явно.

---

## 5. Где мы находимся (контекст для всех агентов)

- **ROADMAP:** [docs/ROADMAP_2026.md](../../docs/ROADMAP_2026.md) — «Где мы сейчас», таблица Done/Not started.
- **CI:** перед сборкой выполняется self-check (job lint-and-test); отдельный job backend-health поднимает бэкенд, проверяет GET /api/health и при успехе запускает self-check с BACKEND_URL — Done.
- **Следующие кандидаты:** создание смен/отрядов организатором (частично Done — staff flow MVP), онлайн-Движки, смены/отряды, UX-доработки герба.
- **Аудиты категорий ai-data:** все 14 категорий проверены по Путеводитель.md (howToBecome, description, importance, examples, skillTips). Программа завершена.
- **ИИ-изображения:** используем OpenAI (OPENAI_API_KEY, IMAGE_PROVIDER=openai). Возможность переключения на другие провайдеры предусмотрена (IMAGE_PROVIDER + заглушки в image_providers.py); подключать другие API сейчас не обязательно.
- **Не трогать:** всё из секции Completed в ROADMAP; Evidence — проверять перед изменениями.

---

## 6. История выполненных claim (архив)

| Агент | Задача | Дата завершения |
|-------|--------|-----------------|
| **Gamma** | God Mode (Presenter): Супер-режим разработчика с виртуальным входом в отряды и движки, создание `godModeInterceptor`. | 2026-04-08 |
| D/E | UX-полировка 429/503 для ИИ-изображений (userMessageFromStatus, русские 503/501 в backend) | 2026-02-09 |
| D/E | Обновить .memory-bank/progress.md: пункты о завершённом (CI self-check и backend-health, доки BACKEND_URL, синхронизация §5 оркестрации) | 2026-02-09 |
| D/E | Проверить README / QUICK_START / DEPLOYMENT на self-check и BACKEND_URL; добавить упоминание BACKEND_URL в три файла | 2026-02-09 |
| D/E | Герб Движка шаг 2 — унификация с /api/images/generate, режим Process, удаление gerb-generate | 2026-02-09 |
| D/E | Синхронизировать блок «Где мы находимся» (§5) в AGENT_ORCHESTRATION с ROADMAP: буллет про CI (self-check, backend-health) | 2026-02-09 |
| D/E | Обновить блок «Где мы сейчас» в ROADMAP: кратко упомянуть CI (self-check в lint-and-test, job backend-health) | 2026-02-09 |
| D/E | Добавить в ROADMAP Evidence для CI: шаг npm run self-check и job backend-health (таблица инициатив, строка Done) | 2026-02-09 |
| D/E | CI job backend-health: запуск backend в фоне, ожидание /api/health, BACKEND_URL npm run self-check (ci.yml) | 2026-02-09 |
| D/E | Добавить в CI шаг npm run self-check перед build (ci.yml) | 2026-02-09 |
| D/E | Проверка GET /api/health в smoke-тест (self-check.mjs, BACKEND_URL, .env.example, deploy-check SKILL) | 2026-02-09 |
| **A** | Программа аудитов категорий 1–14 ai-data — завершена (docs/CATEGORY_AUDITS_COMPLETE.md, обновление отчётов) | 2026-02-09 |
| **A** | Аудит категории 8 ai-data по Путеводитель.md: CATEGORY_8_SOURCE_AUDIT_REPORT.md, правки 8.1–8.7 (howToBecome, skillTips), MASTER_INDEX 1.0.20, sync | 2026-02-09 |
| **A** | Аудит категории 7 ai-data по Путеводитель.md: CATEGORY_7_SOURCE_AUDIT_REPORT.md, правки 7.1–7.8 (howToBecome), MASTER_INDEX 1.0.19, sync | 2026-02-09 |
| **A** | Аудит категории 6 ai-data по Путеводитель.md: CATEGORY_6_SOURCE_AUDIT_REPORT.md, правки 6.1–6.4 (howToBecome, skillTips), MASTER_INDEX 1.0.18, sync | 2026-02-09 |
| **A** | Аудит категории 5 ai-data по Путеводитель.md: CATEGORY_5_SOURCE_AUDIT_REPORT.md, правки 5.1–5.10 (howToBecome), MASTER_INDEX 1.0.17, sync | 2026-02-09 |
| **A** | Аудит категории 4 ai-data по Путеводитель.md: CATEGORY_4_SOURCE_AUDIT_REPORT.md, правки 4.1–4.4, MASTER_INDEX 1.0.16, sync | 2026-02-09 |
| **Agent B** | Подключение разделов ЛК к POST /api/images/generate: imageGenerateApi.ts, SquadCornerDashboard, WingDashboard, ProfileView, TeamDashboard (onGenerate/onProcess) | 2026-02-09 |
| **A** | Аудит категории 1 ai-data по Путеводитель.md: CATEGORY_1_SOURCE_AUDIT_REPORT.md, правки 1.11.json, MASTER_INDEX 1.0.15, sync | 2026-02-09 |
| D/E | Rate limit для POST /api/teams/gerb-generate (deviceId/IP, 429, tech_context, .env.example) | 2026-02-09 |
| D/E | Rate limit для POST /api/images/generate (deviceId/IP, 429, tech_context, .env.example) | 2026-02-09 |
| D/E | GET /api/health — liveness backend, контракт в tech_context | 2026-02-09 |
| **A** | Аудит категории 3 ai-data по Путеводитель.md: CATEGORY_3_SOURCE_AUDIT_REPORT.md, правки 3.1–3.3, MASTER_INDEX 1.0.14, sync | 2026-02-09 |
| **A** | Аудит категории 2 ai-data по Путеводитель.md: CATEGORY_2_SOURCE_AUDIT_REPORT.md, правки 2.1–2.6, MASTER_INDEX 1.0.13, sync | 2026-02-09 |
| D/E | ИИ-изображения (backend): POST /api/images/generate, image_providers.py, рефакторинг gerb-generate, контракт в tech_context | 2026-02-09 |
| **Agent B** | ИИ-изображения во всех кабинетах — UX-каркас и единый паттерн UI (ImageSourceBlock, TeamDashboard, SquadCorner, Wing, ProfileView) | 2026-02-09 |
| **A** | Конфиг данных для «ИИ-изображения во всех кабинетах»: image-contexts.json, IMAGE_CONTEXTS_SPEC.md, Evidence в ROADMAP | 2026-02-09 |
| D/E | Обработка ошибок teams API: сетевые/5xx, кнопка «Повторить» при загрузке mine и join | 2026-02-09 |
| D/E | Онлайн-Движки (расширение): предпросмотр команды по коду перед вступлением | 2026-02-09 |
| **Agent B** | Герб Движка — UX-доработки (шаг 1.5): Скачать, Поделиться, Загрузить своё фото, Заменить | 2026-02-09 |
| **Agent B** | UX-шлифовка «Смены и отряды»: пустые состояния, классы, скроллбар модалок, адаптив | 2026-02-09 |
| **Agent B** | Консистентность пустых состояний и оформления ошибок: SquadCorner, панель заявок, TeamDashboard | 2026-02-09 |
| **Agent B** | UX TeamDashboard — единообразие ошибок и повтора (profile-error, profile-loading, dead code removal, joinRetryVisible) | 2026-02-09 |
| D/E | Staff flow MVP: добавить в ROADMAP (Done) с Evidence, обновить «Где мы сейчас» | 2026-02-09 |
| **C** | Синхронизация промптов backend ↔ cf-api: sync-cf-api-prompts.mjs, generated_camp_facts/generated_chat_prompt, DATA_SYNC.md, DEPLOY_* | 2026-02-09 |
| **C** | Персонализация ответов НейроВалюши по роли пользователя (user_role в контексте и системном промпте) | 2026-02-09 |

---

## 7. Шаблон отчёта агента

При завершении задачи создавать отчёт в `.cursor/agent orchestration/` по образцу [AGENT_B_SESSION_REPORT.md](AGENT_B_SESSION_REPORT.md):

1. **Идентификация агента** (A/B/C/D/E)
2. **Что сделано** (файлы, изменения)
3. **Проверки** (если были — grep, read и т.д.)
4. **Следующие шаги** (логичный next для других агентов)

Имя файла: `AGENT_X_SESSION_REPORT_<краткое_название>.md` или `REPORT_<название_задачи>.md`.
