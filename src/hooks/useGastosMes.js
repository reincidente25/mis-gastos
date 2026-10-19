// src/hooks/useGastosMes.js
// Combina los conceptos recurrentes activos con los gastos cargados del mes.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHogar } from '../context/HogarContext';
import { listarConceptos, actualizarConcepto } from '../services/conceptosService';
import {
  listarGastosMes,
  getGastoConcepto,
  guardarGastoRecurrente,
  guardarGastoSemanal,
  setMetaGasto,
  crearGastoSuelto,
  eliminarGasto,
} from '../services/gastosService';

// Mes anterior a uno YYYY-MM.
const mesAnterior = (mes) => {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const useGastosMes = (mes) => {
  const { user }  = useAuth();
  const { hogar } = useHogar();
  const hogarId   = hogar?.id;

  const [conceptos, setConceptos] = useState([]);
  const [gastos, setGastos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const cargar = useCallback(async () => {
    if (!hogarId) return;
    setLoading(true);
    setError('');
    try {
      const [cs, gs] = await Promise.all([
        listarConceptos(hogarId),
        listarGastosMes(hogarId, mes),
      ]);
      const activos = cs.filter((c) => c.activo);

      // Backfill: si un gasto de este mes tiene desglose y su concepto todavía
      // no tiene plantilla guardada, la guardamos (para que se replique a otros
      // meses). Cubre datos cargados antes de existir la plantilla.
      const porId = Object.fromEntries(activos.map((c) => [c.id, c]));
      for (const g of gs) {
        const c = g.conceptoId && porId[g.conceptoId];
        if (c && g.items?.length && !(c.itemsPlantilla?.length)) {
          const plantilla = g.items
            .filter((it) => it.detalle)
            .map((it) => ({ detalle: it.detalle, moneda: it.moneda === 'usd' ? 'usd' : 'ars' }));
          if (plantilla.length) {
            c.itemsPlantilla = plantilla;
            actualizarConcepto(hogarId, c.id, { itemsPlantilla: plantilla }).catch(() => {});
          }
        }
      }

      setConceptos(activos);
      setGastos(gs);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los datos del mes.');
    } finally {
      setLoading(false);
    }
  }, [hogarId, mes]);

  useEffect(() => { cargar(); }, [cargar]);

  // Mapa conceptoId -> gasto, para mostrar el importe cargado.
  const porConcepto = {};
  gastos.forEach((g) => { if (g.conceptoId) porConcepto[g.conceptoId] = g; });
  const sueltos = gastos.filter((g) => !g.conceptoId);

  const guardar = async (concepto, datos) => {
    // Preservar vencimiento/pagado existentes al editar monto/items.
    const actual = gastos.find((g) => g.conceptoId === concepto.id);
    const completo = {
      vencimiento: actual?.vencimiento ?? '',
      pagado: actual?.pagado ?? false,
      ...datos,
    };
    const res = await guardarGastoRecurrente(hogarId, mes, concepto, completo, user.uid);
    setGastos((prev) => {
      const sinEste = prev.filter((g) => g.conceptoId !== concepto.id);
      return res ? [...sinEste, res] : sinEste;
    });

    // Si se editó el desglose, guardar la "plantilla" de ítems (solo los
    // nombres) en el concepto, para que se replique vacía en otros meses.
    if (datos.items) {
      const plantilla = datos.items
        .map((it) => ({ detalle: (it.detalle || '').trim(), moneda: it.moneda === 'usd' ? 'usd' : 'ars' }))
        .filter((it) => it.detalle);
      const actual = (concepto.itemsPlantilla || []).map((p) =>
        typeof p === 'string' ? { detalle: p, moneda: 'ars' } : p);
      const cambio = plantilla.length !== actual.length ||
        plantilla.some((p, i) => p.detalle !== actual[i]?.detalle || p.moneda !== actual[i]?.moneda);
      if (cambio) {
        await actualizarConcepto(hogarId, concepto.id, { itemsPlantilla: plantilla });
        setConceptos((prev) => prev.map((c) => (c.id === concepto.id ? { ...c, itemsPlantilla: plantilla } : c)));
      }
    }
  };

  const setImporte = (concepto, monto) => guardar(concepto, { monto });
  const setDetalle = (concepto, items) => guardar(concepto, { items });

  // Guarda un concepto semanal: monto por semana + estado de pago por semana.
  const setSemanal = async (concepto, datos) => {
    const res = await guardarGastoSemanal(hogarId, mes, concepto, datos, user.uid);
    setGastos((prev) => {
      const sinEste = prev.filter((g) => g.conceptoId !== concepto.id);
      return res ? [...sinEste, res] : sinEste;
    });
  };

  // Actualiza vencimiento/pagado sin tocar el importe.
  const setMeta = async (concepto, meta) => {
    const actual = gastos.find((g) => g.conceptoId === concepto.id);
    if (!actual) return; // solo si ya hay gasto cargado
    await setMetaGasto(hogarId, mes, concepto, meta);
    setGastos((prev) => prev.map((g) => (g.conceptoId === concepto.id ? { ...g, ...meta } : g)));
  };

  // Copia importe/desglose del mes anterior para un concepto (sin pisar
  // vencimiento/pagado del mes actual). Devuelve true si había algo que copiar.
  const copiarAnterior = async (concepto) => {
    const prev = await getGastoConcepto(hogarId, mesAnterior(mes), concepto.id);
    if (!prev || !(Number(prev.monto) > 0)) return false;
    const datos = prev.items?.length ? { items: prev.items } : { monto: prev.monto };
    await guardar(concepto, datos);
    return true;
  };

  const agregarSuelto = async (datos) => {
    const nuevo = await crearGastoSuelto(hogarId, mes, datos, user.uid);
    setGastos((prev) => [...prev, nuevo]);
    return nuevo;
  };

  const borrar = async (id) => {
    await eliminarGasto(hogarId, id);
    setGastos((prev) => prev.filter((g) => g.id !== id));
  };

  const total = gastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  return {
    conceptos, porConcepto, sueltos, gastos,
    loading, error, total,
    setImporte, setDetalle, setSemanal, setMeta, copiarAnterior, agregarSuelto, borrar, recargar: cargar,
  };
};
