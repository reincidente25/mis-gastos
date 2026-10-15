// src/pages/Conceptos.jsx
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { useHogar } from '../context/HogarContext';
import { CATEGORIAS, getCategoria } from '../config/categorias';
import { FRECUENCIAS } from '../config/frecuencias';
import {
  listarConceptos, crearConcepto, actualizarConcepto,
  archivarConcepto, reactivarConcepto,
  eliminarConcepto, eliminarTodosConceptos,
} from '../services/conceptosService';
import './Gastos.css';

// ── Tarjeta editable de un concepto ──
const ItemConcepto = ({ c, archivado, onGuardar, onToggle, onBorrar }) => {
  const cat = getCategoria(c.categoria);
  const [nombre, setNombre] = useState(c.nombre);
  const frec = c.frecuencia || 'mensual';

  const commitNombre = () => {
    const limpio = nombre.trim();
    if (!limpio || limpio === c.nombre) { setNombre(c.nombre); return; }
    onGuardar(c, { nombre: limpio });
  };

  return (
    <div className={`concepto-card ${archivado ? 'archivado' : ''}`}>
      <div className="cc-top">
        <span className="cr-icono" style={{ background: `${cat.color}1a`, color: cat.color }}>{cat.icon}</span>
        <input
          className="cc-nombre-input"
          value={nombre}
          maxLength={60}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={commitNombre}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
        {archivado
          ? <button className="suelto-borrar" onClick={() => onToggle(c)} title="Reactivar">↩️</button>
          : <button className="suelto-borrar" onClick={() => onToggle(c)} title="Archivar">📥</button>}
        <button className="suelto-borrar" onClick={() => onBorrar(c)} title="Borrar">🗑️</button>
      </div>

      <div className="cc-fields">
        <label>
          <span>Grupo / tag</span>
          <input
            className="grupo-input" placeholder="—" maxLength={30}
            defaultValue={c.grupo || ''}
            onBlur={(e) => onGuardar(c, { grupo: e.target.value.trim() })}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
        </label>
        <label>
          <span>Categoría</span>
          <select className="cat-select" value={c.categoria} onChange={(e) => onGuardar(c, { categoria: e.target.value })}>
            {CATEGORIAS.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.label}</option>)}
          </select>
        </label>
        <label>
          <span>Frecuencia</span>
          <select className="cat-select" value={frec} onChange={(e) => onGuardar(c, { frecuencia: e.target.value })}>
            {FRECUENCIAS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        {frec !== 'mensual' && (
          <label>
            <span>{frec === 'unica' ? 'Mes' : 'Desde el mes'}</span>
            <input
              className="cat-select" type="month"
              defaultValue={c.mesAncla || ''}
              onChange={(e) => onGuardar(c, { mesAncla: e.target.value })}
            />
          </label>
        )}
      </div>
    </div>
  );
};

const Conceptos = () => {
  const { hogar } = useHogar();
  const hogarId = hogar?.id;
  const [conceptos, setConceptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [grupo, setGrupo] = useState('');
  const [categoria, setCategoria] = useState('otros');
  const [frecuencia, setFrecuencia] = useState('mensual');
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
      await crearConcepto(hogarId, { nombre, grupo, categoria, frecuencia }, conceptos.length);
      setNombre(''); setGrupo(''); setCategoria('otros'); setFrecuencia('mensual');
      await cargar();
    } finally { setGuardando(false); }
  };

  const guardarCampo = async (c, datos) => {
    await actualizarConcepto(hogarId, c.id, datos);
    setConceptos((prev) => prev.map((x) => x.id === c.id ? { ...x, ...datos } : x));
  };

  const toggleArchivo = async (c) => {
    if (c.activo) await archivarConcepto(hogarId, c.id);
    else await reactivarConcepto(hogarId, c.id);
    setConceptos((prev) => prev.map((x) => x.id === c.id ? { ...x, activo: !x.activo } : x));
  };

  const borrarUno = async (c) => {
    if (!window.confirm(`¿Borrar el concepto "${c.nombre}"?`)) return;
    await eliminarConcepto(hogarId, c.id);
    setConceptos((prev) => prev.filter((x) => x.id !== c.id));
  };

  const borrarTodos = async () => {
    if (conceptos.length === 0) return;
    if (!window.confirm(`¿Borrar los ${conceptos.length} conceptos? Esto no se puede deshacer.`)) return;
    await eliminarTodosConceptos(hogarId);
    setConceptos([]);
  };

  const activos    = conceptos.filter((c) => c.activo);
  const archivados = conceptos.filter((c) => !c.activo);

  return (
    <Layout>
      <div className="gastos-page">
        <header className="pg-header">
          <div>
            <h1>🗂️ Conceptos</h1>
            <p className="pg-sub">Las filas que cargás cada mes en Gastos. Tocá para editar.</p>
          </div>
        </header>

        <section className="card">
          <h2 className="card-titulo">Nuevo concepto</h2>
          <form className="suelto-form" style={{ gridTemplateColumns: '1fr 130px 140px 140px auto', marginBottom: 0 }} onSubmit={handleAgregar}>
            <input type="text" placeholder="Nombre (ej: Edesur Dolores)" value={nombre}
              onChange={(e) => setNombre(e.target.value)} maxLength={60} />
            <input type="text" placeholder="Grupo (ej: Edesur)" value={grupo}
              onChange={(e) => setGrupo(e.target.value)} maxLength={30} />
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
            <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)}>
              {FRECUENCIAS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <button type="submit" disabled={guardando}>+ Agregar</button>
          </form>
          <p className="pg-vacio-inline" style={{ marginTop: 10 }}>
            El <strong>grupo/tag</strong> junta variantes del mismo rubro (ej: Edesur
            Dolores y Baradero). La <strong>frecuencia</strong> define en qué meses aparece.
          </p>
        </section>

        {loading ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : (
          <>
            <section className="card">
              <h2 className="card-titulo">
                <span>Activos <span className="card-sub">{activos.length}</span></span>
                {conceptos.length > 0 && (
                  <button className="btn-borrar-todos" onClick={borrarTodos}>Borrar todos</button>
                )}
              </h2>
              {activos.length === 0 ? (
                <p className="pg-vacio-inline">Agregá tu primer concepto con el formulario de arriba.</p>
              ) : (
                <div className="cc-lista">
                  {activos.map((c) => (
                    <ItemConcepto key={c.id} c={c} onGuardar={guardarCampo}
                      onToggle={toggleArchivo} onBorrar={borrarUno} />
                  ))}
                </div>
              )}
            </section>

            {archivados.length > 0 && (
              <section className="card">
                <h2 className="card-titulo">Archivados <span className="card-sub">{archivados.length}</span></h2>
                <div className="cc-lista">
                  {archivados.map((c) => (
                    <ItemConcepto key={c.id} c={c} archivado onGuardar={guardarCampo}
                      onToggle={toggleArchivo} onBorrar={borrarUno} />
                  ))}
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
