# handoff — 2026-02-28 — M4-PARENT-INSIGHTS-S2

Implemented Parent Insights S2:
- optional weekly trend (`up|flat|down`) in read-model,
- optional dynamicSignals for explainability,
- rule-based dynamic recommendation wording,
- parent UI trend indicator in child-view.

Comparison windows: last 7 days vs previous 7 days by achievedAt count.
Fallback: `flat` + human-readable note when history is insufficient.

No RBAC/migrations/write-flow changes.
