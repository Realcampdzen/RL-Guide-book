# REPORT_C_P1-07 — Rate limits + safety-фильтры для чата и сообщений

**Агент:** C  
**Task ID:** P1-07  
**Дата завершения:** 2026-02-21  
**Статус:** ✅ done

---

## 1. Что сделано

Реализован safety-слой для двух endpoint'ов отправки текста в `backend/app.py`:

### Константы и конфигурация (строки 103–133)
- `SQUAD_MSG_MAX_LEN` (env `SQUAD_MSG_MAX_LEN`, default 500) — максимальная длина сообщения в отрядном чате
- `SQUAD_MSG_RATE_LIMIT_PER_MIN` (env `SQUAD_MSG_RATE_LIMIT`, default 10) — per-device per-minute лимит для squad messages
- `CHAT_MSG_RATE_LIMIT_PER_MIN` (env `CHAT_MSG_RATE_LIMIT_PER_MIN`, default 15) — per-device per-minute лимит для НейроВалюши
- `_URL_RE` — regex для блокировки ссылок (`https://`, `www.`, `t.me/`, `vk.com/`, `youtu.be/`, `bit.ly/`, `tinyurl.com/`)
- `_PROFANITY_RE` — regex из базовых русских матных корней

### Helper-функции (строки 135–180)
- `_check_squad_msg_rate_limit(device_id)` — per-minute rate limit с thread-safe `defaultdict + Lock`
- `_check_chat_per_min_rate_limit(device_id)` — аналог для /api/chat
- `_log_rate_limit_event(endpoint, device_id)` — логирует 429-события с hashed device_id (без PD)
- `_validate_squad_message(text)` → `(clean_text, error_message)` — проверяет длину, URL, мат

### Подключение в `squad_messages_get_or_post` (POST branch, ~строки 2629–2645)
- Per-minute rate limit → 429 с понятным сообщением на русском
- Daily limit — существующий `_check_and_inc_chat_daily` + логирование
- Валидация через `_validate_squad_message` → 400 с понятным сообщением
- `text` заменён на `clean_text` при записи в хранилище

### Подключение в `chat_with_bot` (POST /api/chat, ~строки 3125–3131)
- Per-minute rate limit → 429 до daily check
- Логирование через `_log_rate_limit_event`

### `.env.example` обновлён
- Добавлена секция P1-07 с тремя новыми переменными и комментариями

---

## 2. Изменённые файлы

| Файл | Тип | Строки |
|------|-----|--------|
| `backend/app.py` | modify | 103–180 (константы + helpers), 2629–2645 (squad msgs), 3125–3131 (/api/chat) |
| `.env.example` | modify | Добавлены `SQUAD_MSG_MAX_LEN`, `SQUAD_MSG_RATE_LIMIT`, `CHAT_MSG_RATE_LIMIT_PER_MIN` |

---

## 3. Definition of Done — проверка

- [x] Ссылки в сообщениях отряда блокируются (400 "Ссылки в чате отряда запрещены")
- [x] Длина сообщения ограничена (`SQUAD_MSG_MAX_LEN`, default 500 символов)
- [x] Rate limit на отправку сообщений работает (429) — per device, per minute, thread-safe
- [x] Попытки абьюза логируются через `_log_rate_limit_event` (hashed device_id, без PD)
- [x] `.env.example` обновлён: `SQUAD_MSG_MAX_LEN`, `SQUAD_MSG_RATE_LIMIT`, `CHAT_MSG_RATE_LIMIT_PER_MIN`

---

## 4. Evidence для ROADMAP_2026.md

```
| Done | P1-07: Rate limits + safety-фильтры | backend/app.py строки 103–180, 2629–2645, 3125–3131: _validate_squad_message, _check_squad_msg_rate_limit, _check_chat_per_min_rate_limit, _log_rate_limit_event |
```

---

## 5. Примечания

- Rate limit in-memory — сбрасывается при рестарте процесса. Для MVP приемлемо.
- Мат-фильтр на корнях — намеренно консервативен, чтобы не блокировать нормальные слова.
- Локальный dev (localhost без токена) полностью работает как прежде — `_check_squad_msg_rate_limit` при пустом `device_id` возвращает `True`.
