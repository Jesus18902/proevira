import React, { useState, useEffect } from 'react';
import { analisisService, datosService } from '../services/api';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
  Title,
  Tooltip,
  Legend,
  Filler
);

const Analisis = () => {
  const [datos, setDatos] = useState([]);
  const [enfermedades, setEnfermedades] = useState([]);
  const [regiones, setRegiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    enfermedad: '',
    region: '',
    fechaInicio: '',
    fechaFin: ''
  });

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    try {
      const [enfermedadesRes, regionesRes] = await Promise.all([
        datosService.getEnfermedades(),
        datosService.getRegiones()
      ]);
      
      setEnfermedades(enfermedadesRes.data);
      setRegiones(regionesRes.data);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const aplicarFiltros = async () => {
    try {
      setLoading(true);
      const response = await analisisService.getDatosAnalisis(filtros);
      setDatos(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error aplicando filtros:', error);
      setLoading(false);
    }
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  // Preparar datos para gráfica de tendencia
  const datosGrafica = {
    labels: datos.map(d => new Date(d.fecha).toLocaleDateString('es-MX')),
    datasets: [{
      label: 'Casos Confirmados',
      data: datos.map(d => d.casos_confirmados),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  // Agrupar datos por región para gráfica de barras
  const casosPorRegion = datos.reduce((acc, d) => {
    if (!acc[d.region]) acc[d.region] = 0;
    acc[d.region] += d.casos_confirmados || 0;
    return acc;
  }, {});

  const datosBarras = {
    labels: Object.keys(casosPorRegion),
    datasets: [{
      label: 'Casos por Región',
      data: Object.values(casosPorRegion),
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: '#3b82f6',
      borderWidth: 1
    }]
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-text-main text-4xl font-black leading-tight">
            Análisis de Datos
          </h1>
          <p className="text-text-secondary text-base">
            Análisis detallado de datos epidemiológicos
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white p-6 rounded-xl border border-[#dbe2e6] shadow-sm">
          <h2 className="text-xl font-bold text-text-main mb-4">Filtros de Búsqueda</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Enfermedad
              </label>
              <select
                value={filtros.enfermedad}
                onChange={(e) => handleFiltroChange('enfermedad', e.target.value)}
                className="w-full px-4 py-2 border border-[#dbe2e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Todas</option>
                {enfermedades.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Región
              </label>
              <select
                value={filtros.region}
                onChange={(e) => handleFiltroChange('region', e.target.value)}
                className="w-full px-4 py-2 border border-[#dbe2e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Todas</option>
                {regiones.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => handleFiltroChange('fechaInicio', e.target.value)}
                className="w-full px-4 py-2 border border-[#dbe2e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => handleFiltroChange('fechaFin', e.target.value)}
                className="w-full px-4 py-2 border border-[#dbe2e6] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={aplicarFiltros}
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50">
              {loading ? 'Cargando...' : 'Aplicar Filtros'}
            </button>
            <button
              onClick={() => {
                setFiltros({ enfermedad: '', region: '', fechaInicio: '', fechaFin: '' });
                setDatos([]);
              }}
              className="px-6 py-2 bg-white border border-[#dbe2e6] text-text-main rounded-lg hover:bg-gray-50 font-semibold">
              Limpiar
            </button>
          </div>
        </div>

        {/* Resultados */}
        {datos.length > 0 && (
          <>
            {/* Estadísticas Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl border border-[#dbe2e6] shadow-sm">
                <p className="text-text-secondary text-sm mb-1">Total de Casos</p>
                <h3 className="text-3xl font-bold text-text-main">
                  {datos.reduce((sum, d) => sum + (d.casos_confirmados || 0), 0).toLocaleString()}
                </h3>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#dbe2e6] shadow-sm">
                <p className="text-text-secondary text-sm mb-1">Defunciones</p>
                <h3 className="text-3xl font-bold text-red-600">
                  {datos.reduce((sum, d) => sum + (d.defunciones || 0), 0).toLocaleString()}
                </h3>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#dbe2e6] shadow-sm">
                <p className="text-text-secondary text-sm mb-1">Registros</p>
                <h3 className="text-3xl font-bold text-text-main">
                  {datos.length.toLocaleString()}
                </h3>
              </div>
            </div>

            {/* Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tendencia Temporal */}
              <div className="bg-white p-6 rounded-xl border border-[#dbe2e6] shadow-sm">
                <h3 className="text-lg font-bold text-text-main mb-4">Tendencia Temporal</h3>
                <div style={{ height: '300px' }}>
                  <Line data={datosGrafica} options={{ maintainAspectRatio: false }} />
                </div>
              </div>

              {/* Casos por Región */}
              <div className="bg-white p-6 rounded-xl border border-[#dbe2e6] shadow-sm">
                <h3 className="text-lg font-bold text-text-main mb-4">Casos por Región</h3>
                <div style={{ height: '300px' }}>
                  <Bar data={datosBarras} options={{ maintainAspectRatio: false }} />
                </div>
              </div>
            </div>

            {/* Tabla de Datos */}
            <div className="bg-white rounded-xl border border-[#dbe2e6] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#dbe2e6]">
                <h3 className="text-lg font-bold text-text-main">Datos Detallados</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Enfermedad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Región
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Casos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Defunciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {datos.slice(0, 50).map((dato, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                          {new Date(dato.fecha).toLocaleDateString('es-MX')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                          {dato.enfermedad}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                          {dato.region}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main font-semibold">
                          {dato.casos_confirmados}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                          {dato.defunciones}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {datos.length > 50 && (
                <div className="p-4 bg-gray-50 border-t border-[#dbe2e6] text-center text-sm text-text-secondary">
                  Mostrando 50 de {datos.length} registros
                </div>
              )}
            </div>
          </>
        )}

        {datos.length === 0 && !loading && (
          <div className="bg-white p-12 rounded-xl border border-[#dbe2e6] shadow-sm text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">search</span>
            <h3 className="text-xl font-semibold text-text-main mb-2">No hay datos para mostrar</h3>
            <p className="text-text-secondary">Aplica filtros para ver los resultados del análisis</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analisis;