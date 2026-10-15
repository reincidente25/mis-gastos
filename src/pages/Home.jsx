// src/pages/Home.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import { useGastos } from '../hooks/useGastos';
import { useAuth } from '../context/AuthContext';
import { getCategoria } from '../config/categorias';
import { formatMoneda, mesActual } from '../utils/format';
import './Home.css';

const Home = () => {
  const { user }      = useAuth();
  const [mes, setMes] = useState(mesActual());
  const { gastos, loading, total } = useGastos(mes);

  // Totales por categoría, ordenados de mayor a menor.
  const porCategoria = useMemo(() => {
    const acc = {};
    gastos.forEach((g) => {
      acc[g.categoria] = (acc[g.categoria] || 0) + (Number(g.monto) || 0);
    });
    return Object.entries(acc)
      .map(([id, monto]) => ({ cat: getCategoria(id), monto }))
      .sort((a, b) => b.monto - a.monto);
  }, [gastos]);

  const mayor = porCategoria[0]?.monto || 0;

  return (
    <Layout>
      <div className="home-page">
        <header className="home-header">
          <div>
            <h1>👋 Hola</h1>
            <p className="home-sub">{user?.email}</p>
          </div>
          <MesSelector mes={mes} onChange={setMes} />
        </header>

        {loading ? (
          <div className="home-centro"><div className="spinner" /></div>
        ) : (
          <>
            <div className="home-cards">
              <div className="home-card destacado">
                <span className="hc-label">Gastado este mes</span>
                <span className="hc-valor">{formatMoneda(total)}</span>
              </div>
              <div className="home-card">
                <span className="hc-label">Movimientos</span>
                <span className="hc-valor">{gastos.length}</span>
              </div>
              <div className="home-card">
                <span className="hc-label">Categorías usadas</span>
                <span className="hc-valor">{porCategoria.length}</span>
              </div>
            </div>

            <section className="home-seccion">
              <div className="home-seccion-head">
                <h2>Por categoría</h2>
                <Link to="/gastos" className="home-link">Ver gastos →</Link>
              </div>

              {porCategoria.length === 0 ? (
                <div className="home-vacio">
                  <p>Todavía no registraste gastos este mes.</p>
                  <Link to="/gastos" className="home-cta">+ Agregar un gasto</Link>
                </div>
              ) : (
                <div className="home-barras">
                  {porCategoria.map(({ cat, monto }) => (
                    <div className="barra-row" key={cat.id}>
                      <span className="barra-cat">
                        <span className="barra-icon">{cat.icon}</span>
                        {cat.label}
                      </span>
                      <div className="barra-track">
                        <div
                          className="barra-fill"
                          style={{
                            width: `${mayor ? (monto / mayor) * 100 : 0}%`,
                            background: cat.color,
                          }}
                        />
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
