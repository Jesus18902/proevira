# backend/routes/auth.py
# Endpoints de autenticación

from flask import Blueprint, request, jsonify
import bcrypt
from database import get_db_connection

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    """Autenticación de usuarios con bcrypt"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Error de conexión a la base de datos'}), 500

    try:
        data = request.get_json(force=True)
        email = data.get('email', '').strip()
        contrasena = data.get('contrasena', '')

        if not email or not contrasena:
            return jsonify({'success': False, 'error': 'Email y contraseña son requeridos'}), 400

        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            'SELECT id_usuario, nombre, email, contrasena, rol, estado FROM usuario WHERE email = %s',
            (email,)
        )
        usuario = cursor.fetchone()

        if not usuario:
            return jsonify({'success': False, 'error': 'Credenciales inválidas'}), 401

        if usuario.get('estado') == 'inactivo':
            return jsonify({'success': False, 'error': 'Cuenta desactivada'}), 403

        # Verificar contraseña con bcrypt
        try:
            password_valida = bcrypt.checkpw(contrasena.encode('utf-8'), usuario['contrasena'].encode('utf-8'))
            if not password_valida:
                return jsonify({'success': False, 'error': 'Credenciales inválidas'}), 401
        except Exception as e:
            print(f"Error verificando contrasena: {e}")
            # Fallback: comparación directa (solo para desarrollo)
            if contrasena != usuario['contrasena']:
                return jsonify({'success': False, 'error': 'Credenciales inválidas'}), 401

        # Registrar en bitácora
        try:
            cursor.execute(
                'INSERT INTO bitacora (id_usuario, fecha_hora, accion) VALUES (%s, NOW(), %s)',
                (usuario['id_usuario'], f"Inicio de sesión: {email}")
            )
            conn.commit()
        except Exception as e:
            print(f"No se pudo registrar en bitacora: {e}")

        return jsonify({
            'success': True,
            'message': 'Login exitoso',
            'usuario': {
                'id': usuario['id_usuario'],
                'nombre': usuario['nombre'],
                'email': usuario['email'],
                'rol': usuario['rol']
            }
        })

    except Exception as e:
        print(f"Error en login: {e}")
        return jsonify({'success': False, 'error': 'Error interno del servidor'}), 500
    finally:
        cursor.close()
        conn.close()
