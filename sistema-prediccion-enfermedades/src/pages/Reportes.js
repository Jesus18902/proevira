import React, { useState, useEffect } from 'react';
import { reportesService, datosService } from '../services/api';
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

const Reportes = () => {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tipoReporte, setTipoReporte] = useState('general');
  const [enfermedades, setEnfermedades] = useState([]);
  const [regiones, setRegiones] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resumenRes, enfermedadesRes, regionesRes] = await Promise.all([
        reportesService.getResumen(),
        datosService.getEnfermedades(),
        datosService.getRegiones()
      ]);
      
      setResumen(resumenRes.data);
      setEnfermedades(enfermedadesRes.data);
      setRegiones(regionesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error cargando reportes:', error);
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    alert('Funcionalidad de exportación PDF en desarrollo');
  };

  const exportarExcel = () => {
    alert('Funcionalidad de exportación Excel en desarrollo');
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Generando reportes...</p>
        </div>
      </div>
    );
  }

  if (!resumen) {
    return (
      <div className="flex-1 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error al cargar los datos del reporte</p>
        </div>
      </div>
    );
  }

  // Datos para gráfica de tendencia mensual
  const datosLineaMensual = {
    labels: resumen.tendenciaMensual?.map(t => t.mes) || [],
    datasets: [{
      label: 'Casos Mensuales',
      data: resumen.tendenciaMensual?.map(t => t.casos) || [],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  // Datos para gráfica de casos por región
  const datosBarrasRegion = {
    labels: resumen.casosPorRegion?.map(r => r.nombre) || [],
    datasets: [{
      label: 'Casos por Región',
      data: resumen.casosPorRegion?.map(r => r.casos) || [],
      backgroundColor: [
        'rgba(59, 130, 246, 0.6)',
        'rgba(16, 185, 129, 0.6)',
        'rgba(245, 158, 11, 0.6)',
        'rgba(239, 68, 68, 0.6)',
        'rgba(139, 92, 246, 0.6)',
        'rgba(236, 72, 153, 0.6)'
      ],
      borderWidth: 1
    }]
  };

  // Datos para gráfica de dona
  const topRegiones = resumen.casosPorRegion?.slice(0, 5) || [];
  const datosDonaRegiones = {
    labels: topRegiones.map(r => r.nombre),
    datasets: [{
      data: topRegiones.map(r => r.casos),
      backgroundColor: [
        '#3b82f6',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6'
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-text-main text-4xl font-black leading-tight">
              Reportes y Estadísticas
            </h1>
            <p className="text-text-secondary text-base">
              Análisis completo y exportación de datos epidemiológicos
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportarPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">
              <span className="material-symbols-outlined">picture_as_pdf</span>
              Exportar PDF
            </button>
            <button
              onClick={exportarExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
              <span className="material-symbols-outlined">table_view</span>
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Selector de tipo de reporte */}
        <div className="bg-white p-4 rounded-xl border border-[#dbe2e6] shadow-sm">
          <div className="flex gap-3">
            <button
              onClick={() => setTipoReporte('general')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                tipoReporte === 'general'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-main hover:bg-gray-200'
              }`}>
              Reporte General
            </button>
            <button
              onClick={() => setTipoReporte('comparativo')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                tipoReporte === 'comparativo'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-main hover:bg-gray-200'
              }`}>
              Análisis Comparativo
            </button>
            <button
              onClick={() => setTipoReporte('predictivo')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                tipoReporte === 'predictivo'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-main hover:bg-gray-200'
              }`}>
              Proyecciones
            </button>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-4xl opacity-80">coronavirus</span>
              <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">Total</span>
            </div>
            <p className="text-sm opacity-90 mb-1">Casos Confirmados</p>
            <h3 className="text-4xl font-bold">{resumen.totalCasos?.toLocaleString()}</h3>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-4xl opacity-80">emergency</span>
              <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">Total</span>
            </div>
            <p className="text-sm opacity-90 mb-1">Defunciones</p>
            <h3 className="text-4xl font-bold">{resumen.totalDefunciones?.toLocaleString()}</h3>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-4xl opacity-80">location_on</span>
              <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">Activas</span>
            </div>
            <p className="text-sm opacity-90 mb-1">Regiones Monitoreadas</p>
            <h3 className="text-4xl font-bold">{regiones.length}</h3>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-4xl opacity-80">vaccines</span>
              <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">Tracking</span>
            </div>
            <p className="text-sm opacity-90 mb-1">Enfermedades</p>
            <h3 className="text-4xl font-bold">{enfermedades.length}</h3>
          </div>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tendencia Mensual */}
          <div className="bg-white p-6 rounded-xl border border-[#dbe2e6] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-main">Tendencia Mensual</h3>
              <span className="material-symbols-outlined text-primary">trending_up</span>
            </div>
            <div style={{ height: '300px' }}>
              <Line 
                data={datosLineaMensual} 
                options={{ 
                  maintainAspectRatio: false,
                  responsive: true,
                  plugins: {
                    legend: { display: true }
                  }
                }} 
              />
            </div>
          </div>

          {/* Casos por Región */}
          <div className="bg-white p-6 rounded-xl border border-[#dbe2e6] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-main">Casos por Región</h3>
              <span className="material-symbols-outlined text-primary">bar_chart</span>
            </div>
            <div style={{ height: '300px' }}>
              <Bar 
                data={datosBarrasRegion} 
                options={{ 
                  maintainAspectRatio: false,
                  responsive: true,
                  plugins: {
                    legend: { display: false }
                  }
                }} 
              />
            </div>
          </div>
        </div>

        {/* Distribución por Región (Dona) y Top Regiones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfica de Dona */}
          <div className="bg-white p-6 rounded-xl border border-[#dbe2e6] shadow-sm">
            <h3 className="text-lg font-bold text-text-main mb-4">Distribución por Región (Top 5)</h3>
            <div style={{ height: '300px' }} className="flex items-center justify-center">
              <Doughnut 
                data={datosDonaRegiones}
                options={{
                  maintainAspectRatio: false,
                  responsive: true,
                  plugins: {
                    legend: { position: 'bottom' }
                  }
                }}
              />
            </div>
          </div>

          {/* Top Regiones Lista */}
          <div className="bg-white p-6 rounded-xl border border-[#dbe2e6] shadow-sm">
            <h3 className="text-lg font-bold text-text-main mb-4">Ranking de Regiones</h3>
            <div className="space-y-3">
              {resumen.casosPorRegion?.slice(0, 10).map((region, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      idx === 0 ? 'bg-yellow-500' :
                      idx === 1 ? 'bg-gray-400' :
                      idx === 2 ? 'bg-orange-600' :
                      'bg-blue-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="font-semibold text-text-main">{region.nombre}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">{region.casos?.toLocaleString()}</span>
                    <span className="text-sm text-text-secondary">casos</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla de Enfermedades */}
        <div className="bg-white rounded-xl border border-[#dbe2e6] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#dbe2e6] flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-main">Enfermedades Monitoreadas</h3>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
              {enfermedades.length} Activas
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                    Enfermedad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                    Nivel de Riesgo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {enfermedades.map((enfermedad) => (
                  <tr key={enfermedad.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-500">coronavirus</span>
                        <span className="font-semibold text-text-main">{enfermedad.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary max-w-md">
                      {enfermedad.descripcion || 'Sin descripción'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        enfermedad.nivel_riesgo === 'Alto' ? 'bg-red-100 text-red-800' :
                        enfermedad.nivel_riesgo === 'Medio' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {enfermedad.nivel_riesgo || 'Bajo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        Activa
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen de Generación */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-4xl text-blue-600">description</span>
            <div>
              <h4 className="font-bold text-text-main text-lg">Reporte Generado</h4>
              <p className="text-text-secondary text-sm">
                Fecha: {new Date().toLocaleDateString('es-MX', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reportes;