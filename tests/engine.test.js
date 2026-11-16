// Pruebas del motor de cálculo. Ejecutar: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

global.window = {};
require(path.join(__dirname, "..", "app", "js", "data.js"));
const DATA = window.GUIOS_DATA;
const E = require(path.join(__dirname, "..", "app", "js", "engine.js"));

test("datos maestros: 3 dimensiones, 18 factores, 61 subfactores", () => {
  assert.equal(DATA.dimensiones.length, 3);
  assert.equal(DATA.factores.length, 18);
  assert.equal(DATA.factores.reduce((s, f) => s + f.subfactores.length, 0), 61);
});

test("importancia relativa = floor((IS+ID)/2)", () => {
  assert.equal(E.relativeIndex(3, 1), 1); // Importante + Irrelevante -> Opcional
  assert.equal(E.relativeIndex(4, 4), 3); // Fundamental
  assert.equal(E.relativeIndex(1, 1), 0); // Irrelevante -> no relevante
  assert.equal(E.relativeIndex(2, 1), 0);
});

test("FODA según alcance y umbral", () => {
  assert.equal(E.foda("Interno", 3, 3), "Fortaleza");
  assert.equal(E.foda("Interno", 2.9, 3), "Debilidad");
  assert.equal(E.foda("Externo", 4, 3), "Oportunidad");
  assert.equal(E.foda("Externo", 1, 3), "Amenaza");
  assert.equal(E.foda("Externo", null, 3), null);
});

function fullState(subValue) {
  const st = E.initialState(DATA);
  DATA.factores.forEach((f) => f.subfactores.forEach((s) => (st.subfactores[s.id] = subValue)));
  return st;
}

test("todo cumple -> Recomendación C (Adoptar)", () => {
  const r = E.evaluate(DATA, fullState(4));
  assert.equal(r.recomendacion.codigo, "C");
  assert.equal(r.negativos, 0);
  assert.equal(r.pendientes.length, 0);
});

test("nada cumple con factores importantes -> Recomendación A", () => {
  const r = E.evaluate(DATA, fullState(1));
  assert.equal(r.recomendacion.codigo, "A");
  assert.ok(r.recomendacion.factoresCriticos.length > 0);
});

test("debilidad solo en factor opcional -> Recomendación B", () => {
  const st = fullState(4);
  // Reusabilidad: sugerida 2 (Opcional), decisor 2 -> relativa Opcional, alcance Externo
  const f = DATA.factores.find((x) => x.nombre === "Reusabilidad");
  st.decisor[f.id] = 2;
  f.subfactores.forEach((s) => (st.subfactores[s.id] = 1));
  const r = E.evaluate(DATA, st);
  const fr = r.factores.find((x) => x.id === f.id);
  assert.equal(fr.importanciaRelativa, "Opcional");
  assert.equal(fr.foda, "Amenaza");
  assert.equal(r.recomendacion.codigo, "B");
});

test("factor irrelevante no entra en la evaluación", () => {
  const st = fullState(1);
  DATA.factores.forEach((f) => (st.decisor[f.id] = 1));
  const r = E.evaluate(DATA, st);
  const irrelevantes = r.factores.filter((f) => !f.relevante);
  assert.ok(irrelevantes.length > 0);
  irrelevantes.forEach((f) => assert.equal(f.foda, null));
});

test("sin subfactores respondidos no hay recomendación", () => {
  const r = E.evaluate(DATA, E.initialState(DATA));
  assert.equal(r.recomendacion, null);
  assert.equal(r.pendientes.length, r.relevantes);
});

/* ---------------- Funciones de apoyo de la interfaz (Sprint 1-4) ---------------- */

test("progress: avance y evaluación completa", () => {
  const empty = E.progress(E.evaluate(DATA, E.initialState(DATA)));
  assert.equal(empty.answered, 0);
  assert.equal(empty.complete, false);
  const full = E.progress(E.evaluate(DATA, fullState(4)));
  assert.equal(full.pct, 100);
  assert.equal(full.complete, true);
});

test("ayuda contextual: un texto por nivel y por paso (HU-14)", () => {
  assert.equal(DATA.ayuda.niveles_importancia.length, DATA.nivelesImportancia.length);
  assert.equal(DATA.ayuda.niveles_subfactor.length, DATA.nivelesSubfactor.length);
  ["1", "2", "3"].forEach((k) => assert.ok(DATA.ayuda.pasos[k].length > 20));
});

test("applyTemplate: aplica valores válidos e ignora factores o valores desconocidos", () => {
  const st = E.initialState(DATA);
  const soporte = DATA.factores.find((f) => f.alcance === "Ambos");
  const out = E.applyTemplate(DATA, st, {
    decisor: { F01: 1, F02: 9, FXX: 3 },
    alcance: { [soporte.id]: "Externo", F01: "Externo" },
  });
  assert.equal(out.decisor.F01, 1);
  assert.equal(out.decisor.F02, st.decisor.F02);
  assert.equal(out.decisor.FXX, undefined);
  assert.equal(out.alcance[soporte.id], "Externo");
  assert.equal(out.alcance.F01, undefined);
  assert.notEqual(out, st); // no muta el estado original
});

test("summarize: solo las completadas cuentan para recomendaciones, FODA y dimensiones", () => {
  const rc = E.evaluate(DATA, fullState(4));
  const ra = E.evaluate(DATA, fullState(1));
  const rp = E.evaluate(DATA, E.initialState(DATA));
  const s = E.summarize([
    { id: "a", fecha: "2026-01-02", software: "X", estado: "Completada", result: rc },
    { id: "b", fecha: "2026-01-01", software: "Y", estado: "Completada", result: ra },
    { id: "c", fecha: "2026-01-03", software: "Z", estado: "En proceso", result: rp },
  ]);
  assert.equal(s.total, 3);
  assert.deepEqual(s.porEstado, { "En proceso": 1, Completada: 2, Cancelada: 0 });
  assert.deepEqual(s.recomendaciones, { A: 1, B: 0, C: 1 });
  assert.equal(s.foda.Fortaleza + s.foda.Oportunidad, rc.positivos);
  assert.equal(s.dimensiones.length, 3);
  assert.equal(s.dimensiones[0].ponderacion, 2.5); // media de 4 y 1
  assert.deepEqual(s.lineaTiempo.map((x) => x.id), ["b", "a"]);
  assert.deepEqual(s.ultimas, ["c", "a", "b"]);
});

test("compare: une factores, marca el mejor y exige de 2 a 5 evaluaciones", () => {
  const a = { id: "a", software: "A", result: E.evaluate(DATA, fullState(4)) };
  const b = { id: "b", software: "B", result: E.evaluate(DATA, fullState(1)) };
  const c = E.compare([a, b]);
  assert.equal(c.evaluaciones.length, 2);
  assert.equal(c.factores.length, 18);
  assert.equal(c.dimensiones[0].mejor, 0);
  assert.deepEqual(c.evaluaciones.map((x) => x.recomendacion), ["C", "A"]);
  const tie = E.compare([a, { id: "a2", software: "A2", result: a.result }]);
  assert.equal(tie.dimensiones[0].mejor, -1); // empate: sin ganador
  assert.throws(() => E.compare([a]), RangeError);
  assert.throws(() => E.compare([a, a, a, a, a, a]), RangeError);
});

test("validateCatalog: el catálogo oficial es válido y detecta errores de edición", () => {
  assert.deepEqual(E.validateCatalog(DATA), []);
  const bad = JSON.parse(JSON.stringify(DATA));
  bad.factores[0].importanciaSugerida = 5;
  bad.factores[1].alcance = "Mixto";
  bad.factores[2].nombre = " ";
  bad.factores[3].subfactores = [];
  bad.factores[4].subfactores[0].nombre = "";
  const errs = E.validateCatalog(bad);
  assert.equal(errs.length, 5);
  assert.ok(errs.some((e) => /importancia sugerida/.test(e)));
  assert.ok(errs.some((e) => /alcance/.test(e)));
});
