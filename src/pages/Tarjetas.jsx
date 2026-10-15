// src/pages/Tarjetas.jsx
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import AmountInput from '../components/AmountInput';
import { useTarjetasMes } from '../hooks/useTarjetasMes';
import { useHogar } from '../context/HogarContext';
import { crearTarjeta } from '../services/tarjetasService';
import { formatMoneda, mesActual } from '../utils/format';
import './Gastos.css';

const Tarjetas = () => {
  const [mes, setMes] = useState(mesActual());
  const { hogar } = useHogar();
  const { tarjetas, porTarjeta, loading, total, setMonto, recargar } = useTarjetasMes(mes);
  const [nueva, setNueva] = useState('');
  const [agregando, setAgregando] = useState(false);

  const handleAgregar = async (e) => {
    e.preventDefault();
    if (!nueva.trim()) return;
    setAgregando(true);
    try {
      await crearTarjeta(hogar.id, nueva, tarjetas.length);
      setNueva('');
      await recargar();
    } finally {
      setAgregando(false);
    }
  };

  return (
    <Layout>
      <div className="gastos-page">
        <header className="pg-header">
          <div>
            <h1>💳 Tarjetas</h1>
            <p className="pg-sub">Resumen de cada tarjeta por mes</p>
          </div>
          <MesSelector mes={mes} onChange={setMes} />
        </header>

        <div className="total-card">
          <span className="tc-label">Total tarjetas del mes</span>
          <span className="tc-valor">{formatMoneda(total)}</span>
        </div>

        {loading ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : (
          <section className="card">
            <h2 className="card-titulo">Resúmenes</h2>
            {tarjetas.length === 0 ? (
              <p className="pg-vacio-inline">Agregá tu primera tarjeta abajo.</p>
            ) : (
              <div className="concepto-lista">
                {tarjetas.map((t) => (
                  <div className="concepto-row" key={t.id}>
                    <span className="cr-icono" style={{ background: '#4f46e51a', color: '#4f46e5' }}>💳</span>
                    <span className="cr-nombre">{t.nombre}</span>
                    <AmountInput
                      value={porTarjeta[t.id]?.monto}
                      onCommit={(monto) => setMonto(t, monto)}
                    />
                  </div>
                ))}
              </div>
            )}

            <form className="suelto-form" style={{ marginTop: 14, gridTemplateColumns: '1fr auto' }} onSubmit={handleAgregar}>
              <input
                type="text" placeholder="Nueva tarjeta (ej: Visa Galicia)"
                value={nueva} onChange={(e) => setNueva(e.target.value)} maxLength={40}
              />
              <button type="submit" disabled={agregando}>+ Agregar</button>
            </form>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default Tarjetas;
