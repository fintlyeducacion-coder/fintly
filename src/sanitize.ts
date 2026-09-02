/**
 * sanitize.ts
 * Saneamiento del HTML de las clases antes de inyectarlo en el DOM.
 *
 * Cumple dos funciones:
 *  1. Seguridad — evita XSS si alguna vez el contenido lo carga alguien que no sea el equipo.
 *  2. Higiene — al pegar desde Google Docs o Word viene un aluvión de <style>, <span class="c17">
 *     y atributos inline que pisan el diseño. Acá se descartan y manda la hoja .class-body-html.
 */
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr', 'div', 'span',
  'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'title',
  'src', 'alt', 'width', 'height', 'loading',
  'colspan', 'rowspan',
];

// Todo enlace del contenido abre en pestaña nueva y sin exponer window.opener
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName === 'A' && node.getAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    // 'style' se descarta a propósito: el diseño lo define .class-body-html
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['style', 'class', 'id'],
  });
}
