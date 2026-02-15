#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генератор кодов верификации для организаторов (см. FEATURE_AUTH_ROLES_DVIZHKI_PLAN.md §4.4).
Использование:
  AUTH_SECRET=xxx python scripts/generate-verification-code.py <deviceId> [campId] [role] [ttl_min]

Пример:
  AUTH_SECRET=mysecret python scripts/generate-verification-code.py 550e8400-e29b-41d4-a716-446655440000
  AUTH_SECRET=mysecret python scripts/generate-verification-code.py 550e8400-e29b-41d4-a716-446655440000 camp1 participant 30
"""
import os
import sys
import time
import hmac
import hashlib
import base64

AUTH_SLOT_SEC = 600


def make_payload(device_id: str, camp_id: str, role: str, slot: int) -> str:
    return f"{device_id}|{camp_id or ''}|{role}|{slot}"


def compute_code(payload: str, secret: str) -> str:
    raw = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).digest()
    b32 = base64.b32encode(raw).decode("ascii").rstrip("=").upper()
    return b32[:8]


def main() -> None:
    secret = os.getenv("AUTH_SECRET", "").strip()
    if not secret:
        print("Ошибка: задайте AUTH_SECRET в окружении", file=sys.stderr)
        sys.exit(1)
    args = sys.argv[1:]
    if not args:
        print("Использование: AUTH_SECRET=xxx python generate-verification-code.py <deviceId> [campId] [role] [ttl_min]", file=sys.stderr)
        print("  role: participant (по умолчанию), parent, counselor, shift_leader, developer", file=sys.stderr)
        print("  ttl_min: срок действия в минутах (по умолчанию 30)", file=sys.stderr)
        sys.exit(1)
    device_id = args[0].strip()
    camp_id = (args[1] if len(args) > 1 else "").strip() or ""
    role = (args[2] if len(args) > 2 else "participant").strip() or "participant"
    ttl_min = int(args[3]) if len(args) > 3 else 30
    slot = int(time.time() // AUTH_SLOT_SEC)
    payload = make_payload(device_id, camp_id, role, slot)
    code = compute_code(payload, secret)
    print(f"Код: {code}")
    print(f"  deviceId={device_id} campId={camp_id or '(пусто)'} role={role} slot={slot}")
    print(f"  Срок: ~{ttl_min} мин (код валиден ~40 мин)")
    print(f"\nСообщите пользователю: {code}")


if __name__ == "__main__":
    main()
