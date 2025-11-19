import React, { useState, useEffect } from 'react';
import { modeloService, datosService } from '../services/api';
import { Line } from 'react-chartjs-2';

const ModelosPredictivos = () => {
  const [archivo, setArchivo] = useState(null);
  const [archivosRecientes, setArchivosRecientes] = useState([]);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState('');
  const [enfermedades, setEnfermedades] = useState([]);
  const [regiones, setRegiones] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [predicciones, setPredicciones] = useState([]);
  const [configuracion, setConfiguracion] = useState({
    enfermedad: '',
    region: '',
    modelo: '',
    horizonte: 90
  });
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('ejecutar');
  const [error, setError] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      console.log('Iniciando carga de datos...');
      
      // Cargar enfermedades
      const enfermedadesRes = await datosService.getEnfermedades();
      console.log('Respuesta enfermedades:', enfermedadesRes);
      console.log('Datos enfermedades:', enfermedadesRes.data);
      
      if (Array.isArray(enfermedadesRes.data)) {
        setEnfermedades(enfermedadesRes.data);
        console.log('Enfermedades seteadas:', enfermedadesRes.data.length);
      } else {
        console.error('enfermedadesRes.data no es un array:', enfermedadesRes.data);
        setEnfermedades([]);
      }
      
      // Cargar regiones
      const regionesRes = await datosService.getRegiones();
      console.log('Respuesta regiones:', regionesRes);
      console.log('Datos regiones:', regionesRes.data);
      
      if (Array.isArray(regionesRes.data)) {
        setRegiones(regionesRes.data);
        console.log('Regiones seteadas:', regionesRes.data.length);
      } else {
        console.error('regionesRes.data no es un array:', regionesRes.data);
        setRegiones([]);
      }
      
      // Cargar modelos
      try {
        const modelosRes = await datosService.getModelos();
        console.log('Respuesta modelos:', modelosRes);
        if (Array.isArray(modelosRes.data)) {
          setModelos(modelosRes.data);
        } else {
          setModelos([]);
        }
      } catch (err) {
        console.warn('Error cargando modelos:', err);
        setModelos([]);
      }

      // Cargar archivos recientes
      try {
        const archivosRes = await datosService.getArchivosRecientes();
        if (Array.isArray(archivosRes.data)) {
          setArchivosRecientes(archivosRes.data);
        } else {
          setArchivosRecientes([]);
        }
      } catch (err) {
        console.warn('No se pudieron cargar archivos recientes:', err);
        setArchivosRecientes([]);
      }

      // Cargar predicciones
      try {
        const prediccionesRes = await modeloService.obtenerPredicciones({ limite: 10 });
        if (Array.isArray(prediccionesRes.data)) {
          setPredicciones(prediccionesRes.data);
        } else {
          setPredicciones([]);
        }
      } catch (err) {
        console.warn('No se pudieron cargar predicciones:', err);
        setPredicciones([]);
      }

      console.log('Carga de datos completada');
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error al cargar los datos: ' + error.message);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivo(file);
    }
  };

  const subirArchivo = async () => {
    if (!archivo) {
      alert('Por favor selecciona un archivo CSV');
      return;
    }

    try {
      setUploading(true);
      const response = await modeloService.subirDatosCSV(archivo);
      
      if (response.data.success) {
        alert('Archivo subido exitosamente');
        setArchivoSeleccionado(response.data.nombreArchivo);
        setArchivo(null);
        // Recargar archivos recientes
        const archivosRes = await datosService.getArchivosRecientes();
        setArchivosRecientes(archivosRes.data || []);
      }
      setUploading(false);
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      alert('Error al subir el archivo: ' + (error.response?.data?.error || error.message));
      setUploading(false);
    }
  };

  const ejecutarPrediccion = async () => {
    console.log('Configuración actual:', configuracion);
    console.log('Archivo seleccionado:', archivoSeleccionado);
    
    if (!archivoSeleccionado) {
      alert('Por favor selecciona o sube un archivo CSV');
      return;
    }

    if (!configuracion.enfermedad || !configuracion.region) {
      alert('Por favor selecciona una enfermedad y región');
      console.log('Enfermedad:', configuracion.enfermedad);
      console.log('Región:', configuracion.region);
      return;
    }

    try {
      setLoading(true);
      setResultado(null);

      const response = await modeloService.ejecutarPrediccionDengue({
        archivo: archivoSeleccionado,
        horizonte: configuracion.horizonte,
        enfermedad: configuracion.enfermedad,
        region: configuracion.region
      });

      if (response.data.success) {
        setResultado(response.data);
        // Recargar predicciones
        const prediccionesRes = await modeloService.obtenerPredicciones({ limite: 10 });
        setPredicciones(prediccionesRes.data || []);
      } else {
        alert('Error en la predicción: ' + response.data.error);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error ejecutando predicción:', error);
      alert('Error al ejecutar la predicción: ' + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  // Preparar datos para la gráfica
  const datosGrafica = resultado ? {
    labels: [
      ...(resultado.datos_historicos?.slice(-30).map(d => new Date(d.fecha).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })) || []),
      ...(resultado.predicciones?.slice(0, 30).map(p => new Date(p.fecha).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })) || [])
    ],
    datasets: [
      {
        label: 'Casos Reales',
        data: [
          ...(resultado.datos_historicos?.slice(-30).map(d => d.casos_reales) || []),
          ...Array(resultado.predicciones?.slice(0, 30).length || 0).fill(null)
        ],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4
      },
      {
        label: 'Predicción Lineal',
        data: [
          ...Array(resultado.datos_historicos?.slice(-30).length || 0).fill(null),
          ...(resultado.predicciones?.slice(0, 30).map(p => p.pred_lineal) || [])
        ],
        borderColor: '#10b981',
        borderDash: [5, 5],
        borderWidth: 2,
        tension: 0.4,
        fill: false
      },
      {
        label: 'Predicción Polinomial',
        data: [
          ...Array(resultado.datos_historicos?.slice(-30).length || 0).fill(null),
          ...(resultado.predicciones?.slice(0, 30).map(p => p.pred_polinomial) || [])
        ],
        borderColor: '#f59e0b',
        borderDash: [5, 5],
        borderWidth: 2,
        tension: 0.4,
        fill: false
      }
    ]
  } : null;

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-text-main text-4xl font-black leading-tight">
            Modelos Predictivos
          </h1>
          <p className="text-text-secondary text-base">
            Análisis predictivo con Machine Learning
          </p>
        </div>

        {/* Mostrar errores si hay */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={cargarDatos}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Reintentar
            </button>
          </div>
        )}

        {/* Debug info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Debug:</strong> Enfermedades: {enfermedades.length} | 
            Regiones: {regiones.length} | 
            Modelos: {modelos.length}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Enfermedad seleccionada: {configuracion.enfermedad || 'ninguna'} | 
            Región seleccionada: {configuracion.region || 'ninguna'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-3">
          <button
            onClick={() => setVistaActiva('ejecutar')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              vistaActiva === 'ejecutar'
                ? 'bg-primary text-white'
                : 'bg-white border border-[#dbe2e6] text-text-main hover:bg-gray-50'
            }`}>
            <span className="material-symbols-outlined mr-2 align-middle">play_arrow</span>
            Ejecutar Predicción
          </button>
          <button
            onClick={() => setVistaActiva('historial')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              vistaActiva === 'historial'
                ? 'bg-primary text-white'
                : 'bg-white border border-[#dbe2e6] text-text-main hover:bg-gray-50'
            }`}>
            <span className="material-symbols-outlined mr-2 align-middle">history</span>
            Historial de Predicciones
          </button>
        </div>

        {/* Vista: Ejecutar Predicción */}
        {vistaActiva === 'ejecutar' && (
          <>
            {/* Configuración */}
            <div className="bg-white p-6 rounded-xl border border-[#dbe2e6] shadow-sm">
              <h2 className="text-xl font-bold text-text-main mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">settings</span>
                Configuración del Modelo
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna izquierda */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Subir Nuevo Archivo CSV
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="flex-1 px-4 py-2 border border-[#dbe2e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        onClick={subirArchivo}
                        disabled={!archivo || uploading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                        {uploading ? 'Subiendo...' : 'Subir'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      O seleccionar archivo existente
                    </label>
                    <select
                      value={archivoSeleccionado}
                      onChange={(e) => setArchivoSeleccionado(e.target.value)}
                      className="w-full px-4 py-2 border border-[#dbe2e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Seleccionar archivo...</option>
                      {archivosRecientes.map((arch, idx) => (
                        <option key={idx} value={arch.nombre}>
                          {arch.nombre} ({new Date(arch.fecha).toLocaleDateString('es-MX')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Horizonte de Predicción (días)
                    </label>
                    <input
                      type="number"
                      value={configuracion.horizonte}
                      onChange={(e) => setConfiguracion({...configuracion, horizonte: parseInt(e.target.value)})}
                      min="30"
                      max="180"
                      className="w-full px-4 py-2 border border-[#dbe2e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Columna derecha */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Enfermedad {enfermedades.length > 0 ? `(${enfermedades.length} disponibles)` : '(Cargando...)'}
                    </label>
                    <select
                      value={configuracion.enfermedad}
                      onChange={(e) => {
                        console.log('Seleccionando enfermedad:', e.target.value);
                        setConfiguracion({...configuracion, enfermedad: e.target.value});
                      }}
                      className="w-full px-4 py-2 border border-[#dbe2e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={enfermedades.length === 0}>
                      <option value="">Seleccionar enfermedad...</option>
                      {enfermedades.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre}
                        </option>
                      ))}
                    </select>
                    {enfermedades.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">No hay enfermedades disponibles</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Región {regiones.length > 0 ? `(${regiones.length} disponibles)` : '(Cargando...)'}
                    </label>
                    <select
                      value={configuracion.region}
                      onChange={(e) => {
                        console.log('Seleccionando región:', e.target.value);
                        setConfiguracion({...configuracion, region: e.target.value});
                      }}
                      className="w-full px-4 py-2 border border-[#dbe2e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={regiones.length === 0}>
                      <option value="">Seleccionar región...</option>
                      {regiones.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                    {regiones.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">No hay regiones disponibles</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Modelo a Utilizar
                    </label>
                    <select
                      value={configuracion.modelo}
                      onChange={(e) => setConfiguracion({...configuracion, modelo: e.target.value})}
                      className="w-full px-4 py-2 border border-[#dbe2e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Modelo por defecto (Polinomial)</option>
                      {modelos.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} - {m.tipo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={ejecutarPrediccion}
                  disabled={loading || !archivoSeleccionado}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Ejecutando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">bolt</span>
                      Ejecutar Predicción
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resultados */}
            {resultado && (
              <>
                {/* Métricas del Modelo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="material-symbols-outlined text-4xl opacity-80">show_chart</span>
                    </div>
                    <p className="text-sm opacity-90 mb-1">Precisión Modelo Lineal (R²)</p>
                    <h3 className="text-4xl font-bold">{(resultado.metricas?.r2_lineal * 100).toFixed(2)}%</h3>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg text-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="material-symbols-outlined text-4xl opacity-80">analytics</span>
                    </div>
                    <p className="text-sm opacity-90 mb-1">Precisión Modelo Polinomial (R²)</p>
                    <h3 className="text-4xl font-bold">{(resultado.metricas?.r2_polinomial * 100).toFixed(2)}%</h3>
                  </div>
                </div>

                {/* Gráfica de Predicción */}
                <div className="bg-white p-6 rounded-xl border border-[#dbe2e6] shadow-sm">
                  <h3 className="text-xl font-bold text-text-main mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">trending_up</span>
                    Proyección de Casos
                  </h3>
                  <div style={{ height: '400px' }}>
                    {datosGrafica && (
                      <Line 
                        data={datosGrafica} 
                        options={{
                          maintainAspectRatio: false,
                          responsive: true,
                          interaction: {
                            mode: 'index',
                            intersect: false,
                          },
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  let label = context.dataset.label || '';
                                  if (label) {
                                    label += ': ';
                                  }
                                  if (context.parsed.y !== null) {
                                    label += Math.round(context.parsed.y) + ' casos';
                                  }
                                  return label;
                                }
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Número de Casos'
                              }
                            },
                            x: {
                              title: {
                                display: true,
                                text: 'Fecha'
                              }
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Tabla de Predicciones */}
                <div className="bg-white rounded-xl border border-[#dbe2e6] shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-[#dbe2e6]">
                    <h3 className="text-lg font-bold text-text-main">Predicciones Detalladas (Próximos 30 días)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Fecha</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Pred. Lineal</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Pred. Polinomial</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Tendencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {resultado.predicciones?.slice(0, 30).map((pred, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-main">
                              {new Date(pred.fecha).toLocaleDateString('es-MX')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                              {Math.round(pred.pred_lineal)} casos
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                              {Math.round(pred.pred_polinomial)} casos
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {idx > 0 && resultado.predicciones[idx - 1] ? (
                                pred.pred_polinomial > resultado.predicciones[idx - 1].pred_polinomial ? (
                                  <span className="flex items-center gap-1 text-red-600">
                                    <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                    Incremento
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                    Disminución
                                  </span>
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Vista: Historial de Predicciones */}
        {vistaActiva === 'historial' && (
          <div className="bg-white rounded-xl border border-[#dbe2e6] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#dbe2e6]">
              <h3 className="text-lg font-bold text-text-main">Historial de Predicciones Guardadas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Enfermedad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Región</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Modelo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Fecha Pred.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Casos Pred.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Generado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {predicciones.map((pred) => (
                    <tr key={pred.id_prediccion} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        #{pred.id_prediccion}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-main font-medium">
                        {pred.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                        {pred.enfermedad || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                        {pred.region || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {pred.modelo || 'Polinomial'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                        {new Date(pred.fecha_prediccion).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                        {pred.casos_predichos}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {new Date(pred.fecha_generacion).toLocaleDateString('es-MX')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {predicciones.length === 0 && (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">history</span>
                <p className="text-text-secondary">No hay predicciones guardadas</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelosPredictivos;