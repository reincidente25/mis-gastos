// src/hooks/useGastosMes.js
// Combina los conceptos recurrentes activos con los gastos cargados del mes.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHogar } from '../context/HogarContext';
import { listarConceptos } from '../services/conceptosService';
import {
  listarGastosMes,
  guardarGastoRecurrente,
  crearGastoSuelto,
  eliminarGasto,
} from '../services/gastosService';

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
      setConceptos(cs.filter((c) => c.activo));
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
    const res = await guardarGastoRecurrente(hogarId, mes, concepto, datos, user.uid);
    setGastos((prev) => {
      const sinEste = prev.filter((g) => g.conceptoId !== concepto.id);
      return res ? [...sinEste, res] : sinEste;
    });
  };

  const setImporte = (concepto, monto) => guardar(concepto, { monto });
  const setDetalle = (concepto, items) => guardar(concepto, { items });

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
    setImporte, setDetalle, agregarSuelto, borrar, recargar: cargar,
  };
};
