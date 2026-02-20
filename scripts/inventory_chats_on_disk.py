#!/usr/bin/env python3
"""
Диагностика: какие чаты есть в бэкапе и в текущей базе.
Показывает все composers, чтобы понять, обрабатываются ли все.
"""
import sqlite3
import json
from pathlib import Path

APPDATA = Path(r"C:\Users\stepa\AppData\Roaming\Cursor\User")
WS_BACKUP = APPDATA / "workspaceStorage" / "8bbc87721bac49136816058c5c393a85" / "state.vscdb.backup"
WS_MAIN = APPDATA / "workspaceStorage" / "8bbc87721bac49136816058c5c393a85" / "state.vscdb"
GLOBAL_BACKUP = APPDATA / "globalStorage" / "state.vscdb.backup"
GLOBAL_MAIN = APPDATA / "globalStorage" / "state.vscdb"


def decode_val(v):
    if v is None:
        return ""
    if isinstance(v, bytes):
        return v.decode("utf-8", errors="replace")
    return str(v)


def get_composers(db_path, key_table="ItemTable", key="composer.composerData"):
    if not db_path.exists():
        return []
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute(f"SELECT value FROM {key_table} WHERE key = ?", (key,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return []
    data = json.loads(decode_val(row[0]))
    return data.get("allComposers", [])


def count_bubbles_for_composer(gl_cur, cid):
    gl_cur.execute("SELECT key FROM cursorDiskKV WHERE key LIKE ?", (f"bubbleId:{cid}:%",))
    return len(gl_cur.fetchall())


def main():
    print("=== Диагностика чатов на диске C ===\n")

    # Workspace backup
    backup_composers = get_composers(WS_BACKUP)
    print(f"Workspace BACKUP: {len(backup_composers)} чатов")
    for i, c in enumerate(backup_composers[:15]):
        name = (c.get("name") or c.get("title") or "(без имени)")[:50]
        cid = c.get("composerId", "?")[:16]
        print(f"  {i+1}. {name} ... {cid}")

    if len(backup_composers) > 15:
        print(f"  ... и ещё {len(backup_composers) - 15}")

    # Workspace main (current)
    main_composers = get_composers(WS_MAIN)
    main_ids = {c.get("composerId") for c in main_composers if c.get("composerId")}
    print(f"\nWorkspace MAIN (текущий): {len(main_composers)} чатов")

    # Deleted = in backup but not in main
    backup_ids = {c.get("composerId") for c in backup_composers if c.get("composerId")}
    deleted_ids = backup_ids - main_ids
    print(f"\nУдалённые (в backup, нет в main): {len(deleted_ids)}")

    # Global storage — composerData keys
    gl_db = GLOBAL_BACKUP if GLOBAL_BACKUP.exists() else GLOBAL_MAIN
    if gl_db.exists():
        conn = sqlite3.connect(str(gl_db))
        cur = conn.cursor()
        cur.execute("SELECT key FROM cursorDiskKV WHERE key LIKE 'composerData:%'")
        comp_keys = cur.fetchall()
        print(f"\nGlobal storage ({gl_db.name}): {len(comp_keys)} composerData записей")

        # Для удалённых — сколько пузырей есть
        for cid in list(deleted_ids)[:10]:
            n = count_bubbles_for_composer(cur, cid)
            cur.execute("SELECT value FROM cursorDiskKV WHERE key = ?", (f"composerData:{cid}",))
            row = cur.fetchone()
            has_content = "да" if (row and row[0]) else "нет"
            print(f"  {cid[:20]}... : {n} пузырей, composerData={has_content}")

        conn.close()
    else:
        print("\nGlobal DB не найден")

    # ItemTable в workspace — может быть другой ключ
    if WS_BACKUP.exists():
        conn = sqlite3.connect(str(WS_BACKUP))
        cur = conn.cursor()
        cur.execute("SELECT key FROM ItemTable WHERE key LIKE '%composer%' OR key LIKE '%chat%'")
        keys = cur.fetchall()
        print(f"\nWorkspace ItemTable ключи (composer/chat): {[k[0] for k in keys[:20]]}")
        conn.close()


if __name__ == "__main__":
    main()
