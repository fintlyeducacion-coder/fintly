/**
 * recorrido.ts
 * El camino de un alumno por su nivel: qué clases tiene, en qué orden, cuáles
 * puede abrir y cuánto avanzó. Lógica pura, sin React ni Firestore.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * La regla de desbloqueo vivía dentro del panel del alumno. La campanita y la
 * función que abre una clase no la conocían, así que una notificación dejaba
 * entrar a una clase que el panel mostraba con candado. Y el avance se
 * calculaba en tres lugares con tres criterios. Acá hay uno solo.
 */
import { ActivitySubmission, ClassItem, Student } from '../types';
import { entregaEsDeLaClase, ordenEnNivel } from '../classKeys';
import { todaviaNo, yaPaso } from './fechas';
import { FINANZAS, cursoDe, nivelEn } from './cursos';

const mismoTexto = (a?: string, b?: string) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

/** "Módulo 2, clase 3". El nombre con el que se identifica una clase en toda la app. */
export const etiquetaClase = (cl: { module?: number; week: number }) =>
  `Módulo ${cl.module ?? 1}, clase ${cl.week}`;

/** Las clases publicadas a un colegio para un nivel, en el orden en que se cursan. */
export function clasesDelCurso(
  classes: ClassItem[],
  school: string | undefined,
  level: number
): ClassItem[] {
  if (!school) return [];
  return classes
    .filter((cl) => !cl.isSyllabus && cl.level === level && mismoTexto(cl.school, school))
    .sort((a, b) => ordenEnNivel(a.module, a.week) - ordenEnNivel(b.module, b.week));
}

/**
 * - entregada:  el alumno ya la entregó. La puede abrir siempre.
 * - disponible: la puede cursar ahora.
 * - programada: todavía no llegó su fecha de apertura.
 * - bloqueada:  ya abrió, pero falta entregar la anterior.
 */
export type EstadoClase = 'entregada' | 'disponible' | 'programada' | 'bloqueada';

export interface Paso {
  clase: ClassItem;
  estado: EstadoClase;
  entrega?: ActivitySubmission;
  /** Si está bloqueada: la clase que hay que entregar para destrabarla. */
  anterior?: ClassItem;
}

/**
 * Arma el recorrido completo de un alumno.
 *
 * Reglas, en este orden:
 *  1. Si ya la entregó, queda accesible para siempre (para releer y ver la nota).
 *  2. Si todavía no llegó su fecha de apertura, está programada.
 *  3. La primera clase del nivel está disponible apenas abre.
 *  4. Las demás piden que la anterior esté entregada.
 */
export function construirRecorrido(
  classes: ClassItem[],
  entregas: ActivitySubmission[],
  alumno: { email: string; school?: string; level?: number },
  ahora: Date = new Date()
): Paso[] {
  const curso = clasesDelCurso(classes, alumno.school, alumno.level ?? 0);
  const mias = entregas.filter((e) => mismoTexto(e.studentEmail, alumno.email));

  const pasos: Paso[] = [];
  curso.forEach((clase, i) => {
    const entrega = mias.find((e) => entregaEsDeLaClase(e, clase));
    const previo = pasos[i - 1];

    let estado: EstadoClase;
    if (entrega) estado = 'entregada';
    else if (todaviaNo(clase.unlockAt, ahora)) estado = 'programada';
    else if (!previo || previo.estado === 'entregada') estado = 'disponible';
    else estado = 'bloqueada';

    pasos.push({
      clase,
      estado,
      entrega,
      anterior: estado === 'bloqueada' ? previo?.clase : undefined,
    });
  });
  return pasos;
}

/** ¿El alumno puede entrar a esta clase? */
export const sePuedeAbrir = (paso: Paso) =>
  paso.estado === 'entregada' || paso.estado === 'disponible';

export interface Resumen {
  total: number;
  entregadas: number;
  /** Clases que puede cursar ahora y todavía no entregó. */
  disponibles: number;
  /** 0 a 100. Con cero clases es 0, no una división por cero. */
  porcentaje: number;
  /** La próxima clase que le toca, o null si está al día. */
  siguiente: Paso | null;
}

export function resumir(pasos: Paso[]): Resumen {
  const total = pasos.length;
  const entregadas = pasos.filter((p) => p.estado === 'entregada').length;
  const pendientes = pasos.filter((p) => p.estado === 'disponible');
  return {
    total,
    entregadas,
    disponibles: pendientes.length,
    porcentaje: total === 0 ? 0 : Math.round((entregadas / total) * 100),
    siguiente: pendientes[0] ?? null,
  };
}

/** Pasos agrupados por módulo, para mostrarlos con su encabezado. */
export function agruparPorModulo(pasos: Paso[]): { modulo: number; pasos: Paso[] }[] {
  const grupos = new Map<number, Paso[]>();
  for (const paso of pasos) {
    const modulo = paso.clase.module ?? 1;
    const lista = grupos.get(modulo);
    if (lista) lista.push(paso);
    else grupos.set(modulo, [paso]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([modulo, lista]) => ({ modulo, pasos: lista }));
}

/**
 * Avance de cada alumno, calculado en memoria a partir de clases y entregas.
 *
 * POR QUÉ SE CALCULA Y NO SE GUARDA
 * Antes, cada navegador recalculaba el avance de TODOS los alumnos que tenía
 * cargados y lo escribía en Firestore. El navegador de un directivo sólo tiene
 * las clases de su colegio, así que para los alumnos de los otros cinco
 * calculaba "0 de 0" y lo guardaba encima del valor correcto. Después el
 * navegador del admin lo corregía, el del directivo lo volvía a pisar, y así
 * sin fin: datos que parpadeaban y escrituras gastadas en un plan que las
 * cobra por cantidad.
 *
 * El avance es un dato derivado: sale de las clases y las entregas, que ya
 * están cargadas. Calcularlo acá no escribe nada y no se puede desincronizar.
 */
export function calcularProgresos(
  students: Student[],
  classes: ClassItem[],
  entregas: ActivitySubmission[],
  ahora: Date = new Date(),
  /** Curso del que se calcula el avance. Cada curso se cuenta por separado. */
  course: string = FINANZAS
): Student[] {
  const clave = (school: string | undefined, level: number) =>
    `${(school ?? '').trim().toLowerCase()}|${level}`;

  const clasesPorCurso = new Map<string, ClassItem[]>();
  for (const cl of classes) {
    if (cl.isSyllabus || !cl.school || cursoDe(cl) !== course) continue;
    const k = clave(cl.school, cl.level);
    const lista = clasesPorCurso.get(k);
    if (lista) lista.push(cl);
    else clasesPorCurso.set(k, [cl]);
  }

  const entregasPorCorreo = new Map<string, ActivitySubmission[]>();
  for (const e of entregas) {
    const correo = (e.studentEmail ?? '').trim().toLowerCase();
    if (!correo) continue;
    const lista = entregasPorCorreo.get(correo);
    if (lista) lista.push(e);
    else entregasPorCorreo.set(correo, [e]);
  }

  return students.map((student) => {
    // Nivel del alumno en este curso. Si no lo cursa, no tiene clases que contar.
    const nivel = nivelEn(student, course);
    const curso = nivel === undefined ? [] : clasesPorCurso.get(clave(student.school, nivel)) ?? [];
    const mias = entregasPorCorreo.get((student.email ?? '').trim().toLowerCase()) ?? [];
    const entregada = (cl: ClassItem) => mias.some((e) => entregaEsDeLaClase(e, cl));

    const progress = curso.filter(entregada).length;
    // "Demorado" = debe alguna clase cuyo plazo ya venció.
    const debeVencidas = curso.some((cl) => yaPaso(cl.deadline, ahora) && !entregada(cl));

    return { ...student, progress, total: curso.length, status: debeVencidas ? 'warn' : 'ok' };
  });
}

/** Porcentaje de avance de un alumno, 0 a 100. */
export const porcentajeDe = (s: Pick<Student, 'progress' | 'total'>) =>
  s.total > 0 ? Math.round((s.progress / s.total) * 100) : 0;
