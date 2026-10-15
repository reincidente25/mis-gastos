// src/services/hogaresService.js
// Gestión del "hogar" (presupuesto compartido entre varios usuarios).
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  writeBatch,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CONCEPTOS_INICIALES, TARJETAS_INICIALES } from '../config/seed';

const usuarioRef = (uid) => doc(db, 'usuarios', uid);
const hogarRef   = (id)  => doc(db, 'hogares', id);

/** Genera un código corto y legible para invitar a unirse al hogar. */
const generarCodigo = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

/** Devuelve (creando si hace falta) el documento de perfil del usuario. */
export const getPerfil = async (uid, email) => {
  const snap = await getDoc(usuarioRef(uid));
  if (snap.exists()) return { uid, ...snap.data() };
  const perfil = { email: email || '', hogarId: null, createdAt: serverTimestamp() };
  await setDoc(usuarioRef(uid), perfil);
  return { uid, ...perfil };
};

/** Lee un hogar por id. */
export const getHogar = async (hogarId) => {
  if (!hogarId) return null;
  const snap = await getDoc(hogarRef(hogarId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/** Crea un hogar nuevo, lo siembra con conceptos/tarjetas y lo asigna al usuario. */
export const crearHogar = async (uid, email, nombre) => {
  const codigo = generarCodigo();
  const nuevo = {
    nombre: (nombre || 'Mi hogar').trim(),
    codigo,
    miembros: [uid],
    createdBy: uid,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'hogares'), nuevo);

  // Sembrar conceptos y tarjetas iniciales en un batch.
  const batch = writeBatch(db);
  CONCEPTOS_INICIALES.forEach((c, i) => {
    const cRef = doc(collection(db, 'hogares', ref.id, 'conceptos'));
    batch.set(cRef, { ...c, orden: i, activo: true, createdAt: serverTimestamp() });
  });
  TARJETAS_INICIALES.forEach((nombreTarjeta, i) => {
    const tRef = doc(collection(db, 'hogares', ref.id, 'tarjetas'));
    batch.set(tRef, { nombre: nombreTarjeta, orden: i, activa: true, createdAt: serverTimestamp() });
  });
  await batch.commit();

  await updateDoc(usuarioRef(uid), { hogarId: ref.id, email: email || '' });
  return { id: ref.id, ...nuevo };
};

/** Une al usuario a un hogar existente usando el código de invitación. */
export const unirseConCodigo = async (uid, email, codigo) => {
  const q = query(
    collection(db, 'hogares'),
    where('codigo', '==', (codigo || '').trim().toUpperCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('CODIGO_INVALIDO');

  const hogarDoc = snap.docs[0];
  await updateDoc(hogarRef(hogarDoc.id), { miembros: arrayUnion(uid) });
  await updateDoc(usuarioRef(uid), { hogarId: hogarDoc.id, email: email || '' });
  return { id: hogarDoc.id, ...hogarDoc.data() };
};
