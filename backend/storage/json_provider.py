"""
backend/storage/json_provider.py — JSON-провайдер хранилища (local dev).

Точная копия логики _xxx_load()/_xxx_save() из app.py.
Используется при USE_SUPABASE=false (по умолчанию).
"""

import json
import os
import threading

from .base import (
    ShiftsStore, MembershipsStore, SquadCornersStore,
    SquadInvitesStore, SquadMessagesStore,
    BadgeRequestsStore, BadgePlansStore, ParentSnapshotsStore,
    ChatDailyUsageStore, CouncilInitiativesStore, TeamsStore,
)

_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

_SHIFTS_FILE         = os.path.join(_DATA_DIR, "shifts.json")
_MEMBERSHIPS_FILE    = os.path.join(_DATA_DIR, "memberships.json")
_SQUAD_CORNERS_FILE  = os.path.join(_DATA_DIR, "squad_corners.json")
_SQUAD_INVITES_FILE  = os.path.join(_DATA_DIR, "squad_invites.json")
_SQUAD_MESSAGES_FILE = os.path.join(_DATA_DIR, "squad_messages.json")
_BADGE_REQUESTS_FILE = os.path.join(_DATA_DIR, "badge_requests.json")
_BADGE_PLANS_FILE    = os.path.join(_DATA_DIR, "badge_plans.json")
_PARENT_SNAPSHOTS_FILE = os.path.join(_DATA_DIR, "parent_snapshots.json")
_CHAT_DAILY_USAGE_FILE = os.path.join(_DATA_DIR, "chat_daily_usage.json")
_COUNCIL_INITIATIVES_FILE = os.path.join(_DATA_DIR, "council_initiatives.json")
# Teams historically live in backend/teams.json (not backend/data/teams.json)
_TEAMS_FILE = os.path.join(os.path.dirname(__file__), "..", "teams.json")

_SHIFTS_LOCK         = threading.Lock()
_MEMBERSHIPS_LOCK    = threading.Lock()
_SQUAD_CORNERS_LOCK  = threading.Lock()
_SQUAD_INVITES_LOCK  = threading.Lock()
_SQUAD_MESSAGES_LOCK = threading.Lock()
_BADGE_REQUESTS_LOCK = threading.Lock()
_BADGE_PLANS_LOCK    = threading.Lock()
_PARENT_SNAPSHOTS_LOCK = threading.Lock()
_CHAT_DAILY_LOCK     = threading.Lock()
_COUNCIL_INITIATIVES_LOCK = threading.Lock()
_TEAMS_LOCK          = threading.Lock()


def _ensure_data_dir():
    d = _DATA_DIR
    if d and not os.path.isdir(d):
        os.makedirs(d, exist_ok=True)


def _read_json(path: str, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            raw = f.read()
            if raw.strip():
                return json.loads(raw)
    except (json.JSONDecodeError, OSError):
        pass
    return default


def _write_json(path: str, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# ShiftsStore
# ---------------------------------------------------------------------------

class JsonShiftsStore(ShiftsStore):
    def load(self) -> dict:
        _ensure_data_dir()
        with _SHIFTS_LOCK:
            data = _read_json(_SHIFTS_FILE, {"shifts": [], "squads": []})
            if not isinstance(data, dict):
                data = {"shifts": [], "squads": []}
            if not isinstance(data.get("shifts"), list):
                data["shifts"] = []
            if not isinstance(data.get("squads"), list):
                data["squads"] = []
            return data

    def save(self, data: dict) -> None:
        _ensure_data_dir()
        with _SHIFTS_LOCK:
            _write_json(_SHIFTS_FILE, data)


# ---------------------------------------------------------------------------
# MembershipsStore
# ---------------------------------------------------------------------------

class JsonMembershipsStore(MembershipsStore):
    def load(self) -> dict:
        _ensure_data_dir()
        with _MEMBERSHIPS_LOCK:
            data = _read_json(_MEMBERSHIPS_FILE, {"members": []})
            if not isinstance(data, dict):
                data = {"members": []}
            if not isinstance(data.get("members"), list):
                data["members"] = []
            return data

    def save(self, data: dict) -> None:
        _ensure_data_dir()
        with _MEMBERSHIPS_LOCK:
            _write_json(_MEMBERSHIPS_FILE, data)


# ---------------------------------------------------------------------------
# SquadCornersStore
# ---------------------------------------------------------------------------

class JsonSquadCornersStore(SquadCornersStore):
    def load(self) -> dict:
        _ensure_data_dir()
        with _SQUAD_CORNERS_LOCK:
            data = _read_json(_SQUAD_CORNERS_FILE, {"corners": {}})
            if not isinstance(data, dict):
                data = {"corners": {}}
            if not isinstance(data.get("corners"), dict):
                data["corners"] = {}
            return data

    def save(self, data: dict) -> None:
        _ensure_data_dir()
        with _SQUAD_CORNERS_LOCK:
            _write_json(_SQUAD_CORNERS_FILE, data)


# ---------------------------------------------------------------------------
# SquadInvitesStore
# ---------------------------------------------------------------------------

class JsonSquadInvitesStore(SquadInvitesStore):
    def load(self) -> dict:
        _ensure_data_dir()
        with _SQUAD_INVITES_LOCK:
            data = _read_json(_SQUAD_INVITES_FILE, {"codes": {}})
            if not isinstance(data, dict):
                data = {"codes": {}}
            if not isinstance(data.get("codes"), dict):
                data["codes"] = {}
            return data

    def save(self, data: dict) -> None:
        _ensure_data_dir()
        with _SQUAD_INVITES_LOCK:
            _write_json(_SQUAD_INVITES_FILE, data)


# ---------------------------------------------------------------------------
# SquadMessagesStore
# ---------------------------------------------------------------------------

class JsonSquadMessagesStore(SquadMessagesStore):
    def load(self) -> dict:
        _ensure_data_dir()
        with _SQUAD_MESSAGES_LOCK:
            data = _read_json(_SQUAD_MESSAGES_FILE, {"bySquadId": {}})
            if not isinstance(data, dict):
                data = {"bySquadId": {}}
            if not isinstance(data.get("bySquadId"), dict):
                data["bySquadId"] = {}
            return data

    def save(self, data: dict) -> None:
        _ensure_data_dir()
        with _SQUAD_MESSAGES_LOCK:
            _write_json(_SQUAD_MESSAGES_FILE, data)


# ---------------------------------------------------------------------------
# BadgeRequestsStore
# ---------------------------------------------------------------------------

class JsonBadgeRequestsStore(BadgeRequestsStore):
    def load(self) -> dict:
        _ensure_data_dir()
        with _BADGE_REQUESTS_LOCK:
            data = _read_json(_BADGE_REQUESTS_FILE, {"requests": []})
            if not isinstance(data, dict):
                data = {"requests": []}
            if not isinstance(data.get("requests"), list):
                data["requests"] = []
            return data

    def save(self, data: dict) -> None:
        _ensure_data_dir()
        with _BADGE_REQUESTS_LOCK:
            _write_json(_BADGE_REQUESTS_FILE, data)


# ---------------------------------------------------------------------------
# BadgePlansStore
# ---------------------------------------------------------------------------

class JsonBadgePlansStore(BadgePlansStore):
    def load(self) -> dict:
        _ensure_data_dir()
        with _BADGE_PLANS_LOCK:
            data = _read_json(_BADGE_PLANS_FILE, {"plans": []})
            if not isinstance(data, dict):
                data = {"plans": []}
            if not isinstance(data.get("plans"), list):
                data["plans"] = []
            return data

    def save(self, data: dict) -> None:
        _ensure_data_dir()
        with _BADGE_PLANS_LOCK:
            _write_json(_BADGE_PLANS_FILE, data)


# ---------------------------------------------------------------------------
# ParentSnapshotsStore
# ---------------------------------------------------------------------------

class JsonParentSnapshotsStore(ParentSnapshotsStore):
    def load(self) -> dict:
        _ensure_data_dir()
        with _PARENT_SNAPSHOTS_LOCK:
            data = _read_json(_PARENT_SNAPSHOTS_FILE, {})
            if not isinstance(data, dict):
                data = {}
            return data

    def save(self, data: dict) -> None:
        _ensure_data_dir()
        with _PARENT_SNAPSHOTS_LOCK:
            _write_json(_PARENT_SNAPSHOTS_FILE, data)


# ---------------------------------------------------------------------------
# ChatDailyUsageStore
# ---------------------------------------------------------------------------

class JsonChatDailyUsageStore(ChatDailyUsageStore):
    def load(self) -> dict:
        _ensure_data_dir()
        with _CHAT_DAILY_LOCK:
            data = _read_json(_CHAT_DAILY_USAGE_FILE, {})
            if not isinstance(data, dict):
                data = {}
            return data

    def save(self, data: dict) -> None:
        _ensure_data_dir()
        with _CHAT_DAILY_LOCK:
            _write_json(_CHAT_DAILY_USAGE_FILE, data)


# ---------------------------------------------------------------------------
# CouncilInitiativesStore
# ---------------------------------------------------------------------------

class JsonCouncilInitiativesStore(CouncilInitiativesStore):
    def load(self) -> dict:
        _ensure_data_dir()
        with _COUNCIL_INITIATIVES_LOCK:
            data = _read_json(_COUNCIL_INITIATIVES_FILE, {"initiatives": []})
            if not isinstance(data, dict):
                data = {"initiatives": []}
            if not isinstance(data.get("initiatives"), list):
                data["initiatives"] = []
            return data

    def save(self, data: dict) -> None:
        _ensure_data_dir()
        with _COUNCIL_INITIATIVES_LOCK:
            _write_json(_COUNCIL_INITIATIVES_FILE, data)


# ---------------------------------------------------------------------------
# TeamsStore
# ---------------------------------------------------------------------------

class JsonTeamsStore(TeamsStore):
    def load(self) -> dict:
        _ensure_data_dir()
        with _TEAMS_LOCK:
            data = _read_json(_TEAMS_FILE, {})
            if not isinstance(data, dict):
                data = {}
            return data

    def save(self, data: dict) -> None:
        _ensure_data_dir()
        with _TEAMS_LOCK:
            _write_json(_TEAMS_FILE, data if isinstance(data, dict) else {})


# ---------------------------------------------------------------------------
# Реестр экземпляров
# ---------------------------------------------------------------------------

JSON_STORES = {
    "shifts":          JsonShiftsStore(),
    "memberships":     JsonMembershipsStore(),
    "squad_corners":   JsonSquadCornersStore(),
    "squad_invites":   JsonSquadInvitesStore(),
    "squad_messages":  JsonSquadMessagesStore(),
    "badge_requests":  JsonBadgeRequestsStore(),
    "badge_plans":     JsonBadgePlansStore(),
    "parent_snapshots": JsonParentSnapshotsStore(),
    "chat_daily_usage": JsonChatDailyUsageStore(),
    "council_initiatives": JsonCouncilInitiativesStore(),
    "teams":           JsonTeamsStore(),
}
