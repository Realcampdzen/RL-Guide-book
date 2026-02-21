# PLAN_P1-03 — Backend: Supabase provider для badge_requests, parent_snapshots, chat_daily_usage

**Агент:** A  
**Task ID:** P1-03  
**Дата создания плана:** 2026-02-21  
**Статус:** in_progress

---

## 1. Цель задачи

Дополнить StorageProvider тремя оставшимися сторами: `BadgeRequestsStore`, `ParentSnapshotsStore`, `ChatDailyUsageStore`. Убедиться, что эндпоинты `/api/badges/requests*`, `/api/parent-snapshot`, `/api/chat/limits` работают через Supabase в prod.

---

## 2. Контекст (что уже есть)

- После P1-02: `backend/storage/` уже есть, 6 сторов реализованы.
- Осталось добавить 3 стора, которые используются в других эндпоинтах.
- `chat_daily_usage` имеет специфическую структуру: dict `{date: {device_id: count}}`.

---

## 3. Файлы для изменения

| Файл | Тип | Описание |
|------|-----|----------|
| `backend/storage/base.py` | modify | Добавить 3 абстрактных класса |
| `backend/storage/json_provider.py` | modify | Добавить 3 JSON-реализации |
| `backend/storage/supabase_provider.py` | modify | Добавить 3 Supabase-реализации |
| `backend/app.py` | modify | Переключить оставшиеся 3 стора на `get_store()` |

---

## 4. Шаги реализации

1. Добавить в `base.py`: `BadgeRequestsStore`, `ParentSnapshotsStore`, `ChatDailyUsageStore`.
2. Добавить в `json_provider.py` — перенести логику из `app.py`.
3. Добавить в `supabase_provider.py` — CRUD для таблиц `badge_requests`, `parent_snapshots`, `chat_daily_usage`.
4. Рефакторить оставшиеся вызовы в `app.py`.
5. Smoke-тест: POST заявку → inbox → approve → синк.

---

## 5. Зависимости

- **Зависит от:** P1-01, P1-02
- **Блокирует:** P1-09 (UX smoke-сценарии)

---

## 6. Definition of Done

- [x] 3 стора реализованы в обоих провайдерах
- [x] Эндпоинты `/api/badges/requests*`, `/api/parent-snapshot`, `/api/chat/limits` работают
- [x] Smoke-тест: badge request flow end-to-end
- [x] Smoke-тест: parent snapshot create + read
