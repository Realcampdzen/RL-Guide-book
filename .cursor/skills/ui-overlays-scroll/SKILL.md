---
name: ui-overlays-scroll
description: Стилизация окошек, выпадашек и скролла — доводить до конца, не оставлять неадаптированные системные элементы. Use when adding modals, dropdowns, popovers, or scrollable blocks.
---

# UI: окошки, выпадашки, скролл

## Правило

**При добавлении окошек (модалки, popover), выпадающих списков или скроллируемых блоков — сразу дорабатываем до конца.** Не оставляем белые, неадаптированные, системные элементы: скроллбары, рамки, стрелки и т.п.

## When to Use

- Добавление модальных окон
- Добавление выпадающих списков (dropdown)
- Добавление popover / tooltip
- Любой блок с `overflow-y: auto` или `overflow-x: auto`

## Скроллбар — стилизация

Для тёмной темы Путеводителя:

### Firefox
```css
scrollbar-width: thin;
scrollbar-color: rgba(139, 0, 255, 0.5) rgba(255, 255, 255, 0.06);
```

### Chrome / Edge / Safari (WebKit)
```css
.element::-webkit-scrollbar {
  width: 6px;  /* или height для горизонтального */
}
.element::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 3px;
}
.element::-webkit-scrollbar-thumb {
  background: rgba(139, 0, 255, 0.45);
  border-radius: 3px;
}
.element::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 0, 255, 0.6);
}
```

Цвета — в тон фона (тёмные, с акцентным цветом для thumb). Для золотой темы — `rgba(255, 215, 0, ...)`.

## Reference

- [src/styles/profile-view.css](../../../src/styles/profile-view.css) — `.profile-sandbox-role__menu`, `.camp-program-day-card__activities`
- [.memory-bank/tech_context.md](../../../.memory-bank/tech_context.md) — секция «UI: окна, выпадашки, скролл»
