/**
 * Asistente de IA (M7; HU-16, HU-20; RNF-13..16).
 * - La recomendación SIEMPRE sale de engine.evaluate; el modelo solo redacta.
 * - Las sugerencias nunca se guardan aquí: la app las muestra y el evaluador decide (RNF-13).
 * - Validación estricta de la salida del modelo, un reintento, y si no 502.
 */
"use strict";

const { factorById, evaluate } = require("../catalog");
const { ApiError, badRequest, notFound } = require("../http");
const V = require("../validate");
const P = require("./prompts");
const { anthropicProvider, simulatedProvider, DEFAULT_MODEL } = require("./providers");

/** Construye el proveedor a partir de la configuración (variables de entorno o pruebas). */
function createProvider(cfg = {}) {
  const key = cfg.apiKey || "";
  let nombre = (cfg.proveedor || "").toLowerCase();
  if (!nombre) nombre = key ? "anthropic" : "ninguno";
  if (nombre === "simulado") return simulatedProvider();
  if (nombre === "anthropic" && key) {
    return anthropicProvider({
      apiKey: key,
      model: cfg.modelo || DEFAULT_MODEL,
      effort: cfg.esfuerzo === undefined ? "medium" : cfg.esfuerzo,
      timeoutMs: cfg.timeoutMs,
      fetchImpl: cfg.fetch,
      fallbacks: cfg.fallbacks !== false,
    });
  }
  return null; // "ninguno", proveedor desconocido o anthropic sin clave
}

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;

/** Valida la respuesta de sugerencias. Devuelve { ok, valor | errores }. */
function checkSugerencias(data, factor) {
  const errs = [];
  if (!data || typeof data !== "object" || !Array.isArray(data.sugerencias)) return { errores: ["falta la lista «sugerencias»"] };
  const expected = factor.subfactores.map((s) => s.id);
  const seen = new Map();
  data.sugerencias.forEach((s, i) => {
    if (!s || typeof s !== "object") return errs.push(`sugerencias[${i}] no es un objeto`);
    if (!expected.includes(s.subfactorId)) return errs.push(`subfactorId desconocido: ${String(s.subfactorId).slice(0, 20)}`);
    if (seen.has(s.subfactorId)) return errs.push(`subfactor repetido: ${s.subfactorId}`);
    if (!Number.isInteger(s.valor) || s.valor < 1 || s.valor > 4) errs.push(`${s.subfactorId}: valor debe ser entero 1..4`);
    if (typeof s.confianza !== "number" || !(s.confianza >= 0 && s.confianza <= 1)) errs.push(`${s.subfactorId}: confianza debe estar entre 0 y 1`);
    if (typeof s.justificacion !== "string" || !s.justificacion.trim()) errs.push(`${s.subfactorId}: falta la justificación`);
    else if (s.justificacion.trim().length > 400) errs.push(`${s.subfactorId}: la justificación supera 400 caracteres`);
    seen.set(s.subfactorId, s);
  });
  expected.forEach((id) => !seen.has(id) && errs.push(`falta el subfactor ${id}`));
  if (errs.length) return { errores: errs };
  return {
    valor: expected.map((id) => {
      const s = seen.get(id);
      return { subfactorId: id, valor: s.valor, confianza: s.confianza, justificacion: s.justificacion.trim() };
    }),
  };
}

// «Recomendación X» con X en mayúscula (sin bandera i: «recomendación a …» no es un código).
const REC_RE = /[Rr][Ee][Cc][Oo][Mm][Ee][Nn][Dd][Aa][Cc][Ii][OoÓó][Nn](?:[Ee][Ss])?\s+[«"“']?([A-Z])(?![\p{L}\p{N}])/gu;

/** Valida el resumen: 150..250 palabras, cita «Recomendación X» calculada y ninguna otra, cita factores. */
function checkResumen(data, datos) {
  const errs = [];
  if (!data || typeof data.texto !== "string") return { errores: ["falta el campo «texto»"] };
  const texto = data.texto.trim();
  const n = wordCount(texto);
  if (n < 150 || n > 250) errs.push(`tiene ${n} palabras; debe tener entre 150 y 250`);
  const codes = [...texto.matchAll(REC_RE)].map((m) => m[1]);
  const code = datos.recomendacion.codigo;
  if (!codes.includes(code)) errs.push(`no menciona literalmente «Recomendación ${code}»`);
  const otras = [...new Set(codes.filter((c) => c !== code))];
  if (otras.length) errs.push(`menciona otra recomendación (${otras.map((c) => "Recomendación " + c).join(", ")}), lo que contradice el cálculo`);
  const lower = texto.toLowerCase();
  if (!datos.factores.some((f) => lower.includes(f.nombre.toLowerCase()))) errs.push("no cita ningún factor evaluado por su nombre");
  if (!/\d[.,]\d/.test(texto)) errs.push("no cita ninguna ponderación");
  if (texto.length > 6000) errs.push("el texto es demasiado largo");
  if (errs.length) return { errores: errs };
  return { valor: { texto, palabras: n } };
}

/** Llama al proveedor, valida y reintenta una vez con la lista de errores como retroalimentación. */
async function withRetry(callFn, checkFn) {
  let feedback = null;
  let last = [];
  for (let intento = 1; intento <= 2; intento++) {
    const out = await callFn(feedback);
    if (out.invalido) last = [out.invalido];
    else {
      const chk = checkFn(out.data);
      if (chk.valor) return { valor: chk.valor, modelo: out.modelo };
      last = chk.errores;
    }
    feedback = last.slice(0, 20).map((e) => `- ${e}`).join("\n");
  }
  throw new ApiError(502, "ia_respuesta_invalida", "La respuesta del modelo no superó la validación tras un reintento", last.slice(0, 20).map((m) => ({ campo: "respuesta", mensaje: m })));
}

function createIa({ provider, store, limiteDiario = 100 }) {
  function info() {
    return { disponible: !!provider, proveedor: provider ? provider.nombre : null };
  }

  function guard(org) {
    if (!provider) throw new ApiError(503, "ia_no_disponible", "El asistente de IA no está configurado en el servidor; la evaluación sigue en modo manual");
    store.consumeIa(org, limiteDiario);
  }

  async function sugerencias(org, body) {
    const c = new V.Checker();
    if (!c.isObject(body)) throw badRequest("El cuerpo debe ser un objeto JSON");
    const factor = factorById.get(body.factorId);
    if (!factor) c.fail("factorId", "Factor desconocido en el catálogo");
    if (!c.isObject(body.software)) c.fail("software", "Debe ser un objeto");
    const swIn = c.isObject(body.software) ? body.software : {};
    const software = {
      nombre: c.str(swIn, "nombre", "software.nombre", { max: 120, required: true }),
      version: c.str(swIn, "version", "software.version", { max: 40 }),
      licencia: c.str(swIn, "licencia", "software.licencia", { max: 60 }),
      proveedor: c.str(swIn, "proveedor", "software.proveedor", { max: 120 }),
      url: c.url(swIn, "url", "software.url", 255),
      notas: c.str(swIn, "notas", "software.notas", { max: 5000 }),
    };
    const contexto = c.str(body, "contexto", "contexto", { max: 4000 });
    c.done("La solicitud de sugerencias no es válida");
    guard(org);
    const { valor, modelo } = await withRetry(
      (fb) => provider.sugerir({ factor, software, contexto }, fb),
      (data) => checkSugerencias(data, factor)
    );
    return { factorId: factor.id, sugerencias: valor, generadoIA: true, modelo };
  }

  async function resumen(org, body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw badRequest("El cuerpo debe ser un objeto JSON");
    let ev;
    if (body.evaluacionId != null) {
      if (!V.isValidId(body.evaluacionId)) throw badRequest("evaluacionId inválido", [{ campo: "evaluacionId", mensaje: "Identificador inválido" }]);
      ev = store.getEvaluacion(org, body.evaluacionId);
      if (!ev) throw notFound("Evaluación no encontrada");
    } else if (body.evaluacion != null) {
      ev = V.evaluacion(body.evaluacion, { requireId: false });
    } else {
      throw badRequest("Indica «evaluacionId» o «evaluacion»", [{ campo: "evaluacionId", mensaje: "Es obligatorio" }]);
    }
    const r = evaluate({ decisor: ev.decisor, alcance: ev.alcance, subfactores: ev.subfactores });
    if (!r.recomendacion) throw new ApiError(422, "sin_resultado", "La evaluación aún no tiene factores evaluados; no hay recomendación que resumir");
    const datos = P.resumenDatos(ev.software || {}, r);
    guard(org);
    const { valor, modelo } = await withRetry((fb) => provider.resumir(datos, fb), (data) => checkResumen(data, datos));
    return { texto: valor.texto, palabras: valor.palabras, recomendacion: r.recomendacion.codigo, generadoIA: true, modelo, fecha: new Date().toISOString() };
  }

  return { info, sugerencias, resumen };
}

module.exports = { createIa, createProvider, checkSugerencias, checkResumen, withRetry, wordCount };
