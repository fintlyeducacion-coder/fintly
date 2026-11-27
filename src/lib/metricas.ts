/**
 * metricas.ts
 * Números del panel de administración. Lógica pura.
 *
 * Estaban calculados dentro del componente, en cada render: por cada alumno,
 * por cada clase vencida, una búsqueda lineal en todas las entregas. Con cien
 * alumnos eso son cientos de miles de comparaciones por cada tecla que se
 * escribía en el buscador de la pantalla.
 */
import { ActivitySubmission, ClassItem, Student } from '../types';
import { entregaEsDeLaClase } from '../classKeys';
import { yaPaso } from './fechas';
import { calcularProgresos, porcentajeDe } from './recorrido';
import { cursoDe, cursoDeEntrega, nivelEn } from './cursos';

export interface MetricasColegio {
  nombre: string;
  alumnos: number;
  /** null cuando el colegio no tiene alumnos: no hay promedio que mostrar. */
  progresoPromedio: number | null;
  alDia: number;
  demorados: number;
}

export interface Metricas {
  alumnos: number;
  /** Colegios con al menos un alumno. Cero es cero: no se rellena con el total de convenios. */
  colegiosConAlumnos: number;
  progresoPromedio: number | null;
  /** Entregas que ya deberían existir: clases con plazo vencido × alumnos que las tienen. */
  esperadas: number;
  entregadas: number;
  aTiempo: number;
  /** null cuando todavía no venció ningún plazo: mostrar "100%" ahí sería inventar un dato. */
  pctEntregadas: number | null;
  pctATiempo: number | null;
  porColegio: MetricasColegio[];
}

const minus = (s?: string) => (s ?? '').trim().toLowerCase();

/** `students` tiene que venir con el avance ya calculado (ver calcularProgresos). */
export function calcularMetricas(
  students: Student[],
  classes: ClassItem[],
  entregas: ActivitySubmission[],
  colegios: string[],
  ahora: Date = new Date()
): Metricas {
  const vencidasPorCurso = new Map<string, ClassItem[]>();
  for (const cl of classes) {
    if (cl.isSyllabus || !cl.school || !yaPaso(cl.deadline, ahora)) continue;
    const k = `${minus(cl.school)}|${cl.level}`;
    const lista = vencidasPorCurso.get(k);
    if (lista) lista.push(cl);
    else vencidasPorCurso.set(k, [cl]);
  }

  const entregasPorCorreo = new Map<string, ActivitySubmission[]>();
  for (const e of entregas) {
    const correo = minus(e.studentEmail);
    const lista = entregasPorCorreo.get(correo);
    if (lista) lista.push(e);
    else entregasPorCorreo.set(correo, [e]);
  }

  let esperadas = 0;
  let entregadas = 0;
  let aTiempo = 0;

  for (const student of students) {
    const vencidas = vencidasPorCurso.get(`${minus(student.school)}|${student.level}`) ?? [];
    const mias = entregasPorCorreo.get(minus(student.email)) ?? [];
    esperadas += vencidas.length;

    for (const cl of vencidas) {
      const entrega = mias.find((e) => entregaEsDeLaClase(e, cl));
      if (!entrega) continue;
      entregadas++;
      if (cl.deadline && new Date(entrega.submittedAt) <= new Date(cl.deadline)) aTiempo++;
    }
  }

  const promedio = (lista: Student[]) =>
    lista.length === 0
      ? null
      : Math.round(lista.reduce((acc, s) => acc + porcentajeDe(s), 0) / lista.length);

  const porColegio = colegios.map((nombre) => {
    const suyos = students.filter((s) => minus(s.school) === minus(nombre));
    return {
      nombre,
      alumnos: suyos.length,
      progresoPromedio: promedio(suyos),
      alDia: suyos.filter((s) => s.status === 'ok').length,
      demorados: suyos.filter((s) => s.status === 'warn').length,
    };
  });

  return {
    alumnos: students.length,
    colegiosConAlumnos: new Set(students.map((s) => minus(s.school)).filter(Boolean)).size,
    progresoPromedio: promedio(students),
    esperadas,
    entregadas,
    aTiempo,
    pctEntregadas: esperadas === 0 ? null : Math.round((entregadas / esperadas) * 100),
    pctATiempo: esperadas === 0 ? null : Math.round((aTiempo / esperadas) * 100),
    porColegio,
  };
}

/**
 * Métricas de un solo curso: sus clases, sus entregas y los alumnos inscriptos
 * en él, cada uno con su nivel en ese curso. Así un alumno de Finanzas nivel 2
 * que hace Vida Adulta nivel 0 cuenta en cada curso con el nivel que corresponde.
 */
export function metricasDeCurso(
  course: string,
  students: Student[],
  classes: ClassItem[],
  entregas: ActivitySubmission[],
  colegios: string[],
  ahora: Date = new Date()
): Metricas {
  const clases = classes.filter((cl) => cursoDe(cl) === course);
  const suyas = entregas.filter((e) => cursoDeEntrega(e) === course);
  const alumnos = calcularProgresos(students, clases, suyas, ahora, course)
    .filter((s) => nivelEn(s, course) !== undefined)
    .map((s) => ({ ...s, level: nivelEn(s, course) as number }));
  return calcularMetricas(alumnos, clases, suyas, colegios, ahora);
}
