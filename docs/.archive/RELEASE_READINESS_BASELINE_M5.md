# M5 Release Readiness Baseline

## Purpose
Minimal release-readiness baseline after M2/M3/M4 workstreams, with role-UX harmonization checkpoints and safe rollout gates.

## Final status (updated TAILS_RECONCILE_D — 2026-02-27)

| Item | Value |
|---|---|
| Final verdict | **GO** |
| Final LKG | `a008797` (M5-R1.2: close runtime warnings, move readiness to GO) |
| Previous LKG (rollback anchor) | `78f8bd5` (M5-R1 readiness pass) |
| Rollback procedure | `docs/RELEASE_NOTE_M5_FINAL.md` §Rollback |
| Ops snapshot | `docs/OPS_SNAPSHOT_M5_GO.md` |

Evidence chain:
- `docs/PROD_ROADMAP_IMPL/reports/REPORT_M5_KICKOFF_2026-02-28.md` — baseline kickoff
- `docs/PROD_ROADMAP_IMPL/reports/REPORT_M5_R1_RELEASE_PASS_2026-02-28.md` — R1 pass (CONDITIONAL GO)
- `docs/PROD_ROADMAP_IMPL/reports/REPORT_M5_R1_1_ADDENDUM_2026-02-28.md` — R1.1 rollback formalization
- `docs/PROD_ROADMAP_IMPL/reports/REPORT_M5_R1_2_RUNTIME_WARNINGS_2026-02-28.md` — R1.2 warnings closure (**GO**)

## 1) Smoke gates (must pass)
### Participant
- Badge flow status/chips display correctly.
- Squad corner readiness indicators render correctly.
- Council initiatives list/status chips/filter remain usable.

### Parent (read-only)
- Parent can open child progress in read-only mode.
- Parent Insights block shows progress/trend/recommendations/explainability without mutation CTA.
- Parent-facing fallback texts remain human-readable.

### Staff
- Staff views (approvals/council/squad surfaces) remain accessible.
- No regressions in read-model status rendering and role-specific labels.

## 2) API compatibility checks
- Additive-only field policy for read-models.
- No removal/rename of existing response fields.
- Optional fields (`weeklyTrend`, `dynamicSignals`, `whyThisSuggestion`, `basedOn`) must be safe when absent.
- Sparse/legacy data must return human-readable fallback text.

## 3) M2 parent read-only invariants (mandatory)
1. Parent child-view stays strictly read-only.
2. No mutation CTA in parent child-view for child progress/actions.
3. M2 read-only guard behavior remains unchanged.
4. Any deviation from (1)-(3) is release-blocking and requires escalation.

## 4) Rollback-ready criteria
- Last known good commit hash documented before release cut.
- Patch-level changes isolated by branch/task and reversible.
- Release notes list touched files/surfaces.
- Smoke gates rerunnable in <30 min.

Operational reference (updated TAILS_RECONCILE_D):
- **Final LKG:** `a008797` (M5-R1.2 — GO verdict)
- **Rollback LKG anchor:** `78f8bd5` (stable M5-R1 baseline)
- **Final release note:** `docs/RELEASE_NOTE_M5_FINAL.md`
- **Ops snapshot:** `docs/OPS_SNAPSHOT_M5_GO.md`

## 5) Known-risk matrix (updated TAILS_RECONCILE_D — 2026-02-27)

| # | Risk | Status | Owner | Mitigation | Trigger (escalate when) |
|---|---|---|---|---|---|
| R1 | Parent read-only leakage via UI copy/CTA drift | ✅ controlled | Dev Bro 1 | Re-check parent child-view controls and M2 guard before merge | Any new actionable CTA appears in parent child-view |
| R2 | Optional read-model fields interpreted as required by UI | ✅ controlled | Dev Bro 1 | Defensive rendering with optional chaining + fallback text | UI crashes/blank states when optional fields missing |
| R3 | Status terminology drift across role surfaces | ✅ controlled | Dev Bro 1 | Shared wording review in Profile/Council/Squad surfaces | Contradictory labels for same status in role paths |
| R4 | Legacy sparse data causes confusing output | ✅ controlled | Dev Bro 1 | Human-readable fallback content; avoid technical markers | Parent sees technical placeholders instead of guidance |
| R5 | Thread-transport changes (KOT_THREAD_TRANSPORT_FIX_V1.1) uncommitted in backend/app.py | ⚠️ open | Agent D / Kot Bro | Commit or explicitly defer before release cut; verify no conflict with existing Telegram flows | Any new Telegram-send regression; dedup guard interfering with normal notifications |
| R6 | Runtime asset path warnings regression | ✅ closed (R1.2) | Dev Bro 1 | Whitelist of 8 known paths verified clean; 0 unresolved warnings as of `a008797` | warnings count increases or new warning in critical role surface |

## 6) Escalation policy
Immediate NEEDS_REVIEW required for:
- Any potential M2 read-only invariant violation,
- Any breaking API contract change,
- Any RBAC/migration proposal in this track.
