#!/usr/bin/env python3
"""Поиск 'бежев/beige' в corrupted backup (217 чатов)."""
import sqlite3
import json
from pathlib import Path

P = Path(r"C:\Users\stepa\AppData\Roaming\Cursor\User\globalStorage\state.vscdb.corrupted.1770668685121")
OUT = Path(r"d:\Development\Путеводитель web_new\docs\CORRUPTED_BACKUP_CHATS.md")


def decode_val(v):
    if v is None:
        return ""
    if isinstance(v, bytes):
        return v.decode("utf-8", errors="replace")
    return str(v)


def get_bubble_text(b):
    return (b.get("text") or "")[:2000]


def main():
    conn = sqlite3.connect(str(P))
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'")
    rows = cur.fetchall()
    print(f"Corrupted backup: {len(rows)} composerData")

    found = []
    lines = ["# Чаты из corrupted backup (217 vs 128 в current)\n"]

    for key, val in rows:
        if not val:
            continue
        cid = key.replace("composerData:", "")
        try:
            data = json.loads(decode_val(val))
        except Exception:
            continue
        headers = data.get("fullConversationHeadersOnly") or data.get("bubbles") or []
        if isinstance(headers, dict):
            headers = list(headers.values()) if headers else []
        for h in headers[:80]:
            bid = h.get("bubbleId") or h.get("serverBubbleId") or h.get("id") if isinstance(h, dict) else None
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
                    found.append((cid[:16], text[:400]))
                # сохраняем первый пузырь как заголовок
                if not lines or lines[-1].strip() == "":
                    title = (text or "(пусто)")[:80]
                    lines.append(f"\n## {title}\n`{cid[:20]}...`\n")
            except Exception:
                pass
            if len(lines) > 50:  # первые чаты для проверки
                break
        if len(lines) > 50:
            break

    conn.close()
    lines.append(f"\n\n---\nНайдено 'бежев/beige': {len(found)}\n")
    for cid, snip in found[:5]:
        lines.append(f"\n{cid}: {snip[:300]}...")
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Found beige: {len(found)}")
    print(f"Sample saved to {OUT}")


if __name__ == "__main__":
    main()
