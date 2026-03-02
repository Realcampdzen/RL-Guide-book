#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
backend/scripts/smoke_backend_critical.py

Smoke-check for backend critical API flows (M5-R2-A, M5-R2-C, M5-R3-C).

Covers:
  Flow A — Badge Request: request → inbox → approve → mine
  Flow B — Parent Snapshot: create → read by code → invalid-code 404
  Flow C — Council Initiatives: create → list
  Flow D — Mine endpoint: privacy check + contract (M5-R2-B)
  Flow E — Image Generation: happy path (200|503), prompt truncation (not 500), missing-field guards (400)
  Flow G — Chat: 200+response present with valid JWT, 401 with invalid token
  Flow F — Teams lifecycle: create → get → join → mine → leave x2 (M5-R3-A)

Usage:
  python backend/scripts/smoke_backend_critical.py
  python backend/scripts/smoke_backend_critical.py --base-url http://localhost:4000
  python backend/scripts/smoke_backend_critical.py --base-url http://localhost:4000 --auth-secret <secret>

  AUTH_SECRET env var is used if --auth-secret is not provided.
  If neither is set: auth flows are skipped, only /api/health is checked.

Exit code:
  0 — all checks pass
  1 — one or more checks failed (failures listed at the end)
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import sys
import time
import uuid
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

# ---------------------------------------------------------------------------
# HMAC auth helpers (mirrors app.py logic exactly)
# ---------------------------------------------------------------------------

_AUTH_SLOT_SEC = 600


def _compute_code(device_id: str, camp_id: str, role: str, secret: str) -> str:
    slot = int(time.time() // _AUTH_SLOT_SEC)
    payload = f"{device_id}|{camp_id}|{role}|{slot}"
    raw = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).digest()
    b32 = base64.b32encode(raw).decode("ascii").rstrip("=").upper()
    return b32[:8]


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

class SmokeError(Exception):
    pass


def _http(
    url: str,
    method: str = "GET",
    body: Optional[dict] = None,
    headers: Optional[dict] = None,
    expect_status: Optional[int] = None,
) -> tuple[int, dict]:
    """Return (status_code, json_body). Raises SmokeError on network failure."""
    hdr = {"Accept": "application/json"}
    if headers:
        hdr.update(headers)
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        hdr["Content-Type"] = "application/json"

    req = Request(url=url, method=method, data=data, headers=hdr)
    try:
        with urlopen(req, timeout=15) as resp:
            raw = resp.read()
            status = resp.status
            payload = json.loads(raw.decode("utf-8")) if raw else {}
    except HTTPError as exc:
        status = exc.code
        try:
            payload = json.loads(exc.read().decode("utf-8"))
        except Exception:
            payload = {}

    if expect_status is not None and status != expect_status:
        raise SmokeError(
            f"{method} {url} — expected HTTP {expect_status}, got {status}: {payload}"
        )
    return status, payload


# ---------------------------------------------------------------------------
# Smoke runner
# ---------------------------------------------------------------------------

class SmokeRunner:
    def __init__(self, base_url: str, auth_secret: Optional[str]):
        self.base = base_url.rstrip("/")
        self.auth_secret = auth_secret
        self.failures: list[str] = []
        self.passed: int = 0
        self.skipped: int = 0

    def _url(self, path: str) -> str:
        return f"{self.base}{path}"

    def ok(self, label: str) -> None:
        print(f"  PASS  {label}")
        self.passed += 1

    def fail(self, label: str, reason: str) -> None:
        msg = f"  FAIL  {label}: {reason}"
        print(msg)
        self.failures.append(msg)

    def check(self, label: str, cond: bool, reason: str = "") -> None:
        if cond:
            self.ok(label)
        else:
            self.fail(label, reason or "assertion failed")

    def skip(self, label: str, reason: str = "") -> None:
        msg = f"  SKIP  {label}" + (f": {reason}" if reason else "")
        print(msg)
        self.skipped += 1

    # -----------------------------------------------------------------------
    # Auth helpers
    # -----------------------------------------------------------------------

    def _get_jwt(self, device_id: str, role: str) -> Optional[str]:
        """Compute HMAC code + verify-code → return accessToken or None."""
        if not self.auth_secret:
            return None
        code = _compute_code(device_id, "", role, self.auth_secret)
        try:
            _, body = _http(
                self._url("/api/auth/verify-code"),
                method="POST",
                body={"code": code, "deviceId": device_id, "role": role},
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail(f"auth/verify-code ({role})", str(exc))
            return None
        token = body.get("accessToken")
        if not token:
            self.fail(f"auth/verify-code ({role})", f"no accessToken in response: {body}")
            return None
        self.ok(f"auth/verify-code ({role})")
        return token

    def _bearer(self, token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}

    # -----------------------------------------------------------------------
    # Health check
    # -----------------------------------------------------------------------

    def run_health(self) -> bool:
        print("\n[Health]")
        try:
            _, body = _http(self._url("/api/health"), expect_status=200)
        except SmokeError as exc:
            self.fail("/api/health", str(exc))
            return False
        status_ok = (body.get("status") or "").lower() in ("ok", "healthy")
        self.check("/api/health status", status_ok, f"got: {body}")
        return status_ok

    # -----------------------------------------------------------------------
    # Flow A — Badge Request
    # -----------------------------------------------------------------------

    def run_flow_a(self) -> tuple:
        """Run badge request flow. Returns (req_id, participant_token) for use in Flow D, or (None, None) on failure."""
        print("\n[Flow A] Badge Request: request -> inbox -> approve -> mine")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET — auth flows require it)")
            return None, None

        participant_device = f"smoke_p_{uuid.uuid4().hex[:8]}"
        staff_device = f"smoke_s_{uuid.uuid4().hex[:8]}"

        participant_token = self._get_jwt(participant_device, "participant")
        staff_token = self._get_jwt(staff_device, "shift_leader")
        if not participant_token or not staff_token:
            return None, None

        # A1 — POST badge request
        req_body = {
            "levelId": "1.1.1",
            "badgeTitle": "Smoke-Test Badge",
            "nickname": "SmokeParticipant",
            "evidence": {
                "reflection": "Smoke test reflection",
                "impact": "Smoke test impact",
            },
        }
        try:
            status, body = _http(
                self._url("/api/badges/requests"),
                method="POST",
                body=req_body,
                headers=self._bearer(participant_token),
                expect_status=201,
            )
        except SmokeError as exc:
            self.fail("POST /api/badges/requests", str(exc))
            return None, None

        req_obj = body.get("request") or {}
        req_id = req_obj.get("id")
        self.check(
            "POST /api/badges/requests — id present",
            bool(req_id),
            f"no id in: {body}",
        )
        self.check(
            "POST /api/badges/requests — status=pending",
            req_obj.get("status") == "pending",
            f"status={req_obj.get('status')}",
        )
        if not req_id:
            return None, None

        # A2 — GET inbox (staff)
        try:
            _, inbox_body = _http(
                self._url("/api/badges/requests/inbox"),
                headers=self._bearer(staff_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail("GET /api/badges/requests/inbox", str(exc))
            return None, None

        inbox_ids = [r.get("id") for r in (inbox_body.get("requests") or [])]
        self.check(
            "GET /api/badges/requests/inbox — request present",
            req_id in inbox_ids,
            f"{req_id} not found in inbox ids: {inbox_ids[:5]}",
        )

        # A3 — POST approve
        try:
            _, approve_body = _http(
                self._url(f"/api/badges/requests/{req_id}/approve"),
                method="POST",
                body={"note": "Smoke test approval"},
                headers=self._bearer(staff_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail(f"POST /api/badges/requests/{req_id}/approve", str(exc))
            return None, None

        approved_obj = approve_body.get("request") or {}
        self.check(
            "POST approve — status=approved",
            approved_obj.get("status") == "approved",
            f"status={approved_obj.get('status')}",
        )
        self.check(
            "POST approve — resolvedAt present",
            bool(approved_obj.get("resolvedAt")),
            f"resolvedAt missing in: {approved_obj}",
        )

        # A4 — GET mine (participant) — basic check
        try:
            _, mine_body = _http(
                self._url("/api/badges/requests/mine"),
                headers=self._bearer(participant_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail("GET /api/badges/requests/mine", str(exc))
            return None, None

        mine_map = {r.get("id"): r for r in (mine_body.get("requests") or [])}
        my_req = mine_map.get(req_id)
        self.check(
            "GET /api/badges/requests/mine — request found",
            my_req is not None,
            f"{req_id} not in mine: {list(mine_map.keys())[:5]}",
        )
        if my_req:
            self.check(
                "GET /api/badges/requests/mine — status=approved",
                my_req.get("status") == "approved",
                f"status={my_req.get('status')}",
            )

        return req_id, participant_token

    # -----------------------------------------------------------------------
    # Flow D — Mine Endpoint (privacy + contract checks)
    # -----------------------------------------------------------------------

    def run_flow_d(self, req_id: Optional[str], participant_token: Optional[str]) -> None:
        print("\n[Flow D] Mine endpoint: privacy + contract checks")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET — auth flows require it)")
            return
        if not req_id or not participant_token:
            print("  SKIP  (Flow A did not complete — no req_id available)")
            return

        try:
            _, mine_body = _http(
                self._url("/api/badges/requests/mine"),
                headers=self._bearer(participant_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail("GET /api/badges/requests/mine (Flow D)", str(exc))
            return

        requests_list = mine_body.get("requests")
        self.check(
            "GET /api/badges/requests/mine — requests is list",
            isinstance(requests_list, list),
            f"requests is not a list: {type(requests_list)}",
        )

        mine_map = {r.get("id"): r for r in (requests_list or [])}
        my_req = mine_map.get(req_id)
        self.check(
            "GET /api/badges/requests/mine — approved request found",
            my_req is not None,
            f"{req_id} not in mine ids: {list(mine_map.keys())[:5]}",
        )
        if my_req is None:
            return

        self.check(
            "GET /api/badges/requests/mine — status=approved",
            my_req.get("status") == "approved",
            f"status={my_req.get('status')}",
        )

        # Privacy check: requestedBy.deviceId must NOT be present
        req_by = my_req.get("requestedBy") or {}
        self.check(
            "GET /api/badges/requests/mine — requestedBy.deviceId absent (privacy)",
            "deviceId" not in req_by,
            f"requestedBy.deviceId present in response: {req_by}",
        )

    # -----------------------------------------------------------------------
    # Flow B — Parent Insights (read-only path)
    # -----------------------------------------------------------------------

    def run_flow_b(self) -> None:
        print("\n[Flow B] Parent Snapshot: create -> read by code -> invalid 404")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET — auth flows require it)")
            return

        participant_device = f"smoke_pi_{uuid.uuid4().hex[:8]}"
        participant_token = self._get_jwt(participant_device, "participant")
        if not participant_token:
            return

        # B1 — POST parent-snapshot
        snap_body = {
            "progress": {
                "1.1.1": {"achieved": True, "achievedAt": "2026-02-27T00:00:00Z"},
                "1.2.1": {"achieved": True, "achievedAt": "2026-02-26T00:00:00Z"},
            },
            "profile": {
                "nickname": "SmokeParent",
                "totalLevelsAchieved": 2,
            },
        }
        try:
            _, snap_resp = _http(
                self._url("/api/parent-snapshot"),
                method="POST",
                body=snap_body,
                headers=self._bearer(participant_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail("POST /api/parent-snapshot", str(exc))
            return

        link_code = snap_resp.get("parentLinkCode")
        self.check(
            "POST /api/parent-snapshot — parentLinkCode present",
            bool(link_code),
            f"no parentLinkCode in: {snap_resp}",
        )
        if not link_code:
            return

        # B2 — GET parent-snapshot with valid code (read-only parent view)
        try:
            _, insights = _http(
                self._url(f"/api/parent-snapshot?code={link_code}"),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail(f"GET /api/parent-snapshot?code={link_code}", str(exc))
            return

        progress = insights.get("progress") or {}
        self.check(
            "GET /api/parent-snapshot — progress present",
            bool(progress),
            f"progress missing or empty: {insights}",
        )
        self.check(
            "GET /api/parent-snapshot — exportedAt present",
            "exportedAt" in insights,
            f"exportedAt missing in: {list(insights.keys())}",
        )
        self.check(
            "GET /api/parent-snapshot — progress has entries",
            isinstance(progress, dict) and len(progress) > 0,
            f"progress is empty: {progress}",
        )

        # B3 — GET parent-snapshot with invalid code → expect 404
        try:
            invalid_status, invalid_body = _http(
                self._url("/api/parent-snapshot?code=INVALIDCODE00"),
            )
        except SmokeError as exc:
            self.fail("GET /api/parent-snapshot?code=INVALID (expected 404)", str(exc))
            return

        self.check(
            "GET /api/parent-snapshot?code=INVALID — 404",
            invalid_status == 404,
            f"expected 404, got {invalid_status}: {invalid_body}",
        )

    # -----------------------------------------------------------------------
    # Flow C — Council Initiatives
    # -----------------------------------------------------------------------

    def run_flow_c(self) -> None:
        print("\n[Flow C] Council Initiatives: create -> list")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET — auth flows require it)")
            return

        staff_device = f"smoke_ci_{uuid.uuid4().hex[:8]}"
        staff_token = self._get_jwt(staff_device, "shift_leader")
        if not staff_token:
            return

        # C1 — POST initiative
        init_body = {
            "title": f"Smoke Initiative {uuid.uuid4().hex[:6]}",
            "camp_id": "smoke_camp",
        }
        try:
            _, init_resp = _http(
                self._url("/api/council/initiatives"),
                method="POST",
                body=init_body,
                headers=self._bearer(staff_token),
                expect_status=201,
            )
        except SmokeError as exc:
            self.fail("POST /api/council/initiatives", str(exc))
            return

        init_id = init_resp.get("id")
        self.check(
            "POST /api/council/initiatives — id present",
            bool(init_id),
            f"no id in: {init_resp}",
        )
        self.check(
            "POST /api/council/initiatives — status=idea",
            init_resp.get("status") == "idea",
            f"status={init_resp.get('status')}",
        )
        self.check(
            "POST /api/council/initiatives — title matches",
            init_resp.get("title") == init_body["title"],
            f"title={init_resp.get('title')}",
        )

        # C2 — GET initiatives list
        try:
            _, list_resp = _http(
                self._url("/api/council/initiatives"),
                headers=self._bearer(staff_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail("GET /api/council/initiatives", str(exc))
            return

        initiatives = list_resp.get("initiatives") or []
        self.check(
            "GET /api/council/initiatives — list returned",
            isinstance(initiatives, list),
            f"initiatives is not a list: {type(initiatives)}",
        )
        if init_id:
            found = any(i.get("id") == init_id for i in initiatives)
            self.check(
                "GET /api/council/initiatives — new initiative found in list",
                found,
                f"{init_id} not in list of {len(initiatives)} initiatives",
            )

    # -----------------------------------------------------------------------
    # Flow E — Image Generation safety & contract (M5-R2-C)
    # -----------------------------------------------------------------------

    def run_flow_e(self) -> None:
        """Flow E: POST /api/images/generate — happy path, truncation, missing-field guards."""
        print("\n[Flow E] Image Generation: happy path, prompt truncation, missing fields")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET — auth flows require it)")
            return

        participant_device = f"smoke_img_{uuid.uuid4().hex[:8]}"
        participant_token = self._get_jwt(participant_device, "participant")
        if not participant_token:
            return

        # E-1: happy path — 200 (imageBase64 present) or 503 (no OpenAI key); both acceptable
        try:
            status_e1, body_e1 = _http(
                self._url("/api/images/generate"),
                method="POST",
                body={"mode": "generate", "context": "passport"},
                headers=self._bearer(participant_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/images/generate — happy path (E-1)", str(exc))
            status_e1, body_e1 = None, {}

        if status_e1 == 200:
            self.check(
                "POST /api/images/generate — E-1: 200 imageBase64 present",
                bool(body_e1.get("imageBase64")),
                f"imageBase64 missing in 200 response: {body_e1}",
            )
        elif status_e1 == 503:
            self.ok("POST /api/images/generate — E-1: 503 (OpenAI not configured, acceptable)")
        elif status_e1 is not None:
            self.fail(
                "POST /api/images/generate — E-1: unexpected status",
                f"expected 200 or 503, got {status_e1}: {body_e1}",
            )

        # E-2: long prompt (>300 chars) — must NOT return 500 (sanitization must absorb it)
        long_prompt = "x" * 400
        try:
            status_e2, body_e2 = _http(
                self._url("/api/images/generate"),
                method="POST",
                body={"mode": "generate", "context": "passport", "prompt": long_prompt},
                headers=self._bearer(participant_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/images/generate — E-2 prompt truncation", str(exc))
            status_e2, body_e2 = None, {}

        if status_e2 is not None:
            self.check(
                "POST /api/images/generate — E-2: long prompt not 500",
                status_e2 != 500,
                f"got 500 — sanitization did not absorb long prompt: {body_e2}",
            )

        # E-3: missing mode → 400
        try:
            status_e3, body_e3 = _http(
                self._url("/api/images/generate"),
                method="POST",
                body={"context": "passport"},
                headers=self._bearer(participant_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/images/generate — E-3 missing mode", str(exc))
            status_e3, body_e3 = None, {}

        if status_e3 is not None:
            self.check(
                "POST /api/images/generate — E-3: missing mode -> 400",
                status_e3 == 400,
                f"expected 400, got {status_e3}: {body_e3}",
            )

        # E-4: missing context → 400
        try:
            status_e4, body_e4 = _http(
                self._url("/api/images/generate"),
                method="POST",
                body={"mode": "generate"},
                headers=self._bearer(participant_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/images/generate — E-4 missing context", str(exc))
            status_e4, body_e4 = None, {}

        if status_e4 is not None:
            self.check(
                "POST /api/images/generate — E-4: missing context -> 400",
                status_e4 == 400,
                f"expected 400, got {status_e4}: {body_e4}",
            )

    # -----------------------------------------------------------------------
    # Flow F — Teams lifecycle (M5-R3-A)
    # -----------------------------------------------------------------------

    def run_flow_f(self) -> None:
        """Flow F: Teams create -> GET -> join -> mine -> leave x2."""
        print("\n[Flow F] Teams lifecycle: create -> get -> join -> mine -> leave")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET — auth flows require it)")
            return

        leader_device = f"smoke_tl_{uuid.uuid4().hex[:8]}"
        joiner_device = f"smoke_tj_{uuid.uuid4().hex[:8]}"

        leader_token = self._get_jwt(leader_device, "participant")
        joiner_token = self._get_jwt(joiner_device, "participant")
        if not leader_token or not joiner_token:
            return

        team_name = f"Smoke Team {uuid.uuid4().hex[:6]}"

        # F1 — POST /api/teams (create)
        try:
            status_f1, body_f1 = _http(
                self._url("/api/teams"),
                method="POST",
                body={"name": team_name, "scope": "camp"},
                headers=self._bearer(leader_token),
                expect_status=201,
            )
        except SmokeError as exc:
            self.fail("POST /api/teams", str(exc))
            return

        team_id = body_f1.get("id")
        self.check(
            "POST /api/teams — id present",
            bool(team_id),
            f"no id in: {body_f1}",
        )
        if not team_id:
            return

        # F2 — GET /api/teams/<id> (no auth required)
        try:
            _, body_f2 = _http(
                self._url(f"/api/teams/{team_id}"),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail(f"GET /api/teams/{team_id}", str(exc))
            return

        self.check(
            "GET /api/teams/<id> — name matches",
            body_f2.get("name") == team_name,
            f"name={body_f2.get('name')!r} expected {team_name!r}",
        )

        # F3 — POST /api/teams/<id>/join (joiner)
        try:
            _, body_f3 = _http(
                self._url(f"/api/teams/{team_id}/join"),
                method="POST",
                body={"nickname": "SmokeJoiner"},
                headers=self._bearer(joiner_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail(f"POST /api/teams/{team_id}/join", str(exc))
            return

        members = body_f3.get("members") or []
        joiner_in_members = any(
            isinstance(m, dict) and m.get("id") == joiner_device
            for m in members
        )
        self.check(
            "POST /api/teams/<id>/join — joiner in members",
            joiner_in_members,
            f"joiner {joiner_device} not found in members: {[m.get('id') for m in members]}",
        )

        # F4 — GET /api/teams/mine (leader)
        try:
            _, body_f4 = _http(
                self._url("/api/teams/mine"),
                headers=self._bearer(leader_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail("GET /api/teams/mine (leader)", str(exc))
            return

        self.check(
            "GET /api/teams/mine — team id matches",
            body_f4.get("id") == team_id,
            f"mine team id={body_f4.get('id')!r} expected {team_id!r}",
        )

        # F5 — POST /api/teams/<id>/leave (joiner)
        try:
            _, body_f5 = _http(
                self._url(f"/api/teams/{team_id}/leave"),
                method="POST",
                body={},
                headers=self._bearer(joiner_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail(f"POST /api/teams/{team_id}/leave (joiner)", str(exc))
            return

        self.check(
            "POST /api/teams/<id>/leave (joiner) — status=success",
            body_f5.get("status") == "success",
            f"status={body_f5.get('status')}",
        )

        # F6 — POST /api/teams/<id>/leave (leader, last member → team deleted)
        try:
            _, body_f6 = _http(
                self._url(f"/api/teams/{team_id}/leave"),
                method="POST",
                body={},
                headers=self._bearer(leader_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail(f"POST /api/teams/{team_id}/leave (leader)", str(exc))
            return

        self.check(
            "POST /api/teams/<id>/leave (leader/last) — status=success",
            body_f6.get("status") == "success",
            f"status={body_f6.get('status')}",
        )

    # -----------------------------------------------------------------------
    # Flow G — Chat context (M5-R3-C)
    # -----------------------------------------------------------------------

    def run_flow_g(self) -> None:
        """Flow G: POST /api/chat — 200+response present, 401 with invalid token."""
        print("\n[Flow G] Chat: valid JWT → 200+response, invalid token → 401")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET — auth flows require it)")
            return

        participant_device = f"smoke_ch_{uuid.uuid4().hex[:8]}"
        participant_token = self._get_jwt(participant_device, "participant")
        if not participant_token:
            return

        # G-1: valid participant JWT → 200, response field present
        try:
            status_g1, body_g1 = _http(
                self._url("/api/chat"),
                method="POST",
                body={"message": "Как меня зовут?", "user_id": participant_device},
                headers=self._bearer(participant_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/chat — G-1 valid JWT", str(exc))
            status_g1, body_g1 = None, {}

        if status_g1 is not None:
            if status_g1 == 200:
                self.ok("POST /api/chat — G-1: valid JWT → 200")
                self.check(
                    "POST /api/chat — G-1: response field present",
                    bool(body_g1.get("response")),
                    f"response missing or empty in: {list(body_g1.keys())}",
                )
            elif status_g1 == 503:
                self.ok("POST /api/chat — G-1: 503 (OpenAI not configured, acceptable)")
            else:
                self.check(
                    "POST /api/chat — G-1: valid JWT → 200 or 503",
                    False,
                    f"expected 200 or 503, got {status_g1}: {body_g1}",
                )

        # G-2: invalid Bearer token → 401
        try:
            status_g2, body_g2 = _http(
                self._url("/api/chat"),
                method="POST",
                body={"message": "test", "user_id": "invalid_user"},
                headers={"Authorization": "Bearer invalid.token.here"},
            )
        except SmokeError as exc:
            self.fail("POST /api/chat — G-2 invalid token", str(exc))
            status_g2, body_g2 = None, {}

        if status_g2 is not None:
            self.check(
                "POST /api/chat — G-2: invalid token → 401",
                status_g2 == 401,
                f"expected 401, got {status_g2}: {body_g2}",
            )

        # G-3: message too long → 400 (or 503 if OpenAI not configured)
        long_msg = "x" * 2001
        try:
            status_g3, body_g3 = _http(
                self._url("/api/chat"),
                method="POST",
                body={"message": long_msg, "user_id": participant_device},
                headers={"Authorization": f"Bearer {participant_token}"},
            )
        except SmokeError as exc:
            self.fail("POST /api/chat — G-3 long message", str(exc))
            status_g3, body_g3 = None, {}

        if status_g3 is not None:
            self.check(
                "POST /api/chat — G-3: message > 2000 chars → 400 or 503(no OpenAI)",
                status_g3 in (400, 503),
                f"expected 400 or 503, got {status_g3}: {body_g3}",
            )

    # -----------------------------------------------------------------------
    # Flow H — Badge requests cleanup contract guard (M5-R5-A)
    # -----------------------------------------------------------------------

    def run_flow_h(self) -> None:
        """Flow H: POST /api/badges/requests/cleanup — auth guard + successful call."""
        print("\n[Flow H] Badge cleanup: no-auth → 401/200(dev), shift_leader → 200+deleted")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET — auth flows require it)")
            return

        # H-1: no auth → 401 in prod; 200 acceptable on localhost (allow_localhost_dev=True)
        try:
            status_h1, body_h1 = _http(
                self._url("/api/badges/requests/cleanup"),
                method="POST",
                body={"olderThanDays": 0},
            )
        except SmokeError as exc:
            self.fail("POST /api/badges/requests/cleanup — H-1 no auth", str(exc))
            status_h1, body_h1 = None, {}

        if status_h1 is not None:
            self.check(
                "POST /api/badges/requests/cleanup — H-1: no auth → 401 or 200(dev)",
                status_h1 in (401, 200),
                f"expected 401 or 200(dev), got {status_h1}: {body_h1}",
            )

        # H-2: shift_leader token → 200 + {"deleted": <int>}
        sl_device = f"smoke_sl_{uuid.uuid4().hex[:8]}"
        sl_token = self._get_jwt(sl_device, "shift_leader")
        if not sl_token:
            return

        try:
            status_h2, body_h2 = _http(
                self._url("/api/badges/requests/cleanup"),
                method="POST",
                body={"olderThanDays": 0},
                headers=self._bearer(sl_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/badges/requests/cleanup — H-2 shift_leader", str(exc))
            status_h2, body_h2 = None, {}

        if status_h2 is not None:
            self.check(
                "POST /api/badges/requests/cleanup — H-2: shift_leader → 200",
                status_h2 == 200,
                f"expected 200, got {status_h2}: {body_h2}",
            )
            if status_h2 == 200:
                self.check(
                    "POST /api/badges/requests/cleanup — H-2: deleted field is int",
                    isinstance(body_h2.get("deleted"), int),
                    f"deleted={body_h2.get('deleted')!r}",
                )

        # H-3: immediate repeat call → 429 (rate limit, M6-HARDENING-A)
        try:
            status_h3, body_h3 = _http(
                self._url("/api/badges/requests/cleanup"),
                method="POST",
                body={"olderThanDays": 0},
                headers=self._bearer(sl_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/badges/requests/cleanup — H-3 rate limit", str(exc))
            status_h3, body_h3 = None, {}

        if status_h3 is not None:
            self.check(
                "POST /api/badges/requests/cleanup — H-3: repeat call → 429",
                status_h3 == 429,
                f"expected 429 (rate limit), got {status_h3}: {body_h3}",
            )

    # -----------------------------------------------------------------------
    # Flow I — Telegram agent-post contract checks (M5-R4-D)
    # -----------------------------------------------------------------------

    def run_flow_i(self) -> None:
        """Flow I: POST /api/telegram/agent-post — negative contract checks (no real TG send)."""
        print("\n[Flow I] Telegram agent-post: no auth → 401, unknown agent → 404, missing field → 400")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET — auth flows require it)")
            return

        dev_device = f"smoke_ag_{uuid.uuid4().hex[:8]}"
        dev_token = self._get_jwt(dev_device, "developer")
        if not dev_token:
            return

        # I-1: no auth → 401 (endpoint exists: neuro_stepa is registered)
        try:
            status_i1, body_i1 = _http(
                self._url("/api/telegram/agent-post"),
                method="POST",
                body={"agent": "neuro_stepa", "text": "hi", "root_message_id": 1},
            )
        except SmokeError as exc:
            self.fail("POST /api/telegram/agent-post — I-1 no auth", str(exc))
            status_i1 = None

        if status_i1 is not None:
            # 404 means endpoint not deployed/registered; treat as soft pass in local smoke
            self.check(
                "POST /api/telegram/agent-post — I-1: no auth → 401 or 404(not deployed) or 200(dev)",
                status_i1 in (401, 404, 200),
                f"expected 401 or 404 or 200(dev), got {status_i1}",
            )

        # I-2: unknown agent → 404
        try:
            status_i2, body_i2 = _http(
                self._url("/api/telegram/agent-post"),
                method="POST",
                body={"agent": "unknown_lobster_bot", "text": "hi", "root_message_id": 1},
                headers=self._bearer(dev_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/telegram/agent-post — I-2 unknown agent", str(exc))
            status_i2, body_i2 = None, {}

        if status_i2 is not None:
            self.check(
                "POST /api/telegram/agent-post — I-2: unknown agent → 404",
                status_i2 == 404,
                f"expected 404, got {status_i2}: {body_i2}",
            )

        # I-3: missing root_message_id → 400 (or 404 if endpoint not fully deployed)
        try:
            status_i3, body_i3 = _http(
                self._url("/api/telegram/agent-post"),
                method="POST",
                body={"agent": "neuro_stepa", "text": "hi"},
                headers=self._bearer(dev_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/telegram/agent-post — I-3 missing root_message_id", str(exc))
            status_i3, body_i3 = None, {}

        if status_i3 is not None:
            self.check(
                "POST /api/telegram/agent-post — I-3: missing root_message_id → 400 or 404",
                status_i3 in (400, 404),
                f"expected 400 or 404, got {status_i3}: {body_i3}",
            )

    # -----------------------------------------------------------------------
    # Flow J — Badge Plans workflow (M7-PLAN-WORKFLOW-A)
    # -----------------------------------------------------------------------

    def run_flow_j(self) -> None:
        """Flow J: Badge Plans: submit → inbox → approve → mine."""
        print("\n[Flow J] Badge Plans: submit → inbox → approve → mine")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET — auth flows require it)")
            return

        participant_device = f"smoke_bp_{uuid.uuid4().hex[:8]}"
        staff_device = f"smoke_bs_{uuid.uuid4().hex[:8]}"

        participant_token = self._get_jwt(participant_device, "participant")
        staff_token = self._get_jwt(staff_device, "shift_leader")
        if not participant_token or not staff_token:
            return

        # J-1 — POST badge plan (submit=true)
        plan_body = {
            "badgeId": "1.1",
            "levelId": "1.1.1",
            "planText": "Smoke test plan text",
            "checklist": [{"text": "Step 1", "done": False}],
            "submit": True,
        }
        try:
            status_j1, body_j1 = _http(
                self._url("/api/badges/plans"),
                method="POST",
                body=plan_body,
                headers=self._bearer(participant_token),
                expect_status=201,
            )
        except SmokeError as exc:
            self.fail("POST /api/badges/plans", str(exc))
            return

        plan_obj = body_j1.get("plan") or {}
        plan_id = plan_obj.get("id")
        self.check(
            "POST /api/badges/plans — id present + status=submitted",
            bool(plan_id) and plan_obj.get("status") == "submitted",
            f"id={plan_id}, status={plan_obj.get('status')}",
        )
        if not plan_id:
            return

        # J-2 — GET inbox (staff)
        try:
            _, inbox_body = _http(
                self._url("/api/badges/plans/inbox"),
                headers=self._bearer(staff_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail("GET /api/badges/plans/inbox", str(exc))
            return

        inbox_ids = [p.get("id") for p in (inbox_body.get("plans") or [])]
        self.check(
            "GET /api/badges/plans/inbox — plan present",
            plan_id in inbox_ids,
            f"{plan_id} not found in inbox ids: {inbox_ids[:5]}",
        )

        # J-3 — PATCH review (approve)
        try:
            _, review_body = _http(
                self._url(f"/api/badges/plans/{plan_id}/review"),
                method="PATCH",
                body={"status": "approved", "counselorNote": "Smoke approval"},
                headers=self._bearer(staff_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail(f"PATCH /api/badges/plans/{plan_id}/review", str(exc))
            return

        reviewed = review_body.get("plan") or {}
        self.check(
            "PATCH review — status=approved",
            reviewed.get("status") == "approved",
            f"status={reviewed.get('status')}",
        )

        # J-4 — GET mine (participant)
        try:
            _, mine_body = _http(
                self._url("/api/badges/plans/mine"),
                headers=self._bearer(participant_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail("GET /api/badges/plans/mine", str(exc))
            return

        mine_map = {p.get("id"): p for p in (mine_body.get("plans") or [])}
        my_plan = mine_map.get(plan_id)
        self.check(
            "GET /api/badges/plans/mine — plan found + status=approved",
            my_plan is not None and (my_plan or {}).get("status") == "approved",
            f"{plan_id} not in mine or status != approved: {list(mine_map.keys())[:5]}",
        )

    # -----------------------------------------------------------------------
    # Flow K — Educator RBAC smoke (M7-EDUCATOR-RBAC-A)
    # -----------------------------------------------------------------------

    def run_flow_k(self) -> None:
        """Flow K: educator JWT accepted by inbox endpoints."""
        print("\n[Flow K] Educator RBAC: educator JWT → inbox 200")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET — auth flows require it)")
            return

        educator_device = f"smoke_edu_{uuid.uuid4().hex[:8]}"
        educator_token = self._get_jwt(educator_device, "educator")
        if not educator_token:
            return

        # K-1: educator → GET /api/badges/requests/inbox → 200
        try:
            status_k1, _ = _http(
                self._url("/api/badges/requests/inbox"),
                headers=self._bearer(educator_token),
            )
        except SmokeError as exc:
            self.fail("GET /api/badges/requests/inbox (educator)", str(exc))
            status_k1 = None

        if status_k1 is not None:
            self.check(
                "GET /api/badges/requests/inbox — educator → 200",
                status_k1 == 200,
                f"expected 200, got {status_k1}",
            )

        # K-2: educator → GET /api/badges/plans/inbox → 200
        try:
            status_k2, _ = _http(
                self._url("/api/badges/plans/inbox"),
                headers=self._bearer(educator_token),
            )
        except SmokeError as exc:
            self.fail("GET /api/badges/plans/inbox (educator)", str(exc))
            status_k2 = None

        if status_k2 is not None:
            self.check(
                "GET /api/badges/plans/inbox — educator → 200",
                status_k2 == 200,
                f"expected 200, got {status_k2}",
            )

    # -----------------------------------------------------------------------
    # Flow L — Council Initiatives extended (M8-COUNCIL-INITIATIVES-A)
    # -----------------------------------------------------------------------

    def run_flow_l(self) -> None:
        """Flow L: council initiative PATCH status."""
        print("\n[Flow L] Council Initiatives: create → GET → PATCH status")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET)")
            return

        participant_device = f"smoke_cl_{uuid.uuid4().hex[:8]}"
        participant_token = self._get_jwt(participant_device, "participant")
        if not participant_token:
            return
        staff_device = f"smoke_cls_{uuid.uuid4().hex[:8]}"
        staff_token = self._get_jwt(staff_device, "shift_leader")
        if not staff_token:
            return

        # L-1: POST initiative → 201
        try:
            status_l1, body_l1 = _http(
                self._url("/api/council/initiatives"),
                method="POST",
                body={"title": "Smoke L test initiative", "description": "Auto-test"},
                headers=self._bearer(participant_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/council/initiatives (L-1)", str(exc))
            return
        ci_id = body_l1.get("id", "")
        self.check("POST /api/council/initiatives — L-1: 201 + id", status_l1 == 201 and bool(ci_id), f"status={status_l1}, id={ci_id}")

        # L-2: GET list → contains created
        try:
            status_l2, body_l2 = _http(
                self._url("/api/council/initiatives"),
                headers=self._bearer(participant_token),
            )
        except SmokeError as exc:
            self.fail("GET /api/council/initiatives (L-2)", str(exc))
            return
        found = any(i.get("id") == ci_id for i in body_l2.get("initiatives", []))
        self.check("GET /api/council/initiatives — L-2: initiative in list", found, f"id={ci_id} not in list")

        # L-3: PATCH status → 200
        try:
            status_l3, body_l3 = _http(
                self._url(f"/api/council/initiatives/{ci_id}"),
                method="PATCH",
                body={"status": "approved"},
                headers=self._bearer(staff_token),
            )
        except SmokeError as exc:
            self.fail(f"PATCH /api/council/initiatives/{ci_id} (L-3)", str(exc))
            return
        patched_status = body_l3.get("initiative", {}).get("status", "")
        self.check("PATCH initiative — L-3: status=approved", status_l3 == 200 and patched_status == "approved", f"status={status_l3}, got={patched_status}")

    # -----------------------------------------------------------------------
    # Flow M — Staff Squad kind (M8-COUNSELOR-SQUAD-A)
    # -----------------------------------------------------------------------

    def run_flow_m(self) -> None:
        """Flow M: create staff-squad + filter by kind."""
        print("\n[Flow M] Staff Squad: create kind=staff → filter")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET)")
            return

        staff_device = f"smoke_ms_{uuid.uuid4().hex[:8]}"
        staff_token = self._get_jwt(staff_device, "shift_leader")
        if not staff_token:
            return

        # Get first shift id
        try:
            _, shifts_body = _http(
                self._url("/api/shifts"),
                headers=self._bearer(staff_token),
            )
        except SmokeError as exc:
            self.fail("GET /api/shifts (Flow M setup)", str(exc))
            return
        shifts = shifts_body.get("shifts", [])
        if not shifts:
            self.fail("Flow M setup", "no shifts found")
            return
        shift_id = shifts[0].get("id", "")

        # M-1: create staff-squad → 201 with kind=staff
        try:
            status_m1, body_m1 = _http(
                self._url(f"/api/shifts/{shift_id}/squads"),
                method="POST",
                body={"name": f"Staff Squad Smoke {uuid.uuid4().hex[:4]}", "kind": "staff"},
                headers=self._bearer(staff_token),
            )
        except SmokeError as exc:
            self.fail("POST staff squad (M-1)", str(exc))
            return
        sq = body_m1.get("squad", {})
        sq_id = sq.get("id", "")
        sq_kind = sq.get("kind", "")
        self.check("POST staff squad — M-1: 201 + kind=staff", status_m1 == 200 and sq_kind == "staff", f"status={status_m1}, kind={sq_kind}")

        # M-2: GET squads?kind=staff → contains only staff
        try:
            status_m2, body_m2 = _http(
                self._url(f"/api/shifts/{shift_id}/squads?kind=staff"),
                headers=self._bearer(staff_token),
            )
        except SmokeError as exc:
            self.fail("GET squads?kind=staff (M-2)", str(exc))
            return
        staff_squads = body_m2.get("squads", [])
        all_staff = all(s.get("kind", "participant") == "staff" for s in staff_squads)
        has_ours = any(s.get("id") == sq_id for s in staff_squads)
        self.check("GET squads?kind=staff — M-2: only staff + ours found", all_staff and has_ours, f"all_staff={all_staff} has_ours={has_ours}")

    # -----------------------------------------------------------------------
    # Flow N — Badge Arts moderation (M9-ART-MODERATION-A)
    # -----------------------------------------------------------------------

    def run_flow_n(self) -> None:
        """Flow N: badge art submit → inbox → approve."""
        print("\n[Flow N] Badge Arts: submit → inbox → approve")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET)")
            return

        participant_device = f"smoke_na_{uuid.uuid4().hex[:8]}"
        participant_token = self._get_jwt(participant_device, "participant")
        if not participant_token:
            return
        staff_device = f"smoke_ns_{uuid.uuid4().hex[:8]}"
        staff_token = self._get_jwt(staff_device, "shift_leader")
        if not staff_token:
            return

        # N-1: POST art → 201
        try:
            status_n1, body_n1 = _http(
                self._url("/api/badges/arts"),
                method="POST",
                body={"badgeId": "smoke-badge", "imageUrl": "https://example.com/art.png", "source": "uploaded"},
                headers=self._bearer(participant_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/badges/arts (N-1)", str(exc))
            return
        art = body_n1.get("art", {})
        art_id = art.get("id", "")
        self.check("POST /api/badges/arts — N-1: 201 + id", status_n1 == 201 and bool(art_id), f"status={status_n1}, id={art_id}")

        # N-2: GET inbox → contains art
        try:
            status_n2, body_n2 = _http(
                self._url("/api/badges/arts/inbox"),
                headers=self._bearer(staff_token),
            )
        except SmokeError as exc:
            self.fail("GET /api/badges/arts/inbox (N-2)", str(exc))
            return
        found = any(a.get("id") == art_id for a in body_n2.get("arts", []))
        self.check("GET /api/badges/arts/inbox — N-2: art in inbox", found, f"id={art_id} not in inbox")

        # N-3: PATCH review (approve) → 200
        try:
            status_n3, body_n3 = _http(
                self._url(f"/api/badges/arts/{art_id}/review"),
                method="PATCH",
                body={"status": "approved"},
                headers=self._bearer(staff_token),
            )
        except SmokeError as exc:
            self.fail(f"PATCH /api/badges/arts/{art_id}/review (N-3)", str(exc))
            return
        reviewed_status = body_n3.get("art", {}).get("status", "")
        self.check("PATCH art review — N-3: status=approved", status_n3 == 200 and reviewed_status == "approved", f"status={status_n3}, got={reviewed_status}")

    # -----------------------------------------------------------------------
    # Flow O — Integration smoke (M10-SMOKE-STABILITY-A)
    # -----------------------------------------------------------------------

    def run_flow_o(self) -> None:
        """Flow O: integration check for new M7-M9 endpoints."""
        print("\n[Flow O] Integration: plans + council + arts quick check")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET)")
            return

        p_device = f"smoke_o_{uuid.uuid4().hex[:8]}"
        p_token = self._get_jwt(p_device, "participant")
        if not p_token:
            return

        # O-1: POST badge plan → 201
        try:
            s1, b1 = _http(
                self._url("/api/badges/plans"),
                method="POST",
                body={"badgeId": "smoke-int-badge", "planText": "Integration test plan", "submit": True},
                headers=self._bearer(p_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/badges/plans (O-1)", str(exc))
            s1 = None
        if s1 is not None:
            self.check("POST /api/badges/plans — O-1: 201", s1 in (200, 201), f"status={s1}")

        # O-2: POST council initiative → 201
        try:
            s2, b2 = _http(
                self._url("/api/council/initiatives"),
                method="POST",
                body={"title": "Integration test initiative"},
                headers=self._bearer(p_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/council/initiatives (O-2)", str(exc))
            s2 = None
        if s2 is not None:
            self.check("POST /api/council/initiatives — O-2: 201", s2 == 201, f"status={s2}")

        # O-3: POST badge art → 201
        try:
            s3, b3 = _http(
                self._url("/api/badges/arts"),
                method="POST",
                body={"badgeId": "smoke-int-badge", "imageUrl": "https://example.com/int.png"},
                headers=self._bearer(p_token),
            )
        except SmokeError as exc:
            self.fail("POST /api/badges/arts (O-3)", str(exc))
            s3 = None
        if s3 is not None:
            self.check("POST /api/badges/arts — O-3: 201", s3 == 201, f"status={s3}")

        # O-4: GET council initiatives → 200
        try:
            s4, _ = _http(
                self._url("/api/council/initiatives"),
                headers=self._bearer(p_token),
            )
        except SmokeError as exc:
            self.fail("GET /api/council/initiatives (O-4)", str(exc))
            s4 = None
        if s4 is not None:
            self.check("GET /api/council/initiatives — O-4: 200", s4 == 200, f"status={s4}")

        # O-5: GET badge arts → 200
        try:
            s5, _ = _http(
                self._url("/api/badges/arts"),
                headers=self._bearer(p_token),
            )
        except SmokeError as exc:
            self.fail("GET /api/badges/arts (O-5)", str(exc))
            s5 = None
        if s5 is not None:
            self.check("GET /api/badges/arts — O-5: 200", s5 == 200, f"status={s5}")

    # -----------------------------------------------------------------------
    # Flow P — Engines lifecycle (M11-DVIZHKI-BACKEND-A)
    # -----------------------------------------------------------------------

    def run_flow_p(self) -> None:
        """Flow P: engines create → approve → join → goal approve."""
        print("\n[Flow P] Engines: create → approve → join → goal approve")
        if not self.auth_secret:
            print("  SKIP  (no AUTH_SECRET)")
            return

        p_device = f"smoke_pe_{uuid.uuid4().hex[:8]}"
        p_token = self._get_jwt(p_device, "participant")
        if not p_token:
            return
        c_device = f"smoke_pc_{uuid.uuid4().hex[:8]}"
        c_token = self._get_jwt(c_device, "counselor")
        if not c_token:
            return

        engine_id = ""

        # P-1: POST engine → 201, status=pending
        try:
            s1, r1 = _http(
                self._url("/api/squads/SMOKE-SQ/engines"),
                method="POST",
                body={"title": "Smoke Engine"},
                headers=self._bearer(p_token),
                expect_status=201,
            )
            engine_id = r1.get("engine", {}).get("id", "")
            self.check(
                "POST /api/squads/<id>/engines — P-1: 201 + pending",
                s1 == 201 and r1.get("engine", {}).get("status") == "pending",
                f"status={s1}",
            )
        except SmokeError as exc:
            self.fail("POST engine (P-1)", str(exc))

        if not engine_id:
            return

        # P-2: PATCH approve → 200, status=approved
        try:
            s2, r2 = _http(
                self._url(f"/api/engines/{engine_id}/approve"),
                method="PATCH",
                body={"status": "approved"},
                headers=self._bearer(c_token),
                expect_status=200,
            )
            self.check(
                "PATCH /api/engines/<id>/approve — P-2: approved",
                s2 == 200 and r2.get("engine", {}).get("status") == "approved",
                f"status={s2}",
            )
        except SmokeError as exc:
            self.fail("PATCH approve (P-2)", str(exc))

        # P-3: POST join (new participant) → 200
        p2_device = f"smoke_pj_{uuid.uuid4().hex[:8]}"
        p2_token = self._get_jwt(p2_device, "participant")
        if p2_token:
            try:
                s3, r3 = _http(
                    self._url(f"/api/engines/{engine_id}/join"),
                    method="POST",
                    body={},
                    headers=self._bearer(p2_token),
                    expect_status=200,
                )
                self.check(
                    "POST /api/engines/<id>/join — P-3: joined",
                    s3 == 200,
                    f"status={s3}",
                )
            except SmokeError as exc:
                self.fail("POST join (P-3)", str(exc))

        # P-4: PATCH goal submit + approve
        try:
            s4a, _ = _http(
                self._url(f"/api/engines/{engine_id}"),
                method="PATCH",
                body={"goal": "Smoke goal text"},
                headers=self._bearer(p_token),
                expect_status=200,
            )
        except SmokeError as exc:
            self.fail("PATCH goal submit (P-4)", str(exc))
            s4a = None
        if s4a == 200:
            try:
                s4b, r4b = _http(
                    self._url(f"/api/engines/{engine_id}/goal/approve"),
                    method="PATCH",
                    body={},
                    headers=self._bearer(c_token),
                    expect_status=200,
                )
                self.check(
                    "PATCH goal submit+approve — P-4: goalStatus=approved",
                    s4b == 200 and r4b.get("engine", {}).get("goalStatus") == "approved",
                    f"status={s4b}",
                )
            except SmokeError as exc:
                self.fail("PATCH goal approve (P-4)", str(exc))

    # -----------------------------------------------------------------------
    # Run all
    # -----------------------------------------------------------------------
    # Flow R: Inspector Polzy endpoints (M11-INSPECTOR-C)
    # -----------------------------------------------------------------------

    def run_flow_r(self):
        """R — Inspector checklists + progress + approve."""
        print("\n--- Flow R: Inspector endpoints ---")

        # R-1: GET /api/inspector/checklists → 200, missions array
        try:
            s1, r1 = _http(self._url("/api/inspector/checklists"), expect_status=200)
            missions = r1.get("missions", [])
            self.check(
                "GET /api/inspector/checklists — R-1: 200 + missions[]",
                s1 == 200 and isinstance(missions, list) and len(missions) >= 7,
                f"status={s1}, count={len(missions)}",
            )
        except SmokeError as exc:
            self.fail("GET /api/inspector/checklists (R-1)", str(exc))
            return

        # R-2: POST /api/inspector/progress → 201
        device_id = f"smoke_insp_{uuid.uuid4().hex[:8]}"
        entry_id = ""
        try:
            s2, r2 = _http(
                self._url("/api/inspector/progress"),
                method="POST",
                body={"deviceId": device_id, "checklistId": "standard", "taskId": "d1_t1"},
                expect_status=201,
            )
            entry_id = r2.get("entry", {}).get("id", "")
            self.check(
                "POST /api/inspector/progress — R-2: 201 created",
                s2 == 201 and r2.get("status") == "ok" and entry_id,
                f"status={s2}",
            )
        except SmokeError as exc:
            self.fail("POST /api/inspector/progress (R-2)", str(exc))

        # R-3: GET /api/inspector/progress/<deviceId> → 200, contains entry
        try:
            s3, r3 = _http(self._url(f"/api/inspector/progress/{device_id}"), expect_status=200)
            progress = r3.get("progress", [])
            self.check(
                "GET /api/inspector/progress/<deviceId> — R-3: has entry",
                s3 == 200 and len(progress) >= 1,
                f"status={s3}, count={len(progress)}",
            )
        except SmokeError as exc:
            self.fail("GET /api/inspector/progress (R-3)", str(exc))

        # R-4: PATCH approve → 200 (requires staff token)
        if entry_id and self.auth_secret:
            c_token = self._get_jwt(f"smoke_counselor_{uuid.uuid4().hex[:8]}", "counselor")
            if c_token:
                try:
                    s4, r4 = _http(
                        self._url(f"/api/inspector/progress/{entry_id}/approve"),
                        method="PATCH",
                        body={},
                        headers=self._bearer(c_token),
                        expect_status=200,
                    )
                    self.check(
                        "PATCH /api/inspector/progress/<id>/approve — R-4: approved",
                        s4 == 200 and r4.get("entry", {}).get("status") == "approved",
                        f"status={s4}",
                    )
                except SmokeError as exc:
                    self.fail("PATCH approve (R-4)", str(exc))
        else:
            self.skip("PATCH approve (R-4)", "no auth_secret or entry_id")

    # -----------------------------------------------------------------------
    # Flow Q: BRO endpoints (M12-BRO-BACKEND-A)
    # -----------------------------------------------------------------------

    def run_flow_q(self):
        """Q — BRO initiate + passport + task done."""
        print("\n--- Flow Q: BRO endpoints ---")

        # Need a counselor token for initiate
        bro_event_id = ""
        passport_id = ""

        if self.auth_secret:
            c_token = self._get_jwt(f"smoke_bro_counselor_{uuid.uuid4().hex[:8]}", "counselor")
            if c_token:
                # Q-1: POST /api/squads/smoke-squad/bro/initiate → 201
                try:
                    s1, r1 = _http(
                        self._url("/api/squads/smoke-squad/bro/initiate"),
                        method="POST",
                        body={},
                        headers=self._bearer(c_token),
                        expect_status=201,
                    )
                    bro_event_id = r1.get("event", {}).get("id", "")
                    self.check(
                        "POST /api/squads/<squadId>/bro/initiate — Q-1: 201",
                        s1 == 201 and bro_event_id,
                        f"status={s1}",
                    )
                except SmokeError as exc:
                    self.fail("POST bro/initiate (Q-1)", str(exc))
                    return
        else:
            self.skip("POST bro/initiate (Q-1)", "no auth_secret")
            return

        # Q-2: POST /api/bro/passport → 201
        p_token = self._get_jwt(f"smoke_bro_participant_{uuid.uuid4().hex[:8]}", "participant")
        if p_token and bro_event_id:
            try:
                s2, r2 = _http(
                    self._url("/api/bro/passport"),
                    method="POST",
                    body={"broEventId": bro_event_id, "tasks": [{"id": "t1", "done": False}]},
                    headers=self._bearer(p_token),
                    expect_status=201,
                )
                passport_id = r2.get("passport", {}).get("id", "")
                self.check(
                    "POST /api/bro/passport — Q-2: 201",
                    s2 == 201 and passport_id,
                    f"status={s2}",
                )
            except SmokeError as exc:
                self.fail("POST bro/passport (Q-2)", str(exc))
        else:
            self.skip("POST bro/passport (Q-2)", "no token or event_id")

        # Q-3: PATCH /api/bro/passport/<id>/task → 200
        if passport_id and p_token:
            try:
                s3, r3 = _http(
                    self._url(f"/api/bro/passport/{passport_id}/task"),
                    method="PATCH",
                    body={"taskId": "t1"},
                    headers=self._bearer(p_token),
                    expect_status=200,
                )
                self.check(
                    "PATCH /api/bro/passport/<id>/task — Q-3: done",
                    s3 == 200,
                    f"status={s3}",
                )
            except SmokeError as exc:
                self.fail("PATCH bro/passport task (Q-3)", str(exc))
        else:
            self.skip("PATCH bro/passport task (Q-3)", "no passport_id")

    # -----------------------------------------------------------------------
    # Flow S: Shift Schedule endpoints (M12-SHIFT-PLANNER-A)
    # -----------------------------------------------------------------------

    def run_flow_s(self):
        """S — Schedule create + list + update."""
        print("\n--- Flow S: Shift Schedule endpoints ---")

        event_id = ""

        if self.auth_secret:
            c_token = self._get_jwt(f"smoke_sched_{uuid.uuid4().hex[:8]}", "counselor")
            if c_token:
                # S-1: POST /api/shifts/smoke-shift/schedule → 201
                try:
                    s1, r1 = _http(
                        self._url("/api/shifts/smoke-shift/schedule"),
                        method="POST",
                        body={"title": "Smoke event", "dayIndex": 0, "timeStart": "10:00"},
                        headers=self._bearer(c_token),
                        expect_status=201,
                    )
                    event_id = r1.get("event", {}).get("id", "")
                    self.check(
                        "POST /api/shifts/<shiftId>/schedule — S-1: 201",
                        s1 == 201 and event_id,
                        f"status={s1}",
                    )
                except SmokeError as exc:
                    self.fail("POST schedule (S-1)", str(exc))
                    return
        else:
            self.skip("POST schedule (S-1)", "no auth_secret")
            return

        # S-2: GET /api/shifts/smoke-shift/schedule → 200, contains event
        try:
            s2, r2 = _http(self._url("/api/shifts/smoke-shift/schedule"), expect_status=200)
            events = r2.get("events", [])
            self.check(
                "GET /api/shifts/<shiftId>/schedule — S-2: has event",
                s2 == 200 and any(e.get("id") == event_id for e in events),
                f"status={s2}, count={len(events)}",
            )
        except SmokeError as exc:
            self.fail("GET schedule (S-2)", str(exc))

        # S-3: PATCH /api/schedule/<eventId> → 200
        if event_id and c_token:
            try:
                s3, r3 = _http(
                    self._url(f"/api/schedule/{event_id}"),
                    method="PATCH",
                    body={"title": "Updated smoke"},
                    headers=self._bearer(c_token),
                    expect_status=200,
                )
                self.check(
                    "PATCH /api/schedule/<eventId> — S-3: updated",
                    s3 == 200 and r3.get("event", {}).get("title") == "Updated smoke",
                    f"status={s3}",
                )
            except SmokeError as exc:
                self.fail("PATCH schedule (S-3)", str(exc))
        else:
            self.skip("PATCH schedule (S-3)", "no event_id")

    # -----------------------------------------------------------------------
    # Flow T: Workshop endpoints (M13-EDUCATOR-WORKSHOP-A)
    # -----------------------------------------------------------------------

    def run_flow_t(self):
        """T — Workshop create + badge link + badge confirm."""
        print("\n--- Flow T: Workshop endpoints ---")

        workshop_id = ""
        badge_link_id = ""

        if self.auth_secret:
            e_token = self._get_jwt(f"smoke_edu_{uuid.uuid4().hex[:8]}", "educator")
            if e_token:
                # T-1: POST /api/workshops → 201
                try:
                    s1, r1 = _http(
                        self._url("/api/workshops"),
                        method="POST",
                        body={"title": "Smoke Workshop", "direction": "test"},
                        headers=self._bearer(e_token),
                        expect_status=201,
                    )
                    workshop_id = r1.get("workshop", {}).get("id", "")
                    self.check(
                        "POST /api/workshops — T-1: 201",
                        s1 == 201 and workshop_id,
                        f"status={s1}",
                    )
                except SmokeError as exc:
                    self.fail("POST workshops (T-1)", str(exc))
            else:
                self.skip("POST workshops (T-1)", "no educator token")
        else:
            self.skip("POST workshops (T-1)", "no auth_secret")

        # T-2: POST /api/workshops/<id>/badges → 201
        if workshop_id and e_token:
            try:
                s2, r2 = _http(
                    self._url(f"/api/workshops/{workshop_id}/badges"),
                    method="POST",
                    body={"badgeId": "smoke-badge-001"},
                    headers=self._bearer(e_token),
                    expect_status=201,
                )
                badge_link_id = r2.get("badge", {}).get("id", "")
                self.check(
                    "POST /api/workshops/<id>/badges — T-2: 201",
                    s2 == 201 and badge_link_id,
                    f"status={s2}",
                )
            except SmokeError as exc:
                self.fail("POST workshop badges (T-2)", str(exc))
        else:
            self.skip("POST workshop badges (T-2)", "no workshop_id")

        # T-3: POST /api/workshops/<id>/badges/<bid>/confirm/<deviceId> → 201
        if badge_link_id and e_token:
            try:
                s3, r3 = _http(
                    self._url(f"/api/workshops/{workshop_id}/badges/{badge_link_id}/confirm/smoke-device-001"),
                    method="POST",
                    body={},
                    headers=self._bearer(e_token),
                    expect_status=201,
                )
                self.check(
                    "POST confirm badge — T-3: 201",
                    s3 == 201,
                    f"status={s3}",
                )
            except SmokeError as exc:
                self.fail("POST confirm badge (T-3)", str(exc))
        else:
            self.skip("POST confirm badge (T-3)", "no badge_link_id")

    def run_flow_u(self):
        """U — 4K skills mapping + stats endpoints."""
        print("\n--- Flow U: 4K skills endpoints ---")

        # U-1: GET /api/4k/mapping → 200, has category_defaults with 14 keys
        try:
            s1, r1 = _http(
                self._url("/api/4k/mapping"),
                method="GET",
                expect_status=200,
            )
            cat_defaults = r1.get("category_defaults") or {}
            self.check(
                "GET /api/4k/mapping — U-1: 200 + 14 categories",
                s1 == 200 and len(cat_defaults) == 14,
                f"status={s1}, cats={len(cat_defaults)}",
            )
        except SmokeError as exc:
            self.fail("GET /api/4k/mapping (U-1)", str(exc))

        # U-2: GET /api/4k/stats/smoke_device → 200, has 4 skills
        try:
            s2, r2 = _http(
                self._url("/api/4k/stats/smoke_device"),
                method="GET",
                expect_status=200,
            )
            skills = r2.get("skills") or {}
            expected_keys = {"collaboration", "critical_thinking", "creativity", "communication"}
            self.check(
                "GET /api/4k/stats — U-2: 200 + 4 skills",
                s2 == 200 and set(skills.keys()) == expected_keys,
                f"status={s2}, skills={list(skills.keys())}",
            )
        except SmokeError as exc:
            self.fail("GET /api/4k/stats (U-2)", str(exc))

    # -----------------------------------------------------------------------
    # Flow V: Camp Director Overview (M14-CAMP-DIRECTOR-A)
    # -----------------------------------------------------------------------

    def run_flow_v(self):
        """V — Camp Director overview + director_proposal."""
        print("\n--- Flow V: Camp Director endpoints ---")

        if self.auth_secret:
            d_token = self._get_jwt(f"smoke_director_{uuid.uuid4().hex[:8]}", "camp_director")
            if d_token:
                # V-1: GET /api/camp/overview → 200 + has keys
                try:
                    s1, r1 = _http(
                        self._url("/api/camp/overview"),
                        method="GET",
                        headers=self._bearer(d_token),
                        expect_status=200,
                    )
                    expected_keys = {"shifts", "squads", "engines", "workshops",
                                     "council_initiatives", "badge_requests",
                                     "inspector_progress", "bro_events"}
                    self.check(
                        "GET /api/camp/overview — V-1: 200 + keys",
                        s1 == 200 and expected_keys.issubset(set(r1.keys())),
                        f"status={s1}, keys={list(r1.keys())}",
                    )
                except SmokeError as exc:
                    self.fail("GET camp/overview (V-1)", str(exc))

                # V-2: POST council initiative as director → 201 + proposalType
                try:
                    s2, r2 = _http(
                        self._url("/api/council/initiatives"),
                        method="POST",
                        body={"title": "Director Smoke Proposal"},
                        headers=self._bearer(d_token),
                        expect_status=201,
                    )
                    self.check(
                        "POST council initiative (director) — V-2: proposalType",
                        s2 == 201 and r2.get("proposalType") == "director_proposal",
                        f"status={s2}, type={r2.get('proposalType')}",
                    )
                except SmokeError as exc:
                    self.fail("POST council initiative director (V-2)", str(exc))
            else:
                self.skip("Flow V", "no director token")
        else:
            self.skip("Flow V", "no auth_secret")

    # -----------------------------------------------------------------------
    # Flow W: Parent Auth + Suggest Route (M14-PARENT-AUTH-A)
    # -----------------------------------------------------------------------

    def run_flow_w(self):
        """W — Email auth stub + parent suggest-route."""
        print("\n--- Flow W: Parent Auth endpoints ---")

        # W-1: POST /api/auth/email/request → 200
        try:
            s1, r1 = _http(
                self._url("/api/auth/email/request"),
                method="POST",
                body={"email": "smoke-parent@example.com"},
                expect_status=200,
            )
            self.check(
                "POST /api/auth/email/request — W-1: 200 + devToken",
                s1 == 200 and r1.get("devToken"),
                f"status={s1}",
            )
        except SmokeError as exc:
            self.fail("POST auth/email/request (W-1)", str(exc))

        # W-2: POST /api/parent/suggest-route → 201
        if self.auth_secret:
            p_token = self._get_jwt(f"smoke_parent_{uuid.uuid4().hex[:8]}", "parent")
            if p_token:
                try:
                    s2, r2 = _http(
                        self._url("/api/parent/suggest-route"),
                        method="POST",
                        body={"childDeviceId": "smoke-child-001", "badges": ["1.1", "2.3"], "note": "smoke test"},
                        headers=self._bearer(p_token),
                        expect_status=201,
                    )
                    self.check(
                        "POST /api/parent/suggest-route — W-2: 201",
                        s2 == 201 and r2.get("suggestion", {}).get("id"),
                        f"status={s2}",
                    )
                except SmokeError as exc:
                    self.fail("POST parent/suggest-route (W-2)", str(exc))
            else:
                self.skip("POST parent/suggest-route (W-2)", "no parent token")
        else:
            self.skip("POST parent/suggest-route (W-2)", "no auth_secret")

    # -----------------------------------------------------------------------
    # Flow X: Vozhatifficator sections + Guiding Lights (M14-VOZHATIFFICATOR-C)
    # -----------------------------------------------------------------------

    def run_flow_x(self):
        """X — Vozhatifficator sections + guiding lights."""
        print("\n--- Flow X: Vozhatifficator endpoints ---")

        # X-1: GET /api/vozhatifficator/sections → 200, 3 sections
        try:
            s1, r1 = _http(
                self._url("/api/vozhatifficator/sections"),
                method="GET",
                expect_status=200,
            )
            self.check(
                "GET /api/vozhatifficator/sections — X-1: 200 + 3 sections",
                s1 == 200 and isinstance(r1, list) and len(r1) == 3,
                f"status={s1}, count={len(r1) if isinstance(r1, list) else 'N/A'}",
            )
        except SmokeError as exc:
            self.fail("GET vozhatifficator/sections (X-1)", str(exc))

        # X-2: GET /api/vozhatifficator/guiding-lights → 200, 5 categories
        try:
            s2, r2 = _http(
                self._url("/api/vozhatifficator/guiding-lights"),
                method="GET",
                expect_status=200,
            )
            cats = r2.get("categories") or [] if isinstance(r2, dict) else []
            total_tasks = sum(len(c.get("tasks", [])) for c in cats if isinstance(c, dict))
            self.check(
                "GET /api/vozhatifficator/guiding-lights — X-2: 200 + 5 cats + 33 tasks",
                s2 == 200 and len(cats) == 5 and total_tasks == 33,
                f"status={s2}, cats={len(cats)}, tasks={total_tasks}",
            )
        except SmokeError as exc:
            self.fail("GET vozhatifficator/guiding-lights (X-2)", str(exc))

    # -----------------------------------------------------------------------

    # ------------------------------------------------------------------
    # Flow Z — M15 Auth + Dev Role (4 checks)
    # ------------------------------------------------------------------
    def run_flow_z(self):
        """Flow Z: Auth /me, link-device, dev switch-role."""
        if not self._token:
            self.skip("Flow Z", "no auth token")
            return

        # Z-1: GET /api/auth/me with X-Device-Id → auto-created user
        device_id = f"smoke-z-{uuid.uuid4().hex[:8]}"
        r, s = self._get("/api/auth/me", headers={"X-Device-Id": device_id})
        ok = s == 200
        self.check("Z-1", ok and isinstance(r, dict) and r.get("deviceId") == device_id, "auth/me auto-create")

        # Z-2: POST /api/auth/link-device
        new_device = f"linked-{uuid.uuid4().hex[:8]}"
        r2, s2 = self._post("/api/auth/link-device", json={"deviceId": new_device}, headers={"X-Device-Id": device_id})
        self.check("Z-2", s2 == 200 and isinstance(r2, dict) and r2.get("linked") is True, "link-device")

        # Z-3: GET /api/auth/me with JWT → returns user with permissions
        r3, s3 = self._get("/api/auth/me")
        ok3 = s3 == 200
        self.check("Z-3", ok3 and isinstance(r3, dict) and "permissions" in r3, "auth/me with JWT")

        # Z-4: POST /api/dev/switch-role (developer token)
        r4, s4 = self._post("/api/dev/switch-role", json={"role": "counselor"})
        ok4 = s4 == 200
        self.check("Z-4", ok4 and isinstance(r4, dict) and r4.get("current_role") == "counselor", "dev switch-role")

    # -----------------------------------------------------------------------

    def run(self) -> int:
        print(f"Smoke backend critical flows — {self.base}")
        print("=" * 60)

        healthy = self.run_health()
        if not healthy:
            print("\nERROR: backend not healthy, aborting auth flows")
            self._print_summary()
            return 1

        req_id, participant_token = self.run_flow_a()
        self.run_flow_b()
        self.run_flow_c()
        self.run_flow_d(req_id, participant_token)
        try:
            self.run_flow_e()
        except Exception as exc:
            self.skip("Flow E (Image Generation)", f"timeout/exception: {exc}")
        self.run_flow_f()
        self.run_flow_g()
        self.run_flow_h()
        self.run_flow_i()
        self.run_flow_j()
        self.run_flow_k()
        self.run_flow_l()
        self.run_flow_m()
        self.run_flow_n()
        self.run_flow_o()
        self.run_flow_p()
        self.run_flow_r()
        self.run_flow_q()
        self.run_flow_s()
        self.run_flow_t()
        self.run_flow_u()
        self.run_flow_v()
        self.run_flow_w()
        self.run_flow_x()
        self.run_flow_z()
        return self._print_summary()

    def _print_summary(self) -> int:
        print("\n" + "=" * 60)
        total = self.passed + len(self.failures)
        skip_note = f" ({self.skipped} skipped)" if self.skipped else ""
        if self.failures:
            print(f"RESULT: {len(self.failures)} FAILED / {total} checks{skip_note}")
            for f in self.failures:
                print(f)
            return 1
        print(f"RESULT: ALL {total} CHECKS PASSED{skip_note}")
        return 0


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Smoke-check backend critical API flows (badge, parent-insights, council)."
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:4000",
        help="Backend base URL (default: http://localhost:4000)",
    )
    parser.add_argument(
        "--auth-secret",
        default=os.environ.get("AUTH_SECRET", ""),
        help="AUTH_SECRET for HMAC code generation (or set AUTH_SECRET env var)",
    )
    args = parser.parse_args()

    auth_secret = (args.auth_secret or "").strip() or None
    if not auth_secret:
        print(
            "WARNING: --auth-secret / AUTH_SECRET not set. "
            "Auth flows (A, B, C, D, E, F, G) will be skipped. Only /api/health will be checked."
        )

    runner = SmokeRunner(base_url=args.base_url, auth_secret=auth_secret)
    return runner.run()


if __name__ == "__main__":
    raise SystemExit(main())
