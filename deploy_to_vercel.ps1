Write-Host "Деплой Backend на Vercel..." -ForegroundColor Green

Write-Host "Проверяем Vercel CLI..." -ForegroundColor Yellow
try {
    vercel --version | Out-Null
    Write-Host "Vercel CLI уже установлен" -ForegroundColor Green
} catch {
    Write-Host "Устанавливаем Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

Write-Host "Переходим в папку backend..." -ForegroundColor Yellow
Set-Location backend

Write-Host "Логинимся в Vercel..." -ForegroundColor Yellow
vercel login

Write-Host "Деплоим проект..." -ForegroundColor Yellow
vercel

Write-Host "Готово! Проверьте URL в выводе выше." -ForegroundColor Green
Write-Host "Не забудьте добавить OPENAI_API_KEY в Environment Variables!" -ForegroundColor Red
Read-Host "Нажмите Enter для выхода"
