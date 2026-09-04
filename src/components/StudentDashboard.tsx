import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock, CheckCircle, Calendar, Clock,
  Search, ChevronRight, Zap, Target, ArrowRight, TrendingUp,
  Code2, Terminal, Bot, LineChart, Briefcase,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const COURSE_ICONS: Record<string, LucideIcon> = {
  prog1: Code2,
  prog2: Terminal,
  ia: Bot,
  inversiones: LineChart,
  'vida-pro': Briefcase,
};
import { ClassItem, User, ActivitySubmission } from '../types';
import { COURSES, UPCOMING_COURSES } from '../data';
import { ordenEnNivel } from '../classKeys';

interface Props {
  user: User;
  classes: ClassItem[];
  submissions: ActivitySubmission[];
  onOpenClass: (level: number, week: number) => void;
}

/* ── Progress Ring ──────────────────────────────────────────────── */
function ProgressRing({ percent, size = 80, stroke = 6, color = '#7C3AED' }: {
  percent: number; size?: number; stroke?: number; color?: string;
}) {
  const r    = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round"
        className="progress-ring-circle"
      />
    </svg>
  );
}

/* ── Stat Card ──────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: number | string; sub: string; color: string; icon: LucideIcon;
}) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    violet:  { bg: 'bg-violet-500/[0.07]',  text: 'text-violet-400 light:text-violet-600',  border: 'border-violet-500/15 light:border-violet-200' },
    emerald: { bg: 'bg-emerald-500/[0.07]', text: 'text-emerald-400 light:text-emerald-600', border: 'border-emerald-500/15 light:border-emerald-200' },
    sky:     { bg: 'bg-sky-500/[0.07]',     text: 'text-sky-400 light:text-sky-600',         border: 'border-sky-500/15 light:border-sky-200' },
  };
  const c = colors[color] ?? colors.violet;
  return (
    <div className={`relative overflow-hidden flex flex-col gap-0.5 px-4 py-3 rounded-2xl border ${c.bg} ${c.border} min-w-[96px]`}>
      <Icon className={`absolute -right-2 -bottom-2 w-11 h-11 ${c.text} opacity-[0.09]`} strokeWidth={1.5} />
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3 h-3 ${c.text} shrink-0`} strokeWidth={2.5} />
        <span className="text-[11px] font-medium text-slate-500 light:text-slate-400 leading-tight">{label}</span>
      </div>
      <span className={`text-xl font-bold font-display ${c.text} leading-none tabular-nums`}>{value}</span>
      <span className="text-[10px] text-slate-600 light:text-slate-400 font-mono leading-none">{sub}</span>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function StudentDashboard({ user, classes, submissions, onOpenClass }: Props) {
  const activeLevel    = user.level ?? 0;
  const listRef        = useRef<HTMLDivElement>(null);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<'all' | 'pending' | 'done'>('all');

  const mine = submissions.filter(s => s.studentEmail.toLowerCase() === user.email.toLowerCase());

  const courseClasses = classes
    .filter(cl => cl.level === activeLevel && cl.school === user.school && !cl.isSyllabus)
    // Orden real del recorrido: módulo 1 clases 1-8, módulo 2 clases 1-8, etc.
    // Ordenar solo por week mezclaría las cuatro "clase 1" de los cuatro módulos.
    .sort((a, b) => ordenEnNivel(a.module, a.week) - ordenEnNivel(b.module, b.week));

  const now        = new Date();
  const hora       = now.getHours();
  const saludo     = hora < 13 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  
  // Una entrega corresponde a la clase si coinciden nivel, módulo y número.
  // Las entregas viejas no tienen classModule: en ese caso no filtramos por módulo.
  const coincide = (s: ActivitySubmission, cl: ClassItem) =>
    s.classLevel === cl.level &&
    s.classWeek === cl.week &&
    (s.classModule === undefined || s.classModule === (cl.module ?? 1));

  const submitted  = (cl: ClassItem) => mine.some(s => coincide(s, cl));
  
  // Regla de desbloqueo combinado:
  // (a) Ya llegó su unlockAt (o no tiene)
  // (b) La primera clase (semana menor) siempre está habilitada temporalmente; las siguientes requieren que la clase anterior esté entregada (submitted)
  const isUnlocked = (cl: ClassItem, index: number) => {
    // Verificación temporal
    const timeReached = !cl.unlockAt || now >= new Date(cl.unlockAt);
    if (!timeReached) return false;

    // Primera clase del nivel siempre disponible si llegó su fecha
    if (index === 0) return true;

    // Si el alumno ya la entregó previamente, siempre conserva acceso permanente
    if (submitted(cl)) return true;

    // Secuencia: la clase inmediatamente anterior debe haber sido entregada
    const prevClass = courseClasses[index - 1];
    return prevClass ? submitted(prevClass) : true;
  };

  const isOpen = (cl: ClassItem) => {
    // Ubicamos por módulo Y número: con 4 módulos hay cuatro "clase 1" distintas,
    // y buscar solo por week devolvía siempre la primera, rompiendo la secuencia.
    const idx = courseClasses.findIndex(
      c => c.week === cl.week && (c.module ?? 1) === (cl.module ?? 1)
    );
    return isUnlocked(cl, idx !== -1 ? idx : 0);
  };

  const doneCount  = courseClasses.filter(cl => submitted(cl)).length;
  const openCount  = courseClasses.filter(cl => isOpen(cl) && !submitted(cl)).length;
  const total      = courseClasses.length || 1;
  const pct        = Math.round((doneCount / total) * 100);

  const nextClass  = courseClasses.find(cl => isOpen(cl) && !submitted(cl)) ?? null;
  const course     = COURSES.find(c => c.id === activeLevel);

  const fmt = (d: string) => !d ? '—' : new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

  // "Vence hoy" (< 24h) / "Vence mañana" (< 48h) — null si falta más o ya venció
  const urgency = (d?: string): string | null => {
    if (!d) return null;
    const diff = new Date(d).getTime() - now.getTime();
    if (diff <= 0) return null;
    if (diff <= 24 * 3600 * 1000) return 'Vence hoy';
    if (diff <= 48 * 3600 * 1000) return 'Vence mañana';
    return null;
  };

  const gradeOf = (cl: ClassItem) =>
    mine.find(s => coincide(s, cl))?.grade;

  const visible = courseClasses.filter(cl => {
    if (filter === 'pending' && (!isOpen(cl) || submitted(cl))) return false;
    if (filter === 'done'    && !submitted(cl)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return cl.title.toLowerCase().includes(q) || `semana ${cl.week}`.includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-7">

      {/* ── HERO ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16,1,0.3,1] }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-5"
      >
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-500 light:text-slate-400">
            {user.school || 'Fintly Campus'} · Nivel {activeLevel}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white light:text-slate-900 tracking-tight leading-tight">
            {saludo}, <span className="gradient-text-brand">{user.name.split(' ')[0]}</span>
          </h1>
          <p className="text-[13px] text-slate-400 light:text-slate-500">
            {pct >= 100
              ? 'Terminaste el curso completo. Eso no lo hace cualquiera.'
              : pct >= 50
              ? 'Ya pasaste la mitad. De acá en adelante es cuesta abajo.'
              : openCount > 0
              ? (openCount === 1
                  ? 'Tenés una clase nueva esperándote.'
                  : `Tenés ${openCount} clases listas. Arrancá por la primera.`)
              : 'Estás al día. Cuando salga una clase nueva, la campanita te avisa.'}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatCard label="Entregadas"  value={doneCount}  sub={`de ${total}`}    color="emerald" icon={CheckCircle} />
          <StatCard label="Disponibles" value={openCount}  sub="para cursar"      color="violet"  icon={Zap} />
          <StatCard label="Progreso"    value={`${pct}%`}  sub="del curso"        color="sky"     icon={TrendingUp} />
        </div>
      </motion.div>

      {/* ── COURSE + NEXT CLASS ──────────────────────────── */}
      {course && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.45, ease: [0.16,1,0.3,1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Course card */}
          <div className="md:col-span-2 surface rounded-2xl p-6 relative overflow-hidden">
            {/* Accent top line */}
            <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${course.accent}`} />

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-4">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 light:text-slate-400">
                    Tu curso · Nivel {activeLevel}
                  </span>
                  <h2 className="font-display font-bold text-lg text-white light:text-slate-900 mt-0.5 leading-tight">
                    {course.name}
                  </h2>
                  <p className="text-[13px] text-slate-400 light:text-slate-500 mt-1.5 leading-relaxed">
                    {course.desc}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">{doneCount} de {total} clases completadas</span>
                    <span className="font-bold text-white light:text-slate-800 font-mono">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.05] light:bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${course.accent}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.1, delay: 0.4, ease: [0.16,1,0.3,1] }}
                    />
                  </div>
                </div>
              </div>

              {/* Progress ring (desktop) */}
              <div className="relative hidden sm:flex flex-col items-center justify-center shrink-0">
                <ProgressRing percent={pct} size={76} stroke={5} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white light:text-slate-900 font-display">{pct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Next class CTA */}
          {nextClass ? (
            <motion.button
              type="button"
              onClick={() => onOpenClass(nextClass.level, nextClass.week)}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="surface rounded-2xl p-5 text-left flex flex-col justify-between cursor-pointer group relative overflow-hidden transition-all"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/0 to-violet-600/0 group-hover:from-violet-600/[0.05] group-hover:to-indigo-600/[0.05] transition-all duration-300 rounded-2xl" />
              <div className="absolute inset-0 border border-violet-500/0 group-hover:border-violet-500/15 rounded-2xl transition-all duration-300" />

              <div className="relative space-y-2">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-[11px] font-semibold text-violet-400 light:text-violet-600">
                    Seguí por acá
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Semana {nextClass.week}</div>
                <h3 className="font-semibold text-white light:text-slate-800 text-sm leading-snug group-hover:text-violet-300 light:group-hover:text-violet-600 transition-colors">
                  {nextClass.title}
                </h3>
                {nextClass.deadline && (
                  urgency(nextClass.deadline) ? (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-400 light:text-amber-700 bg-amber-500/10 light:bg-amber-50 border border-amber-500/20 light:border-amber-200 px-2 py-1 rounded-lg">
                      <Clock className="w-3 h-3" />
                      <span>{urgency(nextClass.deadline)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                      <Calendar className="w-3 h-3" />
                      <span>Límite {fmt(nextClass.deadline)}</span>
                    </div>
                  )
                )}
              </div>

              <div className="relative mt-5 flex items-center gap-2 text-xs font-semibold text-violet-400 light:text-violet-600 group-hover:gap-3 transition-all">
                <span>Abrir clase</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </motion.button>
          ) : (
            <div className="surface rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white light:text-slate-800">¡Todo al día!</p>
                <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">Sin clases pendientes disponibles.</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── CLASS LIST ───────────────────────────────────── */}
      <motion.div
        ref={listRef}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45 }}
        className="space-y-4"
      >
        {/* List header */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar clase…"
              className="w-full h-10 bg-white/[0.04] light:bg-white border border-white/[0.07] light:border-slate-200 rounded-xl pl-10 pr-4 text-[13px] text-white light:text-slate-800 placeholder-slate-600 light:placeholder-slate-400 transition-all font-sans"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer text-xs">
                ✕
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex bg-white/[0.04] light:bg-slate-100 p-1 rounded-xl border border-white/[0.06] light:border-slate-200 gap-0.5 shrink-0 text-[12px]">
            {([
              { id: 'all',     label: 'Todas',       n: courseClasses.length },
              { id: 'pending', label: 'Disponibles', n: courseClasses.filter(c => isOpen(c) && !submitted(c)).length },
              { id: 'done',    label: 'Entregadas',  n: courseClasses.filter(c => submitted(c)).length },
            ] as const).map(tab => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-3 sm:py-1.5 font-semibold rounded-lg cursor-pointer whitespace-nowrap transition-all ${
                    active ? 'text-white' : 'text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-700'
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
                    active ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-slate-500 light:bg-slate-200 light:text-slate-500'
                  }`}>{tab.n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={filter + search}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-1.5"
          >
            {visible.length > 0 ? visible.map((cl, i) => {
              const open = isOpen(cl);
              const done = submitted(cl);
              return (
                <motion.div
                  key={`${cl.module ?? 1}-${cl.week}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.035, duration: 0.28 }}
                  onClick={() => open && onOpenClass(cl.level, cl.week)}
                  className={`group flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-200 ${
                    done
                      ? 'bg-emerald-500/[0.04] border-emerald-500/[0.12] light:bg-emerald-50/60 light:border-emerald-200/60 cursor-pointer hover:bg-emerald-500/[0.07]'
                      : open
                      ? 'bg-white/[0.03] light:bg-white border-white/[0.07] light:border-slate-200 cursor-pointer hover:bg-white/[0.06] light:hover:bg-slate-50 hover:border-violet-500/20'
                      : 'bg-white/[0.015] border-white/[0.04] opacity-45 cursor-not-allowed'
                  }`}
                >
                  {/* Week badge */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-[11px] shrink-0 transition-transform group-hover:scale-105 ${
                    done
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 light:bg-emerald-50 light:border-emerald-200 light:text-emerald-600'
                      : open
                      ? 'bg-violet-500/10 border border-violet-500/18 text-violet-400 light:bg-violet-50 light:border-violet-200 light:text-violet-600'
                      : 'bg-white/[0.05] border border-white/[0.06] text-slate-600'
                  }`}>
                    {done ? <CheckCircle className="w-4 h-4" /> : open ? cl.week : <Lock className="w-3.5 h-3.5" />}
                  </div>

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium leading-snug truncate transition-colors ${
                      open
                        ? done
                          ? 'text-emerald-300 light:text-emerald-700'
                          : 'text-white light:text-slate-800 group-hover:text-violet-300 light:group-hover:text-violet-700'
                        : 'text-slate-500'
                    }`}>
                      {cl.title}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Semana {cl.week}
                      {cl.deadline && open && !done && (
                        urgency(cl.deadline) ? (
                          <span className="ml-2 inline-flex items-center gap-1 font-bold text-amber-400 light:text-amber-600">
                            <Clock className="w-3 h-3" />
                            {urgency(cl.deadline)}
                          </span>
                        ) : (
                          <span className="ml-2 text-slate-600">· Límite {fmt(cl.deadline)}</span>
                        )
                      )}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    {done ? (
                      <span className="text-[11px] font-semibold text-emerald-400 light:text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {gradeOf(cl) ? (
                          <span className="capitalize">{gradeOf(cl)}</span>
                        ) : 'Entregado'}
                      </span>
                    ) : open ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-violet-400 transition-colors">
                        <span className="hidden sm:block">Abrir</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all" />
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono">
                        {cl.unlockAt && now < new Date(cl.unlockAt)
                          ? `Abre ${fmt(cl.unlockAt)}`
                          : 'Requiere anterior'}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            }) : courseClasses.length > 0 ? (
              /* No results */
              <div className="surface-subtle rounded-2xl py-12 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto">
                  <Search className="w-4.5 h-4.5 text-violet-400 animate-pulse-slow" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white light:text-slate-800">Sin resultados</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">Ninguna clase coincide con los filtros.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSearch(''); setFilter('all'); }}
                  className="liquid-glass-btn px-5 py-2 text-xs mx-auto"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              /* Empty state */
              <div className="surface-subtle rounded-2xl py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/14 flex items-center justify-center mx-auto">
                  <Zap className="w-5 h-5 text-violet-400 animate-pulse-slow" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-white light:text-slate-800">
                    Todavía no hay clases
                  </p>
                  <p className="text-[12px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Cuando tu profe publique la primera, la vas a ver acá.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ── PRÓXIMAMENTE ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.45 }}
        className="space-y-4 pt-4"
      >
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-lg text-white light:text-slate-900 tracking-tight">
            Próximamente en Fintly
          </h2>
          <span className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-400 light:text-violet-600 font-mono uppercase tracking-wider">
            Nuevos cursos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {UPCOMING_COURSES.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.06, duration: 0.4, ease: [0.16,1,0.3,1] }}
              whileHover={{
                y: -6,
                scale: 1.035,
                transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1], delay: 0 },
              }}
              whileTap={{ scale: 0.985, transition: { duration: 0.1 } }}
              className="surface hover-lift rounded-2xl overflow-hidden relative group cursor-pointer will-change-transform"
            >
              {/* Accent gradient top */}
              <div className={`h-1 bg-gradient-to-r ${c.accent} transition-all duration-200 group-hover:h-1.5`} />

              <div className="p-5 space-y-3.5">
                {/* Emoji + badges */}
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.accent} flex items-center justify-center shadow-lg transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-rotate-6`}>
                    {(() => { const Ic = COURSE_ICONS[c.id] ?? Zap; return <Ic className="w-[22px] h-[22px] text-white" strokeWidth={2.2} />; })()}
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-white/[0.05] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 text-[10px] font-bold text-slate-400 light:text-slate-500 font-mono">
                    +{c.minAge} años
                  </span>
                </div>

                {/* Title + tagline */}
                <div>
                  <h3 className="font-display font-bold text-white light:text-slate-900 text-base leading-tight">
                    {c.name}
                  </h3>
                  <p className="text-[12px] text-slate-400 light:text-slate-500 mt-1 leading-snug">
                    {c.tagline}
                  </p>
                </div>

                {/* Módulos */}
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

                {/* Próximamente badge */}
                <div className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.03] light:bg-slate-50 border border-dashed border-white/[0.08] light:border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-slate-400 light:text-slate-500 uppercase tracking-widest font-mono">
                    Próximamente
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
