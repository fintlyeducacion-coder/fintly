import React, { useEffect, useRef, useState } from 'react';
import { limpiarPegado, textoPlanoAHtml } from '../lib/pegado';

/**
 * Editor de la lectura de una clase.
 *
 * Se escribe como en un documento: lo que se ve es lo que va a ver el
 * alumno. Se puede pegar directo desde Google Docs o Word y se conservan
 * títulos, negritas, itálicas, listas y enlaces; el resto del formato
 * (colores, fuentes, tamaños) se descarta para que la clase se vea igual
 * que todas las demás.
 *
 * Reemplaza al cuadro de texto con ### y *, que obligaba a aprender una
 * sintaxis y, al pegar desde Docs, perdía todo el formato.
 */

interface Props {
  /** HTML de la lectura. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const BOTON =
  'px-2 py-1 bg-white/5 hover:bg-white/10 light:bg-neutral-100 light:hover:bg-neutral-200 text-gray-300 light:text-neutral-700 hover:text-white rounded-xl text-[10px] font-bold transition-colors border border-white/5 light:border-neutral-200 cursor-pointer';

export default function EditorContenido({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Lo último que este editor le avisó al formulario. Si `value` cambia a
  // otra cosa (restaurar un borrador, abrir otra clase), viene de afuera y
  // hay que mostrarlo; si es lo mismo, no se toca para no mover el cursor.
  const ultimoEmitido = useRef<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === ultimoEmitido.current) return;
    el.innerHTML = value;
    ultimoEmitido.current = value;
  }, [value]);

  const emitir = () => {
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML;
    ultimoEmitido.current = html;
    onChange(html);
  };

  const comando = (nombre: string, valor?: string) => {
    ref.current?.focus();
    // Que el navegador use etiquetas (<b>, <i>) y no estilos en línea, que se perderían al guardar.
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(nombre, false, valor);
    emitir();
  };

  const alPegar = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const texto = e.clipboardData.getData('text/plain');

    let limpio = '';
    if (html) {
      const resultado = limpiarPegado(html);
      limpio = resultado.html;
      setAviso(
        resultado.imagenesQuitadas > 0
          ? `Se pegó el texto, pero no ${resultado.imagenesQuitadas === 1 ? 'la imagen' : `las ${resultado.imagenesQuitadas} imágenes`}: las imágenes de Google Docs dejan de funcionar con el tiempo. Agregalas con el botón Imagen.`
          : null
      );
    } else if (texto) {
      limpio = textoPlanoAHtml(texto);
      setAviso(null);
    }
    if (!limpio) return;

    document.execCommand('insertHTML', false, limpio);
    emitir();
  };

  const agregarEnlace = () => {
    const url = window.prompt('Pegá la dirección del enlace (https://…)');
    if (!url) return;
    if (!/^https?:\/\//i.test(url.trim())) {
      setAviso('El enlace tiene que empezar con https://');
      return;
    }
    comando('createLink', url.trim());
  };

  // Los botones no le roban el foco al texto: así el formato se aplica a lo seleccionado.
  const sinPerderSeleccion = (e: React.MouseEvent) => e.preventDefault();

  const vacioVisible = !value || value === '<br>' || value === '<p><br></p>';

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1 pb-1 select-none" onMouseDown={sinPerderSeleccion}>
        <button type="button" className={BOTON} onClick={() => comando('formatBlock', 'H2')} title="Título de sección">
          Título
        </button>
        <button type="button" className={BOTON} onClick={() => comando('formatBlock', 'H3')} title="Subtítulo">
          Subtítulo
        </button>
        <button type="button" className={BOTON} onClick={() => comando('formatBlock', 'P')} title="Texto normal">
          Texto
        </button>
        <button type="button" className={`${BOTON} font-extrabold`} onClick={() => comando('bold')} title="Negrita">
          B
        </button>
        <button type="button" className={`${BOTON} italic`} onClick={() => comando('italic')} title="Itálica">
          I
        </button>
        <button type="button" className={BOTON} onClick={() => comando('insertUnorderedList')} title="Lista con viñetas">
          • Lista
        </button>
        <button type="button" className={BOTON} onClick={() => comando('insertOrderedList')} title="Lista numerada">
          1. Lista
        </button>
        <button type="button" className={BOTON} onClick={agregarEnlace} title="Convertir lo seleccionado en enlace">
          Enlace
        </button>
        <button type="button" className={BOTON} onClick={() => comando('insertHorizontalRule')} title="Línea separadora">
          — Separador
        </button>
        <button type="button" className={BOTON} onClick={() => comando('removeFormat')} title="Quitar negrita, itálica y enlaces de lo seleccionado">
          Quitar formato
        </button>
      </div>

      <div className="relative">
        {vacioVisible && placeholder && (
          <div className="absolute top-4 left-4 right-4 text-sm text-gray-500 light:text-neutral-400 pointer-events-none whitespace-pre-line">
            {placeholder}
          </div>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Lectura de la clase"
          onInput={emitir}
          onBlur={emitir}
          onPaste={alPegar}
          className="class-body-html w-full min-h-[180px] max-h-[420px] overflow-y-auto bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl p-4 text-white light:text-neutral-800 text-sm focus:outline-none focus:border-violet-500 font-sans transition-colors"
        />
      </div>

      {aviso && (
        <p className="text-[11px] text-amber-400 light:text-amber-700 leading-relaxed">{aviso}</p>
      )}
    </div>
  );
}
