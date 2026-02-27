// DashboardPredicciones.js
// Dashboard para visualizar predicciones guardadas con exportación CSV/PDF

import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import {
  Calendar, Download, FileText, TrendingUp, AlertTriangle,
  Activity, MapPin, RefreshCw, Trash2, Eye, Filter
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const API_URL = 'http://localhost:5001/api';

// Colores para niveles de riesgo (verde-bajo, amarillo-moderado, naranja-alto, rojo-crítico)
const COLORS = {
  'bajo': '#22c55e',
  'moderado': '#eab308',
  'medio': '#eab308',
  'alto': '#f97316',
  'crítico': '#ef4444',
  'critico': '#ef4444'
};

// Función para obtener el color por nivel de riesgo
const getColorByNivel = (nivel) => {
  if (!nivel) return '#8884d8';
  const nivelLower = nivel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return COLORS[nivelLower] || COLORS[nivel.toLowerCase()] || '#8884d8';
};

const DashboardPredicciones = () => {
  const [predicciones, setPredicciones] = useState([]);
  const [prediccionSeleccionada, setPrediccionSeleccionada] = useState(null);
  const [datosPrediccion, setDatosPrediccion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [error, setError] = useState(null);
  const dashboardRef = useRef(null);

  // Cargar lista de predicciones al montar
  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/predicciones/historial`);
      const data = await response.json();

      if (data.success) {
        setPredicciones(data.predicciones);
        // Seleccionar la primera automáticamente si existe
        if (data.predicciones.length > 0 && !prediccionSeleccionada) {
          cargarDetallePrediccion(data.predicciones[0].id);
        }
      } else {
        setError(data.error || 'Error al cargar historial');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cargarDetallePrediccion = async (id) => {
    setLoadingDetalle(true);
    try {
      const response = await fetch(`${API_URL}/predicciones/${id}`);
      const data = await response.json();

      if (data.success) {
        setPrediccionSeleccionada(data.prediccion);
        setDatosPrediccion(data.prediccion.datos_prediccion);
      }
    } catch (err) {
      console.error('Error cargando detalle:', err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const eliminarPrediccion = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta predicción?')) return;

    try {
      const response = await fetch(`${API_URL}/predicciones/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        cargarHistorial();
        if (prediccionSeleccionada?.id === id) {
          setPrediccionSeleccionada(null);
          setDatosPrediccion(null);
        }
      }
    } catch (err) {
      console.error('Error eliminando:', err);
    }
  };

  // Exportar a CSV
  const exportarCSV = () => {
    if (!datosPrediccion || datosPrediccion.length === 0) return;

    const headers = ['Semana', 'Fecha', 'Casos Estimados', 'Nivel Riesgo', 'Probabilidad', 'Casos Reales', 'Error %'];
    const validacion = prediccionSeleccionada?.datos_validacion || [];

    const rows = datosPrediccion.map((pred, idx) => {
      const val = validacion[idx] || {};
      return [
        pred.semana || idx + 1,
        pred.fecha || '',
        pred.casos_estimados || 0,
        pred.nivel_riesgo || '',
        pred.probabilidad || 0,
        val.casos_reales || '',
        val.error_porcentaje ? val.error_porcentaje.toFixed(2) : ''
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `prediccion_${prediccionSeleccionada.estado}_${prediccionSeleccionada.fecha_inicio}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Exportar a PDF
  const exportarPDF = async () => {
    if (!dashboardRef.current || !prediccionSeleccionada) return;

    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      // Título
      pdf.setFontSize(16);
      pdf.text(`Predicción de Dengue - ${prediccionSeleccionada.estado}`, 14, 15);
      pdf.setFontSize(10);
      pdf.text(`Generado: ${new Date(prediccionSeleccionada.fecha_generacion).toLocaleString()}`, 14, 22);

      pdf.addImage(imgData, 'PNG', imgX, 30, imgWidth * ratio * 0.9, imgHeight * ratio * 0.9);

      // Tabla de datos en segunda página
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.text('Datos de Predicción', 14, 15);

      let yPos = 25;
      pdf.setFontSize(9);
      pdf.text(['Semana', 'Fecha', 'Casos Est.', 'Riesgo', 'Prob.', 'Reales', 'Error%'].join('    '), 14, yPos);
      yPos += 7;

      const validacion = prediccionSeleccionada?.datos_validacion || [];
      datosPrediccion.forEach((pred, idx) => {
        const val = validacion[idx] || {};
        const row = [
          String(pred.semana || idx + 1).padEnd(8),
          (pred.fecha || '').substring(0, 10).padEnd(12),
          String(pred.casos_estimados || 0).padEnd(10),
          (pred.nivel_riesgo || '').padEnd(10),
          String(pred.probabilidad || 0).padEnd(8),
          String(val.casos_reales || '-').padEnd(8),
          val.error_porcentaje ? val.error_porcentaje.toFixed(1) + '%' : '-'
        ].join('  ');
        pdf.text(row, 14, yPos);
        yPos += 5;
        if (yPos > 190) {
          pdf.addPage();
          yPos = 20;
        }
      });

      pdf.save(`prediccion_${prediccionSeleccionada.estado}_${prediccionSeleccionada.fecha_inicio}.pdf`);
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Error al generar PDF. Intenta de nuevo.');
    }
  };

  // Calcular métricas del dashboard
  const calcularMetricas = () => {
    if (!datosPrediccion || datosPrediccion.length === 0) {
      return { totalCasos: 0, promedioRiesgo: 0, maxCasos: 0, alertas: 0 };
    }

    const totalCasos = datosPrediccion.reduce((sum, p) => sum + (p.casos_estimados || 0), 0);
    const promedioProb = datosPrediccion.reduce((sum, p) => sum + (p.probabilidad || 0), 0) / datosPrediccion.length;
    const maxCasos = Math.max(...datosPrediccion.map(p => p.casos_estimados || 0));
    const alertas = datosPrediccion.filter(p =>
      p.nivel_riesgo === 'Alto' || p.nivel_riesgo === 'Crítico' || p.nivel_riesgo === 'Critico'
    ).length;

    return { totalCasos, promedioProb, maxCasos, alertas };
  };

  // Datos para gráfica de distribución de riesgo
  const datosDistribucion = () => {
    if (!datosPrediccion) return [];

    const conteo = { Bajo: 0, Moderado: 0, Alto: 0, Crítico: 0 };
    datosPrediccion.forEach(p => {
      // Normalizar el nivel de riesgo
      const nivel = p.nivel_riesgo;
      if (nivel === 'Bajo') conteo.Bajo++;
      else if (nivel === 'Moderado' || nivel === 'Medio') conteo.Moderado++;
      else if (nivel === 'Alto') conteo.Alto++;
      else if (nivel === 'Crítico' || nivel === 'Critico') conteo.Crítico++;
    });

    return Object.entries(conteo)
      .filter(([_, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  };

  const metricas = calcularMetricas();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Cargando predicciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-7 h-7 text-blue-600" />
            Dashboard de Predicciones
          </h1>
          <p className="text-gray-600 mt-1">
            Visualiza y exporta las predicciones guardadas
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Selector y Acciones */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* ComboBox de predicciones */}
            <div className="flex-1 min-w-[300px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Seleccionar Predicción
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={prediccionSeleccionada?.id || ''}
                onChange={(e) => cargarDetallePrediccion(Number(e.target.value))}
              >
                <option value="">-- Selecciona una predicción --</option>
                {predicciones.map(p => (
                  <option key={p.id} value={p.id}>
                    {new Date(p.fecha_generacion).toLocaleString()} - {p.estado} ({p.numero_semanas} sem)
                  </option>
                ))}
              </select>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <button
                onClick={cargarHistorial}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>

              <button
                onClick={exportarCSV}
                disabled={!datosPrediccion}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>

              <button
                onClick={exportarPDF}
                disabled={!datosPrediccion}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>

              {prediccionSeleccionada && (
                <button
                  onClick={() => eliminarPrediccion(prediccionSeleccionada.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contenido del Dashboard */}
        {prediccionSeleccionada && datosPrediccion ? (
          <div ref={dashboardRef}>
            {/* Info de la predicción */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 mb-6 text-white">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {prediccionSeleccionada.estado}
                  </h2>
                  <p className="text-blue-100 text-sm">
                    {prediccionSeleccionada.nombre_lote}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-100">Fecha inicio</p>
                  <p className="font-semibold">{prediccionSeleccionada.fecha_inicio}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-100">Semanas</p>
                  <p className="font-semibold">{prediccionSeleccionada.numero_semanas}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-100">Generado</p>
                  <p className="font-semibold">
                    {new Date(prediccionSeleccionada.fecha_generacion).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
                <p className="text-sm text-gray-500">Total Casos Estimados</p>
                <p className="text-2xl font-bold text-gray-800">{metricas.totalCasos.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                <p className="text-sm text-gray-500">Probabilidad Promedio</p>
                <p className="text-2xl font-bold text-gray-800">{metricas.promedioProb.toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
                <p className="text-sm text-gray-500">Máximo Casos/Semana</p>
                <p className="text-2xl font-bold text-gray-800">{metricas.maxCasos.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
                <p className="text-sm text-gray-500">Semanas Alto/Crítico</p>
                <p className="text-2xl font-bold text-gray-800">{metricas.alertas}</p>
              </div>
            </div>

            {/* Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Gráfica de Casos */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Evolución de Casos Estimados
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={datosPrediccion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semana" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [value, name === 'casos_estimados' ? 'Casos Est.' : name]}
                      labelFormatter={(label) => `Semana ${label}`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="casos_estimados"
                      stroke="#3b82f6"
                      fill="#93c5fd"
                      name="Casos Estimados"
                    />
                    {prediccionSeleccionada.datos_validacion?.length > 0 && (
                      <Line
                        type="monotone"
                        dataKey="casos_reales"
                        data={prediccionSeleccionada.datos_validacion}
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ fill: '#ef4444' }}
                        name="Casos Reales"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfica de Distribución de Riesgo */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Distribución de Niveles de Riesgo
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={datosDistribucion()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {datosDistribucion().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getColorByNivel(entry.name)}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica de Probabilidad */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Probabilidad de Riesgo por Semana
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={datosPrediccion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semana" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Probabilidad']} />
                  <Bar
                    dataKey="probabilidad"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla de Datos */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  Detalle de Predicciones
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semana</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Casos Est.</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Nivel Riesgo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Probabilidad</th>
                      {prediccionSeleccionada.datos_validacion?.length > 0 && (
                        <>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Casos Reales</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Error %</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {datosPrediccion.map((pred, idx) => {
                      const val = prediccionSeleccionada.datos_validacion?.[idx] || {};
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{pred.semana}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{pred.fecha}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {pred.casos_estimados?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pred.nivel_riesgo === 'Bajo' ? 'bg-green-100 text-green-800' :
                              pred.nivel_riesgo === 'Moderado' || pred.nivel_riesgo === 'Medio' ? 'bg-yellow-100 text-yellow-800' :
                              pred.nivel_riesgo === 'Alto' ? 'bg-orange-100 text-orange-800' :
                              pred.nivel_riesgo === 'Crítico' || pred.nivel_riesgo === 'Critico' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {pred.nivel_riesgo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {pred.probabilidad?.toFixed(1)}%
                          </td>
                          {prediccionSeleccionada.datos_validacion?.length > 0 && (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                {val.casos_reales?.toLocaleString() || '-'}
                              </td>
                              <td className={`px-4 py-3 text-sm text-right font-medium ${
                                val.error_porcentaje > 50 ? 'text-red-600' :
                                val.error_porcentaje > 20 ? 'text-orange-600' :
                                'text-green-600'
                              }`}>
                                {val.error_porcentaje ? `${val.error_porcentaje.toFixed(1)}%` : '-'}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              No hay predicción seleccionada
            </h3>
            <p className="text-gray-500">
              {predicciones.length === 0
                ? 'Aún no hay predicciones guardadas. Ve a "Predicción Avanzada" para crear una.'
                : 'Selecciona una predicción del menú desplegable para ver el dashboard.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPredicciones;
