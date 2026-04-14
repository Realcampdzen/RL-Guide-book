"""
backend/storage/supabase_provider.py — Supabase-провайдер хранилища (prod).

Используется при USE_SUPABASE=true.
Требует: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY в окружении.

Каждый Store реализует те же интерфейсы что и JSON-провайдер,
возвращая данные в том же формате dict (совместимость с app.py).
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from .base import (
    ShiftsStore, MembershipsStore, SquadCornersStore,
    SquadInvitesStore, SquadMessagesStore,
    BadgeRequestsStore, BadgePlansStore, ParentSnapshotsStore,
    ChatDailyUsageStore, CouncilInitiativesStore, CouncilMembersStore, CouncilProtocolsStore, TeamsStore,
    BadgeArtsStore, EnginesStore, EngineMembersStore,
    InspectorProgressStore,
    BroEventsStore, BroPassportsStore, BroSubmissionsStore, BroInitiativesStore, ShiftScheduleStore,
    WorkshopsStore,
    ParentSuggestionsStore,
    UsersStore,
    WorkshopProposalsStore,
    RoleRequestsStore,
    FamilyLinksStore,
    EngineJoinRequestsStore,
    EngineProjectsStore,
    EngineInitiativesStore,
)

_sb_client = None


def _client():
    """Lazy-инициализация Supabase клиента (singleton)."""
    global _sb_client
    if _sb_client is None:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL", "").strip()
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set when USE_SUPABASE=true"
            )
        _sb_client = create_client(url, key)
    return _sb_client


def _is_missing_table_error(exc: Exception) -> bool:
    """True when Supabase/PostgREST says table is missing from schema cache."""
    code = getattr(exc, "code", None)
    if isinstance(code, str) and code.upper() == "PGRST205":
        return True
    message = str(exc)
    return "PGRST205" in message or (
        "Could not find the table" in message and "schema cache" in message
    )


# ---------------------------------------------------------------------------
# ShiftsStore — таблицы shifts + squads
# ---------------------------------------------------------------------------

class SupabaseShiftsStore(ShiftsStore):
    """
    Формат load(): {'shifts': [...], 'squads': [...]}
    Каждый shift/squad — dict с camelCase ключами (совместимо с app.py).
    """

    def load(self) -> dict:
        sb = _client()
        shifts_rows = sb.table("shifts").select("*").execute().data or []
        squads_rows = sb.table("squads").select("*").execute().data or []

        shifts = [_row_to_shift(r) for r in shifts_rows]
        squads = [_row_to_squad(r) for r in squads_rows]
        return {"shifts": shifts, "squads": squads}

    def save(self, data: dict) -> None:
        sb = _client()
        for shift in (data.get("shifts") or []):
            if not isinstance(shift, dict):
                continue
            sb.table("shifts").upsert(_shift_to_row(shift)).execute()
        for squad in (data.get("squads") or []):
            if not isinstance(squad, dict):
                continue
            sb.table("squads").upsert(_squad_to_row(squad)).execute()

    def delete_shift_by_id(self, shift_id: str) -> None:
        sb = _client()
        sb.table("shifts").delete().eq("id", shift_id).execute()

    def delete_squad_by_id(self, squad_id: str) -> None:
        sb = _client()
        sb.table("squads").delete().eq("id", squad_id).execute()

    def delete_squads_by_shift_id(self, shift_id: str) -> None:
        sb = _client()
        sb.table("squads").delete().eq("shift_id", shift_id).execute()


def _row_to_shift(r: dict) -> dict:
    return {
        "id": r.get("id", ""),
        "name": r.get("name", ""),
        "startDate": r.get("start_date") or "",
        "endDate": r.get("end_date") or "",
        "createdAt": _ts(r.get("created_at")),
        "createdBy": r.get("created_by_device_id") or "",
        "avatarUrl": r.get("avatar_url") or "",
    }


def _shift_to_row(s: dict) -> dict:
    row = {
        "id": s.get("id") or uuid.uuid4().hex[:12],
        "name": s.get("name", ""),
        "created_by_device_id": s.get("createdBy") or s.get("createdByDeviceId") or None,
    }
    if s.get("startDate"):
        row["start_date"] = s["startDate"]
    if s.get("endDate"):
        row["end_date"] = s["endDate"]
    if "avatarUrl" in s:
        row["avatar_url"] = s["avatarUrl"]
    return row


def _row_to_squad(r: dict) -> dict:
    return {
        "id": r.get("id", ""),
        "shiftId": r.get("shift_id", ""),
        "name": r.get("name", ""),
        "createdAt": _ts(r.get("created_at")),
        "createdBy": r.get("created_by_device_id") or "",
    }


def _squad_to_row(s: dict) -> dict:
    return {
        "id": s.get("id") or uuid.uuid4().hex[:12],
        "shift_id": s.get("shiftId") or s.get("shift_id", ""),
        "name": s.get("name", ""),
        "created_by_device_id": s.get("createdBy") or s.get("createdByDeviceId") or None,
    }


# ---------------------------------------------------------------------------
# MembershipsStore — таблица memberships
# ---------------------------------------------------------------------------

class SupabaseMembershipsStore(MembershipsStore):
    """
    Формат load(): {'members': [...]}
    Каждый member — dict с camelCase ключами (совместимо с app.py).
    """

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("memberships").select("*").execute().data or []
        members = [_row_to_member(r) for r in rows]
        return {"members": members}

    def save(self, data: dict) -> None:
        sb = _client()
        rows = []
        for member in (data.get("members") or []):
            if isinstance(member, dict):
                rows.append(_member_to_row(member))
        
        if not rows:
            return
            
        try:
            chunk_size = 50
            for i in range(0, len(rows), chunk_size):
                chunk = rows[i:i + chunk_size]
                sb.table("memberships").upsert(chunk).execute()
        except Exception:
            raise


def _row_to_member(r: dict) -> dict:
    return {
        "deviceId": r.get("device_id", ""),
        "campId": r.get("camp_id") or "",
        "squadId": r.get("squad_id") or "",
        "role": r.get("role", "participant"),
        "nickname": r.get("nickname") or "",
        "joinedAt": _ts(r.get("joined_at")),
    }


def _member_to_row(m: dict) -> dict:
    row = {
        "device_id": m.get("deviceId", ""),
        "role": m.get("role", "participant"),
    }
    if m.get("campId"):
        row["camp_id"] = m["campId"]
    if m.get("squadId"):
        row["squad_id"] = m["squadId"]
    if m.get("nickname"):
        row["nickname"] = m["nickname"]
    return row


# ---------------------------------------------------------------------------
# SquadCornersStore — таблица squad_corners
# ---------------------------------------------------------------------------

class SupabaseSquadCornersStore(SquadCornersStore):
    """
    Формат load(): {'corners': {squad_id: {...}}}
    """

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("squad_corners").select("*").execute().data or []
        corners = {}
        for r in rows:
            sid = r.get("squad_id", "")
            if sid:
                corners[sid] = r.get("corner_json") or {}
        return {"corners": corners}

    def save(self, data: dict) -> None:
        sb = _client()
        corners = data.get("corners") or {}
        for squad_id, corner_data in corners.items():
            sb.table("squad_corners").upsert({
                "squad_id": squad_id,
                "corner_json": corner_data,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).execute()


# ---------------------------------------------------------------------------
# SquadInvitesStore — таблица squad_invite_codes
# ---------------------------------------------------------------------------

class SupabaseSquadInvitesStore(SquadInvitesStore):
    """
    Формат load(): {'codes': {code: {squadId, expiresAt, isActive, ...}}}
    """

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("squad_invite_codes").select("*").execute().data or []
        codes = {}
        for r in rows:
            code = r.get("code", "")
            if code:
                codes[code] = {
                    "squadId": r.get("squad_id", ""),
                    "expiresAt": _ts(r.get("expires_at")),
                    "isActive": r.get("is_active", True),
                    "createdBy": r.get("created_by_device_id") or "",
                    "createdAt": _ts(r.get("created_at")),
                }
        return {"codes": codes}

    def save(self, data: dict) -> None:
        sb = _client()
        codes = data.get("codes") or {}
        for code, meta in codes.items():
            if not isinstance(meta, dict):
                continue
            row = {
                "code": code,
                "squad_id": meta.get("squadId", ""),
                "is_active": meta.get("isActive", True),
            }
            if meta.get("expiresAt"):
                row["expires_at"] = meta["expiresAt"]
            if meta.get("createdBy"):
                row["created_by_device_id"] = meta["createdBy"]
            sb.table("squad_invite_codes").upsert(row).execute()

    def delete_by_squad_id(self, squad_id: str) -> None:
        """Delete all invite codes for a squad directly in Supabase."""
        sb = _client()
        sb.table("squad_invite_codes").delete().eq("squad_id", squad_id).execute()

    def insert_code(self, code: str, meta: dict) -> None:
        """Insert a single invite code directly — avoids bulk upsert."""
        sb = _client()
        row = {
            "code": code,
            "squad_id": meta.get("squadId", ""),
            "is_active": meta.get("isActive", True),
        }
        if meta.get("expiresAt"):
            row["expires_at"] = meta["expiresAt"]
        if meta.get("createdBy"):
            row["created_by_device_id"] = meta["createdBy"]
        sb.table("squad_invite_codes").insert(row).execute()


# ---------------------------------------------------------------------------
# SquadMessagesStore — таблица squad_messages
# ---------------------------------------------------------------------------

class SupabaseSquadMessagesStore(SquadMessagesStore):
    """
    Формат load(): {'bySquadId': {squad_id: [...]}}
    Retention 1000 — обеспечивается триггером в БД.
    """

    def load(self) -> dict:
        sb = _client()
        # Загружаем последние 1000 сообщений по каждому отряду
        rows = sb.table("squad_messages").select("*").order("created_at", desc=False).execute().data or []
        by_squad: dict = {}
        for r in rows:
            sid = r.get("squad_id", "")
            if not sid:
                continue
            if sid not in by_squad:
                by_squad[sid] = []
            by_squad[sid].append({
                "id": str(r.get("id", "")),
                "squadId": sid,
                "deviceId": r.get("device_id", ""),
                "nickname": r.get("nickname") or "",
                "role": r.get("role", "participant"),
                "text": r.get("text", ""),
                "createdAt": _ts(r.get("created_at")),
            })
        return {"bySquadId": by_squad}

    def save(self, data: dict) -> None:
        """
        При Supabase-провайдере сообщения вставляются напрямую через эндпоинт
        (INSERT), а не через bulk save. Этот метод используется только для
        совместимости с интерфейсом (например, при миграции JSON → Supabase).
        """
        sb = _client()
        by_squad = data.get("bySquadId") or {}
        for squad_id, messages in by_squad.items():
            for msg in (messages or []):
                if not isinstance(msg, dict):
                    continue
                row = {
                    "squad_id": squad_id,
                    "device_id": msg.get("deviceId", ""),
                    "role": msg.get("role", "participant"),
                    "text": msg.get("text", ""),
                }
                if msg.get("nickname"):
                    row["nickname"] = msg["nickname"]
                if msg.get("id"):
                    row["id"] = msg["id"]
                sb.table("squad_messages").upsert(row).execute()

    def insert_message(self, msg: dict) -> dict:
        """Direct single-row INSERT — lets Supabase auto-generate the UUID id."""
        sb = _client()
        row = {
            "squad_id": (msg.get("squadId") or "").strip(),
            "device_id": msg.get("deviceId") or "",
            "role": msg.get("role") or "participant",
            "text": msg.get("text") or "",
        }
        if msg.get("nickname"):
            row["nickname"] = msg["nickname"]
        result = sb.table("squad_messages").insert(row).execute()
        inserted = (result.data or [{}])[0]
        return {
            "id": str(inserted.get("id", msg.get("id", ""))),
            "squadId": (inserted.get("squad_id") or msg.get("squadId") or ""),
            "deviceId": (inserted.get("device_id") or msg.get("deviceId") or ""),
            "nickname": (inserted.get("nickname") or msg.get("nickname") or None),
            "role": (inserted.get("role") or msg.get("role") or "participant"),
            "text": (inserted.get("text") or msg.get("text") or ""),
            "createdAt": _ts(inserted.get("created_at")) or msg.get("createdAt") or "",
        }


# ---------------------------------------------------------------------------
# BadgeRequestsStore — таблица badge_requests
# ---------------------------------------------------------------------------

class SupabaseBadgeRequestsStore(BadgeRequestsStore):
    """
    Формат load(): {'requests': [...]}
    """

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("badge_requests").select("*").order("created_at", desc=False).execute().data or []
        requests = [_row_to_badge_request(r) for r in rows]
        return {"requests": requests}

    def save(self, data: dict) -> None:
        sb = _client()
        rows = []
        for req in (data.get("requests") or []):
            if isinstance(req, dict):
                rows.append(_badge_request_to_row(req))
                
        if not rows:
            return
            
        try:
            chunk_size = 50
            for i in range(0, len(rows), chunk_size):
                chunk = rows[i:i + chunk_size]
                sb.table("badge_requests").upsert(chunk).execute()
        except Exception:
            raise

    def load_inbox(self, *, camp_id=None, squad_id=None, status_filter=None,
                   include_resolved=True, resolved_ttl_days=30) -> list:
        """SQL-level inbox filtering — added in M5-R4-A."""
        import datetime
        sb = _client()
        if not include_resolved and not status_filter:
            def _s(q):
                if camp_id:
                    q = q.eq("camp_id", camp_id)
                if squad_id:
                    q = q.eq("squad_id", squad_id)
                return q
            pending = _s(sb.table("badge_requests").select("*")).eq("status", "pending").order("created_at", desc=False).execute().data or []
            cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=resolved_ttl_days)).isoformat()
            resolved = _s(sb.table("badge_requests").select("*")).neq("status", "pending").gte("resolved_at", cutoff).order("created_at", desc=False).execute().data or []
            rows = pending + resolved
        else:
            q = sb.table("badge_requests").select("*")
            if camp_id:
                q = q.eq("camp_id", camp_id)
            if squad_id:
                q = q.eq("squad_id", squad_id)
            if status_filter:
                q = q.eq("status", status_filter)
            rows = q.order("created_at", desc=False).execute().data or []
        return [_row_to_badge_request(r) for r in rows]

    def delete_resolved(self, older_than_days: int) -> int:
        """SQL DELETE resolved badge_requests older than N days. Returns deleted count. Added M5-R5-A."""
        import datetime
        sb = _client()
        cutoff = (datetime.datetime.now(datetime.timezone.utc)
                  - datetime.timedelta(days=older_than_days)).isoformat()
        result = (sb.table("badge_requests")
                    .delete()
                    .in_("status", ["approved", "rejected"])
                    .lt("resolved_at", cutoff)
                    .execute())
        return len(result.data or [])


def _row_to_badge_request(r: dict) -> dict:
    """Convert DB row to nested requestedBy/resolvedBy dict. Fixed in M5-R4-A."""
    res_dev = r.get("resolved_by_device_id") or ""
    return {
        "id": r.get("id", ""),
        "campId": r.get("camp_id") or "",
        "squadId": r.get("squad_id") or "",
        "levelId": r.get("level_id", ""),
        "badgeTitle": r.get("badge_title") or "",
        "evidence": r.get("evidence") or {},
        "status": r.get("status", "pending"),
        "createdAt": _ts(r.get("created_at")),
        "requestedBy": {
            "deviceId": r.get("requested_by_device_id") or "",
            "nickname": r.get("requested_by_nickname") or "",
        },
        "resolvedAt": _ts(r.get("resolved_at")),
        "resolvedBy": {"deviceId": res_dev, "role": r.get("resolved_by_role") or ""} if res_dev else None,
        "resolutionNote": r.get("resolution_note") or "",
    }


def _badge_request_to_row(req: dict) -> dict:
    """Convert nested requestedBy/resolvedBy dict to DB row. Fixed in M5-R4-A."""
    rb = req.get("requestedBy") or {}
    res_b = req.get("resolvedBy") or {}
    row = {
        "id": req.get("id") or uuid.uuid4().hex[:12],
        "level_id": req.get("levelId", ""),
        "evidence": req.get("evidence") or {},
        "status": req.get("status", "pending"),
        "requested_by_device_id": rb.get("deviceId") or req.get("requestedByDeviceId", ""),
    }
    if req.get("campId"):
        row["camp_id"] = req["campId"]
    if req.get("squadId"):
        row["squad_id"] = req["squadId"]
    if req.get("badgeTitle"):
        row["badge_title"] = req["badgeTitle"]
    nick = rb.get("nickname") or req.get("requestedByNickname") or ""
    if nick:
        row["requested_by_nickname"] = nick
    if req.get("resolvedAt"):
        row["resolved_at"] = req["resolvedAt"]
    res_dev = res_b.get("deviceId") or req.get("resolvedByDeviceId", "")
    if res_dev:
        row["resolved_by_device_id"] = res_dev
    res_role = res_b.get("role") or req.get("resolvedByRole", "")
    if res_role:
        row["resolved_by_role"] = res_role
    if req.get("resolutionNote"):
        row["resolution_note"] = req["resolutionNote"]
    return row


# ---------------------------------------------------------------------------
# BadgePlansStore — таблица badge_plans
# ---------------------------------------------------------------------------

class SupabaseBadgePlansStore(BadgePlansStore):
    """
    Формат load(): {'plans': [...]}
    """

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("badge_plans").select("*").order("created_at", desc=False).execute().data or []
        plans = [_row_to_badge_plan(r) for r in rows]
        return {"plans": plans}

    def save(self, data: dict) -> None:
        sb = _client()
        for plan in (data.get("plans") or []):
            if not isinstance(plan, dict):
                continue
            sb.table("badge_plans").upsert(_badge_plan_to_row(plan)).execute()


def _row_to_badge_plan(r: dict) -> dict:
    return {
        "id": str(r.get("id", "")),
        "deviceId": r.get("device_id", ""),
        "campId": r.get("camp_id") or "",
        "badgeId": r.get("badge_id", ""),
        "levelId": r.get("level_id") or "",
        "planText": r.get("plan_text") or "",
        "checklist": r.get("checklist") or [],
        "status": r.get("status", "draft"),
        "counselorNote": r.get("counselor_note") or None,
        "createdAt": _ts(r.get("created_at")),
        "updatedAt": _ts(r.get("updated_at")),
    }


def _badge_plan_to_row(plan: dict) -> dict:
    row = {
        "id": plan.get("id") or str(uuid.uuid4()),
        "device_id": plan.get("deviceId", ""),
        "badge_id": plan.get("badgeId", ""),
        "status": plan.get("status", "draft"),
        "plan_text": plan.get("planText") or "",
        "checklist": plan.get("checklist") or [],
    }
    if plan.get("campId"):
        row["camp_id"] = plan["campId"]
    if plan.get("levelId"):
        row["level_id"] = plan["levelId"]
    if plan.get("counselorNote"):
        row["counselor_note"] = plan["counselorNote"]
    if plan.get("updatedAt"):
        row["updated_at"] = plan["updatedAt"]
    return row


# ---------------------------------------------------------------------------
# ParentSnapshotsStore — таблица parent_snapshots
# ---------------------------------------------------------------------------

class SupabaseParentSnapshotsStore(ParentSnapshotsStore):
    """
    Формат load(): {code: {payload, expiresAt, createdAt, createdByDeviceId}}
    """

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("parent_snapshots").select("*").execute().data or []
        result = {}
        for r in rows:
            code = r.get("code", "")
            if code:
                # API expects integer timestamp for expiresAt
                exp_ts = r.get("expires_at")
                exp_int = 0
                if exp_ts:
                    try:
                        exp_int = int(datetime.fromisoformat(str(exp_ts).replace("Z", "+00:00")).timestamp())
                    except Exception:
                        pass
                result[code] = {
                    "payload": r.get("payload") or {},
                    "expiresAt": exp_int,
                    "createdAt": _ts(r.get("created_at")),
                    "createdByDeviceId": r.get("created_by_device_id") or "",
                }
        return result

    def save(self, data: dict) -> None:
        sb = _client()
        rows = []
        for code, snap in data.items():
            if not isinstance(snap, dict):
                continue
            expires_at = snap.get("expiresAt")
            if isinstance(expires_at, int):
                # Convert int epoch to ISO string for Postgres TIMESTAMPTZ
                expires_at = datetime.fromtimestamp(expires_at, timezone.utc).isoformat()
            row = {
                "code": code,
                "payload": snap.get("payload") or {},
                "expires_at": expires_at,
            }
            if snap.get("createdByDeviceId"):
                row["created_by_device_id"] = snap["createdByDeviceId"]
            rows.append(row)
            
        if not rows:
            return
            
        try:
            chunk_size = 50
            for i in range(0, len(rows), chunk_size):
                chunk = rows[i:i + chunk_size]
                sb.table("parent_snapshots").upsert(chunk).execute()
        except Exception:
            raise


# ---------------------------------------------------------------------------
# ChatDailyUsageStore — таблица chat_daily_usage
# ---------------------------------------------------------------------------

class SupabaseChatDailyUsageStore(ChatDailyUsageStore):
    """
    Формат load(): {'YYYY-MM-DD': {device_id: count}}
    Совместим с app.py логикой _check_and_inc_chat_daily().
    """

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("chat_daily_usage").select("*").execute().data or []
        result: dict = {}
        for r in rows:
            day = str(r.get("day", ""))
            device_id = r.get("device_id", "")
            count = r.get("count", 0)
            if day and device_id:
                if day not in result:
                    result[day] = {}
                result[day][device_id] = count
        return result

    def save(self, data: dict) -> None:
        sb = _client()
        rows = []
        for day, counts in data.items():
            if not isinstance(counts, dict):
                continue
            for device_id, count in counts.items():
                rows.append({
                    "device_id": device_id,
                    "day": str(day),
                    "count": count
                })
                
        if not rows:
            return
            
        try:
            chunk_size = 50
            for i in range(0, len(rows), chunk_size):
                chunk = rows[i:i + chunk_size]
                sb.table("chat_daily_usage").upsert(chunk).execute()
        except Exception:
            raise


# ---------------------------------------------------------------------------
# CouncilInitiativesStore — таблица council_initiatives
# ---------------------------------------------------------------------------

class SupabaseCouncilInitiativesStore(CouncilInitiativesStore):
    """
    Формат load(): {'initiatives': [...]}
    Возвращает последние 100 инициатив в обратном хронологическом порядке.
    """

    def load(self) -> dict:
        sb = _client()
        rows = (
            sb.table("council_initiatives")
            .select("*")
            .order("created_at", desc=True)
            .limit(100)
            .execute()
            .data or []
        )
        initiatives = [_row_to_initiative(r) for r in rows]
        return {"initiatives": initiatives}

    def save(self, data: dict) -> None:
        sb = _client()
        for item in (data.get("initiatives") or []):
            if not isinstance(item, dict):
                continue
            sb.table("council_initiatives").upsert(_initiative_to_row(item)).execute()


def _row_to_initiative(r: dict) -> dict:
    return {
        "id": r.get("id", ""),
        "campId": r.get("camp_id") or "",
        "title": r.get("title", ""),
        "status": r.get("status", "idea"),
        "createdAt": _ts(r.get("created_at")),
        "createdBy": r.get("created_by") or "",
        "createdByNickname": r.get("created_by_nickname") or "",
    }


def _initiative_to_row(item: dict) -> dict:
    row = {
        "id": item.get("id") or uuid.uuid4().hex[:12],
        "title": item.get("title", ""),
        "status": item.get("status", "idea"),
    }
    if item.get("campId"):
        row["camp_id"] = item["campId"]
    if item.get("createdBy"):
        row["created_by"] = item["createdBy"]
    if item.get("createdByNickname"):
        row["created_by_nickname"] = item["createdByNickname"]
    return row


# ---------------------------------------------------------------------------
# CouncilMembersStore — таблица council_members
# ---------------------------------------------------------------------------

class SupabaseCouncilMembersStore(CouncilMembersStore):
    def load(self) -> dict:
        sb = _client()
        try:
            rows = sb.table("council_members").select("*").order("joined_at", desc=True).execute().data or []
        except Exception as exc:
            if _is_missing_table_error(exc):
                return {"members": []}
            raise
        members = []
        for r in rows:
            members.append({
                "id": r.get("id", ""),
                "nickname": r.get("nickname", ""),
                "role": r.get("role", "member"),
                "deviceId": r.get("device_id", ""),
                "joinedAt": _ts(r.get("joined_at")),
                "addedBy": r.get("added_by", ""),
            })
        return {"members": members}

    def save(self, data: dict) -> None:
        sb = _client()
        for m in (data.get("members") or []):
            if not isinstance(m, dict):
                continue
            row = {
                "id": m.get("id") or str(uuid.uuid4()),
                "nickname": m.get("nickname", ""),
                "role": m.get("role", "member"),
                "device_id": m.get("deviceId", ""),
                "joined_at": m.get("joinedAt") or None,
                "added_by": m.get("addedBy", ""),
            }
            try:
                sb.table("council_members").upsert(row).execute()
            except Exception as exc:
                if _is_missing_table_error(exc):
                    return
                raise


# ---------------------------------------------------------------------------
# CouncilProtocolsStore — таблица council_protocols
# ---------------------------------------------------------------------------

class SupabaseCouncilProtocolsStore(CouncilProtocolsStore):
    def load(self) -> dict:
        sb = _client()
        try:
            rows = sb.table("council_protocols").select("*").order("date", desc=True).execute().data or []
        except Exception as exc:
            if _is_missing_table_error(exc):
                return {"protocols": []}
            raise
        protocols = []
        for r in rows:
            protocols.append({
                "id": r.get("id", ""),
                "title": r.get("title", ""),
                "date": r.get("date", ""),
                "summary": r.get("summary", ""),
                "decisions": r.get("decisions") or [],
                "participants": r.get("participants") or [],
                "createdBy": r.get("created_by", ""),
                "createdByNickname": r.get("created_by_nickname", ""),
                "createdAt": _ts(r.get("created_at")),
                "updatedAt": _ts(r.get("updated_at")),
            })
        return {"protocols": protocols}

    def save(self, data: dict) -> None:
        sb = _client()
        for p in (data.get("protocols") or []):
            if not isinstance(p, dict):
                continue
            row = {
                "id": p.get("id") or str(uuid.uuid4()),
                "title": p.get("title", ""),
                "date": p.get("date", ""),
                "summary": p.get("summary", ""),
                "decisions": p.get("decisions") or [],
                "participants": p.get("participants") or [],
                "created_by": p.get("createdBy", ""),
                "created_by_nickname": p.get("createdByNickname", ""),
            }
            if p.get("createdAt"):
                row["created_at"] = p["createdAt"]
            if p.get("updatedAt"):
                row["updated_at"] = p["updatedAt"]
            try:
                sb.table("council_protocols").upsert(row).execute()
            except Exception as exc:
                if _is_missing_table_error(exc):
                    return
                raise


# ---------------------------------------------------------------------------
# TeamsStore — таблица teams
# ---------------------------------------------------------------------------

class SupabaseTeamsStore(TeamsStore):
    """
    Формат load(): {team_id: team_doc}
    """

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("teams").select("*").execute().data or []
        result = {}
        for r in rows:
            tid = r.get("id")
            if not tid:
                continue
            result[tid] = {
                "id": tid,
                "name": r.get("name") or "",
                "motto": r.get("motto") or "",
                "logo": r.get("logo") or "🚀",
                "leaderId": r.get("leader_id") or "",
                "members": r.get("members_json") or [],
                "createdAt": _ts(r.get("created_at")),
                "achievements": r.get("achievements_json") or [],
                "goals": r.get("goals_json") or [],
                "planGridA": r.get("plan_grid_a") or None,
                "planGridB": r.get("plan_grid_b") or None,
                "flagImage": r.get("flag_image") or None,
                "gerbImage": r.get("gerb_image") or None,
                "scope": r.get("scope") or "camp",
                "shiftId": r.get("shift_id") or None,
                "squadId": r.get("squad_id") or None,
            }
        return result

    def save(self, data: dict) -> None:
        sb = _client()
        if not isinstance(data, dict):
            return
        for team_id, t in data.items():
            if not isinstance(t, dict):
                continue
            row = {
                "id": team_id,
                "name": t.get("name") or "",
                "motto": t.get("motto") or "",
                "logo": t.get("logo") or "🚀",
                "leader_id": t.get("leaderId") or "",
                "members_json": t.get("members") or [],
                "achievements_json": t.get("achievements") or [],
                "goals_json": t.get("goals") or [],
                "plan_grid_a": t.get("planGridA") or None,
                "plan_grid_b": t.get("planGridB") or None,
                "flag_image": t.get("flagImage") or None,
                "gerb_image": t.get("gerbImage") or None,
                "scope": t.get("scope") or "camp",
                "shift_id": t.get("shiftId") or None,
                "squad_id": t.get("squadId") or None,
            }
            sb.table("teams").upsert(row).execute()


# ---------------------------------------------------------------------------
# Вспомогательные функции
# ---------------------------------------------------------------------------

def _ts(value) -> str:
    """Нормализовать timestamp из Supabase в ISO string."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


# ---------------------------------------------------------------------------
# BadgeArtsStore — таблица badge_arts (M9-ART-MODERATION-A)
# ---------------------------------------------------------------------------

class SupabaseBadgeArtsStore(BadgeArtsStore):
    """
    Формат load(): {'arts': [...]}
    """

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("badge_arts").select("*").order("created_at", desc=False).execute().data or []
        arts = [_row_to_badge_art(r) for r in rows]
        return {"arts": arts}

    def save(self, data: dict) -> None:
        sb = _client()
        for art in (data.get("arts") or []):
            if not isinstance(art, dict):
                continue
            sb.table("badge_arts").upsert(_badge_art_to_row(art)).execute()


def _row_to_badge_art(r: dict) -> dict:
    return {
        "id": str(r.get("id", "")),
        "deviceId": r.get("device_id", ""),
        "badgeId": r.get("badge_id", ""),
        "imageUrl": r.get("image_url", ""),
        "source": r.get("source", "uploaded"),
        "status": r.get("status", "pending"),
        "moderatorNote": r.get("moderator_note") or None,
        "authorNickname": r.get("author_nickname", ""),
        "createdAt": _ts(r.get("created_at")),
        "updatedAt": _ts(r.get("updated_at")),
    }


def _badge_art_to_row(art: dict) -> dict:
    row = {
        "id": art.get("id") or str(uuid.uuid4()),
        "device_id": art.get("deviceId", ""),
        "badge_id": art.get("badgeId", ""),
        "image_url": art.get("imageUrl", ""),
        "source": art.get("source", "uploaded"),
        "status": art.get("status", "pending"),
    }
    if art.get("moderatorNote"):
        row["moderator_note"] = art["moderatorNote"]
    if art.get("authorNickname"):
        row["author_nickname"] = art["authorNickname"]
    if art.get("updatedAt"):
        row["updated_at"] = art["updatedAt"]
    return row


# ---------------------------------------------------------------------------
# EnginesStore + EngineMembersStore (M11-DVIZHKI-BACKEND-A)
# ---------------------------------------------------------------------------

class SupabaseEnginesStore(EnginesStore):
    def load(self) -> dict:
        sb = _client()
        rows = sb.table("engines").select("*").order("created_at", desc=False).execute().data or []
        engines = []
        for r in rows:
            engines.append({
                "id": str(r.get("id", "")),
                "squadId": r.get("squad_id", ""),
                "title": r.get("title", ""),
                "avatarUrl": r.get("avatar_url", ""),
                "goal": r.get("goal", ""),
                "goalStatus": r.get("goal_status", "draft"),
                "createdBy": r.get("created_by", ""),
                "status": r.get("status", "pending"),
                "createdAt": _ts(r.get("created_at")),
                "updatedAt": _ts(r.get("updated_at")),
            })
        return {"engines": engines}

    def save(self, data: dict) -> None:
        sb = _client()
        for eng in (data.get("engines") or []):
            if not isinstance(eng, dict):
                continue
            row = {
                "id": eng.get("id") or str(uuid.uuid4()),
                "squad_id": eng.get("squadId", ""),
                "title": eng.get("title", ""),
                "status": eng.get("status", "pending"),
            }
            if eng.get("goal"): row["goal"] = eng["goal"]
            if eng.get("goalStatus"): row["goal_status"] = eng["goalStatus"]
            if eng.get("avatarUrl"): row["avatar_url"] = eng["avatarUrl"]
            if eng.get("createdBy"): row["created_by"] = eng["createdBy"]
            if eng.get("updatedAt"): row["updated_at"] = eng["updatedAt"]
            sb.table("engines").upsert(row).execute()


class SupabaseEngineMembersStore(EngineMembersStore):
    def load(self) -> dict:
        sb = _client()
        rows = sb.table("engine_members").select("*").order("joined_at", desc=False).execute().data or []
        members = []
        for r in rows:
            members.append({
                "id": str(r.get("id", "")),
                "engineId": r.get("engine_id", ""),
                "deviceId": r.get("device_id", ""),
                "nickname": r.get("nickname", ""),
                "role": r.get("role", "member"),
                "joinedAt": _ts(r.get("joined_at")),
            })
        return {"members": members}

    def save(self, data: dict) -> None:
        sb = _client()
        for m in (data.get("members") or []):
            if not isinstance(m, dict):
                continue
            row = {
                "id": m.get("id") or str(uuid.uuid4()),
                "engine_id": m.get("engineId", ""),
                "device_id": m.get("deviceId", ""),
                "nickname": m.get("nickname", ""),
                "role": m.get("role", "member"),
            }
            sb.table("engine_members").upsert(row).execute()


# ---------------------------------------------------------------------------
# InspectorProgressStore (M11-INSPECTOR-C)
# ---------------------------------------------------------------------------

class SupabaseInspectorProgressStore(InspectorProgressStore):
    def load(self) -> dict:
        sb = _client()
        rows = sb.table("inspector_progress").select("*").order("completed_at", desc=False).execute().data or []
        progress = []
        for r in rows:
            progress.append({
                "id": str(r.get("id", "")),
                "deviceId": r.get("device_id", ""),
                "checklistId": r.get("checklist_id", ""),
                "taskId": r.get("task_id", ""),
                "status": r.get("status", "completed"),
                "completedAt": _ts(r.get("completed_at")),
                "approvedBy": r.get("approved_by") or None,
                "approvedAt": _ts(r.get("approved_at")) if r.get("approved_at") else None,
            })
        return {"progress": progress}

    def save(self, data: dict) -> None:
        sb = _client()
        for entry in (data.get("progress") or []):
            if not isinstance(entry, dict):
                continue
            row = {
                "id": entry.get("id") or str(uuid.uuid4()),
                "device_id": entry.get("deviceId", ""),
                "checklist_id": entry.get("checklistId", ""),
                "task_id": entry.get("taskId", ""),
                "status": entry.get("status", "completed"),
            }
            if entry.get("approvedBy"):
                row["approved_by"] = entry["approvedBy"]
            if entry.get("approvedAt"):
                row["approved_at"] = entry["approvedAt"]
            sb.table("inspector_progress").upsert(row).execute()


# ---------------------------------------------------------------------------
# BroEventsStore (M12-BRO-BACKEND-A)
# ---------------------------------------------------------------------------

class SupabaseBroEventsStore(BroEventsStore):
    def load(self) -> dict:
        sb = _client()
        rows = sb.table("bro_events").select("*").order("created_at", desc=False).execute().data or []
        events = []
        for r in rows:
            events.append({
                "id": str(r.get("id", "")),
                "squadId": r.get("squad_id", ""),
                "initiatedBy": r.get("initiated_by", ""),
                "status": r.get("status", "active"),
                "createdAt": _ts(r.get("created_at")),
            })
        return {"events": events}

    def save(self, data: dict) -> None:
        sb = _client()
        for ev in (data.get("events") or []):
            if not isinstance(ev, dict):
                continue
            row = {
                "id": ev.get("id") or str(uuid.uuid4()),
                "squad_id": ev.get("squadId", ""),
                "initiated_by": ev.get("initiatedBy", ""),
                "status": ev.get("status", "active"),
            }
            sb.table("bro_events").upsert(row).execute()


# ---------------------------------------------------------------------------
# BroPassportsStore (M12-BRO-BACKEND-A)
# ---------------------------------------------------------------------------

class SupabaseBroPassportsStore(BroPassportsStore):
    def load(self) -> dict:
        sb = _client()
        rows = sb.table("bro_passports").select("*").order("created_at", desc=False).execute().data or []
        passports = []
        for r in rows:
            passports.append({
                "id": str(r.get("id", "")),
                "deviceId": r.get("device_id", ""),
                "broEventId": r.get("bro_event_id", ""),
                "tasks": r.get("tasks") or [],
                "status": r.get("status", "in_progress"),
                "completedAt": _ts(r.get("completed_at")) if r.get("completed_at") else None,
                "createdAt": _ts(r.get("created_at")),
            })
        return {"passports": passports}

    def save(self, data: dict) -> None:
        sb = _client()
        for p in (data.get("passports") or []):
            if not isinstance(p, dict):
                continue
            row = {
                "id": p.get("id") or str(uuid.uuid4()),
                "device_id": p.get("deviceId", ""),
                "bro_event_id": p.get("broEventId", ""),
                "tasks": json.dumps(p.get("tasks") or []),
                "status": p.get("status", "in_progress"),
            }
            if p.get("completedAt"):
                row["completed_at"] = p["completedAt"]
            sb.table("bro_passports").upsert(row).execute()


# ---------------------------------------------------------------------------
# ShiftScheduleStore (M12-SHIFT-PLANNER-A)
# ---------------------------------------------------------------------------

class SupabaseShiftScheduleStore(ShiftScheduleStore):
    def load(self) -> dict:
        sb = _client()
        rows = sb.table("shift_schedule_events").select("*").order("day_index").order("time_start").execute().data or []
        events = []
        for r in rows:
            events.append({
                "id": str(r.get("id", "")),
                "shiftId": r.get("shift_id", ""),
                "dayIndex": r.get("day_index", 0),
                "timeStart": r.get("time_start", ""),
                "timeEnd": r.get("time_end") or "",
                "title": r.get("title", ""),
                "description": r.get("description") or "",
                "type": r.get("type", "event"),
                "responsibleId": r.get("responsible_id") or "",
                "responsibleName": r.get("responsible_name") or "",
                "workshopId": r.get("workshop_id") or "",
                "createdAt": _ts(r.get("created_at")),
            })
        return {"events": events}

    def save(self, data: dict) -> None:
        sb = _client()
        for ev in (data.get("events") or []):
            if not isinstance(ev, dict):
                continue
            row = {
                "id": ev.get("id") or str(uuid.uuid4()),
                "shift_id": ev.get("shiftId", ""),
                "day_index": ev.get("dayIndex", 0),
                "time_start": ev.get("timeStart", ""),
                "time_end": ev.get("timeEnd") or None,
                "title": ev.get("title", ""),
                "description": ev.get("description") or "",
                "type": ev.get("type", "event"),
                "responsible_id": ev.get("responsibleId") or None,
                "responsible_name": ev.get("responsibleName") or "",
                "workshop_id": ev.get("workshopId") or None,
            }
            sb.table("shift_schedule_events").upsert(row).execute()


# ---------------------------------------------------------------------------
# SupabaseWorkshopsStore (M13-EDUCATOR-WORKSHOP-A)
# ---------------------------------------------------------------------------

class SupabaseWorkshopsStore(WorkshopsStore):
    """Supabase-провайдер для 4 таблиц workshops/participants/badges/confirmations."""

    def _row_to_workshop(self, r: dict) -> dict:
        return {
            "id": r.get("id", ""),
            "educatorId": r.get("educator_id", ""),
            "title": r.get("title", ""),
            "direction": r.get("direction", ""),
            "createdAt": r.get("created_at", ""),
        }

    def _row_to_participant(self, r: dict) -> dict:
        return {
            "id": r.get("id", ""),
            "workshopId": r.get("workshop_id", ""),
            "deviceId": r.get("device_id", ""),
            "nickname": r.get("nickname", ""),
            "joinedAt": r.get("joined_at", ""),
        }

    def _row_to_badge(self, r: dict) -> dict:
        return {
            "id": r.get("id", ""),
            "workshopId": r.get("workshop_id", ""),
            "badgeId": r.get("badge_id", ""),
            "addedBy": r.get("added_by", ""),
        }

    def _row_to_confirmation(self, r: dict) -> dict:
        return {
            "id": r.get("id", ""),
            "workshopBadgeId": r.get("workshop_badge_id", ""),
            "deviceId": r.get("device_id", ""),
            "status": r.get("status", "pending"),
            "confirmedAt": r.get("confirmed_at"),
            "confirmedBy": r.get("confirmed_by"),
        }

    def load(self) -> dict:
        sb = _client()
        w_rows = sb.table("workshops").select("*").execute().data or []
        p_rows = sb.table("workshop_participants").select("*").execute().data or []
        b_rows = sb.table("workshop_badges").select("*").execute().data or []
        c_rows = sb.table("workshop_badge_confirmations").select("*").execute().data or []
        return {
            "workshops": [self._row_to_workshop(r) for r in w_rows],
            "participants": [self._row_to_participant(r) for r in p_rows],
            "badges": [self._row_to_badge(r) for r in b_rows],
            "confirmations": [self._row_to_confirmation(r) for r in c_rows],
        }

    def save(self, data: dict) -> None:
        sb = _client()
        for w in (data.get("workshops") or []):
            if not isinstance(w, dict):
                continue
            row = {
                "id": w.get("id") or str(uuid.uuid4()),
                "educator_id": w.get("educatorId", ""),
                "title": w.get("title", ""),
                "direction": w.get("direction", ""),
            }
            sb.table("workshops").upsert(row).execute()
        for p in (data.get("participants") or []):
            if not isinstance(p, dict):
                continue
            row = {
                "id": p.get("id") or str(uuid.uuid4()),
                "workshop_id": p.get("workshopId", ""),
                "device_id": p.get("deviceId", ""),
                "nickname": p.get("nickname", ""),
            }
            sb.table("workshop_participants").upsert(row).execute()
        for b in (data.get("badges") or []):
            if not isinstance(b, dict):
                continue
            row = {
                "id": b.get("id") or str(uuid.uuid4()),
                "workshop_id": b.get("workshopId", ""),
                "badge_id": b.get("badgeId", ""),
                "added_by": b.get("addedBy", ""),
            }
            sb.table("workshop_badges").upsert(row).execute()
        for c in (data.get("confirmations") or []):
            if not isinstance(c, dict):
                continue
            row = {
                "id": c.get("id") or str(uuid.uuid4()),
                "workshop_badge_id": c.get("workshopBadgeId", ""),
                "device_id": c.get("deviceId", ""),
                "status": c.get("status", "pending"),
                "confirmed_at": c.get("confirmedAt"),
                "confirmed_by": c.get("confirmedBy"),
            }
            sb.table("workshop_badge_confirmations").upsert(row).execute()


# ---------------------------------------------------------------------------
# SupabaseParentSuggestionsStore (M14-PARENT-AUTH-A)
# ---------------------------------------------------------------------------

class SupabaseParentSuggestionsStore(ParentSuggestionsStore):
    def _row_to_suggestion(self, r: dict) -> dict:
        return {
            "id": r.get("id", ""),
            "parentId": r.get("parent_id", ""),
            "childDeviceId": r.get("child_device_id", ""),
            "badges": r.get("badges") or [],
            "note": r.get("note", ""),
            "status": r.get("status", "suggested"),
            "createdAt": r.get("created_at", ""),
        }

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("parent_suggestions").select("*").execute().data or []
        return {"suggestions": [self._row_to_suggestion(r) for r in rows]}

    def save(self, data: dict) -> None:
        sb = _client()
        for s in (data.get("suggestions") or []):
            if not isinstance(s, dict):
                continue
            row = {
                "id": s.get("id") or str(uuid.uuid4()),
                "parent_id": s.get("parentId", ""),
                "child_device_id": s.get("childDeviceId", ""),
                "badges": json.dumps(s.get("badges") or []),
                "note": s.get("note", ""),
                "status": s.get("status", "suggested"),
            }
            sb.table("parent_suggestions").upsert(row).execute()


# ---------------------------------------------------------------------------
# SupabaseUsersStore (M15-AUTH-BACKEND-A)
# ---------------------------------------------------------------------------

class SupabaseUsersStore(UsersStore):
    def _row_to_user(self, r: dict) -> dict:
        return {
            "id": r.get("id", ""),
            "supabase_auth_id": r.get("supabase_auth_id"),
            "legacy_device_id": r.get("legacy_device_id", ""),
            "email": r.get("email", ""),
            "nickname": r.get("nickname", ""),
            "avatar_url": r.get("avatar_url", ""),
            "role": r.get("role", "participant"),
            "createdAt": r.get("created_at", ""),
            "updatedAt": r.get("updated_at", ""),
        }

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("users").select("*").execute().data or []
        return {"users": [self._row_to_user(r) for r in rows]}

    def save(self, data: dict) -> None:
        sb = _client()
        rows = []
        for u in (data.get("users") or []):
            if isinstance(u, dict):
                row = {
                    "id": u.get("id") or str(uuid.uuid4()),
                    "supabase_auth_id": u.get("supabase_auth_id"),
                    "legacy_device_id": u.get("legacy_device_id", ""),
                    "email": u.get("email", ""),
                    "nickname": u.get("nickname", ""),
                    "avatar_url": u.get("avatar_url", ""),
                    "role": u.get("role", "participant"),
                }
                rows.append(row)
                
        if not rows:
            return
            
        try:
            chunk_size = 50
            for i in range(0, len(rows), chunk_size):
                chunk = rows[i:i + chunk_size]
                sb.table("users").upsert(chunk).execute()
        except Exception:
            raise


# ---------------------------------------------------------------------------
# SupabaseWorkshopProposalsStore (Constructor pipeline)
# ---------------------------------------------------------------------------

class SupabaseWorkshopProposalsStore(WorkshopProposalsStore):
    """
    Формат load(): {'proposals': [...]}
    Таблица: workshop_proposals
    """

    def load(self) -> dict:
        sb = _client()
        try:
            rows = sb.table("workshop_proposals").select("*").order("created_at", desc=False).execute().data or []
        except Exception as exc:
            if _is_missing_table_error(exc):
                return {"proposals": []}
            raise
        proposals = [self._row_to_proposal(r) for r in rows]
        return {"proposals": proposals}

    def save(self, data: dict) -> None:
        sb = _client()
        rows = []
        for p in (data.get("proposals") or []):
            if isinstance(p, dict):
                rows.append(self._proposal_to_row(p))

        if not rows:
            return

        try:
            # Batch upsert in chunks to avoid URL too long or payload too large
            chunk_size = 50
            for i in range(0, len(rows), chunk_size):
                chunk = rows[i:i + chunk_size]
                sb.table("workshop_proposals").upsert(chunk).execute()
        except Exception as exc:
            if _is_missing_table_error(exc):
                return
            raise

    @staticmethod
    def _row_to_proposal(r: dict) -> dict:
        cb = r.get("created_by_device_id") or ""
        rb_dev = r.get("resolved_by_device_id") or ""
        return {
            "id": str(r.get("id", "")),
            "type": r.get("type", "badge"),
            "title": r.get("title", ""),
            "description": r.get("description") or "",
            "emoji": r.get("emoji") or None,
            "badgeId": r.get("badge_id") or None,
            "image": r.get("image") or None,
            "status": r.get("status", "pending"),
            "createdBy": {"deviceId": cb, "nickname": r.get("created_by_nickname") or ""},
            "campId": r.get("camp_id") or "",
            "squadId": r.get("squad_id") or None,
            "createdAt": _ts(r.get("created_at")),
            "resolvedAt": _ts(r.get("resolved_at")) if r.get("resolved_at") else None,
            "resolvedBy": {"deviceId": rb_dev, "role": r.get("resolved_by_role") or ""} if rb_dev else None,
            "resolutionNote": r.get("resolution_note") or None,
        }

    @staticmethod
    def _proposal_to_row(p: dict) -> dict:
        cb = p.get("createdBy") or {}
        rb = p.get("resolvedBy") or {}
        row = {
            "id": p.get("id") or str(uuid.uuid4()),
            "type": p.get("type", "badge"),
            "title": p.get("title", ""),
            "status": p.get("status", "pending"),
        }
        if p.get("description"):
            row["description"] = p["description"]
        if p.get("emoji"):
            row["emoji"] = p["emoji"]
        if p.get("badgeId"):
            row["badge_id"] = p["badgeId"]
        if p.get("image"):
            row["image"] = p["image"]
        if cb.get("deviceId"):
            row["created_by_device_id"] = cb["deviceId"]
        if cb.get("nickname"):
            row["created_by_nickname"] = cb["nickname"]
        if p.get("campId"):
            row["camp_id"] = p["campId"]
        if p.get("squadId"):
            row["squad_id"] = p["squadId"]
        if p.get("resolvedAt"):
            row["resolved_at"] = p["resolvedAt"]
        if rb.get("deviceId"):
            row["resolved_by_device_id"] = rb["deviceId"]
        if rb.get("role"):
            row["resolved_by_role"] = rb["role"]
        if p.get("resolutionNote"):
            row["resolution_note"] = p["resolutionNote"]
        return row


# ---------------------------------------------------------------------------
# RoleRequestsStore — таблица role_requests (M19-ROLE-REQUESTS)
# ---------------------------------------------------------------------------

class SupabaseRoleRequestsStore(RoleRequestsStore):
    """
    Формат load(): list of {id, deviceId, desiredRole, name, comment, status, createdAt, email?, accessToken?}
    """

    _logger = logging.getLogger("storage.role_requests")

    def load(self) -> list:
        try:
            sb = _client()
            rows = sb.table("role_requests").select("*").order("created_at", desc=False).execute().data or []
            return [self._row_to_rr(r) for r in rows]
        except Exception as exc:
            self._logger.warning("load() failed: %s", exc)
            return []

    def save(self, data: list) -> None:
        try:
            sb = _client()
        except Exception as exc:
            self._logger.warning("save() — cannot get client: %s", exc)
            return
            
        rows = []
        for rr in (data or []):
            if isinstance(rr, dict):
                rows.append(self._rr_to_row(rr))
                
        if not rows:
            return
            
        try:
            chunk_size = 50
            for i in range(0, len(rows), chunk_size):
                chunk = rows[i:i + chunk_size]
                sb.table("role_requests").upsert(chunk).execute()
        except Exception as exc:
            self._logger.warning("save() upsert failed: %s", exc)

    @staticmethod
    def _row_to_rr(r: dict) -> dict:
        return {
            "id": r.get("id", ""),
            "deviceId": r.get("device_id", ""),
            "desiredRole": r.get("desired_role", ""),
            "name": r.get("name") or "",
            "comment": r.get("comment") or "",
            "status": r.get("status", "pending"),
            "createdAt": _ts(r.get("created_at")),
            "email": r.get("email") or None,
            "accessToken": r.get("access_token") or None,
        }

    @staticmethod
    def _rr_to_row(rr: dict) -> dict:
        row = {
            "id": rr.get("id") or uuid.uuid4().hex[:16],
            "device_id": rr.get("deviceId", ""),
            "desired_role": rr.get("desiredRole", ""),
            "name": rr.get("name") or "",
            "comment": rr.get("comment") or "",
            "status": rr.get("status", "pending"),
        }
        if rr.get("email"):
            row["email"] = rr["email"]
        if rr.get("accessToken"):
            row["access_token"] = rr["accessToken"]
        if rr.get("createdAt"):
            row["created_at"] = rr["createdAt"]
        return row


# ---------------------------------------------------------------------------
# Реестр экземпляров
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# SupabaseFamilyLinksStore (M20-PARENT-SQUAD)
# ---------------------------------------------------------------------------

class SupabaseFamilyLinksStore(FamilyLinksStore):
    """
    Хранилище семейных связей родитель ↔ ребёнок.
    Таблица: family_links
    """

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("family_links").select("*").order("created_at", desc=False).execute().data or []
        links = [self._row_to_link(r) for r in rows]
        return {"links": links}

    def save(self, data: dict) -> None:
        sb = _client()
        for lnk in (data.get("links") or []):
            if not isinstance(lnk, dict):
                continue
            sb.table("family_links").upsert(self._link_to_row(lnk)).execute()

    def get_by_parent(self, parent_device_id: str) -> list:
        sb = _client()
        rows = (
            sb.table("family_links")
            .select("*")
            .eq("parent_device_id", parent_device_id.strip())
            .order("created_at", desc=False)
            .execute()
            .data or []
        )
        return [self._row_to_link(r) for r in rows]

    def insert_link(self, link: dict) -> dict:
        sb = _client()
        row = self._link_to_row(link)
        result = sb.table("family_links").insert(row).execute()
        inserted = (result.data or [{}])[0]
        return self._row_to_link(inserted) if inserted else link

    def delete_link(self, parent_device_id: str, child_device_id: str) -> bool:
        sb = _client()
        result = (
            sb.table("family_links")
            .delete()
            .eq("parent_device_id", parent_device_id.strip())
            .eq("child_device_id", child_device_id.strip())
            .execute()
        )
        return bool(result.data)

    @staticmethod
    def _row_to_link(r: dict) -> dict:
        return {
            "id": str(r.get("id", "")),
            "parentDeviceId": r.get("parent_device_id", ""),
            "childDeviceId": r.get("child_device_id", ""),
            "label": r.get("label") or None,
            "createdAt": _ts(r.get("created_at")),
        }

    @staticmethod
    def _link_to_row(lnk: dict) -> dict:
        row = {
            "parent_device_id": lnk.get("parentDeviceId", ""),
            "child_device_id": lnk.get("childDeviceId", ""),
        }
        if lnk.get("id"):
            row["id"] = lnk["id"]
        if lnk.get("label"):
            row["label"] = lnk["label"]
        return row


# ---------------------------------------------------------------------------
# SupabaseBroInitiativesStore (BRO Initiatives / ОДэ)
# ---------------------------------------------------------------------------

class SupabaseBroInitiativesStore(BroInitiativesStore):
    """
    Формат load(): {'initiatives': [...]}
    Таблица: bro_initiatives
    """

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("bro_initiatives").select("*").order("created_at", desc=False).execute().data or []
        initiatives = []
        for r in rows:
            initiatives.append({
                "id": str(r.get("id", "")),
                "title": r.get("title", ""),
                "description": r.get("description", ""),
                "createdBy": r.get("created_by", ""),
                "createdAt": _ts(r.get("created_at")),
                "votes": r.get("votes_json") if isinstance(r.get("votes_json"), dict) else {},
                "status": r.get("status", "voting"),
            })
        return {"initiatives": initiatives}

    def save(self, data: dict) -> None:
        sb = _client()
        for ini in (data.get("initiatives") or []):
            if not isinstance(ini, dict):
                continue
            row = {
                "id": ini.get("id") or str(uuid.uuid4()),
                "title": ini.get("title", ""),
                "description": ini.get("description", ""),
                "created_by": ini.get("createdBy", ""),
                "status": ini.get("status", "voting"),
                "votes_json": ini.get("votes") if isinstance(ini.get("votes"), dict) else {},
            }
            sb.table("bro_initiatives").upsert(row).execute()


# ---------------------------------------------------------------------------
# SupabaseBroSubmissionsStore (BRO Task Submissions)
# ---------------------------------------------------------------------------

class SupabaseBroSubmissionsStore(BroSubmissionsStore):
    """
    Формат load(): {'submissions': [...]}
    Таблица: bro_submissions
    """

    def load(self) -> dict:
        sb = _client()
        rows = sb.table("bro_submissions").select("*").order("submitted_at", desc=False).execute().data or []
        submissions = []
        for r in rows:
            submissions.append({
                "id": str(r.get("id", "")),
                "passportId": r.get("passport_id", ""),
                "taskId": r.get("task_id", ""),
                "taskTitle": r.get("task_title", ""),
                "deviceId": r.get("device_id", ""),
                "squadId": r.get("squad_id", ""),
                "text": r.get("text", ""),
                "photoUrl": r.get("photo_url") or None,
                "nickname": r.get("nickname") or None,
                "userRole": r.get("user_role") or None,
                "status": r.get("status", "pending"),
                "comment": r.get("comment") or None,
                "submittedAt": _ts(r.get("submitted_at")),
                "reviewedAt": _ts(r.get("reviewed_at")) if r.get("reviewed_at") else None,
                "reviewedBy": r.get("reviewed_by") or None,
            })
        return {"submissions": submissions}

    def save(self, data: dict) -> None:
        sb = _client()
        rows = []
        for s in (data.get("submissions") or []):
            if isinstance(s, dict):
                row = {
                    "id": s.get("id") or str(uuid.uuid4()),
                    "passport_id": s.get("passportId", ""),
                    "task_id": s.get("taskId", ""),
                    "task_title": s.get("taskTitle", ""),
                    "device_id": s.get("deviceId", ""),
                    "squad_id": s.get("squadId", ""),
                    "text": s.get("text", ""),
                    "status": s.get("status", "pending"),
                }
                if s.get("photoUrl"):
                    row["photo_url"] = s["photoUrl"]
                if s.get("nickname"):
                    row["nickname"] = s["nickname"]
                if s.get("userRole"):
                    row["user_role"] = s["userRole"]
                if s.get("comment"):
                    row["comment"] = s["comment"]
                if s.get("reviewedAt"):
                    row["reviewed_at"] = s["reviewedAt"]
                if s.get("reviewedBy"):
                    row["reviewed_by"] = s["reviewedBy"]
                rows.append(row)
                
        if not rows:
            return
            
        try:
            chunk_size = 50
            for i in range(0, len(rows), chunk_size):
                chunk = rows[i:i + chunk_size]
                sb.table("bro_submissions").upsert(chunk).execute()
        except Exception:
            raise


# ---------------------------------------------------------------------------
# EngineJoinRequestsStore — kv_store fallback (no dedicated table)
# ---------------------------------------------------------------------------

class SupabaseEngineJoinRequestsStore(EngineJoinRequestsStore):
    """
    Stores engine join requests in the kv_store table
    (key = 'engine_join_requests', value = JSON blob).
    This avoids requiring a DB migration for a new feature.
    """
    _KEY = "engine_join_requests"

    def load(self) -> dict:
        sb = _client()
        try:
            rows = sb.table("kv_store").select("value").eq("key", self._KEY).execute().data or []
        except Exception:
            return {"requests": []}
        if rows:
            val = rows[0].get("value")
            if isinstance(val, dict):
                return val
            if isinstance(val, str):
                import json as _json
                try:
                    return _json.loads(val)
                except Exception:
                    pass
        return {"requests": []}

    def save(self, data: dict) -> None:
        sb = _client()
        try:
            sb.table("kv_store").upsert({"key": self._KEY, "value": data}).execute()
        except Exception:
            pass  # best-effort


class SupabaseEngineProjectsStore(EngineProjectsStore):
    def load(self) -> dict:
        sb = _client()
        try:
            rows = sb.table("engine_projects").select("*").execute().data or []
        except Exception as exc:
            if _is_missing_table_error(exc):
                return {"projects": []}
            raise
        projects = []
        for r in rows:
            projects.append({
                "id": r.get("_id") or r.get("id"),
                "team_id": r.get("team_id"),
                "title": r.get("title"),
                "description": r.get("description"),
                "plan": r.get("plan"),
                "targetBadgeId": r.get("targetBadgeId") or r.get("target_badge_id"),
                "status": r.get("status"),
                "reflection": r.get("reflection"),
                "scenario": r.get("scenario"),
                "submittedAt": r.get("submittedAt") or r.get("submitted_at"),
                "createdAt": r.get("createdAt") or r.get("created_at"),
            })
        return {"projects": projects}

    def save(self, data: dict) -> None:
        sb = _client()
        for p in (data.get("projects") or []):
            if not isinstance(p, dict):
                continue
            row = {
                "_id": p.get("id", ""),
                "team_id": p.get("team_id", ""),
                "title": p.get("title", ""),
                "description": p.get("description", ""),
                "plan": p.get("plan", ""),
                "targetBadgeId": p.get("targetBadgeId", ""),
                "status": p.get("status", ""),
                "reflection": p.get("reflection", ""),
                "scenario": p.get("scenario", ""),
                "submittedAt": p.get("submittedAt"),
                "createdAt": p.get("createdAt"),
            }
            try:
                sb.table("engine_projects").upsert(row).execute()
            except Exception as exc:
                if _is_missing_table_error(exc):
                    return
                raise


class SupabaseEngineInitiativesStore(EngineInitiativesStore):
    def load(self) -> dict:
        sb = _client()
        try:
            rows = sb.table("engine_initiatives").select("*").execute().data or []
        except Exception as exc:
            if _is_missing_table_error(exc):
                return {"initiatives": []}
            raise
        initiatives = []
        for r in rows:
            initiatives.append({
                "id": r.get("_id") or r.get("id"),
                "team_id": r.get("team_id"),
                "title": r.get("title"),
                "description": r.get("description"),
                "status": r.get("status"),
                "votes": r.get("votes", 0),
                "createdAt": r.get("createdAt") or r.get("created_at"),
            })
        return {"initiatives": initiatives}

    def save(self, data: dict) -> None:
        sb = _client()
        for i in (data.get("initiatives") or []):
            if not isinstance(i, dict):
                continue
            row = {
                "_id": i.get("id", ""),
                "team_id": i.get("team_id", ""),
                "title": i.get("title", ""),
                "description": i.get("description", ""),
                "status": i.get("status", ""),
                "votes": i.get("votes", 0),
                "createdAt": i.get("createdAt"),
            }
            try:
                sb.table("engine_initiatives").upsert(row).execute()
            except Exception as exc:
                if _is_missing_table_error(exc):
                    return
                raise


SUPABASE_STORES = {
    "shifts":           SupabaseShiftsStore(),
    "memberships":      SupabaseMembershipsStore(),
    "squad_corners":    SupabaseSquadCornersStore(),
    "squad_invites":    SupabaseSquadInvitesStore(),
    "squad_messages":   SupabaseSquadMessagesStore(),
    "badge_requests":   SupabaseBadgeRequestsStore(),
    "badge_plans":      SupabaseBadgePlansStore(),
    "parent_snapshots": SupabaseParentSnapshotsStore(),
    "chat_daily_usage": SupabaseChatDailyUsageStore(),
    "council_initiatives": SupabaseCouncilInitiativesStore(),
    "council_members":     SupabaseCouncilMembersStore(),
    "council_protocols":   SupabaseCouncilProtocolsStore(),
    "teams":             SupabaseTeamsStore(),
    "badge_arts":        SupabaseBadgeArtsStore(),
    "engines":           SupabaseEnginesStore(),
    "engine_members":    SupabaseEngineMembersStore(),
    "inspector_progress": SupabaseInspectorProgressStore(),
    "bro_events":        SupabaseBroEventsStore(),
    "bro_passports":     SupabaseBroPassportsStore(),
    "bro_initiatives":   SupabaseBroInitiativesStore(),
    "bro_submissions":   SupabaseBroSubmissionsStore(),
    "shift_schedule":    SupabaseShiftScheduleStore(),
    "workshops":         SupabaseWorkshopsStore(),
    "parent_suggestions": SupabaseParentSuggestionsStore(),
    "users":              SupabaseUsersStore(),
    "workshop_proposals": SupabaseWorkshopProposalsStore(),
    "role_requests":      SupabaseRoleRequestsStore(),
    "family_links":       SupabaseFamilyLinksStore(),
    "engine_join_requests": SupabaseEngineJoinRequestsStore(),
    "engine_projects":  SupabaseEngineProjectsStore(),
    "engine_initiatives": SupabaseEngineInitiativesStore(),
}
