/**
 * borrado.ts
 * Qué se lleva puesto el borrado de una clase. Lógica pura.
 *
 * Borrar una clase de la Biblioteca arrastra sus copias publicadas en cada
 * colegio y las entregas que los alumnos ya hicieron. No hay copias de
 * seguridad, así que antes de borrar se le muestra al admin exactamente qué
 * se va a perder.
 *
 * El cartel de confirmación y el borrado real usan ESTA función. Antes cada
 * uno calculaba el alcance por su cuenta y podían no coincidir: se anunciaba
 * una cantidad y se borraba otra.
 */
import { ActivitySubmission, ClassItem, Student } from '../types';
import { entregaEsDeLaClase } from '../classKeys';

export interface AlcanceDeBorrado {
  /** Copias publicadas a colegios que desaparecen junto con la plantilla. */
  copias: ClassItem[];
  /** Colegios donde estaba publicada, sin repetir. */
  colegios: string[];
  /** Entregas de alumnos que se pierden, con sus notas y devoluciones. */
  entregas: ActivitySubmission[];
}

const minus = (s?: string) => (s ?? '').trim().toLowerCase();

export function alcanceDeBorrado(
  clase: Pick<ClassItem, 'level' | 'module' | 'week' | 'school'>,
  datos: { classes: ClassItem[]; submissions: ActivitySubmission[]; students: Student[] }
): AlcanceDeBorrado {
  const mismaClase = (c: ClassItem) =>
    c.level === clase.level && c.week === clase.week && (c.module ?? 1) === (clase.module ?? 1);

  // Borrar la plantilla (sin colegio) se lleva todas sus copias.
  // Borrar una copia publicada no toca las de los otros colegios.
  const copias = clase.school ? [] : datos.classes.filter((c) => !c.isSyllabus && mismaClase(c));

  let entregas = datos.submissions.filter((e) => entregaEsDeLaClase(e, clase));
  if (clase.school) {
    const colegioPorCorreo = new Map(datos.students.map((s) => [minus(s.email), minus(s.school)]));
    entregas = entregas.filter(
      (e) => minus(e.school) === minus(clase.school) || colegioPorCorreo.get(minus(e.studentEmail)) === minus(clase.school)
    );
  }

  return {
    copias,
    colegios: Array.from(new Set(copias.map((c) => c.school).filter((s): s is string => Boolean(s)))),
    entregas,
  };
}
