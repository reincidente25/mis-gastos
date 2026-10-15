// src/pages/Home.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import { useGastosMes } from '../hooks/useGastosMes';
import { useTarjetasMes } from '../hooks/useTarjetasMes';
import { useHogar } from '../context/HogarContext';
import { useEstructura } from '../context/EstructuraContext';
import { formatMoneda, mesActual, mesLegible } from '../utils/format';
import './Home.css';

const Home = () => {
  const { hogar } = useHogar();
  const { getCat } = useEstructura();
  const [mes, setMes] = useState(mesActual());
  const { gastos, loading, total } = useGastosMes(mes);
  const { total: totalTarjetas, loading: loadingT } = useTarjetasMes(mes);

  const porCategoria = useMemo(() => {
    const acc = {};
    gastos.forEach((g) => {
      const id = g.categoriaId || '';
      acc[id] = (acc[id] || 0) + (Number(g.monto) || 0);
    });
    return Object.entries(acc)
      .map(([id, monto]) => ({ cat: getCat(id), monto }))
      .sort((a, b) => b.monto - a.monto);
  }, [gastos, getCat]);

  const mayor = porCategoria[0]?.monto || 0;
  const cargando = loading || loadingT;

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
              <div className="home-card destacado">
                <span className="hc-label">Gastos del mes</span>
                <span className="hc-valor">{formatMoneda(total)}</span>
              </div>
              <div className="home-card">
                <span className="hc-label">Tarjetas</span>
                <span className="hc-valor">{formatMoneda(totalTarjetas)}</span>
              </div>
              <div className="home-card total-general">
                <span className="hc-label">Total general</span>
                <span className="hc-valor">{formatMoneda(total + totalTarjetas)}</span>
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
