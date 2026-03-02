# TASK: M16-DASHBOARD-UI-B — Пульт Управления: UI

**Агент: B (Frontend/UX)**  
**Base:** `main` (после merge A)  
**Branch:** `agent-b/m16-dashboard-ui`  
**Depends:** M16-DASHBOARD-BACKEND-A

## Scope

### 1. API утилита `adminApi.ts`
- `fetchInbox(filter?)` → GET /api/admin/inbox
- `performAction(itemType, itemId, action, comment?)` → POST /api/admin/action

### 2. AdminDashboard компонент

Полноэкранная панель «Пульт Управления»:

**Sidebar (левая):**
- Счётчики по типам с иконками:
  - 🏅 Значки (3)
  - 📋 Инициативы (1)
  - 🎨 Арты (2)
  - ⚙️ Движки (1)
  - 🔍 Инспектор (4)
  - Все (11)
- Клик на тип → фильтрация

**Main area:**
- Список карточек inbox items (сортировка по дате):
  - Аватар + ник юзера
  - Тип (цветной чип)
  - Данные (preview: текст, фото, название)
  - Время
  - Кнопки: ✅ Approve / ❌ Reject
  - Optional comment textarea (раскрывается при reject)

**Действия:**
- Approve: одним кликом, item исчезает из inbox с toast
- Reject: с обязательным комментарием
- Bulk actions: «Одобрить все» (с подтверждением)

### 3. Навигация
- Доступ: кнопка «🎛️ Пульт» в header (только для developer/shift_leader)
- Badge counter на иконке (количество pending items)
- Mobile: full-screen overlay

### 4. Empty State
- «Нет ожидающих запросов — всё обработано! 🎉»

## DoD
- [ ] `adminApi.ts` создан
- [ ] AdminDashboard с sidebar + inbox list + actions
- [ ] Badge counter в header
- [ ] `tsc --noEmit` clean
