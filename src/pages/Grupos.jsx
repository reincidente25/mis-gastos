// src/pages/Grupos.jsx
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { useHogar } from '../context/HogarContext';
import { useEstructura } from '../context/EstructuraContext';
import { listarConceptos } from '../services/conceptosService';
import './Gastos.css';
import './Estructura.css';

const Grupos = () => {
  const { hogar } = useHogar();
  const hogarId = hogar?.id;
  const { grupos, getCat, addGrupo, editGrupo, delGrupo } = useEstructura();
  const [nombre, setNombre] = useState('');
  const [conceptos, setConceptos] = useState([]);
  const [cerrados, setCerrados] = useState({});
  const toggle = (id) => setCerrados((c) => ({ ...c, [id]: !c[id] }));

  const cargar = useCallback(async () => {
    if (!hogarId) return;
    setConceptos(await listarConceptos(hogarId));
  }, [hogarId]);
  useEffect(() => { cargar(); }, [cargar]);

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

  const conceptosDe = (grupoId) => conceptos.filter((c) => c.activo && c.grupoId === grupoId);
  const sinGrupo = conceptos.filter((c) => c.activo && !c.grupoId);

  const ChipConcepto = ({ c }) => {
    const cat = getCat(c.categoriaId);
    return (
      <span className={`concepto-chip ${c.tipo === 'ingreso' ? 'es-ingreso' : ''}`}
        style={{ borderColor: `${cat.color}55` }} title={cat.nombre}>
        <span className="chip-icono" style={{ color: cat.color }}>{cat.icon}</span>
        {c.nombre}
      </span>
    );
  };

  return (
    <Layout>
      <div className="gastos-page ancho">
        <header className="pg-header">
          <div>
            <h1>📁 Grupos</h1>
            <p className="pg-sub">Cada grupo con los conceptos que tiene asignados</p>
          </div>
        </header>

        <section className="card">
          <h2 className="card-titulo">Nuevo grupo</h2>
          <form className="suelto-form" style={{ gridTemplateColumns: '1fr auto', marginBottom: 0 }} onSubmit={agregar}>
            <input type="text" placeholder="Nombre (ej: Dolores)" value={nombre}
              onChange={(e) => setNombre(e.target.value)} maxLength={30} />
            <button type="submit">+ Agregar</button>
          </form>
        </section>

        {grupos.length === 0 ? (
          <section className="card"><p className="pg-vacio-inline">Todavía no creaste grupos.</p></section>
        ) : (
          <div className="arbol-lista">
            {grupos.map((g) => {
              const items = conceptosDe(g.id);
              const abierto = !cerrados[g.id];
              return (
                <div className="grupo-arbol" key={g.id}>
                  <div className="grupo-arbol-head">
                    <button className="ga-toggle" onClick={() => toggle(g.id)} title={abierto ? 'Colapsar' : 'Expandir'}>
                      {abierto ? '▾' : '▸'}
                    </button>
                    <span className="ga-chip">📁</span>
                    <input className="cc-nombre-input" defaultValue={g.nombre} maxLength={30}
                      onBlur={(e) => e.target.value.trim() && editGrupo(g.id, { nombre: e.target.value.trim() })}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                    <span className="ga-count">{items.length}</span>
                    <button className="suelto-borrar" onClick={() => borrar(g)} title="Borrar">🗑️</button>
                  </div>
                  {abierto && (
                    <div className="grupo-arbol-items">
                      {items.length === 0
                        ? <span className="ga-vacio">Sin conceptos asignados</span>
                        : items.map((c) => <ChipConcepto key={c.id} c={c} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {sinGrupo.length > 0 && (
          <section className="card">
            <h2 className="card-titulo">Sin grupo <span className="card-sub">{sinGrupo.length}</span></h2>
            <div className="grupo-arbol-items">
              {sinGrupo.map((c) => <ChipConcepto key={c.id} c={c} />)}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default Grupos;
