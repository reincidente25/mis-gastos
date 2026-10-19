// src/pages/Tabla.jsx — serie de varios meses con el mes actual a la derecha.
// La variación de cada concepto se calcula contra su período anterior
// (mensual vs. mes anterior, bimestral vs. bimestre anterior, etc.).
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import { useGastosRango } from '../hooks/useGastosRango';
import { useEstructura } from '../context/EstructuraContext';
import { getFrecuencia } from '../config/frecuencias';
import { formatMoneda, mesActual, mesLegible, mesCorto, mesVecino, aplicaEnMes } from '../utils/format';
import './Tabla.css';

// Variación porcentual de `curr` respecto de `prev`.
const variacion = (prev, curr) => {
  if (!prev && !curr) return null;
  if (!prev && curr) return { txt: 'nuevo', cls: 'var-nuevo' };
  if (prev && !curr) return { txt: '−100%', cls: 'var-baja' };
  const pct = ((curr - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return { txt: '=', cls: 'var-nula' };
  return { txt: `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}%`, cls: pct > 0 ? 'var-sube' : 'var-baja' };
};

// Meses entre ocurrencias según la frecuencia (0 = sin comparación).
const intervalo = (c) => getFrecuencia(c.frecuencia).meses || 1;

// Agrupa por grupoId preservando orden; grupo '' al final.
const agrupar = (conceptos) => {
  const orden = [], mapa = {};
  conceptos.forEach((c) => {
    const k = c.grupoId || '';
    if (!mapa[k]) { mapa[k] = []; orden.push(k); }
    mapa[k].push(c);
  });
  return orden.sort((a, b) => (a === '' ? 1 : 0) - (b === '' ? 1 : 0)).flatMap((k) => mapa[k]);
};

const OPCIONES_ATRAS = [3, 5, 8, 11];

const Tabla = () => {
  const [mesBase, setMesBase] = useState(mesActual());
  const [atras, setAtras] = useState(5);

  // Meses de más viejo a más nuevo; el actual (mesBase) queda a la derecha.
  const meses = Array.from({ length: atras + 1 }, (_, i) => mesVecino(mesBase, -(atras - i)));
  const actual = meses[meses.length - 1];

  const { conceptos, porMes, loading } = useGastosRango(meses);
  const { getGrp } = useEstructura();

  const montoEn = (m, c) => Number(porMes[m]?.[c.id]?.monto) || 0;

  // Variación de un concepto en el mes `m` contra su período anterior.
  const varDe = (m, c) => {
    const cada = intervalo(c);
    if (cada <= 0) return null;
    const base = mesVecino(m, -cada);
    if (!(base in porMes)) return null; // fuera del rango traído
    return variacion(montoEn(base, c), montoEn(m, c));
  };

  // Visibles: aplican o tienen monto en alguno de los meses mostrados.
  const visible = (c) => meses.some((m) => aplicaEnMes(c, m) || montoEn(m, c));

  const visibles = conceptos.filter(visible);
  const gastoCs   = visibles.filter((c) => (c.tipo || 'gasto') !== 'ingreso');
  const ingresoCs = visibles.filter((c) => c.tipo === 'ingreso');

  const totalMes = (lista, m) => lista.reduce((a, c) => a + montoEn(m, c), 0);

  const Celda = ({ monto, v, actualCol }) => (
    <td className={`td-mes ${actualCol ? 'td-actual' : ''}`}>
      <span className={`celda-monto ${monto > 0 ? '' : 'vacio'}`}>{monto > 0 ? formatMoneda(monto) : '$ -'}</span>
      {v && <span className={`celda-var ${v.cls}`}>{v.txt}</span>}
    </td>
  );

  const Seccion = ({ titulo, lista }) => (
    <table className="tabla-excel serie">
      <thead>
        <tr><th className="th-titulo" colSpan={meses.length + 1}>{titulo}</th></tr>
        <tr>
          <th>Concepto</th>
          {meses.map((m) => (
            <th key={m} className={`th-mes ${m === actual ? 'th-actual' : ''}`}>{mesCorto(m)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {agrupar(lista).map((c) => {
          const grupo = c.grupoId ? (getGrp(c.grupoId)?.nombre || '') : '';
          const vActual = varDe(actual, c);
          const tono = vActual?.cls === 'var-sube' ? 'fila-sube' : vActual?.cls === 'var-baja' ? 'fila-baja' : '';
          return (
            <tr key={c.id} className={tono}>
              <td className="td-concepto">
                {c.nombre}
                {grupo && <span className="td-grupo">{grupo}</span>}
              </td>
              {meses.map((m) => (
                <Celda key={m} monto={montoEn(m, c)} v={varDe(m, c)} actualCol={m === actual} />
              ))}
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="fila-total">
          <td>Total</td>
          {meses.map((m, i) => {
            const t = totalMes(lista, m);
            const tPrev = i > 0 ? totalMes(lista, meses[i - 1]) : 0;
            const v = i > 0 ? variacion(tPrev, t) : null;
            return (
              <td key={m} className={`td-mes ${m === actual ? 'td-actual' : ''}`}>
                <span className="celda-monto">{formatMoneda(t)}</span>
                {v && <span className={`celda-var ${v.cls}`}>{v.txt}</span>}
              </td>
            );
          })}
        </tr>
      </tfoot>
    </table>
  );

  return (
    <Layout>
      <div className="gastos-page ancho">
        <header className="pg-header">
          <div>
            <h1>📈 Comparativa</h1>
            <p className="pg-sub">{mesLegible(meses[0])} → {mesLegible(actual)}</p>
          </div>
          <div className="tabla-acciones">
            <label className="meses-atras">
              Meses:
              <select value={atras} onChange={(e) => setAtras(Number(e.target.value))}>
                {OPCIONES_ATRAS.map((n) => <option key={n} value={n}>{n + 1}</option>)}
              </select>
            </label>
            <MesSelector mes={mesBase} onChange={setMesBase} />
          </div>
        </header>

        {loading ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : conceptos.length === 0 ? (
          <section className="card"><p className="pg-vacio-inline">No hay conceptos cargados.</p></section>
        ) : (
          <div className="tablas-wrap">
            <div className="tabla-scroll"><Seccion titulo="GASTOS" lista={gastoCs} /></div>
            {ingresoCs.length > 0 && <div className="tabla-scroll"><Seccion titulo="INGRESOS" lista={ingresoCs} /></div>}
            <p className="tabla-nota">
              Cada mes muestra su variación contra el período anterior del concepto
              (mensual vs. mes previo, bimestral vs. bimestre, etc.). ▲ subió · ▼ bajó.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tabla;
