# backend/routes/modelo.py
# Endpoints de prediccion: Regresion Lineal vs Polinomial

from flask import Blueprint, request, jsonify
from datetime import datetime

from config import ESTADO_POR_ID, POBLACION_2025
from database import get_db_connection
from ml import models, hay_modelos, mejor_modelo, predecir_casos, derivar_riesgo, construir_features

modelo_bp = Blueprint('modelo', __name__, url_prefix='/api/modelo')


@modelo_bp.route('/predecir-riesgo-automatico', methods=['POST'])
def predecir_riesgo_automatico():
    """Prediccion automatica que usa datos recientes de la BD."""
    conn = None
    try:
        if not hay_modelos():
            return jsonify({
                'success': False,
                'error': 'No hay modelos entrenados. Entrene via /api/modelos/entrenar'
            }), 400

        data = request.get_json() or {}
        id_region = data.get('id_region', 20)  # 20 = Oaxaca
        if isinstance(id_region, str):
            try:
                id_region = int(id_region)
            except ValueError:
                id_region = 20

        nombre_estado = ESTADO_POR_ID.get(id_region, f'Region {id_region}')
        poblacion = POBLACION_2025.get(nombre_estado, 100000)

        conn = get_db_connection()
        if conn is None:
            return jsonify({'success': False, 'error': 'Error de conexion a BD'}), 500

        cursor = conn.cursor(dictionary=True)

        # Obtener ultimos 4 registros para features
        cursor.execute("""
            SELECT casos_confirmados, tasa_incidencia, fecha_fin_semana
            FROM dato_epidemiologico
            WHERE id_region = %s
            ORDER BY fecha_fin_semana DESC
            LIMIT 4
        """, (id_region,))
        datos = cursor.fetchall()

        if len(datos) < 1:
            return jsonify({
                'success': False,
                'error': f'Sin datos epidemiologicos para {nombre_estado}'
            }), 404

        X_df, info_datos = construir_features(datos, id_region)
        info_datos['poblacion_region'] = poblacion

        # Asegurar que las features coincidan con las del modelo
        if models.feature_cols:
            for col in models.feature_cols:
                if col not in X_df.columns:
                    X_df[col] = 0
            X_df = X_df[models.feature_cols]

        # Predecir con ambos modelos
        predicciones = predecir_casos(X_df)
        casos_pred = predicciones.get('casos_mejor_modelo', 0)
        modelo_usado = predicciones.get('mejor', 'desconocido')

        # Derivar riesgo
        riesgo = derivar_riesgo(casos_pred, poblacion)

        # Calcular tendencia
        c1 = info_datos.get('casos_ultima_semana', 0)
        c4 = info_datos.get('casos_hace_4_semanas', 0)
        if c4 > 0:
            cambio_pct = round(((c1 - c4) / c4) * 100, 1)
        else:
            cambio_pct = 0.0

        if cambio_pct > 10:
            tendencia_dir = 'ascendente'
        elif cambio_pct < -10:
            tendencia_dir = 'descendente'
        else:
            tendencia_dir = 'estable'

        # Respuesta
        response = {
            'success': True,
            'modelo_utilizado': modelo_usado,
            'estado': nombre_estado,
            'id_region': id_region,
            'fecha_evaluacion': datetime.now().strftime('%Y-%m-%d'),

            # Campos que el frontend espera
            'riesgo_probabilidad': riesgo['probabilidad'],
            'riesgo_clase': riesgo['clase'],
            'nivel_riesgo': riesgo['nivel'],
            'mensaje': riesgo['mensaje'],
            'recomendaciones': riesgo.get('recomendaciones', ''),

            'datos_utilizados': info_datos,

            'tendencias': {
                'casos_ultima_semana': c1,
                'casos_hace_4_semanas': c4,
                'cambio_porcentual': cambio_pct,
                'direccion': tendencia_dir,
                'tasa_incidencia_actual': info_datos.get('tasa_incidencia_actual', 0)
            },

            'prediccion': {
                'casos_proxima_semana': casos_pred,
                'tasa_predicha': round((casos_pred / max(poblacion, 1)) * 100000, 2)
            },

            # Comparativa entre modelos
            'comparativa': {
                'lineal': predicciones.get('lineal', {}),
                'polinomial': predicciones.get('polinomial', {}),
                'mejor_modelo': modelo_usado
            }
        }

        # Guardar alerta si riesgo >= 50%
        if riesgo['probabilidad'] >= 50:
            try:
                cursor.execute("""
                    INSERT INTO alertas (tipo, nivel, estado, mensaje,
                                         probabilidad, casos_predichos,
                                         fecha_generacion, estado_alerta)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'activa')
                """, (
                    'prediccion_automatica',
                    riesgo['nivel'],
                    nombre_estado,
                    riesgo['mensaje'],
                    riesgo['probabilidad'],
                    casos_pred,
                    datetime.now()
                ))
                conn.commit()
            except Exception:
                pass  # Tabla puede no existir aun

        return jsonify(response), 200

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


@modelo_bp.route('/predecir-riesgo-avanzado', methods=['POST'])
def predecir_riesgo_avanzado():
    """Prediccion avanzada con parametros del usuario.

    Acepta:
      - id_region (int)
      - fecha_prediccion (str YYYY-MM-DD): fecha objetivo de la prediccion
      - incluir_validacion (bool): si True, busca casos reales para esa semana
      - semana_offset (int): offset semanal para proyecciones secuenciales
      - fecha_inicio / fecha_fin: rango alternativo (compat legacy)
      - num_semanas (int): cuantas semanas proyectar hacia adelante
    """
    conn = None
    try:
        if not hay_modelos():
            return jsonify({
                'success': False,
                'error': 'No hay modelos entrenados. Entrene via /api/modelos/entrenar'
            }), 400

        data = request.get_json(force=True) or {}
        id_region = data.get('id_region', 20)
        fecha_prediccion = data.get('fecha_prediccion')
        incluir_validacion = data.get('incluir_validacion', False)
        semana_offset = data.get('semana_offset', 0)
        # Legacy compat
        fecha_inicio = data.get('fecha_inicio')
        fecha_fin = data.get('fecha_fin')
        num_semanas = data.get('num_semanas', 1)

        if isinstance(id_region, str):
            try:
                id_region = int(id_region)
            except ValueError:
                id_region = 20

        nombre_estado = ESTADO_POR_ID.get(id_region, f'Region {id_region}')
        poblacion = POBLACION_2025.get(nombre_estado, 100000)

        conn = get_db_connection()
        if conn is None:
            return jsonify({'success': False, 'error': 'Error de conexion a BD'}), 500

        cursor = conn.cursor(dictionary=True)

        # Determinar fecha de referencia: buscar datos historicos ANTES de esa fecha
        fecha_ref = fecha_prediccion or fecha_fin
        from datetime import timedelta

        query = """
            SELECT casos_confirmados, tasa_incidencia, fecha_fin_semana
            FROM dato_epidemiologico
            WHERE id_region = %s
        """
        params = [id_region]

        if fecha_ref:
            # Obtener datos ANTERIORES a la fecha de prediccion
            query += " AND fecha_fin_semana < %s"
            params.append(fecha_ref)

        query += " ORDER BY fecha_fin_semana DESC LIMIT 4"
        cursor.execute(query, params)
        datos = cursor.fetchall()

        if len(datos) < 1:
            return jsonify({
                'success': False,
                'error': f'Sin datos historicos para {nombre_estado} antes de {fecha_ref}'
            }), 404

        # Determinar semana y mes de la fecha objetivo
        semana = None
        mes = None
        if fecha_ref:
            try:
                fecha_obj = datetime.strptime(str(fecha_ref), '%Y-%m-%d')
                semana = fecha_obj.isocalendar()[1]
                mes = fecha_obj.month
            except ValueError:
                pass

        X_df, info_datos = construir_features(datos, id_region, semana, mes)

        if models.feature_cols:
            for col in models.feature_cols:
                if col not in X_df.columns:
                    X_df[col] = 0
            X_df = X_df[models.feature_cols]

        predicciones_ml = predecir_casos(X_df)
        casos_pred = predicciones_ml.get('casos_mejor_modelo', 0)
        modelo_usado = predicciones_ml.get('mejor', 'desconocido')
        riesgo = derivar_riesgo(casos_pred, poblacion)

        # Metricas del modelo para el frontend
        metricas_modelo = {
            'r2': models.metricas_lineal.get('r2', 0) if modelo_usado == 'lineal' else models.metricas_polinomial.get('r2', 0),
            'mae': models.metricas_lineal.get('mae', 0) if modelo_usado == 'lineal' else models.metricas_polinomial.get('mae', 0),
            'accuracy': models.metricas_lineal.get('r2', 0) if modelo_usado == 'lineal' else models.metricas_polinomial.get('r2', 0)
        }

        # Proyecciones multiples semanas (si se solicitan)
        proyecciones = []
        proyecciones.append({
            'semana': info_datos.get('semana_epidemiologica', 0) + 1,
            'casos_predichos': casos_pred,
            'nivel_riesgo': riesgo['nivel'],
            'probabilidad': riesgo['probabilidad']
        })

        if num_semanas > 1:
            datos_iter = list(datos)
            for s in range(1, min(num_semanas, 12)):
                sem_siguiente = (info_datos.get('semana_epidemiologica', 0) + 1 + s) % 52 or 52
                mes_sig = ((info_datos.get('mes', 1) + (s // 4)) - 1) % 12 + 1

                nuevo_registro = {
                    'casos_confirmados': proyecciones[-1]['casos_predichos'],
                    'tasa_incidencia': (proyecciones[-1]['casos_predichos'] / max(poblacion, 1)) * 100000
                }
                datos_iter.insert(0, nuevo_registro)
                datos_iter = datos_iter[:4]

                X_next, _ = construir_features(datos_iter, id_region, sem_siguiente, mes_sig)
                if models.feature_cols:
                    for col in models.feature_cols:
                        if col not in X_next.columns:
                            X_next[col] = 0
                    X_next = X_next[models.feature_cols]

                pred_next = predecir_casos(X_next)
                casos_next = pred_next.get('casos_mejor_modelo', 0)
                riesgo_next = derivar_riesgo(casos_next, poblacion)

                proyecciones.append({
                    'semana': sem_siguiente,
                    'casos_predichos': casos_next,
                    'nivel_riesgo': riesgo_next['nivel'],
                    'probabilidad': riesgo_next['probabilidad']
                })

        # -----------------------------------------------------------
        # Validacion contra datos reales
        # -----------------------------------------------------------
        validacion = None
        if incluir_validacion and fecha_ref:
            try:
                # Buscar casos reales para la semana de fecha_prediccion
                # La semana epidemiologica cubre 7 dias alrededor de fecha_ref
                fecha_obj = datetime.strptime(str(fecha_ref), '%Y-%m-%d')
                fecha_inicio_sem = fecha_obj - timedelta(days=3)
                fecha_fin_sem = fecha_obj + timedelta(days=3)

                cursor.execute("""
                    SELECT casos_confirmados, tasa_incidencia, fecha_fin_semana
                    FROM dato_epidemiologico
                    WHERE id_region = %s
                      AND fecha_fin_semana BETWEEN %s AND %s
                    ORDER BY ABS(DATEDIFF(fecha_fin_semana, %s))
                    LIMIT 1
                """, (id_region, fecha_inicio_sem, fecha_fin_sem, fecha_ref))
                real_row = cursor.fetchone()

                if real_row:
                    casos_reales = int(real_row['casos_confirmados'])
                    error_abs = abs(casos_pred - casos_reales)
                    error_pct = round((error_abs / max(casos_reales, 1)) * 100, 1)
                    validacion = {
                        'casos_reales': casos_reales,
                        'casos_predichos': casos_pred,
                        'tasa_real': float(real_row.get('tasa_incidencia', 0)),
                        'fecha_real': str(real_row.get('fecha_fin_semana', '')),
                        'error_absoluto': error_abs,
                        'error_porcentual': error_pct
                    }
            except Exception as e:
                print(f"[WARN] Error buscando datos reales: {e}")

        # Legacy validation: rango de fechas
        if not validacion and fecha_inicio and fecha_fin:
            try:
                cursor.execute("""
                    SELECT SUM(casos_confirmados) as total_real
                    FROM dato_epidemiologico
                    WHERE id_region = %s
                      AND fecha_fin_semana BETWEEN %s AND %s
                """, (id_region, fecha_inicio, fecha_fin))
                real = cursor.fetchone()
                if real and real.get('total_real'):
                    total_real = int(real['total_real'])
                    total_pred = sum(p['casos_predichos'] for p in proyecciones)
                    error = abs(total_real - total_pred)
                    validacion = {
                        'casos_reales': total_real,
                        'casos_predichos': total_pred,
                        'total_real': total_real,
                        'total_predicho': total_pred,
                        'error_absoluto': error,
                        'error_porcentual': round((error / max(total_real, 1)) * 100, 1)
                    }
            except Exception:
                pass

        c1 = info_datos.get('casos_ultima_semana', 0)
        c4 = info_datos.get('casos_hace_4_semanas', 0)
        cambio_pct = round(((c1 - c4) / max(c4, 1)) * 100, 1) if c4 else 0.0

        # Nombre legible del modelo
        nombre_modelo_map = {
            'lineal': 'Regresion Lineal',
            'polinomial': f'Regresion Polinomial (grado {models.poly_degree})'
        }

        response = {
            'success': True,
            'modelo_utilizado': nombre_modelo_map.get(modelo_usado, modelo_usado),
            'estado': nombre_estado,
            'id_region': id_region,
            'fecha_evaluacion': fecha_ref or datetime.now().strftime('%Y-%m-%d'),

            'riesgo_probabilidad': riesgo['probabilidad'],
            'riesgo_clase': riesgo['clase'],
            'nivel_riesgo': riesgo['nivel'],
            'mensaje': riesgo['mensaje'],
            'recomendaciones': riesgo.get('recomendaciones', ''),

            'datos_utilizados': info_datos,
            'metricas_modelo': metricas_modelo,

            'tendencias': {
                'casos_ultima_semana': c1,
                'casos_hace_4_semanas': c4,
                'cambio_porcentual': cambio_pct,
                'direccion': 'ascendente' if cambio_pct > 10 else ('descendente' if cambio_pct < -10 else 'estable'),
                'tasa_incidencia_actual': info_datos.get('tasa_incidencia_actual', 0)
            },

            'prediccion': {
                'casos_proxima_semana': casos_pred,
                'tasa_predicha': round((casos_pred / max(poblacion, 1)) * 100000, 2)
            },

            'proyecciones': proyecciones,

            'comparativa': {
                'lineal': predicciones_ml.get('lineal', {}),
                'polinomial': predicciones_ml.get('polinomial', {}),
                'mejor_modelo': modelo_usado
            }
        }

        if validacion:
            response['validacion'] = validacion

        return jsonify(response), 200

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
