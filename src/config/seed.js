// src/config/seed.js
// Conceptos y tarjetas iniciales, tomados de la planilla, para que un hogar
// nuevo arranque con la lista habitual cargada. Todo es editable después.
//
// `grupo` agrupa variantes del mismo rubro (ej: Edesur Dolores / Edesur Baradero)
// dentro de su categoría, sin crear categorías nuevas. Vacío = sin grupo.

export const CONCEPTOS_INICIALES = [
  { nombre: 'ESBA Emma',                grupo: 'ESBA',     categoria: 'educacion' },
  { nombre: 'ESBA Bruno',               grupo: 'ESBA',     categoria: 'educacion' },
  { nombre: 'ESBA Adicionales Flores',  grupo: 'ESBA',     categoria: 'educacion' },
  { nombre: 'Seguro del Auto',          grupo: '',         categoria: 'transporte' },
  { nombre: 'Patente',                  grupo: '',         categoria: 'transporte' },
  { nombre: 'Monotributo Cintia',       grupo: 'Impuestos Cintia', categoria: 'impuestos' },
  { nombre: 'AGIP IIBB Cintia',         grupo: 'Impuestos Cintia', categoria: 'impuestos' },
  { nombre: 'Empleada (Juana/Mirta/Valeria)', grupo: '',   categoria: 'hogar' },
  { nombre: 'Alquiler Edgardo (padre)', grupo: '',         categoria: 'vivienda' },
  { nombre: 'Gimnasia Emma IMPERIO',    grupo: '',         categoria: 'actividades' },
  { nombre: 'Fútbol Bruno - MEGA',      grupo: '',         categoria: 'actividades' },
  { nombre: 'Psicopedagoga Bruno - Paula', grupo: 'Terapias Bruno', categoria: 'salud' },
  { nombre: 'Fonoaudióloga Bruno - M. Laura', grupo: 'Terapias Bruno', categoria: 'salud' },
  { nombre: 'TO Bruno',                 grupo: 'Terapias Bruno', categoria: 'salud' },
  { nombre: 'Psicólogo Ed',             grupo: '',         categoria: 'salud' },
  { nombre: 'Expensas Dolores',         grupo: 'Expensas', categoria: 'vivienda' },
  { nombre: 'Expensas Baradero',        grupo: 'Expensas', categoria: 'vivienda' },
  { nombre: 'Edesur Dolores',           grupo: 'Edesur',   categoria: 'servicios' },
  { nombre: 'Edesur Baradero',          grupo: 'Edesur',   categoria: 'servicios' },
  { nombre: 'Metrogas Dolores',         grupo: 'Metrogas', categoria: 'servicios' },
  { nombre: 'Metrogas Baradero',        grupo: 'Metrogas', categoria: 'servicios' },
  { nombre: 'AySA Dolores',             grupo: '',         categoria: 'servicios' },
  { nombre: 'ABL Dolores',              grupo: 'ABL',      categoria: 'impuestos' },
  { nombre: 'ABL Baradero',             grupo: 'ABL',      categoria: 'impuestos' },
  { nombre: 'Viaje Egresados Emma 2027', grupo: '',        categoria: 'viajes' },
  { nombre: 'Cuota Crédito',            grupo: '',         categoria: 'deudas' },
];

export const TARJETAS_INICIALES = [
  'Visa Santander',
  'Amex Santander',
  'Visa Francés',
  'Master Patagonia',
];
