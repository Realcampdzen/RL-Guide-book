# TASK: M12-COUNSELOR-SQUAD-B — Вожатский Отряд: полный кабинет

**Агент: B (Frontend/UX)**  
**Base:** `main @ f43378f`  
**Branch:** `agent-b/m12-counselor-squad`

## Контекст

Вожатский Отряд (kind=staff) уже существует: squad kind=staff (M8), UI «Вожатский отряд» в кабинете. Нужно расширить до полноценного кабинета по аналогии с Отрядным Уголком.

Из видения: «полностью повторяет функционал Отрядного уголка, но для Вожатых, Старшего Вожатого. Есть название, атрибутика, традиции, план работы, расписание.»

## Scope

### 1. Расширение CounselorSquadPanel

Reuse паттернов из squad cabinet (SquadCorner):
- **Участники**: список вожатых с ролями (counselor/shift_leader/educator)
- **Чат**: reuse squad messages pattern с staffSquadId
- **Информация**: название, атрибутика, девиз отряда вожатых
- **Мастерские**: список педагогов и их мастерских (GET от squad members с role=educator)

### 2. Раздел «Традиции Лагеря»

- Список традиций (CRUD):
  - `{ title, description, status: 'proposed'|'approved', proposedBy, linkedBadgeId? }`
- Предложение: любой вожатый
- Утверждение: shift_leader
- Связь с соответствующим значком (optional linkage)
- Для MVP: localStorage-based (серверная часть в M14)

### 3. Навигация

- Кнопка «Вожатский отряд» в правой панели кабинета уже есть
- При клике → полноценная панель с табами: Участники / Чат / Мастерские / Традиции

## DoD
- [ ] CounselorSquadPanel расширен
- [ ] Участники + Чат + Мастерские + Традиции
- [ ] `tsc --noEmit` clean
