// src/pages/Gastos.jsx
import { useState, useEffect, useRef, Fragment } from 'react';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import { useGastosMes } from '../hooks/useGastosMes';
import { useEstructura } from '../context/EstructuraContext';
import { getFrecuencia } from '../config/frecuencias';
import { formatMoneda, formatImporte, formatUSD, mesActual, aplicaEnMes, hoy, semanasEnMes, fechasDeSemana, fechaLarga, DIAS_SEMANA } from '../utils/format';
import './Gastos.css';

// Estado de un concepto en el mes: pagado / vencido / pendiente / falta cargar.
const estadoGasto = (gasto) => {
  if (!gasto) return 'sincargar';
  // Semanal: depende del detalle por semana (la cabecera no cuenta sola).
  if (gasto.esSemanal) {
    const montosS = Array.isArray(gasto.montosSemana) ? gasto.montosSemana : [];
    const aPagar = montosS.filter((m) => Number(m) > 0).length;
    if (aPagar === 0) return 'sincargar';
    const pagadas = montosS.reduce((n, m, i) => n + (Number(m) > 0 && gasto.semanas?.[i] ? 1 : 0), 0);
    return pagadas === aPagar ? 'pagado' : 'pendiente';
  }
  // Con desglose: el estado depende del pago por ítem.
  if (gasto.items?.length) {
    if (gasto.items.every((it) => it.pagado)) return 'pagado';
    if (gasto.vencimiento && gasto.vencimiento < hoy()) return 'vencido';
    return 'pendiente';
  }
  if (gasto.pagado) return 'pagado';
  if (gasto.vencimiento && gasto.vencimiento < hoy()) return 'vencido';
  return 'pendiente';
};

// Peso de un ítem del desglose (USD × cotización, o el monto).
const pesoItem = (it) => (it.moneda === 'usd'
  ? (Number(it.monto) || 0) * (Number(it.cotizacion) || 0)
  : (Number(it.monto) || 0));

// Checkbox de pago con estado "parcial" (indeterminado).
const PagoCheck = ({ checked, parcial, onChange, label }) => {
  const ref = useRef();
  useEffect(() => { if (ref.current) ref.current.indeterminate = parcial && !checked; }, [parcial, checked]);
  return (
    <label className={`cr-pago ${checked ? 'si' : ''} ${parcial && !checked ? 'parcial' : ''}`}>
      <input ref={ref} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
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

// Monto editable de una semana puntual (puede ser 0 = no se paga).
const SemanaMontoInput = ({ value, placeholder, onCommit }) => {
  const [v, setV] = useState(value > 0 ? value : '');
  useEffect(() => { setV(value > 0 ? value : ''); }, [value]);
  return (
    <span className="semana-monto-box">
      <span className="semana-monto-pesos">$</span>
      <input className="semana-monto-input" type="number" min="0" step="0.01"
        placeholder={placeholder || '0'}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onCommit(v)}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
    </span>
  );
};

// Fila de un concepto semanal: monto por semana; cada semana se abre como
// sub-ítem (con su fecha) para marcarla pagada.
const ConceptoRowSemanal = ({ concepto, gasto, dentroDeGrupo, grupoNombre, mes, onGuardarSemanal, onExcluir }) => {
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
  const base = Number(montoSemanal) || 0;
  // Monto de cada semana: SOLO lo cargado en el detalle (la cabecera no cuenta
  // por sí sola; es un valor por defecto que se aplica con el botón).
  const montos = Array.from({ length: count }, (_, i) => Number(gasto?.montosSemana?.[i]) || 0);

  const mon = concepto.moneda === 'usd' ? 'usd' : 'ars';
  // Semanas "a pagar" = las que tienen monto > 0.
  const aPagar = montos.filter((m) => m > 0).length;
  const pagadas = montos.reduce((n, m, i) => n + (m > 0 && semanas[i] ? 1 : 0), 0);
  const estado = !gasto ? 'sincargar' : aPagar > 0 && pagadas === aPagar ? 'pagado' : 'pendiente';
  const estadoLabel = !gasto ? 'Falta cargar' : aPagar > 0 && pagadas === aPagar ? 'Pagado' : `${pagadas}/${aPagar} semanas`;

  const guardar = ({ nuevoBase = base, nuevosMontos = montos, nuevasSemanas = semanas }) =>
    onGuardarSemanal(concepto, {
      montoSemanal: nuevoBase, montosSemana: nuevosMontos, semanas: nuevasSemanas, fechas,
    });

  const toggleSemana = (i) => {
    if (!gasto) return;
    guardar({ nuevasSemanas: semanas.map((b, idx) => (idx === i ? !b : b)) });
  };

  const setMontoSemana = (i, val) => {
    guardar({ nuevosMontos: montos.map((m, idx) => (idx === i ? Number(val) || 0 : m)) });
  };

  // Aplica el valor de la cabecera a todas las semanas (acción explícita).
  const aplicarBaseATodas = () => {
    if (base <= 0) return;
    guardar({ nuevosMontos: Array(count).fill(base) });
  };

  return (
    <>
      <div className={`concepto-row clickable estado-${estado} ${dentroDeGrupo ? 'en-grupo' : ''}`}
        onClick={() => setAbierto((a) => !a)}>
        <span className="cr-icono" style={{ background: `${cat.color}1a`, color: cat.color }}>{cat.icon}</span>
        <span className="cr-nombre">
          <span>
            {dentroDeGrupo ? nombreCorto(concepto, grupoNombre) : concepto.nombre}
            <span className="cr-frec">Seman. · {diaCorto}</span>
            <span className={`cr-estado est-${estado}`}>{estadoLabel}</span>
          </span>
          <span className="cr-cat">
            {cat.nombre}
            {gasto ? ` · ${formatImporte(gasto.monto || 0, mon)} en ${aPagar} semana${aPagar === 1 ? '' : 's'}` : ` · ${count} semanas`}
          </span>
        </span>

        <div className="cr-semanal-box" onClick={(e) => e.stopPropagation()}>
          <span className="cr-semanal-pesos">$</span>
          <MontoSemanalInput value={montoSemanal}
            onCommit={(val) => guardar({ nuevoBase: val })} />
          <span className="cr-semanal-por">/sem</span>
        </div>

        {onExcluir && (
          <button className="cr-excluir" title="No aplica este mes"
            onClick={(e) => { e.stopPropagation(); onExcluir(concepto); }}>🚫</button>
        )}
        <button className={`cr-total-btn ${mon === 'usd' ? 'usd' : ''}`}
          onClick={(e) => { e.stopPropagation(); setAbierto((a) => !a); }} title="Ver semanas">
          {formatImporte(gasto?.monto || 0, mon)} <span className="cr-chevron">{abierto ? '▾' : '▸'}</span>
        </button>
      </div>

      {abierto && (
        <div className="semanas-detalle">
          {base > 0 && (
            <div className="semanas-cabecera">
              <span>Cargá el monto de cada semana (vacío = no cuenta).</span>
              <button className="semanas-aplicar" onClick={aplicarBaseATodas}>
                Aplicar {formatImporte(base, mon)} a todas
              </button>
            </div>
          )}
          {Array.from({ length: count }).map((_, i) => {
            const m = montos[i];
            return (
              <div key={i} className={`semana-item ${m > 0 && semanas[i] ? 'si' : ''} ${m <= 0 ? 'cero' : ''}`}>
                <input type="checkbox" checked={Boolean(semanas[i])} disabled={m <= 0}
                  onChange={() => toggleSemana(i)} title={m <= 0 ? 'Semana sin monto (no cuenta)' : 'Marcar pagada'} />
                <span className="semana-nombre">{fechas[i] ? fechaLarga(fechas[i]) : `Semana ${i + 1}`}</span>
                <SemanaMontoInput value={m} placeholder={base || 0} onCommit={(val) => setMontoSemana(i, val)} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

// Editor del desglose de un concepto para el mes.
const pesosItem = (it) => (it.moneda === 'usd'
  ? (Number(it.monto) || 0) * (Number(it.cotizacion) || 0)
  : (Number(it.monto) || 0));

const DesgloseEditor = ({ items, conMoneda, esIngreso, onChange }) => {
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
          <label className={`desglose-pago ${it.pagado ? 'si' : ''}`}
            title={it.pagado ? (esIngreso ? 'Cobrado' : 'Pagado') : (esIngreso ? 'Marcar cobrado' : 'Marcar pagado')}>
            <input type="checkbox" checked={Boolean(it.pagado)}
              onChange={(e) => cambiar(i, 'pagado', e.target.checked)} />
          </label>
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

// Fila de un concepto marcado como "no aplica" en el mes (solo en "ver todos").
const ExcluidoRow = ({ concepto, dentroDeGrupo, grupoNombre, onIncluir }) => {
  const { getCat } = useEstructura();
  const cat = getCat(concepto.categoriaId);
  return (
    <div className={`concepto-row excluido ${dentroDeGrupo ? 'en-grupo' : ''}`}>
      <span className="cr-icono" style={{ background: `${cat.color}1a`, color: cat.color }}>{cat.icon}</span>
      <span className="cr-nombre">
        <span>{dentroDeGrupo ? nombreCorto(concepto, grupoNombre) : concepto.nombre}
          <span className="cr-noaplica">No aplica este mes</span>
        </span>
      </span>
      <button className="cr-restaurar" onClick={() => onIncluir(concepto)}>↩ Restaurar</button>
    </div>
  );
};

// Dispatcher: excluido → fila especial; según frecuencia, semanal o normal
// (sin hooks propios, para no romper las reglas de hooks al alternar de tipo).
const ConceptoRow = (props) => {
  if (props.concepto.excluidos?.includes(props.mes)) return <ExcluidoRow {...props} />;
  return props.concepto.frecuencia === 'semanal'
    ? <ConceptoRowSemanal {...props} />
    : <ConceptoRowNormal {...props} />;
};

const ConceptoRowNormal = ({ concepto, gasto, dentroDeGrupo, grupoNombre, acum, onGuardarDetalle, onGuardarMeta, onCopiar, onExcluir }) => {
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
  const mon = concepto.moneda === 'usd' ? 'usd' : 'ars';
  const [abierto, setAbierto] = useState(false);

  // Pago general: con desglose, marca/desmarca todos los ítems.
  const todosPagados = tieneItems && items.every((it) => it.pagado);
  const algunoPagado = tieneItems && items.some((it) => it.pagado);
  const pagoChecked = tieneItems ? todosPagados : Boolean(gasto?.pagado);
  const togglePagoGeneral = (checked) => {
    if (tieneItems) onGuardarDetalle(concepto, items.map((it) => ({ ...it, pagado: checked })));
    else onGuardarMeta(concepto, { pagado: checked });
  };

  return (
    <>
      <div className={`concepto-row clickable estado-${estado} ${dentroDeGrupo ? 'en-grupo' : ''}`}
        onClick={() => setAbierto((a) => !a)}>
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
            {acum != null && <span className="cr-acum">🏦 acum. {formatImporte(acum, mon)}</span>}
          </span>
        </span>

        {tieneGasto && (
          <div className="cr-inline-meta" onClick={(e) => e.stopPropagation()}>
            {!esIngreso && (
              <VenceInput value={gasto.vencimiento}
                onCommit={(fecha) => onGuardarMeta(concepto, { vencimiento: fecha })} />
            )}
            <PagoCheck checked={pagoChecked} parcial={algunoPagado && !todosPagados}
              onChange={togglePagoGeneral} label={esIngreso ? 'Cobrado' : 'Pagado'} />
          </div>
        )}

        {!tieneGasto && onCopiar && (
          <button className="cr-copiar" title="Copiar del mes anterior"
            onClick={(e) => { e.stopPropagation(); onCopiar(concepto); }}>⧉</button>
        )}
        {onExcluir && (
          <button className="cr-excluir" title="No aplica este mes"
            onClick={(e) => { e.stopPropagation(); onExcluir(concepto); }}>🚫</button>
        )}
        <button className={`cr-total-btn ${mon === 'usd' ? 'usd' : ''}`}
          onClick={(e) => { e.stopPropagation(); setAbierto((a) => !a); }}>
          {formatImporte(gasto?.monto || 0, mon)} <span className="cr-chevron">{abierto ? '▾' : '▸'}</span>
        </button>
      </div>

      {abierto && (
        <DesgloseEditor
          items={seedItems}
          conMoneda={conMoneda}
          esIngreso={esIngreso}
          onChange={(nuevos) => onGuardarDetalle(concepto, nuevos)}
        />
      )}
    </>
  );
};

// Fila de un gasto suelto (no recurrente): mismo formato que un concepto,
// con vencimiento y tilde de pago.
const SueltoRow = ({ suelto, dentroDeGrupo, onBorrar, onMeta }) => {
  const { getCat } = useEstructura();
  const cat = getCat(suelto.categoriaId);
  const estado = estadoGasto(suelto);
  return (
    <div className={`concepto-row estado-${estado} ${dentroDeGrupo ? 'en-grupo' : ''}`}>
      <span className="cr-icono" style={{ background: `${cat.color}1a`, color: cat.color }}>{cat.icon}</span>
      <span className="cr-nombre">
        <span>{suelto.concepto}
          <span className="cr-suelto-badge">suelto</span>
          <span className={`cr-estado est-${estado}`}>{ESTADO_LABEL[estado]}</span>
          <button className="cr-del-inline" title="Eliminar" onClick={() => onBorrar(suelto.id)}>🗑️</button>
        </span>
        <span className="cr-cat">{cat.nombre}</span>
      </span>
      <div className="cr-inline-meta">
        <VenceInput value={suelto.vencimiento}
          onCommit={(fecha) => onMeta(suelto.id, { vencimiento: fecha })} />
        <PagoCheck checked={Boolean(suelto.pagado)} parcial={false}
          onChange={(c) => onMeta(suelto.id, { pagado: c })} label="Pagado" />
      </div>
      <span className="cr-excluir-spacer" aria-hidden="true" />
      <span className="cr-total-btn cr-total-static">{formatMoneda(suelto.monto)}</span>
    </div>
  );
};

// Bloque de un grupo, colapsable desde su encabezado.
const GrupoBloque = ({ grupoNombre, items, sueltos = [], porConcepto, mes, acum, onGuardarDetalle, onGuardarMeta, onGuardarSemanal, onCopiar, onExcluir, onIncluir, onBorrarSuelto, onMetaSuelto, señal, abrirTodos }) => {
  const [abierto, setAbierto] = useState(false);
  // Cuando cambia la señal global (botón Expandir/Colapsar todos), seguirla.
  useEffect(() => { if (señal > 0) setAbierto(abrirTodos); }, [señal, abrirTodos]);
  return (
    <div className="grupo-bloque">
      <button className="grupo-head" onClick={() => setAbierto((a) => !a)}>
        <span className="grupo-nombre">
          <span className="grupo-chev">{abierto ? '▾' : '▸'}</span>{grupoNombre}
        </span>
        <span className="grupo-subtotal">
          {formatMoneda(subtotalGrupo(items, porConcepto) + sueltos.reduce((a, s) => a + (Number(s.monto) || 0), 0))}
        </span>
      </button>
      {abierto && items.map((c) => (
        <ConceptoRow key={c.id} concepto={c} dentroDeGrupo grupoNombre={grupoNombre}
          gasto={porConcepto[c.id]} mes={mes} acum={acum ? acum(c.id) : null}
          onGuardarDetalle={onGuardarDetalle} onGuardarMeta={onGuardarMeta}
          onGuardarSemanal={onGuardarSemanal} onCopiar={onCopiar}
          onExcluir={onExcluir} onIncluir={onIncluir} />
      ))}
      {abierto && sueltos.map((s) => (
        <SueltoRow key={s.id} suelto={s} dentroDeGrupo onBorrar={onBorrarSuelto} onMeta={onMetaSuelto} />
      ))}
    </div>
  );
};

// Lista de conceptos (y gastos sueltos) agrupada por grupo.
const ListaConceptos = ({ lista, porConcepto, getGrp, mes, acum, sueltos = [], onBorrarSuelto, onMetaSuelto, onGuardarDetalle, onGuardarMeta, onGuardarSemanal, onCopiar, onExcluir, onIncluir, señal, abrirTodos }) => {
  // Sueltos agrupados por grupoId.
  const sueltosPorGrupo = {};
  sueltos.forEach((s) => { const k = s.grupoId || ''; (sueltosPorGrupo[k] = sueltosPorGrupo[k] || []).push(s); });

  const grupos = agruparConceptos(lista); // [{ grupoId, items }]
  const itemsPorGrupo = {};
  const orden = [];
  grupos.forEach((g) => { itemsPorGrupo[g.grupoId] = g.items; orden.push(g.grupoId); });
  Object.keys(sueltosPorGrupo).forEach((k) => { if (!orden.includes(k)) orden.push(k); });
  // Grupo '' (sin grupo) al final.
  orden.sort((a, b) => (a === '' ? 1 : 0) - (b === '' ? 1 : 0));

  return (
    <div className="concepto-lista">
      {orden.map((gid) => {
        const grupoNombre = gid ? (getGrp(gid)?.nombre || 'Grupo') : '';
        const its = itemsPorGrupo[gid] || [];
        const gs = sueltosPorGrupo[gid] || [];
        return grupoNombre ? (
          <GrupoBloque key={`g-${gid}`} grupoNombre={grupoNombre} items={its} sueltos={gs}
            porConcepto={porConcepto} mes={mes} acum={acum}
            onGuardarDetalle={onGuardarDetalle} onGuardarMeta={onGuardarMeta}
            onGuardarSemanal={onGuardarSemanal} onCopiar={onCopiar}
            onExcluir={onExcluir} onIncluir={onIncluir} onBorrarSuelto={onBorrarSuelto} onMetaSuelto={onMetaSuelto}
            señal={señal} abrirTodos={abrirTodos} />
        ) : (
          <Fragment key="__sin">
            {its.map((c) => (
              <ConceptoRow key={c.id} concepto={c}
                gasto={porConcepto[c.id]} mes={mes} acum={acum ? acum(c.id) : null}
                onGuardarDetalle={onGuardarDetalle} onGuardarMeta={onGuardarMeta}
                onGuardarSemanal={onGuardarSemanal} onCopiar={onCopiar}
                onExcluir={onExcluir} onIncluir={onIncluir} />
            ))}
            {gs.map((s) => <SueltoRow key={s.id} suelto={s} onBorrar={onBorrarSuelto} onMeta={onMetaSuelto} />)}
          </Fragment>
        );
      })}
    </div>
  );
};

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
    setDetalle, setSemanal, setMeta, copiarAnterior, agregarSuelto, borrar, setMetaSuelto,
    saldoAhorro, saldoAnteriorAhorro, excluirMes, incluirMes,
  } = useGastosMes(mes);
  const { getGrp } = useEstructura();

  // Mostrar los conceptos que aplican al mes (según frecuencia) o que ya
  // tengan un importe cargado. Con "ver todos", se muestran todos.
  const visibles = verTodos
    ? conceptos
    : conceptos.filter((c) => aplicaEnMes(c, mes) || porConcepto[c.id]);
  const ocultos = conceptos.length - visibles.length;

  const esUSD = (c) => c.moneda === 'usd';
  const ingresoCs = visibles.filter((c) => c.tipo === 'ingreso');
  const gastoCs   = visibles.filter((c) => (c.tipo || 'gasto') === 'gasto');
  // Ahorros: siempre todos los conceptos de ahorro (no dependen de "ver todos").
  const ahorroCs  = conceptos.filter((c) => c.tipo === 'ahorro');
  const ahorroAcumArs = ahorroCs.filter((c) => !esUSD(c)).reduce((a, c) => a + saldoAhorro(c.id), 0);
  const ahorroAcumUsd = ahorroCs.filter(esUSD).reduce((a, c) => a + saldoAhorro(c.id), 0);

  // Totales en PESOS (excluye los conceptos en dólares).
  const ingresoArs = ingresoCs.filter((c) => !esUSD(c));
  const gastoArs   = gastoCs.filter((c) => !esUSD(c));
  const totalSueltos  = sueltos.reduce((a, g) => a + (Number(g.monto) || 0), 0);
  const ingresosCobrados = sumaPorTipo(ingresoArs, porConcepto, (g) => g.pagado);
  const ingresosTotal    = sumaPorTipo(ingresoArs, porConcepto, () => true);
  const totalGastos   = sumaPorTipo(gastoArs, porConcepto, () => true) + totalSueltos;

  // Balance en DÓLARES, acumulativo: saldo inicial (meses previos) +
  // movimientos del mes = saldo final. Gasto resta, ingreso/ahorro suma.
  const usdCs = conceptos.filter(esUSD);
  const hayUSD = usdCs.length > 0;
  const signoUSD = (c) => (c.tipo === 'gasto' ? -1 : 1);
  const usdInicial = usdCs.reduce((a, c) => a + signoUSD(c) * saldoAnteriorAhorro(c.id), 0);
  const usdMovim   = usdCs.reduce((a, c) => a + signoUSD(c) * (Number(porConcepto[c.id]?.monto) || 0), 0);
  const usdFinal   = usdInicial + usdMovim;

  // Estadísticas por estado (en pesos, a nivel concepto). Los conceptos en
  // dólares no entran acá: se muestran en el panel "En dólares".
  // Solo GASTOS (en pesos): los ingresos tienen su propia sección y no deben
  // mezclarse en los montos de los tiles ("Pagados", "Sin pagar", etc.).
  const stats = { pagado: { n: 0, m: 0 }, pendiente: { n: 0, m: 0 }, vencido: { n: 0, m: 0 }, sincargar: { n: 0, m: 0 } };
  gastoArs.forEach((c) => {
    const g = porConcepto[c.id];
    const e = estadoGasto(g);
    stats[e].n += 1;
    const monto = Number(g?.monto) || 0;
    // Semanal parcial: la parte ya pagada suma a "Pagados" y solo lo que
    // falta queda en pendiente/vencido.
    if (g?.esSemanal && e !== 'pagado') {
      const montosS = Array.isArray(g.montosSemana) ? g.montosSemana : [];
      const pagadoMonto = montosS.reduce((s, mm, i) => s + (g.semanas?.[i] ? Number(mm) || 0 : 0), 0);
      stats.pagado.m += pagadoMonto;
      stats[e].m += Math.max(0, monto - pagadoMonto);
    } else if (g?.items?.length && e !== 'pagado') {
      // Desglose parcial: lo pagado por ítem suma a "Pagados"; el resto, al estado.
      const pagadoMonto = g.items.reduce((s, it) => s + (it.pagado ? pesoItem(it) : 0), 0);
      stats.pagado.m += pagadoMonto;
      stats[e].m += Math.max(0, monto - pagadoMonto);
    } else {
      stats[e].m += monto;
    }
  });
  // Los gastos sueltos también cuentan por estado.
  sueltos.forEach((s) => {
    const e = estadoGasto(s);
    stats[e].n += 1;
    stats[e].m += Number(s.monto) || 0;
  });

  // Al filtrar por estado, se listan los gastos (y sueltos) de ese estado.
  const filtrados = gastoArs.filter((c) => estadoGasto(porConcepto[c.id]) === filtro);
  const sueltosFiltrados = sueltos.filter((s) => estadoGasto(s) === filtro);

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

        {hayUSD && (
          <div className="usd-panel">
            <span className="usd-titulo">💵 En dólares</span>
            <span className="usd-dato"><small>Saldo inicial</small>{formatUSD(usdInicial)}</span>
            <span className={`usd-dato ${usdMovim < 0 ? 'neg' : ''}`}><small>Movimientos del mes</small>{usdMovim > 0 ? '+' : ''}{formatUSD(usdMovim)}</span>
            <span className={`usd-dato balance ${usdFinal < 0 ? 'neg' : ''}`}><small>Saldo final</small>{formatUSD(usdFinal)}</span>
          </div>
        )}

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
                {filtrados.length === 0 && sueltosFiltrados.length === 0 ? (
                  <p className="pg-vacio-inline">Ningún concepto en ese estado.</p>
                ) : (
                  <ListaConceptos lista={filtrados} porConcepto={porConcepto} getGrp={getGrp}
                    mes={mes} sueltos={sueltosFiltrados} onBorrarSuelto={borrar} onMetaSuelto={setMetaSuelto}
                    onGuardarDetalle={setDetalle} onGuardarMeta={setMeta} onGuardarSemanal={setSemanal} onCopiar={copiarAnterior}
                      onExcluir={excluirMes} onIncluir={incluirMes}
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
                      onExcluir={excluirMes} onIncluir={incluirMes}
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
                  {gastoCs.length === 0 && sueltos.length === 0 ? (
                    <p className="pg-vacio-inline">Sin gastos este mes.</p>
                  ) : (
                    <ListaConceptos lista={gastoCs} porConcepto={porConcepto} getGrp={getGrp}
                      mes={mes} sueltos={sueltos} onBorrarSuelto={borrar} onMetaSuelto={setMetaSuelto}
                      onGuardarDetalle={setDetalle} onGuardarMeta={setMeta} onGuardarSemanal={setSemanal} onCopiar={copiarAnterior}
                      onExcluir={excluirMes} onIncluir={incluirMes}
                      señal={expand.n} abrirTodos={expand.abrir} />
                  )}
                </section>

                {ahorroCs.length > 0 && (
                  <section className="card">
                    <h2 className="card-titulo">
                      <span>🏦 Ahorros <span className="card-sub">
                        acumulado{ahorroAcumArs ? ` ${formatMoneda(ahorroAcumArs)}` : ''}
                        {ahorroAcumArs && ahorroAcumUsd ? ' ·' : ''}
                        {ahorroAcumUsd ? ` ${formatUSD(ahorroAcumUsd)}` : ''}
                      </span></span>
                    </h2>
                    <ListaConceptos lista={ahorroCs} porConcepto={porConcepto} getGrp={getGrp}
                      mes={mes} acum={(id) => saldoAhorro(id)}
                      onGuardarDetalle={setDetalle} onGuardarMeta={setMeta} onGuardarSemanal={setSemanal} onCopiar={copiarAnterior}
                      onExcluir={excluirMes} onIncluir={incluirMes}
                      señal={expand.n} abrirTodos={expand.abrir} />
                  </section>
                )}
              </>
            )}

            {filtro === 'todos' && (
              <GastosSueltos onAgregar={agregarSuelto} />
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

// ── Formulario para agregar un gasto suelto (se lista dentro de los grupos) ──
const GastosSueltos = ({ onAgregar }) => {
  const { categorias, grupos } = useEstructura();
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto]       = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [grupoId, setGrupoId]   = useState('');
  const [guardando, setGuardando] = useState(false);

  const handleAgregar = async (e) => {
    e.preventDefault();
    if (!concepto.trim() || !Number(monto)) return;
    setGuardando(true);
    try {
      await onAgregar({ concepto, monto, categoriaId, grupoId });
      setConcepto(''); setMonto(''); setCategoriaId(''); setGrupoId('');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="card">
      <h2 className="card-titulo">➕ Gasto suelto del mes</h2>
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
        <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
          <option value="">Grupo…</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>{g.nombre}</option>
          ))}
        </select>
        <input
          type="number" min="0" step="0.01" placeholder="Monto"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
        <button type="submit" disabled={guardando}>+ Agregar</button>
      </form>
      <p className="suelto-nota">Se agrega a la sección Gastos, dentro del grupo elegido.</p>
    </section>
  );
};

export default Gastos;
