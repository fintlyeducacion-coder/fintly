import { useState } from 'react';
import { motion } from 'motion/react';
import { Layers, X } from 'lucide-react';
import { Curso } from '../types';
import { PALETA_CURSOS, idDeCurso } from '../lib/cursos';

/**
 * Crear un curso nuevo. Sólo lo ve el admin, y las reglas de Firebase también
 * exigen ser admin para guardarlo.
 *
 * Cada curso tiene la misma estructura que Finanzas: 4 niveles, 4 módulos por
 * nivel y 4 clases por módulo. Las clases se cargan después, en la Biblioteca.
 */
interface Props {
  existentes: Curso[];
  onClose: () => void;
  onCreate: (datos: { name: string; desc: string; accent: string }) => Promise<string>;
  /** Se llama con el id del curso recién creado. */
  onCreado: (id: string) => void;
}

export default function NuevoCurso({ existentes, onClose, onCreate, onCreado }: Props) {
  const [nombre, setNombre] = useState('');
  const [desc, setDesc] = useState('');
  const [acento, setAcento] = useState<string>(PALETA_CURSOS[1]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const id = idDeCurso(nombre);
  const repetido = existentes.some((c) => c.id === id || c.name.trim().toLowerCase() === nombre.trim().toLowerCase());

  const crear = async () => {
    if (!nombre.trim() || !id) {
      setError('Poné un nombre para el curso.');
      return;
    }
    if (repetido) {
      setError('Ya hay un curso con ese nombre.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const creado = await onCreate({ name: nombre.trim(), desc: desc.trim(), accent: acento });
      onCreado(creado);
      onClose();
    } catch (e) {
      console.error('No se pudo crear el curso:', e);
      const msg = (e as { code?: string })?.code === 'permission-denied'
        ? 'Firebase rechazó el guardado. Falta publicar la regla nueva de cursos en la consola de Firebase.'
        : 'No se pudo crear el curso. Revisá la conexión y probá de nuevo.';
      setError(msg);
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
        className="bg-[#0f0f22] light:bg-white border border-violet-900/40 light:border-neutral-200 rounded-3xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/5 light:border-neutral-200 p-6 bg-white/[0.02] light:bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-violet-400 light:text-violet-600" />
            <h3 className="font-display font-extrabold text-white light:text-neutral-900 text-lg">Nuevo curso</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="w-8 h-8 rounded-lg bg-white/5 light:bg-neutral-100 hover:bg-white/10 light:hover:bg-neutral-200 text-gray-400 light:text-neutral-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-gray-400 light:text-neutral-500 leading-relaxed">
            Tiene la misma estructura que Finanzas: 4 niveles, 4 módulos por nivel y 4 clases por módulo.
            Las clases se cargan después, en la Biblioteca.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">Nombre</label>
            <input
              type="text"
              value={nombre}
              autoFocus
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej: Inteligencia Artificial"
              className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500"
            />
            {nombre.trim() && repetido && (
              <span className="text-[11px] text-amber-400 light:text-amber-700 block">Ya hay un curso con ese nombre.</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">Descripción corta</label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="ej: Cómo usar la IA de verdad, para estudiar y trabajar."
              className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">Color</label>
            <div className="flex flex-wrap gap-2">
              {PALETA_CURSOS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAcento(c)}
                  aria-label={`Color ${c}`}
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c} cursor-pointer transition-transform ${
                    acento === c ? 'ring-2 ring-white light:ring-neutral-900 ring-offset-2 ring-offset-[#0f0f22] light:ring-offset-white scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[12px] text-rose-300 light:text-rose-700">{error}</div>
          )}
        </div>

        <div className="bg-white/[0.02] light:bg-neutral-50 border-t border-white/5 light:border-neutral-200 p-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-5 py-2.5 bg-white/5 light:bg-neutral-100 hover:bg-white/10 light:hover:bg-neutral-200 text-gray-300 light:text-neutral-700 hover:text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={crear}
            disabled={guardando || !nombre.trim() || repetido}
            className="liquid-glass-btn px-6 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {guardando ? 'Creando…' : 'Crear curso'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
