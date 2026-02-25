# OPS_BOARD.md

Живой операционный борд НейроСтёпы (O1).

## Правила использования

- Обновлять ежедневно (утро/вечер).
- Каждая задача: владелец, статус, дедлайн, критерий done.
- Не держать в `In Progress` больше 3 активных задач одновременно.

Статусы:
- `todo`
- `in_progress`
- `blocked`
- `done`

---

## Backlog (todo)

- [ ] O1-J1-001 — Ежедневный комментарий под каждый пост (без дублей)
  - Owner: NeuroStepa
  - Deadline: daily
  - Done when: 1 пост = 1 уместный коммент

- [ ] O1-J2-001 — FAQ-ответы в обсуждениях по decision tree
  - Owner: NeuroStepa
  - Deadline: daily
  - Done when: ответы точные, с safety-оговорками при переменных данных

- [ ] O1-J4-001 — Дистилляция входящих длинных текстов в SMM-юниты
  - Owner: NeuroStepa
  - Deadline: rolling
  - Done when: на каждый материал есть инсайты + шаблоны + CTA

- [ ] O1-J3-001 — Подготовка assistant-режима для approvals (черновики решений)
  - Owner: NeuroStepa
  - Deadline: week
  - Done when: есть формат decision-support без автопринятия

---

## In Progress

- [ ] O1-J1-002 — Тон и формат: короткие абзацы + 1 пример -> 1 вывод
  - Owner: NeuroStepa
  - Started: 2026-02-25
  - Notes: правило внесено в runtime-конфиг обсуждений

- [ ] O1-J2-002 — Стабилизация реакции на нейтральные реплики (без silent NO_REPLY)
  - Owner: NeuroStepa
  - Started: 2026-02-25
  - Notes: обновлён system prompt для безопасных нейтральных запросов

- [ ] M1-Q1-001 — План scoped engines (camp|shift|squad)
  - Owner: NeuroStepa
  - Started: 2026-02-25
  - Notes: базовый план создан, требуется детальный техсрез по endpoint'ам

---

## Blocked

- [ ] O1-OPS-001 — Стабильный restart gateway через CLI
  - Owner: NeuroStepa
  - Reason: конфликт supervisor/lock на порту 18789
  - Next: унифицировать команду stop/start через service task

---

## Done

- [x] O1-ARCH-001 — Зафиксирована модель Operations Layer
  - Evidence: `docs/NEUROSTEPA_OPERATIONS_LAYER.md`

- [x] O1-ARCH-002 — Зафиксирован value filter (Must adopt / Adapt / Ignore)
  - Evidence: `docs/NEUROSTEPA_VALUE_FILTER.md`

- [x] O1-ARCH-003 — Зафиксирована система jobs v1
  - Evidence: `docs/NEUROSTEPA_OPS_SYSTEM_V1.md`

- [x] O1-SMM-001 — Собран индекс SMM-системы
  - Evidence: `docs/smm/README.md`
