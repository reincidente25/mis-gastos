// src/pages/Tabla.jsx — vista compacta "estilo Excel" del mes.
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import { useGastosMes } from '../hooks/useGastosMes';
import { useEstructura } from '../context/EstructuraContext';
import { formatMoneda, mesActual, mesLegible, aplicaEnMes } from '../utils/format';
import './Tabla.css';

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

const Importe = ({ monto }) => (
  monto > 0
    ? <span className="tb-imp">{formatMoneda(monto)}</span>
    : <span className="tb-imp vacio">$ -</span>
);

const Tabla = () => {
  const [mes, setMes] = useState(mesActual());
  const [verTodos, setVerTodos] = useState(false);
  const { conceptos, porConcepto, loading } = useGastosMes(mes);
  const { getGrp } = useEstructura();

  const visibles = verTodos
    ? conceptos
    : conceptos.filter((c) => aplicaEnMes(c, mes) || porConcepto[c.id]);

  const gastoCs   = visibles.filter((c) => (c.tipo || 'gasto') !== 'ingreso');
  const ingresoCs = visibles.filter((c) => c.tipo === 'ingreso');

  const montoDe = (c) => Number(porConcepto[c.id]?.monto) || 0;
  const sumar = (arr) => arr.reduce((a, c) => a + montoDe(c), 0);

  const totalGastos = sumar(gastoCs);
  const totalIngresos = ingresoCs.reduce((a, c) => a + (porConcepto[c.id]?.pagado ? montoDe(c) : 0), 0);

  const Seccion = ({ titulo, grupos, total }) => (
    <table className="tabla-excel">
      <thead>
        <tr><th className="th-titulo" colSpan={2}>{titulo}</th></tr>
        <tr><th>Concepto</th><th className="th-imp">Importe</th></tr>
      </thead>
      <tbody>
        {grupos.map((g) => (
          <GrupoFilas key={g.grupoId || '__sin'} g={g} />
        ))}
      </tbody>
      <tfoot>
        <tr className="fila-total">
          <td>Total {titulo.split(' ')[0]}</td>
          <td className="td-imp">{formatMoneda(total)}</td>
        </tr>
      </tfoot>
    </table>
  );

  const GrupoFilas = ({ g }) => {
    const nombre = g.grupoId ? (getGrp(g.grupoId)?.nombre || 'Grupo') : null;
    const sub = sumar(g.items);
    return (
      <>
        {nombre && (
          <tr className="fila-grupo">
            <td>{nombre}</td>
            <td className="td-imp">{formatMoneda(sub)}</td>
          </tr>
        )}
        {g.items.map((c) => {
          const m = montoDe(c);
          const gasto = porConcepto[c.id];
          return (
            <tr key={c.id} className={m > 0 ? '' : 'fila-vacia'}>
              <td className="td-concepto">
                {nombre ? <span className="td-indent" /> : null}
                {c.nombre}
                {gasto?.items?.length ? <span className="td-items">· {gasto.items.length}</span> : null}
              </td>
              <td className="td-imp"><Importe monto={m} /></td>
            </tr>
          );
        })}
      </>
    );
  };

  return (
    <Layout>
      <div className="gastos-page ancho">
        <header className="pg-header">
          <div>
            <h1>📋 Tabla</h1>
            <p className="pg-sub">Vista compacta del mes — {mesLegible(mes)}</p>
          </div>
          <div className="tabla-acciones">
            <label className="ver-todos">
              <input type="checkbox" checked={verTodos} onChange={(e) => setVerTodos(e.target.checked)} />
              Ver todos
            </label>
            <MesSelector mes={mes} onChange={setMes} />
          </div>
        </header>

        {loading ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : conceptos.length === 0 ? (
          <section className="card"><p className="pg-vacio-inline">No hay conceptos cargados.</p></section>
        ) : (
          <div className="tablas-wrap">
            <Seccion titulo={`GASTOS ${mesLegible(mes).toUpperCase()}`} grupos={agrupar(gastoCs)} total={totalGastos} />
            {ingresoCs.length > 0 && (
              <Seccion titulo={`INGRESOS ${mesLegible(mes).toUpperCase()}`} grupos={agrupar(ingresoCs)} total={totalIngresos} />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tabla;
