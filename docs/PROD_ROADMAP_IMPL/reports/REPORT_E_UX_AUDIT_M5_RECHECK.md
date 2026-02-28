# UX AUDIT RECHECK — E-UX-AUDIT-M5-RECHECK

**Agent:** Cloud Agent E (Opus 4.6)  
**Date:** 2026-02-28  
**Production URL:** `https://realcampdzen.github.io/RL-Guide-book/`  
**Branch:** `cloud/e-validation-m5`  
**Previous report:** `REPORT_E_UX_AUDIT_M5.md`

---

## Verdict: STILL_BROKEN

Хотфикс Agent D (`9a26f54`) корректно исправляет двойной путь в `vite.config.ts` — **локальный билд верифицирован** (`dist/RL-Guide-book/ai-data/MASTER_INDEX.json` ✅, `dist/RL-Guide-book/category_1.png` ✅, двойной путь не создаётся). Однако **деплой на GitHub Pages не работает** из-за независимой инфраструктурной проблемы.

---

## Таблица: Было → Стало

| # | Находка | Было | Стало | Примечание |
|---|---------|------|-------|------------|
| 1 | Категории пустые | CRITICAL | **STILL CRITICAL** | `MASTER_INDEX.json` → 404 на проде. Но: **локальный билд OK** — проблема в деплое (см. ниже) |
| 2 | Логотип broken | HIGH | **STILL HIGH** | `ai_camp.png` → 404 на проде. Та же причина |
| 3 | `/health` → 404 | MEDIUM | **STILL MEDIUM** | Не в scope хотфикса. Backend route не в Vercel config |

---

## Корневая причина: Artifact > 1 GB

**Хотфикс работает.** Проблема в другом:

```
GitHub Actions Annotation (deploy run #22508480197):
⚠️ Uploaded artifact size of 2035371864 bytes exceeds the allowed size of 1 GB.
   Deployment might fail.
```

Артефакт деплоя = **~2 GB**. GitHub Pages лимит = **1 GB**. Деплой отмечается как `success`, но артефакт обрезается — большинство файлов из `public/` (изображения, ai-data) **не доставляются**.

### Разбивка размера dist/:

| Директория | Размер | % |
|---|---|---|
| `dist/RL-Guide-book/Новые значки/` (badge photos) | **1.5 GB** | 75% |
| `dist/RL-Guide-book/pictures/` | 262 MB | 13% |
| `dist/RL-Guide-book/шапки внутри категорий/` | 41 MB | 2% |
| `dist/assets/` (JS/CSS bundles) | 1.9 MB | 0.1% |
| `dist/RL-Guide-book/ai-data/` (JSON data) | 1.3 MB | 0.07% |

**Итого:** 1956 MB (файлы: 575 .webp, 566 .jpg, 226 .png, 139 .json)

### Почему раньше работало

До добавления массивных badge-фотографий в `public/Новые значки/` и `public/pictures/`, dist был < 1 GB и деплоился корректно. Старый деплой (до изображений) всё ещё частично кешируется на GitHub Pages CDN, поэтому некоторые файлы (из `/RL-Guide-book/RL-Guide-book/...`) доступны.

---

## Блок 1 — Проверка критических багов

### URL-аудит (curl)

| URL | HTTP | Примечание |
|---|---|---|
| `/RL-Guide-book/ai-data/MASTER_INDEX.json` | **404** | Данные категорий не доступны |
| `/RL-Guide-book/ai-data/category-1/badges.json` | **404** | Данные значков не доступны |
| `/RL-Guide-book/category_1.png` | **404** | Иконка категории |
| `/RL-Guide-book/category_2.png` … `category_14.png` | **все 404** | Все иконки категорий |
| `/RL-Guide-book/ai_camp.png` | **404** | Логотип лагеря (фон) |
| `/RL-Guide-book/домик_AI.jpg` | **404** | Кнопка «О лагере» |
| `/RL-Guide-book/Валюша.jpg` | **404** | Изображение значка |
| `/RL-Guide-book/badges_photo.jpg` | **404** | Фото значков |
| `/RL-Guide-book/Gemini_Generated_Image_ct40o9ct40o9ct40.png` | **404** | Навигационное изображение |
| `/RL-Guide-book/sw.js` | **200** | ✅ Service worker (маленький файл) |
| `/RL-Guide-book/404.html` | **200** | ✅ Fallback HTML |
| `/RL-Guide-book/index.html` | **200** | ✅ SPA entry point |
| `/RL-Guide-book/assets/main-87098a67.js` | **200** | ✅ JS бандл |

### Браузерная проверка (DevTools Console)

Ошибки в консоли:
- `Failed to load resource: 404` — `RL-Guide-book/ai-data/MASTER_INDEX.json`
- `Error loading AI data: Failed to fetch /RL-Guide-book/ai-data/MASTER_INDEX.json: 404`
- `Failed to load resource: 404` — множественные `.webp` и `.png` файлы
- `Failed to load resource: 404` — `api/community/badges`, `api/bro-missions`

### Визуальные дефекты

| Экран | Дефект | Severity |
|---|---|---|
| Landing | Broken logo (top-left), background не загружается | HIGH |
| Categories | **Полностью пустая** — карточки не рендерятся (нет данных) | CRITICAL |
| Badge detail | Не открывается — нет данных категорий | CRITICAL |
| Profile cabin | ✅ Работает! Все изображения загружаются (они inline/bundled) | OK |
| Chatbot | ✅ Аватар и панель отображаются | OK |

---

## Блок 2 — Верификация локального билда

| Проверка | Результат |
|---|---|
| `npm run build` | ✅ 0 errors, 15.09s |
| `dist/RL-Guide-book/ai-data/MASTER_INDEX.json` | ✅ Exists |
| `dist/RL-Guide-book/category_1.png` | ✅ Exists |
| `dist/RL-Guide-book/ai_camp.png` | ✅ Exists |
| `dist/RL-Guide-book/домик_AI.jpg` | ✅ Exists |
| `dist/RL-Guide-book/RL-Guide-book/` (double-prefix) | ✅ NOT EXISTS — hotfix works |
| Общий размер `dist/` | ❌ **1956 MB** (лимит GH Pages: 1 GB) |

**Вывод:** Хотфикс корректен. Проблема = размер артефакта.

---

## Рекомендации для Agent D / Стёпы

### Вариант A: Исключить тяжёлые изображения из билда (RECOMMENDED)

Исключить `Новые значки/` (1.5 GB), `pictures/` (262 MB), `шапки внутри категорий/` (41 MB) из `copyRLGuideBookPlugin`. Эти изображения можно:
1. Хостить отдельно (CDN, GitHub LFS, S3)
2. Загружать лениво через отдельный endpoint

Это уменьшит dist до ~50 MB и деплой будет работать.

### Вариант B: Оптимизировать изображения

- 566 `.jpg` файлов = 1.3 GB. Средний .jpg = 2.4 MB
- Многие — фотографии в высоком разрешении, не оптимизированные для веба
- Ресайз до max 1200px + quality 80% может уменьшить на 60-80%

### Вариант C: Разделить деплой

- JS/CSS/JSON → GitHub Pages (< 10 MB)
- Изображения → CDN/отдельный хост
- Frontend загружает изображения по CDN-URL

---

## Evidence

| Файл | Описание |
|---|---|
| `recheck_prod_still_broken.mp4` | Видео: prod сайт всё ещё сломан |
| `recheck_console_404s.webp` | Console: множественные 404 |
| `recheck_categories_still_empty.webp` | Категории всё ещё пустые |
| `recheck_profile_works.webp` | Профиль работает (inline images) |

---

*Report by Cloud Agent E (Opus 4.6) — 2026-02-28*
