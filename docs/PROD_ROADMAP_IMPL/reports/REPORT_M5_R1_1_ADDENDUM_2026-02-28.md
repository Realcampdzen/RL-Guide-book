# REPORT ADDENDUM — M5-R1.1 (Pre-release Conditional Fix Sprint)

## Final verdict
**CONDITIONAL GO**

Обоснование: rollback metadata formalization закрыт полностью и операционно исполним. Runtime asset-path warnings снижены до ограниченного и известного набора (8 предупреждений), но не устранены полностью — риск контролируемый, без подтверждённого функционального дефекта на критичных role-surfaces.

---

## Conditional items status

### 1) Runtime asset-path warnings
- Previous status (R1): conditional
- Current status (R1.1): **downgraded** (not fully closed)
- Current count: **8 unresolved runtime-path warnings** in build output
- Why not fully closed now:
  - предупреждения относятся к историческим runtime asset references в стилях и не подтверждают runtime дефект в критичных role flows;
  - полный рефактор путей выходит за пределы P0 pre-release fix sprint.
- Real impact:
  - low/medium operational noise in build logs; диагностика релизов немного сложнее.
- Trigger (escalate when):
  - warnings > 8,
  - warning появляется в новом критичном role-surface,
  - или появляется фактический runtime 404/visual defect на participant/parent/staff ключевых экранах.
- Owner: Dev Bro 1
- Target fix window: **M5-R1.2 (следующее техокно до релиз-ката / 24–72h)**

### 2) Rollback metadata formalization
- Previous status (R1): conditional
- Current status (R1.1): **closed**
- What done:
  - зафиксирован LKG,
  - добавлена короткая операционная rollback-процедура в release note.
- Owner: Dev Bro 1

---

## LKG and rollback (operational)
- **LKG commit:** `78f8bd5` (M5-R1 readiness pass)
- Release note with rollback procedure:
  - `docs/RELEASE_NOTE_M5_R1_1.md`

---

## Quick smoke re-check
- participant: ✅
- parent-read-only: ✅
- staff: ✅

M2 parent read-only invariants: ✅ confirmed unchanged.

---

## Validation evidence
- `python -m py_compile backend/app.py` ✅
- `npm run build` ✅ (8 known unresolved runtime-path warnings)
