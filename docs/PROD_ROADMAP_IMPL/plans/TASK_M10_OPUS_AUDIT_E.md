# TASK: M10-OPUS-AUDIT-E — Opus browser audit: M7-M9 features

**Агент: E (Opus QA)**  
**Base:** `main @ 73c0531`  
**Branch:** `cloud/e-validation-m10`  
**Depends:** M10-VERCEL-REDEPLOY-D + M10-SUPABASE-MIGRATIONS-D

## Scope

### 1. E-UX-AUDIT-M5-RECHECK (оставшийся)

Закрыть pending задачу из M5:
- Проверить категории, изображения, логотип на GH Pages
- Role walkthrough (participant, counselor, educator)

### 2. Новые фичи M7-M9

Проверить в браузере (prod или localhost):

**M7 — Badge Plans:**
- Создать план значка → увидеть статус «Черновик»
- Кнопка «Отправить план вожатому» (participant)
- Staff inbox: вкладка «Планы» → approve/reject

**M8 — Council & Staff:**
- Staff Dashboard: счётчики, участники
- Совет Лагеря: создать инициативу, проголосовать, сменить статус (staff)
- Educator Cabinet: вкладки «Задания» и «Проверки»

**M9 — Arts & Community:**
- Галерея артов в карточке значка
- Submit арт → inbox → approve
- «Лучшее недели» в Workshop
- Creator Card popup

### 3. Отчёт

Формат: таблица с UI element / Status (OK/BROKEN/MISSING) / Screenshot.

## DoD
- [ ] M5 recheck закрыт
- [ ] M7-M9 features проверены в браузере
- [ ] Отчёт с скриншотами
