# Точка входа для агента (Memory Bank)

Ты работаешь в репозитории **Путеводитель "Реальный Лагерь"**. Мы используем систему **Memory Bank** для поддержания гигиены контекста и точности разработки.

**Как давать задания агентам (для людей):** [docs/HOW_TO_BRIEF_AGENTS.md](docs/HOW_TO_BRIEF_AGENTS.md) — куда направлять, что смотреть, где проверять, с чего начать.

## 🧠 Memory Bank (ОБЯЗАТЕЛЬНО К ПРОЧТЕНИЮ)

**Single source of truth для текущего фокуса:** [.memory-bank/active_context.md](.memory-bank/active_context.md). **Архив статусов задач:** [docs/ROADMAP_2026.md](docs/ROADMAP_2026.md).

Перед началом любой задачи ознакомься с состоянием проекта:
0.  **[CLAUDE.md](CLAUDE.md)** — **Глобальные правила кодинга агента** (скиллы Карпаты: хирургическая точность, никаких додумок, Goal-Driven).
0x. **[.agents/standards/](.agents/standards/)** — **Индекс архитектурных стандартов проекта (Agent OS Index)**. Инжектить нужные в зависимости от задачи (Storage Provider, Vanilla CSS, Strangler Fig).
0a. **[.agents/skills/frontend-design/SKILL.md](.agents/skills/frontend-design/SKILL.md)** — **Принципы эстетического UI/UX дизайна** (от Design OS). Не создавать generic AI интерфейсы.
0b. **[.agents/workflows/design-os-handoff.md](.agents/workflows/design-os-handoff.md)** — **Пайплайн Handoff UI**. Сначала планируем и проектируем интерфейс/данные, только потом пишем код UI.
0c. **[.agents/workflows/tech-spec-handoff.md](.agents/workflows/tech-spec-handoff.md)** — **Пайплайн Handoff Business Logic**. Обязательно писать `TECH_SPEC.md` со ссылками на стандарты ДО кодинга API или интеграции логики.
1.  **[.memory-bank/active_context.md](.memory-bank/active_context.md)** — **Текущая задача** и фокус работы.
1a. **[docs/ROADMAP_2026.md](docs/ROADMAP_2026.md)** — архив Done/Evidence. Перед реализацией задачи проверь статус; если **Done** — не перереализовывать (риск перезаписи уже рабочего кода).
1a. **[.cursor/agent orchestration/AGENT_ORCHESTRATION.md](.cursor/agent%20orchestration/AGENT_ORCHESTRATION.md)** — при мульти-агентной работе **обязательно** перед стартом: проверить Claim Board (не занята ли задача), записать агента (A/B/C/D/E), задачу, дату и логичный следующий шаг. По завершении — обновить статус, создать отчёт в папке agent orchestration.
2.  **[.memory-bank/project_brief.md](.memory-bank/project_brief.md)** — Суть проекта и цели 2026.
3.  **[.memory-bank/product_logic.md](.memory-bank/product_logic.md)** — Игровые циклы (Loops), роли и прогрессия.
4.  **[.memory-bank/tech_context.md](.memory-bank/tech_context.md)** — Стек, контракты API, структура данных и "грабли".
4a. **[docs/ARCHITECTURE_AND_RESOURCES.md](docs/ARCHITECTURE_AND_RESOURCES.md)** — Подключённые ресурсы (Vercel, cf-api), роли, развитие продукта.
5.  **[.memory-bank/active_context.md](.memory-bank/active_context.md)** — **Текущая задача** и фокус работы.
6.  **[.memory-bank/progress.md](.memory-bank/progress.md)** — Детальный лог выполненного, Accepted UX (что не менять), Recent Changes.
7.  **[agent-sync.md](agent-sync.md)** — **Inter-Agent Sync Board** 🤝 При старте сессии обязательно идентифицируйте свою роль/грейд (см. [.cursor/agent orchestration/AGENT_ROLES.md](.cursor/agent orchestration/AGENT_ROLES.md)) и запишите это в sync board. Оставляйте короткие архитектурные планы и ручные лок-файлы.

## Департаменты разработки (Оркестрация)

Если в промпте указана ваша роль (или вы сами решаете, какой отдел требуется для задачи), немедленно переходите в профильный Runbook вашего отдела:
- 📖 **Tech Documentation (Техдокументация):** [docs/TECHDOCS_DEPARTMENT_RUNBOOK.md](docs/TECHDOCS_DEPARTMENT_RUNBOOK.md) — Синхронизация SSOT, API контракты, Roadmap.
- 🏗️ **Refactoring (Рефакторинг):** [docs/REFACTORING_DEPARTMENT_RUNBOOK.md](docs/REFACTORING_DEPARTMENT_RUNBOOK.md) — Безопасное расщепление монолитов (ProfileView) и миграция бэкенда на StorageProvider.

## Plan Mode и Build (Cursor)

**Критично:** Перед выполнением любого плана (Build / Plan implementation) ОБЯЗАТЕЛЬНО проверь [docs/ROADMAP_2026.md](docs/ROADMAP_2026.md). Если задача уже помечена **Done** — не выполняй. Устаревшие планы (proof_questionnaire_restoration, onboarding_hints и т.п.) могут циклически предлагаться — игнорируй их. Текущий фокус — в [active_context.md](.memory-bank/active_context.md).

## Воркфлоу разработки

1.  **Planning:** Перед написанием кода создай/обнови план в `active_context.md` или в отдельном файле плана.
2.  **Verification:** Всегда проверяй себя: `npm run self-check`, линтеры и тесты.
3.  **Sync:** При изменении контента в `ai-data/` обязательно делай синхронизацию в `public/ai-data/` (см. `tech_context.md`).
4.  **Memory Update:** После завершения задачи обнови `progress.md` и `active_context.md`.

## 🚀 Команды (шпаргалка)

- `npm run self-check` — общая проверка проекта.
- `python update_indexes.py` — пересчёт индексов в `ai-data/`.
- `npm run images:webp` — генерация WebP для картинок значков.
- См. подробности по портам и запуску в `tech_context.md`.
