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
  responseText: string;
  submittedAt: string;
  grade?: GradeType | string;
  feedback?: string;
  correctedBy?: string;
  correctedAt?: string;
}
