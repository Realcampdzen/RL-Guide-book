# REPORT_D_P1-04 — Закрыть dev-двери в production

**Агент:** D  
**Task ID:** P1-04  
**Дата:** 2026-02-21  
**Статус:** ✅ done

---

## 1. Что сделано

### Backend (`backend/app.py`)

1. Добавлена функция `_is_production()` (до `_is_dev_mode()`):
   ```python
   def _is_production() -> bool:
       """True when ENVIRONMENT=production or NODE_ENV=production."""
       env_raw = (os.getenv("ENVIRONMENT", "") or "").strip().lower()
       if env_raw == "production":
           return True
       node_env = (os.getenv("NODE_ENV", "") or "").strip().lower()
       return node_env == "production"
   ```

2. `_is_dev_mode()` обновлён — возвращает `False` при `_is_production()`.

3. `POST /api/dev/login` — добавлен guard:
   ```python
   if _is_production():
       return jsonify({"error": "Not found"}), 404
   ```

### Frontend (`src/views/ProfileView.tsx`)

4. `showSandbox` — добавлен `!import.meta.env.PROD`:
   ```tsx
   const showSandbox = !import.meta.env.PROD && (role === 'developer' || import.meta.env.DEV || ...);
   ```
   Теперь в prod-сборке sandbox UI и `?sandbox=1` query-param не активируют режим отладки.

### Docs (`.env.example`)

5. Добавлена переменная `ENVIRONMENT=production` с комментарием.

---

## 2. Evidence

| Что | Файл | Строки |
|-----|------|--------|
| `_is_production()` helper | `backend/app.py` | ~341-348 |
| `_is_dev_mode()` с guard | `backend/app.py` | ~349-362 |
| `/api/dev/login` prod gate | `backend/app.py` | ~1779-1781 |
| `showSandbox` prod guard | `src/views/ProfileView.tsx` | ~560 |
| `.env.example` ENVIRONMENT | `.env.example` | ~40-44 |

---

## 3. Smoke-тест

```bash
# При ENVIRONMENT=production:
curl -X POST http://localhost:4000/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{"role":"developer"}'
# Ожидается: 404 {"error": "Not found"}

# В prod-сборке (npm run build):
# showSandbox = false → sandbox UI скрыт
# ?sandbox=1 не активирует dev-режим
```

---

## 4. DoD checklist

- [x] `POST /api/dev/login` возвращает 404 при `ENVIRONMENT=production`
- [x] Sandbox UI (`?sandbox=1`) недоступен в prod-сборке (`import.meta.env.PROD`)
- [x] `.env.example` содержит `ENVIRONMENT=production`
- [x] Prod gates §4.1 из PROD_RELEASE_PLAYBOOK выполнены
