# Release Note — M5-R1.1

## Release readiness status
- Verdict: **CONDITIONAL GO**
- LKG (last known good): `78f8bd5`

## Touched scope
- Pre-release conditional fix sprint (documentation + readiness formalization)
- No RBAC/migrations/write-flow changes

## Operational rollback procedure (short)
1. Confirm rollback decision and freeze deploy pipeline.
2. Checkout LKG:
   ```bash
   git checkout 78f8bd5
   ```
3. Rebuild artifacts:
   ```bash
   npm run build
   ```
4. Redeploy from LKG artifact bundle.
5. Run quick smoke gates:
   - participant main profile/badge flow
   - parent child-view read-only + insights block
   - staff key surfaces
6. Mark incident timeline with rollback timestamp and restore-forward plan.

## Success criteria for rollback
- App serves stable build from LKG.
- Smoke gates pass for participant / parent-read-only / staff.
- No M2 parent read-only invariant violation.
