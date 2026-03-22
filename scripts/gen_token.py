#!/usr/bin/env python3
# Gen token for role-based prod testing
# Usage: python scripts/gen_token.py [role] [deviceId] [campId]
# Roles: participant parent counselor educator shift_leader camp_director developer
import sys, os, time, json
from pathlib import Path

try:
    from dotenv import load_dotenv
    root = Path(__file__).resolve().parent.parent
    for f in [root / ".env", root / "backend" / ".env"]:
        if f.is_file():
            load_dotenv(f); break
except ImportError:
    for p in [".env", "backend/.env"]:
        if os.path.isfile(p):
            with open(p, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, _, v = line.partition("=")
                        os.environ.setdefault(k.strip(), v.strip().strip('"'))
            break

try:
    import jwt
except ImportError:
    print("pip install PyJWT"); sys.exit(1)

VALID = ["participant", "parent", "counselor", "educator", "shift_leader", "camp_director", "developer"]
ALIASES = {"dev":"developer","part":"participant","vozhaty":"counselor","sl":"shift_leader","dir":"camp_director","ped":"educator"}
SHIFTS = {"spring":"64f3ca208702", "summer":"b8a1e47c3d59"}

role      = ALIASES.get(sys.argv[1], sys.argv[1]) if len(sys.argv) > 1 else "developer"
device_id = (sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else f"test-{role}-device")
camp_id   = sys.argv[3] if len(sys.argv) > 3 else ""

if role not in VALID:
    print(f"Unknown role: {role}. Valid: {', '.join(VALID)}"); sys.exit(1)

secret = os.getenv("AUTH_JWT_SECRET","").strip()
if not secret:
    print("ERROR: AUTH_JWT_SECRET not found in .env"); sys.exit(1)

exp = int(time.time()) + 86400 * 30
payload = {"role": role, "campId": camp_id, "exp": exp, "deviceId": device_id}
token = jwt.encode(payload, secret, algorithm="HS256")

auth_obj = json.dumps({"role": role, "accessToken": token, "campId": camp_id, "exp": exp, "deviceId": device_id}, ensure_ascii=True)

cmd = (f"localStorage.setItem('rl_auth_v1', JSON.stringify({auth_obj}));"
       f"localStorage.setItem('rl_device_id_v1', '{device_id}');"
       f"location.reload();")

print(f"\n[OK] Token for role='{role}' device='{device_id}' campId='{camp_id or 'none'}'")
print(f"     Expires: {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime(exp))}\n")
print("-" * 70)
print("Paste into browser console (F12 -> Console):")
print("-" * 70)
print(cmd)
print("-" * 70)
print("\nShift IDs (use as campId for 3rd argument):")
for k, v in SHIFTS.items(): print(f"  {k:8} -> {v}")
print()
