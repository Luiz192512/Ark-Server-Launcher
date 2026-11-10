# Builds the launcher and swaps the installed copy in "D:\ENZ Launcher" (the NSIS silent
# installer does not replace a running install, so the .exe is copied directly).
# Refuses while the ARK server runs: closing the launcher must never take a live game down.
param(
    [string]$InstallDir = "D:\ENZ Launcher",
    [switch]$SkipBuild
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if (Get-Process ShooterGameServer -ErrorAction SilentlyContinue) {
    throw "O servidor ARK esta rodando. Pare o servidor antes de atualizar o launcher."
}
$target = Join-Path $InstallDir "enz-launcher.exe"
if (-not (Test-Path $target)) { throw "Nao achei $target." }

if (-not $SkipBuild) {
    Push-Location $root
    try {
        npm run tauri build
        if ($LASTEXITCODE -ne 0) { throw "O build falhou (codigo $LASTEXITCODE)." }
    } finally { Pop-Location }
}
$built = Join-Path $root "src-tauri\target\release\enz-launcher.exe"

$running = Get-Process enz-launcher -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq $target }
$running | Stop-Process -Force
$running | Wait-Process -Timeout 15 -ErrorAction SilentlyContinue

# Windows keeps the .exe locked for a moment after the process exits.
for ($try = 1; ; $try++) {
    try { Copy-Item $built $target -Force; break }
    catch { if ($try -ge 20) { throw }; Start-Sleep -Milliseconds 500 }
}
if ((Get-FileHash $built).Hash -ne (Get-FileHash $target).Hash) { throw "A copia nao confere com o build." }
Start-Process $target
Write-Output "Launcher atualizado em $target e aberto de novo."
