// Integración del cliente del navegador (app/js/api.js + store.js) con el servidor real (RF-30, RNF-12).
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { start } = require("./helpers");
const { DATA, engine: E } = require("../lib/catalog");

const Store = require(path.join(__dirname, "..", "..", "app", "js", "store.js"));
const Api = require(path.join(__dirname, "..", "..", "app", "js", "api.js"));

function localDb(nombre) {
  const db = Store.emptyDb(DATA);
  db.softwares = []; // sin el catálogo inicial: la prueba cuenta exactamente lo que se envía
  db.config.organizacion.nombre = "Universidad de Prueba Ñandú"; // nombre no ASCII en la cabecera
  const sw = Store.normalizeSoftware({ nombre, licencia: "FLOSS copyleft (GPL, AGPL)", etiquetas: [{ nombre: "LMS", color: "primary" }] });
  db.softwares.push(sw);
  const ev = Store.newEvaluation(E, DATA, { softwareId: sw.id, software: { nombre } });
  DATA.factores.forEach((f) => f.subfactores.forEach((s) => (ev.subfactores[s.id] = 4)));
  ev.paso1Confirmado = true;
  ev.observaciones["F01-S01"] = { texto: "Probado", enlace: "https://example.org" };
  db.evaluaciones.push(ev);
  db.plantillas.push(Store.normalizeTemplate({ nombre: "Universidad", decisor: { F01: 4 } }));
  return { db, sw, ev };
}

test("sincronización: envía, recibe en otro equipo, detecta y resuelve conflictos", async () => {
  const srv = await start();
  try {
    const org = "Universidad de Prueba Ñandú";
    const api = Api.client({ url: srv.base, organizacion: org });

    // Equipo A envía todo
    const A = localDb("Moodle");
    const repA = await Api.syncDb(api, A.db, Store, E, DATA);
    assert.equal(repA.enviados, 3);
    assert.equal(repA.conflictos, 0);
    assert.equal(A.ev.revision, 1);
    assert.equal(A.ev.cambiosLocales, false);
    assert.equal(A.sw.cambiosLocales, false);

    // Equipo B (vacío, misma organización) recibe todo
    const B = Store.emptyDb(DATA);
    B.softwares = [];
    const repB = await Api.syncDb(api, B, Store, E, DATA);
    assert.equal(repB.recibidos, 3);
    assert.equal(B.evaluaciones[0].id, A.ev.id);
    assert.equal(B.evaluaciones[0].subfactores["F01-S01"], 4);
    assert.equal(B.evaluaciones[0].observaciones["F01-S01"].texto, "Probado");
    assert.equal(B.softwares[0].etiquetas[0].nombre, "LMS");
    // RNF-11: mismo resultado en ambos equipos
    assert.deepEqual(E.evaluate(DATA, B.evaluaciones[0]).recomendacion, E.evaluate(DATA, A.ev).recomendacion);

    // Otra organización no ve nada
    const C = Store.emptyDb(DATA);
    C.softwares = [];
    await Api.syncDb(Api.client({ url: srv.base, organizacion: "Otra" }), C, Store, E, DATA);
    assert.equal(C.evaluaciones.length, 0);

    // Ambos editan la misma evaluación: B sincroniza primero, A recibe conflicto
    B.evaluaciones[0].subfactores["F01-S01"] = 1;
    B.evaluaciones[0].cambiosLocales = true;
    B.evaluaciones[0].actualizadoEn = Store.now();
    await Api.syncDb(api, B, Store, E, DATA);
    A.ev.subfactores["F01-S02"] = 2;
    A.ev.cambiosLocales = true;
    A.ev.actualizadoEn = Store.now();
    const conflict = await Api.syncDb(api, A.db, Store, E, DATA);
    assert.equal(conflict.conflictos, 1);
    assert.equal(A.db.sync.conflictos.length, 1);
    assert.equal(A.db.sync.conflictos[0].servidor.subfactores["F01-S01"], 1);
    // Mientras hay conflicto, no se sobrescribe lo local con lo remoto
    assert.equal(A.db.evaluaciones[0].subfactores["F01-S02"], 2);

    // A decide conservar la suya: se reenvía con la revisión del servidor y gana
    Api.resolveConflict(A.db, Store, E, DATA, A.db.sync.conflictos[0], "local");
    const after = await Api.syncDb(api, A.db, Store, E, DATA);
    assert.equal(after.conflictos, 0);
    assert.equal(A.db.evaluaciones[0].cambiosLocales, false);
    const remote = await api.getEvaluation(A.ev.id);
    assert.equal(remote.subfactores["F01-S02"], 2);
    assert.equal(remote.subfactores["F01-S01"], 4); // la versión local completa sustituyó a la de B

    // B recibe la versión ganadora
    await Api.syncDb(api, B, Store, E, DATA);
    assert.equal(B.evaluaciones[0].subfactores["F01-S02"], 2);

    // Un borrado local se propaga al servidor
    Store.removeEvaluation(A.db, A.ev.id);
    await Api.syncDb(api, A.db, Store, E, DATA);
    assert.equal(A.db.sync.eliminados.length, 0);
    const gone = await srv.req("GET", `/api/evaluaciones/${A.ev.id}`, null, { "X-Organizacion": encodeURIComponent(org) });
    assert.equal(gone.status, 404);
  } finally {
    await srv.close();
  }
});

test("sin servidor: la sincronización falla con estado 0 y no toca los datos locales (RNF-12)", async () => {
  const A = localDb("Odoo");
  const api = Api.client({ url: "http://127.0.0.1:9", organizacion: "X" });
  await assert.rejects(() => Api.syncDb(api, A.db, Store, E, DATA), (err) => err.status === 0);
  assert.equal(A.ev.cambiosLocales, true);
  assert.equal(A.db.evaluaciones.length, 1);
});
