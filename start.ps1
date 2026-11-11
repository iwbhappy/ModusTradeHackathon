# Запуск «Сигнала» одной командой: .\start.ps1
# Бэкенд и фронтенд открываются в отдельных окнах; закрытие окна останавливает сервер.
# .\start.ps1 -Mock — только интерфейс на демо-данных, без бэкенда.
param([switch]$Mock)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

foreach ($tool in @('npm') + @(if (-not $Mock) { 'uv' })) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Host "Не найдено: $tool. Установите его по README и откройте новый терминал." -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path (Join-Path $root 'frontend\node_modules'))) {
    Write-Host 'Первый запуск: устанавливаю зависимости фронтенда...'
    npm --prefix (Join-Path $root 'frontend') install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

function Start-Window($title, $dir, $command) {
    $script = "`$Host.UI.RawUI.WindowTitle = '$title'; Set-Location '$dir'; $command"
    Start-Process powershell -ArgumentList '-NoExit', '-NoProfile', '-Command', $script
}

if ($Mock) {
    $port = 5174
    Start-Window 'Сигнал · интерфейс (демо)' "$root\frontend" "npm run dev:mock -- --port $port"
} else {
    $port = 5173
    Start-Window 'Сигнал · бэкенд' "$root\backend" 'uv run python -m app'
    Start-Window 'Сигнал · интерфейс' "$root\frontend" "npm run dev -- --port $port --strictPort"
}

$url = "http://localhost:$port"
Write-Host "Жду интерфейс на $url ..."
for ($i = 0; $i -lt 60; $i++) {
    try {
        Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 2 | Out-Null
        Start-Process $url
        Write-Host "Готово: $url. Остановка — закройте окна серверов." -ForegroundColor Green
        exit 0
    } catch { Start-Sleep -Seconds 1 }
}
Write-Host "Интерфейс не ответил за минуту — посмотрите ошибки в окнах серверов." -ForegroundColor Yellow
