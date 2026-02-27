# backend/config.py
# Configuración centralizada de ProeVira

import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'proyecto_integrador'),
    'pool_name': 'flask_pool',
    'pool_size': int(os.getenv('DB_POOL_SIZE', 20)),
    'pool_reset_session': True
}

# Mapeo de id_region (INEGI) a nombre de estado para el LabelEncoder
ESTADO_POR_ID = {
    1: 'Aguascalientes', 2: 'Baja California', 3: 'Baja California Sur',
    4: 'Campeche', 5: 'Coahuila de Zaragoza', 6: 'Colima',
    7: 'Chiapas', 8: 'Chihuahua', 9: 'Ciudad de México',
    10: 'Durango', 11: 'Guanajuato', 12: 'Guerrero',
    13: 'Hidalgo', 14: 'Jalisco', 15: 'México',
    16: 'Michoacan de Ocampo', 17: 'Morelos', 18: 'Nayarit',
    19: 'Nuevo León', 20: 'Oaxaca', 21: 'Puebla',
    22: 'Queretaro', 23: 'Quintana Roo', 24: 'San Luis Potosí',
    25: 'Sinaloa', 26: 'Sonora', 27: 'Tabasco',
    28: 'Tamaulipas', 29: 'Tlaxcala', 30: 'Veracruz de Ignacio de la Llave',
    31: 'Yucatan', 32: 'Zacatecas'
}

# Población 2025 por estado (CONAPO)
POBLACION_2025 = {
    1: 1512400, 2: 3968300, 3: 850700, 4: 1011800, 5: 3328500, 6: 775100,
    7: 6000100, 8: 3998500, 9: 9386700, 10: 1913400, 11: 6555200, 12: 3724300,
    13: 3327600, 14: 8847600, 15: 18016500, 16: 4975800, 17: 2056000, 18: 1294800,
    19: 6231200, 20: 4432900, 21: 6886400, 22: 2603300, 23: 1989500, 24: 2931400,
    25: 3274600, 26: 3154100, 27: 2601900, 28: 3682900, 29: 1421000, 30: 8871300,
    31: 2561900, 32: 1698200
}

UPLOAD_FOLDER = os.path.join(BACKEND_DIR, 'uploads', 'CSV')
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}

# Crear directorio de uploads si no existe
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
