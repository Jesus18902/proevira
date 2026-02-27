// src/pages/MonitoreoTiempoReal.js
// Vista de Monitoreo en Tiempo Real del Sistema y Modelos ML
// Muestra métricas actualizadas automáticamente cada 30 segundos

import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  Activity, Server, Database, Cpu, HardDrive, Clock, 
  TrendingUp, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, Zap, Eye, Signal, Wifi, WifiOff
} from 'lucide-react';

const API_URL = 'http://localhost:5001/api';

const MonitoreoTiempoReal = () => {
  const [estadoSistema, setEstadoSistema] = useState({
    api: { estado: 'conectando', tiempoRespuesta: 0, ultimaActualizacion: null },
    baseDatos: { estado: 'conectando', conexionesActivas: 0 },
    modelos: { estado: 'conectando', prediccionesHoy: 0, prediccionesTotal: 0, mejorModelo: null }
  });
  
  const [metricsModelo, setMetricsModelo] = useState({
    r2_lineal: 0,
    r2_polinomial: 0,
    mae_lineal: 0,
    mae_polinomial: 0,
    totalPredicciones: 0,
    distribucionClases: []
  });

  const [historialRendimiento, setHistorialRendimiento] = useState([]);
  const [alertasActivas, setAlertasActivas] = useState([]);
  const [modoAutoRefresh, setModoAutoRefresh] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Actualizar datos del sistema
  const actualizarEstadoSistema = useCallback(async () => {
    const tiempoInicio = Date.now();
    
    try {
      // Verificar estado de la API
      const responseAPI = await fetch(`${API_URL}/health`, {
        signal: AbortSignal.timeout(5000)
      });
      const tiempoRespuesta = Date.now() - tiempoInicio;
      
      if (responseAPI.ok) {
        const dataHealth = await responseAPI.json();
        
        setEstadoSistema(prev => ({
          ...prev,
          api: { 
            estado: 'activo', 
            tiempoRespuesta, 
            ultimaActualizacion: new Date() 
          },
          baseDatos: {
            estado: dataHealth.database?.status === 'connected' ? 'activo' : 'error',
            conexionesActivas: dataHealth.database?.active_connections || 0
          },
          modelos: {
            estado: dataHealth.models?.loaded ? 'activo' : 'error',
            prediccionesHoy: dataHealth.predictions?.today || 0,
            prediccionesTotal: dataHealth.predictions?.total || 0,
            mejorModelo: dataHealth.models?.mejor_modelo || null
          }
        }));

        // Cargar métricas del modelo (R² y MAE)
        if (dataHealth.models?.metrics) {
          setMetricsModelo({
            r2_lineal: dataHealth.models.metrics.r2_lineal || 0,
            r2_polinomial: dataHealth.models.metrics.r2_polinomial || 0,
            mae_lineal: dataHealth.models.metrics.mae_lineal || 0,
            mae_polinomial: dataHealth.models.metrics.mae_polinomial || 0,
            totalPredicciones: dataHealth.predictions?.total || 0,
            distribucionClases: dataHealth.predictions?.distribution || []
          });
        }

        // Actualizar historial de rendimiento
        setHistorialRendimiento(prev => {
          const nuevoRegistro = {
            timestamp: new Date().toLocaleTimeString(),
            tiempoRespuesta,
            predicciones: dataHealth.predictions?.last_minute || 0,
            alertasActivas: dataHealth.alertas?.activas || 0
          };
          return [...prev.slice(-19), nuevoRegistro];
        });

        // Cargar alertas activas
        try {
          const responseAlertas = await fetch(`${API_URL}/alertas/activas`);
          if (responseAlertas.ok) {
            const dataAlertas = await responseAlertas.json();
            if (dataAlertas.success && dataAlertas.alertas) {
              setAlertasActivas(dataAlertas.alertas);
            } else {
              setAlertasActivas([]);
            }
          }
        } catch (err) {
          console.error('Error cargando alertas:', err);
          setAlertasActivas([]);
        }
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
      setEstadoSistema(prev => ({
        ...prev,
        api: { estado: 'error', tiempoRespuesta: 0, ultimaActualizacion: new Date() }
      }));
    } finally {
      setLoading(false);
      setUltimaActualizacion(new Date());
    }
  }, []);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    actualizarEstadoSistema();
    
    if (modoAutoRefresh) {
      const interval = setInterval(actualizarEstadoSistema, 30000);
      return () => clearInterval(interval);
    }
  }, [modoAutoRefresh, actualizarEstadoSistema]);

  // Componente de estado
  const EstadoComponente = ({ titulo, estado, valor, icono: Icon, detalles }) => {
    const colores = {
      activo: 'bg-green-50 border-green-200 text-green-700',
      error: 'bg-red-50 border-red-200 text-red-700',
      conectando: 'bg-yellow-50 border-yellow-200 text-yellow-700'
    };

    const iconos = {
      activo: CheckCircle,
      error: XCircle,
      conectando: RefreshCw
    };

    const IconoEstado = iconos[estado] || RefreshCw;

    return (
      <div className={`border-2 rounded-xl p-6 ${colores[estado]}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6" />
            <h3 className="text-lg font-bold">{titulo}</h3>
          </div>
          <IconoEstado className={`w-5 h-5 ${estado === 'conectando' ? 'animate-spin' : ''}`} />
        </div>
        
        {valor !== undefined && (
          <div className="text-3xl font-black mb-2">{valor}</div>
        )}
        
        {detalles && (
          <div className="space-y-1 text-sm opacity-80">
            {detalles.map((detalle, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{detalle.label}:</span>
                <span className="font-bold">{detalle.valor}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Datos para gráfico de radar (métricas de regresión, normalizadas a 0-100)
  const dataRadar = [
    { metric: 'R² Lineal', value: metricsModelo.r2_lineal * 100, fullMark: 100 },
    { metric: 'R² Polinomial', value: metricsModelo.r2_polinomial * 100, fullMark: 100 },
    { metric: 'Precisión Lineal', value: Math.max(0, 100 - metricsModelo.mae_lineal), fullMark: 100 },
    { metric: 'Precisión Polinomial', value: Math.max(0, 100 - metricsModelo.mae_polinomial), fullMark: 100 },
    { metric: 'Confiabilidad', value: metricsModelo.totalPredicciones > 0 ? 95 : 0, fullMark: 100 }
  ];

  if (loading && historialRendimiento.length === 0) {
    return (
      <div className="flex-1 p-8 overflow-auto bg-gray-50">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
            <p className="text-xl text-gray-600">Cargando monitoreo en tiempo real...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            Monitoreo en Tiempo Real
          </h1>
          <p className="text-gray-600">
            Estado del sistema y modelos ML — actualización cada 30 segundos
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <div className="text-gray-500">Última actualización</div>
            <div className="font-bold text-gray-800">
              {ultimaActualizacion.toLocaleTimeString()}
            </div>
          </div>

          <button
            onClick={() => setModoAutoRefresh(!modoAutoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
              modoAutoRefresh
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            {modoAutoRefresh ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            {modoAutoRefresh ? 'Auto ON' : 'Auto OFF'}
          </button>

          <button
            onClick={actualizarEstadoSistema}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-5 h-5" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Grid de Estado del Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <EstadoComponente
          titulo="API Flask"
          estado={estadoSistema.api.estado}
          valor={`${estadoSistema.api.tiempoRespuesta}ms`}
          icono={Server}
          detalles={[
            { label: 'Tiempo Respuesta', valor: `${estadoSistema.api.tiempoRespuesta}ms` },
            { label: 'Puerto', valor: '5001' },
            { label: 'Última Check', valor: estadoSistema.api.ultimaActualizacion?.toLocaleTimeString() || 'N/A' }
          ]}
        />

        <EstadoComponente
          titulo="Base de Datos"
          estado={estadoSistema.baseDatos.estado}
          valor={`${estadoSistema.baseDatos.conexionesActivas} conexiones`}
          icono={Database}
          detalles={[
            { label: 'Conexiones Activas', valor: estadoSistema.baseDatos.conexionesActivas },
            { label: 'Motor', valor: 'MySQL 8.0' },
            { label: 'Base', valor: 'proyecto_integrador' }
          ]}
        />

        <EstadoComponente
          titulo="Modelos ML"
          estado={estadoSistema.modelos.estado}
          valor={estadoSistema.modelos.mejorModelo 
            ? `Mejor: ${estadoSistema.modelos.mejorModelo === 'lineal' ? 'Lineal' : 'Polinomial'}` 
            : 'Sin cargar'}
          icono={Zap}
          detalles={[
            { label: 'Predicciones Hoy', valor: estadoSistema.modelos.prediccionesHoy },
            { label: 'Total Guardadas', valor: estadoSistema.modelos.prediccionesTotal },
            { label: 'Alertas Activas', valor: alertasActivas.length }
          ]}
        />
      </div>

      {/* Gráficos de Rendimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tiempo de Respuesta */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-800">Tiempo de Respuesta (ms)</h2>
          </div>
          {historialRendimiento.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={historialRendimiento}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="timestamp" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="tiempoRespuesta" 
                  stroke="#3b82f6" 
                  fill="#93c5fd" 
                  strokeWidth={2}
                  name="Respuesta (ms)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Recopilando datos de rendimiento...</p>
                <p className="text-sm">Se actualizará cada 30 segundos</p>
              </div>
            </div>
          )}
        </div>

        {/* Alertas Activas por Tiempo */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-green-500" />
            <h2 className="text-xl font-bold text-gray-800">Alertas Activas</h2>
          </div>
          {historialRendimiento.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={historialRendimiento}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="timestamp" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                />
                <Bar dataKey="alertasActivas" fill="#f97316" radius={[8, 8, 0, 0]} name="Alertas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Recopilando datos de alertas...</p>
                <p className="text-sm">Se actualizará cada 30 segundos</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Métricas del Modelo ML */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Radar de Métricas */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Signal className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold text-gray-800">Rendimiento del Modelo</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={dataRadar}>
              <PolarGrid stroke="#e0e0e0" />
              <PolarAngleAxis dataKey="metric" stroke="#666" fontSize={11} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#666" fontSize={10} />
              <Radar 
                name="Performance" 
                dataKey="value" 
                stroke="#3b82f6" 
                fill="#93c5fd" 
                fillOpacity={0.5}
                strokeWidth={2}
              />
              <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Valor']} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Métricas Numéricas - R² y MAE */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <Cpu className="w-6 h-6 text-indigo-500" />
            <h2 className="text-xl font-bold text-gray-800">Métricas de Regresión</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="text-sm text-blue-700 mb-1">R² Lineal</div>
              <div className="text-3xl font-black text-blue-900">
                {(metricsModelo.r2_lineal).toFixed(4)}
              </div>
              <div className="mt-2 h-2 bg-blue-200 rounded-full">
                <div 
                  className="h-2 bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${metricsModelo.r2_lineal * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4">
              <div className="text-sm text-indigo-700 mb-1">R² Polinomial</div>
              <div className="text-3xl font-black text-indigo-900">
                {(metricsModelo.r2_polinomial).toFixed(4)}
              </div>
              <div className="mt-2 h-2 bg-indigo-200 rounded-full">
                <div 
                  className="h-2 bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${metricsModelo.r2_polinomial * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="text-sm text-green-700 mb-1">MAE Lineal</div>
              <div className="text-3xl font-black text-green-900">
                {metricsModelo.mae_lineal.toFixed(2)}
              </div>
              <div className="text-xs text-green-600 mt-1">casos de error promedio</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="text-sm text-purple-700 mb-1">MAE Polinomial</div>
              <div className="text-3xl font-black text-purple-900">
                {metricsModelo.mae_polinomial.toFixed(2)}
              </div>
              <div className="text-xs text-purple-600 mt-1">casos de error promedio</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Total Predicciones Guardadas:</span>
              <span className="text-2xl font-black text-gray-800">
                {metricsModelo.totalPredicciones.toLocaleString()}
              </span>
            </div>
            {estadoSistema.modelos.mejorModelo && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Mejor Modelo Actual:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                  ★ Regresión {estadoSistema.modelos.mejorModelo === 'lineal' ? 'Lineal' : 'Polinomial'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Distribución de Riesgo */}
      {metricsModelo.distribucionClases.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-800">
              Distribución de Riesgo (Últimos 7 días)
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metricsModelo.distribucionClases.map((d, idx) => {
              const colores = {
                'Bajo': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
                'Moderado': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
                'Alto': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
                'Critico': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
                'Crítico': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' }
              };
              const c = colores[d.nivel] || colores['Bajo'];
              return (
                <div key={idx} className={`${c.bg} ${c.border} border-2 rounded-xl p-4 text-center`}>
                  <div className={`text-3xl font-black ${c.text}`}>{d.cantidad}</div>
                  <div className={`text-sm font-medium ${c.text}`}>{d.nivel}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alertas Activas */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold text-gray-800">
            Alertas Activas ({alertasActivas.length})
          </h2>
        </div>
        
        {alertasActivas.length > 0 ? (
          <div className="space-y-3">
            {alertasActivas.slice(0, 8).map((alerta, idx) => {
              const colorClasses = {
                'Crítico': 'bg-red-50 border-red-300 text-red-900',
                'Critico': 'bg-red-50 border-red-300 text-red-900',
                'Alto': 'bg-orange-50 border-orange-300 text-orange-900',
                'Moderado': 'bg-yellow-50 border-yellow-300 text-yellow-900',
                'Bajo': 'bg-blue-50 border-blue-300 text-blue-900'
              };
              const colorClass = colorClasses[alerta.nivel] || 'bg-gray-50 border-gray-200 text-gray-900';
              
              return (
                <div 
                  key={alerta.id || idx}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg ${colorClass}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{alerta.estado || 'Estado Desconocido'}</span>
                        <span className="text-xs px-2 py-1 bg-white rounded-full font-bold">
                          {alerta.nivel || 'N/A'}
                        </span>
                      </div>
                      <div className="text-sm opacity-90">
                        {alerta.mensaje || 'Sin descripción'}
                      </div>
                      {alerta.casos_predichos > 0 && (
                        <div className="text-xs mt-1 opacity-75">
                          Casos predichos: {alerta.casos_predichos}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs ml-4 flex-shrink-0">
                    {alerta.fecha_generacion && (
                      <div>{new Date(alerta.fecha_generacion).toLocaleString('es-MX')}</div>
                    )}
                    {alerta.probabilidad > 0 && (
                      <div className="font-bold mt-1 text-base">
                        {Number(alerta.probabilidad).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-300" />
            <p className="text-gray-500 font-medium">Sin alertas activas</p>
            <p className="text-sm text-gray-400">El sistema se encuentra en estado normal</p>
          </div>
        )}
      </div>

      {/* Footer de Información */}
      <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div>
            <Eye className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <div className="text-sm text-gray-500">Modo Monitoreo</div>
            <div className="text-lg font-bold text-gray-800">Tiempo Real</div>
          </div>
          <div>
            <RefreshCw className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <div className="text-sm text-gray-500">Frecuencia</div>
            <div className="text-lg font-bold text-gray-800">30 segundos</div>
          </div>
          <div>
            <HardDrive className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <div className="text-sm text-gray-500">Historial</div>
            <div className="text-lg font-bold text-gray-800">{historialRendimiento.length} registros</div>
          </div>
          <div>
            <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${
              estadoSistema.api.estado === 'activo' ? 'text-green-500' : 'text-red-500'
            }`} />
            <div className="text-sm text-gray-500">Estado General</div>
            <div className={`text-lg font-bold ${
              estadoSistema.api.estado === 'activo' ? 'text-green-600' : 'text-red-600'
            }`}>
              {estadoSistema.api.estado === 'activo' ? 'Operativo' : 'Error'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoreoTiempoReal;
