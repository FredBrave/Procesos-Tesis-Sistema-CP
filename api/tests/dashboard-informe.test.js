// HU-30 dashboard (RNF-10), HU-31 comparar y HU-35 informe HTML.
const test = require("node:test");
const assert = require("node:assert/strict");
const { start, evalBody, fullState, DATA, engine } = require("./helpers");

let api;
test.before(async () => (api = await start()));
test.after(() => api.close());

test("dashboard con 200 evaluaciones en menos de 300 ms (RNF-10)", async () => {
  const h = { "x-organizacion": "Carga SA" };
  const estados = ["En proceso", "Completada", "Cancelada"];
  const softwares = Array.from({ length: 10 }, (_, i) => ({ id: `sw_c${i}`, nombre: `Software ${i}` }));
  for (let lote = 0; lote < 2; lote++) {
    const evaluaciones = [];
    for (let i = lote * 100; i < (lote + 1) * 100; i++) {
      const st = fullState(1 + (i % 4));
      evaluaciones.push(evalBody(`ev_c${i}`, {
        softwareId: `sw_c${i % 10}`,
        subfactores: st.subfactores,
        estado: estados[i % 3],
        actualizadoEn: new Date(Date.UTC(2026, 0, 1) + i * 3600e3).toISOString(),
      }));
    }
    const r = await api.req("POST", "/api/sync", { softwares, evaluaciones }, h);
    assert.equal(r.json.aceptados.length, 110, JSON.stringify(r.json.errores.slice(0, 2)));
  }
  const tiempos = [];
  let d;
  for (let k = 0; k < 3; k++) {
    const t0 = performance.now();
    d = await api.req("GET", "/api/dashboard", null, h);
    tiempos.push(performance.now() - t0);
    assert.equal(d.status, 200);
  }
  assert.ok(Math.max(...tiempos) < 300, `tiempos: ${tiempos.map((t) => t.toFixed(1)).join(", ")} ms`);
  assert.equal(d.json.total, 200);
  assert.deepEqual(d.json.porEstado, { "En proceso": 67, Completada: 67, Cancelada: 66 });
  // Como en el panel del navegador (engine.summarize), solo las completadas cuentan para recomendaciones, FODA y dimensiones.
  const recs = d.json.recomendaciones;
  assert.equal(d.json.completadas, 67);
  assert.equal(recs.A + recs.B + recs.C, 67);
  assert.ok(recs.A > 0 && recs.C > 0);
  assert.equal(d.json.dimensiones.length, 3);
  assert.ok(d.json.dimensiones.every((x) => x.ponderacion >= 1 && x.ponderacion <= 4));
  assert.equal(d.json.ultimas.length, 5);
  assert.equal(d.json.ultimas[0].id, "ev_c199");
  assert.equal(d.json.ultimas[0].software.nombre, "Moodle");
  assert.equal(d.json.lineaTiempo.length, 67);
  assert.ok(d.json.lineaTiempo.every((x, i, a) => i === 0 || a[i - 1].fecha <= x.fecha));
  assert.deepEqual(Object.keys(d.json.lineaTiempo[0]).sort(), ["fecha", "id", "recomendacion", "software", "softwareId", "tono"]);
  const filtrada = await api.req("GET", "/api/dashboard?softwareId=sw_c3", null, h);
  assert.ok(filtrada.json.lineaTiempo.length > 0 && filtrada.json.lineaTiempo.every((x) => x.softwareId === "sw_c3"));
  // Otra organización no ve estos datos
  assert.equal((await api.req("GET", "/api/dashboard")).json.total, 0);

  // RNF-11: mismas cifras que engine.summarize sobre los resultados completos recalculados en el «navegador».
  const ids = (await api.req("GET", "/api/evaluaciones", null, h)).json.map((e) => e.id);
  const entries = [];
  for (const id of ids) {
    const ev = (await api.req("GET", `/api/evaluaciones/${id}`, null, h)).json;
    entries.push({ id, fecha: ev.completadoEn || ev.actualizadoEn, software: ev.software.nombre, estado: ev.estado, result: engine.evaluate(DATA, ev) });
  }
  const s = engine.summarize(entries);
  assert.deepEqual(d.json.porEstado, s.porEstado);
  assert.deepEqual(d.json.recomendaciones, s.recomendaciones);
  assert.deepEqual(d.json.foda, s.foda);
  assert.deepEqual(d.json.dimensiones.map((x) => x.ponderacion), s.dimensiones.map((x) => x.ponderacion));
  assert.deepEqual(d.json.lineaTiempo.map((x) => x.id), s.lineaTiempo.map((x) => x.id));
});

test("comparar: 2..5 evaluaciones; 422 con 1 o 6 ids", async () => {
  for (let i = 0; i < 6; i++) await api.req("PUT", `/api/evaluaciones/ev_k${i}`, evalBody(`ev_k${i}`, { subfactores: fullState(1 + (i % 4)).subfactores }));
  const ok = await api.req("GET", "/api/comparar?ids=ev_k0,ev_k3,ev_k1");
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.json.evaluaciones.map((e) => e.id), ["ev_k0", "ev_k3", "ev_k1"]);
  const e = ok.json.evaluaciones[1];
  assert.equal(e.recomendacion, "C");
  assert.equal(e.dimensiones.length, 3);
  assert.equal(e.factores.length, 18);
  assert.deepEqual(Object.keys(e.factores[0]).sort(), ["dimension", "foda", "id", "importanciaRelativa", "nombre", "ponderacion", "relevante"]);
  assert.equal(ok.json.evaluaciones[0].recomendacion, "A");
  // Filas comparables de engine.compare (con el índice de la mejor ponderación)
  assert.equal(ok.json.factores.length, 18);
  assert.equal(ok.json.factores[0].valores.length, 3);
  assert.equal(ok.json.factores[0].mejor, 1);
  assert.equal(ok.json.dimensiones.length, 3);

  const one = await api.req("GET", "/api/comparar?ids=ev_k0");
  assert.equal(one.status, 422);
  assert.equal(one.json.error.codigo, "cantidad_invalida");
  assert.equal((await api.req("GET", "/api/comparar?ids=ev_k0,ev_k0")).status, 422, "ids repetidos cuentan una vez");
  const six = await api.req("GET", "/api/comparar?ids=" + [0, 1, 2, 3, 4, 5].map((i) => `ev_k${i}`).join(","));
  assert.equal(six.status, 422);
  assert.equal((await api.req("GET", "/api/comparar")).status, 422);
  assert.equal((await api.req("GET", "/api/comparar?ids=ev_k0,ev_nada")).status, 404);
});

test("informe HTML autocontenido con todo el contenido escapado", async () => {
  const xss = `<script>alert("xss")</script>`;
  const body = evalBody("ev_inf", {
    software: { nombre: `Moodle ${xss}`, version: "4.3", licencia: "GPL", proveedor: `<img src=x onerror=alert(1)>`, organizacion: "UTP", evaluador: "Ana & Luis" },
    observaciones: { "F01-S01": { texto: `Nota ${xss}`, enlace: "https://example.org/?a=1&b=<2>" } },
    resumen: { texto: `Resumen con ${xss}`, generadoIA: true, fecha: "2026-11-01T10:00:00Z" },
    estado: "Completada",
  });
  body.subfactores["F02-S01"] = 1; // alguna debilidad
  await api.req("PUT", "/api/evaluaciones/ev_inf", body);
  const r = await api.req("GET", "/api/evaluaciones/ev_inf/informe");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /^text\/html; charset=utf-8/);
  assert.match(r.headers.get("content-security-policy"), /default-src 'none'/);
  const html = r.text;
  assert.ok(!/<script/i.test(html), "no debe haber ninguna etiqueta <script>");
  assert.ok(!html.includes("<img src=x"), "atributos peligrosos escapados");
  assert.ok(html.includes("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"));
  assert.ok(html.includes("Ana &amp; Luis"), "evaluador indicado");
  assert.ok(html.includes("Contenido generado con IA, revisado por el evaluador"));
  assert.ok(html.includes("<svg"), "barras SVG por dimensión");
  assert.ok(html.includes("Matriz FODA"));
  assert.ok(/Recomendación [ABC]/.test(html));
  assert.ok(html.includes("https://example.org/?a=1&amp;b=&lt;2&gt;"));
  DATA.factores.forEach((f) => assert.ok(html.includes(f.nombre.replace(/&/g, "&amp;")), f.nombre));
  // Sin resumen IA no aparece el aviso
  await api.req("PUT", "/api/evaluaciones/ev_inf2", evalBody("ev_inf2"));
  const r2 = await api.req("GET", "/api/evaluaciones/ev_inf2/informe");
  assert.ok(!r2.text.includes("Contenido generado con IA"));
  assert.equal((await api.req("GET", "/api/evaluaciones/ev_nada/informe")).status, 404);
});
