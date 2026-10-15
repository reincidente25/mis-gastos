// src/hooks/useTarjetasMes.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHogar } from '../context/HogarContext';
import {
  listarTarjetas,
  listarResumenesMes,
  setResumenTarjeta,
} from '../services/tarjetasService';

export const useTarjetasMes = (mes) => {
  const { user }  = useAuth();
  const { hogar } = useHogar();
  const hogarId   = hogar?.id;

  const [tarjetas, setTarjetas] = useState([]);
  const [resumenes, setResumenes] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!hogarId) return;
    setLoading(true);
    try {
      const [ts, rs] = await Promise.all([
        listarTarjetas(hogarId),
        listarResumenesMes(hogarId, mes),
      ]);
      setTarjetas(ts.filter((t) => t.activa));
      setResumenes(rs);
    } finally {
      setLoading(false);
    }
  }, [hogarId, mes]);

  useEffect(() => { cargar(); }, [cargar]);

  const porTarjeta = {};
  resumenes.forEach((r) => { porTarjeta[r.tarjetaId] = r; });

  const setMonto = async (tarjeta, monto) => {
    const res = await setResumenTarjeta(hogarId, mes, tarjeta, monto, user.uid);
    setResumenes((prev) => {
      const sinEsta = prev.filter((r) => r.tarjetaId !== tarjeta.id);
      return res ? [...sinEsta, res] : sinEsta;
    });
  };

  const total = resumenes.reduce((a, r) => a + (Number(r.monto) || 0), 0);

  return { tarjetas, porTarjeta, loading, total, setMonto, recargar: cargar };
};
