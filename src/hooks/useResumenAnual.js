// src/hooks/useResumenAnual.js
// Datos para el dashboard: serie mensual del año + stats del mes elegido.
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useHogar } from '../context/HogarContext';
import { listarConceptos } from '../services/conceptosService';
import { listarTodosGastos } from '../services/gastosService';

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const hoy = () => new Date().toISOString().slice(0, 10);

export const useResumenAnual = (mes) => {
  const { hogar } = useHogar();
  const hogarId = hogar?.id;
  const [conceptos, setConceptos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!hogarId) return;
    setLoading(true);
    const [cs, gs] = await Promise.all([listarConceptos(hogarId), listarTodosGastos(hogarId)]);
    setConceptos(cs);
    setGastos(gs);
    setLoading(false);
  }, [hogarId]);
  useEffect(() => { cargar(); }, [cargar]);

  const porId = useMemo(() => {
    const m = {};
    conceptos.forEach((c) => { m[c.id] = c; });
    return m;
  }, [conceptos]);

  const info = (g) => {
    const c = g.conceptoId ? porId[g.conceptoId] : null;
    return {
      tipo: c?.tipo || 'gasto',
      moneda: c?.moneda === 'usd' ? 'usd' : 'ars',
      categoriaId: g.categoriaId || c?.categoriaId || '',
    };
  };

  const anio = mes.slice(0, 4);

  // Serie mensual del año (solo pesos): gastos vs ingresos cobrados.
  const serie = useMemo(() => {
    const base = Array.from({ length: 12 }, (_, i) => ({
      mes: `${anio}-${String(i + 1).padStart(2, '0')}`,
      label: MESES_CORTO[i],
      gastos: 0, ingresos: 0,
    }));
    gastos.forEach((g) => {
      if (!g.mes || g.mes.slice(0, 4) !== anio) return;
      const i = Number(g.mes.slice(5, 7)) - 1;
      if (i < 0 || i > 11) return;
      const { tipo, moneda } = info(g);
      if (moneda !== 'ars') return;
      const monto = Number(g.monto) || 0;
      if (tipo === 'gasto') base[i].gastos += monto;
      else if (tipo === 'ingreso' && g.pagado) base[i].ingresos += monto;
    });
    return base.map((m) => ({ ...m, balance: m.ingresos - m.gastos }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, porId, anio]);

  // Ahorro acumulado (pesos y USD) hasta cada mes del año.
  const ahorroSerie = useMemo(() => {
    const movs = gastos
      .filter((g) => info(g).tipo === 'ahorro')
      .map((g) => ({ mes: g.mes, monto: Number(g.monto) || 0, moneda: info(g).moneda }));
    const hayAhorro = movs.length > 0;
    return {
      hayAhorro,
      puntos: Array.from({ length: 12 }, (_, i) => {
        const limite = `${anio}-${String(i + 1).padStart(2, '0')}`;
        const ars = movs.filter((m) => m.moneda === 'ars' && m.mes <= limite).reduce((a, m) => a + m.monto, 0);
        const usd = movs.filter((m) => m.moneda === 'usd' && m.mes <= limite).reduce((a, m) => a + m.monto, 0);
        return { label: MESES_CORTO[i], mes: limite, ars, usd };
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, porId, anio]);

  // Balance USD acumulado por mes (gasto resta, ingreso/ahorro suma).
  const usdSerie = useMemo(() => {
    const movs = gastos
      .filter((g) => info(g).moneda === 'usd')
      .map((g) => ({ mes: g.mes, val: (info(g).tipo === 'gasto' ? -1 : 1) * (Number(g.monto) || 0) }));
    const hayUSD = movs.length > 0;
    return {
      hayUSD,
      puntos: Array.from({ length: 12 }, (_, i) => {
        const limite = `${anio}-${String(i + 1).padStart(2, '0')}`;
        const saldo = movs.filter((m) => m.mes <= limite).reduce((a, m) => a + m.val, 0);
        return { label: MESES_CORTO[i], mes: limite, saldo };
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, porId, anio]);

  // Stats del mes elegido (misma lógica que la pantalla Gastos).
  const mesStats = useMemo(() => {
    const delMes = gastos.filter((g) => g.mes === mes);
    let ingresos = 0, gastosT = 0, pagado = 0, pendiente = 0, vencido = 0;
    const porCat = {};
    delMes.forEach((g) => {
      const { tipo, moneda, categoriaId } = info(g);
      if (moneda !== 'ars' || tipo === 'ahorro') return;
      const monto = Number(g.monto) || 0;
      if (tipo === 'ingreso') { if (g.pagado) ingresos += monto; return; }
      gastosT += monto;
      porCat[categoriaId] = (porCat[categoriaId] || 0) + monto;

      // Semanal: solo cuentan las semanas con monto; las pagadas restan.
      if (g.esSemanal) {
        const ms = Array.isArray(g.montosSemana) ? g.montosSemana : [];
        const pagadoMonto = ms.reduce((s, m, i) => s + (g.semanas?.[i] ? Number(m) || 0 : 0), 0);
        pagado += pagadoMonto;
        pendiente += Math.max(0, monto - pagadoMonto);
        return;
      }
      // Con desglose: cada ítem pagado resta del pendiente.
      if (g.items?.length && !g.items.every((it) => it.pagado)) {
        const pesoIt = (it) => (it.moneda === 'usd' ? (Number(it.monto) || 0) * (Number(it.cotizacion) || 0) : (Number(it.monto) || 0));
        const pagadoMonto = g.items.reduce((s, it) => s + (it.pagado ? pesoIt(it) : 0), 0);
        pagado += pagadoMonto;
        pendiente += Math.max(0, monto - pagadoMonto);
        return;
      }
      // No semanal / sin desglose parcial.
      if (g.pagado) pagado += monto;
      else if (g.vencimiento && g.vencimiento < hoy()) vencido += monto;
      else pendiente += monto;
    });
    return { ingresos, gastos: gastosT, balance: ingresos - gastosT, pagado, pendiente, vencido, porCat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, porId, mes]);

  return { loading, serie, ahorroSerie, usdSerie, mesStats, recargar: cargar };
};
