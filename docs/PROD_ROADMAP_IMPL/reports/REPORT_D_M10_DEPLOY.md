# REPORT: M10-SUPABASE-MIGRATIONS-D + M10-VERCEL-REDEPLOY-D

**Agent:** D (DevOps)  
**Date:** 2026-03-02  
**Base:** `main @ 73c0531`

---

## M10-SUPABASE-MIGRATIONS-D — Применить миграции 003→006

### Status: ⏳ READY FOR MANUAL APPLICATION

**Problem:** No `.env` with `SUPABASE_ACCESS_TOKEN` — `apply_migration.py` cannot execute.

### Deliverables

| Deliverable | Path | Description |
|---|---|---|
| Combined SQL | `backend/migrations/m10_combined_003_006.sql` | All 4 migrations in one file, idempotent, with verification queries |
| OPS_SNAPSHOT | `docs/OPS_SNAPSHOT_M10.md` | Updated ops snapshot with migration status matrix |

### How to Apply

1. Open: https://supabase.com/dashboard/project/inkhtjcrzblzsfqvceid/sql/new
2. Paste contents of `backend/migrations/m10_combined_003_006.sql`
3. Click **Run**
4. Expected output: 4 `SELECT count(*)` rows, all returning `0` (tables just created)

### Verification

After applying, run in SQL Editor:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('badge_plans', 'badge_arts', 'council_initiatives', 'squads');
```

Expected: all 4 tables listed.

Check `squads.kind` column:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'squads' AND column_name = 'kind';
```

Expected: `kind | text | 'participant'::text`

---

## M10-VERCEL-REDEPLOY-D — Redeploy + IMAGE_PROVIDER

### Status: ⏳ READY FOR MANUAL EXECUTION

### Steps

1. **Vercel Dashboard** → Project `backend-murex-one-40` → Settings → Environment Variables
   - Add: `IMAGE_PROVIDER` = `auto` (Production scope)
   - Verify existing vars match OPS_SNAPSHOT_M10 §3

2. **Redeploy:** Deployments tab → latest → "Redeploy" button

3. **Verify health after deploy:**
   ```
   GET https://backend-murex-one-40.vercel.app/api/health → {"status":"ok"}
   ```

4. **Run smoke against prod:**
   ```bash
   BACKEND_URL=https://backend-murex-one-40.vercel.app python backend/scripts/smoke_backend_critical.py
   ```
   Target: ≥65/72 (Flows J, K, L, M, N depend on migrations being applied first)

5. **GH Pages:** https://realcampdzen.github.io/RL-Guide-book/ — ✅ already live (verified 2026-03-02)

---

## Pre-flight Verification (Done by Agent D)

| Check | Result |
|---|---|
| Backend health | ✅ `{"status":"ok"}` |
| GH Pages live | ✅ "Путеводитель Реального Лагеря" renders |
| SQL idempotency | ✅ all DDL uses `IF NOT EXISTS` |
| Combined SQL file | ✅ created |
| OPS_SNAPSHOT_M10 | ✅ created |
| CLAIM_BOARD updated | ✅ in_progress |

---

## DoD Checklist

### M10-SUPABASE-MIGRATIONS-D
- [x] Combined SQL prepared
- [x] OPS_SNAPSHOT_M10 created
- [ ] 4 migrations applied (needs user action)
- [ ] All tables verified in Supabase Dashboard (needs user action)

### M10-VERCEL-REDEPLOY-D
- [ ] IMAGE_PROVIDER=auto set (needs user action)
- [ ] Vercel redeploy triggered (needs user action)
- [ ] Prod smoke ≥65/72 (after migrations + redeploy)
- [x] GH Pages live verified
