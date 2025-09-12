@echo off
echo Запуск серверов Путеводителя...

echo Запуск Backend сервера...
start "Backend Server" cmd /k "cd backend && python app.py"

echo Ожидание запуска backend...
timeout /t 3 /nobreak > nul

echo Запуск Frontend сервера...
start "Frontend Server" cmd /k "npm run dev"

echo Оба сервера запущены!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3001
pause
