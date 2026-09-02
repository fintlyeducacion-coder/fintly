import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, BookOpen, Video, Presentation, FilePenLine,
  Clock, CalendarDays, CheckCircle2, History, ChevronRight,
} from 'lucide-react';
import { ClassItem, User, ActivitySubmission } from '../types';
import { sanitizeHtml } from '../sanitize';
import { COURSES } from '../data';

/* ── Confetti ─────────────────────────────────────────────────── */
const PARTICLES = ['🎉', '🌟', '💸', '🚀', '🔥', '👏', '🧠', '💼'];
function Confetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {Array.from({ length: 24 }).map((_, i) => {
        const angle  = (i * 360) / 24;
        const radius = 60 + Math.random() * 130;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius - 30;
        return (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 1, x: 0, y: 0, rotate: 0 }}
            animate={{ scale: [0, 1.2, 0.8, 0], opacity: [1, 1, 0.6, 0], x, y, rotate: [0, Math.random() * 360 + 180] }}
            transition={{ duration: 2.2, delay: (i % 7) * 0.07, ease: 'easeOut' }}
            className="absolute left-1/2 top-1/2 -ml-3 -mt-3 text-lg select-none"
          >
            {PARTICLES[i % PARTICLES.length]}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */
function getEmbedUrl(input: string): string {
  if (!input) return '';
  const m = input.trim().match(/src\s*=\s*["'«'']([^"'»'']+)["'»'']/i);
  return m?.[1]?.trim().replace(/["'»''>]+$/, '').trim() ?? input.trim();
}

const GRADE_COLORS: Record<string, string> = {
  'Excelente':     'bg-emerald-600/90 border-emerald-500/50 text-white',
  'Muy bien':      'bg-sky-600/90     border-sky-500/50     text-white',
  'Muy bueno':     'bg-sky-600/90     border-sky-500/50     text-white',
  'Bien':          'bg-indigo-600/90  border-indigo-500/50  text-white',
  'Puede mejorar': 'bg-amber-600/90   border-amber-500/50   text-white',
  'A mejorar':     'bg-amber-600/90   border-amber-500/50   text-white',
  'puede mejorar': 'bg-amber-600/90   border-amber-500/50   text-white',
};

/* ── Types ────────────────────────────────────────────────────── */
type Tab = 'content' | 'video' | 'slides' | 'activity';
const TABS: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'content',  label: 'Contenido',    Icon: BookOpen },
  { id: 'video',    label: 'Video',        Icon: Video },
  { id: 'slides',   label: 'Diapositivas', Icon: Presentation },
  { id: 'activity', label: 'Actividad',    Icon: FilePenLine },
];

interface Props {
  user: User;
  classItem: ClassItem;
  submissions: ActivitySubmission[];
  onBack: () => void;
  onSubmitActivity: (text: string) => void;
}

/* ── ClassView ────────────────────────────────────────────────── */
export default function ClassView({ user, classItem, submissions, onBack, onSubmitActivity }: Props) {
  const [tab,           setTab]           = useState<Tab>('content');
  const [response,      setResponse]      = useState('');
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [draftBanner,   setDraftBanner]   = useState(false);

  const existing  = submissions.find(s =>
    s.classLevel === classItem.level &&
    s.classWeek === classItem.week &&
    (s.classModule === undefined || s.classModule === (classItem.module ?? 1)) &&
    s.studentEmail === user.email
  );
  const draftKey  = `draft_${user.email}_${classItem.level}_${classItem.week}`;
  const now       = new Date();
  const overdue   = !!(classItem.deadline && now > new Date(classItem.deadline));
  const course    = COURSES.find(c => c.id === classItem.level);
  const wordCount = response.trim() ? response.trim().split(/\s+/).length : 0;
  const gradeCls  = existing?.grade ? (GRADE_COLORS[existing.grade] ?? 'bg-violet-600/90 border-violet-500/50 text-white') : '';

  useEffect(() => {
    if (existing) { setResponse(''); setDraftBanner(false); return; }
    const saved = localStorage.getItem(draftKey);
    if (saved) { setResponse(saved); setDraftBanner(true); }
    else { setResponse(''); setDraftBanner(false); }
  }, [classItem.level, classItem.week, user.email, existing, draftKey]);

  const onType = (text: string) => {
    setResponse(text);
    if (text.trim()) localStorage.setItem(draftKey, text);
    else localStorage.removeItem(draftKey);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim() || overdue) return;
    onSubmitActivity(response);
    setJustSubmitted(true);
    localStorage.removeItem(draftKey);
    setDraftBanner(false);
  };

  const fmt = (d: string) => !d ? '—' : new Date(d).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

      {/* Back */}
      <motion.button
        type="button"
        onClick={onBack}
        whileHover={{ x: -2 }}
        className="flex items-center gap-1.5 text-slate-500 hover:text-white light:hover:text-slate-800 text-[12px] font-semibold mb-7 transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
        <span>Volver al dashboard</span>
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 space-y-2"
      >
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-violet-400 light:text-violet-600 font-bold uppercase tracking-wider bg-violet-500/8 light:bg-violet-50 border border-violet-500/14 light:border-violet-200 px-2.5 py-1 rounded-lg">
            Semana {classItem.week}
          </span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-slate-500 uppercase tracking-wider">
            {course?.name ?? `Nivel ${classItem.level}`}
          </span>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white light:text-slate-900 tracking-tight leading-tight">
          {classItem.title}
        </h1>

        {course && (
          <div className={`h-[2px] w-10 rounded-full bg-gradient-to-r ${course.accent}`} />
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex bg-white/[0.04] light:bg-slate-100 p-1 rounded-2xl border border-white/[0.06] light:border-slate-200 mb-8 overflow-x-auto no-scrollbar gap-0.5 w-fit shadow-sm">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold rounded-xl whitespace-nowrap transition-all duration-250 cursor-pointer ${
                active ? 'text-white' : 'text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-700'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="classTabPill"
                  className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-900/30 rounded-xl -z-10"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                />
              )}
              <Icon className={`w-3.5 h-3.5 relative z-10 ${active ? 'opacity-100' : 'opacity-55'}`} />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">

          {tab === 'content' && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="class-body-html"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(classItem.text) }}
            />
          )}

          {tab === 'video' && (
            <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              {classItem.videoId ? (
                <div className="relative aspect-video rounded-2xl border border-white/[0.07] light:border-slate-200 overflow-hidden bg-black/50 shadow-2xl shadow-black/40">
                  <iframe
                    title="Video de la clase"
                    src={`https://www.youtube.com/embed/${classItem.videoId}`}
                    allowFullScreen
                    className="absolute inset-0 w-full h-full border-0"
                  />
                </div>
              ) : (
                <EmptyState icon={<Video className="w-5 h-5" />} title="Video en producción" desc="El tutor publicará la grabación pronto." accent="violet" />
              )}
            </motion.div>
          )}

          {tab === 'slides' && (
            <motion.div key="slides" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              {classItem.slidesUrl ? (
                <div className="rounded-2xl border border-white/[0.07] light:border-slate-200 overflow-hidden shadow-xl">
                  <iframe
                    title="Presentación de la clase"
                    src={getEmbedUrl(classItem.slidesUrl)}
                    className="w-full h-[320px] sm:h-[480px] border-0"
                    allow="fullscreen"
                    allowFullScreen
                  />
                </div>
              ) : (
                <EmptyState icon={<Presentation className="w-5 h-5" />} title="Diapositivas próximamente" desc="No se ha vinculado una presentación para esta sesión." accent="indigo" />
              )}
            </motion.div>
          )}

          {tab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="space-y-5"
            >
              {/* Activity header */}
              <div className="surface rounded-2xl p-6 space-y-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-violet-400 light:text-violet-600">
                    Entrega semanal
                  </span>
                  <h3 className="font-display text-lg sm:text-xl font-bold text-white light:text-slate-900 mt-1 leading-tight">
                    {classItem.actTitle || 'Actividad práctica'}
                  </h3>
                  <p className="text-[13px] text-slate-400 light:text-slate-500 mt-2 leading-relaxed">
                    {classItem.actDesc || 'Escribí tu respuesta para la consigna de esta clase.'}
                  </p>
                </div>

                {/* Deadline badge */}
                {classItem.deadline && (
                  <div className={`flex items-center gap-2.5 text-[12px] font-semibold px-3.5 py-2.5 rounded-xl border w-fit ${
                    overdue
                      ? 'bg-rose-500/[0.07] border-rose-500/15 text-rose-400 light:text-rose-600'
                      : 'bg-amber-500/[0.07] border-amber-500/15 text-amber-400 light:text-amber-600'
                  }`}>
                    {overdue
                      ? <><Clock className="w-3.5 h-3.5 shrink-0" /><span>Plazo cerrado · {fmt(classItem.deadline)}</span></>
                      : <><CalendarDays className="w-3.5 h-3.5 shrink-0" /><span>Entrega hasta el {fmt(classItem.deadline)}</span></>
                    }
                  </div>
                )}
              </div>

              {/* Submitted state */}
              {existing || justSubmitted ? (
                <div className="relative surface rounded-2xl p-6 space-y-5 overflow-hidden border-emerald-500/[0.12] light:border-emerald-200/60"
                  style={{ borderColor: 'rgba(16,185,129,0.12)' }}>
                  {justSubmitted && <Confetti />}

                  {/* Success header */}
                  <div className="flex flex-col items-center text-center gap-3 relative z-10">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/12 border border-emerald-500/20 flex items-center justify-center animate-bounce-slow">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-base text-white light:text-slate-900">¡Actividad entregada!</h4>
                      <p className="text-[12px] text-slate-400 mt-0.5">Tu respuesta fue recibida. El tutor la revisará pronto.</p>
                    </div>
                  </div>

                  {/* Response preview */}
                  <div className="bg-white/[0.03] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 rounded-xl p-4 text-[12px] text-slate-300 light:text-slate-700 font-mono leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap relative z-10">
                    {existing?.responseText || response}
                  </div>

                  {/* Grade */}
                  {existing?.grade && (
                    <div className="border-t border-white/[0.06] light:border-slate-100 pt-4 space-y-3 relative z-10">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                          Corrección del docente
                        </span>
                        <span className={`px-3 py-1 text-[11px] font-bold rounded-lg border ${gradeCls}`}>
                          {existing.grade}
                        </span>
                      </div>
                      {existing.feedback && (
                        <div className="p-4 bg-violet-500/[0.05] border border-violet-500/[0.1] rounded-xl">
                          <p className="text-[13px] text-slate-300 light:text-slate-600 italic leading-relaxed">
                            "{existing.feedback}"
                          </p>
                          {existing.correctedAt && (
                            <span className="text-[10px] text-slate-500 block mt-2 text-right font-mono">
                              {new Date(existing.correctedAt).toLocaleDateString('es-AR')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 font-mono">
                        Tu respuesta
                      </label>
                      <div className="flex items-center gap-2">
                        {draftBanner && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-500/8 border border-emerald-500/14 px-2 py-0.5 rounded-lg"
                          >
                            <History className="w-2.5 h-2.5" /> Borrador recuperado
                          </motion.span>
                        )}
                        {response && (
                          <span className="text-[10px] text-slate-600 font-mono">
                            {wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}
                          </span>
                        )}
                      </div>
                    </div>
                    <textarea
                      disabled={overdue}
                      value={response}
                      onChange={e => onType(e.target.value)}
                      placeholder="Escribí tu reflexión, análisis o respuesta a la consigna…"
                      className="w-full min-h-[180px] bg-white/[0.03] light:bg-white border border-white/[0.07] light:border-slate-200 rounded-2xl p-4 text-[13px] text-white light:text-slate-800 placeholder-slate-600 light:placeholder-slate-400 font-sans focus:border-violet-500/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed resize-none leading-relaxed"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-600 font-mono">
                        {response.length > 0 ? `${response.length} caracteres` : ''}
                      </span>
                      <button
                        type="submit"
                        disabled={overdue || !response.trim()}
                        className="liquid-glass-btn px-6 py-2.5 text-[13px]"
                      >
                        Entregar actividad →
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Empty State ──────────────────────────────────────────────── */
function EmptyState({ icon, title, desc, accent }: { icon: React.ReactNode; title: string; desc: string; accent: string }) {
  const cls = accent === 'indigo'
    ? 'bg-indigo-500/8 text-indigo-400 light:text-indigo-600'
    : 'bg-violet-500/8 text-violet-400 light:text-violet-600';
  return (
    <div className="h-[260px] rounded-2xl border border-white/[0.06] light:border-slate-200 flex flex-col items-center justify-center text-center p-8 surface-subtle">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${cls}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-[13px] text-white light:text-slate-800 mb-1.5">{title}</h3>
      <p className="text-[12px] text-slate-500 max-w-xs leading-relaxed">{desc}</p>
    </div>
  );
}
