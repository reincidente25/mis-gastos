// src/pages/Tabla.jsx — comparación de 3 meses (anterior · actual · próximo)
// con % de variación por concepto.
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import { useGastosMes } from '../hooks/useGastosMes';
import { useEstructura } from '../context/EstructuraContext';
import { formatMoneda, mesActual, mesLegible, mesCorto, mesVecino, aplicaEnMes } from '../utils/format';
import './Tabla.css';

// Variación porcentual de `curr` respecto de `prev`.
const variacion = (prev, curr) => {
  if (!prev && !curr) return { txt: '—', cls: 'var-nula' };
  if (!prev && curr) return { txt: 'nuevo', cls: 'var-nuevo' };
  if (prev && !curr) return { txt: '−100%', cls: 'var-baja' };
  const pct = ((curr - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return { txt: '=', cls: 'var-nula' };
  const signo = pct > 0 ? '▲' : '▼';
  return {
    txt: `${signo} ${Math.abs(pct) >= 100 ? Math.round(Math.abs(pct)) : Math.abs(pct).toFixed(0)}%`,
    cls: pct > 0 ? 'var-sube' : 'var-baja',
  };
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

const Monto = ({ v }) => (
  v > 0 ? <span className="tb-imp">{formatMoneda(v)}</span> : <span className="tb-imp vacio">$ -</span>
);

const Tabla = () => {
  const [mes, setMes] = useState(mesActual());
  const mesPrev = mesVecino(mes, -1);
  const mesNext = mesVecino(mes, 1);

  const prev = useGastosMes(mesPrev);
  const curr = useGastosMes(mes);
  const next = useGastosMes(mesNext);
  const { getGrp } = useEstructura();

  const loading = curr.loading || prev.loading || next.loading;
  const conceptos = curr.conceptos;

  const mA = (c) => Number(prev.porConcepto[c.id]?.monto) || 0;
  const mB = (c) => Number(curr.porConcepto[c.id]?.monto) || 0;
  const mC = (c) => Number(next.porConcepto[c.id]?.monto) || 0;

  // Visibles: conceptos que aplican o tienen gasto en alguno de los 3 meses.
  const aplicaAlguno = (c) =>
    aplicaEnMes(c, mesPrev) || aplicaEnMes(c, mes) || aplicaEnMes(c, mesNext) ||
    mA(c) || mB(c) || mC(c);

  const visibles = conceptos.filter(aplicaAlguno);
  const gastoCs   = visibles.filter((c) => (c.tipo || 'gasto') !== 'ingreso');
  const ingresoCs = visibles.filter((c) => c.tipo === 'ingreso');

  const sumar = (arr, f) => arr.reduce((a, c) => a + f(c), 0);

  const Seccion = ({ titulo, lista }) => {
    // Ordenados por grupo, pero sin filas de subtotal: el grupo va como
    // etiqueta en la misma línea del concepto.
    const ordenada = agrupar(lista).flatMap((g) => g.items);
    const totA = sumar(lista, mA), totB = sumar(lista, mB), totC = sumar(lista, mC);
    return (
      <table className="tabla-excel comparativa">
        <thead>
          <tr><th className="th-titulo" colSpan={6}>{titulo}</th></tr>
          <tr>
            <th>Concepto</th>
            <th className="th-imp">{mesCorto(mesPrev)}</th>
            <th className="th-var">Var.</th>
            <th className="th-imp th-actual">{mesCorto(mes)}</th>
            <th className="th-var">Var.</th>
            <th className="th-imp">{mesCorto(mesNext)}</th>
          </tr>
        </thead>
        <tbody>
          {ordenada.map((c) => {
            const a = mA(c), b = mB(c), cc = mC(c);
            const vIzq = variacion(a, b);   // anterior → actual
            const vDer = variacion(b, cc);  // actual → próximo
            const grupo = c.grupoId ? (getGrp(c.grupoId)?.nombre || '') : '';
            const tono = vIzq.cls === 'var-sube' ? 'fila-sube' : vIzq.cls === 'var-baja' ? 'fila-baja' : '';
            return (
              <tr key={c.id} className={`${b > 0 ? '' : 'fila-vacia'} ${tono}`}>
                <td className="td-concepto">
                  {c.nombre}
                  {grupo && <span className="td-grupo">{grupo}</span>}
                </td>
                <td className="td-imp"><Monto v={a} /></td>
                <td className={`td-var ${vIzq.cls}`}>{vIzq.txt}</td>
                <td className="td-imp td-actual"><Monto v={b} /></td>
                <td className={`td-var ${vDer.cls}`}>{vDer.txt}</td>
                <td className="td-imp"><Monto v={cc} /></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="fila-total">
            <td>Total</td>
            <td className="td-imp">{formatMoneda(totA)}</td>
            <td className={`td-var ${variacion(totA, totB).cls}`}>{variacion(totA, totB).txt}</td>
            <td className="td-imp td-actual">{formatMoneda(totB)}</td>
            <td className={`td-var ${variacion(totB, totC).cls}`}>{variacion(totB, totC).txt}</td>
            <td className="td-imp">{formatMoneda(totC)}</td>
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
            <p className="pg-sub">{mesLegible(mesPrev)} · {mesLegible(mes)} · {mesLegible(mesNext)}</p>
          </div>
          <MesSelector mes={mes} onChange={setMes} />
        </header>

        {loading ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : conceptos.length === 0 ? (
          <section className="card"><p className="pg-vacio-inline">No hay conceptos cargados.</p></section>
        ) : (
          <div className="tablas-wrap">
            <Seccion titulo="GASTOS" lista={gastoCs} />
            {ingresoCs.length > 0 && <Seccion titulo="INGRESOS" lista={ingresoCs} />}
            <p className="tabla-nota">Cada <strong>Var.</strong> compara con el mes de su izquierda. ▲ subió · ▼ bajó.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tabla;
