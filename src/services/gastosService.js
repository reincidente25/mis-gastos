// src/services/gastosService.js
// CRUD de gastos en Firestore. Cada gasto queda asociado al uid del usuario.
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLECCION = 'gastos';

/**
 * Devuelve el mes (YYYY-MM) a partir de una fecha YYYY-MM-DD.
 */
export const mesDeFecha = (fecha) => (fecha || '').slice(0, 7);

/**
 * Lista los gastos de un usuario para un mes dado (YYYY-MM),
 * ordenados por fecha descendente.
 */
export const listarGastos = async (uid, mes) => {
  const q = query(
    collection(db, COLECCION),
    where('uid', '==', uid),
    where('mes', '==', mes),
    orderBy('fecha', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Crea un gasto nuevo.
 * datos = { descripcion, monto, categoria, fecha (YYYY-MM-DD) }
 */
export const crearGasto = async (uid, datos) => {
  const payload = {
    uid,
    descripcion: datos.descripcion.trim(),
    monto: Number(datos.monto),
    categoria: datos.categoria,
    fecha: datos.fecha,
    mes: mesDeFecha(datos.fecha),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLECCION), payload);
  return { id: ref.id, ...payload };
};

/**
 * Actualiza un gasto existente.
 */
export const actualizarGasto = async (id, datos) => {
  const payload = {
    descripcion: datos.descripcion.trim(),
    monto: Number(datos.monto),
    categoria: datos.categoria,
    fecha: datos.fecha,
    mes: mesDeFecha(datos.fecha),
  };
  await updateDoc(doc(db, COLECCION, id), payload);
  return { id, ...payload };
};

/**
 * Elimina un gasto.
 */
export const eliminarGasto = (id) => deleteDoc(doc(db, COLECCION, id));
