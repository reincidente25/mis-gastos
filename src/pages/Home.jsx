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

const Home = () => {
  const { hogar } = useHogar();
  const { getCat } = useEstructura();
  const [mes, setMes] = useState(mesActual());
  const { gastos, conceptos, loading } = useGastosMes(mes);

  // tipo por conceptoId (los sueltos, sin concepto, son gastos).
  const tipoDe = useMemo(() => {
    const m = {};
    conceptos.forEach((c) => { m[c.id] = c.tipo || 'gasto'; });
    return (g) => (g.conceptoId ? m[g.conceptoId] || 'gasto' : 'gasto');
  }, [conceptos]);

  const totalIngresos = gastos.reduce((a, g) => a + (tipoDe(g) === 'ingreso' ? Number(g.monto) || 0 : 0), 0);
  const totalGastos   = gastos.reduce((a, g) => a + (tipoDe(g) !== 'ingreso' ? Number(g.monto) || 0 : 0), 0);
  const balance = totalIngresos - totalGastos;

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
  const cargando = loading;

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

        {cargando ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : (
          <>
            <div className="home-cards">
              <div className="home-card">
                <span className="hc-label">💰 Ingresos</span>
                <span className="hc-valor">{formatMoneda(totalIngresos)}</span>
              </div>
              <div className="home-card">
                <span className="hc-label">💸 Gastos</span>
                <span className="hc-valor">{formatMoneda(totalGastos)}</span>
              </div>
              <div className={`home-card destacado ${balance < 0 ? 'neg' : ''}`}>
                <span className="hc-label">Balance</span>
                <span className="hc-valor">{formatMoneda(balance)}</span>
              </div>
            </div>

            <section className="card">
              <div className="card-titulo">
                Por categoría
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
                      <span className="barra-monto">{formatMoneda(monto)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Home;
