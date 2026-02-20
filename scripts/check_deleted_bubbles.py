import sqlite3
from pathlib import Path
import os
gl = Path(os.environ.get("APPDATA", "")) / "Cursor/User/globalStorage/state.vscdb"
conn = sqlite3.connect(str(gl))
cur = conn.cursor()
for cid in ["327269e5-a3f0-49a2-bbbf-fed3ebc210b6", "e7cdec57-1230-4943-8f89-8c8f67c6b84b", "2f0773b4-5e56-47ad-9796-727a6703a2e7"]:
    cur.execute("SELECT count(*) FROM cursorDiskKV WHERE key LIKE ?", ("bubbleId:" + cid + ":%",))
    n = cur.fetchone()[0]
    print(cid[:20], "... bubbles:", n)
conn.close()
