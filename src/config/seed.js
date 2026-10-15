// src/config/seed.js
// Conceptos y tarjetas iniciales, tomados de la planilla, para que un hogar
// nuevo arranque con la lista habitual cargada. Todo es editable después.

export const CONCEPTOS_INICIALES = [
  { nombre: 'ESBA Cuota Emma',            categoria: 'educacion' },
  { nombre: 'ESBA Cuota Bruno',           categoria: 'educacion' },
  { nombre: 'Adicionales ESBA Flores',    categoria: 'educacion' },
  { nombre: 'Seguro del Auto',            categoria: 'transporte' },
  { nombre: 'Patente',                    categoria: 'transporte' },
  { nombre: 'Monotributo Cintia',         categoria: 'impuestos' },
  { nombre: 'AGIP IIBB Cintia',           categoria: 'impuestos' },
  { nombre: 'Empleada (Juana/Mirta/Valeria)', categoria: 'hogar' },
  { nombre: 'Alquiler Edgardo (padre)',   categoria: 'vivienda' },
  { nombre: 'Gimnasia Emma IMPERIO',      categoria: 'actividades' },
  { nombre: 'Fútbol Bruno - MEGA',        categoria: 'actividades' },
  { nombre: 'Psicopedagoga Bruno - Paula',categoria: 'salud' },
  { nombre: 'Fonoaudióloga Bruno - M. Laura', categoria: 'salud' },
  { nombre: 'Psicólogo Ed',               categoria: 'salud' },
  { nombre: 'TO Bruno',                   categoria: 'salud' },
  { nombre: 'Expensas Dolores',           categoria: 'vivienda' },
  { nombre: 'Edesur Dolores',             categoria: 'servicios' },
  { nombre: 'Metrogas Dolores',           categoria: 'servicios' },
  { nombre: 'AySA Dolores',               categoria: 'servicios' },
  { nombre: 'ABL Dolores',                categoria: 'impuestos' },
  { nombre: 'Expensas Baradero',          categoria: 'vivienda' },
  { nombre: 'Edesur Baradero',            categoria: 'servicios' },
  { nombre: 'Metrogas Baradero',          categoria: 'servicios' },
  { nombre: 'ABL Baradero',               categoria: 'impuestos' },
  { nombre: 'Viaje Egresados Emma 2027',  categoria: 'viajes' },
  { nombre: 'Cuota Crédito',              categoria: 'deudas' },
];

export const TARJETAS_INICIALES = [
  'Visa Santander',
  'Amex Santander',
  'Visa Francés',
  'Master Patagonia',
];
