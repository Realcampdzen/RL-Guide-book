# TASK: M8-EDUCATOR-CABINET-C — Кабинет педагога v2: задания и проверки

**Агент: C (Chat/AI/Data)**  
**Base:** `main @ c9458b4`  
**Branch:** `agent-c/m8-educator-cabinet`

## Контекст

EducatorCabinetPanel v1 (P2-04) существует с 3 вкладками, но работает на заглушках. Нужно наполнить реальными данными и добавить функционал заданий.

## Что читать

- `src/views/ProfileView.tsx` — найти EducatorCabinetPanel
- `docs/PRODUCT_MECHANICS_AND_ROADMAP.md` §7.16 — Мастерская / кабинет педагога

## Scope

### 1. Модель данных задания (локальная)

В `userProgress.ts` добавить:
```typescript
interface EducatorTask {
  id: string;
  title: string;
  description: string;
  badgeId?: string;        // связь с значком
  assignedTo: string[];    // device_ids участников
  dueDate?: string;
  status: 'draft' | 'assigned' | 'completed';
  createdAt: string;
}
```

Хранение: `userData.educatorTasks` в `rl_guide_progress_v1`.

### 2. UI в EducatorCabinetPanel

- Вкладка «Задания»: создание задания (title + description + опционально badgeId)
- Список заданий с статусами
- Вкладка «Проверки»: показать submitted планы от учеников (из `/api/badges/plans/inbox`)

### 3. Связь с чатботом

В `putevoditel_system_prompt.py` — если роль educator, добавить контекст:
> «Ты помогаешь педагогу/мастеру создавать задания и проверять работы учеников.»

## DoD

- [ ] Модель EducatorTask добавлена
- [ ] Вкладки «Задания» и «Проверки» работают
- [ ] Промпт обновлён для educator
- [ ] `npm run build` clean, `tsc --noEmit` clean
