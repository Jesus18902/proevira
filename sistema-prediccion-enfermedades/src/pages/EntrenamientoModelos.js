// src/pages/EntrenamientoModelos.js
// Vista para Entrenar y Re-entrenar Modelos de Machine Learning

import React, { useState, useEffect } from 'react';
import {
  Brain, Upload, TrendingUp, Activity, CheckCircle,
  XCircle, AlertTriangle, RefreshCw, FileText, Zap,
  BarChart3, Target, Database, Settings
} from 'lucide-react';

const API_URL = 'http://localhost:5001/api';

const EntrenamientoModelos = () => {
  const [modelosInfo, setModelosInfo] = useState(null);
  const [archivosCSV, setArchivosCSV] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entrenando, setEntrenando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    tipo_modelo: 'clasificador',
    archivo_csv: ''
  });

  // Cargar información de modelos y archivos CSV
  useEffect(() => {
    cargarInformacion();
  }, []);

  const cargarInformacion = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/modelos/info`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setModelosInfo(data.modelos);
        setArchivosCSV(data.archivos_csv || []);
      } else {
        setError(data.error || 'Error al cargar información de modelos');
      }
    } catch (err) {
      console.error('Error cargando información:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('No se puede conectar al servidor Flask (http://localhost:5001). Verifica que el backend esté ejecutándose.');
      } else {
        setError(`Error de conexión: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.archivo_csv) {
      setError('Debe seleccionar un archivo CSV');
      return;
    }

    setEntrenando(true);
    setResultado(null);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/modelos/entrenar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setResultado(data);
        setError(null);
        // Recargar información de modelos
        setTimeout(() => cargarInformacion(), 1000);
      } else {
        setError(data.error || 'Error al entrenar el modelo');
      }
    } catch (err) {
      console.error('Error entrenando modelo:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('No se puede conectar al servidor Flask (http://localhost:5001). Verifica que el backend esté ejecutándose.');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setEntrenando(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Componente de estado del modelo
  const EstadoModelo = ({ tipo, info }) => {
    const estaActivo = info.cargado && info.existe;

    const cardStyle = estaActivo
      ? { boxShadow: '0 6px 24px rgba(249,115,22,0.25)' }
      : { boxShadow: '0 4px 14px rgba(59,130,246,0.15)' };

    return (
      <div
        className={`border-2 rounded-xl p-6 transition-all hover:scale-[1.02] ${
          estaActivo
            ? 'bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 border-orange-300'
            : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border-blue-200'
        }`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${estaActivo ? 'bg-orange-200' : 'bg-blue-100'}`}>
              <Brain className={`w-8 h-8 ${estaActivo ? 'text-orange-600' : 'text-blue-500'}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                Modelo {tipo === 'lineal' ? 'Regresión Lineal' : tipo === 'polinomial' ? 'Regresión Polinomial' : tipo === 'clasificador' ? 'Regresión Lineal' : 'Regresión Polinomial'}
              </h3>
              <p className="text-sm text-gray-500">{info.archivo}</p>
            </div>
          </div>
          <div className={`p-2 rounded-full ${estaActivo ? 'bg-orange-200' : 'bg-blue-100'}`}>
            {estaActivo ? (
              <CheckCircle className="w-6 h-6 text-orange-600" />
            ) : (
              <XCircle className="w-6 h-6 text-blue-400" />
            )}
          </div>
        </div>

        {/* Badge de estado */}
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4 ${
          estaActivo ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
        }`}>
          <span className={`w-2 h-2 rounded-full ${estaActivo ? 'bg-white animate-pulse' : 'bg-blue-200'}`}></span>
          {estaActivo ? 'ACTIVO' : 'INACTIVO'}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className={`p-2 rounded-lg ${estaActivo ? 'bg-orange-100' : 'bg-blue-50'}`}>
            <span className="text-gray-500 text-xs block">Estado</span>
            <span className={`font-bold ${estaActivo ? 'text-orange-700' : 'text-blue-600'}`}>
              {estaActivo ? '✓ Activo' : '✗ No cargado'}
            </span>
          </div>
          <div className={`p-2 rounded-lg ${info.existe ? (estaActivo ? 'bg-orange-100' : 'bg-blue-50') : 'bg-red-50'}`}>
            <span className="text-gray-500 text-xs block">Archivo</span>
            <span className={`font-bold ${info.existe ? (estaActivo ? 'text-orange-700' : 'text-blue-600') : 'text-red-600'}`}>
              {info.existe ? '✓ Existe' : '✗ No existe'}
            </span>
          </div>
          {tipo === 'clasificador' && (
            <>
              <div className={`p-2 rounded-lg ${estaActivo ? 'bg-orange-100' : 'bg-blue-50'}`}>
                <span className="text-gray-500 text-xs block">Features</span>
                <span className="font-bold text-gray-800">{info.n_features || 0}</span>
              </div>
              <div className={`p-2 rounded-lg ${estaActivo ? 'bg-orange-100' : 'bg-blue-50'}`}>
                <span className="text-gray-500 text-xs block">Clases</span>
                <span className="font-bold text-gray-800">{info.n_classes || 0}</span>
              </div>
            </>
          )}
          {info.features && info.features.length > 0 && (
            <div className="col-span-2">
              <span className="text-gray-500 text-xs block mb-1">Features</span>
              <div className="flex flex-wrap gap-1">
                {info.features.map((feat, idx) => (
                  <span key={idx} className={`px-2 py-1 rounded text-xs font-medium ${
                    estaActivo ? 'bg-orange-200 text-orange-800' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 overflow-auto bg-gray-50">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-xl text-gray-600">Cargando información de modelos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-auto bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50">
      {/* Header */}
      <div className="mb-8 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-8 rounded-2xl text-white"
           style={{ boxShadow: '0 8px 32px rgba(30,64,175,0.45)' }}>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Brain className="w-12 h-12 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black mb-2">
              Entrenamiento de Modelos ML
            </h1>
            <p className="text-blue-100 text-lg">
              <strong>Entrena</strong> o <strong>re-entrena</strong> modelos de Machine Learning con tus propios datos
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="px-4 py-2 bg-white/20 rounded-xl text-sm font-bold flex items-center gap-2">
            <Target className="w-4 h-4" /> <strong>Regresión Lineal + Polinomial</strong>
          </span>
          <span className="px-4 py-2 bg-white/20 rounded-xl text-sm font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> <strong>Comparativa de Modelos</strong>
          </span>
          <span className="px-4 py-2 bg-white/20 rounded-xl text-sm font-bold flex items-center gap-2">
            <Database className="w-4 h-4" /> <strong>Datos CSV</strong>
          </span>
        </div>
      </div>

      {/* Estado Actual de los Modelos */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            Estado Actual de los Modelos
          </h2>
        </div>

        {modelosInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EstadoModelo tipo="lineal" info={modelosInfo.lineal || modelosInfo.clasificador} />
            <EstadoModelo tipo="polinomial" info={modelosInfo.polinomial || modelosInfo.regresor} />
          </div>
        )}
      </div>

      {/* Formulario de Entrenamiento */}
      <div className="bg-white rounded-xl p-8 shadow-xl border-2 border-blue-100 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            Entrenar Nuevo Modelo
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Modelo */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Settings className="inline-block w-4 h-4 mr-2 text-blue-500" />
              Tipo de Modelo
            </label>
            <select
              name="tipo_modelo"
              value={formData.tipo_modelo}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none text-gray-800 font-medium bg-gradient-to-r from-white to-blue-50"
            >
              <option value="regresor">📈 Regresión Lineal + Polinomial (Casos y Riesgo)</option>
            </select>

            <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800">
                <strong>Regresión Lineal + Polinomial:</strong> Entrena simultáneamente ambos modelos. 
                El modelo <strong>Lineal</strong> captura tendencias generales y el <strong>Polinomial (grado 2)</strong> captura 
                patrones no lineales. El sistema selecciona automáticamente el mejor para cada predicción.
              </p>
            </div>
          </div>

          {/* Archivo CSV */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Database className="inline-block w-4 h-4 mr-2 text-blue-500" />
              Archivo CSV de Entrenamiento
            </label>
            <select
              name="archivo_csv"
              value={formData.archivo_csv}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none text-gray-800 font-medium bg-gradient-to-r from-white to-blue-50"
              required
            >
              <option value="">-- Seleccionar archivo CSV --</option>
              {archivosCSV.map((archivo, idx) => (
                <option key={idx} value={archivo.ruta}>
                  {archivo.nombre} ({archivo.tamano_mb} MB - {archivo.n_columnas} columnas)
                </option>
              ))}
            </select>

            {/* Mostrar columnas del archivo seleccionado */}
            {formData.archivo_csv && archivosCSV.find(a => a.ruta === formData.archivo_csv)?.columnas.length > 0 && (
              <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm font-bold text-gray-700 mb-2">
                  Columnas detectadas en el archivo:
                </p>
                <div className="flex flex-wrap gap-2">
                  {archivosCSV.find(a => a.ruta === formData.archivo_csv).columnas.map((col, idx) => (
                    <span key={idx} className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-mono text-gray-700">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mensajes */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Botón de Entrenamiento */}
          <button
            type="submit"
            disabled={entrenando || !formData.archivo_csv}
            className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] ${
              entrenando || !formData.archivo_csv
                ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
            }`}
            style={!(entrenando || !formData.archivo_csv) ? { boxShadow: '0 4px 14px rgba(249,115,22,0.45)' } : {}}
          >
            {entrenando ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                Entrenando modelo...
              </>
            ) : (
              <>
                <Zap className="w-6 h-6" />
                Iniciar Entrenamiento
              </>
            )}
          </button>
        </form>
      </div>

      {/* Resultado del Entrenamiento */}
      {resultado && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 shadow-lg border-2 border-green-200">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
            <div>
              <h2 className="text-2xl font-black text-green-900">
                ¡Entrenamiento Exitoso!
              </h2>
              <p className="text-green-700">{resultado.mensaje}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Métricas */}
            <div className="bg-white rounded-lg p-6 border border-green-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Métricas del Modelo
              </h3>

              {resultado.tipo_modelo === 'clasificador' && resultado.metricas && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="text-gray-700 font-medium">Accuracy</span>
                    <span className="text-2xl font-black text-blue-600">
                      {(resultado.metricas.accuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span className="text-gray-700 font-medium">Precision</span>
                    <span className="text-2xl font-black text-green-600">
                      {(resultado.metricas.precision * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded">
                    <span className="text-gray-700 font-medium">Recall</span>
                    <span className="text-2xl font-black text-amber-600">
                      {(resultado.metricas.recall * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                    <span className="text-gray-700 font-medium">F1-Score</span>
                    <span className="text-2xl font-black text-orange-600">
                      {(resultado.metricas.f1_score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {resultado.tipo_modelo === 'regresor' && resultado.metricas && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="text-gray-700 font-medium">R² Score</span>
                    <span className="text-2xl font-black text-blue-600">
                      {(resultado.metricas.r2_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                    <span className="text-gray-700 font-medium">MAE</span>
                    <span className="text-2xl font-black text-orange-600">
                      {resultado.metricas.mae.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Datos */}
            <div className="bg-white rounded-lg p-6 border border-green-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Información de Datos
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total de Registros:</span>
                  <span className="font-bold text-gray-800">
                    {resultado.datos.total_registros.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Entrenamiento:</span>
                  <span className="font-bold text-gray-800">
                    {resultado.datos.registros_entrenamiento.toLocaleString()} (80%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Prueba:</span>
                  <span className="font-bold text-gray-800">
                    {resultado.datos.registros_prueba.toLocaleString()} (20%)
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <span className="text-gray-600 block mb-2">Features:</span>
                  <div className="flex flex-wrap gap-2">
                    {resultado.datos.features.map((feat, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-bold">
                      Guardado como: {resultado.archivo_guardado}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>📌 Nota:</strong> El modelo ha sido entrenado y guardado exitosamente.
              El sistema ahora utilizará este modelo para realizar las predicciones.
              Refresca la página de monitoreo para ver el modelo activo.
            </p>
          </div>
        </div>
      )}

      {/* Información Adicional */}
      <div className="mt-8 p-6 bg-gradient-to-r from-white to-slate-50 rounded-xl shadow-xl border-2 border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
            <Target className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">
            Requisitos de los Datos
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-xl border-l-4 border-l-orange-500 border border-orange-100"
               style={{ boxShadow: '0 4px 12px rgba(249,115,22,0.12)' }}>
            <h4 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
              Para Modelo Clasificador:
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• <code className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">casos_lag_1w..4w</code> - Casos confirmados semanas anteriores (1-4)</li>
              <li>• <code className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">ti_lag_1w, ti_lag_2w</code> - Tasa de incidencia semanas anteriores</li>
              <li>• <code className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">casos_promedio_4w</code> - Promedio móvil de 4 semanas</li>
              <li>• <code className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">tendencia_4w</code> - Tendencia de las últimas 4 semanas</li>
              <li>• <code className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">semana_anio</code> - Semana epidemiológica (1-52)</li>
              <li>• <code className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">mes</code> - Mes del año (1-12)</li>
              <li>• <code className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">estado_coded</code> - Código numérico del estado</li>
            </ul>
          </div>

          <div className="bg-white p-4 rounded-xl border-l-4 border-l-blue-500 border border-blue-100"
               style={{ boxShadow: '0 4px 12px rgba(59,130,246,0.12)' }}>
            <h4 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              Para Modelo Regresor:
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• <strong className="text-blue-700">Regresión Lineal:</strong> Captura tendencias generales. Ideal para proyecciones a mediano plazo.</li>
              <li>• <strong className="text-indigo-700">Regresión Polinomial (grado 2):</strong> Captura patrones no lineales y estacionales.</li>
              <li>• <strong className="text-green-700">Selección automática:</strong> El sistema elige el mejor modelo según el R² Score.</li>
            </ul>
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Target:</strong> <code className="bg-green-100 text-green-700 px-2 py-1 rounded font-mono">casos_confirmados</code> - Número de casos de dengue a predecir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntrenamientoModelos;
