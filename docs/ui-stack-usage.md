# Стек UI: как пользоваться новыми библиотеками

Установлены библиотеки из отчёта по дизайну для готовых решений: **Tailwind CSS** и **Framer Motion**.

---

## Что стоит в проекте

| Пакет | Назначение |
|-------|------------|
| **tailwindcss** | Утилитарные классы для вёрстки и дизайн-токенов (отступы, радиусы, тени, типографика). |
| **postcss** + **autoprefixer** | Сборка Tailwind и автопрефиксы. |
| **framer-motion** | Анимации: появление/исчезновение, переходы вкладок, микро-интеракции (hover/tap), layout-анимации. |

Существующие стили **не трогаем**: Tailwind подключён с отключённым Preflight (`tailwind.config.js`), поэтому `profile-view-spaceship.css` по-прежнему задаёт общий вид кабины.

---

## Tailwind CSS

- **Подключение:** `src/styles/tailwind.css` импортирован в `main.tsx` перед стилями кабины.
- **Где использовать:** в новых компонентах или при рефакторинге — добавляйте классы в `className`.

Примеры:

```tsx
// Отступы, выравнивание, сетка
<div className="flex gap-4 items-center p-4">

// Кнопка (дополнение к своим классам)
<button className="rounded-xl px-4 py-2 transition duration-btn hover:scale-[1.02] active:scale-[0.98]">

// Тень и радиус
<div className="rounded-2xl shadow-lg">
```

- Токен длительности: `duration-btn` = 200ms (задан в `tailwind.config.js`).
- Контент для генерации классов: `index.html`, `profile-desktop.html`, `src/**/*.{js,ts,jsx,tsx}`.

Полный список утилит: [tailwindcss.com/docs](https://tailwindcss.com/docs).

---

## Framer Motion

- **Импорт:** `import { motion } from 'framer-motion'`.

Примеры:

**Плавное появление:**
```tsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
>
  Контент
</motion.div>
```

**Микро-анимация кнопки (hover/tap):**
```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
  Нажми
</motion.button>
```

**Переход контента вкладок (смена без прыжка layout):**
```tsx
import { motion, AnimatePresence } from 'framer-motion'

<AnimatePresence mode="wait">
  <motion.div
    key={activeTabId}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
  >
    {content}
  </motion.div>
</AnimatePresence>
```

Документация: [framer.com/motion](https://www.framer.com/motion/).

---

## Радикс (уже в проекте)

Для модалок уже используется **@radix-ui/react-dialog**. Для новых «готовых» примитивов без своего визуала можно добавить:

- **@radix-ui/react-tabs** — вкладки с a11y и клавиатурной навигацией.
- **@radix-ui/react-dropdown-menu** — выпадающие меню.

Они хорошо сочетаются с Tailwind: вы задаёте только классы, логика и доступность — из Radix.

---

## Рекомендуемый порядок внедрения

1. **Новые компоненты** — верстать с Tailwind (классы в `className`), при необходимости оборачивать в `motion.*` для анимаций.
2. **Существующие экраны** — по желанию постепенно добавлять утилиты Tailwind и точечные анимации Motion, не переписывая всё сразу.
3. **Кнопки/табы/прогресс** — см. [ui-improvements-buttons-menus-progress.md](ui-improvements-buttons-menus-progress.md); токены и состояния можно дублировать в Tailwind-классах там, где удобно.

Если понадобятся сложные таймлайны (несколько фаз подряд), можно позже добавить **GSAP** — в отчёте он указан для таких сценариев.
