#!/usr/bin/env python3
"""
Извлекает содержимое удалённых чатов.
Берёт список composer ID из workspace backup, контент — из current global storage
(пузыри часто остаются в global даже после удаления из workspace).
"""
import os
import sqlite3
import json
from pathlib import Path

APPDATA = Path(os.environ.get("APPDATA", ""))
WS_BACKUP = APPDATA / "Cursor" / "User" / "workspaceStorage" / "8bbc87721bac49136816058c5c393a85" / "state.vscdb.backup"
WS_MAIN = APPDATA / "Cursor" / "User" / "workspaceStorage" / "8bbc87721bac49136816058c5c393a85" / "state.vscdb"
GLOBAL_BACKUP = APPDATA / "Cursor" / "User" / "globalStorage" / "state.vscdb.backup"
GLOBAL_MAIN = APPDATA / "Cursor" / "User" / "globalStorage" / "state.vscdb"
OUT_PATH = Path(r"d:\Development\Путеводитель web_new\docs\DELETED_CHATS_RECOVERED.md")

# Явные названия (из guide)
KNOWN_NAMES = {
    "e7cdec57": "Profile tab neon border styling",
    "2f0773b4": "Carousel background image",
    "c5f39c52": "Mobile and tablet button positioning",
}


def decode_val(v):
    if v is None:
        return ""
    if isinstance(v, bytes):
        return v.decode("utf-8", errors="replace")
    return str(v)


def get_bubble_text(bubble_obj, max_len=8000):
    text = bubble_obj.get("text") or ""
    tr_list = bubble_obj.get("toolResults") or []
    interp = bubble_obj.get("interpreterResults") or []
    if interp and not text:
        for item in interp[:10]:
            if isinstance(item, dict) and item.get("content"):
                text += str(item["content"]).strip() + "\n"
    if not text and tr_list:
        parts = []
        for tr in tr_list[:25]:
            name = tr.get("toolName") or tr.get("name") or "?"
            content = tr.get("result") or tr.get("content") or tr.get("output") or tr.get("text") or ""
            if content:
                s = str(content).strip()[:400]
                parts.append(f"[{name}] {s}")
            else:
                parts.append(f"[{name}]")
        text = "\n".join(parts) if parts else "(вызовы инструментов)"
    if len(text) > max_len:
        text = text[:max_len] + "\n\n... (обрезано)"
    return text


def main():
    if not WS_BACKUP.exists():
        print("Backup not found:", WS_BACKUP)
        return
    GLOBAL_DB = GLOBAL_BACKUP if GLOBAL_BACKUP.exists() else GLOBAL_MAIN
    if not GLOBAL_DB.exists():
        print("Global DB not found")
        return
    print("Using global:", GLOBAL_DB.name)

    # 1. Получить ID чатов только из бэкапа
    backup_conn = sqlite3.connect(str(WS_BACKUP))
    backup_cur = backup_conn.cursor()
    backup_cur.execute("SELECT value FROM ItemTable WHERE key = 'composer.composerData'")
    row = backup_cur.fetchone()
    backup_conn.close()
    if not row:
        print("No composer data in backup")
        return

    backup_data = json.loads(decode_val(row[0]))
    backup_composers = {c["composerId"]: c for c in backup_data.get("allComposers", []) if c.get("composerId")}

    main_conn = sqlite3.connect(str(WS_MAIN))
    main_cur = main_conn.cursor()
    main_cur.execute("SELECT value FROM ItemTable WHERE key = 'composer.composerData'")
    row = main_cur.fetchone()
    main_conn.close()
    main_ids = set()
    if row:
        main_data = json.loads(decode_val(row[0]))
        main_ids = {c["composerId"] for c in main_data.get("allComposers", []) if c.get("composerId")}

    deleted_ids = set(backup_composers.keys()) - main_ids
    # Если удалённых нет — экспортируем ВСЕ чаты из backup (для полноты)
    export_ids = deleted_ids if deleted_ids else set(backup_composers.keys())
    label = "удалённых" if deleted_ids else "всех (удалённых нет, backup=main)"
    print(f"Экспорт {len(export_ids)} {label} чатов")

    # 2. Извлечь контент из global
    gl_conn = sqlite3.connect(str(GLOBAL_DB))
    gl_cur = gl_conn.cursor()

    out = ["# Чаты из бэкапа (workspace backup 19.02)\n"]
    out.append(f"Содержимое {len(export_ids)} чатов.\n")

    for cid in export_ids:
        meta = backup_composers.get(cid, {})
        name = meta.get("name") or KNOWN_NAMES.get(cid[:8], "(без названия)")
        out.append(f"\n## {name}\n")
        out.append(f"composerId: `{cid[:16]}...`\n")

        gl_cur.execute("SELECT value FROM cursorDiskKV WHERE key = ?", (f"composerData:{cid}",))
        comp_row = gl_cur.fetchone()
        if not comp_row or not comp_row[0]:
            out.append("*Контент не найден в global storage (возможно, удалён).*\n")
            continue

        comp_data = json.loads(decode_val(comp_row[0]))
        headers = comp_data.get("fullConversationHeadersOnly") or comp_data.get("bubbles") or []
        if isinstance(headers, dict):
            headers = list(headers.values()) if headers else []
        if not headers:
            out.append("*Диалог пуст.*\n")
            continue

        for h in headers[:200]:
            if isinstance(h, str):
                bid = h
                msg_type = "?"
            else:
                bid = h.get("bubbleId") or h.get("serverBubbleId") or h.get("id")
                msg_type = "User" if h.get("type") == 1 else "Assistant"

            if not bid:
                continue

            gl_cur.execute("SELECT value FROM cursorDiskKV WHERE key = ?", (f"bubbleId:{cid}:{bid}",))
            b_row = gl_cur.fetchone()
            if not b_row or not b_row[0]:
                out.append(f"\n### {msg_type}\n*(нет содержимого)*\n")
                continue

            try:
                b_obj = json.loads(decode_val(b_row[0]))
                text = get_bubble_text(b_obj)
                out.append(f"\n### {msg_type}\n\n{text}\n")
            except Exception:
                out.append(f"\n### {msg_type}\n*(ошибка парсинга)*\n")

    gl_conn.close()

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(out), encoding="utf-8")
    print(f"Exported {len(export_ids)} chats to {OUT_PATH}")


if __name__ == "__main__":
    main()
