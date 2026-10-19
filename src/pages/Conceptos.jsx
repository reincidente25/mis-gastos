// src/pages/Conceptos.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ItemConcepto from '../components/conceptos/ItemConcepto';
import NuevoConcepto from '../components/conceptos/NuevoConcepto';
import { useHogar } from '../context/HogarContext';
import { useEstructura } from '../context/EstructuraContext';
import {
  listarConceptos, crearConcepto, actualizarConcepto,
  archivarConcepto, reactivarConcepto, eliminarConcepto, eliminarTodosConceptos,
} from '../services/conceptosService';
import './Gastos.css';
import './Estructura.css';

const Conceptos = () => {
  const { hogar } = useHogar();
  const hogarId = hogar?.id;
  const { categorias, grupos, getGrp } = useEstructura();
  const [conceptos, setConceptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState('grupo');
  const [q, setQ] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const destacado = searchParams.get('c');

  // Al llegar desde un chip de Grupos, resaltar y centrar ese concepto.
  useEffect(() => {
    if (!destacado || loading) return;
    const el = document.getElementById(`concepto-${destacado}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setSearchParams({}, { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [destacado, loading, setSearchParams]);

  const cargar = useCallback(async () => {
    if (!hogarId) return;
    setLoading(true);
    setConceptos(await listarConceptos(hogarId));
    setLoading(false);
  }, [hogarId]);
  useEffect(() => { cargar(); }, [cargar]);

  const agregar = async (datos) => {
    await crearConcepto(hogarId, datos, conceptos.length);
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

  // Filtro por nombre, grupo o categoría.
  const coincide = (c) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    const cat = categorias.find((x) => x.id === c.categoriaId)?.nombre || '';
    const grp = getGrp(c.grupoId)?.nombre || '';
    return (
      c.nombre.toLowerCase().includes(t) ||
      cat.toLowerCase().includes(t) ||
      grp.toLowerCase().includes(t)
    );
  };

  const activos = conceptos.filter((c) => c.activo && coincide(c));
  const archivados = conceptos.filter((c) => !c.activo && coincide(c));

  const grid = (arr, arch) => (
    <div className="filas-lista">
      {arr.map((c) => (
        <ItemConcepto key={c.id} c={c} archivado={arch} resaltado={c.id === destacado}
          categorias={categorias} grupos={grupos}
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
          <div className="cf-buscador">
            <input type="search" placeholder="🔍 Buscar por nombre, grupo o categoría…"
              value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button className="cf-buscador-x" onClick={() => setQ('')} title="Limpiar">✕</button>}
          </div>
        </header>

        {loading ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : (
          <>
            <section className="card">
              <h2 className="card-titulo">
                <span>Conceptos <span className="card-sub">{activos.length}</span></span>
                <div className="cc-titulo-acciones">
                  <div className="cc-toggle">
                    <button className={vista === 'lista' ? 'activo' : ''} onClick={() => setVista('lista')}>Lista</button>
                    <button className={vista === 'grupo' ? 'activo' : ''} onClick={() => setVista('grupo')}>Por grupo</button>
                  </div>
                  {conceptos.length > 0 && <button className="btn-borrar-todos" onClick={borrarTodos}>Borrar todos</button>}
                </div>
              </h2>

              {/* Fila para agregar un concepto nuevo (arriba de todo) */}
              <NuevoConcepto categorias={categorias} grupos={grupos} onCrear={agregar} />

              {activos.length === 0 && q.trim() && (
                <p className="pg-vacio-inline">Sin conceptos que coincidan con “{q.trim()}”.</p>
              )}

              {activos.length > 0 && (
                vista === 'lista' ? grid(activos, false) : (
                  <div className="cc-grupos">
                    {porGrupo().map((g) => (
                      <div className="cc-grupo" key={g.nombre}>
                        <div className="cc-grupo-head"><span>{g.nombre}</span><span className="card-sub">{g.items.length}</span></div>
                        {grid(g.items, false)}
                      </div>
                    ))}
                  </div>
                )
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
