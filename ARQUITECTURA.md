# 🏗️ Arquitectura de ProeVira - Backend Unificado

## ✅ Problema Resuelto: Un Solo Backend

**Antes (Problemático):** Dos backends duplicados con funcionalidades solapadas  
**Ahora (Correcto):** Backend Flask único que maneja todo

### 🐍 **Backend Flask Unificado** (Puerto 5001)
**Responsabilidad**: Todo - ML, Autenticación, Dashboard, Uploads, Alertas

**Endpoints consolidados:**
- **ML**: `/api/modelo/predecir-riesgo-automatico` - Random Forest ML
- **Auth**: `/api/auth/login` - Autenticación con bcrypt (migrado)  
- **Uploads**: `/api/datos/cargar-csv` - Carga de archivos (migrado)
- **Alertas**: `/api/alertas/*` - Sistema de alertas inteligentes
- **Dashboard**: `/api/dashboard/resumen` - Analytics y estadísticas
- **Config**: `/api/config/regiones` - Catálogos de datos
- **Health**: `/api/health` - Health check

**Tecnologías:**
- Flask + scikit-learn + pandas + numpy + bcrypt + werkzeug
- MySQL (lectura/escritura completa)
- Modelos ML: model.pkl, label_encoder.pkl

### ⚛️ **Frontend React** (Puerto 3000)
**Responsabilidad**: Interfaz de usuario únicamente  

**Ubicación**: `frontend/` (renombrado desde sistema-prediccion-enfermedades)  
**API**: Un solo cliente axios apuntando a Flask:5001

---

## 🔄 Nueva Arquitectura Simplificada

```
Frontend React (:3000) ──► Backend Flask (:5001) ──► MySQL Database
```

**Todo consolidado en Flask:**
1. **Login de Usuario** → Flask (bcrypt authentication)
2. **Subir CSV** → Flask (werkzeug file upload)  
3. **Predicción de Riesgo** → Flask (ML Random Forest)
4. **Generar Alertas** → Flask (ML + database)
5. **Dashboard Stats** → Flask (queries + analytics)

---

## 📁 **Nueva Estructura de Carpetas**

```
proevira/
├── backend/                    # 🐍 Flask ÚNICO (puerto 5001)
│   ├── app.py                  # API consolidada (ML + Auth + Dashboard)
│   ├── uploads/CSV/            # 📁 Archivos subidos por usuarios
│   ├── model.pkl               # 🤖 Modelo Random Forest
│   ├── requirements.txt        # 📦 Dependencias: flask, bcrypt, werkzeug, etc
│   └── .env                    # 🔐 Variables de entorno
│
├── frontend/                   # ⚛️ React (puerto 3000) - RENOMBRADO
│   ├── src/
│   │   ├── services/api.js     # 🔗 API única → Flask:5001
│   │   ├── pages/              # 📄 8 vistas de la aplicación  
│   │   └── components/         # 🧩 Componentes reutilizables
│   ├── public/                 # 📁 Archivos estáticos
│   └── package.json            # 📦 Deps: react, axios, charts (SIN backend deps)
│
├── data/                       # 📊 Datasets epidemiológicos
├── docs/                       # 📚 Documentación  
├── scripts/                    # 🔧 Scripts de automatización
│   ├── aplicar_schema.ps1      # 🗄️ Setup de base de datos
│   └── aplicar_schema.sh
│
├── start-server.bat            # 🚀 Inicia Backend Flask
├── start-frontend.bat          # 🚀 Inicia Frontend React  
├── database_schema.sql             # 🗄️ Schema SQL corregido
└── README.md                   # 📖 Documentación actualizada
```

**Eliminados:**
- ❌ `sistema-prediccion-enfermedades/backend/server.js` (duplicado)
- ❌ Dependencias Node.js innecesarias (express, mysql2, bcrypt para Node)
- ❌ Dos clientes API (flaskApi + api)
- ❌ Scripts npm run backend

---

## 🚀 **Cómo Ejecutar (Simplificado)**

### 1. Backend Flask (Único):
```batch
# Windows
start-server.bat

# Manual
cd backend
python app.py
# Servidor en http://localhost:5001
```

### 2. Frontend React:
```batch  
# Windows
start-frontend.bat

# Manual
cd frontend
npm install
npm start
# Aplicación en http://localhost:3000
```

**Ahora solo 2 procesos en lugar de 3:**
- Flask:5001 (backend unificado)
- React:3000 (frontend)

---

## ✅ **Beneficios de la Consolidación**

### Antes (Problemático):
- ❌ Dos backends con endpoints duplicados
- ❌ Inconsistencia entre autenticación (bcrypt vs texto plano)  
- ❌ Confusión sobre qué backend usar
- ❌ Mantener dos codebases separadas
- ❌ 3 procesos ejecutándose

### Ahora (Correcto):
- ✅ Un solo backend con responsabilidades claras
- ✅ Autenticación unificada con bcrypt
- ✅ Single source of truth para APIs
- ✅ Codebase más simple de mantener  
- ✅ Solo 2 procesos
- ✅ Performance mejorado (menos llamadas inter-servicio)

---

## 🔄 **Migración Realizada**

### Funcionalidades migradas de Node.js → Flask:
1. **Autenticación** (`/api/auth/login`) con bcrypt
2. **Upload de archivos** (`/api/datos/cargar-csv`) con werkzeug  
3. **Integración completa** con todos los endpoints existentes

### Frontend actualizado:
1. **api.js** apunta solo a Flask:5001
2. **package.json** sin dependencias de backend
3. **Estructura** movida a `frontend/`

---

**Versión**: 3.0 (Backend Unificado)  
**Fecha**: February 26, 2026  
**Estado**: ✅ Arquitectura limpia y consolidada