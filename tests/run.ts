/**
 * Pruebas de la lógica pura. Se corren con:  npm test
 *
 * No hay framework: son afirmaciones de node:assert. Alcanza para lo que hay
 * que cuidar acá, que es que las reglas de desbloqueo, el avance y la
 * conversión de contenido no se rompan en silencio.
 */
import assert from 'node:assert/strict';
import { ActivitySubmission, ClassItem, Student } from '../src/types';
import {
  agruparPorModulo,
  calcularProgresos,
  construirRecorrido,
  etiquetaClase,
  porcentajeDe,
  resumir,
  sePuedeAbrir,
} from '../src/lib/recorrido';
import { calcularMetricas } from '../src/lib/metricas';
import { alcanceDeBorrado } from '../src/lib/borrado';
import { contarPalabras, htmlATexto, textoAHtml, tieneTexto } from '../src/lib/contenido';
import { idDeYoutube, urlDeEmbed, urlDeYoutube } from '../src/lib/embeds';
import { aInputLocal, todaviaNo, urgencia, yaPaso } from '../src/lib/fechas';

let pasaron = 0;
const fallas: string[] = [];
function prueba(nombre: string, fn: () => void) {
  try {
    fn();
    pasaron++;
  } catch (e) {
    fallas.push(`✗ ${nombre}\n    ${(e as Error).message.split('\n').join('\n    ')}`);
  }
}

// ── Datos de prueba ─────────────────────────────────────────────
const AHORA = new Date('2026-11-09T12:00');
const COLE = 'Faro Benavidez';
const ANA = 'ana@faro.edu.ar';

const clase = (module: number, week: number, extra: Partial<ClassItem> = {}): ClassItem => ({
  level: 0,
  module,
  week,
  title: `M${module} C${week}`,
  text: '<p>x</p>',
  school: COLE,
  unlockAt: '2026-10-01T08:00',
  deadline: '2026-12-01T23:59',
  ...extra,
});

const entrega = (module: number | undefined, week: number, extra: Partial<ActivitySubmission> = {}): ActivitySubmission => ({
  classLevel: 0,
  classModule: module,
  classWeek: week,
  studentEmail: ANA,
  responseText: 'respuesta',
  submittedAt: '2026-10-20T10:00',
  ...extra,
});

const CURSO = [clase(2, 1), clase(1, 2), clase(1, 1), clase(1, 3), clase(1, 4)]; // desordenado a propósito
const alumna = { email: ANA, school: COLE, level: 0 };

// ── Recorrido ───────────────────────────────────────────────────
prueba('ordena por módulo y después por clase', () => {
  const orden = construirRecorrido(CURSO, [], alumna, AHORA).map((p) => etiquetaClase(p.clase));
  assert.deepEqual(orden, [
    'Módulo 1, clase 1', 'Módulo 1, clase 2', 'Módulo 1, clase 3', 'Módulo 1, clase 4', 'Módulo 2, clase 1',
  ]);
});

prueba('sin entregas: sólo la primera está disponible, el resto bloqueado', () => {
  const estados = construirRecorrido(CURSO, [], alumna, AHORA).map((p) => p.estado);
  assert.deepEqual(estados, ['disponible', 'bloqueada', 'bloqueada', 'bloqueada', 'bloqueada']);
});

prueba('entregar una clase destraba la siguiente', () => {
  const pasos = construirRecorrido(CURSO, [entrega(1, 1)], alumna, AHORA);
  assert.deepEqual(pasos.map((p) => p.estado), ['entregada', 'disponible', 'bloqueada', 'bloqueada', 'bloqueada']);
  assert.equal(pasos[2].anterior?.week, 2, 'la bloqueada dice cuál hay que entregar');
});

prueba('la clase 1 del módulo 2 NO se destraba con la clase 1 del módulo 1', () => {
  // Este era el bug de origen: cuatro "clase 1" distintas tratadas como la misma.
  const pasos = construirRecorrido(CURSO, [entrega(1, 1)], alumna, AHORA);
  const m2c1 = pasos.find((p) => p.clase.module === 2)!;
  assert.equal(m2c1.estado, 'bloqueada');
  assert.equal(m2c1.entrega, undefined);
});

prueba('una entrega vieja sin módulo cuenta como del módulo 1 y de ningún otro', () => {
  const pasos = construirRecorrido(CURSO, [entrega(undefined, 1)], alumna, AHORA);
  assert.equal(pasos[0].estado, 'entregada');
  assert.equal(pasos.find((p) => p.clase.module === 2)!.estado, 'bloqueada');
});

prueba('una clase con fecha de apertura futura está programada', () => {
  const curso = [clase(1, 1), clase(1, 2, { unlockAt: '2026-11-20T08:00' })];
  const pasos = construirRecorrido(curso, [entrega(1, 1)], alumna, AHORA);
  assert.equal(pasos[1].estado, 'programada');
  assert.equal(sePuedeAbrir(pasos[1]), false);
});

prueba('una clase ya entregada se puede abrir aunque le hayan corrido la fecha', () => {
  const curso = [clase(1, 1, { unlockAt: '2026-12-25T08:00' })];
  const pasos = construirRecorrido(curso, [entrega(1, 1)], alumna, AHORA);
  assert.equal(pasos[0].estado, 'entregada');
  assert.equal(sePuedeAbrir(pasos[0]), true);
});

prueba('no mezcla colegios, niveles ni plantillas del syllabus', () => {
  const mezcla = [
    clase(1, 1),
    clase(1, 2, { school: 'Faro Escobar' }),
    clase(1, 3, { level: 1 }),
    clase(1, 4, { school: undefined, isSyllabus: true }),
  ];
  assert.equal(construirRecorrido(mezcla, [], alumna, AHORA).length, 1);
});

prueba('no cuenta entregas de otro alumno', () => {
  const pasos = construirRecorrido(CURSO, [entrega(1, 1, { studentEmail: 'otro@faro.edu.ar' })], alumna, AHORA);
  assert.equal(pasos[0].estado, 'disponible');
});

prueba('el correo se compara sin distinguir mayúsculas', () => {
  const pasos = construirRecorrido(CURSO, [entrega(1, 1, { studentEmail: 'ANA@Faro.edu.ar' })], alumna, AHORA);
  assert.equal(pasos[0].estado, 'entregada');
});

prueba('resumen: cuenta, porcentaje y próxima clase', () => {
  const r = resumir(construirRecorrido(CURSO, [entrega(1, 1), entrega(1, 2)], alumna, AHORA));
  assert.equal(r.total, 5);
  assert.equal(r.entregadas, 2);
  assert.equal(r.disponibles, 1);
  assert.equal(r.porcentaje, 40);
  assert.equal(r.siguiente?.clase.week, 3);
});

prueba('resumen sin clases: 0 de 0 y 0%, no "0 de 1"', () => {
  const r = resumir(construirRecorrido([], [], alumna, AHORA));
  assert.deepEqual([r.total, r.entregadas, r.porcentaje, r.siguiente], [0, 0, 0, null]);
});

prueba('agrupa por módulo en orden', () => {
  const grupos = agruparPorModulo(construirRecorrido(CURSO, [], alumna, AHORA));
  assert.deepEqual(grupos.map((g) => [g.modulo, g.pasos.length]), [[1, 4], [2, 1]]);
});

// ── Avance calculado para el staff ──────────────────────────────
const alumno = (email: string, school: string, level = 0): Student => ({
  name: email, email, initials: 'XX', level, school, progress: 99, total: 99, status: 'warn',
});

prueba('el avance sale de clases y entregas, no del valor guardado', () => {
  const [s] = calcularProgresos([alumno(ANA, COLE)], CURSO, [entrega(1, 1), entrega(1, 2)], AHORA);
  assert.deepEqual([s.progress, s.total, s.status], [2, 5, 'ok']);
  assert.equal(porcentajeDe(s), 40);
});

prueba('una entrega de otro nivel no suma avance en éste', () => {
  const [s] = calcularProgresos([alumno(ANA, COLE)], CURSO, [entrega(1, 1, { classLevel: 2 })], AHORA);
  assert.equal(s.progress, 0);
});

prueba('"demorado" sólo si debe una clase con el plazo vencido', () => {
  const curso = [clase(1, 1, { deadline: '2026-11-01T23:59' }), clase(1, 2)];
  const [debe] = calcularProgresos([alumno(ANA, COLE)], curso, [], AHORA);
  const [alDia] = calcularProgresos([alumno(ANA, COLE)], curso, [entrega(1, 1)], AHORA);
  assert.equal(debe.status, 'warn');
  assert.equal(alDia.status, 'ok');
});

prueba('un alumno cuyo colegio no tiene clases cargadas queda en 0 de 0 sin romper nada', () => {
  const [s] = calcularProgresos([alumno('b@x.com', 'Global School')], CURSO, [], AHORA);
  assert.deepEqual([s.progress, s.total, s.status, porcentajeDe(s)], [0, 0, 'ok', 0]);
});

// ── Métricas ────────────────────────────────────────────────────
prueba('métricas: sin plazos vencidos no inventa un 100%', () => {
  const st = calcularProgresos([alumno(ANA, COLE)], CURSO, [], AHORA);
  const m = calcularMetricas(st, CURSO, [], [COLE, 'Faro Escobar'], AHORA);
  assert.equal(m.esperadas, 0);
  assert.equal(m.pctATiempo, null);
  assert.equal(m.pctEntregadas, null);
  assert.equal(m.colegiosConAlumnos, 1);
  assert.equal(m.porColegio[1].progresoPromedio, null, 'colegio sin alumnos: sin promedio');
});

prueba('métricas: sin alumnos, cero colegios activos (no los seis del convenio)', () => {
  const m = calcularMetricas([], CURSO, [], [COLE], AHORA);
  assert.equal(m.colegiosConAlumnos, 0);
  assert.equal(m.progresoPromedio, null);
});

prueba('métricas: distingue entregado a tiempo de entregado tarde', () => {
  const curso = [clase(1, 1, { deadline: '2026-10-15T23:59' }), clase(1, 2, { deadline: '2026-10-25T23:59' })];
  const entregas = [
    entrega(1, 1, { submittedAt: '2026-10-10T10:00' }), // a tiempo
    entrega(1, 2, { submittedAt: '2026-10-30T10:00' }), // tarde
  ];
  const st = calcularProgresos([alumno(ANA, COLE), alumno('b@faro.edu.ar', COLE)], curso, entregas, AHORA);
  const m = calcularMetricas(st, curso, entregas, [COLE], AHORA);
  assert.equal(m.esperadas, 4);
  assert.equal(m.entregadas, 2);
  assert.equal(m.aTiempo, 1);
  assert.equal(m.pctEntregadas, 50);
  assert.equal(m.pctATiempo, 25);
});

// ── Alcance de un borrado ───────────────────────────────────────
prueba('borrar una plantilla se lleva sus copias y las entregas de ESA clase, no de otro módulo', () => {
  const plantilla = clase(1, 1, { school: undefined, isSyllabus: true });
  const classes = [
    plantilla,
    clase(1, 1),                               // copia en Faro Benavidez
    clase(1, 1, { school: 'Faro Escobar' }),   // copia en otro colegio
    clase(3, 1),                               // misma "clase 1", otro módulo: no se toca
  ];
  const submissions = [entrega(1, 1), entrega(undefined, 1, { studentEmail: 'viejo@faro.edu.ar' }), entrega(3, 1)];
  const r = alcanceDeBorrado(plantilla, { classes, submissions, students: [] });
  assert.equal(r.copias.length, 2);
  assert.deepEqual(r.colegios.sort(), ['Faro Benavidez', 'Faro Escobar']);
  assert.equal(r.entregas.length, 2, 'la del módulo 1 y la vieja sin módulo; la del módulo 3 queda');
});

prueba('borrar la clase 1 del módulo 3 no arrastra una entrega vieja sin módulo', () => {
  const plantilla = clase(3, 1, { school: undefined, isSyllabus: true });
  const r = alcanceDeBorrado(plantilla, { classes: [plantilla], submissions: [entrega(undefined, 1)], students: [] });
  assert.equal(r.entregas.length, 0);
});

prueba('borrar la copia de un colegio no toca las entregas de otro colegio', () => {
  const copia = clase(1, 1);
  const submissions = [
    entrega(1, 1, { school: COLE }),
    entrega(1, 1, { studentEmail: 'b@escobar.edu.ar', school: 'Faro Escobar' }),
    entrega(1, 1, { studentEmail: 'viejo@faro.edu.ar' }), // sin colegio: se resuelve por el alumno
  ];
  const students = [alumno('viejo@faro.edu.ar', COLE)];
  const r = alcanceDeBorrado(copia, { classes: [copia], submissions, students });
  assert.equal(r.copias.length, 0);
  assert.deepEqual(r.entregas.map((e) => e.studentEmail).sort(), [ANA, 'viejo@faro.edu.ar'].sort());
});

// ── Contenido ───────────────────────────────────────────────────
prueba('títulos, párrafos y saltos de línea', () => {
  assert.equal(
    textoAHtml('### Ahorro\n\nPrimera línea\nsegunda línea\n\nOtro párrafo'),
    '<h3>Ahorro</h3><p>Primera línea<br>segunda línea</p><p>Otro párrafo</p>'
  );
});

prueba('la última viñeta se convierte aunque el texto no termine en salto de línea', () => {
  assert.equal(textoAHtml('* uno\n* dos'), '<ul><li>uno</li><li>dos</li></ul>');
});

prueba('una lista al principio queda dentro de su <ul>', () => {
  assert.equal(textoAHtml('* a\n* b\n\nTexto'), '<ul><li>a</li><li>b</li></ul><p>Texto</p>');
});

prueba('negrita, itálica y separador se convierten', () => {
  assert.equal(
    textoAHtml('Esto es **clave** y *esto* también\n\n---\n\nFin'),
    '<p>Esto es <strong>clave</strong> y <em>esto</em> también</p><hr><p>Fin</p>'
  );
});

prueba('una cuenta con asteriscos no se vuelve itálica', () => {
  assert.equal(textoAHtml('2 * 3 * 4 = 24'), '<p>2 * 3 * 4 = 24</p>');
  assert.equal(textoAHtml('$100*1.5*2'), '<p>$100*1.5*2</p>');
});

prueba('el HTML pegado a mano pasa sin envolver ni romperse', () => {
  assert.equal(
    textoAHtml('<img src="https://x.com/a.png" alt="a">\n\nMirá <a href="https://x.com">esto</a>'),
    '<img src="https://x.com/a.png" alt="a"><p>Mirá <a href="https://x.com">esto</a></p>'
  );
});

prueba('ida y vuelta estable: guardar, abrir y volver a guardar no cambia nada', () => {
  const texto = '## Título\n\nUn párrafo con **negrita**\ny otra línea\n\n* uno\n* dos con *itálica*\n\n---\n\n### Cierre\n\nFin';
  const html = textoAHtml(texto);
  assert.equal(htmlATexto(html), texto);
  assert.equal(textoAHtml(htmlATexto(html)), html);
});

prueba('abre el formato viejo con <li> sueltos y lo deja bien armado', () => {
  const viejo = '<h3>1. Funciones</h3><p>El dinero sirve para:</p><li>Medio de cambio</li><li>Unidad de cuenta</li><p>Fin</p>';
  const texto = htmlATexto(viejo);
  assert.equal(texto, '### 1. Funciones\n\nEl dinero sirve para:\n\n* Medio de cambio\n* Unidad de cuenta\n\nFin');
  assert.equal(
    textoAHtml(texto),
    '<h3>1. Funciones</h3><p>El dinero sirve para:</p><ul><li>Medio de cambio</li><li>Unidad de cuenta</li></ul><p>Fin</p>'
  );
});

prueba('repara la viñeta que la versión anterior dejaba a medio convertir', () => {
  const roto = '<ul><li>50% Necesidades</li>* 30% Deseos</ul>';
  assert.equal(textoAHtml(htmlATexto(roto)), '<ul><li>50% Necesidades</li><li>30% Deseos</li></ul>');
});

prueba('un párrafo que empieza con "1." sigue siendo un párrafo', () => {
  // Convertirlo en lista numerada renumeraría contenido ya publicado.
  assert.equal(textoAHtml('2. Segundo concepto'), '<p>2. Segundo concepto</p>');
});

prueba('las listas numeradas pegadas como HTML sobreviven a la ida y vuelta', () => {
  const html = '<p>Pasos:</p><ol><li>Uno</li><li>Dos</li></ol>';
  assert.equal(textoAHtml(htmlATexto(html)), html);
});

prueba('texto vacío', () => {
  assert.equal(textoAHtml(''), '');
  assert.equal(textoAHtml('   \n\n  '), '');
  assert.equal(htmlATexto(''), '');
  assert.equal(tieneTexto('<p> </p><br>'), false);
  assert.equal(tieneTexto('<p>hola</p>'), true);
  assert.equal(contarPalabras('  uno  dos\ntres '), 3);
  assert.equal(contarPalabras(''), 0);
});

// ── Embeds ──────────────────────────────────────────────────────
prueba('reconoce todas las formas de enlace de YouTube', () => {
  for (const url of [
    'dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=10s',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  ]) assert.equal(idDeYoutube(url), 'dQw4w9WgXcQ', url);
  assert.equal(idDeYoutube('https://vimeo.com/123'), '');
  assert.equal(idDeYoutube(''), '');
});

prueba('el reproductor usa el dominio sin cookies', () => {
  assert.equal(urlDeYoutube('dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
  assert.equal(urlDeYoutube(''), '');
  assert.equal(urlDeYoutube(undefined), '');
});

prueba('extrae el src de un iframe pegado, con comillas rectas o tipográficas', () => {
  assert.equal(urlDeEmbed('<iframe src="https://gamma.app/embed/abc" style="x"></iframe>'), 'https://gamma.app/embed/abc');
  assert.equal(urlDeEmbed('<iframe src=“https://gamma.app/embed/abc” allow></iframe>'), 'https://gamma.app/embed/abc');
  assert.equal(urlDeEmbed('  https://docs.google.com/presentation/d/e/x/embed  '), 'https://docs.google.com/presentation/d/e/x/embed');
});

prueba('descarta todo lo que no sea https', () => {
  assert.equal(urlDeEmbed('javascript:alert(document.cookie)'), '');
  assert.equal(urlDeEmbed('<iframe src="javascript:alert(1)"></iframe>'), '');
  assert.equal(urlDeEmbed('http://sitio-sin-cifrar.com'), '');
  assert.equal(urlDeEmbed('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(urlDeEmbed('cualquier cosa'), '');
  assert.equal(urlDeEmbed(''), '');
});

// ── Fechas ──────────────────────────────────────────────────────
prueba('la fecha para el input es hora local, no UTC', () => {
  const d = new Date(2026, 10, 9, 15, 5); // 9 nov 2026, 15:05 hora local
  assert.equal(aInputLocal(d), '2026-11-09T15:05');
  // Ida y vuelta: lo que se guarda vuelve a ser el mismo instante.
  assert.equal(new Date(aInputLocal(d)).getTime(), d.getTime());
});

prueba('"ahora" publicado con la fecha por defecto no queda programado', () => {
  const ahora = new Date(2026, 10, 9, 15, 5, 30);
  assert.equal(todaviaNo(aInputLocal(ahora), ahora), false);
});

prueba('urgencia y vencimientos', () => {
  assert.equal(urgencia('2026-11-09T20:00', AHORA), 'Vence hoy');
  assert.equal(urgencia('2026-11-10T20:00', AHORA), 'Vence mañana');
  assert.equal(urgencia('2026-11-15T20:00', AHORA), null);
  assert.equal(urgencia('2026-11-01T20:00', AHORA), null, 'ya vencida');
  assert.equal(urgencia(undefined, AHORA), null);
  assert.equal(yaPaso('2026-11-01T20:00', AHORA), true);
  assert.equal(yaPaso('', AHORA), false);
  assert.equal(yaPaso('no es una fecha', AHORA), false);
  assert.equal(todaviaNo(undefined, AHORA), false);
});

// ── Resultado ───────────────────────────────────────────────────
if (fallas.length > 0) {
  console.error(fallas.join('\n\n'));
  console.error(`\n${fallas.length} fallaron, ${pasaron} pasaron`);
  process.exit(1);
}
console.log(`✓ ${pasaron} pruebas pasaron`);
