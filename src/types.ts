export interface User {
  email: string;
  name: string;
  role: 'admin' | 'directivo' | 'alumno' | 'pausado';
  initials: string;
  level?: number;
  school?: string;
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
  slidesUrl?: string;
  actTitle?: string;
  actDesc?: string;
  isSyllabus?: boolean;
  school?: string;
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
}

export type GradeType = 'Excelente' | 'Muy bien' | 'Bien' | 'Puede mejorar';

export interface ActivitySubmission {
  classLevel: number;
  /** Módulo 1-4. Opcional por las entregas anteriores al cambio de esquema. */
  classModule?: number;
  classWeek: number;
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
