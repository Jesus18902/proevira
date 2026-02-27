# backend/routes/alertas.py
# Endpoints de alertas epidemiologicas

from flask import Blueprint, request, jsonify
from datetime import datetime

from config import ESTADO_POR_ID, POBLACION_2025
from database import get_db_connection
from ml import models, hay_modelos, predecir_casos, derivar_riesgo, construir_features

alertas_bp = Blueprint('alertas', __name__, url_prefix='/api/alertas')


def crear_tabla_alertas():
    """Crea la tabla de alertas si no existe."""
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alertas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tipo VARCHAR(50) NOT NULL DEFAULT 'manual',
                nivel VARCHAR(20) NOT NULL DEFAULT 'Bajo',
                estado VARCHAR(100),
                mensaje TEXT,
                probabilidad FLOAT DEFAULT 0,
                casos_predichos INT DEFAULT 0,
                fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                estado_alerta VARCHAR(20) DEFAULT 'activa',
                resuelto_por VARCHAR(100),
                fecha_resolucion DATETIME,
                notas TEXT,
                INDEX idx_estado_alerta (estado_alerta),
                INDEX idx_nivel (nivel),
                INDEX idx_fecha (fecha_generacion)
            )
        """)
        conn.commit()
        print("[OK] Tabla alertas verificada/creada")
    except Exception as e:
        print(f"[WARN] Error creando tabla alertas: {e}")
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


@alertas_bp.route('/generar-automaticas', methods=['POST'])
def generar_alertas_automaticas():
    """Genera alertas automaticas para todos los estados con modelo ML."""
    conn = None
    try:
        if not hay_modelos():
            return jsonify({
                'success': False,
                'error': 'No hay modelos entrenados'
            }), 400

        conn = get_db_connection()
        if conn is None:
            return jsonify({'success': False, 'error': 'Error de conexion a BD'}), 500

        cursor = conn.cursor(dictionary=True)

        # Obtener regiones con datos
        cursor.execute("""
            SELECT DISTINCT id_region FROM dato_epidemiologico
        """)
        regiones = [r['id_region'] for r in cursor.fetchall()]

        alertas_generadas = []
        errores = []

        for id_region in regiones:
            try:
                nombre_estado = ESTADO_POR_ID.get(id_region, f'Region {id_region}')
                poblacion = POBLACION_2025.get(nombre_estado, 100000)

                cursor.execute("""
                    SELECT casos_confirmados, tasa_incidencia, fecha_fin_semana
                    FROM dato_epidemiologico
                    WHERE id_region = %s
                    ORDER BY fecha_fin_semana DESC
                    LIMIT 4
                """, (id_region,))
                datos = cursor.fetchall()

                if len(datos) < 1:
                    continue

                X_df, info = construir_features(datos, id_region)

                if models.feature_cols:
                    for col in models.feature_cols:
                        if col not in X_df.columns:
                            X_df[col] = 0
                    X_df = X_df[models.feature_cols]

                predicciones = predecir_casos(X_df)
                casos_pred = predicciones.get('casos_mejor_modelo', 0)
                riesgo = derivar_riesgo(casos_pred, poblacion)

                # Solo crear alerta si riesgo >= Moderado
                if riesgo['probabilidad'] >= 25:
                    try:
                        cursor.execute("""
                            INSERT INTO alertas (tipo, nivel, estado, mensaje,
                                                 probabilidad, casos_predichos,
                                                 fecha_generacion, estado_alerta)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, 'activa')
                        """, (
                            'automatica',
                            riesgo['nivel'],
                            nombre_estado,
                            riesgo['mensaje'],
                            riesgo['probabilidad'],
                            casos_pred,
                            datetime.now()
                        ))
                    except Exception:
                        pass

                    alertas_generadas.append({
                        'estado': nombre_estado,
                        'id_region': id_region,
                        'nivel_riesgo': riesgo['nivel'],
                        'probabilidad': riesgo['probabilidad'],
                        'casos_predichos': casos_pred,
                        'modelo_usado': predicciones.get('mejor', 'desconocido'),
                        'mensaje': riesgo['mensaje']
                    })

            except Exception as e:
                errores.append({'region': id_region, 'error': str(e)})

        if alertas_generadas:
            conn.commit()

        return jsonify({
            'success': True,
            'alertas_generadas': len(alertas_generadas),
            'alertas': alertas_generadas,
            'regiones_evaluadas': len(regiones),
            'errores': errores
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


@alertas_bp.route('/enviar', methods=['POST'])
def enviar_alerta():
    """Crear alerta manual."""
    conn = None
    try:
        data = request.get_json() or {}
        tipo = data.get('tipo', 'manual')
        nivel = data.get('nivel', 'Bajo')
        estado = data.get('estado', '')
        mensaje = data.get('mensaje', '')

        conn = get_db_connection()
        if conn is None:
            return jsonify({'success': False, 'error': 'Error de conexion a BD'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO alertas (tipo, nivel, estado, mensaje,
                                 probabilidad, casos_predichos,
                                 fecha_generacion, estado_alerta)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'activa')
        """, (
            tipo, nivel, estado, mensaje,
            data.get('probabilidad', 0),
            data.get('casos_predichos', 0),
            datetime.now()
        ))
        conn.commit()

        return jsonify({
            'success': True,
            'mensaje': 'Alerta creada correctamente',
            'id_alerta': cursor.lastrowid
        }), 201

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


@alertas_bp.route('/enviar-masivo', methods=['POST'])
def enviar_alerta_masiva():
    """Enviar alertas masivas a multiples estados."""
    conn = None
    try:
        data = request.get_json() or {}
        estados = data.get('estados', [])
        nivel = data.get('nivel', 'Moderado')
        mensaje = data.get('mensaje', 'Alerta masiva generada')
        tipo = data.get('tipo', 'masiva')

        if not estados:
            return jsonify({'success': False, 'error': 'Se requiere lista de estados'}), 400

        conn = get_db_connection()
        if conn is None:
            return jsonify({'success': False, 'error': 'Error de conexion a BD'}), 500

        cursor = conn.cursor()
        creadas = 0

        for estado in estados:
            try:
                cursor.execute("""
                    INSERT INTO alertas (tipo, nivel, estado, mensaje,
                                         fecha_generacion, estado_alerta)
                    VALUES (%s, %s, %s, %s, %s, 'activa')
                """, (tipo, nivel, estado, mensaje, datetime.now()))
                creadas += 1
            except Exception:
                pass

        conn.commit()

        return jsonify({
            'success': True,
            'mensaje': f'{creadas} alertas enviadas',
            'alertas_enviadas': creadas
        }), 201

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


@alertas_bp.route('/activas', methods=['GET'])
def get_alertas_activas():
    """Obtener alertas activas."""
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'success': False, 'error': 'Error de conexion a BD'}), 500

        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT * FROM alertas
            WHERE estado_alerta = 'activa'
            ORDER BY fecha_generacion DESC
            LIMIT 100
        """)
        alertas = cursor.fetchall()

        # Serializar fechas
        for a in alertas:
            for key in ['fecha_generacion', 'fecha_resolucion']:
                if a.get(key) and hasattr(a[key], 'strftime'):
                    a[key] = a[key].strftime('%Y-%m-%d %H:%M:%S')

        return jsonify({
            'success': True,
            'alertas': alertas,
            'total': len(alertas)
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


@alertas_bp.route('/historial', methods=['GET'])
def get_historial_alertas():
    """Historial completo de alertas."""
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'success': False, 'error': 'Error de conexion a BD'}), 500

        cursor = conn.cursor(dictionary=True)
        limit = request.args.get('limit', 200, type=int)
        estado_filtro = request.args.get('estado')
        nivel_filtro = request.args.get('nivel')

        query = "SELECT * FROM alertas WHERE 1=1"
        params = []

        if estado_filtro:
            query += " AND estado = %s"
            params.append(estado_filtro)
        if nivel_filtro:
            query += " AND nivel = %s"
            params.append(nivel_filtro)

        query += " ORDER BY fecha_generacion DESC LIMIT %s"
        params.append(limit)

        cursor.execute(query, params)
        alertas = cursor.fetchall()

        for a in alertas:
            for key in ['fecha_generacion', 'fecha_resolucion']:
                if a.get(key) and hasattr(a[key], 'strftime'):
                    a[key] = a[key].strftime('%Y-%m-%d %H:%M:%S')

        return jsonify({
            'success': True,
            'alertas': alertas,
            'total': len(alertas)
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


@alertas_bp.route('/<int:id_alerta>/resolver', methods=['PUT'])
def resolver_alerta(id_alerta):
    """Marcar alerta como resuelta."""
    conn = None
    try:
        data = request.get_json() or {}
        resuelto_por = data.get('resuelto_por', 'sistema')
        notas = data.get('notas', '')

        conn = get_db_connection()
        if conn is None:
            return jsonify({'success': False, 'error': 'Error de conexion a BD'}), 500

        cursor = conn.cursor()
        cursor.execute("""
            UPDATE alertas
            SET estado_alerta = 'resuelta',
                resuelto_por = %s,
                notas = %s,
                fecha_resolucion = %s
            WHERE id = %s
        """, (resuelto_por, notas, datetime.now(), id_alerta))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'success': False, 'error': 'Alerta no encontrada'}), 404

        return jsonify({
            'success': True,
            'mensaje': f'Alerta {id_alerta} resuelta'
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass
