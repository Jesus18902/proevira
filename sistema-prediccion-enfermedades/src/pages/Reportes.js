// Reportes.js - Reporte Epidemiológico Completo
import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  FileText, Download, TrendingUp, AlertTriangle, 
  Activity, MapPin, Calendar, RefreshCw
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const API_URL = 'http://localhost:5001/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

const Reportes = () => {
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vistaActiva, setVistaActiva] = useState('general');
  const reporteRef = useRef(null);

  useEffect(() => {
    cargarReporte();
  }, []);

  const cargarReporte = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/reportes/epidemiologico`);
      const data = await response.json();
      
      if (data.success) {
        setReporte(data);
      } else {
        setError(data.error || 'Error al cargar el reporte');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Exportar CSV
  const exportarCSV = () => {
    if (!reporte) return;
    
    let csv = 'Reporte Epidemiologico de Dengue\n\n';
    
    csv += 'ESTADISTICAS GENERALES\n';
    csv += `Total de Casos,${reporte.estadisticas.total_casos}\n`;
    csv += `Total de Registros,${reporte.estadisticas.total_registros}\n`;
    csv += `Promedio Semanal,${reporte.estadisticas.promedio_casos?.toFixed(2)}\n`;
    csv += `Maximo Semanal,${reporte.estadisticas.max_casos}\n`;
    csv += `Estados Monitoreados,${reporte.estadisticas.total_estados}\n\n`;
    
    csv += 'TOP 10 ESTADOS CON MAS CASOS\n';
    csv += 'Estado,Total Casos,Promedio Semanal,Maximo Semanal\n';
    reporte.top_estados.forEach(e => {
      csv += `${e.estado},${e.total_casos},${e.promedio_semanal?.toFixed(2)},${e.max_semanal}\n`;
    });
    csv += '\n';
    
    csv += 'EVOLUCION ANUAL\n';
    csv += 'Anio,Total Casos,Promedio Semanal\n';
    reporte.evolucion_anual.forEach(a => {
      csv += `${a.anio},${a.total_casos},${a.promedio_semanal?.toFixed(2)}\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_epidemiologico_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Exportar PDF
  const exportarPDF = async () => {
    if (!reporteRef.current) return;
    
    try {
      const canvas = await html2canvas(reporteRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.setFontSize(18);
      pdf.setTextColor(59, 130, 246);
      pdf.text('Reporte Epidemiologico de Dengue', 14, 15);
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Generado: ${new Date().toLocaleString()}`, 14, 22);
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 35) / imgHeight);
      
      pdf.addImage(imgData, 'PNG', 10, 28, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`reporte_epidemiologico_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Error al generar el PDF');
    }
  };

  // Preparar datos para comparativa anual
  const prepararComparativaAnual = () => {
    if (!reporte?.comparativa_anual) return [];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const anios = [...new Set(reporte.comparativa_anual.map(d => d.anio))];
    
    return meses.map((mes, idx) => {
      const punto = { mes };
      anios.forEach(anio => {
        const dato = reporte.comparativa_anual.find(d => d.anio === anio && d.mes === idx + 1);
        punto[`año_${anio}`] = dato?.casos || 0;
      });
      return punto;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Generando reporte epidemiológico...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 text-lg font-medium">{error}</p>
          <button onClick={cargarReporte} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const datosComparativa = prepararComparativaAnual();
  const aniosDisponibles = [...new Set(reporte?.comparativa_anual?.map(d => d.anio) || [])];

  return (
    <div className="flex-1 p-6 overflow-auto bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Reporte Epidemiológico
            </h1>
            <p className="text-gray-500 mt-1">
              Análisis completo de datos históricos de dengue
            </p>
          </div>
          
          <div className="flex gap-3">
            <button onClick={cargarReporte} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Actualizar
            </button>
            <button onClick={exportarCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={exportarPDF} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-6 flex gap-2 flex-wrap">
          {[
            { id: 'general', label: 'Resumen General', icon: Activity },
            { id: 'estados', label: 'Por Estados', icon: MapPin },
            { id: 'temporal', label: 'Análisis Temporal', icon: Calendar },
            { id: 'alertas', label: 'Alertas', icon: AlertTriangle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setVistaActiva(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                vistaActiva === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div ref={reporteRef}>
          {/* VISTA: Resumen General */}
          {vistaActiva === 'general' && (
            <div className="space-y-6">
              {/* Tarjetas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
                  <p className="text-sm text-gray-500">Total Casos</p>
                  <p className="text-2xl font-bold text-gray-800">{reporte.estadisticas.total_casos?.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
                  <p className="text-sm text-gray-500">Promedio Semanal</p>
                  <p className="text-2xl font-bold text-gray-800">{reporte.estadisticas.promedio_casos?.toFixed(1)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-orange-500">
                  <p className="text-sm text-gray-500">Máximo Semanal</p>
                  <p className="text-2xl font-bold text-gray-800">{reporte.estadisticas.max_casos?.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500">
                  <p className="text-sm text-gray-500">Estados Monitoreados</p>
                  <p className="text-2xl font-bold text-gray-800">{reporte.estadisticas.total_estados}</p>
                </div>
              </div>

              {/* Info período */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <p className="text-blue-100 text-sm">Período de Datos</p>
                    <p className="text-xl font-bold">{reporte.estadisticas.fecha_inicio_datos} → {reporte.estadisticas.fecha_fin_datos}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-100 text-sm">Total Registros</p>
                    <p className="text-xl font-bold">{reporte.estadisticas.total_registros?.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-100 text-sm">Años de Datos</p>
                    <p className="text-xl font-bold">{reporte.estadisticas.total_anios}</p>
                  </div>
                </div>
              </div>

              {/* Gráficas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" /> Evolución Anual
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reporte.evolucion_anual}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="anio" />
                      <YAxis />
                      <Tooltip formatter={(value) => [value.toLocaleString(), 'Casos']} />
                      <Bar dataKey="total_casos" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Casos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-600" /> Top 10 Estados
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={reporte.top_estados} dataKey="total_casos" nameKey="estado" cx="50%" cy="50%" outerRadius={100}
                        label={({ estado, percent }) => `${estado.substring(0, 6)}.. ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {reporte.top_estados.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value.toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* VISTA: Por Estados */}
          {vistaActiva === 'estados' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 10 Estados con Mayor Incidencia</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={reporte.top_estados} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="estado" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                    <Bar dataKey="total_casos" fill="#3b82f6" name="Total Casos" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Detalle por Estado</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Casos</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Promedio</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Máximo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reporte.top_estados.map((estado, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{estado.estado}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">{estado.total_casos?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{estado.promedio_semanal?.toFixed(1)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{estado.max_semanal?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VISTA: Análisis Temporal */}
          {vistaActiva === 'temporal' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Tendencia Mensual (Últimos 24 meses)</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={reporte.tendencia_mensual}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                    <Area type="monotone" dataKey="total_casos" stroke="#3b82f6" fill="#93c5fd" name="Casos" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Comparativa Anual por Mes</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={datosComparativa}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                    <Legend />
                    {aniosDisponibles.map((anio, idx) => (
                      <Line key={anio} type="monotone" dataKey={`año_${anio}`} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} name={`Año ${anio}`} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Patrón por Semana Epidemiológica</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={reporte.por_semana_epidemiologica}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semana_epidemiologica" />
                    <YAxis />
                    <Tooltip labelFormatter={(label) => `Semana ${label}`} formatter={(value) => [value.toFixed(1), 'Promedio']} />
                    <Area type="monotone" dataKey="promedio_casos" stroke="#10b981" fill="#6ee7b7" name="Promedio" />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-sm text-gray-500 mt-2 text-center">Las semanas 25-40 suelen tener mayor incidencia (temporada de lluvias)</p>
              </div>
            </div>
          )}

          {/* VISTA: Alertas */}
          {vistaActiva === 'alertas' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-5 text-white">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8" />
                  <div>
                    <h3 className="text-xl font-bold">Alertas de Alto Riesgo</h3>
                    <p className="text-red-100">Semanas con casos superiores al doble del promedio histórico</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-red-700 uppercase">Semana Epi.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-red-700 uppercase">Casos</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-red-700 uppercase">Nivel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reporte.alertas_alto_riesgo?.map((alerta, idx) => (
                        <tr key={idx} className="hover:bg-red-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{alerta.estado}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{alerta.fecha_inicio}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-center">{alerta.semana_epidemiologica}</td>
                          <td className="px-4 py-3 text-sm text-red-600 text-right font-bold">{alerta.casos_confirmados?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              alerta.casos_confirmados > 500 ? 'bg-red-100 text-red-800' :
                              alerta.casos_confirmados > 200 ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {alerta.casos_confirmados > 500 ? 'Crítico' : alerta.casos_confirmados > 200 ? 'Alto' : 'Elevado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(!reporte.alertas_alto_riesgo || reporte.alertas_alto_riesgo.length === 0) && (
                  <div className="p-8 text-center text-gray-500">No hay alertas de alto riesgo registradas</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reportes;
