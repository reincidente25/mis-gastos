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

/** Cantidad de semanas (filas de calendario) que toca un mes YYYY-MM. */
export const semanasEnMes = (mes) => {
  if (!mes) return 4;
  const [y, m] = mes.split('-').map(Number);
  const dias = new Date(y, m, 0).getDate();
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lunes = 0
  return Math.ceil((offset + dias) / 7);
};

/** Días de la semana: 1=Lunes .. 7=Domingo. */
export const DIAS_SEMANA = [
  { id: 1, label: 'Lunes',     corto: 'Lun' },
  { id: 2, label: 'Martes',    corto: 'Mar' },
  { id: 3, label: 'Miércoles', corto: 'Mié' },
  { id: 4, label: 'Jueves',    corto: 'Jue' },
  { id: 5, label: 'Viernes',   corto: 'Vie' },
  { id: 6, label: 'Sábado',    corto: 'Sáb' },
  { id: 7, label: 'Domingo',   corto: 'Dom' },
];

/** Fechas (YYYY-MM-DD) en las que cae un día de semana dado dentro del mes. */
export const fechasDeSemana = (mes, diaSemana) => {
  if (!mes) return [];
  const dia = Number(diaSemana) || 1; // 1=Lun .. 7=Dom
  const [y, m] = mes.split('-').map(Number);
  const dias = new Date(y, m, 0).getDate();
  const out = [];
  for (let d = 1; d <= dias; d++) {
    const dow = new Date(y, m - 1, d).getDay(); // 0=Dom .. 6=Sáb
    const iso = dow === 0 ? 7 : dow;            // 1=Lun .. 7=Dom
    if (iso === dia) out.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return out;
};

/**
 * ¿El concepto aplica en el mes dado, según su frecuencia?
 * Sin mesAncla o frecuencia mensual/semanal -> siempre.
 */
export const aplicaEnMes = (concepto, mes) => {
  const frec = concepto.frecuencia || 'mensual';
  if (frec === 'mensual' || frec === 'semanal') return true;
  const ancla = concepto.mesAncla;
  if (!ancla) return true; // sin ancla, no filtramos
  const diff = diffMeses(ancla, mes);
  if (frec === 'unica') return diff === 0;
  const cada = { bimestral: 2, trimestral: 3, cuatrimestral: 4, semestral: 6, anual: 12 }[frec] || 1;
  return diff >= 0 && diff % cada === 0;
};
