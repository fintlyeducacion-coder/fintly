/**
 * pegado.ts
 * Limpieza del HTML que entra al editor de clases: lo que se pega desde
 * Google Docs o Word, y las clases guardadas con versiones anteriores.
 *
 * Usa el DOM del navegador (DOMParser), así que sólo corre en la app.
 *
 * QUÉ HACE CON LO QUE VIENE DE GOOGLE DOCS
 * Docs no marca la negrita con <b> sino con <span style="font-weight:700">,
 * y envuelve todo en un <b style="font-weight:normal">. Si se pasara directo
 * por el saneador, que borra los estilos, se perdería toda la negrita y la
 * itálica. Por eso primero se traducen esos estilos a etiquetas reales y
 * recién después se sanea.
 */
import { sanitizeHtml } from '../sanitize';

const PESO_NEGRITA = /font-weight\s*:\s*(bold|[6-9]00)/i;
const CURSIVA = /font-style\s*:\s*italic/i;
const SUBRAYADO = /text-decoration[^;]*underline/i;

/** Reemplaza un elemento por sus hijos. */
function desenvolver(el: Element) {
  const padre = el.parentNode;
  if (!padre) return;
  while (el.firstChild) padre.insertBefore(el.firstChild, el);
  padre.removeChild(el);
}

/** Cambia la etiqueta de un elemento conservando su contenido. */
function renombrar(el: Element, etiqueta: string): Element {
  const nuevo = el.ownerDocument.createElement(etiqueta);
  while (el.firstChild) nuevo.appendChild(el.firstChild);
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === 'href' || attr.name === 'src' || attr.name === 'alt') nuevo.setAttribute(attr.name, attr.value);
  }
  el.replaceWith(nuevo);
  return nuevo;
}

const vacio = (el: Element) =>
  !el.textContent?.trim() && !el.querySelector('img, hr, table');

/** Normalizaciones comunes a lo pegado y a lo guardado. */
function normalizar(cuerpo: HTMLElement) {
  // Títulos: la clase usa h2, h3 y h4.
  cuerpo.querySelectorAll('h1').forEach((h) => renombrar(h, 'h2'));
  cuerpo.querySelectorAll('h5, h6').forEach((h) => renombrar(h, 'h4'));

  // Una sola forma de negrita e itálica, que es la que tiene estilo en la clase.
  cuerpo.querySelectorAll('b').forEach((b) => renombrar(b, 'strong'));
  cuerpo.querySelectorAll('i').forEach((i) => renombrar(i, 'em'));

  // Los <span> no aportan nada una vez sacados los estilos (los deja el navegador al editar).
  cuerpo.querySelectorAll('span').forEach(desenvolver);

  // Docs mete un <p> adentro de cada viñeta.
  cuerpo.querySelectorAll('li > p').forEach(desenvolver);

  // <li> sueltos, sin su lista (los dejaba la versión anterior del editor).
  Array.from(cuerpo.querySelectorAll('li')).forEach((li) => {
    const padre = li.parentElement;
    if (padre && (padre.tagName === 'UL' || padre.tagName === 'OL')) return;
    const lista = cuerpo.ownerDocument.createElement('ul');
    li.before(lista);
    let actual: Element | null = li;
    while (actual && actual.tagName === 'LI') {
      const siguiente: Element | null = actual.nextElementSibling;
      lista.appendChild(actual);
      actual = siguiente;
    }
  });

  // Párrafos vacíos que dejan los saltos de línea de más.
  cuerpo.querySelectorAll('p, h2, h3, h4, li').forEach((el) => {
    if (vacio(el)) el.remove();
  });
  // <br> sueltos entre bloques.
  Array.from(cuerpo.childNodes).forEach((n) => {
    if (n.nodeName === 'BR') n.parentNode?.removeChild(n);
  });
}

/**
 * HTML pegado (Google Docs, Word, una web) → HTML limpio para la clase.
 *
 * Las imágenes pegadas se quitan y se informa cuántas: las de Google Docs
 * apuntan a direcciones temporales de Google que dejan de funcionar al
 * tiempo, y la clase quedaría con huecos. Se agregan con el botón Imagen.
 */
export function limpiarPegado(html: string): { html: string; imagenesQuitadas: number } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const cuerpo = doc.body;

  // El envoltorio de Docs: <b style="font-weight:normal" id="docs-internal-guid-…">
  cuerpo.querySelectorAll('b').forEach((b) => {
    const estilo = b.getAttribute('style') ?? '';
    if (b.id.startsWith('docs-internal-guid') || /font-weight\s*:\s*(normal|400)/i.test(estilo)) desenvolver(b);
  });

  // Estilos de Docs y Word → etiquetas. De adentro hacia afuera.
  Array.from(cuerpo.querySelectorAll('span')).reverse().forEach((span) => {
    const estilo = span.getAttribute('style') ?? '';
    let contenido: Node = span;
    const envolver = (etiqueta: string) => {
      const el = doc.createElement(etiqueta);
      while (span.firstChild) el.appendChild(span.firstChild);
      span.appendChild(el);
      contenido = el;
    };
    if (SUBRAYADO.test(estilo)) envolver('u');
    if (CURSIVA.test(estilo)) envolver('em');
    if (PESO_NEGRITA.test(estilo)) envolver('strong');
    void contenido;
    desenvolver(span);
  });

  // Un enlace ya se ve subrayado: el subrayado que agrega Docs sobra.
  cuerpo.querySelectorAll('a u').forEach(desenvolver);

  let imagenesQuitadas = 0;
  cuerpo.querySelectorAll('img').forEach((img) => {
    imagenesQuitadas++;
    img.remove();
  });

  normalizar(cuerpo);
  return { html: sanitizeHtml(cuerpo.innerHTML).trim(), imagenesQuitadas };
}

/** Texto plano pegado → párrafos. */
export function textoPlanoAHtml(texto: string): string {
  const escapar = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return texto
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapar(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * HTML de una clase ya guardada → HTML para abrir en el editor.
 * Repara lo que dejaban las versiones anteriores: viñetas sin lista,
 * "**negrita**" y "---" que quedaban como texto literal.
 */
export function repararHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const cuerpo = doc.body;

  // Texto con asteriscos o guiones que nunca se convirtió.
  const recorrer = doc.createTreeWalker(cuerpo, NodeFilter.SHOW_TEXT);
  const conNegrita: Text[] = [];
  for (let n = recorrer.nextNode(); n; n = recorrer.nextNode()) {
    if (/\*\*[^*\n]+?\*\*/.test(n.nodeValue ?? '')) conNegrita.push(n as Text);
  }
  for (const nodo of conNegrita) {
    const span = doc.createElement('span');
    span.innerHTML = (nodo.nodeValue ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
    nodo.replaceWith(span);
    desenvolver(span);
  }
  cuerpo.querySelectorAll('p').forEach((p) => {
    if (/^\s*-{3,}\s*$/.test(p.textContent ?? '') && !p.querySelector('img')) p.replaceWith(doc.createElement('hr'));
  });

  normalizar(cuerpo);
  return sanitizeHtml(cuerpo.innerHTML).trim();
}

/** HTML del editor → HTML para guardar. Vacío si no hay nada para leer. */
export function limpiarHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  normalizar(doc.body);
  const limpio = sanitizeHtml(doc.body.innerHTML).trim();
  const tieneAlgo = doc.body.textContent?.trim() || doc.body.querySelector('img, hr, table');
  return tieneAlgo ? limpio : '';
}
