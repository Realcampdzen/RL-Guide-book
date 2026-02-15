#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Вывод URL для настройки VK Callback API.
Читает VK_WEBHOOK_SECRET и VK_WEBHOOK_BASE_URL из .env.
VK не поддерживает программную установку Callback URL — укажите этот URL
вручную в настройках сообщества: Управление → Работа с API → Callback API.
"""

import os
import sys

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
    secret = (os.getenv("VK_WEBHOOK_SECRET") or "").strip()
    base_url = (os.getenv("VK_WEBHOOK_BASE_URL") or "").strip()

    if not secret:
        print("VK_WEBHOOK_SECRET не задан в .env", file=sys.stderr)
        sys.exit(1)
    if not base_url:
        print("VK_WEBHOOK_BASE_URL не задан. Пример: https://your-domain.com", file=sys.stderr)
        sys.exit(1)

    base_url = base_url.rstrip("/")
    webhook_url = f"{base_url}/api/webhook/vk/{secret}"
    print("URL для Callback API в настройках VK:")
    print(webhook_url)
    print("\nСкопируйте и вставьте в настройки сообщества → Работа с API → Callback API.")


if __name__ == "__main__":
    main()
