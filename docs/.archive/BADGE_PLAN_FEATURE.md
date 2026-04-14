# План получения значка — этап разработки и реализация

**Дата заметки:** 2026-02-07

## Этап разработки

Фича «План получения значка» с полем «Мой план» и структурированием реализована и проходит тестирование. Состояние: **MVP готов, требуется проверка персонализации ИИ в боевых условиях**.

---

## Как реализовано сейчас

### 1. Модель данных

- **Файл:** [src/types/userProgress.ts](../src/types/userProgress.ts)
- **Интерфейс:** `IBadgePlan` расширен полем `myPlanDraft?: string` — черновик участника «как я вижу свой путь».
- **Сохранение:** `badgePlans` в `IUserData`, `saveBadgePlan` сохраняет `myPlanDraft` при наличии.

### 2. UI-поток (три шага)

- **Файл:** [src/views/ProfileView.tsx](../src/views/ProfileView.tsx)
- **Точка входа:** Профиль → В пути → кнопка «Составить план» у значка.

| Шаг | Состояние | Содержимое |
|-----|-----------|------------|
| `context` | Контекст + Мой план | Длина смены, день, программа отряда/лагеря, приоритет, textarea «Мой план». Кнопки: «Структурировать» (если заполнен Мой план) или «Сгенерировать план» (если пусто). |
| `structured` | Редактируемый чек-лист | Список шагов: редактирование, удаление, «+ Добавить шаг». Кнопки: «Дополнить с учётом программы», «Отправить без дополнения». |
| `result` | Готовый план | planText + checklist (read-only), «Отправить на утверждение вожатому», «Вожатый утвердил». |

### 3. aiService

- **Файл:** [src/utils/aiService.ts](../src/utils/aiService.ts)

| Функция | Назначение |
|---------|------------|
| `structureUserPlan(input)` | Превращает текст участника (myPlanDraft) в 3–7 шагов. Вход: badgeId, badgeTitle, myPlanDraft. Выход: { checklistItems: string[] }. |
| `fetchBadgePlan(input)` | Генерирует/дополняет план. Вход: badgeId, badgeTitle, badgeCriteria, currentDay, shiftLength, squadProgramGrid, squadPlan3d, campProgram3d, priority, userPlanDraft?, existingChecklist?. Использует типовой шаблон программы из `public/ai-data/camp-program-template.json`. |
| `checkPlanApiAvailable()` | Проверка доступности API при открытии модалки (dev). В production возвращает true. |

### 4. Персонализация промпта

- Критерии значка вынесены в начало промпта.
- Требование: привязывать каждый шаг к дню и мероприятию («На [мероприятие] / День N — [действие]»).
- Контекст: «СЕГОДНЯ — День N», программа лагеря (дни N-2..N+4), программа отряда и лагеря (из полей формы).

### 5. Проверка API и ошибки

- При открытии модалки вызывается `checkPlanApiAvailable()`. Если API недоступен — предупреждение: «Запусти: npm run start:backend», кнопки ИИ заблокированы.
- Сообщения об ошибках в showHint указывают на необходимость backend.
- Логирование в консоль: при `!response.ok` — status, statusText, body (первые 200 символов).

### 6. BadgePlanCard

- **Файл:** [src/components/BadgePlanCard.tsx](../src/components/BadgePlanCard.tsx)
- Кнопка «Показать мой черновик» раскрывает `myPlanDraft`, если он есть.

### 7. Зависимости

- **Backend:** Flask API (`npm run start:backend`, порт 4000) обязателен для кнопок «Структурировать», «Сгенерировать план», «Дополнить».
- **Production:** используется внешний URL `https://real-vibe-ai-studio.pages.dev/api/putevoditel/chat`.
- **Данные:** `camp-program-template.json` — типовой шаблон 21/9 дней; при заполнении полей формы передаётся дополнительный контекст.

---

## Файлы

| Файл | Роль |
|------|------|
| [src/types/userProgress.ts](../src/types/userProgress.ts) | IBadgePlan, myPlanDraft |
| [src/views/ProfileView.tsx](../src/views/ProfileView.tsx) | Модалка плана, шаги, поля, кнопки |
| [src/utils/aiService.ts](../src/utils/aiService.ts) | structureUserPlan, fetchBadgePlan, checkPlanApiAvailable |
| [src/components/BadgePlanCard.tsx](../src/components/BadgePlanCard.tsx) | Карточка плана, показ myPlanDraft |
| [src/context/ProgressContext.tsx](../src/context/ProgressContext.tsx) | saveBadgePlan, updateBadgePlanStatus, updateBadgePlanChecklist |
| [public/ai-data/camp-program-template.json](../public/ai-data/camp-program-template.json) | Типовой шаблон программы смены |
