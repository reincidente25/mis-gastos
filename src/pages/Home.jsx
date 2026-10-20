// src/pages/Home.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import { useGastosMes } from '../hooks/useGastosMes';
import { useHogar } from '../context/HogarContext';
import { useEstructura } from '../context/EstructuraContext';
import { formatMoneda, formatUSD, mesActual, mesLegible } from '../utils/format';
import './Home.css';

const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0);

const Home = () => {
  const { hogar } = useHogar();
  const { getCat } = useEstructura();
  const [mes, setMes] = useState(mesActual());
  const { gastos, conceptos, loading, saldoAhorro, saldoAnteriorAhorro } = useGastosMes(mes);

  const tipoDe = useMemo(() => {
    const m = {};
    conceptos.forEach((c) => { m[c.id] = c.tipo || 'gasto'; });
    return (g) => (g.conceptoId ? m[g.conceptoId] || 'gasto' : 'gasto');
  }, [conceptos]);

  // Moneda del gasto según su concepto (los sueltos son en pesos).
  const monedaDe = useMemo(() => {
    const m = {};
    conceptos.forEach((c) => { m[c.id] = c.moneda === 'usd' ? 'usd' : 'ars'; });
    return (g) => (g.conceptoId ? m[g.conceptoId] || 'ars' : 'ars');
  }, [conceptos]);

  const esUSD = (g) => monedaDe(g) === 'usd';
  const ars = gastos.filter((g) => !esUSD(g));

  // El ingreso impacta solo cuando está cobrado (pagado === true).
  const totalIngresos = ars.reduce((a, g) => a + (tipoDe(g) === 'ingreso' && g.pagado ? Number(g.monto) || 0 : 0), 0);
  const totalGastos   = ars.reduce((a, g) => a + (tipoDe(g) !== 'ingreso' ? Number(g.monto) || 0 : 0), 0);

  // Balance en dólares, acumulativo (saldo inicial + movimientos = final).
  const usdCs = conceptos.filter((c) => c.moneda === 'usd');
  const signoUSD = (c) => (c.tipo === 'gasto' ? -1 : 1);
  const montoMes = (id) => Number(gastos.find((x) => x.conceptoId === id)?.monto) || 0;
  const usdInicial = usdCs.reduce((a, c) => a + signoUSD(c) * saldoAnteriorAhorro(c.id), 0);
  const usdMovim   = usdCs.reduce((a, c) => a + signoUSD(c) * montoMes(c.id), 0);
  const usdFinal   = usdInicial + usdMovim;
  const hayUSD     = usdCs.length > 0;

  // Ahorros acumulados hasta el mes (saldo), por moneda.
  const ahorroCs = conceptos.filter((c) => c.tipo === 'ahorro');
  const ahorroUSD = ahorroCs.filter((c) => c.moneda === 'usd').reduce((a, c) => a + saldoAhorro(c.id), 0);
  const ahorroARS = ahorroCs.filter((c) => c.moneda !== 'usd').reduce((a, c) => a + saldoAhorro(c.id), 0);
  const hayAhorro = ahorroCs.length > 0;
  // Pagado: montos de gastos marcados pagos; en los semanales, suma solo las
  // semanas ya pagadas (pago parcial).
  const pagado = ars.reduce((a, g) => {
    if (tipoDe(g) === 'ingreso') return a;
    if (g.esSemanal) {
      const montosS = Array.isArray(g.montosSemana) ? g.montosSemana : [];
      return a + montosS.reduce((s, mm, i) => s + (g.semanas?.[i] ? Number(mm) || 0 : 0), 0);
    }
    return a + (g.pagado ? Number(g.monto) || 0 : 0);
  }, 0);
  const pendiente = totalGastos - pagado;
  const balance   = totalIngresos - totalGastos;

  const porCategoria = useMemo(() => {
    const acc = {};
    ars.forEach((g) => {
      if (tipoDe(g) === 'ingreso') return;
      const id = g.categoriaId || '';
      acc[id] = (acc[id] || 0) + (Number(g.monto) || 0);
    });
    return Object.entries(acc)
      .map(([id, monto]) => ({ cat: getCat(id), monto }))
      .sort((a, b) => b.monto - a.monto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, getCat, tipoDe]);

  const mayor = porCategoria[0]?.monto || 0;

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
            {/* KPIs */}
            <div className="kpi-row">
              <div className="kpi">
                <span className="kpi-label">💰 Ingresos cobrados</span>
                <span className="kpi-valor ingreso">{formatMoneda(totalIngresos)}</span>
              </div>
              <div className="kpi">
                <span className="kpi-label">💸 Gastos</span>
                <span className="kpi-valor gasto">{formatMoneda(totalGastos)}</span>
              </div>
              <div className={`kpi destacado ${balance < 0 ? 'neg' : ''}`}>
                <span className="kpi-label">Balance</span>
                <span className="kpi-valor">{formatMoneda(balance)}</span>
              </div>
              <div className="kpi">
                <span className="kpi-label">● Pendiente de pago</span>
                <span className="kpi-valor pend">{formatMoneda(pendiente)}</span>
              </div>
            </div>

            {hayUSD && (
              <div className="kpi-row usd-kpis">
                <div className="kpi usd">
                  <span className="kpi-label">💵 Saldo inicial US$</span>
                  <span className="kpi-valor">{formatUSD(usdInicial)}</span>
                </div>
                <div className="kpi usd">
                  <span className="kpi-label">💵 Movimientos US$</span>
                  <span className="kpi-valor">{usdMovim > 0 ? '+' : ''}{formatUSD(usdMovim)}</span>
                </div>
                <div className={`kpi usd destacado ${usdFinal < 0 ? 'neg' : ''}`}>
                  <span className="kpi-label">Saldo final US$</span>
                  <span className="kpi-valor">{formatUSD(usdFinal)}</span>
                </div>
              </div>
            )}

            {hayAhorro && (
              <div className="kpi-row ahorro-kpis">
                <div className="kpi ahorro destacado">
                  <span className="kpi-label">🏦 Ahorro acumulado US$</span>
                  <span className="kpi-valor">{formatUSD(ahorroUSD)}</span>
                </div>
                <div className="kpi ahorro">
                  <span className="kpi-label">🏦 Ahorro acumulado $</span>
                  <span className="kpi-valor">{formatMoneda(ahorroARS)}</span>
                </div>
              </div>
            )}

            <div className="home-grid">
              {/* Gastos por categoría */}
              <section className="card">
                <div className="card-titulo">
                  <span>Gastos por categoría</span>
                  <Link to="/gastos" className="home-link">Ver gastos →</Link>
                </div>
                {porCategoria.length === 0 ? (
                  <div className="home-vacio">
                    <p>Todavía no cargaste gastos este mes.</p>
                    <Link to="/gastos" className="home-cta">Ir a cargar gastos</Link>
                  </div>
                ) : (
                  <div className="home-barras">
                    {porCategoria.map(({ cat, monto }) => (
                      <div className="barra-row" key={cat.id}>
                        <span className="barra-cat">
                          <span className="barra-icon">{cat.icon}</span>{cat.nombre}
                        </span>
                        <div className="barra-track">
                          <div className="barra-fill"
                            style={{ width: `${mayor ? (monto / mayor) * 100 : 0}%`, background: cat.color }} />
                        </div>
                        <span className="barra-monto">
                          {formatMoneda(monto)}
                          <small>{pct(monto, totalGastos)}%</small>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Estado de pagos */}
              <section className="card">
                <div className="card-titulo"><span>Estado de pagos</span></div>
                {totalGastos === 0 ? (
                  <p className="pg-vacio-inline">Sin gastos cargados.</p>
                ) : (
                  <div className="pagos-panel">
                    <div className="pagos-pct">
                      <span className="pagos-num">{pct(pagado, totalGastos)}%</span>
                      <span className="pagos-cap">pagado</span>
                    </div>
                    <div className="segbar">
                      <div className="seg seg-pagado" style={{ width: `${pct(pagado, totalGastos)}%` }} />
                      <div className="seg seg-pend" style={{ width: `${pct(pendiente, totalGastos)}%` }} />
                    </div>
                    <div className="pagos-leyenda">
                      <div className="pl-item">
                        <span className="pl-dot dot-pagado" /> Pagado
                        <span className="pl-val">{formatMoneda(pagado)}</span>
                      </div>
                      <div className="pl-item">
                        <span className="pl-dot dot-pend" /> Pendiente
                        <span className="pl-val">{formatMoneda(pendiente)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Home;
