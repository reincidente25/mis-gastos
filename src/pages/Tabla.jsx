// src/pages/Tabla.jsx — comparación de 3 meses (anterior · actual · próximo)
// con % de variación por concepto.
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import { useGastosMes } from '../hooks/useGastosMes';
import { useEstructura } from '../context/EstructuraContext';
import { useHogar } from '../context/HogarContext';
import { listarGastosPorConcepto } from '../services/gastosService';
import { formatMoneda, formatUSD, formatImporte, mesActual, mesLegible, mesCorto, mesVecino, aplicaEnMes, fechaLarga, fechaCorta } from '../utils/format';
import './Tabla.css';

// Variación porcentual de `curr` respecto de `prev`.
// Devuelve dir ('sube'|'baja'|'nuevo'|'nula') y txt; el color se decide luego
// según sea gasto o ingreso (en ingresos subir es bueno → verde).
const variacion = (prev, curr) => {
  if (!prev && !curr) return { txt: '—', dir: 'nula' };
  if (!prev && curr) return { txt: 'nuevo', dir: 'nuevo' };
  if (prev && !curr) return { txt: '−100%', dir: 'baja' };
  const pct = ((curr - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return { txt: '=', dir: 'nula' };
  const signo = pct > 0 ? '▲' : '▼';
  return {
    txt: `${signo} ${Math.abs(pct) >= 100 ? Math.round(Math.abs(pct)) : Math.abs(pct).toFixed(0)}%`,
    dir: pct > 0 ? 'sube' : 'baja',
  };
};

// Clase de color para la variación; para ingresos se invierte (subir = verde).
const varClase = (dir, esIngreso) => {
  if (dir === 'nuevo') return 'var-nuevo';
  if (dir === 'nula') return 'var-nula';
  const sube = dir === 'sube';
  const positivo = esIngreso ? sube : !sube; // ¿es "bueno"?
  return positivo ? 'var-baja' : 'var-sube';  // var-baja = verde, var-sube = rojo
};

// Tinte de fila según la dirección (invertido para ingresos).
const filaTono = (dir, esIngreso) => {
  if (dir !== 'sube' && dir !== 'baja') return '';
  const sube = dir === 'sube';
  const positivo = esIngreso ? sube : !sube;
  return positivo ? 'fila-baja' : 'fila-sube'; // fila-baja = verde, fila-sube = rojo
};

// Agrupa por grupoId preservando orden; grupo '' al final.
const agrupar = (conceptos) => {
  const orden = [], mapa = {};
  conceptos.forEach((c) => {
    const k = c.grupoId || '';
    if (!mapa[k]) { mapa[k] = []; orden.push(k); }
    mapa[k].push(c);
  });
  return orden.sort((a, b) => (a === '' ? 1 : 0) - (b === '' ? 1 : 0)).map((k) => ({ grupoId: k, items: mapa[k] }));
};

const Monto = ({ v, mon }) => (
  v !== 0 ? <span className="tb-imp">{formatImporte(v, mon)}</span> : <span className="tb-imp vacio">$ -</span>
);

// Peso de un ítem del desglose (USD × cotización, o el monto).
const pesosItem = (it) => (it.moneda === 'usd'
  ? (Number(it.monto) || 0) * (Number(it.cotizacion) || 0)
  : (Number(it.monto) || 0));

// Abrevia un número para la etiqueta (120000 -> 120k).
const abrevia = (v) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${Math.round(v / 1e3)}k`;
  return `${Math.round(v)}`;
};

// Mini-gráfico de línea: evolución del concepto en los últimos meses.
const MiniLinea = ({ serie, mesActualClave, mon, color }) => {
  const [hover, setHover] = useState(null);
  const W = 420, H = 120, mT = 18, mB = 18, mL = 10, mR = 10;
  const ph = H - mT - mB, pw = W - mL - mR;
  const max = Math.max(1, ...serie.map((s) => s.monto));
  const x = (i) => mL + (pw / Math.max(1, serie.length - 1)) * i;
  const y = (v) => mT + ph - (v / max) * ph;
  const d = serie.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(s.monto)}`).join(' ');
  return (
    <div className="mini-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="mini-svg" role="img">
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {serie.map((s, i) => {
          const act = s.mes === mesActualClave;
          return (
            <g key={s.mes} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x(i) - pw / serie.length / 2} y={mT - 14} width={pw / serie.length} height={ph + 18} fill="transparent" />
              {s.monto > 0 && <text x={x(i)} y={y(s.monto) - 6} className={`mini-val ${act ? 'act' : ''}`}>{abrevia(s.monto)}</text>}
              <circle cx={x(i)} cy={y(s.monto)} r={act ? 4 : (hover === i ? 3.5 : 2.5)} fill={color}
                stroke="#fff" strokeWidth={act ? 1.5 : 0} />
              <text x={x(i)} y={H - 4} className={`mini-xlabel ${act ? 'act' : ''}`}>{s.label}</text>
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="mini-tip" style={{ left: `${x(hover) / W * 100}%` }}>
          <b>{serie[hover].label}</b> {formatImporte(serie[hover].monto, mon)}
        </div>
      )}
    </div>
  );
};

// Modal con el detalle de cómo se compone un concepto en un mes.
const DetalleModal = ({ data, cat, onClose }) => {
  const { concepto, mes, gasto, serie } = data;
  const mon = concepto.moneda === 'usd' ? 'usd' : 'ars';
  const items = gasto?.items || [];
  const esIngreso = concepto.tipo === 'ingreso';
  const tagPagado = esIngreso ? '✓ cobrado' : '✓ pagado';
  const tagPend = esIngreso ? 'a cobrar' : 'pendiente';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head" style={{ borderColor: cat?.color }}>
          <div>
            <span className="modal-icono" style={{ background: `${cat?.color}1a`, color: cat?.color }}>{cat?.icon}</span>
            <strong>{concepto.nombre}</strong>
            <span className="modal-mes">{mesLegible(mes)}</span>
          </div>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {serie && serie.some((s) => s.monto > 0) && (
            <div className="modal-grafico">
              <span className="modal-grafico-tit">Últimos 6 meses</span>
              <MiniLinea serie={serie} mesActualClave={mes} mon={mon} color={cat?.color || '#4f46e5'} />
            </div>
          )}
          {!gasto ? (
            <p className="modal-vacio">No hay nada cargado en este mes.</p>
          ) : gasto.esSemanal ? (
            <>
              <div className="modal-lista">
                {(gasto.montosSemana || []).map((m, i) => (
                  (Number(m) > 0) && (
                    <div key={i} className="modal-item">
                      <span className="mi-det">{gasto.fechas?.[i] ? fechaLarga(gasto.fechas[i]) : `Semana ${i + 1}`}</span>
                      <span className={`mi-estado ${gasto.semanas?.[i] ? 'ok' : ''}`}>{gasto.semanas?.[i] ? tagPagado : tagPend}</span>
                      <span className="mi-monto">{formatImporte(Number(m) || 0, mon)}</span>
                    </div>
                  )
                ))}
              </div>
              <div className="modal-total"><span>Total</span><span>{formatImporte(gasto.monto || 0, mon)}</span></div>
            </>
          ) : items.length ? (
            <>
              <div className="modal-lista">
                {items.map((it, i) => (
                  <div key={i} className="modal-item con-estado">
                    <span className="mi-det">
                      {it.detalle || 'Ítem'}
                      <span className={`mi-estado ${it.pagado ? 'ok' : ''}`}>{it.pagado ? tagPagado : tagPend}</span>
                    </span>
                    {it.moneda === 'usd' ? (
                      <span className="mi-conv">US$ {Number(it.monto) || 0} × {Number(it.cotizacion) || 0}</span>
                    ) : <span className="mi-conv" />}
                    <span className="mi-monto">{formatMoneda(pesosItem(it))}</span>
                  </div>
                ))}
              </div>
              <div className="modal-total"><span>Total</span><span>{formatImporte(gasto.monto || 0, mon)}</span></div>
            </>
          ) : (
            <div className="modal-simple">
              <span>Importe cargado</span>
              <strong>{formatImporte(gasto.monto || 0, mon)}</strong>
              {gasto.vencimiento ? (
                <span className="modal-vence">Vence {fechaCorta(gasto.vencimiento)} · {gasto.pagado ? (esIngreso ? 'Cobrado' : 'Pagado') : (esIngreso ? 'A cobrar' : 'Pendiente')}</span>
              ) : (
                <span className="modal-vence">{gasto.pagado ? (esIngreso ? 'Cobrado' : 'Pagado') : (esIngreso ? 'A cobrar' : 'Pendiente')}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Tabla = () => {
  const [mes, setMes] = useState(mesActual());
  const mes2 = mesVecino(mes, -2); // dos meses atrás
  const mes1 = mesVecino(mes, -1); // mes anterior
  const meses = [mes2, mes1, mes]; // de más viejo a actual

  const dos = useGastosMes(mes2);
  const uno = useGastosMes(mes1);
  const curr = useGastosMes(mes);
  const { getGrp, getCat } = useEstructura();
  const { hogar } = useHogar();
  const [detalle, setDetalle] = useState(null); // { concepto, mes, gasto, serie }

  const porMes = { [mes2]: dos.porConcepto, [mes1]: uno.porConcepto, [mes]: curr.porConcepto };
  // Para un suelto, su gasto del mes está en el mapa docs del pseudo-concepto.
  const gastoDe = (c, m) => (c.esSuelto ? c.docs[m] : porMes[m]?.[c.id]);

  // Serie de los últimos 12 meses (monto por mes) para el gráfico del modal.
  const serieUltimos = (docs, hasta, n = 12) => {
    const map = {};
    docs.forEach((d) => { if (d.mes) map[d.mes] = (map[d.mes] || 0) + (Number(d.monto) || 0); });
    return Array.from({ length: n }, (_, i) => {
      const mm = mesVecino(hasta, -(n - 1 - i));
      return { mes: mm, label: mesCorto(mm), monto: map[mm] || 0 };
    });
  };

  const abrir = async (c, m) => {
    setDetalle({ concepto: c, mes: m, gasto: gastoDe(c, m), serie: null });
    let docs = [];
    if (c.esSuelto) {
      docs = Object.entries(c.docs).map(([mm, d]) => ({ mes: mm, monto: Number(d.monto) || 0 }));
    } else if (hogar?.id) {
      const all = await listarGastosPorConcepto(hogar.id, c.id);
      docs = all.map((d) => ({ mes: d.mes, monto: Number(d.monto) || 0 }));
    }
    const serie = serieUltimos(docs, m, 6);
    setDetalle((prev) => (prev && prev.concepto.id === c.id && prev.mes === m ? { ...prev, serie } : prev));
  };

  const loading = curr.loading || uno.loading || dos.loading;
  const conceptos = curr.conceptos;

  // Pseudo-conceptos para los gastos sueltos: se agrupan por grupo + nombre y
  // se muestran como una fila más, con su monto en cada mes.
  const sueltosPorMes = { [mes2]: dos.sueltos || [], [mes1]: uno.sueltos || [], [mes]: curr.sueltos || [] };
  const mapaSueltos = {};
  meses.forEach((m) => (sueltosPorMes[m] || []).forEach((s) => {
    const key = `${s.grupoId || ''}||${(s.concepto || '').trim().toLowerCase()}`;
    if (!mapaSueltos[key]) {
      mapaSueltos[key] = {
        id: `suelto:${key}`, nombre: s.concepto, grupoId: s.grupoId || '',
        categoriaId: s.categoriaId || '', tipo: 'gasto', moneda: 'ars',
        esSuelto: true, montos: {}, docs: {},
      };
    }
    mapaSueltos[key].montos[m] = (mapaSueltos[key].montos[m] || 0) + (Number(s.monto) || 0);
    mapaSueltos[key].docs[m] = s;
  }));
  const sueltoCs = Object.values(mapaSueltos);

  const mA = (c) => (c.esSuelto ? (c.montos[mes2] || 0) : Number(dos.porConcepto[c.id]?.monto) || 0);  // mes -2
  const mB = (c) => (c.esSuelto ? (c.montos[mes1] || 0) : Number(uno.porConcepto[c.id]?.monto) || 0);  // mes -1
  const mC = (c) => (c.esSuelto ? (c.montos[mes] || 0) : Number(curr.porConcepto[c.id]?.monto) || 0);  // actual

  // Visibles: conceptos que aplican o tienen gasto en alguno de los 3 meses.
  const aplicaAlguno = (c) =>
    aplicaEnMes(c, mes2) || aplicaEnMes(c, mes1) || aplicaEnMes(c, mes) ||
    mA(c) || mB(c) || mC(c);

  const visibles = conceptos.filter(aplicaAlguno);
  const gastoCs   = [...visibles.filter((c) => (c.tipo || 'gasto') === 'gasto'), ...sueltoCs];
  const ingresoCs = visibles.filter((c) => c.tipo === 'ingreso');
  const ahorroCs  = conceptos.filter((c) => c.tipo === 'ahorro');

  const sumar = (arr, f) => arr.reduce((a, c) => a + f(c), 0);

  // Saldo acumulado de ahorro hasta cada mes.
  const sA = (c) => curr.saldoAhorro(c.id, mes2);
  const sB = (c) => curr.saldoAhorro(c.id, mes1);
  const sC = (c) => curr.saldoAhorro(c.id, mes);

  const Seccion = ({ titulo, lista, esIngreso }) => {
    // Ordenados por grupo, pero sin filas de subtotal: el grupo va como
    // etiqueta en la misma línea del concepto.
    const ordenada = agrupar(lista).flatMap((g) => g.items);
    const ars = lista.filter((c) => c.moneda !== 'usd');
    const usd = lista.filter((c) => c.moneda === 'usd');
    const totA = sumar(ars, mA), totB = sumar(ars, mB), totC = sumar(ars, mC);
    const usdA = sumar(usd, mA), usdB = sumar(usd, mB), usdC = sumar(usd, mC);
    return (
      <table className={`tabla-excel comparativa ${esIngreso ? 'sec-ingresos' : 'sec-gastos'}`}>
        <thead>
          <tr><th className="th-titulo" colSpan={6}>{esIngreso ? '💰 ' : '💸 '}{titulo}</th></tr>
          <tr>
            <th>Concepto</th>
            <th className="th-imp">{mesCorto(mes2)}</th>
            <th className="th-var">Var.</th>
            <th className="th-imp">{mesCorto(mes1)}</th>
            <th className="th-var">Var.</th>
            <th className="th-imp th-actual">{mesCorto(mes)}</th>
          </tr>
        </thead>
        <tbody>
          {ordenada.map((c) => {
            const a = mA(c), b = mB(c), cc = mC(c);
            const vIzq = variacion(a, b);   // mes-2 → mes-1
            const vDer = variacion(b, cc);  // mes-1 → actual
            const grupo = c.grupoId ? (getGrp(c.grupoId)?.nombre || '') : '';
            const tono = filaTono(vDer.dir, esIngreso);
            return (
              <tr key={c.id} className={`${cc !== 0 ? '' : 'fila-vacia'} ${tono}`}>
                <td className="td-concepto td-click" onClick={() => abrir(c, mes)}>
                  {c.nombre}
                  {c.esSuelto && <span className="td-suelto">suelto</span>}
                  {grupo && <span className="td-grupo">{grupo}</span>}
                </td>
                <td className="td-imp td-click" onClick={() => abrir(c, mes2)}><Monto v={a} mon={c.moneda} /></td>
                <td className={`td-var ${varClase(vIzq.dir, esIngreso)}`}>{vIzq.txt}</td>
                <td className="td-imp td-click" onClick={() => abrir(c, mes1)}><Monto v={b} mon={c.moneda} /></td>
                <td className={`td-var ${varClase(vDer.dir, esIngreso)}`}>{vDer.txt}</td>
                <td className="td-imp td-actual td-click" onClick={() => abrir(c, mes)}><Monto v={cc} mon={c.moneda} /></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="fila-total">
            <td>Total {usd.length > 0 ? '$' : ''}</td>
            <td className="td-imp">{formatMoneda(totA)}</td>
            <td className={`td-var ${varClase(variacion(totA, totB).dir, esIngreso)}`}>{variacion(totA, totB).txt}</td>
            <td className="td-imp">{formatMoneda(totB)}</td>
            <td className={`td-var ${varClase(variacion(totB, totC).dir, esIngreso)}`}>{variacion(totB, totC).txt}</td>
            <td className="td-imp td-actual">{formatMoneda(totC)}</td>
          </tr>
          {usd.length > 0 && (
            <tr className="fila-total fila-total-usd">
              <td>Total US$</td>
              <td className="td-imp">{formatUSD(usdA)}</td>
              <td className={`td-var ${varClase(variacion(usdA, usdB).dir, esIngreso)}`}>{variacion(usdA, usdB).txt}</td>
              <td className="td-imp">{formatUSD(usdB)}</td>
              <td className={`td-var ${varClase(variacion(usdB, usdC).dir, esIngreso)}`}>{variacion(usdB, usdC).txt}</td>
              <td className="td-imp td-actual">{formatUSD(usdC)}</td>
            </tr>
          )}
        </tfoot>
      </table>
    );
  };

  // Movimiento (importe cargado) de un ahorro en un mes.
  const movAh = (c, m) => Number(curr.ahorros.find((a) => a.conceptoId === c.id && a.mes === m)?.monto) || 0;

  // Celda de ahorro: movimiento del mes arriba, saldo acumulado abajo.
  const CeldaAhorro = ({ mov, saldo, mon, actualCol, onClick }) => (
    <td className={`td-mes td-click ${actualCol ? 'td-actual' : ''}`} onClick={onClick}>
      <span className={`celda-mov ${mov > 0 ? 'pos' : mov < 0 ? 'neg' : ''}`}>
        {mov !== 0 ? `${mov > 0 ? '+' : ''}${formatImporte(mov, mon)}` : '—'}
      </span>
      <span className="celda-monto">{formatImporte(saldo, mon)}</span>
    </td>
  );

  // Sección de ahorros: movimiento por mes + saldo acumulado.
  const SeccionAhorros = ({ lista }) => {
    const filas = agrupar(lista).flatMap((g) => g.items);
    const ars = lista.filter((c) => c.moneda !== 'usd');
    const usd = lista.filter((c) => c.moneda === 'usd');
    const totalSaldo = (arr, f) => arr.reduce((a, c) => a + f(c), 0);
    const totalMov = (arr, m) => arr.reduce((a, c) => a + movAh(c, m), 0);
    return (
      <table className="tabla-excel serie ahorros">
        <thead>
          <tr><th className="th-titulo" colSpan={meses.length + 1}>🏦 AHORROS · movimiento y saldo acumulado</th></tr>
          <tr>
            <th>Concepto</th>
            {meses.map((m) => (
              <th key={m} className={`th-mes ${m === mes ? 'th-actual' : ''}`}>{mesCorto(m)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((c) => {
            const grupo = c.grupoId ? (getGrp(c.grupoId)?.nombre || '') : '';
            const saldos = { [mes2]: sA(c), [mes1]: sB(c), [mes]: sC(c) };
            return (
              <tr key={c.id}>
                <td className="td-concepto">{c.nombre}{grupo && <span className="td-grupo">{grupo}</span>}</td>
                {meses.map((m) => (
                  <CeldaAhorro key={m} mov={movAh(c, m)} saldo={saldos[m]} mon={c.moneda} actualCol={m === mes} onClick={() => abrir(c, m)} />
                ))}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          {ars.length > 0 && (
            <tr className="fila-total">
              <td>Total {usd.length > 0 ? '$' : ''}</td>
              {meses.map((m) => (
                <td key={m} className={`td-mes ${m === mes ? 'td-actual' : ''}`}>
                  <span className="celda-mov">{formatMoneda(totalMov(ars, m))}</span>
                  <span className="celda-monto">{formatMoneda(totalSaldo(ars, { [mes2]: sA, [mes1]: sB, [mes]: sC }[m]))}</span>
                </td>
              ))}
            </tr>
          )}
          {usd.length > 0 && (
            <tr className="fila-total fila-total-usd">
              <td>Total US$</td>
              {meses.map((m) => (
                <td key={m} className={`td-mes ${m === mes ? 'td-actual' : ''}`}>
                  <span className="celda-mov">{formatUSD(totalMov(usd, m))}</span>
                  <span className="celda-monto">{formatUSD(totalSaldo(usd, { [mes2]: sA, [mes1]: sB, [mes]: sC }[m]))}</span>
                </td>
              ))}
            </tr>
          )}
        </tfoot>
      </table>
    );
  };

  return (
    <Layout>
      <div className="gastos-page ancho">
        <header className="pg-header">
          <div>
            <h1>📋 Comparativa</h1>
            <p className="pg-sub">{mesLegible(mes2)} · {mesLegible(mes1)} · {mesLegible(mes)}</p>
          </div>
          <MesSelector mes={mes} onChange={setMes} />
        </header>

        {loading ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : conceptos.length === 0 ? (
          <section className="card"><p className="pg-vacio-inline">No hay conceptos cargados.</p></section>
        ) : (
          <div className="tablas-grid">
            <div className="col-tabla"><Seccion titulo="GASTOS" lista={gastoCs} /></div>
            <div className="col-tabla">
              {ingresoCs.length > 0 && <Seccion titulo="INGRESOS" lista={ingresoCs} esIngreso />}
              {ahorroCs.length > 0 && <SeccionAhorros lista={ahorroCs} />}
            </div>
            <p className="tabla-nota">Tocá un importe para ver el detalle. Cada <strong>Var.</strong> compara con el mes de su izquierda. ▲ subió · ▼ bajó.</p>
          </div>
        )}

        {detalle && (
          <DetalleModal data={detalle} cat={getCat(detalle.concepto.categoriaId)} onClose={() => setDetalle(null)} />
        )}
      </div>
    </Layout>
  );
};

export default Tabla;
