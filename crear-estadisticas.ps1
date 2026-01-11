# ============================================
# SCRIPT PARA CREAR ESTRUCTURA DE ESTADÍSTICAS
# Ejecutar en: C:\xampp\htdocs\CONTROL GASTOS\
# ============================================

$baseDir = "C:\xampp\htdocs\CONTROL GASTOS"
Set-Location $baseDir

Write-Host "🚀 Creando estructura de Estadísticas..." -ForegroundColor Cyan

# Crear carpetas principales
$folders = @(
    "app\(dashboard)\estadisticas\opcion-uno",
    "app\(dashboard)\estadisticas\opcion-dos", 
    "app\(dashboard)\estadisticas\opcion-tres",
    "app\(dashboard)\estadisticas\components",
    "app\(dashboard)\estadisticas\hooks",
    "app\(dashboard)\estadisticas\utils",
    "app\api\estadisticas\proyectar",
    "app\api\estadisticas\actualizar-provision",
    "app\api\config\vistas-estadisticas"
)

foreach ($folder in $folders) {
    $fullPath = Join-Path $baseDir $folder
    if (-Not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "✅ Creado: $folder" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Ya existe: $folder" -ForegroundColor Yellow
    }
}

# Crear archivos base vacíos
$files = @{
    "app\(dashboard)\estadisticas\page.tsx" = "// Página principal de Estadísticas"
    "app\(dashboard)\estadisticas\layout.tsx" = "// Layout de Estadísticas"
    "app\(dashboard)\estadisticas\opcion-uno\page.tsx" = "// Opción 1: Tabla Dinámica"
    "app\(dashboard)\estadisticas\opcion-dos\page.tsx" = "// Opción 2: Dashboard Híbrido"
    "app\(dashboard)\estadisticas\opcion-tres\page.tsx" = "// Opción 3: Sistema de Escenarios"
    "app\(dashboard)\estadisticas\components\TablaProyeccion.tsx" = "// Componente Tabla"
    "app\(dashboard)\estadisticas\components\GraficosProyeccion.tsx" = "// Componente Gráficos"
    "app\(dashboard)\estadisticas\components\ConfiguracionVistas.tsx" = "// Config vistas"
    "app\(dashboard)\estadisticas\hooks\useProyeccionFinanciera.ts" = "// Hook proyección"
    "app\(dashboard)\estadisticas\hooks\useEditarCelda.ts" = "// Hook edición inline"
    "app\(dashboard)\estadisticas\utils\proyecciones.ts" = "// Lógica de cálculo"
    "app\api\estadisticas\proyectar\route.ts" = "// API proyectar"
    "app\api\estadisticas\actualizar-provision\route.ts" = "// API actualizar"
    "app\api\config\vistas-estadisticas\route.ts" = "// API config vistas"
}

foreach ($file in $files.Keys) {
    $fullPath = Join-Path $baseDir $file
    if (-Not (Test-Path $fullPath)) {
        $files[$file] | Out-File -FilePath $fullPath -Encoding UTF8
        Write-Host "📄 Creado: $file" -ForegroundColor Cyan
    }
}

Write-Host "`n✨ Estructura creada exitosamente!" -ForegroundColor Green
Write-Host "📁 Ubicación: $baseDir\app\(dashboard)\estadisticas" -ForegroundColor Magenta
