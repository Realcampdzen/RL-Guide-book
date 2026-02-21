# PLAN_P2-02 — UX: дашборды staff (смены/отряды/модерация/статистика)

**Агент:** B  
**Task ID:** P2-02  
**Дата создания плана:** 2026-02-21  
**Статус:** in_progress

---

## 1. Цель задачи

Доработать UI для staff-ролей в панели «Входящие заявки» (eventsTab = 'approvals'):
- Список участников отряда с понятным отображением
- Фильтры inbox по статусу (Все / Ожидают / Одобрены / Отклонены)
- Базовая статистика (счётчики участников и заявок)
- Включить educator в squad join form

---

## 2. Контекст (что уже есть)

- `src/utils/badgeApprovalApi.ts` — `loadBadgeRequestsInbox` уже поддерживает `status` параметр (lines 177–190).
- Inbox вызывается без фильтра: `loadBadgeRequestsInbox(accessToken)` (ProfileView line 774).
- Участники: отображаются как `nickname · deviceId` в 120px box (lines 5315–5323).
- educator исключён из squad join form (line 5286 condition).
- Состояние: `badgeRequestsInbox: BadgeRequestItem[]`, `mySquadInfo.participants`.

---

## 3. Файлы для изменения

| Файл | Тип | Описание |
|------|-----|----------|
| `src/views/ProfileView.tsx` | modify | Фильтры inbox, статистика, улучшенный список участников, educator в squad join |

---

## 4. Шаги реализации

1. **Добавить state фильтра inbox**
   - `const [inboxStatusFilter, setInboxStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')`
   - Обновить `loadBadgeApprovalsData` — передавать фильтр: при `inboxStatusFilter !== 'all'` → `loadBadgeRequestsInbox(accessToken, { status: inboxStatusFilter })`

2. **UI фильтров** — 4 кнопки над inbox-блоком (Все / Ожидают / Одобрены / Отклонены)

3. **Статистика** — счётчик участников и заявок над inbox

4. **Участники** — улучшить карточку: убрать показ `deviceId`, добавить счётчик pending заявок от участника (вычислить из `badgeRequestsInbox`)

5. **educator в squad join** — добавить `|| role === 'educator'` в условие на line 5286

---

## 5. Definition of Done

- [x] Фильтры работают (кнопки меняют filter state, перезагружают inbox с нужным status)
- [x] Статистика отображается
- [x] Участники показываются без сырого deviceId
- [x] educator может вступить в отряд по коду
- [x] self-check проходит

---

## 6. Отклонения от плана

*Пусто.*
