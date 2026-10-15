// src/pages/Ajustes.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useHogar } from '../context/HogarContext';
import { useAuth } from '../context/AuthContext';
import './Gastos.css';

const Ajustes = () => {
  const { hogar } = useHogar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState(false);

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(hogar.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch { /* clipboard no disponible */ }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Layout>
      <div className="gastos-page">
        <header className="pg-header">
          <div>
            <h1>⚙️ Ajustes</h1>
            <p className="pg-sub">Tu hogar y tu cuenta</p>
          </div>
        </header>

        <section className="card">
          <h2 className="card-titulo">Hogar</h2>
          <p className="aj-dato"><span>Nombre</span>{hogar?.nombre}</p>
          <p className="aj-dato"><span>Miembros</span>{hogar?.miembros?.length || 1}</p>

          <div className="aj-codigo">
            <div>
              <span className="aj-codigo-label">Código de invitación</span>
              <span className="aj-codigo-valor">{hogar?.codigo}</span>
            </div>
            <button onClick={copiarCodigo}>{copiado ? '¡Copiado!' : 'Copiar'}</button>
          </div>
          <p className="pg-vacio-inline" style={{ marginTop: 10 }}>
            Compartí este código con tu pareja para que se una al mismo presupuesto
            desde “Unirme con código”.
          </p>
        </section>

        <section className="card">
          <h2 className="card-titulo">Cuenta</h2>
          <p className="aj-dato"><span>Email</span>{user?.email}</p>
          <button className="aj-logout" onClick={handleLogout}>🚪 Cerrar sesión</button>
        </section>
      </div>
    </Layout>
  );
};

export default Ajustes;
