# OpenClaw: онбординг и использование с Путеводителем

Краткая инструкция по подключению OpenClaw к проекту Путеводитель "Реальный Лагерь" и типичным сценариям.

## 1. Завершение онбординга OpenClaw

После установки (например, `iwr -useb https://openclaw.ai/install.ps1 | iex`) выполните:

```powershell
openclaw onboard
```

В онбординге:

- Выберите LLM (Anthropic Claude или OpenAI) и введите API-ключ.
- По желанию: `--install-daemon` для запуска как сервиса.
- Подключите Telegram (рекомендуется как первый канал).

Для Telegram: создайте бота через [@BotFather](https://t.me/BotFather), получите токен и подставьте его в wizard.

## 2. Контекст проекта для OpenClaw

Используйте готовый файл контекста:

- **Путь:** [docs/OPENCLAW_CONTEXT.md](OPENCLAW_CONTEXT.md)

В нём: описание проекта, рабочая директория, основные команды, критичные правила, ссылки на Memory Bank и ROADMAP. Дай этот файл OpenClaw в начале сессии или храни ключевые части в его контексте.

## 3. Команды и persona

**Вариант A — через чат (без кода):**  
В первом диалоге с OpenClaw (например, в Telegram) отправь текст из раздела «Триггеры для OpenClaw (persona)» в [OPENCLAW_CONTEXT.md](OPENCLAW_CONTEXT.md). OpenClaw запомнит команды (чек, синк, индексы, вебп, деплой-чек) в persistent memory.

**Вариант B — workspace skill (уже в репо):**  
В репозитории есть папка **skills/putevoditel/** с `SKILL.md`. Когда рабочей директорией OpenClaw является этот проект, скилл подхватывается автоматически. Альтернатива: скопировать в `~/.openclaw/skills/putevoditel/` для использования из любого workspace (см. [skills/README.md](../skills/README.md)).

## 4. Типичные сценарии

| Запрос                  | Действие                                   |
| ----------------------- | ------------------------------------------ |
| «Чек проекта»           | `npm run self-check`                       |
| «Синхронизируй ai-data» | `npm run sync:ai-data`                     |
| «Пересчитай индексы»    | `python update_indexes.py`                 |
| «Деплой-чек»            | sync → verify:webp → self-check → build    |
| «Что в active_context?» | прочитать `.memory-bank/active_context.md`  |
| «Статус ROADMAP»        | прочитать `docs/ROADMAP_2026.md`           |

Все команды выполняются из **корня проекта** (например, `D:\Development\Путеводитель web_new`).

## 5. Важные ограничения

- **Кириллические пути:** в `public/` есть папки с кириллицей — OpenClaw должен работать в UTF-8.
- **Python venv:** при вызове `python` используй `.venv` проекта или `python` из PATH.
- **Порты:** dev — 3001, staging — 3002; backend — см. [.memory-bank/tech_context.md](../.memory-bank/tech_context.md).

## Результат

- Доступ к проекту из Telegram (и других каналов OpenClaw).
- Быстрые команды: чек, синк, индексы, деплой-чек.
- Контекст Memory Bank и ROADMAP при запросах.
- Возможность расширять сценарии через natural language или правки [OPENCLAW_CONTEXT.md](OPENCLAW_CONTEXT.md) и [skills/putevoditel/SKILL.md](../skills/putevoditel/SKILL.md).
