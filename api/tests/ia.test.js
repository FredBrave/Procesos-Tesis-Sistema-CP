// M7 asistente de IA: proveedor simulado, validación estricta, reintento, 503 y 429 (HU-16, HU-20, RNF-13..16).
const test = require("node:test");
const assert = require("node:assert/strict");
const { start, evalBody, fullState, DATA } = require("./helpers");
const { checkResumen, wordCount } = require("../lib/ia");
const P = require("../lib/ia/prompts");
const { DEFAULT_MODEL } = require("../lib/ia/providers");

const SOFTWARE = { nombre: "Moodle", version: "4.3", licencia: "GPL", proveedor: "Moodle HQ", url: "https://moodle.org", notas: "LMS" };

let api;
test.before(async () => (api = await start({ ia: { proveedor: "simulado", limiteDiario: 1000 } })));
test.after(() => api.close());

test("sugerencias simuladas válidas para todos los subfactores de cada factor", async () => {
  for (const f of DATA.factores) {
    const r = await api.req("POST", "/api/ia/sugerencias", { factorId: f.id, software: SOFTWARE });
    assert.equal(r.status, 200);
    assert.equal(r.json.factorId, f.id);
    assert.deepEqual(r.json.sugerencias.map((s) => s.subfactorId), f.subfactores.map((s) => s.id));
    r.json.sugerencias.forEach((s) => {
      assert.ok(Number.isInteger(s.valor) && s.valor >= 1 && s.valor <= 4);
      assert.ok(s.confianza >= 0 && s.confianza <= 1);
      assert.ok(s.justificacion.length > 0 && s.justificacion.length <= 400);
      if (s.valor === 2) assert.ok(s.confianza <= 0.3, "«Desconozco» con confianza baja");
    });
  }
  // Determinista
  const a = await api.req("POST", "/api/ia/sugerencias", { factorId: "F01", software: SOFTWARE });
  const b = await api.req("POST", "/api/ia/sugerencias", { factorId: "F01", software: SOFTWARE });
  assert.deepEqual(a.json.sugerencias, b.json.sugerencias);
});

test("sugerencias: validación de la solicitud", async () => {
  assert.equal((await api.req("POST", "/api/ia/sugerencias", { factorId: "F99", software: SOFTWARE })).status, 400);
  assert.equal((await api.req("POST", "/api/ia/sugerencias", { factorId: "F01", software: {} })).status, 400);
  assert.equal((await api.req("POST", "/api/ia/sugerencias", { factorId: "F01", software: SOFTWARE, contexto: "x".repeat(4001) })).status, 400);
});

test("resumen simulado: 150–250 palabras y cita la recomendación calculada (A, B y C)", async () => {
  const states = {};
  states.C = fullState(4);
  states.A = fullState(1);
  states.B = fullState(4);
  const reus = DATA.factores.find((x) => x.nombre === "Reusabilidad");
  states.B.decisor[reus.id] = 2;
  reus.subfactores.forEach((s) => (states.B.subfactores[s.id] = 1));
  for (const [code, st] of Object.entries(states)) {
    const id = `ev_res${code}`;
    await api.req("PUT", `/api/evaluaciones/${id}`, evalBody(id, { decisor: st.decisor, alcance: st.alcance, subfactores: st.subfactores }));
    const r = await api.req("POST", "/api/ia/resumen", { evaluacionId: id });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.recomendacion, code);
    assert.equal(r.json.generadoIA, true);
    assert.ok(r.json.palabras >= 150 && r.json.palabras <= 250, `${code}: ${r.json.palabras} palabras`);
    assert.equal(wordCount(r.json.texto), r.json.palabras);
    assert.ok(r.json.texto.includes(`Recomendación ${code}`));
    for (const other of ["A", "B", "C"].filter((c) => c !== code)) assert.ok(!r.json.texto.includes(`Recomendación ${other}`));
  }
  // Con la evaluación en línea (sin guardar) también funciona
  const inline = await api.req("POST", "/api/ia/resumen", { evaluacion: evalBody(undefined, { id: undefined }) });
  assert.equal(inline.status, 200);
  assert.equal(inline.json.recomendacion, "C");
  // Sin factores evaluados no hay recomendación que resumir
  const empty = await api.req("POST", "/api/ia/resumen", { evaluacion: evalBody(undefined, { id: undefined, subfactores: {} }) });
  assert.equal(empty.status, 422);
  assert.equal((await api.req("POST", "/api/ia/resumen", { evaluacionId: "ev_nada" })).status, 404);
  assert.equal((await api.req("POST", "/api/ia/resumen", {})).status, 400);
});

test("checkResumen rechaza textos cortos o que contradicen la recomendación", () => {
  const st = fullState(4);
  const r = require("../lib/catalog").evaluate(st);
  const datos = P.resumenDatos({ nombre: "X" }, r);
  const base = `Compatibilidad obtuvo 3,50. ${"palabra ".repeat(160)}`;
  assert.ok(checkResumen({ texto: `Recomendación C. ${base}` }, datos).valor);
  assert.ok(checkResumen({ texto: `Recomendación C. Compatibilidad 3,50.` }, datos).errores, "demasiado corto");
  assert.ok(checkResumen({ texto: `Recomendación C pero mejor la Recomendación A. ${base}` }, datos).errores, "contradice");
  assert.ok(checkResumen({ texto: base }, datos).errores, "no cita la recomendación");
  assert.ok(checkResumen({ texto: `La recomendación a seguir es la Recomendación C. ${base}` }, datos).valor, "«recomendación a» no es un código");
});

test("503 ia_no_disponible con IA_PROVEEDOR=ninguno; salud lo indica", async () => {
  const off = await start({ ia: { proveedor: "ninguno" } });
  try {
    assert.deepEqual((await off.req("GET", "/api/salud")).json.ia, { disponible: false, proveedor: null });
    const r = await off.req("POST", "/api/ia/sugerencias", { factorId: "F01", software: SOFTWARE });
    assert.equal(r.status, 503);
    assert.equal(r.json.error.codigo, "ia_no_disponible");
    await off.req("PUT", "/api/evaluaciones/ev_x", evalBody("ev_x"));
    assert.equal((await off.req("POST", "/api/ia/resumen", { evaluacionId: "ev_x" })).status, 503);
  } finally {
    await off.close();
  }
  // anthropic sin clave tampoco está disponible
  const nokey = await start({ ia: { proveedor: "anthropic", apiKey: "" } });
  try {
    assert.equal((await nokey.req("GET", "/api/salud")).json.ia.disponible, false);
  } finally {
    await nokey.close();
  }
});

test("429 al superar el límite diario por organización", async () => {
  const lim = await start({ ia: { proveedor: "simulado", limiteDiario: 2 } });
  try {
    const h = { "x-organizacion": "Límite SA" };
    const body = { factorId: "F01", software: SOFTWARE };
    assert.equal((await lim.req("POST", "/api/ia/sugerencias", body, h)).status, 200);
    assert.equal((await lim.req("POST", "/api/ia/sugerencias", body, h)).status, 200);
    const r = await lim.req("POST", "/api/ia/sugerencias", body, h);
    assert.equal(r.status, 429);
    assert.equal(r.json.error.codigo, "limite_ia");
    assert.ok(Number(r.headers.get("retry-after")) > 0);
    // Otra organización tiene su propio cupo
    assert.equal((await lim.req("POST", "/api/ia/sugerencias", body, { "x-organizacion": "Otra" })).status, 200);
    // Las solicitudes inválidas no consumen cupo
    assert.equal((await lim.req("POST", "/api/ia/sugerencias", { factorId: "F99", software: SOFTWARE }, { "x-organizacion": "Tercera" })).status, 400);
  } finally {
    await lim.close();
  }
});

// ---------------------------------------------------------------------------
// Proveedor anthropic con un fetch simulado (sin red): forma de la petición,
// validación estricta, reintento y errores del proveedor.
// ---------------------------------------------------------------------------
function fakeAnthropic(responder) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, headers: init.headers, body });
    const out = responder(body, calls.length);
    return new Response(JSON.stringify(out.json), { status: out.status || 200, headers: { "content-type": "application/json" } });
  };
  return { calls, fetchImpl };
}
const message = (obj, extra = {}) => ({
  json: Object.assign({ id: "msg_1", type: "message", role: "assistant", model: DEFAULT_MODEL, stop_reason: "end_turn", content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj) }] }, extra),
});
const validSug = (factor) => ({ sugerencias: factor.subfactores.map((s) => ({ subfactorId: s.id, valor: 3, confianza: 0.7, justificacion: "Documentado públicamente." })) });

test("anthropic: petición correcta (modelo, cabeceras, salida estructurada) y clave nunca expuesta", async () => {
  const f01 = DATA.factores[0];
  const fake = fakeAnthropic(() => message(validSug(f01)));
  const srv = await start({ ia: { proveedor: "anthropic", apiKey: "sk-ant-secreta", fetch: fake.fetchImpl } });
  try {
    assert.deepEqual((await srv.req("GET", "/api/salud")).json.ia, { disponible: true, proveedor: "anthropic" });
    const r = await srv.req("POST", "/api/ia/sugerencias", { factorId: "F01", software: SOFTWARE, contexto: "Uso en 3 facultades" });
    assert.equal(r.status, 200);
    assert.equal(r.json.modelo, DEFAULT_MODEL);
    assert.ok(!r.text.includes("sk-ant-secreta"));
    assert.equal(fake.calls.length, 1);
    const c = fake.calls[0];
    assert.equal(c.url, "https://api.anthropic.com/v1/messages");
    assert.equal(c.headers["x-api-key"], "sk-ant-secreta");
    assert.equal(c.headers["anthropic-version"], "2026-10-21");
    assert.equal(c.body.model, "claude-opus-5-5");
    assert.equal(c.body.output_config.format.type, "json_schema");
    assert.equal(c.body.fallbacks, "default");
    assert.ok(!("thinking" in c.body) && !("temperature" in c.body));
    assert.match(c.body.system, /Desconozco si cumple/);
    assert.ok(c.body.messages[0].content.includes("F01-S08"));
    assert.ok(!JSON.stringify(c.body).includes("Ana"), "el evaluador no se envía");
  } finally {
    await srv.close();
  }
});

test("anthropic: respuesta inválida -> reintento; dos inválidas -> 502", async () => {
  const f01 = DATA.factores[0];
  const bad = { sugerencias: [{ subfactorId: "F01-S01", valor: 7, confianza: 3, justificacion: "" }] };
  const retry = fakeAnthropic((_, n) => (n === 1 ? message(bad) : message(validSug(f01))));
  const s1 = await start({ ia: { proveedor: "anthropic", apiKey: "k", fetch: retry.fetchImpl } });
  try {
    const r = await s1.req("POST", "/api/ia/sugerencias", { factorId: "F01", software: SOFTWARE });
    assert.equal(r.status, 200);
    assert.equal(retry.calls.length, 2);
    assert.match(retry.calls[1].body.messages[0].content, /no era válida/);
  } finally {
    await s1.close();
  }
  const always = fakeAnthropic(() => message("esto no es JSON"));
  const s2 = await start({ ia: { proveedor: "anthropic", apiKey: "k", fetch: always.fetchImpl } });
  try {
    const r = await s2.req("POST", "/api/ia/sugerencias", { factorId: "F01", software: SOFTWARE });
    assert.equal(r.status, 502);
    assert.equal(r.json.error.codigo, "ia_respuesta_invalida");
    assert.equal(always.calls.length, 2);
  } finally {
    await s2.close();
  }
  const refusal = fakeAnthropic(() => message("", { stop_reason: "refusal", content: [] }));
  const s3 = await start({ ia: { proveedor: "anthropic", apiKey: "k", fetch: refusal.fetchImpl } });
  try {
    assert.equal((await s3.req("POST", "/api/ia/sugerencias", { factorId: "F01", software: SOFTWARE })).status, 502);
  } finally {
    await s3.close();
  }
});

test("anthropic: resumen que contradice la recomendación se rechaza y errores del proveedor se traducen", async () => {
  const text = (code) => `Recomendación ${code}. Compatibilidad obtuvo 4,00. ${"texto ".repeat(160)}`;
  const contradict = fakeAnthropic((_, n) => message({ texto: n === 1 ? text("A") : text("C") }));
  const s = await start({ ia: { proveedor: "anthropic", apiKey: "k", fetch: contradict.fetchImpl } });
  try {
    await s.req("PUT", "/api/evaluaciones/ev_c", evalBody("ev_c"));
    const r = await s.req("POST", "/api/ia/resumen", { evaluacionId: "ev_c" });
    assert.equal(r.status, 200);
    assert.equal(r.json.recomendacion, "C");
    assert.equal(contradict.calls.length, 2);
    assert.ok(!contradict.calls[0].body.messages[0].content.includes("Ana"), "el evaluador no se envía al proveedor");
  } finally {
    await s.close();
  }
  for (const [status, expected] of [[401, 503], [529, 503], [500, 502]]) {
    const fake = fakeAnthropic(() => ({ status, json: { type: "error", error: { type: "x", message: "detalle interno sk-ant-secreta" } } }));
    const srv = await start({ ia: { proveedor: "anthropic", apiKey: "sk-ant-secreta", fetch: fake.fetchImpl } });
    try {
      const r = await srv.req("POST", "/api/ia/sugerencias", { factorId: "F01", software: SOFTWARE });
      assert.equal(r.status, expected);
      assert.ok(!r.text.includes("sk-ant-secreta"));
    } finally {
      await srv.close();
    }
  }
});

test("RNF-15: evaluar-calidad lee los casos y reporta acierto exacto y ±1", async () => {
  const { run } = require("../ia/evaluar-calidad");
  const { simulatedProvider } = require("../lib/ia/providers");
  const lines = [];
  const r = await run({ provider: simulatedProvider(), umbral: 0.7, out: (l) => lines.push(l) });
  assert.equal(r.casos, 2);
  assert.equal(r.subfactores, 14);
  assert.ok(r.exacto >= 0 && r.exacto <= 1 && r.cercano >= r.exacto);
  assert.equal(typeof r.aprobado, "boolean");
  assert.ok(r.filas.every((f) => f.ejemplo), "los casos incluidos están marcados como ejemplo");
  assert.ok(lines.some((l) => /al menos 30 casos/.test(l)));
});
