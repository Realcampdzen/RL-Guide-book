---
name: deploy-check
description: Run pre-deploy checks and ensure data/assets are ready for release. Use when preparing a release, debugging deploy failures, or verifying project integrity.
---

# Деплой и проверка перед релизом

Use this skill when preparing a release, before pushing to production, or when verifying that data and assets are consistent.

## When to Use

- Before deploying (e.g. GitHub Pages)
- After bulk edits to ai-data or badge images
- When CI or local build fails and you need a checklist

## Commands (run from project root)

- **Integrity:** `npm run self-check` — ports, assets, key files. Optional backend liveness: `BACKEND_URL=http://localhost:4000 npm run self-check` (probes GET /api/health).
- **WebP:** `npm run verify:webp` — every JPG/PNG under checked categories has a .webp sibling (required for build).
- **Lint:** `npm run lint` — ESLint.

## Before Deploy (GitHub Pages / static)

1. Ensure **ai-data is synced:** edits live in `ai-data/`, then `python update_indexes.py`, then copy `ai-data/` → `public/ai-data/` (e.g. `robocopy .\ai-data .\public\ai-data /E` or `rsync -a --delete ai-data/ public/ai-data/`).
2. Run `npm run verify:webp` (and `npm run images:webp` if new images were added).
3. Run `npm run self-check` and `npm run lint`.
4. Build: `npm run build` (uses basePath for GitHub Pages; see [vite.config.ts](../../vite.config.ts)).

## Reference

Deploy flow, basePath, and API contracts: [AGENT_REPO_GUIDE.md](../../../AGENT_REPO_GUIDE.md) — sections on services, deploy, and "Частые грабли".
