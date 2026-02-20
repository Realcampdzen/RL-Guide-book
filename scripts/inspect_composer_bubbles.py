"""Inspect composerData structure and bubble key format."""
import os
import json
import sqlite3
from pathlib import Path

APPDATA = Path(os.environ.get("APPDATA", ""))
WS_DB = APPDATA / "Cursor" / "User" / "workspaceStorage" / "8bbc87721bac49136816058c5c393a85" / "state.vscdb"
GLOBAL_DB = APPDATA / "Cursor" / "User" / "globalStorage" / "state.vscdb"

def decode(v):
    return v.decode("utf-8", errors="replace") if isinstance(v, bytes) else (v or "")

ws = sqlite3.connect(str(WS_DB))
gl = sqlite3.connect(str(GLOBAL_DB))

cur = ws.cursor()
cur.execute("SELECT value FROM ItemTable WHERE key = 'composer.composerData'")
row = cur.fetchone()
data = json.loads(decode(row[0]))
composers = data.get("allComposers", [])[:3]
print("Sample composer keys:", list(composers[0].keys()) if composers else [])

for c in composers:
    cid = c.get("composerId")
    print("\n--- Composer", cid[:16], "...")
    gcur = gl.cursor()
    gcur.execute("SELECT value FROM cursorDiskKV WHERE key = ?", (f"composerData:{cid}",))
    r = gcur.fetchone()
    if not r:
        print("  No composerData")
        continue
    cd = json.loads(decode(r[0]))
    print("  composerData keys:", list(cd.keys()))
    headers = cd.get("fullConversationHeadersOnly") or cd.get("bubbles") or []
    print("  headers type:", type(headers), "len:", len(headers) if hasattr(headers, "__len__") else "?")
    if headers:
        h0 = headers[0]
        print("  first header:", type(h0), repr(h0)[:200])
        if isinstance(h0, dict):
            print("  header keys:", list(h0.keys()))
        # Try to fetch first bubble
        bid = h0.get("bubbleId") or h0.get("serverBubbleId") if isinstance(h0, dict) else (h0 if isinstance(h0, str) else None)
        if bid:
            gcur.execute("SELECT value FROM cursorDiskKV WHERE key = ?", (f"bubbleId:{cid}:{bid}",))
            br = gcur.fetchone()
            if br:
                b = json.loads(decode(br[0]))
                print("  bubble text (first 200):", repr((b.get("text") or "")[:200]))
            else:
                print("  bubble NOT FOUND for key bubbleId:%s:%s" % (cid[:8], bid[:8]))
                # List actual keys for this composer
                gcur.execute("SELECT key FROM cursorDiskKV WHERE key LIKE ?", (f"bubbleId:{cid}:%",))
                keys = gcur.fetchall()
                print("  available bubble keys count:", len(keys))
                if keys:
                    print("  first key:", keys[0][0][:80])

ws.close()
gl.close()
