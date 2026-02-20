#!/usr/bin/env python3
"""Проверить corrupted backup на наличие чатов."""
import sqlite3
from pathlib import Path

p = Path(r"C:\Users\stepa\AppData\Roaming\Cursor\User\globalStorage\state.vscdb.corrupted.1770668685121")
if not p.exists():
    print("Corrupted backup not found")
    exit(1)
c = sqlite3.connect(str(p))
cur = c.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()
print("Tables:", tables)
try:
    cur.execute("SELECT COUNT(*) FROM cursorDiskKV WHERE key LIKE 'composerData:%'")
    print("composerData count:", cur.fetchone()[0])
except Exception as e:
    print("Error:", e)
c.close()
