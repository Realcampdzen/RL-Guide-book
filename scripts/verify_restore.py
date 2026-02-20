#!/usr/bin/env python3
"""Проверить текущее состояние workspace после восстановления"""
import sqlite3
import json
import os

base = r"C:\Users\stepa\AppData\Roaming\Cursor\User\workspaceStorage\8bbc87721bac49136816058c5c393a85"
main_path = os.path.join(base, "state.vscdb")

if not os.path.exists(main_path):
    print("state.vscdb не найден!")
    exit(1)

db = sqlite3.connect(main_path)
cur = db.cursor()
cur.execute("SELECT value FROM ItemTable WHERE key = 'composer.composerData'")
row = cur.fetchone()
db.close()

if not row or not row[0]:
    print("composer.composerData пуст!")
    exit(1)

val = row[0].decode("utf-8") if isinstance(row[0], bytes) else row[0]
d = json.loads(val)
composers = d.get("allComposers", [])

print(f"Всего чатов в state.vscdb: {len(composers)}\n")
for c in composers:
    name = c.get("name", "?")
    aid = (c.get("composerId") or "?")[:8]
    archived = c.get("isArchived", False)
    print(f"  {name} | {aid}... | archived={archived}")

# Проверка на 8 целевых
target_names = ["Profile tab neon", "Carousel", "Mobile and tablet", "Кнопка прогресс", "Поиск панели", "вогнутого монитора", "Фиолетовое", "Мигание", "Отступы"]
found = [c.get("name","") for c in composers if any(t in (c.get("name") or "") for t in target_names)]
print(f"\nНайдено целевых чатов: {len(found)}")
for f in found:
    print(f"  - {f}")
