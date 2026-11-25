// Pruebas del almacén local (multi-evaluación, migración e importación). Ejecutar: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

global.window = global.window || {};
require(path.join(__dirname, "..", "app", "js", "data.js"));
const DATA = window.GUIOS_DATA;
const E = require(path.join(__dirname, "..", "app", "js", "engine.js"));
const S = require(path.join(__dirname, "..", "app", "js", "store.js"));

function memoryStorage(initial) {
  const m = new Map(Object.entries(initial || {}));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

function completeEval(value, softwareName) {
  const ev = S.newEvaluation(E, DATA, { software: { nombre: softwareName || "Moodle" } });
  DATA.factores.forEach((f) => f.subfactores.forEach((s) => (ev.subfactores[s.id] = value)));
  ev.paso1Confirmado = true;
  return ev;
}

test("almacén vacío: estructura inicial con el catálogo oficial activo", () => {
  const db = S.load(memoryStorage(), E, DATA);
  assert.equal(db.version, 2);
  assert.equal(db.evaluaciones.length, 0);
  assert.equal(db.catalogoActivo, DATA.version);
  assert.equal(db.config.servidor.activo, false);
});

test("configuración por defecto: datos del piloto de la tesis en la UNEMI", () => {
  const db = S.emptyDb(DATA);
  assert.equal(db.config.organizacion.nombre, "Universidad Estatal de Milagro");
  assert.equal(db.config.organizacion.sector, "Educación superior");
  assert.equal(db.config.organizacion.logo, "img/logo-unemi.png");
  assert.equal(db.config.evaluadorPorDefecto, "Dirección de TICs");
  assert.equal(db.config.guardada, false);
  // Un almacén antiguo con la configuración vacía y nunca guardada se rellena al cargar
  const old = S.emptyDb(DATA);
  old.config.organizacion = { nombre: "", sector: "", logo: "" };
  old.config.evaluadorPorDefecto = "";
  delete old.config.guardada;
  const loaded = S.load(memoryStorage({ [S.DB_KEY]: JSON.stringify(old) }), E, DATA);
  assert.equal(loaded.config.organizacion.nombre, "Universidad Estatal de Milagro");
  assert.equal(loaded.config.evaluadorPorDefecto, "Dirección de TICs");
  // Una vez guardada, lo que dejó el usuario se respeta aunque esté vacío
  old.config.guardada = true;
  const saved = S.load(memoryStorage({ [S.DB_KEY]: JSON.stringify(old) }), E, DATA);
  assert.equal(saved.config.organizacion.logo, "");
  assert.equal(saved.config.evaluadorPorDefecto, "");
});

test("catálogo inicial: LibreOffice, el software del piloto de la tesis, se añade una sola vez", () => {
  const db = S.emptyDb(DATA);
  assert.deepEqual(db.softwares.map((s) => s.nombre), ["LibreOffice"]);
  assert.equal(db.softwares[0].proveedor, "The Document Foundation");
  assert.equal(db.softwares[0].licencia, "FLOSS copyleft débil (LGPL, MPL)");
  // Un almacén anterior al catálogo inicial lo recibe al cargar
  const old = S.emptyDb(DATA);
  old.softwares = [S.normalizeSoftware({ nombre: "Moodle" })];
  delete old.catalogoInicial;
  const loaded = S.load(memoryStorage({ [S.DB_KEY]: JSON.stringify(old) }), E, DATA);
  assert.deepEqual(loaded.softwares.map((s) => s.nombre), ["LibreOffice", "Moodle"]);
  // Si el usuario lo borra, no vuelve a aparecer
  S.removeSoftware(loaded, "sw_tesis_libreoffice", false);
  const again = S.load(memoryStorage({ [S.DB_KEY]: JSON.stringify(loaded) }), E, DATA);
  assert.deepEqual(again.softwares.map((s) => s.nombre), ["Moodle"]);
  // Una evaluación antigua de LibreOffice reutiliza ese software en lugar de duplicarlo
  const legacy = E.initialState(DATA);
  legacy.software.nombre = "LibreOffice";
  legacy.paso1Confirmado = true;
  const migrated = S.load(memoryStorage({ [S.LEGACY_KEY]: JSON.stringify(legacy) }), E, DATA);
  assert.equal(migrated.softwares.filter((s) => s.nombre === "LibreOffice").length, 1);
  assert.equal(migrated.evaluaciones[0].softwareId, "sw_tesis_libreoffice");
});

test("una evaluación con solo la organización y el evaluador por defecto no cuenta como iniciada", () => {
  const ev = S.newEvaluation(E, DATA, { software: { organizacion: "Universidad Estatal de Milagro", evaluador: "Dirección de TICs" } });
  assert.equal(S.hasData(ev), false);
  ev.software.nombre = "LibreOffice";
  assert.equal(S.hasData(ev), true);
});

test("migración desde la versión 1: la evaluación pasa al historial y su software al catálogo", () => {
  const old = E.initialState(DATA);
  old.software.nombre = "Odoo";
  old.software.organizacion = "UNEMI";
  old.software.evaluador = "Comité TI";
  old.subfactores["F01-S01"] = 4;
  old.paso1Confirmado = true;
  const db = S.load(memoryStorage({ [S.LEGACY_KEY]: JSON.stringify(old) }), E, DATA);
  assert.equal(db.evaluaciones.length, 1);
  assert.equal(db.activa, db.evaluaciones[0].id);
  const odoo = db.softwares.find((s) => s.nombre === "Odoo");
  assert.ok(odoo);
  assert.equal(db.evaluaciones[0].softwareId, odoo.id);
  assert.equal(db.evaluaciones[0].subfactores["F01-S01"], 4);
  assert.equal(db.config.organizacion.nombre, "UNEMI");
  assert.equal(db.config.evaluadorPorDefecto, "Comité TI");
});

test("persistir y volver a cargar conserva el almacén", () => {
  const storage = memoryStorage();
  const db = S.load(storage, E, DATA);
  db.evaluaciones.push(completeEval(4));
  assert.equal(S.persist(storage, db), true);
  const again = S.load(storage, E, DATA);
  assert.equal(again.evaluaciones.length, 1);
});

test("normalizeEvaluation descarta valores fuera de escala y enlaces inseguros", () => {
  const ev = S.normalizeEvaluation(E, DATA, {
    id: "ev_123",
    decisor: { F01: 7, F02: 2 },
    subfactores: { "F01-S01": 0, "F01-S02": 3 },
    alcance: { F16: "Mixto" },
    observaciones: { "F01-S02": { texto: "Ver manual", enlace: "javascript:alert(1)" } },
    estado: "Rara",
  });
  assert.equal(ev.id, "ev_123");
  assert.equal(ev.decisor.F01, DATA.factores[0].importanciaSugerida);
  assert.equal(ev.decisor.F02, 2);
  assert.equal(ev.subfactores["F01-S01"], undefined);
  assert.equal(ev.subfactores["F01-S02"], 3);
  assert.equal(ev.observaciones["F01-S02"].enlace, "");
  assert.equal(ev.observaciones["F01-S02"].texto, "Ver manual");
  assert.equal(ev.estado, "En proceso");
});

test("deriveStatus: completada cuando hay recomendación sin pendientes; cancelada se respeta", () => {
  const ev = completeEval(4);
  assert.equal(S.deriveStatus(E, DATA, ev), "Completada");
  assert.equal(S.deriveStatus(E, DATA, S.newEvaluation(E, DATA)), "En proceso");
  ev.estado = "Cancelada";
  assert.equal(S.deriveStatus(E, DATA, ev), "Cancelada");
});

test("versiones del catálogo: las evaluaciones conservan la versión con la que se hicieron (RN-08)", () => {
  const db = S.emptyDb(DATA);
  const old = completeEval(4);
  const draft = S.clone(DATA);
  draft.factores[0].nombre = "Compatibilidad (editado)";
  draft.factores[0].subfactores.push({ id: S.nextSubfactorId(db, DATA, "F01"), nombre: "Nuevo requisito" });
  const v = S.addCatalogVersion(db, DATA, draft, "prueba");
  assert.equal(db.catalogoActivo, v);
  assert.equal(S.catalogFor(db, DATA, old.catalogoVersion), DATA);
  assert.equal(S.activeCatalog(db, DATA).factores[0].nombre, "Compatibilidad (editado)");
  assert.equal(S.activeCatalog(db, DATA).factores[0].subfactores.at(-1).id, "F01-S09");
  // La evaluación vieja sigue completa con su catálogo; con el nuevo tendría un pendiente.
  assert.equal(S.deriveStatus(E, DATA, old), "Completada");
  assert.equal(S.deriveStatus(E, S.activeCatalog(db, DATA), old), "En proceso");
  assert.equal(S.nextSubfactorId(db, DATA, "F01"), "F01-S10");
});

test("borrar un software: sin cascada desvincula sus evaluaciones; con cascada las borra", () => {
  const db = S.emptyDb(DATA);
  const sw = S.normalizeSoftware({ nombre: "Moodle" });
  db.softwares.push(sw);
  const ev = completeEval(4);
  ev.softwareId = sw.id;
  db.evaluaciones.push(ev);
  S.removeSoftware(db, sw.id, false);
  assert.equal(db.evaluaciones[0].softwareId, null);
  const sw2 = S.normalizeSoftware({ nombre: "Odoo" });
  db.softwares.push(sw2);
  db.evaluaciones[0].softwareId = sw2.id;
  S.removeSoftware(db, sw2.id, true);
  assert.equal(db.evaluaciones.length, 0);
  assert.deepEqual(db.sync.eliminados.map((x) => x.tipo), ["software", "evaluacion", "software"]);
});

test("etiquetas: sin duplicados, con color válido", () => {
  const tags = S.normalizeTags(["LMS", { nombre: "lms", color: "danger" }, { nombre: "Crítico", color: "rojo" }, ""]);
  assert.deepEqual(tags, [
    { nombre: "LMS", color: "neutral" },
    { nombre: "Crítico", color: "neutral" },
  ]);
});

test("exportar e importar: ida y vuelta con vista previa y resolución de duplicados", () => {
  const db = S.emptyDb(DATA);
  db.softwares = []; // sin el catálogo inicial, para contar solo lo exportado
  const sw = S.normalizeSoftware({ nombre: "Moodle", etiquetas: [{ nombre: "LMS", color: "primary" }] });
  db.softwares.push(sw);
  const ev = completeEval(4);
  ev.softwareId = sw.id;
  db.evaluaciones.push(ev);
  db.plantillas.push(S.normalizeTemplate({ nombre: "Universidad", decisor: { F01: 4 } }));
  const pkg = S.exportPackage(db, { softwares: true, plantillas: true, evaluaciones: true });
  assert.equal(pkg.formato, "guiospro-paquete");
  assert.equal(pkg.evaluaciones[0].cambiosLocales, undefined);

  const parsed = S.parsePackage(E, DATA, JSON.parse(JSON.stringify(pkg)));
  // En un almacén vacío todo es nuevo
  const fresh = S.emptyDb(DATA);
  fresh.softwares = [];
  assert.ok(S.previewImport(fresh, parsed).every((i) => !i.duplicado));
  assert.deepEqual(S.applyImport(fresh, parsed, "omitir"), { nuevos: 3, reemplazados: 0, copias: 0, omitidos: 0 });
  assert.equal(fresh.evaluaciones[0].softwareId, fresh.softwares[0].id);

  // En el mismo almacén todo es duplicado
  assert.ok(S.previewImport(db, parsed).every((i) => i.duplicado));
  assert.equal(S.applyImport(db, parsed, "omitir").omitidos, 3);
  const copies = S.applyImport(db, parsed, "copia");
  assert.equal(copies.copias, 3);
  assert.equal(db.softwares.length, 2);
  assert.equal(db.evaluaciones.length, 2);
  assert.notEqual(db.evaluaciones[1].id, ev.id);
  assert.equal(db.evaluaciones[1].softwareId, db.softwares[1].id);
  assert.equal(S.applyImport(db, parsed, "reemplazar").reemplazados, 3);
});

test("importar la exportación de la versión 1 (una evaluación) sigue funcionando", () => {
  const st = E.initialState(DATA);
  st.subfactores["F01-S01"] = 3;
  const v1 = { app: "GUIOS PRO", version: "1.0.0", software: { nombre: "LibreOffice" }, estado: { decisor: st.decisor, alcance: st.alcance, subfactores: st.subfactores } };
  const parsed = S.parsePackage(E, DATA, v1);
  assert.equal(parsed.evaluaciones.length, 1);
  assert.equal(parsed.softwares[0].nombre, "LibreOffice");
  assert.equal(parsed.evaluaciones[0].subfactores["F01-S01"], 3);
  assert.throws(() => S.parsePackage(E, DATA, { hola: 1 }), /formato/);
});

test("duplicar una evaluación crea otra en proceso, sin resumen ni revisión del servidor", () => {
  const db = S.emptyDb(DATA);
  const ev = completeEval(4);
  ev.revision = 5;
  ev.resumen = { texto: "x", generadoIA: true, fecha: S.now() };
  db.evaluaciones.push(ev);
  const copy = S.duplicateEvaluation(db, ev);
  assert.notEqual(copy.id, ev.id);
  assert.equal(copy.revision, 0);
  assert.equal(copy.resumen, null);
  assert.equal(copy.subfactores["F01-S01"], 4);
});
