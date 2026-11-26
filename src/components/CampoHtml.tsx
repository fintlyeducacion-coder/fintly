import { useRef, useState } from 'react';
import { FileCode2, Upload, X } from 'lucide-react';
import { subirContenidoHtml, TipoContenido } from '../contenidos';

/**
 * Campo del editor de clases para subir un .html (lectura interactiva o
 * presentación). Al elegir el archivo se limpia, se valida y se guarda en la
 * base; el campo se queda con su id.
 */
interface Props {
  etiqueta: string;
  ayuda: string;
  tipo: TipoContenido;
  /** Id del contenido elegido, o '' si no hay. */
  valor: string;
  /** Nombre del archivo, si se subió en esta sesión. */
  nombre?: string;
  onCambio: (sub: { id: string; nombre?: string; html?: string } | null) => void;
}

export default function CampoHtml({ etiqueta, ayuda, tipo, valor, nombre, onCambio }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alElegir = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError(null);
    setSubiendo(true);
    try {
      const crudo = await archivo.text();
      const sub = await subirContenidoHtml(crudo, archivo.name, tipo);
      onCambio({ id: sub.id, nombre: archivo.name, html: sub.html });
    } catch (e) {
      console.error('No se pudo subir el HTML:', e);
      const code = (e as { code?: string })?.code;
      setError(
        code === 'permission-denied'
          ? 'Firebase rechazó el guardado. Falta publicar la regla de "contenidos" en la consola de Firebase.'
          : e instanceof Error && !code
            ? e.message
            : 'No se pudo subir. Revisá la conexión y probá de nuevo.'
      );
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">{etiqueta}</label>
      <input
        ref={input}
        type="file"
        accept=".html,.htm,text/html"
        className="hidden"
        onChange={(e) => alElegir(e.target.files?.[0])}
      />
      {valor ? (
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5">
          <FileCode2 className="w-4 h-4 text-violet-400 light:text-violet-600 shrink-0" />
          <span className="text-sm text-white light:text-neutral-800 truncate flex-1">{nombre || 'HTML cargado'}</span>
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={subiendo}
            className="text-xs font-semibold text-violet-400 light:text-violet-600 hover:underline cursor-pointer shrink-0"
          >
            {subiendo ? 'Subiendo…' : 'Reemplazar'}
          </button>
          <button
            type="button"
            onClick={() => onCambio(null)}
            disabled={subiendo}
            aria-label="Quitar"
            className="w-6 h-6 rounded-md hover:bg-white/10 light:hover:bg-neutral-100 text-gray-400 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={subiendo}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-white/15 light:border-neutral-300 hover:border-violet-500 rounded-xl px-4 py-3 text-sm text-gray-400 light:text-neutral-500 hover:text-violet-400 cursor-pointer transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          <span>{subiendo ? 'Subiendo…' : 'Subir archivo .html'}</span>
        </button>
      )}
      {error ? (
        <span className="text-[11px] text-rose-400 light:text-rose-600 block">{error}</span>
      ) : (
        <span className="text-[10px] text-gray-500 light:text-neutral-500 block">{ayuda}</span>
      )}
    </div>
  );
}
