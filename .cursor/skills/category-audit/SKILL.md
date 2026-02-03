---
name: category-audit
description: Audit and fix category data against Путеводитель.md. Use when a category’s badge JSONs may be incomplete/shortened/incorrect (howToBecome/description/importance/examples/skillTips), or when asked to verify a category matches the source of truth and produce a category audit report.
---

# Category Audit

Use this workflow to audit a **single category** against the source of truth (`Путеводитель.md`), fix mismatches in JSON, and produce a report.

Reference workflow: [AGENT_CATEGORY_AUDIT_GUIDE.md](../../../AGENT_CATEGORY_AUDIT_GUIDE.md)

## Workflow (step-by-step)

### 1) Identify source blocks in `Путеводитель.md`
- **Source of truth is the last occurrence** in the file (bottom part).
- For **multi-level badges (N.X.1)**: take the block “Как получить значок …” from the **base level** (N.X.1).
- For **single-level badges**: take “Как получить …” from the `### N.X …` section.

### 2) Audit `howToBecome`
- Compare each `ai-data/category-N/N.X.json` `howToBecome` with the source block.
- Replace with the **full block** from the source. Preserve line breaks (`\n`) and bullets (`•`).

### 3) Audit other fields (description/importance/examples/skillTips)
- **description** → block starting with `Цель:` up to the next marker.
- **importance** → block after “Почему этот значок важен?” (exclude header).
- **examples** → block “Примеры …” / “Как сделать процесс интереснее?” / “Как улучшить визуал значка?”.
- **skillTips** → “Полезные советы” or “Как закрепить эффект?”.

**If a block does not exist in `Путеводитель.md`, delete the field from JSON.**
Do not keep generated placeholders.

### 4) Sync and cache bust
1. Update `ai-data/` JSON files.
2. Bump `ai-data/MASTER_INDEX.json` → `version` and `lastUpdated`.
3. Sync runtime data:
   - Windows: `robocopy .\ai-data .\public\ai-data /E`
   - macOS/Linux: `rsync -a --delete ai-data/ public/ai-data/`
4. Rebuild `dist` (`npm run build`) if you deploy static output.

### 5) Write the report
Create `CATEGORY_N_SOURCE_AUDIT_REPORT.md` with tables:
- per badge status (match / mismatch / no-source-block)
- summary counts
- list of required fixes

## Pitfalls / Notes
- The same section may appear twice in `Путеводитель.md`; **use the last one**.
- The frontend caches by `MASTER_INDEX.version` (sessionStorage). If version doesn’t change, stale data persists.
- Keep bullet formatting (`•` + tabs/spaces) as in source.
