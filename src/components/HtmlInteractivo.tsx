import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';
import { db } from '../firebase';
import { MARCA_MENSAJE, esMazo, prepararMazo, prepararParaMostrar } from '../lib/htmlClase';

/**
 * Muestra un texto o una presentación HTML de clase dentro de una caja
 * aislada (ver lib/htmlClase.ts). Recibe el id del contenido guardado en
 * 'contenidos', o directamente el HTML (para la vista previa del editor).
 *
 * Dos formas de mostrar:
 *  - Página (lecturas, presentaciones armadas por nosotros): la caja crece al
 *    alto del contenido y se lee como parte de la página.
 *  - Mazo de Claude Slides: caja fija de 16:9, una diapositiva por vez, con
 *    Anterior / Siguiente / pantalla completa abajo.
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
  const [diapo, setDiapo] = useState<{ i: number; n: number } | null>(null);
  const [completa, setCompleta] = useState(false);
  const [listo, setListo] = useState(false);
  const ref = useRef<HTMLIFrameElement>(null);
  const caja = useRef<HTMLDivElement>(null);

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
      const d = e.data as { m?: string; tipo?: string; h?: number; i?: number; n?: number } | null;
      if (!d || d.m !== MARCA_MENSAJE) return;
      if (d.tipo === 'alto' && typeof d.h === 'number' && Number.isFinite(d.h)) {
        setAlto(Math.min(Math.max(Math.ceil(d.h), 200), 30000));
      } else if (d.tipo === 'arriba') {
        // Sólo si el principio de la caja quedó arriba de la pantalla.
        if (frame.getBoundingClientRect().top < 0) frame.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (d.tipo === 'listo') {
        setListo(true);
      } else if (d.tipo === 'diapo' && Number.isInteger(d.i) && Number.isInteger(d.n) && d.n! > 0 && d.n! < 500) {
        setDiapo({ i: Math.max(0, Math.min(d.i!, d.n! - 1)), n: d.n! });
      }
    };
    window.addEventListener('message', alRecibir);
    return () => window.removeEventListener('message', alRecibir);
  }, []);

  // Pantalla completa (de la caja, no del campus entero).
  useEffect(() => {
    const alCambiar = () => setCompleta(document.fullscreenElement === caja.current && !!caja.current);
    document.addEventListener('fullscreenchange', alCambiar);
    return () => document.removeEventListener('fullscreenchange', alCambiar);
  }, []);

  const mazo = useMemo(() => !!cargado && esMazo(cargado), [cargado]);
  useEffect(() => { setDiapo(null); setListo(false); }, [cargado]);
  const srcDoc = useMemo(
    () => (cargado ? (mazo ? prepararMazo(cargado) : prepararParaMostrar(cargado, tema)) : ''),
    [cargado, tema, mazo]
  );

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

  const iframe = (
    <iframe
      ref={ref}
      title={titulo}
      srcDoc={srcDoc}
      // Corre su código, pero no puede tocar la sesión ni la base: sin allow-same-origin.
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
      allow="fullscreen"
      allowFullScreen
      className={mazo ? 'absolute inset-0 w-full h-full border-0 block' : 'w-full border-0 rounded-2xl block'}
      style={mazo ? undefined : { height: alto, scrollMarginTop: 80 }}
    />
  );

  if (!mazo) return iframe;

  // Los botones nunca se desactivan: una diapositiva puede tener pasos (cosas que
  // aparecen de a una) y el mazo sabe solo cuándo llegó al principio o al final.
  const ir = (dir: 1 | -1) => ref.current?.contentWindow?.postMessage({ m: MARCA_MENSAJE, tipo: 'ir', dir }, '*');
  const puedePantallaCompleta = typeof document !== 'undefined' && document.fullscreenEnabled;
  const pantallaCompleta = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else caja.current?.requestFullscreen().catch(() => {});
  };
  const boton =
    'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-semibold border cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-default ' +
    'border-violet-500/30 bg-violet-500/[0.08] text-violet-100 hover:bg-violet-500/15 light:border-violet-200 light:bg-violet-50 light:text-violet-800 light:hover:bg-violet-100';

  return (
    <div className="space-y-3" style={{ scrollMarginTop: 80 }}>
      <div
        ref={caja}
        className={`relative w-full overflow-hidden bg-black ${completa ? 'h-full' : 'rounded-2xl'}`}
        style={completa ? undefined : { aspectRatio: '16 / 9' }}
      >
        {iframe}
        {/* Hasta que el mazo avisa que ya puede dibujar la primera diapositiva. */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-[#0a0618] text-[13px] text-violet-200/70 pointer-events-none transition-opacity duration-500 ${listo ? 'opacity-0' : 'opacity-100'}`}
          aria-hidden={listo}
        >
          <span className="animate-pulse">Cargando presentación…</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => ir(-1)} className={boton} aria-label="Anterior">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden min-[420px]:inline">Anterior</span>
        </button>
        <div className="flex items-center gap-2">
          {diapo && (
            <span className="text-[13px] font-mono font-semibold text-slate-400 light:text-slate-600 tabular-nums min-w-[48px] text-center">
              {diapo.i + 1} / {diapo.n}
            </span>
          )}
          {puedePantallaCompleta && (
            <button type="button" onClick={pantallaCompleta} className={`${boton} px-3`} aria-label="Pantalla completa" title="Pantalla completa">
              {completa ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
        <button type="button" onClick={() => ir(1)} className={boton} aria-label="Siguiente">
          <span className="hidden min-[420px]:inline">Siguiente</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
