"""
Конфигурация чат-бота
"""
import os
from pathlib import Path

# Пути
BASE_DIR = Path(__file__).parent
DATA_PATH = BASE_DIR.parent / "ai-data"
STORAGE_PATH = BASE_DIR / "storage"

# OpenAI настройки
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = "gpt-4o-mini"
OPENAI_MAX_TOKENS = 1000
OPENAI_TEMPERATURE = 0.7

# Настройки бота
BOT_NAME = "НейроВалюша"
BOT_VERSION = "1.0.0"

# Настройки сервера
HOST = "0.0.0.0"
PORT = 8000
DEBUG = True

# Создаем папку для хранения если её нет
STORAGE_PATH.mkdir(exist_ok=True)
