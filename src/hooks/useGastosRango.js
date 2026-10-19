// src/hooks/useGastosRango.js
// Trae los gastos de varios meses a la vez para la vista comparativa.
// Devuelve { conceptos, porMes: { [mes]: { [conceptoId]: gasto } }, loading }.
import { useState, useEffect } from 'react';
import { useHogar } from '../context/HogarContext';
import { listarConceptos } from '../services/conceptosService';
import { listarGastosMes } from '../services/gastosService';

export const useGastosRango = (meses) => {
  const { hogar } = useHogar();
  const hogarId = hogar?.id;
  const [conceptos, setConceptos] = useState([]);
  const [porMes, setPorMes] = useState({});
  const [loading, setLoading] = useState(true);

  const clave = meses.join(',');

  useEffect(() => {
    if (!hogarId) return;
    let cancelado = false;
    (async () => {
      setLoading(true);
      const cs = await listarConceptos(hogarId);
      const activos = cs.filter((c) => c.activo);
      const entradas = await Promise.all(
        meses.map(async (m) => {
          const gs = await listarGastosMes(hogarId, m);
          const map = {};
          gs.forEach((g) => { if (g.conceptoId) map[g.conceptoId] = g; });
          return [m, map];
        })
      );
      if (cancelado) return;
      setConceptos(activos);
      setPorMes(Object.fromEntries(entradas));
      setLoading(false);
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hogarId, clave]);

  return { conceptos, porMes, loading };
};
