// src/pages/Gastos.jsx
import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import AmountInput from '../components/AmountInput';
import { useGastosMes } from '../hooks/useGastosMes';
import { useEstructura } from '../context/EstructuraContext';
import { getFrecuencia } from '../config/frecuencias';
import { formatMoneda, mesActual, aplicaEnMes, hoy } from '../utils/format';
import './Gastos.css';

// Estado de un concepto en el mes: pagado / vencido / pendiente / falta cargar.
const estadoGasto = (gasto) => {
  if (!gasto) return 'sincargar';
  if (gasto.pagado) return 'pagado';
  if (gasto.vencimiento && gasto.vencimiento < hoy()) return 'vencido';
  return 'pendiente';
};
const ESTADO_LABEL = {
  pagado: 'Pagado', vencido: 'Vencido', pendiente: 'Pendiente', sincargar: 'Falta cargar',
};

// Agrupa conceptos por grupoId, preservando el orden de aparición.
// Devuelve [{ grupoId, items }]; grupoId '' = sin grupo (sin encabezado).
const agruparConceptos = (conceptos) => {
  const orden = [];
  const mapa = {};
  conceptos.forEach((c) => {
    const key = c.grupoId || '';
    if (!mapa[key]) { mapa[key] = { grupoId: key, items: [] }; orden.push(key); }
    mapa[key].items.push(c);
  });
  return orden.map((k) => mapa[k]);
};

const subtotalGrupo = (items, porConcepto) =>
  items.reduce((acc, c) => acc + (Number(porConcepto[c.id]?.monto) || 0), 0);

// Nombre a mostrar: si el nombre empieza con el del grupo, mostramos solo la
// parte distintiva (ej: grupo "Dolores" + "Edesur Dolores" -> "Edesur").
const nombreCorto = (c, grupoNombre) => {
  if (grupoNombre && c.nombre.toLowerCase().startsWith(grupoNombre.toLowerCase())) {
    const resto = c.nombre.slice(grupoNombre.length).trim();
    return resto || c.nombre;
  }
  if (grupoNombre && c.nombre.toLowerCase().endsWith(grupoNombre.toLowerCase())) {
    const resto = c.nombre.slice(0, -grupoNombre.length).trim();
    return resto || c.nombre;
  }
  return c.nombre;
};

// Input de fecha con estado local, para que escribir no se corte cuando el
// valor vuelve de Firestore (los date controlados se "reinician" si no).
const VenceInput = ({ value, onCommit }) => {
  const [v, setV] = useState(value || '');
  useEffect(() => { setV(value || ''); }, [value]);
  return (
    <input
      type="date" min="2000-01-01" max="2100-12-31" value={v}
      onChange={(e) => { setV(e.target.value); onCommit(e.target.value); }}
    />
  );
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

const ConceptoRow = ({ concepto, gasto, dentroDeGrupo, grupoNombre, onGuardarMonto, onGuardarDetalle, onGuardarMeta }) => {
  const { getCat } = useEstructura();
  const cat = getCat(concepto.categoriaId);
  const items = gasto?.items || [];
  const tieneItems = items.length > 0;
  const tieneGasto = Boolean(gasto);
  const estado = estadoGasto(gasto);
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <div className={`concepto-row estado-${estado} ${dentroDeGrupo ? 'en-grupo' : ''}`}>
        <span className="cr-icono" style={{ background: `${cat.color}1a`, color: cat.color }}>
          {cat.icon}
        </span>
        <span className="cr-nombre">
          <span>
            {dentroDeGrupo ? nombreCorto(concepto, grupoNombre) : concepto.nombre}
            {concepto.frecuencia && concepto.frecuencia !== 'mensual' && (
              <span className="cr-frec">{getFrecuencia(concepto.frecuencia).corto}</span>
            )}
            <span className={`cr-estado est-${estado}`}>{ESTADO_LABEL[estado]}</span>
          </span>
          <span className="cr-cat">
            {cat.nombre}{tieneItems ? ` · ${items.length} ítems` : ''}
          </span>
        </span>

        {tieneItems ? (
          <button className="cr-total-btn" onClick={() => setAbierto((a) => !a)}>
            {formatMoneda(gasto.monto)} <span className="cr-chevron">{abierto ? '▾' : '▸'}</span>
          </button>
        ) : abierto ? (
          <button className="cr-desglosar activo" title="Cerrar desglose" onClick={() => setAbierto(false)}>▾</button>
        ) : (
          <div className="cr-derecha">
            <AmountInput value={gasto?.monto} onCommit={(monto) => onGuardarMonto(concepto, monto)} />
            <button className="cr-desglosar" title="Desglosar en ítems" onClick={() => setAbierto(true)}>⋯</button>
          </div>
        )}
      </div>

      {tieneGasto && (
        <div className={`cr-meta ${dentroDeGrupo ? 'en-grupo' : ''}`}>
          <label className="cr-vence">
            Vence
            <VenceInput value={gasto.vencimiento}
              onCommit={(fecha) => onGuardarMeta(concepto, { vencimiento: fecha })} />
          </label>
          <label className={`cr-pago ${gasto.pagado ? 'si' : ''}`}>
            <input type="checkbox" checked={Boolean(gasto.pagado)}
              onChange={(e) => onGuardarMeta(concepto, { pagado: e.target.checked })} />
            Pagado
          </label>
        </div>
      )}

      {abierto && (
        <DesgloseEditor
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
    setImporte, setDetalle, setMeta, agregarSuelto, borrar,
  } = useGastosMes(mes);
  const { getGrp } = useEstructura();

  // Mostrar los conceptos que aplican al mes (según frecuencia) o que ya
  // tengan un importe cargado. Con "ver todos", se muestran todos.
  const visibles = verTodos
    ? conceptos
    : conceptos.filter((c) => aplicaEnMes(c, mes) || porConcepto[c.id]);
  const ocultos = conceptos.length - visibles.length;

  // Resumen de estado del mes.
  const pagado = visibles.reduce((a, c) => {
    const g = porConcepto[c.id];
    return a + (g?.pagado ? Number(g.monto) || 0 : 0);
  }, 0);
  const pendiente = visibles.reduce((a, c) => {
    const g = porConcepto[c.id];
    return a + (g && !g.pagado ? Number(g.monto) || 0 : 0);
  }, 0);
  const faltan = visibles.filter((c) => !porConcepto[c.id]).length;

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

        <div className="estado-tiles">
          <div className="et et-pagado">
            <span className="et-label">✓ Pagado</span>
            <span className="et-valor">{formatMoneda(pagado)}</span>
          </div>
          <div className="et et-pendiente">
            <span className="et-label">● Pendiente</span>
            <span className="et-valor">{formatMoneda(pendiente)}</span>
          </div>
          <div className="et et-faltan">
            <span className="et-label">Falta cargar</span>
            <span className="et-valor">{faltan}</span>
          </div>
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
                  No hay conceptos. Agregalos desde la sección <strong>Estructura</strong>.
                </p>
              ) : visibles.length === 0 ? (
                <p className="pg-vacio-inline">
                  Ningún concepto aplica a este mes. Activá <strong>Ver todos</strong> para verlos igual.
                </p>
              ) : (
                <div className="concepto-lista">
                  {agruparConceptos(visibles).map((g) => {
                    const grupoNombre = g.grupoId ? (getGrp(g.grupoId)?.nombre || 'Grupo') : '';
                    return grupoNombre ? (
                      <div className="grupo-bloque" key={`g-${g.grupoId}`}>
                        <div className="grupo-head">
                          <span className="grupo-nombre">{grupoNombre}</span>
                          <span className="grupo-subtotal">{formatMoneda(subtotalGrupo(g.items, porConcepto))}</span>
                        </div>
                        {g.items.map((c) => (
                          <ConceptoRow key={c.id} concepto={c} dentroDeGrupo grupoNombre={grupoNombre}
                            gasto={porConcepto[c.id]} onGuardarMonto={setImporte}
                            onGuardarDetalle={setDetalle} onGuardarMeta={setMeta} />
                        ))}
                      </div>
                    ) : (
                      g.items.map((c) => (
                        <ConceptoRow key={c.id} concepto={c}
                          gasto={porConcepto[c.id]} onGuardarMonto={setImporte}
                          onGuardarDetalle={setDetalle} onGuardarMeta={setMeta} />
                      ))
                    );
                  })}
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
  const { categorias, getCat } = useEstructura();
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto]       = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [guardando, setGuardando] = useState(false);

  const totalSueltos = sueltos.reduce((a, g) => a + (Number(g.monto) || 0), 0);

  const handleAgregar = async (e) => {
    e.preventDefault();
    if (!concepto.trim() || !Number(monto)) return;
    setGuardando(true);
    try {
      await onAgregar({ concepto, monto, categoriaId });
      setConcepto(''); setMonto(''); setCategoriaId('');
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
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Categoría…</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.nombre}</option>
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
            const cat = getCat(g.categoriaId);
            return (
              <div className="suelto-row" key={g.id}>
                <span className="cr-icono" style={{ background: `${cat.color}1a`, color: cat.color }}>
                  {cat.icon}
                </span>
                <span className="cr-nombre">{g.concepto}<span className="cr-cat">{cat.nombre}</span></span>
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
