#!/usr/bin/env python3
"""
apply_migration.py — применяет SQL-миграции к Supabase.

Поддерживает:
- выбор файла миграции через --file (relative to backend/migrations)
- запуск через Management API token (предпочтительно)
- запуск через прямое PostgreSQL подключение (psycopg2)

Примеры:
  python backend/migrations/apply_migration.py
  python backend/migrations/apply_migration.py --file 003_teams_scope.sql
"""

import argparse
import os
import sys
from pathlib import Path

# Load .env from repo root/backend
try:
    from dotenv import load_dotenv
    root = Path(__file__).resolve().parent.parent.parent
    load_dotenv(root / ".env")
    load_dotenv(root / "backend" / ".env")
except ImportError:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_ACCESS_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "").strip()
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--file",
        default="001_schema_v1.sql",
        help="migration SQL file in backend/migrations (default: 001_schema_v1.sql)",
    )
    return parser.parse_args()


def _resolve_sql_file(filename: str) -> Path:
    p = Path(__file__).parent / filename
    if not p.exists():
        raise FileNotFoundError(f"Migration file not found: {p}")
    return p


def _apply_via_management_api(sql: str) -> int:
    import requests as _req

    ref = SUPABASE_URL.replace("https://", "").split(".")[0]
    print(f"Applying via Management API (project: {ref})...")
    r = _req.post(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        headers={
            "Authorization": f"Bearer {SUPABASE_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        },
        json={"query": sql},
        timeout=60,
    )
    if r.status_code not in (200, 201):
        print(f"❌ Management API error {r.status_code}: {r.text[:400]}")
        return 1

    print("✅ Migration applied via Management API!")

    # Optional basic verification via REST (if service key present)
    if SERVICE_ROLE_KEY:
        r2 = _req.get(
            f"{SUPABASE_URL}/rest/v1/teams?select=id&limit=1",
            headers={
                "apikey": SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            },
            timeout=20,
        )
        if r2.status_code == 200:
            print("✅ teams endpoint reachable via REST API")
        else:
            print(f"⚠️ Verification returned {r2.status_code}: {r2.text[:200]}")
    return 0


def _apply_via_postgres(sql: str) -> int:
    db_url = DATABASE_URL
    if not db_url and SUPABASE_URL and SUPABASE_DB_PASSWORD:
        ref = SUPABASE_URL.replace("https://", "").split(".")[0]
        db_url = f"postgresql://postgres:{SUPABASE_DB_PASSWORD}@db.{ref}.supabase.co:5432/postgres"

    if not db_url:
        ref = SUPABASE_URL.replace("https://", "").split(".")[0] if SUPABASE_URL else "<ref>"
        print("=" * 60)
        print("ИНСТРУКЦИЯ: как применить миграцию")
        print("=" * 60)
        print("Вариант A — Management API Token:")
        print("  1. https://supabase.com/dashboard/account/tokens")
        print("  2. Добавь SUPABASE_ACCESS_TOKEN в .env")
        print("  3. Перезапусти этот скрипт")
        print()
        print("Вариант B — SQL Editor:")
        print(f"  https://supabase.com/dashboard/project/{ref}/sql/new")
        print("  Вставь SQL миграции и нажми Run")
        print()
        print("Вариант C — PostgreSQL:")
        print("  DATABASE_URL=postgresql://...")
        return 2

    try:
        import psycopg2
    except ImportError:
        print("Installing psycopg2-binary...")
        os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
        import psycopg2

    try:
        conn = psycopg2.connect(db_url, connect_timeout=20)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        print("✅ Migration applied via PostgreSQL")
        cur.close()
        conn.close()
        return 0
    except Exception as e:
        print(f"❌ PostgreSQL migration failed: {e}")
        return 1


def main() -> int:
    args = _parse_args()
    try:
        sql_path = _resolve_sql_file(args.file)
    except FileNotFoundError as e:
        print(str(e))
        return 1

    sql = sql_path.read_text(encoding="utf-8")
    print(f"Using migration file: {sql_path.name}")

    if SUPABASE_ACCESS_TOKEN and SUPABASE_URL:
        return _apply_via_management_api(sql)

    return _apply_via_postgres(sql)


if __name__ == "__main__":
    raise SystemExit(main())
