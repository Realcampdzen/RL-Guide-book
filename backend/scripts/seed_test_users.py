#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
backend/scripts/seed_test_users.py

Create test users in the users store for E2E testing.
Idempotent — skips users that already exist.

Usage:
    python backend/scripts/seed_test_users.py
"""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone

# Resolve paths so we can import storage
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_SCRIPT_DIR)
sys.path.insert(0, _BACKEND_DIR)

from storage import get_store  # noqa: E402

# ---------------------------------------------------------------------------
# Test users to seed
# ---------------------------------------------------------------------------

TEST_USERS = [
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "test-participant-01")),
        "deviceId": "test-participant-01",
        "role": "participant",
        "email": "test-participant@rl.dev",
        "nickname": "TestParticipant",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "test-counselor-01")),
        "deviceId": "test-counselor-01",
        "role": "counselor",
        "email": "test-counselor@rl.dev",
        "nickname": "TestCounselor",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "test-educator-01")),
        "deviceId": "test-educator-01",
        "role": "educator",
        "email": "test-educator@rl.dev",
        "nickname": "TestEducator",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "test-parent-01")),
        "deviceId": "test-parent-01",
        "role": "parent",
        "email": "test-parent@rl.dev",
        "nickname": "TestParent",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    },
]


def main() -> int:
    store = get_store("users")
    existing = store.load()

    # Build lookup of existing device IDs
    existing_devices = {u.get("deviceId") for u in existing if isinstance(u, dict)}

    added = 0
    for user in TEST_USERS:
        if user["deviceId"] in existing_devices:
            print(f"  SKIP  {user['deviceId']} ({user['role']}) -- already exists")
            continue
        existing.append(user)
        added += 1
        print(f"  ADD   {user['deviceId']} ({user['role']})")

    if added > 0:
        store.save(existing)
        print(f"\nSeeded {added} test user(s).")
    else:
        print("\nAll test users already exist. Nothing to do.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
