#!/usr/bin/env python3
"""
Экспорт ВСЕХ чатов из global storage.
- По умолчанию: state.vscdb.backup (128 composerData)
- С --corrupted: state.vscdb.corrupted.* (217 composerData — старый бэкап с большим числом чатов)
"""
import argparse
import sqlite3
import json
from pathlib import Path

APPDATA = Path(r"C:\Users\stepa\AppData\Roaming\Cursor\User")
GLOBAL_BACKUP = APPDATA / "globalStorage" / "state.vscdb.backup"
GLOBAL_MAIN = APPDATA / "globalStorage" / "state.vscdb"
CORRUPTED = list(APPDATA.glob("globalStorage/state.vscdb.corrupted.*"))
OUT_DIR = Path(r"d:\Development\Путеводитель web_new\docs")


def decode_val(v):
    if v is None:
        return ""
    if isinstance(v, bytes):
        return v.decode("utf-8", errors="replace")
    return str(v)


def get_bubble_text(b):
    text = b.get("text") or ""
    if len(text) > 6000:
        text = text[:6000] + "\n\n...(обрезано)"
    return text


def get_title(comp_data, cid):
    h = comp_data.get("fullConversationHeadersOnly") or comp_data.get("bubbles") or []
    if isinstance(h, dict):
        h = list(h.values()) if h else []
    for x in h[:3]:
        if isinstance(x, dict) and x.get("text"):
            t = str(x.get("text", ""))[:100]
            if t:
                return t
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--corrupted", action="store_true", help="Экспорт из corrupted backup (217 чатов)")
    args = parser.parse_args()

    if args.corrupted and CORRUPTED:
        db_path = CORRUPTED[0]
        out_file = OUT_DIR / "ALL_CHATS_FROM_CORRUPTED_BACKUP.md"
        print(f"Источник: corrupted backup ({db_path.name})")
    else:
        db_path = GLOBAL_BACKUP if GLOBAL_BACKUP.exists() else GLOBAL_MAIN
        out_file = OUT_DIR / "ALL_CHATS_FROM_GLOBAL.md"
        print(f"Источник: {db_path.name}")

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'")
    rows = cur.fetchall()
    print(f"Всего composerData: {len(rows)}")

    lines = [f"# Все чаты из {db_path.name} ({len(rows)} шт.)\n"]
    exported = 0

    for key, val in rows:
        if not val:
            continue
        cid = key.replace("composerData:", "")
        try:
            data = json.loads(decode_val(val))
        except Exception:
            lines.append(f"\n## composerId: {cid[:24]}...\n*Ошибка парсинга*\n")
            continue

        title = get_title(data, cid)
        headers = data.get("fullConversationHeadersOnly") or data.get("bubbles") or []
        if isinstance(headers, dict):
            headers = list(headers.values()) if headers else []
        if not headers:
            lines.append(f"\n## {title or '(без названия)'}\n`{cid[:20]}...`\n*Пусто*\n")
            continue

        lines.append(f"\n## {title or '(без названия)'}\n`{cid[:20]}...`\n")
        exported += 1

        for h in headers[:150]:
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
                who = "User" if (h.get("type") == 1 if isinstance(h, dict) else False) else "Assistant"
                lines.append(f"\n### {who}\n\n{text}\n")
            except Exception:
                pass

    conn.close()
    out_file.write_text("\n".join(lines), encoding="utf-8")
    print(f"Экспортировано {exported} чатов в {out_file}")


if __name__ == "__main__":
    main()
