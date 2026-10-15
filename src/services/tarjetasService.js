// src/services/tarjetasService.js
// Tarjetas del hogar y sus resúmenes mensuales (bloque separado de los gastos).
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const tarjetasCol  = (hogarId) => collection(db, 'hogares', hogarId, 'tarjetas');
const resumenesCol = (hogarId) => collection(db, 'hogares', hogarId, 'resumenesTarjeta');

// ── Tarjetas ──
export const listarTarjetas = async (hogarId) => {
  const q = query(tarjetasCol(hogarId), orderBy('orden', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const crearTarjeta = async (hogarId, nombre, orden) => {
  const payload = {
    nombre: nombre.trim(),
    orden: orden ?? Date.now(),
    activa: true,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(tarjetasCol(hogarId), payload);
  return { id: ref.id, ...payload };
};

export const archivarTarjeta = (hogarId, id) =>
  updateDoc(doc(db, 'hogares', hogarId, 'tarjetas', id), { activa: false });

// ── Resúmenes mensuales por tarjeta ──
export const listarResumenesMes = async (hogarId, mes) => {
  const q = query(resumenesCol(hogarId), where('mes', '==', mes));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Upsert del monto de una tarjeta para un mes. monto<=0 elimina. */
export const setResumenTarjeta = async (hogarId, mes, tarjeta, monto, uid) => {
  const id = `${mes}__${tarjeta.id}`;
  const ref = doc(db, 'hogares', hogarId, 'resumenesTarjeta', id);
  const valor = Number(monto);
  if (!valor || valor <= 0) {
    await deleteDoc(ref).catch(() => {});
    return null;
  }
  const payload = {
    mes,
    tarjetaId: tarjeta.id,
    tarjetaNombre: tarjeta.nombre,
    monto: valor,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload, { merge: true });
  return { id, ...payload };
};
