# Servidor PHP local. MySQL debe estar iniciado antes en XAMPP.
$webDirectory = $PSScriptRoot
$portablePhp = Join-Path $env:LOCALAPPDATA 'RutaExpress/php/php.exe'
$phpCommand = Get-Command php -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $portablePhp) {
    $phpExecutable = $portablePhp
} elseif ($phpCommand) {
    $phpExecutable = $phpCommand.Source
} elseif (Test-Path -LiteralPath 'C:/xampp/php/php.exe') {
    $phpExecutable = 'C:/xampp/php/php.exe'
} else {
    Write-Host 'No se encontró PHP. Instala XAMPP o agrega PHP al PATH.'
    exit 1
}
$existingServer = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($existingServer) {
    Write-Host 'El puerto 8000 ya está ocupado. Detén la ejecución anterior antes de iniciar otra.'
    exit 1
}
# PHP antiguo puede fallar con las carpetas sincronizadas de OneDrive.
# La copia solo contiene los archivos necesarios para ejecutar la aplicación.
if ($PSScriptRoot -like '*OneDrive*') {
    $webDirectory = Join-Path $env:LOCALAPPDATA 'RutaExpress/web'
    New-Item -ItemType Directory -Path $webDirectory -Force | Out-Null
    foreach ($folder in @('api', 'database', 'cliente', 'admin', 'shared', 'assets')) {
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot $folder) -Destination $webDirectory -Recurse -Force
    }
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'index.html') -Destination $webDirectory -Force
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'router.php') -Destination $webDirectory -Force
    Write-Host "Se ejecutará una copia local en: $webDirectory"
    Write-Host 'Si editas el proyecto, vuelve a ejecutar este script para actualizar la copia.'
}
Set-Location -LiteralPath $webDirectory
& $phpExecutable database/instalar.php
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Cliente: http://127.0.0.1:8000/cliente/index.html'
Write-Host 'Administrador: http://127.0.0.1:8000/admin/index.php'
Write-Host 'Para detener el servidor presiona Ctrl+C.'
$serverProcess = Start-Process -FilePath $phpExecutable -ArgumentList @('-S', '127.0.0.1:8000', 'router.php') -WorkingDirectory $webDirectory -WindowStyle Hidden -PassThru
try {
    Wait-Process -Id $serverProcess.Id
} finally {
    $serverProcess.Refresh()
    if (-not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id }
}
