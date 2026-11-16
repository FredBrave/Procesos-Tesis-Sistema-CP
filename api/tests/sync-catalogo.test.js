// RF-30 sincronización en lote, plantillas (HU-37) y catálogo (HU-23).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { start, evalBody } = require("./helpers");

let api;
test.before(async () => (api = await start()));
test.after(() => api.close());

test("catálogo: misma forma y contenido que app/js/data.js", async () => {
  global.window = {};
  delete require.cache[require.resolve(path.join(__dirname, "..", "..", "app", "js", "data.js"))];
  require(path.join(__dirname, "..", "..", "app", "js", "data.js"));
  const DATA = global.window.GUIOS_DATA;
  const r = await api.req("GET", "/api/catalogo");
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, JSON.parse(JSON.stringify(DATA)));
  assert.deepEqual((await api.req("GET", "/api/catalogo/dimensiones")).json, DATA.dimensiones);
  const fs = (await api.req("GET", "/api/catalogo/factores")).json;
  assert.equal(fs.length, 18);
  assert.equal(fs[0].subfactoresTotal, DATA.factores[0].subfactores.length);
  assert.equal((await api.req("GET", "/api/catalogo/factores?dimension=D3")).json.every((f) => f.dimension === "D3"), true);
  assert.deepEqual((await api.req("GET", "/api/catalogo/factores/F01/subfactores")).json, DATA.factores[0].subfactores);
  assert.equal((await api.req("GET", "/api/catalogo/factores/F99/subfactores")).status, 404);
});

test("plantillas de importancia: CRUD y validación", async () => {
  const c = await api.req("POST", "/api/plantillas", { nombre: "Universidad", decisor: { F01: 4, F02: 2 }, alcance: { F16: "Externo" } });
  assert.equal(c.status, 201);
  assert.match(c.json.id, /^pl_/);
  assert.deepEqual(c.json.decisor, { F01: 4, F02: 2 });
  const id = c.json.id;
  const u = await api.req("PUT", `/api/plantillas/${id}`, { nombre: "Universidad v2", decisor: { F01: 3 } });
  assert.equal(u.status, 200);
  assert.equal(u.json.nombre, "Universidad v2");
  assert.equal((await api.req("GET", "/api/plantillas")).json.length, 1);
  assert.equal((await api.req("POST", "/api/plantillas", { nombre: "" })).status, 400);
  assert.equal((await api.req("POST", "/api/plantillas", { nombre: "X", decisor: { F01: 7 } })).status, 400);
  assert.equal((await api.req("DELETE", `/api/plantillas/${id}`)).status, 200);
  assert.equal((await api.req("DELETE", `/api/plantillas/${id}`)).status, 404);
});

test("sync en lote: aceptados, conflictos, errores y estado del servidor", async () => {
  const h = { "x-organizacion": "Sync SA" };
  // Estado previo en el servidor: ev_s2 ya va por la revisión 2
  await api.req("PUT", "/api/evaluaciones/ev_s2", evalBody("ev_s2"), h);
  const v2 = evalBody("ev_s2", { revisionBase: 1 });
  v2.subfactores["F01-S01"] = 1;
  assert.equal((await api.req("PUT", "/api/evaluaciones/ev_s2", v2, h)).json.revision, 2);

  const conflicting = evalBody("ev_s2", { revisionBase: 1 });
  conflicting.subfactores["F03-S01"] = 2;
  const r = await api.req(
    "POST",
    "/api/sync",
    {
      softwares: [{ id: "sw_s1", nombre: "Nextcloud", etiquetas: [{ nombre: "Nube", color: "info" }] }, { id: "sw_bad", nombre: "" }],
      plantillas: [{ id: "pl_s1", nombre: "Base", decisor: { F01: 4 } }],
      evaluaciones: [
        evalBody("ev_s1", { softwareId: "sw_s1" }),
        conflicting,
        evalBody("ev_s3", { subfactores: { "F01-S01": 9 } }),
        { nombre: "sin id" },
      ],
    },
    h
  );
  assert.equal(r.status, 200);
  assert.deepEqual(
    r.json.aceptados.map((a) => `${a.tipo}:${a.id}:${a.revision}`).sort(),
    ["evaluacion:ev_s1:1", "plantilla:pl_s1:null", "software:sw_s1:null"]
  );
  assert.equal(r.json.conflictos.length, 1);
  assert.equal(r.json.conflictos[0].id, "ev_s2");
  assert.equal(r.json.conflictos[0].servidor.revision, 2);
  assert.equal(r.json.conflictos[0].servidor.subfactores["F01-S01"], 1);
  assert.deepEqual(r.json.errores.map((e) => `${e.tipo}:${e.id}:${e.error.codigo}`).sort(), [
    "evaluacion:ev_s3:entrada_invalida",
    "evaluacion:null:entrada_invalida",
    "software:sw_bad:entrada_invalida",
  ]);
  assert.deepEqual(r.json.servidor.softwares.map((s) => s.id), ["sw_s1"]);
  assert.deepEqual(r.json.servidor.evaluaciones.map((e) => [e.id, e.revision]).sort(), [["ev_s1", 1], ["ev_s2", 2]]);
  assert.deepEqual(r.json.servidor.plantillas.map((p) => p.id), ["pl_s1"]);

  // Reenviar el mismo lote es idempotente (salvo el conflicto pendiente)
  const again = await api.req("POST", "/api/sync", { softwares: [{ id: "sw_s1", nombre: "Nextcloud", etiquetas: [{ nombre: "Nube", color: "info" }] }], evaluaciones: [evalBody("ev_s1", { softwareId: "sw_s1" })] }, h);
  assert.deepEqual(again.json.aceptados.find((a) => a.id === "ev_s1").revision, 1);

  assert.equal((await api.req("POST", "/api/sync", { softwares: "no" }, h)).status, 400);
  assert.equal((await api.req("POST", "/api/sync", [], h)).status, 400);
});
