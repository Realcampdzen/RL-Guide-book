"""Inspect one Assistant (type 2) bubble structure."""
import os
import json
import sqlite3
from pathlib import Path

APPDATA = Path(os.environ.get("APPDATA", ""))
GLOBAL_DB = APPDATA / "Cursor" / "User" / "globalStorage" / "state.vscdb"

def decode(v):
    return v.decode("utf-8", errors="replace") if isinstance(v, bytes) else (v or "")

gl = sqlite3.connect(str(GLOBAL_DB))
cur = gl.cursor()
# Find bubble containing "Запущен" (terminal output)
# Find assistant bubble with actual text (e.g. terminal commands)
cur.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%' AND value LIKE '%Get-ChildItem%' LIMIT 1")
row = cur.fetchone()
if row:
    key, val = row
    v = decode(val)
    obj = json.loads(v)
    print("=== Full keys with non-empty values ===")
    for k, x in obj.items():
        if x is not None and x != "" and x != [] and x != {}:
            s = str(x)[:200] if not isinstance(x, (list, dict)) else f"len={len(x)}"
            print(f"  {k}: {s}")
    # Check interpreterResults, toolFormerData
    ir = obj.get("interpreterResults") or []
    print("\ninterpreterResults count:", len(ir))
    tf = obj.get("toolFormerData")
    print("toolFormerData type:", type(tf), "len:", len(tf) if tf else 0)
    if isinstance(tf, dict):
        for k, v in list(tf.items())[:3]:
            print(f"  tf[{k}]:", repr(str(v)[:150]))
    elif isinstance(tf, list):
        for i, item in enumerate(tf[:3]):
            print("  tf item:", type(item), repr(str(item)[:120]))
    tr = obj.get("toolResults") or []
    print("\ntoolResults:", len(tr))
    for i, t in enumerate(tr[:2]):
        print("  tool", i, ":", list(t.keys()))
        for k in ("toolName", "result", "content", "output"):
            if k in t and t[k]:
                print(f"    {k}:", repr(str(t[k])[:200]))
gl.close()
