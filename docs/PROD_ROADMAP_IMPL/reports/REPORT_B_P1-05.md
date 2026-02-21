# REPORT_B_P1-05 — Убрать forced traveler в prod

**Агент:** B  
**Task ID:** P1-05  
**Дата завершения:** 2026-02-21  
**Фаза:** 1

---

## 1. Идентификация агента

- **Агент:** B (UX & Frontend)
- **Зона ответственности:** Frontend-логика авторизации, роль из JWT, UX для unauthenticated пользователей
- **Ссылка на план:** [`plans/PLAN_P1-05.md`](../plans/PLAN_P1-05.md)

---

## 2. Что сделано

### Изменённые файлы

| Файл | Тип | Описание изменений |
|------|-----|--------------------|
| `src/utils/authStorage.ts` | modified | Удалён блок forced traveler (3 строки), роль теперь берётся из JWT напрямую |

### Ключевые изменения (детально)

**Файл: `src/utils/authStorage.ts`**

Удалён блок:
```ts
// В production всегда возвращаем traveler — иначе пользователь мог бы иметь developer из dev-сессии
const effectiveRole = import.meta.env.PROD && role !== 'traveler' ? 'traveler' : role;
```

И использование `effectiveRole` в return заменено на `role`.

**Поведение после:**
- Роль читается из JWT-payload напрямую (`role` поле в stored auth).
- При expired токене — `clearAuthStorage()` → `DEFAULT_ROLE = 'traveler'` (работает как раньше).
- При отсутствующем токене — `DEFAULT_ROLE = 'traveler'` → пользователь видит FeatureGate с CTA "Разблокировать по коду".
- Legacy значение `'organizer'` по-прежнему маппится в `'shift_leader'`.
- Все остальные роли (`participant`, `parent`, `counselor`, `shift_leader` и т.д.) корректно передаются в UI.

---

## 3. Проверки

- [x] `npm run self-check` — прошёл (exit code 0)
- [x] Linter (`ReadLints`) — нет ошибок в `authStorage.ts`
- [x] Инвариант: exp-check и clearAuthStorage — сохранены нетронутыми
- [x] Инвариант: legacy role 'organizer' → 'shift_leader' маппинг — сохранён
- [x] UX при DEFAULT_ROLE: в ProfileView для `isTraveler(role) = true` отображаются FeatureGate с "Разблокировать по коду" — логика не менялась, работает корректно

---

## 4. Evidence (для вставки в ROADMAP_2026.md)

```
| Done | P1-05: Убрать forced traveler в prod | src/utils/authStorage.ts: удалён блок `import.meta.env.PROD && role !== 'traveler'`; роль теперь берётся из JWT напрямую; при expired/отсутствующем токене DEFAULT_ROLE='traveler' → FeatureGate CTA |
```

---

## 5. Следующие шаги (для других агентов)

- **Агент D/E (P1-06):** Backend RBAC по JWT необходим для полной безопасности: без него фронт-роль из localStorage теоретически можно подделать вручную. P1-06 закрывает серверную сторону.
- **Агент B (P1-09):** UX smoke-сценарии теперь можно проходить с реальными ролями из JWT. Нужно дождаться готовности P1-03 (Supabase для основных сторов) и P1-06 (RBAC).
- **Общее:** P1-04 (закрыть dev-двери) — независимая задача, можно брать параллельно.

---

## 6. Открытые вопросы / долг

- [ ] При первом production-деплое: у пользователей в localStorage может быть старый токен без `exp` (из dev-сессий). Они автоматически получат `DEFAULT_ROLE`, пока не введут код заново. Это ожидаемое поведение — явного дополнительного действия не требуется.
