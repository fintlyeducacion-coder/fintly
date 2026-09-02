import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Sparkles, ArrowRight, Check } from 'lucide-react';
import { ClassItem, User } from '../types';

interface Props {
  user: User;
  classes: ClassItem[];
  onOpenClass: (level: number, week: number) => void;
}

const classKey = (cl: ClassItem) => `${cl.level}_${cl.module ?? 0}_${cl.week}`;

export default function NotificationBell({ user, classes, onOpenClass }: Props) {
  const storageKey = `fintly_seen_classes_${user.email.toLowerCase()}`;

  // null = todavía no inicializado para este alumno
  const [seen, setSeen] = useState<string[] | null>(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  });

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Clases del alumno que ya están desbloqueadas
  const available = useMemo(() => {
    const now = new Date();
    return classes
      .filter(cl =>
        !cl.isSyllabus &&
        cl.level === (user.level ?? 0) &&
        cl.school?.toLowerCase() === user.school?.toLowerCase() &&
        (!cl.unlockAt || now >= new Date(cl.unlockAt))
      )
      .sort((a, b) => new Date(b.unlockAt || 0).getTime() - new Date(a.unlockAt || 0).getTime());
  }, [classes, user.level, user.school]);

  // Primera vez: marcamos todo lo que ya existe como visto (línea de base),
  // así solo notificamos lo que se publique de ahora en adelante.
  useEffect(() => {
    if (seen === null && available.length > 0) {
      const baseline = available.map(classKey);
      localStorage.setItem(storageKey, JSON.stringify(baseline));
      setSeen(baseline);
    }
  }, [seen, available, storageKey]);

  const unread = seen === null ? [] : available.filter(cl => !seen.includes(classKey(cl)));

  // Cerrar al hacer click afuera
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const markAllRead = () => {
    const all = available.map(classKey);
    localStorage.setItem(storageKey, JSON.stringify(all));
    setSeen(all);
  };

  const openClass = (cl: ClassItem) => {
    const next = Array.from(new Set([...(seen ?? []), classKey(cl)]));
    localStorage.setItem(storageKey, JSON.stringify(next));
    setSeen(next);
    setOpen(false);
    onOpenClass(cl.level, cl.week);
  };

  const fmt = (d?: string) =>
    !d ? '' : new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

  return (
    <div ref={wrapRef} className="relative">
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale: 0.9 }}
        title="Novedades"
        className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
          unread.length > 0
            ? 'bg-violet-500/12 text-violet-300 light:text-violet-600 light:bg-violet-50'
            : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-800 hover:bg-white/[0.07] light:hover:bg-slate-100'
        }`}
      >
        <motion.span
          animate={unread.length > 0 ? { rotate: [0, -12, 10, -8, 6, 0] } : {}}
          transition={{ duration: 0.8, repeat: unread.length > 0 ? Infinity : 0, repeatDelay: 4 }}
          className="flex"
        >
          <Bell className="w-[15px] h-[15px]" />
        </motion.span>

        {unread.length > 0 && (
          <>
            <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[9px] font-bold font-mono flex items-center justify-center shadow-lg shadow-violet-900/50 border border-[#0a0912] light:border-white">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
            <span className="absolute -top-1 -right-1 w-[15px] h-[15px] rounded-full bg-violet-500/60 animate-ping-slow pointer-events-none" />
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] w-[300px] sm:w-[340px] surface-elevated rounded-2xl overflow-hidden z-50 origin-top-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.06] light:border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[13px] text-white light:text-slate-900">
                  Novedades
                </span>
                {unread.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-violet-500/12 border border-violet-500/20 text-[9px] font-bold font-mono text-violet-400 light:text-violet-600">
                    {unread.length} nueva{unread.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {unread.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-violet-400 light:hover:text-violet-600 transition-colors cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  Marcar leídas
                </button>
              )}
            </div>

            {/* Lista */}
            <div className="max-h-[320px] overflow-y-auto">
              {unread.length > 0 ? (
                unread.map((cl, i) => (
                  <motion.button
                    key={classKey(cl)}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.22 }}
                    onClick={() => openClass(cl)}
                    className="w-full text-left group flex items-start gap-3 px-4 py-3 hover:bg-violet-500/[0.06] light:hover:bg-violet-50/70 transition-colors cursor-pointer border-b border-white/[0.04] light:border-slate-50 last:border-0"
                  >
                    <span className="mt-0.5 w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/25 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400 light:text-violet-600" />
                    </span>

                    <span className="flex-1 min-w-0">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-violet-400 light:text-violet-600">
                        Nueva clase
                      </span>
                      <span className="block text-[13px] font-medium text-white light:text-slate-800 leading-snug truncate group-hover:text-violet-300 light:group-hover:text-violet-700 transition-colors">
                        {cl.title || `Semana ${cl.week}`}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                        Semana {cl.week}
                        {cl.unlockAt && ` · ${fmt(cl.unlockAt)}`}
                      </span>
                    </span>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-violet-400 mt-2 shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                  </motion.button>
                ))
              ) : (
                <div className="px-4 py-9 text-center space-y-2">
                  <span className="w-10 h-10 rounded-full bg-white/[0.04] light:bg-slate-100 flex items-center justify-center mx-auto">
                    <Bell className="w-4 h-4 text-slate-600 light:text-slate-400" />
                  </span>
                  <p className="text-[13px] font-semibold text-white light:text-slate-800">
                    Todo al día
                  </p>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Te avisamos acá cuando se publique<br />una clase nueva.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
