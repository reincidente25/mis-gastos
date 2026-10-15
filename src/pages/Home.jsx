// src/pages/Home.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import { useGastosMes } from '../hooks/useGastosMes';
import { useHogar } from '../context/HogarContext';
import { useEstructura } from '../context/EstructuraContext';
import { formatMoneda, mesActual, mesLegible } from '../utils/format';
import './Home.css';

const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0);

const Home = () => {
  const { hogar } = useHogar();
  const { getCat } = useEstructura();
  const [mes, setMes] = useState(mesActual());
  const { gastos, conceptos, loading } = useGastosMes(mes);

  const tipoDe = useMemo(() => {
    const m = {};
    conceptos.forEach((c) => { m[c.id] = c.tipo || 'gasto'; });
    return (g) => (g.conceptoId ? m[g.conceptoId] || 'gasto' : 'gasto');
  }, [conceptos]);

  const totalIngresos = gastos.reduce((a, g) => a + (tipoDe(g) === 'ingreso' ? Number(g.monto) || 0 : 0), 0);
  const totalGastos   = gastos.reduce((a, g) => a + (tipoDe(g) !== 'ingreso' ? Number(g.monto) || 0 : 0), 0);
  const pagado    = gastos.reduce((a, g) => a + (tipoDe(g) !== 'ingreso' && g.pagado ? Number(g.monto) || 0 : 0), 0);
  const pendiente = totalGastos - pagado;
  const balance   = totalIngresos - totalGastos;

  const porCategoria = useMemo(() => {
    const acc = {};
    gastos.forEach((g) => {
      if (tipoDe(g) === 'ingreso') return;
      const id = g.categoriaId || '';
      acc[id] = (acc[id] || 0) + (Number(g.monto) || 0);
    });
    return Object.entries(acc)
      .map(([id, monto]) => ({ cat: getCat(id), monto }))
      .sort((a, b) => b.monto - a.monto);
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
                <span className="kpi-label">💰 Ingresos</span>
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
