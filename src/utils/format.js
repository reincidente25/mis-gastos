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

/** Diferencia en meses entre dos meses YYYY-MM (b - a). */
export const diffMeses = (a, b) => {
  if (!a || !b) return 0;
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by * 12 + bm) - (ay * 12 + am);
};

/**
 * ¿El concepto aplica en el mes dado, según su frecuencia?
 * Sin mesAncla o frecuencia mensual -> siempre.
 */
export const aplicaEnMes = (concepto, mes) => {
  const frec = concepto.frecuencia || 'mensual';
  if (frec === 'mensual') return true;
  const ancla = concepto.mesAncla;
  if (!ancla) return true; // sin ancla, no filtramos
  const diff = diffMeses(ancla, mes);
  if (frec === 'unica') return diff === 0;
  const cada = { bimestral: 2, trimestral: 3, cuatrimestral: 4, semestral: 6, anual: 12 }[frec] || 1;
  return diff >= 0 && diff % cada === 0;
};
