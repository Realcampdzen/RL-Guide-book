#!/usr/bin/env python3
"""
1) Extract full chats from workspace + globalStorage (composerData, bubbleId in cursorDiskKV)
2) Try backup state.vscdb to restore deleted chats
"""
import sqlite3
import json
import os
import base64
from pathlib import Path
from datetime import datetime

# Windows paths
BASE_WS = Path(os.environ.get("APPDATA", "")) / "Cursor" / "User" / "workspaceStorage" / "8bbc87721bac49136816058c5c393a85"
GLOBAL_DB = Path(os.environ.get("APPDATA", "")) / "Cursor" / "User" / "globalStorage" / "state.vscdb"

def list_cursor_disk_kv(db_path):
    """List cursorDiskKV keys if table exists"""
    if not db_path.exists():
        return []
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    if "cursorDiskKV" not in tables:
        conn.close()
        return []
    cur.execute("SELECT key, length(value) FROM cursorDiskKV")
    rows = cur.fetchall()
    conn.close()
    return rows

def extract_from_item_table(db_path, key_pattern="%"):
    """Extract from ItemTable"""
    if not db_path.exists():
        return []
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM ItemTable WHERE key LIKE ?", (key_pattern,))
    rows = cur.fetchall()
    conn.close()
    return rows

def main():
    print("=== Workspace state.vscdb ===")
    ws_db = BASE_WS / "state.vscdb"
    for k, ln in list_cursor_disk_kv(ws_db)[:20]:
        print(f"  {ln:>8} {k[:90]}")

    print("\n=== Global state.vscdb ===")
    for k, ln in list_cursor_disk_kv(GLOBAL_DB)[:30]:
        print(f"  {ln:>8} {k[:90]}")

    print("\n=== RESTORE OPTION ===")
    backup = BASE_WS / "state.vscdb.backup"
    if backup.exists():
        print(f"Backup exists: {backup}")
        print("To restore deleted chats: close Cursor, then run:")
        print(f"  copy \"{backup}\" \"{ws_db}\"")
        print("This replaces current state with backup from 19.02 - you get back 7 deleted composers.")
        print("WARNING: You will lose the 3 newest chats (Product roadmap, Supabase, Otobrajenie).")
    else:
        print("No backup found.")

if __name__ == "__main__":
    main()
