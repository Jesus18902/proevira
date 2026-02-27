# backend/database.py
# Pool de conexiones MySQL y utilidad de conexión

import time
import mysql.connector
from mysql.connector import pooling
from config import DB_CONFIG

connection_pool = None
try:
    connection_pool = pooling.MySQLConnectionPool(**DB_CONFIG)
    print("[OK] Pool de conexiones MySQL creado")
except Exception as e:
    print(f"[ERROR] Error creando pool MySQL: {e}")


def get_db_connection(max_retries=3):
    """Obtiene una conexión del pool con reintentos"""
    if not connection_pool:
        return None

    for attempt in range(max_retries):
        try:
            conn = connection_pool.get_connection()
            return conn
        except pooling.PoolError as e:
            if attempt < max_retries - 1:
                print(f"Pool exhausto, reintento {attempt + 1}/{max_retries}...")
                time.sleep(0.5)
            else:
                print(f"Error: Pool de conexiones agotado después de {max_retries} intentos")
                raise e
    return None
