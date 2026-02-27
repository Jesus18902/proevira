# backend/routes/reportes.py
# Endpoints de reportes epidemiológicos

from flask import Blueprint, jsonify
from datetime import datetime

from database import get_db_connection

reportes_bp = Blueprint('reportes', __name__, url_prefix='/api/reportes')


@reportes_bp.route('/epidemiologico', methods=['GET'])
def get_reporte_epidemiologico():
    """Reporte epidemiológico completo con estadísticas históricas"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        cursor = conn.cursor(dictionary=True)

        # 1. Estadísticas generales
        cursor.execute("""
            SELECT
                COUNT(*) as total_registros,
                COALESCE(SUM(casos_confirmados), 0) as total_casos,
                COALESCE(AVG(casos_confirmados), 0) as promedio_casos,
                COALESCE(MAX(casos_confirmados), 0) as max_casos,
                MIN(fecha_fin_semana) as fecha_inicio_datos,
                MAX(fecha_fin_semana) as fecha_fin_datos,
                COUNT(DISTINCT id_region) as total_estados,
                COUNT(DISTINCT YEAR(fecha_fin_semana)) as total_anios
            FROM dato_epidemiologico
        """)
        estadisticas = cursor.fetchone()

        for key in estadisticas:
            if hasattr(estadisticas[key], 'real'):
                estadisticas[key] = float(estadisticas[key])
            elif isinstance(estadisticas[key], (int, float)):
                estadisticas[key] = int(estadisticas[key]) if isinstance(estadisticas[key], int) else float(estadisticas[key])

        # 2. Top 10 estados
        cursor.execute("""
            SELECT
                r.nombre as estado, d.id_region,
                SUM(d.casos_confirmados) as total_casos,
                AVG(d.casos_confirmados) as promedio_semanal,
                MAX(d.casos_confirmados) as max_semanal,
                COUNT(*) as semanas_con_datos
            FROM dato_epidemiologico d
            JOIN region r ON d.id_region = r.id_region
            GROUP BY d.id_region, r.nombre
            ORDER BY total_casos DESC LIMIT 10
        """)
        top_estados = cursor.fetchall()
        for estado in top_estados:
            for key in estado:
                if hasattr(estado[key], 'real'):
                    estado[key] = float(estado[key])

        # 3. Evolución anual
        cursor.execute("""
            SELECT
                YEAR(fecha_fin_semana) as anio,
                SUM(casos_confirmados) as total_casos,
                AVG(casos_confirmados) as promedio_semanal,
                COUNT(DISTINCT id_region) as estados_afectados
            FROM dato_epidemiologico
            GROUP BY YEAR(fecha_fin_semana) ORDER BY anio
        """)
        evolucion_anual = cursor.fetchall()
        for item in evolucion_anual:
            for key in item:
                if hasattr(item[key], 'real'):
                    item[key] = float(item[key])

        # 4. Tendencia mensual (últimos 24 meses)
        cursor.execute("""
            SELECT
                DATE_FORMAT(fecha_fin_semana, '%Y-%m') as mes,
                SUM(casos_confirmados) as total_casos,
                AVG(casos_confirmados) as promedio
            FROM dato_epidemiologico
            WHERE fecha_fin_semana >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
            GROUP BY DATE_FORMAT(fecha_fin_semana, '%Y-%m') ORDER BY mes
        """)
        tendencia_mensual = cursor.fetchall()
        for item in tendencia_mensual:
            for key in item:
                if hasattr(item[key], 'real'):
                    item[key] = float(item[key])

        # 5. Distribución por semana epidemiológica
        cursor.execute("""
            SELECT
                WEEK(fecha_fin_semana) as semana_epidemiologica,
                AVG(casos_confirmados) as promedio_casos,
                SUM(casos_confirmados) as total_casos
            FROM dato_epidemiologico
            GROUP BY WEEK(fecha_fin_semana) ORDER BY WEEK(fecha_fin_semana)
        """)
        por_semana_epi = cursor.fetchall()
        for item in por_semana_epi:
            for key in item:
                if hasattr(item[key], 'real'):
                    item[key] = float(item[key])

        # 6. Comparativa de años
        cursor.execute("""
            SELECT
                YEAR(fecha_fin_semana) as anio,
                MONTH(fecha_fin_semana) as mes,
                SUM(casos_confirmados) as casos
            FROM dato_epidemiologico
            WHERE YEAR(fecha_fin_semana) >= YEAR(CURDATE()) - 3
            GROUP BY YEAR(fecha_fin_semana), MONTH(fecha_fin_semana)
            ORDER BY anio, mes
        """)
        comparativa_anual = cursor.fetchall()
        for item in comparativa_anual:
            for key in item:
                if hasattr(item[key], 'real'):
                    item[key] = float(item[key])

        # 7. Alertas de alto riesgo
        cursor.execute("""
            SELECT
                r.nombre as estado,
                d.fecha_fin_semana as fecha_inicio,
                WEEK(d.fecha_fin_semana) as semana_epidemiologica,
                d.casos_confirmados, d.tasa_incidencia
            FROM dato_epidemiologico d
            JOIN region r ON d.id_region = r.id_region
            WHERE d.casos_confirmados > (
                SELECT AVG(casos_confirmados) * 2 FROM dato_epidemiologico
            )
            ORDER BY d.casos_confirmados DESC LIMIT 20
        """)
        alertas_alto_riesgo = cursor.fetchall()
        for item in alertas_alto_riesgo:
            item['fecha_inicio'] = item['fecha_inicio'].isoformat() if item['fecha_inicio'] else None
            for key in item:
                if hasattr(item[key], 'real'):
                    item[key] = float(item[key])

        if estadisticas.get('fecha_inicio_datos'):
            estadisticas['fecha_inicio_datos'] = estadisticas['fecha_inicio_datos'].isoformat()
        if estadisticas.get('fecha_fin_datos'):
            estadisticas['fecha_fin_datos'] = estadisticas['fecha_fin_datos'].isoformat()

        return jsonify({
            'success': True,
            'estadisticas': estadisticas,
            'top_estados': top_estados,
            'evolucion_anual': evolucion_anual,
            'tendencia_mensual': tendencia_mensual,
            'por_semana_epidemiologica': por_semana_epi,
            'comparativa_anual': comparativa_anual,
            'alertas_alto_riesgo': alertas_alto_riesgo,
            'generado_en': datetime.now().isoformat()
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@reportes_bp.route('/estado/<int:id_region>', methods=['GET'])
def get_reporte_estado(id_region):
    """Reporte detallado por estado específico"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT nombre FROM region WHERE id_region = %s", (id_region,))
        estado_info = cursor.fetchone()
        if not estado_info:
            return jsonify({'error': 'Estado no encontrado'}), 404

        cursor.execute("""
            SELECT
                SUM(casos_confirmados) as total_casos,
                AVG(casos_confirmados) as promedio_semanal,
                MAX(casos_confirmados) as max_casos,
                AVG(tasa_incidencia) as tasa_promedio
            FROM dato_epidemiologico WHERE id_region = %s
        """, (id_region,))
        stats = cursor.fetchone()
        for key in stats:
            if hasattr(stats[key], 'real'):
                stats[key] = float(stats[key])

        cursor.execute("""
            SELECT
                DATE_FORMAT(fecha_fin_semana, '%Y-%m') as mes,
                SUM(casos_confirmados) as casos
            FROM dato_epidemiologico WHERE id_region = %s
            GROUP BY DATE_FORMAT(fecha_fin_semana, '%Y-%m') ORDER BY mes
        """, (id_region,))
        evolucion = cursor.fetchall()
        for item in evolucion:
            for key in item:
                if hasattr(item[key], 'real'):
                    item[key] = float(item[key])

        return jsonify({
            'success': True,
            'estado': estado_info['nombre'],
            'id_region': id_region,
            'estadisticas': stats,
            'evolucion_mensual': evolucion
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
