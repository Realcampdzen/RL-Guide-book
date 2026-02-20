#!/usr/bin/env python3
"""Export Cursor chat generations to readable markdown"""
import json
from datetime import datetime

GENERATIONS_PATH = r"C:\Users\stepa\AppData\Roaming\Cursor\User\workspaceStorage\8bbc87721bac49136816058c5c393a85\extracted_chats\aiService_generations.json"
OUT_PATH = r"d:\Development\Путеводитель web_new\docs\EXTRACTED_CHATS_READABLE.md"

def main():
    with open(GENERATIONS_PATH, "r", encoding="utf-8") as f:
        gens = json.load(f)

    lines = ["# Извлечённые чаты Cursor (aiService.generations)\n"]
    for i, g in enumerate(gens):
        ts = g.get("unixMs")
        dt = datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d %H:%M") if ts else ""
        desc = g.get("textDescription", "")
        lines.append(f"## {i+1}. {dt}\n")
        lines.append(desc.strip()[:3000])
        if len(desc) > 3000:
            lines.append("\n... (обрезано)")
        lines.append("\n\n---\n")

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Saved to {OUT_PATH}")

if __name__ == "__main__":
    main()
