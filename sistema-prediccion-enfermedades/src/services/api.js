import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Interceptor para manejar errores
api.interceptors.response.use(
  response => response,
  error => {
    console.error('Error en API:', error);
    if (error.code === 'ERR_NETWORK') {
      console.error('No se puede conectar al backend en http://localhost:5000');
    }
    return Promise.reject(error);
  }
);

// Servicios de autenticación
export const authService = {
  login: (data) => api.post('/auth/login', data)
};

// Servicios de datos generales
export const datosService = {
  getEnfermedades: () => {
    console.log('Llamando a /api/config/enfermedades');
    return api.get('/config/enfermedades');
  },
  getRegiones: () => {
    console.log('Llamando a /api/config/regiones');
    return api.get('/config/regiones');
  },
  getModelos: () => {
    console.log('Llamando a /api/config/modelos');
    return api.get('/config/modelos');
  },
  getArchivosRecientes: () => api.get('/datos/archivos-recientes')
};

// Servicios de análisis
export const analisisService = {
  getCasosPorRegion: () => api.get('/analisis/casos-region'),
  getTendenciaMensual: () => api.get('/analisis/tendencia-mensual')
};

// Servicios de dashboard
export const dashboardService = {
  getEstadisticasGenerales: () => api.get('/reportes/resumen'),
  getCasosPorRegion: () => api.get('/analisis/casos-region'),
  getTendenciaCasos: () => api.get('/analisis/tendencia-mensual'),
  getAlertasRecientes: () => api.get('/dashboard/alertas-recientes')
};

// Servicios de modelos predictivos
export const modeloService = {
  subirDatosCSV: (archivo) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return api.post('/modelo/subir-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  ejecutarPrediccionDengue: (data) => {
    console.log('Ejecutando predicción con:', data);
    return api.post('/modelo/predecir-dengue', data, {
      timeout: 60000
    });
  },
  obtenerPredicciones: (params) => api.get('/modelo/predicciones', { params })
};

// Servicios de reportes
export const reportesService = {
  getResumen: () => api.get('/reportes/resumen')
};

export default api;