/* Genera el informe de la TAREA #1 en .docx */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, PageBreak, Footer, PageNumber, LevelFormat,
  TableOfContents, convertInchesToTwip, PageOrientation,
} = require("docx");

const REPO = path.resolve(__dirname, "..", "..");
const IMG = JSON.parse(fs.readFileSync(path.join(__dirname, "img.json"), "utf8"));
const W = 9026;            // ancho útil en DXA (A4 con márgenes de 1")
const AZUL = "1F3864";
const GRIS = "F2F2F5";

/* ---------------------------------------------------------------- helpers */
const P = (text, opts = {}) => new Paragraph({
  alignment: opts.align || AlignmentType.JUSTIFIED,
  spacing: { after: opts.after == null ? 140 : opts.after, line: 300 },
  indent: opts.indent,
  children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size || 22, color: opts.color })],
});

const Rich = (runs, opts = {}) => new Paragraph({
  alignment: opts.align || AlignmentType.JUSTIFIED,
  spacing: { after: opts.after == null ? 140 : opts.after, line: 300 },
  children: runs.map((r) => (typeof r === "string"
    ? new TextRun({ text: r, size: 22 })
    : new TextRun({ size: 22, ...r }))),
});

const H = (text, level) => new Paragraph({
  heading: level,
  spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 260, after: 160 },
  children: [new TextRun({ text, bold: true, color: AZUL, size: level === HeadingLevel.HEADING_1 ? 30 : level === HeadingLevel.HEADING_2 ? 26 : 23 })],
});
const H1 = (t) => H(t, HeadingLevel.HEADING_1);
const H2 = (t) => H(t, HeadingLevel.HEADING_2);
const H3 = (t) => H(t, HeadingLevel.HEADING_3);

const Li = (text, level = 0) => new Paragraph({
  numbering: { reference: "vinetas", level },
  spacing: { after: 90, line: 300 },
  children: [new TextRun({ text, size: 22 })],
});

const LiRich = (runs, level = 0) => new Paragraph({
  numbering: { reference: "vinetas", level },
  spacing: { after: 90, line: 300 },
  children: runs.map((r) => (typeof r === "string" ? new TextRun({ text: r, size: 22 }) : new TextRun({ size: 22, ...r }))),
});

function celda(text, width, opts = {}) {
  const runs = Array.isArray(text) ? text : [text];
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      spacing: { after: 0, line: 260 },
      children: runs.map((r) => (typeof r === "string"
        ? new TextRun({ text: r, bold: opts.bold, size: opts.size || 19, color: opts.color })
        : new TextRun({ size: opts.size || 19, ...r }))),
    })],
  });
}

function tabla(headers, rows, widths, opts = {}) {
  const head = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => celda(h, widths[i], { bold: true, fill: AZUL, color: "FFFFFF", size: opts.size || 19, align: opts.headAlign })),
  });
  const body = rows.map((r, idx) => new TableRow({
    children: r.map((c, i) => celda(c, widths[i], { size: opts.size || 19, fill: idx % 2 ? GRIS : undefined, align: opts.aligns && opts.aligns[i] })),
  }));
  return new Table({
    columnWidths: widths,
    width: { size: W, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "BFBFCF" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "BFBFCF" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "BFBFCF" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "BFBFCF" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "D9D9E3" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "D9D9E3" },
    },
    rows: [head, ...body],
  });
}

let nFig = 0;
function figura(archivo, pie, carpeta = "docs/graficos", maxW = 600, maxH = 760) {
  const [w, h] = IMG[archivo];
  let fw = maxW, fh = Math.round((h * maxW) / w);
  if (fh > maxH) { fh = maxH; fw = Math.round((w * maxH) / h); }
  nFig += 1;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60 },
      children: [new ImageRun({ type: "png", data: fs.readFileSync(path.join(REPO, carpeta, archivo)), transformation: { width: fw, height: fh } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: `Figura ${nFig}. ${pie}`, italics: true, size: 18, color: "595959" })],
    }),
  ];
}

const salto = () => new Paragraph({ children: [new PageBreak()] });
const espacio = (n = 1) => Array.from({ length: n }, () => new Paragraph({ spacing: { after: 0 }, children: [new TextRun("")] }));

/* ---------------------------------------------------------------- portada */
const linea = (t, opts = {}) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: opts.after == null ? 80 : opts.after },
  children: [new TextRun({ text: t, bold: opts.bold, size: opts.size || 24, color: opts.color, allCaps: opts.caps })],
});

const portada = [
  ...espacio(1),
  linea("UNIVERSIDAD ESTATAL DE MILAGRO", { bold: true, size: 30, color: AZUL }),
  linea("FACULTAD DE CIENCIAS E INGENIERÍA", { bold: true, size: 26, color: AZUL }),
  linea("CARRERA DE INGENIERÍA DE SOFTWARE", { bold: true, size: 26, color: AZUL, after: 460 }),
  linea("TEMA:", { bold: true, size: 24 }),
  linea("Avance del proyecto de desarrollo de software", { bold: true, size: 28 }),
  linea("GUIOS PRO: Sistema de evaluación para la adopción de software", { bold: true, size: 26 }),
  linea("Planificación inicial (Sprint 0)", { size: 24, after: 460 }),
  linea("AUTORES:", { bold: true }),
  linea("Freddy Bravo"),
  linea("Ariel Pesántez"),
  linea("Angie Dayanna Mendoza Barreto", { after: 240 }),
  linea("ASIGNATURA:", { bold: true }),
  linea("Procesos", { after: 240 }),
  linea("DOCENTE:", { bold: true }),
  linea("Ing. Víctor Hugo Rea Sánchez, PhD.", { after: 240 }),
  linea("METODOLOGÍA ÁGIL:", { bold: true }),
  linea("SCRUM", { after: 240 }),
  linea("FECHA DE ENTREGA:", { bold: true }),
  linea("30 de septiembre de 2026", { after: 240 }),
  linea("PERIODO:", { bold: true }),
  linea("Agosto a Diciembre 2026", { after: 460 }),
  linea("MILAGRO – ECUADOR", { bold: true, size: 24 }),
  salto(),
];

/* ---------------------------------------------------------------- índice */
const indice = [
  H1("Índice"),
  new TableOfContents("Contenido", { hyperlink: true, headingStyleRange: "1-3" }),
  P("(Para actualizar el índice en Word: clic derecho sobre él → Actualizar campos → Actualizar toda la tabla.)", { italics: true, size: 18, after: 0 }),
  salto(),
];

/* ---------------------------------------------------------------- cuerpo */
const cuerpo = [];
const add = (...xs) => xs.forEach((x) => (Array.isArray(x) ? cuerpo.push(...x) : cuerpo.push(x)));

/* 1. Introducción */
add(H1("1. Introducción"));
add(P("El presente documento constituye el avance del proyecto de desarrollo de software que se entregará como producto final del curso. El proyecto consiste en construir un sistema informático que permita evaluar cualquier solución de software que una empresa u organización pretenda implementar, y determinar si es la adecuada para su contexto."));
add(P("La propuesta se fundamenta en la tesis doctoral Factores para la adopción de soluciones basadas en software libre (Rea Sánchez, 2022), que identifica los factores que determinan la adopción de software libre y de código abierto (FLOSS) y propone GUIOS, una guía de seis pasos para orientar la decisión, junto con GUIOS PRO, una herramienta prototipo que la automatiza."));
add(P("El documento presenta la metodología ágil seleccionada, la planificación inicial del proyecto (Sprint 0) —modelado del negocio, alcance y propuesta—, la ingeniería de requisitos con el Product Backlog inicial, y el análisis y diseño con el modelo de datos y el diseño lógico y físico de la base de datos."));

/* 2. Metodología */
add(H1("2. Metodología ágil seleccionada: SCRUM"));
add(P("Para la gestión del proyecto se seleccionó SCRUM, marco de trabajo ágil basado en entregas incrementales e iterativas."));
add(H2("2.1 Justificación de la elección"));
add(P("La evaluación de la adopción de un software involucra criterios tecnológicos, organizacionales y económicos que varían según la organización y que deben validarse con el responsable del método. SCRUM resulta adecuado porque:"));
add(Li("Permite entregar incrementos funcionales cada dos semanas, de modo que el usuario puede probar la herramienta desde el primer sprint en lugar de esperar al final del curso."));
add(Li("Facilita la validación continua con el Product Owner, quien puede corregir la interpretación del modelo GUIOS antes de que el error se propague."));
add(Li("Admite cambios en el alcance sin rehacer el proyecto, algo necesario porque la propia tesis plantea extensiones que pueden priorizarse o descartarse según el avance."));
add(Li("Su cadencia de eventos (planificación, reuniones diarias, revisión y retrospectiva) impone un ritmo verificable de trabajo para un equipo con dedicación parcial."));

add(H2("2.2 Roles del equipo"));
add(tabla(
  ["Rol SCRUM", "Responsable", "Responsabilidades"],
  [
    ["Product Owner", "Docente y autor de la guía GUIOS", "Valida la interpretación del modelo, prioriza el Product Backlog y aprueba los incrementos."],
    ["Scrum Master", "Rota entre los integrantes cada sprint", "Facilita los eventos, retira impedimentos y vela por el cumplimiento de la Definición de Hecho."],
    ["Development Team", "Freddy Bravo · Ariel Pesántez · Angie Mendoza", "Construyen el incremento y se autoorganizan por áreas de trabajo."],
  ],
  [1900, 2800, 4326],
));
add(P("El trabajo se organiza en cinco áreas técnicas, distribuidas entre los integrantes del equipo:", { after: 100 }));
add(tabla(
  ["Área de trabajo", "Contenido"],
  [
    ["A · Integración e IA", "Asistente inteligente, revisión e integración del trabajo del equipo, publicación de versiones y despliegue."],
    ["B · Backend y base de datos", "API REST, modelo de datos, consultas y lógica de servidor."],
    ["C · Catálogo", "Configuración de la organización, catálogo de software candidato y administración de la guía."],
    ["D · Evaluación", "Las pantallas de los tres pasos, historial, detalle y sincronización."],
    ["E · Dashboard y reportes", "Panel de indicadores, gráficos, informes y comparador de candidatos."],
  ],
  [2600, 6426],
));

add(H2("2.3 Eventos y artefactos"));
add(tabla(
  ["Evento", "Frecuencia", "Duración", "Propósito"],
  [
    ["Sprint Planning", "Inicio de cada sprint", "1 h 30", "Seleccionar las historias del sprint y desglosarlas en tareas."],
    ["Daily Scrum", "Diaria (asíncrona si es necesario)", "15 min", "Sincronizar avance e identificar impedimentos."],
    ["Refinamiento", "Mitad del sprint", "1 h", "Detallar y estimar las historias de los siguientes sprints."],
    ["Sprint Review", "Cierre del sprint", "1 h", "Demostrar el incremento al Product Owner y recoger retroalimentación."],
    ["Retrospectiva", "Cierre del sprint", "45 min", "Acordar mejoras en la forma de trabajo."],
  ],
  [1900, 2200, 1100, 3826],
));
add(P("Los artefactos utilizados son el Product Backlog (sección 5), el Sprint Backlog gestionado en un tablero digital y el Incremento, que en cada sprint corresponde a una versión ejecutable de la aplicación.", { after: 100 }));

add(H2("2.4 Planificación de sprints"));
add(tabla(
  ["Sprint", "Fechas", "Objetivo", "Entregable"],
  [
    ["0", "08 – 21/09/2026", "Cimentación: análisis, diseño y primera versión funcional", "Aplicación con los tres pasos e informe de avance"],
    ["1", "22/09 – 05/10/2026", "Dashboard, configuración y mejoras de la evaluación", "Versión 1.1 publicada"],
    ["2", "06 – 19/10/2026", "Catálogo de software, API, gráficos e informe", "Versión 1.2 con servidor"],
    ["3", "20/10 – 02/11/2026", "Historial, administración de la guía y asistente de IA", "Versión 2.0"],
    ["4", "03 – 16/11/2026", "Comparador, indicadores reales y resumen ejecutivo", "Versión 2.1"],
    ["5", "17 – 30/11/2026", "Pulido, pruebas de regresión y documentación", "Versión final y manuales"],
  ],
  [800, 2100, 3400, 2726],
));
add(figura("09-cronograma.png", "Cronograma de sprints del proyecto.", "docs/graficos", 600));

/* 3. Modelado del negocio */
add(salto(), H1("3. Modelado del negocio"));
add(H2("3.1 ¿Cómo trabaja actualmente el negocio?"));
add(P("El negocio que se modela no es una empresa en particular, sino el proceso de adopción y selección de software libre dentro de las organizaciones públicas y privadas, tal como lo describe la tesis doctoral de referencia. En el caso ecuatoriano este proceso está impulsado por un marco normativo: el Decreto Presidencial No. 1014 del 10 de abril de 2008 y su continuidad a través del Código Orgánico de Economía Social de los Conocimientos, Creatividad e Innovación, que han llevado a un 64 % de implantación de software libre en los servicios estatales y a un 43 % de software libre de escritorio en los equipos de los servidores públicos (Rea Sánchez, 2022)."));
add(P("Pese a ese impulso normativo, la evaluación previa a la adopción se realiza hoy de manera informal y no estandarizada, siguiendo seis pasos:", { after: 100 }));
add(LiRich([{ text: "Detección de la necesidad. ", bold: true }, "El área de TI identifica un requerimiento (una suite ofimática, un entorno virtual de aprendizaje, un ERP, un gestor de base de datos) o recibe una disposición institucional de migrar a software libre."]));
add(LiRich([{ text: "Búsqueda y preselección empírica de alternativas. ", bold: true }, "El responsable de TI revisa las opciones disponibles apoyándose en su experiencia previa, en recomendaciones de colegas y en información dispersa de internet. No se aplica una metodología formal de evaluación."]));
add(LiRich([{ text: "Procedimiento personalizado en cada organización. ", bold: true }, "Los procedimientos de adopción se desarrollan de manera ad-hoc en cada entidad, lo que genera continuas situaciones de reinvención de la rueda, pues no se aprovechan metodologías ni experiencias previas de otras instituciones."]));
add(LiRich([{ text: "Evaluación manual y no integrada. ", bold: true }, "Cuando existe algún intento de valoración estructurada, esta se hace codificando las valoraciones en una hoja de cálculo. No existe un instrumento único que integre y pondere de manera simultánea los aspectos tecnológicos, organizacionales y económicos, ni que traduzca esas valoraciones en un diagnóstico comparable entre factores."]));
add(LiRich([{ text: "Decisión y aprobación. ", bold: true }, "El criterio final queda concentrado en el responsable del área de TI, quien eleva la propuesta a la alta dirección para la asignación de recursos. La decisión depende en gran medida de su juicio subjetivo, al no contar con directrices bien definidas."]));
add(LiRich([{ text: "Implantación y aparición tardía de problemas. ", bold: true }, "Las consecuencias de una selección inadecuada se descubren durante o después de la implantación: imposibilidad de importar los ficheros de datos existentes, escasez de documentación para los usuarios, aparición de costos ocultos y resistencia al cambio por parte del personal."]));
add(figura("01-proceso-actual.png", "Proceso actual de adopción de software (AS-IS) y momento en que aparecen los problemas.", "docs/graficos", 540));

add(H3("Caso de referencia: Universidad Estatal de Milagro"));
add(P("La tesis toma como contexto de validación a la Universidad Estatal de Milagro, institución pública con 4 facultades, 21 carreras presenciales, 3 semipresenciales y 10 en línea, 242 docentes titulares y 36 604 estudiantes. Su estructura tecnológica está conformada por el Departamento de TICs —subdividido en gestión de desarrollo de sistemas de información, gestión de infraestructura tecnológica y gestión de operaciones— y por la Dirección de Servicios Informáticos, dividida en gestión de soporte tecnológico, gestión de infraestructura de seguridad y gestión de seguridad de la información."));
add(P("Este departamento ya ha desarrollado un sistema FLOSS de gestión académica (matrículas, reportes y gestión docente) e implantado Moodle como entorno virtual de aprendizaje, y evalúa alternativas como LibreOffice, ya que las suites de pago no se alinean a las políticas institucionales que promueven el uso de FLOSS. Es decir: la organización adopta software libre de forma sostenida, pero sin un proceso formal y repetible que respalde cada decisión."));

add(H2("3.2 ¿Quiénes participan?"));
add(P("En el proceso actual de adopción intervienen los siguientes actores, identificados a partir del modelo GUIOS y del piloto de caso de estudio de la tesis:", { after: 100 }));
add(tabla(
  ["Actor", "Rol en el proceso actual"],
  [
    ["Responsable o Director del área de TI (decisor)", "Actor principal. Define qué factores son relevantes, evalúa los subfactores y asume la responsabilidad de la decisión de adoptar o no el software. En el piloto de la tesis este rol lo ocupó la Directora de TICs de la UNEMI, profesional con grado en Ingeniería en Sistemas Computacionales, Magíster en Gestión y Diseño Web, certificaciones COBIT 5 Foundation, ITIL Foundation y Scrum Master, y 15 años de experiencia laboral."],
    ["Equipo técnico de TI", "Personal de desarrollo de sistemas, infraestructura tecnológica, operaciones, soporte tecnológico y seguridad de la información. Aporta la información técnica sobre compatibilidad, portabilidad, despliegue, pruebas y capacidad de personalización."],
    ["Alta dirección y autoridades institucionales", "Aprueban presupuesto, recursos e infraestructura. Su respaldo es uno de los factores organizacionales determinantes: en la evaluación de LibreOffice, el apoyo de la alta dirección fue clasificado como fortaleza."],
    ["Usuarios finales", "Docentes, estudiantes y personal administrativo que usarán la herramienta. Su actitud hacia el cambio y sus necesidades de formación condicionan directamente el éxito de la adopción."],
    ["Expertos FLOSS y consultores externos", "Profesionales TIC de Ecuador y Europa consultados mediante encuesta para ponderar la importancia de los subfactores. Su distribución fue: 77,2 % del sector público, 15,8 % del sector privado y 3,5 % independientes; el 47,4 % con más de 10 años de experiencia en FLOSS, el 28,1 % entre 6 y 10 años y el 24,6 % entre 1 y 5 años."],
    ["Comunidad y proveedores del software", "Sostienen la documentación, el soporte y la evolución del producto. Son fuente de riesgo cuando existe bloqueo de proveedores, documentación insuficiente o soporte débil, factores clasificados como amenazas y debilidades en el caso evaluado."],
  ],
  [2500, 6526],
));

add(H2("3.3 ¿Qué problemas existen?"));
add(P("La investigación identifica varios obstáculos y riesgos en el panorama actual de la adopción de tecnologías de código abierto:", { after: 100 }));
add(LiRich([{ text: "Ausencia de directrices estandarizadas. ", bold: true }, "Existe una falta de directrices bien definidas para los responsables de las áreas de tecnología de la información. Esta carencia puede poner en peligro todo el proceso de adopción."]));
add(LiRich([{ text: "Procesos aislados y redundantes. ", bold: true }, "Los procedimientos de adopción suelen desarrollarse de manera completamente personalizada en cada organización, lo que impide aprovechar metodologías o experiencias previas."]));
add(LiRich([{ text: "Selección empírica del software. ", bold: true }, "La adopción se realiza de manera rápida y sin seguir metodologías formales, con el riesgo de escoger un software que no se alinee con las verdaderas necesidades de la organización."]));
add(LiRich([{ text: "Riesgos operativos y organizacionales. ", bold: true }, "La falta de un proceso formal introduce amenazas críticas: imposibilidad de importar los ficheros de datos existentes, escasez de documentación para los usuarios, aparición de costos ocultos y fuerte resistencia al cambio por parte del personal."]));
add(LiRich([{ text: "Ausencia de trazabilidad. ", bold: true }, "No se conserva registro de qué se evaluó, quién lo evaluó ni con qué resultado, de modo que cada nueva decisión parte de cero y no puede compararse con las anteriores."]));

add(H2("3.4 ¿Qué procesos se automatizarán? Alcance inicial"));
add(P("Para dar solución a los problemas planteados, el proyecto automatiza el proceso de evaluación mediante una herramienta tecnológica que implementa los seis pasos de la guía GUIOS:", { after: 100 }));
add(LiRich([{ text: "Automatización metodológica. ", bold: true }, "El proceso principal a automatizar comprende los pasos de evaluación establecidos en la guía de adopción, materializados en la aplicación multiplataforma GUIOS PRO."]));
add(LiRich([{ text: "Asistencia interactiva para TI. ", bold: true }, "La funcionalidad central es asistir y orientar a los responsables de TIC para que evalúen el software que planean adoptar de manera ágil y sencilla."]));
add(LiRich([{ text: "Evaluación multidimensional parametrizada. ", bold: true }, "El sistema automatiza la evaluación de un conjunto estructurado de dimensiones, factores y subfactores clasificados en tres ejes —tecnológico, organizacional y económico— y los valora mediante indicadores de medición específicos."]));
add(LiRich([{ text: "Análisis del entorno institucional. ", bold: true }, "El proceso integra la evaluación de las capacidades de la propia entidad adoptante, analizando los factores internos y externos bajo un enfoque de matriz FODA."]));
add(LiRich([{ text: "Generación de recomendaciones automatizadas. ", bold: true }, "El sistema procesa todas las valoraciones ingresadas y ofrece tres recomendaciones generales que sirven de apoyo directo a la toma de decisiones sobre la idoneidad del software."]));
add(figura("03-pasos-guios.png", "Los seis pasos de GUIOS y su agrupación en las tres pantallas de la aplicación.", "docs/graficos", 430));

add(H3("Estructura del modelo de evaluación"));
add(Rich(["La revisión sistemática de la literatura realizada en la tesis identificó ", { text: "22 factores", bold: true }, " agrupados en tres dimensiones. De ellos, ", { text: "18 conforman la guía GUIOS", bold: true }, ", ya que se excluyeron cuatro factores al no identificarse ningún subfactor que los midiera: reingeniería de procesos empresariales, coste de licencia, coste operacional y coste de soporte; estos tres últimos quedaron integrados dentro del factor coste total de propiedad. Los 18 factores se desglosan en ", { text: "61 subfactores", bold: true }, " evaluables."]));
add(tabla(
  ["Dimensión", "Factores", "Subf."],
  [
    ["Tecnológica (9 factores)", "Compatibilidad · Personalización · Prueba · Fiabilidad · Reusabilidad · Usabilidad · Mantenibilidad · Portabilidad · Documentación", "40"],
    ["Organizacional (8 factores)", "Formación · Tiempo de adopción · Casos de estudio de adopción FLOSS · Centralidad de la tecnología de la información · Apoyo de la alta dirección · Bloqueo de proveedores · Soporte · Actitud hacia el cambio", "19"],
    ["Económica (1 factor)", "Coste total de propiedad", "2"],
  ],
  [2300, 5926, 800],
  { aligns: [null, null, AlignmentType.CENTER] },
));
add(figura("04-estructura-guios.png", "Estructura del modelo de evaluación: dimensiones, factores y subfactores.", "docs/graficos", 600));

add(H2("3.5 ¿Cómo mejorará el nuevo sistema? Propuesta"));
add(P("Basado en el marco conceptual y los hallazgos de la tesis doctoral de referencia, el nuevo sistema automatiza el proceso de evaluación mediante la implementación del modelo GUIOS. El sistema ofrece una evaluación multidimensional considerando tres dimensiones clave —tecnológica, organizacional y económica—, desglosadas en 18 factores y 61 subfactores con sus indicadores de importancia. Al finalizar la carga y ponderación de datos, el sistema ejecuta un análisis bajo un enfoque matricial (FODA) y genera un diagnóstico automatizado con una de estas tres recomendaciones:"));
add(tabla(
  ["Código", "Recomendación", "Cuándo se emite"],
  [
    ["A", "No es posible adoptar", "Se detectaron amenazas o debilidades en factores cuya importancia relativa es Importante o Fundamental. Es indispensable revisar los subfactores que no cumplen el mínimo requerido y destinar recursos para mitigarlos."],
    ["B", "Es posible adoptar con reservas", "Las amenazas o debilidades se concentran en factores de importancia Opcional. Se sugiere revisar los criterios que no cumplen lo mínimo requerido antes de adoptar."],
    ["C", "Adoptar", "Todos los factores evaluados resultaron Fortalezas u Oportunidades: la organización cumple satisfactoriamente los requisitos para adoptar la solución."],
  ],
  [900, 2600, 5526],
  { aligns: [AlignmentType.CENTER] },
));
add(P("La mejora se produce en cinco frentes, resumidos en la figura siguiente:", { after: 100 }));
add(tabla(
  ["Situación actual (AS-IS)", "Con GUIOS PRO (TO-BE)"],
  [
    ["Selección empírica, sin criterios comunes", "Guía sistemática de tres pasos con 18 factores y 61 subfactores"],
    ["Valoración manual en hoja de cálculo", "Cálculo automático de la importancia relativa y de la ponderación"],
    ["Decisión basada en criterio subjetivo", "Clasificación FODA y recomendación fundamentada A, B o C"],
    ["Sin historial ni trazabilidad", "Catálogo de software, historial de evaluaciones y comparación de candidatos"],
    ["Problemas descubiertos tras implantar", "Riesgos identificados antes de tomar la decisión"],
    ["Herramienta de escritorio que exige instalación", "Aplicación web portable que se abre con doble clic y puede publicarse"],
  ],
  [4200, 4826],
));
add(figura("02-propuesta-to-be.png", "Comparación entre el proceso actual y el propuesto.", "docs/graficos", 520));

/* 4. Alcance */
add(salto(), H1("4. Alcance del proyecto"));
add(H2("4.1 Objetivo"));
add(P("Construir un sistema informático que automatice la guía GUIOS para evaluar si una solución de software es adecuada para una organización, sustituyendo el proceso empírico actual por una evaluación sistemática, trazable y repetible que concluya en una recomendación fundamentada."));

add(H2("4.2 Alcance funcional"));
add(tabla(
  ["Módulo", "Funcionalidad incluida"],
  [
    ["M1 · Configuración", "Registrar los datos de la organización (nombre, sector, evaluador por defecto) y las preferencias de la aplicación."],
    ["M2 · Catálogo de software", "Registrar, editar, etiquetar y consultar los softwares candidatos (nombre, versión, tipo de licencia, proveedor, notas) y su ficha con las evaluaciones asociadas."],
    ["M3 · Evaluación", "Paso 1 (Importancia): asignar la importancia del decisor a los 18 factores, fijar el alcance de Soporte y calcular la importancia relativa. Paso 2 (Cumplimiento): valorar los 61 subfactores con ayuda contextual, buscador y avisos de pendientes. Paso 3 (Resultado): ponderación por factor, clasificación FODA y recomendación con los factores críticos señalados."],
    ["M4 · Dashboard e informes", "Panel de indicadores (evaluaciones por estado, avance, distribución FODA, cumplimiento por dimensión, línea de tiempo), gráficos de resultados e informe exportable a PDF."],
    ["M5 · Historial y comparación", "Lista de evaluaciones con filtros, detalle en modo lectura y comparador de 2 a 5 candidatos."],
    ["M6 · Administración de la guía", "Edición validada y versionada de dimensiones, factores, subfactores y reglas, y plantillas de importancia reutilizables."],
    ["M7 · Asistente de IA", "Sugerencia de valoración por subfactor (valor, justificación y nivel de confianza) que el evaluador acepta o descarta, y redacción del resumen ejecutivo. La IA nunca decide: la recomendación siempre proviene del cálculo de GUIOS."],
    ["M8 · Portabilidad de datos", "Exportar e importar evaluaciones, softwares y plantillas en formato JSON; funcionamiento sin servidor mediante almacenamiento local del navegador."],
  ],
  [2300, 6726],
));

add(H2("4.3 Fuera del alcance"));
add(Li("Cuentas de usuario, inicio de sesión y permisos por rol. La organización y el evaluador se registran como datos de la evaluación. Es una de las extensiones que plantea la tesis; se excluye de este curso por tiempo y para evitar el almacenamiento de credenciales."));
add(Li("Evaluación colaborativa simultánea entre varios decisores con mecanismo de consenso."));
add(Li("Métricas alternativas de decisión, como el análisis multicriterio o la eficiencia de Pareto. El motor de cálculo queda aislado para poder incorporarlas más adelante."));
add(Li("Integración con sistemas externos de la organización (inventario de TI, compras o ERP institucional)."));
add(Li("Puesta en producción en la infraestructura de una institución real; el despliegue previsto es de demostración."));
add(Li("Aplicaciones móviles nativas: la aplicación web es adaptable a móvil, pero no se empaqueta para tiendas."));

add(H2("4.4 Supuestos y restricciones"));
add(tabla(
  ["Tipo", "Enunciado"],
  [
    ["Supuesto", "El catálogo de la guía (3 dimensiones, 18 factores, 61 subfactores e importancias sugeridas) se toma de la tesis y se considera validado."],
    ["Supuesto", "El evaluador conoce el software candidato o puede consultar su documentación pública."],
    ["Restricción", "El entregable debe poder ejecutarse con doble clic, sin instalación ni servidor, requisito heredado del prototipo original."],
    ["Restricción", "Sin dependencias de terceros en tiempo de ejecución: HTML, CSS y JavaScript sin frameworks."],
    ["Restricción", "El proyecto se desarrolla en cinco sprints de dos semanas, del 22/09/2026 al 30/11/2026, con dedicación parcial del equipo."],
    ["Restricción", "La clave del servicio de inteligencia artificial no puede residir en el navegador, por lo que exige un componente de servidor."],
  ],
  [1400, 7626],
));

/* 5. Requisitos */
add(salto(), H1("5. Ingeniería de requisitos"));
add(H2("5.1 Requisitos funcionales"));
add(P("La prioridad se expresa como A (imprescindible), M (importante) y B (deseable). La columna Origen indica la procedencia del requisito: T = tesis doctoral, V = validación con la especialista (capítulo 6 de la tesis), E = decisión del equipo.", { size: 20, after: 120 }));
add(tabla(
  ["ID", "Requisito funcional", "Pr.", "Sprint", "Orig."],
  [
    ["RF-01", "Registrar los datos del software candidato: nombre, versión, tipo de licencia, proveedor y organización.", "A", "0 ✔", "T"],
    ["RF-02", "Presentar los 18 factores agrupados por dimensión con su importancia sugerida y permitir al decisor asignar su propia importancia en cuatro niveles.", "A", "0 ✔", "T"],
    ["RF-03", "Calcular la importancia relativa de cada factor y excluir del análisis los factores resultantes Irrelevantes.", "A", "0 ✔", "T"],
    ["RF-04", "Permitir elegir el alcance Interno o Externo de los factores cuyo alcance es Ambos (Soporte).", "A", "0 ✔", "T"],
    ["RF-05", "Permitir valorar cada subfactor de los factores relevantes en escala de cuatro niveles y calcular la ponderación media del factor.", "A", "0 ✔", "T"],
    ["RF-06", "Clasificar cada factor evaluado como Fortaleza, Oportunidad, Debilidad o Amenaza según su ponderación media y su alcance.", "A", "0 ✔", "T"],
    ["RF-07", "Emitir la recomendación A, B o C aplicando la matriz de decisión e indicar los factores críticos que la determinan.", "A", "0 ✔", "T"],
    ["RF-08", "Exportar el informe de la evaluación en PDF y los datos en JSON, e importar una evaluación previa.", "M", "0 ✔", "T"],
    ["RF-09", "Guardar el avance automáticamente y permitir limpiar los datos de una evaluación anterior con confirmación.", "M", "0 ✔", "E"],
    ["RF-10", "Mostrar ayuda contextual en cada paso explicando el significado de cada nivel de las escalas.", "M", "1", "V"],
    ["RF-11", "Avisar de los factores con respuestas pendientes antes de mostrar el resultado y marcar el resultado como parcial.", "M", "1", "V"],
    ["RF-12", "Permitir buscar y filtrar factores y subfactores pendientes durante la valoración.", "M", "1", "V"],
    ["RF-13", "Ofrecer un panel de indicadores con el estado de las evaluaciones, el avance, la distribución FODA y el cumplimiento medio por dimensión.", "A", "1", "E"],
    ["RF-14", "Registrar los datos de la organización y las preferencias una sola vez y reutilizarlos en cada evaluación.", "M", "1", "E"],
    ["RF-15", "Mantener un catálogo de softwares candidatos con alta, edición, eliminación, búsqueda, etiquetas y ficha de detalle.", "A", "2", "E"],
    ["RF-16", "Persistir las evaluaciones en un servidor con sus estados (En proceso, Completada, Cancelada) y recuperarlas después.", "A", "2-3", "T"],
    ["RF-17", "Consultar el historial de evaluaciones con filtros por software, estado y fecha, y abrir el detalle de cualquiera en modo lectura.", "A", "3", "T"],
    ["RF-18", "Generar gráficos de cumplimiento por dimensión, de distribución FODA y de evolución temporal de las evaluaciones.", "M", "2-3", "E"],
    ["RF-19", "Administrar el catálogo de la guía (dimensiones, factores, subfactores y reglas) desde la interfaz, con validación y versionado.", "M", "3", "T"],
    ["RF-20", "Guardar y reutilizar plantillas de importancia de factores entre evaluaciones.", "M", "3", "E"],
    ["RF-21", "Sugerir mediante inteligencia artificial una valoración por subfactor con justificación y nivel de confianza, que el evaluador acepta o descarta individualmente.", "A", "2-3", "E"],
    ["RF-22", "Registrar la trazabilidad de las sugerencias de IA: qué propuso el modelo, qué aceptó la persona y con qué versión del prompt.", "M", "3", "E"],
    ["RF-23", "Generar un resumen ejecutivo en lenguaje natural del informe, editable antes de exportar y marcado como generado con IA.", "M", "4", "V"],
    ["RF-24", "Comparar de 2 a 5 evaluaciones en una sola vista, resaltando las diferencias por dimensión y factor.", "M", "4", "V"],
    ["RF-25", "Permitir adjuntar una observación o evidencia por subfactor y mostrarla en el informe.", "B", "4", "T"],
    ["RF-26", "Importar y exportar softwares, plantillas y evaluaciones entre instalaciones, con vista previa y resolución de duplicados.", "B", "4", "E"],
  ],
  [700, 6226, 600, 800, 700],
  { size: 18, aligns: [AlignmentType.CENTER, null, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER] },
));

add(H2("5.2 Requisitos no funcionales"));
add(tabla(
  ["ID", "Categoría", "Requisito y criterio de verificación"],
  [
    ["RNF-01", "Usabilidad", "Cualquier paso debe alcanzarse en tres clics o menos y cada pregunta se responde con un solo control, sin botón de guardar. El prototipo original requería tres clics por factor."],
    ["RNF-02", "Portabilidad", "Funciona en Chrome, Edge y Firefox actuales y se abre con doble clic desde el sistema de archivos, sin instalación ni servidor."],
    ["RNF-03", "Rendimiento", "El recálculo completo (61 subfactores, FODA y recomendación) se ejecuta en menos de 100 ms y la carga inicial obtiene una puntuación mayor o igual a 90 en Lighthouse."],
    ["RNF-04", "Accesibilidad", "Todos los controles con nombre accesible, foco visible, contraste AA en tema claro y oscuro, y navegación completa por teclado."],
    ["RNF-05", "Adaptabilidad", "La interfaz es utilizable desde 390 px de ancho sin desplazamiento horizontal."],
    ["RNF-06", "Mantenibilidad", "El catálogo vive en archivos de datos versionados y la lógica de cálculo está aislada de la interfaz y cubierta por pruebas automáticas que se ejecutan en cada cambio."],
    ["RNF-07", "Fiabilidad del cálculo", "El resultado del servidor y el del navegador deben ser idénticos para el mismo conjunto de respuestas; cualquier diferencia detiene la integración."],
    ["RNF-08", "Trazabilidad", "Cada evaluación registra evaluador, organización, fecha, versión del catálogo y, si procede, el origen de las respuestas asistidas por IA."],
    ["RNF-09", "Seguridad", "Validación de toda la entrada, protección ante inyección SQL y ataques XSS, comunicación por HTTPS y clave del servicio de IA únicamente en el servidor."],
    ["RNF-10", "Disponibilidad", "Disponibilidad objetivo del 99 % mensual en el despliegue de demostración; ante una caída del servidor la aplicación continúa funcionando en modo local."],
    ["RNF-11", "Continuidad", "La evaluación en curso no se pierde al cerrar el navegador y puede exportarse en cualquier momento."],
    ["RNF-12", "Idioma", "Interfaz, mensajes y documentación en español."],
  ],
  [900, 1700, 6426],
  { size: 18 },
));

add(H2("5.3 Reglas de negocio"));
add(tabla(
  ["ID", "Regla"],
  [
    ["RN-01", "La importancia relativa de un factor se obtiene combinando la importancia sugerida y la del decisor mediante la función IR = parte entera de (IS + ID) / 2, sobre la escala 1 Irrelevante, 2 Opcional, 3 Importante y 4 Fundamental."],
    ["RN-02", "Solo se evalúan los factores cuya importancia relativa es superior a Irrelevante."],
    ["RN-03", "La ponderación media de un factor es la media aritmética de las valoraciones de sus subfactores, en el rango de 1,0 a 4,0, y solo se calcula si todos están valorados."],
    ["RN-04", "Un factor es Fortaleza si es interno y su ponderación es mayor o igual a 3; Debilidad si es interno y menor a 3; Oportunidad si es externo y mayor o igual a 3; y Amenaza si es externo y menor a 3."],
    ["RN-05", "Soporte es el único factor cuyo alcance lo decide el evaluador; el resto tiene alcance fijo, interno o externo."],
    ["RN-06", "La recomendación se determina en orden: A si existe alguna Amenaza o Debilidad en un factor Importante o Fundamental; B si las hay solo en factores Opcionales; y C si todos los factores evaluados son Fortalezas u Oportunidades."],
    ["RN-07", "La inteligencia artificial solo propone valoraciones: ninguna sugerencia se guarda sin la aceptación explícita del evaluador y la recomendación final siempre procede del cálculo."],
    ["RN-08", "Modificar el catálogo de la guía no altera las evaluaciones ya completadas, que conservan la versión del catálogo con la que se realizaron."],
  ],
  [800, 8226],
  { size: 18, aligns: [AlignmentType.CENTER] },
));
add(figura("08-flujo-calculo.png", "Aplicación encadenada de las reglas de negocio, desde las respuestas hasta la recomendación.", "docs/graficos", 440));

/* 6. Backlog */
add(salto(), H1("6. Product Backlog inicial"));
add(P("El Product Backlog está compuesto por 36 historias de usuario agrupadas en seis épicas. La estimación se expresa en puntos de historia siguiendo una escala reducida de Fibonacci (1, 2, 3, 5, 8) y la prioridad en la misma escala que los requisitos: A imprescindible, M importante y B deseable."));

add(H2("6.1 Épicas"));
add(tabla(
  ["Épica", "Contenido", "Historias"],
  [
    ["EP-EVA · Pantallas de la evaluación", "Los tres pasos de la guía, historial, detalle y evidencias", "HU-01 a HU-07, HU-09c, HU-12, HU-16 a HU-18, HU-24, HU-35"],
    ["EP-CAT · Catálogo de software y de la guía", "Configuración, catálogo de candidatos, administración y plantillas", "HU-10, HU-15, HU-22, HU-23, HU-28, HU-33, HU-34"],
    ["EP-DASH · Dashboard, reportes y comparación", "Indicadores, gráficos, informe y comparador", "HU-11, HU-19, HU-25, HU-26, HU-29"],
    ["EP-API · Backend: API y base de datos", "Persistencia, historial, cálculo en servidor y exportación", "HU-09a, HU-09b, HU-14, HU-21, HU-31, HU-32, HU-36"],
    ["EP-IA · Asistente inteligente", "Sugerencias de valoración y resumen ejecutivo", "HU-20, HU-27, HU-30"],
    ["EP-OPS · Integración y publicación", "Revisión, integración y despliegue de versiones", "Tareas técnicas sin historias de usuario"],
  ],
  [2600, 3300, 3126],
  { size: 18 },
));

const HU_COLS = [700, 3100, 3926, 600, 700];
const HU_OPTS = { size: 18, aligns: [AlignmentType.CENTER, null, null, AlignmentType.CENTER, AlignmentType.CENTER] };
const HU_HEAD = ["ID", "Historia de usuario", "Criterios de aceptación", "Pr.", "Pts"];

add(H2("6.2 Historias de usuario del Sprint 0 (completado)"));
add(tabla(HU_HEAD, [
  ["HU-01", "Como evaluador quiero registrar el software candidato para identificar la evaluación.", "Formulario con nombre, versión, licencia, proveedor, organización y evaluador; se guarda automáticamente.", "A", "2"],
  ["HU-02", "Como decisor quiero fijar la importancia de cada factor para adaptar la guía a mi organización.", "Factores agrupados por dimensión; selector de cuatro niveles; importancia relativa calculada al instante; los irrelevantes quedan atenuados.", "A", "5"],
  ["HU-03", "Como decisor quiero indicar si el factor Soporte es interno o externo.", "Control segmentado Interno/Externo visible solo en factores con alcance Ambos.", "A", "2"],
  ["HU-04", "Como evaluador quiero valorar los subfactores de cada factor relevante.", "Lista lateral con progreso por factor; selector de cuatro niveles por subfactor; ponderación visible al completar.", "A", "5"],
  ["HU-05", "Como decisor quiero ver la matriz FODA y la recomendación para decidir.", "Cuadrantes con sus factores, tarjeta de recomendación A/B/C con los factores críticos y tabla de detalle.", "A", "8"],
  ["HU-06", "Como decisor quiero exportar el informe para presentarlo al comité.", "Exportación a PDF con cabecera del informe y a JSON; la importación restaura la evaluación.", "M", "3"],
  ["HU-07", "Como usuario quiero que mi avance no se pierda y poder empezar de cero al cambiar de proyecto.", "Estado persistido en el navegador; botón Limpiar datos con confirmación.", "M", "2"],
  ["HU-13", "Como usuario quiero una interfaz simple, con modo oscuro y navegación clara.", "Tres pasos en lenguaje llano; detalle de cálculo oculto tras Ver cálculo; botón de tema; barra lateral con los pasos como línea de tiempo.", "M", "3"],
], HU_COLS, HU_OPTS));

add(H2("6.3 Historias del Sprint 1 · Nuevas pantallas y cimientos"));
add(tabla(HU_HEAD, [
  ["HU-19", "Como decisor quiero una pantalla de inicio con el estado general de mis evaluaciones para saber de un vistazo en qué punto estoy.", "Dashboard con evaluaciones y su estado, avance de la evaluación en curso, distribución FODA, cumplimiento por dimensión y accesos directos; estado vacío cuando no hay ninguna.", "A", "8"],
  ["HU-15", "Como usuario quiero guardar los datos de mi organización una sola vez para no repetirlos.", "Pantalla de configuración con nombre, sector, logo, evaluador por defecto y tema; aviso al salir sin guardar; los datos se reutilizan al crear una evaluación.", "A", "5"],
  ["HU-16", "Como evaluador quiero entender qué significa cada nivel de la escala para responder con criterio.", "Ayuda breve plegable en cada paso; el paso 2 explica los cuatro niveles; los textos provienen de los datos maestros.", "A", "3"],
  ["HU-17", "Como evaluador quiero que el sistema me avise si dejo factores sin responder.", "Aviso con la lista de pendientes y enlace directo a cada uno; el resultado se marca como parcial.", "A", "3"],
  ["HU-18", "Como evaluador quiero buscar un factor y filtrar los pendientes para avanzar más rápido.", "Búsqueda por nombre de factor o texto del subfactor, filtro de solo pendientes y contador; funciona con teclado y en móvil.", "M", "5"],
  ["HU-14", "Como desarrollador del frontend quiero obtener el catálogo desde la API para no depender del archivo generado.", "Consulta de dimensiones, factores y subfactores con sus escalas; misma estructura que los datos locales; documentado en OpenAPI.", "M", "3"],
], HU_COLS, HU_OPTS));

add(H2("6.4 Historias del Sprint 2 · Catálogo, API y primer servicio de IA"));
add(tabla(HU_HEAD, [
  ["HU-22", "Como evaluador quiero registrar en un solo lugar los softwares que evalúo.", "Lista con buscador y filtro por licencia; alta, edición y eliminación con confirmación; al crear una evaluación se elige del catálogo; estado vacío con acción de alta.", "A", "8"],
  ["HU-23", "Como evaluador quiero ver la ficha de un software con sus datos y sus evaluaciones.", "Vista de detalle con datos, historial de evaluaciones y su recomendación, y accesos a evaluar o editar.", "M", "2"],
  ["HU-24", "Como evaluador quiero ver todas mis evaluaciones en una lista.", "Lista con software, fecha, estado, avance y recomendación; continuar, duplicar y eliminar con confirmación; buscador y estado vacío.", "A", "5"],
  ["HU-09a", "Como evaluador quiero que mi evaluación se guarde en el servidor.", "Crear evaluación, guardar importancia y alcance por factor, guardar valoración por subfactor y completar; escrituras idempotentes; tres estados.", "A", "8"],
  ["HU-21", "Como evaluador quiero registrar y consultar los softwares candidatos desde el servidor.", "Alta, listado, edición y borrado con validación; filtrado por organización; documentado y con pruebas de los casos de error.", "A", "5"],
  ["HU-25", "Como decisor quiero gráficos que resuman el cumplimiento por dimensión y la matriz FODA.", "Gráfico radar por dimensión y barras FODA legibles en tema claro, oscuro e impresión, con tabla equivalente para lectores de pantalla.", "M", "5"],
  ["HU-26", "Como decisor quiero una vista de informe completa para presentarla al comité.", "Informe con portada, datos del software, recomendación, FODA, gráficos y detalle; exportable a PDF sin cortes y en un máximo de tres páginas.", "M", "5"],
  ["HU-20", "Como evaluador quiero que el sistema me proponga una valoración para cada subfactor.", "Servicio que devuelve valor de 1 a 4, justificación y confianza por subfactor; validación estricta de la respuesta; nada se guarda sin aceptación.", "A", "8"],
], HU_COLS, HU_OPTS));

add(H2("6.5 Historias del Sprint 3 · Evaluaciones guardadas y asistente"));
add(tabla(HU_HEAD, [
  ["HU-09b", "Como decisor quiero consultar las evaluaciones anteriores y abrir cualquiera.", "Listado paginado con filtros por software, estado y fecha, y detalle con todas las respuestas; incluye recomendación y conteos FODA.", "A", "5"],
  ["HU-09c", "Como decisor quiero ver y reabrir desde el servidor las evaluaciones guardadas.", "Sección Historial con lista, filtros, estado y recomendación; al abrir una evaluación se restauran los tres pasos.", "A", "5"],
  ["HU-10", "Como responsable del método quiero editar factores, subfactores y reglas sin tocar archivos.", "Edición validada de escalas, alcance e importancia sugerida; cambios versionados que no alteran evaluaciones completadas; restauración del catálogo original.", "M", "5"],
  ["HU-28", "Como decisor quiero guardar la importancia asignada y reutilizarla en próximas evaluaciones.", "Guardar el paso 1 como plantilla con nombre; aplicarla al empezar; editar y eliminar; se indica la plantilla aplicada.", "M", "5"],
  ["HU-29", "Como decisor quiero ver la evolución de mis evaluaciones en el tiempo.", "Línea de tiempo por fecha con su recomendación, filtrable por software; al pulsar se abre el informe; estado vacío con menos de dos evaluaciones.", "M", "5"],
  ["HU-27", "Como evaluador quiero ver las sugerencias de la IA junto a cada pregunta y aceptarlas o descartarlas.", "Botón Sugerir por factor; cada sugerencia muestra valor, justificación y confianza; aceptar rellena el control y marca el origen; descartar no deja rastro.", "A", "8"],
], HU_COLS, HU_OPTS));

add(H2("6.6 Historias del Sprint 4 · Comparación y dashboard con datos reales"));
add(tabla(HU_HEAD, [
  ["HU-11", "Como decisor quiero comparar varios softwares evaluados en una sola pantalla.", "Selección de 2 a 5 evaluaciones; tabla comparativa por dimensión y factor; diferencias resaltadas; gráfico comparativo; exportable a PDF.", "A", "8"],
  ["HU-35", "Como decisor quiero abrir una evaluación anterior en modo lectura con todo su detalle.", "Vista de solo lectura con respuestas, clasificación FODA, evaluador y fecha; acciones duplicar, continuar y abrir informe.", "M", "5"],
  ["HU-12", "Como evaluador quiero justificar mis respuestas con una nota o un enlace.", "Observación opcional por subfactor, guardada y visible en el informe y en el detalle; no entorpece el flujo de respuesta.", "B", "5"],
  ["HU-31", "Como decisor quiero que el dashboard muestre datos reales de toda la organización.", "Indicadores de evaluaciones por estado, recomendaciones emitidas, cumplimiento por dimensión y últimas evaluaciones; respuesta por debajo de 300 ms.", "A", "5"],
  ["HU-32", "Como decisor quiero comparar varias evaluaciones desde el servidor.", "Acepta de 2 a 5 evaluaciones y devuelve resultados por dimensión, factor y FODA en una estructura comparable.", "A", "5"],
  ["HU-33", "Como responsable quiero mover mis datos entre equipos o instalaciones.", "Exportación a JSON de softwares, plantillas y evaluaciones; importación con vista previa y resolución de duplicados.", "M", "5"],
  ["HU-34", "Como evaluador quiero clasificar los softwares con etiquetas y notas.", "Etiquetas con color, filtro por etiqueta en el catálogo y campo de notas en la ficha.", "B", "3"],
  ["HU-30", "Como decisor quiero un resumen en lenguaje natural que explique la recomendación.", "Entre 150 y 250 palabras citando factores y ponderaciones; nunca contradice el cálculo; editable antes de exportar; marcado como generado con IA.", "A", "8"],
], HU_COLS, HU_OPTS));

add(H2("6.7 Historias del Sprint 5 · Cierre"));
add(tabla(HU_HEAD, [
  ["HU-36", "Como decisor quiero descargar el informe generado por el servidor, igual en cualquier navegador.", "Informe con gráficos y resumen; incluye fecha, evaluador y aviso de contenido generado con IA cuando corresponda.", "M", "5"],
], HU_COLS, HU_OPTS));
add(P("El Sprint 5 se completa con tareas técnicas de pulido, corrección de errores, pruebas de regresión y documentación: manual de usuario, manual del catálogo e informe final del proyecto.", { size: 20 }));

add(H2("6.8 Resumen de la estimación"));
add(tabla(
  ["Concepto", "S0 ✔", "S1", "S2", "S3", "S4", "S5", "Total"],
  [
    ["Puntos de historias de usuario", "30", "27", "46", "33", "44", "5", "185"],
    ["Tareas totales del sprint", "—", "12", "12", "11", "11", "7", "53"],
    ["Puntos totales del sprint", "—", "53", "56", "51", "52", "44", "256"],
  ],
  [3026, 900, 850, 850, 850, 850, 850, 850],
  { size: 18, aligns: [null, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER] },
));
add(P("La velocidad planificada es de aproximadamente diez puntos por integrante y sprint. Los puntos totales incluyen, además de las historias de usuario, las tareas técnicas de integración, despliegue, pruebas y documentación.", { size: 20 }));

add(H2("6.9 Trazabilidad entre requisitos e historias"));
add(tabla(
  ["Requisito", "Historias", "Requisito", "Historias"],
  [
    ["RF-01", "HU-01", "RF-14", "HU-15"],
    ["RF-02", "HU-02", "RF-15", "HU-22, HU-23, HU-34"],
    ["RF-03", "HU-02", "RF-16", "HU-09a, HU-21"],
    ["RF-04", "HU-03", "RF-17", "HU-09b, HU-09c, HU-24, HU-35"],
    ["RF-05", "HU-04", "RF-18", "HU-25, HU-29"],
    ["RF-06", "HU-05", "RF-19", "HU-10"],
    ["RF-07", "HU-05", "RF-20", "HU-28"],
    ["RF-08", "HU-06, HU-26, HU-36", "RF-21", "HU-20, HU-27"],
    ["RF-09", "HU-07", "RF-22", "HU-27"],
    ["RF-10", "HU-16", "RF-23", "HU-30"],
    ["RF-11", "HU-17", "RF-24", "HU-11, HU-32"],
    ["RF-12", "HU-18", "RF-25", "HU-12"],
    ["RF-13", "HU-19, HU-31", "RF-26", "HU-33"],
  ],
  [1400, 3113, 1400, 3113],
  { size: 18, aligns: [AlignmentType.CENTER, null, AlignmentType.CENTER, null] },
));

/* 7. Análisis y diseño */
add(salto(), H1("7. Análisis y diseño"));
add(H2("7.1 Actores y casos de uso"));
add(tabla(
  ["Actor", "Descripción"],
  [
    ["Decisor (Director o Responsable de TI)", "Asigna la importancia de los factores, consulta el resultado, compara candidatos y toma la decisión de adoptar."],
    ["Evaluador técnico", "Registra los softwares candidatos y valora el cumplimiento de los subfactores."],
    ["Responsable del método", "Mantiene el catálogo de la guía: factores, subfactores y reglas de recomendación."],
    ["Servicio de IA (actor de sistema)", "Devuelve sugerencias de valoración y el resumen ejecutivo cuando el sistema se lo solicita."],
  ],
  [2600, 6426],
));
add(figura("05-casos-uso.png", "Diagrama de casos de uso del sistema.", "docs/graficos", 430));

add(H2("7.2 Modelo conceptual"));
add(P("El modelo de datos se organiza en tres bloques:", { after: 100 }));
add(LiRich([{ text: "Catálogo de la guía. ", bold: true }, "Datos maestros comunes a todas las organizaciones: una DIMENSIÓN agrupa varios FACTORES y cada FACTOR contiene varios SUBFACTORES. Las escalas se modelan como catálogos propios (NIVEL_IMPORTANCIA y NIVEL_CUMPLIMIENTO) y las reglas de decisión como REGLA_RECOMENDACIÓN."]));
add(LiRich([{ text: "Datos de la organización. ", bold: true }, "Una ORGANIZACIÓN registra varios SOFTWARE_CANDIDATO."]));
add(LiRich([{ text: "Evaluaciones. ", bold: true }, "Cada EVALUACIÓN pertenece a un software y se compone de EVALUACION_FACTOR, que guarda la importancia del decisor, el alcance, la ponderación y la clasificación FODA, y de EVALUACION_SUBFACTOR, que guarda la valoración de cada pregunta."]));

add(H2("7.3 Diseño lógico de la base de datos"));
add(P("El diagrama entidad-relación completo, con los atributos de cada entidad y sus claves primarias y foráneas, se presenta en el Anexo A, en orientación horizontal para facilitar su lectura."));
add(P("Las relaciones y cardinalidades del modelo son las siguientes:", { after: 100 }));
add(tabla(
  ["Relación", "Card.", "Significado"],
  [
    ["DIMENSIÓN — FACTOR", "1 : N", "Una dimensión agrupa varios factores: 3 dimensiones y 18 factores."],
    ["FACTOR — SUBFACTOR", "1 : N", "Un factor contiene varios subfactores: 61 en total."],
    ["ORGANIZACIÓN — SOFTWARE_CANDIDATO", "1 : N", "Una organización registra varios softwares candidatos."],
    ["SOFTWARE_CANDIDATO — EVALUACIÓN", "1 : N", "Un software puede evaluarse varias veces a lo largo del tiempo."],
    ["EVALUACIÓN — EVALUACION_FACTOR", "1 : N", "Una evaluación pondera cada uno de los factores relevantes."],
    ["EVALUACIÓN — EVALUACION_SUBFACTOR", "1 : N", "Una evaluación registra la valoración de cada subfactor respondido."],
    ["REGLA_RECOMENDACIÓN — EVALUACIÓN", "1 : N", "Una regla (A, B o C) explica el resultado de muchas evaluaciones."],
  ],
  [3500, 900, 4626],
  { size: 18, aligns: [null, AlignmentType.CENTER] },
));
add(P("El modelo se encuentra en tercera forma normal: las escalas y las reglas se extraen a catálogos propios para evitar valores repetidos, y las tablas EVALUACION_FACTOR y EVALUACION_SUBFACTOR resuelven las relaciones de muchos a muchos entre una evaluación y el catálogo, con clave primaria compuesta. Los contadores FODA almacenados en EVALUACIÓN son un valor derivado que se conserva por rendimiento; la fuente de verdad es siempre el detalle."));

add(H2("7.4 Diseño físico de la base de datos"));
add(P("El diseño físico se implementa en PostgreSQL 14 o superior. Las tablas, sus claves y sus restricciones son:", { after: 100 }));
add(tabla(
  ["Tabla", "Clave primaria", "Claves foráneas", "Restricciones destacadas"],
  [
    ["dimension", "id_dimension", "—", "codigo y nombre únicos"],
    ["factor", "id_factor", "id_dimension → dimension", "importancia_sugerida entre 1 y 4; alcance en {Interno, Externo, Ambos}"],
    ["subfactor", "id_subfactor", "id_factor → factor", "(id_factor, orden) único; borrado en cascada"],
    ["nivel_importancia", "valor", "—", "valor entre 1 y 4; etiqueta única"],
    ["nivel_cumplimiento", "valor", "—", "valor entre 1 y 4; etiqueta única"],
    ["regla_recomendacion", "codigo (A/B/C)", "—", "orden único; condiciones FODA e importancia como arreglos de texto"],
    ["organizacion", "id_organizacion", "—", "—"],
    ["software_candidato", "id_software", "id_organizacion → organizacion", "borrado en cascada al eliminar la organización"],
    ["evaluacion", "id_evaluacion", "id_software → software_candidato; recomendacion → regla_recomendacion", "estado en {En proceso, Completada, Cancelada}"],
    ["evaluacion_factor", "(id_evaluacion, id_factor)", "ambas columnas; importancia_decisor → nivel_importancia", "alcance en {Interno, Externo}; foda en {Fortaleza, Oportunidad, Debilidad, Amenaza}"],
    ["evaluacion_subfactor", "(id_evaluacion, id_subfactor)", "ambas columnas; valor → nivel_cumplimiento", "una sola valoración por subfactor y evaluación"],
  ],
  [2000, 2000, 2500, 2526],
  { size: 17 },
));
add(P("Se define además la vista de apoyo v_evaluacion_factor, que calcula en el servidor la importancia relativa de cada factor y la devuelve junto con su etiqueta, alcance, ponderación y clasificación FODA. Los índices creados son evaluacion(id_software), evaluacion(creado_en descendente) y subfactor(id_factor).", { after: 100 }));
add(P("El script completo de creación se encuentra en el archivo db/schema.sql del repositorio, y la carga inicial del catálogo en db/seed.sql, generada automáticamente a partir de los archivos de datos para garantizar que ambos no se desincronicen.", { after: 100 }));

add(H2("7.5 Arquitectura del sistema"));
add(figura("07-arquitectura.png", "Arquitectura del sistema: cliente portable, servidor y datos maestros.", "docs/graficos", 560));
add(LiRich([{ text: "Cliente. ", bold: true }, "Interfaz construida en HTML, CSS y JavaScript sin dependencias externas, con el motor de cálculo aislado de la presentación y cubierto por pruebas automáticas. Funciona sin servidor guardando el estado en el navegador."]));
add(LiRich([{ text: "Servidor (a partir del Sprint 2). ", bold: true }, "API REST sobre PostgreSQL y un servicio de inteligencia artificial que custodia la clave del modelo de lenguaje."]));
add(LiRich([{ text: "Datos maestros. ", bold: true }, "Un único origen de datos genera tanto el catálogo que usa la aplicación como la carga inicial de la base de datos."]));

add(H2("7.6 Diseño de la interacción"));
add(P("Los seis pasos de la guía se presentan al usuario como tres pasos numerados —Importancia, Cumplimiento y Resultado—, ya que los pasos 1 y 2, 3 y 4, y 5 y 6 se resuelven en una misma pantalla. La barra lateral funciona como línea de tiempo, mostrando en qué paso se encuentra el usuario y el estado de cada uno."));
add(figura("10-navegacion.png", "Mapa de navegación de la aplicación.", "docs/graficos", 580));

/* 8. Avance */
add(salto(), H1("8. Avance alcanzado en el Sprint 0"));
add(P("Al cierre del Sprint 0 se cuenta con una versión funcional de la aplicación que cubre el flujo completo de la guía: registro del software candidato, asignación de importancias, valoración de los 61 subfactores, clasificación FODA y emisión de la recomendación, con exportación del informe. La aplicación se abre con doble clic, sin instalación."));
add(figura("00-inicio.png", "Pantalla de inicio: registro del software a evaluar y estado del progreso.", "docs/capturas", 560));
add(figura("01-paso-1-2.png", "Paso 1: asignación de la importancia de cada factor por dimensión.", "docs/capturas", 520, 700));
add(figura("02-paso-3-4.png", "Paso 2: valoración del cumplimiento de los subfactores.", "docs/capturas", 560));
add(figura("03-paso-5-6.png", "Paso 3: matriz FODA y recomendación con los factores críticos señalados.", "docs/capturas", 520, 700));
add(figura("05-modo-oscuro.png", "La misma pantalla de resultado en modo oscuro.", "docs/capturas", 520));

/* 9. Conclusiones */
add(H1("9. Conclusiones del avance"));
add(Li("La planificación inicial quedó cerrada: se modeló el proceso actual de adopción de software, se identificaron sus actores y problemas, y se definió el alcance de la automatización."));
add(Li("Se especificaron 26 requisitos funcionales, 12 no funcionales y 8 reglas de negocio, trazados hacia un Product Backlog de 36 historias de usuario distribuidas en cinco sprints."));
add(Li("Se completó el análisis y diseño con el modelo de datos, el diseño lógico y el diseño físico de la base de datos en PostgreSQL, acompañados de su script de creación."));
add(Li("El Sprint 0 entrega además una versión ejecutable de la aplicación que implementa el ciclo completo de la guía, lo que permite validar tempranamente la interpretación del modelo con el Product Owner."));
add(Li("La principal decisión pendiente de confirmación es la nomenclatura de las recomendaciones: el sistema implementa la matriz GUIOSAD 2021, en la que A corresponde a no adoptar y C a adoptar."));

/* 10. Referencias */
add(H1("10. Referencias"));
add(P("Rea Sánchez, V. H. (2022). Factores para la adopción de soluciones basadas en software libre [Tesis doctoral, Universidad de Sevilla]. Directores: Dr. Pablo Neira Ayuso y Dr. David Benavides Cuevas.", { indent: { left: 400, hanging: 400 } }));
add(P("Presidencia de la República del Ecuador. (2008). Decreto Ejecutivo No. 1014: uso de software libre en los sistemas y equipamientos informáticos de la Administración Pública Central.", { indent: { left: 400, hanging: 400 } }));
add(P("Asamblea Nacional del Ecuador. (2016). Código Orgánico de la Economía Social de los Conocimientos, Creatividad e Innovación.", { indent: { left: 400, hanging: 400 } }));
add(P("Schwaber, K. y Sutherland, J. (2020). La Guía de Scrum: las reglas del juego.", { indent: { left: 400, hanging: 400 } }));

/* --------------------------------------------- anexo horizontal con el ER */
const [imgER, pieER] = (() => {
  const [w, h] = IMG["06-modelo-logico.png"];
  const maxW = 900, maxH = 500;
  let fw = maxW, fh = Math.round((h * maxW) / w);
  if (fh > maxH) { fh = maxH; fw = Math.round((w * maxH) / h); }
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
      children: [new ImageRun({ type: "png", data: fs.readFileSync(path.join(REPO, "docs/graficos/06-modelo-logico.png")), transformation: { width: fw, height: fh } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Modelo lógico de datos: diagrama entidad-relación con atributos, claves primarias (PK) y foráneas (FK).", italics: true, size: 18, color: "595959" })],
    }),
  ];
})();
const anexoER = [H1("Anexo A. Modelo lógico de datos"), imgER, pieER];

/* ---------------------------------------------------------------- documento */
const doc = new Document({
  creator: "Freddy Bravo · Ariel Pesántez · Angie Mendoza",
  title: "TAREA #1 — Avance del proyecto GUIOS PRO",
  description: "Planificación inicial (Sprint 0): modelado del negocio, alcance, requisitos, backlog y diseño",
  numbering: {
    config: [{
      reference: "vinetas",
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 520, hanging: 260 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 260 } } } },
      ],
    }],
  },
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 }, paragraph: { spacing: { line: 300 } } },
    },
  },
  sections: [
    { properties: { page: { margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1), right: convertInchesToTwip(1) } } }, children: portada },
    {
      properties: { page: { margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1), right: convertInchesToTwip(1) } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], size: 18, color: "808080" })],
          })],
        }),
      },
      children: [...indice, ...cuerpo],
    },
    {
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: convertInchesToTwip(0.8), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(0.8), right: convertInchesToTwip(0.8) },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], size: 18, color: "808080" })],
          })],
        }),
      },
      children: anexoER,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = process.argv[2] || path.join(REPO, "docs", "entregables", "TAREA1-GUIOS-PRO.docx");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  console.log("OK ->", out, (buf.length / 1024).toFixed(0) + " KB,", nFig, "figuras");
});
