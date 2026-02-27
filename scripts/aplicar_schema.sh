#!/bin/bash
# ============================================
# SCRIPT PARA APLICAR SCHEMA UNIFICADO
# ============================================

echo "🗄️  Aplicando schema unificado de ProeVira..."
echo ""

# Verificar si MySQL está instalado
if ! command -v mysql &> /dev/null
then
    echo "❌ ERROR: MySQL no está instalado o no está en PATH"
    echo "   Instala MySQL Server 8.0+ antes de continuar"
    exit 1
fi

# Pedir credenciales
echo "Ingresa las credenciales de MySQL:"
read -p "Usuario MySQL (default: root): " DB_USER
DB_USER=${DB_USER:-root}

read -s -p "Contraseña MySQL: " DB_PASSWORD
echo ""
echo ""

# Verificar conexión
echo "🔍 Verificando conexión a MySQL..."
if mysql -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Conexión exitosa"
else
    echo "❌ Error de conexión. Verifica usuario y contraseña"
    exit 1
fi

# Aplicar schema
echo ""
echo "🔄 Aplicando schema unificado (database_schema.sql)..."
if mysql -u"$DB_USER" -p"$DB_PASSWORD" < database_schema.sql; then
    echo "✅ Schema aplicado exitosamente"
    echo ""
    echo "📋 Resumen:"
    echo "   • Base de datos: proyecto_integrador"
    echo "   • Tablas creadas: usuario, region, enfermedad, dato_epidemiologico, alerta, prediccion, modelo_predictivo, bitacora"
    echo "   • Usuario admin creado: admin@proevira.com (contraseña: admin123)"
    echo "   • 32 estados de México cargados"
    echo "   • Enfermedad Dengue configurada"
    echo ""
    echo "🔧 Próximos pasos:"
    echo "   1. Copia backend/.env.example a backend/.env y configura credenciales"
    echo "   2. Copia sistema-prediccion-enfermedades/backend/.env.example a sistema-prediccion-enfermedades/backend/.env"
    echo "   3. Ejecuta: cd backend && python ETL_LOADER.py (para cargar datos epidemiológicos)"
    echo "   4. Inicia Flask: cd backend && python app.py"
    echo "   5. Inicia Node.js: cd sistema-prediccion-enfermedades && npm run backend"
    echo "   6. Inicia Frontend: cd sistema-prediccion-enfermedades && npm start"
    echo ""
else
    echo "❌ Error aplicando schema. Revisa el log anterior"
    exit 1
fi

echo "🎉 ¡ProeVira listo para usar!"