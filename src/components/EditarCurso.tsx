import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ChevronDown, Pencil, Trash2, X } from 'lucide-react';
import { Curso } from '../types';
import { FINANZAS, PALETA_CURSOS, nivelesDe, nombreModulo } from '../lib/cursos';

/**
 * Editar un curso: nombre, descripción, color, y los nombres de sus 4 niveles
 * y 16 módulos. Para los cursos creados, también borrarlo con todo lo suyo.
 * Finanzas se puede editar pero no borrar.
 *
 * Un campo vacío vuelve al nombre de siempre ("Nivel N", "Bloque Pedagógico N").
 */
interface Props {
  curso: Curso;
  existentes: Curso[];
  onClose: () => void;
  onSave: (curso: Curso) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  /** Lo que se borra junto con el curso, para avisarlo antes. */
  alcance?: { plantillas: number; publicadas: number; entregas: number; alumnos: number };
  /** Se llama después de borrar, para volver a Finanzas. */
  onBorrado?: () => void;
}

const inputCls =
  'w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500';
const labelCls = 'text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block';

export default function EditarCurso({ curso, existentes, onClose, onSave, onDelete, alcance, onBorrado }: Props) {
  const esFinanzas = curso.id === FINANZAS;
  // Los nombres de siempre, sin lo editado: se muestran como sugerencia en los campos vacíos.
  const nivelesBase = nivelesDe({ ...curso, niveles: undefined });

  const [nombre, setNombre] = useState(curso.name);
  const [desc, setDesc] = useState(curso.desc ?? '');
  const [acento, setAcento] = useState(curso.accent);
  const [niveles, setNiveles] = useState(() =>
    [0, 1, 2, 3].map((i) => ({ name: curso.niveles?.[i]?.name ?? '', desc: curso.niveles?.[i]?.desc ?? '' }))
  );
  const [modulos, setModulos] = useState<Record<string, string>>(() => ({ ...(curso.modulos ?? {}) }));
  const [nivelAbierto, setNivelAbierto] = useState<number | null>(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmando, setConfirmando] = useState(false);
  const [textoConfirma, setTextoConfirma] = useState('');
  const [borrando, setBorrando] = useState(false);

  const repetido = existentes.some(
    (c) => c.id !== curso.id && c.name.trim().toLowerCase() === nombre.trim().toLowerCase()
  );
  const ocupado = guardando || borrando;

  const guardar = async () => {
    if (!nombre.trim()) return setError('El curso necesita un nombre.');
    if (repetido) return setError('Ya hay otro curso con ese nombre.');
    setGuardando(true);
    setError(null);
    try {
      const limpios: Record<string, string> = {};
      for (const [k, v] of Object.entries(modulos)) if (v.trim()) limpios[k] = v.trim();
      await onSave({
        ...curso,
        name: nombre.trim(),
        desc: desc.trim(),
        accent: acento,
        niveles: niveles.map((n) => ({ name: n.name.trim(), desc: n.desc.trim() })),
        modulos: limpios,
      });
      onClose();
    } catch (e) {
      console.error('No se pudo guardar el curso:', e);
      setError(
        (e as { code?: string })?.code === 'permission-denied'
          ? 'Firebase rechazó el guardado: sólo el admin puede editar cursos.'
          : 'No se pudo guardar. Revisá la conexión y probá de nuevo.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async () => {
    if (!onDelete || textoConfirma.trim() !== curso.name.trim()) return;
    setBorrando(true);
    setError(null);
    try {
      await onDelete(curso.id);
      onBorrado?.();
      onClose();
    } catch (e) {
      console.error('No se pudo borrar el curso:', e);
      setError('No se pudo borrar todo el curso. Lo que quedó sigue ahí: probá de nuevo.');
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-110 flex items-start sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto no-scrollbar">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-[#0f0f22] light:bg-white border border-violet-900/40 light:border-neutral-200 rounded-3xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl my-auto"
      >
        <div className="flex items-center justify-between border-b border-white/5 light:border-neutral-200 p-6 bg-white/[0.02] light:bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-violet-400 light:text-violet-600" />
            <h3 className="font-display font-extrabold text-white light:text-neutral-900 text-lg">Editar curso</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={ocupado}
            className="w-8 h-8 rounded-lg bg-white/5 light:bg-neutral-100 hover:bg-white/10 light:hover:bg-neutral-200 text-gray-400 light:text-neutral-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* Datos del curso */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Nombre del curso</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
              {repetido && <span className="text-[11px] text-amber-400 light:text-amber-700 block">Ya hay otro curso con ese nombre.</span>}
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Descripción corta</label>
              <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} />
            </div>
            {!esFinanzas && (
              <div className="space-y-1.5">
                <label className={labelCls}>Color</label>
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
            )}
          </div>

          {/* Niveles y módulos */}
          <div className="space-y-2">
            <label className={labelCls}>Niveles y módulos</label>
            <p className="text-[11px] text-gray-500 light:text-neutral-500">Si dejás un campo vacío, se usa el nombre de siempre.</p>
            {niveles.map((n, lvl) => {
              const abierto = nivelAbierto === lvl;
              const titulo = n.name.trim() || nivelesBase[lvl].name;
              return (
                <div key={lvl} className="rounded-2xl border border-white/5 light:border-neutral-200 bg-white/[0.02] light:bg-neutral-50/50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setNivelAbierto(abierto ? null : lvl)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer"
                  >
                    <span className="text-sm font-bold text-white light:text-neutral-900">
                      Nivel {lvl}{titulo ? ` · ${titulo}` : ''}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                  </button>
                  {abierto && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[11px] text-gray-500 light:text-neutral-500">Nombre del nivel</span>
                          <input
                            type="text"
                            value={n.name}
                            placeholder={nivelesBase[lvl].name || `Nivel ${lvl}`}
                            onChange={(e) => setNiveles((a) => a.map((x, i) => (i === lvl ? { ...x, name: e.target.value } : x)))}
                            className={inputCls}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] text-gray-500 light:text-neutral-500">Descripción del nivel</span>
                          <input
                            type="text"
                            value={n.desc}
                            placeholder={nivelesBase[lvl].desc || 'Opcional'}
                            onChange={(e) => setNiveles((a) => a.map((x, i) => (i === lvl ? { ...x, desc: e.target.value } : x)))}
                            className={inputCls}
                          />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((mod) => {
                          const clave = `${lvl}_${mod}`;
                          return (
                            <div key={mod} className="space-y-1">
                              <span className="text-[11px] text-gray-500 light:text-neutral-500">Módulo {mod}</span>
                              <input
                                type="text"
                                value={modulos[clave] ?? ''}
                                placeholder={nombreModulo(undefined, lvl, mod)}
                                onChange={(e) => setModulos((m) => ({ ...m, [clave]: e.target.value }))}
                                className={inputCls}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Zona de borrado */}
          {!esFinanzas && onDelete && (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 light:text-rose-600" />
                <span className="text-sm font-bold text-rose-300 light:text-rose-700">Borrar este curso</span>
              </div>
              {!confirmando ? (
                <button
                  type="button"
                  onClick={() => setConfirmando(true)}
                  disabled={ocupado}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-500/30 text-rose-400 light:text-rose-600 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Borrar curso…</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-[12px] text-gray-300 light:text-neutral-700 leading-relaxed">
                    Se borra para siempre, sin forma de recuperarlo:
                  </p>
                  {alcance && (
                    <ul className="text-[12px] text-gray-300 light:text-neutral-700 list-disc pl-5 space-y-0.5">
                      <li>{alcance.plantillas} clase{alcance.plantillas === 1 ? '' : 's'} de la Biblioteca</li>
                      <li>{alcance.publicadas} clase{alcance.publicadas === 1 ? '' : 's'} publicada{alcance.publicadas === 1 ? '' : 's'} en colegios</li>
                      <li>{alcance.entregas} entrega{alcance.entregas === 1 ? '' : 's'} de alumnos</li>
                      <li>
                        {alcance.alumnos} alumno{alcance.alumnos === 1 ? '' : 's'} inscripto{alcance.alumnos === 1 ? '' : 's'} (no se borran sus cuentas; sólo dejan de cursarlo)
                      </li>
                    </ul>
                  )}
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-400 light:text-neutral-500">
                      Para confirmar, escribí el nombre del curso: <strong>{curso.name}</strong>
                    </span>
                    <input type="text" value={textoConfirma} onChange={(e) => setTextoConfirma(e.target.value)} className={inputCls} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setConfirmando(false); setTextoConfirma(''); }}
                      disabled={borrando}
                      className="px-4 py-2 bg-white/5 light:bg-neutral-100 hover:bg-white/10 light:hover:bg-neutral-200 text-gray-300 light:text-neutral-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={borrar}
                      disabled={borrando || textoConfirma.trim() !== curso.name.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{borrando ? 'Borrando…' : 'Borrar para siempre'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[12px] text-rose-300 light:text-rose-700">{error}</div>
          )}
        </div>

        <div className="bg-white/[0.02] light:bg-neutral-50 border-t border-white/5 light:border-neutral-200 p-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={ocupado}
            className="px-5 py-2.5 bg-white/5 light:bg-neutral-100 hover:bg-white/10 light:hover:bg-neutral-200 text-gray-300 light:text-neutral-700 hover:text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={ocupado || !nombre.trim() || repetido}
            className="liquid-glass-btn px-6 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
