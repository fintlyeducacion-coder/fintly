import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, BookOpen, Trash2, Users, AlertTriangle, School, ChevronRight, ArrowLeft, CheckCircle2, Clock, FileText, Loader2,
  Mail, ExternalLink, Sparkles, Search, Bell, Calendar, ChevronDown, Check, UserPlus, TrendingUp
} from 'lucide-react';
import { ClassItem, Student, ActivitySubmission } from '../types';
import ClassModal from './ClassModal';
import { COURSES } from '../data';
import { auth } from '../firebase';
import { User } from '../types';

interface AdminPanelProps {
  classes: ClassItem[];
  students: Student[];
  submissions: ActivitySubmission[];
  allUsers?: User[];
  onSaveClass: (cl: ClassItem, oldKey?: { level: number; week: number }) => void;
  onDeleteClass: (level: number, week: number, school?: string, id?: string) => void;
  onAssignClass: (sourceClass: ClassItem, schools: string[], unlockAt: string, deadline: string) => void;
  onSaveStudent?: (st: Student) => void | Promise<void>;
  onDeleteStudent?: (email: string) => void;
  onApproveUser?: (email: string, targetRole: 'alumno' | 'directivo' | 'admin', level?: number, school?: string) => void | Promise<void>;
  onDeleteUser?: (email: string) => void | Promise<void>;
}

export default function AdminPanel({
  classes,
  students,
  submissions,
  allUsers = [],
  onSaveClass,
  onDeleteClass,
  onAssignClass,
  onSaveStudent,
  onDeleteStudent,
  onApproveUser,
  onDeleteUser
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'colegios' | 'rendimiento' | 'clases' | 'usuarios'>('colegios');
  const [activeSchool, setActiveSchool] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [expandedStudentEmail, setExpandedStudentEmail] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [performanceStatusFilter, setPerformanceStatusFilter] = useState<'all' | 'warn' | 'ok'>('all');
  const [bellNotification, setBellNotification] = useState<{ studentName: string; email: string } | null>(null);
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  
  // Clear search query dynamically when shifting views
  useEffect(() => {
    setStudentSearchQuery('');
  }, [activeSchool, activeLevel]);

  // Syllabus & Upload Class State
  const [selectedSyllabusLevel, setSelectedSyllabusLevel] = useState<number>(0);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [classToAssign, setClassToAssign] = useState<ClassItem | null>(null);
  const [assignSelectedSchools, setAssignSelectedSchools] = useState<string[]>([]);
  const [assignUnlockAt, setAssignUnlockAt] = useState<string>('');
  const [assignDeadline, setAssignDeadline] = useState<string>('');

  // Class Editor modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  // Delete Confirmation custom popup/dialog
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    level: number;
    week: number;
    school?: string;
    id?: string;
    title: string;
    isSyllabus?: boolean;
  } | null>(null);

  // Student modal states
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentFormName, setStudentFormName] = useState('');
  const [studentFormEmail, setStudentFormEmail] = useState('');
  const [studentFormSchool, setStudentFormSchool] = useState('');
  const [studentFormLevel, setStudentFormLevel] = useState<number>(0);
  const [studentModalError, setStudentModalError] = useState('');
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  // Invitation success screen support (to let admin copy invite link)
  const [showInviteSuccess, setShowInviteSuccess] = useState(false);
  const [lastInvitedEmail, setLastInvitedEmail] = useState('');
  const [lastInvitedName, setLastInvitedName] = useState('');
  const [lastInvitedSchool, setLastInvitedSchool] = useState('');
  const [lastInvitedLevel, setLastInvitedLevel] = useState<number>(0);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [copiedRich, setCopiedRich] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const ASSOCIATED_SCHOOLS = [
    'Colegio del Faro, Sede Benavidez y Puertos',
    'Northfield Sede Puertos',
    'Northfield Sede Nordelta',
    'South Greek School',
    'Global School'
  ];

  // Filtramos por Syllabus para los indicadores generales del Admin
  const totalClassesCount = classes.filter(cl => cl.isSyllabus).length || 1;
  const totalStudentsCount = students.length;
  const totalCompletedSubmissions = submissions.length;
  const submissionRatePct = totalStudentsCount > 0 
    ? Math.round((totalCompletedSubmissions / (totalStudentsCount * totalClassesCount || 1)) * 100)
    : 0;

  const handleEditClick = (cl: ClassItem) => {
    setEditingClass(cl);
    setModalOpen(true);
  };

  const handleCreateClick = () => {
    setEditingClass(null);
    setModalOpen(true);
  };

  const handleCreatePreConfiguredClick = (level: number) => {
    const isSyllabus = activeTab === 'clases';
    const currentLevelClasses = classes.filter(cl => 
      cl.level === level && 
      (isSyllabus ? cl.isSyllabus : (!cl.isSyllabus && cl.school?.toLowerCase() === activeSchool?.toLowerCase()))
    );
    const nextWeek = currentLevelClasses.length > 0 
      ? Math.max(...currentLevelClasses.map(cl => cl.week)) + 1 
      : 1;

    setEditingClass({
      level: level,
      week: nextWeek,
      title: '',
      unlockAt: new Date().toISOString().substring(0, 16),
      deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().substring(0, 16),
      text: '',
      videoId: '',
      slidesUrl: '',
      actTitle: '',
      actDesc: '',
      isSyllabus: activeTab === 'clases' ? true : false,
      school: activeTab === 'clases' ? undefined : (activeSchool || undefined)
    });
    setModalOpen(true);
  };

  const handleSave = (classItem: ClassItem) => {
    const isSyllabusEditor = activeTab === 'clases';
    
    // Asignar el alcance correspondiente (Syllabus unificado o específico del Colegio actual)
    const scopedItem: ClassItem = {
      ...classItem,
      isSyllabus: isSyllabusEditor ? true : false,
      school: isSyllabusEditor ? undefined : (activeSchool || undefined)
    };

    if (editingClass && editingClass.title) {
      onSaveClass(scopedItem, { level: editingClass.level, week: editingClass.week });
    } else {
      onSaveClass(scopedItem);
    }
    setModalOpen(false);
    setEditingClass(null);
  };

  const getResourcesString = (cl: ClassItem) => {
    const list = [];
    if (cl.videoId) list.push('Video');
    if (cl.slidesUrl) list.push('Slides');
    if (cl.actTitle) list.push('Actividad');
    return list.join(', ') || '—';
  };

  const getSchoolStats = (schoolName: string) => {
    const schoolStudents = students.filter(s => s.school?.toLowerCase() === schoolName.toLowerCase());
    const studentEmails = schoolStudents.map(s => s.email?.toLowerCase()).filter(Boolean) as string[];
    const schoolSubmissions = submissions.filter(sub => studentEmails.includes(sub.studentEmail?.toLowerCase()));
    const schoolLevels = Array.from(new Set(schoolStudents.map(s => s.level))).sort((a, b) => a - b);
    
    let totalTargetActivities = 0;
    schoolStudents.forEach(st => {
      // Consideramos únicamente las clases destinadas y subidas a este colegio específico
      const classCount = classes.filter(cl => cl.level === st.level && cl.school?.toLowerCase() === schoolName.toLowerCase() && !cl.isSyllabus).length;
      totalTargetActivities += classCount;
    });

    const completionRate = totalTargetActivities > 0 
      ? Math.round((schoolSubmissions.length / totalTargetActivities) * 100)
      : 0;

    return {
      studentCount: schoolStudents.length,
      levels: schoolLevels,
      submissionsCount: schoolSubmissions.length,
      completionRate,
      students: schoolStudents
    };
  };

  const handleCreateStudentClick = () => {
    setEditingStudent(null);
    setStudentFormName('');
    setStudentFormEmail('');
    setStudentFormSchool(activeSchool || ASSOCIATED_SCHOOLS[0]);
    setStudentFormLevel(activeLevel !== null ? activeLevel : 0);
    setStudentModalOpen(true);
    setShowInviteSuccess(false);
    setCopiedFeedback(false);
    setStudentModalError('');
    setIsSavingStudent(false);
  };

  const handleEditStudentClick = (student: Student) => {
    setEditingStudent(student);
    setStudentFormName(student.name);
    setStudentFormEmail(student.email || '');
    setStudentFormSchool(student.school || ASSOCIATED_SCHOOLS[0]);
    setStudentFormLevel(student.level ?? 0);
    setStudentModalOpen(true);
    setShowInviteSuccess(false);
    setCopiedFeedback(false);
    setStudentModalError('');
    setIsSavingStudent(false);
  };

  const handleSaveStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFormName.trim() || !studentFormEmail.trim()) {
      setStudentModalError('Por favor completa el nombre y el correo electrónico.');
      return;
    }

    const emailClean = studentFormEmail.trim().toLowerCase();
    
    // Generar iniciales
    const parts = studentFormName.trim().split(' ');
    const initials = (parts[0] ? parts[0][0] : 'U') + (parts[1] ? parts[1][0] : '');

    const savedStudent: Student = {
      name: studentFormName.trim(),
      email: emailClean,
      initials: initials.toUpperCase(),
      level: Number(studentFormLevel),
      school: studentFormSchool,
      progress: editingStudent ? editingStudent.progress : 0,
      total: editingStudent ? editingStudent.total : 16,
      status: editingStudent ? editingStudent.status : 'ok'
    };

    setIsSavingStudent(true);
    setStudentModalError('');

    try {
      if (onSaveStudent) {
        await onSaveStudent(savedStudent);
      }

      if (editingStudent) {
        // Si estamos editando un alumno existente, cerramos el modal
        setStudentModalOpen(false);
        setEditingStudent(null);
      } else {
        // Si es una NUEVA INVITACIÓN, mostramos la pantalla de éxito con el enlace copiable
        setLastInvitedEmail(emailClean);
        setLastInvitedName(studentFormName.trim());
        setLastInvitedSchool(studentFormSchool);
        setLastInvitedLevel(Number(studentFormLevel));
        setShowInviteSuccess(true);
        setCopiedFeedback(false);
      }
    } catch (err: any) {
      console.error("Error saving student to Firestore:", err);
      let errorMsg = "Ocurrió un error inesperado al guardar la matrícula.";
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error && (parsed.error.includes("Missing or insufficient permissions") || parsed.error.includes("permission-denied"))) {
            errorMsg = "Permisos Insuficientes de Firestore. Por favor, asegúrate de haber iniciado sesión con una cuenta autorizada de docente o administrador.";
          } else {
            errorMsg = parsed.error || errorMsg;
          }
        } catch {
          if (err.message.includes("permission-denied") || err.message.includes("permissions")) {
            errorMsg = "Acceso denegado: No tienes permisos para hacer cambios en Firestore. Asegúrate de estar conectado con una cuenta autorizada.";
          } else {
            errorMsg = err.message;
          }
        }
      }
      setStudentModalError(errorMsg);
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleCopyRichEmail = async () => {
    const registerLink = `${window.location.origin}/?register&email=${encodeURIComponent(lastInvitedEmail)}`;
    
    // Generamos el template HTML enriquecido súper profesional
    const htmlContent = `
      <div style="background-color: #050510; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; width: 100%; box-sizing: border-box; margin: 0;">
        <div style="max-width: 530px; margin: 0 auto; background-color: #0f0f24; border: 1px solid #221c4e; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Top Vivid Banner -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 36px 24px; text-align: center; border-bottom: 1px solid #221c4e;">
            <div style="background-color: rgba(255, 255, 255, 0.12); display: inline-block; padding: 8px 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.18);">
              <span style="color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; font-family: sans-serif;">Fintly</span>
            </div>
            <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.3;">¡Hola, ${lastInvitedName}!</h2>
            <p style="color: #c7d2fe; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">Te damos la bienvenida al Campus Virtual de Fintly</p>
          </div>

          <!-- Main Content Body -->
          <div style="padding: 32px 24px; color: #d1d5db; line-height: 1.6; font-size: 14px; background-color: #0f0f24;">
            <p style="margin-top: 0; color: #9ca3af;">Tu institución educativa te asignó acceso directo para formar parte de la plataforma de educación financiera interactiva.</p>
            
            <div style="background-color: #060614; border: 1px solid #1e1b4b; border-radius: 18px; padding: 20px; margin: 24px 0;">
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #818cf8; letter-spacing: 0.12em; display: block; margin-bottom: 12px; font-family: monospace;">Credenciales Académicas</span>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #e5e7eb;">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; width: 35%; font-weight: 600; text-transform: uppercase; font-size: 10px; data-label='Colegio';">Colegio:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #ffffff;">${lastInvitedSchool || 'Institución Asignada'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 10px; data-label='Nivel';">Curso/Nivel:</td>
                  <td style="padding: 6px 0; font-weight: 700; color: #818cf8;">Nivel ${lastInvitedLevel + 1}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 10px; data-label='Usuario';">Usuario/Email:</td>
                  <td style="padding: 6px 0; font-family: monospace; color: #a5b4fc; font-weight: bold;">${lastInvitedEmail}</td>
                </tr>
              </table>
            </div>

            <p style="color: #9ca3af;">Presioná el botón de abajo para activar tu cuenta escolar, configurar tu clave de acceso e ingresar al simulador interactivo:</p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0 28px 0;">
              <a href="${registerLink}" style="background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%); color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 13px; border: 1px solid #4f46e5; text-transform: uppercase; letter-spacing: 0.08em;">
                Comenzar Aprendizaje
              </a>
            </div>

            <!-- Copy-Paste helper -->
            <div style="border-top: 1px solid #1e1b4b; margin-top: 32px; padding-top: 20px;">
              <p style="color: #6b7280; font-size: 11px; margin-bottom: 8px; line-height: 1.4;">Si tenés problemas con el botón, podés copiar y pegar este enlace en tu navegador:</p>
              <p style="font-family: monospace; background-color: #060614; padding: 12px; border-radius: 10px; font-size: 11px; word-break: break-all; color: #6366f1; border: 1px solid #1e1b4b; margin: 0;">
                ${registerLink}
              </p>
            </div>
          </div>

          <!-- Professional Footer -->
          <div style="background-color: #060614; padding: 24px; text-align: center; border-top: 1px solid #1e1b4b;">
            <p style="color: #4b5563; font-size: 10px; margin: 0 0 6px 0; line-height: 1.5;">Este correo es de uso estrictamente educativo y automático para alumnos verificas de la red Fintly.</p>
            <p style="color: #6b7280; font-size: 10px; margin: 0; font-weight: 500;">&copy; 2026 Fintly Campus Virtual. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    `;

    const plainText = `¡Hola, ${lastInvitedName}!\n\nTe damos la bienvenida oficial a Fintly, la plataforma de educación financiera interactiva para colegios.\n\nHas sido invitado/a por "${lastInvitedSchool || 'tu colegio'}" para formar parte del Nivel ${lastInvitedLevel + 1}.\n\nPara activar tu cuenta y configurar tu clave de acceso, ingresá en el siguiente enlace:\n${registerLink}\n\n¡Te deseamos el mayor de los éxitos!\n\nEquipo Fintly`;

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const data = [new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        })];
        await navigator.clipboard.write(data);
        setCopiedRich(true);
        setTimeout(() => setCopiedRich(false), 3000);
      } else {
        await navigator.clipboard.writeText(plainText);
        setCopiedRich(true);
        setTimeout(() => setCopiedRich(false), 3000);
      }
    } catch (err) {
      console.warn("Restricciones del navegador al copiar rich-text, usando texto plano alternativo", err);
      try {
        await navigator.clipboard.writeText(plainText);
        setCopiedRich(true);
        setTimeout(() => setCopiedRich(false), 3000);
      } catch (fallbackErr) {
        console.error("Error definitivo de portapapeles:", fallbackErr);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">

      {/* Structural Minimalist Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-violet-950/20 light:border-neutral-200 pb-6 mb-8 gap-4">
        <div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-white light:text-neutral-900">
            Campus Admin
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Gestión institucional y monitoreo de trayectorias académicas
          </p>
        </div>

        {/* Seamless Navigation Tab */}
        <div className="flex bg-[#14132b]/40 light:bg-neutral-100/80 backdrop-blur-xl p-1 rounded-2xl border border-white/5 light:border-neutral-200 self-start gap-1 relative z-10 shadow-lg overflow-x-auto no-scrollbar scroll-smooth">
          <button
            onClick={() => {
              setActiveTab('colegios');
              setActiveSchool(null);
              setActiveLevel(null);
            }}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 cursor-pointer ${
              activeTab === 'colegios'
                ? 'text-white'
                : 'text-gray-400 light:text-neutral-500 hover:text-gray-200 light:hover:text-neutral-850'
            }`}
          >
            {activeTab === 'colegios' && (
              <motion.div
                layoutId="activeAdminTabPill"
                className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-950/40 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <School className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Colegios</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('rendimiento');
            }}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 cursor-pointer ${
              activeTab === 'rendimiento'
                ? 'text-white'
                : 'text-gray-400 light:text-neutral-500 hover:text-gray-200 light:hover:text-neutral-850'
            }`}
          >
            {activeTab === 'rendimiento' && (
              <motion.div
                layoutId="activeAdminTabPill"
                className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-950/40 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <TrendingUp className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Rendimiento Estudiantil</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('clases');
            }}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 cursor-pointer ${
              activeTab === 'clases'
                ? 'text-white'
                : 'text-gray-400 light:text-neutral-500 hover:text-gray-200 light:hover:text-neutral-855'
            }`}
          >
            {activeTab === 'clases' && (
              <motion.div
                layoutId="activeAdminTabPill"
                className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-950/40 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <BookOpen className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Syllabus Académico</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('usuarios');
            }}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 cursor-pointer ${
              activeTab === 'usuarios'
                ? 'text-white'
                : 'text-gray-400 light:text-neutral-500 hover:text-gray-200 light:hover:text-neutral-850'
            }`}
          >
            {activeTab === 'usuarios' && (
              <motion.div
                layoutId="activeAdminTabPill"
                className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-950/40 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Users className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <span>Usuarios</span>
              {allUsers.filter(u => u.role === 'pausado').length > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse relative z-10" title="Solicitudes pendientes" />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'colegios' ? (
          <motion.div
            key="schools-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* 1. SEAMLESS SCHOOLS VERTICAL WORKSPACE WITH DIRECT LEVEL ACTIONS AND NEXT CLASS PREVIEW */}
            {activeSchool === null && (
              <div className="space-y-6">
                {/* Metrics ribbon for administrators */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-neutral-900/20 light:bg-neutral-50/50 p-4 border border-white/5 light:border-neutral-200/60 rounded-2xl">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono font-bold">Colegios</span>
                    <p className="text-xl font-bold text-white light:text-neutral-900 font-mono">{ASSOCIATED_SCHOOLS.length}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 light:text-neutral-500 uppercase tracking-wider font-mono font-bold">Alumnos Activos</span>
                    <p className="text-xl font-bold text-violet-400 light:text-violet-600 font-mono">{totalStudentsCount}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 light:text-neutral-500 uppercase tracking-wider font-mono font-bold">Respuesta Media</span>
                    <p className="text-xl font-bold text-emerald-400 light:text-emerald-600 font-mono">{submissionRatePct}%</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 light:text-neutral-500 uppercase tracking-wider font-mono font-bold">Clases Publicadas</span>
                    <p className="text-xl font-bold text-indigo-400 light:text-indigo-600 font-mono">
                      {classes.filter(cl => !cl.isSyllabus).length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest font-mono">Panel Académico</span>
                    <h3 className="text-base font-bold text-white light:text-neutral-800 tracking-tight">Monitoreo de Colegios e Habilitaciones Semanales</h3>
                  </div>
                  <button
                    onClick={handleCreateStudentClick}
                    className="liquid-glass-btn inline-flex items-center gap-2 px-4.5 py-2 text-xs"
                  >
                    <UserPlus className="w-4 h-4 shrink-0" />
                    <span>Invitar Alumno</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {ASSOCIATED_SCHOOLS.map((school) => {
                    const stats = getSchoolStats(school);
                    const isExpanded = expandedSchool === school;

                    return (
                      <div
                        key={school}
                        className="liquid-glass rounded-2xl overflow-hidden transition-all"
                      >
                        {/* School Header / Toggle Row */}
                        <div
                          onClick={() => {
                            setExpandedSchool(isExpanded ? null : school);
                          }}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 cursor-pointer hover:bg-neutral-900/10 light:hover:bg-neutral-50/40 transition-colors select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-950/40 border border-violet-500/10 light:bg-violet-50 light:border-violet-100 flex items-center justify-center text-violet-400 light:text-violet-700 shrink-0">
                              <School className="w-5 h-5" />
                            </div>
                            <div>
                              <h2 className="font-bold text-white light:text-neutral-900 tracking-tight text-base">
                                {school}
                              </h2>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 font-medium">
                                <span className="font-mono">{stats.studentCount} alumnos registrados</span>
                                <span>•</span>
                                <span className="text-violet-400 light:text-violet-600 font-mono font-bold">{stats.completionRate}% de avance general</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 self-start sm:self-auto">
                            {/* Ver Alumnos direct button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSchool(isExpanded ? null : school);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold select-none cursor-pointer transition-all inline-flex items-center gap-1.5 shadow-sm border ${
                                isExpanded
                                  ? 'bg-violet-600 text-white border-violet-600'
                                  : 'bg-neutral-900/60 hover:bg-neutral-850 text-gray-300 border-white/5 hover:text-white light:bg-neutral-100 light:text-neutral-700 light:border-neutral-200 light:hover:bg-neutral-200/80 light:hover:text-black'
                              }`}
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>Alumnos</span>
                            </button>

                            {/* Divider line style */}
                            <div className="h-4 w-[1px] bg-white/10 light:bg-neutral-200 mx-0.5 hidden sm:block" />

                            {isExpanded ? (
                              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-violet-400 light:text-violet-600 bg-violet-500/10 px-2.5 py-1 rounded-md">
                                Ocultar Niveles
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-gray-400 light:text-neutral-600 bg-neutral-900/30 light:bg-neutral-100 px-2.5 py-1 rounded-md">
                                Expandir
                              </span>
                            )}
                            <ChevronDown
                              className={`w-4 h-4 text-gray-400 light:text-neutral-600 transition-transform duration-300 ${
                                isExpanded ? 'rotate-180 text-violet-400 light:text-violet-600' : ''
                              }`}
                            />
                          </div>
                        </div>

                        {/* Expandable Section with details */}
                        {isExpanded && (
                          <div className="border-t border-white/5 light:border-neutral-100 p-6 pt-5 bg-neutral-950/20 light:bg-neutral-50/20 animate-fade-in space-y-4">
                            {/* Table header with clean title */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 light:border-neutral-100 pb-3.5 mb-4 gap-3">
                              <div className="text-[10.5px] uppercase font-mono font-bold text-violet-400 light:text-violet-600 tracking-widest">
                                Monitoreo de Niveles
                              </div>
                              <div className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest sm:text-right">
                                Syllabus y Habilitaciones
                              </div>
                            </div>

                            {/* MAIN LEVELS TABLE (Original view) */}
                              <div className="overflow-hidden overflow-x-auto shadow-inner rounded-xl">
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                  <thead>
                                    <tr className="border-b border-white/[0.03] light:border-neutral-150 bg-neutral-950/20 text-gray-500 text-[9px] tracking-wider font-bold uppercase font-mono">
                                      <th className="px-3 py-2">Nivel</th>
                                      <th className="px-3 py-2">Alumnos</th>
                                      <th className="px-3 py-2">Clases Subidas</th>
                                      <th className="px-3 py-2">Próxima Clase Programada</th>
                                      <th className="px-3 py-2 text-right">Acciones Directas</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[0, 1, 2, 3].map((lvl) => {
                                      const levelStudents = stats.students.filter((st) => st.level === lvl);
                                      const course = COURSES.find((c) => c.id === lvl) || { name: `Nivel ${lvl}` };
                                      
                                      // Calculamos clases asignadas de este nivel a este colegio
                                      const assignedClasses = classes.filter(
                                        cl => cl.level === lvl && cl.school?.toLowerCase() === school.toLowerCase() && !cl.isSyllabus
                                      );
                                      const maxWeekPub = assignedClasses.length > 0 
                                        ? Math.max(...assignedClasses.map(cl => cl.week)) 
                                        : 0;

                                      // Buscamos en el syllabus master la proxima clase modelo 
                                      const nextWeekNum = maxWeekPub + 1;
                                      const nextSyllabusClass = classes.find(
                                        cl => cl.isSyllabus && cl.level === lvl && cl.week === nextWeekNum
                                      );

                                      return (
                                        <tr 
                                          key={lvl} 
                                          className="border-b border-white/[0.02] light:border-neutral-100 text-xs text-gray-300 light:text-neutral-700 hover:bg-white/[0.01] light:hover:bg-neutral-50/50 transition-colors"
                                        >
                                          {/* Nivel info */}
                                          <td className="px-3 py-3 font-sans">
                                            <span className="font-bold text-violet-400 light:text-violet-600 font-mono mr-1.5">[Nivel {lvl}]</span>
                                            <span className="text-white light:text-neutral-800 font-medium">{course.name}</span>
                                          </td>

                                          {/* Cantidad Alumnos */}
                                          <td className="px-3 py-3">
                                            {levelStudents.length > 0 ? (
                                              <span className="px-2 py-0.5 rounded-full bg-violet-950/40 border border-violet-500/20 text-violet-400 light:bg-violet-50 light:text-violet-600 text-[10px] font-semibold font-mono">
                                                {levelStudents.length} alumn{levelStudents.length === 1 ? 'o' : 'os'}
                                              </span>
                                            ) : (
                                              <span className="text-gray-600 light:text-neutral-400 italic text-[10.5px]">Ninguno</span>
                                            )}
                                          </td>

                                          {/* Clases subidas */}
                                          <td className="px-3 py-3 font-mono text-[11px] text-gray-400 light:text-neutral-600">
                                            {assignedClasses.length > 0 ? (
                                              <div className="flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                <span>Semana {maxWeekPub} activa</span>
                                              </div>
                                            ) : (
                                              <span className="text-gray-500 italic">Ninguna clase activa</span>
                                            )}
                                          </td>

                                          {/* Visual unlocking assistant (próxima clase) */}
                                          <td className="px-3 py-3">
                                            {nextSyllabusClass ? (
                                              <div className="space-y-0.5">
                                                <div className="text-white light:text-neutral-800 font-medium line-clamp-1">
                                                  Semana {nextWeekNum}: {nextSyllabusClass.title}
                                                </div>
                                                <span className="text-[9.5px] uppercase font-bold text-amber-500 font-mono tracking-wider flex items-center gap-1">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                  Falta Programar
                                                </span>
                                              </div>
                                            ) : (
                                              <span className="text-emerald-500 font-semibold flex items-center gap-1 font-sans text-[11px]">
                                                ✓ Al día con el Syllabus
                                              </span>
                                            )}
                                          </td>

                                          {/* Direct Action Buttons */}
                                          <td className="px-3 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              {/* Monitor grades and students */}
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveSchool(school);
                                                  setActiveLevel(lvl);
                                                }}
                                                className="px-2.5 py-1.5 bg-neutral-900 border border-white/5 hover:bg-neutral-800 text-gray-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer light:bg-neutral-100 light:text-neutral-700 light:border-neutral-200 light:hover:bg-neutral-200 inline-flex items-center gap-1"
                                              >
                                                <span>Monitorear</span>
                                                <ChevronRight className="w-3 h-3 text-gray-500" />
                                              </button>

                                              {/* Quick release content model */}
                                              {nextSyllabusClass && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setClassToAssign(nextSyllabusClass);
                                                    setAssignSelectedSchools([school]);
                                                    setAssignUnlockAt(new Date().toISOString().substring(0, 16));
                                                    setAssignDeadline(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().substring(0, 16));
                                                    setAssignModalOpen(true);
                                                  }}
                                                  className="liquid-glass-btn px-4 py-2 text-[11px] inline-flex items-center gap-1.5"
                                                  title="Planificar y subir la siguiente clase del Syllabus"
                                                >
                                                  <Plus className="w-3.5 h-3.5" />
                                                  <span>Subir Semana {nextWeekNum}</span>
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 2. SCHOOL DETAIL (LEVELS LIST) */}
            {activeSchool !== null && activeLevel === null && (
              <div className="space-y-6">
                <button
                  onClick={() => setActiveSchool(null)}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 light:text-neutral-500 hover:text-white light:hover:text-neutral-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Colegios</span>
                </button>

                <div className="pb-2">
                  <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Detalle Institucional</span>
                  <h2 className="text-xl font-medium text-white light:text-neutral-950 tracking-tight mt-0.5">{activeSchool}</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[0, 1, 2, 3].map((lvl) => {
                    const levelStudents = getSchoolStats(activeSchool).students.filter((st) => st.level === lvl);
                    const course = COURSES.find((c) => c.id === lvl) || { name: `Nivel ${lvl}` };

                    return (
                      <div
                        key={lvl}
                        onClick={() => setActiveLevel(lvl)}
                        className="liquid-glass-interactive rounded-2xl p-5 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between shadow-lg"
                      >
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-semibold text-violet-400 light:text-violet-600 uppercase tracking-widest block font-mono">
                            NIVEL {lvl}
                          </span>
                          <h3 className="font-semibold text-white light:text-neutral-800 tracking-tight text-sm sm:text-base group-hover:text-violet-300 light:group-hover:text-violet-600 transition-colors">
                            {course.name}
                          </h3>
                        </div>

                        <div className="mt-5 pt-3.5 border-t border-white/5 light:border-neutral-200 flex items-center justify-between text-xs">
                          <span className="text-gray-400 light:text-neutral-500 font-medium font-mono">
                            {levelStudents.length} alumn{levelStudents.length === 1 ? 'o' : 'os'}
                          </span>
                          <div className="flex items-center gap-1 text-violet-400 light:text-violet-600 font-medium group-hover:text-white light:group-hover:text-violet-700 transition-colors">
                            <span>Ingresar</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. STUDENTS & SUBMISSIONS LIST */}
            {activeSchool !== null && activeLevel !== null && (
              <div className="space-y-6">
                {/* Micro breadcrumb navigation */}
                <div className="flex items-center gap-2 text-xs text-gray-400 light:text-neutral-500">
                  <button onClick={() => { setActiveSchool(null); setActiveLevel(null); }} className="hover:text-white light:hover:text-neutral-800 cursor-pointer">Colegios</button>
                  <span className="text-neutral-700">/</span>
                  <button onClick={() => setActiveLevel(null)} className="hover:text-white light:hover:text-neutral-800 cursor-pointer">{activeSchool}</button>
                  <span className="text-neutral-700">/</span>
                  <span className="text-white light:text-neutral-800 font-medium font-mono">Nivel {activeLevel}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5 light:border-neutral-200">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Lista de Alumnos</span>
                    <h2 className="text-lg font-medium text-white light:text-neutral-900 tracking-tight mt-0.5 font-sans">
                      Nivel {activeLevel} • {activeSchool}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
                    {/* Live search input field */}
                    <div className="relative w-full sm:w-48">
                      <span className="absolute inset-y-0 left-0.5 flex items-center pl-2.5 pointer-events-none text-gray-400 text-[10px]">
                        🔍
                      </span>
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder="Buscar alumno..."
                        className="w-full pl-8 pr-3 py-1.5 bg-neutral-900/60 light:bg-white border border-white/10 light:border-neutral-250 rounded-lg text-white light:text-neutral-800 placeholder-gray-500 text-xs focus:outline-none focus:border-violet-500 transition-colors shadow-inner"
                      />
                    </div>

                    <button
                      onClick={handleCreateStudentClick}
                      className="liquid-glass-btn inline-flex items-center gap-2 px-4.5 py-2.5 text-xs font-bold"
                    >
                      <UserPlus className="w-4 h-4 shrink-0" />
                      <span>Invitar Alumno</span>
                    </button>

                    <button
                      onClick={() => handleCreatePreConfiguredClick(activeLevel)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-white/5 light:bg-white light:border-neutral-200 text-white light:text-neutral-700 rounded-lg hover:bg-neutral-850 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir clase</span>
                    </button>
                  </div>
                </div>

                {/* Grid of students */}
                <div className="space-y-3">
                  {(() => {
                    const levelStudents = getSchoolStats(activeSchool).students.filter(
                      (s) => s.level === activeLevel
                    );

                    const query = studentSearchQuery.trim().toLowerCase();
                    const filteredStudents = levelStudents.filter(
                      s => s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)
                    );

                    if (filteredStudents.length === 0) {
                      return (
                        <div className="bg-neutral-950/20 light:bg-white border border-dashed border-white/5 light:border-neutral-200 py-10 rounded-xl text-center text-gray-500 text-xs">
                          {levelStudents.length === 0 
                            ? 'Sin alumnos registrados en esta sección escolar'
                            : 'No se encontraron alumnos coincidentes con la búsqueda'}
                        </div>
                      );
                    }

                    return filteredStudents.map((student) => {
                      const isExpanded = expandedStudentEmail === student.email;
                      const studentSubmissions = submissions.filter(
                        (s) => s.studentEmail.toLowerCase() === student.email?.toLowerCase()
                      );
                      const levelClasses = classes.filter((cl) => cl.level === activeLevel && cl.school?.toLowerCase() === activeSchool?.toLowerCase() && !cl.isSyllabus);
                      const userProgressPct = levelClasses.length > 0 
                        ? Math.round((studentSubmissions.length / levelClasses.length) * 100) 
                        : 0;
                      const hasWarning = student.status === 'warn';

                      return (
                        <div
                          key={student.email}
                          className="bg-neutral-950/40 light:bg-white border border-white/5 light:border-neutral-200 rounded-xl overflow-hidden transition-all shadow-sm"
                        >
                          <div
                            onClick={() => setExpandedStudentEmail(isExpanded ? null : (student.email || null))}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none hover:bg-neutral-900/10 light:hover:bg-neutral-50/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-neutral-900 border border-white/5 light:bg-neutral-50 light:border-neutral-200 flex items-center justify-center text-xs font-semibold text-white light:text-neutral-700">
                                {student.initials}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-semibold text-white light:text-neutral-800 text-sm">
                                    {student.name}
                                  </h4>
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium leading-none ${
                                    student.registered
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  }`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-slow" />
                                    {student.registered ? 'Activo' : 'Pendiente de registro'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono block">
                                  {student.email}
                                </span>
                              </div>
                            </div>

                            {/* Status, Level Modifier, and Mini Progress */}
                            <div className="flex items-center justify-end gap-4 flex-wrap">
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] text-gray-400 light:text-neutral-500 font-medium font-mono">
                                  {studentSubmissions.length}/{levelClasses.length} entregas
                                </span>
                                <div className="w-16 h-1 bg-white/[0.03] light:bg-neutral-100 rounded-full overflow-hidden sm:block hidden">
                                  <div
                                    className="h-full bg-violet-500/80 light:bg-violet-600"
                                    style={{ width: `${userProgressPct}%` }}
                                  />
                                </div>
                              </div>

                              <span className={`px-2 py-0.5 rounded text-[9px] font-medium border font-mono ${
                                !hasWarning 
                                  ? 'bg-green-950/20 text-green-400 border-green-900/20 light:bg-green-50 light:border-green-200 light:text-green-600'
                                  : 'bg-yellow-950/20 text-yellow-500 border-yellow-905/10 light:bg-yellow-50 light:border-yellow-200 light:text-yellow-600'
                              }`}>
                                {hasWarning ? 'Atrasado' : 'Al día'}
                              </span>

                              {/* Action items for student levels */}
                              <div className="flex items-center gap-1.5 pl-2 border-l border-white/[0.06] light:border-neutral-200">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditStudentClick(student);
                                  }}
                                  className="px-2.5 py-1 text-[10px] font-semibold text-violet-400 light:text-violet-600 hover:text-white light:hover:text-violet-700 bg-neutral-900/60 light:bg-neutral-100 hover:bg-neutral-800 border border-white/5 light:border-neutral-200 rounded-md transition-all cursor-pointer font-sans"
                                >
                                  Nivel / Escuela
                                </button>
                                {onDeleteStudent && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`¿Dar de baja académica y eliminar a ${student.name} del campus?`)) {
                                        onDeleteStudent(student.email || '');
                                      }
                                    }}
                                    className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                                    title="Dar de baja alumno"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <ChevronRight className={`w-4 h-4 text-neutral-600 transform transition-transform ${
                                isExpanded ? 'rotate-90 text-violet-400 light:text-violet-600' : ''
                              }`} />
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="border-t border-white/5 light:border-neutral-200 bg-[#07070d]/30 light:bg-neutral-50/50 px-5 pb-5"
                              >
                                <div className="mt-4 space-y-3">
                                  {levelClasses.length === 0 ? (
                                    <span className="text-gray-500 text-xs italic block">Sin clases programadas</span>
                                  ) : (
                                    levelClasses
                                      .sort((a, b) => a.week - b.week)
                                      .map((cl) => {
                                        const matchingSub = studentSubmissions.find(
                                          (sub) => sub.classWeek === cl.week
                                        );

                                        return (
                                          <div
                                            key={cl.week}
                                            className="bg-neutral-950/50 light:bg-white p-4 rounded-lg border border-white/5 light:border-neutral-200/80 space-y-3 shadow-inner"
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] uppercase font-bold text-gray-400 light:text-neutral-500 font-mono tracking-wider">
                                                  Semana {cl.week}
                                                </span>
                                                <span className="text-xs text-white light:text-neutral-800 font-medium">
                                                  {cl.title}
                                                </span>
                                              </div>

                                              {matchingSub ? (
                                                <span className="text-[9px] text-green-400 bg-green-950/20 light:bg-green-50 light:text-green-600 border border-green-500/10 px-2 py-0.5 rounded flex items-center gap-1 font-medium font-mono">
                                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                  Entregado
                                                </span>
                                              ) : (
                                                <span className="text-[9px] text-yellow-500 bg-yellow-950/20 light:bg-yellow-50 light:text-yellow-600 border border-yellow-500/10 px-2 py-0.5 rounded flex items-center gap-1 font-medium font-mono">
                                                  <Clock className="w-3 h-3 text-yellow-500" />
                                                  Pendiente
                                                </span>
                                              )}
                                            </div>

                                            {matchingSub ? (
                                              <div className="bg-black/15 light:bg-neutral-50 p-3 rounded border border-white/[0.02] light:border-neutral-200 text-xs leading-relaxed space-y-1.5 font-sans">
                                                <div className="flex items-center gap-1 text-[10px] text-violet-400 light:text-violet-600 font-medium font-mono">
                                                  <FileText className="w-3.5 h-3.5" />
                                                  <span>Respuesta del alumno:</span>
                                                </div>
                                                <p className="text-gray-300 light:text-neutral-700 whitespace-pre-wrap">
                                                  {matchingSub.responseText || '(Vacía)'}
                                                </p>
                                              </div>
                                            ) : (
                                              <span className="text-[10px] text-gray-500 italic block">Pendiente de entrega</span>
                                            )}
                                          </div>
                                        );
                                      })
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Seccion de Clases publicadas/activas para este colegio */}
                <div className="mt-8 space-y-4 pt-6 border-t border-white/5 light:border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider font-mono">Planificación Escolar</span>
                      <h3 className="text-sm font-semibold text-white light:text-neutral-800">Clases programadas para este colegio</h3>
                    </div>
                  </div>
                  {classes.filter(cl => cl.level === activeLevel && cl.school?.toLowerCase() === activeSchool?.toLowerCase() && !cl.isSyllabus).length === 0 ? (
                    <div className="p-6 bg-neutral-950/20 light:bg-neutral-50/50 border border-dashed border-white/5 light:border-neutral-200 rounded-xl text-center text-gray-500 text-xs">
                      No hay clases subidas para este colegio todavía. Podés subir clases desde la pestaña "Syllabus Académico".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {classes
                        .filter(cl => cl.level === activeLevel && cl.school?.toLowerCase() === activeSchool?.toLowerCase() && !cl.isSyllabus)
                        .sort((a, b) => a.week - b.week)
                        .map(cl => (
                          <div key={cl.week} className="bg-[#0a0a1a]/40 light:bg-white border border-white/5 light:border-neutral-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                            <div>
                              <div className="text-[9px] font-mono tracking-widest uppercase text-violet-400 light:text-violet-600 font-bold">Semana {cl.week}</div>
                              <h4 className="text-xs sm:text-sm font-medium text-white light:text-neutral-800 mt-1">{cl.title}</h4>
                              <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 font-mono">
                                <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                <span>Límite: {new Date(cl.deadline).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setDeleteConfirmation({
                                  level: cl.level,
                                  week: cl.week,
                                  school: cl.school || activeSchool || undefined,
                                  id: cl.id,
                                  title: cl.title,
                                  isSyllabus: false
                                });
                              }}
                              className="text-gray-500 hover:text-red-400 p-2 transition-colors cursor-pointer"
                              title="Eliminar asignación escolar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : activeTab === 'rendimiento' ? (
          /* REGISTRO Y MONITOREO DE RENDIMIENTO ESTUDIANTIL */
          <motion.div
            key="performance-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {(() => {
              // Preprocess and dynamically enrich students
              const enrichedStudents = students.map(student => {
                const studentEmail = student.email || '';
                
                // Entregas reales del estudiante
                const studentSubmissions = submissions.filter(
                  sub => sub.studentEmail.toLowerCase() === studentEmail.toLowerCase()
                );
                const completedWeeks = studentSubmissions.map(sub => sub.classWeek);

                // Clases reales asignadas de su nivel a su colegio
                const activeCohortClasses = classes.filter(
                  cl => cl.level === student.level && cl.school?.toLowerCase() === student.school?.toLowerCase() && !cl.isSyllabus
                );

                const maxWeekInCohort = activeCohortClasses.length > 0
                  ? Math.max(...activeCohortClasses.map(cl => cl.week))
                  : 0;

                // Desafíos faltantes
                const missingChallenges = activeCohortClasses
                  .filter(cl => !completedWeeks.includes(cl.week))
                  .sort((a, b) => a.week - b.week);

                // Determinar si hay urgencia (si un desafío pendiente es el último de todos y está dentro del plazo de entrega)
                const urgentMissingChallenges = missingChallenges.filter(cl => {
                  const isLast = cl.week === maxWeekInCohort;
                  if (isLast) {
                    if (!cl.deadline) return true;
                    const dlDate = new Date(cl.deadline);
                    const withinDeadline = dlDate.getTime() >= Date.now();
                    return !withinDeadline; // Es urgente si la fecha límite YA pasó
                  }
                  return true; // Si no es la última tarea, siempre es urgente/atrasada
                });

                const dynamicIsAtrasado = urgentMissingChallenges.length > 0;
                const computedStatus = dynamicIsAtrasado ? 'warn' : 'ok';

                const completionRate = activeCohortClasses.length > 0
                  ? Math.round((studentSubmissions.length / activeCohortClasses.length) * 100)
                  : 0;

                return {
                  ...student,
                  computedStatus,
                  missingChallenges,
                  urgentMissingChallenges,
                  studentSubmissions,
                  activeCohortClasses,
                  completionRate
                };
              });

              const totalWarnStudents = enrichedStudents.filter(s => s.computedStatus === 'warn').length;
              const totalOkStudents = enrichedStudents.filter(s => s.computedStatus === 'ok').length;

              return (
                <>
                  {/* Notifications overlay if bell clicked */}
                  {bellNotification && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-300 text-xs flex justify-between items-center animate-fade-in font-sans">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-yellow-500 animate-bounce" />
                        <span>
                          <strong>Alerta de recordatorio enviada:</strong> Se ha notificado exitosamente a <strong>{bellNotification.studentName}</strong> ({bellNotification.email}) para que complete y entregue sus desafíos financieros pendientes.
                        </span>
                      </div>
                      <button 
                        onClick={() => setBellNotification(null)}
                        className="font-bold hover:text-white px-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5 light:border-neutral-200">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider font-mono">Control de entregas</span>
                      <h2 className="text-lg font-medium text-white light:text-neutral-900 tracking-tight mt-0.5 font-sans animate-fade-in">
                        Rendimiento Estudiantil
                      </h2>
                    </div>
                  </div>

                  {/* Performance Stats row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-[#0c0c1b]/30 light:bg-white border border-white/5 light:border-neutral-200 rounded-xl flex items-center gap-4 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-violet-600/10 flex items-center justify-center text-violet-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-gray-500 font-bold uppercase">Alumnos Totales</div>
                        <div className="text-lg font-bold text-white light:text-neutral-900 mt-0.5">{students.length}</div>
                      </div>
                    </div>

                    <div className="p-4 bg-[#0c0c1b]/30 light:bg-white border border-white/5 light:border-neutral-200 rounded-xl flex items-center gap-4 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-gray-500 font-bold uppercase">En Alerta / Atrasados</div>
                        <div className="text-lg font-bold text-yellow-500 mt-0.5">
                          {totalWarnStudents}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-[#0c0c1b]/30 light:bg-white border border-white/5 light:border-neutral-200 rounded-xl flex items-center gap-4 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-gray-500 font-bold uppercase">Al Día</div>
                        <div className="text-lg font-bold text-emerald-400 mt-0.5">
                          {totalOkStudents}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Controller row: Filters + Search */}
                  <div className="flex flex-col md:flex-row items-center gap-4 justify-between pt-2">
                    <div className="flex bg-neutral-900/40 p-1 rounded-xl border border-white/5 light:bg-white light:border-neutral-200 w-full md:w-auto gap-1">
                      <button
                        onClick={() => setPerformanceStatusFilter('all')}
                        className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          performanceStatusFilter === 'all'
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'text-gray-400 light:text-neutral-500 hover:text-white light:hover:text-neutral-800'
                        }`}
                      >
                        Todos ({students.length})
                      </button>
                      <button
                        onClick={() => setPerformanceStatusFilter('warn')}
                        className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          performanceStatusFilter === 'warn'
                            ? 'bg-yellow-600 text-white shadow-sm'
                            : 'text-gray-400 light:text-neutral-500 hover:text-white light:hover:text-neutral-800'
                        }`}
                      >
                        Atrasados ({totalWarnStudents})
                      </button>
                      <button
                        onClick={() => setPerformanceStatusFilter('ok')}
                        className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          performanceStatusFilter === 'ok'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-gray-400 light:text-neutral-500 hover:text-white light:hover:text-neutral-800'
                        }`}
                      >
                        Al Día ({totalOkStudents})
                      </button>
                    </div>

                    {/* Live search input field */}
                    <div className="relative w-full md:w-72">
                      <span className="absolute inset-y-0 left-0.5 flex items-center pl-2.5 pointer-events-none text-gray-500">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder="Buscar alumno, escuela o nivel..."
                        className="w-full pl-9 pr-3 py-2 bg-neutral-900/60 light:bg-white border border-white/10 light:border-neutral-200 rounded-xl text-white light:text-neutral-800 placeholder-gray-500 text-xs focus:outline-none focus:border-violet-500 transition-colors shadow-inner font-sans"
                      />
                    </div>
                  </div>

                  {/* Students Performance Grid Table */}
                  <div className="bg-neutral-900/40 light:bg-white border border-white/5 light:border-neutral-200 rounded-2xl overflow-hidden overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-white/5 light:border-neutral-100 bg-neutral-950/30 text-gray-500 text-[10px] tracking-wider font-bold uppercase font-mono">
                          <th className="px-4 py-3">Estudiante</th>
                          <th className="px-4 py-3">Colegio o Institución</th>
                          <th className="px-4 py-3">Nivel</th>
                          <th className="px-4 py-3">Avance Académico</th>
                          <th className="px-4 py-3">Desafíos Pendientes</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3 text-right">Alerta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-12 text-gray-500 italic text-xs">
                              No hay alumnos cargados en el campus todavía.
                            </td>
                          </tr>
                        ) : (() => {
                          const filtered = enrichedStudents
                            .filter(s => {
                              if (performanceStatusFilter === 'warn') return s.computedStatus === 'warn';
                              if (performanceStatusFilter === 'ok') return s.computedStatus === 'ok';
                              return true;
                            })
                            .filter(s => {
                              const q = studentSearchQuery.toLowerCase().trim();
                              if (!q) return true;
                              return (
                                s.name.toLowerCase().includes(q) ||
                                (s.email || '').toLowerCase().includes(q) ||
                                (s.school || '').toLowerCase().includes(q) ||
                                `nivel ${s.level}`.includes(q)
                              );
                            });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="text-center py-12 text-gray-500 italic text-xs">
                                  No se encontraron alumnos coincidentes con los filtros seleccionados.
                                </td>
                              </tr>
                            );
                          }

                          // Ordenar: primero los que deben MÁS desafíos faltantes.
                          // Si hay empate, colocamos primero a los que tienen más desafíos urgentes.
                          const sorted = [...filtered].sort((a, b) => {
                            if (b.missingChallenges.length !== a.missingChallenges.length) {
                              return b.missingChallenges.length - a.missingChallenges.length;
                            }
                            return b.urgentMissingChallenges.length - a.urgentMissingChallenges.length;
                          });

                          return sorted.map(student => {
                            const studentEmail = student.email || '';
                            const {
                              completionRate,
                              missingChallenges,
                              urgentMissingChallenges,
                              studentSubmissions,
                              activeCohortClasses,
                              computedStatus
                            } = student;

                            const maxWeekInCohort = activeCohortClasses.length > 0
                              ? Math.max(...activeCohortClasses.map(cl => cl.week))
                              : 0;

                            return (
                              <tr 
                                key={studentEmail}
                                className="border-b border-white/5 light:border-neutral-100 text-xs text-gray-300 light:text-neutral-700 hover:bg-white/[0.01] light:hover:bg-neutral-50/50 transition-colors"
                              >
                                {/* Profile */}
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-400 uppercase shrink-0">
                                      {student.initials || student.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-white light:text-neutral-900">{student.name}</div>
                                      <div className="text-[10px] text-gray-500 font-mono">{studentEmail}</div>
                                    </div>
                                  </div>
                                </td>

                                {/* Colegio */}
                                <td className="px-4 py-3.5 text-gray-400 light:text-neutral-600 max-w-[180px] truncate">
                                  {student.school || '—'}
                                </td>

                                {/* Nivel */}
                                <td className="px-4 py-3.5 font-semibold font-mono text-gray-400 light:text-neutral-600">
                                  Nivel {student.level}
                                </td>

                                {/* Avance stats with mini progressBar */}
                                <td className="px-4 py-3.5">
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10.5px] font-mono text-gray-400 light:text-neutral-500 font-medium">
                                      <span>{studentSubmissions.length}/{activeCohortClasses.length} desafíos</span>
                                      <span className="font-bold text-violet-400 light:text-violet-600">{completionRate}%</span>
                                    </div>
                                    <div className="w-24 h-1 bg-white/[0.03] light:bg-neutral-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-violet-500/80 light:bg-violet-600"
                                        style={{ width: `${completionRate}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                {/* Desafíos faltantes list */}
                                <td className="px-4 py-3.5 max-w-[200px]">
                                  {missingChallenges.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {missingChallenges.map(mc => {
                                        const isLast = mc.week === maxWeekInCohort;
                                        const isUrgent = !isLast || !mc.deadline || (new Date(mc.deadline).getTime() < Date.now());
                                        return (
                                          <span 
                                            key={mc.week}
                                            className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-colors ${
                                              isUrgent
                                                ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500'
                                                : 'bg-violet-500/10 border border-violet-500/20 text-violet-400 light:text-violet-600'
                                            }`}
                                            title={isUrgent ? mc.title : `${mc.title} (Dentro del plazo)`}
                                          >
                                            Sem. {mc.week} {!isUrgent && '⏱️'}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : activeCohortClasses.length === 0 ? (
                                    <span className="text-[10.5px] text-gray-500 italic font-sans">Sin clases asignadas</span>
                                  ) : (
                                    <span className="text-emerald-500 font-semibold text-[11px] flex items-center gap-1 font-mono">
                                      <Check className="w-3.5 h-3.5" />
                                      Al Día
                                    </span>
                                  )}
                                </td>

                                {/* Estado status badge */}
                                <td className="px-4 py-3.5">
                                  <span className={`px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase rounded ${
                                    computedStatus === 'warn'
                                      ? 'bg-yellow-950/40 text-yellow-500 border border-yellow-500/10 font-mono'
                                      : 'bg-green-950/40 text-green-400 border border-green-500/10 font-mono'
                                  }`}>
                                    {computedStatus === 'warn' ? 'Atrasado' : 'Al Día'}
                                  </span>
                                </td>

                                {/* Alerta Interactiva Bell */}
                                <td className="px-4 py-3.5 text-right">
                                  <button
                                    onClick={() => {
                                      setBellNotification({
                                        studentName: student.name,
                                        email: studentEmail
                                      });
                                      // Scroll to top to see notification popup immediately
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      computedStatus === 'warn'
                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black hover:scale-105 active:scale-95 shadow'
                                        : 'bg-white/5 border-white/5 text-gray-600 hover:bg-white/10 hover:text-white'
                                    }`}
                                    title={computedStatus === 'warn' ? `Enviar recordatorio urgente de entregas a ${student.name}` : `Enviar felicitación por desempeño positivo a ${student.name}`}
                                  >
                                    <Bell className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </motion.div>
        ) : activeTab === 'clases' ? (
          /* MINIMAL SYLLABUS LIST GESTOR */
          <motion.div
            key="classes-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5 light:border-neutral-200">
              <div>
                <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider font-mono">Syllabus unificado</span>
                <h2 className="text-lg font-medium text-white light:text-neutral-900 tracking-tight mt-0.5 font-sans">
                  Syllabus Académico (Plantilla de Clases)
                </h2>
              </div>

              <button
                onClick={() => handleCreatePreConfiguredClick(selectedSyllabusLevel)}
                className="liquid-glass-btn inline-flex items-center gap-2 px-5 py-2.5 text-xs select-none"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Crear clase para Nivel {selectedSyllabusLevel}</span>
              </button>
            </div>

            {/* Level Selector Pills with fluid animation */}
            <div className="flex bg-[#14132b]/40 light:bg-neutral-100/80 backdrop-blur-xl p-1 rounded-2xl border border-white/5 light:border-neutral-200 mb-2 overflow-x-auto no-scrollbar scroll-smooth self-start max-w-max relative z-10 shadow-lg gap-1">
              {COURSES.map(course => {
                const isActive = selectedSyllabusLevel === course.id;
                return (
                  <button
                    key={course.id}
                    onClick={() => setSelectedSyllabusLevel(course.id)}
                    className={`relative flex items-center px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 light:text-neutral-500 hover:text-gray-200 light:hover:text-neutral-850'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeSyllabusLevelTabPill"
                        className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-950/40 rounded-xl -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">Nivel {course.id} · {course.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Grid display of syllabus classes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.filter(cl => cl.isSyllabus && cl.level === selectedSyllabusLevel).length > 0 ? (
                classes
                  .filter(cl => cl.isSyllabus && cl.level === selectedSyllabusLevel)
                  .sort((a, b) => a.week - b.week)
                  .map((cl, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0c0c1c]/30 light:bg-white border border-white/5 light:border-neutral-200 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-violet-500/30 transition-colors"
                    >
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-mono tracking-wider font-bold text-violet-400 light:text-violet-600 uppercase">
                            Semana {cl.week}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 light:bg-neutral-50 border border-white/5 light:border-neutral-200 text-[9px] font-mono text-gray-500">
                            {getResourcesString(cl)}
                          </span>
                        </div>
                        <h3 className="font-sans font-semibold text-white light:text-neutral-800 text-sm mt-1.5 line-clamp-1">
                          {cl.title}
                        </h3>
                        {cl.text && (
                          <div 
                            className="text-gray-400 light:text-neutral-600 text-xs mt-2 line-clamp-2 leading-relaxed" 
                            dangerouslySetInnerHTML={{ __html: cl.text }} 
                          />
                        )}
                        
                        <div className="mt-4 bg-[#0a0a1a]/40 light:bg-neutral-50/50 p-3 rounded-lg border border-white/[0.02] light:border-neutral-200">
                          <div className="text-[9px] uppercase tracking-wider text-gray-500 font-mono font-bold">Actividad Desafío</div>
                          <h4 className="text-white light:text-neutral-800 font-medium text-xs mt-1 truncate">{cl.actTitle || 'Sin título'}</h4>
                          <p className="text-[11px] text-gray-400 light:text-neutral-600 mt-1 line-clamp-1 italic">{cl.actDesc || 'Sin descripción'}</p>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-white/5 light:border-neutral-200 flex items-center justify-between gap-2">
                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditClick(cl)}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-violet-500/20 text-violet-400 hover:bg-violet-500/10 hover:text-white light:bg-violet-50 light:border-violet-200/50 light:text-violet-600 light:hover:bg-violet-100/80 light:hover:text-violet-700 transition-all cursor-pointer font-sans"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirmation({
                                level: cl.level,
                                week: cl.week,
                                id: cl.id,
                                title: cl.title,
                                isSyllabus: true
                              });
                            }}
                            className="p-2 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Eliminar del Syllabus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* SUBIR CLASE VIBRANT TRIGGER */}
                        <button
                          type="button"
                          onClick={() => {
                            setClassToAssign(cl);
                            setAssignSelectedSchools([]);
                            setAssignUnlockAt(new Date().toISOString().substring(0, 16));
                            setAssignDeadline(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().substring(0, 16));
                            setAssignModalOpen(true);
                          }}
                          className="liquid-glass-btn inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold select-none cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Subir Clase</span>
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="col-span-1 md:col-span-2 text-center py-12 bg-neutral-900/10 border border-dashed border-white/5 light:border-neutral-200 rounded-2xl">
                  <BookOpen className="w-10 h-10 text-gray-600 light:text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 light:text-gray-500 text-sm">
                    No hay clases cargadas en el Syllabus del Nivel {selectedSyllabusLevel} todavía.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* SECURE REGISTERED AND PAUSED USER MANAGER */
          <motion.div
            key="users-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Tab header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5 light:border-neutral-200">
              <div>
                <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider font-mono font-bold">Control de accesos</span>
                <h2 className="text-lg font-medium text-white light:text-neutral-900 tracking-tight mt-0.5 font-sans">
                  Usuarios y Solicitudes de Registro
                </h2>
              </div>
            </div>

            {/* Part 1: Solicitudes Pendientes (Aprobaciones) */}
            <div className="space-y-4">
              <h3 className="font-sans text-xs font-bold tracking-widest text-amber-500 uppercase flex items-center gap-2">
                <Clock className="w-4 h-4 animate-pulse shrink-0" />
                <span>Solicitudes Pendientes ({allUsers.filter(u => u.role === 'pausado').length})</span>
              </h3>

              {allUsers.filter(u => u.role === 'pausado').length === 0 ? (
                <div className="text-center py-8 bg-neutral-900/10 border border-dashed border-white/5 light:border-neutral-200 rounded-2xl animate-fade-in">
                  <CheckCircle2 className="w-8 h-8 text-gray-600 light:text-neutral-400 mx-auto mb-2" />
                  <p className="text-gray-400 light:text-neutral-500 text-xs">
                    No hay solicitudes de acceso pendientes en este momento.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {allUsers.filter(u => u.role === 'pausado').map(u => (
                    <PausedUserRow 
                      key={u.email} 
                      user={u} 
                      onApprove={onApproveUser} 
                      onDelete={onDeleteUser} 
                      associatedSchools={ASSOCIATED_SCHOOLS}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Part 2: Buscador y Listado Total */}
            <div className="space-y-4 pt-4 border-t border-white/5 light:border-neutral-200">
              <h3 className="font-sans text-xs font-bold tracking-widest text-[#5e5e6e] uppercase">
                Directorio General de Usuarios ({allUsers.filter(u => u.role !== 'pausado').length})
              </h3>

              {/* Buscador de usuarios */}
              <div className="flex bg-neutral-950/60 light:bg-white border border-white/10 light:border-neutral-200 rounded-xl p-0.5 items-center">
                <input
                  type="text"
                  placeholder="Buscar por nombre o correo..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full bg-transparent px-4 py-2.5 text-white light:text-neutral-800 text-xs focus:outline-none placeholder-gray-500"
                />
              </div>

              <div className="bg-neutral-900/40 light:bg-white rounded-2xl border border-white/5 light:border-neutral-200 overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/5 light:border-neutral-100 bg-neutral-950/30 text-gray-500 text-[10px] tracking-wider font-bold uppercase font-mono">
                      <th className="px-4 py-3">Nombre / Email</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Colegio o Institución</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers
                      .filter(u => u.role !== 'pausado')
                      .filter(u => {
                        const q = studentSearchQuery.toLowerCase();
                        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                      })
                      .map(u => (
                        <tr key={u.email} className="border-b border-white/5 light:border-neutral-100 text-xs text-gray-300 light:text-neutral-700 hover:bg-white/[0.01] light:hover:bg-neutral-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                                {u.initials || u.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-white light:text-neutral-900">{u.name}</div>
                                <div className="text-[10px] text-gray-500 font-mono">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-0.5 uppercase text-[9px] font-bold tracking-widest rounded ${
                              u.role === 'admin' 
                                ? 'bg-violet-950/40 text-violet-300 border border-violet-500/30' 
                                : u.role === 'directivo' 
                                  ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/30' 
                                  : 'bg-green-950/40 text-green-300 border border-green-500/30 font-mono'
                            }`}>
                              {u.role === 'admin' ? 'Admin' : u.role === 'directivo' ? 'Directivo' : 'Alumno'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-gray-400 light:text-neutral-500 max-w-[200px] truncate">
                            {u.school || '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {onDeleteUser && (
                              <button
                                onClick={() => {
                                  if (confirm(`¿Estás seguro de que deseas dar de baja y revocar el acceso a ${u.name}?`)) {
                                    onDeleteUser(u.email);
                                  }
                                }}
                                className="p-1 px-2 text-red-100 bg-red-600 hover:bg-red-550 rounded cursor-pointer transition-colors text-[10px]"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-3 h-3 inline mr-1" />
                                <span>Dar de Baja</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalOpen && (
          <ClassModal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setEditingClass(null);
            }}
            onSave={handleSave}
            initialClass={editingClass}
          />
        )}
      </AnimatePresence>

      {/* OVERLAY / MODAL DE SUBIR CLASE PLANIFICACIÓN */}
      <AnimatePresence>
        {assignModalOpen && classToAssign && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f20] light:bg-white border border-violet-900/[0.15] light:border-neutral-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-fade-in"
            >
              <div className="p-6 border-b border-white/5 light:border-neutral-200 flex justify-between items-center bg-white/[0.02] light:bg-neutral-50/50">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 light:text-violet-600 font-mono">
                    Planificar Lanzamiento Académico
                  </span>
                  <h3 className="text-white light:text-neutral-900 font-sans font-bold text-sm mt-0.5">
                    Subir Clase: Semana {classToAssign.week} · Nivel {classToAssign.level}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 light:bg-neutral-100 text-gray-400 light:text-neutral-600 hover:text-white light:hover:text-neutral-900 flex items-center justify-center text-sm cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[460px] overflow-y-auto no-scrollbar">
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <label className="text-[10px] font-bold uppercase text-gray-400 light:text-neutral-505 tracking-wider">
                      Colegios Destinatarios
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (assignSelectedSchools.length === ASSOCIATED_SCHOOLS.length) {
                          setAssignSelectedSchools([]);
                        } else {
                          setAssignSelectedSchools([...ASSOCIATED_SCHOOLS]);
                        }
                      }}
                      className="text-[10px] text-violet-400 light:text-violet-700 font-semibold hover:underline cursor-pointer font-sans"
                    >
                      {assignSelectedSchools.length === ASSOCIATED_SCHOOLS.length ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  </div>

                  <div className="space-y-1.5 border border-white/5 light:border-neutral-200 bg-black/10 light:bg-neutral-50 p-4 rounded-xl">
                    {ASSOCIATED_SCHOOLS.map(schoolName => {
                      const isSelected = assignSelectedSchools.includes(schoolName);
                      return (
                        <label
                          key={schoolName}
                          className="flex items-start gap-2.5 p-1.5 hover:bg-white/[0.02] light:hover:bg-neutral-105 rounded-lg cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setAssignSelectedSchools(assignSelectedSchools.filter(name => name !== schoolName));
                              } else {
                                setAssignSelectedSchools([...assignSelectedSchools, schoolName]);
                              }
                            }}
                            className="mt-0.5 rounded text-violet-500 focus:ring-violet-500 cursor-pointer"
                          />
                          <span className="text-white light:text-neutral-800 font-medium leading-tight">
                            {schoolName}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 light:text-neutral-500 tracking-wider block mb-1.5">
                      Habilitar desde el
                    </label>
                    <input
                      type="datetime-local"
                      value={assignUnlockAt}
                      onChange={(e) => setAssignUnlockAt(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-white/10 light:bg-white light:border-neutral-200 rounded-xl text-white light:text-neutral-800 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 light:text-neutral-500 tracking-wider block mb-1.5">
                      Límite de Entrega
                    </label>
                    <input
                      type="datetime-local"
                      value={assignDeadline}
                      onChange={(e) => setAssignDeadline(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-white/10 light:bg-white light:border-neutral-200 rounded-xl text-white light:text-neutral-800 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white/[0.01] light:bg-[#fbfbfb] border-t border-white/5 light:border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 bg-white/5 light:bg-neutral-100 text-gray-400 light:text-neutral-700 text-xs font-semibold rounded-lg hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={assignSelectedSchools.length === 0}
                  onClick={() => {
                    onAssignClass(classToAssign, assignSelectedSchools, assignUnlockAt, assignDeadline);
                    setAssignModalOpen(false);
                  }}
                  className="px-5 py-2 bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer transform active:scale-95 transition-all text-center"
                >
                  Confirmar Subida
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PARA CREAR / EDITAR ALUMNO (REGISTRO INSTITUCIONAL) */}
      <AnimatePresence>
        {studentModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-50 overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-4 sm:p-6 md:py-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0f0f20] light:bg-white border border-violet-900/40 light:border-neutral-200 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl relative my-8"
              >
                {showInviteSuccess ? (
                  <div className="p-6 md:p-8 space-y-6 text-center relative">
                    {/* Botón de salida rápido */}
                    <button
                      type="button"
                      onClick={() => {
                        setStudentModalOpen(false);
                        setShowInviteSuccess(false);
                        setEditingStudent(null);
                        setShowEmailPreview(false);
                      }}
                      className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 light:text-neutral-500 hover:text-white light:hover:text-neutral-800 flex items-center justify-center text-sm cursor-pointer transition-colors z-10"
                      id="close-invite-success-btn"
                    >
                      ✕
                    </button>
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-6 h-6 animate-pulse-slow" />
                  </div>
                  
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
                      Invitación Generada Exitosamente
                    </span>
                    <h3 className="text-white light:text-neutral-900 font-sans font-bold text-xl mt-1">
                      ¡Alumno Matriculado!
                    </h3>
                  </div>

                  {/* Detalle alumno */}
                  <div className="bg-neutral-950/65 light:bg-neutral-50 rounded-xl p-4 border border-white/5 light:border-neutral-200 text-left space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase font-mono tracking-wider">
                      <span>Perfil del Estudiante</span>
                      <span className="text-emerald-500">Pendiente de activación</span>
                    </div>
                    <p className="text-white light:text-neutral-800 font-semibold text-sm">
                      {lastInvitedName}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 text-gray-400 light:text-neutral-500 font-mono text-[11px]">
                      <span>{lastInvitedEmail}</span>
                      <span className="text-[10px] text-violet-400 font-semibold font-sans">Nivel {lastInvitedLevel + 1} • {lastInvitedSchool ? lastInvitedSchool.split(',')[0] : 'Fintly'}</span>
                    </div>
                  </div>

                  {/* Explicación Clarificadora */}
                  <div className="bg-violet-950/15 border border-violet-900/30 rounded-2xl p-5 text-left space-y-3">
                    <div className="flex items-center gap-2 text-violet-400 light:text-violet-600 font-bold text-xs uppercase tracking-wider font-mono">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      <span>¿Cómo llegará el correo de invitación?</span>
                    </div>
                    
                    <p className="text-gray-300 light:text-neutral-600 text-xs leading-relaxed">
                      El sistema automatizado de <strong className="text-white light:text-neutral-800">Fintly Campus</strong> ya registró la invitación de forma automática en tu base de datos de Firestore. 
                      Este correo autotransmitido tiene un <strong className="text-violet-300 light:text-violet-600 font-semibold">diseño premium 10/10</strong> (firma con logo tridimensional, caja de curso y botón llamativo).
                    </p>

                    <div className="pt-2 border-t border-white/5 light:border-neutral-200/50">
                      <p className="text-[10.5px] text-gray-400 light:text-neutral-500 leading-relaxed font-sans">
                        ⚠️ <strong className="text-violet-300 light:text-violet-500">Aclaración:</strong> Los botones externos de Gmail o tu Mail local solo permiten redactar texto plano (sin diseño, estilo "1/10") debido a limitaciones técnicas del navegador. Para enviar el diseño con formato premium manualmente, usá el siguiente botón:
                      </p>
                    </div>
                  </div>

                  {/* Acciones de correo y enlaces */}
                  <div className="space-y-4 pt-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider block text-left">
                      Acciones y Alternativas de Envío Manual
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                      {/* NEW PREMIUM: COPY RICH-TEXT EMAIL VALUE */}
                      <button
                        type="button"
                        onClick={handleCopyRichEmail}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-[0.98] shadow ${
                          copiedRich 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                            : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-900/20'
                        }`}
                      >
                        {copiedRich ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-white animate-bounce-slow" />
                            <span>¡Copiado Enriquecido 10/10!</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-violet-200 animate-pulse" />
                            <span>Copiar Correo Diseñado 10/10</span>
                          </>
                        )}
                      </button>

                      {/* Copiar enlace crudo */}
                      <button
                        type="button"
                        onClick={() => {
                          const link = `${window.location.origin}/?register&email=${encodeURIComponent(lastInvitedEmail)}`;
                          navigator.clipboard.writeText(link);
                          setCopiedFeedback(true);
                          setTimeout(() => setCopiedFeedback(false), 2000);
                        }}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-neutral-900 border border-white/5 hover:bg-neutral-800 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-[0.98] light:bg-neutral-100 light:text-neutral-800 light:border-neutral-200 light:hover:bg-neutral-200"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                        <span>{copiedFeedback ? '¡Enlace Copiado!' : 'Copiar Solo Enlace'}</span>
                      </button>
                    </div>

                    {copiedRich && (
                      <p className="text-[10.5px] text-emerald-400 light:text-emerald-600 text-left leading-relaxed animate-fade-in font-sans">
                        ✓ <strong className="text-emerald-300 light:text-emerald-700">¡Copiado correctamente al Portapapeles!</strong> Ya guardamos la estructura visual completa (logo, colores y el botón interactivo). Redactá un correo en tu cuenta personal de Gmail u Outlook y simplemente presioná <kbd className="bg-black/40 text-gray-200 px-1 py-0.5 rounded font-mono">Ctrl + V</kbd> (o click derecho y Pegar) para insertar la invitación sofisticada idéntica.
                      </p>
                    )}

                    <div className="flex gap-2">
                      <a
                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lastInvitedEmail)}&su=${encodeURIComponent("Invitación Académica a Fintly Campus Virtual")}&body=${encodeURIComponent(
                          `¡Hola, ${lastInvitedName}!\n\nTe damos la bienvenida oficial a Fintly, la plataforma interactiva de microaprendizaje y educación financiera.\n\nHas sido invitado/a por tus docentes para formar parte del Nivel ${lastInvitedLevel + 1}.\n\nPara activar tu cuenta escolar y registrarte, ingresá en el siguiente enlace institucional:\n${window.location.origin}/?register&email=${encodeURIComponent(lastInvitedEmail)}\n\n¡Te esperamos!\n\nEquipo Fintly`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2.5 border border-[#1e293b] light:border-neutral-200 hover:bg-white/[0.02] light:hover:bg-neutral-50 text-[11px] text-gray-400 light:text-neutral-600 rounded-lg text-center font-medium cursor-pointer transition-colors block font-sans"
                      >
                        Abrir borrador Gmail (Texto Plano)
                      </a>

                      <button
                        type="button"
                        onClick={() => setShowEmailPreview(!showEmailPreview)}
                        className="px-4 py-2.5 border border-white/5 hover:bg-white/5 dark:border-white/10 light:border-neutral-200 hover:bg-neutral-100 rounded-lg text-[11px] font-semibold text-gray-300 light:text-neutral-700 cursor-pointer"
                      >
                        {showEmailPreview ? 'Ocultar Vista Previa' : 'Ver Email 10/10'}
                      </button>
                    </div>
                  </div>

                  {/* Accordion / Visual Preview draft */}
                  <AnimatePresence>
                    {showEmailPreview && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border border-[#1e1b4b] rounded-2xl overflow-hidden text-left bg-[#050510] text-[#d1d5db]"
                      >
                        <div className="bg-black/60 px-4 py-2.5 border-b border-[#1e1b4b] text-[10px] font-mono text-gray-500 space-y-0.5">
                          <div className="flex justify-between items-center w-full">
                            <span>VISTA PREVIA DEL CORREO DE INVITACIÓN ENVIADO (10/10)</span>
                            <span className="text-indigo-400 font-bold uppercase text-[9px]">Maquetado Premium</span>
                          </div>
                        </div>
                        
                        <div className="p-4 sm:p-6 bg-[#050510]">
                          <div className="max-w-md mx-auto bg-[#0f0f24] border border-[#221c4e] rounded-xl overflow-hidden shadow-inner">
                            {/* Header Gradient */}
                            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-center text-white">
                              <span className="bg-white/10 border border-white/20 text-white font-extrabold text-[#ffffff] text-xs tracking-wider rounded-lg px-2.5 py-1 inline-block mb-3 font-sans">Fintly</span>
                              <h4 className="font-sans font-bold text-sm">¡Hola, {lastInvitedName}!</h4>
                              <p className="text-[10px] text-indigo-200 mt-1">Te damos la bienvenida al Campus Virtual de Fintly</p>
                            </div>

                            {/* Body */}
                            <div className="p-5 space-y-4 text-[11px] leading-relaxed">
                              <p className="text-gray-400">Tu institución educativa te asignó acceso directo para formar parte de la plataforma de educación financiera interactiva.</p>

                              <div className="bg-[#060614] border border-[#1e1b4b] rounded-xl p-3 text-left space-y-2 text-[10px]">
                                <span className="text-[8px] font-extrabold text-indigo-400 uppercase tracking-widest font-mono block mb-1">Credenciales Académicas</span>
                                <div className="space-y-1">
                                  <div>Colegio: <strong className="text-white">{lastInvitedSchool || "Colegio Seleccionado"}</strong></div>
                                  <div>Curso: <strong className="text-white">Nivel {lastInvitedLevel + 1}</strong></div>
                                  <div>Correo: <strong className="text-[#a5b4fc] font-mono">{lastInvitedEmail}</strong></div>
                                </div>
                              </div>

                              <p className="text-gray-400">Presioná el botón de abajo para activar tu cuenta escolar y configurar tu clave de acceso:</p>

                              <div className="text-center py-2">
                                <span className="inline-block bg-[#4f46e5] text-[#ffffff] font-extrabold rounded-lg px-5 py-2 text-[10px] uppercase tracking-wider border border-indigo-500 shadow-md font-sans">
                                  Comenzar Aprendizaje
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-2 border-t border-white/5 light:border-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        setStudentModalOpen(false);
                        setShowInviteSuccess(false);
                        setEditingStudent(null);
                        setShowEmailPreview(false);
                      }}
                      className="w-full py-2.5 bg-[#121226] hover:bg-[#181836] light:bg-[#f3f4f6] light:hover:bg-neutral-200 text-gray-400 light:text-neutral-700 rounded-xl text-xs font-semibold cursor-pointer text-center select-none"
                    >
                      Entendido, Volver al Listado
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveStudentSubmit}>
                  <div className="p-6 border-b border-white/5 light:border-neutral-200 flex justify-between items-center bg-white/[0.02] light:bg-neutral-50/50">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-violet-400 light:text-violet-600 font-mono">
                        Gestión del Cuerpo Estudiantil
                      </span>
                      <h3 className="text-white light:text-neutral-900 font-sans font-bold text-base mt-1">
                        {editingStudent ? 'Modificar Matrícula / Nivel' : 'Añadir / Invitar Alumno'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentModalOpen(false);
                        setEditingStudent(null);
                      }}
                      className="w-8 h-8 rounded-lg bg-white/5 light:bg-neutral-100 text-gray-400 light:text-neutral-500 hover:text-white light:hover:text-neutral-800 flex items-center justify-center text-sm cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Alerta de Error en el Modal */}
                    {studentModalError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-red-300 light:bg-red-50 light:border-red-300/40 light:text-red-900 text-xs leading-relaxed flex gap-2">
                        <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
                        <span>{studentModalError}</span>
                      </div>
                    )}

                    {/* Nombre completo */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-400 light:text-neutral-500 tracking-wider block mb-1">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        required
                        value={studentFormName}
                        onChange={(e) => setStudentFormName(e.target.value)}
                        placeholder="Ej: Martina Gómez"
                        className="w-full px-3 py-2 bg-neutral-950/60 light:bg-white border border-white/10 light:border-neutral-200 rounded-lg text-white light:text-neutral-800 text-xs focus:outline-none focus:border-violet-500 transition-colors shadow-inner"
                      />
                    </div>

                    {/* Correo escolar/regular */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-400 light:text-neutral-500 tracking-wider block mb-1">
                        Correo Electrónico (Login)
                      </label>
                      <input
                        type="email"
                        required
                        disabled={editingStudent !== null}
                        value={studentFormEmail}
                        onChange={(e) => setStudentFormEmail(e.target.value)}
                        placeholder="alumno@colegio.edu.ar"
                        className="w-full px-3 py-2 bg-neutral-950/60 light:bg-white border border-white/10 light:border-neutral-200 rounded-lg text-white light:text-neutral-800 text-xs focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-inner"
                      />
                      {editingStudent && (
                        <p className="text-[10px] text-gray-500 mt-1 font-medium italic">
                          El correo identifica la matrícula y no puede modificarse.
                        </p>
                      )}
                    </div>

                    {/* Escuela / Colegio */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-400 light:text-neutral-500 tracking-wider block mb-1">
                        Colegio Asociado
                      </label>
                      <select
                        value={studentFormSchool}
                        onChange={(e) => setStudentFormSchool(e.target.value)}
                        className="w-full px-3 py-2.5 bg-neutral-950/60 light:bg-white border border-white/10 light:border-neutral-200 rounded-lg text-white light:text-neutral-800 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                      >
                        {ASSOCIATED_SCHOOLS.map((school) => (
                          <option key={school} value={school} className="bg-neutral-950 text-white light:bg-white light:text-neutral-800">
                            {school}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Nivel de Estudio */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-400 light:text-neutral-500 tracking-wider block mb-1">
                        Nivel Fintly Permitido (Trayecto Activo)
                      </label>
                      <select
                        value={studentFormLevel}
                        onChange={(e) => setStudentFormLevel(Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-neutral-950/60 light:bg-white border border-white/10 light:border-neutral-200 rounded-lg text-white light:text-neutral-800 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                      >
                        {COURSES.map((course) => (
                          <option key={course.id} value={course.id} className="bg-neutral-950 text-white light:bg-white light:text-neutral-800 flex justify-between">
                            Nivel {course.id}: {course.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-white/2 light:bg-neutral-50 border-t border-white/5 light:border-neutral-200 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={isSavingStudent}
                      onClick={() => {
                        setStudentModalOpen(false);
                        setEditingStudent(null);
                      }}
                      className="px-4 py-2 border border-white/5 light:border-neutral-200 text-gray-400 light:text-neutral-500 text-xs font-semibold rounded-lg hover:text-white light:hover:text-neutral-800 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingStudent}
                      className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold rounded-lg cursor-pointer transform active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 select-none"
                    >
                      {isSavingStudent && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{editingStudent ? 'Guardar Cambios' : 'Invitar y Registrar'}</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>

    {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE CLASE */}
    <AnimatePresence>
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="bg-[#0f0f20] light:bg-white border border-red-500/25 light:border-neutral-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative"
          >
            <div className="p-6 pb-4 border-b border-white/5 light:border-neutral-100 flex items-start gap-3 bg-red-500/5 light:bg-red-50/20">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white light:text-neutral-900 font-sans font-bold text-base">
                  ¿Confirmar eliminación?
                </h3>
                <p className="text-gray-400 light:text-neutral-500 text-xs mt-1">
                  Esta acción es irreversible y podría causar pérdida de datos.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-black/20 light:bg-neutral-50 p-4 rounded-xl border border-white/5 light:border-neutral-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400 light:text-neutral-500 font-medium font-mono uppercase tracking-[0.05em] text-[10px]">Ámbito:</span>
                  <span className="text-white light:text-neutral-800 font-semibold font-mono">
                    {deleteConfirmation.isSyllabus ? 'Syllabus Académico' : 'Asignación Escolar'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 light:text-neutral-500 font-medium font-mono uppercase tracking-[0.05em] text-[10px]">Semana / Nivel:</span>
                  <span className="text-white light:text-neutral-800 font-medium">
                    Semana {deleteConfirmation.week} · Nivel {deleteConfirmation.level}
                  </span>
                </div>
                {deleteConfirmation.school && (
                  <div className="flex flex-col gap-0.5 mt-1 pt-2 border-t border-white/5 light:border-neutral-200">
                    <span className="text-gray-400 light:text-neutral-500 font-medium font-mono uppercase tracking-[0.05em] text-[10px]">Institución:</span>
                    <span className="text-violet-400 light:text-violet-700 font-semibold">
                      {deleteConfirmation.school}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-0.5 mt-1 pt-2 border-t border-white/5 light:border-neutral-200">
                  <span className="text-gray-400 light:text-neutral-500 font-medium font-mono uppercase tracking-[0.05em] text-[10px]">Nombre de Clase:</span>
                  <span className="text-white light:text-neutral-800 font-medium italic">
                    "{deleteConfirmation.title}"
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-gray-505 light:text-neutral-500 leading-relaxed font-sans mt-2">
                ⚠️ <strong className="text-gray-300 light:text-neutral-700">Importante:</strong> Al eliminar esta clase, se quitará del acceso de los alumnos y <strong className="text-red-400 light:text-red-600 font-semibold">todas las entregas/respuestas</strong> que los estudiantes hayan enviado para esta clase también se limpiarán permanentemente de la base de datos Firestore.
              </p>
            </div>

            <div className="p-4 bg-white/[0.01] light:bg-[#fbfbfb] border-t border-white/5 light:border-neutral-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 bg-white/5 light:bg-neutral-100 hover:bg-white/10 dark:hover:bg-white/5 text-gray-400 light:text-neutral-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteClass(
                    deleteConfirmation.level,
                    deleteConfirmation.week,
                    deleteConfirmation.school,
                    deleteConfirmation.id
                  );
                  setDeleteConfirmation(null);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg cursor-pointer transform active:scale-95 transition-all text-center flex items-center gap-1.5 shadow-md shadow-red-900/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar definitivamente</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </div>
  );
}

function PausedUserRow({ 
  user, 
  onApprove, 
  onDelete, 
  associatedSchools 
}: { 
  key?: string;
  user: User; 
  onApprove?: (email: string, targetRole: 'alumno' | 'directivo' | 'admin', level?: number, school?: string) => void | Promise<void>;
  onDelete?: (email: string) => void | Promise<void>;
  associatedSchools: string[];
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [targetRole, setTargetRole] = useState<'alumno' | 'directivo' | 'admin'>('alumno');
  const [targetSchool, setTargetSchool] = useState(associatedSchools[0]);
  const [targetLevel, setTargetLevel] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirmApprove = async () => {
    if (!onApprove) return;
    setIsSaving(true);
    try {
      await onApprove(user.email, targetRole, targetRole === 'alumno' ? targetLevel : undefined, targetSchool);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-neutral-900/80 light:bg-white border border-white/5 light:border-neutral-200 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-violet-500/20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
          {user.initials || user.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="font-semibold text-white light:text-neutral-900 text-sm flex items-center gap-2">
            <span>{user.name}</span>
            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold uppercase rounded font-mono">
              Solicitante
            </span>
          </div>
          <div className="text-gray-400 light:text-neutral-500 text-xs font-mono mt-0.5">{user.email}</div>
        </div>
      </div>

      {!isConfirming ? (
        <div className="flex items-center gap-2 self-end md:self-auto">
          {onDelete && (
            <button
              onClick={() => {
                if (confirm(`¿Estás seguro de que deseas declinar el acceso de ${user.name}?`)) {
                  onDelete(user.email);
                }
              }}
              className="px-3.5 py-1.5 border border-red-500/20 hover:bg-red-500/10 text-red-400 text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-all"
            >
              Declinar
            </button>
          )}
          <button
            onClick={() => setIsConfirming(true)}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-all flex items-center gap-1.5"
          >
            Aprobar Acceso
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 bg-neutral-950/50 light:bg-neutral-50 p-4 rounded-xl border border-white/5 light:border-neutral-200 w-full md:w-auto">
          <div className="flex flex-wrap gap-3 w-full sm:w-auto items-end">
            {/* Seleccionar Rol */}
            <div className="flex-1 sm:flex-initial min-w-[120px]">
              <label className="text-[9px] font-bold uppercase text-gray-500 block mb-0.5">Rol de Destino</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
                className="w-full px-2 py-1.5 bg-neutral-900 border border-white/10 text-white text-xs rounded focus:outline-none dark:bg-neutral-950 light:bg-white light:text-neutral-800 light:border-neutral-200"
              >
                <option value="alumno">Alumno</option>
                <option value="directivo">Profe / Directivo</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* Configurar Colegio si es alumno o Directivo */}
            {targetRole !== 'admin' ? (
              <div className="flex-1 sm:flex-initial min-w-[160px]">
                <label className="text-[9px] font-bold uppercase text-gray-500 block mb-0.5">
                  {targetRole === 'directivo' ? 'Colegio del Profe' : 'Asignar Institución'}
                </label>
                <select
                  value={targetSchool}
                  onChange={(e) => setTargetSchool(e.target.value)}
                  className="w-full px-2 py-1.5 bg-neutral-900 border border-white/10 text-white text-xs rounded focus:outline-none dark:bg-neutral-950 light:bg-white light:text-neutral-800 light:border-neutral-200"
                >
                  {associatedSchools.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex-1 sm:flex-initial flex items-center justify-center h-8 px-3 bg-violet-600/10 border border-violet-500/20 rounded text-[9px] text-violet-400 font-mono font-bold tracking-wider uppercase">
                Acceso Global (Admin)
              </div>
            )}

            {/* Curso / Nivel si es alumno */}
            {targetRole === 'alumno' && (
              <div className="flex-1 sm:flex-initial min-w-[100px]">
                <label className="text-[9px] font-bold uppercase text-gray-500 block mb-0.5">Nivel Fintly</label>
                <select
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-neutral-900 border border-white/10 text-white text-xs rounded focus:outline-none dark:bg-neutral-950 light:bg-white light:text-neutral-800 light:border-neutral-200"
                >
                  <option value={1}>Nivel 1</option>
                  <option value={2}>Nivel 2</option>
                  <option value={3}>Nivel 3</option>
                  <option value={4}>Nivel 4</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsConfirming(false)}
              disabled={isSaving}
              className="px-2.5 py-1.5 text-gray-400 hover:text-white text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmApprove}
              disabled={isSaving}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-40"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
