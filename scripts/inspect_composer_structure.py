#!/usr/bin/env python3
import os
import sqlite3
import json
from pathlib import Path

GLOBAL_DB = Path(os.environ.get("APPDATA", "")) / "Cursor" / "User" / "globalStorage" / "state.vscdb"
conn = sqlite3.connect(str(GLOBAL_DB))
cur = conn.cursor()
cur.execute("SELECT key, length(value), value FROM cursorDiskKV WHERE key LIKE 'composerData:%' ORDER BY length(value) DESC LIMIT 1")
key, ln, value = cur.fetchone()
print(f"Using largest: {key} ({ln} bytes)")
conn.close()

data = json.loads(value.decode() if isinstance(value, bytes) else value)
print("Top-level keys:", list(data.keys())[:15])
if "conversation" in data:
    print("conversation length:", len(data["conversation"]))
    if data["conversation"]:
        print("First msg keys:", list(data["conversation"][0].keys()))
if "conversationMap" in data:
    cm = data["conversationMap"]
    print("conversationMap type:", type(cm))
    if isinstance(cm, dict):
        print("conversationMap keys (sample):", list(cm.keys())[:5])
        for kid, v in list(cm.items())[:1]:
            print("  Sample value keys:", list(v.keys()) if isinstance(v, dict) else type(v))
if "fullConversationHeadersOnly" in data:
    fch = data["fullConversationHeadersOnly"]
    print("fullConversationHeadersOnly len:", len(fch) if isinstance(fch, list) else "N/A")
    if isinstance(fch, list) and fch:
        print("First item keys:", list(fch[0].keys()) if isinstance(fch[0], dict) else type(fch[0]))
        print("First item:", json.dumps(fch[0], ensure_ascii=False)[:500])
