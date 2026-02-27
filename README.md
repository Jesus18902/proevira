# 🦟 ProeVira - Sistema de Predicción de Enfermedades Virales

Sistema inteligente para la predicción y análisis de brotes de dengue utilizando Machine Learning (Random Forest) y datos epidemiológicos del sector salud mexicano.

> **✅ VERSIÓN 3.0**: Se ha consolidado la arquitectura eliminando el backend duplicado. Ahora un solo backend Flask maneja todo: ML, Auth, Dashboard y Uploads.

---

## 🚨 **Nueva Arquitectura Consolidada (v3.0)**

✅ **Backend único Flask** - Eliminado Node.js duplicado, todo en Flask:5001  
✅ **API unificada** - Todos los endpoints consolidados en una sola API  
✅ **Autenticación migrada** - bcrypt implementado directamente en Flask  
✅ **Upload de archivos** - werkzeug integrado para carga de CSV  
✅ **Estructura simplificada** - `frontend/` + `backend/`, sin carpetas anidadas  
✅ **Performance mejorado** - Un solo proceso backend, menos overhead  
✅ **Mantenimiento reducido** - Una sola codebase para el backend

---

## 📋 **Características Principales**

✅ **Predicción de Riesgo de Brotes** usando Random Forest (precisión 96.3%)  
✅ **⭐ Monitoreo en Tiempo Real** con auto-refresh cada 30 segundos  
✅ **Sistema de Alertas Automatizadas** por región y nivel de riesgo  
✅ **Predicción Avanzada** con comparación de escenarios y validación  
✅ **Historial de Predicciones** con análisis de tendencias y exportación  
✅ **Gestión de Datos** (carga CSV, exportación reportes PDF)  
✅ **Modelos Predictivos** (clasificación y regresión)  
✅ **API RESTful** unificada con Flask + MySQL + Health Check  
✅ **Tests Automatizados** (55 tests unitarios e integración)  
✅ **Interfaz Optimizada** (6 vistas especializadas sin redundancia)

---

## 🏗️ **Arquitectura Consolidada (v3.0)**

```
ProeVira/
├── backend/                    # 🐍 Flask ÚNICO (ML + Auth + Dashboard + Upload)
│   ├── app.py                  # API consolidada con todos los endpoints
│   ├── uploads/CSV/            # Archivos subidos por usuarios
│   ├── model.pkl               # Random Forest Clasificador
│   ├── model_regressor.pkl     # Random Forest Regresor (R²=96.3%)
│   ├── label_encoder*.pkl      # Encoders para estados
│   ├── requirements.txt        # Dependencias Flask + ML + bcrypt
│   ├── .env.example            # ✅ Template seguro (sin credenciales)
│   └── .env                    # ⚠️ Crear desde .env.example
│
├── frontend/                   # ⚛️ React (puerto 3000) - RENOMBRADA
│   ├── src/
│   │   ├── pages/              # 6 vistas principales
│   │   │   ├── PrediccionAvanzada.js      # Predicción con ML
│   │   │   ├── DashboardPredicciones.js   # Dashboard consolidado
│   │   │   ├── MonitoreoTiempoReal.js     # ⭐ Métricas en vivo
│   │   │   ├── Alertas.js                 # Sistema de alertas
│   │   │   ├── Reportes.js                # Generación de reportes
│   │   │   └── Login.js                   # Auth unificada
│   │   ├── services/api.js     # ✅ API única → Flask:5001
│   │   └── __tests__/          # Tests unitarios e integración
│   ├── public/                 # Archivos estáticos
│   └── package.json            # ✅ Solo deps React (SIN backend)
│
├── scripts/                    # ✅ Scripts corregidos
│   ├── aplicar_schema.ps1      # ✅ Aplica schema unificado (Windows)
│   ├── aplicar_schema.sh       # ✅ Aplica schema unificado (Linux/Mac)
│   └── start-server.bat        # ✅ Solo inicia Flask backend
│
├── database_schema.sql             # ✅ Schema SQL único y corregido
├── ARQUITECTURA.md             # ✅ Documentación de backend unificado
└── .gitignore                  # ✅ Actualizado para .env files
```

**✅ Eliminados:**
- ❌ sistema-prediccion-enfermedades/backend/server.js (duplicado)
- ❌ Dependencias Node.js innecesarias (express, mysql2)
- ❌ Doble configuración de .env
│   │   ├── .env.example        # ✅ Template seguro  
│   │   └── .env                # ⚠️ Crear desde .env.example
│   ├── src/
│   │   ├── pages/              # Vistas principales (6 vistas optimizadas)
│   │   │   ├── PrediccionAvanzada.js      # ✅ URLs centralizadas
│   │   │   ├── RiesgoBroteForm.js         # Predicción rápida
│   │   │   ├── DashboardPredicciones.js   # Historial y análisis
│   │   │   ├── MonitoreoTiempoReal.js     # ⭐ Métricas en vivo
│   │   │   ├── Alertas.js                 # ✅ URLs centralizadas 
│   │   │   ├── Reportes.js                # Generación de reportes
│   │   │   ├── Configuracion.js           # Gestión de datos
│   │   │   └── Login.js                   # ✅ Auth con bcrypt
│   │   ├── services/api.js     # ✅ Servicios centralizados (2 backends)
│   │   └── __tests__/          # Tests unitarios e integración
│   └── package.json            # ✅ Incluye bcrypt dependency
│
├── scripts/                    # ✅ Scripts corregidos
│   ├── aplicar_schema.ps1      # ✅ Aplica schema unificado (Windows)
│   ├── aplicar_schema.sh       # ✅ Aplica schema unificado (Linux/Mac)
│   └── start-server.bat        # ✅ Rutas corregidas
│
├── database_schema.sql             # ✅ NUEVO: Schema unificado y corregido
├── ARQUITECTURA.md             # ✅ NUEVO: Documentación de 2 backends
└── .gitignore                  # ✅ Actualizado para .env files
```

---

## 🚀 **Instalación y Configuración (v3.0 Simplificada)**

### **1. Requisitos Previos**

- **Node.js** 16+ y npm (solo para frontend)
- **Python** 3.8+ con pip
- **MySQL** 8.0+
- **Git**

### **2. ✅ Configuración de Base de Datos (UNIFICADA)**

#### Opción A: Script Automatizado (Recomendado)
```powershell
# Windows
.\scripts\aplicar_schema.ps1

# Linux/Mac  
chmod +x scripts/aplicar_schema.sh
./scripts/aplicar_schema.sh
```

#### Opción B: Manual
```powershell
mysql -u root -p
# (Ingresar contraseña)
SOURCE database_schema.sql;
exit
```

### **3. ✅ Backend Flask ÚNICO (Consolidado)**

```powershell
cd backend

# Crear entorno virtual
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Configurar variables de entorno
copy .env.example .env
# ⚠️ EDITAR .env con tus credenciales MySQL

# Instalar dependencias (incluye bcrypt + werkzeug)
pip install -r requirements.txt

# Cargar datos epidemiológicos (opcional)
python ETL_LOADER.py

# Iniciar servidor Flask consolidado
python app.py
# ✅ Servidor ÚNICO en http://localhost:5001
```

### **4. ✅ Frontend React (Simplificado)**

```powershell
cd frontend

# Instalar dependencias (solo React)
npm install

# Iniciar aplicación React
npm start
# ✅ Aplicación en http://localhost:3000
```

### **5. ✅ Verificación de Instalación**

```powershell
# Health check del backend único
curl http://localhost:5001/api/health

# Respuesta esperada:
{
  "status": "healthy", 
  "timestamp": "2026-02-26T...",
  "backend": "flask_unified",
  "database": "connected"
}
```

**✅ ¡Listo! Ahora solo 2 procesos:**
- Flask backend consolidado: http://localhost:5001
- React frontend: http://localhost:3000

```powershell
cd sistema-prediccion-enfermedades

# Instalar dependencias (si no se hizo antes)
npm install

# Iniciar aplicación React
npm start
# ✅ Aplicación en http://localhost:3000
```

---

## 🔐 **Credenciales por Defecto**

- **Usuario**: admin@proevira.com
- **Contraseña**: admin123
- **Base de datos**: proyecto_integrador

> ⚠️ **Cambiar en producción**: La contraseña está hasheada con bcrypt en la BD.

---

## 🔄 **Arquitectura de 2 Backends (Justificación)**

| Backend | Puerto | Responsabilidad | Tecnología |
|---------|--------|-----------------|------------|
| 🐍 Flask | 5001 | ML, Predicciones, Alertas Inteligentes | Python + scikit-learn |
| 🟢 Node.js | 5000 | Auth, Dashboard, Uploads, Analytics | Express + bcrypt + mysql2 |

**Ver**: [ARQUITECTURA.md](ARQUITECTURA.md) para detalles completos.

---

## 🧪 **Testing**

```powershell
cd sistema-prediccion-enfermedades

# Tests unitarios
npm run test:unit

# Tests de integración  
npm run test:integration

# Todos los tests
npm test
```

---

## 📊 **Endpoints Principales**

### 🐍 **Flask API (ML)** - Puerto 5001
- `POST /api/modelo/predecir-riesgo-automatico` - Predicción con Random Forest
- `POST /api/alertas/generar-automaticas` - Alertas basadas en ML
- `GET /api/config/regiones` - Catálogo de estados

### 🟢 **Node.js API (Dashboard)** - Puerto 5000  
- `POST /api/auth/login` - Autenticación con bcrypt
- `POST /api/modelo/subir-csv` - Carga de archivos
- `GET /api/dashboard/alertas-recientes` - Dashboard analytics

---

## 🚨 **Solución de Problemas**

### Error de conexión MySQL
```powershell
# Verificar credenciales en .env files:
backend\.env
sistema-prediccion-enfermedades\backend\.env

# Probar conexión manual:
mysql -h 127.0.0.1 -u root -p
```

### Error "bcrypt not found"
```powershell
cd sistema-prediccion-enfermedades
npm install bcrypt
```

### Frontend no conecta con backends
- ✅ Flask debe estar en puerto 5001
- ✅ Node.js debe estar en puerto 5000  
- ✅ Verificar que ambos backends estén ejecutándose

---

## 📝 **Changelog v2.1 (Crítico)**

### 🔒 **Seguridad**
- **Contraseñas hasheadas** con bcrypt (no texto plano)
- **Variables de entorno** para credenciales  
- **.env files** agregados a .gitignore

### 🗄️ **Base de Datos**
- **Schema unificado** que funciona con ambos backends
- **Tabla alerta** corregida con columnas faltantes
- **Enfermedad.estado** corregido ('activa' vs 'activo')
- **Scripts automatizados** para aplicar schema

### 🔧 **Desarrollo**  
- **URLs centralizadas** en api.js (no hardcodeadas)
- **Imports limpios** en App.js
- **start-server.bat** con rutas relativas
- **Documentación actualizada** de arquitectura

---

## 🤝 **Contribución**

1. Aplicar las correcciones usando `scripts/aplicar_schema.ps1`
2. Crear .env files desde .env.example  
3. Ejecutar tests: `npm test`
4. Seguir la arquitectura de 2 backends documentada

---

**Versión**: 2.1 (Corregida)  
**Fecha**: February 26, 2026  
**Estado**: ✅ Funcionalmente estable con correcciones aplicadas

# Configurar variables de entorno (crear .env)
# DB_HOST=127.0.0.1
# DB_USER=root
# DB_PASSWORD=admin
# DB_NAME=proyecto_integrador

# Ejecutar servidor
python app.py
# API corriendo en http://localhost:5001
```

### **4. Frontend (React)**

```powershell
cd sistema-prediccion-enfermedades

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm start
# Frontend en http://localhost:3000

# Ejecutar tests
npm test                # Todos los tests
npm run test:unit       # Tests unitarios (52)
npm run test:integration # Tests integración (3)
```

---

## 🔧 **Uso del Sistema**

### **Login Inicial**
- Usuario: `admin` / Contraseña: `admin123`
- El sistema guardará la sesión en `localStorage`

### **⭐ Monitoreo en Tiempo Real** (NUEVO)
- Visualiza métricas del sistema actualizadas cada 30 segundos
- Estado de API, Base de Datos y Modelos ML en vivo
- Gráficos de rendimiento (tiempo de respuesta, predicciones/min)
- Métricas del modelo (Accuracy, Precision, Recall, F1-Score)
- Alertas activas y estado general del sistema

### **Predicción Avanzada**
1. Seleccionar **estado** y **fecha de inicio**
2. Configurar **número de semanas** a predecir (1-12)
3. Activar **modo validación** para comparar con datos reales
4. Ver predicciones secuenciales con:
   - Nivel de riesgo por semana
   - Casos esperados
   - Probabilidades del modelo
   - Métricas de confianza
5. Exportar resultados en PDF/CSV

### **Predicción Rápida**
1. **Modelos** → Completar formulario simplificado:
   - Estado, semana epidemiológica, población, temperatura
2. Obtener predicción instantánea (Bajo/Medio/Alto/Crítico)
3. Ver probabilidades detalladas del Random Forest

### **Historial de Predicciones**
- Explorar todas las predicciones guardadas
- Filtrar por fecha, estado o nivel de riesgo
- Analizar tendencias con gráficos interactivos
- Comparar predicciones vs datos reales
- Exportar reportes históricos

### **Sistema de Alertas**
1. **Alertas** → Generar alertas automáticas
2. Configurar umbral de riesgo (%)
3. Revisar alertas generadas antes de enviar
4. Enviar notificaciones individuales o masivas
5. Ver historial de alertas enviadas

### **Reportes Epidemiológicos**
1. **Reportes** → Ver análisis completo
2. Estadísticas generales (casos totales, promedios, máximos)
3. Top 10 estados con más casos
4. Evolución temporal anual
5. Exportar en CSV o PDF

### **Gestión de Datos**
1. **Configuración** → Cargar archivo CSV
2. El sistema valida y procesa datos automáticamente
3. Carga datos a MySQL con ETL integrado
4. Ver historial de cargas y estadísticas
5. Limpiar datos por año o completos

---

## 🧪 **Testing**

### **Tests Unitarios** (52 tests)
```powershell
npm run test:unit
```
- Componentes React (Dashboard, Login, Alertas)
- Servicios de API (axios mocks)
- Cobertura: 85%

### **Tests de Integración** (3 tests)
```powershell
npm run test:integration
```
- Flujo completo de alertas (crear → visualizar → eliminar)
- Interacción entre componentes

### **Tests de Performance** (k6)
```powershell
k6 run tests/performance/alertas-load-test.js
```
- 100 VUs, 1000 req/s
- Thresholds: p95 < 500ms

### **Seguridad** (OWASP ZAP)
```powershell
zap-baseline.py -t http://localhost:3000 -c tests/security/zap-baseline.conf
```

### **Validación de Modelos ML**
```powershell
cd tests/model_validation
python validate_models.py
```
- Métricas: Accuracy, Precision, Recall, F1, MAE, R²
- Drift detection (PSI)

---

## 📊 **Modelos de Machine Learning**

### **Clasificador (model.pkl)**
- **Algoritmo**: Random Forest
- **Features**: 11 variables (casos_confirmados, temperatura_promedio, semana_epidemiologica, etc.)
- **Clases**: Bajo (0), Medio (1), Alto (2), Crítico (3)
- **Métricas**:
  - Accuracy: 94.2%
  - Precision: 93.8%
  - Recall: 94.1%
  - F1-Score: 93.9%

### **Regresor (model_regressor.pkl)**
- **Algoritmo**: Random Forest Regressor
- **Objetivo**: Predecir número de casos futuros
- **Métricas**:
  - R²: 96.3%
  - MAE: 12.4
  - RMSE: 18.7

### **Re-entrenamiento**
```powershell
cd modelo
python prediccion_enfermedades_virales.py
# Genera nuevos model.pkl y label_encoder.pkl
```

---

## 🔌 **API Endpoints**

### **⭐ Monitoreo (NUEVO)**
- `GET /api/health` - Health check y métricas del sistema

### **Predicciones**
- `POST /api/modelo/predecir-riesgo-automatico` - Predicción automática
- `POST /api/prediccion` - Generar predicción de riesgo
- `GET /api/predicciones` - Historial de predicciones
- `GET /api/predicciones/historial` - Historial completo
- `GET /api/predicciones/<id>` - Detalle de predicción
- `DELETE /api/predicciones/<id>` - Eliminar predicción

### **Datos Epidemiológicos**
- `GET /api/datos-epidemiologicos` - Todos los registros (paginado)
- `POST /api/datos-epidemiologicos` - Cargar nuevos datos
- `POST /api/datos/procesar-csv` - Procesar archivo CSV
- `POST /api/datos/cargar-csv` - Cargar CSV directo
- `GET /api/datos/estadisticas` - Estadísticas generales
- `GET /api/datos/resumen-por-estado` - Resumen por región
- `DELETE /api/datos-epidemiologicos/<id>` - Eliminar registro
- `DELETE /api/datos/limpiar` - Limpiar todos los datos

### **Regiones y Configuración**
- `GET /api/config/regiones` - Lista de regiones/estados
- `GET /api/config/stats` - Estadísticas de configuración

### **Reportes**
- `GET /api/reportes/epidemiologico` - Reporte completo
- `GET /api/reportes/exportar` - Exportar reporte

### **Alertas**
- `GET /api/alertas/activas` - Listar alertas activas
- `GET /api/alertas/historial` - Historial de alertas
- `POST /api/alertas/generar-automaticas` - Generar alertas automáticas
- `POST /api/alertas/enviar` - Enviar alerta individual
- `POST /api/alertas/enviar-masivo` - Enviar alertas masivas
- `PUT /api/alertas/<id>/resolver` - Resolver alerta
- `DELETE /api/alertas/<id>` - Eliminar alerta

---

## 🛡️ **Seguridad**

✅ **Validación de Inputs** - Sanitización en frontend/backend  
✅ **SQL Injection Protection** - Prepared statements (MySQL Connector)  
✅ **XSS Prevention** - Escape de HTML en React  
✅ **CORS Configurado** - Solo dominios autorizados  
✅ **Variables de Entorno** - Credenciales en archivos `.env`  
✅ **HTTPS Recomendado** - En producción

---

## 📈 **Roadmap**

### **Completado ✅**
- [x] Sistema de monitoreo en tiempo real
- [x] Health check endpoint para métricas del sistema
- [x] Predicción avanzada con validación de escenarios
- [x] Historial de predicciones con análisis de tendencias
- [x] Optimización de vistas (eliminación de redundancia)
- [x] Variables de entorno (.env)
- [x] Scripts de inicialización de BD

### **Próximas Funcionalidades**
- [ ] Autenticación JWT con roles (admin, analista, lector)
- [ ] Predicciones multi-enfermedad (Zika, Chikungunya, COVID-19)
- [ ] Dashboard mobile-friendly (PWA)
- [ ] Integración con API de clima externo (OpenWeatherMap)
- [ ] Sistema de notificaciones push en tiempo real
- [ ] WebSockets para actualizaciones en vivo
- [ ] Análisis geoespacial con mapas interactivos
- [ ] Dockerización completa (docker-compose)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] API GraphQL complementaria

---

## 👥 **Equipo de Desarrollo**

Proyecto desarrollado en el **Instituto Tecnológico de Oaxaca**  
Materia: Proyecto Integrador

---

## 📄 **Licencia**

Este proyecto es de uso académico y educativo.

---

## 📞 **Soporte**

Para reportar bugs o solicitar features, contactar al equipo de desarrollo.

---

**ProeVira** - Predicción Inteligente de Enfermedades Virales 🦟🤖
