import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin?: (email: string, password?: string) => Promise<void> | void;
  onRegister?: (email: string, password: string, name: string) => Promise<void> | void;
  onGoogleLogin?: () => void;
  externalError?: string;
}

export default function Login({ onGoogleLogin, externalError }: LoginProps) {
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (externalError) {
      setErrorMsg(externalError);
      setIsSubmitting(false);
    }
  }, [externalError]);

  const handleGoogleClick = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      if (onGoogleLogin) {
        await onGoogleLogin();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión con Google.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[90vh] px-4" id="login-container">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative bg-[#0a0a18]/90 border border-violet-900/40 rounded-3xl p-8 md:p-11 w-full max-w-md backdrop-blur-xl shadow-2xl shadow-violet-950/20 text-center z-10 light:bg-white light:border-neutral-200 light:shadow-neutral-200/50 overflow-hidden"
      >
        {/* Overlay de carga con animación premium */}
        <AnimatePresence>
          {isSubmitting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-[#070714]/98 light:bg-white/98 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-md"
            >
              {/* Spinner animado de alto pulido */}
              <div className="relative flex items-center justify-center w-20 h-20 mb-6">
                {/* Círculo base con opacidad */}
                <div className="absolute inset-0 rounded-full border-4 border-violet-500/10 light:border-violet-100" />
                {/* Arco giratorio brillante */}
                <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                {/* Segundo aro concéntrico inverso */}
                <div className="absolute inset-2 rounded-full border-2 border-b-indigo-400 border-t-transparent border-r-transparent border-l-transparent animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
                
                {/* Logo central flotante/titilante */}
                <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text text-transparent animate-pulse font-sans">F</span>
              </div>

              {/* Mensajes de feedback dinámicos */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-2 text-center"
              >
                <h4 className="text-white light:text-neutral-900 font-semibold text-base tracking-tight font-sans">
                  Conectando con Google
                </h4>
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-xs text-gray-400 light:text-neutral-500 font-medium max-w-[240px] leading-normal">
                    Iniciando autenticación segura y preparando tu campus...
                  </span>
                  <span className="text-[9px] text-violet-400 light:text-violet-600 font-mono tracking-wider animate-pulse pt-2 font-bold uppercase">
                    CAMPUS VIRTUAL · UN MOMENTO POR FAVOR
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glow Effects */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-violet-600/10 blur-3xl rounded-full light:bg-violet-600/5" />
        <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-sky-500/10 blur-3xl rounded-full light:bg-sky-500/5" />

        {/* Fintly Logo Big */}
        <div className="inline-block font-display font-extrabold text-4.5xl tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
          Fintly
        </div>
        <div className="text-[10px] sm:text-xs font-semibold tracking-widest text-violet-400/80 light:text-violet-600 uppercase mt-1 mb-6 font-mono">
          Campus Virtual
        </div>

        {/* Header Message */}
        <div className="mb-8">
          <p className="text-sm text-gray-300 light:text-neutral-600 leading-relaxed">
            Plataforma interactiva de microaprendizaje y educación financiera para colegios secundarios.
          </p>
        </div>

        {/* Google Login Hero Button */}
        <div className="space-y-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleGoogleClick}
            className="flex items-center justify-center gap-3 w-full py-3.5 px-5 bg-white hover:bg-neutral-50 active:scale-[0.98] text-gray-900 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer shadow-lg shadow-white/5 border border-neutral-200 light:shadow-sm disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Iniciar sesión con Google
          </button>

          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left font-medium rounded-2xl flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Explanatory Footer */}
        <div className="mt-8 pt-6 border-t border-white/5 light:border-neutral-100 text-left space-y-2.5">
          <p className="text-[11px] text-gray-400 light:text-neutral-500 leading-relaxed">
            ⚠️ <strong>Requisito institucional:</strong> Recordá ingresar utilizando únicamente el correo Gmail o cuenta Google institucional asociada a tu colegio.
          </p>
          <p className="text-[11px] text-gray-400 light:text-neutral-500 leading-relaxed">
            El acceso virtual de Fintly está permitido de manera exclusiva a alumnos invitados por sus docentes y personal directivo acreditado.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
