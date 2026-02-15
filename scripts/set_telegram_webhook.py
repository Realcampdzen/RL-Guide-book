#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Установка webhook для Telegram-бота (Этап 7).
Читает TELEGRAM_BOT_TOKEN и TELEGRAM_WEBHOOK_SECRET из .env,
вызывает setWebhook с URL вида https://<base_url>/api/webhook/telegram/<secret>.
Токен в логи не выводится.
"""

import os
import sys
import urllib.parse
import urllib.request

# Загружаем .env из корня проекта
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
env_path = os.path.join(PROJECT_ROOT, ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, _, v = line.partition("=")
                k, v = k.strip(), v.strip()
                if k and v and not os.environ.get(k):
                    os.environ[k] = v

def main():
    token = (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()
    secret = (os.getenv("TELEGRAM_WEBHOOK_SECRET") or "").strip()
    base_url = (os.getenv("TELEGRAM_WEBHOOK_BASE_URL") or "").strip()

    if not token:
        print("TELEGRAM_BOT_TOKEN не задан в .env", file=sys.stderr)
        sys.exit(1)
    if not secret:
        print("TELEGRAM_WEBHOOK_SECRET не задан в .env", file=sys.stderr)
        sys.exit(1)
    if not base_url:
        print("TELEGRAM_WEBHOOK_BASE_URL не задан. Пример: https://your-domain.com", file=sys.stderr)
        sys.exit(1)

    base_url = base_url.rstrip("/")
    webhook_url = f"{base_url}/api/webhook/telegram/{secret}"
    set_url = f"https://api.telegram.org/bot{token}/setWebhook?url={urllib.parse.quote(webhook_url)}"

    try:
        req = urllib.request.Request(set_url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read().decode()
    except Exception as e:
        print(f"Ошибка вызова setWebhook: {e}", file=sys.stderr)
        sys.exit(1)

    # Ответ API содержит ok/description; не печатаем токен
    if "ok\":true" in data or '"ok": true' in data:
        print("Webhook установлен:", webhook_url.replace(secret, "***"))
    else:
        print("Ответ API:", data, file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
