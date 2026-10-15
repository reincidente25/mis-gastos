// src/context/HogarContext.jsx
// Carga el perfil del usuario y su hogar (presupuesto compartido).
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getPerfil,
  getHogar,
  crearHogar as crearHogarSvc,
  unirseConCodigo as unirseSvc,
} from '../services/hogaresService';

const HogarContext = createContext(null);

export const HogarProvider = ({ children }) => {
  const { user } = useAuth();
  const [perfil, setPerfil]   = useState(null);
  const [hogar, setHogar]     = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!user) {
      setPerfil(null);
      setHogar(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const p = await getPerfil(user.uid, user.email);
    setPerfil(p);
    setHogar(p.hogarId ? await getHogar(p.hogarId) : null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crearHogar = async (nombre) => {
    const h = await crearHogarSvc(user.uid, user.email, nombre);
    setHogar(h);
    setPerfil((p) => ({ ...p, hogarId: h.id }));
    return h;
  };

  const unirseConCodigo = async (codigo) => {
    const h = await unirseSvc(user.uid, user.email, codigo);
    setHogar(h);
    setPerfil((p) => ({ ...p, hogarId: h.id }));
    return h;
  };

  return (
    <HogarContext.Provider
      value={{ perfil, hogar, loading, crearHogar, unirseConCodigo, recargar: cargar }}
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
