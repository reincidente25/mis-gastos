// src/pages/Gastos.jsx
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import MesSelector from '../components/MesSelector';
import GastoForm from '../components/GastoForm';
import { useGastos } from '../hooks/useGastos';
import { getCategoria } from '../config/categorias';
import { formatMoneda, mesActual, fechaCorta } from '../utils/format';
import './Gastos.css';

const Gastos = () => {
  const [mes, setMes]         = useState(mesActual());
  const [editando, setEditando] = useState(null);
  const { gastos, loading, error, total, agregar, editar, borrar } = useGastos(mes);

  const handleGuardar = async (datos) => {
    if (editando) {
      await editar(editando.id, datos);
      setEditando(null);
    } else {
      await agregar(datos);
    }
  };

  const handleBorrar = async (gasto) => {
    if (window.confirm(`¿Eliminar "${gasto.descripcion}"?`)) {
      await borrar(gasto.id);
    }
  };

  return (
    <Layout>
      <div className="gastos-page">
        <header className="gastos-header">
          <div>
            <h1>💸 Gastos</h1>
            <p className="gastos-sub">Registrá y seguí tus gastos del mes</p>
          </div>
          <MesSelector mes={mes} onChange={setMes} />
        </header>

        <div className="gastos-total-card">
          <span className="gtc-label">Total del mes</span>
          <span className="gtc-valor">{formatMoneda(total)}</span>
          <span className="gtc-count">
            {gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'}
          </span>
        </div>

        <GastoForm
          gasto={editando}
          onGuardar={handleGuardar}
          onCancelar={() => setEditando(null)}
        />

        <section className="gastos-lista">
          {loading ? (
            <div className="gastos-centro"><div className="spinner" /></div>
          ) : error ? (
            <p className="gastos-error">{error}</p>
          ) : gastos.length === 0 ? (
            <div className="gastos-vacio">
              <span className="gv-icon">🗒️</span>
              <p>No hay gastos este mes.</p>
              <small>Agregá el primero con el formulario de arriba.</small>
            </div>
          ) : (
            gastos.map((g) => {
              const cat = getCategoria(g.categoria);
              return (
                <div className="gasto-item" key={g.id}>
                  <span
                    className="gi-icono"
                    style={{ background: `${cat.color}22`, color: cat.color }}
                  >
                    {cat.icon}
                  </span>
                  <div className="gi-info">
                    <span className="gi-desc">{g.descripcion}</span>
                    <span className="gi-meta">
                      {cat.label} · {fechaCorta(g.fecha)}
                    </span>
                  </div>
                  <span className="gi-monto">{formatMoneda(g.monto)}</span>
                  <div className="gi-acciones">
                    <button
                      className="gi-btn"
                      onClick={() => setEditando(g)}
                      aria-label="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="gi-btn gi-btn-borrar"
                      onClick={() => handleBorrar(g)}
                      aria-label="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </Layout>
  );
};

export default Gastos;
