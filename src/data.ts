import { Course, User, Student, ClassItem } from './types';

export const COURSES: Course[] = [
  {
    id: 0,
    name: "Fundamentos",
    desc: "¿Qué es el dinero? Ingresos, egresos y tu primer presupuesto.",
    accent: "from-violet-500 to-purple-600",
    total: 16
  },
  {
    id: 1,
    name: "Hábitos financieros",
    desc: "Ahorro sistemático, fondo de emergencia e interés compuesto.",
    accent: "from-indigo-500 to-indigo-600",
    total: 16
  },
  {
    id: 2,
    name: "Inversión básica",
    desc: "Inflación, activos e instrumentos de inversión.",
    accent: "from-blue-600 to-blue-500",
    total: 16
  },
  {
    id: 3,
    name: "Estrategia avanzada",
    desc: "Portafolios, negocios y planificación a largo plazo.",
    accent: "from-sky-500 to-cyan-500",
    total: 16
  }
];

export const DEMO_USERS: Record<string, User> = {
  'admin@fintly.pro': { name: 'Francisco Argenti', role: 'admin', initials: 'FA', email: 'admin@fintly.pro', password: '123456' },
  'profe@fintly.pro': { name: 'Prof. García', role: 'directivo', initials: 'PG', email: 'profe@fintly.pro', password: '123456' },
  'director@fintly.pro': { name: 'Director Sánchez', role: 'directivo', initials: 'DS', email: 'director@fintly.pro', password: '123456' },
  'alumno@fintly.pro': { name: 'Martina López', role: 'alumno', initials: 'ML', email: 'alumno@fintly.pro', password: '123456' },
  'fargenti01@gmail.com': { name: 'Francisco Argenti (Admin)', role: 'admin', initials: 'FA', email: 'fargenti01@gmail.com', password: '123456' },
  'juanurrizass@gmail.com': { name: 'Juan Urrizas (Admin)', role: 'admin', initials: 'JU', email: 'juanurrizass@gmail.com', password: '123456' },
  'ianlucasfreitag@gmail.com': { name: 'Ian Lucas Freitag (Admin)', role: 'admin', initials: 'IF', email: 'ianlucasfreitag@gmail.com', password: '123456' },
  'fintlyeducacion@gmail.com': { name: 'Fintly Educación (Admin)', role: 'admin', initials: 'FE', email: 'fintlyeducacion@gmail.com', password: '123456' }
};

export const DEMO_STUDENTS: Student[] = [
  // Colegio del Faro, Sede Benavidez y Puertos
  { name: 'Sofía Rodríguez', email: 'sofia@faro.edu.ar', initials: 'SR', level: 0, progress: 2, total: 16, status: 'ok', school: 'Colegio del Faro, Sede Benavidez y Puertos' },
  { name: 'Lucas Martínez', email: 'lucas@faro.edu.ar', initials: 'LM', level: 0, progress: 1, total: 16, status: 'ok', school: 'Colegio del Faro, Sede Benavidez y Puertos' },
  { name: 'Mateo Díaz', email: 'mateo@faro.edu.ar', initials: 'MD', level: 1, progress: 3, total: 16, status: 'ok', school: 'Colegio del Faro, Sede Benavidez y Puertos' },

  // Northfield Sede Puertos (niveles 0 y 1 como solicitó el usuario)
  { name: 'Martina López', email: 'alumno@fintly.pro', initials: 'ML', level: 0, progress: 2, total: 16, status: 'ok', school: 'Northfield Sede Puertos' },
  { name: 'Tomás Fernández', email: 'tomas@fintly.pro', initials: 'TF', level: 0, progress: 1, total: 16, status: 'ok', school: 'Northfield Sede Puertos' },
  { name: 'Camila Torres', email: 'camila@fintly.pro', initials: 'CT', level: 1, progress: 5, total: 16, status: 'ok', school: 'Northfield Sede Puertos' },

  // Northfield Sede Nordelta (niveles 0, 1, 2 y 3 como solicitó el usuario)
  { name: 'Valentina Cruz', email: 'vale@fintly.pro', initials: 'VC', level: 0, progress: 12, total: 16, status: 'ok', school: 'Northfield Sede Nordelta' },
  { name: 'Ignacio Ruiz', email: 'nacho@fintly.pro', initials: 'IR', level: 1, progress: 2, total: 16, status: 'warn', school: 'Northfield Sede Nordelta' },
  { name: 'Santiago Gómez', email: 'santiago@fintly.pro', initials: 'SG', level: 2, progress: 4, total: 16, status: 'ok', school: 'Northfield Sede Nordelta' },
  { name: 'Felipe Herrera', email: 'felipe@fintly.pro', initials: 'FH', level: 3, progress: 8, total: 16, status: 'ok', school: 'Northfield Sede Nordelta' },

  // South Greek School
  { name: 'Benjamín Castro', email: 'benja@southgreek.edu', initials: 'BC', level: 0, progress: 1, total: 16, status: 'ok', school: 'South Greek School' },
  { name: 'Delfina Ortiz', email: 'delfi@southgreek.edu', initials: 'DO', level: 2, progress: 6, total: 16, status: 'ok', school: 'South Greek School' },

  // Global School
  { name: 'Emma Watson', email: 'emma@globalschool.edu', initials: 'EW', level: 1, progress: 7, total: 16, status: 'ok', school: 'Global School' },
  { name: 'Nicolás Vázquez', email: 'nico@globalschool.edu', initials: 'NV', level: 2, progress: 9, total: 16, status: 'ok', school: 'Global School' }
];

export const DEFAULT_CLASSES: ClassItem[] = [
  {
    level: 0,
    week: 1,
    title: "¿Qué es el dinero?",
    unlockAt: "2026-01-01T00:00",
    deadline: "2099-01-01T00:00",
    text: `<h3>Introducción al dinero</h3><p>El dinero es mucho más que los billetes que tenés en el bolsillo. Es un sistema de intercambio que la humanidad desarrolló para facilitar el comercio y la cooperación.</p><h3>Las tres funciones del dinero</h3><ul><li><strong>Medio de intercambio:</strong> sirve para comprar y vender productos o servicios sin tener que recurrir al trueque directo.</li><li><strong>Unidad de cuenta:</strong> nos permite comparar el valor relativo de las cosas y darles un precio claro.</li><li><strong>Reserva de valor:</strong> podemos guardarlo para consumir o invertir en el futuro sin que pierda todo su poder de compra instantáneamente.</li></ul><p>Esta semana vamos a explorar cómo el dinero impacta en tu vida cotidiana y de qué maneras gestionas tus primeros ingresos y decisiones de valor.</p>`,
    videoId: "dQw4w9WgXcQ",
    slidesUrl: "",
    actTitle: "Tu relación con el dinero",
    actDesc: "Escribí 3 situaciones de tu semana donde usaste o pensaste en dinero. Para cada una, explicá si fue una decisión consciente o automática, y qué aprendiste sobre tus prioridades financieras actuales."
  },
  {
    level: 0,
    week: 2,
    title: "Ingresos y egresos",
    unlockAt: "2026-05-30T08:00",
    deadline: "2026-06-06T23:59",
    text: `<h3>¿Qué es un ingreso?</h3><p>Un ingreso es todo el flujo de dinero que entra a tu bolsillo o cuenta bancaria. Puede provenir de tu sueldo mensual, mesada familiar, trabajos freelance o emprendimientos propios.</p><h3>¿Qué es un egreso?</h3><p>Un egreso es todo aquello que representa una salida de dinero para consumir bienes o servicios: comida, transporte, ropa, entretenimiento, pago de facturas telefónicas, etc.</p><h3>La ecuación básica de las finanzas</h3><p><strong>Ingresos - Egresos = Capacidad de Ahorro (o Generación de Deuda)</strong>.<br>Si tus egresos superan tus ingresos recurrentemente, estás en números rojos y necesitarás financiamiento (lo cual cuesta dinero mediante tasas de interés) o usar ahorros previos. El objetivo inicial es optimizar tus egresos para liberar capacidad de ahorro mensual.</p>`,
    videoId: "",
    slidesUrl: "",
    actTitle: "Mapeá tus ingresos y egresos",
    actDesc: "Durante esta semana, anotá absolutamente TODOS tus ingresos y egresos diarios. Clasificalos en Necesidades Básicas y Deseos. Al final de la semana, calcula tu balance neto. ¿Te sorprendió ver en qué se te va la mayor parte del dinero?"
  },
  {
    level: 0,
    week: 3,
    title: "El presupuesto personal",
    unlockAt: "2026-06-15T08:00",
    deadline: "2026-06-22T23:59",
    text: `<h3>¿Qué es un presupuesto?</h3><p>Un presupuesto es un mapa financiero dinámico. Es el acto de asignar cada peso o dólar a un propósito específico antes de gastarlo realmente. En finanzas corporativas y personales, es la herramienta fundamental de toma de decisiones.</p><h3>La ventaja de anticiparse</h3><p>El presupuesto te permite decirle a tu dinero a dónde ir, en lugar de preguntarte a dónde se fue. Te ayuda a priorizar tus metas a largo plazo por sobre los impulsos de corto plazo.</p>`,
    videoId: "",
    slidesUrl: "",
    actTitle: "Armá tu primer presupuesto",
    actDesc: "Te desafiamos a usar la regla clásica 50/30/20: 50% de tus ingresos para Necesidades esenciales, 30% para Deseos o gustos, y 20% destinado exclusivamente al Ahorro o inversión. Diseña cómo distribuirías tus ingresos proyectados usando esta regla."
  }
];
