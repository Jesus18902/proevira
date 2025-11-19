import React, { useState, useEffect } from 'react';
import { dashboardService, modeloService } from '../services/api';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const [estadisticas, setEstadisticas] = useState({
    totalCasos: 0,
    totalDefunciones: 0,
    alertasActivas: 0
  });
  const [casosPorRegion, setCasosPorRegion] = useState([]);
  const [tendenciaCasos, setTendenciaCasos] = useState([]);
  const [alertasRecientes, setAlertasRecientes] = useState([]);
  const [predicciones, setPredicciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());

  useEffect(() => {
    cargarDatos();
    
    // Auto-refresh cada 5 minutos
    const interval = setInterval(() => {
      cargarDatos();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar estadísticas generales
      try {
        const statsRes = await dashboardService.getEstadisticasGenerales();
        setEstadisticas(statsRes.data);
      } catch (err) {
        console.error('Error cargando estadísticas:', err);
        setEstadisticas({ totalCasos: 0, totalDefunciones: 0, alertasActivas: 0 });
      }

      // Cargar casos por región
      try {
        const regionRes = await dashboardService.getCasosPorRegion();
        setCasosPorRegion(regionRes.data || []);
      } catch (err) {
        console.error('Error cargando casos por región:', err);
        setCasosPorRegion([]);
      }

      // Cargar tendencia mensual
      try {
        const tendenciaRes = await dashboardService.getTendenciaCasos();
        setTendenciaCasos(tendenciaRes.data || []);
      } catch (err) {
        console.error('Error cargando tendencia:', err);
        setTendenciaCasos([]);
      }

      // Cargar alertas recientes
      try {
        const alertasRes = await dashboardService.getAlertasRecientes();
        setAlertasRecientes(alertasRes.data || []);
      } catch (err) {
        console.error('Error cargando alertas:', err);
        setAlertasRecientes([]);
      }

      // Cargar predicciones recientes
      try {
        const prediccionesRes = await modeloService.obtenerPredicciones();
        console.log('Predicciones cargadas:', prediccionesRes.data);
        setPredicciones(prediccionesRes.data || []);
      } catch (err) {
        console.error('Error cargando predicciones:', err);
        setPredicciones([]);
      }

      setUltimaActualizacion(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error general cargando datos:', error);
      setError('Error al cargar los datos del dashboard');
      setLoading(false);
    }
  };

  // Preparar datos para gráfica de predicciones
  const prepararDatosPredicciones = () => {
    if (predicciones.length === 0) return null;

    // Agrupar por fecha y sumar casos predichos
    const prediccionesPorFecha = predicciones.reduce((acc, pred) => {
      const fecha = new Date(pred.fecha_prediccion).toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: 'short' 
      });
      if (!acc[fecha]) {
        acc[fecha] = 0;
      }
      acc[fecha] += pred.casos_predichos || 0;
      return acc;
    }, {});

    // Ordenar por fecha
    const fechasOrdenadas = Object.keys(prediccionesPorFecha).sort((a, b) => {
      return new Date(a) - new Date(b);
    });

    // Tomar solo los próximos 30 días
    const fechas = fechasOrdenadas.slice(0, 30);
    const casos = fechas.map(f => prediccionesPorFecha[f]);

    return { fechas, casos };
  };

  const datosPredicciones = prepararDatosPredicciones();

  // Configuración de gráficas
  const datosGraficaTendencia = {
    labels: tendenciaCasos.map(d => {
      const fecha = new Date(d.mes + '-01');
      return fecha.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Casos Confirmados',
        data: tendenciaCasos.map(d => d.total_casos),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7
      }
    ]
  };

  const opcionesGraficaTendencia = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value.toLocaleString();
          }
        }
      }
    }
  };

  const datosGraficaPredicciones = datosPredicciones ? {
    labels: datosPredicciones.fechas,
    datasets: [
      {
        label: 'Casos Predichos',
        data: datosPredicciones.casos,
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderDash: [5, 5]
      }
    ]
  } : null;

  const opcionesGraficaPredicciones = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return 'Predicción: ' + context.parsed.y.toLocaleString() + ' casos';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value.toLocaleString();
          }
        }
      }
    }
  };

  const datosGraficaRegiones = {
    labels: casosPorRegion.map(r => r.region),
    datasets: [
      {
        label: 'Casos por Región',
        data: casosPorRegion.map(r => r.total_casos),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)'
        ],
        borderWidth: 2
      }
    ]
  };

  const opcionesGraficaRegiones = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.label + ': ' + context.parsed.toLocaleString() + ' casos';
          }
        }
      }
    }
  };

  // Calcular tasa de letalidad
  const tasaLetalidad = estadisticas.totalCasos > 0 
    ? ((estadisticas.totalDefunciones / estadisticas.totalCasos) * 100).toFixed(2)
    : 0;

  // Calcular tendencia (comparación últimos 2 meses)
  const calcularTendencia = () => {
    if (tendenciaCasos.length < 2) return 0;
    const ultimoMes = tendenciaCasos[tendenciaCasos.length - 1]?.total_casos || 0;
    const mesAnterior = tendenciaCasos[tendenciaCasos.length - 2]?.total_casos || 0;
    if (mesAnterior === 0) return 0;
    return (((ultimoMes - mesAnterior) / mesAnterior) * 100).toFixed(1);
  };

  const tendencia = calcularTendencia();

  // Calcular total de casos predichos para los próximos 30 días
  const totalCasosPredichos = datosPredicciones 
    ? datosPredicciones.casos.reduce((sum, val) => sum + val, 0)
    : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary text-lg font-medium">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-text-main text-4xl font-black leading-tight">
              Dashboard General
            </h1>
            <p className="text-text-secondary text-base mt-1">
              Monitoreo en tiempo real del Sistema de Predicción
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-text-secondary">Última actualización</p>
              <p className="text-sm font-medium text-text-main">
                {ultimaActualizacion.toLocaleTimeString('es-MX')}
              </p>
            </div>
            <button 
              onClick={cargarDatos}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-text-main rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-xl">refresh</span>
              Actualizar
            </button>
          </div>
        </div>

        {/* Mostrar error si existe */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-red-600 text-3xl">error</span>
              <div className="flex-1">
                <p className="text-red-800 font-medium">{error}</p>
                <button 
                  onClick={cargarDatos}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium underline">
                  Intentar de nuevo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tarjetas de estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total de Casos */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <span className="material-symbols-outlined text-3xl">coronavirus</span>
              </div>
              {tendencia !== 0 && (
                <div className={`flex items-center gap-1 text-sm font-semibold ${
                  tendencia > 0 ? 'text-red-200' : 'text-green-200'
                }`}>
                  <span className="material-symbols-outlined text-lg">
                    {tendencia > 0 ? 'trending_up' : 'trending_down'}
                  </span>
                  {Math.abs(tendencia)}%
                </div>
              )}
            </div>
            <p className="text-sm opacity-90 mb-1">Casos Confirmados (30 días)</p>
            <h3 className="text-4xl font-bold mb-1">{estadisticas.totalCasos?.toLocaleString() || 0}</h3>
            <p className="text-xs opacity-75">Últimos 30 días</p>
          </div>

          {/* Defunciones */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl shadow-lg text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <span className="material-symbols-outlined text-3xl">emergency</span>
              </div>
            </div>
            <p className="text-sm opacity-90 mb-1">Defunciones</p>
            <h3 className="text-4xl font-bold mb-1">{estadisticas.totalDefunciones?.toLocaleString() || 0}</h3>
            <p className="text-xs opacity-75">Letalidad: {tasaLetalidad}%</p>
          </div>

          {/* Alertas Activas */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <span className="material-symbols-outlined text-3xl">warning</span>
              </div>
              {estadisticas.alertasActivas > 0 && (
                <div className="animate-pulse">
                  <span className="material-symbols-outlined text-2xl">notifications_active</span>
                </div>
              )}
            </div>
            <p className="text-sm opacity-90 mb-1">Alertas Activas</p>
            <h3 className="text-4xl font-bold mb-1">{estadisticas.alertasActivas || 0}</h3>
            <p className="text-xs opacity-75">
              {estadisticas.alertasActivas > 0 ? 'Requieren atención' : 'Todo bajo control'}
            </p>
          </div>

          {/* Predicción 30 días */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <span className="material-symbols-outlined text-3xl">monitoring</span>
              </div>
            </div>
            <p className="text-sm opacity-90 mb-1">Predicción (30 días)</p>
            <h3 className="text-4xl font-bold mb-1">{totalCasosPredichos.toLocaleString()}</h3>
            <p className="text-xs opacity-75">Casos estimados</p>
          </div>
        </div>

        {/* Gráficas principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tendencia Temporal */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">show_chart</span>
                Tendencia Histórica (6 meses)
              </h2>
            </div>
            <div style={{ height: '300px' }}>
              {tendenciaCasos.length > 0 ? (
                <Line data={datosGraficaTendencia} options={opcionesGraficaTendencia} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-300">analytics</span>
                    <p className="text-text-secondary mt-2">No hay datos de tendencia</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Predicciones */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600">query_stats</span>
                Predicción de Casos (30 días)
              </h2>
            </div>
            <div style={{ height: '300px' }}>
              {datosGraficaPredicciones ? (
                <Line data={datosGraficaPredicciones} options={opcionesGraficaPredicciones} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-300">pending</span>
                    <p className="text-text-secondary mt-2">No hay predicciones disponibles</p>
                    <p className="text-xs text-text-secondary mt-1">
                      Ve a "Modelos Predictivos" para generar predicciones
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Distribución por Región */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">pie_chart</span>
              Distribución por Región (Top 5)
            </h2>
          </div>
          <div style={{ height: '350px' }}>
            {casosPorRegion.length > 0 ? (
              <Doughnut data={datosGraficaRegiones} options={opcionesGraficaRegiones} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl text-gray-300">map</span>
                  <p className="text-text-secondary mt-2">No hay datos por región</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alertas Recientes */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
            <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-600">notifications_active</span>
              Alertas Sanitarias Recientes
            </h2>
          </div>
          {alertasRecientes.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {alertasRecientes.map((alerta, idx) => (
                <div key={idx} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      alerta.nivel === 'alta' ? 'bg-red-100' :
                      alerta.nivel === 'media' ? 'bg-orange-100' :
                      'bg-yellow-100'
                    }`}>
                      <span className={`material-symbols-outlined text-2xl ${
                        alerta.nivel === 'alta' ? 'text-red-600' :
                        alerta.nivel === 'media' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`}>
                        warning
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          alerta.nivel === 'alta' ? 'bg-red-100 text-red-800' :
                          alerta.nivel === 'media' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {alerta.nivel?.toUpperCase()}
                        </span>
                        <span className="text-sm text-text-secondary">
                          {new Date(alerta.fecha_alerta).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-text-main mb-1">{alerta.mensaje}</p>
                      <div className="flex items-center gap-4 text-sm text-text-secondary">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          {alerta.region}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">medical_services</span>
                          {alerta.enfermedad}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-7xl text-green-300 mb-3">check_circle</span>
              <p className="text-lg font-medium text-text-main">No hay alertas activas</p>
              <p className="text-sm text-text-secondary mt-1">El sistema está funcionando con normalidad</p>
            </div>
          )}
        </div>

        {/* Footer con información adicional */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-blue-500">update</span>
              <div>
                <p className="text-xs text-text-secondary">Última actualización</p>
                <p className="text-sm font-semibold text-text-main">
                  {ultimaActualizacion.toLocaleString('es-MX')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-green-500">cloud_done</span>
              <div>
                <p className="text-xs text-text-secondary">Estado del sistema</p>
                <p className="text-sm font-semibold text-green-600">Operativo</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-purple-500">predictions</span>
              <div>
                <p className="text-xs text-text-secondary">Predicciones generadas</p>
                <p className="text-sm font-semibold text-text-main">
                  {predicciones.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;