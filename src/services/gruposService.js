// src/services/gruposService.js
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const col = (hogarId) => collection(db, 'hogares', hogarId, 'grupos');

export const listarGrupos = async (hogarId) => {
  const snap = await getDocs(query(col(hogarId), orderBy('orden', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const crearGrupo = async (hogarId, nombre, orden) => {
  const payload = {
    nombre: nombre.trim(),
    orden: orden ?? Date.now(),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(col(hogarId), payload);
  return { id: ref.id, ...payload };
};

export const actualizarGrupo = (hogarId, id, datos) =>
  updateDoc(doc(db, 'hogares', hogarId, 'grupos', id), datos);

export const eliminarGrupo = (hogarId, id) =>
  deleteDoc(doc(db, 'hogares', hogarId, 'grupos', id));
