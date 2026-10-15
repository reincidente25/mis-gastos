// src/pages/Conceptos.jsx
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { useHogar } from '../context/HogarContext';
import { CATEGORIAS, getCategoria } from '../config/categorias';
import {
  listarConceptos, crearConcepto, actualizarConcepto,
  archivarConcepto, reactivarConcepto,
} from '../services/conceptosService';
import './Gastos.css';

const Conceptos = () => {
  const { hogar } = useHogar();
  const hogarId = hogar?.id;
  const [conceptos, setConceptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('otros');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!hogarId) return;
    setLoading(true);
    setConceptos(await listarConceptos(hogarId));
    setLoading(false);
  }, [hogarId]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleAgregar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      await crearConcepto(hogarId, { nombre, categoria }, conceptos.length);
      setNombre(''); setCategoria('otros');
      await cargar();
    } finally { setGuardando(false); }
  };

  const cambiarCategoria = async (c, nuevaCat) => {
    await actualizarConcepto(hogarId, c.id, { categoria: nuevaCat });
    setConceptos((prev) => prev.map((x) => x.id === c.id ? { ...x, categoria: nuevaCat } : x));
  };

  const toggleArchivo = async (c) => {
    if (c.activo) await archivarConcepto(hogarId, c.id);
    else await reactivarConcepto(hogarId, c.id);
    setConceptos((prev) => prev.map((x) => x.id === c.id ? { ...x, activo: !x.activo } : x));
  };

  const activos   = conceptos.filter((c) => c.activo);
  const archivados = conceptos.filter((c) => !c.activo);

  return (
    <Layout>
      <div className="gastos-page">
        <header className="pg-header">
          <div>
            <h1>🗂️ Conceptos</h1>
            <p className="pg-sub">Las filas fijas que cargás cada mes en Gastos</p>
          </div>
        </header>

        <section className="card">
          <h2 className="card-titulo">Nuevo concepto</h2>
          <form className="suelto-form" style={{ gridTemplateColumns: '1fr 160px auto', marginBottom: 0 }} onSubmit={handleAgregar}>
            <input type="text" placeholder="Nombre del concepto" value={nombre}
              onChange={(e) => setNombre(e.target.value)} maxLength={60} />
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
            <button type="submit" disabled={guardando}>+ Agregar</button>
          </form>
        </section>

        {loading ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : (
          <>
            <section className="card">
              <h2 className="card-titulo">Activos <span className="card-sub">{activos.length}</span></h2>
              <div className="concepto-lista">
                {activos.map((c) => {
                  const cat = getCategoria(c.categoria);
                  return (
                    <div className="concepto-row" key={c.id}>
                      <span className="cr-icono" style={{ background: `${cat.color}1a`, color: cat.color }}>{cat.icon}</span>
                      <span className="cr-nombre">{c.nombre}</span>
                      <select className="cat-select" value={c.categoria} onChange={(e) => cambiarCategoria(c, e.target.value)}>
                        {CATEGORIAS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                      </select>
                      <button className="suelto-borrar" onClick={() => toggleArchivo(c)} title="Archivar">📥</button>
                    </div>
                  );
                })}
              </div>
            </section>

            {archivados.length > 0 && (
              <section className="card">
                <h2 className="card-titulo">Archivados <span className="card-sub">{archivados.length}</span></h2>
                <div className="concepto-lista">
                  {archivados.map((c) => {
                    const cat = getCategoria(c.categoria);
                    return (
                      <div className="concepto-row" key={c.id} style={{ opacity: 0.6 }}>
                        <span className="cr-icono" style={{ background: `${cat.color}1a`, color: cat.color }}>{cat.icon}</span>
                        <span className="cr-nombre">{c.nombre}</span>
                        <button className="suelto-borrar" onClick={() => toggleArchivo(c)} title="Reactivar">↩️</button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Conceptos;
