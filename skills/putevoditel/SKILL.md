---
name: putevoditel
description: Assistant for the Путеводитель "Реальный Лагерь" project — run self-check, sync ai-data, indexes, webp, and full deploy checklist.
metadata: {"openclaw":{"emoji":"📘","requires":{"bins":["node","npm"]},"os":["win32","darwin","linux"]}}
---

# Путеводитель (Реальный Лагерь)

Use this skill when the user works on the **Путеводитель "Реальный Лагерь"** project (React/Vite frontend, Python backend, ai-data content). All commands must be run from the **project root**; working directory is typically `D:\Development\Путеводитель web_new` (Windows) or the repo root on other OSes.

## When to use

- User asks for "чек", "check", "проверка проекта" → run project verification.
- User asks for "синк", "sync", "синхронизируй ai-data" → sync ai-data to public.
- User asks for "индексы", "indexes", "пересчитай индексы" → update MASTER_INDEX and category indexes.
- User asks for "вебп", "webp", "сгенерируй webp" → generate WebP siblings for badge images.
- User asks for "деплой-чек", "deploy check", "готовность к деплою" → run the full deploy sequence.
- User asks "что в active_context?" or "текущая задача" → read `.memory-bank/active_context.md`.
- User asks "статус ROADMAP", "roadmap" → read `docs/ROADMAP_2026.md`.

## Commands (run from project root)

| User says   | Action |
|------------|--------|
| чек        | `npm run self-check` |
| синк        | `npm run sync:ai-data` |
| индексы    | `python update_indexes.py` (use project .venv or PATH python) |
| вебп       | `npm run images:webp` |
| деплой-чек | In order: `npm run sync:ai-data` → `npm run verify:webp` (fix with `npm run images:webp` if needed) → `npm run self-check` → `npm run build` |

## Critical rules

1. **Before deploy:** Always run sync → verify:webp → self-check → build in that order.
2. **After editing ai-data:** Run `npm run sync:ai-data` (and optionally `python update_indexes.py`) before build.
3. **Cyrillic paths:** Project has folders like `public/Новые значки`; ensure UTF-8 for file operations.
4. **Python:** Prefer the project `.venv` or the `python` on PATH.

## Context file

For full project context (Memory Bank, ROADMAP, ports), see **docs/OPENCLAW_CONTEXT.md** in the repo. Give that file to OpenClaw at the start of a session or paste the "Триггеры для OpenClaw (persona)" block into Telegram.
