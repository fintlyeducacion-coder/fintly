import { useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, CheckCircle2, X } from 'lucide-react';
import { ClassItem } from '../types';
import { ASSOCIATED_SCHOOLS } from '../data';
import { aInputLocal, fechaConHora, todaviaNo } from '../lib/fechas';

/**
 * Publicar o reprogramar una clase de la Biblioteca, sin abrir el editor.
 *
 * Antes la única forma de publicar era desde el editor ("Subir ahora"), y
 * para cambiar una fecha había que abrir la clase, volver a validar todo y
 * publicarla de nuevo a ciegas, sin ver dónde ya estaba publicada.
 */
interface Props {
  /** La plantilla de la Biblioteca. */
  clase: ClassItem;
  /** Sus copias ya publicadas, una por colegio. */
  copias: ClassItem[];
  onClose: () => void;
  onPublish: (clase: ClassItem, colegios: string[], unlockAt: string, deadline: string) => Promise<void> | void;
}

const enUnaSemana = () => aInputLocal(new Date(Date.now() + 7 * 24 * 3600 * 1000));

export default function PublicarClase({ clase, copias, onClose, onPublish }: Props) {
  const yaPublicada = copias.length > 0;
  const copiaDe = (colegio: string) => copias.find((c) => c.school === colegio);
  // Si ya está publicada, arranca con sus colegios y sus fechas actuales.
  const referencia = copias[0];

  const [colegios, setColegios] = useState<string[]>(
    yaPublicada ? copias.map((c) => c.school as string).filter((c) => ASSOCIATED_SCHOOLS.includes(c)) : [...ASSOCIATED_SCHOOLS]
  );
  const [abre, setAbre] = useState(referencia?.unlockAt || aInputLocal());
  const [limite, setLimite] = useState(referencia?.deadline || enUnaSemana());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const todos = colegios.length === ASSOCIATED_SCHOOLS.length;

  const publicar = async () => {
    if (colegios.length === 0) {
      setError('Marcá al menos un colegio.');
      return;
    }
    if (abre && limite && new Date(limite) <= new Date(abre)) {
      setError('La fecha de entrega tiene que ser posterior a la de apertura.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onPublish(clase, colegios, abre, limite);
      setListo(true);
    } catch (e) {
      console.error('No se pudo publicar la clase:', e);
      setError('No se pudo publicar. Revisá la conexión y probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto no-scrollbar">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-[#0f0f22] light:bg-white border border-violet-900/40 light:border-neutral-200 rounded-3xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl max-h-[90vh]"
      >
        <div className="flex items-center justify-between border-b border-white/5 light:border-neutral-200 p-6 bg-white/[0.02] light:bg-neutral-50/50">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-violet-400 light:text-violet-600 shrink-0" />
              <h3 className="font-display font-extrabold text-white light:text-neutral-900 text-lg">
                {listo ? 'Listo' : yaPublicada ? 'Publicar o reprogramar' : 'Publicar clase'}
              </h3>
            </div>
            <p className="text-xs text-gray-400 light:text-neutral-500 mt-1 truncate">
              Módulo {clase.module ?? 1} · Clase {clase.week} — {clase.title || 'Clase sin título'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="w-8 h-8 rounded-lg bg-white/5 light:bg-neutral-100 hover:bg-white/10 light:hover:bg-neutral-200 text-gray-400 light:text-neutral-500 hover:text-white light:hover:text-neutral-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {listo ? (
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 light:text-emerald-600 shrink-0" />
              <p className="text-sm text-gray-300 light:text-neutral-700 leading-relaxed">
                {todaviaNo(abre)
                  ? `Quedó programada: los alumnos la ven desde el ${fechaConHora(abre)}.`
                  : 'Ya está disponible para los alumnos.'}{' '}
                Entrega hasta el {fechaConHora(limite)}.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {colegios.map((c) => (
                <span key={c} className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 light:bg-violet-50 light:text-violet-700 light:border-violet-100 text-xs font-medium">
                  {c}
                </span>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="liquid-glass-btn px-6 py-2.5 text-sm font-bold">
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              <p className="text-xs text-gray-400 light:text-neutral-500 leading-relaxed">
                {yaPublicada
                  ? 'Podés cambiar las fechas o sumar colegios. Los colegios marcados reciben también la última versión del contenido de la Biblioteca.'
                  : 'La clase se publica en los colegios que marques, con estas fechas.'}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider">
                    Colegios
                  </label>
                  <button
                    type="button"
                    onClick={() => setColegios(todos ? [] : [...ASSOCIATED_SCHOOLS])}
                    className="text-[10px] text-violet-400 light:text-violet-700 font-bold hover:underline cursor-pointer"
                  >
                    {todos ? 'Desmarcar todos' : 'Marcar todos'}
                  </button>
                </div>
                <div className="space-y-1 border border-white/5 light:border-neutral-200 bg-black/10 light:bg-neutral-50 p-3 rounded-xl">
                  {ASSOCIATED_SCHOOLS.map((colegio) => {
                    const marcado = colegios.includes(colegio);
                    const copia = copiaDe(colegio);
                    return (
                      <label key={colegio} className="flex items-center gap-2.5 p-1.5 hover:bg-white/[0.02] rounded-lg cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() =>
                            setColegios((actual) => (marcado ? actual.filter((c) => c !== colegio) : [...actual, colegio]))
                          }
                          className="rounded text-violet-500 focus:ring-violet-500 cursor-pointer"
                        />
                        <span className="text-white light:text-neutral-800 font-medium flex-1 min-w-0 truncate">{colegio}</span>
                        <span className="text-[10px] text-gray-500 light:text-neutral-500 font-mono shrink-0">
                          {copia
                            ? todaviaNo(copia.unlockAt)
                              ? `programada ${fechaConHora(copia.unlockAt)}`
                              : 'publicada'
                            : 'sin publicar'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
                    Se abre el
                  </label>
                  <input
                    type="datetime-local"
                    value={abre}
                    onChange={(e) => setAbre(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 text-sm focus:outline-none focus:border-violet-500"
                  />
                  <span className="text-[10px] text-gray-500 block">Con la fecha y hora de ahora, la ven enseguida.</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
                    Entrega hasta
                  </label>
                  <input
                    type="datetime-local"
                    value={limite}
                    onChange={(e) => setLimite(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[12px] text-rose-300 light:text-rose-700">
                  {error}
                </div>
              )}
            </div>

            <div className="bg-white/[0.02] light:bg-neutral-50 border-t border-white/5 light:border-neutral-200 p-6 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={guardando}
                className="px-5 py-2.5 bg-white/5 light:bg-neutral-100 hover:bg-white/10 light:hover:bg-neutral-200 text-gray-300 light:text-neutral-700 hover:text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={publicar}
                disabled={guardando || colegios.length === 0}
                className="liquid-glass-btn flex items-center gap-2 px-6 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{guardando ? 'Publicando…' : `Publicar en ${colegios.length} ${colegios.length === 1 ? 'colegio' : 'colegios'}`}</span>
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
