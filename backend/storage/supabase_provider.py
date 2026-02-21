"""
backend/storage/supabase_provider.py — Supabase-провайдер хранилища (prod).

Используется при USE_SUPABASE=true.
Требует: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY в окружении.

Каждый Store реализует те же интерфейсы что и JSON-провайдер,
возвращая данные в том же формате dict (совместимость с app.py).
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from .base import (
    ShiftsStore, MembershipsStore, SquadCornersStore,
    SquadInvitesStore, SquadMessagesStore,
    BadgeRequestsStore, ParentSnapshotsStore, ChatDailyUsageStore,
    CouncilInitiativesStore,
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


def _row_to_shift(r: dict) -> dict:
    return {
        "id": r.get("id", ""),
        "name": r.get("name", ""),
        "startDate": r.get("start_date") or "",
        "endDate": r.get("end_date") or "",
        "createdAt": _ts(r.get("created_at")),
        "createdBy": r.get("created_by_device_id") or "",
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
        for member in (data.get("members") or []):
            if not isinstance(member, dict):
                continue
            sb.table("memberships").upsert(_member_to_row(member)).execute()


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
        for req in (data.get("requests") or []):
            if not isinstance(req, dict):
                continue
            sb.table("badge_requests").upsert(_badge_request_to_row(req)).execute()


def _row_to_badge_request(r: dict) -> dict:
    return {
        "id": r.get("id", ""),
        "campId": r.get("camp_id") or "",
        "squadId": r.get("squad_id") or "",
        "levelId": r.get("level_id", ""),
        "badgeTitle": r.get("badge_title") or "",
        "evidence": r.get("evidence") or {},
        "status": r.get("status", "pending"),
        "createdAt": _ts(r.get("created_at")),
        "requestedByDeviceId": r.get("requested_by_device_id", ""),
        "requestedByNickname": r.get("requested_by_nickname") or "",
        "resolvedAt": _ts(r.get("resolved_at")),
        "resolvedByDeviceId": r.get("resolved_by_device_id") or "",
        "resolvedByRole": r.get("resolved_by_role") or "",
        "resolutionNote": r.get("resolution_note") or "",
    }


def _badge_request_to_row(req: dict) -> dict:
    row = {
        "id": req.get("id") or uuid.uuid4().hex[:12],
        "level_id": req.get("levelId", ""),
        "evidence": req.get("evidence") or {},
        "status": req.get("status", "pending"),
        "requested_by_device_id": req.get("requestedByDeviceId", ""),
    }
    if req.get("campId"):
        row["camp_id"] = req["campId"]
    if req.get("squadId"):
        row["squad_id"] = req["squadId"]
    if req.get("badgeTitle"):
        row["badge_title"] = req["badgeTitle"]
    if req.get("requestedByNickname"):
        row["requested_by_nickname"] = req["requestedByNickname"]
    if req.get("resolvedAt"):
        row["resolved_at"] = req["resolvedAt"]
    if req.get("resolvedByDeviceId"):
        row["resolved_by_device_id"] = req["resolvedByDeviceId"]
    if req.get("resolvedByRole"):
        row["resolved_by_role"] = req["resolvedByRole"]
    if req.get("resolutionNote"):
        row["resolution_note"] = req["resolutionNote"]
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
                result[code] = {
                    "payload": r.get("payload") or {},
                    "expiresAt": _ts(r.get("expires_at")),
                    "createdAt": _ts(r.get("created_at")),
                    "createdByDeviceId": r.get("created_by_device_id") or "",
                }
        return result

    def save(self, data: dict) -> None:
        sb = _client()
        for code, snap in data.items():
            if not isinstance(snap, dict):
                continue
            row = {
                "code": code,
                "payload": snap.get("payload") or {},
                "expires_at": snap.get("expiresAt", ""),
            }
            if snap.get("createdByDeviceId"):
                row["created_by_device_id"] = snap["createdByDeviceId"]
            sb.table("parent_snapshots").upsert(row).execute()


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
        for day, counts in data.items():
            if not isinstance(counts, dict):
                continue
            for device_id, count in counts.items():
                sb.table("chat_daily_usage").upsert({
                    "device_id": device_id,
                    "day": day,
                    "count": count,
                }).execute()


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
# Реестр экземпляров
# ---------------------------------------------------------------------------

SUPABASE_STORES = {
    "shifts":           SupabaseShiftsStore(),
    "memberships":      SupabaseMembershipsStore(),
    "squad_corners":    SupabaseSquadCornersStore(),
    "squad_invites":    SupabaseSquadInvitesStore(),
    "squad_messages":   SupabaseSquadMessagesStore(),
    "badge_requests":   SupabaseBadgeRequestsStore(),
    "parent_snapshots": SupabaseParentSnapshotsStore(),
    "chat_daily_usage": SupabaseChatDailyUsageStore(),
    "council_initiatives": SupabaseCouncilInitiativesStore(),
}
