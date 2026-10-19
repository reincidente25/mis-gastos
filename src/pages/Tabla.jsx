// src/pages/Tabla.jsx — comparación de 3 meses (anterior · actual · próximo)
// con % de variación por concepto.
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import { useGastosMes } from '../hooks/useGastosMes';
import { useEstructura } from '../context/EstructuraContext';
import { formatMoneda, formatUSD, formatImporte, mesActual, mesLegible, mesCorto, mesVecino, aplicaEnMes } from '../utils/format';
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
  v > 0 ? <span className="tb-imp">{formatImporte(v, mon)}</span> : <span className="tb-imp vacio">$ -</span>
);

const Tabla = () => {
  const [mes, setMes] = useState(mesActual());
  const mes2 = mesVecino(mes, -2); // dos meses atrás
  const mes1 = mesVecino(mes, -1); // mes anterior

  const dos = useGastosMes(mes2);
  const uno = useGastosMes(mes1);
  const curr = useGastosMes(mes);
  const { getGrp } = useEstructura();

  const loading = curr.loading || uno.loading || dos.loading;
  const conceptos = curr.conceptos;

  const mA = (c) => Number(dos.porConcepto[c.id]?.monto) || 0;  // mes -2
  const mB = (c) => Number(uno.porConcepto[c.id]?.monto) || 0;  // mes -1
  const mC = (c) => Number(curr.porConcepto[c.id]?.monto) || 0; // actual

  // Visibles: conceptos que aplican o tienen gasto en alguno de los 3 meses.
  const aplicaAlguno = (c) =>
    aplicaEnMes(c, mes2) || aplicaEnMes(c, mes1) || aplicaEnMes(c, mes) ||
    mA(c) || mB(c) || mC(c);

  const visibles = conceptos.filter(aplicaAlguno);
  const gastoCs   = visibles.filter((c) => (c.tipo || 'gasto') !== 'ingreso');
  const ingresoCs = visibles.filter((c) => c.tipo === 'ingreso');

  const sumar = (arr, f) => arr.reduce((a, c) => a + f(c), 0);

  const Seccion = ({ titulo, lista, esIngreso }) => {
    // Ordenados por grupo, pero sin filas de subtotal: el grupo va como
    // etiqueta en la misma línea del concepto.
    const ordenada = agrupar(lista).flatMap((g) => g.items);
    const ars = lista.filter((c) => c.moneda !== 'usd');
    const usd = lista.filter((c) => c.moneda === 'usd');
    const totA = sumar(ars, mA), totB = sumar(ars, mB), totC = sumar(ars, mC);
    const usdA = sumar(usd, mA), usdB = sumar(usd, mB), usdC = sumar(usd, mC);
    return (
      <table className="tabla-excel comparativa">
        <thead>
          <tr><th className="th-titulo" colSpan={6}>{titulo}</th></tr>
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
              <tr key={c.id} className={`${cc > 0 ? '' : 'fila-vacia'} ${tono}`}>
                <td className="td-concepto">
                  {c.nombre}
                  {grupo && <span className="td-grupo">{grupo}</span>}
                </td>
                <td className="td-imp"><Monto v={a} mon={c.moneda} /></td>
                <td className={`td-var ${varClase(vIzq.dir, esIngreso)}`}>{vIzq.txt}</td>
                <td className="td-imp"><Monto v={b} mon={c.moneda} /></td>
                <td className={`td-var ${varClase(vDer.dir, esIngreso)}`}>{vDer.txt}</td>
                <td className="td-imp td-actual"><Monto v={cc} mon={c.moneda} /></td>
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
          <div className="tablas-wrap">
            <Seccion titulo="GASTOS" lista={gastoCs} />
            {ingresoCs.length > 0 && <Seccion titulo="INGRESOS" lista={ingresoCs} esIngreso />}
            <p className="tabla-nota">Cada <strong>Var.</strong> compara con el mes de su izquierda. ▲ subió · ▼ bajó.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tabla;
