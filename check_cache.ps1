Write-Host "`n=== Antigravity / Gemini Cache Check ===" -ForegroundColor Cyan

$dirs = @(
    "$env:USERPROFILE\.gemini",
    "$env:LOCALAPPDATA\antigravity",
    "$env:APPDATA\antigravity",
    "$env:USERPROFILE\.antigravity",
    "$env:LOCALAPPDATA\Google\Antigravity",
    "$env:APPDATA\Google\Antigravity"
)

foreach ($d in $dirs) {
    if (Test-Path $d) {
        $files = Get-ChildItem $d -Recurse -File -ErrorAction SilentlyContinue
        $size = ($files | Measure-Object Length -Sum).Sum / 1MB
        $count = $files.Count
        Write-Host "$d -> $([math]::Round($size,1)) MB ($count files)" -ForegroundColor Yellow
    } else {
        Write-Host "$d -> NOT FOUND" -ForegroundColor DarkGray
    }
}

Write-Host "`n=== npm cache ===" -ForegroundColor Cyan
$npmCache = "$env:LOCALAPPDATA\npm-cache"
if (Test-Path $npmCache) {
    $size = (Get-ChildItem $npmCache -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1MB
    Write-Host "$npmCache -> $([math]::Round($size,1)) MB" -ForegroundColor Yellow
}

Write-Host "`n=== node_modules ===" -ForegroundColor Cyan
$nm = "d:\openclaw-workspace\putevoditel_alfa\node_modules"
if (Test-Path $nm) {
    $size = (Get-ChildItem $nm -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1MB
    Write-Host "$nm -> $([math]::Round($size,1)) MB" -ForegroundColor Yellow
}

Write-Host "`n=== Vite cache ===" -ForegroundColor Cyan
$vite = "d:\openclaw-workspace\putevoditel_alfa\node_modules\.vite"
if (Test-Path $vite) {
    $size = (Get-ChildItem $vite -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1MB
    Write-Host "$vite -> $([math]::Round($size,1)) MB" -ForegroundColor Yellow
}

Write-Host "`n=== TEMP folder ===" -ForegroundColor Cyan
$tmp = "$env:TEMP"
$size = (Get-ChildItem $tmp -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1MB
Write-Host "$tmp -> $([math]::Round($size,1)) MB" -ForegroundColor Yellow

Write-Host "`n=== Top 10 memory consumers (current) ===" -ForegroundColor Cyan
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Name, @{N='RAM_MB';E={[math]::Round($_.WorkingSet64/1MB,0)}}, Id | Format-Table -AutoSize

Write-Host "`n=== Disk free space ===" -ForegroundColor Cyan
Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Used -gt 0} | Select-Object Name, @{N='UsedGB';E={[math]::Round($_.Used/1GB,1)}}, @{N='FreeGB';E={[math]::Round($_.Free/1GB,1)}} | Format-Table -AutoSize
