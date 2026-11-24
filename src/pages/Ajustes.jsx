// src/pages/Ajustes.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useHogar } from '../context/HogarContext';
import { useAuth } from '../context/AuthContext';
import './Gastos.css';

const Ajustes = () => {
  const { hogar, hogares, cambiarHogar, crearHogar, unirseConCodigo } = useHogar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [msg, setMsg] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || trabajando) return;
    setTrabajando(true); setMsg('');
    try { await crearHogar(nuevoNombre); setNuevoNombre(''); }
    finally { setTrabajando(false); }
  };

  const handleUnirse = async (e) => {
    e.preventDefault();
    if (!codigo.trim() || trabajando) return;
    setTrabajando(true); setMsg('');
    try { await unirseConCodigo(codigo); setCodigo(''); }
    catch { setMsg('Código inválido.'); }
    finally { setTrabajando(false); }
  };

  const [copiadoLink, setCopiadoLink] = useState(false);
  const inviteLink = hogar ? `${window.location.origin}/unirse/${hogar.codigo}` : '';

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(hogar.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch { /* clipboard no disponible */ }
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiadoLink(true);
      setTimeout(() => setCopiadoLink(false), 1800);
    } catch { /* clipboard no disponible */ }
  };

  const compartirLink = async () => {
    const texto = `Te invito a nuestro presupuesto "${hogar?.nombre}" en Mis Gastos: ${inviteLink}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Mis Gastos', text: texto, url: inviteLink }); } catch { /* cancelado */ }
    } else {
      copiarLink();
    }
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
          <div className="aj-invite">
            <span className="aj-codigo-label">Link de invitación</span>
            <div className="aj-invite-row">
              <input className="aj-invite-input" type="text" readOnly value={inviteLink}
                onFocus={(e) => e.target.select()} />
              <button onClick={copiarLink}>{copiadoLink ? '¡Copiado!' : 'Copiar'}</button>
              <button className="aj-invite-compartir" onClick={compartirLink}>Compartir</button>
            </div>
          </div>
          <p className="pg-vacio-inline" style={{ marginTop: 10 }}>
            Mandá el link: quien lo abra crea su cuenta (o inicia sesión) y se suma
            automáticamente a este hogar. También pueden usar el código desde
            “Unirme con código”.
          </p>
        </section>

        <section className="card">
          <h2 className="card-titulo">Mis hogares <span className="card-sub">{hogares.length}</span></h2>
          <div className="hogares-lista">
            {hogares.map((h) => (
              <div key={h.id} className={`hogar-item ${h.id === hogar?.id ? 'activo' : ''}`}>
                <span className="hogar-nombre">🏠 {h.nombre}</span>
                {h.id === hogar?.id
                  ? <span className="hogar-badge">Activo</span>
                  : <button className="hogar-usar" onClick={() => cambiarHogar(h.id)}>Usar</button>}
              </div>
            ))}
          </div>

          <div className="hogar-forms">
            <form className="hogar-form" onSubmit={handleCrear}>
              <input type="text" placeholder="Nombre del nuevo hogar" value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)} maxLength={40} />
              <button type="submit" disabled={trabajando}>+ Crear hogar</button>
            </form>
            <form className="hogar-form" onSubmit={handleUnirse}>
              <input type="text" placeholder="Código de invitación" value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={6} />
              <button type="submit" disabled={trabajando}>Unirme</button>
            </form>
          </div>
          {msg && <p className="pg-error" style={{ textAlign: 'left', padding: '6px 0' }}>{msg}</p>}
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
