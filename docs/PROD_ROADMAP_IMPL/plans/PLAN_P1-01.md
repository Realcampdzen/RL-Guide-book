# PLAN_P1-01 — Supabase: создать schema v1

**Агент:** A  
**Task ID:** P1-01  
**Дата создания плана:** 2026-02-21  
**Статус:** in_progress

---

## 1. Цель задачи

Создать SQL-миграцию с 9 таблицами по спецификации `docs/SUPABASE_SCHEMA_AND_MIGRATION.md` §3 и сохранить её в `backend/migrations/001_schema_v1.sql`. Это разблокирует P1-02 и P1-03 (StorageProvider).

---

## 2. Контекст (что уже есть)

- Вся мутируемая data сейчас в `backend/data/*.json` (9 файлов).
- Supabase проект уже подключён (в `.env` есть `SUPABASE_URL` — судя по упоминанию в PRODUCT_MECHANICS_AND_ROADMAP.md).
- Папки `backend/migrations/` нет — создать.

---

## 3. Файлы для изменения

| Файл | Тип изменения | Описание |
|------|---------------|----------|
| `backend/migrations/001_schema_v1.sql` | create | SQL схема v1, 9 таблиц |
| `docs/SUPABASE_SCHEMA_AND_MIGRATION.md` | modify | Этап 0 помечен как выполненный |

---

## 4. Шаги реализации

1. Создать папку `backend/migrations/`.
2. Написать `001_schema_v1.sql` точно по спецификации §3 (все 9 таблиц, индексы, constraints).
3. Обновить `docs/SUPABASE_SCHEMA_AND_MIGRATION.md` §5 Этап 0 — пометить выполненным.

---

## 5. Зависимости

- **Зависит от:** нет
- **Блокирует:** P1-02, P1-03

---

## 6. Definition of Done

- [x] Создана папка `backend/migrations/`
- [x] `001_schema_v1.sql` содержит все 9 таблиц
- [x] Все индексы и constraints применены
- [x] `docs/SUPABASE_SCHEMA_AND_MIGRATION.md` обновлён
