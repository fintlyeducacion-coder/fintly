/** Un alumno cursando un curso, en un nivel. */
export interface Inscripcion {
  course: string;
  level: number;
}

/** Un curso del campus. Finanzas no se guarda: es el de siempre (ver lib/cursos.ts). */
export interface Curso {
  id: string;
  name: string;
  desc: string;
  /** Degradado de Tailwind, de PALETA_CURSOS. */
  accent: string;
  createdAt?: string;
  /** Nombre y descripción de cada nivel (0 a 3). Lo que falte usa el valor por defecto. */
  niveles?: { name?: string; desc?: string }[];
  /** Nombre de cada módulo, con clave "nivel_módulo" (por ejemplo "0_2"). */
  modulos?: Record<string, string>;
}

export interface User {
  email: string;
  name: string;
  role: 'admin' | 'directivo' | 'alumno' | 'pausado';
  initials: string;
  /** Nivel en Finanzas. Se conserva para las cuentas de antes de los cursos. */
  level?: number;
  school?: string;
  /** Cursos que hace. Sin esta lista, el alumno está en Finanzas, en `level`. */
  inscripciones?: Inscripcion[];
}

export interface ClassItem {
  id?: string;
  level: number;
  module?: number;
  week: number;
  title: string;
  unlockAt?: string;
  deadline?: string;
  text: string;
  videoId?: string;
  /** Presentación vieja por link (Gamma, Slides). Las nuevas van en `presentacionId`. */
  slidesUrl?: string;
  /** Lectura interactiva (HTML) guardada en 'contenidos'. Si está, reemplaza a `text`. */
  lecturaId?: string;
  /** Presentación (HTML) guardada en 'contenidos'. */
  presentacionId?: string;
  actTitle?: string;
  actDesc?: string;
  isSyllabus?: boolean;
  school?: string;
  /** Curso. Sin este dato la clase es de Finanzas. */
  course?: string;
}

export interface Student {
  name: string;
  email?: string;
  initials: string;
  level: number;
  progress: number;
  total: number;
  status: 'ok' | 'warn';
  school: string;
  registered?: boolean;
  inscripciones?: Inscripcion[];
}

export type GradeType = 'Excelente' | 'Muy bien' | 'Bien' | 'Puede mejorar';

export interface ActivitySubmission {
  classLevel: number;
  /** Módulo 1-4. Opcional por las entregas anteriores al cambio de esquema. */
  classModule?: number;
  classWeek: number;
  /** Curso. Sin este dato la entrega es de Finanzas. */
  classCourse?: string;
  studentEmail: string;
  /**
   * Colegio del alumno al momento de entregar.
   *
   * Existe para poder aislar las entregas por institución, tanto en la consulta
   * como en las reglas de seguridad. Sin este campo, un directivo se descargaba
   * las entregas de los alumnos de TODOS los colegios.
   *
   * Opcional porque las entregas anteriores a octubre de 2026 no lo tienen;
   * se rellenan con la herramienta de mantenimiento del panel.
   */
  school?: string;
  responseText: string;
  submittedAt: string;
  /**
   * La nota. Es GradeType a secas: antes era "GradeType | string", lo que
   * dejaba pasar cualquier texto y anulaba la verificacion del tipo. Las notas
   * historicas con otra redaccion se normalizan al leerlas (normalizeGrade).
   */
  grade?: GradeType;
  feedback?: string;
  correctedBy?: string;
  correctedAt?: string;
}
