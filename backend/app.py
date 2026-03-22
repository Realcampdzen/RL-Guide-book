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
# M5-R5-C: Per-agent bot tokens for /api/telegram/agent-post
AGENT_BOT_TOKENS = {
    "neuro_stepa": os.getenv("NEURO_STEPA_BOT_TOKEN", ""),
    "cat_bro":     os.getenv("CAT_BRO_BOT_TOKEN", ""),
    "dev_bro_1":   os.getenv("DEV_BRO_1_BOT_TOKEN", ""),
}

VK_API_TOKEN = os.getenv('VK_API_TOKEN', '').strip()
VK_CONFIRMATION_CODE = os.getenv('VK_CONFIRMATION_CODE', '').strip()
VK_WEBHOOK_SECRET = os.getenv('VK_WEBHOOK_SECRET', '').strip()

# Auth: HMAC для кодов верификации, JWT для accessToken (см. FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md)
AUTH_SECRET = os.getenv('AUTH_SECRET', '').strip()
AUTH_JWT_SECRET = os.getenv('AUTH_JWT_SECRET', '').strip()
AUTH_GENERATE_SECRET = os.getenv('AUTH_GENERATE_SECRET', '').strip() or os.getenv('TELEGRAM_WEBHOOK_SECRET', '').strip()
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '').strip()
IMAGE_PROVIDER = os.getenv('IMAGE_PROVIDER', 'openai').strip().lower()

# M15: Dev email whitelist — emails that auto-get developer role
DEV_EMAILS = [e.strip().lower() for e in os.getenv('DEV_EMAILS', '').split(',') if e.strip()]

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
DEFAULT_SEEDED_SHIFT_NAME = "Весенняя смена 2026"
# Staff-flow permissions (shifts/squads management, staff code issuing).
ORGANIZER_ROLES = ('shift_leader', 'camp_director', 'developer')
LEVEL_ID_RE = re.compile(r'^\d+\.\d+(?:\.\d+)?$')

# ---------------------------------------------------------------------------
# M19: Role Codes + Role Requests
# ---------------------------------------------------------------------------
ROLE_CODES_FILE = os.path.join(os.path.dirname(__file__), "data", "role_codes.json")
_ROLE_CODES_LOCK = threading.Lock()
ROLE_REQUESTS_FILE = os.path.join(os.path.dirname(__file__), "data", "role_requests.json")
_ROLE_REQUESTS_LOCK = threading.Lock()

ROLE_PREFIX_MAP = {
    'participant': 'UCH',
    'counselor': 'VOZ',
    'educator': 'PED',
    'shift_leader': 'STV',
    'camp_director': 'NAC',
    'parent': 'ROD',
}
VALID_ROLE_CODE_ROLES = tuple(ROLE_PREFIX_MAP.keys())
ROLE_CODE_TTL_DAYS = 7

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
    # Skip seeding if any shifts already exist (we already have Весенняя + Летняя)
    if shifts:
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


def _badge_plans_load() -> dict:
    """Load badge plans via StorageProvider."""
    return get_store("badge_plans").load()


def _badge_plans_save(data: dict):
    get_store("badge_plans").save(data)


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


def send_telegram_message(text: str, root_message_id: Optional[int] = None) -> bool:
    """Отправить сообщение в Telegram-канал через Bot API.

    Args:
        text: Текст сообщения (обрезается до 4096 символов).
        root_message_id: Если задан — отправляет как reply (thread-comment) к этому message_id.
            Без него — обычный пост в канал. Требуется для thread-транспорта.

    Returns:
        True при успехе (ok=True от Telegram API).
    """
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        return False
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload: dict = {
        "chat_id": TELEGRAM_CHANNEL_ID,
        "text": text[:4096],
        "disable_web_page_preview": True,
    }
    if root_message_id is not None:
        payload["reply_to_message_id"] = root_message_id
    try:
        r = requests.post(url, json=payload, timeout=10)
        return r.status_code == 200 and (r.json() or {}).get("ok") is True
    except Exception:
        return False


def send_telegram_to_chat(chat_id, text: str, root_message_id: Optional[int] = None) -> bool:
    """Отправить сообщение в указанный Telegram-чат (личка или группа).

    Args:
        chat_id: ID чата/канала.
        text: Текст сообщения.
        root_message_id: Если задан — reply-to (thread anchor).
    """
    if not TELEGRAM_BOT_TOKEN:
        return False
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload: dict = {
        "chat_id": chat_id,
        "text": text[:4096],
        "disable_web_page_preview": True,
    }
    if root_message_id is not None:
        payload["reply_to_message_id"] = root_message_id
    try:
        r = requests.post(url, json=payload, timeout=10)
        return r.status_code == 200 and (r.json() or {}).get("ok") is True
    except Exception:
        return False


def send_telegram_photo(photo_bytes: bytes, caption: str, root_message_id: Optional[int] = None) -> bool:
    """Отправить фото в Telegram-канал через Bot API sendPhoto.

    Args:
        photo_bytes: Байты изображения.
        caption: Подпись (обрезается до 1024 символов).
        root_message_id: Если задан — reply-to (thread anchor).
    """
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        return False
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
    data: dict = {
        "chat_id": TELEGRAM_CHANNEL_ID,
        "caption": caption[:1024],
    }
    if root_message_id is not None:
        data["reply_to_message_id"] = str(root_message_id)
    try:
        r = requests.post(
            url,
            data=data,
            files={"photo": ("creator_card.png", photo_bytes, "image/png")},
            timeout=15,
        )
        return r.status_code == 200 and (r.json() or {}).get("ok") is True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Thread-transport: anti-duplicate guard (KOT_THREAD_TRANSPORT_FIX_V1.1)
# Deduplication window: 60 seconds, keyed by (channel_id, content_hash).
# ---------------------------------------------------------------------------
_THREAD_DEDUP_WINDOW_SEC = 60
_thread_dedup: dict = {}  # key → last_sent_ts
_thread_dedup_lock = threading.Lock()


def _thread_dedup_key(chat_id, text: str) -> str:
    content_hash = hashlib.sha256(f"{chat_id}:{text[:512]}".encode()).hexdigest()[:16]
    return content_hash


def _is_thread_duplicate(chat_id, text: str) -> bool:
    """Return True if the same content was sent to this chat within the dedup window."""
    key = _thread_dedup_key(chat_id, text)
    now = time.time()
    with _thread_dedup_lock:
        last_ts = _thread_dedup.get(key)
        if last_ts is not None and (now - last_ts) < _THREAD_DEDUP_WINDOW_SEC:
            return True
        _thread_dedup[key] = now
        # Prune expired entries periodically (keep dict bounded)
        if len(_thread_dedup) > 2000:
            cutoff = now - _THREAD_DEDUP_WINDOW_SEC
            expired = [k for k, ts in _thread_dedup.items() if ts < cutoff]
            for k in expired:
                _thread_dedup.pop(k, None)
        return False


app = Flask(__name__)
CORS(app)  # Разрешаем CORS для фронтенда

# Путь к файлу с данными (фиксируем относительно backend/, чтобы не зависеть от cwd)
DATA_FILE = os.path.join(os.path.dirname(__file__), "perfect_parsed_data.json")
COMMUNITY_FILE = os.path.join(os.path.dirname(__file__), "community_badges.json")
TEAMS_FILE = os.path.join(os.path.dirname(__file__), "teams.json")
INITIATIVES_FILE = os.path.join(os.path.dirname(__file__), "initiatives.json")
BRO_MISSIONS_FILE = os.path.join(os.path.dirname(__file__), "bro_missions.json")
WINGS_FILE = os.path.join(os.path.dirname(__file__), "wings.json")
ENGINE_PROJECTS_FILE = os.path.join(os.path.dirname(__file__), "engine_projects.json")

def ensure_json_files():
    for f_path in [COMMUNITY_FILE, TEAMS_FILE, INITIATIVES_FILE, BRO_MISSIONS_FILE, WINGS_FILE, ENGINE_PROJECTS_FILE]:
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

# Per-camp cooldown for /api/badges/requests/cleanup (M6-HARDENING-A)
CLEANUP_COOLDOWN_SEC = int(os.getenv('CLEANUP_COOLDOWN_SEC', '60'))
_cleanup_last_call: dict = {}   # camp_key -> float (last call unix timestamp)
_cleanup_last_call_lock = threading.Lock()


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
            if len(existing_teams) >= 3:
                return jsonify({"error": "Максимум 3 Движка", "code": "max_teams"}), 409

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
        return jsonify([])

    return jsonify(my_teams)


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
    if len(in_teams) >= 3:
        return jsonify({"error": "Максимум 3 Движка", "code": "max_teams"}), 409
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


# ---------------------------------------------------------------------------
# Engine Projects — проекты Движков
# ---------------------------------------------------------------------------
def _engine_projects_load():
    try:
        with open(ENGINE_PROJECTS_FILE, 'r', encoding='utf-8') as f:
            raw = f.read()
        data = json.loads(raw) if raw.strip() else []
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []

def _engine_projects_save(projects):
    with open(ENGINE_PROJECTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(projects, f, ensure_ascii=False, indent=2)


@app.route('/api/teams/<team_id>/projects', methods=['GET', 'POST'])
def handle_team_projects(team_id):
    """GET: list projects for team. POST: create new project."""
    ensure_json_files()
    payload, err = _require_teams_auth()
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get('deviceId') or '').strip()

    teams = _teams_load()
    doc = teams.get(team_id)
    if not doc or not isinstance(doc, dict):
        return jsonify({"error": "Team not found"}), 404
    members = doc.get('members') or []
    is_member = any(isinstance(m, dict) and (m.get('id') or '').strip() == device_id for m in members)

    if request.method == 'GET':
        projects = _engine_projects_load()
        team_projects = [p for p in projects if p.get('teamId') == team_id]
        return jsonify(team_projects)

    # POST — create
    if not is_member:
        return jsonify({"error": "Not a member"}), 403
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({"error": "title required"}), 400

    import uuid
    project = {
        'id': f'proj-{uuid.uuid4().hex[:8]}',
        'teamId': team_id,
        'title': title,
        'description': (data.get('description') or '').strip(),
        'plan': (data.get('plan') or '').strip(),
        'targetBadgeId': (data.get('targetBadgeId') or '').strip() or None,
        'status': 'draft',
        'photos': [],
        'reflection': '',
        'scenario': '',
        'createdBy': device_id,
        'createdAt': datetime.now(timezone.utc).isoformat(),
    }
    projects = _engine_projects_load()
    projects.append(project)
    _engine_projects_save(projects)
    return jsonify(project), 201


@app.route('/api/teams/<team_id>/projects/<project_id>', methods=['PATCH'])
def handle_team_project_update(team_id, project_id):
    """PATCH — update project fields, change status."""
    ensure_json_files()
    payload, err = _require_teams_auth()
    if err is not None:
        return err[0], err[1]

    projects = _engine_projects_load()
    proj = next((p for p in projects if p.get('id') == project_id and p.get('teamId') == team_id), None)
    if not proj:
        return jsonify({"error": "Project not found"}), 404

    data = request.get_json() or {}
    allowed = ('title', 'description', 'plan', 'targetBadgeId', 'photos', 'reflection', 'scenario', 'status')
    for key in allowed:
        if key in data:
            if key == 'photos' and isinstance(data[key], list):
                proj['photos'] = [p for p in data[key] if isinstance(p, str)][:5]
            elif key == 'status':
                new_status = (data[key] or '').strip()
                if new_status == 'in_progress' and proj['status'] in ('draft', 'rejected'):
                    proj['status'] = 'in_progress'
                elif new_status == 'review' and proj['status'] == 'in_progress':
                    proj['status'] = 'review'
                    proj['submittedAt'] = datetime.now(timezone.utc).isoformat()
                elif new_status == 'draft' and proj['status'] in ('in_progress',):
                    proj['status'] = 'draft'
            elif isinstance(data[key], str):
                proj[key] = data[key].strip()

    _engine_projects_save(projects)
    return jsonify(proj)


@app.route('/api/teams/<team_id>/projects/<project_id>/review', methods=['POST'])
def handle_team_project_review(team_id, project_id):
    """POST — counselor approves or rejects project."""
    ensure_json_files()
    payload, err = _require_teams_auth()
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get('deviceId') or '').strip()

    projects = _engine_projects_load()
    proj = next((p for p in projects if p.get('id') == project_id and p.get('teamId') == team_id), None)
    if not proj:
        return jsonify({"error": "Project not found"}), 404
    if proj.get('status') != 'review':
        return jsonify({"error": "Project not in review status"}), 400

    data = request.get_json() or {}
    action = (data.get('action') or '').strip()
    if action not in ('approve', 'reject'):
        return jsonify({"error": "action must be approve or reject"}), 400

    proj['reviewedAt'] = datetime.now(timezone.utc).isoformat()
    proj['reviewedBy'] = device_id
    proj['reviewNote'] = (data.get('note') or '').strip()

    if action == 'approve':
        proj['status'] = 'approved'
        badge_id = proj.get('targetBadgeId')
        if badge_id:
            teams = _teams_load()
            team_doc = teams.get(team_id)
            if team_doc:
                achievements = team_doc.get('achievements') or []
                if badge_id not in achievements:
                    achievements.append(badge_id)
                    team_doc['achievements'] = achievements
                    _teams_save(teams)
    else:
        proj['status'] = 'rejected'

    _engine_projects_save(projects)
    return jsonify(proj)


# ---------------------------------------------------------------------------
# Initiatives — инициативы Движков с голосованием
# ---------------------------------------------------------------------------
def _initiatives_load():
    """Load all initiatives from storage."""
    try:
        with open(INITIATIVES_FILE, 'r', encoding='utf-8') as f:
            raw = f.read()
        data = json.loads(raw) if raw.strip() else []
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _initiatives_save(initiatives):
    with open(INITIATIVES_FILE, 'w', encoding='utf-8') as f:
        json.dump(initiatives, f, ensure_ascii=False, indent=2)


@app.route('/api/teams/<team_id>/initiatives', methods=['GET', 'POST'])
def handle_team_initiatives(team_id):
    """GET: list initiatives for team. POST: create new initiative."""
    ensure_json_files()
    payload, err = _require_teams_auth()
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get('deviceId') or '').strip()

    teams = _teams_load()
    doc = teams.get(team_id)
    if not doc or not isinstance(doc, dict):
        return jsonify({"error": "Team not found"}), 404
    members = doc.get('members') or []
    if not any(isinstance(m, dict) and (m.get('id') or '').strip() == device_id for m in members):
        return jsonify({"error": "Not a team member"}), 403

    all_initiatives = _initiatives_load()

    if request.method == 'GET':
        team_inits = [i for i in all_initiatives if i.get('teamId') == team_id]
        return jsonify(team_inits)

    # POST: create
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    description = (data.get('description') or '').strip()
    if not title:
        return jsonify({"error": "Название обязательно"}), 400

    ini_id = 'INI-' + ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
    initiative = {
        'id': ini_id,
        'teamId': team_id,
        'title': title[:200],
        'description': description[:2000],
        'createdBy': device_id,
        'createdAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'votes': {device_id: True},  # создатель автоматически голосует «за»
        'status': 'voting',
        'totalMembers': len(members),
    }
    all_initiatives.append(initiative)
    _initiatives_save(all_initiatives)
    return jsonify(initiative), 201


@app.route('/api/teams/<team_id>/initiatives/<ini_id>/vote', methods=['POST'])
def vote_initiative(team_id, ini_id):
    """Vote on an initiative. Body: {"vote": true/false}"""
    ensure_json_files()
    payload, err = _require_teams_auth()
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get('deviceId') or '').strip()

    teams = _teams_load()
    doc = teams.get(team_id)
    if not doc or not isinstance(doc, dict):
        return jsonify({"error": "Team not found"}), 404
    members = doc.get('members') or []
    if not any(isinstance(m, dict) and (m.get('id') or '').strip() == device_id for m in members):
        return jsonify({"error": "Not a team member"}), 403

    all_initiatives = _initiatives_load()
    ini = None
    for item in all_initiatives:
        if item.get('id') == ini_id and item.get('teamId') == team_id:
            ini = item
            break
    if not ini:
        return jsonify({"error": "Initiative not found"}), 404
    if ini.get('status') != 'voting':
        return jsonify({"error": "Голосование завершено"}), 400

    data = request.get_json() or {}
    vote = data.get('vote', True)
    votes = ini.get('votes') or {}
    votes[device_id] = bool(vote)
    ini['votes'] = votes
    ini['totalMembers'] = len(members)

    # Проверяем: все участники проголосовали?
    member_ids = {(m.get('id') or '').strip() for m in members if isinstance(m, dict)}
    voted_ids = set(votes.keys())
    if member_ids <= voted_ids:
        all_yes = all(votes.get(mid, False) for mid in member_ids)
        ini['status'] = 'approved' if all_yes else 'rejected'

    _initiatives_save(all_initiatives)
    return jsonify(ini)


@app.route('/api/teams/<team_id>/initiatives/<ini_id>/send', methods=['POST'])
def send_initiative(team_id, ini_id):
    """Send approved initiative to camp council."""
    ensure_json_files()
    payload, err = _require_teams_auth()
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get('deviceId') or '').strip()

    all_initiatives = _initiatives_load()
    ini = None
    for item in all_initiatives:
        if item.get('id') == ini_id and item.get('teamId') == team_id:
            ini = item
            break
    if not ini:
        return jsonify({"error": "Initiative not found"}), 404
    if ini.get('status') != 'approved':
        return jsonify({"error": "Инициатива ещё не одобрена всеми участниками"}), 400

    ini['status'] = 'sent_to_council'
    ini['sentAt'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    ini['sentBy'] = device_id
    _initiatives_save(all_initiatives)

    # ── Bridge: copy initiative to council_initiatives.json ──
    teams = _teams_load()
    team_doc = teams.get(team_id) or {}
    team_name = team_doc.get('name') or team_id

    # Find the member nickname who sent it
    members = team_doc.get('members') or []
    sender_nickname = ''
    for m in members:
        if isinstance(m, dict) and (m.get('id') or '').strip() == device_id:
            sender_nickname = m.get('nickname') or ''
            break

    council_store = get_store("council_initiatives")
    council_data = council_store.load()
    council_items = council_data.get("initiatives") or []

    # Avoid duplicates — check if already sent
    already_exists = any(ci.get('sourceInitiativeId') == ini_id for ci in council_items if isinstance(ci, dict))
    if not already_exists:
        council_ini = {
            "id": f"CI-{ini_id}",
            "sourceInitiativeId": ini_id,
            "teamId": team_id,
            "teamName": team_name,
            "title": ini.get('title', ''),
            "description": ini.get('description', ''),
            "status": "new",
            "readStatus": "new",
            "authorNickname": sender_nickname or device_id,
            "votesUp": 0,
            "voters": [],
            "createdAt": ini.get('createdAt', ''),
            "sentAt": ini['sentAt'],
            "campId": "",
        }
        council_items.append(council_ini)
        council_data["initiatives"] = council_items
        council_store.save(council_data)

    return jsonify(ini)


# ---------------------------------------------------------------------------
# Team Chat — чат Движка (аналог squad chat, но с team membership)
# ---------------------------------------------------------------------------
def _team_messages_load() -> dict:
    """Load team messages. Uses same storage provider as squad messages, separate namespace."""
    data = get_store("squad_messages").load()
    return data if isinstance(data, dict) else {}


def _team_messages_save(data: dict):
    get_store("squad_messages").save(data)


def _require_team_membership_for_chat(device_id: str, team_id: str):
    """Check if device_id is a member of team_id. Returns (team_doc, None) or (None, error_tuple)."""
    teams = _teams_load()
    doc = teams.get(team_id)
    if not doc or not isinstance(doc, dict):
        return None, (jsonify({"error": "Team not found"}), 404)
    members = doc.get('members') or []
    if not any(isinstance(m, dict) and (m.get('id') or '').strip() == device_id for m in members):
        return None, (jsonify({"error": "Not a team member"}), 403)
    return doc, None


@app.route('/api/teams/<team_id>/messages', methods=['GET', 'POST'])
def team_messages_get_or_post(team_id: str):
    """GET/POST team chat messages. Auth: any role, must be team member."""
    payload, err = _require_teams_auth()
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get('deviceId') or '').strip()
    role = (payload.get('role') or '').strip().lower()

    team_doc, membership_err = _require_team_membership_for_chat(device_id, team_id)
    can_bypass = role == 'developer'
    if membership_err and not can_bypass:
        return membership_err[0], membership_err[1]

    doc = _team_messages_load()
    by_team = doc.get('byTeamId') or {}
    if not isinstance(by_team, dict):
        by_team = {}
    rows = by_team.get(team_id)
    if not isinstance(rows, list):
        rows = []

    if request.method == 'GET':
        try:
            limit = int((request.args.get('limit') or str(SQUAD_MESSAGES_DEFAULT_LIMIT)).strip())
        except ValueError:
            limit = SQUAD_MESSAGES_DEFAULT_LIMIT
        limit = max(1, min(SQUAD_MESSAGES_MAX_LIMIT, limit))
        before_msg_id = (request.args.get('before') or '').strip()
        ordered = [r for r in rows if isinstance(r, dict)]
        if before_msg_id:
            before_index = next((idx for idx, item in enumerate(ordered) if (item.get('id') or '').strip() == before_msg_id), None)
            if before_index is not None:
                ordered = ordered[:before_index]
        has_more = len(ordered) > limit
        out = ordered[-limit:]
        return jsonify({'squadId': team_id, 'messages': out, 'hasMore': has_more})

    # POST
    if not _check_squad_msg_rate_limit(device_id):
        return jsonify({"error": "Слишком много сообщений. Подождите немного."}), 429

    ok, rate_err = _check_and_inc_chat_daily(device_id)
    if not ok and rate_err is not None:
        return rate_err[0], rate_err[1]

    body = request.get_json() or {}
    text = (body.get('text') or '').strip()
    if not text:
        return jsonify({'error': 'text required'}), 400

    clean_text, validation_error = _validate_squad_message(text)
    if validation_error:
        return jsonify({'error': validation_error}), 400

    # Find nickname from team members
    nickname = (body.get('nickname') or '').strip()
    if team_doc:
        for m in (team_doc.get('members') or []):
            if isinstance(m, dict) and (m.get('id') or '').strip() == device_id:
                nickname = (m.get('nickname') or '').strip() or nickname
                break

    msg = {
        'id': uuid.uuid4().hex[:12],
        'squadId': team_id,
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'deviceId': device_id or None,
        'nickname': nickname or None,
        'role': role,
        'text': clean_text
    }
    rows.append(msg)
    rows = rows[-SQUAD_MESSAGES_MAX_HISTORY:]
    by_team[team_id] = rows
    doc['byTeamId'] = by_team
    _team_messages_save(doc)
    return jsonify({'message': msg})


@app.route('/api/teams/<team_id>/messages/<msg_id>', methods=['DELETE'])
def team_message_delete(team_id: str, msg_id: str):
    """DELETE team chat message. Auth: author or leader."""
    payload, err = _require_teams_auth()
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get('deviceId') or '').strip()

    teams = _teams_load()
    team_doc = teams.get(team_id)
    leader_id = (team_doc.get('leaderId') or '').strip() if team_doc else ''

    doc = _team_messages_load()
    by_team = doc.get('byTeamId') or {}
    rows = by_team.get(team_id)
    if not isinstance(rows, list):
        return jsonify({'error': 'Message not found'}), 404

    msg_index = next((i for i, r in enumerate(rows) if isinstance(r, dict) and (r.get('id') or '') == msg_id), None)
    if msg_index is None:
        return jsonify({'error': 'Message not found'}), 404

    msg = rows[msg_index]
    is_author = device_id and (msg.get('deviceId') or '') == device_id
    is_leader = device_id and device_id == leader_id
    if not is_author and not is_leader:
        return jsonify({'error': 'Access denied'}), 403

    rows.pop(msg_index)
    by_team[team_id] = rows
    doc['byTeamId'] = by_team
    _team_messages_save(doc)
    return jsonify({'ok': True})


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
    "diary_card": "Personal diary card photo, selfie style, youth camp aesthetic, Real Camp style.",
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


@app.route('/api/telegram/thread-post', methods=['POST'])
def telegram_thread_post():
    """Thread-transport endpoint (KOT_THREAD_TRANSPORT_FIX_V1.1).

    Отправляет текстовый комментарий в Telegram-канал как reply к корневому посту.

    Request JSON:
        root_message_id (int, required): message_id корневого поста в канале (anchor).
            Без него запрос отклоняется — blind-post запрещён.
        text (str, required): текст комментария (до 4096 символов).
        source (str, optional): идентификатор источника (для логирования).

    Responses:
        200 {"ok": true, "sent": true}
        400 {"error": "root_message_id required"} — если rootId отсутствует
        400 {"error": "text required"} — если текст пустой
        409 {"error": "duplicate", "detail": "same message sent recently"} — dedup guard
        503 {"error": "telegram_unavailable"} — Telegram API недоступен / не настроен
    """
    jwt_payload, auth_err = _require_chat_auth()
    if auth_err is not None:
        return auth_err

    body = request.get_json(silent=True) or {}
    root_message_id = body.get("root_message_id")
    text = (body.get("text") or "").strip()
    source = (body.get("source") or "").strip()[:64]

    # Guard: без rootId отправка запрещена
    if root_message_id is None:
        return jsonify({"error": "root_message_id required", "detail": "blind-post is not allowed; provide root_message_id"}), 400

    try:
        root_message_id = int(root_message_id)
    except (TypeError, ValueError):
        return jsonify({"error": "root_message_id must be integer"}), 400

    if not text:
        return jsonify({"error": "text required"}), 400

    # Anti-duplicate guard: same content to same channel within 60s → 409
    dedup_chat = str(TELEGRAM_CHANNEL_ID or "")
    if _is_thread_duplicate(dedup_chat, text):
        return jsonify({"error": "duplicate", "detail": "same message sent recently"}), 409

    ok = send_telegram_message(text, root_message_id=root_message_id)
    if ok:
        return jsonify({"ok": True, "sent": True, "root_message_id": root_message_id, "source": source})
    return jsonify({"error": "telegram_unavailable", "detail": "Telegram API not configured or unreachable"}), 503


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


@app.route('/api/telegram/agent-post', methods=['POST'])
def telegram_agent_post():
    """
    POST /api/telegram/agent-post — send message as a named bot into a TG thread.
    Auth: developer | shift_leader (Bearer JWT)
    Body: { "agent": str, "text": str, "root_message_id": int, "chat_id": int? }
    Response 200: { "ok": true, "message_id": N }
    """
    payload, err = _require_roles(("developer", "shift_leader"), allow_localhost_dev=True)
    if err:
        return err

    data = request.get_json() or {}
    agent   = (data.get("agent") or "").strip()
    text    = (data.get("text") or "").strip()
    root_id = data.get("root_message_id")
    chat_id = data.get("chat_id") or TELEGRAM_CHANNEL_ID

    if not agent:
        return jsonify({"error": "agent is required"}), 400
    if not text:
        return jsonify({"error": "text is required"}), 400
    if root_id is None:
        return jsonify({"error": "root_message_id is required"}), 400

    bot_token = AGENT_BOT_TOKENS.get(agent)
    if not bot_token:
        return jsonify({"error": f"unknown agent: {agent}"}), 404

    # Dedup: same text to same thread within 60 s (non-blocking)
    dedup_key = f"{agent}:{chat_id}:{root_id}"
    if _is_thread_duplicate(dedup_key, text):
        return jsonify({"error": "duplicate message blocked"}), 409

    try:
        tg_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        resp = requests.post(tg_url, json={
            "chat_id": chat_id,
            "text": text,
            "reply_to_message_id": root_id,
            "parse_mode": "HTML",
        }, timeout=10)
        result = resp.json()
        if result.get("ok"):
            msg_id = result["result"]["message_id"]
            app.logger.info("[AGENT_POST] agent=%s chat=%s thread=%s msg=%s",
                            agent, chat_id, root_id, msg_id)
            return jsonify({"ok": True, "message_id": msg_id})
        else:
            app.logger.warning("[AGENT_POST] TG error agent=%s: %s", agent, result)
            return jsonify({"error": result.get("description", "TG API error")}), 502
    except Exception as exc:
        app.logger.exception("[AGENT_POST] failed: %s", exc)
        return jsonify({"error": "internal error"}), 500


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
        duration_days = int(body.get("durationDays") or 9)
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
            "durationDays": duration_days,
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
        kind_filter = (request.args.get("kind") or "").strip()
        for s in (data.get("squads") or []):
            if not isinstance(s, dict):
                continue
            if (s.get("shiftId") or "").strip() != sid:
                continue
            if kind_filter and (s.get("kind") or "participant") != kind_filter:
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
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
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
        kind = (body.get("kind") or "participant").strip()
        if kind not in ("participant", "staff"):
            return jsonify({"error": "kind must be 'participant' or 'staff'"}), 400
        doc = _shifts_load()
        shift = _find_shift(doc, sid)
        if not shift:
            return jsonify({"error": "Shift not found"}), 404

        actor_role = _normalize_role((payload.get("role") or "").strip())
        token_camp_id = (payload.get("campId") or "").strip()

        # Staff squads can only be created by shift_leader/camp_director/developer
        if kind == "staff" and actor_role not in ("shift_leader", "camp_director", "developer"):
            return jsonify({"error": "Only shift_leader/camp_director/developer can create staff squads"}), 403

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
            "kind": kind,
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
        payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
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
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
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
    payload, err = _require_roles(("participant", "counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    return _resolve_invite_code_response(request.args.get("code") or "")


@app.route('/api/squads/by-invite-code', methods=['GET'])
def squad_invite_code_resolve_v2():
    """
    GET /api/squads/by-invite-code?code=XXXXXX — resolve invite code to squad meta.
    Auth: participant|counselor|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("participant", "counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    return _resolve_invite_code_response(request.args.get("code") or "")


@app.route('/api/squads/<squad_id>/preview', methods=['GET'])
def squad_preview(squad_id: str):
    """
    GET /api/squads/<squadId>/preview — minimal squad info for join modal.
    Auth required.
    """
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
    payload, err = _require_roles(("participant", "parent", "counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
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
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
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
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
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
        "nickname": ((membership or {}).get("nickname") or "").strip() or (body.get("nickname") or "").strip() or None,
        "role": role,
        "text": clean_text
    }
    rows.append(msg)
    rows = rows[-SQUAD_MESSAGES_MAX_HISTORY:]
    by_squad[sid] = rows
    doc["bySquadId"] = by_squad
    _squad_messages_save(doc)
    return jsonify({"message": msg})


# ── Delete message ──
@app.route('/api/squads/<squad_id>/messages/<msg_id>', methods=['DELETE'])
def squad_message_delete(squad_id: str, msg_id: str):
    """
    DELETE /api/squads/<squadId>/messages/<msgId>
    Auth: author of the message OR counselor/shift_leader/camp_director/developer
    """
    payload, err = _require_roles(("participant", "parent", "counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    sid = (squad_id or "").strip()
    mid = (msg_id or "").strip()
    if not sid or not mid:
        return jsonify({"error": "squadId and msgId required"}), 400
    device_id = (payload.get("deviceId") or "").strip()
    role = _normalize_role((payload.get("role") or "").strip())

    doc = _squad_messages_load()
    by_squad = doc.get("bySquadId") or {}
    rows = by_squad.get(sid)
    if not isinstance(rows, list):
        return jsonify({"error": "Message not found"}), 404

    msg_index = next((i for i, r in enumerate(rows) if isinstance(r, dict) and (r.get("id") or "") == mid), None)
    if msg_index is None:
        return jsonify({"error": "Message not found"}), 404

    msg = rows[msg_index]
    is_author = device_id and (msg.get("deviceId") or "") == device_id
    is_staff = role in ("counselor", "shift_leader", "camp_director", "developer")
    if not is_author and not is_staff:
        return jsonify({"error": "Access denied"}), 403

    rows.pop(msg_index)
    by_squad[sid] = rows
    # Also unpin if this was pinned
    pinned = doc.get("pinned") or {}
    if isinstance(pinned, dict) and pinned.get(sid, {}).get("id") == mid:
        pinned.pop(sid, None)
        doc["pinned"] = pinned
    doc["bySquadId"] = by_squad
    _squad_messages_save(doc)
    return jsonify({"ok": True})


# ── Pin / Unpin message ──
@app.route('/api/squads/<squad_id>/messages/<msg_id>/pin', methods=['POST'])
def squad_message_pin(squad_id: str, msg_id: str):
    """
    POST /api/squads/<squadId>/messages/<msgId>/pin
    Body: { "pinned": true|false }
    Auth: counselor/shift_leader/camp_director/developer
    """
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    sid = (squad_id or "").strip()
    mid = (msg_id or "").strip()
    if not sid or not mid:
        return jsonify({"error": "squadId and msgId required"}), 400

    body = request.get_json() or {}
    want_pinned = body.get("pinned", True)

    doc = _squad_messages_load()
    by_squad = doc.get("bySquadId") or {}
    rows = by_squad.get(sid)
    if not isinstance(rows, list):
        return jsonify({"error": "Message not found"}), 404

    msg = next((r for r in rows if isinstance(r, dict) and (r.get("id") or "") == mid), None)
    if msg is None:
        return jsonify({"error": "Message not found"}), 404

    pinned = doc.get("pinned") or {}
    if not isinstance(pinned, dict):
        pinned = {}

    if want_pinned:
        pinned[sid] = msg
    else:
        pinned.pop(sid, None)

    doc["pinned"] = pinned
    _squad_messages_save(doc)
    return jsonify({"ok": True, "pinned": want_pinned, "message": msg if want_pinned else None})


# ── Get pinned message ──
@app.route('/api/squads/<squad_id>/pinned', methods=['GET'])
def squad_message_pinned(squad_id: str):
    """GET /api/squads/<squadId>/pinned — get the pinned message for a squad."""
    payload, err = _require_roles(("participant", "parent", "counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    sid = (squad_id or "").strip()
    doc = _squad_messages_load()
    pinned = doc.get("pinned") or {}
    msg = pinned.get(sid) if isinstance(pinned, dict) else None
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
    # Handle photos (base64 data URLs), limit to 5 photos, max ~500KB each
    photos_in = evidence_in.get("photos")
    if isinstance(photos_in, list):
        photos = []
        for p in photos_in[:5]:
            if isinstance(p, str) and p.startswith("data:image/") and len(p) < 500_000:
                photos.append(p)
        if photos:
            evidence["photos"] = photos

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
    camp_id = (payload.get("campId") or "").strip()
    camp_key = camp_id or device_id or "global"

    # Rate limit: no more than 1 call per CLEANUP_COOLDOWN_SEC per camp (M6-HARDENING-A)
    _now = time.time()
    with _cleanup_last_call_lock:
        _last = _cleanup_last_call.get(camp_key, 0.0)
        if _now - _last < CLEANUP_COOLDOWN_SEC:
            _remaining = int(CLEANUP_COOLDOWN_SEC - (_now - _last))
            return jsonify({"error": f"Rate limit: try again in {_remaining}s"}), 429
        _cleanup_last_call[camp_key] = _now

    body = request.get_json() or {}
    try:
        older_than_days = int(body.get("olderThanDays") or BADGE_REQUESTS_RESOLVED_TTL_DAYS)
    except (TypeError, ValueError):
        return jsonify({"error": "olderThanDays must be an integer"}), 400
    if older_than_days < 0:
        return jsonify({"error": "olderThanDays must be non-negative"}), 400
    cutoff_ts = time.time() - older_than_days * 86400

    store = get_store("badge_requests")
    if hasattr(store, 'delete_resolved'):
        # Supabase path: SQL DELETE — efficient, no full table load (M5-R5-A)
        deleted = store.delete_resolved(older_than_days)
    else:
        # JSON fallback: in-memory filter + rewrite
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
        f"[BADGE_CLEANUP] deleted={deleted} camp_id={camp_id or 'unknown'} actor={hashed_device} ts={datetime.now(timezone.utc).isoformat()}"
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


@app.route('/api/badges/plans', methods=['POST'])
def badge_plan_create():
    """
    POST /api/badges/plans
    Auth: participant|parent|developer
    Body: { badgeId, levelId?, planText, checklist?, submit? }
    Upsert by device_id + badge_id. Returns 201 (created) or 200 (updated).
    """
    payload, err = _require_roles(("participant", "parent", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get("deviceId") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId missing in token"}), 400

    body = request.get_json() or {}
    badge_id = (body.get("badgeId") or "").strip()
    if not badge_id:
        return jsonify({"error": "badgeId required"}), 400

    level_id = (body.get("levelId") or "").strip() or None
    plan_text = (body.get("planText") or "").strip()[:4000]
    checklist_in = body.get("checklist") if isinstance(body.get("checklist"), list) else []
    checklist = []
    for item in checklist_in[:50]:
        if isinstance(item, dict):
            checklist.append({
                "text": str(item.get("text") or "").strip()[:500],
                "done": bool(item.get("done")),
            })

    do_submit = body.get("submit") is True
    camp_from_token = (payload.get("campId") or "").strip()
    camp_from_membership, _ = _resolve_membership_context(device_id)
    camp_id = camp_from_membership or camp_from_token or ""

    now_iso = datetime.now(timezone.utc).isoformat()

    doc = _badge_plans_load()
    plans = doc.get("plans") or []

    # Upsert: find existing plan by device_id + badge_id
    found_idx = -1
    for idx, p in enumerate(plans):
        if not isinstance(p, dict):
            continue
        if (p.get("deviceId") or "").strip() == device_id and (p.get("badgeId") or "").strip() == badge_id:
            found_idx = idx
            break

    if found_idx >= 0:
        # Update existing
        plan_doc = plans[found_idx]
        plan_doc["planText"] = plan_text
        plan_doc["checklist"] = checklist
        plan_doc["updatedAt"] = now_iso
        if level_id:
            plan_doc["levelId"] = level_id
        if camp_id:
            plan_doc["campId"] = camp_id
        if do_submit and (plan_doc.get("status") or "") == "draft":
            plan_doc["status"] = "submitted"
        plans[found_idx] = plan_doc
        doc["plans"] = plans
        _badge_plans_save(doc)
        return jsonify({"plan": plan_doc}), 200
    else:
        # Create new
        plan_doc = {
            "id": f"BP-{uuid.uuid4().hex[:10].upper()}",
            "deviceId": device_id,
            "campId": camp_id,
            "badgeId": badge_id,
            "levelId": level_id or "",
            "planText": plan_text,
            "checklist": checklist,
            "status": "submitted" if do_submit else "draft",
            "counselorNote": None,
            "createdAt": now_iso,
            "updatedAt": now_iso,
        }
        plans.append(plan_doc)
        doc["plans"] = plans
        _badge_plans_save(doc)
        return jsonify({"plan": plan_doc}), 201


@app.route('/api/badges/plans/mine', methods=['GET'])
def badge_plan_mine():
    """
    GET /api/badges/plans/mine?status=
    Auth: participant|parent|developer
    Returns own badge plans (filtered by deviceId from JWT), newest-first.
    """
    payload, err = _require_roles(("participant", "parent", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get("deviceId") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId missing in token"}), 400

    status_filter = (request.args.get("status") or "").strip()
    if status_filter and status_filter not in ("draft", "submitted", "approved", "rejected"):
        return jsonify({"error": "Invalid status filter"}), 400

    doc = _badge_plans_load()
    rows = []
    for p in (doc.get("plans") or []):
        if not isinstance(p, dict):
            continue
        if (p.get("deviceId") or "").strip() != device_id:
            continue
        if status_filter and (p.get("status") or "") != status_filter:
            continue
        rows.append(p)
    rows.sort(key=lambda item: _parse_iso_ts(item.get("updatedAt") or item.get("createdAt") or ""), reverse=True)
    return jsonify({"plans": rows})


@app.route('/api/badges/plans/inbox', methods=['GET'])
def badge_plan_inbox():
    """
    GET /api/badges/plans/inbox
    Auth: counselor|educator|shift_leader|camp_director|developer
    Returns submitted badge plans for review. Auto-scope for counselor/educator.
    """
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    device_id = (payload.get("deviceId") or "").strip()
    actor_role = _normalize_role((payload.get("role") or "").strip())
    camp_filter = (request.args.get("campId") or "").strip()

    if actor_role in ("counselor", "educator") and not camp_filter:
        camp_self, _ = _resolve_membership_context(device_id)
        camp_filter = camp_self

    doc = _badge_plans_load()
    rows = []
    for p in (doc.get("plans") or []):
        if not isinstance(p, dict):
            continue
        if (p.get("status") or "") != "submitted":
            continue
        if camp_filter and (p.get("campId") or "").strip() != camp_filter:
            continue
        rows.append(p)
    rows.sort(key=lambda item: _parse_iso_ts(item.get("updatedAt") or item.get("createdAt") or ""), reverse=True)
    return jsonify({"plans": rows})


@app.route('/api/badges/plans/<plan_id>/review', methods=['PATCH'])
def badge_plan_review(plan_id: str):
    """
    PATCH /api/badges/plans/<id>/review
    Auth: counselor|educator|shift_leader|camp_director|developer
    Body: { status: "approved"|"rejected", counselorNote? }
    """
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    pid = (plan_id or "").strip()
    if not pid:
        return jsonify({"error": "plan id required"}), 400

    body = request.get_json() or {}
    next_status = (body.get("status") or "").strip()
    if next_status not in ("approved", "rejected"):
        return jsonify({"error": "status must be 'approved' or 'rejected'"}), 400
    counselor_note = (body.get("counselorNote") or "").strip()[:2000] or None
    now_iso = datetime.now(timezone.utc).isoformat()

    doc = _badge_plans_load()
    plans = doc.get("plans") or []
    found_idx = -1
    for idx, p in enumerate(plans):
        if not isinstance(p, dict):
            continue
        if (p.get("id") or "").strip().lower() == pid.lower():
            found_idx = idx
            break
    if found_idx < 0:
        return jsonify({"error": "Plan not found"}), 404

    plan = plans[found_idx]
    current_status = (plan.get("status") or "").strip()
    if current_status in ("approved", "rejected"):
        return jsonify({"error": f"Plan already resolved: {current_status}"}), 409

    plan["status"] = next_status
    plan["counselorNote"] = counselor_note
    plan["updatedAt"] = now_iso
    plans[found_idx] = plan
    doc["plans"] = plans
    _badge_plans_save(doc)
    return jsonify({"plan": plan})


# ── Workshop Proposals (Constructor pipeline) ──

def _workshop_proposals_load() -> dict:
    return get_store("workshop_proposals").load()

def _workshop_proposals_save(data: dict):
    get_store("workshop_proposals").save(data)


@app.route('/api/workshop/proposals', methods=['POST'])
def workshop_proposal_create():
    """
    POST /api/workshop/proposals
    Auth: participant|developer
    Body: { type, title, description?, emoji?, badgeId?, image?, nickname? }
    type: badge | category | version | art
    """
    payload, err = _require_roles(("participant", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get("deviceId") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId missing in token"}), 400

    body = request.get_json() or {}
    proposal_type = (body.get("type") or "").strip()
    if proposal_type not in ("badge", "category", "version", "art"):
        return jsonify({"error": "type must be badge|category|version|art"}), 400

    title = (body.get("title") or "").strip()[:200]
    if not title:
        return jsonify({"error": "title required"}), 400

    description = (body.get("description") or "").strip()[:4000]
    emoji = (body.get("emoji") or "").strip()[:10] or None
    badge_id = (body.get("badgeId") or "").strip()[:50] or None
    image = (body.get("image") or "").strip() or None
    # Limit image size (base64 data URLs up to ~500KB)
    if image and len(image) > 500_000:
        image = None
    nickname = (body.get("nickname") or "").strip()[:120] or None

    camp_from_token = (payload.get("campId") or "").strip()
    camp_from_membership, squad_from_membership = _resolve_membership_context(device_id)
    camp_id = camp_from_membership or camp_from_token or ""
    squad_id = squad_from_membership or ""

    now_iso = datetime.now(timezone.utc).isoformat()
    proposal_doc = {
        "id": f"WP-{uuid.uuid4().hex[:10].upper()}",
        "type": proposal_type,
        "title": title,
        "description": description,
        "emoji": emoji,
        "badgeId": badge_id,
        "image": image,
        "status": "pending",
        "createdBy": {
            "deviceId": device_id,
            "nickname": nickname,
        },
        "campId": camp_id,
        "squadId": squad_id or None,
        "createdAt": now_iso,
        "resolvedAt": None,
        "resolvedBy": None,
        "resolutionNote": None,
    }

    doc = _workshop_proposals_load()
    proposals = doc.get("proposals") or []
    proposals.append(proposal_doc)
    doc["proposals"] = proposals
    _workshop_proposals_save(doc)
    return jsonify({"proposal": proposal_doc}), 201


@app.route('/api/workshop/proposals/mine', methods=['GET'])
def workshop_proposal_mine():
    """
    GET /api/workshop/proposals/mine
    Auth: participant|developer
    Returns own proposals, newest-first.
    """
    payload, err = _require_roles(("participant", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    device_id = (payload.get("deviceId") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId missing in token"}), 400

    doc = _workshop_proposals_load()
    rows = []
    for p in (doc.get("proposals") or []):
        if not isinstance(p, dict):
            continue
        cb = p.get("createdBy") if isinstance(p.get("createdBy"), dict) else {}
        if (cb.get("deviceId") or "").strip() != device_id:
            continue
        rows.append(p)
    rows.sort(key=lambda item: _parse_iso_ts(item.get("createdAt") or ""), reverse=True)
    return jsonify({"proposals": rows})


@app.route('/api/workshop/proposals/inbox', methods=['GET'])
def workshop_proposal_inbox():
    """
    GET /api/workshop/proposals/inbox?status=pending
    Auth: counselor|educator|shift_leader|camp_director|developer
    Returns proposals for moderation. Auto-scope for counselor/educator.
    """
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    device_id = (payload.get("deviceId") or "").strip()
    actor_role = _normalize_role((payload.get("role") or "").strip())
    camp_filter = (request.args.get("campId") or "").strip()
    status_filter = (request.args.get("status") or "").strip()
    if status_filter and status_filter not in ("pending", "approved", "rejected"):
        return jsonify({"error": "Invalid status filter"}), 400

    if actor_role in ("counselor", "educator") and not camp_filter:
        camp_self, _ = _resolve_membership_context(device_id)
        camp_filter = camp_self

    doc = _workshop_proposals_load()
    rows = []
    for p in (doc.get("proposals") or []):
        if not isinstance(p, dict):
            continue
        if status_filter and (p.get("status") or "").strip() != status_filter:
            continue
        if not status_filter and (p.get("status") or "").strip() != "pending":
            continue
        if camp_filter and (p.get("campId") or "").strip() != camp_filter:
            continue
        rows.append(p)

    rows.sort(
        key=lambda item: (
            0 if (item.get("status") or "").strip() == "pending" else 1,
            -_parse_iso_ts(item.get("createdAt") or "")
        )
    )
    return jsonify({"proposals": rows})


def _workshop_proposal_resolve(proposal_id: str, next_status: str):
    """Shared resolve logic for approve/reject."""
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    pid = (proposal_id or "").strip()
    if not pid:
        return jsonify({"error": "proposal id required"}), 400

    body = request.get_json() or {}
    note = (body.get("note") or "").strip()
    now_iso = datetime.now(timezone.utc).isoformat()

    doc = _workshop_proposals_load()
    proposals = doc.get("proposals") or []
    found_idx = -1
    for idx, p in enumerate(proposals):
        if not isinstance(p, dict):
            continue
        if (p.get("id") or "").strip().lower() == pid.lower():
            found_idx = idx
            break
    if found_idx < 0:
        return jsonify({"error": "Proposal not found"}), 404

    row = proposals[found_idx]
    current_status = (row.get("status") or "").strip()
    if current_status != "pending":
        return jsonify({"error": f"Proposal already resolved: {current_status}"}), 409

    row["status"] = next_status
    row["resolvedAt"] = now_iso
    row["resolvedBy"] = {
        "deviceId": (payload.get("deviceId") or "").strip() or None,
        "role": _normalize_role((payload.get("role") or "").strip())
    }
    if note:
        row["resolutionNote"] = note[:2000]
    proposals[found_idx] = row
    doc["proposals"] = proposals
    _workshop_proposals_save(doc)
    return jsonify({"proposal": row})


@app.route('/api/workshop/proposals/<proposal_id>/approve', methods=['POST'])
def workshop_proposal_approve(proposal_id: str):
    return _workshop_proposal_resolve(proposal_id, "approved")


@app.route('/api/workshop/proposals/<proposal_id>/reject', methods=['POST'])
def workshop_proposal_reject(proposal_id: str):
    return _workshop_proposal_resolve(proposal_id, "rejected")


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


def _compute_parent_weekly_trend(progress: dict) -> tuple[dict, dict]:
    """
    Compare two windows: last 7 days vs previous 7 days.
    Uses achievedAt timestamps from progress entries.
    """
    now_ts = int(time.time())
    week_sec = 7 * 86400
    cur_start = now_ts - week_sec
    prev_start = now_ts - (2 * week_sec)
    current_count = 0
    previous_count = 0

    for _, row in (progress or {}).items():
        if not isinstance(row, dict):
            continue
        ts = _parse_iso_ts(str(row.get("achievedAt") or ""))
        if ts <= 0:
            continue
        if ts >= cur_start:
            current_count += 1
        elif ts >= prev_start:
            previous_count += 1

    if current_count > previous_count:
        direction = "up"
        note = "За последнюю неделю прогресс ускорился — поддерживайте этот ритм короткими шагами."
    elif current_count < previous_count:
        direction = "down"
        note = "Темп стал ниже, чем неделей раньше — поможет мягкий фокус на одном ближайшем шаге."
    else:
        direction = "flat"
        note = "Темп стабильный — регулярная поддержка помогает удерживать движение."

    if current_count == 0 and previous_count == 0:
        direction = "flat"
        note = "Прогресс только набирает историю — начните с одного посильного шага в ближайшие дни."

    return ({"direction": direction, "note": note}, {
        "windowDays": 7,
        "currentWindowAchievements": current_count,
        "previousWindowAchievements": previous_count,
    })


def _build_parent_explainability(weekly_trend: dict, strengths: list, weakest: list, dynamic_signals: dict) -> tuple[str, dict]:
    trend = (weekly_trend.get("direction") or "flat").strip()
    strong_titles = [str(x.get("title") or "").strip() for x in (strengths or [])[:2] if isinstance(x, dict) and str(x.get("title") or "").strip()]
    weak_titles = [str(x.get("title") or "").strip() for x in (weakest or [])[:2] if isinstance(x, dict) and str(x.get("title") or "").strip()]
    window_days = int(dynamic_signals.get("windowDays") or 7)

    if trend == "up":
        why = "Рекомендация поддерживает текущий положительный темп и помогает закрепить успех небольшими шагами."
    elif trend == "down":
        why = "Рекомендация сфокусирована на мягком восстановлении ритма, чтобы снизить нагрузку и вернуть стабильность."
    else:
        why = "Рекомендация помогает удерживать ровный темп и поддерживать устойчивый интерес ребёнка."

    based_on = {
        "trend": trend,
        "strongestAreas": strong_titles,
        "weakestAreas": weak_titles,
        "activityWindow": f"последние {window_days} дней и предыдущие {window_days} дней",
    }
    return why, based_on


def _compute_parent_insights(progress: dict) -> dict:
    data = _load_data() if DATA_FILE and os.path.exists(DATA_FILE) else {"badges": [], "categories": []}
    badges = data.get("badges") or []
    categories = data.get("categories") or []

    category_titles = {}
    for c in categories:
        if isinstance(c, dict):
            category_titles[str(c.get("id") or "")] = str(c.get("title") or c.get("name") or "Категория")

    levels = [b for b in badges if isinstance(b, dict) and _is_valid_level_id(str(b.get("id") or "")) and str(b.get("id") or "").count(".") >= 2]
    total_levels = len(levels)

    cat_stats = {}
    achieved_total = 0
    for level in levels:
        lid = str(level.get("id") or "")
        cid = str(level.get("category_id") or lid.split(".")[0] or "")
        st = (progress.get(lid) or {}).get("status") if isinstance(progress.get(lid), dict) else None
        status = (st or "locked").strip().lower()
        bucket = cat_stats.setdefault(cid, {"total": 0, "achieved": 0, "in_progress": 0})
        bucket["total"] += 1
        if status == "achieved":
            bucket["achieved"] += 1
            achieved_total += 1
        elif status == "in_progress":
            bucket["in_progress"] += 1

    percent = int(round((achieved_total / total_levels) * 100)) if total_levels > 0 else 0
    if percent >= 80:
        stage = "high"
    elif percent >= 40:
        stage = "steady"
    else:
        stage = "start"

    strengths = []
    for cid, s in cat_stats.items():
        total = s["total"] or 1
        score = (s["achieved"] * 2 + s["in_progress"]) / (total * 2)
        strengths.append({
            "categoryId": cid,
            "title": category_titles.get(cid) or f"Категория {cid}",
            "score": round(score, 4),
            "achieved": s["achieved"],
            "total": s["total"],
        })
    strengths.sort(key=lambda x: (x["score"], x["achieved"]), reverse=True)
    strengths_top3 = strengths[:3]

    weekly_trend, dynamic_signals = _compute_parent_weekly_trend(progress)

    next_steps = []
    weakest = sorted(strengths, key=lambda x: (x["score"], x["achieved"]))[:2]
    for w in weakest:
        if w["total"] <= 0:
            continue
        if weekly_trend.get("direction") == "up":
            msg = f"В «{w['title']}» уже заметен прогресс — мягко поддержите ещё один небольшой шаг в ближайшие дни."
        elif weekly_trend.get("direction") == "down":
            msg = f"Для «{w['title']}» лучше выбрать один посильный шаг на неделю и поддержать спокойный ритм."
        elif w["achieved"] == 0:
            msg = f"В «{w['title']}» можно начать с простого шага: вместе обсудите понятный план на ближайший день."
        else:
            msg = f"В «{w['title']}» есть хорошая база — поддержите завершение следующего шага в комфортном темпе."
        next_steps.append({"categoryId": w["categoryId"], "title": w["title"], "hint": msg})

    if not strengths_top3:
        strengths_top3 = [{"title": "Ребёнок уже в пути", "hint": "Отмечайте даже маленький прогресс — это укрепляет уверенность."}]
    if not next_steps:
        next_steps = [{"title": "Продолжайте в том же ритме", "hint": "Мягкая поддержка дома помогает закреплять лагерьные успехи."}]

    why_this_suggestion, based_on = _build_parent_explainability(weekly_trend, strengths_top3, weakest, dynamic_signals)

    return {
        "overallProgress": {
            "percent": percent,
            "stage": stage,
            "achieved": achieved_total,
            "total": total_levels,
        },
        "weeklyTrend": weekly_trend,
        "dynamicSignals": dynamic_signals,
        "whyThisSuggestion": why_this_suggestion,
        "basedOn": based_on,
        "strengthsTop3": strengths_top3,
        "nextSteps": next_steps[:2],
    }


@app.route('/api/parent-insights', methods=['GET'])
def parent_insights_get():
    """
    GET /api/parent-insights?code=XXXX
    Uses existing parent snapshot code context (no child_device_id needed).
    Returns parent-friendly read-only progress insights.
    """
    code = (request.args.get("code") or "").strip()
    if not code:
        return jsonify({
            "overallProgress": {"percent": 0, "stage": "start", "achieved": 0, "total": 0},
            "weeklyTrend": {"direction": "flat", "note": "Подключите витрину ребёнка — и здесь появится еженедельная динамика."},
            "strengthsTop3": [{"title": "Когда подключите витрину ребёнка, здесь появятся сильные стороны."}],
            "nextSteps": [{"title": "Что поддержать дальше", "hint": "Откройте витрину достижений ребёнка по коду или ссылке."}],
        })

    snapshots = _parent_snapshots_load()
    rec = snapshots.get(code)
    if not rec:
        return jsonify({"error": "Code not found"}), 404

    try:
        expires_at = int(rec.get("expiresAt") or 0)
    except Exception:
        expires_at = 0
    if expires_at <= int(time.time()):
        return jsonify({"error": "Code expired"}), 410

    progress = rec.get("payload", {}).get("progress") or {}
    if not isinstance(progress, dict):
        progress = {}

    insights = _compute_parent_insights(progress)
    insights["source"] = "parent_snapshot_code"
    return jsonify(insights)


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

def _map_council_status_legacy(raw_status: str) -> str:
    """Normalize legacy initiative statuses to unified lifecycle.
    new -> reviewing -> accepted|rejected|done
    """
    s = (raw_status or "").strip().lower()
    if s in ("new", "reviewing", "accepted", "rejected", "done"):
        return s
    # legacy aliases
    if s in ("idea", "draft"):
        return "new"
    if s in ("discussion", "in_review", "under_review"):
        return "reviewing"
    if s in ("approved", "accepted_v1"):
        return "accepted"
    if s in ("declined", "denied"):
        return "rejected"
    if s in ("implemented", "completed"):
        return "done"
    return "new"


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

    # Read-model normalization (non-breaking): add readStatus + createdAt fallback.
    normalized = []
    for item in items:
        if not isinstance(item, dict):
            continue
        c_at = item.get("createdAt") or item.get("created_at") or ""
        read_status = _map_council_status_legacy(item.get("status") or "")
        x = dict(item)
        x["createdAt"] = c_at
        x["readStatus"] = read_status
        normalized.append(x)

    # Sort descending by createdAt, keep last 100
    items_sorted = sorted(normalized, key=lambda x: x.get("createdAt", ""), reverse=True)[:100]

    if camp_id_filter:
        items_sorted = [i for i in items_sorted if i.get("campId") == camp_id_filter or i.get("camp_id") == camp_id_filter]

    return jsonify({"initiatives": items_sorted})


@app.route('/api/council/initiatives', methods=['POST'])
def council_initiatives_create():
    """
    POST /api/council/initiatives — создать инициативу Совета Лагеря.
    Body: {"title": "...", "description"?: "...", "camp_id"?: "...",
           "teamId"?: "...", "squadId"?: "...", "authorNickname"?: "..."}
    title обязателен (max 200 символов), description max 2000.
    Auth: CHAT_ALLOWED_ROLES
    """
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    body = request.get_json() or {}
    title = (body.get("title") or "").strip()
    description = (body.get("description") or "").strip()
    camp_id = (body.get("camp_id") or body.get("campId") or "").strip()
    team_id = (body.get("teamId") or body.get("team_id") or "").strip() or None
    squad_id = (body.get("squadId") or body.get("squad_id") or "").strip() or None
    author_nickname = (body.get("authorNickname") or body.get("author_nickname") or "").strip()

    if not title:
        return jsonify({"error": "title обязателен"}), 400
    if len(title) > 200:
        return jsonify({"error": "title не должен превышать 200 символов"}), 400
    if len(description) > 2000:
        return jsonify({"error": "description не должен превышать 2000 символов"}), 400

    device_id = (payload.get("deviceId") or "").strip()
    nickname = author_nickname or (payload.get("nickname") or "").strip()

    import secrets as _secrets
    initiative_id = f"CI-{_secrets.token_hex(5)}"
    created_at = datetime.now(timezone.utc).isoformat()

    new_item = {
        "id": initiative_id,
        "campId": camp_id,
        "title": title,
        "description": description,
        "status": "idea",
        "teamId": team_id,
        "squadId": squad_id,
        "authorNickname": nickname,
        "votesUp": 0,
        "voters": [],
        "created_at": created_at,
        "createdAt": created_at,
        "updatedAt": created_at,
        "createdBy": device_id,
        "createdByNickname": nickname,
        "proposalType": "director_proposal" if payload.get("role") == "camp_director" else "regular",
    }

    store = get_store("council_initiatives")
    data = store.load()
    items = data.get("initiatives") or []
    items.append(new_item)
    data["initiatives"] = items
    store.save(data)

    return jsonify(new_item), 201


@app.route('/api/council/initiatives/<initiative_id>', methods=['PATCH'])
def council_initiative_update(initiative_id: str):
    """
    PATCH /api/council/initiatives/<id> — обновить статус/привязку инициативы.
    Body: { "status"?: "proposed|discussed|approved|in_progress|done",
            "teamId"?: string, "description"?: string }
    Auth: counselor|educator|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    iid = (initiative_id or "").strip()
    if not iid:
        return jsonify({"error": "initiative id required"}), 400

    body = request.get_json() or {}
    new_status = (body.get("status") or "").strip()
    new_team_id = body.get("teamId")
    new_description = body.get("description")

    VALID_STATUSES = ("idea", "proposed", "discussed", "approved", "in_progress", "done",
                      "new", "reviewing", "accepted", "rejected")
    if new_status and new_status not in VALID_STATUSES:
        return jsonify({"error": f"invalid status, expected one of: {', '.join(VALID_STATUSES)}"}), 400

    store = get_store("council_initiatives")
    data = store.load()
    items = data.get("initiatives") or []

    target = None
    for item in items:
        if isinstance(item, dict) and item.get("id") == iid:
            target = item
            break

    if target is None:
        return jsonify({"error": "Initiative not found"}), 404

    now_iso = datetime.now(timezone.utc).isoformat()
    if new_status:
        target["status"] = new_status
    if new_team_id is not None:
        target["teamId"] = new_team_id if new_team_id else None
    if new_description is not None:
        target["description"] = new_description.strip()[:2000]
    target["updatedAt"] = now_iso

    store.save(data)
    return jsonify({"initiative": target})


@app.route('/api/council/initiatives/<initiative_id>/vote', methods=['POST'])
def council_initiative_vote(initiative_id: str):
    """
    POST /api/council/initiatives/<id>/vote — голос «за» или «против» инициативы.
    Body: {"direction": "up"|"down"}  (default "up")
    Один голос на device_id per direction. Повторный вызов — отмена голоса (toggle).
    Голос «за» снимает «против» и наоборот (mutual exclusion).
    Auth: CHAT_ALLOWED_ROLES
    """
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    iid = (initiative_id or "").strip()
    if not iid:
        return jsonify({"error": "initiative id required"}), 400

    device_id = (payload.get("deviceId") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId missing"}), 400

    body = request.get_json(silent=True) or {}
    direction = body.get("direction", "up")
    if direction not in ("up", "down"):
        return jsonify({"error": "direction must be 'up' or 'down'"}), 400

    store = get_store("council_initiatives")
    data = store.load()
    items = data.get("initiatives") or []

    target = None
    for item in items:
        if isinstance(item, dict) and item.get("id") == iid:
            target = item
            break

    if target is None:
        return jsonify({"error": "Initiative not found"}), 404

    voters = target.get("voters") or []
    if not isinstance(voters, list):
        voters = []
    down_voters = target.get("downVoters") or []
    if not isinstance(down_voters, list):
        down_voters = []

    voted = False
    if direction == "up":
        # Remove from downVoters if present
        if device_id in down_voters:
            down_voters.remove(device_id)
        # Toggle upvote
        if device_id in voters:
            voters.remove(device_id)
        else:
            voters.append(device_id)
            voted = True
    else:
        # Remove from voters (upVoters) if present
        if device_id in voters:
            voters.remove(device_id)
        # Toggle downvote
        if device_id in down_voters:
            down_voters.remove(device_id)
        else:
            down_voters.append(device_id)
            voted = True

    target["voters"] = voters
    target["downVoters"] = down_voters
    target["votesUp"] = len(voters)
    target["votesDown"] = len(down_voters)
    target["updatedAt"] = datetime.now(timezone.utc).isoformat()

    store.save(data)
    return jsonify({"initiative": target, "voted": voted, "direction": direction})


@app.route('/api/council/initiatives/<initiative_id>', methods=['DELETE'])
def council_initiative_delete(initiative_id: str):
    """DELETE /api/council/initiatives/<id> — удалить инициативу. Staff only."""
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    iid = (initiative_id or "").strip()
    if not iid:
        return jsonify({"error": "initiative id required"}), 400

    store = get_store("council_initiatives")
    data = store.load()
    items = data.get("initiatives") or []

    new_items = [i for i in items if not (isinstance(i, dict) and i.get("id") == iid)]
    if len(new_items) == len(items):
        return jsonify({"error": "Initiative not found"}), 404

    data["initiatives"] = new_items
    store.save(data)
    return jsonify({"deleted": True, "id": iid})


@app.route('/api/council/initiatives/<initiative_id>/comments', methods=['GET', 'POST'])
def council_initiative_comments(initiative_id: str):
    """
    GET  — получить комментарии инициативы.
    POST — добавить комментарий. Body: {"text": "..."}
    Auth: CHAT_ALLOWED_ROLES
    """
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    iid = (initiative_id or "").strip()
    if not iid:
        return jsonify({"error": "initiative id required"}), 400

    store = get_store("council_initiatives")
    data = store.load()
    items = data.get("initiatives") or []

    target = None
    for item in items:
        if isinstance(item, dict) and item.get("id") == iid:
            target = item
            break

    if target is None:
        return jsonify({"error": "Initiative not found"}), 404

    comments = target.get("comments") or []
    if not isinstance(comments, list):
        comments = []

    if request.method == 'GET':
        return jsonify({"comments": comments})

    # POST — add comment
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
    if len(text) > 2000:
        return jsonify({"error": "text too long (max 2000)"}), 400

    device_id = (payload.get("deviceId") or "").strip()
    nickname = (payload.get("nickname") or body.get("nickname") or "").strip() or "Аноним"

    import uuid as _uuid
    comment = {
        "id": f"CMT-{_uuid.uuid4().hex[:6].upper()}",
        "deviceId": device_id,
        "nickname": nickname,
        "text": text,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    comments.append(comment)
    target["comments"] = comments
    store.save(data)

    return jsonify({"comment": comment, "comments": comments}), 201

# ---------------------------------------------------------------------------
# Council Protocols — GET + POST /api/council/protocols
# ---------------------------------------------------------------------------

@app.route('/api/council/protocols', methods=['GET'])
def council_protocols_list():
    """
    GET /api/council/protocols — список протоколов заседаний Совета Лагеря.
    Auth: CHAT_ALLOWED_ROLES
    """
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    store = get_store("council_protocols")
    data = store.load()
    items = data.get("protocols") or []

    normalized = []
    for item in items:
        if not isinstance(item, dict):
            continue
        normalized.append(item)

    items_sorted = sorted(normalized, key=lambda x: x.get("date", x.get("createdAt", "")), reverse=True)[:100]
    return jsonify({"protocols": items_sorted})


@app.route('/api/council/protocols', methods=['POST'])
def council_protocols_create():
    """
    POST /api/council/protocols — создать протокол заседания.
    Body: {"title": "...", "date": "2026-03-10", "summary"?: "...",
           "decisions"?: ["..."], "participants"?: ["..."]}
    Auth: counselor|educator|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    body = request.get_json() or {}
    title = (body.get("title") or "").strip()
    date_str = (body.get("date") or "").strip()
    summary = (body.get("summary") or "").strip()
    decisions = body.get("decisions") or []
    participants = body.get("participants") or []

    if not title:
        return jsonify({"error": "title required"}), 400
    if len(title) > 200:
        return jsonify({"error": "title max 200 chars"}), 400
    if len(summary) > 5000:
        return jsonify({"error": "summary max 5000 chars"}), 400

    if not isinstance(decisions, list):
        decisions = []
    decisions = [str(d).strip()[:500] for d in decisions if d][:20]

    if not isinstance(participants, list):
        participants = []
    participants = [str(p).strip()[:100] for p in participants if p][:50]

    device_id = (payload.get("deviceId") or "").strip()
    nickname = (payload.get("nickname") or "").strip()

    import secrets as _secrets
    protocol_id = f"CP-{_secrets.token_hex(5)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_item = {
        "id": protocol_id,
        "title": title,
        "date": date_str or now_iso[:10],
        "summary": summary,
        "decisions": decisions,
        "participants": participants,
        "createdBy": device_id,
        "createdByNickname": nickname,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }

    store = get_store("council_protocols")
    data = store.load()
    items = data.get("protocols") or []
    items.append(new_item)
    data["protocols"] = items
    store.save(data)

    return jsonify({"protocol": new_item}), 201


# ---------------------------------------------------------------------------
# Council Members — GET + POST + DELETE /api/council/members
# ---------------------------------------------------------------------------

@app.route('/api/council/members', methods=['GET'])
def council_members_list():
    """
    GET /api/council/members — список участников Совета Лагеря.
    Auth: CHAT_ALLOWED_ROLES
    """
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    store = get_store("council_members")
    data = store.load()
    items = data.get("members") or []

    normalized = [m for m in items if isinstance(m, dict)]
    normalized.sort(key=lambda x: x.get("joinedAt", ""), reverse=True)
    return jsonify({"members": normalized})


@app.route('/api/council/members', methods=['POST'])
def council_members_add():
    """
    POST /api/council/members — добавить участника Совета.
    Body: {"nickname": "...", "role"?: "member|chair|secretary", "deviceId"?: "..."}
    Auth: CHAT_ALLOWED_ROLES (любой авторизованный пользователь)
    """
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    body = request.get_json() or {}
    nickname = (body.get("nickname") or "").strip()
    member_role = (body.get("role") or "member").strip()
    member_device_id = (body.get("deviceId") or "").strip()

    if not nickname:
        return jsonify({"error": "nickname required"}), 400
    if len(nickname) > 100:
        return jsonify({"error": "nickname max 100 chars"}), 400
    if member_role not in ("member", "chair", "secretary"):
        member_role = "member"

    import secrets as _secrets
    member_id = f"CM-{_secrets.token_hex(5)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_member = {
        "id": member_id,
        "nickname": nickname,
        "role": member_role,
        "deviceId": member_device_id,
        "joinedAt": now_iso,
        "addedBy": (payload.get("deviceId") or "").strip(),
    }

    store = get_store("council_members")
    data = store.load()
    members = data.get("members") or []
    members.append(new_member)
    data["members"] = members
    store.save(data)

    return jsonify({"member": new_member}), 201


@app.route('/api/council/members/<member_id>', methods=['DELETE'])
def council_members_remove(member_id: str):
    """
    DELETE /api/council/members/<id> — удалить участника Совета.
    Auth: counselor|educator|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    mid = (member_id or "").strip()
    if not mid:
        return jsonify({"error": "member id required"}), 400

    store = get_store("council_members")
    data = store.load()
    members = data.get("members") or []

    found = False
    new_members = []
    for m in members:
        if isinstance(m, dict) and m.get("id") == mid:
            found = True
        else:
            new_members.append(m)

    if not found:
        return jsonify({"error": "Member not found"}), 404

    data["members"] = new_members
    store.save(data)
    return jsonify({"deleted": mid}), 200


# ---------------------------------------------------------------------------
# Badge Arts — POST/GET/GET inbox/PATCH review  (M9-ART-MODERATION-A)
# ---------------------------------------------------------------------------

@app.route('/api/badges/arts', methods=['POST'])
def badge_arts_submit():
    """
    POST /api/badges/arts — submit art/skin for moderation.
    Body: { badgeId, imageUrl, source?, authorNickname? }
    Auth: participant+staff
    """
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    body = request.get_json() or {}
    badge_id = (body.get("badgeId") or body.get("badge_id") or "").strip()
    image_url = (body.get("imageUrl") or body.get("image_url") or "").strip()
    source = (body.get("source") or "uploaded").strip()
    author_nickname = (body.get("authorNickname") or body.get("author_nickname") or "").strip()

    if not badge_id:
        return jsonify({"error": "badgeId required"}), 400
    if not image_url:
        return jsonify({"error": "imageUrl required"}), 400
    if source not in ("ai_generated", "hand_drawn", "uploaded"):
        return jsonify({"error": "source must be ai_generated, hand_drawn, or uploaded"}), 400

    device_id = (payload.get("deviceId") or "").strip()
    nickname = author_nickname or (payload.get("nickname") or "").strip()

    import secrets as _secrets
    art_id = f"BA-{_secrets.token_hex(5)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_art = {
        "id": art_id,
        "deviceId": device_id,
        "badgeId": badge_id,
        "imageUrl": image_url,
        "source": source,
        "status": "pending",
        "moderatorNote": None,
        "authorNickname": nickname,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }

    store = get_store("badge_arts")
    data = store.load()
    arts = data.get("arts") or []
    arts.append(new_art)
    data["arts"] = arts
    store.save(data)

    return jsonify({"art": new_art}), 201


@app.route('/api/badges/arts', methods=['GET'])
def badge_arts_list():
    """
    GET /api/badges/arts — list arts. Optional filters: ?badgeId=, ?status=
    Auth: all authenticated
    """
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    badge_id_filter = (request.args.get("badgeId") or request.args.get("badge_id") or "").strip()
    status_filter = (request.args.get("status") or "").strip()

    store = get_store("badge_arts")
    data = store.load()
    arts = data.get("arts") or []

    result = []
    for art in arts:
        if not isinstance(art, dict):
            continue
        if badge_id_filter and art.get("badgeId") != badge_id_filter:
            continue
        if status_filter and art.get("status") != status_filter:
            continue
        result.append(art)

    result.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return jsonify({"arts": result[:200]})


@app.route('/api/badges/arts/inbox', methods=['GET'])
def badge_arts_inbox():
    """
    GET /api/badges/arts/inbox — pending arts for staff moderation.
    Auth: counselor|educator|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    store = get_store("badge_arts")
    data = store.load()
    arts = data.get("arts") or []

    pending = [a for a in arts if isinstance(a, dict) and a.get("status") == "pending"]
    pending.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return jsonify({"arts": pending})


@app.route('/api/badges/arts/<art_id>/review', methods=['PATCH'])
def badge_arts_review(art_id: str):
    """
    PATCH /api/badges/arts/<id>/review — moderate art (approve/reject/canon).
    Body: { status: "approved"|"rejected"|"canon", moderatorNote?: string }
    Auth: counselor|educator|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    aid = (art_id or "").strip()
    if not aid:
        return jsonify({"error": "art id required"}), 400

    body = request.get_json() or {}
    new_status = (body.get("status") or "").strip()
    moderator_note = body.get("moderatorNote") or body.get("moderator_note")

    if new_status not in ("approved", "rejected", "canon"):
        return jsonify({"error": "status must be approved, rejected, or canon"}), 400

    store = get_store("badge_arts")
    data = store.load()
    arts = data.get("arts") or []

    target = None
    for art in arts:
        if isinstance(art, dict) and art.get("id") == aid:
            target = art
            break

    if target is None:
        return jsonify({"error": "Art not found"}), 404

    if target.get("status") in ("approved", "rejected", "canon"):
        return jsonify({"error": "Art already reviewed", "currentStatus": target["status"]}), 409

    target["status"] = new_status
    if moderator_note is not None:
        target["moderatorNote"] = str(moderator_note).strip()[:2000]
    target["updatedAt"] = datetime.now(timezone.utc).isoformat()

    store.save(data)
    return jsonify({"art": target})



# ---------------------------------------------------------------------------
# Engines (Движки) — M11-DVIZHKI-BACKEND-A
# ---------------------------------------------------------------------------

@app.route('/api/squads/<squad_id>/engines', methods=['POST'])
def engines_create(squad_id: str):
    """POST — create engine (status=pending), auto-add creator as member."""
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    body = request.get_json() or {}
    title = (body.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title required"}), 400

    device_id = (payload.get("deviceId") or "").strip()
    nickname = (payload.get("nickname") or "").strip()

    import secrets as _secrets
    engine_id = f"ENG-{_secrets.token_hex(5)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_engine = {
        "id": engine_id,
        "squadId": squad_id,
        "title": title,
        "avatarUrl": (body.get("avatarUrl") or "").strip(),
        "goal": (body.get("goal") or "").strip(),
        "goalStatus": "draft",
        "createdBy": device_id,
        "status": "pending",
        "type": body.get("type", "regular"),
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }

    store = get_store("engines")
    data = store.load()
    engines = data.get("engines") or []
    engines.append(new_engine)
    data["engines"] = engines
    store.save(data)

    # Auto-add creator as member
    member_id = f"EM-{_secrets.token_hex(5)}"
    new_member = {
        "id": member_id,
        "engineId": engine_id,
        "deviceId": device_id,
        "nickname": nickname,
        "role": "creator",
        "joinedAt": now_iso,
    }
    mstore = get_store("engine_members")
    mdata = mstore.load()
    members = mdata.get("members") or []
    members.append(new_member)
    mdata["members"] = members
    mstore.save(mdata)

    return jsonify({"engine": new_engine, "member": new_member}), 201


@app.route('/api/squads/<squad_id>/engines', methods=['GET'])
def engines_list(squad_id: str):
    """GET — list engines for a squad."""
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    store = get_store("engines")
    data = store.load()
    engines = [e for e in (data.get("engines") or []) if isinstance(e, dict) and e.get("squadId") == squad_id]
    engines.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return jsonify({"engines": engines})


@app.route('/api/engines/<engine_id>', methods=['PATCH'])
def engines_update(engine_id: str):
    """PATCH — update title/goal (creator or staff)."""
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    store = get_store("engines")
    data = store.load()
    engines = data.get("engines") or []

    target = None
    for eng in engines:
        if isinstance(eng, dict) and eng.get("id") == engine_id:
            target = eng
            break
    if target is None:
        return jsonify({"error": "Engine not found"}), 404

    device_id = (payload.get("deviceId") or "").strip()
    role = (payload.get("role") or "").strip()
    is_staff = role in ("counselor", "educator", "shift_leader", "camp_director", "developer")
    if target.get("createdBy") != device_id and not is_staff:
        return jsonify({"error": "Only creator or staff can update"}), 403

    body = request.get_json() or {}
    if "title" in body:
        target["title"] = (body["title"] or "").strip()[:200]
    if "goal" in body:
        target["goal"] = (body["goal"] or "").strip()[:2000]
        target["goalStatus"] = "submitted"
    if "avatarUrl" in body:
        target["avatarUrl"] = (body["avatarUrl"] or "").strip()
    target["updatedAt"] = datetime.now(timezone.utc).isoformat()

    store.save(data)
    return jsonify({"engine": target})


@app.route('/api/engines/<engine_id>/approve', methods=['PATCH'])
def engines_approve(engine_id: str):
    """PATCH — approve/reject engine (staff only)."""
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    body = request.get_json() or {}
    new_status = (body.get("status") or "").strip()
    if new_status not in ("approved", "rejected"):
        return jsonify({"error": "status must be approved or rejected"}), 400

    store = get_store("engines")
    data = store.load()
    engines = data.get("engines") or []

    target = None
    for eng in engines:
        if isinstance(eng, dict) and eng.get("id") == engine_id:
            target = eng
            break
    if target is None:
        return jsonify({"error": "Engine not found"}), 404

    target["status"] = new_status
    target["updatedAt"] = datetime.now(timezone.utc).isoformat()
    store.save(data)
    return jsonify({"engine": target})


@app.route('/api/engines/<engine_id>/goal/approve', methods=['PATCH'])
def engines_goal_approve(engine_id: str):
    """PATCH — approve engine goal (staff only)."""
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    store = get_store("engines")
    data = store.load()
    engines = data.get("engines") or []

    target = None
    for eng in engines:
        if isinstance(eng, dict) and eng.get("id") == engine_id:
            target = eng
            break
    if target is None:
        return jsonify({"error": "Engine not found"}), 404

    if target.get("goalStatus") != "submitted":
        return jsonify({"error": "Goal not submitted"}), 409

    target["goalStatus"] = "approved"
    target["updatedAt"] = datetime.now(timezone.utc).isoformat()
    store.save(data)
    return jsonify({"engine": target})


@app.route('/api/engines/<engine_id>/join', methods=['POST'])
def engines_join(engine_id: str):
    """POST — join engine."""
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    device_id = (payload.get("deviceId") or "").strip()
    nickname = (payload.get("nickname") or "").strip()

    # Check engine exists
    estore = get_store("engines")
    edata = estore.load()
    found = any(isinstance(e, dict) and e.get("id") == engine_id for e in (edata.get("engines") or []))
    if not found:
        return jsonify({"error": "Engine not found"}), 404

    mstore = get_store("engine_members")
    mdata = mstore.load()
    members = mdata.get("members") or []

    # Check already member
    already = any(isinstance(m, dict) and m.get("engineId") == engine_id and m.get("deviceId") == device_id for m in members)
    if already:
        return jsonify({"error": "Already a member"}), 409

    import secrets as _secrets
    member_id = f"EM-{_secrets.token_hex(5)}"
    new_member = {
        "id": member_id,
        "engineId": engine_id,
        "deviceId": device_id,
        "nickname": nickname,
        "role": "member",
        "joinedAt": datetime.now(timezone.utc).isoformat(),
    }
    members.append(new_member)
    mdata["members"] = members
    mstore.save(mdata)
    return jsonify({"member": new_member})


@app.route('/api/engines/<engine_id>/leave', methods=['POST'])
def engines_leave(engine_id: str):
    """POST — leave engine."""
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    device_id = (payload.get("deviceId") or "").strip()

    mstore = get_store("engine_members")
    mdata = mstore.load()
    members = mdata.get("members") or []

    new_members = [m for m in members if not (isinstance(m, dict) and m.get("engineId") == engine_id and m.get("deviceId") == device_id)]
    if len(new_members) == len(members):
        return jsonify({"error": "Not a member"}), 404

    mdata["members"] = new_members
    mstore.save(mdata)
    return jsonify({"status": "left"})


@app.route('/api/engines/<engine_id>/members', methods=['GET'])
def engines_members(engine_id: str):
    """GET — list engine members."""
    payload, err = _require_roles(CHAT_ALLOWED_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    mstore = get_store("engine_members")
    mdata = mstore.load()
    members = [m for m in (mdata.get("members") or []) if isinstance(m, dict) and m.get("engineId") == engine_id]
    return jsonify({"members": members})

# ── Inspector Пользы endpoints (M11-INSPECTOR-C) ──────────────────────

_INSPECTOR_CHECKLISTS_FILE = os.path.join(
    os.path.dirname(__file__), "..", "ai-data", "inspector", "checklists.json"
)


@app.route('/api/inspector/checklists', methods=['GET'])
def inspector_checklists():
    """GET — return all Inspector missions / checklists."""
    try:
        with open(_INSPECTOR_CHECKLISTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"missions": []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/inspector/progress/<device_id>', methods=['GET'])
def inspector_progress_get(device_id: str):
    """GET — get Inspector progress for a device."""
    store = get_store("inspector_progress")
    data = store.load()
    progress = [
        p for p in (data.get("progress") or [])
        if isinstance(p, dict) and p.get("deviceId") == device_id
    ]
    return jsonify({"progress": progress})


@app.route('/api/inspector/progress', methods=['POST'])
def inspector_progress_post():
    """POST — mark an Inspector task as completed."""
    body = request.get_json() or {}
    device_id = (body.get("deviceId") or "").strip()
    checklist_id = (body.get("checklistId") or "").strip()
    task_id = (body.get("taskId") or "").strip()

    if not device_id or not checklist_id or not task_id:
        return jsonify({"error": "deviceId, checklistId, taskId required"}), 400

    store = get_store("inspector_progress")
    data = store.load()
    progress = data.get("progress") or []

    # Check for duplicate
    for p in progress:
        if isinstance(p, dict) and p.get("deviceId") == device_id and p.get("checklistId") == checklist_id and p.get("taskId") == task_id:
            return jsonify({"status": "already_completed", "entry": p}), 200

    entry = {
        "id": str(uuid.uuid4()),
        "deviceId": device_id,
        "checklistId": checklist_id,
        "taskId": task_id,
        "status": "completed",
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "approvedBy": None,
        "approvedAt": None,
    }
    progress.append(entry)
    data["progress"] = progress
    store.save(data)
    return jsonify({"status": "ok", "entry": entry}), 201


@app.route('/api/inspector/progress/<entry_id>/approve', methods=['PATCH'])
def inspector_progress_approve(entry_id: str):
    """PATCH — approve an Inspector task (staff only)."""
    payload, err = _require_roles(("counselor", "educator", "shift_leader", "camp_director", "developer"), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    approver = (payload.get("deviceId") or "staff").strip()

    store = get_store("inspector_progress")
    data = store.load()
    progress = data.get("progress") or []

    target = None
    for p in progress:
        if isinstance(p, dict) and p.get("id") == entry_id:
            target = p
            break
    if target is None:
        return jsonify({"error": "Progress entry not found"}), 404

    if target.get("status") == "approved":
        return jsonify({"status": "already_approved", "entry": target}), 200

    target["status"] = "approved"
    target["approvedBy"] = approver
    target["approvedAt"] = datetime.now(timezone.utc).isoformat()
    store.save(data)
    return jsonify({"status": "ok", "entry": target})


# ---------------------------------------------------------------------------
# БРО — Бросвящение + Крыло (M12-BRO-BACKEND-A)
# → Moved to end of file (full implementation with /api/bro/* routes)
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# План-сетка смены (M12-SHIFT-PLANNER-A)
# ---------------------------------------------------------------------------

@app.route('/api/shifts/<shift_id>/schedule', methods=['GET'])
def schedule_list(shift_id: str):
    """GET — all schedule events for a shift."""
    store = get_store("shift_schedule")
    data = store.load()
    events = [e for e in (data.get("events") or []) if isinstance(e, dict) and e.get("shiftId") == shift_id]
    events.sort(key=lambda x: (x.get("dayIndex", 0), x.get("timeStart", "")))
    return jsonify({"events": events})


@app.route('/api/shifts/<shift_id>/schedule/day/<int:day_index>', methods=['GET'])
def schedule_day(shift_id: str, day_index: int):
    """GET — events for a specific day."""
    store = get_store("shift_schedule")
    data = store.load()
    events = [
        e for e in (data.get("events") or [])
        if isinstance(e, dict) and e.get("shiftId") == shift_id and e.get("dayIndex") == day_index
    ]
    events.sort(key=lambda x: x.get("timeStart", ""))
    return jsonify({"events": events})


@app.route('/api/shifts/<shift_id>/schedule', methods=['POST'])
def schedule_create(shift_id: str):
    """POST — add a schedule event (shift_leader+)."""
    payload, err = _require_roles(STAFF_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    body = request.get_json() or {}
    title = (body.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title required"}), 400

    import secrets as _secrets
    event_id = f"SCHED-{_secrets.token_hex(5)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_event = {
        "id": event_id,
        "shiftId": shift_id,
        "dayIndex": body.get("dayIndex", 0),
        "timeStart": body.get("timeStart", "09:00"),
        "timeEnd": body.get("timeEnd") or "",
        "title": title,
        "description": body.get("description", ""),
        "type": body.get("type", "event"),
        "responsibleId": body.get("responsibleId") or "",
        "responsibleName": body.get("responsibleName") or "",
        "workshopId": body.get("workshopId") or "",
        "createdAt": now_iso,
    }
    store = get_store("shift_schedule")
    data = store.load()
    events = data.get("events") or []
    events.append(new_event)
    data["events"] = events
    store.save(data)
    return jsonify({"event": new_event}), 201


@app.route('/api/schedule/<event_id>', methods=['PATCH'])
def schedule_update(event_id: str):
    """PATCH — update a schedule event (shift_leader+)."""
    payload, err = _require_roles(STAFF_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    body = request.get_json() or {}
    store = get_store("shift_schedule")
    data = store.load()
    target = next((e for e in (data.get("events") or []) if isinstance(e, dict) and e.get("id") == event_id), None)
    if target is None:
        return jsonify({"error": "event not found"}), 404

    for key in ["title", "description", "timeStart", "timeEnd", "type", "dayIndex",
                "responsibleId", "responsibleName", "workshopId"]:
        if key in body:
            target[key] = body[key]
    store.save(data)
    return jsonify({"event": target})


@app.route('/api/schedule/<event_id>', methods=['DELETE'])
def schedule_delete(event_id: str):
    """DELETE — remove a schedule event (shift_leader+)."""
    payload, err = _require_roles(STAFF_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    store = get_store("shift_schedule")
    data = store.load()
    events = data.get("events") or []
    before_len = len(events)
    data["events"] = [e for e in events if not (isinstance(e, dict) and e.get("id") == event_id)]
    if len(data["events"]) == before_len:
        return jsonify({"error": "event not found"}), 404
    store.save(data)
    return jsonify({"status": "deleted", "id": event_id})


# ---------------------------------------------------------------------------
# Кабинет Мастерской педагога (M13-EDUCATOR-WORKSHOP-A)
# ---------------------------------------------------------------------------

EDUCATOR_PLUS = ("educator", "shift_leader", "camp_director", "developer")


def _get_workshop_or_404(store, data, workshop_id):
    """Utility: find workshop by id or return None."""
    return next((w for w in (data.get("workshops") or []) if isinstance(w, dict) and w.get("id") == workshop_id), None)


def _require_educator_owner(payload, workshop):
    """Return error tuple if caller is not the educator-owner (unless shift_leader+)."""
    role = (payload.get("role") or "").strip()
    if role in ("shift_leader", "camp_director", "developer"):
        return None  # override
    if (payload.get("deviceId") or "").strip() != (workshop.get("educatorId") or ""):
        return jsonify({"error": "forbidden: not workshop owner"}), 403
    return None


@app.route('/api/workshops', methods=['POST'])
def workshop_create():
    """POST — educator creates a workshop."""
    payload, err = _require_roles(EDUCATOR_PLUS, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    body = request.get_json() or {}
    title = (body.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title required"}), 400

    device_id = (payload.get("deviceId") or "").strip()
    import secrets as _secrets
    ws_id = f"WS-{_secrets.token_hex(5)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_ws = {
        "id": ws_id,
        "educatorId": device_id,
        "title": title,
        "direction": (body.get("direction") or "").strip(),
        "createdAt": now_iso,
    }
    store = get_store("workshops")
    data = store.load()
    workshops = data.get("workshops") or []
    workshops.append(new_ws)
    data["workshops"] = workshops
    store.save(data)
    return jsonify({"workshop": new_ws}), 201


@app.route('/api/workshops', methods=['GET'])
def workshop_list():
    """GET — list all workshops."""
    store = get_store("workshops")
    data = store.load()
    workshops = data.get("workshops") or []
    # Enrich with participant count + badge count
    participants = data.get("participants") or []
    badges = data.get("badges") or []
    result = []
    for w in workshops:
        if not isinstance(w, dict):
            continue
        ws_id = w.get("id", "")
        w_copy = dict(w)
        w_copy["participantCount"] = sum(1 for p in participants if isinstance(p, dict) and p.get("workshopId") == ws_id)
        w_copy["badgeCount"] = sum(1 for b in badges if isinstance(b, dict) and b.get("workshopId") == ws_id)
        result.append(w_copy)
    return jsonify({"workshops": result})


@app.route('/api/workshops/<workshop_id>', methods=['GET'])
def workshop_detail(workshop_id: str):
    """GET — workshop details with participants, badges, confirmations."""
    store = get_store("workshops")
    data = store.load()
    ws = _get_workshop_or_404(store, data, workshop_id)
    if ws is None:
        return jsonify({"error": "workshop not found"}), 404

    participants = [p for p in (data.get("participants") or []) if isinstance(p, dict) and p.get("workshopId") == workshop_id]
    badges = [b for b in (data.get("badges") or []) if isinstance(b, dict) and b.get("workshopId") == workshop_id]
    badge_ids = [b.get("id") for b in badges]
    confirmations = [c for c in (data.get("confirmations") or []) if isinstance(c, dict) and c.get("workshopBadgeId") in badge_ids]

    return jsonify({
        "workshop": ws,
        "participants": participants,
        "badges": badges,
        "confirmations": confirmations,
    })


@app.route('/api/workshops/<workshop_id>', methods=['PATCH'])
def workshop_update(workshop_id: str):
    """PATCH — update workshop title/direction (educator-owner)."""
    payload, err = _require_roles(EDUCATOR_PLUS, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    store = get_store("workshops")
    data = store.load()
    ws = _get_workshop_or_404(store, data, workshop_id)
    if ws is None:
        return jsonify({"error": "workshop not found"}), 404

    owner_err = _require_educator_owner(payload, ws)
    if owner_err is not None:
        return owner_err[0], owner_err[1]

    body = request.get_json() or {}
    for key in ("title", "direction"):
        if key in body:
            ws[key] = body[key]
    store.save(data)
    return jsonify({"workshop": ws})


@app.route('/api/workshops/<workshop_id>/participants', methods=['POST'])
def workshop_add_participant(workshop_id: str):
    """POST — add participant to workshop (educator-owner)."""
    payload, err = _require_roles(EDUCATOR_PLUS, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    store = get_store("workshops")
    data = store.load()
    ws = _get_workshop_or_404(store, data, workshop_id)
    if ws is None:
        return jsonify({"error": "workshop not found"}), 404

    owner_err = _require_educator_owner(payload, ws)
    if owner_err is not None:
        return owner_err[0], owner_err[1]

    body = request.get_json() or {}
    device_id = (body.get("deviceId") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId required"}), 400

    import secrets as _secrets
    p_id = f"WP-{_secrets.token_hex(5)}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_p = {
        "id": p_id,
        "workshopId": workshop_id,
        "deviceId": device_id,
        "nickname": (body.get("nickname") or "").strip(),
        "joinedAt": now_iso,
    }
    participants = data.get("participants") or []
    participants.append(new_p)
    data["participants"] = participants
    store.save(data)
    return jsonify({"participant": new_p}), 201


@app.route('/api/workshops/<workshop_id>/badges', methods=['POST'])
def workshop_add_badge(workshop_id: str):
    """POST — link a badge to workshop (educator-owner)."""
    payload, err = _require_roles(EDUCATOR_PLUS, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    store = get_store("workshops")
    data = store.load()
    ws = _get_workshop_or_404(store, data, workshop_id)
    if ws is None:
        return jsonify({"error": "workshop not found"}), 404

    owner_err = _require_educator_owner(payload, ws)
    if owner_err is not None:
        return owner_err[0], owner_err[1]

    body = request.get_json() or {}
    badge_id = (body.get("badgeId") or "").strip()
    if not badge_id:
        return jsonify({"error": "badgeId required"}), 400

    import secrets as _secrets
    wb_id = f"WB-{_secrets.token_hex(5)}"
    device_id = (payload.get("deviceId") or "").strip()

    new_badge = {
        "id": wb_id,
        "workshopId": workshop_id,
        "badgeId": badge_id,
        "addedBy": device_id,
    }
    badges = data.get("badges") or []
    badges.append(new_badge)
    data["badges"] = badges
    store.save(data)
    return jsonify({"badge": new_badge}), 201


@app.route('/api/workshops/<workshop_id>/badges/<badge_link_id>', methods=['DELETE'])
def workshop_remove_badge(workshop_id: str, badge_link_id: str):
    """DELETE — unlink a badge from workshop (educator-owner)."""
    payload, err = _require_roles(EDUCATOR_PLUS, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    store = get_store("workshops")
    data = store.load()
    ws = _get_workshop_or_404(store, data, workshop_id)
    if ws is None:
        return jsonify({"error": "workshop not found"}), 404

    owner_err = _require_educator_owner(payload, ws)
    if owner_err is not None:
        return owner_err[0], owner_err[1]

    badges = data.get("badges") or []
    before_len = len(badges)
    data["badges"] = [b for b in badges if not (isinstance(b, dict) and b.get("id") == badge_link_id and b.get("workshopId") == workshop_id)]
    if len(data["badges"]) == before_len:
        return jsonify({"error": "badge link not found"}), 404
    store.save(data)
    return jsonify({"status": "deleted", "id": badge_link_id})


@app.route('/api/workshops/<workshop_id>/badges/<badge_link_id>/confirm/<device_id>', methods=['POST'])
def workshop_confirm_badge(workshop_id: str, badge_link_id: str, device_id: str):
    """POST — educator confirms a badge for a participant."""
    payload, err = _require_roles(EDUCATOR_PLUS, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    store = get_store("workshops")
    data = store.load()
    ws = _get_workshop_or_404(store, data, workshop_id)
    if ws is None:
        return jsonify({"error": "workshop not found"}), 404

    owner_err = _require_educator_owner(payload, ws)
    if owner_err is not None:
        return owner_err[0], owner_err[1]

    # Verify badge link exists for this workshop
    badge_link = next((b for b in (data.get("badges") or []) if isinstance(b, dict) and b.get("id") == badge_link_id and b.get("workshopId") == workshop_id), None)
    if badge_link is None:
        return jsonify({"error": "badge link not found"}), 404

    import secrets as _secrets
    conf_id = f"WBC-{_secrets.token_hex(5)}"
    now_iso = datetime.now(timezone.utc).isoformat()
    confirmer_id = (payload.get("deviceId") or "").strip()

    new_conf = {
        "id": conf_id,
        "workshopBadgeId": badge_link_id,
        "deviceId": device_id,
        "status": "confirmed",
        "confirmedAt": now_iso,
        "confirmedBy": confirmer_id,
    }
    confirmations = data.get("confirmations") or []
    confirmations.append(new_conf)
    data["confirmations"] = confirmations
    store.save(data)
    return jsonify({"confirmation": new_conf}), 201

# ── Вожатификатор / Путеводные Огни (M14-VOZHATIFFICATOR-C) ──────────

_VOZH_DIR = os.path.join(os.path.dirname(__file__), "..", "ai-data", "vozhatifficator")

_vozh_sections_cache: list | None = None
_vozh_gl_cache: dict | None = None


@app.route('/api/vozhatifficator/sections', methods=['GET'])
def api_vozh_sections():
    """GET — list vozhatifficator book sections."""
    global _vozh_sections_cache
    if _vozh_sections_cache is not None:
        return jsonify(_vozh_sections_cache)
    sections = [
        {"id": "2013-2019", "title": "2013–2019", "status": "ready", "preview": "Классическая книга Вожатификатор. Основы лагерной педагогики."},
    ]
    for fname in ["2019-2022.json", "2023-present.json"]:
        fpath = os.path.join(_VOZH_DIR, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            sections.append({
                "id": fname.replace(".json", ""),
                "title": data.get("title", fname),
                "status": data.get("status", "in_development"),
                "preview": data.get("preview", ""),
            })
        except Exception:
            pass
    _vozh_sections_cache = sections
    return jsonify(sections)


@app.route('/api/vozhatifficator/guiding-lights', methods=['GET'])
def api_vozh_guiding_lights():
    """GET — return Guiding Lights checklist."""
    global _vozh_gl_cache
    if _vozh_gl_cache is not None:
        return jsonify(_vozh_gl_cache)
    fpath = os.path.join(_VOZH_DIR, "guiding_lights.json")
    try:
        with open(fpath, "r", encoding="utf-8") as f:
            _vozh_gl_cache = json.load(f)
    except Exception:
        _vozh_gl_cache = {"error": "guiding_lights.json not found"}
    return jsonify(_vozh_gl_cache)


# ── Запрос роли (M18-ROLE-REQUEST-C) ─────────────────────────────────

@app.route('/api/role-requests', methods=['POST'])
def api_role_request_create():
    """POST — create a role request. No auth required — anyone can submit."""
    body = request.get_json(silent=True) or {}
    desired_role = (body.get("desiredRole") or "").strip()
    if not desired_role:
        return jsonify({"error": "desiredRole required"}), 400
    # deviceId from body (sent by unauthenticated users from modal)
    device_id = (body.get("deviceId") or "").strip()
    if not device_id:
        # Try JWT as fallback (if already authenticated)
        auth_header = (request.headers.get("Authorization") or "").strip()
        if auth_header.startswith("Bearer ") and AUTH_JWT_SECRET:
            try:
                claims = jwt.decode(auth_header[7:], AUTH_JWT_SECRET, algorithms=["HS256"])
                device_id = (claims.get("deviceId") or claims.get("sub") or "").strip()
            except Exception:
                pass
    if not device_id:
        return jsonify({"error": "deviceId required"}), 400
    store = get_store("role_requests")
    data = store.load()
    items = data.get("items", [])
    new_item = {
        "id": str(uuid.uuid4()),
        "deviceId": device_id,
        "name": (body.get("name") or "").strip()[:100],
        "desiredRole": desired_role,
        "comment": (body.get("comment") or "").strip()[:300],
        "status": "pending",
        "createdAt": _now_iso(),
    }
    items.append(new_item)
    data["items"] = items
    store.save(data)
    return jsonify({"roleRequest": new_item}), 201


@app.route('/api/role-requests', methods=['GET'])
def api_role_request_list():
    """GET — list role requests, optional ?deviceId= filter."""
    device_id = request.args.get("deviceId", "")
    store = get_store("role_requests")
    data = store.load()
    items = data.get("items", [])
    if device_id:
        items = [i for i in items if i.get("deviceId") == device_id]
    # For approved requests: include a fresh accessToken so client can auto-login
    result = []
    for item in items:
        row = dict(item)
        if row.get("status") == "approved" and AUTH_JWT_SECRET:
            row["accessToken"] = _issue_role_jwt(row.get("desiredRole", "participant"), row.get("deviceId", ""))
        result.append(row)
    return jsonify({"requests": result})


# ── 4К навыки — маппинг и расчёт (M13-4K-ENGINE-C) ───────────────────

_4K_MAPPING_FILE = os.path.join(
    os.path.dirname(__file__), "..", "ai-data", "4k_mapping.json"
)

_4k_mapping_cache: dict | None = None


def _load_4k_mapping() -> dict:
    global _4k_mapping_cache
    if _4k_mapping_cache is not None:
        return _4k_mapping_cache
    try:
        with open(_4K_MAPPING_FILE, "r", encoding="utf-8") as f:
            _4k_mapping_cache = json.load(f)
    except Exception:
        _4k_mapping_cache = {}
    return _4k_mapping_cache


@app.route('/api/4k/mapping', methods=['GET'])
def api_4k_mapping():
    """GET — return the 4K skills mapping data."""
    mapping = _load_4k_mapping()
    return jsonify(mapping)


@app.route('/api/4k/stats/<device_id>', methods=['GET'])
def api_4k_stats(device_id: str):
    """GET — compute 4K skill scores for a device."""
    mapping = _load_4k_mapping()
    cat_defaults = mapping.get("category_defaults") or {}
    badge_map = mapping.get("badge_mappings") or {}
    act_bonuses = mapping.get("activity_bonuses") or {}
    programs_def = mapping.get("programs") or {}

    ALL_SKILLS = ["collaboration", "critical_thinking", "creativity", "communication"]
    raw_scores: dict[str, float] = {s: 0.0 for s in ALL_SKILLS}
    ci_count = 0
    eng_created = 0
    eng_joined = 0

    # --- 1. Badge contributions from badge_requests ---
    try:
        br_data = get_store("badge_requests").load()
        requests_list = br_data.get("requests") or []
        approved_badge_ids: list[str] = []
        for req in requests_list:
            if not isinstance(req, dict):
                continue
            if req.get("deviceId") != device_id:
                continue
            if req.get("status") != "approved":
                continue
            bid = req.get("badgeId") or req.get("levelId") or ""
            if bid:
                approved_badge_ids.append(str(bid))

        for bid in approved_badge_ids:
            parts = str(bid).split(".")
            base_id = f"{parts[0]}.{parts[1]}" if len(parts) >= 2 else bid
            cat_id = parts[0] if parts else bid

            # Lookup: badge-level first, then category default
            entry = badge_map.get(base_id) or cat_defaults.get(cat_id)
            if not entry:
                continue
            skills = entry.get("skills") or []
            weights = entry.get("weights") or []
            for i, sk in enumerate(skills):
                w = weights[i] if i < len(weights) else 1.0
                # Normalize skill key: cooperation → collaboration
                if sk == "cooperation":
                    sk = "collaboration"
                if sk in raw_scores:
                    raw_scores[sk] += w * 2  # achieved = weight * 2
    except Exception:
        approved_badge_ids = []

    # --- 2. Activity bonuses ---

    # Council initiatives
    try:
        ci_data = get_store("council_initiatives").load()
        ci_count = sum(
            1 for ini in (ci_data.get("initiatives") or [])
            if isinstance(ini, dict) and ini.get("deviceId") == device_id
        )
        if ci_count > 0:
            bonus_def = act_bonuses.get("council_initiative") or {}
            bonus_val = bonus_def.get("bonus", 5) * ci_count
            for sk in (bonus_def.get("skills") or []):
                key = "collaboration" if sk == "cooperation" else sk
                if key in raw_scores:
                    raw_scores[key] += bonus_val
    except Exception:
        pass

    # Engines created / joined
    try:
        eng_data = get_store("engines").load()
        eng_created = sum(
            1 for e in (eng_data.get("engines") or [])
            if isinstance(e, dict) and e.get("createdBy") == device_id
        )
        if eng_created > 0:
            bonus_def = act_bonuses.get("engine_created") or {}
            bonus_val = bonus_def.get("bonus", 10) * eng_created
            for sk in (bonus_def.get("skills") or []):
                key = "collaboration" if sk == "cooperation" else sk
                if key in raw_scores:
                    raw_scores[key] += bonus_val

        mem_data = get_store("engine_members").load()
        eng_joined = sum(
            1 for m in (mem_data.get("members") or [])
            if isinstance(m, dict) and m.get("deviceId") == device_id
        )
        if eng_joined > 0:
            bonus_def = act_bonuses.get("engine_joined") or {}
            bonus_val = bonus_def.get("bonus", 3) * eng_joined
            for sk in (bonus_def.get("skills") or []):
                key = "collaboration" if sk == "cooperation" else sk
                if key in raw_scores:
                    raw_scores[key] += bonus_val
    except Exception:
        pass

    # Inspector days completed
    try:
        insp_data = get_store("inspector_progress").load()
        insp_days = sum(
            1 for p in (insp_data.get("progress") or [])
            if isinstance(p, dict) and p.get("deviceId") == device_id and p.get("status") == "approved"
        )
        if insp_days > 0:
            bonus_def = act_bonuses.get("inspector_day_completed") or {}
            bonus_val = bonus_def.get("bonus", 3) * insp_days
            for sk in (bonus_def.get("skills") or []):
                key = "collaboration" if sk == "cooperation" else sk
                if key in raw_scores:
                    raw_scores[key] += bonus_val
    except Exception:
        pass

    # BRO passports completed
    try:
        bro_data = get_store("bro_passports").load()
        bro_completed = sum(
            1 for p in (bro_data.get("passports") or [])
            if isinstance(p, dict) and p.get("deviceId") == device_id and p.get("status") == "completed"
        )
        if bro_completed > 0:
            bonus_def = act_bonuses.get("bro_passport_completed") or {}
            bonus_val = bonus_def.get("bonus", 8) * bro_completed
            for sk in (bonus_def.get("skills") or []):
                key = "collaboration" if sk == "cooperation" else sk
                if key in raw_scores:
                    raw_scores[key] += bonus_val
    except Exception:
        pass

    # --- 3. Normalize to 0-100 ---
    max_raw = max(raw_scores.values()) if raw_scores else 1.0
    if max_raw < 1:
        max_raw = 1.0
    normalized: dict[str, int] = {}
    for sk in ALL_SKILLS:
        normalized[sk] = round((raw_scores.get(sk, 0) / max_raw) * 100)

    # --- 4. Program track scores ---
    program_scores: dict[str, dict] = {}
    for prog_key, prog_def in programs_def.items():
        if not isinstance(prog_def, dict):
            continue
        cat_ids = prog_def.get("category_ids") or []
        prog_raw = 0.0
        for bid in approved_badge_ids:
            cat_id = str(bid).split(".")[0]
            if cat_id in cat_ids:
                prog_raw += 2.0  # each approved badge = 2 pts
        # Add activity bonuses for programs that define them
        act_keys = prog_def.get("activity_keys") or []
        for akey in act_keys:
            if akey == "council_initiative":
                prog_raw += ci_count * 5
            elif akey == "engine_created":
                prog_raw += eng_created * 10
            elif akey == "engine_joined":
                prog_raw += eng_joined * 3
        program_scores[prog_key] = {
            "label": prog_def.get("label", prog_key),
            "emoji": prog_def.get("emoji", ""),
            "raw": prog_raw,
        }

    # Normalize program scores
    prog_max = max((ps.get("raw", 0) for ps in program_scores.values()), default=1.0)
    if prog_max < 1:
        prog_max = 1.0
    for ps in program_scores.values():
        ps["normalized"] = round((ps.get("raw", 0) / prog_max) * 100)

    return jsonify({
        "deviceId": device_id,
        "skills": normalized,
        "raw": {k: round(v, 2) for k, v in raw_scores.items()},
        "programs": program_scores,
        "badgeCount": len(approved_badge_ids),
    })


# ── Camp Director Overview (M14-CAMP-DIRECTOR-A) ───────────────────────────

_DIRECTOR_ROLES = ("camp_director", "developer")


@app.route('/api/camp/overview', methods=['GET'])
def camp_overview():
    """GET — aggregated camp stats for camp_director."""
    payload, err = _require_roles(_DIRECTOR_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    result = {}

    # Shifts
    try:
        sh = get_store("shifts").load()
        shifts_list = sh.get("shifts") or []
        result["shifts"] = {
            "total": len(shifts_list),
            "active": sum(1 for s in shifts_list if isinstance(s, dict) and s.get("status") == "active"),
        }
    except Exception:
        result["shifts"] = {"total": 0, "active": 0}

    # Squads (from memberships)
    try:
        mb = get_store("memberships").load()
        members = mb.get("members") or []
        squad_ids = set()
        for m in members:
            if isinstance(m, dict) and m.get("squadId"):
                squad_ids.add(m["squadId"])
        result["squads"] = {"total": len(squad_ids), "members_total": len(members)}
    except Exception:
        result["squads"] = {"total": 0, "members_total": 0}

    # Engines
    try:
        eng = get_store("engines").load()
        eng_list = eng.get("engines") or []
        result["engines"] = {
            "total": len(eng_list),
            "approved": sum(1 for e in eng_list if isinstance(e, dict) and e.get("status") == "approved"),
            "pending": sum(1 for e in eng_list if isinstance(e, dict) and e.get("status") == "pending"),
        }
    except Exception:
        result["engines"] = {"total": 0, "approved": 0, "pending": 0}

    # Workshops
    try:
        ws = get_store("workshops").load()
        workshops_list = ws.get("workshops") or []
        prt = ws.get("participants") or []
        result["workshops"] = {"total": len(workshops_list), "participants_total": len(prt)}
    except Exception:
        result["workshops"] = {"total": 0, "participants_total": 0}

    # Council initiatives
    try:
        ci = get_store("council_initiatives").load()
        ci_list = ci.get("initiatives") or []
        result["council_initiatives"] = {
            "total": len(ci_list),
            "approved": sum(1 for i_ in ci_list if isinstance(i_, dict) and i_.get("status") == "approved"),
            "in_progress": sum(1 for i_ in ci_list if isinstance(i_, dict) and i_.get("status") == "in_progress"),
        }
    except Exception:
        result["council_initiatives"] = {"total": 0, "approved": 0, "in_progress": 0}

    # Badge requests
    try:
        br = get_store("badge_requests").load()
        br_list = br.get("requests") or []
        result["badge_requests"] = {
            "total": len(br_list),
            "approved": sum(1 for r_ in br_list if isinstance(r_, dict) and r_.get("status") == "approved"),
            "pending": sum(1 for r_ in br_list if isinstance(r_, dict) and r_.get("status") == "pending"),
        }
    except Exception:
        result["badge_requests"] = {"total": 0, "approved": 0, "pending": 0}

    # Inspector progress
    try:
        ip = get_store("inspector_progress").load()
        ip_list = ip.get("progress") or []
        device_ids_active = set()
        completed_count = 0
        for p in ip_list:
            if isinstance(p, dict):
                device_ids_active.add(p.get("deviceId", ""))
                if p.get("status") == "approved":
                    completed_count += 1
        result["inspector_progress"] = {"active_users": len(device_ids_active), "completed_checklists": completed_count}
    except Exception:
        result["inspector_progress"] = {"active_users": 0, "completed_checklists": 0}

    # BRO events
    try:
        be = get_store("bro_events").load()
        bp = get_store("bro_passports").load()
        result["bro_events"] = {
            "total": len(be.get("events") or []),
            "passports_completed": sum(
                1 for p in (bp.get("passports") or [])
                if isinstance(p, dict) and p.get("status") == "completed"
            ),
        }
    except Exception:
        result["bro_events"] = {"total": 0, "passports_completed": 0}

    return jsonify(result)


# ── Parent Email Auth Stub (M14-PARENT-AUTH-A) ────────────────────────────

_email_tokens: dict = {}  # in-memory dev store: email -> token


@app.route('/api/auth/email/request', methods=['POST'])
def auth_email_request():
    """
    POST /api/auth/email/request — dev stub: generate magic link token.
    Body: {"email": "parent@example.com"}
    Returns: {"ok": true, "message": "...", "devToken": "..."}
    In production this would send an email. In dev mode it returns the token directly.
    """
    body = request.get_json() or {}
    email = (body.get("email") or "").strip().lower()
    if not email or "@" not in email:
        return jsonify({"error": "Valid email required"}), 400

    import secrets as _sec
    token = _sec.token_urlsafe(32)
    _email_tokens[token] = email

    return jsonify({
        "ok": True,
        "message": "Dev mode: token returned directly (no email sent)",
        "devToken": token,
    })


@app.route('/api/auth/email/verify', methods=['GET'])
def auth_email_verify():
    """
    GET /api/auth/email/verify?token=xxx — verify magic link, return JWT with role=parent.
    """
    token = (request.args.get("token") or "").strip()
    if not token or token not in _email_tokens:
        return jsonify({"error": "Invalid or expired token"}), 401

    email = _email_tokens.pop(token)
    # Generate a JWT for parent role
    parent_device_id = f"parent-{email.split('@')[0]}"
    import time as _time
    now_ts = int(_time.time())
    jwt_payload = {
        "deviceId": parent_device_id,
        "nickname": email.split("@")[0],
        "role": "parent",
        "email": email,
        "iat": now_ts,
        "exp": now_ts + 86400 * 7,  # 7 days
    }
    try:
        import jwt as _jwt
        secret = os.environ.get("AUTH_SECRET", "dev-secret")
        encoded = _jwt.encode(jwt_payload, secret, algorithm="HS256")
    except Exception:
        encoded = f"dev-jwt-{parent_device_id}"

    return jsonify({"ok": True, "token": encoded, "role": "parent", "deviceId": parent_device_id})


# ── Parent Suggest Route (M14-PARENT-AUTH-A) ──────────────────────────────

_PARENT_PLUS = ("parent", "counselor", "educator", "shift_leader", "camp_director", "developer")


@app.route('/api/parent/suggest-route', methods=['POST'])
def parent_suggest_route():
    """
    POST /api/parent/suggest-route — parent suggests a badge route for their child.
    Body: {"childDeviceId": "...", "badges": ["1.1", "2.3"], "note"?: "..."}
    """
    payload, err = _require_roles(_PARENT_PLUS, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    body = request.get_json() or {}
    child_id = (body.get("childDeviceId") or "").strip()
    badges = body.get("badges") or []
    note = (body.get("note") or "").strip()

    if not child_id:
        return jsonify({"error": "childDeviceId required"}), 400
    if not isinstance(badges, list) or len(badges) == 0:
        return jsonify({"error": "badges array required"}), 400

    import secrets as _sec2
    suggestion_id = f"PS-{_sec2.token_hex(5)}"
    created_at = datetime.now(timezone.utc).isoformat()
    parent_id = (payload.get("deviceId") or "").strip()

    new_suggestion = {
        "id": suggestion_id,
        "parentId": parent_id,
        "childDeviceId": child_id,
        "badges": badges,
        "note": note,
        "status": "suggested",
        "createdAt": created_at,
    }

    store = get_store("parent_suggestions")
    data = store.load()
    items = data.get("suggestions") or []
    items.append(new_suggestion)
    data["suggestions"] = items
    store.save(data)

    return jsonify({"suggestion": new_suggestion}), 201


@app.route('/api/parent/suggestions/<child_device_id>', methods=['GET'])
def parent_suggestions_list(child_device_id: str):
    """
    GET /api/parent/suggestions/<childDeviceId> — list suggestions for a child.
    """
    payload, err = _require_roles(_PARENT_PLUS, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    store = get_store("parent_suggestions")
    data = store.load()
    items = [
        s for s in (data.get("suggestions") or [])
        if isinstance(s, dict) and s.get("childDeviceId") == child_device_id
    ]
    return jsonify({"suggestions": items})


# ---------------------------------------------------------------------------
# M15-AUTH-BACKEND-A: resolve_user middleware + /api/auth/me + /api/auth/link-device
# M15-DEV-ROLE-A:    DEV_EMAILS + /api/dev/switch-role + /api/dev/users + role mgmt
# ---------------------------------------------------------------------------

# Permissions map by role
_PERMISSIONS_MAP = {
    "participant": {
        "can_submit": True,
    },
    "counselor": {
        "can_submit": True,
        "can_approve_badges": True,
        "can_manage_squad": True,
    },
    "educator": {
        "can_submit": True,
        "can_manage_workshop": True,
    },
    "shift_leader": {
        "can_submit": True,
        "can_approve_badges": True,
        "can_manage_squad": True,
        "can_manage_shifts": True,
        "can_approve_all": True,
        "can_view_dashboard": True,
    },
    "camp_director": {
        "can_submit": True,
        "can_approve_badges": True,
        "can_manage_squad": True,
        "can_manage_shifts": True,
        "can_approve_all": True,
        "can_view_dashboard": True,
        "can_view_overview": True,
    },
    "parent": {
        "can_view_child": True,
        "can_suggest_route": True,
    },
    "developer": {
        "can_submit": True,
        "can_approve_badges": True,
        "can_manage_squad": True,
        "can_manage_workshop": True,
        "can_manage_shifts": True,
        "can_approve_all": True,
        "can_view_dashboard": True,
        "can_view_overview": True,
        "can_switch_role": True,
        "can_manage_users": True,
        "can_moderate_arts": True,
    },
}

# In-memory role overrides for dev switch-role (session-scoped)
_dev_role_overrides: dict = {}


def _get_permissions(role: str) -> dict:
    """Return permissions dict for a given role."""
    return dict(_PERMISSIONS_MAP.get(role, {}))


def resolve_user():
    """
    M15: Resolve current user from JWT (deviceId) or X-Device-Id header.
    Auto-creates user if not found (migration path).
    Returns: (user_dict, None) on success, or (None, (response, status)) on error.
    user_dict: {id, email, role, nickname, avatar_url, deviceId, permissions}
    """
    device_id = None
    email = None
    role_from_jwt = None

    # 1) Try JWT
    auth_header = (request.headers.get("Authorization") or "").strip()
    if auth_header.startswith("Bearer ") and AUTH_JWT_SECRET:
        token = auth_header[7:].strip()
        if token:
            try:
                payload = jwt.decode(token, AUTH_JWT_SECRET, algorithms=["HS256"])
                device_id = (payload.get("deviceId") or "").strip() or None
                role_from_jwt = _normalize_role((payload.get("role") or "").strip())
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                return None, (jsonify({"error": "Invalid or expired token"}), 401)

    # 2) Fallback: X-Device-Id header
    if not device_id:
        device_id = (request.headers.get("X-Device-Id") or "").strip() or None

    # 3) Localhost fallback
    if not device_id and _is_localhost_request():
        device_id = "dev-local"

    if not device_id:
        return None, (jsonify({"error": "Authorization required (JWT or X-Device-Id)"}), 401)

    # Look up user in store
    store = get_store("users")
    data = store.load()
    users = data.get("users") or []

    user = None
    for u in users:
        if isinstance(u, dict) and u.get("legacy_device_id") == device_id:
            user = u
            break

    # Auto-create if not found
    if user is None:
        user = {
            "id": uuid.uuid4().hex,
            "supabase_auth_id": None,
            "legacy_device_id": device_id,
            "email": "",
            "nickname": "",
            "avatar_url": "",
            "role": role_from_jwt or "participant",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
        users.append(user)
        data["users"] = users
        try:
            store.save(data)
        except Exception:
            traceback.print_exc()

    # DEV_EMAILS override
    user_email = (user.get("email") or "").strip().lower()
    if user_email and user_email in DEV_EMAILS:
        user["role"] = "developer"

    # Dev switch-role override
    effective_role = user.get("role", "participant")
    override = _dev_role_overrides.get(device_id)
    if override and effective_role == "developer":
        effective_role = override

    permissions = _get_permissions(effective_role)

    return {
        "id": user.get("id", ""),
        "email": user.get("email", ""),
        "role": effective_role,
        "originalRole": user.get("role", "participant"),
        "nickname": user.get("nickname", ""),
        "avatar_url": user.get("avatar_url", ""),
        "deviceId": device_id,
        "permissions": permissions,
    }, None


@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    """GET /api/auth/me — current user profile + permissions."""
    user, err = resolve_user()
    if err is not None:
        return err[0], err[1]
    return jsonify(user)


@app.route('/api/auth/me', methods=['PATCH'])
def auth_me_update():
    """PATCH /api/auth/me — update nickname / avatar_url."""
    user, err = resolve_user()
    if err is not None:
        return err[0], err[1]
    body = request.get_json() or {}
    nickname = body.get("nickname")
    avatar_url = body.get("avatar_url")
    if nickname is None and avatar_url is None:
        return jsonify({"error": "Nothing to update (nickname or avatar_url expected)"}), 400

    store = get_store("users")
    data = store.load()
    users = data.get("users") or []
    updated_user = None
    for u in users:
        if isinstance(u, dict) and u.get("id") == user["id"]:
            if nickname is not None:
                u["nickname"] = str(nickname).strip()[:100]
            if avatar_url is not None:
                u["avatar_url"] = str(avatar_url).strip()[:500]
            u["updatedAt"] = datetime.now(timezone.utc).isoformat()
            updated_user = u
            break
    if updated_user:
        data["users"] = users
        store.save(data)
    return jsonify({"user": {
        "id": user["id"],
        "nickname": (updated_user or user).get("nickname", ""),
        "avatar_url": (updated_user or user).get("avatar_url", ""),
    }})


@app.route('/api/auth/link-device', methods=['POST'])
def auth_link_device():
    """POST /api/auth/link-device — link a legacy device_id to the current user."""
    user, err = resolve_user()
    if err is not None:
        return err[0], err[1]
    body = request.get_json() or {}
    legacy_device_id = (body.get("deviceId") or "").strip()
    if not legacy_device_id:
        return jsonify({"error": "deviceId required"}), 400

    store = get_store("users")
    data = store.load()
    users = data.get("users") or []
    for u in users:
        if isinstance(u, dict) and u.get("id") == user["id"]:
            u["legacy_device_id"] = legacy_device_id
            u["updatedAt"] = datetime.now(timezone.utc).isoformat()
            break
    data["users"] = users
    store.save(data)
    return jsonify({"linked": True, "deviceId": legacy_device_id})


@app.route('/api/dev/switch-role', methods=['POST'])
def dev_switch_role():
    """POST /api/dev/switch-role — temporarily switch role (developer only)."""
    user, err = resolve_user()
    if err is not None:
        return err[0], err[1]
    if user.get("originalRole") != "developer":
        return jsonify({"error": "Access denied: developer only"}), 403
    body = request.get_json() or {}
    target_role = _normalize_role((body.get("role") or "").strip())
    if target_role not in CHAT_ALLOWED_ROLES:
        return jsonify({"error": f"Invalid role: {target_role}"}), 400
    device_id = user.get("deviceId", "")
    if target_role == "developer":
        _dev_role_overrides.pop(device_id, None)
    else:
        _dev_role_overrides[device_id] = target_role
    return jsonify({
        "original_role": "developer",
        "current_role": target_role,
    })


@app.route('/api/dev/users', methods=['GET'])
def dev_users_list():
    """GET /api/dev/users — list all users (developer only)."""
    payload, err = _require_roles(("developer",), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    store = get_store("users")
    data = store.load()
    users = data.get("users") or []
    return jsonify({"users": users, "total": len(users)})


@app.route('/api/dev/users/<user_id>/role', methods=['PATCH'])
def dev_users_update_role(user_id):
    """PATCH /api/dev/users/<id>/role — change a user's role (developer only)."""
    payload, err = _require_roles(("developer",), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]
    body = request.get_json() or {}
    new_role = _normalize_role((body.get("role") or "").strip())
    if new_role not in CHAT_ALLOWED_ROLES:
        return jsonify({"error": f"Invalid role: {new_role}"}), 400

    store = get_store("users")
    data = store.load()
    users = data.get("users") or []
    target = None
    for u in users:
        if isinstance(u, dict) and u.get("id") == user_id:
            u["role"] = new_role
            u["updatedAt"] = datetime.now(timezone.utc).isoformat()
            target = u
            break
    if target is None:
        return jsonify({"error": "User not found"}), 404
    data["users"] = users
    store.save(data)
    return jsonify({"user": target})


# ---------------------------------------------------------------------------
# M16-DASHBOARD-BACKEND-A: Unified Inbox + Universal Action
# ---------------------------------------------------------------------------

_ADMIN_INBOX_ROLES = ("counselor", "educator", "shift_leader", "camp_director", "developer")


def _collect_inbox_items(type_filter: str = ""):
    """Collect pending items from 5 stores, return (items, counts)."""
    items = []
    counts: dict = {}

    def _add(item_type, item_list):
        counts[item_type] = len(item_list)
        if type_filter and type_filter != item_type:
            return
        items.extend(item_list)

    # 1) Badge requests — status == "pending"
    try:
        bdoc = _badge_requests_load()
        pending_br = []
        for row in (bdoc.get("requests") or []):
            if not isinstance(row, dict):
                continue
            if (row.get("status") or "") != "pending":
                continue
            req_by = row.get("requestedBy") or {}
            evidence_raw = row.get("evidence") or {}
            if not isinstance(evidence_raw, dict):
                evidence_raw = {}
            pending_br.append({
                "type": "badge_request",
                "id": row.get("id", ""),
                "user": {
                    "device_id": req_by.get("deviceId", "") if isinstance(req_by, dict) else "",
                    "nickname": (req_by.get("nickname") or "") if isinstance(req_by, dict) else "",
                },
                "data": {
                    "badge_id": row.get("levelId", ""),
                    "badge_name": row.get("badgeTitle", ""),
                    "nickname": (req_by.get("nickname") or "") if isinstance(req_by, dict) else "",
                    "evidence": {
                        "reflection": evidence_raw.get("reflection", ""),
                        "impact": evidence_raw.get("impact", ""),
                        "link": evidence_raw.get("link", ""),
                        "photos": evidence_raw.get("photos", []),
                    },
                    "attachments": evidence_raw.get("photos", []),
                },
                "status": "pending",
                "created_at": row.get("createdAt", ""),
            })
        _add("badge_request", pending_br)
    except Exception:
        counts.setdefault("badge_request", 0)

    # 2) Council initiatives — pending statuses
    _CI_PENDING = {"idea", "proposed", "new", "submitted"}
    try:
        ci_data = get_store("council_initiatives").load()
        pending_ci = []
        for item in (ci_data.get("initiatives") or []):
            if not isinstance(item, dict):
                continue
            status = (item.get("status") or "").strip().lower()
            if status not in _CI_PENDING:
                continue
            pending_ci.append({
                "type": "council_initiative",
                "id": item.get("id", ""),
                "user": {
                    "device_id": item.get("authorDeviceId", "") or item.get("deviceId", "") or item.get("createdBy", ""),
                    "nickname": item.get("authorNickname", "") or item.get("author_nickname", "") or item.get("createdByNickname", ""),
                },
                "data": {
                    "title": item.get("title", ""),
                    "description": (item.get("description") or "")[:200],
                    "status": item.get("status", ""),
                    "nickname": item.get("authorNickname", "") or item.get("createdByNickname", ""),
                    "sourceType": item.get("sourceType", ""),
                    "authorRole": item.get("authorRole", ""),
                    "authorWing": item.get("authorWing", ""),
                },
                "status": "pending",
                "created_at": item.get("createdAt", "") or item.get("created_at", ""),
            })
        _add("council_initiative", pending_ci)
    except Exception:
        counts.setdefault("council_initiative", 0)

    # 3) Badge arts — status == "pending"
    try:
        ba_data = get_store("badge_arts").load()
        pending_ba = []
        for art in (ba_data.get("arts") or []):
            if not isinstance(art, dict):
                continue
            if (art.get("status") or "") != "pending":
                continue
            pending_ba.append({
                "type": "badge_art",
                "id": art.get("id", ""),
                "user": {
                    "device_id": art.get("deviceId", ""),
                    "nickname": art.get("authorNickname", ""),
                },
                "data": {
                    "image_url": art.get("imageUrl", ""),
                    "source": art.get("source", ""),
                    "badge_id": art.get("badgeId", ""),
                },
                "status": "pending",
                "created_at": art.get("createdAt", ""),
            })
        _add("badge_art", pending_ba)
    except Exception:
        counts.setdefault("badge_art", 0)

    # 4) Engines — status == "pending"
    try:
        eng_data = get_store("engines").load()
        pending_eng = []
        for eng in (eng_data.get("engines") or []):
            if not isinstance(eng, dict):
                continue
            if (eng.get("status") or "") != "pending":
                continue
            pending_eng.append({
                "type": "engine_approve",
                "id": eng.get("id", ""),
                "user": {
                    "device_id": eng.get("createdBy", ""),
                    "nickname": "",
                },
                "data": {
                    "title": eng.get("title", ""),
                    "squad_id": eng.get("squadId", ""),
                },
                "status": "pending",
                "created_at": eng.get("createdAt", ""),
            })
        _add("engine_approve", pending_eng)
    except Exception:
        counts.setdefault("engine_approve", 0)

    # 5) Inspector progress — status == "completed" (awaiting approval)
    try:
        ip_data = get_store("inspector_progress").load()
        pending_ip = []
        for p in (ip_data.get("progress") or []):
            if not isinstance(p, dict):
                continue
            if (p.get("status") or "") != "completed":
                continue
            pending_ip.append({
                "type": "inspector_task",
                "id": p.get("id", ""),
                "user": {
                    "device_id": p.get("deviceId", ""),
                    "nickname": "",
                },
                "data": {
                    "checklist_id": p.get("checklistId", ""),
                    "task_id": p.get("taskId", ""),
                },
                "status": "done_pending",
                "created_at": p.get("completedAt", ""),
            })
        _add("inspector_task", pending_ip)
    except Exception:
        counts.setdefault("inspector_task", 0)

    # 6) M19: Role requests — status == "pending"
    try:
        with _ROLE_REQUESTS_LOCK:
            if os.path.exists(ROLE_REQUESTS_FILE):
                with open(ROLE_REQUESTS_FILE, 'r', encoding='utf-8') as f:
                    rr_data = json.load(f)
            else:
                rr_data = []
        if not isinstance(rr_data, list):
            rr_data = []
        pending_rr = []
        for rr in rr_data:
            if not isinstance(rr, dict):
                continue
            if (rr.get("status") or "") != "pending":
                continue
            pending_rr.append({
                "type": "role_request",
                "id": rr.get("id", ""),
                "user": {
                    "device_id": rr.get("deviceId", ""),
                    "nickname": rr.get("name", ""),
                },
                "data": {
                    "desired_role": rr.get("desiredRole", ""),
                    "comment": rr.get("comment", ""),
                },
                "status": "pending",
                "created_at": rr.get("createdAt", ""),
            })
        _add("role_request", pending_rr)
    except Exception:
        counts.setdefault("role_request", 0)

    # 7) BRO task submissions — status == "pending"
    try:
        bro_subs_data = get_store("bro_submissions").load()
        pending_bro = []
        for sub in (bro_subs_data.get("submissions") or []):
            if not isinstance(sub, dict):
                continue
            if (sub.get("status") or "") != "pending":
                continue
            pending_bro.append({
                "type": "bro_submission",
                "id": sub.get("id", ""),
                "user": {
                    "device_id": sub.get("deviceId", ""),
                    "nickname": sub.get("nickname") or "",
                },
                "data": {
                    "task_title": sub.get("taskTitle", ""),
                    "task_id": sub.get("taskId", ""),
                    "text": (sub.get("text") or "")[:200],
                    "passport_id": sub.get("passportId", ""),
                    "photoUrl": sub.get("photoUrl") or None,
                    "nickname": sub.get("nickname") or None,
                    "userRole": sub.get("userRole") or None,
                },
                "status": "pending",
                "created_at": sub.get("submittedAt", ""),
            })
        _add("bro_submission", pending_bro)
    except Exception:
        counts.setdefault("bro_submission", 0)

    # 8) Badge plans — status == "submitted"
    try:
        bp_data = get_store("badge_plans").load()
        pending_bp = []
        for p in (bp_data.get("plans") or []):
            if not isinstance(p, dict):
                continue
            if (p.get("status") or "") != "submitted":
                continue
            pending_bp.append({
                "type": "badge_plan",
                "id": p.get("id", ""),
                "user": {
                    "device_id": p.get("deviceId", ""),
                    "nickname": "",
                },
                "data": {
                    "badge_id": p.get("badgeId", ""),
                    "level_id": p.get("levelId", ""),
                    "plan_text": (p.get("planText") or "")[:200],
                },
                "status": "pending",
                "created_at": p.get("updatedAt", "") or p.get("createdAt", ""),
            })
        _add("badge_plan", pending_bp)
    except Exception:
        counts.setdefault("badge_plan", 0)

    # Sort by created_at descending
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    counts["total"] = sum(v for k, v in counts.items() if k != "total")

    return items, counts


@app.route('/api/admin/inbox', methods=['GET'])
def admin_inbox():
    """
    GET /api/admin/inbox — unified inbox aggregating pending items from all stores.
    Optional query param: ?type=badge_request (filter by item type).
    Auth: counselor|educator|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(_ADMIN_INBOX_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    type_filter = (request.args.get("type") or "").strip()
    items, counts = _collect_inbox_items(type_filter)
    return jsonify({"items": items, "counts": counts})


@app.route('/api/admin/action', methods=['POST'])
def admin_action():
    """
    POST /api/admin/action — universal action dispatcher.
    Body: { "item_type": "badge_request", "item_id": "...", "action": "approve|reject", "comment": "..." }
    Routes action to the appropriate store.
    Auth: counselor|educator|shift_leader|camp_director|developer
    """
    payload, err = _require_roles(_ADMIN_INBOX_ROLES, allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    body = request.get_json() or {}
    item_type = (body.get("item_type") or "").strip()
    item_id = (body.get("item_id") or "").strip()
    action = (body.get("action") or "").strip()
    comment = (body.get("comment") or "").strip()

    if not item_type or not item_id or not action:
        return jsonify({"error": "item_type, item_id, and action are required"}), 400
    if action not in ("approve", "reject"):
        return jsonify({"error": "action must be 'approve' or 'reject'"}), 400

    now_iso = datetime.now(timezone.utc).isoformat()
    approver_device = (payload.get("deviceId") or "staff").strip()
    approver_role = _normalize_role((payload.get("role") or "").strip())

    # --- Route to store ---

    if item_type == "badge_request":
        next_status = "approved" if action == "approve" else "rejected"
        bdoc = _badge_requests_load()
        rows = bdoc.get("requests") or []
        target = None
        for row in rows:
            if isinstance(row, dict) and (row.get("id") or "") == item_id:
                target = row
                break
        if target is None:
            return jsonify({"error": "Badge request not found"}), 404
        if target.get("status") != "pending":
            return jsonify({"error": f"Already resolved: {target.get('status')}"}), 409
        target["status"] = next_status
        target["resolvedAt"] = now_iso
        target["resolvedBy"] = {"deviceId": approver_device, "role": approver_role}
        if comment:
            target["resolutionNote"] = comment[:2000]
        _badge_requests_save(bdoc)
        return jsonify({"ok": True, "item_type": item_type, "item_id": item_id, "action": action})

    elif item_type == "council_initiative":
        next_status = "approved" if action == "approve" else "rejected"
        store = get_store("council_initiatives")
        data = store.load()
        items = data.get("initiatives") or []
        target = None
        for item in items:
            if isinstance(item, dict) and item.get("id") == item_id:
                target = item
                break
        if target is None:
            return jsonify({"error": "Initiative not found"}), 404
        target["status"] = next_status
        target["updatedAt"] = now_iso
        if comment:
            target["moderatorNote"] = comment[:2000]
        store.save(data)
        return jsonify({"ok": True, "item_type": item_type, "item_id": item_id, "action": action})

    elif item_type == "badge_art":
        next_status = "approved" if action == "approve" else "rejected"
        store = get_store("badge_arts")
        data = store.load()
        arts = data.get("arts") or []
        target = None
        for art in arts:
            if isinstance(art, dict) and art.get("id") == item_id:
                target = art
                break
        if target is None:
            return jsonify({"error": "Art not found"}), 404
        if target.get("status") in ("approved", "rejected", "canon"):
            return jsonify({"error": f"Already reviewed: {target.get('status')}"}), 409
        target["status"] = next_status
        target["updatedAt"] = now_iso
        if comment:
            target["moderatorNote"] = comment[:2000]
        store.save(data)
        return jsonify({"ok": True, "item_type": item_type, "item_id": item_id, "action": action})

    elif item_type == "engine_approve":
        if action == "reject":
            next_status = "rejected"
        else:
            next_status = "approved"
        store = get_store("engines")
        data = store.load()
        engines = data.get("engines") or []
        target = None
        for eng in engines:
            if isinstance(eng, dict) and eng.get("id") == item_id:
                target = eng
                break
        if target is None:
            return jsonify({"error": "Engine not found"}), 404
        target["status"] = next_status
        target["updatedAt"] = now_iso
        store.save(data)
        return jsonify({"ok": True, "item_type": item_type, "item_id": item_id, "action": action})

    elif item_type == "inspector_task":
        if action == "reject":
            return jsonify({"error": "Inspector tasks cannot be rejected, only approved"}), 400
        store = get_store("inspector_progress")
        data = store.load()
        progress = data.get("progress") or []
        target = None
        for p in progress:
            if isinstance(p, dict) and p.get("id") == item_id:
                target = p
                break
        if target is None:
            return jsonify({"error": "Inspector progress entry not found"}), 404
        if target.get("status") == "approved":
            return jsonify({"error": "Already approved"}), 409
        target["status"] = "approved"
        target["approvedBy"] = approver_device
        target["approvedAt"] = now_iso
        store.save(data)
        return jsonify({"ok": True, "item_type": item_type, "item_id": item_id, "action": action})

    elif item_type == "role_request":
        next_status = "approved" if action == "approve" else "rejected"
        rr_list = _load_role_requests()
        target = None
        for rr in rr_list:
            if isinstance(rr, dict) and rr.get("id") == item_id:
                target = rr
                break
        if target is None:
            return jsonify({"error": "Role request not found"}), 404
        if target.get("status") != "pending":
            return jsonify({"error": f"Already resolved: {target.get('status')}"}), 409
        target["status"] = next_status
        target["resolvedAt"] = now_iso
        target["resolvedBy"] = {"deviceId": approver_device, "role": approver_role}
        if comment:
            target["resolutionNote"] = comment[:2000]
        _save_role_requests(rr_list)
        resp: dict = {"ok": True, "item_type": item_type, "item_id": item_id, "action": action}
        # On approve: generate a JWT token so admin can share it with the user
        if action == "approve" and AUTH_JWT_SECRET:
            approved_role = target.get("desiredRole", "participant")
            approved_device = target.get("deviceId", "")
            resp["accessToken"] = _issue_role_jwt(approved_role, approved_device)
            resp["approvedRole"] = approved_role
            resp["approvedDeviceId"] = approved_device
        return jsonify(resp)


    elif item_type == "bro_submission":
        # Route to existing BRO submission review logic
        bro_action = "approve" if action == "approve" else "reject"
        subs_data = get_store("bro_submissions").load()
        submissions = subs_data.get("submissions") or []
        sub = next((s for s in submissions if s.get("id") == item_id), None)
        if not sub:
            return jsonify({"error": "BRO submission not found"}), 404
        if sub.get("status") != "pending":
            return jsonify({"error": f"Already resolved: {sub.get('status')}"}), 409
        sub["status"] = "approved" if bro_action == "approve" else "rejected"
        sub["comment"] = comment or None
        sub["reviewedAt"] = now_iso
        sub["reviewedBy"] = approver_device
        subs_data["submissions"] = submissions
        get_store("bro_submissions").save(subs_data)
        # On approve: mark task done in passport
        if bro_action == "approve":
            passports_data = get_store("bro_passports").load()
            passport = next((p for p in (passports_data.get("passports") or [])
                             if p.get("id") == sub.get("passportId")), None)
            if passport:
                for t in passport.get("tasks") or []:
                    if t.get("id") == sub.get("taskId"):
                        t["done"] = True
                        break
                all_done = all(t.get("done") for t in passport.get("tasks") or [])
                if all_done:
                    passport["status"] = "completed"
                    passport["completedAt"] = now_iso
                passports_data["passports"] = [p if p.get("id") != passport["id"] else passport
                                                for p in passports_data.get("passports") or []]
                get_store("bro_passports").save(passports_data)
        return jsonify({"ok": True, "item_type": item_type, "item_id": item_id, "action": action})

    elif item_type == "badge_plan":
        new_status = "approved" if action == "approve" else "rejected"
        store = get_store("badge_plans")
        data = store.load()
        plans = data.get("plans") or []
        target = next((p for p in plans if isinstance(p, dict) and p.get("id") == item_id), None)
        if target is None:
            return jsonify({"error": "Badge plan not found"}), 404
        if target.get("status") != "submitted":
            return jsonify({"error": f"Already resolved: {target.get('status')}"}), 409
        target["status"] = new_status
        target["counselorNote"] = comment[:2000] if comment else None
        target["reviewedBy"] = approver_device
        target["reviewedAt"] = now_iso
        target["updatedAt"] = now_iso
        store.save(data)
        return jsonify({"ok": True, "item_type": item_type, "item_id": item_id, "action": action})

    else:
        return jsonify({"error": f"Unknown item_type: {item_type}"}), 400


# ---------------------------------------------------------------------------
# M19: Role Codes + Role Requests + Auth Resolve
# ---------------------------------------------------------------------------

def _issue_role_jwt(role: str, device_id: str, email: str = "") -> str:
    """Issue a JWT with role, deviceId, email. Expires in 30 days."""
    import datetime as _dt
    payload = {
        "role": role,
        "deviceId": device_id,
        "email": email,
        "iat": int(time.time()),
        "exp": int(time.time()) + 30 * 24 * 3600,
    }
    return jwt.encode(payload, AUTH_JWT_SECRET, algorithm="HS256")


def _load_role_codes() -> dict:
    with _ROLE_CODES_LOCK:
        if os.path.exists(ROLE_CODES_FILE):
            with open(ROLE_CODES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if isinstance(data, dict):
                return data
        return {}


def _save_role_codes(data: dict):
    with _ROLE_CODES_LOCK:
        os.makedirs(os.path.dirname(ROLE_CODES_FILE), exist_ok=True)
        with open(ROLE_CODES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def _load_role_requests() -> list:
    with _ROLE_REQUESTS_LOCK:
        if os.path.exists(ROLE_REQUESTS_FILE):
            with open(ROLE_REQUESTS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if isinstance(data, list):
                return data
        return []


def _save_role_requests(data: list):
    with _ROLE_REQUESTS_LOCK:
        os.makedirs(os.path.dirname(ROLE_REQUESTS_FILE), exist_ok=True)
        with open(ROLE_REQUESTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


@app.route('/api/role-codes/generate', methods=['POST'])
def role_codes_generate():
    """
    POST /api/role-codes/generate — generate a one-time role code.
    Developer only (JWT email must be in DEV_EMAILS).
    Body: { "role": "counselor" }
    """
    payload, err = _require_roles(("developer",), allow_localhost_dev=True)
    if err is not None:
        return err[0], err[1]

    body = request.get_json() or {}
    target_role = _normalize_role((body.get("role") or "").strip())
    if target_role not in VALID_ROLE_CODE_ROLES:
        return jsonify({"error": f"Invalid role: {target_role}. Valid: {', '.join(VALID_ROLE_CODE_ROLES)}"}), 400

    prefix = ROLE_PREFIX_MAP[target_role]
    suffix = secrets.token_hex(2).upper()  # 4 hex chars
    code = f"RL-{prefix}-{suffix}"

    now_iso = datetime.now(timezone.utc).isoformat()
    from datetime import timedelta
    expires_at = (datetime.now(timezone.utc) + timedelta(days=ROLE_CODE_TTL_DAYS)).isoformat()

    entry = {
        "code": code,
        "role": target_role,
        "createdAt": now_iso,
        "expiresAt": expires_at,
        "used": False,
        "usedBy": None,
        "usedAt": None,
    }

    codes = _load_role_codes()
    codes[code] = entry
    _save_role_codes(codes)

    return jsonify({"code": code, "role": target_role, "expiresAt": expires_at}), 201


@app.route('/api/role-codes/redeem', methods=['POST'])
def role_codes_redeem():
    """
    POST /api/role-codes/redeem — redeem a one-time role code.
    No auth required (traveler enters the code).
    Body: { "code": "RL-VOZ-7X3K", "deviceId": "xxx" }
    """
    body = request.get_json() or {}
    code = (body.get("code") or "").strip().upper()
    device_id = (body.get("deviceId") or "").strip()

    if not code:
        return jsonify({"error": "code is required"}), 400
    if not device_id:
        return jsonify({"error": "deviceId is required"}), 400

    codes = _load_role_codes()
    entry = codes.get(code)
    if entry is None:
        return jsonify({"error": "Код не найден или истёк"}), 404

    is_reusable = entry.get("_reusable", False)

    if entry.get("used") and not is_reusable:
        return jsonify({"error": "Код уже использован"}), 409

    # Check expiration
    expires_str = entry.get("expiresAt", "")
    if expires_str:
        try:
            exp_raw = expires_str
            if exp_raw.endswith("Z"):
                exp_raw = exp_raw[:-1] + "+00:00"
            exp_dt = datetime.fromisoformat(exp_raw)
            if datetime.now(timezone.utc) > exp_dt:
                return jsonify({"error": "Код не найден или истёк"}), 410
        except ValueError:
            pass

    # Mark as used (skip for reusable test codes)
    if not is_reusable:
        entry["used"] = True
        entry["usedBy"] = device_id
        entry["usedAt"] = datetime.now(timezone.utc).isoformat()
        codes[code] = entry
        _save_role_codes(codes)

    role = entry.get("role", "participant")
    token = _issue_role_jwt(role, device_id)

    return jsonify({"role": role, "accessToken": token, "campId": "default"})


@app.route('/api/role-requests', methods=['POST'])
def role_requests_create():
    """
    POST /api/role-requests — submit a role request.
    Body: { "deviceId": "xxx", "desiredRole": "counselor", "name": "...", "comment": "..." }
    Or with Authorization header (JWT): body needs only desiredRole + comment.
    """
    body = request.get_json() or {}

    # Try to get deviceId from JWT first, fallback to body
    device_id = ""
    auth_header = (request.headers.get("Authorization") or "").strip()
    if auth_header.startswith("Bearer ") and AUTH_JWT_SECRET:
        token = auth_header[7:].strip()
        if token:
            try:
                jwt_payload = jwt.decode(token, AUTH_JWT_SECRET, algorithms=["HS256"])
                device_id = (jwt_payload.get("deviceId") or "").strip()
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                pass
    if not device_id:
        device_id = (body.get("deviceId") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId is required"}), 400

    desired_role = _normalize_role((body.get("desiredRole") or "").strip())
    if desired_role not in VALID_ROLE_CODE_ROLES:
        return jsonify({"error": f"Invalid desiredRole: {desired_role}"}), 400

    name = (body.get("name") or "").strip()[:200]
    comment = (body.get("comment") or "").strip()[:1000]

    rr_id = f"rr-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_request = {
        "id": rr_id,
        "deviceId": device_id,
        "desiredRole": desired_role,
        "name": name,
        "comment": comment,
        "status": "pending",
        "createdAt": now_iso,
    }

    requests_list = _load_role_requests()
    requests_list.append(new_request)
    _save_role_requests(requests_list)

    return jsonify({"roleRequest": new_request}), 201


@app.route('/api/role-requests', methods=['GET'])
def role_requests_list():
    """
    GET /api/role-requests?deviceId=xxx — list role requests for a device.
    """
    device_id = (request.args.get("deviceId") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId query param required"}), 400

    all_requests = _load_role_requests()
    user_requests = [
        rr for rr in all_requests
        if isinstance(rr, dict) and rr.get("deviceId") == device_id
    ]
    # For approved requests: generate fresh JWT so client can auto-login
    result = []
    for rr in user_requests:
        row = dict(rr)
        if row.get("status") == "approved" and AUTH_JWT_SECRET:
            row["accessToken"] = _issue_role_jwt(row.get("desiredRole", "participant"), device_id)
        result.append(row)
    return jsonify({"requests": result})


@app.route('/api/auth/resolve', methods=['POST'])
def auth_resolve():
    """
    POST /api/auth/resolve — determine role by email (OAuth login).
    Body: { "email": "...", "supabaseToken": "...", "deviceId": "...", "desiredRole": "..." }
    - If email in DEV_EMAILS -> developer
    - If approved role_request for email/deviceId -> that role
    - If desiredRole given -> create pending request + return pending
    - Otherwise -> participant
    """
    body = request.get_json() or {}
    email = (body.get("email") or "").strip().lower()
    device_id = (body.get("deviceId") or "").strip() or uuid.uuid4().hex[:16]
    desired_role = _normalize_role((body.get("desiredRole") or "").strip())

    if not email:
        return jsonify({"error": "email is required"}), 400

    # 1) DEV_EMAILS check
    if email in DEV_EMAILS:
        token = _issue_role_jwt("developer", device_id, email=email)
        return jsonify({"role": "developer", "accessToken": token})

    # 2) Check approved role_requests for this email/deviceId
    all_rr = _load_role_requests()
    for rr in reversed(all_rr):
        if not isinstance(rr, dict):
            continue
        if rr.get("status") != "approved":
            continue
        rr_email = (rr.get("email") or "").strip().lower()
        rr_device = (rr.get("deviceId") or "").strip()
        if (rr_email and rr_email == email) or (rr_device and rr_device == device_id):
            role = rr.get("desiredRole", "participant")
            token = _issue_role_jwt(role, device_id, email=email)
            return jsonify({"role": role, "accessToken": token})

    # 3) If desiredRole given: create/update pending request so admin can approve
    if desired_role and desired_role not in ("traveler", ""):
        # Check if there's already a pending request for this email/device
        existing = None
        for rr in all_rr:
            if not isinstance(rr, dict) or rr.get("status") != "pending":
                continue
            rr_email = (rr.get("email") or "").strip().lower()
            rr_device = (rr.get("deviceId") or "").strip()
            if (rr_email and rr_email == email) or (rr_device and rr_device == device_id):
                existing = rr
                break

        if not existing:
            new_rr = {
                "id": f"rr-{uuid.uuid4().hex[:12]}",
                "deviceId": device_id,
                "email": email,
                "desiredRole": desired_role,
                "name": email.split("@")[0],  # Use email prefix as name
                "comment": "Запрос через OAuth",
                "status": "pending",
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            all_rr.append(new_rr)
            _save_role_requests(all_rr)
        else:
            # Update email in existing request if not set
            if not existing.get("email"):
                existing["email"] = email
                _save_role_requests(all_rr)

        return jsonify({
            "role": "pending",
            "message": "Заявка создана. Ожидайте одобрения администратором.",
            "desiredRole": desired_role,
        })

    # 4) Default: participant (issue JWT)
    token = _issue_role_jwt("participant", device_id, email=email)
    return jsonify({"role": "participant", "accessToken": token})



# Для Vercel

# ═══════════════════════════════════════════════════════════════════════════
# @@@ M12-BRO-BACKEND — Бросвящение (BRO) API
# ═══════════════════════════════════════════════════════════════════════════


# Default BRO tasks (mirrors src/types/bro.ts)
_BRO_DEFAULT_TASKS = [
    {"id": "b1_lecture",    "title": "Прослушать лекцию по лагерной педагогике",      "description": "Основы общения с детьми и принципы Бро-Движения.",            "order": 1},
    {"id": "b1_cases",      "title": "Участие в обсуждении вожатских кейсов",         "description": "Разбор реальных ситуаций из жизни отряда.",                    "order": 2},
    {"id": "b1_chants",     "title": "Знать и громко кричать отрядные кричалки",       "description": "Голос отряда — это его энергия!",                              "order": 3},
    {"id": "b2_dances",     "title": "Знать и танцевать отрядные танцы",               "description": "Движение в ритме Бро-Движения.",                               "order": 4},
    {"id": "b2_traditions", "title": "Знать отрядные традиции",                         "description": "История и ритуалы, которые нас объединяют.",                   "order": 5},
    {"id": "b2_meme",       "title": "Знать и понимать отрядный мем",                  "description": "Юмор — важная часть нашей идентичности.",                      "order": 6},
    {"id": "b3_activity",   "title": "Провести собственное отрядное дело",             "description": "Практика лидерства и организации.",                            "order": 7},
    {"id": "b3_artifact",   "title": "Оформить физический Бропаспорт",                "description": "Создать красивый артефакт с твердой обложкой.",                "order": 8},
    {"id": "b3_approval",   "title": "Получить подписи вожатых и админа",              "description": "Финальный апрув твоего пути в Бро-Движение.",                  "order": 9},
]

_BRO_STAFF_ROLES = ("counselor", "shift_leader", "camp_director", "developer")
_BRO_ALL_ROLES   = ("participant", "counselor", "educator", "shift_leader", "camp_director", "developer")


@app.route("/api/bro/initiate", methods=["POST"])
def bro_initiate():
    """Staff: create a BRO ceremony event for a squad."""
    payload, err = _require_roles(_BRO_STAFF_ROLES, allow_localhost_dev=True)
    if err:
        return err

    body = request.get_json(force=True, silent=True) or {}
    squad_id = (body.get("squadId") or "").strip()
    if not squad_id:
        return jsonify({"error": "squadId is required"}), 400

    data = get_store("bro_events").load()
    events = data.get("events") or []

    # Check if there's already an active event for this squad
    active = [e for e in events if e.get("squadId") == squad_id and e.get("status") == "active"]
    if active:
        return jsonify({"error": "Бросвящение уже активно в этом отряде", "event": active[0]}), 409

    # Parse optional custom tasks
    raw_tasks = body.get("customTasks")
    custom_tasks = None
    if isinstance(raw_tasks, list) and len(raw_tasks) > 0:
        custom_tasks = []
        for idx, rt in enumerate(raw_tasks):
            if not isinstance(rt, dict):
                continue
            title = (rt.get("title") or "").strip()
            if not title:
                continue
            custom_tasks.append({
                "id": rt.get("id") or f"custom_{uuid.uuid4().hex[:6]}",
                "title": title,
                "description": (rt.get("description") or "").strip(),
                "order": rt.get("order", idx + 1),
            })
        if not custom_tasks:
            custom_tasks = None  # Fall back to defaults if all tasks were empty

    new_event = {
        "id": uuid.uuid4().hex[:12],
        "squadId": squad_id,
        "status": "active",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "createdBy": payload.get("deviceId") or payload.get("sub") or "unknown",
    }
    if custom_tasks:
        new_event["customTasks"] = custom_tasks

    events.append(new_event)
    data["events"] = events
    get_store("bro_events").save(data)

    return jsonify({"event": new_event}), 201


@app.route("/api/bro/events", methods=["GET"])
def bro_events_list():
    """Get BRO events for a squad (public, no auth required)."""
    squad_id = request.args.get("squad_id", "").strip()
    if not squad_id:
        return jsonify({"events": []}), 200

    data = get_store("bro_events").load()
    events = [e for e in (data.get("events") or []) if e.get("squadId") == squad_id]
    return jsonify({"events": events}), 200


@app.route("/api/bro/events/<event_id>", methods=["PATCH"])
def bro_event_update(event_id):
    """Staff: complete/close a BRO ceremony event."""
    payload, err = _require_roles(_BRO_STAFF_ROLES, allow_localhost_dev=True)
    if err:
        return err

    body = request.get_json(force=True, silent=True) or {}
    action = (body.get("action") or "").strip()
    if action != "complete":
        return jsonify({"error": "Only 'complete' action is supported"}), 400

    data = get_store("bro_events").load()
    events = data.get("events") or []
    event = next((e for e in events if e.get("id") == event_id), None)
    if not event:
        return jsonify({"error": "Событие не найдено"}), 404
    if event.get("status") != "active":
        return jsonify({"error": "Событие уже завершено"}), 409

    event["status"] = "completed"
    event["completedAt"] = datetime.now(timezone.utc).isoformat()
    event["completedBy"] = payload.get("deviceId") or payload.get("sub") or "unknown"
    data["events"] = events
    get_store("bro_events").save(data)

    return jsonify({"event": event}), 200


@app.route("/api/bro/passport", methods=["GET"])
def bro_passport_get():
    """Get a participant's BRO passport by device_id."""
    device_id = request.args.get("device_id", "").strip()
    if not device_id:
        return jsonify({"passport": None}), 200

    data = get_store("bro_passports").load()
    passports = data.get("passports") or []
    found = next((p for p in passports if p.get("deviceId") == device_id), None)
    return jsonify({"passport": found}), 200


@app.route("/api/bro/passport", methods=["POST"])
def bro_passport_create():
    """Participant: start a BRO passport for an active event."""
    payload, err = _require_roles(_BRO_ALL_ROLES, allow_localhost_dev=True)
    if err:
        return err

    body = request.get_json(force=True, silent=True) or {}
    bro_event_id = (body.get("broEventId") or "").strip()
    if not bro_event_id:
        return jsonify({"error": "broEventId is required"}), 400

    device_id = payload.get("deviceId") or (request.headers.get("X-Device-Id") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId is required"}), 400

    # Verify event exists and is active
    events_data = get_store("bro_events").load()
    event = next((e for e in (events_data.get("events") or [])
                  if e.get("id") == bro_event_id and e.get("status") == "active"), None)
    if not event:
        return jsonify({"error": "Бросвящение не найдено или неактивно"}), 404

    # Check if passport already exists for this device
    passports_data = get_store("bro_passports").load()
    passports = passports_data.get("passports") or []
    existing = next((p for p in passports if p.get("deviceId") == device_id and p.get("broEventId") == bro_event_id), None)
    if existing:
        return jsonify({"passport": existing}), 200  # Return existing

    # Create passport — use event's custom tasks if available, else defaults
    task_source = event.get("customTasks") if isinstance(event.get("customTasks"), list) and event.get("customTasks") else _BRO_DEFAULT_TASKS
    tasks = [{"id": t["id"], "title": t["title"], "description": t.get("description", ""),
              "order": t.get("order", idx + 1), "done": False} for idx, t in enumerate(task_source)]

    new_passport = {
        "id": uuid.uuid4().hex[:12],
        "deviceId": device_id,
        "broEventId": bro_event_id,
        "status": "in_progress",
        "tasks": tasks,
    }
    passports.append(new_passport)
    passports_data["passports"] = passports
    get_store("bro_passports").save(passports_data)

    return jsonify({"passport": new_passport}), 201


@app.route("/api/bro/passport/<passport_id>/task/<task_id>", methods=["PATCH"])
def bro_passport_mark_task(passport_id, task_id):
    """Mark a task as done in a BRO passport."""
    payload, err = _require_roles(_BRO_ALL_ROLES, allow_localhost_dev=True)
    if err:
        return err

    passports_data = get_store("bro_passports").load()
    passports = passports_data.get("passports") or []
    passport = next((p for p in passports if p.get("id") == passport_id), None)
    if not passport:
        return jsonify({"error": "Паспорт не найден"}), 404

    # Find and mark the task
    task_found = False
    for t in passport.get("tasks") or []:
        if t.get("id") == task_id:
            t["done"] = True
            task_found = True
            break

    if not task_found:
        return jsonify({"error": "Задание не найдено"}), 404

    # Check if all tasks are done → complete passport
    all_done = all(t.get("done") for t in passport.get("tasks") or [])
    if all_done:
        passport["status"] = "completed"
        passport["completedAt"] = datetime.now(timezone.utc).isoformat()

    passports_data["passports"] = passports
    get_store("bro_passports").save(passports_data)

    return jsonify({"passport": passport}), 200

# ═══════════════════════════════════════════════════════════════════════════
# @@@ M12-BRO-SUBMISSIONS — Заявки на проверку заданий Бросвящения
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/api/bro/passport/<passport_id>/task/<task_id>/submit", methods=["POST"])
def bro_task_submit(passport_id, task_id):
    """Participant submits proof for a BRO task."""
    payload, err = _require_roles(_BRO_ALL_ROLES, allow_localhost_dev=True)
    if err:
        return err

    body = request.get_json(force=True, silent=True) or {}
    text = (body.get("text") or "").strip()
    photo_url = (body.get("photoUrl") or "").strip() or None
    nickname = (body.get("nickname") or "").strip() or None
    user_role = (body.get("userRole") or "").strip() or None

    if not text and not photo_url:
        return jsonify({"error": "Нужно добавить текст или фото"}), 400

    device_id = payload.get("deviceId") or (request.headers.get("X-Device-Id") or "").strip()

    # Verify passport & task exist
    passports_data = get_store("bro_passports").load()
    passport = next((p for p in (passports_data.get("passports") or []) if p.get("id") == passport_id), None)
    if not passport:
        return jsonify({"error": "Паспорт не найден"}), 404
    task = next((t for t in (passport.get("tasks") or []) if t.get("id") == task_id), None)
    if not task:
        return jsonify({"error": "Задание не найдено"}), 404
    if task.get("done"):
        return jsonify({"error": "Задание уже выполнено"}), 409

    # Get squadId from the bro event
    bro_event_id = passport.get("broEventId", "")
    events_data = get_store("bro_events").load()
    event = next((e for e in (events_data.get("events") or []) if e.get("id") == bro_event_id), None)
    squad_id = event.get("squadId", "") if event else ""

    # Check for existing pending submission
    subs_data = get_store("bro_submissions").load()
    submissions = subs_data.get("submissions") or []
    existing = next((s for s in submissions
                     if s.get("passportId") == passport_id
                     and s.get("taskId") == task_id
                     and s.get("status") == "pending"), None)
    if existing:
        return jsonify({"error": "Заявка уже на проверке", "submission": existing}), 409

    new_sub = {
        "id": uuid.uuid4().hex[:12],
        "passportId": passport_id,
        "taskId": task_id,
        "taskTitle": task.get("title", ""),
        "deviceId": device_id,
        "squadId": squad_id,
        "text": text,
        "photoUrl": photo_url,
        "nickname": nickname,
        "userRole": user_role,
        "status": "pending",
        "comment": None,
        "submittedAt": datetime.now(timezone.utc).isoformat(),
        "reviewedAt": None,
        "reviewedBy": None,
    }
    submissions.append(new_sub)
    subs_data["submissions"] = submissions
    get_store("bro_submissions").save(subs_data)

    return jsonify({"submission": new_sub}), 201


@app.route("/api/bro/submissions", methods=["GET"])
def bro_submissions_list():
    """Counselor: list BRO task submissions for a squad."""
    squad_id = request.args.get("squad_id", "").strip()
    status_filter = request.args.get("status", "").strip()  # optional: pending/approved/rejected

    subs_data = get_store("bro_submissions").load()
    submissions = subs_data.get("submissions") or []

    if squad_id:
        submissions = [s for s in submissions if s.get("squadId") == squad_id]
    if status_filter:
        submissions = [s for s in submissions if s.get("status") == status_filter]

    submissions.sort(key=lambda x: x.get("submittedAt", ""), reverse=True)
    return jsonify({"submissions": submissions}), 200


@app.route("/api/bro/submissions/<submission_id>/review", methods=["PATCH"])
def bro_submission_review(submission_id):
    """Counselor: approve or reject a BRO task submission."""
    payload, err = _require_roles(_BRO_STAFF_ROLES, allow_localhost_dev=True)
    if err:
        return err

    body = request.get_json(force=True, silent=True) or {}
    action = (body.get("action") or "").strip()
    comment = (body.get("comment") or "").strip() or None

    if action not in ("approve", "reject"):
        return jsonify({"error": "action must be 'approve' or 'reject'"}), 400

    subs_data = get_store("bro_submissions").load()
    submissions = subs_data.get("submissions") or []
    sub = next((s for s in submissions if s.get("id") == submission_id), None)
    if not sub:
        return jsonify({"error": "Заявка не найдена"}), 404
    if sub.get("status") != "pending":
        return jsonify({"error": "Заявка уже обработана"}), 409

    reviewer = payload.get("deviceId") or payload.get("sub") or "unknown"
    sub["status"] = "approved" if action == "approve" else "rejected"
    sub["comment"] = comment
    sub["reviewedAt"] = datetime.now(timezone.utc).isoformat()
    sub["reviewedBy"] = reviewer

    subs_data["submissions"] = submissions
    get_store("bro_submissions").save(subs_data)

    # On approve: mark the task as done in the passport
    if action == "approve":
        passports_data = get_store("bro_passports").load()
        passport = next((p for p in (passports_data.get("passports") or [])
                         if p.get("id") == sub.get("passportId")), None)
        if passport:
            for t in passport.get("tasks") or []:
                if t.get("id") == sub.get("taskId"):
                    t["done"] = True
                    break
            # Auto-complete passport if all tasks done
            all_done = all(t.get("done") for t in passport.get("tasks") or [])
            if all_done:
                passport["status"] = "completed"
                passport["completedAt"] = datetime.now(timezone.utc).isoformat()
            passports_data["passports"] = [p if p.get("id") != passport["id"] else passport
                                           for p in passports_data.get("passports") or []]
            get_store("bro_passports").save(passports_data)

    return jsonify({"submission": sub}), 200


# ═══════════════════════════════════════════════════════════════════════════
# @@@ M12-WING-INITIATIONS — Посвящения в отряд через Крыло
# ═══════════════════════════════════════════════════════════════════════════

@app.route("/api/wing/initiations", methods=["GET"])
def wing_initiations_list():
    """Get squad initiations (from Wing) for a squad."""
    squad_id = request.args.get("squad_id", "").strip()
    data = get_store("bro_events").load()
    events = data.get("events") or []
    filtered = [e for e in events if e.get("type") == "squad_initiation"]
    if squad_id:
        filtered = [e for e in filtered if e.get("squadId") == squad_id]
    return jsonify({"initiations": filtered}), 200


@app.route("/api/wing/initiations", methods=["POST"])
def wing_initiation_create():
    """Wing member: create a squad initiation event with custom tasks."""
    payload, err = _require_roles(_BRO_ALL_ROLES, allow_localhost_dev=True)
    if err:
        return err

    body = request.get_json(force=True, silent=True) or {}
    squad_id = (body.get("squadId") or "").strip()
    name = (body.get("name") or "").strip()
    description = (body.get("description") or "").strip()

    if not squad_id:
        return jsonify({"error": "squadId is required"}), 400
    if not name:
        return jsonify({"error": "name is required"}), 400

    raw_tasks = body.get("tasks")
    if not isinstance(raw_tasks, list) or len(raw_tasks) == 0:
        return jsonify({"error": "tasks array is required"}), 400

    tasks = []
    for idx, rt in enumerate(raw_tasks):
        if not isinstance(rt, dict):
            continue
        title = (rt.get("title") or "").strip()
        if not title:
            continue
        tasks.append({
            "id": rt.get("id") or f"si_{uuid.uuid4().hex[:6]}",
            "title": title,
            "description": (rt.get("description") or "").strip(),
            "order": rt.get("order", idx + 1),
        })

    if not tasks:
        return jsonify({"error": "At least one task with a title is required"}), 400

    data = get_store("bro_events").load()
    events = data.get("events") or []

    active = [e for e in events if e.get("squadId") == squad_id
              and e.get("type") == "squad_initiation" and e.get("status") == "active"]
    if active:
        return jsonify({"error": "Посвящение уже активно в этом отряде", "initiation": active[0]}), 409

    device_id = payload.get("deviceId") or (request.headers.get("X-Device-Id") or "").strip()

    new_event = {
        "id": uuid.uuid4().hex[:12],
        "type": "squad_initiation",
        "squadId": squad_id,
        "name": name,
        "description": description,
        "status": "active",
        "customTasks": tasks,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "createdBy": device_id or "unknown",
    }
    events.append(new_event)
    data["events"] = events
    get_store("bro_events").save(data)

    return jsonify({"initiation": new_event}), 201


@app.route("/api/wing/initiations/<event_id>", methods=["PATCH"])
def wing_initiation_update(event_id):
    """Complete/close a squad initiation event."""
    payload, err = _require_roles(_BRO_ALL_ROLES, allow_localhost_dev=True)
    if err:
        return err

    body = request.get_json(force=True, silent=True) or {}
    action = (body.get("action") or "").strip()
    if action != "complete":
        return jsonify({"error": "Only 'complete' action is supported"}), 400

    data = get_store("bro_events").load()
    events = data.get("events") or []
    event = next((e for e in events if e.get("id") == event_id and e.get("type") == "squad_initiation"), None)
    if not event:
        return jsonify({"error": "Посвящение не найдено"}), 404
    if event.get("status") != "active":
        return jsonify({"error": "Посвящение уже завершено"}), 409

    event["status"] = "completed"
    event["completedAt"] = datetime.now(timezone.utc).isoformat()
    data["events"] = events
    get_store("bro_events").save(data)

    return jsonify({"initiation": event}), 200


@app.route("/api/wing/initiations/<event_id>/join", methods=["POST"])
def wing_initiation_join(event_id):
    """Participant: join a squad initiation — creates a passport with its tasks."""
    payload, err = _require_roles(_BRO_ALL_ROLES, allow_localhost_dev=True)
    if err:
        return err

    device_id = payload.get("deviceId") or (request.headers.get("X-Device-Id") or "").strip()
    if not device_id:
        return jsonify({"error": "deviceId is required"}), 400

    events_data = get_store("bro_events").load()
    event = next((e for e in (events_data.get("events") or [])
                  if e.get("id") == event_id and e.get("type") == "squad_initiation"
                  and e.get("status") == "active"), None)
    if not event:
        return jsonify({"error": "Посвящение не найдено или неактивно"}), 404

    passports_data = get_store("bro_passports").load()
    passports = passports_data.get("passports") or []
    existing = next((p for p in passports if p.get("deviceId") == device_id and p.get("broEventId") == event_id), None)
    if existing:
        return jsonify({"passport": existing}), 200

    tasks = [{"id": t["id"], "title": t["title"], "description": t.get("description", ""),
              "order": t.get("order", idx + 1), "done": False}
             for idx, t in enumerate(event.get("customTasks") or [])]

    new_passport = {
        "id": uuid.uuid4().hex[:12],
        "deviceId": device_id,
        "broEventId": event_id,
        "type": "squad_initiation",
        "status": "in_progress",
        "tasks": tasks,
    }
    passports.append(new_passport)
    passports_data["passports"] = passports
    get_store("bro_passports").save(passports_data)

    return jsonify({"passport": new_passport}), 201


# ═══════════════════════════════════════════════════════════════════════════
# BRO INITIATIVES ("Бродела") + BRO SQUAD ("Броотряд")
# ═══════════════════════════════════════════════════════════════════════════

@app.route('/api/bro/initiatives', methods=['GET'])
def get_bro_initiatives():
    data = get_store("bro_initiatives").load()
    items = data.get("initiatives", [])
    return jsonify({"initiatives": items})


@app.route('/api/bro/initiatives', methods=['POST'])
def create_bro_initiative():
    device_id = (request.headers.get('X-Device-Id') or '').strip() or 'dev'
    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    description = (body.get("description") or "").strip()
    if not title:
        return jsonify({"error": "title required"}), 400

    data = get_store("bro_initiatives").load()
    items = data.get("initiatives", [])

    new_ini = {
        "id": uuid.uuid4().hex[:12],
        "title": title,
        "description": description,
        "createdBy": device_id,
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "votes": {},
        "status": "voting",
    }
    items.append(new_ini)
    data["initiatives"] = items
    get_store("bro_initiatives").save(data)
    return jsonify(new_ini), 201


@app.route('/api/bro/initiatives/<ini_id>', methods=['DELETE'])
def delete_bro_initiative(ini_id):
    data = get_store("bro_initiatives").load()
    items = data.get("initiatives", [])
    ini = next((i for i in items if i["id"] == ini_id), None)
    if not ini:
        return jsonify({"error": "not found"}), 404
    items = [i for i in items if i["id"] != ini_id]
    data["initiatives"] = items
    get_store("bro_initiatives").save(data)
    return jsonify({"deleted": True, "id": ini_id})


@app.route('/api/bro/initiatives/<ini_id>/vote', methods=['POST'])
def vote_bro_initiative(ini_id):
    device_id = (request.headers.get('X-Device-Id') or '').strip() or 'dev'
    body = request.get_json(silent=True) or {}
    vote = body.get("vote", True)

    data = get_store("bro_initiatives").load()
    items = data.get("initiatives", [])
    ini = next((i for i in items if i["id"] == ini_id), None)
    if not ini:
        return jsonify({"error": "not found"}), 404

    ini.setdefault("votes", {})[device_id] = bool(vote)
    # Auto-approve if >=1 vote (для тестирования; в продакшене поставить >=3)
    vote_count = sum(1 for v in ini["votes"].values() if v)
    if vote_count >= 1 and ini["status"] == "voting":
        ini["status"] = "approved"

    data["initiatives"] = items
    get_store("bro_initiatives").save(data)
    return jsonify(ini)


@app.route('/api/bro/initiatives/<ini_id>/send', methods=['POST'])
def send_bro_initiative_to_council(ini_id):
    device_id = (request.headers.get('X-Device-Id') or '').strip() or 'dev'
    data = get_store("bro_initiatives").load()
    items = data.get("initiatives", [])
    ini = next((i for i in items if i["id"] == ini_id), None)
    if not ini:
        return jsonify({"error": "not found"}), 404
    ini["status"] = "sent_to_council"
    data["initiatives"] = items
    get_store("bro_initiatives").save(data)

    # Look up sender profile from memberships + bro data
    sender_nickname = "Участник"
    sender_role = ""
    wing_name = ""
    try:
        mem_data = get_store("memberships").load()
        for m in mem_data.get("members", []):
            if m.get("deviceId") == device_id:
                sender_nickname = m.get("nickname") or sender_nickname
                sender_role = m.get("role") or sender_role
                break
    except Exception:
        pass
    try:
        bp_data = get_store("bro_passports").load()
        for pp in bp_data.get("passports", []):
            if pp.get("deviceId") == device_id:
                wing_id = pp.get("broEventId", "")
                if wing_id:
                    ev_data = get_store("bro_events").load()
                    for ev in ev_data.get("events", []):
                        if ev.get("id") == wing_id:
                            wing_name = ev.get("wingName") or ev.get("title") or ""
                            break
                break
    except Exception:
        pass

    # Detect if this is an ODE (from constructor) or regular Brodela
    raw_title = ini.get("title", "")
    is_ode = raw_title.startswith("[ОДэ]")
    source_type = "ode" if is_ode else "brodela"
    council_tag = "[ОДэ]" if is_ode else "[Бродела]"
    # For ODE keep original title (already has [ОДэ] prefix); for Brodela add prefix
    council_title = raw_title if is_ode else f"{council_tag} {raw_title}"

    # Create a council initiative
    council_data = get_store("council_initiatives").load()
    council_items = council_data.get("initiatives", [])
    council_ini = {
        "id": uuid.uuid4().hex[:12],
        "title": council_title,
        "description": ini.get("description", ""),
        "status": "new",
        "readStatus": "unread",
        "createdBy": device_id,
        "createdByNickname": sender_nickname,
        "authorNickname": sender_nickname,
        "authorRole": sender_role,
        "authorWing": wing_name,
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "sourceType": source_type,
        "sourceInitiativeId": ini["id"],
        "votesUp": 0,
        "voters": [],
    }
    council_items.append(council_ini)
    council_data["initiatives"] = council_items
    get_store("council_initiatives").save(council_data)

    return jsonify(ini)


@app.route('/api/bro/squad', methods=['GET'])
def get_bro_squad():
    """Return all members who completed BRO + all wings."""
    passports_data = get_store("bro_passports").load()
    passports = passports_data.get("passports", [])

    # Build memberships lookup (deviceId -> member data)
    mem_data = get_store("memberships").load()
    mem_by_device = {}
    for m in mem_data.get("members", []):
        did = m.get("deviceId", "")
        if did:
            mem_by_device[did] = m

    # Build bro_events lookup (eventId -> event)
    ev_data = get_store("bro_events").load()
    ev_by_id = {}
    for ev in ev_data.get("events", []):
        eid = ev.get("id", "")
        if eid:
            ev_by_id[eid] = ev

    # Collect BRO members (anyone with a passport = participated in Бросвящение)
    members = []
    seen_devices = set()
    for p in passports:
        if p.get("type") == "squad_initiation":
            continue
        did = p.get("deviceId", "")
        if not did or did in seen_devices:
            continue
        # Check tasks completion (if tasks exist)
        tasks = p.get("tasks", [])
        all_done = all(t.get("done") for t in tasks) if tasks else True
        if not all_done and p.get("status") != "completed":
            continue
        seen_devices.add(did)
        # Look up nickname/avatar from memberships
        mem = mem_by_device.get(did, {})
        # Look up wing name from bro_events
        bro_event_id = p.get("broEventId", "")
        wing_ev = ev_by_id.get(bro_event_id, {})
        wing_name = wing_ev.get("wingName") or wing_ev.get("title") or ""
        members.append({
            "deviceId": did,
            "nickname": mem.get("nickname") or p.get("nickname") or "Участник",
            "avatar": mem.get("avatarUrl") or "",
            "squadId": mem.get("squadId") or p.get("squadId") or "",
            "wingId": bro_event_id,
            "wingName": wing_name,
            "completedAt": p.get("completedAt", ""),
        })

    # Collect unique wings
    wings = []
    seen_wings = set()
    for m in members:
        wid = m.get("wingId", "")
        if wid and wid not in seen_wings:
            seen_wings.add(wid)
            wings.append({
                "wingId": wid,
                "wingName": m.get("wingName", "Крыло"),
                "leaderDeviceId": m["deviceId"],
                "leaderNickname": m["nickname"],
            })

    return jsonify({"members": members, "wings": wings, "total": len(members)})


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