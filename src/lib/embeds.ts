/**
 * embeds.ts
 * Video y presentaciones incrustadas. Estas funciones estaban copiadas en el
 * editor y en la vista del alumno, con diferencias entre una copia y la otra.
 */

/** Saca el ID de 11 caracteres de cualquier forma de enlace de YouTube. Devuelve '' si no lo encuentra. */
export function idDeYoutube(entrada: string): string {
  const texto = (entrada ?? '').trim();
  if (!texto) return '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(texto)) return texto;

  const patrones = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/live\/([a-zA-Z0-9_-]{11})/,
    /\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const patron of patrones) {
    const m = texto.match(patron);
    if (m) return m[1];
  }
  return '';
}

/**
 * URL del reproductor.
 * Usa youtube-nocookie: YouTube no deja cookies de seguimiento en el
 * navegador hasta que el alumno le da play. Los usuarios son menores.
 */
export function urlDeYoutube(videoId?: string): string {
  const id = idDeYoutube(videoId ?? '');
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : '';
}

/**
 * URL para incrustar una presentación (Gamma, Canva, Google Slides).
 * Acepta el enlace solo o el código <iframe> completo, del que extrae el src.
 *
 * Sólo deja pasar direcciones https. Un iframe cuyo src empieza con
 * "javascript:" ejecuta ese código con los permisos de la página que lo
 * contiene, así que cualquier otra cosa se descarta y la pestaña se muestra vacía.
 */
export function urlDeEmbed(entrada?: string): string {
  const texto = (entrada ?? '').trim();
  if (!texto) return '';

  const enIframe = texto.match(/src\s*=\s*["'“”«»‘’]\s*([^"'“”«»‘’\s>]+)/i);
  const candidata = (enIframe ? enIframe[1] : texto).trim();

  try {
    const url = new URL(candidata);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}
