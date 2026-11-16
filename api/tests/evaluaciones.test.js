// RF-10 / RF-30 / RNF-11: evaluaciones, upsert idempotente, conflictos y fidelidad del cálculo.
const test = require("node:test");
const assert = require("node:assert/strict");
const { start, evalBody, fullState, DATA, engine } = require("./helpers");

let api;
test.before(async () => (api = await start()));
test.after(() => api.close());

test("PUT crea (201, revisión 1) y GET devuelve la evaluación con su resultado", async () => {
  const r = await api.req("PUT", "/api/evaluaciones/ev_a1", evalBody("ev_a1"));
  assert.equal(r.status, 201);
  assert.equal(r.json.revision, 1);
  assert.equal(r.json.resultado.recomendacion.codigo, "C");
  const g = await api.req("GET", "/api/evaluaciones/ev_a1");
  assert.equal(g.status, 200);
  assert.equal(g.json.software.evaluador, "Ana");
  assert.equal(g.json.catalogoVersion, DATA.version);
  assert.equal(Object.keys(g.json.subfactores).length, 61);
});

test("upsert idempotente: el mismo contenido no incrementa la revisión", async () => {
  const body = evalBody("ev_idem");
  const a = await api.req("PUT", "/api/evaluaciones/ev_idem", body);
  const b = await api.req("PUT", "/api/evaluaciones/ev_idem", Object.assign({}, body, { revisionBase: a.json.revision }));
  assert.equal(b.status, 200);
  assert.equal(b.json.revision, 1);
  // Reintento tras perder la respuesta (revisionBase antigua pero mismo contenido): tampoco es conflicto.
  const c = await api.req("PUT", "/api/evaluaciones/ev_idem", Object.assign({}, body, { revisionBase: 0 }));
  assert.equal(c.status, 200);
  assert.equal(c.json.revision, 1);
});

test("revisionBase correcta -> revisión +1; desfasada -> 409 con la versión del servidor; resolución", async () => {
  const body = evalBody("ev_conf");
  await api.req("PUT", "/api/evaluaciones/ev_conf", body);
  // Dispositivo 1 cambia un subfactor partiendo de la revisión 1
  const d1 = structuredClone(body);
  d1.subfactores["F01-S01"] = 3;
  d1.revisionBase = 1;
  const r1 = await api.req("PUT", "/api/evaluaciones/ev_conf", d1);
  assert.equal(r1.status, 200);
  assert.equal(r1.json.revision, 2);
  // Dispositivo 2 aún cree que la última es la 1
  const d2 = structuredClone(body);
  d2.subfactores["F02-S01"] = 1;
  d2.revisionBase = 1;
  const r2 = await api.req("PUT", "/api/evaluaciones/ev_conf", d2);
  assert.equal(r2.status, 409);
  assert.equal(r2.json.error.codigo, "conflicto");
  assert.equal(r2.json.servidor.revision, 2);
  assert.equal(r2.json.servidor.subfactores["F01-S01"], 3);
  // El cliente fusiona y reintenta con la revisión del servidor
  const merged = Object.assign(structuredClone(d2), { revisionBase: r2.json.servidor.revision });
  merged.subfactores["F01-S01"] = 3;
  const r3 = await api.req("PUT", "/api/evaluaciones/ev_conf", merged);
  assert.equal(r3.status, 200);
  assert.equal(r3.json.revision, 3);
  assert.equal(r3.json.subfactores["F02-S01"], 1);
  // ?forzar=1 sobrescribe aunque la revisionBase esté desfasada
  const forced = Object.assign(structuredClone(body), { revisionBase: 1 });
  const r4 = await api.req("PUT", "/api/evaluaciones/ev_conf?forzar=1", forced);
  assert.equal(r4.status, 200);
  assert.equal(r4.json.revision, 4);
  assert.equal(r4.json.subfactores["F01-S01"], 4);
});

test("validación de evaluaciones: ids del catálogo, rangos 1..4 y alcance", async () => {
  const bad = [
    { subfactores: { "F99-S01": 4 } },
    { subfactores: { "F01-S01": 5 } },
    { subfactores: { "F01-S01": 2.5 } },
    { decisor: { F01: 0 } },
    { decisor: { FX: 3 } },
    { alcance: { F01: "Interno" } }, // F01 tiene alcance fijo
    { alcance: { F16: "Ambos" } },
    { estado: "Archivada" },
    { observaciones: { "F01-S01": { texto: "x", enlace: "javascript:alert(1)" } } },
    { origenIA: { "F01-S01": { valor: 4, confianza: 2, justificacion: "x" } } },
    { revisionBase: -1 },
    { software: { nombre: "x".repeat(121) } },
  ];
  for (const o of bad) {
    const r = await api.req("PUT", "/api/evaluaciones/ev_bad", evalBody("ev_bad", o));
    assert.equal(r.status, 400, JSON.stringify(o));
    assert.equal(r.json.error.codigo, "entrada_invalida");
  }
  const sw = await api.req("PUT", "/api/evaluaciones/ev_bad", evalBody("ev_bad", { softwareId: "sw_inexistente" }));
  assert.equal(sw.status, 422);
  assert.equal(sw.json.error.codigo, "software_no_encontrado");
});

test("listado resumido con filtros por software, estado y fecha", async () => {
  const h = { "x-organizacion": "Lista SA" };
  await api.req("PUT", "/api/softwares/sw_l1", { nombre: "Odoo" }, h);
  await api.req("PUT", "/api/evaluaciones/ev_l1", evalBody("ev_l1", { softwareId: "sw_l1", estado: "Completada", actualizadoEn: "2026-01-10T10:00:00Z" }), h);
  await api.req("PUT", "/api/evaluaciones/ev_l2", evalBody("ev_l2", { subfactores: {}, actualizadoEn: "2026-03-01T10:00:00Z" }), h);
  const all = (await api.req("GET", "/api/evaluaciones", null, h)).json;
  assert.deepEqual(all.map((e) => e.id), ["ev_l2", "ev_l1"]);
  const e1 = all.find((e) => e.id === "ev_l1");
  assert.deepEqual(Object.keys(e1).sort(), ["actualizadoEn", "avance", "catalogoVersion", "completadoEn", "creadoEn", "estado", "evaluador", "foda", "id", "recomendacion", "revision", "software", "softwareId"].sort());
  assert.equal(e1.avance, 100);
  assert.equal(e1.recomendacion, "C");
  assert.equal(all.find((e) => e.id === "ev_l2").avance, 0);
  assert.deepEqual((await api.req("GET", "/api/evaluaciones?softwareId=sw_l1", null, h)).json.map((e) => e.id), ["ev_l1"]);
  assert.deepEqual((await api.req("GET", "/api/evaluaciones?estado=Completada", null, h)).json.map((e) => e.id), ["ev_l1"]);
  assert.deepEqual((await api.req("GET", "/api/evaluaciones?desde=2026-02-01", null, h)).json.map((e) => e.id), ["ev_l2"]);
  assert.equal((await api.req("GET", "/api/evaluaciones?estado=Otra", null, h)).status, 400);
  assert.equal((await api.req("GET", "/api/evaluaciones?desde=ayer", null, h)).status, 400);
  // Filtrado por organización
  assert.ok(!(await api.req("GET", "/api/evaluaciones")).json.some((e) => e.id === "ev_l1"));
  assert.equal((await api.req("GET", "/api/evaluaciones/ev_l1")).status, 404);
});

test("DELETE de evaluaciones", async () => {
  await api.req("PUT", "/api/evaluaciones/ev_del", evalBody("ev_del"));
  assert.equal((await api.req("DELETE", "/api/evaluaciones/ev_del")).status, 200);
  assert.equal((await api.req("DELETE", "/api/evaluaciones/ev_del")).status, 404);
});

test("observaciones y enlaces por subfactor se guardan en evaluacion_subfactor", async () => {
  const obs = { "F01-S01": { texto: "Ver certificado", enlace: "https://example.org/cert" }, "F05-S01": { texto: "Sin valorar aún", enlace: "" } };
  const body = evalBody("ev_obs", { observaciones: obs });
  delete body.subfactores["F05-S01"];
  const r = await api.req("PUT", "/api/evaluaciones/ev_obs", body);
  assert.deepEqual(r.json.observaciones, obs);
  assert.equal(r.json.subfactores["F05-S01"], undefined);
});

/**
 * RNF-11: el resultado que guarda y devuelve el servidor es idéntico al de
 * engine.evaluate en el navegador para el mismo estado.
 */
test("RNF-11: el resultado del servidor coincide con engine.evaluate para el mismo estado", async () => {
  // Estado variado: valores pseudoaleatorios deterministas, decisor distinto, alcance Externo en el factor «Ambos».
  const st = fullState(4);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  DATA.factores.forEach((f) => {
    st.decisor[f.id] = 1 + Math.floor(rnd() * 4);
    f.subfactores.forEach((s) => {
      if (rnd() < 0.9) st.subfactores[s.id] = 1 + Math.floor(rnd() * 4);
      else delete st.subfactores[s.id];
    });
  });
  const ambos = DATA.factores.find((f) => f.alcance === "Ambos");
  st.alcance[ambos.id] = "Externo";

  const body = evalBody("ev_rnf11", { decisor: st.decisor, alcance: st.alcance, subfactores: st.subfactores });
  const r = await api.req("PUT", "/api/evaluaciones/ev_rnf11", body);
  assert.equal(r.status, 201);
  const expected = engine.evaluate(DATA, { decisor: st.decisor, alcance: st.alcance, subfactores: st.subfactores });
  assert.deepEqual(r.json.resultado, expected);
  assert.deepEqual((await api.req("GET", "/api/evaluaciones/ev_rnf11")).json.resultado, expected);

  // Lo persistido en las tablas normalizadas también coincide (ponderación sin redondeo y FODA).
  const db = api.store.db;
  const row = db.prepare("SELECT * FROM evaluacion WHERE codigo = ?").get("ev_rnf11");
  assert.equal(row.recomendacion, expected.recomendacion ? expected.recomendacion.codigo : null);
  assert.deepEqual([row.n_fortalezas, row.n_oportunidades, row.n_debilidades, row.n_amenazas], [expected.foda.Fortaleza, expected.foda.Oportunidad, expected.foda.Debilidad, expected.foda.Amenaza]);
  const rows = db
    .prepare("SELECT f.codigo, ef.ponderacion, ef.foda, ef.alcance, ef.importancia_decisor FROM evaluacion_factor ef JOIN factor f ON f.id_factor = ef.id_factor WHERE ef.id_evaluacion = ? ORDER BY f.orden")
    .all(row.id_evaluacion);
  assert.equal(rows.length, expected.factores.length);
  rows.forEach((x, i) => {
    const f = expected.factores[i];
    assert.equal(x.codigo, f.id);
    assert.equal(x.ponderacion, f.ponderacion);
    assert.equal(x.foda, f.foda);
    assert.equal(x.alcance, f.alcance);
    assert.equal(x.importancia_decisor, f.importanciaDecisor);
  });

  // Y la comparación usa los mismos valores
  await api.req("PUT", "/api/evaluaciones/ev_rnf11b", evalBody("ev_rnf11b"));
  const cmp = await api.req("GET", "/api/comparar?ids=ev_rnf11,ev_rnf11b");
  assert.deepEqual(cmp.json.evaluaciones[0].factores.map((f) => f.ponderacion), expected.factores.map((f) => f.ponderacion));
});
