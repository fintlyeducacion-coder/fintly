import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  FileCheck, 
  BookOpenCheck, 
  TrendingUp, 
  Search, 
  ArrowLeft, 
  CheckCircle2, 
  Award, 
  MessageSquare, 
  ChevronRight, 
  ClipboardList, 
  GraduationCap, 
  School,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Student, ActivitySubmission, ClassItem, User } from '../types';
import { COURSES } from '../data';

interface StaffProgressProps {
  students: Student[];
  submissions: ActivitySubmission[];
  classes: ClassItem[];
  role: 'directivo';
  user: User;
  onSaveSubmission?: (sub: ActivitySubmission) => void;
}

const ASSOCIATED_SCHOOLS = [
  'Colegio del Faro, Sede Benavidez y Puertos',
  'Northfield Sede Puertos',
  'Northfield Sede Nordelta',
  'South Greek School',
  'Global School'
];

export default function StaffProgress({
  students,
  submissions,
  classes,
  role,
  user,
  onSaveSubmission
}: StaffProgressProps) {
  // Navigation states for teacher workflow
  const [selectedSchool, setSelectedSchool] = useState<string | null>(() => {
    return user.school || null;
  });
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  // Search and tabs inside the active level detail view
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'graded'>('pending');

  // Corrections state
  const [selectedSubmission, setSelectedSubmission] = useState<ActivitySubmission | null>(null);
  const [gradeInput, setGradeInput] = useState<'Excelente' | 'Muy bueno' | 'puede mejorar' | 'Muy bien' | 'Bien' | 'A mejorar' | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync correction fields when a submission is selected
  useEffect(() => {
    if (selectedSubmission) {
      setGradeInput(selectedSubmission.grade || null);
      setFeedbackInput(selectedSubmission.feedback || '');
    }
  }, [selectedSubmission]);

  const handleSaveGradeClick = async () => {
    if (!selectedSubmission || !gradeInput) return;
    setIsSaving(true);
    try {
      const updatedSub: ActivitySubmission = {
        ...selectedSubmission,
        grade: gradeInput,
        feedback: feedbackInput.trim(),
        correctedBy: user.email,
        correctedAt: new Date().toISOString()
      };
      await onSaveSubmission?.(updatedSub);
      setSelectedSubmission(updatedSub);
      // Wait a tiny bit for a natural transition
      setTimeout(() => {
        setSelectedSubmission(null);
        setIsSaving(false);
      }, 300);
    } catch (e) {
      console.error(e);
      setIsSaving(false);
    }
  };

  // Helper sets to trace students of a school
  const getStudentsOfSchool = (schoolName: string) => {
    return students.filter(s => s.school?.toLowerCase() === schoolName.toLowerCase());
  };

  const getSubmissionsOfSchool = (schoolName: string) => {
    const schoolStudentEmails = new Set(
      getStudentsOfSchool(schoolName).map(s => s.email?.toLowerCase().trim())
    );
    return submissions.filter(sub => schoolStudentEmails.has(sub.studentEmail?.toLowerCase().trim()));
  };

  // Render LEVEL-0: School Selector Screen
  if (!selectedSchool) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider font-mono">
            Portal Docente • Fintly Campus
          </span>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-white light:text-neutral-900 mt-1 mb-2">
            Mis Colegios Asignados
          </h1>
          <p className="text-gray-400 light:text-neutral-500 text-sm">
            Seleccioná una institución para gestionar los niveles académicos y calificar alumnos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ASSOCIATED_SCHOOLS.map((school) => {
            const schoolStudents = getStudentsOfSchool(school);
            const schoolSubmissions = getSubmissionsOfSchool(school);
            const pendingReg = schoolSubmissions.filter(sub => !sub.grade).length;
            
            // Average progress calculation
            const avgProgress = schoolStudents.length > 0
              ? Math.round((schoolStudents.reduce((acc, s) => acc + (s.progress / s.total), 0) / schoolStudents.length) * 100)
              : 0;

            return (
              <motion.div
                key={school}
                whileHover={{ scale: 1.01, y: -2 }}
                onClick={() => setSelectedSchool(school)}
                className="bg-neutral-900/60 light:bg-white border border-white/5 light:border-neutral-200 rounded-2xl p-6 cursor-pointer hover:border-violet-500/30 transition-all flex flex-col justify-between shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-violet-600/10 text-violet-400 rounded-xl">
                      <School className="w-6 h-6" />
                    </div>
                    {pendingReg > 0 ? (
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg animate-pulse uppercase">
                        {pendingReg} {pendingReg === 1 ? 'Pendiente' : 'Pendientes'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg uppercase">
                        Al día
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-sans text-lg font-semibold text-white light:text-neutral-900 leading-tight">
                      {school}
                    </h3>
                    <p className="text-xs text-gray-400 light:text-neutral-500 mt-1">
                      Gestioná el avance pedagógico de esta sede.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-6 mt-6 border-t border-white/5 light:border-neutral-100 text-center">
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase text-gray-500">Alumnos</div>
                    <div className="text-sm font-semibold text-white light:text-neutral-800 mt-1">{schoolStudents.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase text-gray-500">Respuestas</div>
                    <div className="text-sm font-semibold text-white light:text-neutral-800 mt-1">{schoolSubmissions.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase text-gray-500">Progreso</div>
                    <div className="text-sm font-semibold text-emerald-400 light:text-emerald-600 mt-1">{avgProgress}%</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render LEVEL-1: Levels of selected school
  if (selectedLevel === null) {
    const schoolStudents = getStudentsOfSchool(selectedSchool);
    const schoolSubmissions = getSubmissionsOfSchool(selectedSchool);

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Navigation Breadcrumbs / Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              {!user.school && (
                <>
                  <button 
                    onClick={() => setSelectedSchool(null)} 
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Colegios
                  </button>
                  <span>/</span>
                </>
              )}
              <span className="text-gray-300 light:text-neutral-700 font-medium">{selectedSchool}</span>
            </div>
            <h1 className="font-sans text-2xl sm:text-3xl font-bold text-white light:text-neutral-900 tracking-tight leading-tight">
              Niveles Disponibles
            </h1>
          </div>

          {!user.school && (
            <button
              onClick={() => setSelectedSchool(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:bg-white/5 light:border-neutral-200 light:hover:bg-neutral-50 rounded-lg text-xs text-gray-300 light:text-neutral-700 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cambiar Sede</span>
            </button>
          )}
        </div>

        {/* Dynamic Levels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {COURSES.map((course) => {
            const levelStudents = schoolStudents.filter(s => s.level === course.id);
            const levelSubmissions = schoolSubmissions.filter(sub => sub.classLevel === course.id);
            const pendingCorrectionCount = levelSubmissions.filter(sub => !sub.grade).length;

            return (
              <motion.div
                key={course.id}
                whileHover={{ scale: 1.01, y: -2 }}
                onClick={() => setSelectedLevel(course.id)}
                className="bg-neutral-900/60 light:bg-white border border-white/5 light:border-neutral-200 rounded-2xl p-6 cursor-pointer hover:border-violet-500/30 transition-all shadow-md relative overflow-hidden flex flex-col justify-between"
              >
                {/* Visual gradient edge indicator */}
                <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${course.accent}`} />

                <div className="pl-2 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold tracking-widest text-violet-400 accent-purple-400 block uppercase">
                        Nivel {course.id + 1}
                      </span>
                      <h3 className="font-sans text-lg font-bold text-white light:text-neutral-900 mt-1 leading-tight">
                        {course.name}
                      </h3>
                    </div>
                    {pendingCorrectionCount > 0 && (
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg uppercase animate-pulse">
                        {pendingCorrectionCount} pendientes
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 light:text-neutral-500 leading-relaxed">
                    {course.desc}
                  </p>
                </div>

                <div className="pl-2 pt-6 mt-6 border-t border-white/5 light:border-neutral-100 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex gap-4">
                    <span>
                      Alumnos: <strong className="text-white light:text-neutral-800">{levelStudents.length}</strong>
                    </span>
                    <span>
                      Respuestas: <strong className="text-white light:text-neutral-800">{levelSubmissions.length}</strong>
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // LEVEL-2: Detailed View of a selected level under a particular school
  const courseDetail = COURSES[selectedLevel];
  
  // Filter students belonging to this school and level
  const studentsInScope = students.filter(s => 
    s.school?.toLowerCase() === selectedSchool.toLowerCase() && s.level === selectedLevel
  );

  // Filter submissions by students in scope for this level
  const emailsInScope = new Set(studentsInScope.map(s => s.email?.toLowerCase().trim()));
  const submissionsInScope = submissions.filter(sub => 
    sub.classLevel === selectedLevel && emailsInScope.has(sub.studentEmail?.toLowerCase().trim())
  );

  // Split submissions into pending/graded
  const pendingSubmissions = submissionsInScope.filter(sub => !sub.grade);
  const gradedSubmissions = submissionsInScope.filter(sub => !!sub.grade);

  const displayedStudents = studentsInScope.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Dynamic Header & Breadcrumbs navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            {!user.school && (
              <>
                <button 
                  onClick={() => {
                    setSelectedSchool(null);
                    setSelectedLevel(null);
                  }} 
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Colegios
                </button>
                <span>/</span>
              </>
            )}
            <button 
              onClick={() => setSelectedLevel(null)} 
              className="hover:text-white transition-colors cursor-pointer"
            >
              Niveles ({selectedSchool.split(' ')[0]})
            </button>
            <span>/</span>
            <span className="text-gray-300 light:text-neutral-700 font-medium">Nivel {selectedLevel + 1}</span>
          </div>

          <h1 className="font-sans text-xl sm:text-2xl font-bold text-white light:text-neutral-900 flex items-center gap-2 tracking-tight">
            Nivel {selectedLevel + 1}: {courseDetail.name}
          </h1>
          <p className="text-xs text-gray-400 light:text-neutral-500 font-medium mt-0.5">
            Colegio: {selectedSchool}
          </p>
        </div>

        <button
          onClick={() => setSelectedLevel(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:bg-white/5 light:border-neutral-200 light:hover:bg-neutral-50 rounded-lg text-xs text-gray-300 light:text-neutral-700 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a Niveles</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: RESUMEN PROGRESO DE ALUMNOS (5/12) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <span>Progreso de Alumnos ({studentsInScope.length})</span>
            </h2>
          </div>

          {/* Buscador de alumnos interno */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar alumno de este curso..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-neutral-900/80 border border-white/5 light:bg-white light:border-neutral-200 rounded-xl text-white light:text-neutral-800 placeholder-gray-500 text-xs focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div className="bg-[#0a0a18]/90 light:bg-white border border-white/5 light:border-neutral-200 rounded-2xl overflow-hidden shadow-md">
            {displayedStudents.length > 0 ? (
              <div className="divide-y divide-gray-800/40 light:divide-neutral-100 max-h-[480px] overflow-y-auto no-scrollbar">
                {displayedStudents.map((s, idx) => {
                  const pct = Math.round((s.progress / s.total) * 100);
                  const isOk = s.status === 'ok';

                  return (
                    <div
                      key={idx}
                      className="p-4 items-center gap-2 hover:bg-white/[0.02] light:hover:bg-neutral-50/80 transition-colors flex justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-xs font-bold text-white flex items-center justify-center shrink-0">
                          {s.initials}
                        </div>
                        <div className="min-w-0">
                          <span className="text-white light:text-neutral-800 text-xs font-semibold block truncate">
                            {s.name}
                          </span>
                          <span className="text-[9px] text-gray-500 block truncate font-mono">
                            {s.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-end flex-col shrink-0 gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-800 light:bg-neutral-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 light:text-neutral-500 font-semibold min-w-8 text-right">
                            {pct}%
                          </span>
                        </div>

                        <span
                          className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-lg border ${
                            isOk
                              ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 light:bg-emerald-50 light:border-emerald-200 light:text-emerald-700'
                              : 'bg-yellow-950/20 border-yellow-500/20 text-yellow-400 light:bg-yellow-50 light:border-yellow-200 light:text-yellow-700'
                          }`}
                        >
                          {isOk ? 'Al día' : 'Demorado'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 light:text-neutral-400 text-xs">
                No hay alumnos asignados en este nivel que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CALIFICACIONES Y FEEDBACK (7/12) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-white/5 light:border-neutral-100">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-violet-400" />
              <span>Tareas y Entregas</span>
            </h2>

            {/* Sub-tabs filters */}
            <div className="flex bg-[#14132b]/40 light:bg-neutral-100/85 backdrop-blur-md p-0.5 rounded-xl border border-white/5 light:border-neutral-200 text-[10px] font-bold relative z-10 gap-0.5 shadow-md">
              <button
                type="button"
                onClick={() => setActiveSubTab('pending')}
                className={`relative px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${
                  activeSubTab === 'pending'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white light:text-neutral-600 light:hover:text-neutral-900'
                }`}
              >
                {activeSubTab === 'pending' && (
                  <motion.div
                    layoutId="staffProgressSubTabPill"
                    className="absolute inset-0 bg-gradient-to-r from-violet-650 to-indigo-600 shadow-sm rounded-lg -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Pendientes ({pendingSubmissions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('graded')}
                className={`relative px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${
                  activeSubTab === 'graded'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white light:text-neutral-600 light:hover:text-neutral-900'
                }`}
              >
                {activeSubTab === 'graded' && (
                  <motion.div
                    layoutId="staffProgressSubTabPill"
                    className="absolute inset-0 bg-gradient-to-r from-violet-650 to-indigo-600 shadow-sm rounded-lg -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Corregidas ({gradedSubmissions.length})</span>
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[550px] overflow-y-auto no-scrollbar pr-1">
            {activeSubTab === 'pending' ? (
              pendingSubmissions.length > 0 ? (
                pendingSubmissions.map((sub, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-neutral-900/40 light:bg-white border border-white/5 light:border-neutral-200 rounded-2xl hover:border-violet-500/20 transition-all space-y-4 relative shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-violet-400 uppercase">
                          Clase {sub.classWeek} • Actividad
                        </span>
                        <h4 className="text-white light:text-neutral-900 text-xs font-bold mt-0.5">
                          {sub.studentEmail}
                        </h4>
                      </div>
                      <span className="text-[9px] text-gray-500 font-medium font-mono">
                        {new Date(sub.submittedAt).toLocaleDateString('es-AR')}
                      </span>
                    </div>

                    <div className="p-3.5 bg-black/30 light:bg-neutral-50 rounded-xl border border-white/5 light:border-neutral-100 text-xs text-gray-300 light:text-neutral-700 leading-relaxed font-mono whitespace-pre-wrap max-h-36 overflow-y-auto no-scrollbar">
                      {sub.responseText}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => setSelectedSubmission(sub)}
                        className="liquid-glass-btn inline-flex items-center gap-1.5 px-4.5 py-2.5 text-[11.5px]"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Calificar y Dar Feedback</span>
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-16 bg-neutral-900/10 border border-dashed border-white/5 light:border-neutral-200 rounded-2xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2.5" />
                  <p className="text-white light:text-neutral-800 text-sm font-semibold">¡Todo al día!</p>
                  <p className="text-gray-400 light:text-neutral-500 text-xs mt-1">
                    No quedan actividades pendientes de corrección en este nivel.
                  </p>
                </div>
              )
            ) : (
              gradedSubmissions.length > 0 ? (
                gradedSubmissions.map((sub, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-neutral-900/20 light:bg-white border border-white/5 light:border-neutral-200 rounded-2xl space-y-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-[#6c6c7e] uppercase">
                          Clase {sub.classWeek} • Corregido
                        </span>
                        <h4 className="text-white light:text-neutral-900 text-xs font-bold mt-0.5">
                          {sub.studentEmail}
                        </h4>
                      </div>
                      <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-lg border ${
                        sub.grade === 'Excelente'
                          ? 'bg-emerald-950/30 border-emerald-500/25 text-emerald-400 light:bg-emerald-50 light:border-emerald-250 light:text-emerald-700'
                          : sub.grade === 'Muy bueno' || sub.grade === 'Muy bien'
                          ? 'bg-indigo-950/30 border-indigo-500/25 text-indigo-400 light:bg-indigo-50 light:border-indigo-250 light:text-indigo-700'
                          : 'bg-amber-950/30 border-amber-500/25 text-amber-400 light:bg-amber-50 light:border-amber-250 light:text-amber-700'
                      }`}>
                        {sub.grade}
                      </span>
                    </div>

                    <div className="p-3 bg-black/10 light:bg-neutral-50 border border-white/5 light:border-neutral-100 rounded-xl text-xs text-gray-400 light:text-neutral-600 line-clamp-2">
                      {sub.responseText}
                    </div>

                    {sub.feedback && (
                      <div className="p-3 bg-violet-600/5 rounded-xl border border-violet-500/10 text-xs text-gray-300 light:text-neutral-700 leading-relaxed italic flex gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                        <span>"{sub.feedback}"</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 text-[10px] text-gray-500 border-t border-white/5 light:border-neutral-100">
                      <span>Evaluador: {sub.correctedBy || 'Profesor'}</span>
                      <button
                        onClick={() => setSelectedSubmission(sub)}
                        className="text-violet-400 hover:text-violet-300 light:text-violet-600 light:hover:text-violet-500 font-semibold cursor-pointer text-xs"
                      >
                        Re-evaluar
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-16 text-gray-500 light:text-neutral-400 text-xs">
                  Aún no has corregido evaluaciones de alumnos en este nivel escolar.
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* DETAILED GRADING DIALOG MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[3px] z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0f0f22] light:bg-white border border-violet-900/40 light:border-neutral-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 light:border-neutral-200 flex justify-between items-center bg-white/2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 light:text-violet-600 font-mono">
                  Calificación Pedagógica
                </span>
                <h3 className="text-white light:text-neutral-950 font-sans font-bold text-base mt-0.5">
                  Nivel {selectedSubmission.classLevel + 1} • Clase {selectedSubmission.classWeek}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-xs cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto no-scrollbar">
              <div>
                <span className="text-[9px] font-bold font-mono uppercase text-gray-500 tracking-wider">Alumno</span>
                <div className="text-white light:text-neutral-900 text-sm font-semibold mt-0.5">{selectedSubmission.studentEmail}</div>
              </div>

              <div>
                <span className="text-[9px] font-bold font-mono uppercase text-gray-500 tracking-wider block mb-1">
                  Respuesta del Alumno
                </span>
                <div className="p-4 bg-black/40 light:bg-neutral-50 border border-white/5 light:border-neutral-200 rounded-2xl text-[12px] leading-relaxed text-gray-200 light:text-neutral-800 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedSubmission.responseText}
                </div>
              </div>

              {/* Quality Grade Selectors (Excelente | Muy bueno | puede mejorar) */}
              <div className="border-t border-white/5 light:border-neutral-100 pt-5 space-y-3">
                <span className="text-[9px] font-bold font-mono uppercase text-gray-500 tracking-wider block">
                  Asignar Calificación Cualitativa
                </span>
                
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'Excelente', label: 'Excelente', colorSel: 'bg-emerald-600 border-emerald-500 text-white', colorUnsel: 'bg-emerald-950/15 border-emerald-900/30 text-emerald-400 light:bg-emerald-50 light:text-emerald-700 hover:bg-emerald-950/20' },
                    { key: 'Muy bueno', label: 'Muy bueno', colorSel: 'bg-indigo-600 border-indigo-500 text-white', colorUnsel: 'bg-indigo-950/15 border-indigo-900/30 text-indigo-400 light:bg-indigo-50 light:text-indigo-700 hover:bg-indigo-950/20' },
                    { key: 'puede mejorar', label: 'puede mejorar', colorSel: 'bg-amber-600 border-amber-500 text-white', colorUnsel: 'bg-amber-950/15 border-amber-900/30 text-amber-450 light:bg-amber-50 light:text-amber-800 hover:bg-amber-950/20' }
                  ]).map((g) => {
                    const isSel = gradeInput === g.key;
                    return (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setGradeInput(g.key as any)}
                        className={`py-2 px-1 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center border transition-all cursor-pointer ${
                          isSel ? g.colorSel : g.colorUnsel
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Written feedback comment */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold font-mono uppercase text-gray-500 tracking-wider block">
                  Retroalimentación Pedagógica
                </span>
                <textarea
                  placeholder="Escribí aquí tus observaciones, consejos o felicitaciones para el alumno..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  className="w-full min-h-[90px] p-4 bg-black/20 light:bg-white light:border-neutral-300 border border-white/10 rounded-2xl text-white light:text-neutral-800 placeholder-gray-500 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            {/* Modal Controls */}
            <div className="p-4 bg-white/2 border-t border-white/5 light:border-neutral-200 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 border border-white/10 hover:bg-white/5 light:border-neutral-200 text-xs text-gray-400 hover:text-white light:text-neutral-600 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveGradeClick}
                disabled={!gradeInput || isSaving}
                className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all disabled:opacity-40 shadow-lg"
              >
                {isSaving ? 'Guardando...' : 'Confirmar e Inscribir'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
