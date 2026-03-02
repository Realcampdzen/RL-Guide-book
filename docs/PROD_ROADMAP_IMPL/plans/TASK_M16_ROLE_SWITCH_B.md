# TASK: M16-ROLE-SWITCH-B — Role Switch для тестирования

**Агент: B (Frontend/UX)**  
**Base:** `main @ 627a1e2`  
**Branch:** `agent-b/m16-role-switch`

## Scope

### 1. RoleSwitcher компонент

Dev-only panel (видна только role=developer):

- Dropdown «Текущая роль»:
  - 👤 Участник (participant)
  - 🏕️ Вожатый (counselor)
  - 📚 Педагог (educator)
  - ⭐ Старший Вожатый (shift_leader)
  - 🏛️ Начальник Лагеря (camp_director)
  - 👨‍👩‍👧 Родитель (parent)
  - 🔧 Разработчик (developer)

- При переключении:
  - POST `/api/dev/switch-role` с новой ролью
  - Toast: «Вы сейчас как: Вожатый 🏕️»
  - UI перестраивается (скрываются/показываются секции по permissions)

### 2. Dev Panel

Плавающая панель (bottom-right corner):
- Текущая роль (цветной чип)
- Dropdown для переключения
- Кнопка «Reset to Developer»
- Кнопка «Открыть Пульт»
- Only visible when `profile.role === 'developer'`

### 3. Permission-gated UI

Использовать `profile.permissions` из `/api/auth/me`:
- Скрывать/показывать разделы на основе permissions
- Например: «Пульт» видна только если `can_view_dashboard`
- «Вожатский отряд» только если `can_manage_squad`

Создать хелпер: `usePermissions()` hook:
```typescript
const { can } = usePermissions()
if (can('approve_badges')) { /* show approve button */ }
```

## DoD
- [ ] RoleSwitcher dropdown
- [ ] Dev Panel (floating)
- [ ] `usePermissions()` hook
- [ ] Permission-gated sections
- [ ] `tsc --noEmit` clean
