# TASK: M13-4K-UI-B — 4К навыки: UI в кабинете

**Агент: B (Frontend/UX)**  
**Base:** `main` (после merge C)  
**Branch:** `agent-b/m13-4k-ui`  
**Depends:** M13-4K-ENGINE-C

## Scope

### 1. API утилита `fourKApi.ts`
- `fetchStats(deviceId)` → GET stats
- `fetchMapping()` → GET mapping

### 2. FourKPanel компонент

Подключить существующий stub «4К — Навыки и рост»:
- **Radar chart** по 4 навыкам (canvas или SVG):
  - Критическое мышление (🔴)
  - Креативность (🟡)
  - Коммуникация (🔵)
  - Кооперация (🟢)
- Значения 0–100, анимированное заполнение
- Под графиком: детализация по каждому навыку (какие значки дали очки)

### 3. Прогресс по программам РЛ

4 progress bars:
- 4К навыки (aggregate)
- Нейросети для обучения
- Вожатское мастерство
- Соуправление

Каждый с иконкой и цветом.

### 4. Навигация
- Кнопка «4К» в правой панели → FourKPanel
- В мобильной: доступна через стрелочку

## DoD
- [ ] `fourKApi.ts` создан
- [ ] FourKPanel с radar chart + program bars
- [ ] Подключён к stub кнопке
- [ ] `tsc --noEmit` clean
