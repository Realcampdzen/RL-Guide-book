# PLAN_P1-02 — Backend: StorageProvider + Supabase provider (основные домены)

**Агент:** A  
**Task ID:** P1-02  
**Дата создания плана:** 2026-02-21  
**Статус:** in_progress

---

## 1. Цель задачи

Создать абстракцию `StorageProvider` в `backend/storage/` и реализовать два провайдера: JSON (local dev) и Supabase (prod). Переключение по `USE_SUPABASE=true`. Покрывает 6 основных сторов: shifts, squads, memberships, squad_corners, squad_invites, squad_messages.

---

## 2. Контекст (что уже есть)

- `backend/app.py` содержит 8 пар `_xxx_load()/_xxx_save()` — функции читают/пишут JSON-файлы.
- Каждый файл защищён `threading.Lock()`.
- Логику не меняем — только выносим в StorageProvider.

---

## 3. Файлы для изменения

| Файл | Тип | Описание |
|------|-----|----------|
| `backend/storage/__init__.py` | create | Фабрика `get_store(name)` |
| `backend/storage/base.py` | create | Абстрактные Store классы (ABC) |
| `backend/storage/json_provider.py` | create | JSON-реализация (переносим из app.py) |
| `backend/storage/supabase_provider.py` | create | Supabase CRUD |
| `backend/app.py` | modify | Заменить `_xxx_load()/_xxx_save()` на `get_store('xxx').load()/.save()` |

---

## 4. Шаги реализации

1. Создать `backend/storage/` с пустым `__init__.py`.
2. Написать `base.py` — 6 абстрактных Store классов (ShiftsStore, SquadsStore, MembershipsStore, SquadCornersStore, SquadInvitesStore, SquadMessagesStore).
3. Написать `json_provider.py` — перенести логику `_xxx_load()/_xxx_save()` из `app.py` один-к-одному.
4. Написать `supabase_provider.py` — Supabase CRUD для тех же 6 сторов.
5. Написать `__init__.py` — фабрика `get_store(name)` с переключением по `USE_SUPABASE`.
6. Рефакторить `app.py` — заменить вызовы на `get_store('xxx').load()/.save()`.

---

## 5. Зависимости

- **Зависит от:** P1-01
- **Блокирует:** P1-03

---

## 6. Definition of Done

- [x] `backend/storage/` создан со всеми 4 файлами
- [x] 6 сторов реализованы в обоих провайдерах
- [x] `app.py` использует `get_store()` для 6 доменов
- [x] Local dev не сломан (`USE_SUPABASE=false`)
