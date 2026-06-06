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
          <span className="px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded-md bg-violet-950/40 border border-violet-500/40 text-violet-300 light:bg-violet-100 light:border-violet-300 light:text-violet-700">
            Admin
          </span>
        );
      case 'directivo':
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded-md bg-indigo-950/40 border border-indigo-500/45 text-indigo-300 light:bg-indigo-100 light:border-indigo-300 light:text-indigo-700">
            Directivo
          </span>
        );
      case 'pausado':
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded-md bg-amber-950/40 border border-amber-500/40 text-amber-300 light:bg-amber-100 light:border-amber-300 light:text-amber-700">
            Pendiente
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded-md bg-green-950/40 border border-green-500/40 text-green-300 light:bg-green-100 light:border-green-300 light:text-green-700 font-mono">
            Alumno
          </span>
        );
    }
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-violet-950/20 backdrop-blur-md bg-[#070712]/90 light:bg-white/95 light:border-neutral-200/50 sticky top-0 z-50 transition-colors">
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

        {/* User Info & Avatar */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Avatar Orb */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-violet-950/50">
            {user.initials}
          </div>
          <span className="text-gray-300 light:text-neutral-700 text-sm font-medium">
            {user.name.split(' ')[0]}
          </span>
        </div>

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
  );
}
