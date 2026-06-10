import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, Video, Presentation, FilePenLine, Clock, CalendarDays, CheckCircle2, History } from 'lucide-react';
import { ClassItem, User, ActivitySubmission } from '../types';
import { COURSES } from '../data';

const EMOJI_PARTICLES = ['🎉', '🌟', '💸', '🚀', '🔥', '👏', '🧠', '💼'];

function ConfettiSower() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {Array.from({ length: 28 }).map((_, i) => {
        const emoji = EMOJI_PARTICLES[i % EMOJI_PARTICLES.length];
        const angle = (i * 360) / 28;
        const radius = 60 + Math.random() * 150;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius - 30;
        
        return (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 1, x: 0, y: 0, rotate: 0 }}
            animate={{
              scale: [0, 1.3, 1, 0.7, 0],
              opacity: [1, 1, 0.9, 0.4, 0],
              x: x,
              y: y,
              rotate: [0, Math.random() * 360 + 180],
            }}
            transition={{
              duration: 2.5,
              delay: (i % 7) * 0.08,
              ease: "easeOut"
            }}
            className="absolute left-1/2 top-1/2 -ml-3 -mt-3 text-base sm:text-xl select-none"
          >
            {emoji}
          </motion.div>
        );
      })}
    </div>
  );
}

function getEmbedUrl(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  // Try to extract URL from src="..." parameter
  const srcRegex = /src\s*=\s*["'“«’‘]([^"'”»’‘]+)["'”»’‘]/i;
  const match = trimmed.match(srcRegex);
  if (match && match[1]) {
    return match[1].trim().replace(/["'”»’‘>]+$/, '').trim();
  }
  
  return trimmed;
}

interface ClassViewProps {
  user: User;
  classItem: ClassItem;
  submissions: ActivitySubmission[];
  onBack: () => void;
  onSubmitActivity: (responseText: string) => void;
}

type TabType = 'content' | 'video' | 'slides' | 'activity';

export default function ClassView({
  user,
  classItem,
  submissions,
  onBack,
  onSubmitActivity
}: ClassViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('content');
  const [responseText, setResponseText] = useState('');
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [hasRecoveredDraft, setHasRecoveredDraft] = useState(false);

  // Buscar si ya tiene una entrega registrada para esta clase
  const existingSubmission = submissions.find(
    (sub) =>
      sub.classLevel === classItem.level &&
      sub.classWeek === classItem.week &&
      sub.studentEmail === user.email
  );

  const draftKey = `draft_${user.email}_${classItem.level}_${classItem.week}`;

  // Restore draft when component loads or level/week changes
  useEffect(() => {
    if (existingSubmission) {
      setResponseText('');
      setHasRecoveredDraft(false);
      return;
    }
    
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setResponseText(savedDraft);
      setHasRecoveredDraft(true);
    } else {
      setResponseText('');
      setHasRecoveredDraft(false);
    }
  }, [classItem.level, classItem.week, user.email, existingSubmission, draftKey]);

  // Handle user writing text inside textarea
  const handleResponseChange = (text: string) => {
    setResponseText(text);
    if (text.trim()) {
      localStorage.setItem(draftKey, text);
    } else {
      localStorage.removeItem(draftKey);
    }
  };

  const now = new Date();
  const isPastDeadline = classItem.deadline && now > new Date(classItem.deadline);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseText.trim()) {
      alert('Por favor, escribe una respuesta para tu actividad antes de entregar.');
      return;
    }
    onSubmitActivity(responseText);
    setJustSubmitted(true);
    
    // Clear draft on successful submission
    localStorage.removeItem(draftKey);
    setHasRecoveredDraft(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Sin fecha límite';
    const d = new Date(dateString);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back to dashboard button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 group text-gray-500 hover:text-white light:text-neutral-500 light:hover:text-neutral-800 mb-6 text-xs font-medium transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
        <span>Volver</span>
      </button>

      {/* Class header badge and titles */}
      <div className="mb-8 border-b border-white/5 light:border-neutral-200 pb-5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-violet-400 light:text-violet-600 font-mono">
          Semana {classItem.week} · Nivel {classItem.level}
        </span>
        <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-white light:text-neutral-950 mt-1">
          {classItem.title}
        </h1>
      </div>

      {/* Tabs Menu Navigation (Pill styled) */}
      <div className="flex bg-neutral-900/60 light:bg-neutral-100 p-1 rounded-xl border border-white/5 light:border-neutral-200 mb-8 overflow-x-auto no-scrollbar scroll-smooth self-start max-w-max">
        {(
          [
            { id: 'content', label: '📖 Contenido', icon: BookOpen },
            { id: 'video', label: '🎥 Video', icon: Video },
            { id: 'slides', label: '📊 Diapositivas', icon: Presentation },
            { id: 'activity', label: '✏️ Actividad', icon: FilePenLine },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-violet-600 border-violet-500 text-white shadow-sm shadow-violet-950/10 light:bg-violet-100 light:border-violet-200 light:text-violet-700'
                  : 'border-transparent text-gray-400 hover:text-white light:text-neutral-500 light:hover:text-neutral-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label.split(' ')[1]}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs content containers with transitions */}
      <div className="min-h-[300px]">
        {activeTab === 'content' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="prose prose-invert light:prose-neutral max-w-none text-gray-300 light:text-neutral-800 leading-relaxed space-y-4"
          >
            {/* Renderizado de HTML dinámico in-line de forma segura */}
            <div
              className="class-body-html"
              dangerouslySetInnerHTML={{ __html: classItem.text }}
            />
          </motion.div>
        )}

        {activeTab === 'video' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {classItem.videoId ? (
              <div className="relative aspect-video rounded-2xl border border-white/5 light:border-neutral-200 overflow-hidden bg-black/40 light:bg-neutral-50">
                <iframe
                  title="Youtube embed code"
                  src={`https://www.youtube.com/embed/${classItem.videoId}`}
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-2xl border border-white/5 light:border-neutral-200/80 flex flex-col items-center justify-center text-center p-6 bg-neutral-950/40 light:bg-neutral-50">
                <div className="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center text-violet-400 light:text-violet-600 mb-3 animate-pulse">
                  <Video className="w-4 h-4" />
                </div>
                <h3 className="font-sans font-semibold text-white light:text-neutral-800 text-sm mb-1">
                  Video en producción
                </h3>
                <p className="text-gray-500 light:text-neutral-500 text-xs max-w-xs">
                  El tutor publicará la grabación semanal próximamente.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'slides' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {classItem.slidesUrl ? (
              <div className="rounded-2xl border border-white/5 light:border-neutral-300 overflow-hidden bg-[#070714] light:bg-[#fbfbfb] shadow-xl relative">
                <iframe
                  title="Presentación de la clase"
                  src={getEmbedUrl(classItem.slidesUrl)}
                  className="w-full h-[320px] sm:h-[480px] border-0"
                  allow="fullscreen"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="h-[300px] rounded-2xl border border-white/5 light:border-neutral-200/80 flex flex-col items-center justify-center text-center p-6 bg-neutral-950/40 light:bg-neutral-50">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 light:text-indigo-600 mb-3">
                  <Presentation className="w-4 h-4" />
                </div>
                <h3 className="font-sans font-semibold text-white light:text-neutral-800 text-sm mb-1">
                  Diapositivas próximamente
                </h3>
                <p className="text-gray-500 light:text-neutral-500 text-xs max-w-xs">
                  No se ha vinculado una presentación para esta sesión.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-violet-950/10 border border-violet-900/40 light:bg-violet-50/40 light:border-violet-200/60 rounded-3xl p-6 sm:p-8"
          >
            <span className="text-[10px] uppercase font-bold tracking-widest text-violet-400 light:text-violet-600">
              Entrega Obligatoria semanal
            </span>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white light:text-neutral-900 mt-1 mb-3">
              {classItem.actTitle || 'Actividad práctica'}
            </h3>
            <p className="text-gray-400 light:text-neutral-700 text-sm leading-relaxed mb-6">
              {classItem.actDesc || 'Escribe tu ensayo y propuesta para la clase correspondiente.'}
            </p>

            {/* Deadline information info card */}
            {classItem.deadline && (
              <div className={`flex items-center gap-2 text-xs font-semibold p-3.5 rounded-xl border mb-6 ${
                isPastDeadline
                  ? 'bg-red-950/14 border-red-500/25 text-red-300 light:bg-red-50 light:border-red-200/70 light:text-red-700'
                  : 'bg-yellow-950/14 border-yellow-500/25 text-yellow-300 light:bg-amber-50 light:border-amber-200/70 light:text-amber-800'
              }`}>
                {isPastDeadline ? (
                  <>
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Lamentablemente se cerró el plazo el {formatDate(classItem.deadline)}</span>
                  </>
                ) : (
                  <>
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    <span>Plazo de entrega válido hasta: {formatDate(classItem.deadline)}</span>
                  </>
                )}
              </div>
            )}

            {existingSubmission || justSubmitted ? (
              <div className="relative overflow-hidden bg-green-950/15 border border-green-500/30 light:bg-green-50/40 light:border-green-200 rounded-3xl p-6 text-center space-y-3">
                {justSubmitted && <ConfettiSower />}
                <div className="w-12 h-12 bg-green-500/15 text-green-400 flex items-center justify-center rounded-full mx-auto animate-bounce-slow relative z-10">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-white light:text-green-800 text-base font-bold relative z-10">
                  ¡Actividad Entregada con éxito!
                </h4>
                <p className="text-gray-400 light:text-green-700 text-xs max-w-md mx-auto relative z-10">
                  Tu respuesta fue recibida correctamente por el tutor. Abajo podés visualizar tu entrega guardada:
                </p>
                <div className="bg-black/25 light:bg-neutral-100 text-left p-4 rounded-xl text-gray-300 light:text-neutral-800 text-xs font-mono border border-[#22c55e]/20 light:border-green-200 max-h-40 overflow-y-auto whitespace-pre-wrap relative z-10">
                  {existingSubmission?.responseText || responseText}
                </div>

                {existingSubmission?.grade && (
                  <div className="mt-6 border-t border-white/5 light:border-neutral-200 pt-5 text-left space-y-3 relative z-10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-violet-400 light:text-violet-600 block font-mono">
                        Corrección del Docente
                      </span>
                      <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${
                        existingSubmission.grade === 'Muy bien'
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400 light:bg-emerald-50 light:border-emerald-200 light:text-emerald-700'
                          : existingSubmission.grade === 'Bien'
                          ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-400 light:bg-indigo-50 light:border-indigo-200 light:text-indigo-700'
                          : 'bg-amber-950/30 border-amber-500/30 text-amber-400 light:bg-amber-50 light:border-amber-200 light:text-amber-700'
                      }`}>
                        {existingSubmission.grade}
                      </span>
                    </div>

                    {existingSubmission.feedback && (
                      <div className="p-4 bg-violet-950/10 light:bg-violet-50/50 border border-violet-900/10 light:border-violet-100/50 rounded-xl">
                        <p className="text-gray-300 light:text-neutral-700 text-xs sm:text-sm italic leading-relaxed">
                          "{existingSubmission.feedback}"
                        </p>
                        {existingSubmission.correctedAt && (
                          <span className="text-[9px] text-gray-500 block mt-2 text-right">
                            Corregido el {new Date(existingSubmission.correctedAt).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <label htmlFor="actText" className="text-xs text-gray-400 light:text-neutral-500 font-bold uppercase tracking-wider block">
                      Tu respuesta o conclusión
                    </label>
                    {hasRecoveredDraft && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-[10px] text-green-400 font-medium flex items-center gap-1 font-sans bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20"
                      >
                        <History className="w-3 h-3 text-green-400" />
                        Borrador recuperado localmente
                      </motion.span>
                    )}
                  </div>
                  <textarea
                    id="actText"
                    disabled={isPastDeadline}
                    value={responseText}
                    onChange={(e) => handleResponseChange(e.target.value)}
                    placeholder="Escribí los detalles conscientes de tus decisiones o la consigna solicitada aquí..."
                    className="w-full min-h-[160px] bg-black/20 border border-white/10 light:bg-white light:border-neutral-300 rounded-2xl p-4 text-white light:text-neutral-800 placeholder-gray-500 light:placeholder-neutral-400 font-sans text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isPastDeadline || !responseText.trim()}
                    className="py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl cursor-pointer shadow-lg shadow-violet-950/30 transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                  >
                    Entregar actividad →
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
