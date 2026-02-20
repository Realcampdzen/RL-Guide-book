#!/usr/bin/env python3
"""
Extract full dialogs (user + assistant) from Cursor storage.
Target: 18, 19, 20 Feb 2026
"""
import os
import sqlite3
import json
import base64
from pathlib import Path
from datetime import datetime

APPDATA = Path(os.environ.get("APPDATA", ""))
WS_DB = APPDATA / "Cursor" / "User" / "workspaceStorage" / "8bbc87721bac49136816058c5c393a85" / "state.vscdb"
GLOBAL_DB = APPDATA / "Cursor" / "User" / "globalStorage" / "state.vscdb"
OUT_PATH = Path(r"d:\Development\Путеводитель web_new\docs\FULL_DIALOGS_EXPORT.md")

TARGET_DATES = ("2026-02-18", "2026-02-19", "2026-02-20")

def ts_to_date(ms):
    if not ms:
        return None
    try:
        return datetime.fromtimestamp(ms / 1000).strftime("%Y-%m-%d %H:%M")
    except:
        return None

def in_target_range(ms):
    if not ms:
        return False
    try:
        d = datetime.fromtimestamp(ms / 1000).strftime("%Y-%m-%d")
        return d in TARGET_DATES
    except:
        return False

def extract_from_workspace():
    """Workspace ItemTable - composerData, generations"""
    if not WS_DB.exists():
        return []
    conn = sqlite3.connect(str(WS_DB))
    cur = conn.cursor()
    results = []
    
    # composer.composerData - list of composers with metadata
    cur.execute("SELECT value FROM ItemTable WHERE key = 'composer.composerData'")
    row = cur.fetchone()
    if row and row[0]:
        data = json.loads(row[0].decode() if isinstance(row[0], bytes) else row[0])
        for c in data.get("allComposers", []):
            ts = c.get("lastUpdatedAt") or c.get("createdAt")
            if in_target_range(ts):
                results.append({
                    "source": "workspace_composer",
                    "name": c.get("name", "?"),
                    "composerId": c.get("composerId"),
                    "created": ts_to_date(c.get("createdAt")),
                    "updated": ts_to_date(c.get("lastUpdatedAt")),
                    "subtitle": c.get("subtitle", ""),
                })
    
    # aiService.generations - user prompts with optional context
    cur.execute("SELECT value FROM ItemTable WHERE key = 'aiService.generations'")
    row = cur.fetchone()
    if row and row[0]:
        gens = json.loads(row[0].decode() if isinstance(row[0], bytes) else row[0])
        for g in gens:
            ts = g.get("unixMs")
            if in_target_range(ts):
                results.append({
                    "source": "generations",
                    "timestamp": ts_to_date(ts),
                    "text": g.get("textDescription", ""),
                })
    
    conn.close()
    return results

def extract_from_global():
    """Global cursorDiskKV - composerData with full conversations"""
    if not GLOBAL_DB.exists():
        return []
    conn = sqlite3.connect(str(GLOBAL_DB))
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    if "cursorDiskKV" not in [r[0] for r in cur.fetchall()]:
        conn.close()
        return []
    
    cur.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'")
    rows = cur.fetchall()
    results = []
    
    for key, value in rows:
        if not value:
            continue
        try:
            val = value.decode("utf-8", errors="replace") if isinstance(value, bytes) else value
            data = json.loads(val)
        except:
            continue
        
        cid = data.get("composerId", "")
        conv_headers = data.get("fullConversationHeadersOnly") or []
        conv_map = data.get("conversationMap") or {}
        rich_text = data.get("richText", "")
        text = data.get("text", "")
        
        # Try to get messages from conversationMap (bubbleId -> content)
        messages = []
        for h in conv_headers[:100]:  # limit
            bid = h.get("bubbleId") or h.get("serverBubbleId")
            msg_type = "User" if h.get("type") == 1 else "Assistant"
            content = ""
            if isinstance(conv_map, dict) and bid and bid in conv_map:
                m = conv_map[bid]
                if isinstance(m, dict):
                    content = m.get("text", m.get("content", ""))
                elif isinstance(m, str):
                    content = m
            messages.append({"role": msg_type, "content": content or "(no content)"})
        
        # If conversationMap empty, try codeBlockData or other fields
        if not messages and (rich_text or text):
            messages.append({"role": "?", "content": rich_text or text})
        
        # Check date from first header or skip if no date
        first_ts = None
        if conv_headers and isinstance(conv_headers[0], dict) and "timingInfo" in str(conv_headers[0]):
            pass  # headers might not have ts
        if messages or len(val) > 5000:
            results.append({
                "source": "global_composer",
                "composerId": cid[:8],
                "messages": messages,
                "raw_size": len(val),
            })
    
    conn.close()
    return results

def extract_agent_kv_blobs():
    """agentKv blobs might contain assistant responses"""
    if not GLOBAL_DB.exists():
        return []
    conn = sqlite3.connect(str(GLOBAL_DB))
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'agentKv:blob:%'")
    rows = cur.fetchall()
    conn.close()
    # Blobs are often compressed/encoded - return count only for now
    return [{"key": k[:60], "size": len(v) if v else 0} for k, v in rows[:5]]

def main():
    out = ["# Полные диалоги Cursor (18–20.02.2026)\n"]
    
    ws = extract_from_workspace()
    out.append("## Композиции из workspace (метаданные + промпты)\n")
    for r in ws:
        out.append(f"### {r.get('name', r.get('timestamp', '?'))}\n")
        out.append(f"- Обновлено: {r.get('updated') or r.get('created')}")
        if r.get("subtitle"):
            out.append(f"- Файлы: {r['subtitle']}")
        if r.get("text"):
            out.append(f"\n**Промпт:**\n{r['text'][:2000]}")
            if len(r.get("text", "")) > 2000:
                out.append("\n... (обрезано)")
        out.append("\n")
    
    gl = extract_from_global()
    out.append("## Диалоги из globalStorage\n")
    for r in gl:
        out.append(f"### Composer {r.get('composerId')} ({r.get('raw_size', 0)} bytes)\n")
        for m in r.get("messages", [])[:20]:
            out.append(f"**{m['role']}:**\n{m['content'][:1500]}\n")
        out.append("\n")
    
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(out), encoding="utf-8")
    print(f"Exported to {OUT_PATH}")
    print(f"Workspace: {len(ws)} items, Global: {len(gl)} composers")

if __name__ == "__main__":
    main()
