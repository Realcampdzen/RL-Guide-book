Set-Location "d:\Development\Путеводитель web_new"
$path = "src\styles\profile-view-spaceship.css"
$text = [System.IO.File]::ReadAllText((Join-Path (Get-Location) $path))
$text = $text -replace 'border-bottom-color: rgba\(var\(--cabin-neon-cyan-rgb\), 0\.24\);', 'border-bottom-color: var(--border);'
$text = $text -replace 'background:\s+linear-gradient\(180deg, rgba\(9, 25, 43, 0\.86\), rgba\(7, 18, 33, 0\.54\)\);', 'background: var(--panel);'
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $path), $text)
Write-Host "Done"
