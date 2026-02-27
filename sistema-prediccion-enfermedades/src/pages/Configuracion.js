// Configuracion.js - Gestión de Datos y Sistema
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Upload, Database, Trash2, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, HardDrive, Activity, Server, MapPin,
  Calendar, TrendingUp, Download, Settings, Info, FileSpreadsheet,
  Filter, Save, Eye, Loader2
} from 'lucide-react';

const API_URL = 'http://localhost:5001/api';

const Configuracion = () => {
  const [activeTab, setActiveTab] = useState('cargar');
  const [estadisticas, setEstadisticas] = useState(null);
  const [estados, setEstados] = useState([]);
  const [sistemaInfo, setSistemaInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [resultadoCarga, setResultadoCarga] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // Estados para el flujo de CSV
  const [csvOriginal, setCsvOriginal] = useState(null);
  const [csvProcesado, setCsvProcesado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [paso, setPaso] = useState(1); // 1: Subir, 2: Previsualizar, 3: Procesar, 4: Guardar

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, estadosRes, sistemaRes] = await Promise.all([
        fetch(`${API_URL}/datos/estadisticas`).then(r => r.json()),
        fetch(`${API_URL}/datos/resumen-por-estado`).then(r => r.json()),
        fetch(`${API_URL}/sistema/info`).then(r => r.json())
      ]);
      
      if (statsRes.success) setEstadisticas(statsRes);
      if (estadosRes.success) setEstados(estadosRes.estados);
      if (sistemaRes.success) setSistemaInfo(sistemaRes);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Paso 1: Seleccionar archivo CSV
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setMensaje({ tipo: 'error', texto: 'Solo se permiten archivos CSV' });
        return;
      }
      setArchivo(file);
      setCsvOriginal(null);
      setCsvProcesado(null);
      setResultadoCarga(null);
      setMensaje(null);
      setPaso(1);
      
      // Leer el CSV para preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1, 11).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          return headers.reduce((obj, header, i) => {
            obj[header] = values[i] || '';
            return obj;
          }, {});
        });
        setCsvOriginal({ 
          headers, 
          rows, 
          totalRows: lines.length - 1,
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1)
        });
        setPaso(2);
      };
      reader.readAsText(file);
    }
  };

  // Paso 2: Limpiar y Procesar CSV
  const procesarCSV = async () => {
    if (!archivo) return;
    
    setProcesando(true);
    setMensaje(null);
    
    const formData = new FormData();
    formData.append('archivo', archivo);
    
    try {
      const response = await fetch(`${API_URL}/datos/procesar-csv`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCsvProcesado(data);
        setPaso(3);
        setMensaje({ tipo: 'success', texto: `✅ ${data.resumen.casos_confirmados.toLocaleString()} casos confirmados procesados` });
      } else {
        setMensaje({ tipo: 'error', texto: data.error });
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al procesar el archivo' });
    } finally {
      setProcesando(false);
    }
  };

  // Paso 3: Guardar en Base de Datos
  const guardarEnBD = async () => {
    if (!archivo) return;
    
    setGuardando(true);
    setMensaje(null);
    
    const formData = new FormData();
    formData.append('archivo', archivo);
    
    try {
      const response = await fetch(`${API_URL}/datos/cargar-csv`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMensaje({ tipo: 'success', texto: `✅ ${data.estadisticas.registros_insertados.toLocaleString()} registros guardados en la base de datos` });
        setResultadoCarga(data.estadisticas);
        setPaso(4);
        await cargarDatos();
      } else {
        setMensaje({ tipo: 'error', texto: data.error });
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al guardar en la base de datos' });
    } finally {
      setGuardando(false);
    }
  };

  // Reiniciar proceso
  const reiniciarProceso = () => {
    setArchivo(null);
    setCsvOriginal(null);
    setCsvProcesado(null);
    setResultadoCarga(null);
    setMensaje(null);
    setPaso(1);
    if (document.getElementById('file-input')) {
      document.getElementById('file-input').value = '';
    }
  };

  const limpiarDatos = async (anio = null) => {
    const url = anio ? `${API_URL}/datos/limpiar-anio/${anio}` : `${API_URL}/datos/limpiar`;
    
    try {
      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();
      
      if (data.success) {
        setMensaje({ 
          tipo: 'success', 
          texto: `${data.registros_eliminados} registros eliminados` 
        });
        await cargarDatos();
      } else {
        setMensaje({ tipo: 'error', texto: data.error });
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar datos' });
    }
    setConfirmDelete(null);
  };

  const exportarCSV = () => {
    if (!estados.length) return;
    
    let csv = 'Estado,Poblacion,Total Registros,Total Casos,Promedio TI,Fecha Inicio,Fecha Fin\n';
    estados.forEach(e => {
      csv += `"${e.estado}",${e.poblacion},${e.total_registros},${e.total_casos},${e.promedio_ti?.toFixed(2)},${e.fecha_inicio || 'N/A'},${e.fecha_fin || 'N/A'}\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resumen_estados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-600" />
              Configuración del Sistema
            </h1>
            <p className="text-gray-500 mt-1">
              Gestión de datos epidemiológicos, carga de CSV y monitoreo del sistema
            </p>
          </div>
          
          <button 
            onClick={cargarDatos} 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            mensaje.tipo === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {mensaje.tipo === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-medium">{mensaje.texto}</span>
            <button onClick={() => setMensaje(null)} className="ml-auto text-gray-500 hover:text-gray-700">×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-6 flex gap-2 flex-wrap">
          {[
            { id: 'datos', label: 'Gestión de Datos', icon: Database },
            { id: 'cargar', label: 'Cargar CSV', icon: Upload },
            { id: 'estados', label: 'Por Estados', icon: MapPin },
            { id: 'sistema', label: 'Sistema', icon: Server }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: Gestión de Datos */}
        {activeTab === 'datos' && (
          <div className="space-y-6">
            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Total Registros</p>
                    <p className="text-2xl font-bold text-gray-800">{estadisticas?.total_registros?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">Total Casos</p>
                    <p className="text-2xl font-bold text-gray-800">{estadisticas?.total_casos?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500">
                <div className="flex items-center gap-3">
                  <MapPin className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-500">Estados con Datos</p>
                    <p className="text-2xl font-bold text-gray-800">{estadisticas?.regiones_con_datos || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-orange-500">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-500">Última Carga</p>
                    <p className="text-lg font-bold text-gray-800">{estadisticas?.ultima_carga || 'Sin datos'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rango de fechas */}
            {estadisticas?.fecha_inicio && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <p className="text-blue-100 text-sm">Período de Datos</p>
                    <p className="text-xl font-bold">{estadisticas.fecha_inicio} → {estadisticas.fecha_fin}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Gráfica por año */}
            {estadisticas?.por_anio?.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" /> Registros por Año
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={estadisticas.por_anio}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="anio" />
                      <YAxis />
                      <Tooltip formatter={(value) => value.toLocaleString()} />
                      <Bar dataKey="registros" fill="#3b82f6" name="Registros" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" /> Casos por Año
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={estadisticas.por_anio}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="anio" />
                      <YAxis />
                      <Tooltip formatter={(value) => value.toLocaleString()} />
                      <Bar dataKey="casos" fill="#10b981" name="Casos" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Tabla por año con acciones */}
            {estadisticas?.por_anio?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">Datos por Año</h3>
                  <button 
                    onClick={() => setConfirmDelete('all')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Limpiar Todo
                  </button>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Año</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Registros</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Casos</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {estadisticas.por_anio.map((row) => (
                      <tr key={row.anio} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.anio}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{row.registros?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{row.casos?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => setConfirmDelete(row.anio)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: Cargar CSV */}
        {activeTab === 'cargar' && (
          <div className="space-y-6">
            {/* Indicador de pasos */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                {[
                  { num: 1, label: 'Subir CSV', icon: Upload },
                  { num: 2, label: 'Previsualizar', icon: Eye },
                  { num: 3, label: 'Limpiar y Procesar', icon: Filter },
                  { num: 4, label: 'Guardar en BD', icon: Save }
                ].map((step, idx) => (
                  <React.Fragment key={step.num}>
                    <div className={`flex flex-col items-center ${paso >= step.num ? 'text-blue-600' : 'text-gray-400'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                        paso > step.num ? 'bg-green-500 text-white' :
                        paso === step.num ? 'bg-blue-600 text-white' : 'bg-gray-200'
                      }`}>
                        {paso > step.num ? <CheckCircle className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                      </div>
                      <span className="text-xs font-medium">{step.label}</span>
                    </div>
                    {idx < 3 && (
                      <div className={`flex-1 h-1 mx-2 rounded ${paso > step.num ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Paso 1: Subir CSV */}
            {paso === 1 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  Paso 1: Selecciona el archivo CSV de datos de Dengue
                </h3>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-blue-800 text-sm">
                    <strong>Formato esperado:</strong> CSV con columnas FECHA_SIGN_SINTOMAS, ENTIDAD_RES, ESTATUS_CASO (igual al usado para entrenar el modelo)
                  </p>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-blue-400 transition-colors cursor-pointer"
                     onClick={() => document.getElementById('file-input').click()}>
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-700 mb-2">
                    Arrastra y suelta tu archivo CSV aquí
                  </h3>
                  <p className="text-gray-500 mb-4">o haz clic para seleccionar</p>
                  
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    Seleccionar Archivo CSV
                  </button>
                </div>
              </div>
            )}

            {/* Paso 2: Previsualizar datos originales */}
            {paso === 2 && csvOriginal && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    Paso 2: Vista previa del archivo
                  </h3>
                  <button onClick={reiniciarProceso} className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Cancelar
                  </button>
                </div>
                
                {/* Info del archivo */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Archivo</p>
                    <p className="font-semibold text-gray-800 truncate">{csvOriginal.fileName}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Tamaño</p>
                    <p className="font-semibold text-gray-800">{csvOriginal.fileSize} KB</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Total Registros</p>
                    <p className="font-semibold text-blue-600">{csvOriginal.totalRows.toLocaleString()}</p>
                  </div>
                </div>
                
                {/* Columnas detectadas */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Columnas detectadas ({csvOriginal.headers.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {csvOriginal.headers.map((col, idx) => (
                      <span key={idx} className={`px-2 py-1 rounded text-sm ${
                        ['FECHA_SIGN_SINTOMAS', 'ENTIDAD_RES', 'ESTATUS_CASO'].includes(col) 
                          ? 'bg-green-100 text-green-800 font-medium' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Preview tabla */}
                <div className="overflow-x-auto border rounded-lg mb-6">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {csvOriginal.headers.slice(0, 8).map((h, i) => (
                          <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                        {csvOriginal.headers.length > 8 && <th className="px-3 py-2 text-gray-400">...</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {csvOriginal.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {csvOriginal.headers.slice(0, 8).map((h, j) => (
                            <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">{row[h] || '-'}</td>
                          ))}
                          {csvOriginal.headers.length > 8 && <td className="px-3 py-2 text-gray-400">...</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 text-center">
                    Mostrando 10 de {csvOriginal.totalRows.toLocaleString()} registros
                  </div>
                </div>
                
                {/* Botón procesar */}
                <div className="flex justify-center">
                  <button
                    onClick={procesarCSV}
                    disabled={procesando}
                    className="px-8 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold flex items-center gap-2 disabled:opacity-50 text-lg"
                  >
                    {procesando ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Procesando datos...
                      </>
                    ) : (
                      <>
                        <Filter className="w-5 h-5" /> Limpiar y Procesar CSV
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Paso 3: Datos procesados */}
            {paso === 3 && csvProcesado && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Paso 3: Datos procesados y listos para guardar
                  </h3>
                  <button onClick={reiniciarProceso} className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Cancelar
                  </button>
                </div>
                
                {/* Resumen del procesamiento */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-blue-600 mb-1">Registros Originales</p>
                    <p className="text-2xl font-bold text-blue-800">{csvProcesado.resumen.registros_originales.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-green-600 mb-1">Casos Confirmados</p>
                    <p className="text-2xl font-bold text-green-800">{csvProcesado.resumen.casos_confirmados.toLocaleString()}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-purple-600 mb-1">Registros Procesados</p>
                    <p className="text-2xl font-bold text-purple-800">{csvProcesado.resumen.registros_procesados.toLocaleString()}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-orange-600 mb-1">Estados</p>
                    <p className="text-2xl font-bold text-orange-800">{csvProcesado.resumen.estados_procesados}</p>
                  </div>
                </div>
                
                {/* Años y rango */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex flex-wrap gap-4 justify-center">
                    <div>
                      <span className="text-sm text-gray-600">Período: </span>
                      <span className="font-semibold">{csvProcesado.resumen.fecha_inicio} → {csvProcesado.resumen.fecha_fin}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-sm text-gray-600">Años:</span>
                      {csvProcesado.resumen.años.map(a => (
                        <span key={a} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">{a}</span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Preview de datos procesados */}
                <div className="overflow-x-auto border rounded-lg mb-6">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha Semana</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Casos</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tasa Incidencia</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Riesgo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {csvProcesado.preview.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800">{row.estado}</td>
                          <td className="px-3 py-2 text-gray-600">{row.fecha_fin_semana}</td>
                          <td className="px-3 py-2 text-right text-blue-600 font-semibold">{row.casos_confirmados}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{row.tasa_incidencia?.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              row.riesgo_brote ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {row.riesgo_brote ? 'ALTO' : 'BAJO'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 text-center">
                    Mostrando 10 de {csvProcesado.resumen.registros_procesados.toLocaleString()} registros procesados
                  </div>
                </div>
                
                {/* Botón guardar */}
                <div className="flex justify-center">
                  <button
                    onClick={guardarEnBD}
                    disabled={guardando}
                    className="px-10 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex items-center gap-3 disabled:opacity-50 text-xl shadow-lg"
                  >
                    {guardando ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" /> Guardando en Base de Datos...
                      </>
                    ) : (
                      <>
                        <Database className="w-6 h-6" /> Guardar en Base de Datos
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Paso 4: Completado */}
            {paso === 4 && resultadoCarga && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Datos guardados exitosamente!</h3>
                <p className="text-gray-600 mb-6">Los datos han sido procesados y almacenados en la base de datos</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-2xl mx-auto">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Originales</p>
                    <p className="text-xl font-bold text-gray-800">{resultadoCarga.registros_originales?.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Confirmados</p>
                    <p className="text-xl font-bold text-green-600">{resultadoCarga.casos_confirmados?.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Insertados</p>
                    <p className="text-xl font-bold text-blue-600">{resultadoCarga.registros_insertados?.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Estados</p>
                    <p className="text-xl font-bold text-purple-600">{resultadoCarga.estados_procesados}</p>
                  </div>
                </div>
                
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={reiniciarProceso}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                  >
                    <Upload className="w-5 h-5" /> Cargar Otro Archivo
                  </button>
                  <button
                    onClick={() => setActiveTab('datos')}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center gap-2"
                  >
                    <Database className="w-5 h-5" /> Ver Datos Cargados
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Por Estados */}
        {activeTab === 'estados' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Resumen por Estado</h3>
              <button 
                onClick={exportarCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Exportar CSV
              </button>
            </div>

            {/* Gráfica de estados */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 10 Estados con más Casos</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={estados.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="estado" type="category" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Bar dataKey="total_casos" fill="#3b82f6" name="Casos" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla de estados */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Población</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Registros</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Casos</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Promedio TI</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {estados.map((estado, idx) => (
                      <tr key={estado.id_region} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{estado.estado}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{estado.poblacion?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{estado.total_registros?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-blue-600 text-right font-semibold">{estado.total_casos?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{estado.promedio_ti?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {estado.fecha_inicio ? `${estado.fecha_inicio.split('-')[0]} - ${estado.fecha_fin?.split('-')[0]}` : 'Sin datos'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Sistema */}
        {activeTab === 'sistema' && sistemaInfo && (
          <div className="space-y-6">
            {/* Info del sistema */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600" /> Información del Sistema
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Nombre</p>
                  <p className="text-lg font-semibold text-gray-800">{sistemaInfo.sistema.nombre}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Versión</p>
                  <p className="text-lg font-semibold text-gray-800">{sistemaInfo.sistema.version}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Base de Datos</p>
                  <p className="text-lg font-semibold text-gray-800">{sistemaInfo.sistema.base_datos}</p>
                </div>
              </div>
            </div>

            {/* Modelos ML */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" /> Modelos de Machine Learning
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Regresión Lineal */}
                <div className={`border-2 rounded-xl p-5 ${sistemaInfo.modelos.lineal?.cargado ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800">{sistemaInfo.modelos.lineal?.nombre || 'Regresión Lineal'}</h4>
                    {sistemaInfo.modelos.lineal?.cargado ? (
                      <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Activo
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> No cargado
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Archivo:</strong> {sistemaInfo.modelos.lineal?.archivo || 'model_lineal.pkl'}</p>
                    <p><strong>R² Score:</strong> {sistemaInfo.modelos.lineal?.r2_score ? (sistemaInfo.modelos.lineal.r2_score * 100).toFixed(1) + '%' : 'N/A'}</p>
                    <p><strong>Uso:</strong> Predicción de tendencias generales de casos</p>
                  </div>
                </div>

                {/* Regresión Polinomial */}
                <div className={`border-2 rounded-xl p-5 ${sistemaInfo.modelos.polinomial?.cargado ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800">{sistemaInfo.modelos.polinomial?.nombre || 'Regresión Polinomial'}</h4>
                    {sistemaInfo.modelos.polinomial?.cargado ? (
                      <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Activo
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> No cargado
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Archivo:</strong> {sistemaInfo.modelos.polinomial?.archivo || 'model_polinomial.pkl'}</p>
                    <p><strong>R² Score:</strong> {sistemaInfo.modelos.polinomial?.r2_score ? (sistemaInfo.modelos.polinomial.r2_score * 100).toFixed(1) + '%' : 'N/A'}</p>
                    <p><strong>Uso:</strong> Predicción de patrones no lineales y estacionales</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Estado de conexión */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" /> Estado de Conexiones
              </h3>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${sistemaInfo.conexion_db ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {sistemaInfo.conexion_db ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span className="font-medium">Base de Datos MySQL</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Confirmar Eliminación</h3>
              </div>
              <p className="text-gray-600 mb-6">
                {confirmDelete === 'all' 
                  ? '¿Estás seguro de eliminar TODOS los datos epidemiológicos? Esta acción no se puede deshacer.'
                  : `¿Estás seguro de eliminar todos los datos del año ${confirmDelete}?`
                }
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => limpiarDatos(confirmDelete === 'all' ? null : confirmDelete)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Configuracion;