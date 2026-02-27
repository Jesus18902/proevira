@echo off
echo ============================================
echo ProeVira - Frontend React
echo ============================================

cd /d "%~dp0sistema-prediccion-enfermedades"

echo Directorio actual: %CD%
echo.

if not exist "node_modules" (
    echo Instalando dependencias de Node.js...
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: No se pudieron instalar las dependencias
        pause
        exit /b 1
    )
)

echo.
echo Iniciando aplicacion React en puerto 3000...
echo Frontend apunta al Backend Flask (puerto 5001)
echo Press CTRL+C para detener
echo.

npm start

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: No se pudo iniciar el frontend
    echo Verifica que Node.js este instalado
)

pause