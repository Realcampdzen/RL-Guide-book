# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is the **Путеводитель "Реальный Лагерь"** digital ecosystem — a React+TypeScript (Vite) frontend with a Flask (Python) backend API. The frontend runs on port 3001 and proxies `/api/*` to the Flask backend on port 4000.

### Running services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Frontend (Vite) | `npm run dev` | 3001 | Main SPA, proxies `/api/*` to backend |
| Backend (Flask) | `python3 backend/app.py` | 4000 | Requires `backend/perfect_parsed_data.json` (see below) |

- The chatbot (`chatbot/`) and Cloudflare Workers API (`cf-api/`) are optional and not required for core development.

### Backend data file

The Flask backend needs `backend/perfect_parsed_data.json` to serve badge data. If missing, generate it:

```bash
cp Путеводитель.txt backend/ && cd backend && python3 perfect_parser.py
```

The `/health` endpoint returns `"unhealthy"` until this file exists.

### Lint / Type-check / Self-check

- **ESLint**: `npx eslint --ext .ts,.tsx src/` (ESLint and its plugins must be installed as devDependencies; the repo's `.eslintrc.cjs` configures them)
- **TypeScript**: `npx tsc --noEmit`
- **Self-check**: `npm run self-check` — verifies port consistency, assets, and env sanity
- There is no `npm run lint` script defined in `package.json`; run ESLint directly via `npx eslint`.

### Environment

- Copy `.env.example` to `.env` for development. API keys (OpenAI, Google, etc.) are optional — the app runs without them but AI features won't work.
- `python` is not on PATH in the cloud VM; always use `python3`.

### Key gotchas

- The Vite dev server uses `base: '/'` in dev mode but `/RL-Guide-book/` in build/preview. URLs like `/RL-Guide-book/...` are rewritten by a custom Vite plugin during dev.
- User progress is stored in `localStorage` — no database needed for frontend development.
- When modifying content in `ai-data/`, sync to `public/ai-data/` via `npm run sync:ai-data`.
