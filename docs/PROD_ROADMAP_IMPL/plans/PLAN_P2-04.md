# PLAN_P2-04 — Feature: Кабинет мастерской педагога (educator v1)

**Агент:** B  
**Task ID:** P2-04  
**Дата создания плана:** 2026-02-21  
**Статус:** in_progress

---

## 1. Цель задачи

Создать минимальный "Кабинет педагога" в кабине: расписание занятий, список групп, задания. Только educator/camp_director/developer видят этот раздел.

---

## 2. Контекст

- Нет ни одного educator-specific компонента.
- `PanelViewId` в ProfileView line 106 — нужно добавить `'educator-cabinet'`.
- `panelTitleMap` line ~1609 — нужна запись.
- Nav-кнопка добавляется рядом с `role === 'parent'` block (line ~4097).
- Данные: хранить в localStorage под ключом `rl_educator_cabinet_v1` (автономно от `IUserData` — не усложняет тип).
- educator уже видит events panel — P2-04 добавляет посвящённый кабинет.

---

## 3. Файлы для изменения

| Файл | Тип | Описание |
|------|-----|----------|
| `src/components/EducatorCabinetPanel.tsx` | create | Новый компонент: расписание / группы / задания |
| `src/views/ProfileView.tsx` | modify | PanelViewId, panelTitleMap, nav-кнопка, рендер панели |

---

## 4. Шаги реализации

1. **Создать `EducatorCabinetPanel.tsx`** с:
   - 3 вкладки: Расписание / Группы / Задания
   - Данные в `localStorage` ключ `rl_educator_cabinet_v1`
   - Prop `variant?: 'cabin' | 'accordion'`

2. **ProfileView changes:**
   - Добавить `'educator-cabinet'` в `PanelViewId`
   - Добавить в `panelTitleMap`
   - Nav-кнопка при `role === 'educator' || role === 'camp_director' || role === 'developer'`
   - Render: `{panelActiveView === 'educator-cabinet' && (role === 'educator' || role === 'camp_director' || role === 'developer') && <EducatorCabinetPanel variant={isSpaceshipMode ? 'cabin' : 'accordion'} />}`

---

## 5. Definition of Done

- [x] Панель «Кабинет педагога» добавлена в ProfileView за ролевым гейтом educator
- [x] Базовые поля: расписание занятий, список групп, задания для групп
- [x] educator может создать/просмотреть задание
- [x] self-check проходит

---

## 6. Отклонения от плана

*Пусто.*
