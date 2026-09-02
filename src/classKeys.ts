/**
 * classKeys.ts
 * Construcción de los IDs de documento de Firestore. Fuente única.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * Antes cada ID se armaba a mano en 8 lugares distintos y ninguno incluía el módulo:
 *
 *     syllabus_l0_w1     <- clase 1 del módulo 1
 *     syllabus_l0_w1     <- clase 1 del módulo 2  ¡MISMO ID!
 *
 * Como se guardan con setDoc sin merge, la segunda borraba la primera en silencio.
 * Con 4 módulos de 8 clases por nivel, eso significaba perder 3 de cada 4 clases.
 *
 * Ahora el módulo forma parte de la clave y nada se pisa.
 */

/** Los colegios y correos van en el ID, así que hay que limpiarlos de caracteres inválidos. */
const slugColegio = (school: string) => school.replace(/[^a-zA-Z0-9]/g, '_');
const slugEmail = (email: string) => email.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '_');

/** Clases anteriores a este cambio no tienen módulo: las tratamos como del módulo 1. */
const mod = (module?: number) => module ?? 1;

/** Plantilla maestra en la Biblioteca (sin colegio). */
export const syllabusId = (level: number, module: number | undefined, week: number) =>
  `syllabus_l${level}_m${mod(module)}_w${week}`;

/** Copia publicada a un colegio concreto. */
export const assignedId = (school: string, level: number, module: number | undefined, week: number) =>
  `assigned_s${slugColegio(school)}_l${level}_m${mod(module)}_w${week}`;

/** Entrega de un alumno para una clase. */
export const submissionId = (email: string, level: number, module: number | undefined, week: number) =>
  `${slugEmail(email)}_l${level}_m${mod(module)}_w${week}`;

/**
 * ID de una entrega YA GUARDADA. Respeta el formato con el que se creó:
 * las anteriores a este cambio no tienen classModule y viven sin el tramo _m.
 * Si usáramos siempre el formato nuevo, corregir una entrega vieja crearía
 * un documento duplicado en lugar de actualizar el original.
 */
export const submissionIdExistente = (
  email: string,
  level: number,
  module: number | undefined,
  week: number
) =>
  module === undefined
    ? `${slugEmail(email)}_l${level}_w${week}`
    : `${slugEmail(email)}_l${level}_m${module}_w${week}`;

/**
 * Posición absoluta de una clase dentro de su nivel: módulo 1 clases 1-8, módulo 2 clases 9-16, etc.
 * Sirve para ordenar y para el desbloqueo secuencial, que si no interpreta
 * cuatro "clase 1" distintas como si fueran la misma.
 */
export const ordenEnNivel = (module: number | undefined, week: number) =>
  (mod(module) - 1) * 8 + week;

/** Variantes históricas de un ID, para poder borrar documentos viejos. */
export const idsHistoricos = (school: string | undefined, level: number, week: number): string[] => {
  if (!school) return [`syllabus_l${level}_w${week}`];
  const sinTildes = school.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return [
    `assigned_s${slugColegio(school)}_l${level}_w${week}`,
    `assigned_s${slugColegio(school.toLowerCase())}_l${level}_w${week}`,
    `assigned_s${slugColegio(sinTildes)}_l${level}_w${week}`,
    `assigned_s${slugColegio(sinTildes.toLowerCase())}_l${level}_w${week}`,
  ];
};
