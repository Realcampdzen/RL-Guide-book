# TASK: M10-VERCEL-REDEPLOY-D — Redeploy backend на Vercel

**Агент: D (DevOps)**  
**Base:** `main @ 73c0531`  
**Branch:** `agent-d/m10-vercel-redeploy`

## Scope

### 1. Redeploy Vercel Production

- Trigger production deploy на `backend-murex-one-40.vercel.app`
- Убедиться что все env vars актуальны (IMAGE_PROVIDER, FUSIONBRAIN_* если есть)

### 2. Smoke на prod backend

Запустить smoke script против prod URL:
```bash
BACKEND_URL=https://backend-murex-one-40.vercel.app python backend/scripts/smoke_backend_critical.py
```

Ожидание: все Flows кроме E (OpenAI timeout) проходят. Новые Flows J, K, L, M, N должны работать.

### 3. IMAGE_PROVIDER env var

Добавить `IMAGE_PROVIDER=auto` в Vercel Production env vars (если ещё нет). Это включит fallback chain.

### 4. GitHub Pages

Push уже сделан — GH Pages должен пересобраться автоматически. Проверить: `https://realcampdzen.github.io/RL-Guide-book/`

## DoD
- [ ] Vercel redeploy successful
- [ ] Prod smoke ≥ 65/72 (accounting for OpenAI + possible env gaps)
- [ ] IMAGE_PROVIDER=auto set
- [ ] GH Pages live с новыми компонентами
