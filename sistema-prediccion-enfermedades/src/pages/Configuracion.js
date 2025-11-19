import React, { useState, useEffect } from 'react';
import { datosService } from '../services/api';

const Configuracion = () => {
  const [activeTab, setActiveTab] = useState('enfermedades');
  const [enfermedades, setEnfermedades] = useState([]);
  const [regiones, setRegiones] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [enfermedadesRes, regionesRes, modelosRes] = await Promise.all([
        datosService.getEnfermedades(),
        datosService.getRegiones(),
        datosService.getModelos()
      ]);
      
      setEnfermedades(enfermedadesRes.data);
      setRegiones(regionesRes.data);
      setModelos(modelosRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error cargando configuración:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-text-main text-4xl font-black leading-tight">
            Configuración del Sistema
          </h1>
          <p className="text-text-secondary text-base">
            Administra enfermedades, regiones y modelos predictivos
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-[#dbe2e6] rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-[#dbe2e6]">
            <button
              onClick={() => setActiveTab('enfermedades')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'enfermedades'
                  ? 'bg-primary text-white'
                  : 'text-text-main hover:bg-gray-50'
              }`}>
              <span className="material-symbols-outlined mr-2 align-middle">coronavirus</span>
              Enfermedades
            </button>
            <button
              onClick={() => setActiveTab('regiones')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'regiones'
                  ? 'bg-primary text-white'
                  : 'text-text-main hover:bg-gray-50'
              }`}>
              <span className="material-symbols-outlined mr-2 align-middle">location_on</span>
              Regiones
            </button>
            <button
              onClick={() => setActiveTab('modelos')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'modelos'
                  ? 'bg-primary text-white'
                  : 'text-text-main hover:bg-gray-50'
              }`}>
              <span className="material-symbols-outlined mr-2 align-middle">psychology</span>
              Modelos de predicción
            </button>
          </div>

          <div className="p-6">
            {/* Tab: Enfermedades */}
            {activeTab === 'enfermedades' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-text-main">
                    Enfermedades Registradas ({enfermedades.length})
                  </h3>
                  <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined">add</span>
                    Nueva Enfermedad
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enfermedades.map((enfermedad) => (
                    <div key={enfermedad.id} className="bg-white border border-[#dbe2e6] rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-50 rounded-lg">
                            <span className="material-symbols-outlined text-red-600 text-2xl">coronavirus</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-text-main">{enfermedad.nombre}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              enfermedad.nivel_riesgo === 'Alto' ? 'bg-red-100 text-red-800' :
                              enfermedad.nivel_riesgo === 'Medio' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {enfermedad.nivel_riesgo || 'Bajo'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary mb-3">
                        {enfermedad.descripcion || 'Sin descripción disponible'}
                      </p>
                      <div className="flex gap-2">
                        <button className="flex-1 px-3 py-1 text-sm border border-[#dbe2e6] rounded hover:bg-gray-50">
                          Editar
                        </button>
                        <button className="flex-1 px-3 py-1 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Regiones */}
            {activeTab === 'regiones' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-text-main">
                    Regiones Monitoreadas ({regiones.length})
                  </h3>
                  <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined">add</span>
                    Nueva Región
                  </button>
                </div>

                <div className="bg-white border border-[#dbe2e6] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                          Región
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                          Código Postal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                          Población
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {regiones.map((region) => (
                        <tr key={region.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-primary">location_on</span>
                              <span className="font-semibold text-text-main">{region.nombre}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-text-secondary">
                            {region.codigo_postal || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-text-main font-semibold">
                            {region.poblacion?.toLocaleString() || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button className="p-2 hover:bg-blue-50 rounded">
                                <span className="material-symbols-outlined text-blue-600">edit</span>
                              </button>
                              <button className="p-2 hover:bg-red-50 rounded">
                                <span className="material-symbols-outlined text-red-600">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Modelos */}
            {activeTab === 'modelos' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-text-main">
                    Modelos Predictivos ({modelos.length})
                  </h3>
                  <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined">add</span>
                    Nuevo Modelo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modelos.map((modelo) => (
                    <div key={modelo.id} className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-white rounded-lg shadow-sm">
                            <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-text-main text-lg">{modelo.nombre}</h4>
                            <span className="text-sm text-text-secondary">{modelo.tipo}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-text-secondary">Precisión</span>
                          <span className="text-lg font-bold text-primary">{modelo.precission}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${modelo.precission}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button className="flex-1 px-4 py-2 bg-white border border-[#dbe2e6] rounded-lg hover:bg-gray-50 font-semibold text-sm">
                          Configurar
                        </button>
                        <button className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-semibold text-sm">
                          Entrenar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracion;