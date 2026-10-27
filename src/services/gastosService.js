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
          pagado: Boolean(it.pagado),
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

  // Con desglose, el "pagado" general se deriva de los ítems (todos pagados).
  const pagadoGeneral = items.length
    ? items.every((it) => it.pagado)
    : (datos.pagado ?? false);

  const payload = {
    mes,
    conceptoId: concepto.id,
    concepto: concepto.nombre,
    categoriaId: concepto.categoriaId || '',
    grupoId: concepto.grupoId || '',
    monto: valor,
    items,
    vencimiento: datos.vencimiento ?? '',
    pagado: pagadoGeneral,
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
  const semanal = Number(datos.montoSemanal) || 0;     // monto base por semana
  const semanas = Array.isArray(datos.semanas) ? datos.semanas.map(Boolean) : [];
  const fechas = Array.isArray(datos.fechas) ? datos.fechas : [];
  // Monto por semana: permite que una semana valga 0 (no se paga esa semana).
  const montosSemana = Array.isArray(datos.montosSemana)
    ? datos.montosSemana.map((n) => Number(n) || 0)
    : semanas.map(() => semanal);

  const total = montosSemana.reduce((a, n) => a + n, 0);
  // Se borra solo si no hay ni base ni detalle. Un base > 0 sin detalle se
  // conserva como valor por defecto (no suma al total).
  if (total <= 0 && semanal <= 0) {
    await deleteDoc(ref).catch(() => {});
    return null;
  }

  // Pagado = todas las semanas con monto > 0 están marcadas.
  const conMonto = montosSemana.map((n, i) => ({ n, pagada: semanas[i] }));
  const aPagar = conMonto.filter((s) => s.n > 0);
  const pagado = aPagar.length > 0 && aPagar.every((s) => s.pagada);

  const payload = {
    mes,
    conceptoId: concepto.id,
    concepto: concepto.nombre,
    categoriaId: concepto.categoriaId || '',
    grupoId: concepto.grupoId || '',
    esSemanal: true,
    montoSemanal: semanal,
    montosSemana,
    monto: total,
    semanas,
    fechas,
    items: [],
    vencimiento: '',
    pagado,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload);
  return { id, ...payload };
};

/** Todos los gastos del hogar (para el dashboard anual). */
export const listarTodosGastos = async (hogarId) => {
  const snap = await getDocs(col(hogarId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Todos los gastos de un concepto en cualquier mes (para saldos acumulados). */
export const listarGastosPorConcepto = async (hogarId, conceptoId) => {
  const q = query(col(hogarId), where('conceptoId', '==', conceptoId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    grupoId: datos.grupoId || '',
    monto: Number(datos.monto),
    vencimiento: datos.vencimiento || '',
    pagado: false,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(col(hogarId), payload);
  return { id: ref.id, ...payload };
};

/** Actualiza vencimiento/pagado (u otros campos) de un gasto suelto. */
export const actualizarGastoSuelto = async (hogarId, id, datos) => {
  await updateDoc(doc(db, 'hogares', hogarId, 'gastos', id), datos).catch(() => {});
};

/**
 * Guarda el desglose (o el monto simple) de un gasto suelto.
 * items = [{ detalle, monto, moneda, cotizacion, pagado }].
 */
export const guardarDesgloseSuelto = async (hogarId, id, items) => {
  const ref = doc(db, 'hogares', hogarId, 'gastos', id);
  const pesos = (it) => (it.moneda === 'usd'
    ? (Number(it.monto) || 0) * (Number(it.cotizacion) || 0)
    : (Number(it.monto) || 0));
  const rows = (Array.isArray(items) ? items : [])
    .map((it) => ({
      detalle: (it.detalle || '').trim(),
      monto: Number(it.monto) || 0,
      moneda: it.moneda === 'usd' ? 'usd' : 'ars',
      cotizacion: Number(it.cotizacion) || 0,
      pagado: Boolean(it.pagado),
    }))
    .filter((it) => it.detalle || it.monto);
  const hayDetalle = rows.some((it) => it.detalle);
  const itemsF = hayDetalle ? rows : [];
  const valor = rows.reduce((a, it) => a + pesos(it), 0);

  const payload = { monto: valor, items: itemsF };
  if (itemsF.length) payload.pagado = itemsF.every((it) => it.pagado);
  await updateDoc(ref, payload).catch(() => {});
  return payload;
};

export const eliminarGasto = (hogarId, id) =>
  deleteDoc(doc(db, 'hogares', hogarId, 'gastos', id));
