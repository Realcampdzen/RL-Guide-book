#!/usr/bin/env python3
"""
Ищем 'бежев' или 'beige' во ВСЕХ чатах в global storage,
не только в тех что привязаны к workspace backup.
"""
import sqlite3
import json
from pathlib import Path

APPDATA = Path(r"C:\Users\stepa\AppData\Roaming\Cursor\User")
GLOBAL_DB = APPDATA / "globalStorage" / "state.vscdb.backup"
if not GLOBAL_DB.exists():
    GLOBAL_DB = APPDATA / "globalStorage" / "state.vscdb"


def decode_val(v):
    if v is None:
        return ""
    if isinstance(v, bytes):
        return v.decode("utf-8", errors="replace")
    return str(v)


def get_bubble_text(bubble_obj):
    text = bubble_obj.get("text") or ""
    if len(text) > 2000:
        text = text[:2000]
    return text


def main():
    conn = sqlite3.connect(str(GLOBAL_DB))
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'")
    comp_rows = cur.fetchall()
    print(f"Всего composerData: {len(comp_rows)}")

    found_any = []
    for key, val in comp_rows:
        if not val:
            continue
        try:
            data = json.loads(decode_val(val))
            cid = key.replace("composerData:", "")
            headers = data.get("fullConversationHeadersOnly") or data.get("bubbles") or []
            if isinstance(headers, dict):
                headers = list(headers.values()) if headers else []
            for h in headers[:150]:
                bid = h.get("bubbleId") or h.get("serverBubbleId") or h.get("id") if isinstance(h, dict) else h
                if not bid:
                    continue
                cur.execute("SELECT value FROM cursorDiskKV WHERE key = ?", (f"bubbleId:{cid}:{bid}",))
                row = cur.fetchone()
                if not row or not row[0]:
                    continue
                try:
                    b = json.loads(decode_val(row[0]))
                    text = get_bubble_text(b)
                    if "бежев" in text or "beige" in text.lower():
                        found_any.append((cid[:20], text[:500]))
                except Exception:
                    pass
        except Exception:
            pass

    conn.close()
    print(f"\nНайдено совпадений 'бежев/beige': {len(found_any)}")
    for cid, snip in found_any[:10]:
        print(f"\n--- {cid} ---")
        print(snip[:400])


if __name__ == "__main__":
    main()
