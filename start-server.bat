@echo off
echo ============================================
echo ProeVira - Backend Flask Unificado
echo ============================================

cd /d "%~dp0backend"

echo Directorio actual: %CD%
echo.

if not exist ".env" (
    echo ADVERTENCIA: Archivo .env no encontrado
    echo Copiando .env.example...
    copy .env.example .env >nul 2>&1
    echo Edita backend\.env con tus credenciales MySQL antes de continuar
    echo.
)

echo Activando entorno virtual Python...
call ..\.venv\Scripts\activate.bat 2>nul

echo.
echo Iniciando Backend Flask Unificado en puerto 5001...
echo Funcionalidades: ML + Auth + Dashboard + Upload + Alertas
echo Press CTRL+C para detener
echo.

python app.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: No se pudo iniciar el backend Flask
    echo Verifica:
    echo - Python este instalado y en el PATH
    echo - Las dependencias instaladas: pip install -r requirements.txt  
    echo - MySQL este ejecutandose con las credenciales en .env
)

pause
