// Alertas.js - Sistema de Alertas Epidemiológicas Funcional
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

const API_URL = 'http://localhost:5001/api';

const Alertas = () => {
  const [activeTab, setActiveTab] = useState('generar');
  const [regiones, setRegiones] = useState([]);
  const [alertasActivas, setAlertasActivas] = useState([]);
  const [historialAlertas, setHistorialAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [enviando, setEnviando] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  
  // Alertas generadas (antes de enviar)
  const [alertasGeneradas, setAlertasGeneradas] = useState([]);
  
  // Configuración
  const [config, setConfig] = useState({
    umbralRiesgo: 30,
    tipoNotificacion: 'sistema',
    prioridad: 'alta',
    incluirRecomendaciones: true
  });

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [regionesRes, activasRes, historialRes] = await Promise.all([
        fetch(`${API_URL}/config/regiones`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/alertas/activas`).then(r => r.json()).catch(() => ({ alertas: [] })),
        fetch(`${API_URL}/alertas/historial`).then(r => r.json()).catch(() => ({ alertas: [] }))
      ]);
      
      setRegiones(Array.isArray(regionesRes) ? regionesRes : []);
      setAlertasActivas(activasRes?.alertas || []);
      setHistorialAlertas(historialRes?.alertas || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Generar alertas automáticas
  const generarAlertas = async () => {
    setGenerando(true);
    setMensaje(null);
    setAlertasGeneradas([]);
    
    try {
      const response = await fetch(`${API_URL}/alertas/generar-automaticas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          umbral_riesgo: config.umbralRiesgo
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.alertas) {
        setAlertasGeneradas(data.alertas);
        setMensaje({ 
          tipo: 'success', 
          texto: `Se identificaron ${data.alertas.length} estados con riesgo superior al ${config.umbralRiesgo}%` 
        });
      } else {
        setMensaje({ tipo: 'error', texto: data.error || 'Error al generar alertas' });
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor' });
    } finally {
      setGenerando(false);
    }
  };

  // Enviar una alerta individual
  const enviarAlertaIndividual = async (alerta) => {
    setEnviando(alerta.id_region);
    
    try {
      const response = await fetch(`${API_URL}/alertas/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_region: alerta.id_region,
          estado: alerta.estado,
          nivel_riesgo: alerta.nivel_riesgo,
          probabilidad: alerta.probabilidad,
          casos_esperados: alerta.casos_esperados,
          mensaje: alerta.mensaje,
          recomendaciones: alerta.recomendaciones,
          tipo_notificacion: config.tipoNotificacion,
          prioridad: config.prioridad
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Marcar como enviada
        setAlertasGeneradas(prev => 
          prev.map(a => a.id_region === alerta.id_region ? { ...a, enviada: true } : a)
        );
        setMensaje({ tipo: 'success', texto: `Alerta enviada a ${alerta.estado}` });
        cargarDatos(); // Refrescar alertas activas
      } else {
        setMensaje({ tipo: 'error', texto: data.error || 'Error al enviar' });
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error de conexión' });
    } finally {
      setEnviando(null);
    }
  };

  // Enviar todas las alertas pendientes
  const enviarTodasAlertas = async () => {
    const pendientes = alertasGeneradas.filter(a => !a.enviada);
    if (pendientes.length === 0) {
      setMensaje({ tipo: 'warning', texto: 'No hay alertas pendientes de enviar' });
      return;
    }
    
    setEnviando('todas');
    
    try {
      const response = await fetch(`${API_URL}/alertas/enviar-masivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertas: pendientes,
          tipo_notificacion: config.tipoNotificacion,
          prioridad: config.prioridad
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAlertasGeneradas(prev => prev.map(a => ({ ...a, enviada: true })));
        setMensaje({ tipo: 'success', texto: `${data.enviadas} alertas enviadas exitosamente` });
        cargarDatos();
      } else {
        setMensaje({ tipo: 'error', texto: data.error });
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error de conexión' });
    } finally {
      setEnviando(null);
    }
  };

  // Resolver alerta
  const resolverAlerta = async (alertaId, estado) => {
    try {
      const response = await fetch(`${API_URL}/alertas/${alertaId}/resolver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolucion: 'Alerta atendida y resuelta' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMensaje({ tipo: 'success', texto: `Alerta de ${estado} marcada como resuelta` });
        cargarDatos();
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al resolver alerta' });
    }
  };

  // Exportar alertas a CSV
  const exportarCSV = () => {
    const datos = activeTab === 'activas' ? alertasActivas : historialAlertas;
    if (datos.length === 0) {
      setMensaje({ tipo: 'warning', texto: 'No hay datos para exportar' });
      return;
    }
    
    const headers = ['Estado', 'Nivel', 'Probabilidad', 'Fecha', 'Estado Alerta'];
    const rows = datos.map(a => [
      a.estado,
      a.nivel,
      a.probabilidad || '-',
      a.fecha_generacion ? new Date(a.fecha_generacion).toLocaleString() : '-',
      a.estado_alerta || 'enviada'
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alertas_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    setMensaje({ tipo: 'success', texto: 'Archivo CSV descargado' });
  };

  // Colores por nivel
  const getColorNivel = (nivel) => {
    const colores = {
      'Crítico': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', bar: '#dc2626' },
      'Alto': { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa', bar: '#ea580c' },
      'Moderado': { bg: '#fefce8', text: '#ca8a04', border: '#fef08a', bar: '#ca8a04' },
      'Bajo': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', bar: '#16a34a' }
    };
    return colores[nivel] || colores['Bajo'];
  };

  // Estadísticas
  const stats = {
    totalActivas: alertasActivas.length,
    criticas: alertasActivas.filter(a => a.nivel === 'Crítico').length,
    altas: alertasActivas.filter(a => a.nivel === 'Alto').length,
    moderadas: alertasActivas.filter(a => a.nivel === 'Moderado').length,
    resueltas: historialAlertas.filter(a => a.estado_alerta === 'resuelta').length
  };

  // Datos para gráfica de pie
  const dataPie = [
    { name: 'Críticas', value: stats.criticas, color: '#dc2626' },
    { name: 'Altas', value: stats.altas, color: '#ea580c' },
    { name: 'Moderadas', value: stats.moderadas, color: '#ca8a04' }
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando sistema de alertas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-orange-600">notifications_active</span>
              Sistema de Alertas Epidemiológicas
            </h1>
            <p className="text-gray-600 mt-1">
              Genera, envía y gestiona alertas de riesgo a las entidades federativas
            </p>
          </div>
          <button 
            onClick={cargarDatos}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined">refresh</span>
            Actualizar
          </button>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
          mensaje.tipo === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          mensaje.tipo === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-yellow-50 text-yellow-800 border border-yellow-200'
        }`}>
          <span className="material-symbols-outlined">
            {mensaje.tipo === 'success' ? 'check_circle' : mensaje.tipo === 'error' ? 'error' : 'warning'}
          </span>
          <span className="flex-1">{mensaje.texto}</span>
          <button onClick={() => setMensaje(null)} className="hover:opacity-70">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Alertas Activas</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalActivas}</p>
            </div>
            <span className="material-symbols-outlined text-3xl text-blue-400">notifications</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Críticas</p>
              <p className="text-2xl font-bold text-red-600">{stats.criticas}</p>
            </div>
            <span className="material-symbols-outlined text-3xl text-red-400">crisis_alert</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Alto Riesgo</p>
              <p className="text-2xl font-bold text-orange-600">{stats.altas}</p>
            </div>
            <span className="material-symbols-outlined text-3xl text-orange-400">warning</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Moderadas</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.moderadas}</p>
            </div>
            <span className="material-symbols-outlined text-3xl text-yellow-400">info</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Resueltas</p>
              <p className="text-2xl font-bold text-green-600">{stats.resueltas}</p>
            </div>
            <span className="material-symbols-outlined text-3xl text-green-400">task_alt</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="flex border-b overflow-x-auto">
          {[
            { id: 'generar', label: 'Generar Alertas', icon: 'add_alert' },
            { id: 'activas', label: `Activas (${stats.totalActivas})`, icon: 'notifications_active' },
            { id: 'historial', label: 'Historial', icon: 'history' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="material-symbols-outlined">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: Generar Alertas */}
      {activeTab === 'generar' && (
        <div className="space-y-6">
          {/* Configuración */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">tune</span>
              Configuración de Análisis
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Umbral */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Umbral de Riesgo: <span className="text-blue-600 font-bold">{config.umbralRiesgo}%</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={config.umbralRiesgo}
                  onChange={(e) => setConfig({ ...config, umbralRiesgo: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10% (más alertas)</span>
                  <span>80% (solo críticas)</span>
                </div>
              </div>
              
              {/* Tipo notificación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Canal de Notificación
                </label>
                <select
                  value={config.tipoNotificacion}
                  onChange={(e) => setConfig({ ...config, tipoNotificacion: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="sistema">🖥️ Sistema interno</option>
                  <option value="email">📧 Correo electrónico</option>
                  <option value="sms">📱 SMS</option>
                  <option value="todos">📢 Todos los canales</option>
                </select>
              </div>
              
              {/* Prioridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridad de Envío
                </label>
                <select
                  value={config.prioridad}
                  onChange={(e) => setConfig({ ...config, prioridad: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="critica">🔴 Crítica (inmediata)</option>
                  <option value="alta">🟠 Alta</option>
                  <option value="media">🟡 Media</option>
                  <option value="baja">🟢 Baja</option>
                </select>
              </div>
              
              {/* Botón generar */}
              <div className="flex items-end">
                <button
                  onClick={generarAlertas}
                  disabled={generando}
                  className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generando ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Analizando regiones...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">search</span>
                      Analizar Riesgo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Resultados del análisis */}
          {alertasGeneradas.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-600">warning</span>
                  Alertas Identificadas ({alertasGeneradas.length} estados)
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAlertasGeneradas([])}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                    Limpiar
                  </button>
                  <button
                    onClick={enviarTodasAlertas}
                    disabled={enviando || alertasGeneradas.every(a => a.enviada)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enviando === 'todas' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">send</span>
                        Enviar Todas ({alertasGeneradas.filter(a => !a.enviada).length})
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Gráfica de barras */}
              <div className="h-72 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertasGeneradas.slice(0, 15)} margin={{ bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="estado" 
                      tick={{ fontSize: 11 }} 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      interval={0}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Riesgo %', angle: -90, position: 'insideLeft', fontSize: 12 }} 
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Probabilidad']}
                      labelFormatter={(label) => `Estado: ${label}`}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="probabilidad" radius={[4, 4, 0, 0]}>
                      {alertasGeneradas.slice(0, 15).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getColorNivel(entry.nivel_riesgo).bar} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Lista de alertas */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {alertasGeneradas.map((alerta, idx) => {
                  const colores = getColorNivel(alerta.nivel_riesgo);
                  const estaEnviando = enviando === alerta.id_region;
                  
                  return (
                    <div 
                      key={idx}
                      className={`p-4 rounded-lg border-2 transition-all ${alerta.enviada ? 'opacity-60' : ''}`}
                      style={{ 
                        backgroundColor: colores.bg, 
                        borderColor: colores.border 
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="material-symbols-outlined" style={{ color: colores.text }}>
                              location_on
                            </span>
                            <span className="font-bold text-gray-800 text-lg">{alerta.estado}</span>
                            <span 
                              className="px-3 py-1 rounded-full text-xs font-bold"
                              style={{ backgroundColor: colores.border, color: colores.text }}
                            >
                              {alerta.nivel_riesgo}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700">
                              {alerta.probabilidad}% riesgo
                            </span>
                            {alerta.enviada && (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-200 text-green-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">check</span>
                                Enviada
                              </span>
                            )}
                          </div>
                          
                          {/* Stats */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                            <div className="bg-white/50 rounded p-2">
                              <span className="text-gray-500">Casos esperados:</span>
                              <span className="font-bold text-gray-800 ml-2">{alerta.casos_esperados}</span>
                            </div>
                            <div className="bg-white/50 rounded p-2">
                              <span className="text-gray-500">Casos actuales:</span>
                              <span className="font-bold text-gray-800 ml-2">{alerta.casos_semana_actual}</span>
                            </div>
                            <div className="bg-white/50 rounded p-2">
                              <span className="text-gray-500">Tendencia:</span>
                              <span className={`font-bold ml-2 ${
                                alerta.tendencia === 'Creciente' ? 'text-red-600' : 
                                alerta.tendencia === 'Decreciente' ? 'text-green-600' : 'text-gray-600'
                              }`}>
                                {alerta.tendencia === 'Creciente' ? '📈' : alerta.tendencia === 'Decreciente' ? '📉' : '➡️'} {alerta.tendencia}
                              </span>
                            </div>
                            <div className="bg-white/50 rounded p-2">
                              <span className="text-gray-500">ID Región:</span>
                              <span className="font-bold text-gray-800 ml-2">{alerta.id_region}</span>
                            </div>
                          </div>
                          
                          {/* Mensaje */}
                          <p className="text-sm text-gray-700 mb-2">{alerta.mensaje}</p>
                          
                          {/* Recomendaciones */}
                          {config.incluirRecomendaciones && alerta.recomendaciones && (
                            <div className="bg-white/70 rounded p-3 text-sm">
                              <span className="font-semibold text-gray-700">💡 Recomendaciones: </span>
                              <span className="text-gray-600">{alerta.recomendaciones}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Botón enviar */}
                        {!alerta.enviada && (
                          <button
                            onClick={() => enviarAlertaIndividual(alerta)}
                            disabled={estaEnviando}
                            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 shrink-0"
                          >
                            {estaEnviando ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <span className="material-symbols-outlined">send</span>
                            )}
                            Enviar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Estado vacío */}
          {alertasGeneradas.length === 0 && !generando && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">search</span>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Analiza el riesgo en las entidades
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Configura el umbral de riesgo y haz clic en "Analizar Riesgo" para identificar 
                las entidades federativas que requieren una alerta epidemiológica.
              </p>
              <button
                onClick={generarAlertas}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined">play_arrow</span>
                Iniciar Análisis
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB: Alertas Activas */}
      {activeTab === 'activas' && (
        <div className="space-y-6">
          {/* Resumen visual */}
          {dataPie.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución por Nivel de Riesgo</h3>
              <div className="flex items-center justify-center gap-8">
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dataPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {dataPie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {dataPie.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                      <span className="text-gray-700">{item.name}: <strong>{item.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Lista de alertas activas */}
          {alertasActivas.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Alertas Pendientes de Resolución
                </h3>
                <button
                  onClick={exportarCSV}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Exportar CSV
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {alertasActivas.map((alerta, idx) => {
                  const colores = getColorNivel(alerta.nivel);
                  return (
                    <div 
                      key={idx}
                      className="p-4 rounded-lg border-l-4"
                      style={{ borderColor: colores.bar, backgroundColor: colores.bg }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{alerta.estado}</span>
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-bold"
                            style={{ backgroundColor: colores.border, color: colores.text }}
                          >
                            {alerta.nivel}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {alerta.fecha_generacion ? new Date(alerta.fecha_generacion).toLocaleDateString() : '-'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{alerta.mensaje}</p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Probabilidad: <strong>{alerta.probabilidad}%</strong>
                        </span>
                        <button
                          onClick={() => resolverAlerta(alerta.id, alerta.estado)}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1 text-sm font-medium"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Resolver
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-green-300 mb-4">verified</span>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No hay alertas activas
              </h3>
              <p className="text-gray-500">
                Todas las alertas han sido atendidas. ¡Excelente trabajo!
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB: Historial */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-600">history</span>
              Historial de Alertas ({historialAlertas.length})
            </h3>
            <button
              onClick={exportarCSV}
              disabled={historialAlertas.length === 0}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Exportar CSV
            </button>
          </div>
          
          {historialAlertas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nivel</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Probabilidad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha Generación</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Resolución</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {historialAlertas.map((alerta, idx) => {
                    const colores = getColorNivel(alerta.nivel);
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{alerta.estado}</td>
                        <td className="px-4 py-3">
                          <span 
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{ backgroundColor: colores.bg, color: colores.text }}
                          >
                            {alerta.nivel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{alerta.probabilidad || '-'}%</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {alerta.fecha_generacion ? new Date(alerta.fecha_generacion).toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            alerta.estado_alerta === 'resuelta' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {alerta.estado_alerta || 'enviada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm max-w-xs truncate">
                          {alerta.resolucion || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">inbox</span>
              <p>No hay historial de alertas</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Alertas;
