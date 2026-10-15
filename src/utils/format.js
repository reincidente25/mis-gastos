// src/utils/format.js

/** Formatea un número como moneda local (ARS por defecto). */
export const formatMoneda = (valor) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);

/** Mes actual en formato YYYY-MM. */
export const mesActual = () => new Date().toISOString().slice(0, 7);

/** Fecha de hoy en formato YYYY-MM-DD. */
export const hoy = () => new Date().toISOString().slice(0, 10);

/** Convierte "2026-10" en "Octubre 2026". */
export const mesLegible = (mes) => {
  if (!mes) return '';
  const [anio, m] = mes.split('-');
  const nombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return `${nombres[Number(m) - 1]} ${anio}`;
};

/** Formatea YYYY-MM-DD como DD/MM. */
export const fechaCorta = (fecha) => {
  if (!fecha) return '';
  const [, m, d] = fecha.split('-');
  return `${d}/${m}`;
};
