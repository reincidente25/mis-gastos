// src/pages/Tabla.jsx — comparativa de los últimos meses (el actual a la
// derecha). Entre cada par de meses, la variación del concepto contra su
// período anterior (bimestral vs. bimestre, mensual vs. mes previo, etc.).
import { useState, Fragment } from 'react';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import { useGastosRango } from '../hooks/useGastosRango';
import { useEstructura } from '../context/EstructuraContext';
import { getFrecuencia } from '../config/frecuencias';
import { formatMoneda, mesActual, mesLegible, mesCorto, mesVecino, aplicaEnMes } from '../utils/format';
import './Tabla.css';

const MESES_VISTA = 5; // cantidad de meses mostrados (incluye el actual)

// Variación porcentual de `curr` respecto de `prev`.
const variacion = (prev, curr) => {
  if (!prev && !curr) return { txt: '', cls: 'var-nula' };
  if (!prev && curr) return { txt: 'nuevo', cls: 'var-nuevo' };
  if (prev && !curr) return { txt: '−100%', cls: 'var-baja' };
  const pct = ((curr - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return { txt: '=', cls: 'var-nula' };
  return { txt: `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}%`, cls: pct > 0 ? 'var-sube' : 'var-baja' };
};

// Meses entre ocurrencias según la frecuencia (0 = sin comparación).
const intervalo = (c) => getFrecuencia(c.frecuencia).meses || 1;

// Ordena por grupo, preservando orden de aparición; grupo '' al final.
const ordenarPorGrupo = (conceptos) => {
  const orden = [], mapa = {};
  conceptos.forEach((c) => {
    const k = c.grupoId || '';
    if (!mapa[k]) { mapa[k] = []; orden.push(k); }
    mapa[k].push(c);
  });
  return orden.sort((a, b) => (a === '' ? 1 : 0) - (b === '' ? 1 : 0)).flatMap((k) => mapa[k]);
};

const Monto = ({ v }) => (
  v > 0 ? <span className="tb-imp">{formatMoneda(v)}</span> : <span className="tb-imp vacio">$ -</span>
);

const Tabla = () => {
  const [mesBase, setMesBase] = useState(mesActual());

  // Meses de más viejo a más nuevo; el actual (mesBase) queda a la derecha.
  const meses = Array.from({ length: MESES_VISTA }, (_, i) => mesVecino(mesBase, -(MESES_VISTA - 1 - i)));
  const actual = meses[meses.length - 1];

  const { conceptos, porMes, loading } = useGastosRango(meses);
  const { getGrp } = useEstructura();

  const montoEn = (m, c) => Number(porMes[m]?.[c.id]?.monto) || 0;

  // Variación de un concepto en el mes `m` contra su período anterior.
  const varDe = (m, c) => {
    const cada = intervalo(c);
    if (cada <= 0) return { txt: '', cls: 'var-nula' };
    const base = mesVecino(m, -cada);
    return variacion(base in porMes ? montoEn(base, c) : 0, montoEn(m, c));
  };

  // Visibles: aplican o tienen monto en alguno de los meses mostrados.
  const visibles = conceptos.filter((c) => meses.some((m) => aplicaEnMes(c, m) || montoEn(m, c)));
  const gastoCs   = visibles.filter((c) => (c.tipo || 'gasto') !== 'ingreso');
  const ingresoCs = visibles.filter((c) => c.tipo === 'ingreso');

  const totalMes = (lista, m) => lista.reduce((a, c) => a + montoEn(m, c), 0);

  const Seccion = ({ titulo, lista }) => {
    const filas = ordenarPorGrupo(lista);
    // nº de columnas = 1 (concepto) + meses + variaciones entre meses
    const cols = 1 + meses.length + (meses.length - 1);
    return (
      <table className="tabla-excel comparativa">
        <thead>
          <tr><th className="th-titulo" colSpan={cols}>{titulo}</th></tr>
          <tr>
            <th>Concepto</th>
            {meses.map((m, i) => (
              <Fragment key={m}>
                {i > 0 && <th className="th-var">Var.</th>}
                <th className={`th-imp ${m === actual ? 'th-actual' : ''}`}>{mesCorto(m)}</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((c) => {
            const grupo = c.grupoId ? (getGrp(c.grupoId)?.nombre || '') : '';
            const vAct = varDe(actual, c);
            const tono = vAct.cls === 'var-sube' ? 'fila-sube' : vAct.cls === 'var-baja' ? 'fila-baja' : '';
            return (
              <tr key={c.id} className={`${montoEn(actual, c) > 0 ? '' : 'fila-vacia'} ${tono}`}>
                <td className="td-concepto">
                  {c.nombre}
                  {grupo && <span className="td-grupo">{grupo}</span>}
                </td>
                {meses.map((m, i) => {
                  const v = varDe(m, c);
                  return (
                    <Fragment key={m}>
                      {i > 0 && <td className={`td-var ${v.cls}`}>{v.txt}</td>}
                      <td className={`td-imp ${m === actual ? 'td-actual' : ''}`}><Monto v={montoEn(m, c)} /></td>
                    </Fragment>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="fila-total">
            <td>Total</td>
            {meses.map((m, i) => {
              const t = totalMes(lista, m);
              const v = i > 0 ? variacion(totalMes(lista, meses[i - 1]), t) : null;
              return (
                <Fragment key={m}>
                  {i > 0 && <td className={`td-var ${v.cls}`}>{v.txt}</td>}
                  <td className={`td-imp ${m === actual ? 'td-actual' : ''}`}>{formatMoneda(t)}</td>
                </Fragment>
              );
            })}
          </tr>
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
            <p className="pg-sub">{mesLegible(meses[0])} → {mesLegible(actual)}</p>
          </div>
          <MesSelector mes={mesBase} onChange={setMesBase} />
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
              Cada <strong>Var.</strong> compara el mes con el período anterior del concepto
              (bimestral vs. bimestre, mensual vs. mes previo). ▲ subió · ▼ bajó.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tabla;
