// src/services/gastosService.js
// Gastos del hogar. Cada gasto pertenece a un mes (YYYY-MM).
// - Recurrentes: ligados a un conceptoId, con id determinístico `${mes}__${conceptoId}`
//   para que cargar el importe del mes sea un upsert simple (sin duplicados).
// - Sueltos: conceptoId null, id automático.
import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const col = (hogarId) => collection(db, 'hogares', hogarId, 'gastos');

export const listarGastosMes = async (hogarId, mes) => {
  const q = query(col(hogarId), where('mes', '==', mes));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Carga/actualiza un concepto recurrente para un mes.
 * datos = { monto?, items? } donde items = [{ detalle, monto }].
 * Si hay items, el total es la suma de ellos. Total <= 0 y sin items elimina.
 */
export const guardarGastoRecurrente = async (hogarId, mes, concepto, datos, uid) => {
  const id = `${mes}__${concepto.id}`;
  const ref = doc(db, 'hogares', hogarId, 'gastos', id);

  const items = Array.isArray(datos.items)
    ? datos.items
        .map((it) => ({ detalle: (it.detalle || '').trim(), monto: Number(it.monto) || 0 }))
        .filter((it) => it.detalle || it.monto)
    : [];

  const valor = items.length
    ? items.reduce((a, it) => a + it.monto, 0)
    : Number(datos.monto) || 0;

  if ((!valor || valor <= 0) && items.length === 0) {
    await deleteDoc(ref).catch(() => {});
    return null;
  }

  const payload = {
    mes,
    conceptoId: concepto.id,
    concepto: concepto.nombre,
    categoria: concepto.categoria,
    monto: valor,
    items,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload); // reemplaza el doc (limpia items viejos si ya no hay)
  return { id, ...payload };
};

/** Crea un gasto suelto (no recurrente). */
export const crearGastoSuelto = async (hogarId, mes, datos, uid) => {
  const payload = {
    mes,
    conceptoId: null,
    concepto: datos.concepto.trim(),
    categoria: datos.categoria,
    monto: Number(datos.monto),
    createdBy: uid,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(col(hogarId), payload);
  return { id: ref.id, ...payload };
};

export const eliminarGasto = (hogarId, id) =>
  deleteDoc(doc(db, 'hogares', hogarId, 'gastos', id));
