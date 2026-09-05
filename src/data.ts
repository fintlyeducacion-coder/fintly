import { ClassItem } from './types';

/**
 * Colegios con convenio vigente. Es la ÚNICA fuente de verdad.
 * El nombre funciona como clave: las clases publicadas se vinculan por este string,
 * así que cambiar uno acá desvincula lo ya publicado a ese colegio en Firestore.
 */
export const ASSOCIATED_SCHOOLS = [
  'Faro Benavidez',
  'Faro Escobar',
  'Northfield Puertos',
  'Northfield Nordelta',
  'SouthGreek',
  'Global School',
];

/** Colegio de un usuario todavía sin asignar. No es un colegio real. */
export const SIN_ASIGNAR = 'Sin asignar';

/** Pseudo-colegio del equipo Fintly (los admin no pertenecen a una institución). */
export const COLEGIO_INTERNO = 'Fintly Campus Virtual';

export const COURSES = [
  {
    id: 0,
    name: 'Fundamentos Financieros',
    desc: 'Bases del dinero, presupuesto y ahorro consciente.',
    accent: 'from-violet-600 to-indigo-600',
  },
  {
    id: 1,
    name: 'Hábitos y Presupuesto',
    desc: 'La regla 50/30/20, control de gastos e inflación.',
    accent: 'from-indigo-600 to-blue-600',
  },
  {
    id: 2,
    name: 'Inversión Básica',
    desc: 'Interés compuesto, riesgo, plazo fijo y bonos.',
    accent: 'from-emerald-600 to-teal-600',
  },
  {
    id: 3,
    name: 'Estrategia Avanzada',
    desc: 'Acciones, diversificación y toma de decisiones.',
    accent: 'from-amber-500 to-orange-600',
  },
];

export const UPCOMING_COURSES = [
  {
    id: 'prog1',
    name: 'Programación I',
    tagline: 'Lógica computacional, algoritmos y Python para finanzas.',
    accent: 'from-blue-600 to-cyan-500',
    minAge: 12,
    modules: ['Variables y Flujo', 'Funciones', 'Estructuras', 'Mini Proyecto'],
  },
  {
    id: 'prog2',
    name: 'Programación II',
    tagline: 'Desarrollo web interactivo y simuladores en JavaScript.',
    accent: 'from-indigo-600 to-violet-600',
    minAge: 13,
    modules: ['DOM y Eventos', 'APIs Financieras', 'Canvas', 'App Final'],
  },
  {
    id: 'ia',
    name: 'Inteligencia Artificial',
    tagline: 'Modelos de lenguaje, prompts y automatización inteligente.',
    accent: 'from-violet-600 to-fuchsia-600',
    minAge: 13,
    modules: ['Fundamentos IA', 'Prompt Engineering', 'Automatizaciones', 'Ética y Futuro'],
  },
  {
    id: 'inversiones',
    name: 'Inversiones y Mercados',
    tagline: 'Análisis fundamental, ETFs y mercado de capitales.',
    accent: 'from-emerald-600 to-teal-500',
    minAge: 14,
    modules: ['Renta Fija', 'Renta Variable', 'Fondos Comunes', 'Portafolios'],
  },
  {
    id: 'vida-pro',
    name: 'Habilidades Profesionales',
    tagline: 'Liderazgo, oratoria, negociación y CV digital.',
    accent: 'from-amber-500 to-rose-500',
    minAge: 14,
    modules: ['Comunicación', 'Negociación', 'Gestión de Tiempo', 'Pitch y Emprendimiento'],
  },
];

export const DEFAULT_CLASSES: ClassItem[] = [
  {
    level: 0,
    module: 1,
    week: 1,
    title: '¿Qué es el Dinero y Cómo Funciona?',
    unlockAt: '2026-01-01T00:00',
    deadline: '2026-12-31T23:59',
    text: '<h3>1. Introducción al Dinero</h3><p>El dinero es un medio de intercambio que facilita el comercio de bienes y servicios.</p><h3>2. Funciones Principales</h3><ul><li>Medio de cambio</li><li>Unidad de cuenta</li><li>Depósito de valor</li></ul>',
    videoId: '',
    slidesUrl: '',
    actTitle: 'Tu primer registro de gastos',
    actDesc: 'Anota durante 3 días todos los gastos que observes en tu rutina y categorízalos entre necesarios y prescindibles.',
    isSyllabus: true,
  },
  {
    level: 0,
    module: 1,
    week: 2,
    title: 'La Regla 50/30/20 y el Presupuesto Personal',
    unlockAt: '2026-01-01T00:00',
    deadline: '2026-12-31T23:59',
    text: '<h3>1. La Regla 50/30/20</h3><p>Una fórmula simple para distribuir tus ingresos:</p><ul><li><strong>50% Necesidades</strong></li><li><strong>30% Deseos</strong></li><li><strong>20% Ahorro</strong></li></ul>',
    videoId: '',
    slidesUrl: '',
    actTitle: 'Armado de presupuesto simulado',
    actDesc: 'Con un ingreso ficticio de $100.000, diseña una distribución mensual aplicando la regla 50/30/20.',
    isSyllabus: true,
  },
  {
    level: 1,
    module: 1,
    week: 1,
    title: 'Inflación y Poder Adquisitivo',
    unlockAt: '2026-01-01T00:00',
    deadline: '2026-12-31T23:59',
    text: '<h3>1. ¿Qué es la inflación?</h3><p>Es el aumento generalizado y sostenido de los precios en el tiempo.</p>',
    videoId: '',
    slidesUrl: '',
    actTitle: 'Cálculo de impacto inflacionario',
    actDesc: 'Investiga el precio de 3 productos del supermercado y calcula cuánto costarían con una inflación anual del 50%.',
    isSyllabus: true,
  }
];
