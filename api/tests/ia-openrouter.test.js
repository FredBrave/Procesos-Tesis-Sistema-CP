// Proveedor OpenRouter del asistente de IA, con fetch simulado (nunca llama a la red).
const test = require("node:test");
const assert = require("node:assert/strict");
const { start, DATA } = require("./helpers");
const { createProvider } = require("../lib/ia");
const { OPENROUTER_DEFAULT_MODEL } = require("../lib/ia/providers");

const SOFTWARE = { nombre: "Moodle", version: "4.3", licencia: "GPL", proveedor: "Moodle HQ", url: "https://moodle.org", notas: "LMS" };
const KEY = "sk-or-v1-secreta-de-prueba";

/** fetch falso que responde como OpenRouter; `responder(body)` devuelve { status, json }. */
function fakeOpenRouter(responder) {
  const calls = [];
  async function fetchImpl(url, init) {
    const body = JSON.parse(init.body);
    calls.push({ url, headers: init.headers, body });
    const { status = 200, json } = responder(body, calls.length);
    return { ok: status >= 200 && status < 300, status, json: async () => json };
  }
  return { fetchImpl, calls };
}

function chatResponse(content, extra = {}) {
  return { model: OPENROUTER_DEFAULT_MODEL, choices: [{ message: { content }, finish_reason: "stop" }], usage: { prompt_tokens: 900, completion_tokens: 600, cost: 0.0004 }, ...extra };
}

function sugerenciasFor(factor) {
  return {
    sugerencias: factor.subfactores.map((s, i) => ({ subfactorId: s.id, valor: (i % 4) + 1, confianza: 0.7, justificacion: "Basado en la documentación pública." })),
  };
}

test("createProvider elige OpenRouter con OPENROUTER_API_KEY y usa Claude Haiku 5.5 por defecto", () => {
  const p = createProvider({ openrouterKey: KEY });
  assert.equal(p.nombre, "openrouter");
  assert.equal(p.modelo, OPENROUTER_DEFAULT_MODEL);
  assert.equal(createProvider({ proveedor: "openrouter" }), null); // sin clave no hay proveedor
  assert.equal(createProvider({ proveedor: "openrouter", openrouterKey: KEY, modelo: "otro/modelo" }).modelo, "otro/modelo");
});

test("sugerencias por OpenRouter: formato de la petición, JSON estricto y respuesta válida", async () => {
  const f = DATA.factores[0];
  const fake = fakeOpenRouter(() => ({ json: chatResponse(JSON.stringify(sugerenciasFor(f))) }));
  const api = await start({ ia: { proveedor: "openrouter", openrouterKey: KEY, fetch: fake.fetchImpl } });
  try {
    const salud = await api.req("GET", "/api/salud");
    assert.deepEqual(salud.json.ia, { disponible: true, proveedor: "openrouter" });
    const r = await api.req("POST", "/api/ia/sugerencias", { factorId: f.id, software: SOFTWARE });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.sugerencias.length, f.subfactores.length);
    const c = fake.calls[0];
    assert.equal(c.url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(c.headers.authorization, `Bearer ${KEY}`);
    assert.equal(c.body.model, OPENROUTER_DEFAULT_MODEL.split(",")[0]);
    assert.equal(c.body.response_format.type, "json_schema");
    assert.equal(c.body.response_format.json_schema.strict, true);
    assert.equal(c.body.messages[0].role, "system");
    assert.ok(!r.text.includes(KEY));
  } finally {
    await api.close();
  }
});

test("OpenRouter: JSON envuelto en un bloque de código también se acepta", async () => {
  const f = DATA.factores[1];
  const fake = fakeOpenRouter(() => ({ json: chatResponse("```json\n" + JSON.stringify(sugerenciasFor(f)) + "\n```") }));
  const api = await start({ ia: { proveedor: "openrouter", openrouterKey: KEY, fetch: fake.fetchImpl } });
  try {
    const r = await api.req("POST", "/api/ia/sugerencias", { factorId: f.id, software: SOFTWARE });
    assert.equal(r.status, 200, r.text);
  } finally {
    await api.close();
  }
});

test("OpenRouter: sin saldo (402) o saturado (429) responde 503 sin filtrar la clave ni el cuerpo", async () => {
  for (const status of [402, 429, 401]) {
    const fake = fakeOpenRouter(() => ({ status, json: { error: { message: `detalle interno ${KEY}` } } }));
    const api = await start({ ia: { proveedor: "openrouter", openrouterKey: KEY, fetch: fake.fetchImpl } });
    try {
      const r = await api.req("POST", "/api/ia/sugerencias", { factorId: "F01", software: SOFTWARE });
      assert.equal(r.status, 503, `estado ${status}`);
      assert.equal(r.json.error.codigo, "ia_no_disponible");
      assert.ok(!r.text.includes(KEY) && !r.text.includes("detalle interno"));
    } finally {
      await api.close();
    }
  }
});

test("OpenRouter: si el primer modelo no tiene saldo o está saturado, responde el siguiente de la cadena", async () => {
  const f = DATA.factores[0];
  const fake = fakeOpenRouter((body) =>
    body.model === "pago/modelo" ? { status: 402, json: { error: { message: "sin créditos" } } } : body.model === "gratis/saturado" ? { status: 429, json: {} } : { json: chatResponse(JSON.stringify(sugerenciasFor(f)), { model: body.model }) }
  );
  const api = await start({ ia: { proveedor: "openrouter", openrouterKey: KEY, modelo: "pago/modelo, gratis/saturado, gratis/ok", fetch: fake.fetchImpl } });
  try {
    const r = await api.req("POST", "/api/ia/sugerencias", { factorId: f.id, software: SOFTWARE });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(fake.calls.map((c) => c.body.model), ["pago/modelo", "gratis/saturado", "gratis/ok"]);
    assert.equal(r.json.modelo, "gratis/ok");
  } finally {
    await api.close();
  }
});

test("OpenRouter: una credencial rechazada no prueba otros modelos", async () => {
  const fake = fakeOpenRouter(() => ({ status: 401, json: {} }));
  const api = await start({ ia: { proveedor: "openrouter", openrouterKey: KEY, modelo: "a/uno,b/dos", fetch: fake.fetchImpl } });
  try {
    const r = await api.req("POST", "/api/ia/sugerencias", { factorId: "F01", software: SOFTWARE });
    assert.equal(r.status, 503);
    assert.equal(fake.calls.length, 1);
  } finally {
    await api.close();
  }
});

test("OpenRouter: respuesta truncada o inválida se reintenta una vez y luego da 502", async () => {
  const fake = fakeOpenRouter(() => ({ json: { model: "a/uno", choices: [{ message: { content: "{\"sugerencias\": [" }, finish_reason: "length" }] } }));
  const api = await start({ ia: { proveedor: "openrouter", openrouterKey: KEY, modelo: "a/uno", fetch: fake.fetchImpl } });
  try {
    const r = await api.req("POST", "/api/ia/sugerencias", { factorId: "F01", software: SOFTWARE });
    assert.equal(r.status, 502);
    assert.equal(r.json.error.codigo, "ia_respuesta_invalida");
    assert.equal(fake.calls.length, 2);
  } finally {
    await api.close();
  }
});
