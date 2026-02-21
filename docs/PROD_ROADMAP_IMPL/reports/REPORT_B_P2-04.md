# REPORT_B_P2-04 — Feature: Кабинет мастерской педагога (educator v1)

**Агент:** B  
**Task ID:** P2-04  
**Дата завершения:** 2026-02-21  
**Статус:** done

---

## Изменённые/созданные файлы

| Файл | Тип изменения | Описание |
|------|--------------|----------|
| `src/components/EducatorCabinetPanel.tsx` | create | Новый компонент: Расписание / Группы / Задания |
| `src/views/ProfileView.tsx` | modify | PanelViewId, panelTitleMap, nav-кнопка, рендер панели, import |

---

## Ключевые изменения

### 1. `EducatorCabinetPanel.tsx` (новый компонент)
- 3 вкладки: **Задания** (default), **Расписание**, **Группы**
- Данные хранятся в `localStorage` ключ `rl_educator_cabinet_v1`
- Prop `variant?: 'cabin' | 'accordion'`
- **Задания**: добавить/удалить/отметить выполненным (toggle), привязка к группе
- **Расписание**: добавить/удалить занятие (время + название + группа), автосортировка по времени
- **Группы**: создать/удалить группу (название + участники через запятую), счётчик заданий
- Полностью самостоятельный localStorage — без изменения `IUserData` типа

### 2. ProfileView — import
```tsx
import EducatorCabinetPanel from '../components/EducatorCabinetPanel';
```

### 3. ProfileView — PanelViewId
```typescript
type PanelViewId = ... | 'educator-cabinet';
```

### 4. ProfileView — panelTitleMap
```typescript
'educator-cabinet': 'Кабинет педагога',
```

### 5. ProfileView — nav-кнопка в кабине
```tsx
{(role === 'educator' || role === 'camp_director' || role === 'developer') && (
  <div className="profile-view-cabin-nav-item profile-view-cabin-nav-item--wide">
    <button ... onClick={() => openCabinPanel('educator-cabinet', 'right')}>
      <span aria-hidden>📚</span>
      <span>Кабинет педагога</span>
    </button>
  </div>
)}
```

### 6. ProfileView — рендер панели
```tsx
{panelActiveView === 'educator-cabinet' && (role === 'educator' || role === 'camp_director' || role === 'developer') && (
  <div id="educator-cabinet-section" style={{ padding: '0 4px' }}>
    <EducatorCabinetPanel variant={isSpaceshipMode ? 'cabin' : 'accordion'} />
  </div>
)}
```

---

## Проверки

| Проверка | Результат |
|----------|-----------|
| `npm run self-check` | ✅ OK |
| Linter `EducatorCabinetPanel.tsx` | ✅ 0 ошибок |
| Linter `ProfileView.tsx` | ✅ 0 ошибок |
| Ролевой гейт educator/camp_director/developer | ✅ |

---

## Evidence

`src/components/EducatorCabinetPanel.tsx` — 280 строк, localStorage ключ `rl_educator_cabinet_v1`, 3 вкладки.  
`src/views/ProfileView.tsx` — добавлен import строка ~34; PanelViewId строка ~107; panelTitleMap строка ~1627; nav строки 4116–4123; render строки 3001–3005.

---

## Архитектурные решения

- **localStorage отдельно от IUserData** — educator-данные специфичны только для педагога, не нужны в parent report, не нужно синхронизировать с бэкендом v1. Миграция на Supabase в v2.
- **variant prop** — поддержка cabin (isSpaceshipMode) и accordion режимов панели.
- **Задания по умолчанию** — вкладка Tasks открыта первой как наиболее частый use case.

---

## Незакрытые вопросы / Future Work

- Supabase sync для educator данных (v2 — когда P2-01 будет done)
- Поделиться расписанием/заданиями (экспорт в PDF/QR)
- Добавить educator в accordion view (non-spaceship mode nav)

---

## Следующие шаги для других агентов

| Задача | Кому |
|--------|------|
| P2-01: backend RBAC educator — educator нужен доступ к /api/badges/requests/inbox | Агент D/E |
| P2-03: Совет Лагеря — инициативы | Агент C/D |
