// src/config/frecuencias.js
// Frecuencia de cada concepto. `meses` = cada cuántos meses aplica
// (0 = única vez; 1 = mensual).

export const FRECUENCIAS = [
  { id: 'mensual',       label: 'Mensual',       corto: 'Mens.',  meses: 1 },
  { id: 'bimestral',     label: 'Bimestral',     corto: 'Bim.',   meses: 2 },
  { id: 'trimestral',    label: 'Trimestral',    corto: 'Trim.',  meses: 3 },
  { id: 'cuatrimestral', label: 'Cuatrimestral', corto: '4-mes.', meses: 4 },
  { id: 'semestral',     label: 'Semestral',     corto: 'Sem.',   meses: 6 },
  { id: 'anual',         label: 'Anual',         corto: 'Anual',  meses: 12 },
  { id: 'unica',         label: 'Única vez',     corto: 'Única',  meses: 0 },
];

export const FRECUENCIAS_MAP = FRECUENCIAS.reduce((acc, f) => {
  acc[f.id] = f;
  return acc;
}, {});

export const getFrecuencia = (id) => FRECUENCIAS_MAP[id] || FRECUENCIAS_MAP.mensual;
