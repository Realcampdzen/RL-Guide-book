import sys
import os
from pathlib import Path

# Добавляем пути к модулям
current_dir = Path(__file__).parent
project_root = current_dir.parent
sys.path.append(str(project_root / "backend"))
sys.path.append(str(project_root / "chatbot"))

# Импортируем Flask приложение
from app import app

# Vercel требует именно эту переменную
application = app

# Для Vercel также нужен handler
def handler(request):
    return app(request.environ, lambda *args: None)

if __name__ == "__main__":
    app.run()
