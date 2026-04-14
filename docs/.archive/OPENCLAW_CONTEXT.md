# OpenClaw Context: Путеводитель "Реальный Лагерь"

Контекст проекта для OpenClaw. Дай этот файл OpenClaw в начале сессии или скопируй ключевые части в чат.

**Онбординг и сценарии:** полная инструкция в [OPENCLAW_ONBOARDING.md](OPENCLAW_ONBOARDING.md). Кратко: после установки выполни `openclaw onboard` (выбери LLM, API-ключ, при необходимости подключи Telegram через [@BotFather](https://t.me/BotFather)).

## Проект

**Путеводитель "Реальный Лагерь"** — цифровая экосистема для системы значков "Реального Лагеря". React + Vite фронтенд, Three.js 3D-сцены, Python backend (chatbot), ai-data (JSON/Markdown). NeuroValyusha — ИИ-ассистент в приложении.

## Рабочая директория

```
D:\Development\Путеводитель web_new
```

Все команды выполняй из корня проекта (cd в эту папку перед выполнением).

## Основные команды

| Команда | Когда использовать |
|---------|--------------------|
| `npm run self-check` | Общая проверка проекта (порты, файлы, ассеты) |
| `npm run sync:ai-data` | Синхронизация ai-data → public/ai-data (после изменений в ai-data/) |
| `python update_indexes.py` | Пересчёт MASTER_INDEX и индексов категорий (после правок ai-data/) |
| `npm run verify:webp` | Проверка: у каждого JPG/PNG есть .webp sibling |
| `npm run images:webp` | Генерация WebP для картинок значков |
| `npm run build` | Сборка для деплоя (GitHub Pages) |

## Критичные правила

1. **Sync перед deploy:** При изменении контента в `ai-data/` всегда выполняй `npm run sync:ai-data` (или `python update_indexes.py` + копирование ai-data → public/ai-data) перед build.
2. **WebP:** У каждого JPG/PNG под `public/Новые значки/` должен быть sibling .webp. `npm run verify:webp` проверяет, `npm run images:webp` генерирует.
3. **self-check:** Перед деплоем запускай `npm run self-check`.

## Деплой-чек (полная последовательность)

1. `npm run sync:ai-data`
2. `npm run verify:webp` (при необходимости `npm run images:webp`)
3. `npm run self-check`
4. `npm run build`

## Memory Bank и ROADMAP

- **agent.md** (корень) — точка входа для агента, воркфлоу.
- **docs/ROADMAP_2026.md** — single source of truth для статусов задач (Done/Not started), Evidence, "Где мы сейчас".
- **.memory-bank/project_brief.md** — суть проекта, цели 2026.
- **.memory-bank/product_logic.md** — игровые циклы, роли, прогрессия.
- **.memory-bank/tech_context.md** — стек, API, "грабли".
- **.memory-bank/active_context.md** — текущая задача.
- **.memory-bank/progress.md** — лог выполненного, Recent Changes.

## Типичные сценарии использования

| Запрос | Действие |
|--------|----------|
| «Чек проекта» | `npm run self-check` |
| «Синхронизируй ai-data» | `npm run sync:ai-data` |
| «Пересчитай индексы» | `python update_indexes.py` |
| «Деплой-чек» | sync → verify:webp → self-check → build |
| «Что в active_context?» | прочитать `.memory-bank/active_context.md` |
| «Статус ROADMAP» | прочитать `docs/ROADMAP_2026.md` |

## Триггеры для OpenClaw (persona)

При первом диалоге можно отправить OpenClaw:

> Ты мой ассистент по проекту Путеводитель. Рабочая директория: D:\Development\Путеводитель web_new. Когда я прошу "чек" — выполни npm run self-check. "синк" — npm run sync:ai-data. "индексы" — python update_indexes.py. "вебп" — npm run images:webp. "деплой-чек" — sync, verify:webp, self-check, build. Перед деплоем: sync, verify:webp, self-check, build.

## Ограничения

- **Кириллические пути:** В `public/` есть папки с кириллицей (например "Новые значки"). OpenClaw должен работать в UTF-8.
- **Python venv:** В проекте есть `.venv`; при вызове python используй активированный venv или `python` из PATH.
- **Порты:** dev — 3001, staging — 3002; backend — см. [.memory-bank/tech_context.md](.memory-bank/tech_context.md).
