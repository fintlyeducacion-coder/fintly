/**
 * fechas.ts
 * Formato y cálculo de fechas. Una sola definición para toda la app.
 *
 * Las fechas de desbloqueo y de entrega se guardan como texto local sin zona
 * ("2026-11-09T18:30"), que es lo que produce un <input type="datetime-local">.
 * `new Date(texto)` las interpreta en la hora del dispositivo, que es lo que
 * queremos: un plazo "hasta las 18:30" vence a las 18:30 de quien lo mira.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Hora en 24 h ("23:59"), que es como se usa acá. Sin esto el navegador escribe "11:59 p. m.". */
const FORMATO_HORA = { hour: '2-digit', minute: '2-digit', hour12: false } as const;

/**
 * Fecha → valor para un <input type="datetime-local">, en hora LOCAL.
 *
 * Antes se usaba `new Date().toISOString().substring(0, 16)`, que da la hora
 * en UTC. En Argentina (UTC-3) eso es tres horas adelante: una clase que se
 * publicaba "ahora" quedaba programada para dentro de tres horas, y el cartel
 * de confirmación decía "Programada" en vez de "Publicada".
 */
export function aInputLocal(fecha: Date = new Date()): string {
  return (
    `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}` +
    `T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`
  );
}

const valida = (d?: string | null): Date | null => {
  if (!d) return null;
  const fecha = new Date(d);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

/** "12 nov" */
export function fechaCorta(d?: string | null): string {
  const fecha = valida(d);
  return fecha ? fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '';
}

/** "12 nov 2026" */
export function fechaMedia(d?: string | null): string {
  const fecha = valida(d);
  return fecha
    ? fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
}

/** "12 nov, 18:30" */
export function fechaConHora(d?: string | null): string {
  const fecha = valida(d);
  if (!fecha) return '';
  const dia = fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const hora = fecha.toLocaleTimeString('es-AR', FORMATO_HORA);
  return `${dia}, ${hora}`;
}

/** "18:30" */
export function soloHora(d?: string | null): string {
  const fecha = valida(d);
  return fecha ? fecha.toLocaleTimeString('es-AR', FORMATO_HORA) : '';
}

/** ¿Ya pasó este momento? Una fecha vacía o inválida nunca "pasó". */
export function yaPaso(d: string | null | undefined, ahora: Date = new Date()): boolean {
  const fecha = valida(d);
  return fecha ? ahora.getTime() > fecha.getTime() : false;
}

/** ¿Todavía no llegó? Una fecha vacía o inválida no bloquea nada. */
export function todaviaNo(d: string | null | undefined, ahora: Date = new Date()): boolean {
  const fecha = valida(d);
  return fecha ? ahora.getTime() < fecha.getTime() : false;
}

const HORA = 3600 * 1000;

/**
 * Aviso de plazo cercano: "Vence hoy" (menos de 24 h) o "Vence mañana"
 * (menos de 48 h). null si falta más, si ya venció o si no hay plazo.
 */
export function urgencia(
  deadline: string | null | undefined,
  ahora: Date = new Date()
): 'Vence hoy' | 'Vence mañana' | null {
  const fecha = valida(deadline);
  if (!fecha) return null;
  const falta = fecha.getTime() - ahora.getTime();
  if (falta <= 0) return null;
  if (falta <= 24 * HORA) return 'Vence hoy';
  if (falta <= 48 * HORA) return 'Vence mañana';
  return null;
}

export function saludo(ahora: Date = new Date()): string {
  const hora = ahora.getHours();
  if (hora < 13) return 'Buen día';
  if (hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}
