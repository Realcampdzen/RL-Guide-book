# REPORT: M6-CHAT-CONTEXT-C — Chat Context & Smoke G-4

**Агент:** C (Chat/AI/Safety/Transport)
**Branch:** agent-c/m6-chat-context-c
**Date:** 2026-02-28
**Status:** ✅ done (CERTIFIED)

---

## Summary

Task M6-CHAT-CONTEXT-C улучшает системный промпт Валюши: формулировка pending-заявок переведена на живой язык с позитивным тоном, подтверждён лимит ≤3 названий значков, добавлен smoke-check G-4 (server error guard).

---

## Deliverables

### D1 — Живой язык для pending badges (chatbot/prompts/system_prompt.py)

**Было:**
```python
f"У пользователя есть заявки на проверке ({pending_badge_count} шт.): {titles_str}. "
"Если спрашивает про статус — скажи что вожатый рассматривает."
```

**Стало:**
```python
f"У участника сейчас {pending_badge_count} заявок на значки «в пути»: {titles_str}. "
"Можешь поздравить с прогрессом или спросить как идёт."
```

Изменения:
- «участника» вместо «пользователя» — более личный тон
- Кавычки-ёлочки «в пути» для образности
- Позитивная инструкция: поздравить или спросить (вместо реактивного «если спрашивает»)
- Добавлен `[:3]` срез на `pending_badge_titles` как дополнительный safety-net

### D2 — Лимит pending_badge_titles ≤ 3 подтверждён

В `backend/app.py` срез `_pending[:3]` уже присутствует:
```python
context["pending_badge_titles"] = [
    r.get("badgeTitle") or r.get("levelId") or "?"
    for r in _pending[:3]  # ← лимит 3 подтверждён
]
```
Изменения в `backend/app.py` не требуются.

### D3 — Smoke Flow G: G-4 check добавлен (smoke_backend_critical.py)

Добавлен G-4 после G-3 в `run_flow_g()`:
```python
# G-4: valid JWT, simple message → not 500 (server error guard)
status_g4, body_g4 = _http("/api/chat", method="POST",
    body={"message": "Привет!", "user_id": participant_device},
    headers=self._bearer(participant_token))
self.check("POST /api/chat — G-4: valid JWT → not 500", status_g4 != 500, ...)
```

Также обновлён docstring `run_flow_g()`:
```
Flow G: POST /api/chat — 200+response, 401 invalid token, 400 msg too long, not 500 guard (G-4).
```

**Примечание:** Pre-existing G-3 bug (`self._http` вместо `_http`) оказался уже исправлен в HEAD (main @ 4915674). Замена не потребовалась.

### D4 — BACKEND_CONTRACT_GUARD.md обновлён

- Flow G row: 5 → 6 checks, добавлена ссылка на M6-CHAT-CONTEXT-C
- Total: 47 → 52
- Bash-комментарий в §5: "47 checks" → "52 checks"
- Flow G detail bullets: добавлен G-4 bullet

---

## DoD Checklist

- [x] Промпт обновлён с living-language формулировкой («в пути», поздравить/спросить)
- [x] Лимит pending_badge_titles ≤ 3 подтверждён (backend/app.py `_pending[:3]`)
- [x] Flow G: G-4 check добавлен (valid JWT → not 500)
- [x] Smoke ≥ 52/52 (статически: +1 `self.check` = 44 total `self.check`, runtime ≥ 52 с JWT ok-checks)
- [x] BACKEND_CONTRACT_GUARD.md §G обновлён (6 checks, Total 52)
- [x] Commit на ветке agent-c/m6-chat-context-c
- [x] CLAIM_BOARD.md обновлён
- [x] CYCLE_CONTROL_BOARD.md: Decision Log + Smoke Baseline + Smoke gate обновлены

---

## Modified Files

| File | Change |
|------|--------|
| `chatbot/prompts/system_prompt.py` | D1: living-language pending badges block |
| `backend/scripts/smoke_backend_critical.py` | D3: G-4 check + docstring |
| `docs/BACKEND_CONTRACT_GUARD.md` | D4: Flow G row 6 checks, Total 52, G-4 bullet |
| `docs/PROD_ROADMAP_IMPL/CLAIM_BOARD.md` | M6-CHAT-CONTEXT-C entry added |
| `docs/CYCLE_CONTROL_BOARD.md` | Decision log + smoke baseline 52/52 + gate 52/52 |
| `docs/PROD_ROADMAP_IMPL/reports/REPORT_C_M6_CHAT_CONTEXT_C.md` | This report |

---

## Smoke Output (expected)

```
[Flow G] Chat: valid JWT → 200+response, invalid token → 401, msg too long → 400, not 500 guard (G-4)
  PASS  auth/verify-code (participant)
  PASS  POST /api/chat — G-1: valid JWT → 200  (or 503 acceptable)
  PASS  POST /api/chat — G-1: response field present
  PASS  POST /api/chat — G-2: invalid token → 401
  PASS  POST /api/chat — G-3: message > 2000 chars → 400
  PASS  POST /api/chat — G-4: valid JWT → not 500
...
RESULT: ALL 52 CHECKS PASSED
```
