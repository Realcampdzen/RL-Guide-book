@echo off
echo 🚀 Запуск всех сервисов Путеводителя "Реальный Лагерь"
echo =====================================================

echo.
echo 📚 Запуск Flask API сервера (порт 5000)...
start "Flask API" cmd /k "cd backend && python app.py"

echo.
echo 🤖 Запуск FastAPI чат-бота (порт 8000)...
start "FastAPI ChatBot" cmd /k "cd chatbot && python main.py"

echo.
echo 🌐 Запуск веб-интерфейса (порт 5173)...
start "Web Interface" cmd /k "npm run dev"

echo.
echo ✅ Все сервисы запускаются...
echo.
echo 📱 Веб-интерфейс: http://localhost:5173
echo 🔧 Flask API: http://localhost:5000
echo 🤖 FastAPI чат-бот: http://localhost:8000
echo 📊 API документация: http://localhost:8000/docs
echo.
echo Нажмите любую клавишу для выхода...
pause > nul
