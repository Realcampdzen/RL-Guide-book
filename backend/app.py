#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask API для Путеводителя "Реального Лагеря"
Предоставляет данные о категориях и значках
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
import threading
import time
import uuid
import hmac
import re
import traceback
from datetime import datetime, timezone
from typing import Optional
import hashlib
import base64
import secrets
import requests
import jwt
from pathlib import Path
from collections import defaultdict
from dotenv import load_dotenv

# Чтобы import events и storage находили backend/ при любом cwd
_BACKEND_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _BACKEND_DIR.parent
if str(_BACKEND_DIR) not in __import__('sys').path:
    __import__('sys').path.insert(0, str(_BACKEND_DIR))

from storage import get_store  # noqa: E402 — после sys.path patch

# Загружаем переменные окружения из .env (сначала корень репо, затем backend/) — чтобы генерация изображений в ЛК находила OPENAI_API_KEY при любом cwd
_env_root = _PROJECT_ROOT / ".env"
_env_backend = _BACKEND_DIR / ".env"
if _env_root.is_file():
    load_dotenv(_env_root)
if _env_backend.is_file():
    load_dotenv(_env_backend)
if not _env_root.is_file() and not _env_backend.is_file():
    load_dotenv()  # fallback: cwd

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHANNEL_ID = os.getenv('TELEGRAM_CHANNEL_ID')
TELEGRAM_WEBHOOK_SECRET = os.getenv('TELEGRAM_WEBHOOK_SECRET', '').strip()

VK_API_TOKEN = os.getenv('VK_API_TOKEN', '').strip()
VK_CONFIRMATION_CODE = os.getenv('VK_CONFIRMATION_CODE', '').strip()
VK_WEBHOOK_SECRET = os.getenv('VK_WEBHOOK_SECRET', '').strip()

# Auth: HMAC для кодов верификации, JWT для accessToken (см. FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md)
AUTH_SECRET = os.getenv('AUTH_SECRET', '').strip()
AUTH_JWT_SECRET = os.getenv('AUTH_JWT_SECRET', '').strip()
AUTH_GENERATE_SECRET = os.getenv('AUTH_GENERATE_SECRET', '').strip() or os.getenv('TELEGRAM_WEBHOOK_SECRET', '').strip()
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '').strip()
IMAGE_PROVIDER = os.getenv('IMAGE_PROVIDER', 'openai').strip().lower()

# 10-min slots для stateless HMAC кодов; код валиден ~40 мин (4 слота)
AUTH_SLOT_SEC = 600
AUTH_VERIFY_SLOTS = 4
# RBAC roles allowed to access protected endpoints (chat, teams, images, etc.).
# Legacy: role "organizer" is deprecated and treated as "shift_leader".
# P2-01: educator added — can use chat, view badge inbox, read squads/shifts; cannot create/delete shifts/squads.
CHAT_ALLOWED_ROLES = ('participant', 'parent', 'counselor', 'educator', 'shift_leader', 'camp_director', 'developer')
# Лимит сообщений в день для чата (env: CHAT_MESSAGES_PER_DAY, по умолчанию 20)
CHAT_MESSAGES_PER_DAY = int(os.getenv('CHAT_MESSAGES_PER_DAY', '20'))

CHAT_DAILY_USAGE_FILE = os.path.join(os.path.dirname(__file__), "data", "chat_daily_usage.json")
_CHAT_DAILY_LOCK = threading.Lock()

PARENT_SNAPSHOT_TTL_DAYS = 7
PARENT_SNAPSHOTS_FILE = os.path.join(os.path.dirname(__file__), "data", "parent_snapshots.json")
_PARENT_SNAPSHOTS_LOCK = threading.Lock()

SHIFTS_FILE = os.path.join(os.path.dirname(__file__), "data", "shifts.json")
_SHIFTS_LOCK = threading.Lock()
BADGE_REQUESTS_FILE = os.path.join(os.path.dirname(__file__), "data", "badge_requests.json")
_BADGE_REQUESTS_LOCK = threading.Lock()
BADGE_REQUESTS_RESOLVED_TTL_DAYS = int(os.getenv("BADGE_REQUESTS_RESOLVED_TTL_DAYS", "30"))
MEMBERSHIPS_FILE = os.path.join(os.path.dirname(__file__), "data", "memberships.json")
_MEMBERSHIPS_LOCK = threading.Lock()
SQUAD_CORNERS_FILE = os.path.join(os.path.dirname(__file__), "data", "squad_corners.json")
_SQUAD_CORNERS_LOCK = threading.Lock()
SQUAD_INVITES_FILE = os.path.join(os.path.dirname(__file__), "data", "squad_invites.json")
_SQUAD_INVITES_LOCK = threading.Lock()
SQUAD_MESSAGES_FILE = os.path.join(os.path.dirname(__file__), "data", "squad_messages.json")
_SQUAD_MESSAGES_LOCK = threading.Lock()
SQUAD_INVITE_TTL_SEC = int(os.getenv('SQUAD_INVITE_TTL_SEC', str(30 * 24 * 60 * 60)))
SQUAD_CORNER_PATCH_LIMIT_BYTES = 5 * 1024 * 1024
SQUAD_MESSAGES_MAX_HISTORY = 1000
SQUAD_MESSAGES_DEFAULT_LIMIT = 50
SQUAD_MESSAGES_MAX_LIMIT = 100
DEFAULT_SEEDED_SHIFT_NAME = "Реальный Лагерь 2026"
# Staff-flow permissions (shifts/squads management, staff code issuing).
ORGANIZER_ROLES = ('shift_leader', 'camp_director', 'developer')
LEVEL_ID_RE = re.compile(r'^\d+\.\d+(?:\.\d+)?$')

# ---------------------------------------------------------------------------
# P1-07: Safety filters & rate limits for squad messages and /api/chat
# ---------------------------------------------------------------------------
# Max message length for squad chat (env: SQUAD_MSG_MAX_LEN, default 500)
SQUAD_MSG_MAX_LEN = int(os.getenv('SQUAD_MSG_MAX_LEN', '500'))
# Per-device per-minute rate limit for squad messages (env: SQUAD_MSG_RATE_LIMIT, default 10)
SQUAD_MSG_RATE_LIMIT_PER_MIN = int(os.getenv('SQUAD_MSG_RATE_LIMIT', '10'))
SQUAD_MSG_RATE_WINDOW_SEC = 60
_squad_msg_times: dict = defaultdict(list)
_squad_msg_rate_lock = threading.Lock()

# Per-device per-minute rate limit for /api/chat НейроВалюша (env: CHAT_MSG_RATE_LIMIT_PER_MIN, default 15)
CHAT_MSG_RATE_LIMIT_PER_MIN = int(os.getenv('CHAT_MSG_RATE_LIMIT_PER_MIN', '15'))
CHAT_MSG_RATE_WINDOW_SEC = 60
_chat_per_min_times: dict = defaultdict(list)
_chat_per_min_lock = threading.Lock()
# M5-R4-C: Max message length for /api/chat (env: CHAT_MAX_MESSAGE_LEN, default 2000)
CHAT_MAX_MESSAGE_LEN = int(os.getenv('CHAT_MAX_MESSAGE_LEN', '2000'))

# URL filter regex — block links in squad messages
_URL_RE = re.compile(
    r'https?://|www\.|t\.me/|vk\.com/|youtu\.be/|bit\.ly/|tinyurl\.com/',
    re.IGNORECASE
)

# Basic profanity filter: list of root fragments (Russian). Only match whole-word-ish context.
_PROFANITY_ROOTS = [
    'хуй', 'хуе', 'хуя', 'хуё', 'пизд', 'ёбан', 'еban', 'блядь', 'бляд', 'ебат',
    'ёбат', 'ебет', 'ёбет', 'сука', 'мудак', 'мудил', 'залуп', 'долбоёб', 'долбоеб',
    'ёб твою', 'еб твою', 'манд', 'шлюх', 'пиздёж', 'пиздеж',
]
_PROFANITY_RE = re.compile(
    '|'.join(re.escape(r) for r in _PROFANITY_ROOTS),
    re.IGNORECASE
)


def _check_squad_msg_rate_limit(device_id: str) -> bool:
    """Per-device per-minute rate limit for squad messages. Returns True if under limit."""
    if not device_id:
        return True
    now = time.time()
    with _squad_msg_rate_lock:
        times = _squad_msg_times[device_id]
        times[:] = [t for t in times if now - t < SQUAD_MSG_RATE_WINDOW_SEC]
        if len(times) >= SQUAD_MSG_RATE_LIMIT_PER_MIN:
            return False
        times.append(now)
    return True


def _check_chat_per_min_rate_limit(device_id: str) -> bool:
    """Per-device per-minute rate limit for /api/chat. Returns True if under limit."""
    if not device_id:
        return True
    now = time.time()
    with _chat_per_min_lock:
        times = _chat_per_min_times[device_id]
        times[:] = [t for t in times if now - t < CHAT_MSG_RATE_WINDOW_SEC]
        if len(times) >= CHAT_MSG_RATE_LIMIT_PER_MIN:
            return False
        times.append(now)
    return True


def _log_rate_limit_event(endpoint: str, device_id: str) -> None:
    """Log a rate limit event without storing personal data (device_id is hashed)."""
    hashed = hashlib.sha256(device_id.encode()).hexdigest()[:12] if device_id else 'anonymous'
    print(f"[RATE_LIMIT] 429 {endpoint} device={hashed} ts={datetime.now(timezone.utc).isoformat()}")


def _validate_squad_message(text: str) -> tuple:
    """
    Validate squad chat message content.
    Returns (clean_text, error_message) — error_message is None if valid.
    """
    if len(text) > SQUAD_MSG_MAX_LEN:
        return None, f"Сообщение слишком длинное (максимум {SQUAD_MSG_MAX_LEN} символов)"
    if _URL_RE.search(text):
        return None, "Ссылки в чате отряда запрещены"
    if _PROFANITY_RE.search(text):
        return None, "Сообщение содержит недопустимые слова"
    return text, None


class ShiftSeedError(RuntimeError):
    """Raised when default shift seeding cannot be persisted."""


def _normalize_role(role: str) -> str:
    r = (role or "").strip().lower()
    if r == "organizer":
        return "shift_leader"
    return r


def _ensure_chat_data_dir():
    d = os.path.dirname(CHAT_DAILY_USAGE_FILE)
    if d and not os.path.isdir(d):
        os.makedirs(d, exist_ok=True)


def _check_and_inc_chat_daily(device_id: str) -> tuple[bool, Optional[tuple]]:
    """
    Проверяет и увеличивает счётчик запросов чата за текущий день (UTC) по device_id.
    Returns: (True, None) если лимит не превышен и счётчик увеличен;
             (False, (response, 429)) если лимит исчерпан или ошибка записи.
    """
    if not device_id:
        return True, None
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    store = get_store("chat_daily_usage")
    try:
        data = store.load()
    except Exception:
        data = {}
    if not isinstance(data, dict):
        data = {}
    counts = data.get(date_str, {})
    if not isinstance(counts, dict):
        counts = {}
    current = counts.get(device_id, 0)
    if current >= CHAT_MESSAGES_PER_DAY:
        return False, (jsonify({"error": "Daily limit exceeded", "retryAfter": "tomorrow"}), 429)
    counts[device_id] = current + 1
    data[date_str] = counts
    try:
        store.save(data)
    except Exception:
        return False, (jsonify({"error": "Daily limit exceeded", "retryAfter": "tomorrow"}), 429)
    return True, None


def _require_chat_auth():
    """
    Проверяет JWT в заголовке Authorization для доступа к чату (RBAC).
    Returns: (payload, None) при успехе или (None, (response, status_code)) при ошибке.
    """
    auth_header = (request.headers.get('Authorization') or '').strip()
    token = auth_header[7:].strip() if auth_header.startswith('Bearer ') else ''
    remote = (request.remote_addr or '').strip()
    from_localhost = remote in ('127.0.0.1', '::1', 'localhost')

    # Dev convenience: allow chat without JWT from localhost (acts as developer).
    if not token and from_localhost:
        device_id = (request.headers.get('X-Device-Id') or '').strip() or remote or 'dev'
        return {'role': 'developer', 'deviceId': device_id}, None

    if not auth_header.startswith('Bearer '):
        return None, (jsonify({"error": "Authorization required"}), 401)
    if not token:
        return None, (jsonify({"error": "Authorization required"}), 401)
    if not AUTH_JWT_SECRET:
        return None, (jsonify({"error": "Auth not configured"}), 503)
    try:
        payload = jwt.decode(token, AUTH_JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)
    except jwt.InvalidTokenError:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)
    role = _normalize_role((payload.get("role") or "").strip())
    payload["role"] = role
    if role not in CHAT_ALLOWED_ROLES:
        return None, (jsonify({"error": "Access denied for this role"}), 403)
    return payload, None


def _require_parent_snapshot_auth():
    """
    Проверяет JWT в Authorization для создания снепшота для родителя.
    Разрешена роль participant (родитель в M2 читает child-view в read-only).
    Returns: (payload, None) при успехе или (None, (response, status_code)) при ошибке.
    """
    auth_header = (request.headers.get('Authorization') or '').strip()
    if not auth_header.startswith('Bearer '):
        return None, (jsonify({"error": "Authorization required"}), 401)
    token = auth_header[7:].strip()
    if not token:
        return None, (jsonify({"error": "Authorization required"}), 401)
    if not AUTH_JWT_SECRET:
        return None, (jsonify({"error": "Auth not configured"}), 503)
    try:
        payload = jwt.decode(token, AUTH_JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)
    except jwt.InvalidTokenError:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)
    role = (payload.get("role") or "").strip()
    if role not in ("participant",):
        return None, (jsonify({"error": "Access denied for this role"}), 403)
    return payload, None


def _require_teams_auth():
    """
    Проверяет JWT в Authorization для доступа к API онлайн-Движков.
    Разрешены роли: participant, parent, counselor, shift_leader, camp_director, developer (не traveler).
    При запросе с localhost без токена (песочница, роль «Разработчик») считаем роль developer.
    Returns: (payload, None) при успехе или (None, (response, status_code)) при ошибке.
    """
    auth_header = (request.headers.get('Authorization') or '').strip()
    token = auth_header[7:].strip() if auth_header.startswith('Bearer ') else ''
    remote = (request.remote_addr or '').strip()
    from_localhost = remote in ('127.0.0.1', '::1', 'localhost')

    if not token and from_localhost:
        device_id = (request.headers.get('X-Device-Id') or '').strip() or remote or 'dev'
        return {'role': 'developer', 'deviceId': device_id}, None

    if not auth_header.startswith('Bearer ') or not token:
        return None, (jsonify({"error": "Authorization required"}), 401)
    if not AUTH_JWT_SECRET:
        return None, (jsonify({"error": "Auth not configured"}), 503)
    try:
        payload = jwt.decode(token, AUTH_JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)
    except jwt.InvalidTokenError:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)
    role = _normalize_role((payload.get("role") or "").strip())
    payload["role"] = role
    if role not in CHAT_ALLOWED_ROLES:
        return None, (jsonify({"error": "Access denied for this role"}), 403)
    return payload, None


def _parse_iso_ts(value: str) -> float:
    raw = (value or "").strip()
    if not raw:
        return 0.0
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(raw).timestamp()
    except ValueError:
        return 0.0


def _is_localhost_request() -> bool:
    remote = (request.remote_addr or "").strip()
    return remote in ("127.0.0.1", "::1", "localhost")


def _is_production() -> bool:
    """True when ENVIRONMENT=production or NODE_ENV=production. Used to block dev-only endpoints."""
    env_raw = (os.getenv("ENVIRONMENT", "") or "").strip().lower()
    if env_raw == "production":
        return True
    node_env = (os.getenv("NODE_ENV", "") or "").strip().lower()
    return node_env == "production"


def _is_dev_mode() -> bool:
    """True for local/dev environments where seed data is expected."""
    if _is_production():
        return False
    env_candidates = [
        os.getenv("FLASK_ENV", ""),
        os.getenv("ENV", ""),
        os.getenv("NODE_ENV", ""),
    ]
    normalized = {(raw or "").strip().lower() for raw in env_candidates if isinstance(raw, str)}
    if {"development", "dev", "local"} & normalized:
        return True
    debug_raw = (os.getenv("FLASK_DEBUG", "") or "").strip().lower()
    return debug_raw in {"1", "true", "yes", "on"}


def _normalized_shift_name(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip().lower())


def _is_default_seeded_shift_name(name: str) -> bool:
    normalized = _normalized_shift_name(name)
    default_name = _normalized_shift_name(DEFAULT_SEEDED_SHIFT_NAME)
    return normalized == default_name or normalized.startswith(f"{default_name} ")


def _pick_squad_avatar(corner: dict) -> Optional[str]:
    if not isinstance(corner, dict):
        return None
    for key in ("photoFlag", "photoCorner", "photoSquad", "photoWithCounselors"):
        raw = corner.get(key)
        value = raw.strip() if isinstance(raw, str) else ""
        if value:
            return value
    return None


def _ensure_default_shift_seeded(data: dict) -> tuple[dict, bool]:
    """
    Ensure default shift exists in development mode.
    Returns: (data, seeded_now).
    Raises: ShiftSeedError on persistence failures.
    """
    if not _is_dev_mode():
        return data, False
    shifts = data.get("shifts") or []
    has_default = any(
        isinstance(shift, dict) and _is_default_seeded_shift_name(shift.get("name") or "")
        for shift in shifts
    )
    if has_default:
        return data, False
    seeded_shift = {
        "id": uuid.uuid4().hex[:12],
        "name": DEFAULT_SEEDED_SHIFT_NAME,
        "startDate": "",
        "endDate": "",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "createdBy": "seed-dev-mode"
    }
    data["shifts"].append(seeded_shift)
    try:
        get_store("shifts").save(data)
    except Exception as exc:
        raise ShiftSeedError(str(exc)) from exc
    return data, True


def _require_roles(allowed_roles: tuple[str, ...], allow_localhost_dev: bool = False):
    """
    Универсальная JWT-проверка по ролям.
    Returns: (payload, None) или (None, (response, status_code)).
    """
    auth_header = (request.headers.get("Authorization") or "").strip()
    token = auth_header[7:].strip() if auth_header.startswith("Bearer ") else ""
    remote = (request.remote_addr or "").strip()

    if allow_localhost_dev and not token and _is_localhost_request():
        device_id = (request.headers.get("X-Device-Id") or "").strip() or remote or "dev"
        payload = {"role": "developer", "deviceId": device_id}
        if "developer" in allowed_roles:
            return payload, None
        return None, (jsonify({"error": "Access denied for this role"}), 403)

    if not auth_header.startswith("Bearer ") or not token:
        return None, (jsonify({"error": "Authorization required"}), 401)
    if not AUTH_JWT_SECRET:
        return None, (jsonify({"error": "Auth not configured"}), 503)
    try:
        payload = jwt.decode(token, AUTH_JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)
    except jwt.InvalidTokenError:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)
    role = _normalize_role((payload.get("role") or "").strip())
    payload["role"] = role
    if role not in allowed_roles:
        return None, (jsonify({"error": "Access denied for this role"}), 403)
    return payload, None


def _badge_requests_load() -> dict:
    """Load badge requests via StorageProvider."""
    return get_store("badge_requests").load()


def _badge_requests_save(data: dict):
    get_store("badge_requests").save(data)


def _memberships_load() -> dict:
    """Load memberships via StorageProvider."""
    return get_store("memberships").load()


def _memberships_save(data: dict):
    get_store("memberships").save(data)


def _squad_corners_load() -> dict:
    """Load squad corners via StorageProvider."""
    return get_store("squad_corners").load()


def _squad_corners_save(data: dict):
    get_store("squad_corners").save(data)


def _squad_invites_load() -> dict:
    """Load squad invites via StorageProvider."""
    return get_store("squad_invites").load()


def _squad_invites_save(data: dict):
    get_store("squad_invites").save(data)


def _squad_invites_prune(doc: dict) -> tuple[dict, bool]:
    """Remove expired invite codes. Returns: (doc, changed)."""
    codes = doc.get("codes") or {}
    if not isinstance(codes, dict):
        doc["codes"] = {}
        return doc, True
    changed = False
    now_ts = datetime.now(timezone.utc).timestamp()
    for code in list(codes.keys()):
        meta = codes.get(code)
        if not isinstance(meta, dict):
            del codes[code]
            changed = True
            continue
        expires_at = _parse_iso_ts((meta.get("expiresAt") or "").strip())
        if expires_at and expires_at < now_ts:
            del codes[code]
            changed = True
    doc["codes"] = codes
    return doc, changed


def _squad_messages_load() -> dict:
    """Load squad messages via StorageProvider."""
    return get_store("squad_messages").load()


def _squad_messages_save(data: dict):
    get_store("squad_messages").save(data)


def _require_squad_membership(payload: dict, squad_id: str) -> tuple[Optional[dict], Optional[tuple]]:
    """Ensure request actor has a membership in the requested squad. Returns: (membership, None) or (None, (resp, status))."""
    device_id = (payload.get("deviceId") or "").strip()
    if not device_id:
        return None, (jsonify({"error": "deviceId missing in token"}), 400)
    sid = (squad_id or "").strip()
    if not sid:
        return None, (jsonify({"error": "squadId required"}), 400)
    mdoc = _memberships_load()
    membership = _membership_for_device(mdoc, device_id)
    if not membership or (membership.get("squadId") or "").strip() != sid:
        return None, (jsonify({"error": "Not a member of this squad"}), 403)
    return membership, None


def _membership_for_device(doc: dict, device_id: str) -> Optional[dict]:
    members = doc.get("members") or []
    if not isinstance(members, list):
        return None
    for row in reversed(members):
        if not isinstance(row, dict):
            continue
        if (row.get("deviceId") or "").strip() == device_id:
            return row
    return None


def _resolve_membership_context(device_id: str) -> tuple[str, str]:
    """
    Returns: (campId, squadId) for device from memberships, or ('', '').
    """
    if not device_id:
        return "", ""
    mdoc = _memberships_load()
    row = _membership_for_device(mdoc, device_id)
    if not row:
        return "", ""
    camp_id = (row.get("campId") or "").strip()
    squad_id = (row.get("squadId") or "").strip()
    return camp_id, squad_id


def _find_squad(shifts_doc: dict, squad_id: str) -> Optional[dict]:
    sid = (squad_id or "").strip()
    if not sid:
        return None
    return next(
        (
            s for s in (shifts_doc.get("squads") or [])
            if isinstance(s, dict) and (s.get("id") or "").strip() == sid
        ),
        None
    )


def _find_shift(shifts_doc: dict, shift_id: str) -> Optional[dict]:
    sid = (shift_id or "").strip()
    if not sid:
        return None
    return next(
        (
            s for s in (shifts_doc.get("shifts") or [])
            if isinstance(s, dict) and (s.get("id") or "").strip() == sid
        ),
        None
    )


def _membership_in_squad(device_id: str, squad_id: str) -> Optional[dict]:
    did = (device_id or "").strip()
    sid = (squad_id or "").strip()
    if not did or not sid:
        return None
    mdoc = _memberships_load()
    for row in reversed(mdoc.get("members") or []):
        if not isinstance(row, dict):
            continue
        if (row.get("deviceId") or "").strip() != did:
            continue
        if (row.get("squadId") or "").strip() != sid:
            continue
        return row
    return None


def _can_manage_squad(payload: dict, squad: dict, membership: Optional[dict]) -> tuple[bool, str]:
    actor_role = _normalize_role((payload.get("role") or "").strip())
    if actor_role == "developer":
        return True, ""
    if actor_role == "counselor":
        if membership and _normalize_role((membership.get("role") or "").strip()) == "counselor":
            return True, ""
        return False, "not_member"
    if actor_role in ("shift_leader", "camp_director"):
        token_camp_id = (payload.get("campId") or "").strip()
        squad_shift_id = (squad.get("shiftId") or "").strip()
        if token_camp_id and token_camp_id == squad_shift_id:
            return True, ""
        if membership:
            return True, ""
        return False, "camp_mismatch" if token_camp_id else "not_member"
    return False, "role_forbidden"


def _can_read_corner(payload: dict, squad: dict, membership: Optional[dict]) -> bool:
    actor_role = _normalize_role((payload.get("role") or "").strip())
    if actor_role == "developer":
        return True
    if membership:
        return True
    if actor_role in ("shift_leader", "camp_director"):
        token_camp_id = (payload.get("campId") or "").strip()
        squad_shift_id = (squad.get("shiftId") or "").strip()
        return bool(token_camp_id and token_camp_id == squad_shift_id)
    return False


def _build_squad_members_lists(squad_id: str, camp_id: str) -> tuple[list[dict], list[dict]]:
    sid = (squad_id or "").strip()
    cid = (camp_id or "").strip()
    members: list[dict] = []
    participants: list[dict] = []
    mdoc = _memberships_load()
    for row in (mdoc.get("members") or []):
        if not isinstance(row, dict):
            continue
        if (row.get("squadId") or "").strip() != sid:
            continue
        if cid and (row.get("campId") or "").strip() != cid:
            continue
        role = _normalize_role((row.get("role") or "").strip() or "participant")
        item = {
            "deviceId": (row.get("deviceId") or "").strip(),
            "nickname": (row.get("nickname") or "").strip() or None,
            "role": role,
            "joinedAt": (row.get("joinedAt") or "").strip()
        }
        members.append(item)
        if role == "participant":
            participants.append({
                "deviceId": item["deviceId"],
                "nickname": item["nickname"],
                "joinedAt": item["joinedAt"]
            })
    members.sort(key=lambda item: _parse_iso_ts(item.get("joinedAt") or ""), reverse=False)
    participants.sort(key=lambda item: _parse_iso_ts(item.get("joinedAt") or ""), reverse=False)
    return members, participants


def _cleanup_squad_related_data(squad_ids: set[str], shift_ids: set[str]) -> dict:
    counts = {
        "memberships": 0,
        "corners": 0,
        "chats": 0,
        "inviteCodes": 0,
        "badgeRequests": 0
    }
    normalized_squad_ids = {s.strip() for s in squad_ids if isinstance(s, str) and s.strip()}
    normalized_shift_ids = {s.strip() for s in shift_ids if isinstance(s, str) and s.strip()}

    if normalized_squad_ids or normalized_shift_ids:
        mdoc = _memberships_load()
        next_members = []
        for row in (mdoc.get("members") or []):
            if not isinstance(row, dict):
                continue
            squad_id = (row.get("squadId") or "").strip()
            camp_id = (row.get("campId") or "").strip()
            if squad_id in normalized_squad_ids or camp_id in normalized_shift_ids:
                counts["memberships"] += 1
                continue
            next_members.append(row)
        mdoc["members"] = next_members
        _memberships_save(mdoc)

        cdoc = _squad_corners_load()
        corners = cdoc.get("corners") or {}
        if not isinstance(corners, dict):
            corners = {}
        for sid in list(corners.keys()):
            if sid in normalized_squad_ids:
                del corners[sid]
                counts["corners"] += 1
        cdoc["corners"] = corners
        _squad_corners_save(cdoc)

        sdoc = _squad_messages_load()
        by_squad = sdoc.get("bySquadId") or {}
        if not isinstance(by_squad, dict):
            by_squad = {}
        for sid in list(by_squad.keys()):
            if sid in normalized_squad_ids:
                del by_squad[sid]
                counts["chats"] += 1
        sdoc["bySquadId"] = by_squad
        _squad_messages_save(sdoc)

        idoc = _squad_invites_load()
        codes = idoc.get("codes") or {}
        if not isinstance(codes, dict):
            codes = {}
        for code in list(codes.keys()):
            meta = codes.get(code) if isinstance(codes.get(code), dict) else {}
            if (meta.get("squadId") or "").strip() in normalized_squad_ids:
                del codes[code]
                counts["inviteCodes"] += 1
        idoc["codes"] = codes
        _squad_invites_save(idoc)

        bdoc = _badge_requests_load()
        next_requests = []
        for row in (bdoc.get("requests") or []):
            if not isinstance(row, dict):
                continue
            squad_id = (row.get("squadId") or "").strip()
            camp_id = (row.get("campId") or "").strip()
            if squad_id in normalized_squad_ids or camp_id in normalized_shift_ids:
                counts["badgeRequests"] += 1
                continue
            next_requests.append(row)
        bdoc["requests"] = next_requests
        _badge_requests_save(bdoc)

    return counts


def _is_valid_level_id(level_id: str) -> bool:
    return bool(LEVEL_ID_RE.match((level_id or "").strip()))


def _parent_snapshots_load():
    """Load parent snapshots via StorageProvider."""
    return get_store("parent_snapshots").load()


def _parent_snapshots_save(data: dict):
    """Save parent snapshots via StorageProvider."""
    get_store("parent_snapshots").save(data)


def send_vk_message(peer_id, text: str) -> bool:
    """Отправить сообщение в VK через messages.send. Возвращает True при успехе."""
    if not VK_API_TOKEN:
        return False
    url = "https://api.vk.com/method/messages.send"
    try:
        r = requests.post(url, params={
            "access_token": VK_API_TOKEN,
            "v": "5.199",
            "peer_id": peer_id,
            "message": text[:4096],
            "random_id": int(time.time() * 1000),
        }, timeout=10)
        data = r.json() if r.text else {}
        return "response" in data
    except Exception:
        return False


def send_telegram_message(text: str) -> bool:
    """Отправить сообщение в Telegram-канал через Bot API. Возвращает True при успехе."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        return False
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        r = requests.post(url, json={
            "chat_id": TELEGRAM_CHANNEL_ID,
            "text": text[:4096],
            "disable_web_page_preview": True,
        }, timeout=10)
        return r.status_code == 200 and (r.json() or {}).get("ok") is True
    except Exception:
        return False


def send_telegram_to_chat(chat_id, text: str) -> bool:
    """Отправить сообщение в указанный Telegram-чат (личка или группа)."""
    if not TELEGRAM_BOT_TOKEN:
        return False
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        r = requests.post(url, json={
            "chat_id": chat_id,
            "text": text[:4096],
            "disable_web_page_preview": True,
        }, timeout=10)
        return r.status_code == 200 and (r.json() or {}).get("ok") is True
    except Exception:
        return False


def send_telegram_photo(photo_bytes: bytes, caption: str) -> bool:
    """Отправить фото в Telegram-канал через Bot API sendPhoto. caption обрезается до 1024 символов."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        return False
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
    try:
        r = requests.post(
            url,
            data={"chat_id": TELEGRAM_CHANNEL_ID, "caption": caption[:1024]},
            files={"photo": ("creator_card.png", photo_bytes, "image/png")},
            timeout=15,
        )
        return r.status_code == 200 and (r.json() or {}).get("ok") is True
    except Exception:
        return False


app = Flask(__name__)
CORS(app)  # Разрешаем CORS для фронтенда

# Путь к файлу с данными (фиксируем относительно backend/, чтобы не зависеть от cwd)
DATA_FILE = os.path.join(os.path.dirname(__file__), "perfect_parsed_data.json")
COMMUNITY_FILE = os.path.join(os.path.dirname(__file__), "community_badges.json")
TEAMS_FILE = os.path.join(os.path.dirname(__file__), "teams.json")
BRO_MISSIONS_FILE = os.path.join(os.path.dirname(__file__), "bro_missions.json")
WINGS_FILE = os.path.join(os.path.dirname(__file__), "wings.json")

def ensure_json_files():
    for f_path in [COMMUNITY_FILE, TEAMS_FILE, BRO_MISSIONS_FILE, WINGS_FILE]:
        if not os.path.exists(f_path):
            with open(f_path, 'w', encoding='utf-8') as f:
                if f_path == COMMUNITY_FILE:
                    json.dump([], f)
                elif f_path == BRO_MISSIONS_FILE:
                    json.dump([], f)
                elif f_path == WINGS_FILE:
                    json.dump({}, f)
                else:
                    json.dump({}, f)

# Rate limit: POST /api/community/badges — max 5 per minute per IP (in-memory)
COMMUNITY_POST_RATE_LIMIT = 5
COMMUNITY_POST_WINDOW_SEC = 60
_community_post_times = defaultdict(list)

def _check_community_rate_limit(ip):
    now = time.time()
    times = _community_post_times[ip]
    times[:] = [t for t in times if now - t < COMMUNITY_POST_WINDOW_SEC]
    if len(times) >= COMMUNITY_POST_RATE_LIMIT:
        return False
    times.append(now)
    return True

# Rate limit: POST /api/images/generate — max N per minute per deviceId or IP (in-memory)
IMAGES_GENERATE_RATE_LIMIT = int(os.getenv('IMAGES_GENERATE_RATE_LIMIT', '10'))
IMAGES_GENERATE_WINDOW_SEC = 60
_images_generate_times = defaultdict(list)
_images_generate_lock = threading.Lock()


def _check_images_generate_rate_limit(key):
    """Check and record one request for images/generate. Key = deviceId or IP. Returns True if under limit."""
    now = time.time()
    with _images_generate_lock:
        times = _images_generate_times[key]
        times[:] = [t for t in times if now - t < IMAGES_GENERATE_WINDOW_SEC]
        if len(times) >= IMAGES_GENERATE_RATE_LIMIT:
            return False
        times.append(now)
    return True


# ---------------------------------------------------------------------------
# Images safety: prompt sanitization (M5-R2-C)
# ---------------------------------------------------------------------------
IMAGES_USER_PROMPT_MAX_LEN = int(os.getenv('IMAGES_USER_PROMPT_MAX_LEN', '300'))

_PROMPT_INJECTION_KEYWORDS = [
    'ignore previous',
    'forget instructions',
    'jailbreak',
    'disregard',
    'override prompt',
]
_HTML_TAG_RE = re.compile(r'<[^>]+>')


def _hash_key(k: str) -> str:
    """Return first 8 hex chars of SHA-256(k) — safe to log, not reversible."""
    return hashlib.sha256(k.encode('utf-8', errors='replace')).hexdigest()[:8]


def _sanitize_user_prompt(text: str, device_key: str = '') -> str:
    """Strip HTML, detect injection attempts, truncate to IMAGES_USER_PROMPT_MAX_LEN.

    Returns sanitized prompt string. Returns empty string on injection detection.
    """
    cleaned = _HTML_TAG_RE.sub('', text)
    lower = cleaned.lower()
    for kw in _PROMPT_INJECTION_KEYWORDS:
        if kw in lower:
            app.logger.warning('[IMAGES_SAFETY] prompt_injection_attempt device=%s', _hash_key(device_key))
            return ''
    orig_len = len(cleaned)
    if orig_len > IMAGES_USER_PROMPT_MAX_LEN:
        cleaned = cleaned[:IMAGES_USER_PROMPT_MAX_LEN]
        app.logger.info('[IMAGES_SANITIZE] prompt truncated device=%s len=%d', _hash_key(device_key), orig_len)
    return cleaned


# ---------------------------------------------------------------------------
# Images safety: per-camp daily quota (M5-R2-C)
# ---------------------------------------------------------------------------
IMAGES_CAMP_DAILY_LIMIT = int(os.getenv('IMAGES_CAMP_DAILY_LIMIT', '200'))
_images_camp_daily: dict = {}   # camp_key -> {'date': 'YYYY-MM-DD', 'count': int}
_images_camp_daily_lock = threading.Lock()


def _check_images_camp_daily_quota(camp_key: str) -> bool:
    """Check and record one image generation against the per-camp daily limit.

    Returns True if request is within quota, False if daily limit exceeded.
    camp_key is campId from JWT or deviceId as graceful fallback.
    Counters reset automatically at UTC midnight (date comparison).
    """
    today = datetime.utcnow().strftime('%Y-%m-%d')
    with _images_camp_daily_lock:
        entry = _images_camp_daily.get(camp_key)
        if entry and entry['date'] == today:
            if entry['count'] >= IMAGES_CAMP_DAILY_LIMIT:
                return False
            entry['count'] += 1
        else:
            _images_camp_daily[camp_key] = {'date': today, 'count': 1}
    return True

def _validate_community_badge(data):
    """Validate and sanitize POST body. Returns (sanitized_dict, error_message)."""
    if not data or not isinstance(data, dict):
        return None, "Некорректные данные значка"
    title = data.get("title")
    if not isinstance(title, str) or not title.strip():
        return None, "Поле title обязательно и должно быть непустой строкой"
    description = (data.get("description") or "")
    if isinstance(description, str):
        description = description.strip()[:1000]
    else:
        description = ""
    raw_id = data.get("id")
    bid = ("community_" + str(uuid.uuid4())[:8]) if not (isinstance(raw_id, str) and raw_id.strip()) else str(raw_id).strip()[:50]
    emoji = str(data.get("emoji", ""))[:20] if data.get("emoji") else ""
    category_id = str(data.get("category_id", ""))[:20] if data.get("category_id") else ""
    return {
        "id": bid,
        "title": title.strip()[:100],
        "description": description,
        "emoji": emoji,
        "category_id": category_id,
    }, None

@app.route('/api/wings', methods=['GET', 'POST'])
def handle_wings():
    ensure_json_files()
    if request.method == 'POST':
        data = request.get_json()
        wing_id = data.get('id')
        with open(WINGS_FILE, 'r', encoding='utf-8') as f:
            wings = json.load(f)
        wings[wing_id] = data
        with open(WINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(wings, f, ensure_ascii=False, indent=2)
        return jsonify({"status": "success"}), 201
    
    with open(WINGS_FILE, 'r', encoding='utf-8') as f:
        wings = json.load(f)
    return jsonify(wings)

@app.route('/api/bro-missions', methods=['GET', 'POST'])
def handle_bro_missions():
    ensure_json_files()
    if request.method == 'POST':
        data = request.get_json()
        with open(BRO_MISSIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return jsonify({"status": "success"}), 200

    try:
        with open(BRO_MISSIONS_FILE, 'r', encoding='utf-8') as f:
            raw = f.read()
        data = json.loads(raw) if raw.strip() else []
        return jsonify(data)
    except (json.JSONDecodeError, OSError):
        return jsonify([])

def _normalize_team_scope(raw_scope: str) -> str:
    scope = (raw_scope or '').strip().lower()
    if scope in ('camp', 'shift', 'squad'):
        return scope
    return 'camp'


def _normalize_team_doc(team_doc: dict) -> dict:
    if not isinstance(team_doc, dict):
        return {}
    normalized = dict(team_doc)
    normalized['scope'] = _normalize_team_scope(normalized.get('scope') or 'camp')
    shift_id = (normalized.get('shiftId') or '').strip() or None
    squad_id = (normalized.get('squadId') or '').strip() or None
    if normalized['scope'] == 'camp':
        shift_id = None
        squad_id = None
    elif normalized['scope'] == 'shift':
        squad_id = None
    normalized['shiftId'] = shift_id
    normalized['squadId'] = squad_id
    return normalized


def _is_scope_slot_equal(a: dict, b: dict) -> bool:
    """Same slot = same scope and same context identifiers."""
    if _normalize_team_scope(a.get('scope')) != _normalize_team_scope(b.get('scope')):
        return False
    scope = _normalize_team_scope(a.get('scope'))
    if scope == 'camp':
        return True
    if scope == 'shift':
        return (a.get('shiftId') or '') == (b.get('shiftId') or '')
    return (a.get('shiftId') or '') == (b.get('shiftId') or '') and (a.get('squadId') or '') == (b.get('squadId') or '')


def _team_matches_context(team_doc: dict, scope: str = '', shift_id: str = '', squad_id: str = '') -> bool:
    doc = _normalize_team_doc(team_doc)
    if scope and doc.get('scope') != _normalize_team_scope(scope):
        return False
    if shift_id and (doc.get('shiftId') or '') != shift_id:
        return False
    if squad_id and (doc.get('squadId') or '') != squad_id:
        return False
    return True


def _teams_load():
    """Load teams via StorageProvider (JSON local / Supabase prod)."""
    data = get_store("teams").load()
    if not isinstance(data, dict):
        return {}
    # backward compatibility for legacy docs without scope fields
    normalized: dict = {}
    for team_id, team_doc in data.items():
        if not isinstance(team_doc, dict):
            continue
        normalized[team_id] = _normalize_team_doc(team_doc)
    return normalized


def _teams_save(teams):
    get_store("teams").save(teams)


def _find_team_by_member(teams, device_id):
    for tid, doc in teams.items():
        if not isinstance(doc, dict):
            continue
        members = doc.get('members') or []
        for m in members:
            if isinstance(m, dict) and (m.get('id') or '').strip() == device_id:
                return _normalize_team_doc(doc)
    return None


def _find_member_teams(teams, device_id):
    found = []
    for _, doc in teams.items():
        if not isinstance(doc, dict):
            continue
        members = doc.get('members') or []
        if any(isinstance(m, dict) and (m.get('id') or '').strip() == device_id for m in members):
            found.append(_normalize_team_doc(doc))
    return found


def _sanitize_team_plan_grid(raw):
    if not isinstance(raw, dict):
        return None
    shift_length = 9 if raw.get('shiftLength') == 9 else 21
    days = {}
    raw_days = raw.get('days')
    if isinstance(raw_days, dict):
        for day_key, day_value in raw_days.items():
            if not isinstance(day_key, str) or not isinstance(day_value, dict):
                continue
            entry = {}
            for part in ('morning', 'day', 'evening'):
                part_value = day_value.get(part)
                if isinstance(part_value, str):
                    normalized = part_value.strip()
                    if normalized:
                        entry[part] = normalized
            if entry:
                days[day_key] = entry
    return {"shiftLength": shift_length, "days": days}


@app.route('/api/teams', methods=['GET', 'POST'])
def handle_teams():
    ensure_json_files()
    if request.method == 'POST':
        data = request.get_json() or {}
        team_id = data.get('id')
        if not team_id:
            payload, err = _require_teams_auth()
            if err is not None:
                return err[0], err[1]
            device_id = (payload.get('deviceId') or '').strip()
            if not device_id:
                return jsonify({"error": "deviceId missing in token"}), 400

            scope = _normalize_team_scope(data.get('scope') or 'camp')
            shift_id = (data.get('shiftId') or '').strip() or None
            squad_id = (data.get('squadId') or '').strip() or None
            if scope == 'shift' and not shift_id:
                return jsonify({"error": "shiftId required for scope=shift"}), 400
            if scope == 'squad' and (not shift_id or not squad_id):
                return jsonify({"error": "shiftId and squadId required for scope=squad"}), 400

            teams = _teams_load()
            existing_teams = _find_member_teams(teams, device_id)
            requested_slot = _normalize_team_doc({"scope": scope, "shiftId": shift_id, "squadId": squad_id})
            for existing in existing_teams:
                if _is_scope_slot_equal(existing, requested_slot):
                    return jsonify({"error": "Already in a team for this scope", "teamId": existing.get('id')}), 409

            new_id = 'T-' + ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
            nickname = (data.get('nickname') or '').strip() or 'Искатель'
            avatar = (data.get('avatar') or '').strip() or ''
            rank = (data.get('rank') or '').strip() or 'Новичок'
            member = {"id": device_id, "nickname": nickname, "avatar": avatar or None, "rank": rank}
            if avatar == '':
                member.pop('avatar', None)
            team_doc = {
                "id": new_id,
                "name": (data.get('name') or '').strip() or 'Мой Движок',
                "motto": (data.get('motto') or '').strip() or '',
                "logo": (data.get('logo') or '').strip() or '🚀',
                "leaderId": device_id,
                "members": [member],
                "scope": scope,
                "shiftId": shift_id,
                "squadId": squad_id,
                "createdAt": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                "achievements": data.get('achievements') if isinstance(data.get('achievements'), list) else [],
                "goals": data.get('goals') if isinstance(data.get('goals'), list) else [],
            }
            team_doc = _normalize_team_doc(team_doc)
            for opt in ('flagImage', 'gerbImage'):
                if data.get(opt):
                    team_doc[opt] = (data.get(opt) or '').strip()
            for plan_key in ('planGridA', 'planGridB'):
                normalized_plan = _sanitize_team_plan_grid(data.get(plan_key))
                if normalized_plan is not None:
                    team_doc[plan_key] = normalized_plan
            teams[new_id] = team_doc
            _teams_save(teams)
            return jsonify(team_doc), 201

        teams = _teams_load()
        teams[team_id] = _normalize_team_doc(data)
        _teams_save(teams)
        return jsonify({"status": "success"}), 201

    teams = _teams_load()
    scope = (request.args.get('scope') or '').strip()
    shift_id = (request.args.get('shiftId') or '').strip()
    squad_id = (request.args.get('squadId') or '').strip()
    if scope or shift_id or squad_id:
        teams = {tid: doc for tid, doc in teams.items() if _team_matches_context(doc, scope=scope, shift_id=shift_id, squad_id=squad_id)}
    return jsonify(teams)


@app.route('/api/teams/mine', methods=['GET'])
def teams_mine():
    ensure_json_files()
    payload, err = _require_teams_auth()
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get('deviceId') or '').strip()
    teams = _teams_load()
    my_teams = _find_member_teams(teams, device_id)

    scope = (request.args.get('scope') or '').strip()
    shift_id = (request.args.get('shiftId') or '').strip()
    squad_id = (request.args.get('squadId') or '').strip()
    if scope or shift_id or squad_id:
        my_teams = [t for t in my_teams if _team_matches_context(t, scope=scope, shift_id=shift_id, squad_id=squad_id)]

    if not my_teams:
        return jsonify({"error": "No team"}), 404

    # backward-compatible behavior: return one team object
    return jsonify(my_teams[0])


@app.route('/api/teams/<team_id>/join', methods=['POST'])
def teams_join(team_id):
    ensure_json_files()
    payload, err = _require_teams_auth()
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get('deviceId') or '').strip()
    teams = _teams_load()
    if team_id not in teams:
        return jsonify({"error": "Team not found"}), 404
    doc = _normalize_team_doc(teams[team_id])
    teams[team_id] = doc
    in_teams = _find_member_teams(teams, device_id)
    for in_other in in_teams:
        if (in_other.get('id') or '') == team_id:
            return jsonify(in_other)
        if _is_scope_slot_equal(in_other, doc):
            return jsonify({"error": "Already in another team for this scope", "teamId": in_other.get('id')}), 409
    if not isinstance(doc, dict):
        return jsonify({"error": "Team not found"}), 404
    members = list(doc.get('members') or [])
    for m in members:
        if isinstance(m, dict) and (m.get('id') or '').strip() == device_id:
            return jsonify(doc)
    data = request.get_json() or {}
    nickname = (data.get('nickname') or '').strip() or 'Искатель'
    avatar = (data.get('avatar') or '').strip() or ''
    rank = (data.get('rank') or '').strip() or 'Новичок'
    member = {"id": device_id, "nickname": nickname, "avatar": avatar or None, "rank": rank}
    if avatar == '':
        member.pop('avatar', None)
    members.append(member)
    doc['members'] = members
    _teams_save(teams)
    return jsonify(doc)


@app.route('/api/teams/<team_id>/leave', methods=['POST'])
def teams_leave(team_id):
    ensure_json_files()
    payload, err = _require_teams_auth()
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get('deviceId') or '').strip()
    teams = _teams_load()
    doc = teams.get(team_id)
    if not doc or not isinstance(doc, dict):
        return jsonify({"error": "Team not found"}), 404
    members = [m for m in (doc.get('members') or []) if isinstance(m, dict) and (m.get('id') or '').strip() != device_id]
    if len(members) == len(doc.get('members') or []):
        return jsonify({"error": "Not a member"}), 404
    if not members:
        del teams[team_id]
    else:
        doc['members'] = members
    _teams_save(teams)
    return jsonify({"status": "success"})


# Context identifiers for POST /api/images/generate (LK sections)
IMAGES_CONTEXT_PROMPTS = {
    "squad_corner": "Squad corner photo, Real Camp style, youth camp aesthetic.",
    "wing": "Wing / squad mentor avatar or banner, Real Camp style.",
    "passport": "Profile passport avatar or cover, Real Camp style.",
    "workshop": "Badge or workshop concept art, Real Camp style.",
    "badge_skins": "Badge icon or skin, clean and readable, Real Camp style.",
    "team_flag": "Team flag or emblem, vertical 9:16, Real Camp theme.",
    "gerb": "Team emblem 9:16, Real Camp style.",
    "counselor_squad": "Counselor squad visual, Real Camp style.",
    "bro_passport": "Bro passport cover or card, Real Camp / BRO style.",
}

GERB_STYLE_DESCS = {
    "cosmos": "cosmic, stars, space theme, deep blues and purples",
    "cyberpunk": "cyberpunk, neon colors, tech, futuristic",
    "realism": "realistic coat of arms, classic heraldic seal style",
}


@app.route('/api/images/generate', methods=['POST'])
def images_generate():
    """Universal image generation/process endpoint for LK sections. Auth: same roles as teams."""
    payload, err = _require_teams_auth()
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get('deviceId') or '').strip()
    key = device_id or (request.remote_addr or 'unknown')
    if not _check_images_generate_rate_limit(key):
        return jsonify({
            "error": "Слишком много запросов генерации. Подождите минуту.",
            "retryAfter": 60,
        }), 429
    # Per-camp daily quota (M5-R2-C)
    camp_id = (payload.get('campId') or '').strip()
    camp_quota_key = camp_id or key
    if not _check_images_camp_daily_quota(camp_quota_key):
        app.logger.warning('[IMAGES_QUOTA] daily_limit_hit campId=%s ts=%s',
                           _hash_key(camp_quota_key), datetime.utcnow().isoformat())
        return jsonify({
            "error": "Лимит генерации изображений для смены исчерпан",
            "retryAfter": "tomorrow",
        }), 429
    data = request.get_json() or {}
    mode = (data.get("mode") or "").strip().lower()
    context = (data.get("context") or "").strip()
    user_prompt = (data.get("prompt") or "").strip()
    # Sanitize user_prompt: strip HTML, detect injection, truncate (M5-R2-C)
    user_prompt = _sanitize_user_prompt(user_prompt, key)
    image_base64 = (data.get("imageBase64") or "").strip()
    team_name_hint = (data.get("teamName") or "").strip()
    captain_name_hint = (data.get("captainName") or "").strip()
    role = (payload.get("role") or "").strip().lower()

    if mode not in ("generate", "process"):
        return jsonify({"error": "Invalid or missing mode"}), 400
    if not context:
        return jsonify({"error": "context required"}), 400
    if mode == "process" and not image_base64:
        return jsonify({"error": "imageBase64 required for process mode"}), 400

    team_id = (data.get("teamId") or data.get("team_id") or "").strip()
    style = (data.get("style") or "cosmos").strip().lower()
    if style not in ("cosmos", "cyberpunk", "realism"):
        style = "cosmos"

    full_prompt = None
    doc = None
    if context == "gerb":
        ensure_json_files()
        teams = _teams_load()
        if team_id:
            doc = teams.get(team_id)
            if doc and isinstance(doc, dict):
                members = doc.get("members") or []
                if not any(
                    isinstance(m, dict) and (m.get("id") or "").strip() == device_id
                    for m in members
                ):
                    return jsonify({"error": "Not a team member"}), 404
            else:
                # Dev sandbox fallback: local-only team (stored in browser) may not be in backend/teams.json.
                if role != "developer":
                    return jsonify({"error": "Team not found"}), 404
        if mode == "generate":
            if not team_id and role != "developer":
                return jsonify({"error": "teamId required for gerb generate"}), 400
            team_name = team_name_hint or "Мой Движок"
            nickname = captain_name_hint or "Искатель"
            if doc and isinstance(doc, dict):
                team_name = (doc.get("name") or "").strip() or team_name
                leader_id = (doc.get("leaderId") or "").strip()
                for m in (doc.get("members") or []):
                    if isinstance(m, dict) and (m.get("id") or "").strip() == leader_id:
                        nickname = (m.get("nickname") or "Искатель").strip() or "Искатель"
                        break
            style_desc = GERB_STYLE_DESCS.get(style, GERB_STYLE_DESCS["cosmos"])
            full_prompt = (
                f'Create a vertical team emblem/card (9:16 aspect ratio), style: {style_desc}. '
                f'Team name: "{team_name}". Captain: {nickname}. '
                f'Clean design, readable text, suitable for a youth camp / Real Camp theme.'
            )
            if user_prompt:
                full_prompt += f" Additional instructions: {user_prompt}"
        else:
            base = "Team emblem, vertical 9:16, Real Camp theme. Preserve key elements of the image, enhance with camp identity."
            if doc:
                team_name = doc.get("name") or "Мой Движок"
                leader_id = (doc.get("leaderId") or "").strip()
                nickname = "Искатель"
                for m in (doc.get("members") or []):
                    if isinstance(m, dict) and (m.get("id") or "").strip() == leader_id:
                        nickname = (m.get("nickname") or "Искатель").strip() or "Искатель"
                        break
                full_prompt = f"{base} Team: {team_name}. Captain: {nickname}."
            else:
                full_prompt = base
            if user_prompt:
                full_prompt += f" Additional instructions: {user_prompt}"

    if full_prompt is None:
        base_prompt = IMAGES_CONTEXT_PROMPTS.get(
            context,
            "Image for Real Camp / youth camp context. Clean, readable, on-brand.",
        )
        full_prompt = base_prompt
        if user_prompt:
            full_prompt = f"{base_prompt} Additional instructions: {user_prompt}"

    from image_providers import get_image_provider
    generate_fn, process_fn = get_image_provider(IMAGE_PROVIDER, OPENAI_API_KEY)

    if mode == "generate":
        if not OPENAI_API_KEY and IMAGE_PROVIDER == "openai":
            return jsonify({
                "error": "Генерация изображений не настроена",
                "hint": "Задайте OPENAI_API_KEY в .env в корне проекта или в backend/",
            }), 503
        result = generate_fn(full_prompt)
        if not result:
            return jsonify({
                "error": "Не удалось сгенерировать изображение",
                "hint": "Проверьте ключ OpenAI, квоту и доступ к api.openai.com (при необходимости задайте OPENAI_BASE_URL)",
            }), 503
        return jsonify({"imageBase64": result}), 200

    # mode == "process"
    result = process_fn(image_base64, full_prompt)
    if not result:
        return jsonify({"error": "Обработка изображений пока не поддерживается"}), 501
    return jsonify({"imageBase64": result}), 200


@app.route('/api/teams/<team_id>', methods=['GET', 'PATCH', 'DELETE'])
def handle_team(team_id):
    ensure_json_files()
    teams = _teams_load()
    doc = teams.get(team_id)
    if not doc or not isinstance(doc, dict):
        return jsonify({"error": "Team not found"}), 404
    doc = _normalize_team_doc(doc)
    teams[team_id] = doc

    if request.method == 'GET':
        return jsonify(doc)

    if request.method == 'PATCH':
        payload, err = _require_teams_auth()
        if err is not None:
            return err[0], err[1]
        device_id = (payload.get('deviceId') or '').strip()
        if (doc.get('leaderId') or '').strip() != device_id:
            return jsonify({"error": "Only leader can update team"}), 403
        data = request.get_json() or {}
        allowed = ('name', 'motto', 'logo', 'goals', 'achievements', 'flagImage', 'gerbImage', 'planGridA', 'planGridB', 'scope', 'shiftId', 'squadId')
        for key in allowed:
            if key in data:
                if key in ('goals', 'achievements') and isinstance(data[key], list):
                    doc[key] = data[key]
                elif key in ('planGridA', 'planGridB'):
                    normalized_plan = _sanitize_team_plan_grid(data[key])
                    if normalized_plan is not None:
                        doc[key] = normalized_plan
                elif key in ('scope', 'shiftId', 'squadId'):
                    doc[key] = data[key]
                elif isinstance(data[key], str):
                    doc[key] = data[key].strip() if key != 'logo' else (data[key].strip() or '🚀')
                elif data[key] is None:
                    doc[key] = None

        doc = _normalize_team_doc(doc)
        if doc.get('scope') == 'shift' and not doc.get('shiftId'):
            return jsonify({"error": "shiftId required for scope=shift"}), 400
        if doc.get('scope') == 'squad' and (not doc.get('shiftId') or not doc.get('squadId')):
            return jsonify({"error": "shiftId and squadId required for scope=squad"}), 400

        teams[team_id] = doc
        _teams_save(teams)
        return jsonify(doc)

    if request.method == 'DELETE':
        payload, err = _require_teams_auth()
        if err is not None:
            return err[0], err[1]
        device_id = (payload.get('deviceId') or '').strip()
        if (doc.get('leaderId') or '').strip() != device_id:
            return jsonify({"error": "Only leader can delete team"}), 403
        del teams[team_id]
        _teams_save(teams)
        return jsonify({"status": "success"})

@app.route('/api/community/badges', methods=['GET', 'POST'])
def community_badges():
    ensure_json_files()

    if request.method == 'POST':
        ip = request.remote_addr or "unknown"
        if not _check_community_rate_limit(ip):
            return jsonify({"error": "Слишком много отправок. Подождите минуту."}), 429
        try:
            raw = request.get_json()
            new_badge, err = _validate_community_badge(raw)
            if err:
                return jsonify({"error": err}), 400

            new_badge['is_community'] = True
            new_badge['created_at'] = raw.get('created_at', '') if isinstance(raw, dict) else ''

            with open(COMMUNITY_FILE, 'r', encoding='utf-8') as f:
                badges = json.load(f)
            if not isinstance(badges, list):
                badges = []
            badges.append(new_badge)
            if len(badges) > 100:
                badges = badges[-100:]

            with open(COMMUNITY_FILE, 'w', encoding='utf-8') as f:
                json.dump(badges, f, ensure_ascii=False, indent=2)
            return jsonify({"status": "success", "message": "Значок отправлен в Инкубатор"}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # GET
    try:
        with open(COMMUNITY_FILE, 'r', encoding='utf-8') as f:
            raw = f.read()
        badges = json.loads(raw) if raw.strip() else []
        return jsonify(badges if isinstance(badges, list) else [])
    except (json.JSONDecodeError, OSError) as e:
        return jsonify([])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def _handle_telegram_webhook_payload(payload):
    """
    Обработка тела Update от Telegram: парсинг message, формирование
    confirmation_requested и сохранение. Вызывается после 200 OK (или в фоне).
    """
    import events as ev
    if not payload or not isinstance(payload, dict):
        return
    msg = payload.get('message')
    if not msg or not isinstance(msg, dict):
        return
    text = msg.get('text')
    if not text or not isinstance(text, str):
        return
    from_user = msg.get('from') or {}
    user_id = str(from_user.get('id', '')) if from_user else None
    username = (from_user.get('username') or '').strip() or None
    ev.append_confirmation_event(ev.ConfirmationRequestedEvent(
        userId=user_id,
        username=username,
        text=text[:4096],
    ))
    chat_id = (msg.get('chat') or {}).get('id')
    if chat_id is not None:
        try:
            send_telegram_to_chat(chat_id, "Заявка принята, вожатый посмотрит")
        except Exception:
            pass


@app.route('/api/webhook/telegram/<path:secret_path>', methods=['POST'])
def telegram_webhook(secret_path):
    """
    Приём обновлений Telegram (setWebhook). Секрет в URL.
    Ответ 200 OK быстро; тяжёлую обработку — после ответа.
    """
    if not TELEGRAM_WEBHOOK_SECRET or secret_path != TELEGRAM_WEBHOOK_SECRET:
        return jsonify({"ok": False}), 404
    try:
        payload = request.get_json(silent=True)
        # Ответить Telegram сразу (в течение ~60 сек)
        try:
            _handle_telegram_webhook_payload(payload)
        except Exception:
            pass  # не задерживаем ответ из-за ошибки записи
        return '', 200
    except Exception:
        return '', 200  # всё равно 200, чтобы Telegram не повторял


def _handle_vk_webhook_payload(payload):
    """
    Обработка тела от VK Callback API: message_new → confirmation_requested,
    сохранение и ответ пользователю.
    """
    import events as ev
    if not payload or not isinstance(payload, dict):
        return
    obj = payload.get("object") or {}
    msg = obj.get("message") if isinstance(obj, dict) else obj
    if not msg or not isinstance(msg, dict):
        msg = obj if isinstance(obj, dict) else {}
    text = (msg.get("text") or "").strip()
    if not text:
        return
    from_id = msg.get("from_id")
    user_id = str(from_id) if from_id is not None else None
    peer_id = msg.get("peer_id")
    ev.append_confirmation_event(ev.ConfirmationRequestedEvent(
        userId=user_id,
        username=None,
        text=text[:4096],
    ))
    if peer_id is not None:
        try:
            send_vk_message(peer_id, "Заявка принята, вожатый посмотрит")
        except Exception:
            pass


@app.route('/api/webhook/vk/<path:secret_path>', methods=['POST'])
def vk_webhook(secret_path):
    """
    Приём обновлений VK Callback API. Секрет в URL.
    type=confirmation → вернуть VK_CONFIRMATION_CODE (plain text).
    type=message_new → обработать, вернуть "ok" (plain text).
    """
    if VK_WEBHOOK_SECRET and secret_path != VK_WEBHOOK_SECRET:
        return jsonify({"error": "Not found"}), 404
    try:
        payload = request.get_json(silent=True)
        if not payload or not isinstance(payload, dict):
            return "ok", 200, {"Content-Type": "text/plain; charset=utf-8"}
        req_type = (payload.get("type") or "").strip()
        if req_type == "confirmation":
            if not VK_CONFIRMATION_CODE:
                return "ok", 200, {"Content-Type": "text/plain; charset=utf-8"}
            return VK_CONFIRMATION_CODE, 200, {"Content-Type": "text/plain; charset=utf-8"}
        if req_type == "message_new":
            try:
                _handle_vk_webhook_payload(payload)
            except Exception:
                pass
            return "ok", 200, {"Content-Type": "text/plain; charset=utf-8"}
        return "ok", 200, {"Content-Type": "text/plain; charset=utf-8"}
    except Exception:
        return "ok", 200, {"Content-Type": "text/plain; charset=utf-8"}


@app.route('/api/webhook/confirmation-events', methods=['GET'])
def get_confirmation_events():
    """
    Последние заявки на подтверждение (для вожатого/админа).
    Защита: query-параметр secret должен совпадать с TELEGRAM_WEBHOOK_SECRET или VK_WEBHOOK_SECRET.
    """
    secret = request.args.get('secret')
    allowed = (TELEGRAM_WEBHOOK_SECRET and secret == TELEGRAM_WEBHOOK_SECRET) or (
        VK_WEBHOOK_SECRET and secret == VK_WEBHOOK_SECRET
    )
    if not allowed:
        return jsonify({"error": "Forbidden"}), 403
    try:
        import events as ev
        limit = request.args.get('limit', type=int) or 500
        limit = min(max(1, limit), 500)
        events = ev.get_confirmation_events(limit=limit)
        return jsonify({"events": events, "count": len(events)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/telegram/notify-achievement', methods=['POST'])
def telegram_notify_achievement():
    """
    Этап 7: отправить в Telegram-канал уведомление о подтверждении уровня (значок).
    Тело: { "levelId", "levelLabel", "reflection?", "impact?", "link?" }.
    """
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        return jsonify({"ok": False, "error": "Telegram не настроен"}), 503
    try:
        data = request.get_json() or {}
        level_id = data.get("levelId") or data.get("level_id")
        level_label = data.get("levelLabel") or data.get("level_label") or "Уровень"
        reflection = (data.get("reflection") or "").strip()
        impact = (data.get("impact") or "").strip()
        link = (data.get("link") or "").strip()
        parts = [f"✅ Подтверждение: {level_label}"]
        if level_id:
            parts.append(f"ID уровня: {level_id}")
        if reflection:
            parts.append(f"\nЧему научился(лась): {reflection}")
        if impact:
            parts.append(f"\nРеальный вклад: {impact}")
        if link:
            parts.append(f"\nСсылка: {link}")
        text = "\n".join(parts)
        if send_telegram_message(text):
            return jsonify({"ok": True})
        return jsonify({"ok": False, "error": "Не удалось отправить в Telegram"}), 500
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route('/api/telegram/notify-creator-card', methods=['POST'])
def telegram_notify_creator_card():
    """
    Отправить в Telegram-канал карточку Созидателя (9:16) после создания значка в Мастерской.
    Тело: { "imageBase64": "<base64>", "badgeTitle": "...", "description": "..." }.
    """
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        return jsonify({"ok": False, "error": "Telegram не настроен"}), 503
    try:
        data = request.get_json() or {}
        image_b64 = data.get("imageBase64") or data.get("image_base64") or ""
        badge_title = (data.get("badgeTitle") or data.get("badge_title") or "").strip()
        description = (data.get("description") or "").strip()[:500]
        if not image_b64:
            return jsonify({"ok": False, "error": "Нет изображения (imageBase64)"}), 400
        try:
            photo_bytes = base64.b64decode(image_b64, validate=True)
        except Exception:
            return jsonify({"ok": False, "error": "Некорректный base64 изображения"}), 400
        if len(photo_bytes) > 10 * 1024 * 1024:
            return jsonify({"ok": False, "error": "Изображение слишком большое"}), 400
        parts = [f"Карточка Созидателя: {badge_title}"]
        if description:
            parts.append(description)
        caption = ". ".join(parts)
        if send_telegram_photo(photo_bytes, caption):
            return jsonify({"ok": True})
        return jsonify({"ok": False, "error": "Не удалось отправить в Telegram"}), 500
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route('/')
def index():
    """Главная страница"""
    return jsonify({
        "message": "Путеводитель API",
        "version": "2.0.0",
        "total_badges": 242,
        "total_categories": 14,
        "endpoints": {
            "categories": "/api/categories",
            "badges": "/api/badges",
            "data": "/api/data",
            "category": "/api/category/<id>",
            "badge": "/api/badge/<id>",
            "search": "/api/search",
            "stats": "/api/stats"
        }
    })

@app.route('/api/data')
def get_all_data():
    """Получить все данные (категории и значки)"""
    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": f"Ошибка загрузки данных: {str(e)}"}), 500

@app.route('/api/categories')
def get_categories():
    """Получить список всех категорий"""
    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return jsonify({
            "categories": data.get("categories", []),
            "total": len(data.get("categories", []))
        })
    except Exception as e:
        return jsonify({"error": f"Ошибка загрузки категорий: {str(e)}"}), 500

@app.route('/api/badges')
def get_badges():
    """Получить список всех значков"""
    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Фильтрация по категории
        category_id = request.args.get('category_id')
        badges = data.get("badges", [])
        
        if category_id:
            badges = [badge for badge in badges if badge.get("category_id") == category_id]
        
        return jsonify({
            "badges": badges,
            "total": len(badges)
        })
    except Exception as e:
        return jsonify({"error": f"Ошибка загрузки значков: {str(e)}"}), 500

@app.route('/api/category/<category_id>')
def get_category(category_id):
    """Получить конкретную категорию по ID"""
    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        categories = data.get("categories", [])
        category = next((cat for cat in categories if cat.get("id") == category_id), None)
        
        if not category:
            return jsonify({"error": "Категория не найдена"}), 404
        
        # Получаем значки для этой категории
        badges = data.get("badges", [])
        category_badges = [badge for badge in badges if badge.get("category_id") == category_id]
        
        category["badges"] = category_badges
        
        return jsonify(category)
    except Exception as e:
        return jsonify({"error": f"Ошибка загрузки категории: {str(e)}"}), 500

@app.route('/api/badge/<badge_id>')
def get_badge(badge_id):
    """Получить конкретный значок по ID"""
    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        badges = data.get("badges", [])
        badge = next((badge for badge in badges if badge.get("id") == badge_id), None)
        
        if not badge:
            return jsonify({"error": "Значок не найден"}), 404
        
        return jsonify(badge)
    except Exception as e:
        return jsonify({"error": f"Ошибка загрузки значка: {str(e)}"}), 500

@app.route('/api/search')
def search_badges():
    """Поиск значков по названию или описанию"""
    try:
        query = request.args.get('q', '').lower()
        if not query:
            return jsonify({"error": "Необходим параметр 'q' для поиска"}), 400
        
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        badges = data.get("badges", [])
        results = []
        
        for badge in badges:
            title = badge.get("title", "").lower()
            description = badge.get("description", "").lower()
            
            if query in title or query in description:
                results.append(badge)
        
        return jsonify({
            "results": results,
            "total": len(results),
            "query": query
        })
    except Exception as e:
        return jsonify({"error": f"Ошибка поиска: {str(e)}"}), 500

@app.route('/api/stats')
def get_stats():
    """Получить статистику по значкам и категориям"""
    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Файл данных не найден"}), 404
        
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        categories = data.get("categories", [])
        badges = data.get("badges", [])
        
        # Статистика по уровням
        level_stats = {}
        for badge in badges:
            level = badge.get("level", "Неизвестно")
            level_stats[level] = level_stats.get(level, 0) + 1
        
        # Статистика по категориям
        category_stats = {}
        for category in categories:
            cat_id = category.get("id")
            cat_badges = [b for b in badges if b.get("category_id") == cat_id]
            category_stats[cat_id] = {
                "title": category.get("title"),
                "total_badges": len(cat_badges),
                "expected_badges": category.get("expected_badges", 0)
            }
        
        return jsonify({
            "total_categories": len(categories),
            "total_badges": len(badges),
            "level_distribution": level_stats,
            "category_distribution": category_stats,
            "metadata": data.get("metadata", {})
        })
    except Exception as e:
        return jsonify({"error": f"Ошибка загрузки статистики: {str(e)}"}), 500

@app.route('/perfect_parsed_data.json')
def serve_parsed_data():
    """Сервим файл с парсированными данными"""
    try:
        return send_from_directory(os.path.dirname(__file__), 'perfect_parsed_data.json')
    except Exception as e:
        return jsonify({"error": f"Файл не найден: {str(e)}"}), 404

def _auth_make_code_payload(device_id: str, camp_id: str, role: str, slot: int) -> str:
    """Payload для HMAC: deviceId|campId|role|slot"""
    return f"{device_id}|{camp_id or ''}|{role}|{slot}"


def _auth_compute_code(payload: str, secret: str) -> str:
    """HMAC-SHA256(payload, secret) -> первые 8 символов base32 (без padding)."""
    if not secret:
        return ""
    raw = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).digest()
    b32 = base64.b32encode(raw).decode("ascii").rstrip("=").upper()
    return b32[:8]


def _auth_verify_code(code: str, device_id: str, camp_id: str, role: str, secret: str) -> bool:
    """Проверяет код за последние AUTH_VERIFY_SLOTS слотов."""
    if not code or not device_id or not secret:
        return False
    now_slot = int(time.time() // AUTH_SLOT_SEC)
    for i in range(AUTH_VERIFY_SLOTS):
        slot = now_slot - i
        payload = _auth_make_code_payload(device_id, camp_id or "", role, slot)
        expected = _auth_compute_code(payload, secret)
        if secrets.compare_digest(code.strip().upper(), expected):
            return True
    return False


def _auth_create_jwt(role: str, camp_id: str, device_id: str, ttl_sec: int = 86400 * 7) -> str:
    """Создаёт JWT с role, campId, exp, deviceId."""
    if not AUTH_JWT_SECRET:
        return ""
    exp = int(time.time()) + ttl_sec
    payload = {"role": role, "campId": camp_id or "", "exp": exp, "deviceId": device_id}
    return jwt.encode(payload, AUTH_JWT_SECRET, algorithm="HS256")


@app.route('/api/dev/login', methods=['POST'])
def dev_login():
    """
    Dev-only login shortcut for localhost.
    POST /api/dev/login
    Body: { role, deviceId?, campId? }
    Returns: { accessToken, role, campId, exp }.
    NOT available in production (ENVIRONMENT=production).
    """
    if _is_production():
        return jsonify({"error": "Not found"}), 404
    if not _is_localhost_request():
        return jsonify({"error": "Forbidden"}), 403
    if not AUTH_JWT_SECRET:
        return jsonify({"error": "Auth not configured"}), 503
    try:
        data = request.get_json() or {}
        role = _normalize_role((data.get("role") or "participant").strip() or "participant")
        allowed = ("participant", "parent", "counselor", "shift_leader", "camp_director", "developer")
        if role not in allowed:
            return jsonify({"error": "Invalid role"}), 400
        device_id = (data.get("deviceId") or "").strip() or (request.headers.get("X-Device-Id") or "").strip() or "dev-local"
        camp_id = (data.get("campId") or "").strip() or ""
        access_token = _auth_create_jwt(role, camp_id, device_id)
        if not access_token:
            return jsonify({"error": "Token creation failed"}), 500
        exp_ts = jwt.decode(access_token, AUTH_JWT_SECRET, algorithms=["HS256"]).get("exp", 0)
        return jsonify({
            "accessToken": access_token,
            "role": role,
            "campId": camp_id,
            "exp": exp_ts
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/auth/generate-code', methods=['POST'])
def auth_generate_code():
    """
    POST /api/auth/generate-code
    Header: X-Generate-Code-Secret: <AUTH_GENERATE_SECRET>
    Body: { "deviceId": "uuid", "campId": "optional", "role": "participant" }
    Returns: { "code", "deviceId", "role", "expiresIn": "~40 min" } or 401.
    """
    secret_header = (request.headers.get('X-Generate-Code-Secret') or '').strip()
    if not AUTH_GENERATE_SECRET or not secrets.compare_digest(secret_header, AUTH_GENERATE_SECRET):
        return jsonify({"error": "Forbidden"}), 401
    if not AUTH_SECRET:
        return jsonify({"error": "Auth not configured"}), 503
    try:
        data = request.get_json() or {}
        device_id = (data.get("deviceId") or "").strip()
        camp_id = (data.get("campId") or "").strip() or ""
        role = _normalize_role((data.get("role") or "participant").strip() or "participant")
        if not device_id:
            return jsonify({"error": "deviceId required"}), 400
        if role not in CHAT_ALLOWED_ROLES:
            return jsonify({"error": "Invalid role"}), 400
        slot = int(time.time() // AUTH_SLOT_SEC)
        payload = _auth_make_code_payload(device_id, camp_id, role, slot)
        code = _auth_compute_code(payload, AUTH_SECRET)
        return jsonify({
            "code": code,
            "deviceId": device_id,
            "role": role,
            "expiresIn": "~40 min"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/auth/verify-code', methods=['POST'])
def auth_verify_code():
    """
    POST /api/auth/verify-code
    Body: { "code": "XXXXXXXX", "deviceId": "uuid", "campId": "optional" }
    Returns: { "accessToken", "role", "campId", "exp" } or 400/401.
    """
    if not AUTH_SECRET or not AUTH_JWT_SECRET:
        return jsonify({"error": "Auth not configured"}), 503
    try:
        data = request.get_json() or {}
        code = (data.get("code") or "").strip()
        device_id = (data.get("deviceId") or "").strip()
        camp_id = (data.get("campId") or "").strip() or None
        if not code or not device_id:
            return jsonify({"error": "code and deviceId required"}), 400
        role = None
        # Legacy support: accept verification codes issued for role "organizer" and map it to "shift_leader".
        for r in tuple(CHAT_ALLOWED_ROLES) + ("organizer",):
            if _auth_verify_code(code, device_id, camp_id or "", r, AUTH_SECRET):
                role = _normalize_role(r)
                break
        if not role:
            return jsonify({"error": "Invalid or expired code"}), 401
        access_token = _auth_create_jwt(role, camp_id, device_id)
        if not access_token:
            return jsonify({"error": "Token creation failed"}), 500
        exp_ts = jwt.decode(access_token, AUTH_JWT_SECRET, algorithms=["HS256"]).get("exp", 0)
        return jsonify({
            "accessToken": access_token,
            "role": role,
            "campId": camp_id or "",
            "exp": exp_ts
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _require_organizer_jwt():
    """
    Проверяет JWT для staff-flow эндпоинтов (смены/отряды/выдача кодов).
    Разрешены роли: shift_leader, camp_director, developer.
    Legacy: role "organizer" трактуем как "shift_leader".
    Returns: (payload, None) при успехе или (None, (response, status_code)) при ошибке.
    """
    auth_header = (request.headers.get('Authorization') or '').strip()
    token = auth_header[7:].strip() if auth_header.startswith('Bearer ') else ''
    remote = (request.remote_addr or '').strip()
    from_localhost = remote in ('127.0.0.1', '::1', 'localhost')

    if not token and from_localhost:
        device_id = (request.headers.get('X-Device-Id') or '').strip() or remote or 'dev'
        return {'role': 'developer', 'deviceId': device_id}, None

    if not auth_header.startswith('Bearer ') or not token:
        return None, (jsonify({"error": "Authorization required"}), 401)
    if not AUTH_JWT_SECRET:
        return None, (jsonify({"error": "Auth not configured"}), 503)
    try:
        payload = jwt.decode(token, AUTH_JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)
    except jwt.InvalidTokenError:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)
    role = _normalize_role((payload.get("role") or "").strip())
    payload["role"] = role
    if role not in ORGANIZER_ROLES:
        return None, (jsonify({"error": "Access denied for this role"}), 403)
    return payload, None


def _shifts_load() -> dict:
    """Load shifts via StorageProvider."""
    data = get_store("shifts").load()
    # Dev convenience: keep one default shift so manual testing does not require recreating it.
    data, _ = _ensure_default_shift_seeded(data)
    return data


def _shifts_save(data: dict):
    """Save shifts via StorageProvider."""
    get_store("shifts").save(data)


@app.route('/api/shifts', methods=['GET'])
def shifts_list():
    """GET /api/shifts — list shifts. Auth: participant/counselor/educator/shift_leader/camp_director/developer."""
    payload, err = _require_roles(("participant", "counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    try:
        data = _shifts_load()
        return jsonify({"shifts": data.get("shifts", [])})
    except ShiftSeedError:
        traceback.print_exc()
        return jsonify({"error": "Failed to seed default shift", "reason": "seed_error"}), 500
    except OSError:
        traceback.print_exc()
        return jsonify({"error": "Storage error", "reason": "storage_error"}), 500
    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Internal server error", "reason": "internal_error"}), 500


@app.route('/api/shifts', methods=['POST'])
def shifts_create():
    """POST /api/shifts — create shift (name, startDate, endDate). Auth: shift_leader/camp_director/developer."""
    payload, err = _require_organizer_jwt()
    if err is not None:
        return err[0], err[1]
    try:
        body = request.get_json() or {}
        name = (body.get("name") or "").strip()
        start_date = (body.get("startDate") or "").strip()
        end_date = (body.get("endDate") or "").strip()
        if not name:
            return jsonify({"error": "name required"}), 400
        doc = _shifts_load()
        shift_id = uuid.uuid4().hex[:12]
        created_at = datetime.now(timezone.utc).isoformat()
        created_by = (payload.get("deviceId") or "").strip() or None
        shift = {
            "id": shift_id,
            "name": name,
            "startDate": start_date,
            "endDate": end_date,
            "createdAt": created_at,
        }
        if created_by:
            shift["createdBy"] = created_by
        doc["shifts"].append(shift)
        _shifts_save(doc)
        return jsonify({"shift": shift})
    except ShiftSeedError:
        traceback.print_exc()
        return jsonify({"error": "Failed to seed default shift", "reason": "seed_error"}), 500
    except OSError:
        traceback.print_exc()
        return jsonify({"error": "Storage error", "reason": "storage_error"}), 500
    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Internal server error", "reason": "internal_error"}), 500


@app.route('/api/shifts/<shift_id>/squads', methods=['GET'])
def squads_list(shift_id: str):
    """GET /api/shifts/<shiftId>/squads — list squads in shift. Auth: participant/counselor/educator/shift_leader/camp_director/developer."""
    payload, err = _require_roles(("participant", "counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    sid = (shift_id or "").strip()
    if not sid:
        return jsonify({"error": "shiftId required"}), 400
    try:
        data = _shifts_load()
        corners_doc = _squad_corners_load()
        corners = corners_doc.get("corners") or {}
        if not isinstance(corners, dict):
            corners = {}
        squads = []
        for s in (data.get("squads") or []):
            if not isinstance(s, dict):
                continue
            if (s.get("shiftId") or "").strip() != sid:
                continue
            squad = dict(s)
            squad["avatarUrl"] = _pick_squad_avatar(corners.get((s.get("id") or "").strip()))
            squads.append(squad)
        return jsonify({"squads": squads})
    except ShiftSeedError:
        traceback.print_exc()
        return jsonify({"error": "Failed to seed default shift", "reason": "seed_error"}), 500
    except OSError:
        traceback.print_exc()
        return jsonify({"error": "Storage error", "reason": "storage_error"}), 500
    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Internal server error", "reason": "internal_error"}), 500


@app.route('/api/shifts/<shift_id>/squads', methods=['POST'])
def squads_create(shift_id: str):
    """
    POST /api/shifts/<shiftId>/squads — create squad (name).
    Auth: counselor|shift_leader|camp_director|developer

    Counselor is allowed to create squads only inside their own shift (campId match).
    """
    payload, err = _require_roles(("counselor", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    sid = (shift_id or "").strip()
    if not sid:
        return jsonify({"error": "shiftId required"}), 400
    try:
        body = request.get_json() or {}
        name = (body.get("name") or "").strip()
        if not name:
            return jsonify({"error": "name required"}), 400
        doc = _shifts_load()
        shift = _find_shift(doc, sid)
        if not shift:
            return jsonify({"error": "Shift not found"}), 404

        actor_role = _normalize_role((payload.get("role") or "").strip())
        token_camp_id = (payload.get("campId") or "").strip()
        if actor_role == "counselor":
            # Counselor can only create squads within their shift.
            # Dev-local sandbox can omit campId; allow only for the seeded default shift.
            if token_camp_id and token_camp_id != sid:
                return jsonify({"error": "Access denied", "reason": "camp_mismatch"}), 403
            if not token_camp_id and not _is_default_seeded_shift_name(shift.get("name") or ""):
                return jsonify({"error": "Access denied", "reason": "camp_mismatch"}), 403
        squad_id = uuid.uuid4().hex[:12]
        created_at = datetime.now(timezone.utc).isoformat()
        created_by = (payload.get("deviceId") or "").strip() or None
        squad = {
            "id": squad_id,
            "shiftId": sid,
            "name": name,
            "createdAt": created_at,
        }
        if created_by:
            squad["createdBy"] = created_by
        doc["squads"].append(squad)
        _shifts_save(doc)
        return jsonify({"squad": squad})
    except ShiftSeedError:
        traceback.print_exc()
        return jsonify({"error": "Failed to seed default shift", "reason": "seed_error"}), 500
    except OSError:
        traceback.print_exc()
        return jsonify({"error": "Storage error", "reason": "storage_error"}), 500
    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Internal server error", "reason": "internal_error"}), 500


@app.route('/api/squads/<squad_id>', methods=['DELETE'])
def squad_delete(squad_id: str):
    """
    DELETE /api/squads/<squadId> — hard delete squad and related data.
    Auth: shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    sid = (squad_id or "").strip()
    if not sid:
        return jsonify({"error": "squadId required"}), 400

    shifts_doc = _shifts_load()
    squads = shifts_doc.get("squads") or []
    if not isinstance(squads, list):
        squads = []
    target = _find_squad(shifts_doc, sid)
    if not target:
        return jsonify({"error": "Squad not found"}), 404

    shifts_doc["squads"] = [
        row for row in squads
        if not (isinstance(row, dict) and (row.get("id") or "").strip() == sid)
    ]
    _shifts_save(shifts_doc)

    cleanup = _cleanup_squad_related_data({sid}, {(target.get("shiftId") or "").strip()})
    return jsonify({
        "ok": True,
        "deleted": {
            "shifts": 0,
            "squads": 1,
            "memberships": cleanup["memberships"],
            "corners": cleanup["corners"],
            "chats": cleanup["chats"],
            "inviteCodes": cleanup["inviteCodes"],
            "badgeRequests": cleanup["badgeRequests"]
        }
    })


@app.route('/api/shifts/<shift_id>', methods=['DELETE'])
def shift_delete(shift_id: str):
    """
    DELETE /api/shifts/<shiftId> — hard delete shift, its squads and related data.
    Auth: shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    sid = (shift_id or "").strip()
    if not sid:
        return jsonify({"error": "shiftId required"}), 400

    shifts_doc = _shifts_load()
    shift = _find_shift(shifts_doc, sid)
    if not shift:
        return jsonify({"error": "Shift not found"}), 404
    if _is_default_seeded_shift_name(shift.get("name") or ""):
        return jsonify({"error": "Default shift cannot be deleted", "reason": "default_shift"}), 409

    squads = shifts_doc.get("squads") or []
    if not isinstance(squads, list):
        squads = []
    target_squad_ids = {
        (row.get("id") or "").strip()
        for row in squads
        if isinstance(row, dict) and (row.get("shiftId") or "").strip() == sid
    }

    shifts_doc["shifts"] = [
        row for row in (shifts_doc.get("shifts") or [])
        if not (isinstance(row, dict) and (row.get("id") or "").strip() == sid)
    ]
    shifts_doc["squads"] = [
        row for row in squads
        if not (isinstance(row, dict) and ((row.get("shiftId") or "").strip() == sid or (row.get("id") or "").strip() in target_squad_ids))
    ]
    _shifts_save(shifts_doc)

    cleanup = _cleanup_squad_related_data(target_squad_ids, {sid})
    return jsonify({
        "ok": True,
        "deleted": {
            "shifts": 1,
            "squads": len(target_squad_ids),
            "memberships": cleanup["memberships"],
            "corners": cleanup["corners"],
            "chats": cleanup["chats"],
            "inviteCodes": cleanup["inviteCodes"],
            "badgeRequests": cleanup["badgeRequests"]
        }
    })


@app.route('/api/squads/<squad_id>/join', methods=['POST'])
def squad_join(squad_id: str):
    """
    POST /api/squads/<squadId>/join
    Auth: participant|counselor|educator|shift_leader|camp_director|developer
    Body: { nickname?: string, role?: participant|counselor|shift_leader|camp_director (for developer only) }
    """
    payload, err = _require_roles(("participant", "counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get("deviceId") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId missing in token"}), 400
    sid = (squad_id or "").strip()
    if not sid:
        return jsonify({"error": "squadId required"}), 400

    shifts_doc = _shifts_load()
    squad = _find_squad(shifts_doc, sid)
    if not squad:
        return jsonify({"error": "Squad not found"}), 404

    body = request.get_json() or {}
    nickname = (body.get("nickname") or "").strip()
    requested_role = _normalize_role((body.get("role") or "").strip() or "participant")
    actor_role = _normalize_role((payload.get("role") or "").strip())
    membership_role = actor_role
    if actor_role == "developer":
        membership_role = requested_role if requested_role in ("participant", "counselor", "shift_leader", "camp_director") else "participant"

    now_iso = datetime.now(timezone.utc).isoformat()
    camp_id = (squad.get("shiftId") or "").strip()
    token_camp_id = (payload.get("campId") or "").strip()
    if actor_role != "developer" and token_camp_id and token_camp_id != camp_id:
        return jsonify({"error": "Access denied", "reason": "camp_mismatch"}), 403

    mdoc = _memberships_load()
    members = [
        row for row in (mdoc.get("members") or [])
        if not (isinstance(row, dict) and (row.get("deviceId") or "").strip() == device_id)
    ]
    membership = {
        "deviceId": device_id,
        "campId": camp_id,
        "squadId": sid,
        "role": membership_role,
        "joinedAt": now_iso
    }
    if nickname:
        membership["nickname"] = nickname
    members.append(membership)
    mdoc["members"] = members
    _memberships_save(mdoc)
    return jsonify({"membership": membership, "squad": squad})


@app.route('/api/squads/mine', methods=['GET'])
def squads_mine():
    """
    GET /api/squads/mine
    Auth: participant|counselor|educator|shift_leader|camp_director|developer
    Returns: membership + squad/shift meta.
    """
    payload, err = _require_roles(("participant", "counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get("deviceId") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId missing in token"}), 400

    mdoc = _memberships_load()
    membership = _membership_for_device(mdoc, device_id)
    if not membership:
        return jsonify({"membership": None, "squad": None, "shift": None, "participants": [], "members": []})

    shifts_doc = _shifts_load()
    squad_id = (membership.get("squadId") or "").strip()
    camp_id = (membership.get("campId") or "").strip()
    squad = _find_squad(shifts_doc, squad_id)
    shift = _find_shift(shifts_doc, camp_id) or _find_shift(shifts_doc, (squad or {}).get("shiftId") or "")
    members, participants = _build_squad_members_lists(squad_id, camp_id or ((squad or {}).get("shiftId") or ""))

    return jsonify({
        "membership": membership,
        "squad": squad,
        "shift": shift,
        "participants": participants,
        "members": members
    })


@app.route('/api/squads/<squad_id>/corner', methods=['GET', 'PATCH'])
def squad_corner_get_or_patch(squad_id: str):
    """
    GET /api/squads/<squadId>/corner — get shared squad corner (server-synced).
    PATCH /api/squads/<squadId>/corner — update shared corner (staff only).
    Auth: participant|parent|counselor|shift_leader|camp_director|developer (GET), counselor|shift_leader|camp_director|developer (PATCH).
    """
    if request.method == 'PATCH':
        payload, err = _require_roles(("counselor", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    else:
        payload, err = _require_roles(("participant", "counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    sid = (squad_id or "").strip()
    if not sid:
        return jsonify({"error": "squadId required"}), 400
    shifts_doc = _shifts_load()
    squad = _find_squad(shifts_doc, sid)
    if not squad:
        return jsonify({"error": "Squad not found"}), 404

    device_id = (payload.get("deviceId") or "").strip()
    membership = _membership_in_squad(device_id, sid) if device_id else None

    if request.method == 'GET':
        if not _can_read_corner(payload, squad, membership):
            return jsonify({"error": "Access denied"}), 403
        doc = _squad_corners_load()
        corners = doc.get("corners") or {}
        corner = corners.get(sid)
        if not isinstance(corner, dict):
            corner = {}
        return jsonify({"squadId": sid, "corner": corner})

    can_manage, deny_reason = _can_manage_squad(payload, squad, membership)
    if not can_manage:
        return jsonify({"error": "Access denied", "reason": deny_reason or "role_forbidden"}), 403

    content_len = request.content_length
    if isinstance(content_len, int) and content_len > SQUAD_CORNER_PATCH_LIMIT_BYTES:
        return jsonify({"error": "Payload too large"}), 413
    raw = request.get_data(cache=True, as_text=False) or b""
    if len(raw) > SQUAD_CORNER_PATCH_LIMIT_BYTES:
        return jsonify({"error": "Payload too large"}), 413

    body = request.get_json(silent=True) or {}
    if not isinstance(body, dict):
        return jsonify({"error": "Invalid payload"}), 400
    allowed_keys = (
        "name",
        "motto",
        "chants",
        "greeting",
        "memes",
        "photoCorner",
        "photoFlag",
        "photoSquad",
        "photoWithCounselors",
        "planGridA",
        "planGridB",
    )

    doc = _squad_corners_load()
    corners = doc.get("corners") or {}
    if not isinstance(corners, dict):
        corners = {}
    current = corners.get(sid)
    next_corner = dict(current) if isinstance(current, dict) else {}
    for key in allowed_keys:
        if key not in body:
            continue
        value = body.get(key)
        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                next_corner.pop(key, None)
                continue
            next_corner[key] = trimmed
            continue
        if value is None:
            next_corner.pop(key, None)
            continue
        next_corner[key] = value

    now_iso = datetime.now(timezone.utc).isoformat()
    next_corner["updatedAt"] = now_iso
    next_corner["updatedBy"] = device_id
    corners[sid] = next_corner
    doc["corners"] = corners
    _squad_corners_save(doc)
    return jsonify({"squadId": sid, "corner": next_corner, "updatedAt": now_iso})


@app.route('/api/squads/<squad_id>/invite-code', methods=['POST'])
def squad_invite_code_create(squad_id: str):
    """
    POST /api/squads/<squadId>/invite-code — create invite code for joining the squad.
    Auth: counselor|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("counselor", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    sid = (squad_id or "").strip()
    if not sid:
        return jsonify({"error": "squadId required"}), 400

    shifts_doc = _shifts_load()
    squad = _find_squad(shifts_doc, sid)
    if not squad:
        return jsonify({"error": "Squad not found"}), 404
    membership = _membership_in_squad((payload.get("deviceId") or "").strip(), sid)
    can_manage, deny_reason = _can_manage_squad(payload, squad, membership)
    if not can_manage:
        return jsonify({"error": "Access denied", "reason": deny_reason or "role_forbidden"}), 403

    created_at_dt = datetime.now(timezone.utc)
    expires_at_dt = datetime.fromtimestamp(
        created_at_dt.timestamp() + max(60, int(SQUAD_INVITE_TTL_SEC or 0)),
        tz=timezone.utc
    )

    doc = _squad_invites_load()
    doc, changed = _squad_invites_prune(doc)
    codes = doc.get("codes") or {}
    if not isinstance(codes, dict):
        codes = {}

    # One active code per squad.
    for existing_code in list(codes.keys()):
        meta = codes.get(existing_code)
        if not isinstance(meta, dict):
            continue
        if (meta.get("squadId") or "").strip() == sid:
            del codes[existing_code]

    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    code = ""
    for _ in range(100):
        candidate = "".join(secrets.choice(alphabet) for _ in range(8))
        if candidate not in codes:
            code = candidate
            break
    if not code:
        return jsonify({"error": "Invite code generation failed"}), 500

    created_at = created_at_dt.isoformat()
    expires_at = expires_at_dt.isoformat()
    codes[code] = {
        "squadId": sid,
        "createdAt": created_at,
        "expiresAt": expires_at,
        "createdBy": (payload.get("deviceId") or "").strip() or None
    }
    doc["codes"] = codes
    _squad_invites_save(doc)
    return jsonify({"squadId": sid, "code": code, "createdAt": created_at, "expiresAt": expires_at})


def _resolve_invite_code_response(code: str):
    invite_code = (code or "").strip().upper()
    if not invite_code:
        return jsonify({"error": "code required"}), 400
    doc = _squad_invites_load()
    doc, changed = _squad_invites_prune(doc)
    if changed:
        _squad_invites_save(doc)
        doc = _squad_invites_load()
    meta = (doc.get("codes") or {}).get(invite_code)
    if not isinstance(meta, dict):
        return jsonify({"error": "Invite code not found"}), 404
    squad_id = (meta.get("squadId") or "").strip()
    if not squad_id:
        return jsonify({"error": "Invite code invalid"}), 404
    shifts_doc = _shifts_load()
    squad = _find_squad(shifts_doc, squad_id)
    if not squad:
        return jsonify({"error": "Squad not found"}), 404
    shift = _find_shift(shifts_doc, (squad.get("shiftId") or "").strip())
    return jsonify({
        "squadId": squad_id,
        "squadName": squad.get("name"),
        "shiftId": shift.get("id") if isinstance(shift, dict) else None,
        "shiftName": shift.get("name") if isinstance(shift, dict) else None
    })


@app.route('/api/squads/resolve-invite', methods=['GET'])
def squad_invite_code_resolve():
    """
    Legacy alias for code resolving.
    """
    payload, err = _require_roles(("participant", "counselor", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    return _resolve_invite_code_response(request.args.get("code") or "")


@app.route('/api/squads/by-invite-code', methods=['GET'])
def squad_invite_code_resolve_v2():
    """
    GET /api/squads/by-invite-code?code=XXXXXX — resolve invite code to squad meta.
    Auth: participant|counselor|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("participant", "counselor", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    return _resolve_invite_code_response(request.args.get("code") or "")


@app.route('/api/squads/<squad_id>/preview', methods=['GET'])
def squad_preview(squad_id: str):
    """
    GET /api/squads/<squadId>/preview — minimal squad info for join modal.
    Auth required.
    """
    payload, err = _require_roles(("participant", "counselor", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    sid = (squad_id or "").strip()
    if not sid:
        return jsonify({"error": "squadId required"}), 400
    shifts_doc = _shifts_load()
    squad = _find_squad(shifts_doc, sid)
    if not squad:
        return jsonify({"error": "Squad not found"}), 404
    shift = _find_shift(shifts_doc, (squad.get("shiftId") or "").strip())
    return jsonify({
        "squadId": sid,
        "squadName": squad.get("name"),
        "shiftId": shift.get("id") if isinstance(shift, dict) else (squad.get("shiftId") or None),
        "shiftName": shift.get("name") if isinstance(shift, dict) else None
    })


@app.route('/api/squads/<squad_id>/leave', methods=['POST'])
def squad_leave(squad_id: str):
    """
    POST /api/squads/<squadId>/leave — leave the squad.
    Auth: participant|parent|counselor|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("participant", "parent", "counselor", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get("deviceId") or "").strip()
    sid = (squad_id or "").strip()
    if not sid:
        return jsonify({"error": "squadId required"}), 400
    membership = _membership_in_squad(device_id, sid)
    if not membership:
        return jsonify({"status": "left", "squadId": sid, "membership": None})

    mdoc = _memberships_load()
    members = [
        row for row in (mdoc.get("members") or [])
        if not (isinstance(row, dict) and (row.get("deviceId") or "").strip() == device_id and (row.get("squadId") or "").strip() == sid)
    ]
    mdoc["members"] = members
    _memberships_save(mdoc)
    return jsonify({"status": "left", "squadId": sid, "membership": None})


def _kick_member_impl(payload: dict, squad_id: str, target_device_id: str):
    sid = (squad_id or "").strip()
    if not sid:
        return jsonify({"error": "squadId required"}), 400
    target_device = (target_device_id or "").strip()
    if not target_device:
        return jsonify({"error": "deviceId required"}), 400
    actor_device = (payload.get("deviceId") or "").strip()
    if actor_device and target_device == actor_device:
        return jsonify({"error": "Cannot kick yourself", "reason": "self_kick"}), 409

    shifts_doc = _shifts_load()
    squad = _find_squad(shifts_doc, sid)
    if not squad:
        return jsonify({"error": "Squad not found"}), 404
    membership = _membership_in_squad(actor_device, sid) if actor_device else None
    can_manage, deny_reason = _can_manage_squad(payload, squad, membership)
    if not can_manage:
        return jsonify({"error": "Access denied", "reason": deny_reason or "role_forbidden"}), 403

    mdoc = _memberships_load()
    removed = False
    next_members = []
    for row in (mdoc.get("members") or []):
        if not isinstance(row, dict):
            continue
        if (row.get("deviceId") or "").strip() == target_device and (row.get("squadId") or "").strip() == sid:
            removed = True
            continue
        next_members.append(row)
    if removed:
        mdoc["members"] = next_members
        _memberships_save(mdoc)

    camp_id = (squad.get("shiftId") or "").strip()
    members, participants = _build_squad_members_lists(sid, camp_id)
    return jsonify({"squadId": sid, "members": members, "participants": participants})


@app.route('/api/squads/<squad_id>/members/<target_device_id>', methods=['DELETE'])
def squad_kick_member_delete(squad_id: str, target_device_id: str):
    """
    DELETE /api/squads/<squadId>/members/<deviceId> — remove member from squad.
    Auth: counselor|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("counselor", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    return _kick_member_impl(payload, squad_id, target_device_id)


@app.route('/api/squads/<squad_id>/kick', methods=['POST'])
def squad_kick_member(squad_id: str):
    """
    POST /api/squads/<squadId>/kick — legacy alias for member removal.
    Auth: counselor|shift_leader|camp_director|developer
    Body: { deviceId: string }
    """
    payload, err = _require_roles(("counselor", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    body = request.get_json() or {}
    target_device_id = (body.get("deviceId") or "").strip()
    return _kick_member_impl(payload, squad_id, target_device_id)


@app.route('/api/squads/<squad_id>/messages', methods=['GET', 'POST'])
def squad_messages_get_or_post(squad_id: str):
    """
    GET /api/squads/<squadId>/messages?limit=50 — get squad chat messages.
    POST /api/squads/<squadId>/messages — post message.
    Auth: participant|parent|counselor|educator|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("participant", "parent", "counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    sid = (squad_id or "").strip()
    if not sid:
        return jsonify({"error": "squadId required"}), 400
    device_id = (payload.get("deviceId") or "").strip()
    role = _normalize_role((payload.get("role") or "").strip())
    membership = _membership_in_squad(device_id, sid) if device_id else None
    can_bypass = role == "developer" and _is_localhost_request()
    if not membership and not can_bypass:
        return jsonify({"error": "Not a member of this squad"}), 403

    doc = _squad_messages_load()
    by_squad = doc.get("bySquadId") or {}
    if not isinstance(by_squad, dict):
        by_squad = {}
    rows = by_squad.get(sid)
    if not isinstance(rows, list):
        rows = []

    if request.method == 'GET':
        try:
            limit = int((request.args.get("limit") or str(SQUAD_MESSAGES_DEFAULT_LIMIT)).strip())
        except ValueError:
            limit = SQUAD_MESSAGES_DEFAULT_LIMIT
        limit = max(1, min(SQUAD_MESSAGES_MAX_LIMIT, limit))
        before_msg_id = (request.args.get("before") or "").strip()
        ordered = [r for r in rows if isinstance(r, dict)]
        if before_msg_id:
            before_index = next((idx for idx, item in enumerate(ordered) if (item.get("id") or "").strip() == before_msg_id), None)
            if before_index is not None:
                ordered = ordered[:before_index]
        has_more = len(ordered) > limit
        out = ordered[-limit:]
        return jsonify({"squadId": sid, "messages": out, "hasMore": has_more})

    # Per-minute rate limit (in addition to daily limit)
    if not _check_squad_msg_rate_limit(device_id):
        _log_rate_limit_event('/api/squads/messages', device_id)
        return jsonify({"error": f"Слишком много сообщений. Подождите немного (лимит: {SQUAD_MSG_RATE_LIMIT_PER_MIN} сообщений в минуту)"}), 429

    ok, rate_err = _check_and_inc_chat_daily(device_id)
    if not ok and rate_err is not None:
        _log_rate_limit_event('/api/squads/messages/daily', device_id)
        return rate_err[0], rate_err[1]

    body = request.get_json() or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text required"}), 400

    # Safety validation: length, URL filter, profanity filter
    clean_text, validation_error = _validate_squad_message(text)
    if validation_error:
        return jsonify({"error": validation_error}), 400

    msg = {
        "id": uuid.uuid4().hex[:12],
        "squadId": sid,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "deviceId": device_id or None,
        "nickname": ((membership or {}).get("nickname") or "").strip() or None,
        "role": role,
        "text": clean_text
    }
    rows.append(msg)
    rows = rows[-SQUAD_MESSAGES_MAX_HISTORY:]
    by_squad[sid] = rows
    doc["bySquadId"] = by_squad
    _squad_messages_save(doc)
    return jsonify({"message": msg})


@app.route('/api/badges/requests', methods=['POST'])
def badge_request_create():
    """
    POST /api/badges/requests
    Auth: participant|developer
    Body: { levelId, evidence?, badgeTitle? }
    """
    payload, err = _require_roles(("participant", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get("deviceId") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId missing in token"}), 400

    body = request.get_json() or {}
    level_id = (body.get("levelId") or "").strip()
    if not _is_valid_level_id(level_id):
        return jsonify({"error": "Invalid levelId"}), 400

    evidence_in = body.get("evidence") if isinstance(body.get("evidence"), dict) else {}
    evidence = {}
    for key, limit in (("reflection", 1200), ("impact", 1200), ("link", 2000)):
        raw = evidence_in.get(key)
        if isinstance(raw, str):
            cleaned = raw.strip()
            if cleaned:
                evidence[key] = cleaned[:limit]

    camp_from_token = (payload.get("campId") or "").strip()
    camp_from_membership, squad_from_membership = _resolve_membership_context(device_id)
    camp_id = camp_from_membership or camp_from_token or ""
    squad_id = squad_from_membership or ""

    now_iso = datetime.now(timezone.utc).isoformat()
    request_doc = {
        "id": f"BR-{uuid.uuid4().hex[:10].upper()}",
        "createdAt": now_iso,
        "status": "pending",
        "levelId": level_id,
        "badgeTitle": (body.get("badgeTitle") or "").strip()[:180] or None,
        "requestedBy": {
            "deviceId": device_id,
            "nickname": (body.get("nickname") or "").strip()[:120] or None
        },
        "campId": camp_id,
        "squadId": squad_id or None,
        "evidence": evidence or None,
        "resolvedAt": None,
        "resolvedBy": None
    }

    bdoc = _badge_requests_load()
    bdoc["requests"].append(request_doc)
    _badge_requests_save(bdoc)
    return jsonify({"request": request_doc}), 201


def _project_mine_row(row: dict) -> dict:
    """Return badge request row without requestedBy.deviceId (privacy projection)."""
    result = {k: v for k, v in row.items() if k != "requestedBy"}
    req_by = row.get("requestedBy") or {}
    if req_by:
        result["requestedBy"] = {"nickname": req_by.get("nickname")}
    return result


@app.route('/api/badges/requests/mine', methods=['GET'])
def badge_request_mine():
    """
    GET /api/badges/requests/mine
    Auth: participant|parent|educator|counselor|shift_leader|developer
    Returns own badge requests (filtered by deviceId from JWT), newest-first.
    Privacy: requestedBy.deviceId is stripped from response.
    """
    payload, err = _require_roles(
        ("participant", "parent", "educator", "counselor", "shift_leader", "developer"),
        allow_localhost_dev=True,
    )
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get("deviceId") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId missing in token"}), 400

    bdoc = _badge_requests_load()
    rows = [
        _project_mine_row(row)
        for row in (bdoc.get("requests") or [])
        if isinstance(row, dict) and (
            isinstance(row.get("requestedBy"), dict) and
            (row.get("requestedBy", {}).get("deviceId") or "").strip() == device_id
        )
    ]
    rows.sort(key=lambda item: _parse_iso_ts(item.get("createdAt") or ""), reverse=True)
    return jsonify({"requests": rows})


@app.route('/api/badges/requests/inbox', methods=['GET'])
def badge_request_inbox():
    """
    GET /api/badges/requests/inbox?campId=&squadId=&status=
    Auth: counselor|educator|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    device_id = (payload.get("deviceId") or "").strip()
    actor_role = _normalize_role((payload.get("role") or "").strip())
    camp_filter = (request.args.get("campId") or "").strip()
    squad_filter = (request.args.get("squadId") or "").strip()
    status_filter = (request.args.get("status") or "").strip()
    if status_filter and status_filter not in ("pending", "approved", "rejected"):
        return jsonify({"error": "Invalid status filter"}), 400

    if actor_role in ("counselor", "educator") and not camp_filter and not squad_filter:
        camp_self, squad_self = _resolve_membership_context(device_id)
        camp_filter = camp_self
        squad_filter = squad_self

    include_resolved = (request.args.get("includeResolved") or "").lower() in ("true", "1", "yes")
    cutoff_ts = time.time() - BADGE_REQUESTS_RESOLVED_TTL_DAYS * 86400

    store = get_store("badge_requests")
    if hasattr(store, "load_inbox"):
        rows = store.load_inbox(
            camp_id=camp_filter or None,
            squad_id=squad_filter or None,
            status_filter=status_filter or None,
            include_resolved=include_resolved,
            resolved_ttl_days=BADGE_REQUESTS_RESOLVED_TTL_DAYS,
        )
    else:
        bdoc = _badge_requests_load()
        rows = []
        for row in (bdoc.get("requests") or []):
            if not isinstance(row, dict):
                continue
            if camp_filter and (row.get("campId") or "").strip() != camp_filter:
                continue
            if squad_filter and (row.get("squadId") or "").strip() != squad_filter:
                continue
            row_status = (row.get("status") or "").strip()
            if status_filter and row_status != status_filter:
                continue
            if not include_resolved and row_status != "pending":
                resolved_at = row.get("resolvedAt") or ""
                row_ts = _parse_iso_ts(resolved_at) if resolved_at else 0
                if row_ts < cutoff_ts:
                    continue
            rows.append(row)

    rows.sort(
        key=lambda item: (
            0 if (item.get("status") or "").strip() == "pending" else 1,
            -_parse_iso_ts(item.get("createdAt") or "")
        )
    )
    return jsonify({"requests": rows})


def _badge_request_resolve(request_id: str, next_status: str):
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    rid = (request_id or "").strip()
    if not rid:
        return jsonify({"error": "request id required"}), 400

    body = request.get_json() or {}
    note = (body.get("note") or "").strip()
    now_iso = datetime.now(timezone.utc).isoformat()

    bdoc = _badge_requests_load()
    rows = bdoc.get("requests") or []
    found_idx = -1
    for idx, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        if (row.get("id") or "").strip().lower() == rid.lower():
            found_idx = idx
            break
    if found_idx < 0:
        return jsonify({"error": "Request not found"}), 404

    row = rows[found_idx]
    current_status = (row.get("status") or "").strip()
    if current_status != "pending":
        return jsonify({"error": f"Request already resolved: {current_status}"}), 409

    row["status"] = next_status
    row["resolvedAt"] = now_iso
    row["resolvedBy"] = {
        "deviceId": (payload.get("deviceId") or "").strip() or None,
        "role": _normalize_role((payload.get("role") or "").strip())
    }
    if note:
        row["resolutionNote"] = note[:2000]
    rows[found_idx] = row
    bdoc["requests"] = rows
    _badge_requests_save(bdoc)

    if next_status == "approved":
        req_by = row.get("requestedBy") if isinstance(row.get("requestedBy"), dict) else {}
        user_id = (req_by.get("deviceId") or "").strip() or ""
        level_id = (row.get("levelId") or "").strip()
        evidence = row.get("evidence") if isinstance(row.get("evidence"), dict) else {}
        reflection = (evidence.get("reflection") or "").strip()[:1200] or None
        if level_id and user_id:
            import events as ev
            ev.append_level_achieved_event(ev.LevelAchievedEvent(
                levelId=level_id,
                userId=user_id,
                achievedAt=now_iso,
                reflection=reflection,
            ))

    return jsonify({"request": row})


@app.route('/api/badges/requests/<request_id>/approve', methods=['POST'])
def badge_request_approve(request_id: str):
    return _badge_request_resolve(request_id, "approved")


@app.route('/api/badges/requests/<request_id>/reject', methods=['POST'])
def badge_request_reject(request_id: str):
    return _badge_request_resolve(request_id, "rejected")


@app.route('/api/badges/requests/cleanup', methods=['POST'])
def badge_requests_cleanup():
    """
    POST /api/badges/requests/cleanup
    Auth: shift_leader | developer
    Body: { "olderThanDays": 30 }  // optional, default from BADGE_REQUESTS_RESOLVED_TTL_DAYS
    Response: { "deleted": N }
    Deletes approved/rejected requests older than N days. Logs [BADGE_CLEANUP].
    """
    payload, err = _require_roles(("shift_leader", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get("deviceId") or "").strip()
    body = request.get_json() or {}
    try:
        older_than_days = int(body.get("olderThanDays") or BADGE_REQUESTS_RESOLVED_TTL_DAYS)
    except (TypeError, ValueError):
        return jsonify({"error": "olderThanDays must be an integer"}), 400
    if older_than_days < 0:
        return jsonify({"error": "olderThanDays must be non-negative"}), 400
    cutoff_ts = time.time() - older_than_days * 86400

    bdoc = _badge_requests_load()
    before = len(bdoc.get("requests") or [])
    kept = []
    for row in (bdoc.get("requests") or []):
        if not isinstance(row, dict):
            continue
        row_status = (row.get("status") or "").strip()
        if row_status in ("approved", "rejected"):
            resolved_at = row.get("resolvedAt") or ""
            row_ts = _parse_iso_ts(resolved_at) if resolved_at else 0
            if row_ts < cutoff_ts:
                continue
        kept.append(row)
    deleted = before - len(kept)
    bdoc["requests"] = kept
    _badge_requests_save(bdoc)
    hashed_device = hashlib.sha256(device_id.encode()).hexdigest()[:12] if device_id else "unknown"
    app.logger.info(
        f"[BADGE_CLEANUP] deleted={deleted} actor={hashed_device} ts={datetime.now(timezone.utc).isoformat()}"
    )
    return jsonify({"deleted": deleted})


@app.route('/api/badges/approvals/mine', methods=['GET'])
def badge_approvals_mine():
    """
    GET /api/badges/approvals/mine
    Auth: participant|developer
    """
    payload, err = _require_roles(("participant", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get("deviceId") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId missing in token"}), 400

    bdoc = _badge_requests_load()
    approvals = []
    for row in (bdoc.get("requests") or []):
        if not isinstance(row, dict):
            continue
        if (row.get("status") or "").strip() != "approved":
            continue
        req_by = row.get("requestedBy") if isinstance(row.get("requestedBy"), dict) else {}
        if (req_by.get("deviceId") or "").strip() != device_id:
            continue
        approvals.append({
            "requestId": row.get("id"),
            "levelId": row.get("levelId"),
            "approvedAt": row.get("resolvedAt") or row.get("createdAt"),
            "evidence": row.get("evidence"),
            "badgeTitle": row.get("badgeTitle"),
            "campId": row.get("campId"),
            "squadId": row.get("squadId")
        })
    approvals.sort(key=lambda item: _parse_iso_ts(item.get("approvedAt") or ""), reverse=True)
    return jsonify({"approvals": approvals})


@app.route('/api/organizer/generate-code', methods=['POST'])
def organizer_generate_code():
    """
    POST /api/organizer/generate-code
    Body: { "deviceId": "uuid", "role": "participant", "shiftId": "optional" }
    Requires JWT for staff-flow (shift_leader/camp_director/developer). Uses AUTH_SECRET for code generation.
    """
    payload, err = _require_organizer_jwt()
    if err is not None:
        return err[0], err[1]
    if not AUTH_SECRET:
        return jsonify({"error": "Auth not configured"}), 503
    try:
        data = request.get_json() or {}
        device_id = (data.get("deviceId") or "").strip()
        role = _normalize_role((data.get("role") or "participant").strip() or "participant")
        shift_id = (data.get("shiftId") or "").strip() or ""
        if not device_id:
            return jsonify({"error": "deviceId required"}), 400
        if role not in CHAT_ALLOWED_ROLES:
            return jsonify({"error": "Invalid role"}), 400
        slot = int(time.time() // AUTH_SLOT_SEC)
        payload_str = _auth_make_code_payload(device_id, shift_id, role, slot)
        code = _auth_compute_code(payload_str, AUTH_SECRET)
        return jsonify({
            "code": code,
            "deviceId": device_id,
            "role": role,
            "shiftId": shift_id,
            "expiresIn": "~40 min"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/parent-snapshot', methods=['POST'])
def parent_snapshot_create():
    """
    POST /api/parent-snapshot
    Header: Authorization: Bearer <accessToken> (role participant).
    Body: { "progress": {...}, "profile": { "nickname": "...", "totalLevelsAchieved": N }, "exportedAt": "ISO" }
    Returns: { "parentLinkCode": "<code>", "expiresAt": <unix_ts> } or 400/401/403.
    """
    payload, err = _require_parent_snapshot_auth()
    if err:
        return err[0], err[1]
    try:
        data = request.get_json() or {}
        progress = data.get("progress")
        if progress is None or not isinstance(progress, dict):
            return jsonify({"error": "progress (object) required"}), 400
        profile = data.get("profile")
        if profile is not None and not isinstance(profile, dict):
            profile = None
        exported_at = (data.get("exportedAt") or "").strip() or datetime.now(timezone.utc).isoformat()
        expires_at = int(time.time()) + PARENT_SNAPSHOT_TTL_DAYS * 86400
        snapshot = {
            "progress": progress,
            "profile": profile,
            "exportedAt": exported_at,
            "expiresAt": expires_at,
        }
        snapshots = _parent_snapshots_load()
        now_ts = int(time.time())
        snapshots = {k: v for k, v in snapshots.items() if isinstance(v, dict) and (v.get("expiresAt") or 0) > now_ts}
        for _ in range(10):
            code = secrets.token_urlsafe(6).replace("-", "").replace("_", "")[:8]
            if not code or code in snapshots:
                continue
            snapshots[code] = snapshot
            _parent_snapshots_save(snapshots)
            return jsonify({"parentLinkCode": code, "expiresAt": expires_at})
        return jsonify({"error": "Could not generate unique code"}), 500
    except OSError:
        return jsonify({"error": "Storage error"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/parent-snapshot', methods=['GET'])
def parent_snapshot_get():
    """
    GET /api/parent-snapshot?code=XXX
    No auth. Returns { progress, profile?, exportedAt } or 404/410.
    """
    code = (request.args.get("code") or "").strip()
    if not code:
        return jsonify({"error": "code required"}), 400
    snapshots = _parent_snapshots_load()
    entry = snapshots.get(code)
    if not entry or not isinstance(entry, dict):
        return jsonify({"error": "Code not found"}), 404
    expires_at = entry.get("expiresAt") or 0
    if expires_at < int(time.time()):
        return jsonify({"error": "Code expired"}), 410
    out = {
        "progress": entry.get("progress", {}),
        "exportedAt": entry.get("exportedAt", ""),
    }
    if entry.get("profile") is not None:
        out["profile"] = entry["profile"]
    return jsonify(out)


@app.route('/api/health', methods=['GET'])
def api_health():
    """Liveness probe: always 200, no auth. For monitoring, Vercel, CI."""
    return jsonify({"status": "ok"}), 200


@app.route('/health')
def health_check():
    """Проверка здоровья API"""
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            metadata = data.get("metadata", {})
            return jsonify({
                "status": "healthy",
                "data_file": DATA_FILE,
                "total_categories": len(data.get("categories", [])),
                "total_badges": len(data.get("badges", [])),
                "last_parsed": metadata.get("parsed_at", "unknown")
            })
        else:
            return jsonify({
                "status": "unhealthy",
                "error": "Data file not found"
            }), 503
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 503

if __name__ == '__main__':
    # ВАЖНО (Windows): не используем эмодзи в stdout, иначе возможен UnicodeEncodeError (cp1251)
    print("Запуск API сервера Путеводителя...")
    print(f"Файл данных: {DATA_FILE}")
    
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"Загружено {len(data.get('categories', []))} категорий и {len(data.get('badges', []))} значков")
    else:
        print("Файл данных не найден!")
    
# Импорты для чат-бота
import sys
from pathlib import Path

# Добавляем путь к модулям чат-бота
CHATBOT_PATH = Path(__file__).parent.parent / "chatbot"
sys.path.append(str(CHATBOT_PATH))

# Глобальные переменные для компонентов чат-бота
chatbot_components = {
    'data_loader': None,
    'openai_client': None,
    'context_manager': None,
    'response_generator': None
}

def initialize_chatbot():
    """Инициализация компонентов чат-бота"""
    global chatbot_components
    
    try:
        import sys
        from pathlib import Path
        # Добавляем путь к модулям chatbot
        chatbot_path = Path(__file__).parent.parent / 'chatbot'
        if str(chatbot_path) not in sys.path:
            sys.path.insert(0, str(chatbot_path))
        
        from core.data_loader_new import DataLoaderNew
        from core.openai_client import OpenAIClient
        from core.context_manager import ContextManager
        from core.response_generator import ResponseGenerator
        
        print("Инициализация чат-бота...")
        
        # Инициализация компонентов
        # Каноничный источник данных для бота — public/ai-data (ai-data структура)
        chatbot_components['data_loader'] = DataLoaderNew(use_ai_data=True)
        # Лёгкий прогрев кэша (не грузим всё целиком при старте)
        chatbot_components['data_loader'].preload_popular_categories()
        
        # Проверяем наличие API ключа перед инициализацией OpenAI клиента
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("OPENAI_API_KEY не найден. Чат-бот будет недоступен, но API для данных работает.")
            return False
        
        chatbot_components['openai_client'] = OpenAIClient()
        chatbot_components['context_manager'] = ContextManager(chatbot_components['data_loader'])
        chatbot_components['response_generator'] = ResponseGenerator(
            chatbot_components['openai_client'], 
            chatbot_components['data_loader'], 
            chatbot_components['context_manager']
        )
        
        print("Чат-бот инициализирован успешно!")
        return True
        
    except Exception as e:
        print(f"Ошибка инициализации чат-бота: {e}")
        import traceback
        traceback.print_exc()
        return False

@app.route('/api/chat/limits', methods=['GET'])
def chat_limits():
    """Лимит сообщений в день для чата (CHAT_MESSAGES_PER_DAY из env)."""
    return jsonify({"messagesPerDay": CHAT_MESSAGES_PER_DAY})


@app.route('/api/chat', methods=['POST'])
def chat_with_bot():
    """Интегрированный чат-бот НейроВалюши. Требуется Authorization: Bearer <accessToken> и роль из CHAT_ALLOWED_ROLES."""
    payload, err_response = _require_chat_auth()
    if err_response is not None:
        return err_response[0], err_response[1]
    device_id = (payload.get("deviceId") or "").strip()
    if device_id:
        # Per-minute rate limit check
        if not _check_chat_per_min_rate_limit(device_id):
            _log_rate_limit_event('/api/chat', device_id)
            return jsonify({"error": f"Слишком много сообщений. Подождите немного (лимит: {CHAT_MSG_RATE_LIMIT_PER_MIN} в минуту)"}), 429
        # Daily limit check
        ok, limit_err = _check_and_inc_chat_daily(device_id)
        if limit_err is not None:
            _log_rate_limit_event('/api/chat/daily', device_id)
            return limit_err[0], limit_err[1]
    try:
        data = request.get_json()
        
        # Проверяем, инициализирован ли чат-бот
        if not chatbot_components['response_generator']:
            # Пытаемся инициализировать
            if not initialize_chatbot():
                return jsonify({
                    "error": "Чат-бот не может быть инициализирован",
                    "message": "Проверьте настройки OpenAI API"
                }), 503

        # M5-R4-C: Message length guard (before enrichment to avoid wasted work)
        _raw_message = (data.get("message") or "") if data else ""
        if len(_raw_message) > CHAT_MAX_MESSAGE_LEN:
            app.logger.warning('[CHAT_SAFETY] message_too_long device=%s len=%d',
                               _hash_key(device_id or 'anon'), len(_raw_message))
            return jsonify({"error": "Сообщение слишком длинное", "maxLen": CHAT_MAX_MESSAGE_LEN}), 400

        # Обрабатываем веб-контекст (подмешиваем роль из JWT для персонализации ответов)
        context = data.get("context") or {}
        context = dict(context) if isinstance(context, dict) else {}
        context["user_role"] = payload.get("role")

        # M5-R3-C: Enrich context with membership/identity data from JWT
        context["nickname"] = (payload.get("nickname") or "").strip() or None

        # Resolve squad/shift names via membership lookup (non-blocking, only when device_id known)
        if device_id and not context.get("squad_name"):
            try:
                _camp, _squad = _resolve_membership_context(device_id)
                if _squad:
                    _shifts_doc = _shifts_load()
                    _squad_obj  = _find_squad(_shifts_doc, _squad) or {}
                    _sq_name = (_squad_obj.get("name") or "").strip() or None
                    context["squad_name"] = _sq_name
                    _shift_id = (_squad_obj.get("shiftId") or "").strip()
                    if _shift_id:
                        for _sh in (_shifts_doc.get("shifts") or []):
                            if isinstance(_sh, dict) and _sh.get("id") == _shift_id:
                                context["shift_name"] = (_sh.get("name") or "").strip() or None
                                break
            except Exception:
                pass  # non-blocking: lookup failure must never block chat response

        # M5-R4-C: Inject pending badge requests for personalization
        try:
            _bdoc = _badge_requests_load()
            _pending = [
                r for r in (_bdoc.get("requests") or [])
                if isinstance(r, dict)
                and (r.get("requestedBy") or {}).get("deviceId") == device_id
                and r.get("status") == "pending"
            ]
            if _pending:
                context["pending_badge_count"] = len(_pending)
                context["pending_badge_titles"] = [
                    r.get("badgeTitle") or r.get("levelId") or "?"
                    for r in _pending[:3]
                ]
        except Exception:
            pass  # non-blocking

        if context:
            chatbot_components['response_generator'].context_manager.update_web_context(
                user_id=data.get("user_id", "web_user"),
                web_context=context
            )
        
        # Получаем историю сообщений пользователя
        user_id = data.get("user_id", "web_user")
        conversation_history = chatbot_components['response_generator'].context_manager.get_conversation_history(user_id)
        
        # Добавляем новое сообщение пользователя в историю
        from models.conversation import Message
        user_message = Message(role="user", content=data.get("message", ""), metadata={})
        chatbot_components['response_generator'].context_manager.add_message_to_history(user_id, user_message)
        
        # Генерируем ответ
        response = chatbot_components['response_generator'].generate_response(
            user_message=data.get("message", ""),
            user_id=user_id,
            conversation_history=conversation_history
        )
        
        # Добавляем ответ бота в историю
        bot_message = Message(role="assistant", content=response.response, metadata=response.metadata)
        chatbot_components['response_generator'].context_manager.add_message_to_history(user_id, bot_message)
        
        # Flask jsonify не умеет сериализовать pydantic-модели напрямую
        context_updates = response.context_updates
        if context_updates is not None:
            if hasattr(context_updates, "model_dump"):
                context_updates = context_updates.model_dump()
            elif hasattr(context_updates, "dict"):
                context_updates = context_updates.dict()

        return jsonify({
            "response": response.response,
            "suggestions": response.suggestions or [
                "Покажи все категории значков",
                "Рекомендуй значки по моим интересам",
                "Объясни философию системы значков"
            ],
            "context_updates": context_updates,
            "metadata": response.metadata
        })
        
    except Exception as e:
        return jsonify({
            "error": "Ошибка при обращении к чат-боту",
            "message": str(e)
        }), 500

# ---------------------------------------------------------------------------
# Council Initiatives — GET + POST /api/council/initiatives
# ---------------------------------------------------------------------------

@app.route('/api/council/initiatives', methods=['GET'])
def council_initiatives_list():
    """
    GET /api/council/initiatives?camp_id=<id> — список инициатив Совета Лагеря.
    Query param camp_id (optional) — фильтр по смене/лагерю.
    Возвращает последние 100 в обратном хронологическом порядке.
    Auth: CHAT_ALLOWED_ROLES
    """
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    camp_id_filter = (request.args.get("camp_id") or "").strip()

    store = get_store("council_initiatives")
    data = store.load()
    items = data.get("initiatives") or []

    # Sort descending by created_at, keep last 100
    items_sorted = sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)[:100]

    if camp_id_filter:
        items_sorted = [i for i in items_sorted if i.get("campId") == camp_id_filter or i.get("camp_id") == camp_id_filter]

    return jsonify({"initiatives": items_sorted})


@app.route('/api/council/initiatives', methods=['POST'])
def council_initiatives_create():
    """
    POST /api/council/initiatives — создать инициативу Совета Лагеря.
    Body: {"title": "...", "camp_id": "..."} — title обязателен (max 200 символов).
    Auth: CHAT_ALLOWED_ROLES
    """
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    body = request.get_json() or {}
    title = (body.get("title") or "").strip()
    camp_id = (body.get("camp_id") or body.get("campId") or "").strip()

    if not title:
        return jsonify({"error": "title обязателен"}), 400
    if len(title) > 200:
        return jsonify({"error": "title не должен превышать 200 символов"}), 400

    device_id = (payload.get("deviceId") or "").strip()
    nickname = (payload.get("nickname") or "").strip()

    import secrets as _secrets
    initiative_id = f"CI-{_secrets.token_hex(5)}"
    created_at = datetime.now(timezone.utc).isoformat()

    new_item = {
        "id": initiative_id,
        "campId": camp_id,
        "title": title,
        "status": "idea",
        "created_at": created_at,
        "createdAt": created_at,
        "createdBy": device_id,
        "createdByNickname": nickname,
    }

    store = get_store("council_initiatives")
    data = store.load()
    items = data.get("initiatives") or []
    items.append(new_item)
    data["initiatives"] = items
    store.save(data)

    return jsonify(new_item), 201


# Для Vercel
if __name__ == '__main__':
    # ВАЖНО (Windows): не используем эмодзи в stdout, иначе возможен UnicodeEncodeError (cp1251)
    print("Запуск Flask API для Путеводителя...")
    
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"Загружено {len(data.get('categories', []))} категорий и {len(data.get('badges', []))} значков")
    else:
        print("Файл данных не найден!")
    
    print("API доступен по адресу: http://localhost:4000")
    print("Статистика: http://localhost:4000/api/stats")
    print("Поиск: http://localhost:4000/api/search?q=валюша")
    print("Чат-бот: http://localhost:4000/api/chat")
    
    app.run(debug=False, host='0.0.0.0', port=4000)

# Для Vercel - экспортируем app
# Vercel будет использовать это как WSGI приложение
