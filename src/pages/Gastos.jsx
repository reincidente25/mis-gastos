// src/pages/Gastos.jsx
import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import { useGastosMes } from '../hooks/useGastosMes';
import { useEstructura } from '../context/EstructuraContext';
import { getFrecuencia } from '../config/frecuencias';
import { formatMoneda, mesActual, aplicaEnMes, hoy, semanasEnMes, fechasDeSemana, fechaLarga, DIAS_SEMANA } from '../utils/format';
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
const ESTADO_LABEL_ING = {
  pagado: 'Cobrado', vencido: 'Vencido', pendiente: 'A cobrar', sincargar: 'Falta cargar',
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

// Input del monto semanal (estado local para no cortar el tipeo).
const MontoSemanalInput = ({ value, onCommit }) => {
  const [v, setV] = useState(value ?? '');
  useEffect(() => { setV(value ?? ''); }, [value]);
  return (
    <input
      className="cr-semanal-input" type="number" min="0" step="0.01" placeholder="$/sem"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(v)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
};

// Fila de un concepto semanal: monto por semana; cada semana se abre como
// sub-ítem (con su fecha) para marcarla pagada.
const ConceptoRowSemanal = ({ concepto, gasto, dentroDeGrupo, grupoNombre, mes, onGuardarSemanal }) => {
  const { getCat } = useEstructura();
  const cat = getCat(concepto.categoriaId);
  const [abierto, setAbierto] = useState(false);

  const dia = Number(concepto.diaSemana) || 1;
  const diaCorto = (DIAS_SEMANA.find((d) => d.id === dia) || {}).corto || '';
  // Fechas de ese día de semana en el mes; si no hay día, caemos a conteo simple.
  const fechas = fechasDeSemana(mes, dia);
  const count = fechas.length || semanasEnMes(mes);

  const semanas = Array.from({ length: count }, (_, i) => Boolean(gasto?.semanas?.[i]));
  const montoSemanal = gasto?.montoSemanal ?? '';
  const pagadas = semanas.filter(Boolean).length;
  const estado = !gasto ? 'sincargar' : pagadas === count ? 'pagado' : 'pendiente';
  const estadoLabel = !gasto ? 'Falta cargar' : pagadas === count ? 'Pagado' : `${pagadas}/${count} semanas`;

  const guardar = (nuevoMonto, nuevasSemanas) =>
    onGuardarSemanal(concepto, { montoSemanal: nuevoMonto, semanas: nuevasSemanas, fechas });

  const toggleSemana = (i) => {
    if (!gasto) return;
    guardar(montoSemanal, semanas.map((b, idx) => (idx === i ? !b : b)));
  };

  return (
    <>
      <div className={`concepto-row estado-${estado} ${dentroDeGrupo ? 'en-grupo' : ''}`}>
        <span className="cr-icono" style={{ background: `${cat.color}1a`, color: cat.color }}>{cat.icon}</span>
        <span className="cr-nombre">
          <span>
            {dentroDeGrupo ? nombreCorto(concepto, grupoNombre) : concepto.nombre}
            <span className="cr-frec">Seman. · {diaCorto}</span>
            <span className={`cr-estado est-${estado}`}>{estadoLabel}</span>
          </span>
          <span className="cr-cat">
            {cat.nombre}
            {gasto ? ` · ${formatMoneda(montoSemanal || 0)}/sem × ${count} = ${formatMoneda(gasto.monto || 0)}` : ` · ${count} semanas`}
          </span>
        </span>

        <div className="cr-semanal-box">
          <span className="cr-semanal-pesos">$</span>
          <MontoSemanalInput value={montoSemanal}
            onCommit={(val) => guardar(val, gasto ? semanas : Array(count).fill(false))} />
          <span className="cr-semanal-por">/sem</span>
        </div>

        <button className="cr-total-btn" onClick={() => setAbierto((a) => !a)} title="Ver semanas">
          {formatMoneda(gasto?.monto || 0)} <span className="cr-chevron">{abierto ? '▾' : '▸'}</span>
        </button>
      </div>

      {abierto && (
        <div className="semanas-detalle">
          {!gasto ? (
            <p className="semanas-aviso">Cargá un monto por semana para habilitar el pago semana a semana.</p>
          ) : (
            semanas.map((pagada, i) => (
              <label key={i} className={`semana-item ${pagada ? 'si' : ''}`}>
                <input type="checkbox" checked={pagada} onChange={() => toggleSemana(i)} />
                <span className="semana-nombre">{fechas[i] ? fechaLarga(fechas[i]) : `Semana ${i + 1}`}</span>
                <span className="semana-monto">{formatMoneda(montoSemanal || 0)}</span>
              </label>
            ))
          )}
        </div>
      )}
    </>
  );
};

// Editor del desglose de un concepto para el mes.
const pesosItem = (it) => (it.moneda === 'usd'
  ? (Number(it.monto) || 0) * (Number(it.cotizacion) || 0)
  : (Number(it.monto) || 0));

const DesgloseEditor = ({ items, conMoneda, onChange }) => {
  const nuevo = () => ({ detalle: '', monto: '', moneda: 'ars', cotizacion: '' });
  const [lista, setLista] = useState(
    items.length ? items.map((it) => ({ ...nuevo(), ...it })) : [nuevo()]
  );

  const commit = (next) => {
    setLista(next);
    onChange(next);
  };
  const editar = (i, campo, val) => {
    const next = lista.map((it, idx) => (idx === i ? { ...it, [campo]: val } : it));
    setLista(next); // escribir local al tipear; persistir en blur
  };
  const cambiar = (i, campo, val) => commit(lista.map((it, idx) => (idx === i ? { ...it, [campo]: val } : it)));
  const persistir = () => onChange(lista);
  const agregar = () => commit([...lista, nuevo()]);
  const quitar = (i) => commit(lista.filter((_, idx) => idx !== i));

  const subtotal = lista.reduce((a, it) => a + pesosItem(it), 0);

  return (
    <div className="desglose">
      {lista.map((it, i) => (
        <div className={`desglose-row ${conMoneda ? 'con-moneda' : ''}`} key={i}>
          <input
            className="desglose-detalle" type="text" placeholder="Detalle (ej: Cuota)"
            value={it.detalle} maxLength={60}
            onChange={(e) => editar(i, 'detalle', e.target.value)}
            onBlur={persistir}
          />
          {conMoneda && (
            <select className="desglose-moneda" value={it.moneda || 'ars'}
              onChange={(e) => cambiar(i, 'moneda', e.target.value)}>
              <option value="ars">$ ARS</option>
              <option value="usd">US$</option>
            </select>
          )}
          <input
            className="desglose-monto" type="number" min="0" step="0.01" placeholder="0"
            value={it.monto}
            onChange={(e) => editar(i, 'monto', e.target.value)}
            onBlur={persistir}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
          {conMoneda && it.moneda === 'usd' && (
            <>
              <input
                className="desglose-cotiz" type="number" min="0" step="0.01" placeholder="cotiz."
                value={it.cotizacion}
                onChange={(e) => editar(i, 'cotizacion', e.target.value)}
                onBlur={persistir}
                title="Cotización del dólar"
              />
              <span className="desglose-pesos">= {formatMoneda(pesosItem(it))}</span>
            </>
          )}
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

// Dispatcher: según la frecuencia, fila semanal o normal (sin hooks propios,
// para no romper las reglas de hooks al alternar de tipo).
const ConceptoRow = (props) =>
  props.concepto.frecuencia === 'semanal'
    ? <ConceptoRowSemanal {...props} />
    : <ConceptoRowNormal {...props} />;

const ConceptoRowNormal = ({ concepto, gasto, dentroDeGrupo, grupoNombre, onGuardarDetalle, onGuardarMeta, onCopiar }) => {
  const { getCat } = useEstructura();
  const cat = getCat(concepto.categoriaId);
  const items = gasto?.items || [];
  const tieneItems = items.length > 0;
  const conMoneda = Boolean(cat.moneda);
  // Plantilla de ítems (admite formato viejo de strings).
  const plantilla = (concepto.itemsPlantilla || []).map((p) =>
    typeof p === 'string' ? { detalle: p, moneda: 'ars' } : p);
  const esIngreso = concepto.tipo === 'ingreso';
  // Ítems a mostrar al abrir el detalle: los del mes, la plantilla vacía,
  // el monto simple ya cargado, o una fila vacía.
  const seedItems = tieneItems
    ? items
    : plantilla.length
    ? plantilla.map((p) => ({ detalle: p.detalle, moneda: p.moneda || 'ars', monto: '', cotizacion: '' }))
    : gasto?.monto
    ? [{ detalle: '', monto: gasto.monto, moneda: 'ars', cotizacion: '' }]
    : [{ detalle: '', monto: '', moneda: 'ars', cotizacion: '' }];
  const tieneGasto = Boolean(gasto);
  const estado = estadoGasto(gasto);
  const estadoLabel = esIngreso ? ESTADO_LABEL_ING[estado] : ESTADO_LABEL[estado];
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
            <span className={`cr-estado est-${estado}`}>{estadoLabel}</span>
          </span>
          <span className="cr-cat">
            {cat.nombre}{(tieneItems || plantilla.length) ? ` · ${tieneItems ? items.length : plantilla.length} ítems` : ''}
          </span>
        </span>

        {tieneGasto && (
          <div className="cr-inline-meta">
            {!esIngreso && (
              <VenceInput value={gasto.vencimiento}
                onCommit={(fecha) => onGuardarMeta(concepto, { vencimiento: fecha })} />
            )}
            <label className={`cr-pago ${gasto.pagado ? 'si' : ''}`}>
              <input type="checkbox" checked={Boolean(gasto.pagado)}
                onChange={(e) => onGuardarMeta(concepto, { pagado: e.target.checked })} />
              {esIngreso ? 'Cobrado' : 'Pagado'}
            </label>
          </div>
        )}

        {!tieneGasto && onCopiar && (
          <button className="cr-copiar" title="Copiar del mes anterior"
            onClick={() => onCopiar(concepto)}>⧉</button>
        )}
        <button className="cr-total-btn" onClick={() => setAbierto((a) => !a)}>
          {formatMoneda(gasto?.monto || 0)} <span className="cr-chevron">{abierto ? '▾' : '▸'}</span>
        </button>
      </div>

      {abierto && (
        <DesgloseEditor
          items={seedItems}
          conMoneda={conMoneda}
          onChange={(nuevos) => onGuardarDetalle(concepto, nuevos)}
        />
      )}
    </>
  );
};

// Bloque de un grupo, colapsable desde su encabezado.
const GrupoBloque = ({ grupoNombre, items, porConcepto, mes, onGuardarDetalle, onGuardarMeta, onGuardarSemanal, onCopiar, señal, abrirTodos }) => {
  const [abierto, setAbierto] = useState(false);
  // Cuando cambia la señal global (botón Expandir/Colapsar todos), seguirla.
  useEffect(() => { if (señal > 0) setAbierto(abrirTodos); }, [señal, abrirTodos]);
  return (
    <div className="grupo-bloque">
      <button className="grupo-head" onClick={() => setAbierto((a) => !a)}>
        <span className="grupo-nombre">
          <span className="grupo-chev">{abierto ? '▾' : '▸'}</span>{grupoNombre}
        </span>
        <span className="grupo-subtotal">{formatMoneda(subtotalGrupo(items, porConcepto))}</span>
      </button>
      {abierto && items.map((c) => (
        <ConceptoRow key={c.id} concepto={c} dentroDeGrupo grupoNombre={grupoNombre}
          gasto={porConcepto[c.id]} mes={mes}
          onGuardarDetalle={onGuardarDetalle} onGuardarMeta={onGuardarMeta}
          onGuardarSemanal={onGuardarSemanal} onCopiar={onCopiar} />
      ))}
    </div>
  );
};

// Lista de conceptos agrupada por grupo.
const ListaConceptos = ({ lista, porConcepto, getGrp, mes, onGuardarDetalle, onGuardarMeta, onGuardarSemanal, onCopiar, señal, abrirTodos }) => (
  <div className="concepto-lista">
    {agruparConceptos(lista).map((g) => {
      const grupoNombre = g.grupoId ? (getGrp(g.grupoId)?.nombre || 'Grupo') : '';
      return grupoNombre ? (
        <GrupoBloque key={`g-${g.grupoId}`} grupoNombre={grupoNombre} items={g.items}
          porConcepto={porConcepto} mes={mes}
          onGuardarDetalle={onGuardarDetalle} onGuardarMeta={onGuardarMeta}
          onGuardarSemanal={onGuardarSemanal} onCopiar={onCopiar}
          señal={señal} abrirTodos={abrirTodos} />
      ) : (
        g.items.map((c) => (
          <ConceptoRow key={c.id} concepto={c}
            gasto={porConcepto[c.id]} mes={mes}
            onGuardarDetalle={onGuardarDetalle} onGuardarMeta={onGuardarMeta}
            onGuardarSemanal={onGuardarSemanal} onCopiar={onCopiar} />
        ))
      );
    })}
  </div>
);

const sumaPorTipo = (conceptos, porConcepto, cond) =>
  conceptos.reduce((a, c) => {
    const g = porConcepto[c.id];
    return a + (g && cond(g) ? Number(g.monto) || 0 : 0);
  }, 0);

const Gastos = () => {
  const [mes, setMes] = useState(mesActual());
  const [verTodos, setVerTodos] = useState(false);
  const [expand, setExpand] = useState({ n: 0, abrir: false }); // señal global expandir/colapsar
  const alternarTodos = () => setExpand((e) => ({ n: e.n + 1, abrir: !e.abrir }));
  const [filtro, setFiltro] = useState('todos'); // todos|pagado|pendiente|vencido|sincargar
  const {
    conceptos, porConcepto, sueltos,
    loading, error,
    setDetalle, setSemanal, setMeta, copiarAnterior, agregarSuelto, borrar,
  } = useGastosMes(mes);
  const { getGrp } = useEstructura();

  // Mostrar los conceptos que aplican al mes (según frecuencia) o que ya
  // tengan un importe cargado. Con "ver todos", se muestran todos.
  const visibles = verTodos
    ? conceptos
    : conceptos.filter((c) => aplicaEnMes(c, mes) || porConcepto[c.id]);
  const ocultos = conceptos.length - visibles.length;

  const ingresoCs = visibles.filter((c) => c.tipo === 'ingreso');
  const gastoCs   = visibles.filter((c) => (c.tipo || 'gasto') !== 'ingreso');

  const totalSueltos  = sueltos.reduce((a, g) => a + (Number(g.monto) || 0), 0);
  const ingresosCobrados = sumaPorTipo(ingresoCs, porConcepto, (g) => g.pagado);
  const ingresosTotal    = sumaPorTipo(ingresoCs, porConcepto, () => true);
  const totalGastos   = sumaPorTipo(gastoCs, porConcepto, () => true) + totalSueltos;

  // Estadísticas por estado, A NIVEL CONCEPTO (no por grupo), incluyendo
  // gastos e ingresos.
  const stats = { pagado: { n: 0, m: 0 }, pendiente: { n: 0, m: 0 }, vencido: { n: 0, m: 0 }, sincargar: { n: 0, m: 0 } };
  visibles.forEach((c) => {
    const g = porConcepto[c.id];
    const e = estadoGasto(g);
    stats[e].n += 1;
    stats[e].m += Number(g?.monto) || 0;
  });

  // Al filtrar por estado, la lista combina gastos e ingresos.
  const filtrados = visibles.filter((c) => estadoGasto(porConcepto[c.id]) === filtro);

  const TILES = [
    { key: 'pagado',    label: '✓ Pagados',   clase: 'st-pagado' },
    { key: 'pendiente', label: '● Sin pagar',  clase: 'st-pendiente' },
    { key: 'vencido',   label: '⚠ Vencidos',  clase: 'st-vencido' },
    { key: 'sincargar', label: 'Sin cargar',  clase: 'st-sincargar' },
  ];

  return (
    <Layout>
      <div className="gastos-page">
        <header className="pg-header">
          <div>
            <h1>💸 Gastos e ingresos</h1>
            <p className="pg-sub">Completá el importe de cada concepto del mes</p>
          </div>
          <div className="pg-header-acciones">
            <button className="btn-expandir" onClick={alternarTodos}>
              {expand.abrir ? '▾ Colapsar todos' : '▸ Expandir todos'}
            </button>
            <MesSelector mes={mes} onChange={setMes} />
          </div>
        </header>

        <div className="estado-tiles">
          {TILES.map((t) => (
            <button
              key={t.key}
              className={`et ${t.clase} ${filtro === t.key ? 'activo' : ''}`}
              onClick={() => setFiltro((f) => (f === t.key ? 'todos' : t.key))}
            >
              <span className="et-label">{t.label}</span>
              <span className="et-n">{stats[t.key].n}</span>
              <span className="et-m">{formatMoneda(stats[t.key].m)}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : error ? (
          <p className="pg-error">{error}</p>
        ) : conceptos.length === 0 ? (
          <section className="card">
            <p className="pg-vacio-inline">
              No hay conceptos. Agregalos desde la sección <strong>Conceptos</strong>.
            </p>
          </section>
        ) : (
          <>
            {filtro !== 'todos' ? (
              /* Vista filtrada: gastos + ingresos que están en ese estado */
              <section className="card">
                <h2 className="card-titulo">
                  <span>{TILES.find((t) => t.key === filtro)?.label}
                    {' '}<span className="card-sub">{stats[filtro].n} · {formatMoneda(stats[filtro].m)}</span></span>
                  <button className="filtro-limpiar" onClick={() => setFiltro('todos')}>✕ Quitar filtro</button>
                </h2>
                {filtrados.length === 0 ? (
                  <p className="pg-vacio-inline">Ningún concepto en ese estado.</p>
                ) : (
                  <ListaConceptos lista={filtrados} porConcepto={porConcepto} getGrp={getGrp}
                    mes={mes}
                    onGuardarDetalle={setDetalle} onGuardarMeta={setMeta} onGuardarSemanal={setSemanal} onCopiar={copiarAnterior}
                    señal={expand.n} abrirTodos={expand.abrir} />
                )}
              </section>
            ) : (
              <>
                {ingresoCs.length > 0 && (
                  <section className="card">
                    <h2 className="card-titulo">
                      <span>💰 Ingresos <span className="card-sub">
                        {formatMoneda(ingresosCobrados)} cobrado{ingresosTotal !== ingresosCobrados ? ` de ${formatMoneda(ingresosTotal)}` : ''}
                      </span></span>
                    </h2>
                    <ListaConceptos lista={ingresoCs} porConcepto={porConcepto} getGrp={getGrp}
                      mes={mes}
                      onGuardarDetalle={setDetalle} onGuardarMeta={setMeta} onGuardarSemanal={setSemanal} onCopiar={copiarAnterior}
                      señal={expand.n} abrirTodos={expand.abrir} />
                  </section>
                )}

                <section className="card">
                  <h2 className="card-titulo">
                    <span>💸 Gastos <span className="card-sub">{formatMoneda(totalGastos)}</span></span>
                    {conceptos.length > 0 && (
                      <label className="ver-todos">
                        <input type="checkbox" checked={verTodos} onChange={(e) => setVerTodos(e.target.checked)} />
                        Ver todos{!verTodos && ocultos > 0 ? ` (+${ocultos})` : ''}
                      </label>
                    )}
                  </h2>
                  {gastoCs.length === 0 ? (
                    <p className="pg-vacio-inline">Sin gastos este mes.</p>
                  ) : (
                    <ListaConceptos lista={gastoCs} porConcepto={porConcepto} getGrp={getGrp}
                      mes={mes}
                      onGuardarDetalle={setDetalle} onGuardarMeta={setMeta} onGuardarSemanal={setSemanal} onCopiar={copiarAnterior}
                      señal={expand.n} abrirTodos={expand.abrir} />
                  )}
                </section>
              </>
            )}

            {filtro === 'todos' && (
              <GastosSueltos
                sueltos={sueltos}
                onAgregar={agregarSuelto}
                onBorrar={borrar}
              />
            )}
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
