# Ops Snapshot — M10 Production Deployment

**Date:** 2026-03-02  
**Base:** `main @ 73c0531`  
**LKG:** `a008797` (M5 GO)

---

## 1) Gateway checks

| Gate | How to verify | Expected | Status |
|---|---|---|---|
| Backend liveness | `GET /api/health` | `{"status":"ok"}` 200 | ✅ VERIFIED |
| Dev-door closed | `POST /api/dev/login` | 404 | ✅ (M5 verified) |
| Auth flow | generate-code → verify-code | JWT w/ role | ✅ (M5 verified) |

---

## 2) DB / migrations

| Migration | File | Table/Change | Status |
|---|---|---|---|
| 001: schema v1 | `001_schema_v1.sql` | 9 tables | ✅ applied |
| 002: council_initiatives | `002_council_initiatives.sql` | council_initiatives | ✅ applied |
| 003: badge_plans | `003_badge_plans.sql` | badge_plans (UUID PK) + 3 indexes + RLS | ⏳ pending |
| 004: council_initiatives ext | `004_council_initiatives.sql` | +description, +votes_up, +voters, +author_nickname, +updated_at + RLS policies | ⏳ pending |
| 005: squad_kind | `005_squad_kind.sql` | squads ADD kind (participant/staff) | ⏳ pending |
| 006: badge_arts | `006_badge_arts.sql` | badge_arts (id, device_id, badge_id, image_url, source, status) + RLS | ⏳ pending |

**Combined SQL:** `backend/migrations/m10_combined_003_006.sql`  
**Apply via:** [SQL Editor](https://supabase.com/dashboard/project/inkhtjcrzblzsfqvceid/sql/new) → paste + Run

---

## 3) Environment / secrets

| Var | Scope | Status |
|---|---|---|
| `USE_SUPABASE` | Vercel | **VERIFIED** |
| `SUPABASE_URL` | Vercel | **VERIFIED** |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | **VERIFIED** |
| `AUTH_SECRET` | Vercel | **VERIFIED** |
| `AUTH_JWT_SECRET` | Vercel | **VERIFIED** |
| `ENVIRONMENT` | Vercel | **VERIFIED** (production) |
| `CHAT_MESSAGES_PER_DAY` | Vercel | **VERIFIED** |
| `IMAGE_PROVIDER` | Vercel | ⏳ **NEEDS_ADD** (`auto`) |
| `TELEGRAM_BOT_TOKEN` | Vercel | **VERIFIED_OPTIONAL** |
| `TELEGRAM_CHANNEL_ID` | Vercel | **VERIFIED_OPTIONAL** |
| `NEURO_STEPA_BOT_TOKEN` | Vercel | **VERIFIED_OPTIONAL** |
| `CAT_BRO_BOT_TOKEN` | Vercel | **VERIFIED_OPTIONAL** |
| `DEV_BRO_1_BOT_TOKEN` | Vercel | **VERIFIED_OPTIONAL** |

---

## 4) Deployment targets

| Target | URL | Status |
|---|---|---|
| Vercel Backend | `https://backend-murex-one-40.vercel.app` | ✅ live (needs redeploy for M7-M9 code) |
| GH Pages Frontend | `https://realcampdzen.github.io/RL-Guide-book/` | ✅ live |

---

## 5) Smoke coverage (post-deploy target)

| Flow | Description | Depends on | Target |
|---|---|---|---|
| A-D | Badge requests lifecycle | 001 | ✅ existing |
| E | Image generation | IMAGE_PROVIDER | ⏳ retest after env |
| F | Teams lifecycle | 001 | ✅ existing |
| G | Chat | OPENAI_API_KEY | ⏳ retest |
| H | Cleanup | 001 | ✅ existing |
| I | Telegram agent-post | AGENT_BOT_TOKENS | ✅ existing |
| **J** | **Badge Plans** | **003** | ⏳ after migration |
| **K** | **Educator RBAC** | — | ⏳ after redeploy |
| **L** | **Council Initiatives** | **004** | ⏳ after migration |
| **M** | **Staff Squad kind** | **005** | ⏳ after migration |
| **N** | **Badge Arts** | **006** | ⏳ after migration |

**Target:** ≥ 65/72 checks passed

---

## 6) Rollback

| Item | Status |
|---|---|
| LKG | `a008797` (M5 GO) |
| Migrations rollback | All DDL is additive (`IF NOT EXISTS`), no data loss on rollback |
| Vercel fast rollback | ✅ promote previous deployment |
