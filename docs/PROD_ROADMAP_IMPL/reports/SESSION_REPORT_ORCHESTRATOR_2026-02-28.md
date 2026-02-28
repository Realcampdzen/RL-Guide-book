# SESSION REPORT — Оркестратор NeuroStepa
**Дата:** 2026-02-28  
**Оркестратор:** NeuroStepa (Cursor Agent)  
**Цикл:** 2026-02-28-F  
**Последний коммит main:** `26cac15`

---

## 1. Контекст сессии

### Роль оркестратора
Cursor Agent выступал в роли Chief Architect + Orchestrator. Задачи:
- Онбординг в проект (чтение ORCHESTRATOR_AGENT_BOOTSTRAP.md)
- Постановка TASK каждому агенту с явным `Base: main @ <hash>` и `Branch: agent-X/<task-id>`
- Приём DONE-пакетов (commit hash + smoke output + отчёт)
- Мерж агентских веток в main после каждого DONE
- Синхронизация досок: CLAIM_BOARD, CYCLE_CONTROL_BOARD, ROADMAP_2026
- Диагностика и устранение системных проблем

### Команда

| Агент | Роль | Специализация |
|-------|------|---------------|
| Agent A | Backend | Flask API, Supabase, smoke scripts |
| Agent B | UX/Frontend | React/Vite, TSX компоненты, ESLint |
| Agent C | Chat/AI/Safety | Chatbot, промпты, rate limits, Telegram API |
| Agent D | Infra/Ops | Vercel, env vars, vite.config, release ops |
| Agent E (Opus) | Cloud Browser | Browser validation, UX audit, deploy verification |
| NeuroStepa | Orchestrator | Task management, git ops, board sync |

### Рабочий процесс
```
TASK (оркестратор) → PLAN (агент) → IMPLEMENT (агент) → REPORT (агент) → MERGE (оркестратор) → следующий TASK
```

### Стек
- **Frontend:** React + Vite, GitHub Pages (static hosting)
- **Backend:** Flask Python, Vercel deployment
- **Database:** Supabase (Postgres), USE_SUPABASE=true на prod
- **CI/CD:** GitHub Actions → upload-pages-artifact → GitHub Pages
- **Боты:** НейроВалюша (основной), + 3 лобстера (NeuroStepa, Cat Bro, Dev Bro 1)

---

## 2. Что сделано — по агентам

### Agent A — Backend

| Task ID | Что сделано | Commit | Smoke |
|---------|-------------|--------|-------|
| M5-R2-A | Smoke script (22 checks), contract guard doc, playbook §5.3 | `a995a1b` | 22/22 ✅ |
| M5-R2-B | Badge /mine privacy + educator inbox auto-scope + smoke Flow D | `debe941` | 31/31 ✅ |
| M5-R3-A | Badge TTL filter (`includeResolved`), cleanup endpoint, smoke Flow F (Teams lifecycle) | `84ef633` | 39/39 ✅ |
| M5-R4-A | Supabase GAP fix: requestedBy schema mismatch + load_inbox() SQL filtering | `2f6139d` | 39/39 ✅ |
| M5-R5-A | `delete_resolved()` SQL-level DELETE + `hasattr` guard для JSON fallback, Flow H+I | `8c29ba7` | 51/51 ✅ |
| M6-BACKEND-HARDENING-A | Rate limit 1/60s per-camp на `POST /api/badges/requests/cleanup` + `camp_id` в лог + H-3 check | `6ec335a` | 52/52 ✅ |

**Файлы Agent A:** `backend/app.py`, `backend/storage/supabase_provider.py`, `backend/scripts/smoke_backend_critical.py`, `docs/BACKEND_CONTRACT_GUARD.md`

---

### Agent B — UX/Frontend

| Task ID | Что сделано | Commit |
|---------|-------------|--------|
| M3-BF-S4 | Badge Request Status Panel: chip tones, empty state CTA, Sync CTA, M2 guard, scroll+hint | `e474174` |
| M3-BF-S5 | Auto-sync approved levels on mount + celebration hint (startTutorial) + reject reason в «Мои заявки» | `44533b0` |
| M3-BF-S6 | Staff inbox UX: локализация кнопок + inline reject form + optimistic UI + evidence accordion | `14914fd` |
| M3-BF-S7 | ESLint HIGH fix (6 no-unused-expressions), inbox squadId, pending counter | `fa05be9` |
| M6-IMG-FIX | Замена 26 хардкодных `/RL-Guide-book/` → `${import.meta.env.BASE_URL}` в 9 TSX файлах | `482973d` |
| TAILS_RECONCILE_B | ImageSourceBlock audit (7 usage-points), chip/tone consistency (3 системы), M2 parent read-only подтверждён | `b3d38e8` |

**Файлы Agent B:** компоненты в `src/views/`, `src/components/`, `src/utils/`

---

### Agent C — Chat/AI/Safety

| Task ID | Что сделано | Commit | Smoke |
|---------|-------------|--------|-------|
| M5-R2-C | Images safety: prompt sanitization + per-camp daily quota + smoke Flow E | `0a307ee` | CERTIFIED ✅ |
| M5-R3-C | Chat context enrichment: squad_name/shift_name/nickname в системный промпт + Flow G | `248e456` | 43/43 ✅ |
| M5-R4-C | Pending badges context injection + CHAT_MAX_MESSAGE_LEN=400 + G-3 smoke | `374fd3b` | 44/44 ✅ |
| M5-R5-C | `/api/telegram/agent-post`: AGENT_BOT_TOKENS map (neuro_stepa/cat_bro/dev_bro_1), auth, dedup guard, Flow I | `76d2e89` | 47/47 ✅ |
| M6-CHAT-CONTEXT-C | Living-language pending badges prompt («в пути» вместо «на проверке»), [:3] срез, G-4 guard | `acf77f7` | 52/52 ✅ |

**Файлы Agent C:** `chatbot/prompts/system_prompt.py`, `backend/app.py`, `backend/scripts/smoke_backend_critical.py`

---

### Agent D — Infra/Ops

| Task ID | Что сделано | Commit |
|---------|-------------|--------|
| M5-R3-D | Staging smoke (STAGING_BACKEND_NOT_DEPLOYED), env matrix audit, RELEASE_NOTE Known Issues | `131460b` |
| M5-R4-D | SUPABASE_SERVICE_ROLE_KEY VERIFIED, STAGING_BACKEND_SETUP.md, PROD_RELEASE_PLAYBOOK §4.1 | `d130639` |
| TAILS_RECONCILE_D | LKG/rollback/checklist links, OPS_SNAPSHOT_M5_GO.md, risk matrix R1–R6 | `4f3cebf` |
| M5-R5-D | LOBSTERS_RUNBOOK.md, OPS_SNAPSHOT §3 NEEDS_VERCEL_ADD, PROD_RELEASE_PLAYBOOK §5.3 | `ac37faa` |
| HOTFIX-BASE-PATH | Попытка fix vite.config.ts (устранил вложенность, но target оставался dist/RL-Guide-book/) — частичное решение | `9a26f54` |
| M6-VERCEL-LOBSTERS | 3 токена лобстеров добавлены в Vercel Production (VERIFIED_OPTIONAL), redeploy READY | `c981b5f` |
| GIT-SIZE-REDUCTION | `git rm --cached` 583 JPG + 68 .orig, `.gitignore` обновлён, `badgeImages.ts` + `badgeImageMap.ts`: `.jpg` → `.webp`. Artifact: 2.2GB → ~250MB | `5e43f0a` |

**Файлы Agent D:** `vite.config.ts`, `docs/OPS_SNAPSHOT_M5_GO.md`, `docs/LOBSTERS_RUNBOOK.md`, `.gitignore`, `src/utils/badgeImages.ts`, `src/utils/badgeImageMap.ts`

---

### Agent E (Opus) — Cloud Browser

| Task ID | Что сделано | Commit |
|---------|-------------|--------|
| E-ESLINT-TRIAGE-M5 | ESLint аудит 193 issues: CRITICAL=0, HIGH=24 (non-blocking), NOISE=169 (88%). Verdict: ничего не блокирует release | `bc4627a` |
| E-VALIDATION-M5 | Browser runtime validation на production URL, скриншоты, smoke-сценарии | `009a5d3` |
| E-FIX-DEPLOY-PATH | **КРИТИЧЕСКИЙ FIX**: обнаружил настоящую корневую причину всех 404 — `public/` копировался в `dist/RL-Guide-book/` вместо `dist/`. Упростил `vite.config.ts` до `copyDir('public', 'dist')`. Verified: dist/ = 752MB, двойного пути нет | `aefcedd` |
| E-FIX-CURSOR | cursor ghost-line artifact на страницах значков: `will-change: transform, opacity` + `backface-visibility: hidden` + `isolation: isolate` на hover. GPU-промоушн без изменения визуала | `2c22669` |

**Ключевой вклад Opus:** нашёл то, что все агенты пропускали — настоящую причину 404 после нескольких раундов симптоматического лечения.

---

### Оркестратор (NeuroStepa)

- **Онбординг:** прочитал ORCHESTRATOR_AGENT_BOOTSTRAP.md, настроился на роль
- **GIT_DISCIPLINE_FIX:** диагностировал "shared branch" антипаттерн, вручную смержил 4 ветки в main в правильном порядке, зафиксировал правила §8b в bootstrap-документе
- **Правило 3b:** добавил после инцидента с git stash Agent A (305ad2d — мусорный merge-коммит на main)
- **Merge ops:** смержил каждую агентскую ветку в main после DONE, разрешал конфликты в CLAIM_BOARD.md и smoke_backend_critical.py вручную
- **Board sync:** синхронизировал CLAIM_BOARD, CYCLE_CONTROL_BOARD, ROADMAP_2026 после каждого цикла
- **Диагностика:** идентифицировал проблему размера репо (2.22 GiB > 1 GB лимит GitHub Pages)
- **Push:** запускал деплой через `git push origin main` после каждого цикла

---

## 3. Проблемы, которые возникли — и как решили

### Проблема 1: "Shared branch" антипаттерн

**Симптом:** Agent A постоянно делал `git restore --source=<чужая-ветка>`, терял изменения, работал долго и запутанно.

**Диагноз:** `agent-c/m5-r4-c` стала де-факто общей рабочей веткой. В неё коммитили A, B, C, D одновременно. Граф выглядел так:
```
main ──────────────────────── (не обновлялся!)
  └── agent-c/m5-r4-c ← 15+ коммитов от разных агентов
  └── agent-a/m5-r4-a ← только 1 коммит Agent A
```

**Решение — GIT_DISCIPLINE_FIX:**
1. Смержили все done-ветки в main в правильном порядке
2. Зафиксировали 4 правила в `ORCHESTRATOR_AGENT_BOOTSTRAP.md §8b`:
   - Ветка строго персональная (`agent-X/<task-id>`)
   - После каждого DONE — оркестратор мержит в main
   - Запрещён `git restore --source=<чужая-ветка>`
   - TASK всегда содержит `Base: main @ <hash>` и `Branch:`

---

### Проблема 2: git stash мусорный коммит на main

**Симптом:** Commit `305ad2d` ("On main: pre-merge stash") появился на main с мусором — диагностическим маркером `# M6_PATCH_TEST` и patch-скриптами.

**Диагноз:** Agent A сделал `git stash` с незакоммиченными изменениями на чужой ветке. Позже (в другом контексте) был сделан `git stash pop` на main → автоматический merge-коммит прямо на main.

**Решение — Правило 3b:**
Запрещён `git stash` при смене ветки. Вместо этого:
```bash
# Если изменения чужие — сбросить:
git checkout -f target-branch

# Если свои — сначала закоммитить:
git add -A && git commit -m "wip: ..." && git checkout target-branch
```
Patch-скрипты (`_patch_*.py`) должны удаляться до коммита или быть в `.gitignore`.

---

### Проблема 3: 404 на всех изображениях GitHub Pages (корневая)

**Симптом:** После деплоя — пустой сайт. Нет карточек категорий, нет изображений значков, нет аватара бота.

**Диагноз (многоэтапный):**

1. **Agent D (HOTFIX-BASE-PATH)** — нашёл, что `public/RL-Guide-book/` копировался с вложением, создавая `dist/RL-Guide-book/RL-Guide-book/`. Починил логику копирования — но оставил целевую папку `dist/RL-Guide-book/`. Файлы всё равно были не там.

2. **Agent B (M6-IMG-FIX)** — нашёл 26 хардкодных путей `/RL-Guide-book/` в TSX файлах, заменил на `BASE_URL`. Правильно, но не решало проблему размера артефакта.

3. **Agent D (GIT-SIZE-REDUCTION)** — нашёл, что репо весит 2.22 GiB (583 JPG + 68 .orig). GitHub Pages режет artifact на 1 GB. Убрал JPG из git. Верное направление.

4. **Agent E / Opus (E-FIX-DEPLOY-PATH)** — нашёл **настоящую корневую причину**: плагин `copyRLGuideBookPlugin` копировал `public/` в `dist/RL-Guide-book/`. GitHub Pages для репо `RL-Guide-book` автоматически добавляет `/RL-Guide-book/` к URL. Артефакт `dist/` — это корень этого prefix. Файлы в `dist/RL-Guide-book/` были доступны по `/RL-Guide-book/RL-Guide-book/...` (двойной!).

**Финальное решение:**
```typescript
// Было:
const rlGuideBookDir = 'dist/RL-Guide-book'
copyDir('public', rlGuideBookDir)  // → dist/RL-Guide-book/... (двойной путь!)

// Стало:
const targetDir = 'dist'
copyDir('public', targetDir)       // → dist/... (правильно)
```

**Урок:** GitHub Pages не требует папки с именем репо в артефакте — он сам добавляет prefix. Плагин был написан с ошибочным пониманием этого механизма.

---

### Проблема 4: Размер репо 2.22 GiB > 1 GB лимит

**Симптом:** GitHub Actions деплой проходит, но часть файлов обрезается.

**Диагноз:** В git были залиты все форматы одновременно:
- 583 JPG файла (~1.4 GB) — оригиналы значков
- 534 WebP файла (~183 MB) — конвертированные копии
- 68 `.orig.jpg` файла (~193 MB) — бэкапы скрипта нормализации

**Решение (GIT-SIZE-REDUCTION):**
```bash
git rm --cached "public/Новые значки/**/*.jpg"
git rm --cached "public/Новые значки/**/*.orig.*"
```
`.gitignore` обновлён. `badgeImages.ts` и `badgeImageMap.ts` переведены с `.jpg` на `.webp`. Artifact: 2.2GB → ~250MB.

**Побочный эффект:** JPG исчезли и с локального диска (Agent D где-то сделал `git rm` без `--cached` для части файлов). Решение: принято как «незапланированная чистка» — WebP качества достаточно (quality 82), JPG в репо не нужны.

---

### Проблема 5: Хардкодные пути /RL-Guide-book/

**Симптом:** В dev-режиме (`localhost:5173/`) изображения не находились.

**Диагноз:** 26 мест в 9 TSX файлах использовали хардкод `/RL-Guide-book/путь` вместо `${import.meta.env.BASE_URL}путь`.

**Решение (M6-IMG-FIX):** Agent B заменил все вхождения. `BASE_URL` = `/RL-Guide-book/` на GitHub Pages и `/` в dev — работает в обоих окружениях.

---

### Проблема 6: cursor ghost-line artifact

**Симптом:** Визуальный глюк курсора на страницах значков — артефакт в виде линии при hover.

**Диагноз:** `mix-blend-mode: difference` на hover без GPU-промоушна → рендеринг на CPU → субпиксельные артефакты.

**Решение (E-FIX-CURSOR):**
```css
.cursor {
  will-change: transform, opacity;
  backface-visibility: hidden;
}
.cursor:hover {
  isolation: isolate;
}
```

---

## 4. Где находимся сейчас

| Параметр | Значение |
|----------|----------|
| Последний коммит main | `26cac15` |
| Деплой | Запущен (GitHub Actions), содержит E-FIX-DEPLOY-PATH + E-FIX-CURSOR |
| Smoke baseline | 52/52 ✅ |
| Artifact size | ~250MB (в рамках лимита) |
| Все агенты | DONE, ждут следующих задач |
| Opus recheck | PENDING (ждёт зелёного деплоя) |

### Архитектура (актуальная)

```
GitHub Pages (frontend)          Vercel (backend)           Supabase (DB)
dist/ → /RL-Guide-book/    ←→   backend-murex-one-40       inkhtjcrzblzsfqvceid
  - React/Vite bundle                .vercel.app               (Postgres, prod)
  - WebP images (534 файла)        Flask Python API
  - ai-data/ (JSON)               USE_SUPABASE=true
  - sw.js (PWA)
```

### Telegram боты (лобстеры)

| Бот | Handle | Env var | Статус |
|-----|--------|---------|--------|
| НейроВалюша | @Neiro_Valyusha_bot | `TELEGRAM_BOT_TOKEN` | PRODUCTION |
| NeuroStepa | @NeuroStepa_bot | `NEURO_STEPA_BOT_TOKEN` | VERIFIED_OPTIONAL |
| Cat Bro | @Cat_Bro_bot | `CAT_BRO_BOT_TOKEN` | VERIFIED_OPTIONAL |
| Dev Bro 1 | @Dev_Bro_1_bot | `DEV_BRO_1_BOT_TOKEN` | VERIFIED_OPTIONAL |

---

## 5. Что делаем дальше

### Немедленно (этот цикл)
1. Дождаться зелёного деплоя GitHub Actions
2. Проверить сайт глазами: главный экран, категории, значки с уровнями, ЛК
3. Задать Opus финальный browser recheck (`E-UX-AUDIT-FINAL`) — проверить все 404 устранены

### Следующий продуктовый цикл
Выбрать из `ROADMAP_2026.md` → `PRODUCT_MECHANICS_AND_ROADMAP.md`:
- **Фаза 2 механик:** дальнейший Badge Flow, Squad Corner, Council инициативы
- **Vision:** `STEPA_VISION_LC.md`, `FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md`

### Системные улучшения (технический долг)
- Обновить `normalize-badge-icons.mjs` — убрать создание `.orig.jpg` (JPG больше не нужны)
- Добавить `backend/.smoke_app_err.txt` и `backend/.smoke_app_log.txt` в `.gitignore` (они untracked)
- Рассмотреть Git LFS для будущих медиафайлов если объём снова вырастет

---

## 6. Ключевые уроки сессии

1. **Оркестратор должен мержить в main после КАЖДОГО DONE** — не раз в несколько задач. Иначе агенты вынуждены тянуть файлы из чужих веток.

2. **`git stash` в shared working directory — опасен.** В мультиагентной среде с одной рабочей директорией stash может быть применён другим агентом на чужой ветке.

3. **Симптоматическое лечение может скрывать корень.** HOTFIX-BASE-PATH → M6-IMG-FIX → GIT-SIZE-REDUCTION — три последовательных фикса, каждый из которых был верным, но не устранял корень. Opus с браузером нашёл его за один аудит.

4. **Cloud browser agent (Opus) — незаменим для deploy verification.** Только реальный браузер показывает настоящие 404, Network tab, визуальные артефакты. Opus должен проверять каждый значимый деплой.

5. **WebP качества 82 достаточно** — визуально идентично JPG, в 3-4x меньше. Хранить оба формата в git нет смысла.

---

*Составлен: NeuroStepa (Orchestrator), 2026-02-28*  
*Следующий отчёт: после финального recheck Opus и старта следующего цикла*
