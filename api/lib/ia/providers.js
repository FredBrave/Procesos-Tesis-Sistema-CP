/**
 * Proveedores del asistente de IA.
 *  - anthropic: Messages API de Claude por HTTP con fetch (sin SDK: el proyecto no
 *    admite dependencias). Salida estructurada con output_config.format (json_schema).
 *  - openrouter: API de OpenRouter (formato OpenAI) con response_format json_schema estricto.
 *  - simulado: determinista, sin red, para demos y pruebas.
 * Cada proveedor devuelve { data, modelo } o { invalido: "motivo" }; la validación
 * estricta y el reintento viven en ia/index.js.
 */
"use strict";

const crypto = require("node:crypto");
const { DATA } = require("../catalog");
const { ApiError } = require("../http");
const P = require("./prompts");

// Modelo por defecto según la skill claude-api: Claude Opus 5.5.
const DEFAULT_MODEL = "claude-opus-5-5";
const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2026-10-21";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
// Modelos que aceptan `fallbacks: "default"` ante un rechazo de los clasificadores de seguridad.
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-2", "claude-fable-5-1", "claude-sonnet-5-5"]);

function anthropicProvider({ apiKey, model = DEFAULT_MODEL, effort = "medium", timeoutMs = 90000, fetchImpl = globalThis.fetch, fallbacks = true, baseUrl = API_URL }) {
  async function call(system, user, schema) {
    const body = {
      model,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format: { type: "json_schema", schema } },
    };
    if (effort) body.output_config.effort = effort;
    const headers = {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": API_VERSION,
    };
    if (fallbacks && FALLBACK_MODELS.has(model)) {
      body.fallbacks = "default";
      headers["anthropic-beta"] = FALLBACK_BETA;
    }
    let res;
    try {
      res = await fetchImpl(baseUrl, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      const timeout = e && (e.name === "TimeoutError" || e.name === "AbortError");
      throw new ApiError(502, "ia_error_proveedor", timeout ? "El proveedor de IA no respondió a tiempo" : "No se pudo contactar con el proveedor de IA");
    }
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* cuerpo no JSON */
    }
    if (!res.ok) {
      // Nunca se reenvía el cuerpo del proveedor ni la clave: solo el estado.
      if ([401, 403].includes(res.status)) throw new ApiError(503, "ia_no_disponible", "El proveedor de IA rechazó la credencial configurada en el servidor");
      if ([429, 503, 529].includes(res.status)) throw new ApiError(503, "ia_no_disponible", "El proveedor de IA está saturado; inténtalo más tarde");
      throw new ApiError(502, "ia_error_proveedor", `El proveedor de IA devolvió el estado ${res.status}`);
    }
    if (!json || !Array.isArray(json.content)) return { invalido: "respuesta sin contenido" };
    if (json.stop_reason === "refusal") return { invalido: "el modelo rechazó la solicitud" };
    if (json.stop_reason === "max_tokens") return { invalido: "respuesta truncada (max_tokens)" };
    const text = json.content.filter((b) => b && b.type === "text").map((b) => b.text).join("");
    try {
      return { data: JSON.parse(text), modelo: json.model || model };
    } catch {
      return { invalido: "la respuesta no es JSON válido" };
    }
  }

  return {
    nombre: "anthropic",
    modelo: model,
    sugerir(input, feedback) {
      return call(P.SUGERENCIAS_SYSTEM(), P.sugerenciasUser(input, feedback), P.sugerenciasSchema(input.factor));
    },
    resumir(datos, feedback) {
      return call(P.RESUMEN_SYSTEM(), P.resumenUser(datos, feedback), P.RESUMEN_SCHEMA);
    },
  };
}

// ---------------------------------------------------------------------------
// Proveedor OpenRouter (API compatible con OpenAI; da acceso a Claude y otros modelos)
// ---------------------------------------------------------------------------
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Cadena por defecto: Claude Haiku 5.5 (de pago, rápido y barato) y, si la cuenta no tiene saldo
// o el modelo está saturado, un modelo gratuito con salida JSON estructurada. IA_MODELO admite una
// lista separada por comas con el mismo significado.
const OPENROUTER_DEFAULT_MODEL = "anthropic/claude-haiku-5.5,nvidia/nemotron-3.5-super-vl:free";
// Errores con los que se pasa al siguiente modelo de la cadena.
const FALLBACK_STATUS = new Set([402, 408, 429, 502, 503, 529]);

function openrouterProvider({ apiKey, model = OPENROUTER_DEFAULT_MODEL, timeoutMs = 90000, fetchImpl = globalThis.fetch, baseUrl = OPENROUTER_URL, onUsage }) {
  const models = String(model)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  /** Prueba los modelos en orden; un fallo de saldo, saturación o tiempo pasa al siguiente. */
  async function call(system, user, schema, name) {
    let lastError = null;
    for (const m of models) {
      try {
        return await callModel(m, system, user, schema, name);
      } catch (e) {
        lastError = e;
        if (!(e instanceof ApiError) || !e.fallback) throw e;
      }
    }
    throw lastError;
  }

  function fail(status, codigo, mensaje, fallback) {
    const e = new ApiError(status, codigo, mensaje);
    e.fallback = fallback;
    return e;
  }

  async function callModel(modelId, system, user, schema, name) {
    const body = {
      model: modelId,
      max_tokens: 4000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
      usage: { include: true }, // OpenRouter devuelve el coste de cada llamada
    };
    const headers = {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "x-title": "GUIOS PRO",
    };
    let res;
    try {
      res = await fetchImpl(baseUrl, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      const timeout = e && (e.name === "TimeoutError" || e.name === "AbortError");
      throw fail(502, "ia_error_proveedor", timeout ? "El proveedor de IA no respondió a tiempo" : "No se pudo contactar con el proveedor de IA", timeout);
    }
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* cuerpo no JSON */
    }
    if (!res.ok) {
      // Nunca se reenvía el cuerpo del proveedor ni la clave: solo el estado.
      const next = FALLBACK_STATUS.has(res.status);
      if ([401, 403].includes(res.status)) throw fail(503, "ia_no_disponible", "El proveedor de IA rechazó la credencial configurada en el servidor", false);
      if (res.status === 402) throw fail(503, "ia_no_disponible", "La cuenta del proveedor de IA no tiene saldo suficiente", next);
      if (next) throw fail(503, "ia_no_disponible", "El proveedor de IA está saturado; inténtalo más tarde", next);
      throw fail(502, "ia_error_proveedor", `El proveedor de IA devolvió el estado ${res.status}`, false);
    }
    const choice = json && Array.isArray(json.choices) ? json.choices[0] : null;
    if (!choice || !choice.message) return { invalido: "respuesta sin contenido" };
    if (onUsage && json.usage) onUsage({ modelo: json.model || modelId, ...json.usage });
    if (choice.message.refusal) return { invalido: "el modelo rechazó la solicitud" };
    if (choice.finish_reason === "length") return { invalido: "respuesta truncada (max_tokens)" };
    const text = String(choice.message.content || "")
      .trim()
      .replace(/^```(?:json)?\s*|\s*```$/g, ""); // algunos modelos envuelven el JSON en un bloque de código
    try {
      return { data: JSON.parse(text), modelo: json.model || modelId };
    } catch {
      return { invalido: "la respuesta no es JSON válido" };
    }
  }

  return {
    nombre: "openrouter",
    modelo: models.join(","),
    sugerir(input, feedback) {
      return call(P.SUGERENCIAS_SYSTEM(), P.sugerenciasUser(input, feedback), P.sugerenciasSchema(input.factor), "sugerencias");
    },
    resumir(datos, feedback) {
      return call(P.RESUMEN_SYSTEM(), P.resumenUser(datos, feedback), P.RESUMEN_SCHEMA, "resumen");
    },
  };
}

// ---------------------------------------------------------------------------
// Proveedor simulado (determinista)
// ---------------------------------------------------------------------------
const hashBytes = (s) => crypto.createHash("sha256").update(s).digest();

function simulatedProvider() {
  return {
    nombre: "simulado",
    modelo: "simulado",
    async sugerir({ factor, software }) {
      const nombre = software.nombre || "el software";
      const sugerencias = factor.subfactores.map((s) => {
        const h = hashBytes(`${(software.nombre || "").toLowerCase()}|${software.version || ""}|${s.id}`);
        const valor = (h[0] % 4) + 1;
        const desconoce = valor === 2;
        const confianza = desconoce ? 0.2 : Math.round((0.35 + (h[1] % 50) / 100) * 100) / 100;
        const justificacion = desconoce
          ? `Sugerencia simulada (modo demostración): no hay información suficiente sobre «${nombre}» para este subfactor.`
          : `Sugerencia simulada (modo demostración, sin modelo de IA) para «${nombre}»: ${DATA.nivelesSubfactor[valor - 1]}.`;
        return { subfactorId: s.id, valor, confianza, justificacion: justificacion.slice(0, 400) };
      });
      return { data: { sugerencias }, modelo: "simulado" };
    },
    async resumir(datos) {
      return { data: { texto: resumenPlantilla(datos) }, modelo: "simulado" };
    },
  };
}

const words = (s) => s.split(/\s+/).filter(Boolean).length;

/** Resumen de plantilla que cumple las validaciones (150..250 palabras, cita la recomendación calculada). */
function resumenPlantilla(d) {
  const sw = [d.software.nombre || "El software evaluado", d.software.version].filter(Boolean).join(" ");
  const rec = d.recomendacion;
  const head = [
    `La evaluación de ${sw} con la guía GUIOS concluye con la Recomendación ${rec.codigo}: «${rec.titulo}».`,
    `Se analizaron ${d.factores.length} de ${d.relevantes} factores relevantes, con ${d.foda.Fortaleza} fortalezas, ${d.foda.Oportunidad} oportunidades, ${d.foda.Debilidad} debilidades y ${d.foda.Amenaza} amenazas.`,
  ];
  if (d.pendientes) head.push(`El resultado es parcial, porque ${d.pendientes} factores relevantes siguen sin completarse.`);
  const criticos = new Set(d.factoresCriticos);
  const orden = [...d.factores].sort((a, b) => (criticos.has(b.id) ? 1 : 0) - (criticos.has(a.id) ? 1 : 0));
  const factorSentences = orden.map(
    (f) => `${f.nombre} obtuvo una ponderación de ${f.ponderacion} sobre 4, con importancia ${f.importanciaRelativa.toLowerCase()}, y se clasifica como ${f.foda.toLowerCase()}${criticos.has(f.id) ? ", por lo que es un factor crítico" : ""}.`
  );
  const dims = d.dimensiones.filter((x) => x.factoresEvaluados);
  const dimSentence = dims.length
    ? [`Por dimensiones, el cumplimiento medio es ${dims.map((x) => `${x.ponderacion} en la ${x.nombre.toLowerCase()}`).join(", ")}.`]
    : [];
  const tail = [
    rec.texto,
    "Este resumen se generó en modo de demostración a partir del cálculo de la guía, sin un modelo de lenguaje.",
    "El comité debe revisar el detalle por factor y las observaciones registradas antes de tomar la decisión final.",
    "Las ponderaciones usan la escala de cumplimiento de cuatro niveles definida por la guía GUIOS.",
    "Los factores clasificados como debilidades o amenazas requieren un plan de mitigación con responsables y plazos.",
    "Las fortalezas y oportunidades identificadas pueden apoyar el plan de implantación y la gestión del cambio.",
    "Se recomienda repetir la evaluación cuando cambien las condiciones de la organización o del software.",
  ];
  let parts = [...head, ...dimSentence];
  let count = words(parts.join(" "));
  for (const s of factorSentences) {
    if (count + words(s) > 200) break;
    parts.push(s);
    count += words(s);
  }
  for (const s of tail) {
    if (count >= 170) break;
    if (count + words(s) > 245) continue;
    parts.push(s);
    count += words(s);
  }
  return parts.join(" ");
}

module.exports = { anthropicProvider, openrouterProvider, simulatedProvider, DEFAULT_MODEL, OPENROUTER_DEFAULT_MODEL, resumenPlantilla };
