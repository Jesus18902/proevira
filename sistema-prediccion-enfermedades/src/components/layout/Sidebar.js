import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const usuarioData = localStorage.getItem('usuario');
    if (usuarioData) {
      setUsuario(JSON.parse(usuarioData));
    }
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const menuItems = [
    { path: '/prediccion-avanzada', icon: 'query_stats', label: 'Predicción Avanzada' },
    { path: '/modelos', icon: 'psychology', label: 'Predicción Rápida' },
    { path: '/dashboard-predicciones', icon: 'monitoring', label: 'Historial Predicciones' },
    { path: '/monitoreo', icon: 'sensors', label: 'Monitoreo Tiempo Real' },
    { path: '/entrenar-modelos', icon: 'model_training', label: 'Entrenar Modelos' },
    { path: '/alertas', icon: 'notifications_active', label: 'Alertas' },
    { path: '/reportes', icon: 'description', label: 'Reportes' },
    { path: '/configuracion', icon: 'settings', label: 'Configuración' }
  ];

  return (
    <aside className="w-72 flex flex-col h-screen flex-shrink-0"
           style={{ backgroundColor: '#0F1E35', borderRight: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header */}
      <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
               style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/8/85/Instituto_Tecnologico_de_Oaxaca_-_original.svg"
              alt="ITO"
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div>
            <h1 className="text-white text-xl font-black leading-tight">ProeVira</h1>
            <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Sistema de Predicción
            </p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {usuario && (
        <div className="px-4 py-3 mx-3 mt-3 rounded-xl"
             style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{usuario.nombre}</p>
              <p className="text-xs truncate" style={{ color: '#F97316' }}>{usuario.rol}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto mt-2">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"
           style={{ color: 'rgba(255,255,255,0.25)' }}>
          Menú principal
        </p>
        <div className="space-y-0.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group"
                style={isActive
                  ? { background: 'rgba(249,115,22,0.18)', borderLeft: '3px solid #F97316', paddingLeft: '13px' }
                  : { borderLeft: '3px solid transparent', paddingLeft: '13px' }
                }
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = ''; }}
              >
                <span className="material-symbols-outlined text-[22px] transition-colors duration-200"
                      style={{ color: isActive ? '#F97316' : 'rgba(255,255,255,0.45)' }}>
                  {item.icon}
                </span>
                <span className="font-semibold text-sm transition-colors duration-200"
                      style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.60)' }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          onClick={cerrarSesion}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm"
          style={{ color: 'rgba(248,113,113,0.75)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; e.currentTarget.style.color = '#f87171'; }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(248,113,113,0.75)'; }}
        >
          <span className="material-symbols-outlined text-[22px]">logout</span>
          <span>Cerrar Sesión</span>
        </button>
        <div className="mt-2 text-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.20)' }}>Versión 1.0.0</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
