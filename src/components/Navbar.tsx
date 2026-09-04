import { motion } from 'motion/react';
import { LogOut, Sun, Moon } from 'lucide-react';
import { User as UserType, ClassItem } from '../types';
import NotificationBell from './NotificationBell';

interface NavbarProps {
  user: UserType;
  onLogout: () => void;
  onNavigateHome: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  classes?: ClassItem[];
  onOpenClass?: (level: number, week: number) => void;
}

const ROLE_CONFIG: Record<string, { label: string; dot: string; avatar: string; badge: string }> = {
  admin: {
    label: 'Admin',
    dot: 'bg-violet-400',
    avatar: 'from-violet-600 to-indigo-600',
    badge: 'text-violet-400 light:text-violet-600',
  },
  directivo: {
    label: 'Directivo',
    dot: 'bg-indigo-400',
    avatar: 'from-indigo-500 to-blue-600',
    badge: 'text-indigo-400 light:text-indigo-600',
  },
  alumno: {
    label: 'Alumno',
    dot: 'bg-emerald-400',
    avatar: 'from-emerald-500 to-teal-600',
    badge: 'text-emerald-400 light:text-emerald-600',
  },
  pausado: {
    label: 'Pendiente',
    dot: 'bg-amber-400 animate-pulse-slow',
    avatar: 'from-amber-500 to-orange-500',
    badge: 'text-amber-400 light:text-amber-600',
  },
};

/* Separador entre grupos funcionales */
const Divider = () => (
  <span className="w-px h-5 bg-white/[0.07] light:bg-slate-200 shrink-0" aria-hidden="true" />
);

export default function Navbar({ user, onLogout, onNavigateHome, theme, onToggleTheme, classes = [], onOpenClass }: NavbarProps) {
  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.alumno;
  const firstName = user.name.split(' ')[0];

  return (
    <div className="sticky top-0 z-50 w-full">
      <nav className="glass-nav-full w-full px-3 sm:px-6 h-[58px]">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-3">

        {/* ══ IZQUIERDA — marca + contexto ══════════════════ */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">

          {/* Marca */}
          <motion.button
            onClick={onNavigateHome}
            whileTap={{ scale: 0.95 }}
            title="Ir al inicio"
            className="group flex items-center cursor-pointer select-none shrink-0 pl-1 py-2 -my-2"
          >
            <span className="relative flex items-center h-[28px] rounded-[9px] bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500 shadow-lg shadow-violet-950/50 light:shadow-violet-300/50 overflow-hidden px-[8px] transition-shadow duration-300 group-hover:shadow-violet-800/60">
              <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
              <span className="relative font-display font-extrabold text-white text-[14px] leading-none">F</span>
              <span className="relative overflow-hidden max-w-0 opacity-0 group-hover:max-w-[52px] group-hover:opacity-100 transition-[max-width,opacity] duration-300 ease-out">
                <span className="font-display font-extrabold text-white text-[14px] leading-none whitespace-nowrap">intly</span>
              </span>
            </span>
          </motion.button>

          <span className="hidden sm:block"><Divider /></span>

          {/* Badge de rol */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 h-[26px] rounded-full bg-white/[0.04] light:bg-slate-100 border border-white/[0.07] light:border-slate-200 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
            <span className={`text-[10px] font-bold font-mono tracking-wider uppercase leading-none ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>

          {/* Tema */}
          <motion.button
            onClick={onToggleTheme}
            whileTap={{ scale: 0.9 }}
            title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
            aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
            className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-800 hover:bg-white/[0.07] light:hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <motion.span
              key={theme}
              initial={{ rotate: -25, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.18 }}
              className="flex"
            >
              {theme === 'light'
                ? <Moon className="w-[15px] h-[15px]" />
                : <Sun className="w-[15px] h-[15px]" />}
            </motion.span>
          </motion.button>
        </div>

        {/* ══ DERECHA — novedades + identidad ═══════════════ */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">

          {/* Campanita — solo alumnos */}
          {user.role === 'alumno' && onOpenClass && (
            <>
              <NotificationBell user={user} classes={classes} onOpenClass={onOpenClass} />
              <Divider />
            </>
          )}

          {/* Identidad */}
          <div className="flex items-center gap-2 select-none">
            <div className={`w-[30px] h-[30px] rounded-full bg-gradient-to-br ${cfg.avatar} flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-md ring-1 ring-white/10`}>
              {user.initials}
            </div>
            <span className="hidden md:block text-[13px] font-medium text-slate-300 light:text-slate-600 leading-none">
              {firstName}
            </span>
          </div>

          {/* Salir */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex items-center gap-1.5 h-10 sm:h-9 px-3 sm:px-2.5 rounded-xl text-slate-400 hover:text-rose-400 light:text-slate-500 light:hover:text-rose-500 hover:bg-rose-500/[0.08] transition-colors text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-[15px] h-[15px] shrink-0" />
            <span className="hidden sm:block">Salir</span>
          </motion.button>
        </div>
        </div>
      </nav>
    </div>
  );
}
