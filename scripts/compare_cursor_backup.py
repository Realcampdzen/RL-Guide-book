#!/usr/bin/env python3
"""Compare main vs backup state.vscdb for deleted chats"""
import sqlite3
import json
import os

base = r"C:\Users\stepa\AppData\Roaming\Cursor\User\workspaceStorage\8bbc87721bac49136816058c5c393a85"
backup_path = os.path.join(base, "state.vscdb.backup")
main_path = os.path.join(base, "state.vscdb")

def get_composers(path):
    db = sqlite3.connect(path)
    cur = db.cursor()
    cur.execute("SELECT value FROM ItemTable WHERE key = 'composer.composerData'")
    row = cur.fetchone()
    db.close()
    if not row or not row[0]:
        return []
    val = row[0].decode("utf-8") if isinstance(row[0], bytes) else row[0]
    d = json.loads(val)
    return d.get("allComposers", [])

print("=== MAIN ===")
main_c = get_composers(main_path)
for c in main_c:
    aid = c.get("composerId", "")[:8] if c.get("composerId") else "?"
    print(f"  {c.get('name','?')} | {aid}... | archived={c.get('isArchived')}")

print("\n=== BACKUP (19.02) ===")
if os.path.exists(backup_path):
    backup_c = get_composers(backup_path)
    for c in backup_c:
        aid = c.get("composerId", "")[:8] if c.get("composerId") else "?"
        print(f"  {c.get('name','?')} | {aid}... | archived={c.get('isArchived')}")
    
    main_ids = {x.get("composerId") for x in main_c}
    backup_ids = {x.get("composerId") for x in backup_c}
    only_in_backup = backup_ids - main_ids
    if only_in_backup:
        print("\n--- Only in BACKUP (possibly deleted) ---")
        for c in backup_c:
            if c.get("composerId") in only_in_backup:
                print(f"  {c.get('name')} | {c.get('composerId')}")
else:
    print("Backup not found")
