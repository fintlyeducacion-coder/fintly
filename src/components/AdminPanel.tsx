import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, BookOpen, Trash2, Users, School, ChevronRight, CheckCircle2, Clock,
  ChevronDown, Check, TrendingUp, Sparkles, UserCheck, UserX, AlertCircle,
  BarChart3, Award, Calendar, Layers, ShieldAlert, ArrowUpRight,
  AlertTriangle, ArrowLeft, Search
} from 'lucide-react';
import { ClassItem, Student, ActivitySubmission, User } from '../types';
import ClassModal from './ClassModal';
import { COURSES, ASSOCIATED_SCHOOLS } from '../data';

interface AdminPanelProps {
  classes: ClassItem[];
  students: Student[];
  submissions: ActivitySubmission[];
  allUsers?: User[];
  onSaveClass: (cl: ClassItem, oldKey?: { level: number; module?: number; week: number }) => void | Promise<void>;
  onDeleteClass: (level: number, week: number, school?: string, id?: string, module?: number) => void;
  onAssignClass: (sourceClass: ClassItem, schools: string[], unlockAt: string, deadline: string) => void;
  onApproveUser?: (email: string, targetRole: 'alumno' | 'directivo', level?: number, school?: string) => void | Promise<void>;
  onDeleteUser?: (email: string) => void | Promise<void>;
  /** Migración: renombra un colegio en clases, usuarios y alumnos. */
  onRenameSchool?: (viejo: string, nuevo: string) => Promise<{ clases: number; usuarios: number; alumnos: number }>;
}

export default function AdminPanel({
  classes,
  students,
  submissions,
  allUsers = [],
  onSaveClass,
  onDeleteClass,
  onAssignClass,
  onApproveUser,
  onDeleteUser,
  onRenameSchool
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'negocio' | 'clases' | 'aprobaciones'>('negocio');

  // Biblioteca / Syllabus state
  const [selectedSyllabusLevel, setSelectedSyllabusLevel] = useState<number>(0);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  // Aprobación de usuarios state
  const [approvalRoles, setApprovalRoles] = useState<Record<string, 'alumno' | 'directivo'>>({});
  const [approvalLevels, setApprovalLevels] = useState<Record<string, number>>({});
  const [approvalSchools, setApprovalSchools] = useState<Record<string, string>>({});

  // Edicion inline de un usuario ya habilitado (colegio y nivel)
  // Vista de usuarios: null = listado de colegios; string = adentro de uno
  const [colegioAbierto, setColegioAbierto] = useState<string | null>(null);

  // Migración de nombre de colegio (herramienta de mantenimiento)
  const [migrarDe, setMigrarDe] = useState('');
  const [migrarA, setMigrarA] = useState('');
  const [migrando, setMigrando] = useState(false);
  const [resultadoMigracion, setResultadoMigracion] = useState<string | null>(null);

  const ejecutarMigracion = async () => {
    if (!onRenameSchool || !migrarDe.trim() || !migrarA.trim()) return;
    setMigrando(true);
    setResultadoMigracion(null);
    try {
      const r = await onRenameSchool(migrarDe.trim(), migrarA.trim());
      setResultadoMigracion(
        `Listo: ${r.clases} clase(s), ${r.usuarios} usuario(s) y ${r.alumnos} alumno(s) actualizados.`
      );
      setMigrarDe('');
      setMigrarA('');
    } catch (e: any) {
      console.error('Falló la migración de colegio:', e);
      setResultadoMigracion('Error: ' + (e?.message || 'no se pudo completar'));
    } finally {
      setMigrando(false);
    }
  };
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editSchool, setEditSchool] = useState<string>('');
  const [editLevel, setEditLevel] = useState<number>(0);

  const abrirEdicion = (u: User) => {
    setEditingUser(u.email);
    setEditSchool(ASSOCIATED_SCHOOLS.includes(u.school || '') ? (u.school as string) : ASSOCIATED_SCHOOLS[0]);
    setEditLevel(u.level ?? 0);
  };

  const guardarEdicion = async (u: User) => {
    if (!onApproveUser) return;
    // Reutilizamos el flujo de aprobacion: ya escribe rol, nivel y colegio en users y students
    await onApproveUser(u.email, u.role as 'alumno' | 'directivo', editLevel, editSchool);
    setEditingUser(null);
  };
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // ─── CÁLCULOS DE MÉTRICAS DE NEGOCIO Y EFECTIVIDAD ─────────────────────────
  const now = new Date();
  const totalStudentsCount = students.length;
  
  // Colegios activos (colegios con al menos 1 alumno)
  const activeSchoolsSet = new Set(
    students.map(s => s.school?.trim().toLowerCase()).filter(Boolean)
  );
  const activeSchoolsCount = activeSchoolsSet.size || ASSOCIATED_SCHOOLS.length;

  // Usuarios pendientes de aprobación (role === 'pausado')
  const pendingUsers = allUsers.filter(u => u.role === 'pausado');
  const activeUsers = allUsers.filter(u => u.role !== 'pausado');

  // Clases con deadline vencido a hoy
  const pastDeadlineClasses = classes.filter(cl => !cl.isSyllabus && cl.deadline && now > new Date(cl.deadline));

  // Cálculo de entregas esperadas para clases vencidas:
  // Para cada alumno, cuántas clases vencidas corresponden a su nivel y colegio
  let totalExpectedDueSubmissions = 0;
  let totalOnTimeSubmissions = 0;
  let totalDoneSubmissionsForDueClasses = 0;

  students.forEach(student => {
    const studentSchool = student.school?.toLowerCase() || '';
    const dueForStudent = pastDeadlineClasses.filter(cl => 
      cl.level === student.level && 
      (cl.school?.toLowerCase() === studentSchool || !cl.school)
    );

    totalExpectedDueSubmissions += dueForStudent.length;

    dueForStudent.forEach(cl => {
      const studentSub = submissions.find(sub => 
        sub.studentEmail.toLowerCase() === (student.email || '').toLowerCase() &&
        sub.classLevel === cl.level &&
        sub.classWeek === cl.week &&
        (sub.classModule === undefined || sub.classModule === (cl.module ?? 1))
      );

      if (studentSub) {
        totalDoneSubmissionsForDueClasses++;
        // On-time check: entregado antes o en la fecha del deadline
        if (cl.deadline && new Date(studentSub.submittedAt) <= new Date(cl.deadline)) {
          totalOnTimeSubmissions++;
        }
      }
    });
  });

  // Efectividad de completado a tiempo: % de entregas hechas ANTES del deadline
  const onTimeEffectivenessPct = totalExpectedDueSubmissions > 0
    ? Math.round((totalOnTimeSubmissions / totalExpectedDueSubmissions) * 100)
    : 100;

  // Efectividad de entrega total: % de entregas hechas en algún momento (a tiempo o tarde)
  const totalDeliveryEffectivenessPct = totalExpectedDueSubmissions > 0
    ? Math.round((totalDoneSubmissionsForDueClasses / totalExpectedDueSubmissions) * 100)
    : 100;

  // Progreso promedio general
  const overallAvgProgress = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + ((s.progress / (s.total || 1)) * 100), 0) / students.length)
    : 0;

  // Métricas por colegio
  const schoolMetrics = ASSOCIATED_SCHOOLS.map(schoolName => {
    const schoolStudents = students.filter(s => s.school?.toLowerCase() === schoolName.toLowerCase());
    const schoolStudentCount = schoolStudents.length;
    const avgProg = schoolStudentCount > 0
      ? Math.round(schoolStudents.reduce((acc, s) => acc + ((s.progress / (s.total || 1)) * 100), 0) / schoolStudentCount)
      : 0;
    
    // Alumnos al día vs atrasados
    const okCount = schoolStudents.filter(s => s.status === 'ok').length;
    const warnCount = schoolStudents.filter(s => s.status === 'warn').length;

    return {
      name: schoolName,
      studentCount: schoolStudentCount,
      avgProgress: avgProg,
      okCount,
      warnCount
    };
  });

  // ─── HANDLERS DE BIBLIOTECA ───────────────────────────────────────────────
  const handleEditClass = (cl: ClassItem) => {
    setEditingClass(cl);
    setModalOpen(true);
  };

  const handleCreateSyllabusClass = (level: number, mod: number) => {
    const moduleClasses = classes.filter(cl =>
      cl.isSyllabus && cl.level === level && cl.module === mod
    );
    const usedWeeks = moduleClasses.map(cl => cl.week);
    let nextWeek = 1;
    for (let w = 1; w <= 8; w++) {
      if (!usedWeeks.includes(w)) {
        nextWeek = w;
        break;
      }
    }

    setEditingClass({
      level,
      module: mod,
      week: nextWeek,
      title: '',
      unlockAt: new Date().toISOString().substring(0, 16),
      deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().substring(0, 16),
      text: '',
      videoId: '',
      slidesUrl: '',
      actTitle: '',
      actDesc: '',
      isSyllabus: true
    });
    setModalOpen(true);
  };

  const handleSaveModal = async (cl: ClassItem, keepOpen?: boolean) => {
    const scopedItem: ClassItem = {
      ...cl,
      isSyllabus: true,
      school: undefined
    };

    if (editingClass && editingClass.title) {
      await onSaveClass(scopedItem, { level: editingClass.level, module: editingClass.module, week: editingClass.week });
    } else {
      await onSaveClass(scopedItem);
    }

    if (!keepOpen) {
      setModalOpen(false);
      setEditingClass(null);
    }
  };

  // ─── HANDLERS DE USUARIOS ─────────────────────────────────────────────────
  const handleApprove = async (email: string) => {
    const role = approvalRoles[email] || 'alumno';
    const level = approvalLevels[email] ?? 0;
    const school = approvalSchools[email] || ASSOCIATED_SCHOOLS[0];

    setProcessingUser(email);
    try {
      if (onApproveUser) {
        await onApproveUser(email, role, level, school);
      }
    } catch (e) {
      console.error("Error approving user:", e);
    } finally {
      setProcessingUser(null);
    }
  };

  const handleDelete = async (email: string) => {
    if (!window.confirm(`¿Estás seguro de rechazar/eliminar el usuario ${email}?`)) return;
    setProcessingUser(email);
    try {
      if (onDeleteUser) {
        await onDeleteUser(email);
      }
    } catch (e) {
      console.error("Error deleting user:", e);
    } finally {
      setProcessingUser(null);
    }
  };

  // Filtrado de usuarios en pestaña
  const filteredPending = pendingUsers.filter(u => 
    u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  /**
   * Agrupamos a los usuarios habilitados por colegio.
   * Los admin no pertenecen a ninguna institución, así que van aparte,
   * junto con quien todavía no tenga colegio asignado.
   */
  const equipoFintly = activeUsers.filter(u => u.role === 'admin');
  const sinColegio = activeUsers.filter(
    u => u.role !== 'admin' && (!u.school || !ASSOCIATED_SCHOOLS.includes(u.school))
  );

  const porColegio = ASSOCIATED_SCHOOLS.map(colegio => {
    const gente = activeUsers.filter(u => u.role !== 'admin' && u.school === colegio);
    return {
      colegio,
      alumnos: gente.filter(u => u.role === 'alumno'),
      directivos: gente.filter(u => u.role === 'directivo'),
      total: gente.length,
    };
  });

  // Dentro de un colegio, la búsqueda filtra solo a su gente
  const genteDelColegioAbierto = colegioAbierto === '__equipo__'
    ? equipoFintly
    : colegioAbierto === '__sin__'
    ? sinColegio
    : activeUsers.filter(u => u.role !== 'admin' && u.school === colegioAbierto);

  const genteVisible = genteDelColegioAbierto.filter(u =>
    u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredActive = activeUsers.filter(u =>
    u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (u.school && u.school.toLowerCase().includes(userSearchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 light:border-neutral-200 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white light:text-neutral-900">
              Campus <span className="gradient-text-brand">Admin</span>
            </h1>
            <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Gestión & Negocio
            </span>
          </div>
          <p className="text-gray-400 light:text-neutral-500 text-xs">
            Supervisión integral del negocio, aprobación de cuentas y biblioteca de contenidos.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex w-full sm:w-auto sm:self-start max-w-full bg-[#14132b]/40 light:bg-neutral-100/80 backdrop-blur-xl p-1 rounded-2xl border border-white/5 light:border-neutral-200 gap-1 relative z-10 shadow-lg">
          {([
            { key: 'negocio', label: 'Dashboard Negocio', corto: 'Negocio', icon: BarChart3, alert: false },
            { key: 'clases', label: 'Biblioteca Syllabus', corto: 'Biblioteca', icon: BookOpen, alert: false },
            { key: 'aprobaciones', label: `Aprobaciones (${pendingUsers.length})`, corto: `Cuentas (${pendingUsers.length})`, icon: UserCheck, alert: pendingUsers.length > 0 },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-2 sm:px-4 py-3 sm:py-2.5 text-[11px] sm:text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 cursor-pointer ${
                  isActive ? 'text-white' : 'text-gray-400 light:text-neutral-500 hover:text-gray-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeAdminPill"
                    className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-950/40 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 relative z-10 shrink-0" />
                <span className="relative z-10 sm:hidden">{tab.corto}</span>
                <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                {tab.alert && !isActive && (
                  <span className="relative z-10 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Sections */}
      <AnimatePresence mode="wait">
        {/* ═══ TAB 1: DASHBOARD DE NEGOCIO ════════════════════════════════════ */}
        {activeTab === 'negocio' && (
          <motion.div
            key="business-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-violet-500/20 bg-white/[0.02] light:bg-white p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Total Alumnos</span>
                  <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-bold font-display text-white light:text-neutral-900">{totalStudentsCount}</span>
                  <p className="text-[11px] text-gray-500 light:text-neutral-400 mt-0.5">En todos los colegios</p>
                </div>
              </div>

              <div className="rounded-2xl border border-sky-500/20 bg-white/[0.02] light:bg-white p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Colegios Activos</span>
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                    <School className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-bold font-display text-white light:text-neutral-900">{activeSchoolsCount}</span>
                  <p className="text-[11px] text-gray-500 light:text-neutral-400 mt-0.5">Instituciones vinculadas</p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-white/[0.02] light:bg-white p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Progreso Promedio</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-bold font-display text-emerald-400 light:text-emerald-600">{overallAvgProgress}%</span>
                  <p className="text-[11px] text-gray-500 light:text-neutral-400 mt-0.5">Completitud del campus</p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-white/[0.02] light:bg-white p-5 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Por Aprobar</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-bold font-display text-amber-400 light:text-amber-600">{pendingUsers.length}</span>
                  <p className="text-[11px] text-gray-500 light:text-neutral-400 mt-0.5">Usuarios en revisión</p>
                </div>
              </div>
            </div>

            {/* Dos Tasas de Efectividad de Entregas (Calculadas sobre actividades con deadline vencido) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-white/5 light:border-neutral-200 bg-[#121124]/40 light:bg-white p-6 shadow-md relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                      Puntualidad de Entregas
                    </span>
                    <h3 className="text-lg font-bold text-white light:text-neutral-900 mt-0.5">
                      Efectividad a Tiempo
                    </h3>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-sm">
                    {onTimeEffectivenessPct}%
                  </div>
                </div>
                <p className="text-xs text-gray-400 light:text-neutral-500 mb-4 leading-relaxed">
                  Porcentaje de entregas realizadas <strong>antes o en la fecha límite</strong> sobre todas las actividades académicas con deadline vencido.
                </p>
                <div className="w-full h-2.5 rounded-full bg-neutral-800 light:bg-neutral-200 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(0, onTimeEffectivenessPct))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-gray-500 mt-2">
                  <span>A tiempo: {totalOnTimeSubmissions}</span>
                  <span>Exigidas: {totalExpectedDueSubmissions}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 light:border-neutral-200 bg-[#121124]/40 light:bg-white p-6 shadow-md relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 block">
                      Cumplimiento Global
                    </span>
                    <h3 className="text-lg font-bold text-white light:text-neutral-900 mt-0.5">
                      Efectividad de Entrega Total
                    </h3>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono font-bold text-sm">
                    {totalDeliveryEffectivenessPct}%
                  </div>
                </div>
                <p className="text-xs text-gray-400 light:text-neutral-500 mb-4 leading-relaxed">
                  Porcentaje de entregas completadas en algún momento (tanto a tiempo como tarde) respecto a las clases con fecha vencida.
                </p>
                <div className="w-full h-2.5 rounded-full bg-neutral-800 light:bg-neutral-200 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(0, totalDeliveryEffectivenessPct))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-gray-500 mt-2">
                  <span>Entregadas: {totalDoneSubmissionsForDueClasses}</span>
                  <span>Exigidas: {totalExpectedDueSubmissions}</span>
                </div>
              </div>
            </div>

            {/* Desglose por Colegio */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-violet-400">
                    Distribución Institucional
                  </span>
                  <h3 className="text-base font-bold text-white light:text-neutral-900">
                    Alumnos y Progreso por Colegio
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {schoolMetrics.map(sc => (
                  <div
                    key={sc.name}
                    className="rounded-2xl border border-white/5 light:border-neutral-200 bg-[#121124]/30 light:bg-white p-5 hover:border-violet-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                          <School className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white light:text-neutral-900 text-sm">{sc.name}</h4>
                          <span className="text-[11px] text-gray-500 font-mono">{sc.studentCount} alumnos</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">{sc.avgProgress}%</span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-neutral-800 light:bg-neutral-200 overflow-hidden mb-3">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${sc.avgProgress}%` }} />
                    </div>

                    <div className="flex justify-between text-[10px] font-mono text-gray-400">
                      <span className="text-emerald-400/90">{sc.okCount} al día</span>
                      <span className="text-amber-400/90">{sc.warnCount} con pendientes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ TAB 2: BIBLIOTECA DE CONTENIDO / SYLLABUS ═════════════════════ */}
        {activeTab === 'clases' && (
          <motion.div
            key="classes-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5 light:border-neutral-200">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-violet-400 font-mono">
                  Gestión de Contenidos Base
                </span>
                <h2 className="text-lg font-bold text-white light:text-neutral-900 mt-0.5">
                  Biblioteca Syllabus
                </h2>
                <p className="text-xs text-gray-400 light:text-neutral-500">
                  Estructura las clases del programa general y asígnalas a los colegios.
                </p>
              </div>
            </div>

            {/* Level Selector */}
            <div className="flex bg-[#14132b]/40 light:bg-neutral-100 p-1 rounded-2xl border border-white/5 light:border-neutral-200 gap-1 max-w-full overflow-x-auto no-scrollbar">
              {COURSES.map(course => (
                <button
                  key={course.id}
                  onClick={() => { setSelectedSyllabusLevel(course.id); setSelectedModule(null); }}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-all ${
                    selectedSyllabusLevel === course.id
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-gray-400 light:text-neutral-600 hover:text-white'
                  }`}
                >
                  Nivel {course.id} · {course.name}
                </button>
              ))}
            </div>

            {/* Modules Grid */}
            {selectedModule === null ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(mod => {
                  const modClasses = classes.filter(cl => cl.isSyllabus && cl.level === selectedSyllabusLevel && cl.module === mod);
                  return (
                    <div
                      key={mod}
                      onClick={() => setSelectedModule(mod)}
                      className="liquid-glass rounded-2xl p-6 cursor-pointer hover:border-violet-500/40 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-violet-400">
                          Módulo {mod}
                        </span>
                        <h3 className="font-bold text-white light:text-neutral-900 text-base mt-1">
                          Bloque Pedagógico {mod}
                        </h3>
                        <p className="text-xs text-gray-400 light:text-neutral-500 mt-1">
                          {modClasses.length} clases estructuradas
                        </p>
                      </div>
                      <div className="flex items-center text-xs text-violet-400 font-semibold gap-1">
                        <span>Ver clases del módulo</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedModule(null)}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>← Volver a los módulos</span>
                  </button>
                  <button
                    onClick={() => handleCreateSyllabusClass(selectedSyllabusLevel, selectedModule)}
                    className="liquid-glass-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Clase en Módulo {selectedModule}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {classes
                    .filter(cl => cl.isSyllabus && cl.level === selectedSyllabusLevel && cl.module === selectedModule)
                    .sort((a, b) => a.week - b.week)
                    .map(cl => (
                      <div
                        key={`${cl.level}-${cl.week}`}
                        className="liquid-glass rounded-xl p-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center font-mono font-bold text-xs">
                            S{cl.week}
                          </div>
                          <div>
                            <h4 className="font-bold text-white light:text-neutral-900 text-sm">{cl.title || 'Clase sin título'}</h4>
                            <span className="text-[11px] text-gray-500 font-mono">
                              {cl.actTitle ? `Actividad: ${cl.actTitle}` : 'Sin actividad práctica'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClass(cl)}
                            className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-gray-300 hover:text-white cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => onDeleteClass(cl.level, cl.week, undefined, cl.id, cl.module)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                            title="Eliminar clase"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ TAB 3: APROBACIÓN DE USUARIOS (EXCLUSIVO ADMIN) ═══════════════ */}
        {activeTab === 'aprobaciones' && (
          <motion.div
            key="approvals-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5 light:border-neutral-200">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-violet-400 font-mono">
                  Control de Accesos • Exclusivo Administrador
                </span>
                <h2 className="text-lg font-bold text-white light:text-neutral-900 mt-0.5">
                  Aprobación de Usuarios Pendientes
                </h2>
                <p className="text-xs text-gray-400 light:text-neutral-500">
                  Habilita cuentas registradas asignándoles rol (<strong className="text-violet-300">Alumno</strong> o <strong className="text-indigo-300">Directivo</strong>), nivel y colegio.
                </p>
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Buscar usuario o email..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] light:bg-white border border-white/10 light:border-neutral-200 text-xs text-white light:text-neutral-900 placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Pendientes de Aprobación */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white light:text-neutral-900 uppercase tracking-wide">
                  En espera de aprobación ({filteredPending.length})
                </h3>
              </div>

              {filteredPending.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-8 text-center text-gray-500 text-xs">
                  No hay usuarios pendientes de aprobación en este momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPending.map(u => {
                    const selectedRole = approvalRoles[u.email] || 'alumno';
                    const selectedLevel = approvalLevels[u.email] ?? 0;
                    const selectedSchool = approvalSchools[u.email] || ASSOCIATED_SCHOOLS[0];
                    const isProcessing = processingUser === u.email;

                    return (
                      <div
                        key={u.email}
                        className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] light:bg-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white light:text-neutral-900 text-sm">{u.name}</span>
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-mono text-[10px] uppercase font-bold border border-amber-500/20">
                              Pendiente
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 light:text-neutral-500 font-mono mt-0.5">{u.email}</p>
                        </div>

                        {/* Controls: Role, Level, School */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* Role Selector: ONLY 'alumno' or 'directivo' */}
                          <select
                            value={selectedRole}
                            onChange={e => setApprovalRoles(prev => ({ ...prev, [u.email]: e.target.value as 'alumno' | 'directivo' }))}
                            className="px-3 py-1.5 rounded-xl bg-neutral-900 light:bg-neutral-100 border border-white/10 light:border-neutral-300 text-xs text-white light:text-neutral-900 font-medium"
                          >
                            <option value="alumno">Rol: Alumno</option>
                            <option value="directivo">Rol: Directivo</option>
                          </select>

                          {/* Level Selector (solo si es alumno) */}
                          {selectedRole === 'alumno' && (
                            <select
                              value={selectedLevel}
                              onChange={e => setApprovalLevels(prev => ({ ...prev, [u.email]: Number(e.target.value) }))}
                              className="px-3 py-1.5 rounded-xl bg-neutral-900 light:bg-neutral-100 border border-white/10 light:border-neutral-300 text-xs text-white light:text-neutral-900 font-medium"
                            >
                              {COURSES.map(c => (
                                <option key={c.id} value={c.id}>Nivel {c.id}</option>
                              ))}
                            </select>
                          )}

                          {/* School Selector */}
                          <select
                            value={selectedSchool}
                            onChange={e => setApprovalSchools(prev => ({ ...prev, [u.email]: e.target.value }))}
                            className="px-3 py-1.5 rounded-xl bg-neutral-900 light:bg-neutral-100 border border-white/10 light:border-neutral-300 text-xs text-white light:text-neutral-900 font-medium"
                          >
                            {ASSOCIATED_SCHOOLS.map(sc => (
                              <option key={sc} value={sc}>{sc}</option>
                            ))}
                          </select>

                          {/* Action Buttons */}
                          <button
                            onClick={() => handleApprove(u.email)}
                            disabled={isProcessing}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Aprobar</span>
                          </button>

                          <button
                            onClick={() => handleDelete(u.email)}
                            disabled={isProcessing}
                            className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-all disabled:opacity-50"
                            title="Rechazar y eliminar usuario"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Usuarios habilitados, agrupados por colegio */}
            <div className="space-y-4 pt-6 border-t border-white/5">

              {colegioAbierto === null ? (
                /* ── Listado de colegios ── */
                <>
                  <h3 className="text-sm font-bold text-white light:text-neutral-900 uppercase tracking-wide">
                    Usuarios Habilitados ({activeUsers.length})
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {porColegio.map(({ colegio, alumnos, directivos, total }) => (
                      <button
                        key={colegio}
                        onClick={() => { setColegioAbierto(colegio); setUserSearchQuery(''); }}
                        className="group text-left surface hover-lift rounded-2xl p-4 cursor-pointer flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                            <School className="w-4 h-4 text-violet-400 light:text-violet-600" />
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white light:text-neutral-900 text-sm leading-tight">
                            {colegio}
                          </h4>
                          <p className="text-[11px] text-gray-500 font-mono mt-1">
                            {total === 0
                              ? 'Sin usuarios'
                              : `${alumnos.length} alumno${alumnos.length === 1 ? '' : 's'}${
                                  directivos.length > 0
                                    ? ` · ${directivos.length} directivo${directivos.length === 1 ? '' : 's'}`
                                    : ''
                                }`}
                          </p>
                        </div>
                      </button>
                    ))}

                    {/* Equipo Fintly: los admin no pertenecen a un colegio */}
                    <button
                      onClick={() => { setColegioAbierto('__equipo__'); setUserSearchQuery(''); }}
                      className="group text-left surface hover-lift rounded-2xl p-4 cursor-pointer flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-indigo-400 light:text-indigo-600" />
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white light:text-neutral-900 text-sm leading-tight">
                          Equipo Fintly
                        </h4>
                        <p className="text-[11px] text-gray-500 font-mono mt-1">
                          {equipoFintly.length} admin{equipoFintly.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </button>

                    {/* Sin colegio: solo aparece si hay alguien, porque es un problema a resolver */}
                    {sinColegio.length > 0 && (
                      <button
                        onClick={() => { setColegioAbierto('__sin__'); setUserSearchQuery(''); }}
                        className="group text-left rounded-2xl p-4 cursor-pointer flex flex-col gap-3 bg-amber-500/[0.05] border border-amber-500/25 hover:border-amber-500/45 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="w-9 h-9 rounded-xl bg-amber-500/12 border border-amber-500/25 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-amber-400 light:text-amber-600" />
                          </span>
                          <ChevronRight className="w-4 h-4 text-amber-500/60 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white light:text-neutral-900 text-sm leading-tight">
                            Sin colegio asignado
                          </h4>
                          <p className="text-[11px] text-amber-400/80 light:text-amber-700 font-mono mt-1">
                            {sinColegio.length} usuario{sinColegio.length === 1 ? '' : 's'} · no ven clases
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* ── Adentro de un colegio ── */
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <button
                        onClick={() => { setColegioAbierto(null); setUserSearchQuery(''); }}
                        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white light:text-neutral-500 light:hover:text-neutral-800 transition-colors cursor-pointer mb-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Volver a colegios</span>
                      </button>
                      <h3 className="text-sm font-bold text-white light:text-neutral-900 uppercase tracking-wide">
                        {colegioAbierto === '__equipo__'
                          ? 'Equipo Fintly'
                          : colegioAbierto === '__sin__'
                          ? 'Sin colegio asignado'
                          : colegioAbierto}{' '}
                        ({genteDelColegioAbierto.length})
                      </h3>
                    </div>

                    {genteDelColegioAbierto.length > 3 && (
                      <div className="relative sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={e => setUserSearchQuery(e.target.value)}
                          placeholder="Buscar en este colegio…"
                          className="w-full h-9 bg-neutral-900/50 light:bg-white border border-white/10 light:border-neutral-200 rounded-xl pl-9 pr-3 text-xs text-white light:text-neutral-800"
                        />
                      </div>
                    )}
                  </div>

                  {genteVisible.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 light:border-neutral-200 py-10 text-center">
                      <p className="text-sm text-gray-400 light:text-neutral-600">
                        {genteDelColegioAbierto.length === 0
                          ? 'Todavía no hay nadie en este colegio'
                          : 'Ningún resultado para esa búsqueda'}
                      </p>
                    </div>
                  )}

              <div className="rounded-2xl border border-white/5 light:border-neutral-200 bg-neutral-900/30 light:bg-white overflow-hidden">
                <div className="divide-y divide-white/5 light:divide-neutral-100">
                  {genteVisible.map(u => (
                    <div key={u.email}>
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white light:text-neutral-900 text-sm">{u.name}</span>
                          <span className={`px-2 py-0.5 rounded-md font-mono text-[9px] uppercase font-bold ${
                            u.role === 'admin' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                            u.role === 'directivo' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-0.5">
                          <span>{u.email}</span>
                          {u.school && (
                            <>
                              <span>•</span>
                              <span>{u.school}</span>
                            </>
                          )}
                          {u.level !== undefined && u.role === 'alumno' && (
                            <>
                              <span>•</span>
                              <span>Nivel {u.level}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {u.role !== 'admin' && editingUser !== u.email && (
                          <button
                            onClick={() => abrirEdicion(u)}
                            className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-violet-500/25 text-violet-400 light:text-violet-600 hover:bg-violet-500/10 cursor-pointer transition-colors"
                            title="Cambiar colegio o nivel"
                          >
                            Editar
                          </button>
                        )}
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleDelete(u.email)}
                            className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {editingUser === u.email && (
                      <div className="px-4 pb-4 -mt-1 flex flex-col sm:flex-row sm:items-end gap-3 bg-violet-500/[0.03] light:bg-violet-50/40 pt-3 border-t border-white/5 light:border-neutral-100">
                        <label className="flex-1 min-w-0">
                          <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-1">Colegio</span>
                          <select
                            value={editSchool}
                            onChange={e => setEditSchool(e.target.value)}
                            className="w-full bg-neutral-900/60 light:bg-white border border-white/10 light:border-neutral-200 rounded-lg px-3 py-2 text-xs text-white light:text-neutral-800 cursor-pointer"
                          >
                            {ASSOCIATED_SCHOOLS.map(sc => (
                              <option key={sc} value={sc}>{sc}</option>
                            ))}
                          </select>
                        </label>

                        {u.role === 'alumno' && (
                          <label className="sm:w-40 shrink-0">
                            <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-1">Nivel</span>
                            <select
                              value={editLevel}
                              onChange={e => setEditLevel(Number(e.target.value))}
                              className="w-full bg-neutral-900/60 light:bg-white border border-white/10 light:border-neutral-200 rounded-lg px-3 py-2 text-xs text-white light:text-neutral-800 cursor-pointer"
                            >
                              {COURSES.map(c => (
                                <option key={c.id} value={c.id}>Nivel {c.id}</option>
                              ))}
                            </select>
                          </label>
                        )}

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => guardarEdicion(u)}
                            className="liquid-glass-btn px-4 py-2 text-xs"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                    </div>
                  ))}
                </div>
              </div>
                </>
              )}

              {/* ── Mantenimiento: renombrar un colegio ── */}
              {colegioAbierto === null && onRenameSchool && (
                <details className="mt-4 rounded-2xl border border-white/5 light:border-neutral-200 bg-neutral-900/20 light:bg-neutral-50/60 overflow-hidden group">
                  <summary className="px-4 py-3 cursor-pointer text-[11px] font-mono font-bold uppercase tracking-widest text-gray-500 hover:text-gray-300 light:hover:text-neutral-700 transition-colors select-none list-none flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                    Mantenimiento · Renombrar colegio
                  </summary>

                  <div className="px-4 pb-4 space-y-3 border-t border-white/5 light:border-neutral-200 pt-3">
                    <p className="text-[11px] text-gray-500 leading-relaxed max-w-2xl">
                      El nombre del colegio vincula las clases con los alumnos. Cambiarlo solo en
                      la lista dejaría a los alumnos apuntando a un colegio inexistente. Esta
                      herramienta lo renombra en las clases publicadas, en los usuarios y en los
                      alumnos, todo junto. Escribí el nombre viejo exactamente como figura hoy.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={migrarDe}
                        onChange={e => setMigrarDe(e.target.value)}
                        placeholder="Nombre actual (ej: Faro Benavides)"
                        className="flex-1 h-10 bg-neutral-900/60 light:bg-white border border-white/10 light:border-neutral-200 rounded-xl px-3 text-xs text-white light:text-neutral-800"
                      />
                      <input
                        type="text"
                        value={migrarA}
                        onChange={e => setMigrarA(e.target.value)}
                        placeholder="Nombre nuevo (ej: Faro Benavidez)"
                        className="flex-1 h-10 bg-neutral-900/60 light:bg-white border border-white/10 light:border-neutral-200 rounded-xl px-3 text-xs text-white light:text-neutral-800"
                      />
                      <button
                        onClick={ejecutarMigracion}
                        disabled={migrando || !migrarDe.trim() || !migrarA.trim()}
                        className="liquid-glass-btn px-5 h-10 text-xs shrink-0 disabled:opacity-40"
                      >
                        {migrando ? 'Migrando…' : 'Renombrar'}
                      </button>
                    </div>

                    {resultadoMigracion && (
                      <div className={`p-3 rounded-xl border text-[12px] ${
                        resultadoMigracion.startsWith('Error')
                          ? 'bg-rose-500/10 border-rose-500/25 text-rose-300 light:text-rose-700'
                          : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 light:text-emerald-700'
                      }`}>
                        {resultadoMigracion}
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Class Editor Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ClassModal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setEditingClass(null);
            }}
            onSave={handleSaveModal}
            initialClass={editingClass}
            associatedSchools={ASSOCIATED_SCHOOLS}
            onAssignClass={onAssignClass}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
