import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MARCA_MENSAJE, prepararParaMostrar } from '../lib/htmlClase';

/**
 * Muestra un texto o una presentación HTML de clase dentro de una caja
 * aislada (ver lib/htmlClase.ts). Recibe el id del contenido guardado en
 * 'contenidos', o directamente el HTML (para la vista previa del editor).
 */
interface Props {
  contenidoId?: string;
  html?: string;
  titulo: string;
  /** Alto mínimo mientras carga o si la página no avisa su alto. */
  altoMinimo?: number;
}

// Lo ya bajado en esta sesión: abrir y cerrar una clase no vuelve a pedirlo.
const cache = new Map<string, string>();

/** Deja un contenido ya disponible (por ejemplo, recién subido) para no volver a pedirlo. */
export const precargarContenido = (id: string, html: string) => cache.set(id, html);

const temaActual = (): 'dark' | 'light' =>
  typeof document !== 'undefined' && document.body.classList.contains('light') ? 'light' : 'dark';

export default function HtmlInteractivo({ contenidoId, html, titulo, altoMinimo = 420 }: Props) {
  const [cargado, setCargado] = useState<string | null>(html ?? (contenidoId ? cache.get(contenidoId) ?? null : null));
  const [error, setError] = useState<string | null>(null);
  const [alto, setAlto] = useState(altoMinimo);
  const [tema, setTema] = useState(temaActual);
  const ref = useRef<HTMLIFrameElement>(null);

  // Bajar el contenido de la base si no vino en mano.
  useEffect(() => {
    if (html !== undefined) {
      setCargado(html);
      return;
    }
    if (!contenidoId) return;
    const enCache = cache.get(contenidoId);
    if (enCache) {
      setCargado(enCache);
      return;
    }
    let vivo = true;
    setError(null);
    getDoc(doc(db, 'contenidos', contenidoId))
      .then((snap) => {
        if (!vivo) return;
        const texto = snap.exists() ? (snap.data().html as string) : '';
        if (!texto) {
          setError('Este contenido no está disponible.');
          return;
        }
        cache.set(contenidoId, texto);
        setCargado(texto);
      })
      .catch((e) => {
        console.error('No se pudo cargar el contenido de la clase:', e);
        if (vivo) setError('No se pudo cargar. Revisá la conexión y volvé a abrir la clase.');
      });
    return () => {
      vivo = false;
    };
  }, [contenidoId, html]);

  // Si el alumno cambia claro/oscuro con la clase abierta, la caja lo acompaña.
  useEffect(() => {
    const obs = new MutationObserver(() => setTema(temaActual()));
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Mensajes de la caja: sólo se aceptan los de ESTE iframe y con nuestra marca.
  useEffect(() => {
    const alRecibir = (e: MessageEvent) => {
      const frame = ref.current;
      if (!frame || e.source !== frame.contentWindow) return;
      const d = e.data as { m?: string; tipo?: string; h?: number } | null;
      if (!d || d.m !== MARCA_MENSAJE) return;
      if (d.tipo === 'alto' && typeof d.h === 'number' && Number.isFinite(d.h)) {
        setAlto(Math.min(Math.max(Math.ceil(d.h), 200), 30000));
      } else if (d.tipo === 'arriba') {
        // Sólo si el principio de la caja quedó arriba de la pantalla.
        if (frame.getBoundingClientRect().top < 0) frame.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('message', alRecibir);
    return () => window.removeEventListener('message', alRecibir);
  }, []);

  const srcDoc = useMemo(() => (cargado ? prepararParaMostrar(cargado, tema) : ''), [cargado, tema]);

  if (error) {
    return (
      <div className="p-6 rounded-2xl border border-rose-500/25 bg-rose-500/5 text-sm text-rose-300 light:text-rose-700">{error}</div>
    );
  }

  if (!cargado) {
    return (
      <div
        className="rounded-2xl border border-white/[0.07] light:border-slate-200 bg-white/[0.02] light:bg-slate-50 animate-pulse"
        style={{ height: altoMinimo }}
        aria-label="Cargando"
      />
    );
  }

  return (
    <iframe
      ref={ref}
      title={titulo}
      srcDoc={srcDoc}
      // Corre su código, pero no puede tocar la sesión ni la base: sin allow-same-origin.
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
      className="w-full border-0 rounded-2xl block"
      style={{ height: alto, scrollMarginTop: 80 }}

    />
  );
}
