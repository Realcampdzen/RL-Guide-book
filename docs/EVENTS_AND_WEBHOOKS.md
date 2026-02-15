# События и интеграции (Этап 7)

## 1. Формат событий

Единый контракт для синхронизации и логов. Реализация: `backend/events.py` (dataclass’ы), хранение заявок — `backend/data/confirmation_events.json`.

### confirmation_requested

Пользователь запросил подтверждение (прислал пруф в бота).

| Поле       | Тип    | Описание                          |
| ---------- | ------ | --------------------------------- |
| levelId    | string | ID уровня (опц.)                  |
| badgeTitle | string | Название значка (опц.)             |
| userId     | string | Telegram user id (опц.)            |
| username   | string | Telegram username (опц.)           |
| text       | string | Текст сообщения                    |
| timestamp  | string | ISO 8601 (UTC)                     |
| evidence   | object | Ссылки/доп. данные (опц.)         |

Пример JSON:

```json
{
  "type": "confirmation_requested",
  "userId": "1262434056",
  "username": "johndoe",
  "text": "Подтверждаю уровень 13.11.1, ссылка: https://...",
  "timestamp": "2026-02-07T12:00:00+00:00"
}
```

### level_achieved

Уровень отмечен как достигнутый (вожатый подтвердил или синхронизация с сервером). **Пишется при одобрении заявки вожатым:** при вызове POST `/api/badges/requests/<id>/approve` бэкенд добавляет событие в тот же лог (`confirmation_events.json`), чтобы был единый поток событий подтверждения.

| Поле      | Тип    | Описание     |
| --------- | ------ | ------------ |
| levelId   | string | ID уровня    |
| userId    | string | ID пользователя |
| achievedAt| string | ISO 8601     |
| reflection| string | Рефлексия (опц.) |

Пример JSON:

```json
{
  "type": "level_achieved",
  "levelId": "13.11.1",
  "userId": "user_abc",
  "achievedAt": "2026-02-07T14:00:00+00:00",
  "reflection": "Научился работать в команде"
}
```

---

## 2. Telegram: отправка в канал

Используется **тот же бот**, что и в NeuroValusha (`TELEGRAM_BOT_TOKEN`). Путеводитель отправляет сообщения в канал через:

**POST** `/api/telegram/notify-achievement`

Тело (JSON): `levelId`, `levelLabel`, `reflection`, `impact`, `link` (все опц. кроме метки). Ответ: `{ "ok": true }` или ошибка. При отсутствии токена/канала — 503.

**ProfileView:** при «Отправить в Telegram» в модалке подтверждения значка вызывается этот API; при ошибке — fallback на ручную отправку (t.me/Stivanovv).

**POST** `/api/telegram/notify-creator-card`

Карточка Созидателя (9:16): после создания значка в Мастерской (Кузница Смыслов) генерируется карточка с текстом «Я предлагаю новый смысл: Значок [Название]. Кто за?» и отправляется в тот же канал (TELEGRAM_CHANNEL_ID). Тело (JSON): `imageBase64`, `badgeTitle`, `description` (опц.). Ответ: `{ "ok": true }` или ошибка. 503 при отсутствии Telegram. На фронте карточка дополнительно предлагается пользователю через shareOrDownloadSocialCard.

---

## 3. Telegram Webhook (приём обновлений)

Чтобы бот получал сообщения от пользователей на наш сервер, Telegram должен слать обновления (Update) на HTTPS endpoint.

### Переменные (.env)

- `TELEGRAM_BOT_TOKEN` — токен бота (уже используется для отправки в канал).
- `TELEGRAM_WEBHOOK_SECRET` — случайная строка для защиты URL. **Обязательна для продакшена.** Без неё webhook не принимает запросы (404).

### Регистрация webhook

1. URL должен быть **HTTPS** (порты 443, 80, 88, 8443), с валидным сертификатом.
2. Вызвать [setWebhook](https://core.telegram.org/bots/api#setwebhook):
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<HTTPS_URL>
   ```
   Подставить свой токен и URL вида:
   ```
   https://<ваш-домен>/api/webhook/telegram/<TELEGRAM_WEBHOOK_SECRET>
   ```
   Секрет из `.env` подставляется в путь; так Telegram не подписывает тело запроса, секрет в URL — типичная практика.

3. **Локальная разработка:** использовать [ngrok](https://ngrok.com/) или аналог (например `ngrok http 4000`), получить HTTPS URL и подставить его в setWebhook. После смены URL нужно снова вызвать setWebhook.

4. **Скрипт:** `scripts/set_telegram_webhook.py` читает из env `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` и `TELEGRAM_WEBHOOK_BASE_URL` (например `https://your-domain.com` или ngrok URL), вызывает setWebhook. Токен в логи не выводится. Запуск: `python scripts/set_telegram_webhook.py` из корня проекта.

### Endpoint

- **POST** `/api/webhook/telegram/<secret_path>`
  - Проверка: `secret_path` должен совпадать с `TELEGRAM_WEBHOOK_SECRET`.
  - Тело: [Update](https://core.telegram.org/bots/api#update). Поддерживается поле `message` (текст, `from`, `chat`).
  - Апдейты без `message` или без `message.text` игнорируются.
  - Для каждого текстового сообщения формируется событие **confirmation_requested** (userId/username из `from`, text из `message.text`, timestamp = now) и сохраняется в `backend/data/confirmation_events.json`.
  - Ответ **200 OK** отдаётся быстро (в течение ~60 сек), тяжёлая обработка выполняется до ответа без блокировки; при ошибке записи ответ всё равно 200, чтобы Telegram не повторял запрос.

### Просмотр заявок (вожатый/админ)

- **GET** `/api/webhook/confirmation-events?secret=<TELEGRAM_WEBHOOK_SECRET>`
  - Опционально: `limit` (1–500, по умолчанию 500).
  - Возвращает последние события `confirmation_requested` из файла.

### Безопасность

- Не логировать и не хранить `TELEGRAM_BOT_TOKEN` в открытом виде.
- Хранить `TELEGRAM_WEBHOOK_SECRET` только в env; не коммитить в репозиторий.

### Ответ пользователю

- Реализовано: при приёме заявки бот отправляет пользователю сообщение «Заявка принята, вожатый посмотрит» через [sendMessage](https://core.telegram.org/bots/api#sendmessage).

---

## 4. VK Webhook (Callback API)

Используется [Callback API](https://dev.vk.com/api/callback-api/getting-started) для приёма сообщений от пользователей в сообществе VK. В отличие от Telegram, VK требует **confirmation code** при первоначальной настройке.

### Переменные (.env)

- `VK_API_TOKEN` — токен сообщества (доступ с правом сообщений). Используется для `messages.send`.
- `VK_CONFIRMATION_CODE` — строка confirmation, которую вы вводите в настройках Callback API в админке VK. При первом запросе VK сервер возвращает её как ответ.
- `VK_WEBHOOK_SECRET` — случайная строка для защиты URL (аналогично `TELEGRAM_WEBHOOK_SECRET`). Без неё endpoint возвращает 404.

### Регистрация

1. В настройках сообщества VK: **Управление** → **Работа с API** → **Callback API**.
2. Указать URL: `https://<ваш-домен>/api/webhook/vk/<VK_WEBHOOK_SECRET>`.
3. В поле «Строка подтверждения» ввести произвольную строку и записать её в `.env` как `VK_CONFIRMATION_CODE`.
4. Включить типы событий: `message_new` (новые сообщения).
5. **Локальная разработка:** использовать [ngrok](https://ngrok.com/) (`ngrok http 4000`), получить HTTPS URL и указать его в настройках VK.

### Endpoint

- **POST** `/api/webhook/vk/<secret_path>`
  - Проверка: `secret_path` должен совпадать с `VK_WEBHOOK_SECRET` (если задан).
  - Тело: JSON от VK Callback API.
  - `type == "confirmation"` — ответ: строка `VK_CONFIRMATION_CODE` (Content-Type: text/plain).
  - `type == "message_new"` — парсинг `object.message` (text, from_id, peer_id), формирование **confirmation_requested**, сохранение в `backend/data/confirmation_events.json`, ответ пользователю через `messages.send`, затем ответ VK: строка `"ok"` (Content-Type: text/plain).

### Просмотр заявок

Заявки из VK сохраняются в тот же файл, что и Telegram. Доступ: **GET** `/api/webhook/confirmation-events?secret=<TELEGRAM_WEBHOOK_SECRET>` или `?secret=<VK_WEBHOOK_SECRET>`.

### Ответ пользователю

При приёме заявки бот отправляет в VK сообщение «Заявка принята, вожатый посмотрит» через `messages.send` (peer_id из входящего сообщения).

### Безопасность

- Не логировать и не хранить `VK_API_TOKEN` в открытом виде.
- Хранить `VK_CONFIRMATION_CODE` и `VK_WEBHOOK_SECRET` только в env; не коммитить в репозиторий.

---

## 5. Итог по этапу 7

- Формат событий: `confirmation_requested`, `level_achieved` — см. §1.
- Webhook Telegram: `POST /api/webhook/telegram/<secret>`, парсинг Update, сохранение в файл, быстрый 200 OK.
- Webhook VK: `POST /api/webhook/vk/<secret>`, обработка confirmation и message_new, сохранение в тот же файл, ответ пользователю через messages.send.
- Настройка: setWebhook (Telegram) с HTTPS URL и секретом; для VK — ручная настройка в админке; для dev — ngrok.
