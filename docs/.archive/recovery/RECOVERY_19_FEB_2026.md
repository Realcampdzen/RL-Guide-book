# Восстановление после git restore / Remove-Item (19.02.2026)

## Контекст

Другой агент выполнил `git restore` и `Remove-Item`, из‑за чего часть изменений пропала.

## Что было в работе (из DELETED_CHATS_RECOVERED, EXTRACTED_CHATS_READABLE, codex_log)

### 1. Инспектор Пользы — toggle
- **Задача:** При нажатии кнопка исчезала. Нужно было сделать toggle: при повторном нажатии раздел закрывается.
- **Решение:** Показывать кнопку при `panelActiveView === null` ИЛИ `panelActiveView === 'inspector'`.
- **Статус:** ✅ Уже присутствует в ProfileView.tsx (строка ~2643).

### 2. Отрядный уголок — условный показ SquadCabinetPanel
- **Задача:** Когда пользователь в отряде и активен таб «Отряд» — показывать SquadCabinetPanel (инфо отряда, участники). Иначе — SquadCornerDashboard с табами.
- **Статус:** Восстанавливается.

### 3. Раздел Фото в отрядном уголке — обёртка
- **Задача:** Вокруг секции Фото (4 поля, ImageSourceBlock) сделать такую же обёртку, как у guidance block: `padding: 12px`, `borderRadius: 12px`, `background: rgba(0, 0, 0, 0.32)`, `border: 1px solid rgba(255, 255, 255, 0.06)`.
- **Статус:** Восстанавливается в SquadCornerDashboard.

### 4. Значки на флаг — выравнивание по центру
- **Задача:** Элементы в `squad-corner-flag-badges-grid` выровнять по центру.
- **Статус:** Восстанавливается в CSS.

### 5. Смены и отряды — отступы
- **Задача:** На десктопе контент не должен быть сильно прижат к краям.
- **Статус:** Требует проверки organizer-shifts стилей.

### 6. Табы — фиолетовое свечение
- **Задача:** Вокруг табов центральной консоли на десктопе добавить концентрированное фиолетовое свечение.
- **Статус:** Возможно уже есть (box-shadow в profile-view-spaceship.css).

### 7. Карусель «В пути» — фоновое изображение
- **Задача:** Картинка `path-carousel-cosmos-bg.png` как фон карусели.
- **Статус:** Файл не найден в public/ — возможно удалён. Восстановление бинарных файлов вручную.

### 8. Выпуклый монитор (3D-эффект)
- **Задача:** Эффект выпуклого монитора для панели Инспектор (цилиндрическая проекция).
- **Статус:** Сложная задача, оставлена на потом.

### 9. Затемнение блоков (Мой отряд, Вступление, organizer-shift-card)
- **Задача:** Сделать затемнение некоторых блоков в центральной панели.
- **Статус:** Требует уточнения.

## Файлы, затронутые git restore

- `src/components/SquadCornerDashboard.tsx` — упрощён, потеряны mySquadBlock, guidanceBlock, persistCorner, canEditCorner
- `src/styles/profile-view-spaceship.css`
- `src/styles/profile-view.css`
- `src/components/ImageSourceBlock.tsx`
- `src/app/useAppController.ts`
- `src/context/CounselorSquadContext.tsx`
- `backend/data/badge_requests.json`, `memberships.json`

## Восстанавливаемые изменения в этой сессии

1. ProfileView: условная логика squad-corner (SquadCabinetPanel при наличии отряда + таб Отряд) ✅
2. SquadCornerDashboard: обёртка для секции Фото в cabin-режиме ✅
3. profile-view-spaceship.css: выравнивание squad-corner-flag-badges-grid по центру ✅
4. SquadCornerDashboard: полный набор пропсов (hasSquadMembership, mySquadName, canEditCorner, onOpenCabinet, onOpenShiftsAndSquads, onPersistCorner, onCreateSquadFromCorner), блоки mySquadBlock/guidanceBlock, saveStatus, persistCorner → PATCH ✅
5. profile-view-spaceship.css: наклонённые табы (perspective, rotateY(-6deg)) для hub, squad-corner, real-diary, counselor-squad ✅
6. path-carousel-cosmos-bg.png: восстановлен из коммита 9eb1c03 ✅
7. organizer-shifts: горизонтальные отступы на десктопе (padding 20px) ✅
