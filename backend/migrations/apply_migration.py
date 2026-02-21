#!/usr/bin/env python3
"""
apply_migration.py — применяет 001_schema_v1.sql к Supabase.

Способы применения (в порядке приоритета):

1. Через Management API Token (рекомендуется):
   - Получить: https://supabase.com/dashboard/account/tokens
   - Добавить в .env: SUPABASE_ACCESS_TOKEN=<token>
   - Запуск: python backend/migrations/apply_migration.py

2. Через прямое PostgreSQL подключение (psycopg2):
   - Пароль БД: Supabase Dashboard → Project Settings → Database
   - Добавить в .env: SUPABASE_DB_PASSWORD=<password>
   - Или: DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
   - pip install psycopg2-binary
   - Запуск: python backend/migrations/apply_migration.py

3. Вручную через SQL Editor:
   - https://supabase.com/dashboard/project/<ref>/sql/new
   - Вставить backend/migrations/001_schema_v1.sql и нажать Run
"""

import os
import sys
import re
from pathlib import Path

# Загружаем .env
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

if not DATABASE_URL and SUPABASE_URL and SUPABASE_DB_PASSWORD:
    ref = SUPABASE_URL.replace("https://", "").split(".")[0]
    DATABASE_URL = f"postgresql://postgres:{SUPABASE_DB_PASSWORD}@db.{ref}.supabase.co:5432/postgres"

sql_file = Path(__file__).parent / "001_schema_v1.sql"
sql = sql_file.read_text(encoding="utf-8")

# -----------------------------------------------------------------------
# Способ 1: Supabase Management API Token
# -----------------------------------------------------------------------
if SUPABASE_ACCESS_TOKEN and SUPABASE_URL:
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
        timeout=30,
    )
    if r.status_code in (200, 201):
        print("✅ Migration applied via Management API!")
    else:
        print(f"❌ Management API error {r.status_code}: {r.text[:300]}")
        sys.exit(1)

    # Проверка
    r2 = _req.get(
        f"{SUPABASE_URL}/rest/v1/shifts?select=id&limit=1",
        headers={
            "apikey": os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
            "Authorization": f"Bearer {os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')}",
        },
        timeout=10,
    )
    if r2.status_code == 200:
        print("✅ shifts table verified via REST API!")
    else:
        print(f"⚠️  Verification returned {r2.status_code}: {r2.text[:100]}")
    sys.exit(0)

# -----------------------------------------------------------------------
# Способ 2: прямое psycopg2 подключение
# -----------------------------------------------------------------------
if not DATABASE_URL:
    ref = SUPABASE_URL.replace("https://", "").split(".")[0] if SUPABASE_URL else "<ref>"
    print("=" * 60)
    print("ИНСТРУКЦИЯ: как применить миграцию")
    print("=" * 60)
    print()
    print("Вариант A — Management API Token (проще):")
    print("  1. https://supabase.com/dashboard/account/tokens → Create token")
    print("  2. Добавить в .env: SUPABASE_ACCESS_TOKEN=<token>")
    print("  3. Снова запустить: python backend/migrations/apply_migration.py")
    print()
    print("Вариант B — Вручную через SQL Editor:")
    print(f"  1. Открыть: https://supabase.com/dashboard/project/{ref}/sql/new")
    print("  2. Вставить содержимое backend/migrations/001_schema_v1.sql")
    print("  3. Нажать Run")
    print()
    print("Вариант C — прямое PG подключение:")
    print("  1. Supabase Dashboard → Project Settings → Database → пароль")
    print("  2. Добавить в .env: SUPABASE_DB_PASSWORD=<password>")
    print("  3. pip install psycopg2-binary")
    print("  4. Снова запустить этот скрипт")
    sys.exit(0)

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2-binary...")
    os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
    import psycopg2

print(f"Connecting to Supabase...")
masked = DATABASE_URL.replace(DATABASE_URL.split("@")[0].split("//")[1], "postgres:***")
print(f"  URL: {masked}")

try:
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=15)
    conn.autocommit = True
    cur = conn.cursor()

    print("Applying 001_schema_v1.sql...")
    cur.execute(sql)
    print("✅ Migration applied successfully!")

    # Проверяем таблицы
    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN (
            'shifts','squads','memberships','squad_corners',
            'squad_invite_codes','squad_messages',
            'badge_requests','parent_snapshots','chat_daily_usage'
        )
        ORDER BY table_name;
    """)
    tables = [r[0] for r in cur.fetchall()]
    print(f"\nCreated tables ({len(tables)}/9):")
    for t in tables:
        print(f"  ✅ {t}")

    missing = {
        'shifts','squads','memberships','squad_corners',
        'squad_invite_codes','squad_messages',
        'badge_requests','parent_snapshots','chat_daily_usage'
    } - set(tables)
    if missing:
        print(f"\n⚠️  Missing tables: {missing}")
    else:
        print("\n✅ All 9 tables present!")

    cur.close()
    conn.close()

except psycopg2.OperationalError as e:
    print(f"\n❌ Connection failed: {e}")
    print("\nCheck your DB password in:")
    print("  Supabase Dashboard → Project Settings → Database")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Migration failed: {e}")
    sys.exit(1)
