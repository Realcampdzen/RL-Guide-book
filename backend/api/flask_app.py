"""
backend/api/flask_app.py — Vercel Python Serverless entrypoint.

Vercel ищет WSGI-объект `app` в этом файле.
Подкладываем backend/app.py на sys.path и импортируем Flask app.
"""
import sys
import os

# backend/ directory is the parent of api/
_api_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_api_dir)

if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from app import app  # noqa: E402 — Flask WSGI app
