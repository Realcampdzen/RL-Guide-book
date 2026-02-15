# Скрипт для коммита и пуша после удаления блокировки
Set-Location $PSScriptRoot

# Удалить lock если остался
Remove-Item ".git\index.lock" -Force -ErrorAction SilentlyContinue

# Проверить что есть что коммитить
$status = git status --short
if (-not $status) {
    Write-Host "Нет изменений для коммита."
    exit 0
}

# Коммит
git add -A
git commit -m "fix(profile): скрыть dev-утилиты и селектор ролей в production

- authStorage: в production всегда роль Путешественник (traveler)
- ProfileView: скрыть селектор ролей в production (import.meta.env.DEV)
- Кабина: изображения Реализм, значки, механики, десктоп/мобайл
- sync ai-data, обновление индексов"

if ($LASTEXITCODE -eq 0) {
    git push
} else {
    Write-Host "Коммит не выполнен. Проверьте: возможно index.lock всё ещё заблокирован."
}
