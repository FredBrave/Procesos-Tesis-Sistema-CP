/**
 * Utilidades HTTP: errores con formato común, lectura del cuerpo con límite,
 * respuestas JSON/HTML y CORS.
 */
"use strict";

const MAX_BODY = 1024 * 1024; // 1 MB

/** Error de la API con código HTTP y formato { error: { codigo, mensaje, detalles? } }. */
class ApiError extends Error {
  constructor(status, codigo, mensaje, detalles, extra) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
    this.extra = extra; // campos adicionales al nivel raíz (p. ej. `servidor` en conflictos)
    this.headers = null;
  }
  toJSON() {
    const error = { codigo: this.codigo, mensaje: this.message };
    if (this.detalles && this.detalles.length) error.detalles = this.detalles;
    return Object.assign({ error }, this.extra || {});
  }
}

const badRequest = (mensaje, detalles) => new ApiError(400, "entrada_invalida", mensaje, detalles);
const notFound = (mensaje = "Recurso no encontrado") => new ApiError(404, "no_encontrado", mensaje);

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
};

function send(res, status, body, contentType, headers) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body == null ? "" : String(body), "utf8");
  res.writeHead(status, Object.assign({}, SECURITY_HEADERS, res.corsHeaders || {}, headers || {}, {
    "Content-Type": contentType,
    "Content-Length": buf.length,
  }));
  res.end(buf);
}

function sendJson(res, status, obj, headers) {
  send(res, status, JSON.stringify(obj), "application/json; charset=utf-8", headers);
}

function sendHtml(res, status, html, headers) {
  send(res, status, html, "text/html; charset=utf-8", Object.assign({
    // Defensa en profundidad contra XSS: el informe no ejecuta scripts ni carga recursos externos.
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'",
  }, headers || {}));
}

function sendError(res, err) {
  sendJson(res, err.status, err.toJSON(), err.headers || undefined);
}

/** Lee y parsea el cuerpo JSON. Lanza 413 si supera el límite y 400 si no es JSON. */
function readJson(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"]);
    if (declared > limit) {
      req.resume();
      return reject(new ApiError(413, "cuerpo_demasiado_grande", `El cuerpo supera el límite de ${limit} bytes`));
    }
    const chunks = [];
    let size = 0;
    let failed = false;
    req.on("data", (c) => {
      if (failed) return;
      size += c.length;
      if (size > limit) {
        failed = true;
        reject(new ApiError(413, "cuerpo_demasiado_grande", `El cuerpo supera el límite de ${limit} bytes`));
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (failed) return;
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text.trim()) return resolve(undefined);
      const ct = String(req.headers["content-type"] || "");
      if (ct && !/^application\/(.+\+)?json\b/i.test(ct)) {
        return reject(new ApiError(415, "tipo_no_soportado", "El cuerpo debe enviarse como application/json"));
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new ApiError(400, "json_invalido", "El cuerpo no es un JSON válido"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * CORS: la app se abre por file:// (Origin "null") o desde http://localhost:*.
 * Se añaden los orígenes de GUIOS_CORS (lista separada por comas).
 */
function corsHeadersFor(req, extraOrigins) {
  const origin = req.headers.origin;
  if (!origin) return {};
  const allowed =
    origin === "null" ||
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/i.test(origin) ||
    extraOrigins.includes(origin);
  if (!allowed) return { Vary: "Origin" };
  const h = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Organizacion",
    "Access-Control-Expose-Headers": "Retry-After",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
  // Chrome (Private Network Access) lo pide al llamar a localhost desde file://
  if (req.headers["access-control-request-private-network"] === "true") {
    h["Access-Control-Allow-Private-Network"] = "true";
  }
  return h;
}

module.exports = { ApiError, badRequest, notFound, send, sendJson, sendHtml, sendError, readJson, corsHeadersFor, MAX_BODY };
