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
