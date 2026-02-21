# CLAIM_BOARD — Живая доска задач (PROD_ROADMAP_IMPL)

**Назначение:** единая точка координации 4 агентов. Перед взятием задачи — обязательно проверить этот файл.  
**Полный список задач:** [`TASKS.md`](TASKS.md)  
**Инструкция:** [`AGENT_INSTRUCTIONS.md`](AGENT_INSTRUCTIONS.md)

---

## Как обновлять

- При **старте** задачи: добавить строку со статусом `in_progress`.
- При **завершении**: изменить статус на `done`, добавить ссылку на отчёт.
- Если задача **заблокирована**: поставить `blocked` и указать причину.

**Правило:** если задача уже `in_progress` — не бери её. Выбери другую.

---

## Текущий Claim Board (Фаза 1)

| Агент | Task ID | Задача | Статус | Дата начала | Следующий шаг | Отчёт |
|-------|---------|--------|--------|-------------|---------------|-------|
| **Agent A** | P1-01 | Supabase schema v1 | ✅ done | 2026-02-21 | — | `backend/migrations/001_schema_v1.sql` |
| **Agent A** | P1-02 | StorageProvider + Supabase (основные домены) | ✅ done | 2026-02-21 | — | `backend/storage/` (4 файла) + рефакторинг `app.py` |
| **Agent A** | P1-03 | Supabase для badge_requests/parent_snapshots/chat | ✅ done | 2026-02-21 | — | Включено в P1-02 (все 8 сторов сразу) |
| **Agent D** | P1-04 | Закрыть dev-двери в production | ✅ done | 2026-02-21 | — | [REPORT_D_P1-04.md](reports/REPORT_D_P1-04.md) |
| **Agent B** | P1-05 | Убрать forced traveler | done | 2026-02-21 | P1-09 следующим | [REPORT_B_P1-05.md](reports/REPORT_B_P1-05.md) |
| **Agent D** | P1-06 | Server-side RBAC по JWT | ✅ done | 2026-02-21 | — | [REPORT_D_P1-06.md](reports/REPORT_D_P1-06.md) |
| **Agent C** | P1-07 | Rate limits + safety-фильтры чата | ✅ done | 2026-02-21 | — | [REPORT_C_P1-07.md](reports/REPORT_C_P1-07.md) |
| **Agent C** | P1-08 | Единый контур чата через backend | ✅ done | 2026-02-21 | — | [REPORT_C_P1-08.md](reports/REPORT_C_P1-08.md) |
| **Agent B** | P1-09 | UX smoke-сценарии | done | 2026-02-21 | E2E с Supabase ждёт P1-03 | [REPORT_B_P1-09.md](reports/REPORT_B_P1-09.md) |
| **Agent D** | P1-10 | Docs: staging checklist + monitoring | ✅ done | 2026-02-21 | — | [REPORT_D_P1-10.md](reports/REPORT_D_P1-10.md) |

---

## Текущий Claim Board (Фаза 2)

*Приступать только после завершения всех задач Фазы 1.*

| Агент | Task ID | Задача | Статус | Дата начала | Следующий шаг | Отчёт |
|-------|---------|--------|--------|-------------|---------------|-------|
| **Agent D** | P2-01 | RBAC для educator | ✅ done | 2026-02-21 | — | [REPORT_D_P2-01.md](reports/REPORT_D_P2-01.md) |
| **Agent B** | P2-02 | Дашборды staff | done | 2026-02-21 | inbox-фильтры, статистика, участники, educator join | [REPORT_B_P2-02.md](reports/REPORT_B_P2-02.md) |
| **Agent C** | P2-03 | Совет Лагеря — инициативы | ✅ done | 2026-02-21 | — | [REPORT_C_P2-03.md](reports/REPORT_C_P2-03.md) |
| **Agent B** | P2-04 | Кабинет педагога v1 | done | 2026-02-21 | EducatorCabinetPanel → кабина, 3 вкладки | [REPORT_B_P2-04.md](reports/REPORT_B_P2-04.md) |

---

## История выполненных задач (архив)

| Агент | Task ID | Задача | Дата завершения | Отчёт |
|-------|---------|--------|-----------------|-------|
| Agent B | P1-05 | Убрать forced traveler | 2026-02-21 | [REPORT_B_P1-05.md](reports/REPORT_B_P1-05.md) |
| Agent B | P1-09 | UX smoke-сценарии | 2026-02-21 | [REPORT_B_P1-09.md](reports/REPORT_B_P1-09.md) |
| Agent D | P1-04 | Закрыть dev-двери в production | 2026-02-21 | [REPORT_D_P1-04.md](reports/REPORT_D_P1-04.md) |
| Agent D | P1-06 | Server-side RBAC по JWT | 2026-02-21 | [REPORT_D_P1-06.md](reports/REPORT_D_P1-06.md) |
| Agent D | P1-10 | Docs: staging checklist + monitoring | 2026-02-21 | [REPORT_D_P1-10.md](reports/REPORT_D_P1-10.md) |
| Agent D | P2-01 | RBAC для educator | 2026-02-21 | [REPORT_D_P2-01.md](reports/REPORT_D_P2-01.md) |
| Agent B | P2-02 | Дашборды staff | 2026-02-21 | [REPORT_B_P2-02.md](reports/REPORT_B_P2-02.md) |
| Agent B | P2-04 | Кабинет педагога v1 | 2026-02-21 | [REPORT_B_P2-04.md](reports/REPORT_B_P2-04.md) |
| Agent C | P1-07 | Rate limits + safety-фильтры чата | 2026-02-21 | [REPORT_C_P1-07.md](reports/REPORT_C_P1-07.md) |
| Agent C | P1-08 | Единый контур чата через backend | 2026-02-21 | [REPORT_C_P1-08.md](reports/REPORT_C_P1-08.md) |
| Agent C | P2-03 | Совет Лагеря — инициативы | 2026-02-21 | [REPORT_C_P2-03.md](reports/REPORT_C_P2-03.md) |

---

## Зависимости (граф)

```
P1-01 ──► P1-02 ──► P1-03 ──► P1-09
                               ▲
P1-04 ──────────────────────────┤
P1-05 (depends P1-06) ──────────┤
P1-06 ──► P1-05, P1-08 ─────────┘
P1-07 (независимо)
P1-08 (depends P1-06) ──► P1-09
P1-10 (независимо, параллельно)

P2-01 (depends P1-06) ──► P2-02, P2-04
P2-03 (depends P1-01)
```
