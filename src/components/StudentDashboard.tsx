import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Lock, CheckCircle, Calendar, Sparkles, AlertCircle, Search, CheckCircle2 } from 'lucide-react';
import { Course, ClassItem, User, ActivitySubmission } from '../types';
import { COURSES } from '../data';

interface StudentDashboardProps {
  user: User;
  classes: ClassItem[];
  submissions: ActivitySubmission[];
  onOpenClass: (level: number, week: number) => void;
}

export default function StudentDashboard({
  user,
  classes,
  submissions,
  onOpenClass
}: StudentDashboardProps) {
  const activeLevel = user.level ?? 0;
  const [selectedCourseId] = useState<number>(activeLevel);
  const weeksSectionRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const getCourseProgress = (courseId: number) => {
    // Calculamos cuántas clases desbloqueadas del curso existen y pertenecen al colegio del alumno
    const courseClasses = classes.filter((cl) => cl.level === courseId && cl.school === user.school && !cl.isSyllabus);
    const now = new Date();
    const unlockedCount = courseClasses.filter((cl) => !cl.unlockAt || now >= new Date(cl.unlockAt)).length;
    
    // Cuántas de esas clases ya tiene el alumno entregadas
    const submittedCount = courseClasses.filter((cl) => 
      submissions.some((sub) => sub.classLevel === courseId && sub.classWeek === cl.week && sub.studentEmail.toLowerCase() === user.email.toLowerCase())
    ).length;

    return {
      unlockedCount,
      submittedCount,
      totalClasses: courseClasses.length || 1, // evitar division por 0
      percent: Math.round((submittedCount / (courseClasses.length || 1)) * 100),
    };
  };

  const isUnlocked = (cl: ClassItem) => {
    return !cl.unlockAt || new Date() >= new Date(cl.unlockAt);
  };

  const hasSubmitted = (cl: ClassItem) => {
    return submissions.some(
      (sub) => sub.classLevel === cl.level && sub.classWeek === cl.week && sub.studentEmail.toLowerCase() === user.email.toLowerCase()
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedCourse = COURSES.find((c) => c.id === selectedCourseId);
  
  const initialFilteredClasses = classes
    .filter((cl) => cl.level === selectedCourseId && cl.school === user.school && !cl.isSyllabus)
    .sort((a, b) => a.week - b.week);

  const filteredClasses = initialFilteredClasses.filter((cl) => {
    // 1. Status Filter
    const ok = isUnlocked(cl);
    const submitted = hasSubmitted(cl);
    if (statusFilter === 'pending') {
      if (!ok || submitted) return false;
    } else if (statusFilter === 'completed') {
      if (!submitted) return false;
    }

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = cl.title.toLowerCase().includes(q);
      const textMatch = cl.text?.toLowerCase().includes(q) ?? false;
      const actTitleMatch = cl.actTitle?.toLowerCase().includes(q) ?? false;
      const actDescMatch = cl.actDesc?.toLowerCase().includes(q) ?? false;
      const weekMatch = `semana ${cl.week}`.includes(q) || `semana:${cl.week}`.includes(q) || cl.week.toString() === q;
      return titleMatch || textMatch || actTitleMatch || actDescMatch || weekMatch;
    }

    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-baseline gap-4 mb-10 border-b border-violet-950/20 light:border-neutral-200 pb-6">
        <div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-white light:text-neutral-900 flex items-center gap-2">
            Hola, {user.name.split(' ')[0]} <Sparkles className="w-4 h-4 text-violet-400" />
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Tu trayectoria académica e institucional en Fintly
          </p>
        </div>
        <div className="liquid-glass px-4.5 py-2 rounded-2xl flex items-center gap-3 shadow-lg hover:scale-[1.02] transition-transform">
          <AwardIcon progress={submissions.filter(s => s.studentEmail.toLowerCase() === user.email.toLowerCase()).length} />
          <div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Entregas</div>
            <div className="text-white light:text-neutral-800 font-sans font-semibold text-sm">
              {submissions.filter(s => s.studentEmail.toLowerCase() === user.email.toLowerCase()).length} completadas
            </div>
          </div>
        </div>
      </div>

      {/* Curso único asignado */}
      <h2 className="font-sans text-[10px] font-bold tracking-widest text-[#5e5e6e] uppercase mb-4">
        Programa Académico Asignado
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {selectedCourse && (() => {
          const { percent, submittedCount, totalClasses } = getCourseProgress(selectedCourse.id);
          return (
            <motion.div
              key={selectedCourse.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl p-5 md:col-span-2 select-none liquid-glass hover:scale-[1.01] transition-transform shadow-lg"
            >
              {/* Card top-marker */}
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${selectedCourse.accent}`} />

              <div className="flex justify-between items-start gap-2">
                <span className="text-[9px] uppercase font-bold tracking-wider text-violet-400 font-mono">
                  Nivel {selectedCourse.id} · Asignado
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-green-500/10 text-green-400 text-[9px] font-bold tracking-wider uppercase font-mono border border-green-500/20">
                  Progreso Activo
                </span>
              </div>
              <h3 className="font-sans font-semibold text-base text-white light:text-neutral-900 mt-1.5 mb-2">
                {selectedCourse.name}
              </h3>
              <p className="text-gray-400 light:text-neutral-600 text-xs sm:text-sm leading-relaxed mb-6">
                {selectedCourse.desc}
              </p>

              {/* Progress visualizer */}
              <div className="space-y-2 pt-4 border-t border-white/[0.05] light:border-neutral-200">
                <div className="flex justify-between items-center text-xs text-gray-500 light:text-neutral-500">
                  <span className="font-medium">Completaste {submittedCount} de {totalClasses} clases</span>
                  <span className="font-bold text-white light:text-neutral-900">{percent}%</span>
                </div>
                <div className="h-2 bg-white/[0.03] light:bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${selectedCourse.accent} transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })()}

        <div className="liquid-glass rounded-2xl p-5 flex flex-col justify-between shadow-lg hover:scale-[1.01] transition-transform">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Tu Entorno</span>
            <h4 className="font-semibold text-sm text-white light:text-neutral-800 mt-1.5">{user.school || 'Northfield Sede Puertos'}</h4>
            <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
              Estás ingresando al Fintly Campus como alumno regular bajo la supervisión de tu establecimiento escolar. Tus respuestas son evaluadas individualmente.
            </p>
          </div>
          <div className="text-[10px] text-violet-400/90 light:text-violet-600 font-medium pt-4 mt-4 border-t border-white/[0.02] light:border-neutral-200">
            Cualquier cambio de nivel debe coordinarse con la administración escolar.
          </div>
        </div>
      </div>

      {/* Selected Classes List */}
      <div ref={weeksSectionRef} className="scroll-mt-24">
        <AnimatePresence mode="wait">
          {selectedCourse && (
            <motion.div
              key={selectedCourseId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex border-b border-violet-950/20 light:border-neutral-100 pb-3 items-baseline justify-between">
                <h3 className="font-sans text-xs font-semibold tracking-tight text-white light:text-neutral-800 uppercase tracking-wider">
                  Clases • {selectedCourse.name}
                </h3>
                <span className="text-[10px] font-mono tracking-wider text-gray-500">
                  Nivel {selectedCourseId}
                </span>
              </div>

              {/* Barra de Búsqueda y Filtros con diseño de alta fidelidad */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between py-2 mb-2">
                {/* Input de Búsqueda */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 light:text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por tema, semana o consigna..."
                    className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl pl-10 pr-16 py-2.5 text-xs text-white light:text-neutral-800 placeholder-gray-500 light:placeholder-neutral-400 focus:outline-none focus:border-violet-500 light:focus:border-violet-500 transition-all font-sans"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 hover:text-white light:text-neutral-500 light:hover:text-neutral-950 font-semibold bg-white/10 hover:bg-white/20 light:bg-neutral-100 light:hover:bg-neutral-200 px-2.0 py-1 rounded-xl transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Filtros de Estado */}
                <div className="flex bg-[#14132b]/40 light:bg-neutral-100/80 backdrop-blur-xl p-1 rounded-2xl border border-white/5 light:border-neutral-200 self-start md:self-auto text-xs shrink-0 select-none relative z-10 gap-1 shadow-lg">
                  {(
                    [
                      { id: 'all', label: 'Todas', count: initialFilteredClasses.length },
                      { id: 'pending', label: 'Disponibles', count: initialFilteredClasses.filter(c => isUnlocked(c) && !hasSubmitted(c)).length },
                      { id: 'completed', label: 'Entregadas', count: initialFilteredClasses.filter(c => isUnlocked(c) && hasSubmitted(c)).length }
                    ] as const
                  ).map((bt) => {
                    const isActive = statusFilter === bt.id;
                    return (
                      <button
                        key={bt.id}
                        type="button"
                        onClick={() => setStatusFilter(bt.id)}
                        className={`relative flex items-center gap-1.5 px-4.5 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 cursor-pointer ${
                          isActive
                            ? 'text-white'
                            : 'text-gray-400 light:text-neutral-500 hover:text-gray-200 light:hover:text-neutral-800'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="studentDashboardStatusFilter"
                            className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-950/40 rounded-xl -z-10"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10">{bt.label}</span>
                        <span className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-lg ${
                          isActive 
                            ? 'bg-white/15 text-white' 
                            : 'bg-white/5 text-gray-500 light:bg-neutral-200/60 light:text-neutral-550'
                        }`}>
                          {bt.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((cl) => {
                    const ok = isUnlocked(cl);
                    const submitted = hasSubmitted(cl);

                    return (
                      <div
                        key={cl.week}
                        onClick={() => ok && onOpenClass(cl.level, cl.week)}
                        className={`group flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl transition-all duration-300 ${
                          ok
                            ? 'liquid-glass-interactive cursor-pointer active:scale-[0.995]'
                            : 'bg-neutral-950/10 border border-white/5 opacity-40 cursor-not-allowed light:bg-neutral-100 light:border-neutral-200'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Week icon badge */}
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                              ok
                                ? 'bg-violet-950/40 border border-violet-500/30 text-violet-300 light:bg-violet-50 light:border-violet-200 light:text-violet-600'
                                : 'bg-neutral-900 border border-white/5 text-gray-600 light:bg-neutral-200'
                            }`}
                          >
                            {cl.week}
                          </div>

                          <div>
                            <h4 className="text-white light:text-neutral-800 font-medium text-xs sm:text-sm group-hover:text-violet-300 light:group-hover:text-violet-600 transition-colors flex items-center gap-1.5">
                              {cl.title}
                              {!ok && <Lock className="w-3 h-3 text-gray-400" />}
                            </h4>
                            <p className="text-gray-500 text-[10px] mt-0.5">
                              Académico · Semana {cl.week}
                            </p>
                          </div>
                        </div>

                        {/* Status Label on the Right */}
                        <div className="mt-2 sm:mt-0 self-start sm:self-auto flex items-center gap-2">
                          {ok ? (
                            submitted ? (
                              <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md border border-green-500/25 bg-green-950/10 text-green-400 font-medium light:bg-green-50 light:border-green-200 light:text-green-600">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                Entregado
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md border border-violet-500/25 bg-violet-950/10 text-violet-400 font-medium light:bg-violet-50 light:border-violet-200 light:text-violet-600">
                                <BookOpen className="w-3 h-3" />
                                Disponible
                              </span>
                            )
                          ) : (
                            <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md border border-white/5 bg-neutral-950/30 text-gray-500 font-medium">
                              <Calendar className="w-3 h-3" />
                              Desbloquea: {formatDate(cl.unlockAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : initialFilteredClasses.length > 0 ? (
                  /* Empty state for search filters */
                  <div className="relative overflow-hidden bg-neutral-900/10 border border-dashed border-white/10 light:bg-neutral-50 light:border-neutral-200/80 rounded-2xl py-10 px-6 text-center select-none flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-violet-600/10 flex items-center justify-center mb-3 text-violet-400 light:text-violet-600">
                      <Search className="w-5 h-5 animate-pulse" />
                    </div>
                    <h4 className="font-sans font-bold text-sm text-white light:text-neutral-800">
                      Sin resultados para la búsqueda
                    </h4>
                    <p className="text-gray-400 light:text-neutral-500 text-xs mt-1 max-w-xs leading-relaxed font-sans mb-4">
                      No encontramos ninguna clase que coincida con tus términos o filtros seleccionados.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                      className="liquid-glass-btn px-5 py-2.5 text-xs text-center"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                ) : (
                  /* Original total empty state */
                  <div className="relative overflow-hidden bg-neutral-900/10 border border-dashed border-white/10 dark:bg-black/10 light:bg-neutral-50 light:border-neutral-200/80 rounded-2xl py-12 px-6 text-center select-none flex flex-col items-center justify-center">
                    {/* Glowing circular illustration */}
                    <div className="relative w-16 h-16 rounded-full bg-violet-600/10 flex items-center justify-center mb-4 border border-violet-500/20 shadow-inner">
                      <Sparkles className="w-6 h-6 text-violet-400 light:text-violet-600 animate-pulse" />
                      <div className="absolute inset-0 rounded-full bg-violet-500/5 blur-md animate-ping-slow pointer-events-none" />
                    </div>
                    
                    <h4 className="font-sans font-bold text-sm text-white light:text-neutral-800">
                      Tu viaje financiero comienza aquí
                    </h4>
                    
                    <p className="text-gray-400 light:text-neutral-500 text-xs mt-1.5 max-w-sm leading-relaxed font-sans">
                      Esperando que el profesor desbloquee tu primera semana de estudio o asigne las clases para tu colegio en el panel. ¡Preparate para expandir tus conocimientos!
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AwardIcon({ progress }: { progress: number }) {
  return (
    <div className="w-10 h-10 rounded-full bg-violet-600/20 text-violet-300 flex items-center justify-center">
      <Sparkles className={`w-5 h-5 ${progress > 0 ? 'text-yellow-400 animate-spin-slow' : 'text-violet-400'}`} />
    </div>
  );
}
