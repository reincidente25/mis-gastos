// src/pages/Gastos.jsx
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import AmountInput from '../components/AmountInput';
import { useGastosMes } from '../hooks/useGastosMes';
import { CATEGORIAS, getCategoria } from '../config/categorias';
import { formatMoneda, mesActual } from '../utils/format';
import './Gastos.css';

// Agrupa conceptos por `grupo`, preservando el orden de aparición.
// Devuelve [{ grupo, items }]; grupo '' = sueltos (sin encabezado).
const agruparConceptos = (conceptos) => {
  const orden = [];
  const mapa = {};
  conceptos.forEach((c) => {
    const key = c.grupo || '';
    if (!mapa[key]) { mapa[key] = { grupo: key, items: [] }; orden.push(key); }
    mapa[key].items.push(c);
  });
  return orden.map((k) => mapa[k]);
};

const subtotalGrupo = (items, porConcepto) =>
  items.reduce((acc, c) => acc + (Number(porConcepto[c.id]?.monto) || 0), 0);

// Nombre a mostrar: si está dentro de un grupo y el nombre empieza con el
// grupo, mostramos solo la parte distintiva (ej: "Edesur Dolores" -> "Dolores").
const nombreCorto = (c) => {
  if (c.grupo && c.nombre.toLowerCase().startsWith(c.grupo.toLowerCase())) {
    const resto = c.nombre.slice(c.grupo.length).trim();
    return resto || c.nombre;
  }
  return c.nombre;
};

const ConceptoRow = ({ concepto, valor, onCommit, dentroDeGrupo }) => {
  const cat = getCategoria(concepto.categoria);
  return (
    <div className={`concepto-row ${dentroDeGrupo ? 'en-grupo' : ''}`}>
      <span className="cr-icono" style={{ background: `${cat.color}1a`, color: cat.color }}>
        {cat.icon}
      </span>
      <span className="cr-nombre">
        {dentroDeGrupo ? nombreCorto(concepto) : concepto.nombre}
        <span className="cr-cat">{cat.label}</span>
      </span>
      <AmountInput value={valor} onCommit={(monto) => onCommit(concepto, monto)} />
    </div>
  );
};

const Gastos = () => {
  const [mes, setMes] = useState(mesActual());
  const {
    conceptos, porConcepto, sueltos,
    loading, error, total,
    setImporte, agregarSuelto, borrar,
  } = useGastosMes(mes);

  return (
    <Layout>
      <div className="gastos-page">
        <header className="pg-header">
          <div>
            <h1>💸 Gastos</h1>
            <p className="pg-sub">Completá el importe de cada concepto del mes</p>
          </div>
          <MesSelector mes={mes} onChange={setMes} />
        </header>

        <div className="total-card">
          <span className="tc-label">Total del mes</span>
          <span className="tc-valor">{formatMoneda(total)}</span>
        </div>

        {loading ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : error ? (
          <p className="pg-error">{error}</p>
        ) : (
          <>
            <section className="card">
              <h2 className="card-titulo">Conceptos recurrentes</h2>
              {conceptos.length === 0 ? (
                <p className="pg-vacio-inline">
                  No hay conceptos. Agregalos desde la sección <strong>Conceptos</strong>.
                </p>
              ) : (
                <div className="concepto-lista">
                  {agruparConceptos(conceptos).map((g) =>
                    g.grupo ? (
                      <div className="grupo-bloque" key={`g-${g.grupo}`}>
                        <div className="grupo-head">
                          <span className="grupo-nombre">{g.grupo}</span>
                          <span className="grupo-subtotal">{formatMoneda(subtotalGrupo(g.items, porConcepto))}</span>
                        </div>
                        {g.items.map((c) => (
                          <ConceptoRow key={c.id} concepto={c} dentroDeGrupo
                            valor={porConcepto[c.id]?.monto} onCommit={setImporte} />
                        ))}
                      </div>
                    ) : (
                      g.items.map((c) => (
                        <ConceptoRow key={c.id} concepto={c}
                          valor={porConcepto[c.id]?.monto} onCommit={setImporte} />
                      ))
                    )
                  )}
                </div>
              )}
            </section>

            <GastosSueltos
              sueltos={sueltos}
              onAgregar={agregarSuelto}
              onBorrar={borrar}
            />
          </>
        )}
      </div>
    </Layout>
  );
};

// ── Gastos sueltos (no recurrentes) ──
const GastosSueltos = ({ sueltos, onAgregar, onBorrar }) => {
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto]       = useState('');
  const [categoria, setCategoria] = useState('otros');
  const [guardando, setGuardando] = useState(false);

  const totalSueltos = sueltos.reduce((a, g) => a + (Number(g.monto) || 0), 0);

  const handleAgregar = async (e) => {
    e.preventDefault();
    if (!concepto.trim() || !Number(monto)) return;
    setGuardando(true);
    try {
      await onAgregar({ concepto, monto, categoria });
      setConcepto(''); setMonto(''); setCategoria('otros');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="card">
      <h2 className="card-titulo">
        Gastos del mes (sueltos)
        {sueltos.length > 0 && <span className="card-sub">{formatMoneda(totalSueltos)}</span>}
      </h2>

      <form className="suelto-form" onSubmit={handleAgregar}>
        <input
          type="text"
          placeholder="Concepto (ej: Super, Farmacia)"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          maxLength={80}
        />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
          ))}
        </select>
        <input
          type="number" min="0" step="0.01" placeholder="Monto"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
        <button type="submit" disabled={guardando}>+ Agregar</button>
      </form>

      {sueltos.length > 0 && (
        <div className="suelto-lista">
          {sueltos.map((g) => {
            const cat = getCategoria(g.categoria);
            return (
              <div className="suelto-row" key={g.id}>
                <span className="cr-icono" style={{ background: `${cat.color}1a`, color: cat.color }}>
                  {cat.icon}
                </span>
                <span className="cr-nombre">{g.concepto}<span className="cr-cat">{cat.label}</span></span>
                <span className="suelto-monto">{formatMoneda(g.monto)}</span>
                <button className="suelto-borrar" onClick={() => onBorrar(g.id)} aria-label="Eliminar">🗑️</button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Gastos;
