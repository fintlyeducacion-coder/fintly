/**
 * avisos.ts
 * Qué tiene que hacer el alumno ahora y qué tan urgente es. Lógica pura.
 *
 * Un chico de 15 a 18 años entra al campus y tiene que saber en un segundo
 * a dónde ir. Por eso cada clase tiene un "tono" (rojo = vencida, naranja =
 * vence hoy, etc.) y el panel muestra arriba un solo aviso: el más urgente.
 */
import { ClassItem } from '../types';
import { Paso } from './recorrido';
import { fechaConHora } from './fechas';

export type Tono =
  | 'vencida'     // ya pasó el plazo y no la entregó (puede entregar tarde)
  | 'hoy'         // vence en menos de 24 h
  | 'manana'      // vence en menos de 48 h
  | 'disponible'  // la puede hacer, sin apuro
  | 'programada'  // todavía no abrió
  | 'bloqueada'   // abrió, pero falta entregar la anterior
  | 'entregada';

const MIN = 60 * 1000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

const fecha = (d?: string | null) => {
  if (!d) return null;
  const f = new Date(d);
  return Number.isNaN(f.getTime()) ? null : f;
};

/** Tiempo hasta una fecha, en palabras: "40 min", "5 h", "2 días". Vacío si ya pasó. */
export function cuantoFalta(d: string | null | undefined, ahora: Date = new Date()): string {
  const f = fecha(d);
  if (!f) return '';
  const ms = f.getTime() - ahora.getTime();
  if (ms <= 0) return '';
  if (ms < HORA) return `${Math.max(1, Math.round(ms / MIN))} min`;
  if (ms < DIA) return `${Math.round(ms / HORA)} h`;
  const dias = Math.round(ms / DIA);
  return dias === 1 ? '1 día' : `${dias} días`;
}

export function tonoDePaso(paso: Paso, ahora: Date = new Date()): Tono {
  if (paso.estado === 'entregada') return 'entregada';
  if (paso.estado === 'programada') return 'programada';
  if (paso.estado === 'bloqueada') return 'bloqueada';
  const plazo = fecha(paso.clase.deadline);
  if (!plazo) return 'disponible';
  const falta = plazo.getTime() - ahora.getTime();
  if (falta <= 0) return 'vencida';
  if (falta <= DIA) return 'hoy';
  if (falta <= 2 * DIA) return 'manana';
  return 'disponible';
}

export interface Aviso {
  tono: Tono | 'aldia' | 'vacio';
  /** Frase corta y directa, la que se lee primero. */
  titulo: string;
  /** Una línea con el detalle (fecha, qué pasa si no la hace). */
  detalle: string;
  /** La clase a la que lleva el botón, si hay alguna para abrir. */
  clase?: ClassItem;
  /** Texto del botón. */
  accion?: string;
}

const nombre = (cl: ClassItem) => `Clase ${cl.week} · ${cl.title}`;

/** El aviso más importante para el alumno, en orden de urgencia. */
export function avisoPrincipal(pasos: Paso[], ahora: Date = new Date()): Aviso {
  if (pasos.length === 0) {
    return {
      tono: 'vacio',
      titulo: 'Todavía no hay clases',
      detalle: 'Cuando tu profe publique la primera, te aparece acá.',
    };
  }
  const conTono = pasos.map((p) => ({ p, t: tonoDePaso(p, ahora) }));
  const de = (t: Tono) => conTono.filter((x) => x.t === t).map((x) => x.p);

  const vencidas = de('vencida');
  if (vencidas.length > 0) {
    const cl = vencidas[0].clase;
    return {
      tono: 'vencida',
      titulo: vencidas.length === 1 ? 'Se te pasó la fecha de una clase' : `Se te pasó la fecha de ${vencidas.length} clases`,
      detalle: `${nombre(cl)} venció el ${fechaConHora(cl.deadline)}. Todavía la podés entregar, queda como fuera de plazo. Hasta que no la entregues, la siguiente no se abre.`,
      clase: cl,
      accion: 'Entregala ahora',
    };
  }

  const hoy = de('hoy')[0];
  if (hoy) {
    return {
      tono: 'hoy',
      titulo: `Vence hoy: te quedan ${cuantoFalta(hoy.clase.deadline, ahora)}`,
      detalle: `${nombre(hoy.clase)} · entrega hasta las ${fechaConHora(hoy.clase.deadline).split(', ')[1] ?? ''}.`,
      clase: hoy.clase,
      accion: 'Hacela ahora',
    };
  }

  const manana = de('manana')[0];
  if (manana) {
    return {
      tono: 'manana',
      titulo: 'Vence mañana',
      detalle: `${nombre(manana.clase)} · entrega hasta el ${fechaConHora(manana.clase.deadline)}.`,
      clase: manana.clase,
      accion: 'Abrir clase',
    };
  }

  const disponible = de('disponible')[0];
  if (disponible) {
    const cl = disponible.clase;
    return {
      tono: 'disponible',
      titulo: 'Tenés una clase para hacer',
      detalle: cl.deadline
        ? `${nombre(cl)} · tenés hasta el ${fechaConHora(cl.deadline)} (${cuantoFalta(cl.deadline, ahora)}).`
        : nombre(cl),
      clase: cl,
      accion: 'Empezar',
    };
  }

  const programada = de('programada')[0];
  if (programada) {
    const cl = programada.clase;
    return {
      tono: 'programada',
      titulo: `Próxima clase en ${cuantoFalta(cl.unlockAt, ahora)}`,
      detalle: `Estás al día. ${nombre(cl)} se abre el ${fechaConHora(cl.unlockAt)}.`,
    };
  }

  return {
    tono: 'aldia',
    titulo: 'Estás al día',
    detalle: 'Entregaste todo lo que hay publicado. Cuando salga una clase nueva, te avisamos.',
  };
}
