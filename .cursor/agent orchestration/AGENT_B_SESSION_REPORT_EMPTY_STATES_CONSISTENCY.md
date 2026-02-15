# Отчёт Agent B — консистентность пустых состояний и оформления ошибок в блоках ЛК

## 1. Идентификация агента

- **Agent B (UX & Navigation)**
- **Фокус:** `src/views/`, `src/components/`, согласованность UI/UX

---

## 2. Что сделано

### 2.1. Общие CSS-классы

**Файл:** [profile-view.css](../src/styles/profile-view.css)

Добавлены переиспользуемые классы:

- `.profile-empty-state`, `__icon`, `__title`, `__text`, `--squads` — карточки пустых состояний
- `.profile-loading` — текст загрузки
- `.profile-error` — блок ошибки (amber)
- `.profile-error--not-found` — вариант для «Код не найден» (red)

### 2.2. SquadCornerDashboard

**Файл:** [SquadCornerDashboard.tsx](../src/components/SquadCornerDashboard.tsx)

Блок «Заявки на рассмотрение» при `pendingReqs.length === 0`:
- Простой `<p>` заменён на карточку `.profile-empty-state profile-empty-state--squads`
- Иконка 📋, заголовок «Нет заявок на рассмотрении», текст-подсказка

### 2.3. Панель «Входящие заявки» (ProfileView)

**Файл:** [ProfileView.tsx](../src/views/ProfileView.tsx)

- Ошибка обёрнута в `<div className="profile-error">`
- Добавлено пустое состояние при `!eventsBusy && eventsData.length === 0 && !eventsError`: карточка «Пока нет заявок. Нажмите «Обновить», чтобы загрузить список.»

### 2.4. TeamDashboard

**Файл:** [TeamDashboard.tsx](../src/components/TeamDashboard.tsx)

- `joinPreviewLoading` — класс `profile-loading`
- `joinPreviewError` — классы `profile-error profile-error--not-found`

### 2.5. CouncilDashboard

По плану — без изменений (оставить текущее поведение).

---

## 3. Проверки

- `npm run self-check` — успешно
- Linter — без ошибок

---

## 4. Следующие шаги

- UX-сообщения и кнопка «Повторить» в TeamDashboard после готовности D/E «Обработка ошибок teams API»
- Доработки ЛК организатора: назначение вожатых на отряд
