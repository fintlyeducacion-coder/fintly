/**
 * types.ts
 * Definición de tipos para la plataforma Fintly Campus
 */

export interface Course {
  id: number;
  name: string;
  desc: string;
  accent: string;
  total: number;
}

export interface User {
  email: string;
  name: string;
  role: 'admin' | 'directivo' | 'alumno' | 'pausado';
  initials: string;
  level?: number;
  school?: string;
  password?: string;
}

export interface ClassItem {
  id?: string; // identificador único opcional para React keys
  level: number;
  week: number;
  title: string;
  unlockAt: string; // formato ISO
  deadline: string; // formato ISO
  text: string;     // HTML o texto plano
  videoId?: string;
  slidesUrl?: string;
  actTitle: string;
  actDesc: string;
  isSyllabus?: boolean;
  school?: string;
}

export interface Student {
  name: string;
  initials: string;
  level: number;
  progress: number;
  total: number;
  status: 'ok' | 'warn';
  email?: string;
  school?: string;
  registered?: boolean;
}

export interface ActivitySubmission {
  classLevel: number;
  classWeek: number;
  studentEmail: string;
  responseText: string;
  submittedAt: string;
  grade?: 'Muy bien' | 'Bien' | 'A mejorar' | 'Excelente' | 'Muy bueno' | 'puede mejorar';
  feedback?: string;
  correctedBy?: string;
  correctedAt?: string;
}
