# Как давать задания агентам

Краткая шпаргалка: куда направлять агентов, что им смотреть, где проверять, с чем сверяться и с чего начинать выполнение.

---

## 1. Куда агентам «идти» (точки входа)

**Главная точка входа:** [agent.md](../agent.md) в корне проекта. В правилах Cursor указано: при старте сессии или работе с данными/деплоем читать `agent.md`.

Оттуда агент переходит в:

| Куда | Зачем |
|------|--------|
| [docs/ROADMAP_2026.md](ROADMAP_2026.md) | Архив задач: таблица Done/Evidence. Проверить перед реализацией — если Done, не трогать. |
| [.cursor/agent orchestration/AGENT_ORCHESTRATION.md](../.cursor/agent%20orchestration/AGENT_ORCHESTRATION.md) | **Перед началом работы:** Claim Board — проверить, не занята ли задача; записать агента, задачу, следующий шаг. Сводка кто что сделал. |
| [.cursor/agent orchestration/AGENT_ROLES.md](../.cursor/agent%20orchestration/AGENT_ROLES.md) | **Система Ролей (Big Tech):** Узнать свой грейд (L3-L6) и специализацию (SWE, SRE, Arch, Staff) перед началом работы. |
| [agent-sync.md](../agent-sync.md) | **Sync Board:** Прописать себя (Онбординг), оставить статус и лог действий для других агентов. |
| [.memory-bank/active_context.md](../.memory-bank/active_context.md) | Текущая задача и фокус; при мульти-агентной работе — роли (Agent A/B/C/D/E) и зоны ответственности. |
| [.memory-bank/progress.md](../.memory-bank/progress.md) | Что уже сделано, Accepted UX (что не менять), Recent Changes. |
| [.memory-bank/tech_context.md](../.memory-bank/tech_context.md) | Стек, контракты API, синхронизация ai-data ↔ public/ai-data, порты, «грабли». |
| [.cursor/agent orchestration/CODE_REVIEW_PROTOCOL.md](../.cursor/agent%20orchestration/CODE_REVIEW_PROTOCOL.md) | **Правила написания кода.** Устанавливает гибридный флоу. Серьезные задачи писать только через `git checkout -b` и локальные Pull Requests! |
| [docs/ONBOARDING.md](ONBOARDING.md) | Карта документов, чек-лист «перед началом работы», порядок входа. |

**Итог:** задание агентам формулируй так, чтобы они сначала заходили в `agent.md` → ROADMAP и Memory Bank, а не сразу в код.

---

## 2. Что им «смотреть» перед задачей

- **ROADMAP:** таблица инициатив — статус (Done / Not started) и колонка Evidence (файлы/функции). Если задача в Done — не реализовывать заново.
- **«Где мы сейчас»** в ROADMAP — откуда брать следующую задачу (или явно указать задачу ты).
- **progress.md:** Accepted UX и Recent Changes — чтобы не ломать зафиксированное поведение и не дублировать недавние изменения.
- **Доменные доки под задачу:** ЛК/механики — [STEPA_VISION_LC.md](STEPA_VISION_LC.md); геймдизайн/этапы — [WORKFLOW_PROGRESS_AND_PLANS.md](../WORKFLOW_PROGRESS_AND_PLANS.md) и `PRODUCT_MECHANICS_AND_ROADMAP.md`.

**Итог:** «смотреть» = ROADMAP + progress + при необходимости доменный план/видение.

---

## 3. Где «проверять» и с чем «сверяться»

- **Проверка «не переделывать готовое»:** таблица в ROADMAP + при сомнении — открыть Evidence (указанные файлы/места в коде).
- **Проверка «не ломать UX»:** раздел Accepted UX в [.memory-bank/progress.md](../.memory-bank/progress.md).
- **Сверка с планом:** если задача из WORKFLOW/FEATURE_* — свериться с чек-листами и DoD в соответствующем плане; при расхождении приоритетов — [WORKFLOW_PROGRESS_AND_PLANS.md](../WORKFLOW_PROGRESS_AND_PLANS.md).
- **После реализации:** `npm run self-check`, линтеры, тесты; при изменении контента в `ai-data/` — синхронизация в `public/ai-data/` (по [tech_context.md](../.memory-bank/tech_context.md)).

**Итог:** проверять по ROADMAP + Evidence и progress; сверяться с доменным планом и tech_context.

---

## 4. С чего начинать выполнение

Рекомендуемый порядок (подробнее в [ONBOARDING.md](ONBOARDING.md)):

1. Прочитать [agent.md](../agent.md).
2. **Пройти HR-Онбординг:** Открыть [AGENT_ROLES.md](../.cursor/agent%20orchestration/AGENT_ROLES.md) и проанализировать текущую занятость в `agent-sync.md` и `Claim Board`. Не присваивать себе роль сразу! Сначала вывести пользователю анализ: "Чего не хватает лабе" и спросить, какую вакансию занять.
3. После утверждения пользователем — записать свой статус инициализации (выбранный позывной и грейд) в [agent-sync.md](../agent-sync.md).
4. Открыть [active_context.md](../.memory-bank/active_context.md) — понять текущий фокус.
5. Открыть [ROADMAP_2026.md](ROADMAP_2026.md): прочитать «Где мы сейчас»; убедиться, что выбранная задача **не в статусе Done**.
6. **Открыть [AGENT_ORCHESTRATION.md](../.cursor/agent%20orchestration/AGENT_ORCHESTRATION.md):** обновить Claim Board — записать себя. Это обязательно.
7. Просмотреть [progress.md](../.memory-bank/progress.md) (Accepted UX, Recent Changes).
8. **Проверка Spec-Driven Development (SDD):** Если задача касается новой крупной логики (epic, feature), она **обязана** иметь Спецификацию в `.cursor/specs/`. Если Спецификации нет, Агент должен переключиться в роль Product Manager (Аналитик), задать СЕО (Пользователю) нужные вопросы и сгенерировать `SPEC_ИМЯ.md`. **Не писать код без ТЗ!**
9. **Оценить объем задачи:** Если задача требует новой логики, рефакторинга или затрагивает важные узлы БД — прочитать [CODE_REVIEW_PROTOCOL.md](../.cursor/agent%20orchestration/CODE_REVIEW_PROTOCOL.md). Такие задачи выполняются **только в новой локальной git ветке** через систему `.cursor/pull_requests/`. Мелкие UI правки (<10 строк) можно делать прямо в `main`.
10. Взять задачу и спланировать решение, записав короткий план в `agent-sync.md`.
11. По завершении: обновить `agent-sync.md`, Claim Board (статус Done или "Ожидает ревью") и создать отчёт.

**Итог:** начало выполнения = agent.md → AGENT_ROLES.md → Выдача Роли → agent-sync.md → active_context → ROADMAP (Done check) → SDD Проверка Спецификации → Git Checkout → код.

---

## 5. Как формулировать задания

- **«Дальше по ROADMAP» / «Следующая задача»** — агент идёт в agent.md → active_context → ROADMAP и выбирает задачу.
- **«Реализуй [название из ROADMAP]» / «Сделай то-то по FEATURE_*»** — агент всё равно проверяет ROADMAP (не Done ли уже) и Evidence, сверяется с планом.
- **«Добавь в ROADMAP инициативу X и сделай её» / «Предложи следующую задачу из видения/планов»** — агент смотрит ROADMAP, STEPA_VISION_LC, WORKFLOW_*, progress и предлагает/добавляет задачу.

В формулировке полезно явно указать: «сначала зайди в agent.md и ROADMAP» (если агент новый или контекст сброшен). Для домена: «по ЛК», «по геймдизайну», «по ролям» — тогда агент откроет соответствующий док.
