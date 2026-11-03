// src/pages/Vencimientos.jsx — pendientes de pago ordenados por fecha.
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useHogar } from '../context/HogarContext';
import { useEstructura } from '../context/EstructuraContext';
import { listarConceptos } from '../services/conceptosService';
import { listarTodosGastos } from '../services/gastosService';
import { formatMoneda, formatUSD, fechaLarga } from '../utils/format';
import './Vencimientos.css';

// Días entre hoy y una fecha YYYY-MM-DD (negativo = ya pasó).
const diasHasta = (fecha) => {
  const [y, m, d] = fecha.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  const h = new Date(); h.setHours(0, 0, 0, 0);
  return Math.round((f - h) / 86400000);
};

const pesoItem = (it) => (it.moneda === 'usd'
  ? (Number(it.monto) || 0) * (Number(it.cotizacion) || 0)
  : (Number(it.monto) || 0));

// Parte pendiente de pago de un gasto (contempla parciales por ítem).
const pendienteDe = (g) => {
  if (g.pagado) return 0;
  const monto = Number(g.monto) || 0;
  if (g.items?.length) {
    const pagado = g.items.reduce((a, it) => a + (it.pagado ? pesoItem(it) : 0), 0);
    return Math.max(0, monto - pagado);
  }
  return monto;
};

const etiquetaPlazo = (dias) => {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`;
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `En ${dias} días`;
};

const Vencimientos = () => {
  const { hogar } = useHogar();
  const { getCat } = useEstructura();
  const [conceptos, setConceptos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!hogar?.id) return;
    setLoading(true);
    const [cs, gs] = await Promise.all([listarConceptos(hogar.id), listarTodosGastos(hogar.id)]);
    setConceptos(cs);
    setGastos(gs);
    setLoading(false);
  }, [hogar?.id]);
  useEffect(() => { cargar(); }, [cargar]);

  const porId = useMemo(() => {
    const m = {};
    conceptos.forEach((c) => { m[c.id] = c; });
    return m;
  }, [conceptos]);

  const info = (g) => {
    const c = g.conceptoId ? porId[g.conceptoId] : null;
    return { tipo: c?.tipo || 'gasto', moneda: c?.moneda === 'usd' ? 'usd' : 'ars' };
  };

  const items = useMemo(() => {
    const lista = [];
    gastos.forEach((g) => {
      const { tipo, moneda } = info(g);
      if (tipo !== 'gasto') return;        // solo gastos (no ingresos/ahorros)
      if (!g.vencimiento) return;          // debe tener fecha
      const pend = pendienteDe(g);
      if (pend <= 0) return;               // ya pagado
      lista.push({
        id: g.id, nombre: g.concepto, categoriaId: g.categoriaId,
        fecha: g.vencimiento, monto: pend, moneda, mes: g.mes,
        dias: diasHasta(g.vencimiento),
      });
    });
    return lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, porId]);

  const vencidos = items.filter((x) => x.dias < 0);
  const proximos = items.filter((x) => x.dias >= 0);
  const totalArs = items.filter((x) => x.moneda !== 'usd').reduce((a, x) => a + x.monto, 0);
  const totalUsd = items.filter((x) => x.moneda === 'usd').reduce((a, x) => a + x.monto, 0);

  const fmt = (v, mon) => (mon === 'usd' ? formatUSD(v) : formatMoneda(v));

  const Fila = ({ x }) => {
    const cat = getCat(x.categoriaId);
    const clase = x.dias < 0 ? 'venc' : x.dias <= 7 ? 'cerca' : '';
    return (
      <div className={`vto-row ${clase}`}>
        <div className="vto-fecha">
          <span className="vto-dia">{Number(x.fecha.slice(8, 10))}</span>
          <span className="vto-mes">{fechaLarga(x.fecha).split(' de ')[1]?.slice(0, 3) || ''}</span>
        </div>
        <span className="cr-icono" style={{ background: `${cat.color}1a`, color: cat.color }}>{cat.icon}</span>
        <div className="vto-info">
          <span className="vto-nombre">{x.nombre}</span>
          <span className="vto-plazo">{etiquetaPlazo(x.dias)} · {cat.nombre}</span>
        </div>
        <span className="vto-monto">{fmt(x.monto, x.moneda)}</span>
      </div>
    );
  };

  return (
    <Layout>
      <div className="gastos-page">
        <header className="pg-header">
          <div>
            <h1>📅 Vencimientos</h1>
            <p className="pg-sub">Pendiente de pago, ordenado por fecha</p>
          </div>
        </header>

        {loading ? (
          <div className="pg-centro"><div className="spinner" /></div>
        ) : items.length === 0 ? (
          <section className="card">
            <p className="pg-vacio-inline">No hay pagos pendientes con vencimiento. 🎉</p>
          </section>
        ) : (
          <>
            <div className="vto-kpis">
              <div className="vto-kpi venc">
                <span className="vto-kpi-lbl">⚠ Vencidos</span>
                <span className="vto-kpi-val">{vencidos.length}</span>
              </div>
              <div className="vto-kpi">
                <span className="vto-kpi-lbl">● Por vencer</span>
                <span className="vto-kpi-val">{proximos.length}</span>
              </div>
              <div className="vto-kpi total">
                <span className="vto-kpi-lbl">Total pendiente</span>
                <span className="vto-kpi-val">
                  {formatMoneda(totalArs)}{totalUsd ? ` · ${formatUSD(totalUsd)}` : ''}
                </span>
              </div>
            </div>

            {vencidos.length > 0 && (
              <section className="card">
                <h2 className="card-titulo"><span>⚠ Vencidos</span></h2>
                <div className="vto-lista">{vencidos.map((x) => <Fila key={x.id} x={x} />)}</div>
              </section>
            )}

            {proximos.length > 0 && (
              <section className="card">
                <h2 className="card-titulo"><span>Próximos</span></h2>
                <div className="vto-lista">{proximos.map((x) => <Fila key={x.id} x={x} />)}</div>
              </section>
            )}

            <p className="tabla-nota">
              Se cargan y pagan los conceptos desde <Link to="/gastos" className="home-link">Gastos</Link>.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Vencimientos;
