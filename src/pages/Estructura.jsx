// src/pages/Estructura.jsx
// Construcción del árbol: Categorías → Conceptos → Grupos.
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { useHogar } from '../context/HogarContext';
import { useEstructura } from '../context/EstructuraContext';
import { ICONOS_CATEGORIA, COLORES_CATEGORIA } from '../config/categorias';
import { FRECUENCIAS } from '../config/frecuencias';
import {
  listarConceptos, crearConcepto, actualizarConcepto,
  archivarConcepto, reactivarConcepto, eliminarConcepto, eliminarTodosConceptos,
} from '../services/conceptosService';
import './Gastos.css';
import './Estructura.css';

const TABS = [
  { id: 'categorias', label: '🏷️ Categorías' },
  { id: 'conceptos',  label: '📄 Conceptos' },
  { id: 'grupos',     label: '📁 Grupos' },
];

const Estructura = () => {
  const [tab, setTab] = useState('categorias');
  return (
    <Layout>
      <div className="gastos-page">
        <header className="pg-header">
          <div>
            <h1>🧱 Estructura</h1>
            <p className="pg-sub">Armá tu árbol: categorías, conceptos y grupos</p>
          </div>
        </header>

        <div className="est-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'activo' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'categorias' && <TabCategorias />}
        {tab === 'conceptos'  && <TabConceptos />}
        {tab === 'grupos'     && <TabGrupos />}
      </div>
    </Layout>
  );
};

// ─────────────── CATEGORÍAS ───────────────
const TabCategorias = () => {
  const { categorias, addCategoria, editCategoria, delCategoria } = useEstructura();
  const [nombre, setNombre] = useState('');
  const [icon, setIcon] = useState(ICONOS_CATEGORIA[0]);
  const [color, setColor] = useState(COLORES_CATEGORIA[0]);

  const agregar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    await addCategoria({ nombre, icon, color });
    setNombre('');
  };

  const borrar = (c) => {
    if (window.confirm(`¿Borrar la categoría "${c.nombre}"? Los conceptos que la usaban quedarán sin categoría.`)) {
      delCategoria(c.id);
    }
  };

  return (
    <>
      <section className="card">
        <h2 className="card-titulo">Nueva categoría</h2>
        <form className="cat-form" onSubmit={agregar}>
          <input type="text" placeholder="Nombre (ej: Servicios)" value={nombre}
            onChange={(e) => setNombre(e.target.value)} maxLength={30} />
          <select value={icon} onChange={(e) => setIcon(e.target.value)}>
            {ICONOS_CATEGORIA.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <div className="color-picker">
            {COLORES_CATEGORIA.map((c) => (
              <button type="button" key={c} className={`swatch ${color === c ? 'sel' : ''}`}
                style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
          <button type="submit" className="est-add">+ Agregar</button>
        </form>
      </section>

      <section className="card">
        <h2 className="card-titulo">Categorías <span className="card-sub">{categorias.length}</span></h2>
        <div className="cc-lista">
          {categorias.map((c) => (
            <div className="cat-item" key={c.id}>
              <span className="cat-chip" style={{ background: `${c.color}1a`, color: c.color }}>{c.icon}</span>
              <input className="cc-nombre-input" defaultValue={c.nombre} maxLength={30}
                onBlur={(e) => e.target.value.trim() && editCategoria(c.id, { nombre: e.target.value.trim() })}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
              <select className="cat-select" value={c.icon} onChange={(e) => editCategoria(c.id, { icon: e.target.value })}>
                {ICONOS_CATEGORIA.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
              <div className="color-picker mini">
                {COLORES_CATEGORIA.map((col) => (
                  <button key={col} className={`swatch ${c.color === col ? 'sel' : ''}`}
                    style={{ background: col }} onClick={() => editCategoria(c.id, { color: col })} />
                ))}
              </div>
              <button className="suelto-borrar" onClick={() => borrar(c)} title="Borrar">🗑️</button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

// ─────────────── GRUPOS ───────────────
const TabGrupos = () => {
  const { grupos, addGrupo, editGrupo, delGrupo } = useEstructura();
  const [nombre, setNombre] = useState('');

  const agregar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    await addGrupo(nombre);
    setNombre('');
  };
  const borrar = (g) => {
    if (window.confirm(`¿Borrar el grupo "${g.nombre}"? Los conceptos que lo usaban quedarán sin grupo.`)) {
      delGrupo(g.id);
    }
  };

  return (
    <>
      <section className="card">
        <h2 className="card-titulo">Nuevo grupo</h2>
        <form className="suelto-form" style={{ gridTemplateColumns: '1fr auto', marginBottom: 0 }} onSubmit={agregar}>
          <input type="text" placeholder="Nombre (ej: Dolores)" value={nombre}
            onChange={(e) => setNombre(e.target.value)} maxLength={30} />
          <button type="submit">+ Agregar</button>
        </form>
        <p className="pg-vacio-inline" style={{ marginTop: 10 }}>
          Un grupo junta varios conceptos (ej: <em>Dolores</em> agrupa Edesur, Metrogas, Expensas…).
        </p>
      </section>

      <section className="card">
        <h2 className="card-titulo">Grupos <span className="card-sub">{grupos.length}</span></h2>
        {grupos.length === 0 ? (
          <p className="pg-vacio-inline">Todavía no creaste grupos.</p>
        ) : (
          <div className="cc-lista">
            {grupos.map((g) => (
              <div className="cat-item" key={g.id}>
                <span className="cat-chip" style={{ background: '#4f46e51a', color: '#4f46e5' }}>📁</span>
                <input className="cc-nombre-input" defaultValue={g.nombre} maxLength={30}
                  onBlur={(e) => e.target.value.trim() && editGrupo(g.id, { nombre: e.target.value.trim() })}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                <button className="suelto-borrar" onClick={() => borrar(g)} title="Borrar">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

// ─────────────── CONCEPTOS ───────────────
const ItemConcepto = ({ c, archivado, categorias, grupos, onGuardar, onToggle, onBorrar }) => {
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
        <input className="cc-nombre-input" value={nombre} maxLength={60}
          onChange={(e) => setNombre(e.target.value)} onBlur={commitNombre}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
        <button className="suelto-borrar" onClick={() => onToggle(c)} title={archivado ? 'Reactivar' : 'Archivar'}>
          {archivado ? '↩️' : '📥'}
        </button>
        <button className="suelto-borrar" onClick={() => onBorrar(c)} title="Borrar">🗑️</button>
      </div>
      <div className="cc-fields">
        <label><span>Categoría</span>
          <select className="cat-select" value={c.categoriaId || ''} onChange={(e) => onGuardar(c, { categoriaId: e.target.value })}>
            <option value="">— Sin categoría —</option>
            {categorias.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.nombre}</option>)}
          </select>
        </label>
        <label><span>Grupo</span>
          <select className="cat-select" value={c.grupoId || ''} onChange={(e) => onGuardar(c, { grupoId: e.target.value })}>
            <option value="">— Sin grupo —</option>
            {grupos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </select>
        </label>
        <label><span>Frecuencia</span>
          <select className="cat-select" value={frec} onChange={(e) => onGuardar(c, { frecuencia: e.target.value })}>
            {FRECUENCIAS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        {frec !== 'mensual' && (
          <label><span>{frec === 'unica' ? 'Mes' : 'Desde el mes'}</span>
            <input className="cat-select" type="month" defaultValue={c.mesAncla || ''}
              onChange={(e) => onGuardar(c, { mesAncla: e.target.value })} />
          </label>
        )}
      </div>
    </div>
  );
};

const TabConceptos = () => {
  const { hogar } = useHogar();
  const hogarId = hogar?.id;
  const { categorias, grupos, getGrp } = useEstructura();
  const [conceptos, setConceptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [frecuencia, setFrecuencia] = useState('mensual');
  const [vista, setVista] = useState('lista');

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
    await crearConcepto(hogarId, { nombre, categoriaId, grupoId, frecuencia }, conceptos.length);
    setNombre(''); setCategoriaId(''); setGrupoId(''); setFrecuencia('mensual');
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

  const cards = (arr, arch) => (
    <div className="cc-lista">
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
    <>
      <section className="card">
        <h2 className="card-titulo">Nuevo concepto</h2>
        <form className="suelto-form" style={{ gridTemplateColumns: '1fr 140px 140px 130px auto', marginBottom: 0 }} onSubmit={agregar}>
          <input type="text" placeholder="Nombre (ej: Edesur Dolores)" value={nombre}
            onChange={(e) => setNombre(e.target.value)} maxLength={60} />
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
            ) : vista === 'lista' ? cards(activos, false) : (
              <div className="cc-grupos">
                {porGrupo().map((g) => (
                  <div className="cc-grupo" key={g.nombre}>
                    <div className="cc-grupo-head"><span>{g.nombre}</span><span className="card-sub">{g.items.length}</span></div>
                    {cards(g.items, false)}
                  </div>
                ))}
              </div>
            )}
          </section>

          {archivados.length > 0 && (
            <section className="card">
              <h2 className="card-titulo">Archivados <span className="card-sub">{archivados.length}</span></h2>
              {cards(archivados, true)}
            </section>
          )}
        </>
      )}
    </>
  );
};

export default Estructura;
