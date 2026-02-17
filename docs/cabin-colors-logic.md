# Логика цветов в кабине (profile-view-cabin)

Палитра кабины: **Space Black / Violet / Teal / Amber / Warm Cream**. Все элементы кабины используют токены из `.profile-spaceship-root`.

---

## ⛔ ЗАКРЕПЛЕНО: центральная панель кабины (рамка и подсветка)

**Элемент:** `.profile-view-cabin-center` — **только рамка (border) и подсветка (box-shadow)**. Элементы внутри не входят.

**Статус:** цвета **правильные**, менять **запрещено**.

**Где в коде:** `profile-view-spaceship.css`, блоки для `.profile-view-cabin-center`, задающие **только** `border` и `box-shadow` (в т.ч. около строк 5251–5260 и финальный блок с `!important`).

---

## 1. Токены палитры в `.profile-spaceship-root`

**Файл:** `src/styles/profile-view-spaceship.css`, блок **«Cabin palette: Space Black / Violet / Teal / Amber / Warm Cream»**.

### База
- `--space-0`, `--space-1`, `--graphite` — фон
- `--violet-700` … `--violet-500`, `--lavender-300`, `--violet-muted`
- `--teal-600`, `--teal-400`
- `--amber-600`, `--amber-500`, `--amber-400`, `--gold-300`, `--cream-100`

### Поверхности
- `--panel`, `--panel-alt`, `--overlay`, `--border`, `--border-accent`

### Текст
- `--text-primary`, `--text-secondary`, `--text-muted`

### Кнопки
- Primary: `--btn-primary-bg`, `--btn-primary-hover`, `--btn-primary-pressed`, `--btn-primary-text`
- Secondary: `--btn-secondary-bg`, `--btn-secondary-hover`, `--btn-secondary-pressed`, `--btn-secondary-text`, `--btn-secondary-border`
- Ghost: `--btn-ghost-border`, `--btn-ghost-hover`, `--btn-ghost-pressed`

### Табы
- `--tab-bar-bg`, `--tab-hover-bg`, `--tab-active-bg`, `--tab-active-indicator`

### Фокус и выделение
- `--focus-ring`, `--selection-glow`, `--cabin-focus-shadow`

### Legacy (алиасы)
- `--cabin-bg-1/2/3`, `--cabin-accent`, `--cabin-accent-warm`, `--cabin-neon-*-rgb` — для совместимости.

---

## 2. Маппинг элементов на токены

| Элемент | Токены |
|-----|--------|
| Карточки (`.real-diary-schedule-card`, `.workshop-*-card`) | `background: var(--panel-alt)`, `border: 1px solid var(--border)` |
| Шапка центра (`.profile-view-cabin-center-header`) | `background: var(--panel)`, `border-bottom: 1px solid var(--border)` |
| Кнопка Primary (`.btn-primary-gold`) | `--btn-primary-*` |
| Кнопки Secondary (в т.ч. в карточках) | `--btn-secondary-*` |
| Кнопка «Развернуть навигацию» (nav-toggle) | `--btn-ghost-*`, `--text-primary` |
| Консольные кнопки (`.console-btn`) | единый violet: `--btn-secondary-bg`, meter: `--teal-600` / `--amber-500` |
| Табы (все наборы) | `--tab-bar-bg`, `--tab-hover-bg`, `--tab-active-bg`, `--tab-active-indicator`, `--text-primary` |
| Инпуты (`.w-input`, редактор расписания) | `--overlay`, `--border`, `--text-primary`, focus: `--focus-ring` |
| Фокус (`:focus-visible`) | `--cabin-focus-shadow` (0 0 0 2px var(--focus-ring)) |
| Навигация (`.profile-view-cabin-nav-btn`, `.profile-view-cabin-nav-btn--wide`) | `--panel-accent: var(--violet-600)`, `--tab-active-bg`, `--tab-active-indicator` |

---

## 3. Компоненты с инлайн-стилями

- **InspectorDashboard.tsx:** `INSPECTOR_ACCENT = 'var(--violet-600)'`, `INSPECTOR_ACCENT_RGB = '53, 48, 89'`.
- **RealDiaryDashboard.tsx:** `DIARY_ACCENT = 'var(--amber-500)'`, градиенты и подсветки через DIARY_ACCENT, DIARY_ACCENT_LIGHT.

---

## 4. Прогресс-бары

- `--cabin-progress-gradient`: `linear-gradient(90deg, var(--amber-500), var(--violet-500))`.


## 5. Disabled

- --cabin-disabled-opacity: 0.55
- Disabled elements: background var(--graphite), color var(--text-muted), border var(--border) with reduced opacity.

---

Изменение палитры: правки только в блоке токенов `.profile-spaceship-root` и при необходимости в константах InspectorDashboard/RealDiaryDashboard. Рамку и box-shadow центральной панели не менять.
