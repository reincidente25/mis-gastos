// src/context/HogarContext.jsx
// Carga el perfil del usuario y su hogar (presupuesto compartido).
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getPerfil,
  getHogar,
  listarHogares,
  seleccionarHogar,
  crearHogar as crearHogarSvc,
  unirseConCodigo as unirseSvc,
} from '../services/hogaresService';

const HogarContext = createContext(null);

export const HogarProvider = ({ children }) => {
  const { user } = useAuth();
  const [perfil, setPerfil]   = useState(null);
  const [hogar, setHogar]     = useState(null);   // hogar activo
  const [hogares, setHogares] = useState([]);     // todos los del usuario
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!user) {
      setPerfil(null);
      setHogar(null);
      setHogares([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const p = await getPerfil(user.uid, user.email);
    const lista = await listarHogares(user.uid);
    // Hogar activo: el del perfil si sigue siendo miembro; si no, el primero.
    let activoId = p.hogarId;
    if (!activoId || !lista.some((h) => h.id === activoId)) activoId = lista[0]?.id || null;
    setPerfil({ ...p, hogarId: activoId });
    setHogares(lista);
    setHogar(lista.find((h) => h.id === activoId) || null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crearHogar = async (nombre) => {
    const h = await crearHogarSvc(user.uid, user.email, nombre);
    setHogares((prev) => [...prev.filter((x) => x.id !== h.id), h]);
    setHogar(h);
    setPerfil((p) => ({ ...p, hogarId: h.id }));
    return h;
  };

  const unirseConCodigo = async (codigo) => {
    const h = await unirseSvc(user.uid, user.email, codigo);
    setHogares((prev) => [...prev.filter((x) => x.id !== h.id), h]);
    setHogar(h);
    setPerfil((p) => ({ ...p, hogarId: h.id }));
    return h;
  };

  // Cambia el hogar activo.
  const cambiarHogar = async (id) => {
    if (!id || id === hogar?.id) return;
    await seleccionarHogar(user.uid, id);
    const h = hogares.find((x) => x.id === id) || (await getHogar(id));
    setHogar(h);
    setPerfil((p) => ({ ...p, hogarId: id }));
  };

  return (
    <HogarContext.Provider
      value={{ perfil, hogar, hogares, loading, crearHogar, unirseConCodigo, cambiarHogar, recargar: cargar }}
    >
      {children}
    </HogarContext.Provider>
  );
};

export const useHogar = () => {
  const ctx = useContext(HogarContext);
  if (!ctx) throw new Error('useHogar debe usarse dentro de HogarProvider');
  return ctx;
};

export default HogarContext;
