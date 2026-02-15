#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Print the full system prompt string to stdout (UTF-8).
Used by sync-cf-api-prompts.mjs to generate cf-api/src/neurovalyusha/generated_chat_prompt.ts.
Run from repo root: python chatbot/scripts/export_system_prompt.py
"""
import os
import sys

# Allow importing prompts when run from repo root (chatbot folder on path)
_script_dir = os.path.dirname(os.path.abspath(__file__))
_chatbot_root = os.path.dirname(_script_dir)
if _chatbot_root not in sys.path:
    sys.path.insert(0, _chatbot_root)

from prompts.putevoditel_system_prompt_optimized import get_system_prompt_optimized

if __name__ == "__main__":
    prompt = get_system_prompt_optimized()
    # Ensure UTF-8 on Windows
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print(prompt, end="", flush=True)
