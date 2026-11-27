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
/* La caja crece al alto del contenido: adentro no hay nada que desplazar. Sin esto, una barra
   que aparece achica el ancho, cambia el alto medido y la barra no se va nunca. */
var est=document.createElement('style');est.textContent='html,body{overflow-y:hidden!important}';(document.head||document.documentElement).appendChild(est);
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

/**
 * ¿Es un mazo exportado de Claude Slides?
 *
 * Esos HTML traen su propio visor: cuando la ventana tiene forma de pantalla
 * (horizontal) muestran una diapositiva por vez, con flechas, deslizar y sus
 * animaciones. Pero si la caja crece al alto del contenido, como con las
 * lecturas, quedan todas una abajo de la otra. Por eso se muestran en una caja
 * de 16:9 fija y con un puente distinto (ver prepararMazo).
 */
export const esMazo = (html: string) => /<section\b[^>]*class="deck-slide"/i.test(html);

/**
 * Puente para los mazos: el campus le pide "siguiente" / "anterior" (se los
 * pasa como si fueran las flechas del teclado, que el mazo ya entiende) y el
 * mazo avisa en qué diapositiva está, para mostrar "3 / 8".
 */
const PUENTE_MAZO = `<script>(function(){
var M=${JSON.stringify(MARCA_MENSAJE)},ult='';
/* El campus ya muestra "3 / 8" abajo: el contador propio del mazo sobra. */
var est=document.createElement('style');est.textContent='.deck-pager{display:none!important}';(document.head||document.documentElement).appendChild(est);
function estado(){var s=[].slice.call(document.querySelectorAll('.deck-slide'));if(!s.length)return;
var i=0;if(document.documentElement.classList.contains('deck-stage')){for(var k=0;k<s.length;k++){if(!s[k].hasAttribute('data-off')){i=k;break;}}}
var clave=i+'/'+s.length;if(clave!==ult){ult=clave;parent.postMessage({m:M,tipo:'diapo',i:i,n:s.length},'*');}}
window.addEventListener('message',function(e){if(e.source!==parent)return;var d=e.data;if(!d||d.m!==M||d.tipo!=='ir')return;
window.dispatchEvent(new KeyboardEvent('keydown',{key:d.dir>0?'ArrowRight':'ArrowLeft',bubbles:true,cancelable:true}));});
document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(a&&!/^#/.test(a.getAttribute('href')||'')){a.setAttribute('target','_blank');a.setAttribute('rel','noopener noreferrer');}},true);
var main=document.querySelector('main')||document.body;
if(window.MutationObserver)new MutationObserver(estado).observe(main,{attributes:true,subtree:true,attributeFilter:['data-off']});
window.addEventListener('load',estado);setTimeout(estado,300);setInterval(estado,1000);
/* "Listo" recién cuando las letras y las imágenes de la primera diapositiva se pueden dibujar. */
function listo(){parent.postMessage({m:M,tipo:'listo'},'*');}
window.addEventListener('load',function(){var s=document.querySelector('.deck-slide');var imgs=s?[].slice.call(s.querySelectorAll('img')):[];
var esperas=imgs.map(function(i){return i.decode?i.decode().catch(function(){}):null;});if(document.fonts&&document.fonts.ready)esperas.push(document.fonts.ready);
Promise.all(esperas).then(function(){requestAnimationFrame(function(){requestAnimationFrame(listo);});});setTimeout(listo,8000);});
})();</script>`;

/** El mazo listo para el iframe: con su puente, sin tocarle el tema (las diapositivas tienen su propio fondo). */
export function prepararMazo(html: string): string {
  return /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${PUENTE_MAZO}</body>`) : `${html}${PUENTE_MAZO}`;
}

/** Identificador nuevo para un contenido ('c_' + fecha + azar). */
export const nuevoIdDeContenido = () =>
  `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
