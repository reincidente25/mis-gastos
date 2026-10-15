// src/context/EstructuraContext.jsx
// Carga categorías y grupos del hogar y expone su CRUD + mapas de búsqueda.
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useHogar } from './HogarContext';
import { CATEGORIA_FALLBACK } from '../config/categorias';
import {
  listarCategorias, crearCategoria, actualizarCategoria, eliminarCategoria,
  sembrarCategoriasSiVacio,
} from '../services/categoriasService';
import {
  listarGrupos, crearGrupo, actualizarGrupo, eliminarGrupo,
} from '../services/gruposService';

const EstructuraContext = createContext(null);

export const EstructuraProvider = ({ children }) => {
  const { hogar } = useHogar();
  const hogarId = hogar?.id;

  const [categorias, setCategorias] = useState([]);
  const [grupos, setGrupos]         = useState([]);
  const [loading, setLoading]       = useState(true);

  const cargar = useCallback(async () => {
    if (!hogarId) { setCategorias([]); setGrupos([]); setLoading(false); return; }
    setLoading(true);
    await sembrarCategoriasSiVacio(hogarId); // asegura defaults en hogares viejos
    const [cats, grs] = await Promise.all([
      listarCategorias(hogarId),
      listarGrupos(hogarId),
    ]);
    setCategorias(cats);
    setGrupos(grs);
    setLoading(false);
  }, [hogarId]);

  useEffect(() => { cargar(); }, [cargar]);

  const catMap = Object.fromEntries(categorias.map((c) => [c.id, c]));
  const grpMap = Object.fromEntries(grupos.map((g) => [g.id, g]));
  const getCat = (id) => catMap[id] || CATEGORIA_FALLBACK;
  const getGrp = (id) => grpMap[id] || null;

  // Categorías
  const addCategoria = async (datos) => {
    const nueva = await crearCategoria(hogarId, datos, categorias.length);
    setCategorias((p) => [...p, nueva]);
  };
  const editCategoria = async (id, datos) => {
    await actualizarCategoria(hogarId, id, datos);
    setCategorias((p) => p.map((c) => (c.id === id ? { ...c, ...datos } : c)));
  };
  const delCategoria = async (id) => {
    await eliminarCategoria(hogarId, id);
    setCategorias((p) => p.filter((c) => c.id !== id));
  };

  // Grupos
  const addGrupo = async (nombre) => {
    const nuevo = await crearGrupo(hogarId, nombre, grupos.length);
    setGrupos((p) => [...p, nuevo]);
  };
  const editGrupo = async (id, datos) => {
    await actualizarGrupo(hogarId, id, datos);
    setGrupos((p) => p.map((g) => (g.id === id ? { ...g, ...datos } : g)));
  };
  const delGrupo = async (id) => {
    await eliminarGrupo(hogarId, id);
    setGrupos((p) => p.filter((g) => g.id !== id));
  };

  return (
    <EstructuraContext.Provider value={{
      categorias, grupos, loading, catMap, grpMap, getCat, getGrp,
      addCategoria, editCategoria, delCategoria,
      addGrupo, editGrupo, delGrupo, recargar: cargar,
    }}>
      {children}
    </EstructuraContext.Provider>
  );
};

export const useEstructura = () => {
  const ctx = useContext(EstructuraContext);
  if (!ctx) throw new Error('useEstructura debe usarse dentro de EstructuraProvider');
  return ctx;
};

export default EstructuraContext;
