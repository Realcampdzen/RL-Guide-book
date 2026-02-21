# PLAN_P1-04 — Закрыть dev-двери в production

**Агент:** D  
**Task ID:** P1-04  
**Дата создания плана:** 2026-02-21  
**Статус:** in_progress

---

## 1. Цель задачи

Закрыть все "dev-двери" в production-окружении:
- `/api/dev/login` должен быть недоступен при `ENVIRONMENT=production` или `NODE_ENV=production`
- Sandbox UI (переключатель ролей, dev-кнопки) уже скрыт за `import.meta.env.DEV` — проверить и подтвердить
- Убедиться, что нет других тестовых endpoint'ов, доступных в prod

[TASKS.md#p1-04](../TASKS.md#p1-04)

---

## 2. Контекст (что уже есть)

- `backend/app.py` line 1762: `@app.route('/api/dev/login')` — проверяет только `_is_localhost_request()`, не ENVIRONMENT
- `src/views/ProfileView.tsx` line 560: `showSandbox = role === 'developer' || import.meta.env.DEV || sandbox=1 query param`
- `_is_dev_mode()` уже существует — проверяет FLASK_ENV/ENV/NODE_ENV для seed data
- В prod (`import.meta.env.PROD=true`) `import.meta.env.DEV=false` → sandbox не показывается, НО `sandbox=1` query-param всё ещё работает

---

## 3. Файлы для изменения

| Файл | Тип изменения | Описание |
|------|---------------|----------|
| `backend/app.py` | modify | `/api/dev/login` — добавить проверку `ENVIRONMENT` / `_is_production()` |
| `src/views/ProfileView.tsx` | modify | `showSandbox` — убрать `sandbox=1` query bypass в prod-сборке |
| `.env.example` | modify | Добавить `ENVIRONMENT=production` как документированную переменную |

---

## 4. Шаги реализации

1. **Backend** — добавить `_is_production()` helper и применить в `dev_login`
   - Проверяет `ENVIRONMENT=production` или `NODE_ENV=production` или отсутствие dev-маркеров
   - В production возвращать 403 даже с localhost (защита от прокси/внутреннего использования)

2. **Frontend** — `showSandbox` убрать возможность `sandbox=1` query-param в prod
   - В `import.meta.env.PROD` условие `sandbox=1` не работает

3. **`.env.example`** — задокументировать `ENVIRONMENT=production`

---

## 5. Зависимости

- **Зависит от:** нет
- **Блокирует:** P1-09 (E2E тесты в prod)
- **Параллельно:** P1-06, P1-10, P2-01

---

## 6. Риски

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Сломать local dev (dev/login нужен для песочницы) | Низкая | Проверяем только ENVIRONMENT=production, дефолт — dev |
| sandbox=1 через query — намеренная фича для developer-роли | Средняя | В prod отключить только если `import.meta.env.PROD` |

---

## 7. Definition of Done

- [x] `POST /api/dev/login` возвращает 404 при `ENVIRONMENT=production`
- [x] Sandbox UI (`?sandbox=1`) недоступен в prod-сборке
- [x] `.env.example` содержит `ENVIRONMENT=production`
- [x] Отчёт создан
- [x] `CLAIM_BOARD.md` обновлён

---

## 8. Отклонения от плана

*Пусто*
