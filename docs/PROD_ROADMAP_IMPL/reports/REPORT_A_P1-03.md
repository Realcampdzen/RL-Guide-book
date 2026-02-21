# REPORT_A_P1-03 — Supabase provider для badge_requests, parent_snapshots, chat_daily_usage

**Агент:** A  
**Task ID:** P1-03  
**Дата:** 2026-02-21  
**Статус:** ✅ Done

---

## Что сделано

P1-03 выполнен совместно с P1-02 в едином StorageProvider модуле. Все 3 стора реализованы в обоих провайдерах с первого же коммита.

| Стор | JSON | Supabase | app.py endpoint |
|------|------|----------|-----------------|
| BadgeRequestsStore | ✅ | ✅ | `/api/badges/requests*` |
| ParentSnapshotsStore | ✅ | ✅ | `/api/parent-snapshot` |
| ChatDailyUsageStore | ✅ | ✅ | `/api/chat/limits`, внутри чата |

### Особенности реализации

**BadgeRequestsStore:**
- Формат: `{'requests': [...]}`
- Supabase: таблица `badge_requests` с полным маппингом camelCase ↔ snake_case

**ParentSnapshotsStore:**
- Формат: `{code: {payload, expiresAt, createdAt, createdByDeviceId}}`
- Supabase: таблица `parent_snapshots`, TTL контролируется приложением

**ChatDailyUsageStore:**
- Формат: `{'YYYY-MM-DD': {device_id: count}}`
- Supabase: таблица `chat_daily_usage` с PRIMARY KEY (device_id, day), UPSERT
- В JSON-провайдере: thread-safe через `_CHAT_DAILY_LOCK`
- В `_check_and_inc_chat_daily()`: логика чтения + атомарного инкремента через get_store()

---

## Проверки

- [x] Все три стора доступны через `get_store('badge_requests' | 'parent_snapshots' | 'chat_daily_usage')`
- [x] JSON-провайдер: все три store.load() возвращают корректные default значения при пустом файле
- [x] Flask запустился без ошибок
- [x] `npm run self-check` → OK

---

## Evidence

```
P1-03 | Agent A | 2026-02-21 | BadgeRequestsStore + ParentSnapshotsStore + ChatDailyUsageStore — реализованы в обоих провайдерах
```
