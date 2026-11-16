/**
 * Validación y normalización de la entrada (RNF-06).
 * Cada función devuelve el objeto normalizado o lanza ApiError 400 con la
 * lista de problemas en `detalles` ([{ campo, mensaje }]).
 */
"use strict";

const { DATA, factorById, subfactorById } = require("./catalog");
const { badRequest } = require("./http");

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const COLORS = ["primary", "success", "warning", "danger", "info", "neutral"];
const ESTADOS = ["En proceso", "Completada", "Cancelada"];
const ALCANCES = ["Interno", "Externo"];

class Checker {
  constructor() {
    this.errors = [];
  }
  fail(campo, mensaje) {
    this.errors.push({ campo, mensaje });
    return undefined;
  }
  done(msg = "La entrada no es válida") {
    if (this.errors.length) throw badRequest(msg, this.errors);
  }
  isObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }
  /** Cadena opcional (o obligatoria) recortada con longitud máxima. */
  str(obj, key, campo, { max, min = 0, required = false } = {}) {
    const v = obj == null ? undefined : obj[key];
    if (v == null || v === "") {
      if (required) return this.fail(campo, "Es obligatorio");
      return "";
    }
    if (typeof v !== "string") return this.fail(campo, "Debe ser texto");
    const t = v.trim();
    if (required && t.length < Math.max(1, min)) return this.fail(campo, "Es obligatorio");
    if (t.length > max) return this.fail(campo, `Máximo ${max} caracteres`);
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(t)) return this.fail(campo, "Contiene caracteres de control");
    return t;
  }
  url(obj, key, campo, max = 500) {
    const t = this.str(obj, key, campo, { max });
    if (!t) return t;
    try {
      const u = new URL(t);
      if (u.protocol !== "http:" && u.protocol !== "https:") return this.fail(campo, "Solo se admiten enlaces http(s)");
    } catch {
      return this.fail(campo, "No es una URL válida");
    }
    return t;
  }
  id(v, campo, { required = true } = {}) {
    if (v == null || v === "") return required ? this.fail(campo, "Es obligatorio") : null;
    if (typeof v !== "string" || !ID_RE.test(v)) return this.fail(campo, "Identificador inválido (1..64 caracteres: letras, dígitos, _ o -)");
    return v;
  }
  iso(v, campo) {
    if (v == null || v === "") return null;
    if (typeof v !== "string" || !ISO_RE.test(v) || Number.isNaN(Date.parse(v))) return this.fail(campo, "Fecha ISO 8601 inválida");
    return new Date(v).toISOString();
  }
  int14(v, campo) {
    if (!Number.isInteger(v) || v < 1 || v > 4) return this.fail(campo, "Debe ser un entero entre 1 y 4");
    return v;
  }
  bool(v, campo, def = false) {
    if (v == null) return def;
    if (typeof v !== "boolean") return this.fail(campo, "Debe ser booleano");
    return v;
  }
}

function isValidId(v) {
  return typeof v === "string" && ID_RE.test(v);
}

/** Etiquetas de un software: [{ nombre, color }] */
function etiquetas(c, v) {
  if (v == null) return [];
  if (!Array.isArray(v)) return c.fail("etiquetas", "Debe ser una lista"), [];
  if (v.length > 20) return c.fail("etiquetas", "Máximo 20 etiquetas"), [];
  const out = [];
  const seen = new Set();
  v.forEach((e, i) => {
    if (!c.isObject(e)) return c.fail(`etiquetas[${i}]`, "Debe ser un objeto { nombre, color }");
    const nombre = c.str(e, "nombre", `etiquetas[${i}].nombre`, { max: 40, required: true });
    const color = e.color == null ? "neutral" : e.color;
    if (!COLORS.includes(color)) c.fail(`etiquetas[${i}].color`, `Debe ser uno de: ${COLORS.join(", ")}`);
    if (nombre && !seen.has(nombre.toLowerCase())) {
      seen.add(nombre.toLowerCase());
      out.push({ nombre, color });
    }
  });
  return out;
}

/** Software candidato (HU-17). */
function software(body, { idFromUrl } = {}) {
  const c = new Checker();
  if (!c.isObject(body)) throw badRequest("El cuerpo debe ser un objeto JSON");
  let id = body.id;
  if (idFromUrl) {
    if (id != null && id !== idFromUrl) c.fail("id", "No coincide con el id de la URL");
    id = idFromUrl;
  }
  const out = {
    id: c.id(id, "id", { required: false }),
    nombre: c.str(body, "nombre", "nombre", { max: 120, required: true }),
    version: c.str(body, "version", "version", { max: 40 }),
    licencia: c.str(body, "licencia", "licencia", { max: 60 }),
    proveedor: c.str(body, "proveedor", "proveedor", { max: 120 }),
    url: c.url(body, "url", "url", 255),
    notas: c.str(body, "notas", "notas", { max: 5000 }),
    etiquetas: etiquetas(c, body.etiquetas),
    creadoEn: c.iso(body.creadoEn, "creadoEn"),
    actualizadoEn: c.iso(body.actualizadoEn, "actualizadoEn"),
  };
  c.done("El software no es válido");
  return out;
}

/** decisor/alcance comunes a evaluaciones y plantillas, completados con los valores por defecto del motor. */
function importancia(c, body, { completar = true } = {}) {
  const decisor = {};
  const alcance = {};
  if (body.decisor != null && !c.isObject(body.decisor)) c.fail("decisor", "Debe ser un objeto { F01: 1..4 }");
  else
    Object.entries(body.decisor || {}).forEach(([k, v]) => {
      if (!factorById.has(k)) return c.fail(`decisor.${k}`, "Factor desconocido en el catálogo");
      const n = c.int14(v, `decisor.${k}`);
      if (n) decisor[k] = n;
    });
  if (body.alcance != null && !c.isObject(body.alcance)) c.fail("alcance", "Debe ser un objeto { F16: 'Interno'|'Externo' }");
  else
    Object.entries(body.alcance || {}).forEach(([k, v]) => {
      const f = factorById.get(k);
      if (!f) return c.fail(`alcance.${k}`, "Factor desconocido en el catálogo");
      if (f.alcance !== "Ambos") return c.fail(`alcance.${k}`, "Este factor tiene alcance fijo; solo se elige en factores con alcance «Ambos»");
      if (!ALCANCES.includes(v)) return c.fail(`alcance.${k}`, "Debe ser «Interno» o «Externo»");
      alcance[k] = v;
    });
  if (completar) {
    // Mismos valores por defecto que engine.evaluate (decisor ausente = 1, alcance ausente = Interno).
    DATA.factores.forEach((f) => {
      if (decisor[f.id] == null) decisor[f.id] = 1;
      if (f.alcance === "Ambos" && !alcance[f.id]) alcance[f.id] = "Interno";
    });
  }
  return { decisor: sortKeys(decisor), alcance: sortKeys(alcance) };
}

function sortKeys(obj) {
  const out = {};
  Object.keys(obj).sort().forEach((k) => (out[k] = obj[k]));
  return out;
}

const SOFTWARE_SNAPSHOT = { nombre: 120, version: 40, licencia: 60, proveedor: 120, organizacion: 150, evaluador: 120 };

/**
 * Evaluación completa (RF-10). `requireId=false` para evaluaciones enviadas
 * en línea a /api/ia/resumen.
 */
function evaluacion(body, { idFromUrl, requireId = true } = {}) {
  const c = new Checker();
  if (!c.isObject(body)) throw badRequest("El cuerpo debe ser un objeto JSON");
  let id = body.id;
  if (idFromUrl) {
    if (id != null && id !== idFromUrl) c.fail("id", "No coincide con el id de la URL");
    id = idFromUrl;
  }
  const out = { id: c.id(id, "id", { required: requireId }) };
  out.softwareId = c.id(body.softwareId, "softwareId", { required: false });

  const sw = {};
  if (body.software != null && !c.isObject(body.software)) c.fail("software", "Debe ser un objeto");
  Object.entries(SOFTWARE_SNAPSHOT).forEach(([k, max]) => (sw[k] = c.str(body.software || {}, k, `software.${k}`, { max })));
  out.software = sw;

  Object.assign(out, importancia(c, body));

  const subfactores = {};
  if (body.subfactores != null && !c.isObject(body.subfactores)) c.fail("subfactores", "Debe ser un objeto { 'F01-S01': 1..4 }");
  else
    Object.entries(body.subfactores || {}).forEach(([k, v]) => {
      if (!subfactorById.has(k)) return c.fail(`subfactores.${k}`, "Subfactor desconocido en el catálogo");
      if (v == null) return; // sin responder
      const n = c.int14(v, `subfactores.${k}`);
      if (n) subfactores[k] = n;
    });
  out.subfactores = sortKeys(subfactores);

  const observaciones = {};
  if (body.observaciones != null && !c.isObject(body.observaciones)) c.fail("observaciones", "Debe ser un objeto");
  else
    Object.entries(body.observaciones || {}).forEach(([k, v]) => {
      if (!subfactorById.has(k)) return c.fail(`observaciones.${k}`, "Subfactor desconocido en el catálogo");
      if (v == null) return;
      if (typeof v === "string") v = { texto: v };
      if (!c.isObject(v)) return c.fail(`observaciones.${k}`, "Debe ser { texto, enlace }");
      const texto = c.str(v, "texto", `observaciones.${k}.texto`, { max: 2000 });
      const enlace = c.url(v, "enlace", `observaciones.${k}.enlace`, 500);
      if (texto || enlace) observaciones[k] = { texto: texto || "", enlace: enlace || "" };
    });
  out.observaciones = sortKeys(observaciones);

  const origenIA = {};
  if (body.origenIA != null && !c.isObject(body.origenIA)) c.fail("origenIA", "Debe ser un objeto");
  else
    Object.entries(body.origenIA || {}).forEach(([k, v]) => {
      if (!subfactorById.has(k)) return c.fail(`origenIA.${k}`, "Subfactor desconocido en el catálogo");
      if (v == null) return;
      if (!c.isObject(v)) return c.fail(`origenIA.${k}`, "Debe ser { valor, confianza, justificacion }");
      const valor = c.int14(v.valor, `origenIA.${k}.valor`);
      const conf = v.confianza;
      if (typeof conf !== "number" || !(conf >= 0 && conf <= 1)) c.fail(`origenIA.${k}.confianza`, "Debe ser un número entre 0 y 1");
      const justificacion = c.str(v, "justificacion", `origenIA.${k}.justificacion`, { max: 400 });
      origenIA[k] = { valor, confianza: conf, justificacion };
    });
  out.origenIA = sortKeys(origenIA);

  if (body.resumen == null) out.resumen = null;
  else if (!c.isObject(body.resumen)) c.fail("resumen", "Debe ser un objeto o null");
  else
    out.resumen = {
      texto: c.str(body.resumen, "texto", "resumen.texto", { max: 6000 }),
      generadoIA: c.bool(body.resumen.generadoIA, "resumen.generadoIA"),
      fecha: c.iso(body.resumen.fecha, "resumen.fecha"),
    };

  if (body.plantilla == null) out.plantilla = null;
  else if (!c.isObject(body.plantilla)) c.fail("plantilla", "Debe ser un objeto o null");
  else
    out.plantilla = {
      id: c.id(body.plantilla.id, "plantilla.id", { required: false }),
      nombre: c.str(body.plantilla, "nombre", "plantilla.nombre", { max: 120 }),
    };

  out.paso1Confirmado = c.bool(body.paso1Confirmado, "paso1Confirmado");
  out.estado = body.estado == null ? "En proceso" : body.estado;
  if (!ESTADOS.includes(out.estado)) c.fail("estado", `Debe ser uno de: ${ESTADOS.join(", ")}`);
  out.catalogoVersion = c.str(body, "catalogoVersion", "catalogoVersion", { max: 20 }) || DATA.version;
  out.creadoEn = c.iso(body.creadoEn, "creadoEn");
  out.actualizadoEn = c.iso(body.actualizadoEn, "actualizadoEn");

  const rb = body.revisionBase == null ? 0 : body.revisionBase;
  if (!Number.isInteger(rb) || rb < 0) c.fail("revisionBase", "Debe ser un entero ≥ 0");
  out.revisionBase = rb;

  c.done("La evaluación no es válida");
  return out;
}

/** Plantilla de importancia (HU-37). */
function plantilla(body, { idFromUrl } = {}) {
  const c = new Checker();
  if (!c.isObject(body)) throw badRequest("El cuerpo debe ser un objeto JSON");
  let id = body.id;
  if (idFromUrl) {
    if (id != null && id !== idFromUrl) c.fail("id", "No coincide con el id de la URL");
    id = idFromUrl;
  }
  const out = {
    id: c.id(id, "id", { required: false }),
    nombre: c.str(body, "nombre", "nombre", { max: 120, required: true }),
  };
  Object.assign(out, importancia(c, body, { completar: false }));
  out.creadoEn = c.iso(body.creadoEn, "creadoEn");
  out.actualizadoEn = c.iso(body.actualizadoEn, "actualizadoEn");
  c.done("La plantilla no es válida");
  return out;
}

/** Nombre de organización de la cabecera X-Organizacion (texto libre ≤150). */
function organizacion(raw) {
  if (raw == null) return "Predeterminada";
  let v = String(raw);
  // Los navegadores no admiten caracteres fuera de ISO-8859-1 en cabeceras: se acepta URI-encoding.
  if (/%[0-9A-Fa-f]{2}/.test(v)) {
    try {
      v = decodeURIComponent(v);
    } catch {
      throw badRequest("Cabecera X-Organizacion mal codificada", [{ campo: "X-Organizacion", mensaje: "Codificación URI inválida" }]);
    }
  } else if (/[\u0080-ÿ]/.test(v)) {
    // Bytes UTF-8 interpretados como latin1 por Node: se reconstruyen.
    const fixed = Buffer.from(v, "latin1").toString("utf8");
    if (!fixed.includes("�")) v = fixed;
  }
  v = v.trim().replace(/\s+/g, " ");
  if (!v) return "Predeterminada";
  if (v.length > 150) throw badRequest("Organización demasiado larga", [{ campo: "X-Organizacion", mensaje: "Máximo 150 caracteres" }]);
  if (/[\u0000-\u001F\u007F]/.test(v)) throw badRequest("Organización inválida", [{ campo: "X-Organizacion", mensaje: "Contiene caracteres de control" }]);
  return v;
}

module.exports = { software, evaluacion, plantilla, organizacion, isValidId, Checker, ESTADOS, COLORS, sortKeys };
