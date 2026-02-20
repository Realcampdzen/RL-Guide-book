"""Проверить содержимое backup и before_restore"""
import sqlite3, json, os
base = r"C:\Users\stepa\AppData\Roaming\Cursor\User\workspaceStorage\8bbc87721bac49136816058c5c393a85"

def get_composers(path):
    db = sqlite3.connect(path)
    cur = db.cursor()
    cur.execute("SELECT value FROM ItemTable WHERE key = 'composer.composerData'")
    row = cur.fetchone()
    db.close()
    if not row or not row[0]:
        return []
    val = row[0].decode("utf-8") if isinstance(row[0], bytes) else row[0]
    return json.loads(val).get("allComposers", [])

target_ids = {"3b3d7efb", "d0d30200", "734b1c95", "e7cdec57", "327269e5", "2f0773b4", "c5f39c52", "a34e553c"}

for name in ["state.vscdb", "state.vscdb.backup", "state.vscdb.before_restore"]:
    p = os.path.join(base, name)
    if os.path.exists(p):
        c = get_composers(p)
        ids = {x.get("composerId", "")[:8] for x in c if x.get("composerId")}
        found = target_ids & ids
        print(f"{name}: {len(c)} чатов, целевых 8: {len(found)} {list(found)[:4]}")
    else:
        print(f"{name}: не найден")
