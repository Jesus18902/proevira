# backend/routes/predicciones.py
# Endpoints CRUD para predicciones guardadas

import json
from flask import Blueprint, request, jsonify
from datetime import datetime

from database import get_db_connection

predicciones_bp = Blueprint('predicciones', __name__, url_prefix='/api/predicciones')


def crear_tabla_predicciones():
    """Crea la tabla predicciones_guardadas si no existe"""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS predicciones_guardadas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fecha_generacion DATETIME NOT NULL,
                nombre_lote VARCHAR(100),
                estado VARCHAR(100) NOT NULL,
                id_region INT,
                fecha_inicio DATE NOT NULL,
                numero_semanas INT NOT NULL,
                datos_prediccion JSON NOT NULL,
                datos_validacion JSON,
                metricas JSON,
                usuario VARCHAR(100) DEFAULT 'sistema',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_fecha_gen (fecha_generacion),
                INDEX idx_estado (estado)
            )
        """)
        conn.commit()
        return True
    except Exception as e:
        print(f"Error creando tabla: {e}")
        return False
    finally:
        cursor.close()
        conn.close()


@predicciones_bp.route('/guardar', methods=['POST'])
def guardar_prediccion():
    """Guarda una predicción en la base de datos"""
    data = request.json

    required = ['estado', 'fecha_inicio', 'numero_semanas', 'predicciones']
    if not all(k in data for k in required):
        return jsonify({'error': 'Faltan campos requeridos'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a BD'}), 500

    try:
        cursor = conn.cursor()

        fecha_gen = datetime.now()
        nombre_lote = data.get('nombre_lote', f"Predicción {fecha_gen.strftime('%Y-%m-%d %H:%M')}")

        cursor.execute("""
            INSERT INTO predicciones_guardadas
            (fecha_generacion, nombre_lote, estado, id_region, fecha_inicio,
             numero_semanas, datos_prediccion, datos_validacion, metricas, usuario)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            fecha_gen,
            nombre_lote,
            data['estado'],
            data.get('id_region'),
            data['fecha_inicio'],
            data['numero_semanas'],
            json.dumps(data['predicciones']),
            json.dumps(data.get('validacion', [])),
            json.dumps(data.get('metricas', {})),
            data.get('usuario', 'sistema')
        ))

        conn.commit()
        prediccion_id = cursor.lastrowid

        return jsonify({
            'success': True,
            'mensaje': 'Predicción guardada exitosamente',
            'id': prediccion_id,
            'nombre_lote': nombre_lote,
            'fecha_generacion': fecha_gen.isoformat()
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@predicciones_bp.route('/historial', methods=['GET'])
def listar_predicciones():
    """Lista todas las predicciones guardadas"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, fecha_generacion, nombre_lote, estado,
                   fecha_inicio, numero_semanas, created_at
            FROM predicciones_guardadas
            ORDER BY fecha_generacion DESC LIMIT 100
        """)

        predicciones = cursor.fetchall()

        for p in predicciones:
            p['fecha_generacion'] = p['fecha_generacion'].isoformat() if p['fecha_generacion'] else None
            p['fecha_inicio'] = p['fecha_inicio'].isoformat() if p['fecha_inicio'] else None
            p['created_at'] = p['created_at'].isoformat() if p['created_at'] else None

        return jsonify({
            'success': True,
            'predicciones': predicciones,
            'total': len(predicciones)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@predicciones_bp.route('/<int:id>', methods=['GET'])
def obtener_prediccion(id):
    """Obtiene una predicción específica con todos sus datos"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM predicciones_guardadas WHERE id = %s", (id,))
        prediccion = cursor.fetchone()

        if not prediccion:
            return jsonify({'error': 'Predicción no encontrada'}), 404

        prediccion['datos_prediccion'] = json.loads(prediccion['datos_prediccion']) if prediccion['datos_prediccion'] else []
        prediccion['datos_validacion'] = json.loads(prediccion['datos_validacion']) if prediccion['datos_validacion'] else []
        prediccion['metricas'] = json.loads(prediccion['metricas']) if prediccion['metricas'] else {}
        prediccion['fecha_generacion'] = prediccion['fecha_generacion'].isoformat() if prediccion['fecha_generacion'] else None
        prediccion['fecha_inicio'] = prediccion['fecha_inicio'].isoformat() if prediccion['fecha_inicio'] else None
        prediccion['created_at'] = prediccion['created_at'].isoformat() if prediccion['created_at'] else None

        return jsonify({
            'success': True,
            'prediccion': prediccion
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@predicciones_bp.route('/<int:id>', methods=['DELETE'])
def eliminar_prediccion(id):
    """Elimina una predicción"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM predicciones_guardadas WHERE id = %s", (id,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'error': 'Predicción no encontrada'}), 404

        return jsonify({
            'success': True,
            'mensaje': 'Predicción eliminada'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
