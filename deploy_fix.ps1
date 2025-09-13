Write-Host "Исправление деплоя GitHub Pages..." -ForegroundColor Green

Write-Host "Добавляем изменения в git..." -ForegroundColor Yellow
git add .

Write-Host "Создаем коммит..." -ForegroundColor Yellow
git commit -m "Fix: исправлена конфигурация Vite и GitHub Actions для деплоя"

Write-Host "Пушим изменения..." -ForegroundColor Yellow
git push origin main

Write-Host "Готово! Проверьте GitHub Actions для деплоя." -ForegroundColor Green
Read-Host "Нажмите Enter для выхода"
