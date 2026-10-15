// src/pages/Conceptos.jsx
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { useHogar } from '../context/HogarContext';
import { useEstructura } from '../context/EstructuraContext';
import { FRECUENCIAS } from '../config/frecuencias';
import {
  listarConceptos, crearConcepto, actualizarConcepto,
  archivarConcepto, reactivarConcepto, eliminarConcepto, eliminarTodosConceptos,
} from '../services/conceptosService';
import './Gastos.css';
import './Estructura.css';

const ItemConcepto = ({ c, archivado, categorias, grupos, onGuardar, onToggle, onBorrar }) => {
  const [nombre, setNombre] = useState(c.nombre);
  const frec = c.frecuencia || 'mensual';

  const commitNombre = () => {
    const limpio = nombre.trim();
    if (!limpio || limpio === c.nombre) { setNombre(c.nombre); return; }
    onGuardar(c, { nombre: limpio });
  };

  return (
    <div className={`concepto-fila ${archivado ? 'archivado' : ''}`}>
      <input className="cf-nombre" value={nombre} maxLength={60}
        onChange={(e) => setNombre(e.target.value)} onBlur={commitNombre}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
      <select className="cat-select" value={c.tipo || 'gasto'} onChange={(e) => onGuardar(c, { tipo: e.target.value })}>
        <option value="gasto">💸 Gasto</option>
        <option value="ingreso">💰 Ingreso</option>
      </select>
      <select className="cat-select" value={c.categoriaId || ''} onChange={(e) => onGuardar(c, { categoriaId: e.target.value })}>
        <option value="">— Categoría —</option>
        {categorias.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.nombre}</option>)}
      </select>
      <select className="cat-select" value={c.grupoId || ''} onChange={(e) => onGuardar(c, { grupoId: e.target.value })}>
        <option value="">— Grupo —</option>
        {grupos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
      </select>
      <select className="cat-select" value={frec} onChange={(e) => onGuardar(c, { frecuencia: e.target.value })}>
        {FRECUENCIAS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
      {frec !== 'mensual' && (
        <input className="cat-select cf-mes" type="month" defaultValue={c.mesAncla || ''}
          title={frec === 'unica' ? 'Mes' : 'Desde el mes'}
          onChange={(e) => onGuardar(c, { mesAncla: e.target.value })} />
      )}
      <div className="cf-acciones">
        <button className="suelto-borrar" onClick={() => onToggle(c)} title={archivado ? 'Reactivar' : 'Archivar'}>
          {archivado ? '↩️' : '📥'}
        </button>
        <button className="suelto-borrar" onClick={() => onBorrar(c)} title="Borrar">🗑️</button>
      </div>
    </div>
  );
};

const Conceptos = () => {
  const { hogar } = useHogar();
  const hogarId = hogar?.id;
  const { categorias, grupos, getGrp } = useEstructura();
  const [conceptos, setConceptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [frecuencia, setFrecuencia] = useState('mensual');
  const [tipo, setTipo] = useState('gasto');
  const [vista, setVista] = useState('grupo');

  const cargar = useCallback(async () => {
    if (!hogarId) return;
    setLoading(true);
    setConceptos(await listarConceptos(hogarId));
    setLoading(false);
  }, [hogarId]);
  useEffect(() => { cargar(); }, [cargar]);

  const agregar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    await crearConcepto(hogarId, { nombre, categoriaId, grupoId, frecuencia, tipo }, conceptos.length);
    setNombre(''); setCategoriaId(''); setGrupoId(''); setFrecuencia('mensual'); setTipo('gasto');
    await cargar();
  };

  const guardar = async (c, datos) => {
    await actualizarConcepto(hogarId, c.id, datos);
    setConceptos((p) => p.map((x) => (x.id === c.id ? { ...x, ...datos } : x)));
  };
  const toggle = async (c) => {
    if (c.activo) await archivarConcepto(hogarId, c.id);
    else await reactivarConcepto(hogarId, c.id);
    setConceptos((p) => p.map((x) => (x.id === c.id ? { ...x, activo: !x.activo } : x)));
  };
  const borrar = async (c) => {
    if (!window.confirm(`¿Borrar el concepto "${c.nombre}"?`)) return;
    await eliminarConcepto(hogarId, c.id);
    setConceptos((p) => p.filter((x) => x.id !== c.id));
  };
  const borrarTodos = async () => {
    if (!conceptos.length || !window.confirm(`¿Borrar los ${conceptos.length} conceptos?`)) return;
    await eliminarTodosConceptos(hogarId);
    setConceptos([]);
  };

  const activos = conceptos.filter((c) => c.activo);
  const archivados = conceptos.filter((c) => !c.activo);

  const grid = (arr, arch) => (
    <div className="filas-lista">
      {arr.map((c) => (
        <ItemConcepto key={c.id} c={c} archivado={arch} categorias={categorias} grupos={grupos}
          onGuardar={guardar} onToggle={toggle} onBorrar={borrar} />
      ))}
    </div>
  );

  const porGrupo = () => {
    const orden = [], mapa = {};
    activos.forEach((c) => {
      const k = c.grupoId || '';
      if (!mapa[k]) { mapa[k] = []; orden.push(k); }
      mapa[k].push(c);
    });
    return orden.sort((a, b) => (a === '' ? 1 : 0) - (b === '' ? 1 : 0))
      .map((k) => ({ nombre: k ? (getGrp(k)?.nombre || 'Grupo') : 'Sin grupo', items: mapa[k] }));
  };

  return (
    <Layout>
      <div className="gastos-page ancho">
        <header className="pg-header">
          <div>
            <h1>📄 Conceptos</h1>
            <p className="pg-sub">Cada ítem que cargás por mes (ej: Edesur Dolores)</p>
          </div>
        </header>

        <section className="card">
          <h2 className="card-titulo">Nuevo concepto</h2>
          <form className="suelto-form" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', marginBottom: 0 }} onSubmit={agregar}>
            <input type="text" placeholder="Nombre (ej: Edesur Dolores)" value={nombre}
              onChange={(e) => setNombre(e.target.value)} maxLength={60} />
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="gasto">💸 Gasto</option>
              <option value="ingreso">💰 Ingreso</option>
            </select>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">Categoría…</option>
              {categorias.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.nombre}</option>)}
            </select>
            <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
              <option value="">Grupo…</option>
              {grupos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select>
            <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)}>
              {FRECUENCIAS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <button type="submit">+ Agregar</button>
          </form>
        </section>

        {loading ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : (
          <>
            <section className="card">
              <h2 className="card-titulo">
                <span>Activos <span className="card-sub">{activos.length}</span></span>
                <div className="cc-titulo-acciones">
                  <div className="cc-toggle">
                    <button className={vista === 'lista' ? 'activo' : ''} onClick={() => setVista('lista')}>Lista</button>
                    <button className={vista === 'grupo' ? 'activo' : ''} onClick={() => setVista('grupo')}>Por grupo</button>
                  </div>
                  {conceptos.length > 0 && <button className="btn-borrar-todos" onClick={borrarTodos}>Borrar todos</button>}
                </div>
              </h2>
              {activos.length === 0 ? (
                <p className="pg-vacio-inline">Agregá tu primer concepto arriba.</p>
              ) : vista === 'lista' ? grid(activos, false) : (
                <div className="cc-grupos">
                  {porGrupo().map((g) => (
                    <div className="cc-grupo" key={g.nombre}>
                      <div className="cc-grupo-head"><span>{g.nombre}</span><span className="card-sub">{g.items.length}</span></div>
                      {grid(g.items, false)}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {archivados.length > 0 && (
              <section className="card">
                <h2 className="card-titulo">Archivados <span className="card-sub">{archivados.length}</span></h2>
                {grid(archivados, true)}
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Conceptos;
