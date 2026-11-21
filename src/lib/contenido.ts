/**
 * contenido.ts
 * Ida y vuelta entre el texto que escribe el admin en el editor y el HTML que
 * se guarda en la clase. Lógica pura, sin DOM, para poder probarla.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * La conversión estaba escrita dos veces dentro del editor (una para guardar,
 * otra para la vista previa) y tenía fallas que llegaban al alumno:
 *
 *  · Los botones "B" e "I" insertaban **negrita** y *itálica*, pero nada los
 *    convertía: el alumno veía los asteriscos.
 *  · El botón "Separador" insertaba --- y aparecían tres guiones sueltos.
 *  · La última viñeta de una lista quedaba sin convertir si el texto no
 *    terminaba en salto de línea (casi siempre: el editor recorta el final).
 *  · Una lista al principio de un bloque se guardaba como <li> sueltos, sin
 *    su <ul>, y las viñetas se dibujaban fuera del margen.
 *
 * SINTAXIS DEL EDITOR
 *   ## Título          → <h2>      (también ### y ####)
 *   * elemento         → <ul><li>  (también "- elemento")
 *   ---                → <hr>
 *   **negrita**        → <strong>
 *   *itálica*          → <em>
 *   línea en blanco    → párrafo nuevo
 *
 * El HTML que el admin pegue a mano pasa tal cual: lo limpia sanitize.ts al
 * mostrarlo, igual que antes.
 */

/** Una línea que ya es un bloque HTML no se envuelve en <p>. */
const ES_BLOQUE_HTML = /^<\/?(h[1-6]|ul|ol|li|table|thead|tbody|tr|blockquote|figure|img|div|pre|hr|p)\b/i;

/**
 * Negrita e itálica.
 * La itálica exige que el asterisco esté pegado al texto ("*así*"), para no
 * confundirla con una cuenta como "2 * 3 * 4" ni con una viñeta.
 * Sin lookbehind a propósito: Safari anterior a 16.4 no lo entiende y un
 * solo regex inválido impide que cargue todo el archivo.
 */
function enLinea(texto: string): string {
  return texto
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^\s*](?:[^*\n]*[^\s*])?)\*(?![*\w])/g, '$1<em>$2</em>');
}

/** Texto del editor → HTML para guardar. */
export function textoAHtml(texto: string): string {
  const lineas = (texto ?? '').replace(/\r\n?/g, '\n').split('\n');
  const salida: string[] = [];
  let parrafo: string[] = [];
  let lista: string[] = [];

  const cerrarParrafo = () => {
    if (parrafo.length === 0) return;
    salida.push(`<p>${parrafo.map(enLinea).join('<br>')}</p>`);
    parrafo = [];
  };
  const cerrarLista = () => {
    if (lista.length === 0) return;
    salida.push(`<ul>${lista.map((item) => `<li>${enLinea(item)}</li>`).join('')}</ul>`);
    lista = [];
  };

  for (const cruda of lineas) {
    const linea = cruda.trim();

    if (!linea) {
      cerrarParrafo();
      cerrarLista();
      continue;
    }

    const titulo = linea.match(/^(#{2,4})\s+(.+)$/);
    if (titulo) {
      cerrarParrafo();
      cerrarLista();
      const n = titulo[1].length;
      salida.push(`<h${n}>${enLinea(titulo[2].trim())}</h${n}>`);
      continue;
    }

    if (/^-{3,}$/.test(linea)) {
      cerrarParrafo();
      cerrarLista();
      salida.push('<hr>');
      continue;
    }

    const vineta = linea.match(/^[*-]\s+(.+)$/);
    if (vineta) {
      cerrarParrafo();
      lista.push(vineta[1].trim());
      continue;
    }

    if (ES_BLOQUE_HTML.test(linea)) {
      cerrarParrafo();
      cerrarLista();
      salida.push(linea);
      continue;
    }

    cerrarLista();
    parrafo.push(linea);
  }

  cerrarParrafo();
  cerrarLista();
  return salida.join('');
}

// Marcas internas para reconstruir listas sin dejar líneas en blanco entre viñetas.
const INICIO_ITEM = '\u0001';
const FIN_ITEM = '\u0002';

/**
 * HTML guardado → texto para el editor.
 * Entiende tanto el formato nuevo como el que dejaba la versión anterior
 * (incluidos los <li> sueltos y las viñetas a medio convertir), así que
 * abrir y volver a guardar una clase vieja la deja bien formada.
 */
export function htmlATexto(html: string): string {
  if (!html) return '';

  // Las listas numeradas no tienen sintaxis en el editor: se preservan como HTML.
  const numeradas: string[] = [];
  let texto = html.replace(/<ol\b[\s\S]*?<\/ol>/gi, (bloque) => {
    numeradas.push(bloque);
    return `\n\n\u0003${numeradas.length - 1}\u0003\n\n`;
  });

  texto = texto
    .replace(/<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, n: string, t: string) =>
      `\n\n${'#'.repeat(Number(n))} ${t.trim()}\n\n`
    )
    .replace(/<hr\s*\/?>/gi, '\n\n---\n\n')
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, t: string) => `${INICIO_ITEM}* ${t.trim()}${FIN_ITEM}`)
    .replace(/<\/?ul\b[^>]*>/gi, '\n\n')
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<br\s*\/?>/gi, '\n');

  // Viñetas consecutivas van una por línea; el resto se separa con línea en blanco.
  // La segunda regla une un <li> con la viñeta sin convertir que la versión
  // anterior dejaba pegada detrás ("<li>a</li>* b"), para que sigan siendo una lista.
  texto = texto
    .split(FIN_ITEM + INICIO_ITEM).join('\n')
    .replace(new RegExp(`${FIN_ITEM}\\s*(?=[*-]\\s)`, 'g'), '\n')
    .split(INICIO_ITEM).join('\n\n')
    .split(FIN_ITEM).join('\n\n');

  texto = texto.replace(/\u0003(\d+)\u0003/g, (_m, i: string) => numeradas[Number(i)]);

  return texto
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** ¿Hay algo para leer, más allá de etiquetas vacías? */
export function tieneTexto(html?: string): boolean {
  if (!html) return false;
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
}

/** Cantidad de palabras de un texto plano. */
export function contarPalabras(texto: string): number {
  const limpio = (texto ?? '').trim();
  return limpio ? limpio.split(/\s+/).length : 0;
}
