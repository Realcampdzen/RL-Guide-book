# REPORT_D_P1-10 — Docs: staging checklist + monitoring

**Агент:** D  
**Task ID:** P1-10  
**Дата:** 2026-02-21  
**Статус:** ✅ done

---

## 1. Что сделано

### `docs/PROD_RELEASE_PLAYBOOK.md`

**§5 Pre-release checklist** расширен секцией `§5.1 Smoke-тесты API (curl)`:
- Health check: `GET /api/health`
- Dev-дверь проверка: `POST /api/dev/login` → ожидается 404 в prod
- Unlock flow: generate-code → verify-code → JWT
- RBAC проверки: participant inbox → 403, без токена → 401
- Смены и отряды: list shifts, list squads
- Rate limit: loop > CHAT_MSG_RATE_LIMIT_PER_MIN → 429
- Safety filter: ссылка в squad message → 400

**§7 Monitoring** переработан:
- Таблица сигналов тревоги (5xx, 429, 401, 403, Supabase errors)
- Что логировать (реализовано в backend)
- Как читать логи в Vercel (bash команды)
- Операционный путь (staff / ops)

### `docs/CAMP_RUNBOOK.md`

**§6 Инциденты** расширен подробными секциями:
- §6.1: 401 — диагностика + решение
- §6.2: 403 — диагностика + решение
- §6.3: 500 — bash команды диагностики + решение
- §6.4: Спам/абьюз — описание уже работающей защиты + доп. меры
- §6.5: Чеклист топ-3 инцидентов (таблица)

---

## 2. Evidence

| Что | Файл | Секция |
|-----|------|--------|
| curl smoke тесты | `docs/PROD_RELEASE_PLAYBOOK.md` | §5.1 |
| monitoring таблица | `docs/PROD_RELEASE_PLAYBOOK.md` | §7.1–7.4 |
| incident runbook | `docs/CAMP_RUNBOOK.md` | §6.1–6.5 |

---

## 3. DoD checklist

- [x] Pre-release checklist содержит конкретные curl-команды
- [x] Monitoring секция описывает сигналы и реакции (таблица §7.1)
- [x] CAMP_RUNBOOK.md содержит ответы на топ-3 инцидента (§6.5)
