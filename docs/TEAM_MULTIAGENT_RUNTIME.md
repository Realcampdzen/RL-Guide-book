# TEAM_MULTIAGENT_RUNTIME.md

## Цель
Подключить Дев Бро Один в общую инженерную среду Путеводителя без конфликтов и хаоса.

---

## Единая среда (best-practice)

**Source of truth:**
- Один главный репозиторий: `D:\openclaw-workspace\putevoditel-backup`
- Один roadmap/claim board:
  - `docs/ROADMAP_2026.md`
  - `docs/PROD_ROADMAP_IMPL/CLAIM_BOARD.md`

**Роли:**
- НейроСтёпа — Chief Architect / Orchestrator
- Дев Бро Один — Lead Dev Executor / Coder
- Кот Бро — SMM + Dev-aware handoff
- Фин Бро — финконтур

---

## Рабочая схема для Дев Бро Один

### 1) Изоляция кода без потери общей среды: git worktree

Создаём отдельный рабочий каталог Дев Бро Один, но в том же репо:

```powershell
cd D:\openclaw-workspace\putevoditel-backup
git fetch --all
git worktree add D:\openclaw-workspace\putevoditel-devbro devbro/main
```

Если ветки нет:

```powershell
cd D:\openclaw-workspace\putevoditel-backup
git checkout -b devbro/main
git push -u origin devbro/main
```

И потом снова `git worktree add ...`.

### 2) Scope-ветки на каждую задачу
Формат:
- `devbro/m2-<slice>-<short-name>`
- `devbro/m3-<feature>-<short-name>`

### 3) Обязательный контракт исполнения
Каждая задача Дев Бро Один:
1. `TASK` (scope + DoD)
2. `PLAN` (шаги)
3. `IMPLEMENT` (код)
4. `REPORT`:
   - что сделано
   - какие файлы
   - риски
   - commit hash

---

## Handoff в общую команду

После каждой dev-задачи Дев Бро Один обязан создать:
- `handoff/YYYY-MM-DD-<task>.md`

Минимум в handoff:
- Problem
- Change
- User impact
- Publishability (public/internal)
- Confidence (CONFIRMED/PROBABLE/BLOCKED)

Это напрямую кормит Кота Бро для SMM без фантазий.

---

## Оркестрация и правила

1. Дев Бро Один не меняет архитектурные контракты без `NEEDS_REVIEW`.
2. Любой спорный кейс — эскалация НейроСтёпе.
3. Без `REPORT + commit hash` задача не считается завершённой.
4. Публичные формулировки только на основе `handoff/*` и реальных коммитов.

---

## Definition of Done (командный)

Задача считается закрытой, если:
- код закоммичен,
- claim/roadmap обновлён,
- handoff создан,
- оркестратор подтвердил статус (`done`).
