// src/pages/Gastos.jsx
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import AmountInput from '../components/AmountInput';
import { useGastosMes } from '../hooks/useGastosMes';
import { CATEGORIAS, getCategoria } from '../config/categorias';
import { getFrecuencia } from '../config/frecuencias';
import { formatMoneda, mesActual, aplicaEnMes } from '../utils/format';
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

// Editor del desglose de un concepto para el mes.
const DesgloseEditor = ({ items, onChange }) => {
  const [lista, setLista] = useState(
    items.length ? items.map((it) => ({ ...it })) : [{ detalle: '', monto: '' }]
  );

  const commit = (next) => {
    setLista(next);
    onChange(next);
  };
  const editar = (i, campo, val) => {
    const next = lista.map((it, idx) => (idx === i ? { ...it, [campo]: val } : it));
    setLista(next); // escribir local al tipear; persistir en blur
  };
  const persistir = () => onChange(lista);
  const agregar = () => commit([...lista, { detalle: '', monto: '' }]);
  const quitar = (i) => commit(lista.filter((_, idx) => idx !== i));

  const subtotal = lista.reduce((a, it) => a + (Number(it.monto) || 0), 0);

  return (
    <div className="desglose">
      {lista.map((it, i) => (
        <div className="desglose-row" key={i}>
          <input
            className="desglose-detalle" type="text" placeholder="Detalle (ej: Cuota)"
            value={it.detalle} maxLength={60}
            onChange={(e) => editar(i, 'detalle', e.target.value)}
            onBlur={persistir}
          />
          <input
            className="desglose-monto" type="number" min="0" step="0.01" placeholder="0"
            value={it.monto}
            onChange={(e) => editar(i, 'monto', e.target.value)}
            onBlur={persistir}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
          <button className="suelto-borrar" onClick={() => quitar(i)} title="Quitar">✕</button>
        </div>
      ))}
      <div className="desglose-pie">
        <button className="desglose-add" onClick={agregar}>+ Agregar ítem</button>
        <span className="desglose-sub">Subtotal: {formatMoneda(subtotal)}</span>
      </div>
    </div>
  );
};

const ConceptoRow = ({ concepto, gasto, dentroDeGrupo, onGuardarMonto, onGuardarDetalle }) => {
  const cat = getCategoria(concepto.categoria);
  const items = gasto?.items || [];
  const tieneItems = items.length > 0;
  const [abierto, setAbierto] = useState(false);

  const empezarDesglose = () => {
    setAbierto(true);
    onGuardarDetalle(concepto, [{ detalle: '', monto: gasto?.monto || '' }]);
  };

  return (
    <>
      <div className={`concepto-row ${dentroDeGrupo ? 'en-grupo' : ''}`}>
        <span className="cr-icono" style={{ background: `${cat.color}1a`, color: cat.color }}>
          {cat.icon}
        </span>
        <span className="cr-nombre">
          <span>
            {dentroDeGrupo ? nombreCorto(concepto) : concepto.nombre}
            {concepto.frecuencia && concepto.frecuencia !== 'mensual' && (
              <span className="cr-frec">{getFrecuencia(concepto.frecuencia).corto}</span>
            )}
          </span>
          <span className="cr-cat">
            {cat.label}{tieneItems ? ` · ${items.length} ítems` : ''}
          </span>
        </span>

        {tieneItems ? (
          <button className="cr-total-btn" onClick={() => setAbierto((a) => !a)}>
            {formatMoneda(gasto.monto)} <span className="cr-chevron">{abierto ? '▾' : '▸'}</span>
          </button>
        ) : (
          <div className="cr-derecha">
            <AmountInput value={gasto?.monto} onCommit={(monto) => onGuardarMonto(concepto, monto)} />
            <button className="cr-desglosar" title="Desglosar en ítems" onClick={empezarDesglose}>⋯</button>
          </div>
        )}
      </div>

      {abierto && tieneItems && (
        <DesgloseEditor
          key={`${concepto.id}-${items.length}`}
          items={items}
          onChange={(nuevos) => onGuardarDetalle(concepto, nuevos)}
        />
      )}
    </>
  );
};

const Gastos = () => {
  const [mes, setMes] = useState(mesActual());
  const [verTodos, setVerTodos] = useState(false);
  const {
    conceptos, porConcepto, sueltos,
    loading, error, total,
    setImporte, setDetalle, agregarSuelto, borrar,
  } = useGastosMes(mes);

  // Mostrar los conceptos que aplican al mes (según frecuencia) o que ya
  // tengan un importe cargado. Con "ver todos", se muestran todos.
  const visibles = verTodos
    ? conceptos
    : conceptos.filter((c) => aplicaEnMes(c, mes) || porConcepto[c.id]);
  const ocultos = conceptos.length - visibles.length;

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
              <h2 className="card-titulo">
                <span>Conceptos del mes</span>
                {conceptos.length > 0 && (
                  <label className="ver-todos">
                    <input type="checkbox" checked={verTodos} onChange={(e) => setVerTodos(e.target.checked)} />
                    Ver todos{!verTodos && ocultos > 0 ? ` (+${ocultos})` : ''}
                  </label>
                )}
              </h2>
              {conceptos.length === 0 ? (
                <p className="pg-vacio-inline">
                  No hay conceptos. Agregalos desde la sección <strong>Conceptos</strong>.
                </p>
              ) : visibles.length === 0 ? (
                <p className="pg-vacio-inline">
                  Ningún concepto aplica a este mes. Activá <strong>Ver todos</strong> para verlos igual.
                </p>
              ) : (
                <div className="concepto-lista">
                  {agruparConceptos(visibles).map((g) =>
                    g.grupo ? (
                      <div className="grupo-bloque" key={`g-${g.grupo}`}>
                        <div className="grupo-head">
                          <span className="grupo-nombre">{g.grupo}</span>
                          <span className="grupo-subtotal">{formatMoneda(subtotalGrupo(g.items, porConcepto))}</span>
                        </div>
                        {g.items.map((c) => (
                          <ConceptoRow key={c.id} concepto={c} dentroDeGrupo
                            gasto={porConcepto[c.id]} onGuardarMonto={setImporte} onGuardarDetalle={setDetalle} />
                        ))}
                      </div>
                    ) : (
                      g.items.map((c) => (
                        <ConceptoRow key={c.id} concepto={c}
                          gasto={porConcepto[c.id]} onGuardarMonto={setImporte} onGuardarDetalle={setDetalle} />
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
