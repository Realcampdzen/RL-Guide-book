"""
Smoke tests for M1 scoped teams (JSON/local provider path).

Run:
  python backend/scripts/smoke_m1_scoped_teams.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import app  # noqa: E402

TEAMS_FILE = ROOT / "teams.json"


def _load_json(path: Path):
    if not path.exists():
        return {}
    raw = path.read_text(encoding="utf-8").strip()
    return json.loads(raw) if raw else {}


def _save_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def run() -> int:
    backup = _load_json(TEAMS_FILE)
    _save_json(TEAMS_FILE, {})

    client = app.test_client()
    headers = {"X-Device-Id": "dev-a"}  # localhost dev-bypass in _require_teams_auth

    try:
        # 1) create camp team
        r = client.post(
            "/api/teams",
            headers=headers,
            json={"name": "Camp Team", "motto": "camp", "logo": "🚀", "scope": "camp"},
        )
        assert r.status_code == 201, f"camp create failed: {r.status_code} {r.get_data(as_text=True)}"
        camp_team = r.get_json()

        # 2) duplicate in same slot must fail
        r = client.post(
            "/api/teams",
            headers=headers,
            json={"name": "Camp Team 2", "motto": "camp2", "logo": "🚀", "scope": "camp"},
        )
        assert r.status_code == 409, f"camp duplicate should be 409, got {r.status_code}"

        # 3) shift team (different slot) should succeed
        r = client.post(
            "/api/teams",
            headers=headers,
            json={
                "name": "Shift Team",
                "motto": "shift",
                "logo": "🚀",
                "scope": "shift",
                "shiftId": "shift-2026-spring",
            },
        )
        assert r.status_code == 201, f"shift create failed: {r.status_code} {r.get_data(as_text=True)}"
        shift_team = r.get_json()

        # 4) squad team in same shift should succeed
        r = client.post(
            "/api/teams",
            headers=headers,
            json={
                "name": "Squad Team",
                "motto": "squad",
                "logo": "🚀",
                "scope": "squad",
                "shiftId": "shift-2026-spring",
                "squadId": "squad-dolphins",
            },
        )
        assert r.status_code == 201, f"squad create failed: {r.status_code} {r.get_data(as_text=True)}"
        squad_team = r.get_json()

        # 5) /api/teams filter by scope=squad must include only squad team
        r = client.get("/api/teams?scope=squad&shiftId=shift-2026-spring&squadId=squad-dolphins")
        assert r.status_code == 200, "teams filter request failed"
        teams = r.get_json() or {}
        assert squad_team["id"] in teams, "filtered squad team missing"
        assert camp_team["id"] not in teams, "camp team leaked into squad filter"

        # 6) /api/teams/mine for scope=shift returns shift team
        r = client.get("/api/teams/mine?scope=shift&shiftId=shift-2026-spring", headers=headers)
        assert r.status_code == 200, f"teams/mine shift failed: {r.status_code}"
        mine_shift = r.get_json() or {}
        assert mine_shift.get("id") == shift_team.get("id"), "teams/mine shift returned wrong team"

        print("OK: M1 scoped teams smoke passed")
        return 0
    finally:
        _save_json(TEAMS_FILE, backup)


if __name__ == "__main__":
    raise SystemExit(run())
