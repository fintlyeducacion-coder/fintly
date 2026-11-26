/**
 * htmlClase.ts
 * Textos y presentaciones de clase hechos como páginas HTML (con Claude).
 *
 * POR QUÉ SE COPIAN Y NO SE ENLAZAN
 * Un link de claude.ai depende de una cuenta de Claude, puede cambiar o caerse
 * y a un alumno le puede pedir que inicie sesión. Por eso el HTML se guarda en
 * el campus (Firestore, colección 'contenidos') y se muestra desde ahí.
 *
 * POR QUÉ VA EN UNA CAJA AISLADA
 * Estas páginas traen su propio código (pestañas, ejercicios, animaciones).
 * Se muestran dentro de un iframe con sandbox y sin 'allow-same-origin': el
 * código corre, pero no puede leer la sesión del alumno, ni la base, ni nada
 * del campus. Lo único que puede hacer es avisar su alto y pedir "volver
 * arriba", con mensajes que el campus valida.
 *
 * Las respuestas que el alumno marca adentro (multiple choice, etc.) no se
 * guardan: son práctica. Lo que se entrega y se corrige es la actividad.
 */

/** Tope por documento: Firestore admite 1 MiB y dejamos margen para los demás campos. */
export const LIMITE_HTML_BYTES = 900_000;

/** Marca con que los mensajes del iframe se reconocen como nuestros. */
export const MARCA_MENSAJE = 'fintly-html';

export const bytesDe = (s: string) => new TextEncoder().encode(s).length;

/**
 * Lo que devuelve claude.ai al bajar un artifact trae, adelante, su propio
 * "motor" (scripts para hablar con claude.ai) y recién después el HTML que
 * escribió el autor. Acá se queda sólo con lo del autor.
 * Si el HTML no viene de claude.ai, se devuelve tal cual.
 */
export function extraerHtmlDeArtifact(crudo: string): string {
  const html = crudo.replace(/^﻿/, '');
  if (!/frame-runtime|__FRAME_PREAMBLE/.test(html)) return html.trim();
  // El envoltorio de claude.ai termina en su primer "</head><body>"; lo que sigue es del autor.
  const corte = html.search(/<\/head>\s*<body[^>]*>/i);
  if (corte < 0) return html.trim();
  const resto = html.slice(corte).replace(/^<\/head>\s*<body[^>]*>/i, '');
  // Los cierres duplicados del envoltorio no molestan, pero se sacan para que quede prolijo.
  const autor = resto.replace(/(\s*<\/body>\s*<\/html>\s*)+$/i, '').trim();
  return /^<!doctype/i.test(autor) ? `${autor}\n</body></html>` : autor;
}

/** Un error para mostrarle al admin, o null si el HTML sirve. */
export function problemaDelHtml(html: string): string | null {
  if (!html.trim()) return 'El archivo está vacío.';
  if (!/<(html|body|div|main|section|p|h1|h2|script|style)\b/i.test(html))
    return 'No parece un archivo HTML. Subí el .html de la clase.';
  const bytes = bytesDe(html);
  if (bytes > LIMITE_HTML_BYTES)
    return `El archivo pesa ${(bytes / 1_000_000).toFixed(1)} MB y el máximo es 0,9 MB. Suele pasar si tiene imágenes adentro: sacalas o achicalas.`;
  return null;
}

/**
 * Lo que se le agrega al HTML para que conviva con el campus:
 *  - avisa su alto, así el iframe crece y la clase se lee como parte de la página;
 *  - cuando la página quiere "volver arriba" (por ejemplo al cambiar de pestaña),
 *    se lo pide al campus, porque adentro de un iframe que mide lo mismo que su
 *    contenido no hay nada que desplazar;
 *  - los links se abren en otra pestaña, para no navegar adentro de la caja.
 */
const PUENTE = `<script>(function(){
var M=${JSON.stringify(MARCA_MENSAJE)},ult=0;
function alto(){var b=document.body;if(!b)return;var cs=getComputedStyle(b),r=b.getBoundingClientRect(),dcs=getComputedStyle(document.documentElement);
/* El alto del contenido, no el de la página: la página nunca mide menos que el iframe, y así la caja podría crecer pero nunca achicarse. */
var h=Math.ceil(r.height+parseFloat(cs.marginTop)+parseFloat(cs.marginBottom)+parseFloat(dcs.paddingTop)+parseFloat(dcs.paddingBottom));if(Math.abs(h-ult)>1){ult=h;parent.postMessage({m:M,tipo:'alto',h:h},'*');}}
function arriba(){parent.postMessage({m:M,tipo:'arriba'},'*');}
var st=window.scrollTo;window.scrollTo=function(x,y){var t=typeof x==='object'&&x?x.top:y;if(!t)arriba();try{st.apply(window,arguments)}catch(e){}};
window.scroll=window.scrollTo;
document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(a&&!/^#/.test(a.getAttribute('href')||'')){a.setAttribute('target','_blank');a.setAttribute('rel','noopener noreferrer');}},true);
window.addEventListener('load',alto);
if(window.ResizeObserver){new ResizeObserver(alto).observe(document.documentElement);}
setInterval(alto,700);alto();
})();</script>`;

/**
 * El HTML listo para el iframe: con el puente y con el tema del campus
 * (claro u oscuro), para que no quede una página blanca dentro del campus oscuro.
 */
export function prepararParaMostrar(html: string, tema: 'dark' | 'light'): string {
  let salida = html;
  // Tema: las páginas hechas con Claude respetan data-theme en <html>.
  if (/<html\b[^>]*>/i.test(salida)) {
    salida = salida.replace(/<html\b([^>]*)>/i, (_m, attrs: string) => {
      const sinTema = attrs.replace(/\sdata-theme\s*=\s*("[^"]*"|'[^']*'|\S+)/i, '');
      return `<html${sinTema} data-theme="${tema}">`;
    });
  }
  const esquema = `<meta name="color-scheme" content="${tema}">`;
  if (/<head\b[^>]*>/i.test(salida)) {
    salida = salida.replace(/<head\b[^>]*>/i, (m) => `${m}${esquema}`);
  } else {
    salida = `${esquema}${salida}`;
  }
  // El puente va al final, cuando ya existe el body.
  return /<\/body>/i.test(salida) ? salida.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${PUENTE}</body>`) : `${salida}${PUENTE}`;
}

/** Identificador nuevo para un contenido ('c_' + fecha + azar). */
export const nuevoIdDeContenido = () =>
  `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
