# REPORT_M1_UI_SMOKE_AUTOTEST_PREP_2026-02-26

## Что сделано

- Добавлен e2e smoke spec:
  - `e2e/team.scoped.smoke.spec.ts`
  - проверяет форму создания Движка и условное отображение полей scope (`camp/shift/squad`).

## Проверка запуска

- Попытка запуска:
  - `npm run test:e2e -- e2e/team.scoped.smoke.spec.ts`
- Результат:
  - в текущем окружении отсутствует binary `playwright` в PATH (`npm dependencies not installed` / не настроен runtime).

## Вывод

Автотест готов в репо, но прогон в этом окружении заблокирован локальной dev-средой.
Для финального UI evidence используем manual checklist + прогон автотеста в полноценном node env.

## Следующий шаг

1. `npm install` в репо.
2. `npx playwright install` (если нужно).
3. Запуск smoke spec.
4. Приложить итоговый тест-лог в evidence M1.
