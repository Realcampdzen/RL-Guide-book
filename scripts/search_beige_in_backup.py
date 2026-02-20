#!/usr/bin/env python3
"""Search for 'beige' or 'бежев' in Cursor backup DB."""
import sqlite3
from pathlib import Path

ap = Path(r"C:\Users\stepa\AppData\Roaming\Cursor\User")
glob_db = ap / "globalStorage" / "state.vscdb.backup"
if not glob_db.exists():
    glob_db = ap / "globalStorage" / "state.vscdb"

conn = sqlite3.connect(str(glob_db))
cur = conn.cursor()
cur.execute("SELECT key, value FROM cursorDiskKV WHERE value LIKE '%бежев%' OR value LIKE '%beige%'")
found = []
for row in cur.fetchall():
    try:
        v = row[1].decode("utf-8", errors="replace") if isinstance(row[1], bytes) else str(row[1])
        if "бежев" in v or "beige" in v.lower():
            found.append((row[0][:100], v[:800]))
    except Exception:
        pass
conn.close()

for k, v in found[:10]:
    print("KEY:", k)
    print("SNIP:", v[:600])
    print("---")
print("Total matches:", len(found))
