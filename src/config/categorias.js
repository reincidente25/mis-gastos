// src/config/categorias.js
// Categorías de gasto, derivadas de los conceptos reales de la planilla.

export const CATEGORIAS = [
  { id: 'vivienda',    label: 'Vivienda',    icon: '🏠', color: '#6366f1' },
  { id: 'servicios',   label: 'Servicios',   icon: '💡', color: '#0ea5e9' },
  { id: 'educacion',   label: 'Educación',   icon: '🎓', color: '#8b5cf6' },
  { id: 'salud',       label: 'Salud',       icon: '💊', color: '#10b981' },
  { id: 'transporte',  label: 'Transporte',  icon: '🚗', color: '#3b82f6' },
  { id: 'impuestos',   label: 'Impuestos',   icon: '🧾', color: '#f59e0b' },
  { id: 'hogar',       label: 'Hogar',       icon: '🧹', color: '#14b8a6' },
  { id: 'actividades', label: 'Actividades', icon: '⚽', color: '#ec4899' },
  { id: 'deudas',      label: 'Deudas',      icon: '🏦', color: '#ef4444' },
  { id: 'viajes',      label: 'Viajes',      icon: '✈️', color: '#06b6d4' },
  { id: 'compras',     label: 'Compras',     icon: '🛍️', color: '#f97316' },
  { id: 'otros',       label: 'Otros',       icon: '📦', color: '#64748b' },
];

export const CATEGORIAS_MAP = CATEGORIAS.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

export const getCategoria = (id) =>
  CATEGORIAS_MAP[id] || { id: 'otros', label: 'Otros', icon: '📦', color: '#64748b' };
