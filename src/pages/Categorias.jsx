// src/pages/Categorias.jsx
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useEstructura } from '../context/EstructuraContext';
import { ICONOS_CATEGORIA, COLORES_CATEGORIA } from '../config/categorias';
import './Gastos.css';
import './Estructura.css';

// Muestra solo el color elegido; al tocarlo abre la paleta.
const ColorDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="color-dd">
      <button type="button" className="color-dd-btn" style={{ background: value }}
        onClick={() => setOpen((o) => !o)} title="Cambiar color" />
      {open && (
        <>
          <div className="color-dd-backdrop" onClick={() => setOpen(false)} />
          <div className="color-dd-pop">
            {COLORES_CATEGORIA.map((c) => (
              <button key={c} type="button" className={`swatch ${value === c ? 'sel' : ''}`}
                style={{ background: c }} onClick={() => { onChange(c); setOpen(false); }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Categorias = () => {
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
    <Layout>
      <div className="gastos-page ancho">
        <header className="pg-header">
          <div>
            <h1>🏷️ Categorías</h1>
            <p className="pg-sub">El tipo de cada gasto (Servicios, Impuestos…)</p>
          </div>
        </header>

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
          <div className="cards-grid">
            {categorias.map((c) => (
              <div className="cat-item" key={c.id}>
                <span className="cat-chip" style={{ background: `${c.color}1a`, color: c.color }}>{c.icon}</span>
                <input className="cc-nombre-input" defaultValue={c.nombre} maxLength={30}
                  onBlur={(e) => e.target.value.trim() && editCategoria(c.id, { nombre: e.target.value.trim() })}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                <select className="cat-select" value={c.icon} onChange={(e) => editCategoria(c.id, { icon: e.target.value })}>
                  {ICONOS_CATEGORIA.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
                <ColorDropdown value={c.color} onChange={(col) => editCategoria(c.id, { color: col })} />
                <button className="suelto-borrar" onClick={() => borrar(c)} title="Borrar">🗑️</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Categorias;
