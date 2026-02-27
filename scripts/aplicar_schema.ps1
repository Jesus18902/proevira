# ============================================
# SCRIPT PARA APLICAR SCHEMA UNIFICADO - Windows PowerShell
# ============================================

Write-Host "🗄️  Aplicando schema unificado de ProeVira..." -ForegroundColor Cyan
Write-Host ""

# Verificar si MySQL está instalado
try {
    $null = Get-Command mysql -ErrorAction Stop
    Write-Host "✅ MySQL encontrado" -ForegroundColor Green
}
catch {
    Write-Host "❌ ERROR: MySQL no está instalado o no está en PATH" -ForegroundColor Red
    Write-Host "   Instala MySQL Server 8.0+ y asegurate que mysql.exe esté en PATH" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Pedir credenciales
Write-Host "Ingresa las credenciales de MySQL:" -ForegroundColor Yellow
$DB_USER = Read-Host "Usuario MySQL (default: root)"
if ([string]::IsNullOrWhiteSpace($DB_USER)) { $DB_USER = "root" }

$DB_PASSWORD = Read-Host "Contraseña MySQL" -AsSecureString
$DB_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))

Write-Host ""

# Verificar conexión
Write-Host "🔍 Verificando conexión a MySQL..." -ForegroundColor Cyan
try {
    $testCommand = "SELECT 1;"
    $testResult = & mysql -u$DB_USER -p$DB_PASSWORD_PLAIN -e $testCommand 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Conexión exitosa" -ForegroundColor Green
    } else {
        throw "Error de conexión"
    }
}
catch {
    Write-Host "❌ Error de conexión. Verifica usuario y contraseña" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar que el archivo SQL existe
if (-not (Test-Path "database_schema.sql")) {
    Write-Host "❌ ERROR: No se encuentra database_schema.sql en el directorio actual" -ForegroundColor Red
    Write-Host "   Asegurate de ejecutar este script desde el directorio raíz del proyecto" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Aplicar schema
Write-Host ""
Write-Host "🔄 Aplicando schema unificado (database_schema.sql)..." -ForegroundColor Cyan

try {
    $result = cmd /c "mysql -u$DB_USER -p$DB_PASSWORD_PLAIN < database_schema.sql" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Schema aplicado exitosamente" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Resumen:" -ForegroundColor Cyan
        Write-Host "   • Base de datos: proyecto_integrador"
        Write-Host "   • Tablas creadas: usuario, region, enfermedad, dato_epidemiologico, alerta, prediccion, modelo_predictivo, bitacora"
        Write-Host "   • Usuario admin creado: admin@proevira.com (contraseña: admin123)"
        Write-Host "   • 32 estados de México cargados"  
        Write-Host "   • Enfermedad Dengue configurada"
        Write-Host ""
        Write-Host "🔧 Próximos pasos:" -ForegroundColor Yellow
        Write-Host "   1. Copia backend\.env.example a backend\.env y configura credenciales"
        Write-Host "   2. Copia sistema-prediccion-enfermedades\backend\.env.example a sistema-prediccion-enfermedades\backend\.env"
        Write-Host "   3. Ejecuta: cd backend; python ETL_LOADER.py (para cargar datos epidemiológicos)"
        Write-Host "   4. Inicia Flask: cd backend; python app.py"
        Write-Host "   5. Inicia Node.js: cd sistema-prediccion-enfermedades; npm run backend"
        Write-Host "   6. Inicia Frontend: cd sistema-prediccion-enfermedades; npm start"
        Write-Host ""
        Write-Host "🎉 ¡ProeVira listo para usar!" -ForegroundColor Green
    } else {
        throw "Error aplicando schema"
    }
}
catch {
    Write-Host "❌ Error aplicando schema:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Read-Host "Presiona Enter para continuar"