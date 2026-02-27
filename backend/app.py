# backend/app.py
# API Flask - Prediccion de Riesgo de Brote de Dengue
# Orquestador principal: registra Blueprints y arranca el servidor
# Refactorizado desde monolito de 2572 lineas

from flask import Flask
from flask_cors import CORS

# Modulos compartidos (se importan para inicializar pool y modelos)
from config import UPLOAD_FOLDER
from database import get_db_connection  # noqa: F401 - inicializa pool
from ml import load_models

# Blueprints
from routes.auth import auth_bp
from routes.datos import datos_bp
from routes.modelo import modelo_bp
from routes.sistema import sistema_bp
from routes.reportes import reportes_bp
from routes.predicciones import predicciones_bp, crear_tabla_predicciones
from routes.alertas import alertas_bp, crear_tabla_alertas
from routes.entrenamiento import modelos_bp

import os


def create_app():
    """Factory de la aplicacion Flask"""
    app = Flask(__name__)
    CORS(app)

    # Asegurar que existe la carpeta de uploads
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # Registrar Blueprints
    app.register_blueprint(auth_bp)          # /api/auth/*
    app.register_blueprint(datos_bp)         # /api/datos/*
    app.register_blueprint(modelo_bp)        # /api/modelo/*
    app.register_blueprint(sistema_bp)       # /api/config/*, /api/dashboard/*, /api/health, /api/sistema/*
    app.register_blueprint(reportes_bp)      # /api/reportes/*
    app.register_blueprint(predicciones_bp)  # /api/predicciones/*
    app.register_blueprint(alertas_bp)       # /api/alertas/*
    app.register_blueprint(modelos_bp)       # /api/modelos/*

    return app


if __name__ == '__main__':
    # Cargar modelos ML
    load_models()

    # Crear tablas auxiliares si no existen
    crear_tabla_predicciones()
    crear_tabla_alertas()

    # Crear aplicacion
    app = create_app()

    print("\n" + "=" * 60)
    print("API Flask - Prediccion de Riesgo de Dengue (Blueprints)")
    print("=" * 60)
    print("Modelos: Regresion Lineal + Polinomial (comparativa)")
    print("Base de datos: MySQL (proyecto_integrador)")
    print("Datos: 2020-2025 (6 anios)")
    print("\nEndpoints:")
    print("   POST /api/auth/login")
    print("   POST /api/datos/cargar-csv")
    print("   GET  /api/datos/estadisticas")
    print("   POST /api/datos/procesar-csv")
    print("   POST /api/datos/procesar-csv-completo")
    print("   DELETE /api/datos/limpiar")
    print("   DELETE /api/datos/limpiar-anio/<anio>")
    print("   GET  /api/datos/resumen-por-estado")
    print("   POST /api/modelo/predecir-riesgo-automatico")
    print("   POST /api/modelo/predecir-riesgo-avanzado")
    print("   GET  /api/config/regiones")
    print("   GET  /api/config/enfermedades")
    print("   GET  /api/dashboard/resumen")
    print("   GET  /api/health")
    print("   GET  /api/sistema/info")
    print("   GET  /api/reportes/epidemiologico")
    print("   GET  /api/reportes/estado/<id>")
    print("   POST /api/predicciones/guardar")
    print("   GET  /api/predicciones/historial")
    print("   GET  /api/predicciones/<id>")
    print("   DELETE /api/predicciones/<id>")
    print("   POST /api/alertas/generar-automaticas")
    print("   POST /api/alertas/enviar")
    print("   POST /api/alertas/enviar-masivo")
    print("   GET  /api/alertas/activas")
    print("   GET  /api/alertas/historial")
    print("   PUT  /api/alertas/<id>/resolver")
    print("   POST /api/modelos/entrenar")
    print("   GET  /api/modelos/info")
    print("=" * 60 + "\n")

    app.run(debug=False, port=5001, host='0.0.0.0', threaded=True)
