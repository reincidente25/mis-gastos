// src/services/conceptosService.js
// Conceptos recurrentes del hogar (las "filas" fijas de la planilla).
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const col = (hogarId) => collection(db, 'hogares', hogarId, 'conceptos');

export const listarConceptos = async (hogarId) => {
  const q = query(col(hogarId), orderBy('orden', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const crearConcepto = async (hogarId, { nombre, categoria, grupo, frecuencia, mesAncla }, orden) => {
  const payload = {
    nombre: nombre.trim(),
    grupo: (grupo || '').trim(),
    categoria,
    frecuencia: frecuencia || 'mensual',
    mesAncla: mesAncla || '',
    orden: orden ?? Date.now(),
    activo: true,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(col(hogarId), payload);
  return { id: ref.id, ...payload };
};

export const actualizarConcepto = async (hogarId, id, datos) => {
  await updateDoc(doc(db, 'hogares', hogarId, 'conceptos', id), datos);
};

/** No borramos: archivamos para no perder el histórico de gastos. */
export const archivarConcepto = (hogarId, id) =>
  updateDoc(doc(db, 'hogares', hogarId, 'conceptos', id), { activo: false });

export const reactivarConcepto = (hogarId, id) =>
  updateDoc(doc(db, 'hogares', hogarId, 'conceptos', id), { activo: true });

/** Borra definitivamente un concepto (no borra los gastos ya cargados). */
export const eliminarConcepto = (hogarId, id) =>
  deleteDoc(doc(db, 'hogares', hogarId, 'conceptos', id));

/** Borra TODOS los conceptos del hogar. */
export const eliminarTodosConceptos = async (hogarId) => {
  const snap = await getDocs(col(hogarId));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};
