import { GradeType } from './types';

/**
 * Clases que tiene cada módulo. Un módulo dura un mes, con una clase por semana.
 *
 * Cambió de 8 a 4 en octubre de 2026, cuando los módulos pasaron de durar
 * dos meses a uno. Está acá y no suelto en el código porque interviene en el
 * orden de las clases dentro de un nivel y en los huecos libres de la
 * Biblioteca: si queda desparejo, las clases se mezclan entre módulos.
 */
export const CLASES_POR_MODULO = 4;

/** Módulos por nivel. Cuatro módulos de un mes = un nivel por cuatrimestre. */
export const MODULOS_POR_NIVEL = 4;

/**
 * Lleva una nota guardada a la escala canónica de cuatro valores.
 *
 * Existe porque en la base hay notas de versiones anteriores con otra
 * redacción ("Muy bueno", "A mejorar"). Sin normalizar, el docente veía un
 * texto y el alumno otro para la misma corrección.
 *
 * Devuelve null si no reconoce el valor, para que quien llame decida qué
 * mostrar en vez de inventar una nota.
 */
export function normalizarNota(raw?: string): GradeType | null {
  if (!raw) return null;
  const limpio = raw.trim().toLowerCase();
  if (limpio === 'excelente') return 'Excelente';
  if (limpio === 'muy bien' || limpio === 'muy bueno') return 'Muy bien';
  if (limpio === 'bien') return 'Bien';
  if (limpio === 'puede mejorar' || limpio === 'a mejorar') return 'Puede mejorar';
  return null;
}

/**
 * Colegios con convenio vigente. Es la ÚNICA fuente de verdad.
 * El nombre funciona como clave: las clases publicadas se vinculan por este string,
 * así que cambiar uno acá desvincula lo ya publicado a ese colegio en Firestore.
 * Para cambiarlo hay que usar la herramienta de migración del panel de admin.
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

// Se elimino DEFAULT_CLASSES.
//
// Eran tres clases de ejemplo que usaba la siembra automatica. Esa siembra se
// quito porque publicaba contenido de muestra a los seis colegios reales ante
// cualquier lectura vacia de Firestore. Sin ella, el arreglo no lo importaba
// nadie. El contenido real se carga desde la Biblioteca del panel.
