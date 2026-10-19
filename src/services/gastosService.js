// src/services/gastosService.js
// Gastos del hogar. Cada gasto pertenece a un mes (YYYY-MM).
// - Recurrentes: ligados a un conceptoId, con id determinístico `${mes}__${conceptoId}`
//   para que cargar el importe del mes sea un upsert simple (sin duplicados).
// - Sueltos: conceptoId null, id automático.
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const col = (hogarId) => collection(db, 'hogares', hogarId, 'gastos');

/** Lee el gasto de un concepto en un mes puntual (o null). */
export const getGastoConcepto = async (hogarId, mes, conceptoId) => {
  const snap = await getDoc(doc(db, 'hogares', hogarId, 'gastos', `${mes}__${conceptoId}`));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

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

  // Peso de un ítem: si es USD, monto × cotización; si no, el monto.
  const pesos = (it) => (it.moneda === 'usd'
    ? (Number(it.monto) || 0) * (Number(it.cotizacion) || 0)
    : (Number(it.monto) || 0));

  const rows = Array.isArray(datos.items)
    ? datos.items
        .map((it) => ({
          detalle: (it.detalle || '').trim(),
          monto: Number(it.monto) || 0,
          moneda: it.moneda === 'usd' ? 'usd' : 'ars',
          cotizacion: Number(it.cotizacion) || 0,
        }))
        .filter((it) => it.detalle || it.monto)
    : [];

  // Si ninguna fila tiene nombre, es un monto simple (sin desglose).
  const hayDetalle = rows.some((it) => it.detalle);
  const items = hayDetalle ? rows : [];

  const valor = rows.length
    ? rows.reduce((a, it) => a + pesos(it), 0)
    : Number(datos.monto) || 0;

  if ((!valor || valor <= 0) && items.length === 0) {
    await deleteDoc(ref).catch(() => {});
    return null;
  }

  const payload = {
    mes,
    conceptoId: concepto.id,
    concepto: concepto.nombre,
    categoriaId: concepto.categoriaId || '',
    grupoId: concepto.grupoId || '',
    monto: valor,
    items,
    vencimiento: datos.vencimiento ?? '',
    pagado: datos.pagado ?? false,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload); // reemplaza el doc (limpia items viejos si ya no hay)
  return { id, ...payload };
};

/**
 * Guarda un concepto semanal para el mes.
 * datos = { montoSemanal, semanas: [bool...] }.
 * - monto = montoSemanal × cantidad de semanas (total del mes).
 * - pagado = todas las semanas marcadas.
 */
export const guardarGastoSemanal = async (hogarId, mes, concepto, datos, uid) => {
  const id = `${mes}__${concepto.id}`;
  const ref = doc(db, 'hogares', hogarId, 'gastos', id);
  const semanal = Number(datos.montoSemanal) || 0;
  const semanas = Array.isArray(datos.semanas) ? datos.semanas.map(Boolean) : [];
  const fechas = Array.isArray(datos.fechas) ? datos.fechas : [];

  if (semanal <= 0) {
    await deleteDoc(ref).catch(() => {});
    return null;
  }

  const payload = {
    mes,
    conceptoId: concepto.id,
    concepto: concepto.nombre,
    categoriaId: concepto.categoriaId || '',
    grupoId: concepto.grupoId || '',
    esSemanal: true,
    montoSemanal: semanal,
    monto: semanal * semanas.length,
    semanas,
    fechas,
    items: [],
    vencimiento: '',
    pagado: semanas.length > 0 && semanas.every(Boolean),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload);
  return { id, ...payload };
};

/** Actualiza solo vencimiento/pagado de un gasto existente del mes. */
export const setMetaGasto = async (hogarId, mes, concepto, meta) => {
  const id = `${mes}__${concepto.id}`;
  const ref = doc(db, 'hogares', hogarId, 'gastos', id);
  await updateDoc(ref, meta).catch(() => {}); // solo si el gasto existe
  return { id, ...meta };
};

/** Crea un gasto suelto (no recurrente). */
export const crearGastoSuelto = async (hogarId, mes, datos, uid) => {
  const payload = {
    mes,
    conceptoId: null,
    concepto: datos.concepto.trim(),
    categoriaId: datos.categoriaId || '',
    monto: Number(datos.monto),
    createdBy: uid,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(col(hogarId), payload);
  return { id: ref.id, ...payload };
};

export const eliminarGasto = (hogarId, id) =>
  deleteDoc(doc(db, 'hogares', hogarId, 'gastos', id));
