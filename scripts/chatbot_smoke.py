#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smoke-check for Putevoditel chatbot integration.

What it checks:
- ai-data is present in public/ai-data (MASTER_INDEX.json)
- local backend endpoints respond: /health, /api/categories, /api/chat

Usage:
  python scripts/chatbot_smoke.py
  python scripts/chatbot_smoke.py --base-url http://localhost:4000
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.request import Request, urlopen


def _http_json(url: str, method: str = "GET", body: dict | None = None) -> dict:
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = Request(url=url, method=method, data=data, headers=headers)
    with urlopen(req, timeout=10) as resp:
        raw = resp.read()
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))


def check_ai_data() -> None:
    master = Path("public/ai-data/MASTER_INDEX.json")
    if not master.exists():
        raise SystemExit("FAIL: missing public/ai-data/MASTER_INDEX.json")

    payload = json.loads(master.read_text(encoding="utf-8"))
    total_categories = payload.get("totalCategories")
    categories = payload.get("categories") or []
    if not categories:
        raise SystemExit("FAIL: MASTER_INDEX.json has no categories[]")

    print(f"OK: ai-data MASTER_INDEX.json (categories={len(categories)}, totalCategories={total_categories})")


def check_backend(base_url: str) -> None:
    health = _http_json(f"{base_url}/health")
    if (health.get("status") or "").lower() != "healthy":
        raise SystemExit(f"FAIL: /health not healthy: {health}")
    print("OK: backend /health")

    cats_payload = _http_json(f"{base_url}/api/categories")
    cats = None
    if isinstance(cats_payload, list):
        cats = cats_payload
    elif isinstance(cats_payload, dict):
        cats = cats_payload.get("categories")
    if not isinstance(cats, list) or not cats:
        raise SystemExit("FAIL: /api/categories returned empty payload")
    print(f"OK: backend /api/categories (count={len(cats)})")

    chat_payload = {
        "message": "Где я?",
        "user_id": "smoke_user",
        "context": {
            "current_view": "intro",
            "current_category": None,
            "current_badge": None,
            "current_level": None,
            "current_level_badge_title": None,
        },
    }
    chat = _http_json(f"{base_url}/api/chat", method="POST", body=chat_payload)
    if not chat.get("response"):
        raise SystemExit(f"FAIL: /api/chat missing response: {chat}")
    print("OK: backend /api/chat (response present)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:4000", help="Local backend base URL")
    args = parser.parse_args()

    try:
        check_ai_data()
        check_backend(args.base_url.rstrip("/"))
    except Exception as e:
        print(f"FAIL: {e}")
        return 1

    print("ALL OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


