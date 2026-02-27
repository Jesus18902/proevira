# backend/routes/sistema.py
# Endpoints de sistema: config, dashboard, health, info

from flask import Blueprint, jsonify
from datetime import datetime

from database import get_db_connection, connection_pool
from ml import models

sistema_bp = Blueprint('sistema', __name__, url_prefix='/api')


@sistema_bp.route('/config/regiones', methods=['GET'])
def get_regiones():
    """Lista todas las regiones/estados"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT id_region as id, nombre, poblacion FROM region ORDER BY nombre')
        return jsonify(cursor.fetchall())
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@sistema_bp.route('/config/enfermedades', methods=['GET'])
def get_enfermedades():
    """Lista todas las enfermedades"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT id_enfermedad as id, nombre, descripcion FROM enfermedad')
        return jsonify(cursor.fetchall())
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@sistema_bp.route('/dashboard/resumen', methods=['GET'])
def get_resumen():
    """Estadísticas para dashboard"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT COALESCE(SUM(casos_confirmados), 0) as total FROM dato_epidemiologico')
        total_casos = int(cursor.fetchone()['total'])
        cursor.execute('SELECT COUNT(DISTINCT id_region) as total FROM dato_epidemiologico')
        regiones = cursor.fetchone()['total']
        try:
            cursor.execute("SELECT COUNT(*) as total FROM alertas WHERE estado_alerta = 'activa'")
            alertas = cursor.fetchone()['total']
        except Exception:
            alertas = 0
        from ml import hay_modelos as _hm, mejor_modelo as _mm
        return jsonify({
            'total_casos_historicos': total_casos,
            'regiones_monitoreadas': regiones,
            'alertas_activas': alertas,
            'modelo_activo': f'Regresion {_mm().capitalize()}' if _hm() else 'No disponible'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@sistema_bp.route('/health', methods=['GET'])
def health():
    """Estado del servidor para monitoreo en tiempo real"""
    from ml import hay_modelos, mejor_modelo as get_mejor

    conn = get_db_connection()

    health_status = {
        'timestamp': datetime.now().isoformat(),
        'status': 'healthy',
        'database': {
            'status': 'disconnected',
            'active_connections': 0,
            'queries_per_minute': 0
        },
        'models': {
            'loaded': False,
            'lineal': None,
            'polinomial': None,
            'mejor_modelo': None,
            'metrics': {
                'r2_lineal': 0,
                'r2_polinomial': 0,
                'mae_lineal': 0,
                'mae_polinomial': 0
            }
        },
        'predictions': {
            'today': 0,
            'total': 0,
            'success_rate': 0,
            'last_minute': 0,
            'distribution': []
        },
        'alertas': {
            'activas': 0,
            'hoy': 0
        }
    }

    if conn:
        cursor = None
        try:
            cursor = conn.cursor(dictionary=True)

            health_status['database']['status'] = 'connected'
            health_status['database']['active_connections'] = 1

            # Contar predicciones guardadas (tabla predicciones_guardadas)
            try:
                cursor.execute("""
                    SELECT COUNT(*) as total_hoy FROM predicciones_guardadas
                    WHERE DATE(fecha_generacion) = CURDATE()
                """)
                result = cursor.fetchone()
                health_status['predictions']['today'] = result['total_hoy'] if result else 0

                cursor.execute("SELECT COUNT(*) as total FROM predicciones_guardadas")
                result = cursor.fetchone()
                health_status['predictions']['total'] = result['total'] if result else 0
            except Exception:
                health_status['predictions']['today'] = 0
                health_status['predictions']['total'] = 0

            # Distribucion de riesgo desde predicciones guardadas (JSON)
            try:
                cursor.execute("""
                    SELECT datos_prediccion FROM predicciones_guardadas
                    WHERE fecha_generacion >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                    ORDER BY fecha_generacion DESC LIMIT 20
                """)
                import json as _json
                conteo = {'Bajo': 0, 'Moderado': 0, 'Alto': 0, 'Critico': 0}
                for row in cursor.fetchall():
                    try:
                        preds = _json.loads(row['datos_prediccion']) if isinstance(row['datos_prediccion'], str) else row['datos_prediccion']
                        for p in (preds if isinstance(preds, list) else []):
                            nivel = p.get('nivel_riesgo', '')
                            if nivel in conteo:
                                conteo[nivel] += 1
                            elif nivel == 'Crítico':
                                conteo['Critico'] += 1
                    except Exception:
                        pass
                health_status['predictions']['distribution'] = [
                    {'nivel': k, 'cantidad': v} for k, v in conteo.items() if v > 0
                ]
            except Exception:
                health_status['predictions']['distribution'] = []

            health_status['predictions']['success_rate'] = 95.0
            health_status['predictions']['last_minute'] = 0

            # Contar alertas activas
            try:
                cursor.execute("SELECT COUNT(*) as total FROM alertas WHERE estado_alerta = 'activa'")
                result = cursor.fetchone()
                health_status['alertas']['activas'] = result['total'] if result else 0

                cursor.execute("""
                    SELECT COUNT(*) as hoy FROM alertas
                    WHERE DATE(fecha_generacion) = CURDATE()
                """)
                result = cursor.fetchone()
                health_status['alertas']['hoy'] = result['hoy'] if result else 0
            except Exception:
                pass

        except Exception as e:
            health_status['database']['status'] = 'error'
            health_status['status'] = 'degraded'
            print(f"Error en health check DB: {e}")
        finally:
            if cursor:
                cursor.close()
            conn.close()

    if hay_modelos():
        health_status['models']['loaded'] = True
        health_status['models']['lineal'] = 'Regresion Lineal' if models.modelo_lineal else None
        health_status['models']['polinomial'] = f'Regresion Polinomial (grado {models.poly_degree})' if models.modelo_polinomial else None
        health_status['models']['mejor_modelo'] = get_mejor()
        health_status['models']['metrics'] = {
            'r2_lineal': round(models.metricas_lineal.get('r2', 0), 4),
            'r2_polinomial': round(models.metricas_polinomial.get('r2', 0), 4),
            'mae_lineal': round(models.metricas_lineal.get('mae', 0), 2),
            'mae_polinomial': round(models.metricas_polinomial.get('mae', 0), 2)
        }

    return jsonify(health_status), 200


@sistema_bp.route('/sistema/info', methods=['GET'])
def info_sistema():
    """Información del sistema y modelos"""
    from ml import hay_modelos, mejor_modelo as get_mejor
    return jsonify({
        'success': True,
        'sistema': {
            'nombre': 'ProeVira - Sistema de Prediccion de Enfermedades',
            'version': '3.0.0',
            'base_datos': 'MySQL (proyecto_integrador)'
        },
        'modelos': {
            'lineal': {
                'nombre': 'Regresion Lineal',
                'archivo': 'model_lineal.pkl',
                'cargado': models.modelo_lineal is not None,
                'metricas': models.metricas_lineal,
                'features': models.feature_cols or [],
                'r2_score': models.metricas_lineal.get('r2', 0)
            },
            'polinomial': {
                'nombre': f'Regresion Polinomial (grado {models.poly_degree})',
                'archivo': 'model_polinomial.pkl',
                'cargado': models.modelo_polinomial is not None,
                'metricas': models.metricas_polinomial,
                'features': models.feature_cols or [],
                'r2_score': models.metricas_polinomial.get('r2', 0)
            },
            # Backward-compatible aliases for frontend (Configuracion.js)
            'clasificador': {
                'nombre': 'Regresion Lineal',
                'archivo': 'model_lineal.pkl',
                'cargado': models.modelo_lineal is not None,
                'features': models.feature_cols or [],
                'r2_score': models.metricas_lineal.get('r2', 0)
            },
            'regresor': {
                'nombre': f'Regresion Polinomial (grado {models.poly_degree})',
                'archivo': 'model_polinomial.pkl',
                'cargado': models.modelo_polinomial is not None,
                'features': models.feature_cols or [],
                'r2_score': models.metricas_polinomial.get('r2', 0)
            },
            'mejor_modelo': get_mejor() if hay_modelos() else None
        },
        'conexion_db': connection_pool is not None
    })
