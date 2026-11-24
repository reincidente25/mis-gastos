// src/components/layout/Layout.jsx
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useHogar } from '../../context/HogarContext';
import './Layout.css';

const NAV_ITEMS = [
  { path: '/',          label: 'Resumen',   icon: '📊' },
  { path: '/gastos',    label: 'Gastos',    icon: '💸' },
  { path: '/tabla',     label: 'Tabla',     icon: '📋' },
  { path: '/vencimientos', label: 'Vencimientos', icon: '📅' },
  { path: '/categorias', label: 'Categorías', icon: '🏷️' },
  { path: '/conceptos',  label: 'Conceptos',  icon: '📄' },
  { path: '/grupos',     label: 'Grupos',     icon: '📁' },
  { path: '/ajustes',    label: 'Ajustes',    icon: '⚙️' },
];

const Layout = ({ children }) => {
  const { user, logout }    = useAuth();
  const { hogar, hogares, cambiarHogar } = useHogar();
  const navigate             = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="layout">

      {/* Sidebar */}
      <aside className={`sidebar ${menuAbierto ? 'abierto' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">💸</span>
          <span className="logo-texto">Mis Gastos</span>
        </div>

        {hogar && (
          hogares.length > 1 ? (
            <select className="hogar-switch" value={hogar.id}
              onChange={(e) => cambiarHogar(e.target.value)}>
              {hogares.map((h) => <option key={h.id} value={h.id}>🏠 {h.nombre}</option>)}
            </select>
          ) : (
            <div className="hogar-actual">🏠 {hogar.nombre}</div>
          )
        )}

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'activo' : ''}`
              }
              onClick={() => setMenuAbierto(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="layout-main">
        {/* Header mobile */}
        <header className="header-mobile">
          <button
            className="btn-menu"
            onClick={() => setMenuAbierto(!menuAbierto)}
          >
            ☰
          </button>
          <span className="header-titulo">Mis Gastos</span>
        </header>

        <main className="layout-content">
          {children}
        </main>
      </div>

      {/* Overlay mobile */}
      {menuAbierto && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuAbierto(false)}
        />
      )}
    </div>
  );
};

export default Layout;
