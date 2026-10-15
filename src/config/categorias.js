// src/config/categorias.js
// Categorías de gasto compartidas por toda la app.

export const CATEGORIAS = [
  { id: 'comida',      label: 'Comida',      icon: '🍔', color: '#f59e0b' },
  { id: 'transporte',  label: 'Transporte',  icon: '🚗', color: '#3b82f6' },
  { id: 'vivienda',    label: 'Vivienda',    icon: '🏠', color: '#8b5cf6' },
  { id: 'servicios',   label: 'Servicios',   icon: '💡', color: '#06b6d4' },
  { id: 'ocio',        label: 'Ocio',        icon: '🎉', color: '#ec4899' },
  { id: 'salud',       label: 'Salud',       icon: '💊', color: '#10b981' },
  { id: 'compras',     label: 'Compras',     icon: '🛍️', color: '#ef4444' },
  { id: 'otros',       label: 'Otros',       icon: '📦', color: '#64748b' },
];

export const CATEGORIAS_MAP = CATEGORIAS.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

export const getCategoria = (id) =>
  CATEGORIAS_MAP[id] || { id, label: id, icon: '📦', color: '#64748b' };
