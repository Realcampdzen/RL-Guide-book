# Раскладка табов кабины по viewport

Один файл-источник истины для восстановления правильного положения табов в центральной панели кабины на десктопе, планшете и мобильной версии.

**Связанный документ:** [PROFILE_CABIN_TABS_HANDOFF.md](PROFILE_CABIN_TABS_HANDOFF.md) — логика разделов и компоненты; этот файл описывает только визуальную раскладку по ширине экрана.

---

## 1. Брейкпоинты

| Viewport | Условие |
| --- | --- |
| **Десктоп** | `min-width: 1181px` |
| **Планшет** | `min-width: 768px` и `max-width: 1180px` |
| **Мобильная (и промежуточная)** | `max-width: 1180px` (общий блок; планшет поверх переопределяет часть правил) |

Все правила в файле: [src/styles/profile-view-spaceship.css](../src/styles/profile-view-spaceship.css).

---

## 2. Десктоп (1181px+)

- **Где табы:** вертикальный док **слева** от центральной панели, вне потока.
- **Обёртка:** `.profile-view-cabin-tabs-docked`
  - `position: absolute`
  - `left: -76px`
  - `top: 50%`
  - `transform: translateY(-50%)`
  - `z-index: 25`
  - `pointer-events: none` (на обёртке), `pointer-events: auto` на наве.
- **Нав:** `.profile-tabs-nav--docked` (и варианты `--squad-corner`, `--inspector` и т.д.)
  - `display: flex`
  - `flex-direction: column`
  - `align-items: flex-start`
  - `gap: 12px`
  - без фона/скругления (`background: transparent`, `border-radius: 0`).
- **Кнопки:** вертикальный столбец, ширина по контенту.

**Где в CSS:** базовые правила без media — обёртка ~2994–3011, нав по разделам ~3014–3141 (и далее стили кнопок/иконок/лейблов).

---

## 3. Планшет (768px–1180px)

- **Где табы:** **внутри** центральной панели, **сверху**, в потоке.
- **Обёртка:** `.profile-view-cabin-tabs-docked`
  - `position: static` (переопределение десктопа)
  - `width: 100%`
  - `display: flex`
  - `flex-direction: row`
  - паддинги 14px по горизонтали (из общего блока мобильной адаптации); нав внутри заполняет ширину.
- **Нав:** одна строка, без переноса
  - `display: flex`
  - `flex-direction: row`
  - `flex-wrap: nowrap`
  - `flex: 1 1 0%`
  - `min-width: 0`
  - `width: 100%`
- **Кнопки:** равная ширина в строке — `flex: 1 1 0%`, `min-width: 0`, `width: auto`.

**Где в CSS:** блок `@media (min-width: 768px) and (max-width: 1180px)` после блока «Mobile cabin adaptation» (~8182–8235); селекторы с модификаторами разделов (`--hub`, `--squad-corner`, `--inspector` и т.д.).

---

## 4. Мобильная и промежуточная (до 1180px, общие правила)

- **Где табы:** внутри центральной панели, сверху, в потоке (как на планшете).
- **Центр:** `.profile-view-cabin-center` — `align-items: stretch`, чтобы дочерние блоки тянулись на всю ширину.
- **Обёртка:** `.profile-view-cabin-tabs-docked`
  - `position: static`
  - `width: 100%`
  - `display: flex`
  - `flex-direction: row`
  - паддинги 14px по горизонтали, `margin-bottom: 10px`
  - единственный ребёнок (нав) — `flex: 1 1 0%`, `min-width: 0`, `width: 100%`.
- **Нав:** flex-строка с переносом
  - `display: flex`
  - `flex-direction: row`
  - `flex-wrap: wrap`
  - `width: 100%`
  - фон/скругление: `background: rgba(0, 0, 0, 0.25)`, `border-radius: 14px`, `padding: 4px`, `gap: 4px`.
- **Кнопки:** равномерное заполнение строки (и перенесённых строк)
  - `flex: 1 1 0%`
  - `min-width: 80px`
  - `min-height: 60px`
  - `width: auto`

**Где в CSS:** блок `@media (max-width: 1180px)` «6. cabin-center - segmented tabs» (~8042–8133) внутри «Mobile cabin adaptation» (комментарий ~7373, медиа ~7374).

---

## 5. DOM и порядок правил

**Структура DOM:**

```text
.profile-view-cabin-center
  └── .profile-view-cabin-tabs-docked
        └── .profile-tabs-nav.profile-tabs-nav--docked[.profile-tabs-nav--hub|--squad-corner|...]
              └── button (табы)
```

**Порядок в CSS:** планшетные переопределения (`min-width: 768px) and (max-width: 1180px)`) должны идти **после** мобильного блока (`max-width: 1180px`) в файле, иначе grid/flex из max-width: 1180px перекроет планшет.

---

## 6. Чеклист восстановления

При поломке раскладки проверить:

- **Десктоп:** обёртка табов с `position: absolute`, `left: -76px`; нав — `flex-direction: column`.
- **Планшет:** обёртка в потоке, нав в одну строку (`flex-wrap: nowrap`), кнопки `flex: 1 1 0%`.
- **Мобильная:** нав `flex-wrap: wrap`, кнопки `flex: 1 1 0%`, `min-width: 80px`; дочерний нав от `.profile-view-cabin-tabs-docked` с `flex: 1 1 0%` и `width: 100%`.
- В мобильном блоке **не** использовать для нава `display: grid` с `auto-fill` — табы прижимаются влево; использовать flex с равным распределением.

---

## 7. Ссылки на файлы

- **Стили:** [src/styles/profile-view-spaceship.css](../src/styles/profile-view-spaceship.css)
- **Разметка и рендер табов:** [src/views/ProfileView.tsx](../src/views/ProfileView.tsx) — `renderTabsNav`, `renderSquadCornerTabsNav` и др., блок с `profile-view-cabin-tabs-docked` ~2846–2870
