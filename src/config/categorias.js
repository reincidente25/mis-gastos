// src/config/categorias.js
// Categorías POR DEFECTO (se siembran en cada hogar nuevo y son editables).
// Las categorías reales viven en Firestore: hogares/{id}/categorias.

export const CATEGORIAS_DEFAULT = [
  { nombre: 'Vivienda',    icon: '🏠', color: '#6366f1' },
  { nombre: 'Servicios',   icon: '💡', color: '#0ea5e9' },
  { nombre: 'Educación',   icon: '🎓', color: '#8b5cf6' },
  { nombre: 'Salud',       icon: '💊', color: '#10b981' },
  { nombre: 'Transporte',  icon: '🚗', color: '#3b82f6' },
  { nombre: 'Impuestos',   icon: '🧾', color: '#f59e0b' },
  { nombre: 'Hogar',       icon: '🧹', color: '#14b8a6' },
  { nombre: 'Actividades', icon: '⚽', color: '#ec4899' },
  { nombre: 'Deudas',      icon: '🏦', color: '#ef4444' },
  { nombre: 'Viajes',      icon: '✈️', color: '#06b6d4' },
  { nombre: 'Compras',     icon: '🛍️', color: '#f97316' },
  { nombre: 'Otros',       icon: '📦', color: '#64748b' },
];

// Opciones para el selector de ícono y color al crear/editar categorías.
export const ICONOS_CATEGORIA = [
  '🏠', '💡', '🎓', '💊', '🚗', '🧾', '🧹', '⚽', '🏦', '✈️', '🛍️', '📦',
  '🍔', '🎉', '💰', '📱', '🐶', '🎁', '⛽', '🏥', '📚', '🔧',
];

export const COLORES_CATEGORIA = [
  '#6366f1', '#0ea5e9', '#8b5cf6', '#10b981', '#3b82f6', '#f59e0b',
  '#14b8a6', '#ec4899', '#ef4444', '#06b6d4', '#f97316', '#64748b',
];

// Fallback cuando una categoría fue borrada o no existe.
export const CATEGORIA_FALLBACK = { nombre: 'Sin categoría', icon: '📦', color: '#94a3b8' };
