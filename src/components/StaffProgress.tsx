import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Search, ArrowLeft, CheckCircle2, Award, 
  MessageSquare, ChevronRight, ClipboardList, School
} from 'lucide-react';
import { Student, ActivitySubmission, ClassItem, User } from '../types';
import { COURSES, ASSOCIATED_SCHOOLS } from '../data';

interface StaffProgressProps {
  students: Student[];
  submissions: ActivitySubmission[];
  classes: ClassItem[];
  role: 'directivo';
  user: User;
  onSaveSubmission?: (sub: ActivitySubmission) => void | Promise<void>;
}

const AVATAR_GRADIENTS = [
  'bg-gradient-to-br from-violet-600 to-indigo-600',
  'bg-gradient-to-br from-indigo-600 to-blue-600',
  'bg-gradient-to-br from-emerald-600 to-teal-600',
  'bg-gradient-to-br from-rose-600 to-pink-600',
  'bg-gradient-to-br from-amber-500 to-orange-600',
  'bg-gradient-to-br from-sky-500 to-blue-600',
  'bg-gradient-to-br from-purple-600 to-violet-700',
  'bg-gradient-to-br from-cyan-500 to-indigo-600',
];

function getAvatarGradient(name: string): string {
  const code = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

export default function StaffProgress({
  students,
  submissions,
  classes,
  role,
  user,
  onSaveSubmission
}: StaffProgressProps) {
  // Aislamiento por colegio del directivo: si el directivo tiene un colegio asignado, se fija siempre a ese colegio
  const directivoSchool = user.school || (ASSOCIATED_SCHOOLS[0]);
  const [selectedSchool, setSelectedSchool] = useState<string>(directivoSchool);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'graded'>('pending');
  const [selectedSubmission, setSelectedSubmission] = useState<ActivitySubmission | null>(null);
  const [gradeInput, setGradeInput] = useState<'Excelente' | 'Muy bien' | 'Bien' | 'Puede mejorar' | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  // Sincronizar si cambia el usuario o colegio asignado
  useEffect(() => {
    if (user.school) {
      setSelectedSchool(user.school);
    }
  }, [user.school]);

  // Normalize legacy grades
  const normalizeGrade = (raw?: string): 'Excelente' | 'Muy bien' | 'Bien' | 'Puede mejorar' | null => {
    if (!raw) return null;
    const clean = raw.trim().toLowerCase();
    if (clean === 'excelente') return 'Excelente';
    if (clean === 'muy bien' || clean === 'muy bueno') return 'Muy bien';
    if (clean === 'bien') return 'Bien';
    if (clean === 'puede mejorar' || clean === 'a mejorar') return 'Puede mejorar';
    return null;
  };

  useEffect(() => {
    if (selectedSubmission) {
      setGradeInput(normalizeGrade(selectedSubmission.grade));
      setFeedbackInput(selectedSubmission.feedback || '');
    }
  }, [selectedSubmission]);

  const handleSaveGradeClick = async () => {
    if (!selectedSubmission || !gradeInput) return;
    setIsSaving(true);
    setErrorGuardado(null);
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
      setTimeout(() => {
        setSelectedSubmission(null);
        setIsSaving(false);
      }, 300);
    } catch (e) {
      console.error('La corrección no se pudo guardar:', e);
      setErrorGuardado('No pudimos guardar la corrección. Revisá la conexión y probá de nuevo.');
      setIsSaving(false);
    }
  };

  const getStudentsOfSchool = (schoolName: string) => {
    return students.filter(s => s.school?.toLowerCase() === schoolName.toLowerCase());
  };

  const getSubmissionsOfSchool = (schoolName: string) => {
    const schoolStudentEmails = new Set(
      getStudentsOfSchool(schoolName).map(s => s.email?.toLowerCase().trim())
    );
    return submissions.filter(sub => schoolStudentEmails.has(sub.studentEmail?.toLowerCase().trim()));
  };

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
                    <div className="w-11 h-11 bg-violet-600/10 border border-violet-500/15 text-violet-400 rounded-xl flex items-center justify-center">
                      <School className="w-5 h-5" />
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

  if (selectedLevel === null) {
    const schoolStudents = getStudentsOfSchool(selectedSchool);
    const schoolSubmissions = getSubmissionsOfSchool(selectedSchool);

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
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
                <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${course.accent}`} />

                <div className="pl-2 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold tracking-widest text-violet-400 accent-purple-400 block uppercase">
                        Nivel {course.id}
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

  const courseDetail = COURSES[selectedLevel] || COURSES[0];
  const studentsInScope = students.filter(s => 
    s.school?.toLowerCase() === selectedSchool.toLowerCase() && s.level === selectedLevel
  );
  const emailsInScope = new Set(studentsInScope.map(s => s.email?.toLowerCase().trim()));
  const submissionsInScope = submissions.filter(sub => 
    sub.classLevel === selectedLevel && emailsInScope.has(sub.studentEmail?.toLowerCase().trim())
  );
  const pendingSubmissions = submissionsInScope.filter(sub => !sub.grade);
  const gradedSubmissions = submissionsInScope.filter(sub => !!sub.grade);
  const displayedStudents = studentsInScope.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
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
            <span className="text-gray-300 light:text-neutral-700 font-medium">Nivel {selectedLevel}</span>
          </div>

          <h1 className="font-sans text-xl sm:text-2xl font-bold text-white light:text-neutral-900 flex items-center gap-2 tracking-tight">
            Nivel {selectedLevel}: {courseDetail.name}
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
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <span>Progreso de Alumnos ({studentsInScope.length})</span>
            </h2>
          </div>

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
                        <div className={`w-8 h-8 rounded-full text-xs font-bold text-white flex items-center justify-center shrink-0 ${getAvatarGradient(s.name)}`}>
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

        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-white/5 light:border-neutral-100">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-violet-400" />
              <span>Tareas y Entregas</span>
            </h2>

            <div className="flex bg-[#14132b]/40 light:bg-neutral-100/85 backdrop-blur-md p-0.5 rounded-xl border border-white/5 light:border-neutral-200 text-[10px] font-bold relative z-10 gap-0.5 shadow-md max-w-full overflow-x-auto no-scrollbar">
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

      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[3px] z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0f0f22] light:bg-white border border-violet-900/40 light:border-neutral-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 light:border-neutral-200 flex justify-between items-center bg-white/2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 light:text-violet-600 font-mono">
                  Calificación Pedagógica
                </span>
                <h3 className="text-white light:text-neutral-950 font-sans font-bold text-base mt-0.5">
                  Nivel {selectedSubmission.classLevel} • Clase {selectedSubmission.classWeek}
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

            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto no-scrollbar">
              <div>
                <span className="text-[9px] font-bold font-mono uppercase text-gray-500 tracking-wider">Alumno</span>
                {(() => {
                  // Buscamos el nombre en la lista de alumnos; si no está, mostramos el correo
                  const alumno = students.find(
                    st => st.email?.toLowerCase().trim() === selectedSubmission.studentEmail?.toLowerCase().trim()
                  );
                  return (
                    <>
                      <div className="text-white light:text-neutral-900 text-sm font-semibold mt-0.5">
                        {alumno?.name || selectedSubmission.studentEmail}
                      </div>
                      {alumno?.name && (
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                          {selectedSubmission.studentEmail}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div>
                <span className="text-[9px] font-bold font-mono uppercase text-gray-500 tracking-wider block mb-1">
                  Respuesta del Alumno
                </span>
                <div className="p-4 bg-black/40 light:bg-neutral-50 border border-white/5 light:border-neutral-200 rounded-2xl text-[12px] leading-relaxed text-gray-200 light:text-neutral-800 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedSubmission.responseText}
                </div>
              </div>

              <div className="border-t border-white/5 light:border-neutral-100 pt-5 space-y-3">
                <span className="text-[9px] font-bold font-mono uppercase text-gray-500 tracking-wider block">
                  Asignar Calificación Cualitativa
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {([
                    { key: 'Puede mejorar', label: 'Puede mejorar', emoji: '💪', colorSel: 'bg-gradient-to-br from-amber-600 to-orange-600 border-amber-500 text-white shadow-lg shadow-amber-900/30', colorUnsel: 'bg-amber-950/12 border-amber-900/25 text-amber-400 light:bg-amber-50 light:text-amber-800 hover:bg-amber-950/22 hover:border-amber-800/40' },
                    { key: 'Bien', label: 'Bien', emoji: '👍', colorSel: 'bg-gradient-to-br from-indigo-600 to-violet-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/30', colorUnsel: 'bg-indigo-950/12 border-indigo-900/25 text-indigo-400 light:bg-indigo-50 light:text-indigo-700 hover:bg-indigo-950/22 hover:border-indigo-800/40' },
                    { key: 'Muy bien', label: 'Muy bien', emoji: '👏', colorSel: 'bg-gradient-to-br from-sky-600 to-blue-600 border-sky-500 text-white shadow-lg shadow-sky-900/30', colorUnsel: 'bg-sky-950/12 border-sky-900/25 text-sky-400 light:bg-sky-50 light:text-sky-700 hover:bg-sky-950/22 hover:border-sky-800/40' },
                    { key: 'Excelente', label: 'Excelente', emoji: '🌟', colorSel: 'bg-gradient-to-br from-emerald-600 to-teal-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30', colorUnsel: 'bg-emerald-950/12 border-emerald-900/25 text-emerald-400 light:bg-emerald-50 light:text-emerald-700 hover:bg-emerald-950/22 hover:border-emerald-800/40' }
                  ] as const).map((g) => {
                    const isSel = gradeInput === g.key;
                    return (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setGradeInput(g.key)}
                        className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wide text-center border transition-all duration-200 cursor-pointer flex flex-col items-center gap-1.5 ${
                          isSel ? g.colorSel : g.colorUnsel
                        }`}
                      >
                        <span className="text-base">{g.emoji}</span>
                        <span>{g.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

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

            <div className="p-4 bg-white/2 border-t border-white/5 light:border-neutral-200 flex flex-col gap-3 shrink-0">
              {errorGuardado && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25">
                  <span className="text-rose-400 text-base leading-none mt-0.5">!</span>
                  <p className="text-[12px] text-rose-300 light:text-rose-700 leading-relaxed">
                    {errorGuardado}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
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
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
