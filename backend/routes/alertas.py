# backend/routes/alertas.py
# Endpoints del sistema de alertas epidemiológicas

import pandas as pd
from flask import Blueprint, request, jsonify
from datetime import datetime

from config import ESTADO_POR_ID
from database import get_db_connection
from ml import models

alertas_bp = Blueprint('alertas', __name__, url_prefix='/api/alertas')


def crear_tabla_alertas():
    """Crea la tabla de alertas si no existe"""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alertas_epidemiologicas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_region INT NOT NULL,
                estado VARCHAR(100) NOT NULL,
                nivel VARCHAR(20) NOT NULL,
                probabilidad FLOAT,
                casos_esperados INT,
                mensaje TEXT,
                recomendaciones TEXT,
                tipo_notificacion VARCHAR(50),
                prioridad VARCHAR(20),
                estado_alerta VARCHAR(20) DEFAULT 'activa',
                fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_envio DATETIME,
                fecha_resolucion DATETIME,
                resolucion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_region (id_region),
                INDEX idx_estado_alerta (estado_alerta),
                INDEX idx_nivel (nivel)
            )
        """)
        conn.commit()
        return True
    except Exception as e:
        print(f"Error creando tabla alertas: {e}")
        return False
    finally:
        cursor.close()
        conn.close()


@alertas_bp.route('/generar-automaticas', methods=['POST'])
def generar_alertas_automaticas():
    """Genera alertas automáticas basadas en predicciones de riesgo"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        data = request.get_json() or {}
        umbral_riesgo = data.get('umbral_riesgo', 50)

        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id_region, nombre, poblacion FROM region ORDER BY id_region")
        regiones = cursor.fetchall()

        alertas = []
        fecha_actual = datetime.now().strftime('%Y-%m-%d')

        for region in regiones:
            id_region = region['id_region']
            nombre = region['nombre']
            poblacion = region['poblacion'] or 100000

            cursor.execute('''
                SELECT casos_confirmados, tasa_incidencia, fecha_fin_semana
                FROM dato_epidemiologico
                WHERE id_region = %s ORDER BY fecha_fin_semana DESC LIMIT 4
            ''', (id_region,))
            datos = cursor.fetchall()

            if len(datos) < 2:
                continue

            casos_reciente = datos[0]['casos_confirmados'] if datos else 0
            casos_anterior = datos[1]['casos_confirmados'] if len(datos) > 1 else casos_reciente
            ti_actual = float(datos[0]['tasa_incidencia']) if datos else 0

            if casos_reciente > casos_anterior * 1.2:
                tendencia = 'Creciente'
            elif casos_reciente < casos_anterior * 0.8:
                tendencia = 'Decreciente'
            else:
                tendencia = 'Estable'

            if models.clasificador is not None:
                try:
                    casos_hist = [int(d['casos_confirmados']) for d in datos]
                    ti_hist = [float(d['tasa_incidencia']) for d in datos]

                    casos_lag_1w = casos_hist[0]
                    casos_lag_4w = casos_hist[3] if len(casos_hist) > 3 else casos_lag_1w
                    ti_lag_1w = ti_hist[0]
                    ti_lag_4w = ti_hist[3] if len(ti_hist) > 3 else ti_lag_1w

                    semana = datetime.now().isocalendar()[1]
                    mes = datetime.now().month

                    try:
                        entidad_coded = models.label_encoder.transform([nombre])[0]
                    except Exception:
                        entidad_coded = id_region - 1

                    X_predict = pd.DataFrame({
                        'TI_LAG_1W': [ti_lag_1w],
                        'TI_LAG_4W': [ti_lag_4w],
                        'CASOS_LAG_1W': [casos_lag_1w],
                        'CASOS_LAG_4W': [casos_lag_4w],
                        'SEMANA_DEL_ANIO': [semana],
                        'MES': [mes],
                        'ENTIDAD_CODED': [entidad_coded]
                    })

                    probabilidad = round(models.clasificador.predict_proba(X_predict)[0][1] * 100, 1)
                except Exception:
                    probabilidad = min(100, max(0, ti_actual * 2))
            else:
                probabilidad = min(100, max(0, ti_actual * 2))

            if probabilidad < umbral_riesgo:
                continue

            if probabilidad >= 75:
                nivel = 'Crítico'
                mensaje = f'ALERTA CRÍTICA: {nombre} presenta un riesgo muy alto de brote de dengue.'
                recomendaciones = 'Activar protocolos de emergencia. Intensificar fumigación. Desplegar brigadas de salud. Comunicar a la población.'
            elif probabilidad >= 50:
                nivel = 'Alto'
                mensaje = f'ADVERTENCIA: {nombre} presenta riesgo elevado de brote de dengue.'
                recomendaciones = 'Aumentar vigilancia epidemiológica. Iniciar campañas de descacharrización. Preparar recursos médicos.'
            elif probabilidad >= 25:
                nivel = 'Moderado'
                mensaje = f'PRECAUCIÓN: {nombre} muestra indicadores de riesgo moderado.'
                recomendaciones = 'Mantener vigilancia activa. Reforzar educación comunitaria sobre prevención.'
            else:
                nivel = 'Bajo'
                mensaje = f'{nombre}: Riesgo bajo de brote.'
                recomendaciones = 'Continuar con medidas preventivas habituales.'

            casos_esperados = casos_reciente
            if models.regresor is not None:
                try:
                    X_reg = pd.DataFrame({
                        'casos_lag_1w': [casos_lag_1w],
                        'casos_lag_2w': [casos_hist[1] if len(casos_hist) > 1 else casos_lag_1w],
                        'casos_lag_3w': [casos_hist[2] if len(casos_hist) > 2 else casos_lag_1w],
                        'casos_lag_4w': [casos_lag_4w],
                        'ti_lag_1w': [ti_lag_1w],
                        'ti_lag_2w': [ti_hist[1] if len(ti_hist) > 1 else ti_lag_1w],
                        'casos_promedio_4w': [sum(casos_hist[:4]) / min(4, len(casos_hist))],
                        'tendencia_4w': [casos_lag_1w - casos_lag_4w],
                        'semana_anio': [semana],
                        'mes': [mes],
                        'estado_coded': [entidad_coded]
                    })
                    casos_esperados = int(max(0, models.regresor.predict(X_reg)[0]))
                except Exception:
                    pass

            alertas.append({
                'id_region': id_region,
                'estado': nombre,
                'nivel_riesgo': nivel,
                'probabilidad': probabilidad,
                'casos_esperados': casos_esperados,
                'casos_semana_actual': casos_reciente,
                'tendencia': tendencia,
                'mensaje': mensaje,
                'recomendaciones': recomendaciones,
                'fecha': fecha_actual,
                'enviada': False
            })

        alertas.sort(key=lambda x: x['probabilidad'], reverse=True)

        return jsonify({
            'success': True,
            'alertas': alertas,
            'total': len(alertas),
            'umbral_usado': umbral_riesgo,
            'fecha_analisis': fecha_actual
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@alertas_bp.route('/enviar', methods=['POST'])
def enviar_alerta():
    """Envía una alerta y la guarda en BD"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        data = request.get_json()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO alertas_epidemiologicas
            (id_region, estado, nivel, probabilidad, casos_esperados,
             mensaje, recomendaciones, tipo_notificacion, prioridad,
             estado_alerta, fecha_envio)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'enviada', NOW())
        """, (
            data.get('id_region'),
            data.get('estado'),
            data.get('nivel_riesgo'),
            data.get('probabilidad'),
            data.get('casos_esperados'),
            data.get('mensaje'),
            data.get('recomendaciones'),
            data.get('tipo_notificacion', 'sistema'),
            data.get('prioridad', 'alta')
        ))

        conn.commit()
        alerta_id = cursor.lastrowid

        return jsonify({
            'success': True,
            'mensaje': f'Alerta enviada exitosamente a {data.get("estado")}',
            'alerta_id': alerta_id,
            'tipo_envio': data.get('tipo_notificacion', 'sistema')
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@alertas_bp.route('/enviar-masivo', methods=['POST'])
def enviar_alertas_masivo():
    """Envía múltiples alertas"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        data = request.get_json()
        alertas = data.get('alertas', [])

        cursor = conn.cursor()
        enviadas = 0

        for alerta in alertas:
            cursor.execute("""
                INSERT INTO alertas_epidemiologicas
                (id_region, estado, nivel, probabilidad, casos_esperados,
                 mensaje, recomendaciones, tipo_notificacion, prioridad,
                 estado_alerta, fecha_envio)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'enviada', NOW())
            """, (
                alerta.get('id_region'),
                alerta.get('estado'),
                alerta.get('nivel_riesgo'),
                alerta.get('probabilidad'),
                alerta.get('casos_esperados'),
                alerta.get('mensaje'),
                alerta.get('recomendaciones'),
                data.get('tipo_notificacion', 'sistema'),
                data.get('prioridad', 'alta')
            ))
            enviadas += 1

        conn.commit()

        return jsonify({
            'success': True,
            'enviadas': enviadas,
            'mensaje': f'{enviadas} alertas enviadas exitosamente'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@alertas_bp.route('/activas', methods=['GET'])
def get_alertas_activas():
    """Obtiene las alertas activas"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, id_region, estado, nivel, probabilidad,
                   casos_esperados, mensaje, recomendaciones,
                   fecha_generacion, fecha_envio, estado_alerta
            FROM alertas_epidemiologicas
            WHERE estado_alerta IN ('activa', 'enviada')
            ORDER BY
                CASE nivel
                    WHEN 'Crítico' THEN 1
                    WHEN 'Alto' THEN 2
                    WHEN 'Moderado' THEN 3
                    ELSE 4
                END,
                fecha_generacion DESC
        """)
        alertas = cursor.fetchall()

        for a in alertas:
            if a.get('fecha_generacion'):
                a['fecha_generacion'] = a['fecha_generacion'].isoformat()
            if a.get('fecha_envio'):
                a['fecha_envio'] = a['fecha_envio'].isoformat()

        return jsonify({
            'success': True,
            'alertas': alertas,
            'total': len(alertas)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@alertas_bp.route('/historial', methods=['GET'])
def get_historial_alertas():
    """Obtiene el historial de alertas"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, id_region, estado, nivel, probabilidad,
                   mensaje, estado_alerta, fecha_generacion,
                   fecha_resolucion, resolucion
            FROM alertas_epidemiologicas
            ORDER BY fecha_generacion DESC LIMIT 100
        """)
        alertas = cursor.fetchall()

        for a in alertas:
            if a.get('fecha_generacion'):
                a['fecha_generacion'] = a['fecha_generacion'].isoformat()
            if a.get('fecha_resolucion'):
                a['fecha_resolucion'] = a['fecha_resolucion'].isoformat()

        return jsonify({
            'success': True,
            'alertas': alertas,
            'total': len(alertas)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@alertas_bp.route('/<int:alerta_id>/resolver', methods=['PUT'])
def resolver_alerta(alerta_id):
    """Marca una alerta como resuelta"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        data = request.get_json() or {}
        resolucion = data.get('resolucion', 'Alerta atendida')

        cursor = conn.cursor()
        cursor.execute("""
            UPDATE alertas_epidemiologicas
            SET estado_alerta = 'resuelta',
                fecha_resolucion = NOW(),
                resolucion = %s
            WHERE id = %s
        """, (resolucion, alerta_id))

        conn.commit()

        return jsonify({
            'success': True,
            'mensaje': 'Alerta marcada como resuelta'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
