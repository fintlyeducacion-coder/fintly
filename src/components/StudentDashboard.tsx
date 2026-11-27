import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock, CheckCircle, Clock, ChevronRight, Zap, ArrowRight,
  Code2, Terminal, Bot, LineChart, Briefcase, Sparkles, X, AlertTriangle,
  AlarmClock, CalendarClock, Play,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const COURSE_ICONS: Record<string, LucideIcon> = {
  prog1: Code2,
  prog2: Terminal,
  ia: Bot,
  inversiones: LineChart,
  'vida-pro': Briefcase,
};
import { ClassItem, User, ActivitySubmission, Curso } from '../types';
import { FINANZAS, CURSO_FINANZAS, cursoDe, inscripcionesDe, nivelesDe } from '../lib/cursos';
import { UPCOMING_COURSES, normalizarNota } from '../data';
import { construirRecorrido, sePuedeAbrir, Paso } from '../lib/recorrido';
import { avisoPrincipal, cuantoFalta, tonoDePaso, Aviso, Tono } from '../lib/avisos';
import { fechaCorta } from '../lib/fechas';

/** Los avisos que merecen un pop-up al entrar. Lo demás va sólo en la línea del panel. */
const CON_POPUP: Aviso['tono'][] = ['vencida', 'hoy', 'manana', 'disponible'];

interface Props {
  user: User;
  classes: ClassItem[];
  submissions: ActivitySubmission[];
  /** Todos los cursos del campus (para nombres y colores). */
  cursos?: Curso[];
  onOpenClass: (level: number, module: number | undefined, week: number, course?: string) => void;
}

/* ── Colores por urgencia ───────────────────────────────────────────
   Un solo código en todo el panel: lo que se ve en el aviso grande es lo
   mismo que se ve en la etiqueta de cada clase de la lista. */
type TonoAviso = Aviso['tono'];
const ESTILO: Record<TonoAviso, {
  caja: string; icono: string; titulo: string; boton: string; Icon: LucideIcon; punto?: string;
}> = {
  vencida: {
    caja: 'bg-rose-500/[0.06] border-rose-500/25 light:bg-rose-50/70 light:border-rose-200',
    icono: 'bg-rose-500/15 text-rose-400 light:bg-rose-100 light:text-rose-600',
    titulo: 'text-rose-200 light:text-rose-700',
    boton: 'bg-rose-500/90 hover:bg-rose-500 text-white',
    Icon: AlertTriangle, punto: 'bg-rose-400',
  },
  hoy: {
    caja: 'bg-orange-500/[0.06] border-orange-500/25 light:bg-orange-50/70 light:border-orange-200',
    icono: 'bg-orange-500/15 text-orange-400 light:bg-orange-100 light:text-orange-600',
    titulo: 'text-orange-200 light:text-orange-700',
    boton: 'bg-orange-500/90 hover:bg-orange-500 text-white',
    Icon: AlarmClock, punto: 'bg-orange-400',
  },
  manana: {
    caja: 'bg-amber-500/[0.05] border-amber-500/25 light:bg-amber-50/70 light:border-amber-200',
    icono: 'bg-amber-400/15 text-amber-300 light:bg-amber-100 light:text-amber-600',
    titulo: 'text-amber-100 light:text-amber-800',
    boton: 'bg-amber-400/90 hover:bg-amber-400 text-amber-950',
    Icon: Clock,
  },
  disponible: {
    caja: 'bg-violet-500/[0.06] border-violet-500/25 light:bg-violet-50/70 light:border-violet-200',
    icono: 'bg-violet-500/15 text-violet-300 light:bg-violet-100 light:text-violet-600',
    titulo: 'text-white light:text-slate-900',
    boton: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white',
    Icon: Play,
  },
  programada: {
    caja: 'bg-sky-500/[0.05] border-sky-500/20 light:bg-sky-50/70 light:border-sky-200',
    icono: 'bg-sky-500/15 text-sky-300 light:bg-sky-100 light:text-sky-600',
    titulo: 'text-sky-100 light:text-sky-800',
    boton: '', Icon: CalendarClock,
  },
  aldia: {
    caja: 'bg-emerald-500/[0.05] border-emerald-500/20 light:bg-emerald-50/70 light:border-emerald-200',
    icono: 'bg-emerald-500/15 text-emerald-300 light:bg-emerald-100 light:text-emerald-600',
    titulo: 'text-emerald-100 light:text-emerald-800',
    boton: '', Icon: CheckCircle,
  },
  vacio: {
    caja: 'bg-white/[0.03] border-white/[0.08] light:bg-white light:border-slate-200',
    icono: 'bg-violet-500/15 text-violet-400',
    titulo: 'text-white light:text-slate-900',
    boton: '', Icon: Zap,
  },
  // No se usan en el aviso grande (nunca es el más urgente), sólo para completar el tipo.
  bloqueada: { caja: '', icono: '', titulo: '', boton: '', Icon: Lock },
  entregada: { caja: '', icono: '', titulo: '', boton: '', Icon: CheckCircle },
};

/** Etiqueta de color de cada clase en la lista. */
const ETIQUETA: Record<Tono, { clase: string; franja: string }> = {
  vencida:    { clase: 'bg-rose-500/12 text-rose-300 border border-rose-500/25 light:bg-rose-50 light:text-rose-700 light:border-rose-200', franja: 'bg-rose-500/70' },
  hoy:        { clase: 'bg-orange-500/12 text-orange-300 border border-orange-500/25 light:bg-orange-50 light:text-orange-700 light:border-orange-200', franja: 'bg-orange-500/70' },
  manana:     { clase: 'bg-amber-400/10 text-amber-200 border border-amber-400/25 light:bg-amber-50 light:text-amber-700 light:border-amber-200', franja: 'bg-amber-400/60' },
  disponible: { clase: 'bg-violet-500/10 text-violet-300 border border-violet-500/25 light:bg-violet-50 light:text-violet-700 light:border-violet-200', franja: 'bg-violet-500/60' },
  programada: { clase: 'bg-sky-500/10 text-sky-300 border border-sky-500/20 light:bg-sky-50 light:text-sky-700 light:border-sky-200', franja: '' },
  bloqueada:  { clase: 'bg-white/[0.04] text-slate-400 border border-white/[0.08] light:bg-slate-100 light:text-slate-600 light:border-slate-200', franja: '' },
  entregada:  { clase: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 light:bg-emerald-50 light:text-emerald-700 light:border-emerald-200', franja: '' },
};

/* ── Próximo paso, en una línea ───────────────────────────────── */
function AvisoLinea({ aviso, onAbrir }: { aviso: Aviso; onAbrir: (cl: ClassItem) => void }) {
  const e = ESTILO[aviso.tono];
  const Icon = e.Icon;
  const contenido = (
    <>
      <div className={`relative shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${e.icono}`}>
        <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
        {e.punto && <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${e.punto}`} />}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-[14px] font-semibold leading-snug ${e.titulo}`}>{aviso.titulo}</p>
        <p className="text-[12px] text-slate-400 light:text-slate-600 leading-snug truncate">{aviso.detalle}</p>
      </div>
      {aviso.clase && <ArrowRight className="shrink-0 w-4 h-4 text-slate-500 group-hover:text-slate-300 light:group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />}
    </>
  );
  const clases = `group w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${e.caja}`;
  return aviso.clase ? (
    <button type="button" onClick={() => onAbrir(aviso.clase!)} className={`${clases} cursor-pointer`}>{contenido}</button>
  ) : (
    <div className={clases} role="status">{contenido}</div>
  );
}

/* ── Pop-up al entrar: lo urgente, una vez por sesión ──────────── */
function AvisoPopup({ aviso, onAbrir, onCerrar }: { aviso: Aviso; onAbrir: (cl: ClassItem) => void; onCerrar: () => void }) {
  const e = ESTILO[aviso.tono];
  const Icon = e.Icon;
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-black/55 light:bg-slate-900/25 backdrop-blur-md"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12, transition: { duration: 0.2 } }}
        transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.08 }}
        onClick={(ev) => ev.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="aviso-titulo"
        className="relative w-full max-w-sm rounded-3xl border border-white/[0.08] light:border-slate-200 bg-[#121027] light:bg-white p-7 text-center shadow-2xl"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.2 }}
          className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ${e.icono}`}
        >
          <Icon className="w-7 h-7" strokeWidth={2} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.35 }}>
          <h2 id="aviso-titulo" className={`mt-5 font-display font-bold text-xl leading-tight tracking-tight ${e.titulo}`}>
            {aviso.titulo}
          </h2>
          <p className="mt-2 text-[13px] text-slate-400 light:text-slate-600 leading-relaxed">{aviso.detalle}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.35 }} className="mt-6 space-y-2">
          {aviso.clase && aviso.accion && (
            <button
              type="button"
              onClick={() => { onCerrar(); onAbrir(aviso.clase!); }}
              className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[14px] font-bold cursor-pointer transition-all hover:gap-3 active:scale-[0.98] ${e.boton}`}
            >
              {aviso.accion}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onCerrar}
            className="w-full px-5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-400 light:text-slate-500 hover:text-white light:hover:text-slate-800 hover:bg-white/[0.04] light:hover:bg-slate-100 cursor-pointer transition-colors"
          >
            Ahora no
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ── Ventana de "Próximamente en Fintly" ───────────────────────── */
function Proximamente({ onCerrar }: { onCerrar: () => void }) {
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = antes; };
  }, [onCerrar]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-6"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.3, ease: [0.16,1,0.3,1] }}
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Próximamente en Fintly"
        className="surface w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 bg-[#0e0d1f] light:bg-white"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-bold text-xl text-white light:text-slate-900 tracking-tight">
                Próximamente en Fintly
              </h2>
              <span className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-400 light:text-violet-600 font-mono uppercase tracking-wider">
                Nuevos cursos
              </span>
            </div>
            <p className="text-[13px] text-slate-400 light:text-slate-600 mt-1">Lo que se viene después de Finanzas.</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.05] light:bg-slate-100 text-slate-300 light:text-slate-600 hover:bg-white/10 light:hover:bg-slate-200 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {UPCOMING_COURSES.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.05, duration: 0.4, ease: [0.16,1,0.3,1] }}
              whileHover={{ y: -6, scale: 1.035, transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1], delay: 0 } }}
              className="surface hover-lift rounded-2xl overflow-hidden relative group will-change-transform"
            >
              <div className={`h-1 bg-gradient-to-r ${c.accent} transition-all duration-200 group-hover:h-1.5`} />
              <div className="p-5 space-y-3.5">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.accent} flex items-center justify-center shadow-lg transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-rotate-6`}>
                    {(() => { const Ic = COURSE_ICONS[c.id] ?? Zap; return <Ic className="w-[22px] h-[22px] text-white" strokeWidth={2.2} />; })()}
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-white/[0.05] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 text-[10px] font-bold text-slate-400 light:text-slate-600 font-mono">
                    +{c.minAge} años
                  </span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-white light:text-slate-900 text-base leading-tight">{c.name}</h3>
                  <p className="text-[12px] text-slate-400 light:text-slate-600 mt-1 leading-snug">{c.tagline}</p>
                </div>
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-1.5">
                  {c.modules.map((m, mi) => (
                    <div key={mi} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.03] light:bg-slate-50 border border-white/[0.05] light:border-slate-100">
                      <span className={`w-4 h-4 rounded-md bg-gradient-to-br ${c.accent} flex items-center justify-center text-[8px] font-bold text-white shrink-0`}>
                        {mi + 1}
                      </span>
                      <span className="text-[10px] text-slate-400 light:text-slate-600 font-medium leading-tight truncate">{m}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.03] light:bg-slate-50 border border-dashed border-white/[0.08] light:border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-slate-400 light:text-slate-600 uppercase tracking-widest font-mono">Próximamente</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function StudentDashboard({ user, cursos = [CURSO_FINANZAS], classes, submissions, onOpenClass }: Props) {
  // Un alumno puede hacer varios cursos, cada uno en su nivel. Si hace más de
  // uno, elige cuál ver; si hace uno solo, ve lo mismo que siempre.
  const inscripciones  = inscripcionesDe(user);
  const [cursoElegido, setCursoElegido] = useState<string>(inscripciones[0]?.course ?? FINANZAS);
  const inscripcion    = inscripciones.find((i) => i.course === cursoElegido) ?? inscripciones[0];
  const cursoActual    = inscripcion?.course ?? FINANZAS;
  const infoCurso      = cursos.find((c) => c.id === cursoActual);
  const activeLevel    = inscripcion?.level ?? user.level ?? 0;
  const [filter, setFilter]       = useState<'all' | 'pending' | 'done'>('all');
  const [verProximamente, setVerProximamente] = useState(false);

  // La hora se actualiza cada minuto: las cuentas regresivas ("te quedan 5 h")
  // y los colores cambian solos sin recargar la página.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const hora   = now.getHours();
  const saludo = hora < 13 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';

  // La misma regla de desbloqueo que usan la campanita y la apertura de clases.
  const pasos: Paso[] = useMemo(
    () => construirRecorrido(
      classes.filter((cl) => cursoDe(cl) === cursoActual),
      submissions,
      { email: user.email, school: user.school, level: activeLevel },
      now
    ),
    [classes, submissions, user.email, user.school, activeLevel, cursoActual, now]
  );

  const aviso      = avisoPrincipal(pasos, now);

  // Pop-up al entrar, una vez por sesión y por aviso: si lo cierra, no vuelve
  // a aparecer cada vez que pasa por el panel. Si cambia (otra clase, otra
  // urgencia), sí aparece.
  const claveAviso = `fintly-aviso:${user.email}:${aviso.tono}:${aviso.clase?.id ?? `${aviso.clase?.module}-${aviso.clase?.week}`}`;
  const [popup, setPopup] = useState(false);
  useEffect(() => {
    if (!CON_POPUP.includes(aviso.tono)) return;
    let visto = false;
    try { visto = sessionStorage.getItem(claveAviso) === '1'; } catch { /* sin almacenamiento: se muestra */ }
    if (visto) return;
    const t = setTimeout(() => setPopup(true), 450);
    return () => clearTimeout(t);
  }, [claveAviso, aviso.tono]);
  const cerrarPopup = useCallback(() => {
    setPopup(false);
    try { sessionStorage.setItem(claveAviso, '1'); } catch { /* nada */ }
  }, [claveAviso]);
  const doneCount  = pasos.filter((p) => p.estado === 'entregada').length;
  const openCount  = pasos.filter((p) => p.estado === 'disponible').length;
  const total      = pasos.length;
  const pct        = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // Nombre y descripción del nivel (los que puso el admin, o los de siempre).
  // Si el nivel no tiene nombre propio, se muestra el del curso.
  const nivelInfo = nivelesDe(infoCurso ?? (cursoActual === FINANZAS ? CURSO_FINANZAS : undefined))[activeLevel];
  const course = nivelInfo && {
    id: activeLevel,
    name: nivelInfo.name || infoCurso?.name || 'Curso',
    desc: nivelInfo.desc,
    accent: nivelInfo.accent,
  };

  const abrir = (cl: ClassItem) => onOpenClass(cl.level, cl.module, cl.week, cl.course);

  // Normalizada, para que la nota diga lo mismo acá, en la clase y en el panel
  // del docente: en la base hay correcciones viejas guardadas como "Muy bueno".
  const notaDe = (p: Paso) => {
    const cruda = p.entrega?.grade;
    return normalizarNota(cruda) ?? cruda;
  };

  const textoEtiqueta = (p: Paso, tono: Tono): string => {
    switch (tono) {
      case 'vencida':    return 'Vencida · entregala';
      case 'hoy':        return `Vence hoy · ${cuantoFalta(p.clase.deadline, now)}`;
      case 'manana':     return 'Vence mañana';
      case 'disponible': return p.clase.deadline ? `Hasta el ${fechaCorta(p.clase.deadline)}` : 'Disponible';
      case 'programada': return `Se abre el ${fechaCorta(p.clase.unlockAt)}`;
      case 'bloqueada':  return p.anterior ? `Primero la clase ${p.anterior.week}` : 'Bloqueada';
      case 'entregada':  return notaDe(p) || 'Entregada';
    }
  };

  const visible = pasos.filter((p) => {
    if (filter === 'pending' && p.estado !== 'disponible') return false;
    if (filter === 'done'    && p.estado !== 'entregada') return false;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">

      {/* ── HERO ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16,1,0.3,1] }}
        className="space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400 light:text-slate-600 truncate">
              {user.school || 'Fintly Campus'} · Nivel {activeLevel}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white light:text-slate-900 tracking-tight leading-tight">
              {saludo}, <span className="gradient-text-brand">{user.name.split(' ')[0]}</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setVerProximamente(true)}
            aria-label="Próximamente en Fintly"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] light:border-slate-200 text-[12px] font-semibold text-slate-300 light:text-slate-600 hover:text-violet-300 light:hover:text-violet-700 hover:border-violet-500/30 cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">Próximamente</span>
          </button>
        </div>

        {course && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-slate-300 light:text-slate-700 font-medium truncate">{course.name}</span>
              <span className="text-slate-400 light:text-slate-600 font-mono shrink-0">{doneCount} de {total} · {pct}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] light:bg-slate-200/70 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${course.accent}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1.1, delay: 0.3, ease: [0.16,1,0.3,1] }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* ── SELECTOR DE CURSO (sólo si hace más de uno) ──── */}
      {inscripciones.length > 1 && (
        <div className="isolate flex bg-white/[0.04] light:bg-slate-100 p-1 rounded-xl border border-white/[0.06] light:border-slate-200 gap-0.5 w-full sm:w-fit max-w-full overflow-x-auto no-scrollbar text-[12px]">
          {inscripciones.map(({ course: id, level }) => {
            const activo = id === cursoActual;
            const nombre = cursos.find((c) => c.id === id)?.name ?? (id === FINANZAS ? CURSO_FINANZAS.name : id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCursoElegido(id)}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 font-semibold rounded-lg cursor-pointer whitespace-nowrap transition-all ${
                  activo ? 'text-white' : 'text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-800'
                }`}
              >
                {activo && (
                  <motion.div
                    layoutId="coursePill"
                    className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{nombre}</span>
                <span className={`relative z-10 text-[10px] font-mono ${activo ? 'text-white/80' : 'text-slate-500'}`}>
                  Nivel {level}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── PRÓXIMO PASO ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4 }}
      >
        <AvisoLinea aviso={aviso} onAbrir={abrir} />
      </motion.div>

      {/* ── CLASS LIST ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45 }}
        className="space-y-4"
      >
        <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-center justify-between gap-3">
          <h2 className="font-display font-bold text-base text-white light:text-slate-900">Tus clases</h2>
          <div className="isolate flex bg-white/[0.04] light:bg-slate-100 p-1 rounded-xl border border-white/[0.06] light:border-slate-200 gap-0.5 shrink-0 text-[12px] [&>button]:flex-1 min-[480px]:[&>button]:flex-none justify-center">
            {([
              { id: 'all',     label: 'Todas',      n: total },
              { id: 'pending', label: 'Para hacer', n: openCount },
              { id: 'done',    label: 'Entregadas', n: doneCount },
            ] as const).map(tab => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-3 sm:py-1.5 font-semibold rounded-lg cursor-pointer whitespace-nowrap transition-all ${
                    active ? 'text-white' : 'text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-800'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="filterPill"
                      className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg -z-10"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                  <span className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    active ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-slate-300 light:bg-slate-200 light:text-slate-700'
                  }`}>{tab.n}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-1.5"
          >
            {visible.length > 0 ? visible.map((p, i) => {
              const cl = p.clase;
              const open = sePuedeAbrir(p);
              const done = p.estado === 'entregada';
              const tono = tonoDePaso(p, now);
              const etiqueta = ETIQUETA[tono];
              return (
                <motion.div
                  key={`${cl.module ?? 1}-${cl.week}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.035, duration: 0.28 }}
                  onClick={() => open && abrir(cl)}
                  className={`group relative overflow-hidden flex items-center gap-3 sm:gap-4 pl-4 pr-3 sm:pr-4 py-3.5 rounded-xl border transition-all duration-200 ${
                    tono === 'vencida'
                      ? 'bg-rose-500/[0.03] border-rose-500/20 light:bg-rose-50/50 light:border-rose-200 cursor-pointer hover:bg-rose-500/[0.06]'
                      : tono === 'hoy'
                      ? 'bg-orange-500/[0.03] border-orange-500/20 light:bg-orange-50/50 light:border-orange-200 cursor-pointer hover:bg-orange-500/[0.06]'
                      : done
                      ? 'bg-emerald-500/[0.04] border-emerald-500/[0.12] light:bg-emerald-50/60 light:border-emerald-200/60 cursor-pointer hover:bg-emerald-500/[0.07]'
                      : open
                      ? 'bg-white/[0.03] light:bg-white border-white/[0.07] light:border-slate-200 cursor-pointer hover:bg-white/[0.06] light:hover:bg-slate-50 hover:border-violet-500/20'
                      : 'bg-white/[0.015] border-white/[0.04] light:bg-slate-50 light:border-slate-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {etiqueta.franja && <span className={`absolute left-0 inset-y-0 w-[3px] ${etiqueta.franja}`} />}

                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-[11px] shrink-0 transition-transform group-hover:scale-105 ${
                    done
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 light:bg-emerald-50 light:border-emerald-200 light:text-emerald-600'
                      : open
                      ? 'bg-violet-500/10 border border-violet-500/18 text-violet-400 light:bg-violet-50 light:border-violet-200 light:text-violet-600'
                      : 'bg-white/[0.05] border border-white/[0.06] text-slate-400 light:text-slate-600'
                  }`}>
                    {done ? <CheckCircle className="w-4 h-4" /> : open ? cl.week : <Lock className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium leading-snug truncate transition-colors ${
                      open
                        ? done
                          ? 'text-emerald-300 light:text-emerald-700'
                          : 'text-white light:text-slate-800 group-hover:text-violet-300 light:group-hover:text-violet-700'
                        : 'text-slate-400 light:text-slate-600'
                    }`}>
                      {cl.title}
                    </p>
                    <p className="text-[11px] text-slate-400 light:text-slate-600 font-mono mt-0.5">
                      Módulo {cl.module ?? 1} · Clase {cl.week}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap ${etiqueta.clase}`}>
                      {tono === 'vencida' && <AlertTriangle className="w-3 h-3" />}
                      {tono === 'hoy' && <AlarmClock className="w-3 h-3" />}
                      {tono === 'programada' && <CalendarClock className="w-3 h-3" />}
                      {done && <CheckCircle className="w-3 h-3" />}
                      <span>{textoEtiqueta(p, tono)}</span>
                    </span>
                    {open && (
                      <ChevronRight className="hidden sm:block w-4 h-4 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>
                </motion.div>
              );
            }) : total > 0 ? (
              <div className="surface-subtle rounded-2xl py-12 text-center space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white light:text-slate-800">Nada por acá</p>
                  <p className="text-[12px] text-slate-400 light:text-slate-600 mt-0.5">No hay clases en este filtro.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className="liquid-glass-btn px-5 py-2 text-xs mx-auto"
                >
                  Ver todas
                </button>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {verProximamente && <Proximamente onCerrar={() => setVerProximamente(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {popup && <AvisoPopup aviso={aviso} onAbrir={abrir} onCerrar={cerrarPopup} />}
      </AnimatePresence>
    </div>
  );
}
