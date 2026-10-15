// src/pages/Onboarding.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHogar } from '../context/HogarContext';
import { useAuth } from '../context/AuthContext';
import './Onboarding.css';

const Onboarding = () => {
  const { hogar, crearHogar, unirseConCodigo } = useHogar();
  const { logout }  = useAuth();
  const navigate    = useNavigate();
  const [tab, setTab]       = useState('crear'); // 'crear' | 'unirse'
  const [nombre, setNombre] = useState('Nuestro hogar');
  const [codigo, setCodigo] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (hogar) navigate('/', { replace: true }); }, [hogar, navigate]);

  const handleCrear = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await crearHogar(nombre);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('No se pudo crear el hogar. Intentá de nuevo.');
      setLoading(false);
    }
  };

  const handleUnirse = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await unirseConCodigo(codigo);
      navigate('/');
    } catch (err) {
      setError(err.message === 'CODIGO_INVALIDO'
        ? 'No existe un hogar con ese código.'
        : 'No se pudo unir al hogar.');
      setLoading(false);
    }
  };

  return (
    <div className="onb-page">
      <div className="onb-card">
        <div className="onb-logo">💸</div>
        <h1 className="onb-titulo">Configurá tu hogar</h1>
        <p className="onb-sub">
          Un <strong>hogar</strong> es el presupuesto que compartís con tu pareja.
          Creá uno nuevo o unite al de ella con un código.
        </p>

        <div className="onb-tabs">
          <button className={tab === 'crear' ? 'activo' : ''} onClick={() => { setTab('crear'); setError(''); }}>
            Crear hogar
          </button>
          <button className={tab === 'unirse' ? 'activo' : ''} onClick={() => { setTab('unirse'); setError(''); }}>
            Unirme con código
          </button>
        </div>

        {tab === 'crear' ? (
          <form className="onb-form" onSubmit={handleCrear}>
            <label>Nombre del hogar</label>
            <input
              type="text" value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nuestro hogar" maxLength={40} required
            />
            <p className="onb-hint">
              Se va a crear con tus conceptos y tarjetas habituales ya cargados.
            </p>
            {error && <p className="onb-error">{error}</p>}
            <button type="submit" disabled={loading} className="onb-btn">
              {loading ? 'Creando...' : 'Crear hogar'}
            </button>
          </form>
        ) : (
          <form className="onb-form" onSubmit={handleUnirse}>
            <label>Código de invitación</label>
            <input
              type="text" value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ej: K7M2PQ" maxLength={6} required
              style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
            />
            <p className="onb-hint">
              Pedíselo a quien ya creó el hogar (lo ve en Ajustes).
            </p>
            {error && <p className="onb-error">{error}</p>}
            <button type="submit" disabled={loading} className="onb-btn">
              {loading ? 'Uniéndome...' : 'Unirme'}
            </button>
          </form>
        )}

        <button className="onb-logout" onClick={logout}>Cerrar sesión</button>
      </div>
    </div>
  );
};

export default Onboarding;
