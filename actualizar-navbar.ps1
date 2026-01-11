# Script para ver tu Navbar actual
$navbarPath = "C:\xampp\htdocs\CONTROL GASTOS\components\shared\Navbar.tsx"

if (Test-Path $navbarPath) {
    Write-Host "📋 Contenido actual de Navbar:" -ForegroundColor Cyan
    Get-Content $navbarPath | Select-Object -First 100
    
    # Crear backup
    $backupPath = "C:\xampp\htdocs\CONTROL GASTOS\components\shared\Navbar.tsx.backup"
    Copy-Item $navbarPath $backupPath -Force
    Write-Host "`n💾 Backup creado en: $backupPath" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró Navbar.tsx" -ForegroundColor Red
}
