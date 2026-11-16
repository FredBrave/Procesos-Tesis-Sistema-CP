/**
 * Carga el catálogo de la guía (app/js/data.js) y el motor de cálculo
 * (app/js/engine.js) sin duplicarlos: servidor y navegador usan exactamente
 * el mismo código y los mismos datos (RNF-11).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const APP_JS = path.join(__dirname, "..", "..", "app", "js");

/** Ejecuta data.js en un contexto aislado con un objeto `window` y devuelve GUIOS_DATA. */
function loadData(file = path.join(APP_JS, "data.js")) {
  const code = fs.readFileSync(file, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox, { filename: file, timeout: 1000 });
  if (!sandbox.window.GUIOS_DATA) throw new Error("data.js no definió window.GUIOS_DATA");
  // Copia JSON para que los objetos pertenezcan al contexto principal (prototipos normales).
  return JSON.parse(JSON.stringify(sandbox.window.GUIOS_DATA));
}

const DATA = loadData();
const engine = require(path.join(APP_JS, "engine.js"));

// Índices de apoyo para validar ids del catálogo.
const factorById = new Map();
const subfactorById = new Map(); // id -> { factorId, nombre, orden }
DATA.factores.forEach((f) => {
  factorById.set(f.id, f);
  f.subfactores.forEach((s, i) => subfactorById.set(s.id, { factorId: f.id, nombre: s.nombre, orden: i + 1 }));
});
const dimensionById = new Map(DATA.dimensiones.map((d) => [d.id, d]));

/** Evalúa un estado con el motor compartido. */
function evaluate(state) {
  return engine.evaluate(DATA, state);
}

module.exports = { DATA, engine, evaluate, factorById, subfactorById, dimensionById, loadData };
