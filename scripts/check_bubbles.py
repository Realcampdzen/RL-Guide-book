import os
import sqlite3
import json
from pathlib import Path

gl = Path(os.environ.get("APPDATA", "")) / "Cursor" / "User" / "globalStorage" / "state.vscdb"
conn = sqlite3.connect(str(gl))
cur = conn.cursor()
cur.execute("SELECT key FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'")
bubbles = cur.fetchall()
print("bubbleId keys:", len(bubbles))
if bubbles:
    for r in bubbles[:5]:
        print(" ", r[0][:80])
    cur.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%' LIMIT 1")
    k, v = cur.fetchone()
    val = v.decode("utf-8") if isinstance(v, bytes) else (v or "")
    obj = json.loads(val)
    print("Keys in bubble:", list(obj.keys()))
    print("  type:", obj.get("type"), "text_len:", len(obj.get("text") or ""))
    if obj.get("text"):
        print("  text preview:", repr((obj["text"] or "")[:400]))
    # Get a few more samples with different types
    cur.execute("SELECT value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%' LIMIT 10")
    for row in cur.fetchall():
        v = row[0]
        val = v.decode("utf-8") if isinstance(v, bytes) else (v or "")
        try:
            o = json.loads(val)
            t = o.get("type"), len(o.get("text") or "")
            print("  sample:", t)
        except Exception as e:
            print("  parse err:", e)
conn.close()
