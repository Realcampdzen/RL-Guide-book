# UX AUDIT REPORT — E-UX-AUDIT-M5

**Agent:** Cloud Agent E (Opus 4.6)  
**Date:** 2026-02-27  
**Prod site:** `https://realcampdzen.github.io/RL-Guide-book/`  
**Backend:** `https://backend-murex-one-40.vercel.app`  
**Local dev:** `http://localhost:3001` (Flask 4000 + Vite 3001)  
**Branch:** `cloud/e-validation-m5`

---

## 🔴 Топ-3 критических находки

### 1. PROD: Категории не отображаются (CRITICAL — блокер)

**Что:** На проде (`realcampdzen.github.io/RL-Guide-book/`) страница категорий полностью пуста — только заголовок и навигация, карточки категорий не рендерятся.

**Причина:** Двойной base-path. Vite build копирует `public/` в `dist/RL-Guide-book/` (для GitHub Pages base `/RL-Guide-book/`). Фронтенд запрашивает данные по пути `/RL-Guide-book/ai-data/MASTER_INDEX.json` → **404**. Данные физически лежат по пути `/RL-Guide-book/RL-Guide-book/ai-data/MASTER_INDEX.json` (двойной префикс).

**Проверка:**
```
curl -s -o /dev/null -w "%{http_code}" https://realcampdzen.github.io/RL-Guide-book/ai-data/MASTER_INDEX.json
→ 404

curl -s -o /dev/null -w "%{http_code}" https://realcampdzen.github.io/RL-Guide-book/RL-Guide-book/ai-data/MASTER_INDEX.json
→ 200
```

**Impact:** Пользователь не может просматривать значки. Полная блокировка ключевого пользовательского сценария.

**Рекомендация для Agent D/E:** Исправить `copyRLGuideBookPlugin` в `vite.config.ts` — он копирует `public/` в `dist/RL-Guide-book/`, но Vite при build c `base: '/RL-Guide-book/'` уже размещает `publicDir` контент в `dist/`. Либо убрать `copyPublicDir: false`, либо изменить target в плагине на `dist/` вместо `dist/RL-Guide-book/`.

### 2. PROD: Логотип лагеря — broken image (HIGH)

**Что:** В левом верхнем углу на проде вместо логотипа — alt-текст `"Домик"` (broken `<img>`). На localhost логотип отображается корректно.

**Причина:** Та же проблема с двойным base-path — изображение `ai_camp.png` недоступно по ожидаемому пути.

### 3. PROD: Backend `/health` → 404 (MEDIUM)

**Что:** `https://backend-murex-one-40.vercel.app/health` → "The page could not be found". При этом `/api/stats` работает (14 cats, 119 badges).

**Причина:** Vercel serverless routes не покрывают корневой `/health` endpoint. Либо route не зарегистрирован в `vercel.json`, либо Vercel deploy включает только `/api/*` prefix.

**Рекомендация для Agent D:** Добавить `/health` в `vercel.json` rewrites или переименовать в `/api/health`.

---

## Блок 1 — Тест по ролям

### Prod (GitHub Pages)

| Роль | Страница | Результат | Примечание |
|---|---|---|---|
| Traveler (default) | Landing | ⚠️ WARN | Broken logo, но загружается |
| Traveler | Categories | ❌ FAIL | Полностью пустая — данные 404 |
| Traveler | Badge detail | ❌ BLOCKED | Невозможно открыть без категорий |
| Traveler | Profile | ⚠️ WARN | Открывается, но без данных значков функциональность ограничена |
| Sandbox (?sandbox=1) | Landing | ✅ OK | Sandbox-параметр сохраняется |

**Вывод:** Полноценное тестирование ролей на проде невозможно из-за бага #1. Продолжение на localhost.

### Localhost (dev mode)

| Роль | Landing | Categories | Badge detail | Profile | Inbox | Approve |
|---|---|---|---|---|---|---|
| Traveler | ✅ | ✅ | ✅ | ✅ | — | — |
| Participant | ✅ | ✅ | ✅ | ✅ | — | Подтверждение значка ✅ |
| Parent | ✅ | ✅ | ✅ | ✅ (read-only) | — | — |
| Counselor | ✅ | ✅ | ✅ | ✅ | ⚠️ Нужен JWT | ⚠️ Нужен JWT |
| Shift Leader | ✅ | ✅ | ✅ | ✅ | ✅ (через dev/login) | ✅ |
| Developer | ✅ | ✅ | ✅ | ✅ + sandbox | ✅ | ✅ + fast approve |

**Вывод localhost:** Все роли функционируют. Sandbox корректно показывает/скрывает элементы. RBAC на API уровне работает (parent → 403 на /api/shifts).

---

## Блок 2 — UX-проверки (U1–U8)

Проверено на localhost (prod недоступен из-за бага #1).

| ID | Проверка | Результат | Примечание |
|---|---|---|---|
| U1 | Chip/label consistency | ✅ OK | Роли отображаются корректно: «ПУТЕШЕСТВЕННИК», «УЧАСТНИК СМЕНЫ», и т.д. |
| U2 | ImageSourceBlock | ✅ OK | На странице значка присутствуют кнопки «СОЗДАТЬ С ПОМОЩЬЮ ИИ», «КЛАССИКА», «МОЙ АРТ», «ПРЕДЛОЖИТЬ СВОЙ АРТ» — все рендерятся |
| U3 | Auto-sync ai-data | ⚠️ N/A | На проде data не загружается (баг #1). На localhost — данные грузятся из `public/ai-data/` корректно |
| U4 | Reject reason в inbox | ⚠️ NOT TESTED | Для полного теста нужен reject через staff JWT — API-уровень подтверждён в E-VALIDATION-M5 |
| U5 | Pending badge count в чате | ⚠️ NOT TESTED | Чат заблокирован (требует auth). Chat UI открывается, показывает «Разблокировать через код» |
| U6 | Подтверждение значка UX | ✅ OK | Кнопка «В МОЙ ПУТЬ» присутствует. Модалка подтверждения с полями (Опыт, Реальный вклад, Ссылка, Фото) рендерится |
| U7 | Navigation consistency | ✅ OK | Bottom nav bar: 6 иконок, все кликабельны, подсвечиваются при выборе |
| U8 | Role selector UX | ✅ OK | Модалка «ВЫБЕРИ РОЛЬ» при первом входе в профиль. Dropdown в sandbox режиме. Оба работают |

---

## Блок 3 — Мобильный тест (375px, iPhone SE)

Тестировано на localhost через Chrome DevTools.

| Экран | Overflow | Читабельность | Layout | Verdict |
|---|---|---|---|---|
| Landing | ✅ Нет | ✅ Крупный текст | ✅ Адаптивный | PASS |
| Categories grid | ✅ Нет | ✅ 2-column grid | ✅ Карточки масштабируются | PASS |
| Category detail | ✅ Нет | ✅ Фильтры читабельны | ✅ Single-column cards | PASS |
| Badge detail | ✅ Нет | ✅ Кнопки читабельны | ✅ Stacked layout | PASS |
| Profile menu | ✅ Нет | ✅ Пункты меню читабельны | ✅ Full-width cards | PASS |
| Chatbot panel | ✅ Нет | ✅ Текст читабелен | ✅ Full-screen overlay | PASS |

**Вывод:** Мобильная адаптивность — **отличная**. Нет горизонтального скролла, overflow, или нечитабельных элементов. CSS `overflow-x: hidden` на body работает.

---

## Блок 4 — Чат НейроВалюши

| # | Вопрос | Результат | Примечание |
|---|---|---|---|
| 1 | Открытие чата | ✅ | Панель открывается по клику на аватар. Показывает «ЧТО УМЕЕТ ВАЛЮША» и «Разблокировать через код» |
| 2 | Контекст чата | ⚠️ BLOCKED | Чат заблокирован без аутентификации. Кнопка «Разблокировать через код» — единственный путь |
| 3–7 | Тестовые вопросы | ⚠️ BLOCKED | Невозможно отправить сообщения без auth |

**Вывод:** Чат корректно заблокирован для неавторизованных пользователей. Для полного тестирования (7 вопросов) требуется рабочий auth-код от prod-бэкенда (AUTH_GENERATE_SECRET). На localhost чат также требует OPENAI_API_KEY для ответов ИИ.

---

## Рекомендации для команды

### Для Agent B (UX/Frontend)
1. ✅ Мобильная адаптивность в отличном состоянии — не требует доработки
2. ✅ Chip/label consistency — корректна
3. ⚠️ После фикса бага #1 — повторно проверить все экраны на проде

### Для Agent C (Chat/AI/Safety)
1. ⚠️ Чат НейроВалюши не тестируем без auth — нормальное поведение
2. Рекомендация: добавить fallback-сообщение при отсутствии OPENAI_API_KEY (сейчас просто ошибка сети)

### Для Agent D (Infra/Release)
1. **URGENT:** Исправить двойной base-path в билде — это блокирует весь прод. Проблема в `vite.config.ts` → `copyRLGuideBookPlugin` который копирует `public/` в `dist/RL-Guide-book/`, создавая двойной путь
2. Добавить `/health` endpoint в Vercel routes
3. После фикса — Cloud Agent E может повторить полный аудит на проде

---

## Evidence (артефакты)

| Файл | Описание |
|---|---|
| `ux_audit_prod_critical_bugs.mp4` | Видео: prod site — broken categories, empty grid |
| `ux_audit_mobile_375px.mp4` | Видео: mobile viewport test (375px, 6 экранов) |
| `prod_landing_broken_logo.webp` | Prod: landing с broken image логотипа |
| `prod_categories_EMPTY.webp` | Prod: пустая страница категорий (CRITICAL) |
| `mobile_landing_375.webp` | Mobile: landing page |
| `mobile_categories_375.webp` | Mobile: categories grid (2 columns) |
| `mobile_badge_detail_375.webp` | Mobile: badge detail page |
| `mobile_profile_375.webp` | Mobile: profile menu |
| `mobile_chatbot_375.webp` | Mobile: chatbot panel |

---

*Report by Cloud Agent E (Opus 4.6) — 2026-02-27*
