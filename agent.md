# Точка входа для агента

Ты работаешь в репозитории **Путеводитель "Реальный Лагерь"**. Здесь — карта и быстрые ссылки.

## С чего начать

Подробная карта репо, контракты API, данные и грабли: **[AGENT_REPO_GUIDE.md](AGENT_REPO_GUIDE.md)**. При работе с данными, ботом или деплоем открой его.

## Правила и скиллы

- **Правила проекта:** [.cursor/rules/](.cursor/rules/) — структура правил, улучшение правил, Taskmaster workflow.
- **Специализированные сценарии:** скиллы в [.cursor/skills/](.cursor/skills/). В чате можно вызвать `/putevoditel-data`, `/badge-images`, `/deploy-check`.
- **Аудит категорий по источнику:** [AGENT_CATEGORY_AUDIT_GUIDE.md](AGENT_CATEGORY_AUDIT_GUIDE.md) — полный workflow проверки/исправления `howToBecome` и полей `description/importance/examples/skillTips`, удаление полей при отсутствии блоков в источнике, bump версии, sync и rebuild.

## Краткий контекст

Путеводитель — система **категории → значки (N.X) → уровни (N.X.Y)**. Данные для рантайма лежат в **`public/ai-data`** (индексы и JSON по категориям и значкам). Редактировать контент нужно в **`ai-data/`**, затем пересчитать индексы и синхронизировать в `public/ai-data`. Стиль бота НейроВалюши и контракты описаны в гайде выше.

## Команды (шпаргалка)

- `npm run self-check` — проверка портов, ассетов, ключевых файлов
- `npm run verify:webp` — проверка наличия .webp у всех jpg/png в проверяемых категориях
- `npm run images:webp` — генерация .webp
- `python update_indexes.py` — пересчёт индексов в `ai-data/`
- Синхронизация ai-data → public/ai-data:  
  Windows: `robocopy .\ai-data .\public\ai-data /E`  
  macOS/Linux: `rsync -a --delete ai-data/ public/ai-data/`
