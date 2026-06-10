import { motion } from 'motion/react';
import { LogOut, Sun, Moon } from 'lucide-react';
import { User as UserType } from '../types';

interface NavbarProps {
  user: UserType;
  onLogout: () => void;
  onNavigateHome: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Navbar({
  user,
  onLogout,
  onNavigateHome,
  theme,
  onToggleTheme
}: NavbarProps) {
  // Configuración de la insignia por rol
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-extrabold tracking-widest uppercase rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 light:bg-violet-50 light:border-violet-200/80 light:text-violet-700 font-mono select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 light:bg-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
            <span>Admin</span>
          </div>
        );
      case 'directivo':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-extrabold tracking-widest uppercase rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 light:bg-indigo-50 light:border-indigo-200/80 light:text-indigo-700 font-mono select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 light:bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            <span>Directivo</span>
          </div>
        );
      case 'pausado':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-extrabold tracking-widest uppercase rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 light:bg-amber-50 light:border-amber-200/80 light:text-amber-700 font-mono select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 light:bg-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
            <span>Pendiente</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-extrabold tracking-widest uppercase rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 light:bg-emerald-50 light:border-emerald-200/80 light:text-emerald-700 font-mono select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 light:bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span>Alumno</span>
          </div>
        );
    }
  };

  return (
    <div className="sticky top-4 z-50 w-full px-4 sm:px-6 max-w-7xl mx-auto transition-all">
      <nav className="liquid-glass rounded-2xl px-5 py-3 flex items-center justify-between">
        {/* Logo Linkable */}
        <div 
          onClick={onNavigateHome}
          className="cursor-pointer select-none font-display font-extrabold text-2xl tracking-normal bg-gradient-to-r from-violet-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent transform active:scale-95 transition-transform"
        >
          Fintly
        </div>

        <div className="flex items-center gap-4">
          {/* Role Badge */}
          {getRoleBadge(user.role)}

          {/* Theme Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleTheme}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-violet-500/35 hover:bg-white/10 light:bg-neutral-100 light:border-neutral-300/60 light:hover:bg-neutral-200 text-gray-400 hover:text-white light:text-neutral-600 light:hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center h-8 w-8"
            title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </motion.button>

          {/* User Info (Name only) */}
          <span className="text-gray-300 light:text-neutral-700 text-sm font-semibold select-none">
            {user.name.split(' ')[0]}
          </span>

          {/* Logout BUTTON */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-violet-500/30 hover:bg-white/10 light:bg-neutral-100 light:border-neutral-200 light:hover:bg-neutral-200/50 text-gray-400 hover:text-white light:text-neutral-600 light:hover:text-neutral-900 rounded-lg text-xs font-medium cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </motion.button>
        </div>
      </nav>
    </div>
  );
}
