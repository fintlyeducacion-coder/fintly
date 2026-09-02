import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import { AlertCircle, TrendingUp, Users, BookOpen } from 'lucide-react';

interface LoginProps {
  onGoogleLogin?: () => void;
  externalError?: string;
}

const FEATURES = [
  { Icon: BookOpen,   text: 'Clases estructuradas por niveles financieros' },
  { Icon: TrendingUp, text: 'Seguimiento de progreso en tiempo real' },
  { Icon: Users,      text: 'Feedback personalizado de tus docentes' },
];

export default function Login({ onGoogleLogin, externalError }: LoginProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (externalError) { setError(externalError); setLoading(false); }
  }, [externalError]);

  // 3D tilt effect for the card
  const cardRef   = useRef<HTMLDivElement>(null);
  const mouseX    = useMotionValue(0);
  const mouseY    = useMotionValue(0);
  const rotateX   = useSpring(useTransform(mouseY, [-180, 180], [ 5, -5]), { stiffness: 140, damping: 22 });
  const rotateY   = useSpring(useTransform(mouseX, [-180, 180], [-5,  5]), { stiffness: 140, damping: 22 });
  const glowX     = useSpring(useTransform(mouseX, [-180, 180], [0, 100]), { stiffness: 120, damping: 20 });
  const glowY     = useSpring(useTransform(mouseY, [-180, 180], [0, 100]), { stiffness: 120, damping: 20 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left - rect.width  / 2);
    mouseY.set(e.clientY - rect.top  - rect.height / 2);
  }, [mouseX, mouseY]);

  const onLeave = useCallback(() => { mouseX.set(0); mouseY.set(0); }, [mouseX, mouseY]);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try { if (onGoogleLogin) await onGoogleLogin(); }
    catch (e: any) { setError(e.message || 'Error al iniciar sesión.'); setLoading(false); }
  };

  return (
    <div className="min-h-screen h-screen flex flex-col md:flex-row bg-[#050508] overflow-hidden">
      {/* ── Animated background ───────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 60, -40, 0], y: [0, -80, 40, 0], scale: [1, 1.15, 0.95, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-1/4 -left-1/4 w-[70vw] h-[70vw] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, rgba(99,102,241,0.15) 45%, transparent 70%)', filter: 'blur(80px)' }}
        />
        <motion.div
          animate={{ x: [0, -70, 50, 0], y: [0, 60, -50, 0], scale: [1, 0.9, 1.2, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, rgba(56,189,248,0.12) 45%, transparent 70%)', filter: 'blur(80px)' }}
        />
        <motion.div
          animate={{ x: [0, 80, -30, 0], y: [0, -40, 80, 0], scale: [1, 1.1, 0.92, 1] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          className="absolute -bottom-1/3 left-1/4 w-[65vw] h-[65vw] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, rgba(14,165,233,0.1) 50%, transparent 70%)', filter: 'blur(90px)' }}
        />
        <motion.div
          animate={{ x: [0, -50, 60, 0], y: [0, 70, -30, 0], scale: [1, 1.2, 0.88, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 9 }}
          className="absolute bottom-0 -right-1/4 w-[50vw] h-[50vw] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.28) 0%, rgba(124,58,237,0.1) 50%, transparent 70%)', filter: 'blur(70px)' }}
        />
        {/* Noise overlay for depth */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px' }}
        />
      </div>

      {/* ── Brand Side (desktop only) ─────────────────────── */}
      <div className="hidden md:flex md:w-[58%] h-full flex-col justify-between p-12 relative z-10 overflow-hidden bg-transparent">
        <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none" />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="font-display font-bold text-2xl gradient-text-brand">Fintly</span>
        </motion.div>

        {/* Hero copy */}
        <div className="space-y-10 relative z-10 max-w-md">
          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.65, ease: [0.16,1,0.3,1] }}
              className="font-display text-4xl lg:text-[3.2rem] font-bold text-white leading-[1.1] tracking-tight"
            >
              Educación financiera<br />
              <span className="bg-gradient-to-r from-violet-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent">para el futuro.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.55 }}
              className="text-[15px] text-slate-400 leading-relaxed"
            >
              La plataforma que transforma cómo los estudiantes aprenden sobre dinero, ahorro e inversión.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="space-y-3"
          >
            {FEATURES.map(({ Icon, text }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.38 + i * 0.09, duration: 0.45 }}
                className="flex items-center gap-3.5"
              >
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/14 flex items-center justify-center shrink-0">
                  <Icon className="w-[15px] h-[15px] text-violet-400" />
                </div>
                <span className="text-sm text-slate-400 leading-snug">{text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-[11px] text-slate-600 relative z-10"
        >
          © 2025 Fintly · Campus Virtual · Todos los derechos reservados.
        </motion.p>
      </div>

      {/* ── Form Side ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 h-full relative z-10 bg-transparent">

        {/* Mobile logo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="md:hidden absolute top-8 left-6"
        >
          <span className="font-display font-bold text-xl gradient-text-brand">Fintly</span>
        </motion.div>

        {/* Background glow for form side */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full bg-violet-600/6 blur-[100px]" />
        </div>

        {/* 3D Card */}
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16,1,0.3,1] }}
          className="w-full max-w-[360px] perspective-800 relative z-10"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          <motion.div
            ref={cardRef}
            style={{ rotateX, rotateY }}
            className="preserve-3d"
          >
            {/* Glow effect that follows cursor */}
            <motion.div
              className="absolute -inset-px rounded-[21px] opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(124,58,237,0.15) 0%, transparent 60%)`,
              }}
            />

            <div className="surface-elevated p-8 space-y-7 relative overflow-hidden">
              {/* Subtle inner glow */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

              {/* Header */}
              <div className="space-y-1.5">
                <h2 className="font-display text-[1.3rem] font-bold text-white light:text-slate-900 tracking-tight leading-snug">
                  Bienvenido de vuelta
                </h2>
                <p className="text-[13px] text-slate-400 light:text-slate-500 leading-snug">
                  Ingresá con tu cuenta Google institucional.
                </p>
              </div>

              {/* Loading overlay */}
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-[#07070f]/95 rounded-[20px] flex flex-col items-center justify-center gap-4"
                  >
                    <div className="relative w-9 h-9">
                      <div className="absolute inset-0 rounded-full border-2 border-violet-500/15" />
                      <div className="absolute inset-0 rounded-full border-2 border-t-violet-500 border-x-transparent border-b-transparent animate-spin" />
                      <div className="absolute inset-[3px] rounded-full border border-b-indigo-400/60 border-t-transparent border-x-transparent animate-spin [animation-duration:1.4s] [animation-direction:reverse]" />
                    </div>
                    <p className="text-[13px] text-slate-300 font-medium tracking-wide">
                      Conectando…
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Google Button */}
              <div className="space-y-3">
                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="relative w-full h-11 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-[17px] h-[17px] shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continuar con Google</span>
                </button>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className="flex items-start gap-2.5 p-3.5 bg-rose-500/[0.07] border border-rose-500/15 rounded-xl"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                      <span className="text-[12px] text-rose-400 leading-snug">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-white/[0.05] light:border-slate-100">
                <p className="text-[11px] text-slate-500 light:text-slate-400 leading-relaxed">
                  Acceso exclusivo para alumnos y docentes registrados por su institución educativa.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
