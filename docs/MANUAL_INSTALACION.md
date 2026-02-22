# 📘 Manual de Instalación - ProeVira

## Sistema de Predicción de Enfermedades Virales (Dengue)

**Versión:** 2.0
**Fecha:** Diciembre 2025
**Autores:** Equipo ProeVira

---

## 📑 Índice

1. [Requisitos del Sistema](#1-requisitos-del-sistema)
2. [Instalación de Prerrequisitos](#2-instalación-de-prerrequisitos)
3. [Configuración de Base de Datos](#3-configuración-de-base-de-datos)
4. [Instalación del Backend (Flask/Python)](#4-instalación-del-backend-flaskpython)
5. [Instalación del Frontend (React)](#5-instalación-del-frontend-react)
6. [Carga de Datos Epidemiológicos](#6-carga-de-datos-epidemiológicos)
7. [Ejecución del Sistema](#7-ejecución-del-sistema)
8. [Verificación de la Instalación](#8-verificación-de-la-instalación)
9. [Solución de Problemas Comunes](#9-solución-de-problemas-comunes)

---

## 1. Requisitos del Sistema

### 1.1 Hardware Mínimo

| Componente          | Requisito Mínimo            | Recomendado                 |
| ------------------- | --------------------------- | --------------------------- |
| Procesador          | Intel Core i3 / AMD Ryzen 3 | Intel Core i5 / AMD Ryzen 5 |
| Memoria RAM         | 4 GB                        | 8 GB                        |
| Espacio en Disco    | 2 GB                        | 5 GB                        |
| Conexión a Internet | Requerida                   | Requerida                   |

### 1.2 Software Requerido

| Software         | Versión Mínima  | Descarga                         |
| ---------------- | --------------- | -------------------------------- |
| **Node.js**      | 18.x o superior | https://nodejs.org/              |
| **Python**       | 3.10 o superior | https://python.org/              |
| **MySQL Server** | 8.0 o superior  | https://dev.mysql.com/downloads/ |
| **Git**          | 2.40 o superior | https://git-scm.com/             |

### 1.3 Sistema Operativo Compatible

- ✅ Windows 10/11
- ✅ macOS 12 o superior
- ✅ Linux (Ubuntu 20.04+, Debian 11+)

---

## 2. Instalación de Prerrequisitos

### 2.1 Instalación de Node.js (Windows)

1. Descargar el instalador desde: https://nodejs.org/
2. Ejecutar el instalador y seguir el asistente
3. Verificar la instalación:

```bash
node --version
npm --version
```

**Resultado esperado:**

```
v18.x.x o superior
10.x.x o superior
```

### 2.2 Instalación de Python (Windows)

1. Descargar Python desde: https://python.org/downloads/
2. **IMPORTANTE:** Marcar la opción "Add Python to PATH" durante la instalación
3. Verificar la instalación:

```bash
python --version
pip --version
```

**Resultado esperado:**

```
Python 3.10.x o superior
pip 23.x.x o superior
```

### 2.3 Instalación de MySQL Server

1. Descargar MySQL Community Server desde: https://dev.mysql.com/downloads/mysql/
2. Durante la instalación:
   - Seleccionar "Server only" o "Full"
   - Configurar la contraseña del usuario `root`
   - **Anotar la contraseña configurada** (la necesitará después)
3. Verificar que el servicio esté corriendo:

```bash
# Windows (PowerShell como administrador)
Get-Service MySQL*
```

### 2.4 Instalación de Git

1. Descargar desde: https://git-scm.com/
2. Instalar con opciones por defecto
3. Verificar:

```bash
git --version
```

---

## 3. Configuración de Base de Datos

### 3.1 Clonar el Repositorio

```bash
# Clonar el proyecto
git clone https://github.com/SergioPorrasA/ProeVira.git

# Entrar al directorio
cd ProeVira
```

### 3.2 Crear la Base de Datos

**Opción A: Usando MySQL Workbench**

1. Abrir MySQL Workbench
2. Conectarse al servidor local
3. Abrir el archivo `database_schema_completo.sql`
4. Ejecutar el script completo (Ctrl+Shift+Enter)

**Opción B: Usando línea de comandos**

```bash
# Conectarse a MySQL
mysql -u root -p

# Una vez dentro de MySQL, ejecutar:
source C:/ruta/al/proyecto/ProeVira/database_schema_completo.sql
```

### 3.3 Verificar la Creación

```sql
-- En MySQL
USE proyecto_integrador;
SHOW TABLES;
```

**Resultado esperado (tablas creadas):**

```
+--------------------------------+
| Tables_in_proyecto_integrador  |
+--------------------------------+
| alerta                         |
| alertas_epidemiologicas        |
| dato_epidemiologico            |
| enfermedad                     |
| prediccion                     |
| predicciones_guardadas         |
| region                         |
| usuario                        |
+--------------------------------+
```

---

## 4. Instalación del Backend (Flask/Python)

### 4.1 Navegar al Directorio del Backend

```bash
cd backend
```

### 4.2 Crear Entorno Virtual (Recomendado)

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate
```

### 4.3 Instalar Dependencias de Python

```bash
pip install -r requirements.txt
```

**Dependencias que se instalarán:**
| Paquete | Versión | Descripción |
|---------|---------|-------------|
| Flask | ≥2.3.0 | Framework web |
| Flask-CORS | ≥4.0.0 | Manejo de CORS |
| mysql-connector-python | ≥8.1.0 | Conexión MySQL |
| scikit-learn | ≥1.3.0 | Machine Learning |
| pandas | ≥2.0.0 | Análisis de datos |
| numpy | ≥1.24.0 | Cálculos numéricos |
| joblib | ≥1.3.0 | Serialización de modelos |
| python-dotenv | ≥1.0.0 | Variables de entorno |

### 4.4 Configurar Variables de Entorno

1. Copiar el archivo de ejemplo:

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

2. Editar el archivo `.env` con sus credenciales:

```env
# Configuración de Base de Datos
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=TU_CONTRASEÑA_MYSQL
DB_NAME=proyecto_integrador
DB_POOL_SIZE=20

# Configuración de la Aplicación
FLASK_ENV=development
FLASK_DEBUG=False
FLASK_PORT=5001
FLASK_HOST=0.0.0.0
```

**⚠️ IMPORTANTE:** Reemplazar `TU_CONTRASEÑA_MYSQL` con la contraseña configurada en MySQL.

### 4.5 Verificar Modelos de Machine Learning

Los siguientes archivos deben existir en la carpeta `backend/`:

- ✅ `model.pkl` - Modelo Random Forest Clasificador
- ✅ `model_regressor.pkl` - Modelo Random Forest Regresor
- ✅ `label_encoder.pkl` - Codificador de etiquetas
- ✅ `label_encoder_regressor.pkl` - Codificador para regresor
- ✅ `regressor_features.pkl` - Features del regresor

---

## 5. Instalación del Frontend (React)

### 5.1 Navegar al Directorio del Frontend

```bash
# Desde la raíz del proyecto
cd sistema-prediccion-enfermedades
```

### 5.2 Instalar Dependencias de Node.js

```bash
npm install
```

**Dependencias principales que se instalarán:**
| Paquete | Descripción |
|---------|-------------|
| react | ^18.3.1 - Librería UI |
| react-router-dom | ^6.28.0 - Enrutamiento |
| recharts | ^3.5.1 - Gráficos |
| axios | ^1.7.9 - Cliente HTTP |
| lucide-react | ^0.555.0 - Iconos |
| jspdf | ^3.0.4 - Generación PDF |
| html2canvas | ^1.4.1 - Captura de pantalla |
| tailwindcss | Estilos CSS |

**Tiempo estimado:** 2-5 minutos dependiendo de la conexión.

---

## 6. Carga de Datos Epidemiológicos

### 6.1 Datos Incluidos

El proyecto incluye datos históricos de dengue (2020-2025) en la carpeta `data/`:

```
data/
├── dengue_2020.csv
├── dengue_2021.csv
├── dengue_2022.csv
├── dengue_2023.csv
├── dengue_2024.csv
└── dengue_2025.csv
```

### 6.2 Cargar Datos usando ETL_LOADER

```bash
# Desde la carpeta backend (con el entorno virtual activado)
cd backend
python ETL_LOADER.py
```

**Proceso del ETL:**

1. Lee los archivos CSV
2. Transforma y valida los datos
3. Inserta registros en `dato_epidemiologico`
4. Muestra progreso y resumen

**Resultado esperado:**

```
✔ Conexión a base de datos exitosa
✔ Cargando dengue_2020.csv... 1664 registros
✔ Cargando dengue_2021.csv... 1664 registros
✔ Cargando dengue_2022.csv... 1664 registros
✔ Cargando dengue_2023.csv... 1664 registros
✔ Cargando dengue_2024.csv... 1664 registros
✔ Cargando dengue_2025.csv... 1664 registros
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✔ Total registros cargados: 9,984
```

### 6.3 Verificar Carga de Datos

```sql
-- En MySQL
USE proyecto_integrador;
SELECT COUNT(*) as total_registros FROM dato_epidemiologico;
SELECT MIN(fecha_fin_semana) as desde, MAX(fecha_fin_semana) as hasta FROM dato_epidemiologico;
```

---

## 7. Ejecución del Sistema

### 7.1 Iniciar el Backend (Terminal 1)

```bash
# Navegar a backend
cd backend

# Activar entorno virtual (si no está activo)
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Iniciar servidor Flask
python app.py
```

**Salida esperada:**

```
✔ Pool de conexiones MySQL creado
✔ Modelo Random Forest (Clasificador) cargado
   - Features esperados: 7
   - Estados en encoder: 32
✔ Modelo Random Forest (Regresor) cargado - R²=96.3%
   - Features: 5

========================================
   ProeVira API - Flask Backend
========================================
   Servidor: http://localhost:5001
   Ambiente: development
========================================

 * Running on http://0.0.0.0:5001
```

### 7.2 Iniciar el Frontend (Terminal 2)

```bash
# Abrir NUEVA terminal
cd sistema-prediccion-enfermedades

# Iniciar aplicación React
npm start
```

**Salida esperada:**

```
Compiled successfully!

You can now view sistema-prediccion-enfermedades in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

### 7.3 Acceder al Sistema

1. **Frontend (Interfaz Web):** http://localhost:3000
2. **Backend API:** http://localhost:5001

---

## 8. Verificación de la Instalación

### 8.1 Verificar Backend API

Abrir en navegador o usar curl:

```bash
curl http://localhost:5001/api/health
```

**Respuesta esperada:**

```json
{
  "status": "healthy",
  "database": { "status": "connected" },
  "models": { "loaded": true, "classifier": "RandomForest" }
}
```

### 8.2 Verificar Frontend

1. Abrir http://localhost:3000
2. Debe mostrar la pantalla de Login
3. Navegar por las diferentes secciones:
   - ✅ Dashboard
   - ✅ Predicción Avanzada
   - ✅ Monitoreo en Tiempo Real
   - ✅ Alertas
   - ✅ Reportes

### 8.3 Prueba de Predicción

1. Ir a "Predicción Avanzada"
2. Seleccionar un estado (ej: "Jalisco")
3. Seleccionar fecha
4. Hacer clic en "Generar Predicción"
5. Verificar que se muestre el resultado

---

## 9. Solución de Problemas Comunes

### 9.1 Error: "Pool exhausted"

**Síntoma:** `mysql.connector.errors.PoolError: Failed getting connection; pool exhausted`

**Solución:**

1. Editar `backend/.env`
2. Aumentar `DB_POOL_SIZE=20` o más
3. Reiniciar el backend

### 9.2 Error: "ECONNREFUSED" en Frontend

**Síntoma:** La aplicación no puede conectar con el backend

**Solución:**

1. Verificar que el backend esté corriendo en puerto 5001
2. Verificar que no haya firewall bloqueando
3. Revisar la URL de API en el frontend

### 9.3 Error: "Module not found"

**Síntoma:** Python no encuentra los módulos

**Solución:**

```bash
# Asegurarse de tener el entorno virtual activado
venv\Scripts\activate

# Reinstalar dependencias
pip install -r requirements.txt
```

### 9.4 Error: "Access denied" en MySQL

**Síntoma:** No puede conectar a la base de datos

**Solución:**

1. Verificar credenciales en `.env`
2. Verificar que MySQL esté corriendo
3. Verificar que el usuario tenga permisos:

```sql
GRANT ALL PRIVILEGES ON proyecto_integrador.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### 9.5 Puertos en Uso

**Síntoma:** "Port already in use"

**Solución Windows:**

```powershell
# Ver qué usa el puerto 5001
netstat -ano | findstr :5001

# Matar el proceso (reemplazar PID)
taskkill /PID <PID> /F
```

---

## 📞 Soporte

Para problemas adicionales:

- **Repositorio:** https://github.com/SergioPorrasA/ProeVira
- **Issues:** https://github.com/SergioPorrasA/ProeVira/issues

---

## 📋 Resumen de Comandos

```bash
# === INSTALACIÓN COMPLETA ===

# 1. Clonar repositorio
git clone https://github.com/SergioPorrasA/ProeVira.git
cd ProeVira

# 2. Crear base de datos (en MySQL)
mysql -u root -p < database_schema_completo.sql

# 3. Configurar Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Editar .env con credenciales

# 4. Cargar datos
python ETL_LOADER.py

# 5. Configurar Frontend
cd ../sistema-prediccion-enfermedades
npm install

# === EJECUCIÓN ===

# Terminal 1 - Backend
cd backend
venv\Scripts\activate
python app.py

# Terminal 2 - Frontend
cd sistema-prediccion-enfermedades
npm start

# === ACCESO ===
# Frontend: http://localhost:3000
# Backend:  http://localhost:5001
```

---

**© 2025 ProeVira - Sistema de Predicción de Enfermedades Virales**
