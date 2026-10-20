// src/pages/Home.jsx — dashboard rediseñado.
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import { useHogar } from '../context/HogarContext';
import { useEstructura } from '../context/EstructuraContext';
import { useResumenAnual } from '../hooks/useResumenAnual';
import { EvolucionMensual, LineaSaldo } from '../components/dashboard/Charts';
import { formatMoneda, formatUSD, mesActual, mesLegible } from '../utils/format';
import './Home.css';

const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0);

const Home = () => {
  const { hogar } = useHogar();
  const { getCat } = useEstructura();
  const [mes, setMes] = useState(mesActual());
  const { loading, serie, ahorroSerie, usdSerie, mesStats } = useResumenAnual(mes);
  const anio = mes.slice(0, 4);

  const porCategoria = useMemo(() => (
    Object.entries(mesStats.porCat)
      .map(([id, monto]) => ({ cat: getCat(id), monto }))
      .sort((a, b) => b.monto - a.monto)
  ), [mesStats, getCat]);
  const mayor = porCategoria[0]?.monto || 0;
  const { ingresos, gastos, balance, pagado, pendiente } = mesStats;

  const ahorroUltimo = ahorroSerie.puntos[ahorroSerie.puntos.length - 1] || { ars: 0, usd: 0 };
  const usdUltimo = usdSerie.puntos[usdSerie.puntos.length - 1]?.saldo || 0;

  return (
    <Layout>
      <div className="home-page">
        <header className="pg-header">
          <div>
            <h1>{hogar?.nombre || 'Resumen'}</h1>
            <p className="pg-sub">{mesLegible(mes)}</p>
          </div>
          <MesSelector mes={mes} onChange={setMes} />
        </header>

        {loading ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : (
          <>
            {/* KPIs del mes */}
            <div className="kpi-row">
              <div className="kpi">
                <span className="kpi-label">💰 Ingresos cobrados</span>
                <span className="kpi-valor ingreso">{formatMoneda(ingresos)}</span>
              </div>
              <div className="kpi">
                <span className="kpi-label">💸 Gastos</span>
                <span className="kpi-valor gasto">{formatMoneda(gastos)}</span>
              </div>
              <div className={`kpi destacado ${balance < 0 ? 'neg' : ''}`}>
                <span className="kpi-label">Balance del mes</span>
                <span className="kpi-valor">{formatMoneda(balance)}</span>
              </div>
              <div className="kpi">
                <span className="kpi-label">● Pendiente de pago</span>
                <span className="kpi-valor pend">{formatMoneda(pendiente)}</span>
              </div>
            </div>

            {/* Los tres gráficos en una fila */}
            <div className="home-grid-3">
              {/* Evolución mensual del año */}
              <section className="card">
                <div className="card-titulo">
                  <span>Evolución {anio}</span>
                  <Link to="/tabla" className="home-link">Tabla →</Link>
                </div>
                <EvolucionMensual serie={serie} />
              </section>

              {/* Gastos por categoría */}
              <section className="card">
                <div className="card-titulo">
                  <span>Por categoría</span>
                  <Link to="/gastos" className="home-link">Gastos →</Link>
                </div>
                {porCategoria.length === 0 ? (
                  <div className="home-vacio">
                    <p>Sin gastos este mes.</p>
                    <Link to="/gastos" className="home-cta">Cargar gastos</Link>
                  </div>
                ) : (
                  <div className="home-barras">
                    {porCategoria.slice(0, 6).map(({ cat, monto }) => (
                      <div className="barra-row" key={cat.id}>
                        <span className="barra-cat"><span className="barra-icon">{cat.icon}</span>{cat.nombre}</span>
                        <div className="barra-track">
                          <div className="barra-fill" style={{ width: `${mayor ? (monto / mayor) * 100 : 0}%`, background: cat.color }} />
                        </div>
                        <span className="barra-monto">{formatMoneda(monto)}<small>{pct(monto, gastos)}%</small></span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Estado de pagos */}
              <section className="card">
                <div className="card-titulo"><span>Estado de pagos</span></div>
                {gastos === 0 ? (
                  <p className="pg-vacio-inline">Sin gastos cargados.</p>
                ) : (
                  <div className="pagos-panel">
                    <div className="pagos-pct">
                      <span className="pagos-num">{pct(pagado, gastos)}%</span>
                      <span className="pagos-cap">pagado</span>
                    </div>
                    <div className="segbar">
                      <div className="seg seg-pagado" style={{ width: `${pct(pagado, gastos)}%` }} />
                      <div className="seg seg-pend" style={{ width: `${pct(pendiente, gastos)}%` }} />
                    </div>
                    <div className="pagos-leyenda">
                      <div className="pl-item"><span className="pl-dot dot-pagado" /> Pagado<span className="pl-val">{formatMoneda(pagado)}</span></div>
                      <div className="pl-item"><span className="pl-dot dot-pend" /> Pendiente<span className="pl-val">{formatMoneda(pendiente)}</span></div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Ahorro / USD acumulado */}
            {(ahorroSerie.hayAhorro || usdSerie.hayUSD) && (
              <div className="home-grid">
                {usdSerie.hayUSD && (
                  <section className="card">
                    <div className="card-titulo">
                      <span>💵 Balance USD acumulado</span>
                      <span className={`card-dato ${usdUltimo < 0 ? 'neg' : ''}`}>{formatUSD(usdUltimo)}</span>
                    </div>
                    <LineaSaldo puntos={usdSerie.puntos} valor={(p) => p.saldo} color="#059669" usd />
                  </section>
                )}
                {ahorroSerie.hayAhorro && (
                  <section className="card">
                    <div className="card-titulo">
                      <span>🏦 Ahorro acumulado</span>
                      <span className="card-dato">
                        {ahorroUltimo.ars ? formatMoneda(ahorroUltimo.ars) : ''}
                        {ahorroUltimo.ars && ahorroUltimo.usd ? ' · ' : ''}
                        {ahorroUltimo.usd ? formatUSD(ahorroUltimo.usd) : ''}
                      </span>
                    </div>
                    <LineaSaldo
                      puntos={ahorroSerie.puntos}
                      valor={(p) => (ahorroUltimo.usd && !ahorroUltimo.ars ? p.usd : p.ars)}
                      color="#0284c7"
                      usd={Boolean(ahorroUltimo.usd && !ahorroUltimo.ars)}
                    />
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Home;
