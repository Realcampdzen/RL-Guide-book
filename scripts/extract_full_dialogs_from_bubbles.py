#!/usr/bin/env python3
"""
Извлекает полные диалоги (вопросы + ответы агентов) из Cursor storage.
Использует bubbleId:* записи в cursorDiskKV — там лежит текст сообщений.
"""
import os
import sqlite3
import json
from pathlib import Path
from datetime import datetime

APPDATA = Path(os.environ.get("APPDATA", ""))
WS_DB = APPDATA / "Cursor" / "User" / "workspaceStorage" / "8bbc87721bac49136816058c5c393a85" / "state.vscdb"
GLOBAL_DB = APPDATA / "Cursor" / "User" / "globalStorage" / "state.vscdb"
OUT_PATH = Path(r"d:\Development\Путеводитель web_new\docs\FULL_DIALOGS_WITH_RESPONSES.md")

TARGET_DATES = ("2026-02-18", "2026-02-19", "2026-02-20")


def ts_to_date(ms):
    if not ms:
        return None
    try:
        return datetime.fromtimestamp(ms / 1000).strftime("%Y-%m-%d %H:%M")
    except Exception:
        return None


def in_target_range(ms):
    if not ms:
        return False
    try:
        d = datetime.fromtimestamp(ms / 1000).strftime("%Y-%m-%d")
        return d in TARGET_DATES
    except Exception:
        return False


def decode_val(v):
    if v is None:
        return ""
    if isinstance(v, bytes):
        return v.decode("utf-8", errors="replace")
    return str(v)


def get_bubble_text(bubble_obj, max_len=12000):
    """Извлекает читаемый текст из bubble (user или assistant)."""
    text = bubble_obj.get("text") or ""
    tr_list = bubble_obj.get("toolResults") or []
    interp = bubble_obj.get("interpreterResults") or []
    # interpreterResults — вывод терминала
    if interp and not text:
        for item in interp[:10]:
            if isinstance(item, dict) and item.get("content"):
                text += str(item["content"]).strip() + "\n"
    # Если текст пустой, но есть toolResults — показываем команды/результаты
    if not text and tr_list:
        parts = []
        for tr in tr_list[:30]:
            name = tr.get("toolName") or tr.get("name") or "?"
            content = tr.get("result") or tr.get("content") or tr.get("output") or tr.get("text") or ""
            if content:
                s = str(content).strip()
                if len(s) > 500:
                    s = s[:500] + "\n... (обрезано)"
                parts.append(f"**[{name}]**\n{s}")
            else:
                parts.append(f"[{name}]")
        text = "\n\n".join(parts) if parts else "(tool calls без вывода)"
    elif text and tr_list:
        # Есть и текст, и tool results — добавляем результаты в конец
        extra = []
        for tr in tr_list[:15]:
            name = tr.get("toolName") or tr.get("name") or "?"
            content = tr.get("result") or tr.get("content") or tr.get("output")
            if content:
                s = str(content).strip()[:400]
                extra.append(f"[{name}]: {s}")
        if extra:
            text += "\n\n--- Вызовы инструментов ---\n" + "\n".join(extra)
    if len(text) > max_len:
        text = text[:max_len] + "\n\n... (обрезано)"
    return text


def main():
    if not WS_DB.exists():
        print(f"Workspace DB not found: {WS_DB}")
        return
    if not GLOBAL_DB.exists():
        print(f"Global DB not found: {GLOBAL_DB}")
        return

    gl_conn = sqlite3.connect(str(GLOBAL_DB))
    gl_cur = gl_conn.cursor()

    ws_conn = sqlite3.connect(str(WS_DB))
    ws_cur = ws_conn.cursor()

    ws_cur.execute("SELECT value FROM ItemTable WHERE key = 'composer.composerData'")
    row = ws_cur.fetchone()
    if not row or not row[0]:
        print("No composer.composerData in workspace")
        ws_conn.close()
        gl_conn.close()
        return

    data = json.loads(decode_val(row[0]))
    all_composers = data.get("allComposers", [])
    # Фильтр по датам
    target = [c for c in all_composers if c and in_target_range(c.get("lastUpdatedAt") or c.get("createdAt"))]
    # Плюс все если мало — возьмём последние 30 по дате
    if len(target) < 5:
        sorted_all = sorted(
            [c for c in all_composers if c and (c.get("lastUpdatedAt") or c.get("createdAt"))],
            key=lambda x: (x.get("lastUpdatedAt") or x.get("createdAt")) or 0,
            reverse=True,
        )
        target = sorted_all[:30]

    out = ["# Полные диалоги Cursor (вопросы + ответы агентов)\n"]
    out.append("Извлечено из bubbleId:* записей в cursorDiskKV.\n")

    for c in target:
        cid = c.get("composerId")
        name = c.get("name") or c.get("subtitle") or "Без названия"
        updated = ts_to_date(c.get("lastUpdatedAt") or c.get("createdAt"))
        if not cid:
            continue

        gl_cur.execute("SELECT value FROM cursorDiskKV WHERE key = ?", (f"composerData:{cid}",))
        comp_row = gl_cur.fetchone()
        if not comp_row or not comp_row[0]:
            out.append(f"\n## {name}\n")
            out.append(f"*{updated}* — нет composerData в global\n")
            continue

        comp_data = json.loads(decode_val(comp_row[0]))
        headers = comp_data.get("fullConversationHeadersOnly") or comp_data.get("bubbles") or []
        if isinstance(headers, dict):
            headers = list(headers.values()) if headers else []
        if not headers:
            out.append(f"\n## {name}\n")
            out.append(f"*{updated}* — пустой диалог\n")
            continue

        messages = []
        for h in headers[:80]:  # лимит на диалог
            if isinstance(h, str):
                bid = h
                msg_type = "?"
            else:
                bid = h.get("bubbleId") or h.get("serverBubbleId") or h.get("id")
                msg_type = "User" if h.get("type") == 1 else "Assistant"

            if not bid:
                continue

            gl_cur.execute(
                "SELECT value FROM cursorDiskKV WHERE key = ?",
                (f"bubbleId:{cid}:{bid}",),
            )
            b_row = gl_cur.fetchone()
            if not b_row or not b_row[0]:
                messages.append({"role": msg_type, "text": "(нет содержимого)"})
                continue

            try:
                b_obj = json.loads(decode_val(b_row[0]))
                text = get_bubble_text(b_obj)
                messages.append({"role": msg_type, "text": text or "(пусто)"})
            except Exception:
                messages.append({"role": msg_type, "text": "(ошибка парсинга)"})

        out.append(f"\n## {name}\n")
        out.append(f"*{updated}* | composerId: {cid[:8]}...\n")
        for m in messages:
            role = m["role"]
            txt = m["text"]
            out.append(f"\n### {role}\n\n{txt}\n")

    ws_conn.close()
    gl_conn.close()

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(out), encoding="utf-8")
    print(f"Exported to {OUT_PATH}")


if __name__ == "__main__":
    main()
