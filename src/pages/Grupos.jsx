// src/pages/Grupos.jsx
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useEstructura } from '../context/EstructuraContext';
import './Gastos.css';
import './Estructura.css';

const Grupos = () => {
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
    <Layout>
      <div className="gastos-page ancho">
        <header className="pg-header">
          <div>
            <h1>📁 Grupos</h1>
            <p className="pg-sub">Juntan varios conceptos (ej: Dolores agrupa sus servicios)</p>
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

        <section className="card">
          <h2 className="card-titulo">Grupos <span className="card-sub">{grupos.length}</span></h2>
          {grupos.length === 0 ? (
            <p className="pg-vacio-inline">Todavía no creaste grupos.</p>
          ) : (
            <div className="cards-grid">
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
      </div>
    </Layout>
  );
};

export default Grupos;
