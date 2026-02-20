#!/usr/bin/env python3
"""Export full Cursor conversations from globalStorage to markdown"""
import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime

GLOBAL_DB = Path(os.environ.get("APPDATA", "")) / "Cursor" / "User" / "globalStorage" / "state.vscdb"
OUT_DIR = Path(r"d:\Development\Путеводитель web_new\docs\cursor_chats_export")

def format_msg(msg):
    if not isinstance(msg, dict):
        return ""
    role = "User" if msg.get("type") == 1 else "Assistant"
    ts = ""
    if "timingInfo" in msg and msg["timingInfo"]:
        t = msg["timingInfo"].get("clientStartTime", 0) / 1000
        ts = datetime.fromtimestamp(t).strftime("%Y-%m-%d %H:%M")
    parts = [f"**{role}** ({ts}):"]
    text = msg.get("text", "").strip()
    if text:
        parts.append(text)
    if "codeBlocks" in msg and msg["codeBlocks"]:
        for b in msg["codeBlocks"]:
            if isinstance(b, dict) and b.get("code"):
                parts.append(f"```{b.get('language','')}\n{b['code']}\n```")
    return "\n\n".join(parts)

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(GLOBAL_DB))
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'")
    rows = cur.fetchall()
    conn.close()

    for key, value in rows:
        if not value:
            continue
        cid = key.replace("composerData:", "")
        try:
            val = value.decode("utf-8") if isinstance(value, bytes) else value
            data = json.loads(val)
        except:
            continue
        conv = data.get("conversation") or []
        if not conv:
            continue
        lines = [f"# Chat {cid[:8]}...\n"]
        for msg in conv:
            lines.append(format_msg(msg))
            lines.append("\n---\n")
        path = OUT_DIR / f"chat_{cid[:8]}.md"
        path.write_text("\n".join(lines), encoding="utf-8")
        first_ts = conv[0].get("timingInfo", {}).get("clientStartTime", 0)
        dt = datetime.fromtimestamp(first_ts / 1000).strftime("%Y-%m-%d %H:%M") if first_ts else ""
        print(f"Exported {path.name} | {len(conv)} msgs | {dt}")

    print(f"\nSaved to {OUT_DIR}")

if __name__ == "__main__":
    main()
