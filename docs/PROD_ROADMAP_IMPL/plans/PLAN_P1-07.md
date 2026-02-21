# PLAN_P1-07 — Rate limits + safety-фильтры для чата и сообщений

**Агент:** C  
**Task ID:** P1-07  
**Дата создания плана:** 2026-02-21  
**Статус:** in_progress

---

## 1. Цель задачи

Добавить safety-слой в `backend/app.py` для двух точек отправки текста: отрядного чата (`POST /api/squads/<id>/messages`) и чата НейроВалюши (`POST /api/chat`). Защита включает: запрет URL, ограничение длины, rate limit по device per-minute, базовый мат-фильтр. Логировать превышения без персональных данных.

Ссылка на описание задачи в [`TASKS.md`](../TASKS.md#p1-07).

---

## 2. Контекст (что уже есть)

- `backend/app.py` — монолит Flask. Уже есть:
  - `_check_community_rate_limit(ip)` — pattern для rate limit (ip-based, in-memory)
  - `_check_images_generate_rate_limit(key)` — thread-safe pattern с `threading.Lock()`
  - `_check_and_inc_chat_daily(device_id)` — ежедневный лимит для `/api/chat` и squad messages
  - `POST /api/squads/<squad_id>/messages` — уже проверяет длину > 2000 и `_check_and_inc_chat_daily`
  - `POST /api/chat` — уже проверяет `_check_and_inc_chat_daily`
- Env-переменные уже: `SQUAD_MSG_MAX_LEN` и `SQUAD_MSG_RATE_LIMIT` **не добавлены** — нужно добавить
- `defaultdict(list)` и `threading.Lock()` уже импортированы

**Invariants (нельзя сломать):**
- Локальный dev (localhost без токена) должен работать как прежде
- JSON-файлы хранилища не трогаем
- Не трогаем логику `_check_and_inc_chat_daily` — только добавляем параллельный per-minute rate limit

---

## 3. Файлы для изменения

| Файл | Тип изменения | Описание |
|------|---------------|----------|
| `backend/app.py` | modify | Добавить: URL-regex, мат-словарь, per-minute rate limit, вызовы фильтров в squad messages и /api/chat |
| `.env.example` | modify | Добавить `SQUAD_MSG_MAX_LEN`, `SQUAD_MSG_RATE_LIMIT`, `CHAT_MSG_RATE_LIMIT_PER_MIN` |

---

## 4. Шаги реализации

1. **Добавить константы и инфраструктуру (app.py, блок констант)**
   - `SQUAD_MSG_MAX_LEN = int(os.getenv('SQUAD_MSG_MAX_LEN', '500'))`
   - `SQUAD_MSG_RATE_LIMIT_PER_MIN = int(os.getenv('SQUAD_MSG_RATE_LIMIT', '10'))` — 10 сообщений в 60 сек на device
   - `CHAT_MSG_RATE_LIMIT_PER_MIN = int(os.getenv('CHAT_MSG_RATE_LIMIT_PER_MIN', '15'))` — для НейроВалюши
   - `_squad_msg_times: defaultdict(list)` + `_squad_msg_lock`
   - `_chat_per_min_times: defaultdict(list)` + `_chat_per_min_lock`
   - URL regex: `_URL_RE = re.compile(r'https?://|www\.|t\.me/|vk\.com/', re.IGNORECASE)`
   - Мат-словарь: небольшой список базовых русских матных корней + compile regex

2. **Добавить helper-функции**
   - `_check_squad_msg_rate_limit(device_id: str) -> bool` — per-minute, thread-safe
   - `_check_chat_per_min_rate_limit(device_id: str) -> bool` — per-minute, thread-safe
   - `_validate_squad_message(text: str) -> tuple[str | None, str | None]` — возвращает `(clean_text, error)`:
     - проверка длины (> SQUAD_MSG_MAX_LEN → error)
     - проверка URL regex → error с понятным сообщением
     - проверка мат-словаря → error
   - `_log_rate_limit_event(endpoint: str, device_id: str)` — логирует 429 без PD (только hash device_id)

3. **Подключить в `squad_messages_get_or_post` (POST branch)**
   - Вызвать `_check_squad_msg_rate_limit(device_id)` → 429 если превышено
   - Вызвать `_validate_squad_message(text)` → 400 с понятным сообщением если ошибка
   - Обновить существующую проверку `len(text) > 2000` → использовать `SQUAD_MSG_MAX_LEN`

4. **Подключить в `chat_with_bot` (POST /api/chat)**
   - Вызвать `_check_chat_per_min_rate_limit(device_id)` → 429 если превышено
   - Логировать события через `_log_rate_limit_event`

5. **Обновить `.env.example`**
   - Добавить секцию с новыми переменными и комментариями

---

## 5. Зависимости

- **Зависит от:** нет (независимая задача)
- **Блокирует:** P1-06 (RBAC), P1-08 (единый контур)
- **Параллельно:** P1-08

---

## 6. Риски

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Мат-фильтр даёт ложные срабатывания | Средняя | Используем только корни (без substring-matching агрессивного), тестируем |
| In-memory rate limit сбрасывается при рестарте | Низкая | Приемлемо для MVP, документируем |
| URL regex слишком строгий | Низкая | Тестируем на обычных сообщениях |

---

## 7. Definition of Done

- [x] Ссылки в сообщениях отряда блокируются (400 с понятным сообщением)
- [x] Длина сообщения ограничена (SQUAD_MSG_MAX_LEN, по умолчанию 500)
- [x] Rate limit на отправку сообщений работает (429) — per device per minute
- [x] Попытки абьюза логируются (без PD)
- [x] `.env.example` обновлён: `SQUAD_MSG_MAX_LEN`, `SQUAD_MSG_RATE_LIMIT`, `CHAT_MSG_RATE_LIMIT_PER_MIN`
- [ ] Отчёт создан в `reports/REPORT_C_P1-07.md`
- [ ] `CLAIM_BOARD.md` обновлён (статус done)
- [ ] `TASKS.md` обновлён (статус done + Evidence)

---

## 8. Отклонения от плана (заполнять по ходу)

*Пусто — заполнять во время реализации, если план меняется.*
