# TASK: M10-UX-POLISH-B — UX-полировка и интеграция новых компонентов

**Агент: B (Frontend/UX)**  
**Base:** `main @ 73c0531`  
**Branch:** `agent-b/m10-ux-polish`

## Scope

### 1. Интеграция standalone компонентов

Несколько компонентов из M8-M9 созданы, но ещё не подключены в основной UI:

- `CommunityRankingPanel` → подключить в Workshop секцию ProfileView
- `ArtGallerySection` → подключить в BadgeLevelView (карточка значка)
- `ArtInboxTab` → подключить в inbox staff (рядом с заявками и планами)

### 2. Навигация и UX-связность

- Убедиться что все новые панели доступны через bubble-меню или табы
- Гейтинг: `FeatureGate` для traveler-ролей на новых фичах
- Единый стиль чипов/тостов между планами, артами, инициативами

### 3. Микро-полировка

- Пустые состояния: «Нет артов» / «Нет инициатив» / «Нет планов» — с CTA
- Loading spinners на API-запросах (plans, arts, council)
- Анимации переходов между табами в inbox

### 4. Flow E fix в smoke

Добавить `try/except` с skip для Flow E в smoke script, чтобы pre-existing OpenAI timeout не блокировал CI.

## DoD
- [ ] Все компоненты интегрированы в основной UI
- [ ] Навигация работает end-to-end
- [ ] Пустые состояния и loading states
- [ ] `npm run build` clean, `tsc --noEmit` clean
