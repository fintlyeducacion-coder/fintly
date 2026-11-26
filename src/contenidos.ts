/**
 * Guardar textos y presentaciones HTML de clase en la colección 'contenidos'.
 * Van aparte de la clase para que el panel del alumno no baje todos los HTML
 * al abrir el campus: cada uno se pide recién cuando se abre la clase.
 *
 * Un contenido no se modifica nunca: si se sube una versión nueva, se crea
 * otro. Así una clase ya publicada en los colegios no cambia sola por debajo.
 */
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { bytesDe, extraerHtmlDeArtifact, nuevoIdDeContenido, problemaDelHtml } from './lib/htmlClase';

export type TipoContenido = 'lectura' | 'presentacion';

export interface ContenidoSubido {
  id: string;
  nombre: string;
  bytes: number;
  /** El HTML limpio, para la vista previa sin volver a bajarlo. */
  html: string;
}

/** Limpia, valida y guarda un archivo HTML. Si no sirve, tira un Error con un mensaje para mostrar. */
export async function subirContenidoHtml(crudo: string, nombre: string, tipo: TipoContenido): Promise<ContenidoSubido> {
  const html = extraerHtmlDeArtifact(crudo);
  const problema = problemaDelHtml(html);
  if (problema) throw new Error(problema);
  const id = nuevoIdDeContenido();
  const bytes = bytesDe(html);
  await setDoc(doc(db, 'contenidos', id), {
    html,
    nombre: nombre.slice(0, 200),
    tipo,
    bytes,
    createdAt: new Date().toISOString(),
  });
  return { id, nombre, bytes, html };
}
