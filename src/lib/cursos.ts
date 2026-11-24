/**
 * cursos.ts
 * Los cursos del campus y en cuáles está inscripto cada alumno.
 *
 * CÓMO CONVIVE CON LO QUE YA EXISTÍA
 * Hasta noviembre de 2026 había un solo curso, Finanzas personales, y nada
 * en la base decía "finanzas": ni las clases, ni las entregas, ni los alumnos.
 * Para no migrar datos con alumnos usándolos, la regla es simple:
 *
 *   - Lo que no tiene curso es de Finanzas.
 *   - Un alumno sin lista de inscripciones está en Finanzas, en su `level`.
 *
 * Los cursos nuevos sí guardan su `course` y lo llevan en el ID del documento,
 * así nunca se mezclan con Finanzas.
 */
import { COURSES, FINANZAS } from '../data';
import { Curso, Inscripcion } from '../types';

export { FINANZAS };

/** Finanzas no vive en Firestore: es el curso de siempre. */
export const CURSO_FINANZAS: Curso = {
  id: FINANZAS,
  name: 'Finanzas personales',
  desc: 'Educación financiera en cuatro niveles.',
  accent: 'from-violet-600 to-indigo-600',
};

/** Colores para elegir al crear un curso. Las clases están escritas enteras para que Tailwind las genere. */
export const PALETA_CURSOS = [
  'from-violet-600 to-indigo-600',
  'from-blue-600 to-cyan-500',
  'from-emerald-600 to-teal-500',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-fuchsia-600 to-purple-600',
] as const;

/** Curso de una clase. */
export const cursoDe = (x?: { course?: string } | null) => x?.course || FINANZAS;

/** Curso de una entrega. */
export const cursoDeEntrega = (e?: { classCourse?: string } | null) => e?.classCourse || FINANZAS;

/** Inscripciones de un alumno. Sin lista, es el alumno de Finanzas de siempre. */
export function inscripcionesDe(u: { level?: number; inscripciones?: Inscripcion[] }): Inscripcion[] {
  if (u.inscripciones && u.inscripciones.length > 0) return u.inscripciones;
  return [{ course: FINANZAS, level: u.level ?? 0 }];
}

/** Nivel del alumno en un curso, o undefined si no lo cursa. */
export const nivelEn = (u: { level?: number; inscripciones?: Inscripcion[] }, course: string) =>
  inscripcionesDe(u).find((i) => i.course === course)?.level;

/** Color de un nivel: Finanzas usa uno por nivel; los demás cursos, el suyo. */
export const acentoDeNivel = (curso: Curso | undefined, level: number) =>
  !curso || curso.id === FINANZAS ? COURSES.find((c) => c.id === level)?.accent ?? CURSO_FINANZAS.accent : curso.accent;

/** Nombre de curso → identificador para la base ("Vida Adulta" → "vida-adulta"). */
export function idDeCurso(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * Lista completa de cursos: Finanzas primero, después los creados, por nombre.
 * Finanzas puede tener un documento propio en 'courses' con lo que el admin le
 * cambió (nombres de niveles, módulos…); se combina con sus valores de siempre.
 */
export const listaDeCursos = (creados: Curso[]): Curso[] => {
  const ajustesFinanzas = creados.find((c) => c.id === FINANZAS);
  return [
    { ...CURSO_FINANZAS, ...ajustesFinanzas, id: FINANZAS },
    ...creados.filter((c) => c.id !== FINANZAS).sort((a, b) => a.name.localeCompare(b.name, 'es')),
  ];
};

export interface NivelInfo {
  id: number;
  /** Nombre propio del nivel ('' si no tiene: se muestra "Nivel N"). */
  name: string;
  desc: string;
  accent: string;
}

/** Los 4 niveles de un curso, con sus nombres (los editados o los de siempre). */
export function nivelesDe(curso: Curso | undefined): NivelInfo[] {
  const esFinanzas = !curso || curso.id === FINANZAS;
  return [0, 1, 2, 3].map((id) => {
    const propio = curso?.niveles?.[id];
    const base = esFinanzas ? COURSES.find((c) => c.id === id) : undefined;
    return {
      id,
      name: propio?.name?.trim() || base?.name || '',
      desc: propio?.desc?.trim() || base?.desc || curso?.desc || '',
      accent: acentoDeNivel(curso, id),
    };
  });
}

/** "Nivel 2 · Inversión Básica", o "Nivel 2" si el nivel no tiene nombre propio. */
export const etiquetaNivel = (curso: Curso | undefined, level: number) => {
  const n = nivelesDe(curso)[level];
  return n?.name ? `Nivel ${level} · ${n.name}` : `Nivel ${level}`;
};

/** Nombre de un módulo. Por defecto, "Bloque Pedagógico N". */
export const nombreModulo = (curso: Curso | undefined, level: number, mod: number) =>
  curso?.modulos?.[`${level}_${mod}`]?.trim() || `Bloque Pedagógico ${mod}`;

/**
 * Qué se lleva puesto el borrado de un curso. Lo usan el cartel de
 * confirmación y el borrado real, así lo anunciado coincide con lo que se borra.
 */
export function alcanceDeCurso(
  id: string,
  datos: {
    classes: { course?: string; isSyllabus?: boolean }[];
    submissions: { classCourse?: string }[];
    usuarios: { inscripciones?: Inscripcion[] }[];
  }
) {
  const clases = datos.classes.filter((c) => cursoDe(c) === id);
  return {
    plantillas: clases.filter((c) => c.isSyllabus).length,
    publicadas: clases.filter((c) => !c.isSyllabus).length,
    entregas: datos.submissions.filter((e) => cursoDeEntrega(e) === id).length,
    alumnos: datos.usuarios.filter((u) => u.inscripciones?.some((i) => i.course === id)).length,
  };
}
