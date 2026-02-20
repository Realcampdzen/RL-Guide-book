# Handoff: Табы и панельные разделы в кабине ProfileView

Документ для следующего агента Codex. Описывает текущую архитектуру табов/панелей в кабине, что уже реализовано, и как безопасно добавлять следующие разделы без регрессий.

## 0. Быстрое восстановление (если снова потеряли worktree)

В репо есть снапшот текущего worktree (дифф + untracked cabin-файлы):
- `docs/recovery/WORKTREE_SNAPSHOT_20260220_022010.patch`

Он нужен для ситуации, когда кто-то сделал `git restore`/удалил untracked-файлы и часть UI пропала.

## 1. Что уже реализовано

### 1.1. Общий паттерн левых docked-tab в кабине
- Базовый паттерн табов (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`) сохранен и переиспользуется.
- В `ProfileView` теперь есть 10 независимых набора табов:
  - Hub/`В пути` (исторический, основной).
  - `Отрядный уголок`.
  - `Реальный дневник`.
  - `Движок`.
  - `Совет Лагеря`.
  - `БРО`.
  - `4К`.
  - `Вожатский отряд`.
  - `Карточки прогресса` (Share): 2 таба — «Создать карточку», «Пригласить друзей».
  - `Мастерская` (Workshop): 4 таба — «Архитектор отряда», «Кузница смыслов», «Идеи отряда», «Мои предложения».

Ключевые места:
- `src/views/ProfileView.tsx:337`
- `src/views/ProfileView.tsx:338`
- `src/views/ProfileView.tsx:1898`
- `src/views/ProfileView.tsx:1919`
- `src/views/ProfileView.tsx:2275`
- `src/views/ProfileView.tsx:2276`

### 1.2. Отрядный уголок
- Поддерживает `variant='accordion' | 'cabin'`.
- В `cabin`:
  - контент рендерится без внешней оранжевой оболочки;
  - секции переключаются внешними левыми табами;
  - блок `Значки на флаг` использует крупные карточки с изображениями и переходом по `onNavigateToBadge`.

Ключевые места:
- `src/components/SquadCornerDashboard.tsx:14`
- `src/components/SquadCornerDashboard.tsx:16`
- `src/components/SquadCornerDashboard.tsx:146`
- `src/components/SquadCornerDashboard.tsx:154`
- `src/components/SquadCornerDashboard.tsx:274`
- `src/styles/profile-view-spaceship.css:3117`
- `src/styles/profile-view-spaceship.css:3292`

### 1.3. Реальный дневник
- Поддерживает `variant='accordion' | 'cabin'`.
- В `cabin`:
  - левый docked-nav с 4 вкладками: `Дневник`, `Рефлексия`, `Беспорядок дня`, `Карточка дневника`;
  - скрыт верхний panel header (`В пути / ...`) для этого раздела;
  - day-switch общий, но скрыт именно для вкладки `Беспорядок дня`.

Ключевые места:
- `src/components/RealDiaryDashboard.tsx:57`
- `src/components/RealDiaryDashboard.tsx:59`
- `src/components/RealDiaryDashboard.tsx:395`
- `src/components/RealDiaryDashboard.tsx:492`
- `src/views/ProfileView.tsx:2320`

### 1.4. Совет Лагеря
- Поддерживает `variant='accordion' | 'cabin'`.
- В `cabin`:
  - левый docked-nav с 4 вкладками: `Совет`, `Движки`, `Управление Лагерем`, `Значок`;
  - скрыт верхний panel header (`В пути / ...`) для этого раздела;
  - контент рендерится напрямую в центральной области без аккордеон-обертки.

Ключевые места:
- `src/components/CouncilDashboard.tsx`
- `src/views/ProfileView.tsx`
- `src/styles/profile-view-spaceship.css`

### 1.5. Движок (team)
- В кабине `team` переведен на тот же паттерн:
  - скрыт верхний header `В пути / Движок`;
  - внешний карточный wrapper убран;
  - слева отдельные docked-табы:
    - `Мой Движок`
    - `План Движка`
    - `Путь Движка`
    - `Управление Лагерем`
- `TeamDashboard` поддерживает `variant='accordion' | 'cabin'`.
- В `Плане Движка`:
  - `planGridA/planGridB`,
  - `9/21`,
  - поля `утро/день/вечер`.
- `Путь Движка`:
  - карточки `8.1..8.4`,
  - клик -> `onNavigateToBadge`,
  - цвет/чб через `myTeam.achievements`.
- `Управление Лагерем`:
  - единственный CTA инициативы в cabin.

Ключевые места:
- `src/components/TeamDashboard.tsx`
- `src/views/ProfileView.tsx`
- `src/styles/profile-view-spaceship.css`
- `src/types/teams.ts`
- `src/context/TeamContext.tsx`
- `backend/app.py`

### 1.6. БРО
- В `cabin` БРО переведен на docked-tabs:
  - `БРОСВЯЩЕНИЕ` (контент `BroInitiation`);
  - `Крыло` (контент `WingDashboard`).
- В `cabin`:
  - убрана старая двухколоночная обертка `profile-view-bro-two-columns`;
  - скрыт верхний panel-header (`В пути / ...`) для панели БРО;
  - `#wing` (legacy hash) открывает панель `bro` сразу с вкладкой `Крыло`;
  - CTA в гейте `Крыло` (`К Бропаспорту`) переключает таб на `БРОСВЯЩЕНИЕ`.
- Ритуал `БРО-Костер` в `БРОСВЯЩЕНИИ` в cabin-режиме рендерится fullscreen через `Portal` (`document.body`):
  - причина: внутри `profile-view-cabin-content` есть `transform` после panel-анимаций, из-за чего `position: fixed` клипался рамками панели;
  - добавлены `Escape` для закрытия, явная кнопка возврата к Бропаспорту, `body` scroll lock на время ритуала;
  - non-cabin поток оставлен без изменения логики.
- Планирование смены для `Крыла` хранится отдельно от `diaryProgress`:
  - `userData.broProgress.wingPlanGridA`
  - `userData.broProgress.wingPlanGridB`
  - формат: `shiftLength: 9 | 21`, `days[day].{morning,day,evening}`.

Ключевые места:
- `src/views/ProfileView.tsx`
- `src/components/WingDashboard.tsx`
- `src/context/ProgressContext.tsx`
- `src/types/userProgress.ts`
- `src/styles/profile-view-spaceship.css`

### 1.7. 4К (profile4k)
- В кабине `profile4k` переведен на тот же паттерн:
  - скрыт верхний header `В пути / 4К-профиль`;
  - внешний карточный wrapper убран;
  - слева отдельные docked-табы:
    - `Твои 4К навыки`
    - `Реальный Лагерь прогресс`
- `Profile4KDashboard` поддерживает `variant='accordion' | 'cabin'`.
- В `cabin`:
  - рендерится только активная секция по `activeTab`;
  - таб `Твои 4К навыки` содержит текущий блок `Твой профиль 4К` и генерацию характеристики;
  - таб `Реальный Лагерь прогресс` содержит блок `Программа Реального Лагеря 2026`.
- Бизнес-логика не менялась:
  - `compute4kProfile` / `normalize4kProfile`
  - `computeProgram2026Profile` / `normalizeProgram2026Profile`

Ключевые места:
- `src/components/Profile4KDashboard.tsx`
- `src/views/ProfileView.tsx`
- `src/styles/profile-view-spaceship.css`
- `src/styles/profile-view.css`

### 1.8. Вожатский отряд
- В кабине `counselor-squad` переведен на docked-tabs:
  - левый docked-nav с 4 вкладками: `Отряд`, `Фото`, `Планёрка`, `Значки на флаг`;
  - скрыт верхний panel header (`В пути / Отряд вожатых`);
  - контент рендерится без внешней карточной обёртки.
- Права: `shift_leader`, `developer` — редактирование; `counselor` — просмотр (read-only).
- Источник данных: `CounselorSquadContext`, localStorage по `squadId` (`rl_counselor_squad_cards_v1`).
- Scope: cabin only. Некабинный блок `#counselor-squad-section` без изменений.
- Ограничения: данные локальные, без backend sync; counselor видит только то, что есть на устройстве.

Ключевые места:
- `src/components/CounselorSquadDashboard.tsx`
- `src/context/CounselorSquadContext.tsx`
- `src/types/counselorSquad.ts`
- `src/views/ProfileView.tsx`
- `src/styles/profile-view-spaceship.css`

### 1.9. Карточки прогресса (Share)
- В кабине `share` переведен на docked-tabs:
  - левый docked-nav с 2 вкладками: `Создать карточку`, `Пригласить друзей`;
  - скрыт верхний panel header (`В пути / Карточки прогресса`);
  - без веток раздела (companionMap);
  - content-fit, без внутреннего скролла.
- Контент: `create-card` — Шеринг достижений (чекбокс «Скрыть ник», кнопка «Создать карточку», результаты); `invite` — Пригласить друзей (иконка, заголовок, текст, кнопка).
- Scope: cabin only. Non-cabin блок share без изменений.

Ключевые места:
- `src/views/ProfileView.tsx`
- `src/styles/profile-view-spaceship.css`

### 1.10. Мастерская (Workshop)
- В кабине `workshop` переведен на docked-tabs:
  - левый docked-nav с 4 вкладками: `Архитектор отряда`, `Кузница смыслов`, `Идеи отряда`, `Мои предложения`;
  - скрыт верхний panel header (`В пути / Мастерская`);
  - без веток раздела (companionMap);
  - content-fit, без внутреннего nav (workshop-view__nav).
- Контент по табам: architect — SquadArchitect или lock; forge — форма Кузницы или lock; ideas — carousel Идеи отряда; my — Мои предложения или lock. При отсутствии доступа (hasWorkshopAccess=false) architect, forge, my показывают lock card.
- Scope: cabin only. Non-cabin блок workshop без изменений.

Ключевые места:
- `src/views/ProfileView.tsx`
- `src/styles/profile-view-spaceship.css`

## 2. Данные: дневные vs сменные

### 2.1. Новые поля на всю смену
В `diaryProgress` добавлены сменные шаблоны:
- `shiftSchedule`
- `myActivities`

Ключевые места:
- `src/types/userProgress.ts:73`
- `src/types/userProgress.ts:87`
- `src/types/userProgress.ts:144`
- `src/types/userProgress.ts:145`

### 2.2. Контекст и нормализация
- Добавлен метод `updateDiaryShiftTemplates(...)`.
- Добавлена нормализация/санитизация для `shiftSchedule` и `myActivities`.
- Обновление не трогает `entries[currentDay]`, только shift-level данные и `meta.lastSyncedAt`.

Ключевые места:
- `src/context/ProgressContext.tsx:75`
- `src/context/ProgressContext.tsx:234`
- `src/context/ProgressContext.tsx:432`
- `src/context/ProgressContext.tsx:433`
- `src/context/ProgressContext.tsx:738`
- `src/context/ProgressContext.tsx:761`
- `src/context/ProgressContext.tsx:762`

## 3. Вкладка “Беспорядок дня” (текущее поведение)

### 3.1. UI-модель
- 2 независимые карточки:
  - `Распорядок смены` (12 пунктов).
  - `Мои занятия (кружки/тренировки)` (4 пункта).
- Для каждого пункта: `Время` + `Заметка`.
- У каждой карточки отдельные режимы `Редактировать/Сохранить`.
- После сохранения обеих карточек появляется кнопка `Сохранить на устройство`.

Ключевые места:
- `src/components/RealDiaryDashboard.tsx:93`
- `src/components/RealDiaryDashboard.tsx:94`
- `src/components/RealDiaryDashboard.tsx:150`
- `src/components/RealDiaryDashboard.tsx:155`
- `src/components/RealDiaryDashboard.tsx:433`
- `src/components/RealDiaryDashboard.tsx:439`

### 3.2. Экспорт “Сохранить на устройство”
- Реализован как генерация PNG через canvas (не screenshot DOM).
- Содержит обе карточки в читабельном оформлении.

Ключевые места:
- `src/components/RealDiaryDashboard.tsx:205`
- `src/components/RealDiaryDashboard.tsx:310`

## 4. CSS-конвенции для cabin-разделов

### 4.1. Позиционирование docked tabs
Для каждого раздела с собственными левыми табами:
- отдельный модификатор центра: `profile-view-cabin-center--<section>`.
- `position: relative; overflow: visible !important;`
- единый контейнер `.profile-view-cabin-tabs-docked` с абсолютным позиционированием слева.

Ключевые места:
- `src/styles/profile-view-spaceship.css:2850`
- `src/styles/profile-view-spaceship.css:2862`

### 4.2. Content-fit и борьба с “пустым доскроллом”
- Для разделов со своим layout применяется `profile-view-cabin-center-scroll--content-fit`.
- Скролл-контейнер не растягивается искусственно по высоте.

Ключевые места:
- `src/views/ProfileView.tsx:2301`
- `src/styles/profile-view-spaceship.css:3083`
- `src/styles/profile-view-spaceship.css:3094`

### 4.3. Выравнивание контента
- Все cabin-контейнеры секций имеют общий `padding-inline: clamp(40px, 5vw, 56px)`.
- Внутренним блокам дано `width: 100%`, `min-width: 0`.

Ключевые места:
- `src/styles/profile-view-spaceship.css:3117`
- `src/styles/profile-view-spaceship.css:3148`

## 5. Как добавить новый раздел с левыми табами (шаблон)

### Шаг 1. Типы и state в `ProfileView`
1. Добавить `type <Section>TabId = ...`.
2. Добавить state `const [<section>ActiveTab, set<section>ActiveTab] = useState<...>(defaultTab)`.
3. Сбрасывать active-tab при входе в панель через `useEffect([panelActiveView])`.

### Шаг 2. Tab items + renderer
1. Добавить `<section>TabItems`.
2. Добавить `render<section>TabsNav(...)` по шаблону `renderTabsNav`.
3. Не забыть уникальный prefix в `id/aria-controls`.

### Шаг 3. Интеграция в центральный контейнер кабины
1. Добавить модификатор центра `profile-view-cabin-center--<section>`.
2. Расширить условие показа docked-tabs.
3. Добавить ветку выбора рендера табов (hub vs squad-corner vs new section).

### Шаг 4. Контент панели
1. В `renderPanelContent` передавать компоненту:
  - `variant="cabin"`
  - `activeTab`
  - `onTabChange`
2. Вне кабины оставлять старый режим (обычно `accordion`) для обратной совместимости.

### Шаг 5. Header/scroll-правила
1. Если у панели собственные табы, скрыть верхний panel-header (`В пути / ...`) для этой панели.
2. При необходимости включить `profile-view-cabin-center-scroll--content-fit`.

### Шаг 6. CSS
1. Добавить стили `--<section>` для позиционирования docked tabs.
2. Добавить тему табов (`profile-tabs-nav--<section>`).
3. Добавить `...-cabin-content` + `...-cabin-section` с единым выравниванием.

## 6. Критичные инварианты (не ломать)

1. Hub (`panelActiveView === null`) должен работать как раньше.
2. `accordion` режим компонентов не должен ломаться.
3. ARIA у tablist/tab обязателен.
4. При повторном входе в панель активная вкладка должна сбрасываться к default.
5. Нельзя смешивать дневные данные (`entries[currentDay]`) и shift-level данные (`shiftSchedule/myActivities`) в источнике UI вкладки `Беспорядок дня`.

## 7. Чеклист регрессии перед PR

1. `panelActiveView === null`: хаб-табы работают.
2. `panelActiveView === 'squad-corner'`: 4 таба, контент переключается, без внешней оранжевой обертки.
3. `panelActiveView === 'real-diary'`: 4 таба, header скрыт.
4. `panelActiveView === 'council'`: 4 таба (`Совет`, `Движки`, `Управление Лагерем`, `Значок`), header скрыт.
5. `panelActiveView === 'team'`: 4 левых таба, header скрыт, wrapper отсутствует.
6. `panelActiveView === 'bro'`: 2 левых таба (`БРОСВЯЩЕНИЕ`, `Крыло`), header скрыт, без двухколоночной обертки.
7. `panelActiveView === 'profile4k'`: 2 левых таба (`Твои 4К навыки`, `Реальный Лагерь прогресс`), header скрыт, wrapper отсутствует.
8. `panelActiveView === 'counselor-squad'`: 4 левых таба (`Отряд`, `Фото`, `Планёрка`, `Значки на флаг`), header скрыт, без карточной обёртки.
9. `panelActiveView === 'share'`: 2 левых таба (`Создать карточку`, `Пригласить друзей`), header скрыт, без веток раздела (companionMap), content-fit.
10. `panelActiveView === 'workshop'`: 4 левых таба (`Архитектор отряда`, `Кузница смыслов`, `Идеи отряда`, `Мои предложения`), header скрыт, без веток раздела, content-fit, без внутреннего nav.
11. `bro/wing`: переключатель `Сетка 1/Сетка 2`, `9/21`, дни `1..N`, поля `утро/день/вечер`, сохранение в `broProgress.wingPlanGridA/B`.
12. `real-diary/schedule`: нет day-switch, две карточки редактируются независимо.
13. После сохранения обеих карточек появляется `Сохранить на устройство`, PNG скачивается.
14. `bro/initiation` в cabin: `БРО-Костер` открывается fullscreen, без клипа/обрезания в рамке панели.
15. `bro/initiation` в cabin: `Escape` и кнопка возврата закрывают ритуал, фон не скроллится пока ритуал открыт.
16. `npm run build` проходит.

## 8. Команды проверки

```bash
npm run build
```

Опционально локально:
```bash
npx tsc --noEmit
```

## 9. Если продолжать на следующих разделах

Рекомендуемая стратегия:
1. Сначала реализовать табы/переключение и `variant='cabin'` без смены бизнес-логики.
2. Затем переносить данные/формы (если нужно) отдельным шагом.
3. В конце дорабатывать визуал/скролл и только после этого экспорт/доп. фичи.

Так проще ловить регрессии по этапам и откатывать точечно.
