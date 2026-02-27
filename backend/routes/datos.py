# backend/routes/datos.py
# Endpoints de gestión de datos: upload CSV, procesamiento, estadísticas, limpieza

import os
import numpy as np
import pandas as pd
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from datetime import datetime

from config import UPLOAD_FOLDER, ALLOWED_EXTENSIONS, ESTADO_POR_ID, POBLACION_2025
from database import get_db_connection

datos_bp = Blueprint('datos', __name__, url_prefix='/api/datos')


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@datos_bp.route('/cargar-csv', methods=['POST'])
def cargar_csv():
    """Carga de archivos CSV"""
    try:
        if 'archivo' not in request.files:
            return jsonify({'success': False, 'error': 'No se subió ningún archivo'}), 400

        archivo = request.files['archivo']

        if archivo.filename == '':
            return jsonify({'success': False, 'error': 'No se seleccionó ningún archivo'}), 400

        if archivo and allowed_file(archivo.filename):
            filename = secure_filename(archivo.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            nombre_archivo = f"dengue_{timestamp}_{filename}"
            ruta_archivo = os.path.join(UPLOAD_FOLDER, nombre_archivo)

            archivo.save(ruta_archivo)

            conn = get_db_connection()
            if conn:
                try:
                    cursor = conn.cursor()
                    cursor.execute(
                        'INSERT INTO bitacora (id_usuario, fecha_hora, accion) VALUES (%s, NOW(), %s)',
                        (1, f"Archivo cargado: {nombre_archivo}")
                    )
                    conn.commit()
                except Exception as e:
                    print(f"No se pudo guardar en bitacora: {e}")
                finally:
                    cursor.close()
                    conn.close()

            return jsonify({
                'success': True,
                'message': 'Archivo cargado exitosamente',
                'nombreArchivo': nombre_archivo,
                'ruta': ruta_archivo
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Tipo de archivo no permitido. Use CSV, XLS o XLSX'
            }), 400

    except Exception as e:
        print(f"Error cargando archivo: {e}")
        return jsonify({'success': False, 'error': 'Error al cargar archivo'}), 500


@datos_bp.route('/estadisticas', methods=['GET'])
def get_estadisticas_datos():
    """Obtiene estadísticas generales de los datos cargados"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) as total FROM dato_epidemiologico")
        total_registros = cursor.fetchone()['total']

        cursor.execute("SELECT MIN(fecha_fin_semana) as fecha_min, MAX(fecha_fin_semana) as fecha_max FROM dato_epidemiologico")
        rango = cursor.fetchone()

        cursor.execute("SELECT COALESCE(SUM(casos_confirmados), 0) as total FROM dato_epidemiologico")
        total_casos = cursor.fetchone()['total']

        cursor.execute("""
            SELECT YEAR(fecha_fin_semana) as anio,
                   COUNT(*) as registros,
                   SUM(casos_confirmados) as casos
            FROM dato_epidemiologico
            GROUP BY YEAR(fecha_fin_semana)
            ORDER BY anio
        """)
        por_anio = cursor.fetchall()

        cursor.execute("SELECT COUNT(DISTINCT id_region) as total FROM dato_epidemiologico")
        regiones_con_datos = cursor.fetchone()['total']

        cursor.execute("SELECT MAX(fecha_carga) as ultima FROM dato_epidemiologico")
        ultima_carga = cursor.fetchone()['ultima']

        return jsonify({
            'success': True,
            'total_registros': total_registros,
            'total_casos': int(total_casos) if total_casos else 0,
            'fecha_inicio': rango['fecha_min'].isoformat() if rango['fecha_min'] else None,
            'fecha_fin': rango['fecha_max'].isoformat() if rango['fecha_max'] else None,
            'regiones_con_datos': regiones_con_datos,
            'ultima_carga': ultima_carga.isoformat() if ultima_carga else None,
            'por_anio': por_anio
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@datos_bp.route('/procesar-csv', methods=['POST'])
def procesar_csv_preview():
    """Procesa un archivo CSV y devuelve preview sin guardar en BD"""
    if 'archivo' not in request.files:
        return jsonify({'error': 'No se envió ningun archivo'}), 400

    archivo = request.files['archivo']
    if archivo.filename == '':
        return jsonify({'error': 'Nombre de archivo vacío'}), 400

    if not archivo.filename.endswith('.csv'):
        return jsonify({'error': 'Solo se permiten archivos CSV'}), 400

    try:
        df = pd.read_csv(archivo)
        registros_originales = len(df)

        columnas_requeridas = ['FECHA_SIGN_SINTOMAS', 'ENTIDAD_RES', 'ESTATUS_CASO']
        columnas_faltantes = [c for c in columnas_requeridas if c not in df.columns]
        if columnas_faltantes:
            return jsonify({
                'success': False,
                'error': f'Columnas faltantes: {", ".join(columnas_faltantes)}',
                'columnas_encontradas': list(df.columns)
            }), 400

        df['FECHA_SIGN_SINTOMAS'] = pd.to_datetime(df['FECHA_SIGN_SINTOMAS'], errors='coerce')
        df.dropna(subset=['FECHA_SIGN_SINTOMAS'], inplace=True)
        df_confirmados = df[df['ESTATUS_CASO'] == 1].copy()

        if len(df_confirmados) == 0:
            return jsonify({
                'success': False,
                'error': 'No hay casos confirmados (ESTATUS_CASO=1) en el archivo',
                'registros_totales': registros_originales
            }), 400

        df_confirmados['POBLACION'] = df_confirmados['ENTIDAD_RES'].map(POBLACION_2025)
        df_confirmados.dropna(subset=['POBLACION'], inplace=True)
        df_confirmados['NOMBRE_ESTADO'] = df_confirmados['ENTIDAD_RES'].map(ESTADO_POR_ID)

        df_ts = (
            df_confirmados.groupby(['ENTIDAD_RES', 'NOMBRE_ESTADO', 'POBLACION'])
            .resample('W', on='FECHA_SIGN_SINTOMAS')
            .size()
            .reset_index(name='casos_confirmados')
        )
        df_ts.rename(columns={'FECHA_SIGN_SINTOMAS': 'fecha_fin_semana'}, inplace=True)

        df_ts['tasa_incidencia'] = (df_ts['casos_confirmados'] / df_ts['POBLACION']) * 100000

        umbral_riesgo = df_ts['tasa_incidencia'].quantile(0.75)
        df_ts['riesgo_brote_target'] = np.where(df_ts['tasa_incidencia'] > umbral_riesgo, 1, 0).astype(int)

        preview_data = []
        for _, row in df_ts.head(10).iterrows():
            preview_data.append({
                'estado': row['NOMBRE_ESTADO'],
                'id_region': int(row['ENTIDAD_RES']),
                'fecha_fin_semana': row['fecha_fin_semana'].strftime('%Y-%m-%d'),
                'casos_confirmados': int(row['casos_confirmados']),
                'tasa_incidencia': round(float(row['tasa_incidencia']), 4),
                'riesgo_brote': bool(row['riesgo_brote_target'] == 1)
            })

        anios_procesados = sorted(df_ts['fecha_fin_semana'].dt.year.unique().tolist())
        estados_procesados = df_ts['NOMBRE_ESTADO'].unique().tolist()
        fecha_inicio = df_ts['fecha_fin_semana'].min().strftime('%Y-%m-%d')
        fecha_fin = df_ts['fecha_fin_semana'].max().strftime('%Y-%m-%d')

        return jsonify({
            'success': True,
            'resumen': {
                'registros_originales': registros_originales,
                'casos_confirmados': len(df_confirmados),
                'registros_procesados': len(df_ts),
                'estados_procesados': len(estados_procesados),
                'anios': anios_procesados,
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
                'umbral_riesgo_ti': round(float(umbral_riesgo), 4)
            },
            'preview': preview_data
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@datos_bp.route('/procesar-csv-completo', methods=['POST'])
def procesar_csv_completo():
    """Carga un archivo CSV con datos de dengue y los inserta en BD"""
    if 'archivo' not in request.files:
        return jsonify({'error': 'No se envió ningún archivo'}), 400

    archivo = request.files['archivo']
    if archivo.filename == '':
        return jsonify({'error': 'Nombre de archivo vacío'}), 400

    if not archivo.filename.endswith('.csv'):
        return jsonify({'error': 'Solo se permiten archivos CSV'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a base de datos'}), 500

    cursor = None
    try:
        df = pd.read_csv(archivo)
        registros_originales = len(df)

        columnas_requeridas = ['FECHA_SIGN_SINTOMAS', 'ENTIDAD_RES', 'ESTATUS_CASO']
        columnas_faltantes = [c for c in columnas_requeridas if c not in df.columns]
        if columnas_faltantes:
            return jsonify({
                'error': f'Columnas faltantes: {", ".join(columnas_faltantes)}',
                'columnas_encontradas': list(df.columns)
            }), 400

        df['FECHA_SIGN_SINTOMAS'] = pd.to_datetime(df['FECHA_SIGN_SINTOMAS'], errors='coerce')
        df.dropna(subset=['FECHA_SIGN_SINTOMAS'], inplace=True)
        df_confirmados = df[df['ESTATUS_CASO'] == 1].copy()

        if len(df_confirmados) == 0:
            return jsonify({
                'error': 'No hay casos confirmados (ESTATUS_CASO=1) en el archivo',
                'registros_totales': registros_originales
            }), 400

        df_confirmados['POBLACION'] = df_confirmados['ENTIDAD_RES'].map(POBLACION_2025)
        df_confirmados.dropna(subset=['POBLACION'], inplace=True)
        df_confirmados['NOMBRE_ESTADO'] = df_confirmados['ENTIDAD_RES'].map(ESTADO_POR_ID)

        df_ts = (
            df_confirmados.groupby(['ENTIDAD_RES', 'NOMBRE_ESTADO', 'POBLACION'])
            .resample('W', on='FECHA_SIGN_SINTOMAS')
            .size()
            .reset_index(name='casos_confirmados')
        )
        df_ts.rename(columns={'FECHA_SIGN_SINTOMAS': 'fecha_fin_semana'}, inplace=True)

        df_ts['tasa_incidencia'] = (df_ts['casos_confirmados'] / df_ts['POBLACION']) * 100000

        umbral_riesgo = df_ts['tasa_incidencia'].quantile(0.75)
        df_ts['riesgo_brote_target'] = np.where(df_ts['tasa_incidencia'] > umbral_riesgo, 1, 0).astype(int)

        cursor = conn.cursor()
        fecha_carga = datetime.now().date()

        insert_sql = """
        INSERT INTO dato_epidemiologico
            (id_enfermedad, id_region, fecha_fin_semana, casos_confirmados,
             defunciones, tasa_incidencia, riesgo_brote_target, fecha_carga)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            casos_confirmados = VALUES(casos_confirmados),
            tasa_incidencia = VALUES(tasa_incidencia),
            riesgo_brote_target = VALUES(riesgo_brote_target),
            fecha_carga = VALUES(fecha_carga)
        """

        registros_insertados = 0
        for _, row in df_ts.iterrows():
            cursor.execute(insert_sql, (
                1,
                int(row['ENTIDAD_RES']),
                row['fecha_fin_semana'].date(),
                int(row['casos_confirmados']),
                0,
                round(float(row['tasa_incidencia']), 4),
                int(row['riesgo_brote_target']),
                fecha_carga
            ))
            registros_insertados += 1

        conn.commit()

        anios_procesados = df_ts['fecha_fin_semana'].dt.year.unique().tolist()
        estados_procesados = df_ts['NOMBRE_ESTADO'].unique().tolist()

        return jsonify({
            'success': True,
            'mensaje': f'Datos cargados exitosamente',
            'estadisticas': {
                'registros_originales': registros_originales,
                'casos_confirmados': len(df_confirmados),
                'registros_insertados': registros_insertados,
                'anios_procesados': sorted(anios_procesados),
                'estados_procesados': len(estados_procesados),
                'fecha_carga': fecha_carga.isoformat()
            }
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@datos_bp.route('/limpiar', methods=['DELETE'])
def limpiar_datos():
    """Elimina todos los datos epidemiológicos"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM dato_epidemiologico")
        registros_antes = cursor.fetchone()[0]

        cursor.execute("DELETE FROM dato_epidemiologico")
        conn.commit()

        return jsonify({
            'success': True,
            'mensaje': 'Datos eliminados',
            'registros_eliminados': registros_antes
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@datos_bp.route('/limpiar-anio/<int:anio>', methods=['DELETE'])
def limpiar_datos_anio(anio):
    """Elimina datos de un año específico"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM dato_epidemiologico WHERE YEAR(fecha_fin_semana) = %s", (anio,))
        registros_antes = cursor.fetchone()[0]

        cursor.execute("DELETE FROM dato_epidemiologico WHERE YEAR(fecha_fin_semana) = %s", (anio,))
        conn.commit()

        return jsonify({
            'success': True,
            'mensaje': f'Datos del año {anio} eliminados',
            'registros_eliminados': registros_antes
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@datos_bp.route('/resumen-por-estado', methods=['GET'])
def resumen_por_estado():
    """Obtiene resumen de datos por estado"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                r.id_region,
                r.nombre as estado,
                r.poblacion,
                COUNT(d.id_dato) as total_registros,
                COALESCE(SUM(d.casos_confirmados), 0) as total_casos,
                COALESCE(AVG(d.tasa_incidencia), 0) as promedio_ti,
                MIN(d.fecha_fin_semana) as fecha_inicio,
                MAX(d.fecha_fin_semana) as fecha_fin
            FROM region r
            LEFT JOIN dato_epidemiologico d ON r.id_region = d.id_region
            GROUP BY r.id_region, r.nombre, r.poblacion
            ORDER BY total_casos DESC
        """)
        estados = cursor.fetchall()

        for estado in estados:
            if estado['fecha_inicio']:
                estado['fecha_inicio'] = estado['fecha_inicio'].isoformat()
            if estado['fecha_fin']:
                estado['fecha_fin'] = estado['fecha_fin'].isoformat()
            if estado['promedio_ti']:
                estado['promedio_ti'] = float(estado['promedio_ti'])

        return jsonify({'success': True, 'estados': estados})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
