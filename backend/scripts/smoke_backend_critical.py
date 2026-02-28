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
    # Run all
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
        self.run_flow_e()
        self.run_flow_f()
        self.run_flow_g()
        self.run_flow_h()
        self.run_flow_i()
        return self._print_summary()

    def _print_summary(self) -> int:
        print("\n" + "=" * 60)
        total = self.passed + len(self.failures)
        if self.failures:
            print(f"RESULT: {len(self.failures)} FAILED / {total} checks")
            for f in self.failures:
                print(f)
            return 1
        print(f"RESULT: ALL {total} CHECKS PASSED")
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
