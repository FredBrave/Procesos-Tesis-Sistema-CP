// HU-17: CRUD de softwares candidatos, casos de error, organización, CORS y límites del cuerpo.
const test = require("node:test");
const assert = require("node:assert/strict");
const { start, evalBody } = require("./helpers");

let api;
test.before(async () => (api = await start()));
test.after(() => api.close());

test("salud responde JSON con Content-Type correcto", async () => {
  const r = await api.req("GET", "/api/salud");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /^application\/json; charset=utf-8/);
  assert.equal(r.json.ok, true);
  assert.deepEqual(r.json.ia, { disponible: true, proveedor: "simulado" });
});

test("crear, leer, listar, actualizar y eliminar un software", async () => {
  const c = await api.req("POST", "/api/softwares", { nombre: "  Moodle ", version: "4.3", licencia: "FLOSS copyleft (GPL, AGPL)", etiquetas: [{ nombre: "LMS", color: "primary" }] });
  assert.equal(c.status, 201);
  assert.match(c.json.id, /^sw_/);
  assert.equal(c.json.nombre, "Moodle");
  assert.deepEqual(c.json.etiquetas, [{ nombre: "LMS", color: "primary" }]);
  const id = c.json.id;

  const g = await api.req("GET", `/api/softwares/${id}`);
  assert.equal(g.status, 200);
  assert.equal(g.json.version, "4.3");

  const u = await api.req("PUT", `/api/softwares/${id}`, Object.assign({}, g.json, { notas: "Piloto 2026" }));
  assert.equal(u.status, 200);
  assert.equal(u.json.notas, "Piloto 2026");

  const l = await api.req("GET", "/api/softwares");
  assert.ok(l.json.some((s) => s.id === id));

  const d = await api.req("DELETE", `/api/softwares/${id}`);
  assert.equal(d.status, 200);
  assert.equal((await api.req("GET", `/api/softwares/${id}`)).status, 404);
});

test("PUT es un upsert idempotente con el id del cliente", async () => {
  const body = { id: "sw_cliente1", nombre: "LibreOffice", version: "24.2" };
  const a = await api.req("PUT", "/api/softwares/sw_cliente1", body);
  assert.equal(a.status, 201);
  const b = await api.req("PUT", "/api/softwares/sw_cliente1", body);
  assert.equal(b.status, 200);
  assert.equal(b.json.actualizadoEn, a.json.actualizadoEn, "el mismo contenido no cambia la fecha");
  assert.equal((await api.req("GET", "/api/softwares")).json.filter((s) => s.id === "sw_cliente1").length, 1);
});

test("errores 400: validación de campos", async () => {
  const cases = [
    {},
    { nombre: "" },
    { nombre: "x".repeat(121) },
    { nombre: 42 },
    { nombre: "A", url: "javascript:alert(1)" },
    { nombre: "A", etiquetas: [{ nombre: "x", color: "rosa" }] },
    { nombre: "A", etiquetas: "LMS" },
  ];
  for (const body of cases) {
    const r = await api.req("POST", "/api/softwares", body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.json.error.codigo, "entrada_invalida");
    assert.ok(Array.isArray(r.json.error.detalles) && r.json.error.detalles.length);
  }
  const bad = await api.req("POST", "/api/softwares", "{no es json");
  assert.equal(bad.status, 400);
  assert.equal(bad.json.error.codigo, "json_invalido");
  const badId = await api.req("PUT", "/api/softwares/id%20con%20espacios", { nombre: "A" });
  assert.equal(badId.status, 400);
  const mismatch = await api.req("PUT", "/api/softwares/sw_a", { id: "sw_b", nombre: "A" });
  assert.equal(mismatch.status, 400);
});

test("errores 404 y 409", async () => {
  assert.equal((await api.req("GET", "/api/softwares/sw_noexiste")).status, 404);
  assert.equal((await api.req("DELETE", "/api/softwares/sw_noexiste")).status, 404);
  assert.equal((await api.req("GET", "/api/ruta/desconocida")).json.error.codigo, "no_encontrado");

  await api.req("POST", "/api/softwares", { id: "sw_dup", nombre: "Dup" });
  const dup = await api.req("POST", "/api/softwares", { id: "sw_dup", nombre: "Dup" });
  assert.equal(dup.status, 409);
  assert.equal(dup.json.error.codigo, "ya_existe");

  // DELETE con evaluaciones asociadas -> 409 salvo ?cascada=1
  await api.req("PUT", "/api/evaluaciones/ev_dup1", evalBody("ev_dup1", { softwareId: "sw_dup" }));
  const del = await api.req("DELETE", "/api/softwares/sw_dup");
  assert.equal(del.status, 409);
  assert.equal(del.json.error.codigo, "tiene_evaluaciones");
  const cas = await api.req("DELETE", "/api/softwares/sw_dup?cascada=1");
  assert.equal(cas.status, 200);
  assert.equal(cas.json.evaluacionesEliminadas, 1);
  assert.equal((await api.req("GET", "/api/evaluaciones/ev_dup1")).status, 404);
});

test("405 en método no permitido", async () => {
  const r = await api.req("PATCH", "/api/softwares");
  assert.equal(r.status, 405);
  assert.match(r.headers.get("allow"), /GET/);
});

test("filtros: q, licencia y etiqueta (con comodines escapados)", async () => {
  const h = { "x-organizacion": "Filtros SA" };
  await api.req("POST", "/api/softwares", { nombre: "GIMP", licencia: "FLOSS copyleft (GPL, AGPL)", etiquetas: [{ nombre: "Gráficos", color: "info" }] }, h);
  await api.req("POST", "/api/softwares", { nombre: "Photoshop", licencia: "Privativa", proveedor: "Adobe" }, h);
  await api.req("POST", "/api/softwares", { nombre: "100%_Raro" }, h);
  assert.deepEqual((await api.req("GET", "/api/softwares?q=gim", null, h)).json.map((s) => s.nombre), ["GIMP"]);
  assert.deepEqual((await api.req("GET", "/api/softwares?q=adobe", null, h)).json.map((s) => s.nombre), ["Photoshop"]);
  assert.deepEqual((await api.req("GET", "/api/softwares?licencia=Privativa", null, h)).json.map((s) => s.nombre), ["Photoshop"]);
  assert.deepEqual((await api.req("GET", `/api/softwares?etiqueta=${encodeURIComponent("gráficos")}`, null, h)).json.map((s) => s.nombre), ["GIMP"]);
  assert.deepEqual((await api.req("GET", "/api/softwares?q=%25_", null, h)).json.map((s) => s.nombre), ["100%_Raro"]);
  assert.deepEqual((await api.req("GET", "/api/softwares?q=' OR 1=1 --", null, h)).json, []);
});

test("cada organización solo ve sus softwares (X-Organizacion)", async () => {
  const a = { "x-organizacion": "Org A" };
  const b = { "x-organizacion": encodeURIComponent("Organización B") };
  await api.req("PUT", "/api/softwares/sw_shared", { nombre: "Solo A" }, a);
  await api.req("PUT", "/api/softwares/sw_shared", { nombre: "Solo B" }, b);
  assert.equal((await api.req("GET", "/api/softwares/sw_shared", null, a)).json.nombre, "Solo A");
  assert.equal((await api.req("GET", "/api/softwares/sw_shared", null, b)).json.nombre, "Solo B");
  assert.equal((await api.req("GET", "/api/softwares/sw_shared")).status, 404, "la organización Predeterminada no lo ve");
  assert.equal((await api.req("GET", "/api/softwares", null, { "x-organizacion": "x".repeat(151) })).status, 400);
});

test("413 si el cuerpo supera 1 MB", async () => {
  const r = await api.req("POST", "/api/softwares", { nombre: "A", notas: "x".repeat(1024 * 1024 + 10) });
  assert.equal(r.status, 413);
  assert.equal(r.json.error.codigo, "cuerpo_demasiado_grande");
});

test("CORS: permite file:// (Origin null) y localhost; responde OPTIONS", async () => {
  const pre = await api.req("OPTIONS", "/api/softwares", undefined, { origin: "null", "access-control-request-method": "PUT" });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("access-control-allow-origin"), "null");
  assert.match(pre.headers.get("access-control-allow-headers"), /X-Organizacion/);
  const lh = await api.req("GET", "/api/salud", undefined, { origin: "http://localhost:5173" });
  assert.equal(lh.headers.get("access-control-allow-origin"), "http://localhost:5173");
  const evil = await api.req("GET", "/api/salud", undefined, { origin: "https://malicioso.example" });
  assert.equal(evil.headers.get("access-control-allow-origin"), null);
});

test("CORS: orígenes adicionales con la opción cors (GUIOS_CORS)", async () => {
  const other = await start({ cors: ["https://guios.example.edu"] });
  try {
    const r = await other.req("GET", "/api/salud", undefined, { origin: "https://guios.example.edu" });
    assert.equal(r.headers.get("access-control-allow-origin"), "https://guios.example.edu");
  } finally {
    await other.close();
  }
});
