# Release Note — M5 Final (TAILS_RECONCILE_D)

## Release readiness status

| Field | Value |
|---|---|
| Verdict | **GO** |
| Date | 2026-02-27 |
| Final LKG | `a008797` |
| Rollback LKG anchor | `78f8bd5` |
| Previous note (superseded) | `docs/RELEASE_NOTE_M5_R1_1.md` (CONDITIONAL GO — superseded) |

---

## Scope (M5 full track)

| Track | Verdict | Key evidence |
|---|---|---|
| M5-KICKOFF: Role/UX harmonization | done | `REPORT_M5_KICKOFF_2026-02-28.md` |
| M5-R1: Release readiness pass #1 | done (CONDITIONAL GO) | `REPORT_M5_R1_RELEASE_PASS_2026-02-28.md` |
| M5-R1.1: Rollback metadata + conditional fix | done | `REPORT_M5_R1_1_ADDENDUM_2026-02-28.md` |
| M5-R1.2: Runtime warnings closure | done (**GO**) | `REPORT_M5_R1_2_RUNTIME_WARNINGS_2026-02-28.md` |
| TAILS_RECONCILE_D: Release ops finalization | done | this file + `OPS_SNAPSHOT_M5_GO.md` |

No RBAC changes, no DB migrations, no breaking API contract changes in M5 track.

---

## What changed (M5 scope, files touched)

- `docs/RELEASE_READINESS_BASELINE_M5.md` — final GO status, updated LKG, extended known-risk matrix (R5/R6 added)
- `docs/RELEASE_NOTE_M5_FINAL.md` — this file (supersedes R1.1 note)
- `docs/PROD_RELEASE_PLAYBOOK.md` — added §5.2 extended smoke checklist (M3/M4 surfaces), M5 readiness links
- `docs/OPS_SNAPSHOT_M5_GO.md` — new ops snapshot (green gates, env evidence links, migration evidence)
- `src/styles/` (8 files) — runtime asset paths resolved (M5-R1.2)
- `public/RL-Guide-book/` (8 assets) — runtime assets added (M5-R1.2)

---

## GO gates confirmed (summary)

### Smoke gates
| Surface | Status |
|---|---|
| Participant (badge flow, squad corner, council chips) | ✅ pass |
| Parent read-only (child progress, insights, fallback texts) | ✅ pass |
| Staff (approvals, squad, council surfaces) | ✅ pass |

### API contract
| Check | Status |
|---|---|
| Additive-only field policy | ✅ pass |
| Optional fields safe when absent | ✅ pass |
| Sparse/legacy fallback human-readable | ✅ pass |
| M2 parent read-only invariants | ✅ confirmed |

### Build
| Check | Status |
|---|---|
| `npm run build` | ✅ pass |
| Unresolved runtime-path warnings | ✅ 0 (closed in R1.2) |

---

## Operational rollback procedure

### Fast rollback (Vercel deploy revert — preferred)
1. Open Vercel dashboard → Deployments.
2. Identify the previous successful deployment.
3. Click "Promote to Production" on that deployment.
4. Verify `GET /api/health` returns 200.
5. Run quick smoke gates (see §Smoke gates above).

### Git-based rollback (full artifact rebuild)
1. Confirm rollback decision and freeze deploy pipeline.
2. Checkout LKG:
   ```bash
   git checkout 78f8bd5
   ```
3. Rebuild artifacts:
   ```bash
   npm run build
   ```
4. Redeploy from LKG artifact bundle to Vercel.
5. Verify `GET /api/health` returns 200.
6. Run quick smoke gates.
7. Mark incident timeline with rollback timestamp and restore-forward plan.

### Rollback success criteria
- App serves stable build from LKG.
- `GET /api/health` → 200.
- Smoke gates pass for participant / parent-read-only / staff.
- No M2 parent read-only invariant violation.
- No new 5xx spike in Vercel logs.

### Rollback does NOT cover
- Supabase DB schema changes (M5 track has none — no migration risk).
- cf-api Cloudflare Workers (separate deploy scope, not M5).

---

## Known Issues (at GO)

**Updated:** 2026-02-27 (M5-R3-D audit)

| # | Issue | Status at GO | Resolution |
|---|-------|-------------|------------|
| R5 | `backend/app.py` uncommitted changes — KOT_THREAD_TRANSPORT_FIX_V1.1 (thread-transport endpoint + dedup guard) | **Resolved** | Committed by Agent C in `a4c3b2f` (TAILS_RECONCILE_C, 2026-02-27). Backward-compat: `root_message_id` is `Optional[int]` — all existing Telegram notification flows unaffected. Certified in TEST#A/B/C. |
| R6 | Runtime asset path warnings (8 CSS assets) | **Closed** | Closed in M5-R1.2 (`a008797`, 2026-02-27). All 8 assets verified, 0 unresolved warnings. |
| R1–R4 | M2/M3/M4 read-model risks (parent read-only leakage, optional fields, wording drift, sparse data) | **Controlled** | No action required. Defensive rendering in place, wording harmonized in M5-KICKOFF. Monitor during operation. |

---

## Known risks (open at release cut)

**Note:** As of M5-R3-D audit (2026-02-27), all previously open risks are resolved or controlled. No blocking risks remain.

| Risk | Status | Action required before release cut |
|---|---|---|
| R5: Thread-transport changes (KOT_THREAD_TRANSPORT_FIX_V1.1) | ✅ resolved | Committed by Agent C in `a4c3b2f`. No action required. |
| R1–R4: M2/M3/M4 read-model risks | ✅ controlled | No action required. Monitor during operation. |
| R6: Runtime asset warnings | ✅ closed | No action. |

---

## Post-release monitoring (first 24h)

- Watch `GET /api/health` every 15 min (or Vercel uptime monitor).
- Alert threshold: any 5xx burst > 3 in 1 min.
- Alert threshold: 401 spike (session/token issue).
- Alert threshold: 429 spike (rate limit / abuse).
- Parent read-only surface: verify no mutation CTA visible in child-view.
- If any anomaly → escalate per `docs/CAMP_RUNBOOK.md §6`.
