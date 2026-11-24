// src/pages/Invitacion.jsx — abre un link de invitación y une al hogar.
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHogar } from '../context/HogarContext';

const Pantalla = ({ children }) => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
    <div>{children}</div>
  </div>
);

const Invitacion = () => {
  const { codigo } = useParams();
  const { user } = useAuth();
  const { unirseConCodigo } = useHogar();
  const navigate = useNavigate();
  const [estado, setEstado] = useState('procesando'); // procesando | error
  const hecho = useRef(false);

  useEffect(() => {
    if (hecho.current) return;
    // Sin sesión: guardamos el código y mandamos a iniciar sesión / registrarse.
    if (!user) {
      try { localStorage.setItem('inviteCodigo', codigo); } catch { /* ignore */ }
      navigate('/login', { replace: true });
      return;
    }
    hecho.current = true;
    (async () => {
      try {
        await unirseConCodigo(codigo);
        try { localStorage.removeItem('inviteCodigo'); } catch { /* ignore */ }
        navigate('/', { replace: true });
      } catch {
        setEstado('error');
      }
    })();
  }, [user, codigo, unirseConCodigo, navigate]);

  if (estado === 'error') {
    return (
      <Pantalla>
        <div className="login-logo">💸</div>
        <h2>Invitación no válida</h2>
        <p className="pg-sub">El código <strong>{codigo}</strong> no corresponde a ningún hogar.</p>
        <button className="btn-login" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Ir a la app</button>
      </Pantalla>
    );
  }
  return <Pantalla><div className="spinner" /><p className="pg-sub" style={{ marginTop: 12 }}>Uniéndote al hogar…</p></Pantalla>;
};

export default Invitacion;
