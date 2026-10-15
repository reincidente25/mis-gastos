// src/components/layout/Layout.jsx
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const NAV_ITEMS = [
  { path: '/',         label: 'Inicio',    icon: '🏠' },
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  // Agregar más rutas acá
];

const Layout = ({ children }) => {
  const { user, logout }    = useAuth();
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
          <span className="logo-icon">⚡</span>
          <span className="logo-texto">Mi App</span>
        </div>

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
          <span className="header-titulo">Mi App</span>
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
