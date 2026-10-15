// src/hooks/useGastos.js
// Carga y gestiona los gastos de un mes para el usuario logueado.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  listarGastos,
  crearGasto,
  actualizarGasto,
  eliminarGasto,
} from '../services/gastosService';

export const useGastos = (mes) => {
  const { user } = useAuth();
  const [gastos, setGastos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const cargar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const datos = await listarGastos(user.uid, mes);
      setGastos(datos);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los gastos.');
    } finally {
      setLoading(false);
    }
  }, [user, mes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregar = async (datos) => {
    const nuevo = await crearGasto(user.uid, datos);
    // Solo lo mostramos en la lista si pertenece al mes visible.
    if (nuevo.mes === mes) {
      setGastos((prev) =>
        [nuevo, ...prev].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      );
    }
    return nuevo;
  };

  const editar = async (id, datos) => {
    const actualizado = await actualizarGasto(id, datos);
    setGastos((prev) =>
      prev
        .map((g) => (g.id === id ? { ...g, ...actualizado } : g))
        .filter((g) => g.mes === mes)
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    );
    return actualizado;
  };

  const borrar = async (id) => {
    await eliminarGasto(id);
    setGastos((prev) => prev.filter((g) => g.id !== id));
  };

  const total = gastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  return { gastos, loading, error, total, agregar, editar, borrar, recargar: cargar };
};
