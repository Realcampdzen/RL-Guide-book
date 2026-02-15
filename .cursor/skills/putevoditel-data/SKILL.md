---
name: putevoditel-data
description: Work with Путеводитель content data — edit ai-data, update indexes, sync to public/ai-data. Use when changing category/badge/level content or file lists.
---

# Данные Путеводителя (ai-data)

Use this skill when editing content (categories, badges, levels), updating indexes, or syncing data for runtime.

## When to Use

- Editing category or badge content (descriptions, criteria, levels)
- Adding or renaming category/badge JSON files
- Updating MASTER_INDEX or category index.json
- Preparing data for deploy (runtime reads from `public/ai-data`)

## Key Paths

- **Editing:** `ai-data/` — canonical source for scripts and edits
- **Runtime:** `public/ai-data/` — what frontend and chatbot load (must stay in sync)
- **Indexes:** `ai-data/MASTER_INDEX.json`, `ai-data/category-N/index.json`
- **Badge files:** `ai-data/category-N/N.X.json` (e.g. `5.1.json`, `5.10.json`)

## Required Order After Edits

1. Edit files in **`ai-data/`** (never edit only `public/ai-data/`).
2. Recalculate indexes: `python update_indexes.py` (updates `ai-data/**/index.json` and `ai-data/MASTER_INDEX.json`).
3. Sync to runtime: copy `ai-data/` → `public/ai-data/` (see below).

## Sync Commands

- **Windows (PowerShell):** `robocopy .\ai-data .\public\ai-data /E` or `/MIR` for mirror.
- **macOS/Linux:** `rsync -a --delete ai-data/ public/ai-data/`

## Reference

Full data layout, JSON structure, and pitfalls: [AGENT_REPO_GUIDE.md](../../../AGENT_REPO_GUIDE.md) — sections "Где лежат данные Путеводителя", "Парсинг/обновление данных", "Синхронизация ai-data → public/ai-data".
