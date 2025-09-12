@echo off
echo Starting RL Guide services
echo =========================================

echo.
echo Starting Flask API (port 5000)...
start "Flask API" cmd /k "cd backend && python app.py"

echo.
echo Starting FastAPI ChatBot (port 8000)...
start "FastAPI ChatBot" cmd /k "cd chatbot && python main.py"

echo.
echo Starting Web Interface (port 3001)...
start "Web Interface" cmd /k "npm run dev"

echo.
echo URLs:
echo Web Interface: http://localhost:3001
echo Flask API: http://localhost:5000
echo ChatBot API: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to exit...
pause > nul

