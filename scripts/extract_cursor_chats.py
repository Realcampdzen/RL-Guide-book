#!/usr/bin/env python3
"""Extract chat history from Cursor workspace state.vscdb"""
import sqlite3
import json
import os

DB_PATH = os.path.expandvars(
    r"%APPDATA%\Cursor\User\workspaceStorage\8bbc87721bac49136816058c5c393a85\state.vscdb"
)

def main():
    if not os.path.exists(DB_PATH):
        print(f"DB not found: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # List tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    print("Tables:", tables)

    # Get composer IDs from composerData first
    cur.execute("SELECT value FROM ItemTable WHERE key = 'composer.composerData'")
    row = cur.fetchone()
    composer_ids = []
    if row and row[0]:
        try:
            data = json.loads(row[0].decode("utf-8") if isinstance(row[0], bytes) else row[0])
            for c in data.get("allComposers", []):
                cid = c.get("composerId")
                name = c.get("name", "(no name)")
                if cid:
                    composer_ids.append((cid, name))
        except Exception as e:
            print(f"Parse composerData: {e}")

    # ItemTable is key-value; find chat-related keys + composer-specific
    cur.execute("SELECT key, value FROM ItemTable WHERE key LIKE '%chat%' OR key LIKE '%composer%' OR key LIKE '%conversation%' OR key LIKE '%aichat%' OR key LIKE '%bubble%'")
    chat_rows = cur.fetchall()
    print(f"\nChat-related keys: {len(chat_rows)}")

    out_dir = os.path.join(os.path.dirname(DB_PATH), "extracted_chats")
    os.makedirs(out_dir, exist_ok=True)

    for key, value in chat_rows:
        print(f"\n--- KEY: {key[:120]} ---")
        try:
            if value and isinstance(value, bytes):
                value = value.decode("utf-8", errors="replace")
            if value and isinstance(value, str) and (value.startswith("{") or value.startswith("[")):
                parsed = json.loads(value)
                fname = key.replace("/", "_").replace("\\", "_")[:80] + ".json"
                out_path = os.path.join(out_dir, fname)
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(parsed, f, indent=2, ensure_ascii=False)
                print(f"  -> saved to {out_path}")
                # Pretty-print first 1500 chars
                s = json.dumps(parsed, ensure_ascii=False)[:1500]
                print(s)
                if len(str(parsed)) > 1500:
                    print("  ... (truncated)")
            else:
                print(value[:800] if value else "(empty)")
        except Exception as e:
            print(f"  [parse error: {e}]", value[:300] if value else "")

    conn.close()
    print("\nDone.")

if __name__ == "__main__":
    main()
