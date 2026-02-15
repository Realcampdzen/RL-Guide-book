# Как давать задания агентам

Краткая шпаргалка: куда направлять агентов, что им смотреть, где проверять, с чем сверяться и с чего начинать выполнение.

---

## 1. Куда агентам «идти» (точки входа)

**Главная точка входа:** [agent.md](../agent.md) в корне проекта. В правилах Cursor указано: при старте сессии или работе с данными/деплоем читать `agent.md`.

Оттуда агент переходит в:

| Куда | Зачем |
|------|--------|
| [docs/ROADMAP_2026.md](ROADMAP_2026.md) | Единый источник истины: что Done (не трогать), что Not started, «Где мы сейчас», Evidence (ссылки на код). |
| [.cursor/agent orchestration/AGENT_ORCHESTRATION.md](../.cursor/agent%20orchestration/AGENT_ORCHESTRATION.md) | **Перед началом работы:** Claim Board — проверить, не занята ли задача; записать агента, задачу, следующий шаг. Сводка кто что сделал. |
| [.memory-bank/active_context.md](../.memory-bank/active_context.md) | Текущая задача и фокус; при мульти-агентной работе — роли (Agent A/B/C/D/E) и зоны ответственности. |
| [.memory-bank/progress.md](../.memory-bank/progress.md) | Что уже сделано, Accepted UX (что не менять), Recent Changes. |
| [.memory-bank/tech_context.md](../.memory-bank/tech_context.md) | Стек, контракты API, синхронизация ai-data ↔ public/ai-data, порты, «грабли». |
| [docs/ONBOARDING.md](ONBOARDING.md) | Карта документов, чек-лист «перед началом работы», порядок входа. |

**Итог:** задание агентам формулируй так, чтобы они сначала заходили в `agent.md` → ROADMAP и Memory Bank, а не сразу в код.

---

## 2. Что им «смотреть» перед задачей

- **ROADMAP:** таблица инициатив — статус (Done / Not started) и колонка Evidence (файлы/функции). Если задача в Done — не реализовывать заново.
- **«Где мы сейчас»** в ROADMAP — откуда брать следующую задачу (или явно указать задачу ты).
- **progress.md:** Accepted UX и Recent Changes — чтобы не ломать зафиксированное поведение и не дублировать недавние изменения.
- **Доменные доки под задачу:** ЛК/механики — [STEPA_VISION_LC.md](STEPA_VISION_LC.md); геймдизайн/этапы — [WORKFLOW_GAME_CONCEPT_PLAN.md](../WORKFLOW_GAME_CONCEPT_PLAN.md) и [WORKFLOW_PROGRESS_AND_PLANS.md](../WORKFLOW_PROGRESS_AND_PLANS.md); роли/вожатые — [FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md](FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md).

**Итог:** «смотреть» = ROADMAP + progress + при необходимости доменный план/видение.

---

## 3. Где «проверять» и с чем «сверяться»

- **Проверка «не переделывать готовое»:** таблица в ROADMAP + при сомнении — открыть Evidence (указанные файлы/места в коде).
- **Проверка «не ломать UX»:** раздел Accepted UX в [.memory-bank/progress.md](../.memory-bank/progress.md).
- **Сверка с планом:** если задача из WORKFLOW/FEATURE_* — свериться с чек-листами и DoD в соответствующем плане; при расхождении приоритетов — [WORKFLOW_GAME_CONCEPT_PLAN.md](../WORKFLOW_GAME_CONCEPT_PLAN.md).
- **После реализации:** `npm run self-check`, линтеры, тесты; при изменении контента в `ai-data/` — синхронизация в `public/ai-data/` (по [tech_context.md](../.memory-bank/tech_context.md)).

**Итог:** проверять по ROADMAP + Evidence и progress; сверяться с доменным планом и tech_context.

---

## 4. С чего начинать выполнение

Рекомендуемый порядок (подробнее в [ONBOARDING.md](ONBOARDING.md)):

1. Прочитать [agent.md](../agent.md).
2. Открыть [active_context.md](../.memory-bank/active_context.md) — понять текущий фокус и, при рое, свою роль (A/B/C/D/E).
3. Открыть [ROADMAP_2026.md](ROADMAP_2026.md): прочитать «Где мы сейчас»; убедиться, что выбранная задача **не в статусе Done**; при необходимости открыть Evidence.
4. **Открыть [AGENT_ORCHESTRATION.md](../.cursor/agent%20orchestration/AGENT_ORCHESTRATION.md):** проверить Claim Board — не занята ли выбранная задача; если свободна — записать себя (агент, задача, дата, логичный следующий шаг). Это обязательно при мульти-агентной работе.
5. Просмотреть [progress.md](../.memory-bank/progress.md) (Accepted UX, Recent Changes).
6. Взять задачу из «Где мы сейчас» или из Not started (или ту, что явно дал ты).
7. Для ЛК — учесть [STEPA_VISION_LC.md](STEPA_VISION_LC.md); для геймдизайна/этапов — [WORKFLOW_GAME_CONCEPT_PLAN.md](../WORKFLOW_GAME_CONCEPT_PLAN.md) / [WORKFLOW_PROGRESS_AND_PLANS.md](../WORKFLOW_PROGRESS_AND_PLANS.md).
8. Спланировать в active_context (или в отдельном плане), потом реализовать.
9. По завершении: обновить [progress.md](../.memory-bank/progress.md), Claim Board в [AGENT_ORCHESTRATION.md](../.cursor/agent%20orchestration/AGENT_ORCHESTRATION.md) (статус Done), при смене статуса — [ROADMAP_2026.md](ROADMAP_2026.md). Создать отчёт в `.cursor/agent orchestration/` по образцу AGENT_B_SESSION_REPORT.

**Итог:** начало выполнения = agent.md → active_context → ROADMAP → **Claim Board (проверка + запись)** → progress → выбор задачи → план → код.

---

## 5. Как формулировать задания

- **«Дальше по ROADMAP» / «Следующая задача из „Где мы сейчас“»** — агент сам идёт в agent.md → ROADMAP → active_context и выбирает задачу.
- **«Реализуй [название из ROADMAP]» / «Сделай то-то по FEATURE_*»** — агент всё равно проверяет ROADMAP (не Done ли уже) и Evidence, сверяется с планом.
- **«Добавь в ROADMAP инициативу X и сделай её» / «Предложи следующую задачу из видения/планов»** — агент смотрит ROADMAP, STEPA_VISION_LC, WORKFLOW_*, progress и предлагает/добавляет задачу.

В формулировке полезно явно указать: «сначала зайди в agent.md и ROADMAP» (если агент новый или контекст сброшен). Для домена: «по ЛК», «по геймдизайну», «по ролям» — тогда агент откроет соответствующий док.
