// src/services/categoriasService.js
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  query, orderBy, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CATEGORIAS_DEFAULT } from '../config/categorias';

const col = (hogarId) => collection(db, 'hogares', hogarId, 'categorias');

export const listarCategorias = async (hogarId) => {
  const snap = await getDocs(query(col(hogarId), orderBy('orden', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const crearCategoria = async (hogarId, { nombre, icon, color }, orden) => {
  const payload = {
    nombre: nombre.trim(),
    icon: icon || '📦',
    color: color || '#64748b',
    orden: orden ?? Date.now(),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(col(hogarId), payload);
  return { id: ref.id, ...payload };
};

export const actualizarCategoria = (hogarId, id, datos) =>
  updateDoc(doc(db, 'hogares', hogarId, 'categorias', id), datos);

export const eliminarCategoria = (hogarId, id) =>
  deleteDoc(doc(db, 'hogares', hogarId, 'categorias', id));

/** Siembra las categorías por defecto si el hogar todavía no tiene ninguna. */
export const sembrarCategoriasSiVacio = async (hogarId) => {
  const actuales = await listarCategorias(hogarId);
  if (actuales.length > 0) return actuales;
  const batch = writeBatch(db);
  const creadas = [];
  CATEGORIAS_DEFAULT.forEach((c, i) => {
    const ref = doc(col(hogarId));
    const payload = { ...c, orden: i, createdAt: serverTimestamp() };
    batch.set(ref, payload);
    creadas.push({ id: ref.id, ...payload });
  });
  await batch.commit();
  return creadas;
};
