#!/usr/bin/env node
/**
 * GUIOS PRO — Servidor REST (RF-10, RF-11, RF-28..30).
 * Sin dependencias: node:http + node:sqlite. El cálculo NO se reimplementa:
 * se usa app/js/engine.js con el catálogo app/js/data.js (RNF-11).
 *
 * Arranque:  node api/server.js        (PORT=8787 por defecto)
 * En pruebas: const { createServer } = require("./api/server"); createServer({ db: ":memory:" })
 */
"use strict";

const http = require("node:http");
const path = require("node:path");
const { DATA, engine, factorById } = require("./lib/catalog");
const { ApiError, badRequest, notFound, sendJson, sendHtml, sendError, readJson, corsHeadersFor } = require("./lib/http");
const V = require("./lib/validate");
const { Store } = require("./lib/store");
const { createIa, createProvider } = require("./lib/ia");
const report = require("./lib/report");

const VERSION = require("../package.json").version;
const DEFAULT_DB = path.join(__dirname, "data", "guiospro.db");

/** Rutas: [método, patrón, manejador]. Los parámetros :x se capturan en orden. */
function buildRoutes({ store, ia }) {
  const routes = [];
  const on = (method, pattern, handler) => {
    const keys = [];
    const re = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "/?$");
    routes.push({ method, re, keys, handler });
  };

  // --- Salud y catálogo (HU-23) -------------------------------------------
  on("GET", "/api/salud", () => ({ ok: true, version: VERSION, catalogoVersion: DATA.version, ia: ia.info() }));
  on("GET", "/api/catalogo", () => DATA);
  on("GET", "/api/catalogo/dimensiones", () => DATA.dimensiones);
  on("GET", "/api/catalogo/factores", ({ query }) => {
    const dim = query.get("dimension");
    return DATA.factores
      .filter((f) => !dim || f.dimension === dim)
      .map(({ subfactores, ...f }) => Object.assign(f, { subfactoresTotal: subfactores.length }));
  });
  on("GET", "/api/catalogo/factores/:id", ({ params }) => {
    const f = factorById.get(params.id);
    if (!f) throw notFound("Factor no encontrado");
    return f;
  });
  on("GET", "/api/catalogo/factores/:id/subfactores", ({ params }) => {
    const f = factorById.get(params.id);
    if (!f) throw notFound("Factor no encontrado");
    return f.subfactores;
  });

  // --- Softwares (HU-17) ---------------------------------------------------
  on("GET", "/api/softwares", ({ org, query }) => {
    const c = new V.Checker();
    const filtros = {
      q: c.str({ v: query.get("q") }, "v", "q", { max: 120 }),
      licencia: c.str({ v: query.get("licencia") }, "v", "licencia", { max: 60 }),
      etiqueta: c.str({ v: query.get("etiqueta") }, "v", "etiqueta", { max: 40 }),
    };
    c.done("Filtros inválidos");
    return store.listSoftwares(org, filtros);
  });
  on("POST", "/api/softwares", async ({ org, body }) => [201, store.createSoftware(org, V.software(await body()))]);
  on("GET", "/api/softwares/:id", ({ org, params }) => {
    const sw = store.getSoftware(org, checkId(params.id));
    if (!sw) throw notFound("Software no encontrado");
    return sw;
  });
  on("PUT", "/api/softwares/:id", async ({ org, params, body }) => {
    const r = store.upsertSoftware(org, V.software(await body(), { idFromUrl: checkId(params.id) }));
    return [r.creado ? 201 : 200, r.software];
  });
  on("DELETE", "/api/softwares/:id", ({ org, params, query }) => store.deleteSoftware(org, checkId(params.id), flag(query, "cascada")));

  // --- Evaluaciones (RF-10, RF-30) ---------------------------------------
  on("GET", "/api/evaluaciones", ({ org, query }) => {
    const c = new V.Checker();
    const filtros = {
      softwareId: c.id(query.get("softwareId"), "softwareId", { required: false }),
      estado: query.get("estado") || null,
      desde: c.iso(query.get("desde"), "desde"),
    };
    if (filtros.estado && !V.ESTADOS.includes(filtros.estado)) c.fail("estado", `Debe ser uno de: ${V.ESTADOS.join(", ")}`);
    c.done("Filtros inválidos");
    return store.listEvaluaciones(org, filtros);
  });
  on("GET", "/api/evaluaciones/:id", ({ org, params }) => {
    const ev = store.getEvaluacion(org, checkId(params.id));
    if (!ev) throw notFound("Evaluación no encontrada");
    return ev;
  });
  on("PUT", "/api/evaluaciones/:id", async ({ org, params, query, body }) => {
    const ev = V.evaluacion(await body(), { idFromUrl: checkId(params.id) });
    const r = store.saveEvaluacion(org, ev, { forzar: flag(query, "forzar") });
    return [r.creado ? 201 : 200, r.evaluacion];
  });
  on("DELETE", "/api/evaluaciones/:id", ({ org, params }) => store.deleteEvaluacion(org, checkId(params.id)));
  on("GET", "/api/evaluaciones/:id/informe", ({ org, orgName, params }) => {
    const ev = store.getEvaluacion(org, checkId(params.id));
    if (!ev) throw notFound("Evaluación no encontrada");
    return { html: report.render(ev, { organizacion: orgName }) };
  });

  // --- Sincronización en lote (RF-30, RNF-12) ------------------------------
  on("POST", "/api/sync", async ({ org, query, body }) => {
    const b = await body();
    if (!b || typeof b !== "object" || Array.isArray(b)) throw badRequest("El cuerpo debe ser un objeto { softwares, evaluaciones, plantillas }");
    const lists = {};
    for (const k of ["softwares", "evaluaciones", "plantillas"]) {
      if (b[k] != null && !Array.isArray(b[k])) throw badRequest(`«${k}» debe ser una lista`, [{ campo: k, mensaje: "Debe ser una lista" }]);
      if ((b[k] || []).length > 1000) throw badRequest(`«${k}» admite como máximo 1000 elementos por lote`, [{ campo: k, mensaje: "Máximo 1000" }]);
      lists[k] = b[k] || [];
    }
    const forzar = flag(query, "forzar");
    const aceptados = [];
    const conflictos = [];
    const errores = [];
    const run = (tipo, item, fn) => {
      const id = item && typeof item === "object" ? item.id : undefined;
      try {
        if (!V.isValidId(id)) throw badRequest("Cada elemento del lote necesita un «id» válido", [{ campo: "id", mensaje: "Identificador inválido" }]);
        aceptados.push(Object.assign({ tipo, id }, fn(item)));
      } catch (e) {
        if (!(e instanceof ApiError)) throw e;
        if (e.codigo === "conflicto") conflictos.push({ tipo, id, servidor: e.extra.servidor });
        else errores.push({ tipo, id: id == null ? null : String(id).slice(0, 64), error: e.toJSON().error });
      }
    };
    // Primero softwares y plantillas: las evaluaciones pueden referenciarlos.
    lists.softwares.forEach((it) => run("software", it, (x) => (store.upsertSoftware(org, V.software(x)), { revision: null })));
    lists.plantillas.forEach((it) => run("plantilla", it, (x) => (store.upsertPlantilla(org, V.plantilla(x)), { revision: null })));
    lists.evaluaciones.forEach((it) =>
      run("evaluacion", it, (x) => ({ revision: store.saveEvaluacion(org, V.evaluacion(x), { forzar }).evaluacion.revision }))
    );
    return {
      aceptados,
      conflictos,
      errores,
      servidor: { softwares: store.listSoftwares(org), evaluaciones: store.listEvaluaciones(org), plantillas: store.listPlantillas(org) },
    };
  });

  // --- Plantillas de importancia (HU-37) -----------------------------------
  on("GET", "/api/plantillas", ({ org }) => store.listPlantillas(org));
  on("POST", "/api/plantillas", async ({ org, body }) => [201, store.createPlantilla(org, V.plantilla(await body()))]);
  on("GET", "/api/plantillas/:id", ({ org, params }) => {
    const r = store.plantillaRow(org, checkId(params.id));
    if (!r) throw notFound("Plantilla no encontrada");
    return Store.plantillaFromRow(r);
  });
  on("PUT", "/api/plantillas/:id", async ({ org, params, body }) => {
    const r = store.upsertPlantilla(org, V.plantilla(await body(), { idFromUrl: checkId(params.id) }));
    return [r.creado ? 201 : 200, r.plantilla];
  });
  on("DELETE", "/api/plantillas/:id", ({ org, params }) => store.deletePlantilla(org, checkId(params.id)));

  // --- Dashboard (HU-30) y comparación (HU-31) -----------------------------
  on("GET", "/api/dashboard", ({ org, query }) => {
    const c = new V.Checker();
    const softwareId = c.id(query.get("softwareId"), "softwareId", { required: false });
    c.done("Filtros inválidos");
    return store.dashboard(org, { softwareId });
  });
  on("GET", "/api/comparar", ({ org, query }) => {
    const ids = [...new Set((query.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean))];
    if (ids.length < 2 || ids.length > 5) {
      throw new ApiError(422, "cantidad_invalida", "Indica entre 2 y 5 evaluaciones distintas en «ids» (separadas por comas)", [{ campo: "ids", mensaje: `Recibidas: ${ids.length}` }]);
    }
    ids.forEach((id) => checkId(id));
    const evs = ids.map((id) => {
      const ev = store.getEvaluacion(org, id);
      if (!ev) throw notFound(`Evaluación no encontrada: ${id}`);
      return ev;
    });
    // Filas comparables (con `mejor`) calculadas por engine.compare, igual que en el navegador.
    const filas = engine.compare(evs.map((ev) => ({ id: ev.id, software: ev.software.nombre || "", result: ev.resultado })));
    return {
      dimensiones: filas.dimensiones,
      factores: filas.factores,
      evaluaciones: evs.map((ev) => {
        const r = ev.resultado;
        return {
          id: ev.id,
          softwareId: ev.softwareId,
          software: { nombre: ev.software.nombre || "", version: ev.software.version || "" },
          estado: ev.estado,
          actualizadoEn: ev.actualizadoEn,
          recomendacion: r.recomendacion ? r.recomendacion.codigo : null,
          foda: r.foda,
          pendientes: r.pendientes,
          dimensiones: r.dimensiones.map((d) => ({ id: d.id, nombre: d.nombre, ponderacion: d.ponderacion, factoresEvaluados: d.factoresEvaluados })),
          factores: r.factores.map((f) => ({
            id: f.id,
            nombre: f.nombre,
            dimension: f.dimension,
            ponderacion: f.ponderacion,
            foda: f.foda,
            importanciaRelativa: f.importanciaRelativa,
            relevante: f.relevante,
          })),
        };
      }),
    };
  });

  // --- Asistente de IA (M7) -------------------------------------------------
  on("POST", "/api/ia/sugerencias", async ({ org, body }) => ia.sugerencias(org, await body()));
  on("POST", "/api/ia/resumen", async ({ org, body }) => ia.resumen(org, await body()));

  return routes;
}

function checkId(id) {
  if (!V.isValidId(id)) throw badRequest("Identificador inválido en la URL", [{ campo: "id", mensaje: "1..64 caracteres: letras, dígitos, _ o -" }]);
  return id;
}

const flag = (query, k) => ["1", "true", "si", "sí"].includes(String(query.get(k) || "").toLowerCase());

/**
 * Crea el servidor HTTP (sin escuchar todavía).
 * @param {object} opciones
 *   db         ruta del archivo SQLite o ":memory:" (por defecto GUIOS_DB o api/data/guiospro.db)
 *   cors       orígenes adicionales permitidos (por defecto GUIOS_CORS)
 *   ia         { proveedor, apiKey, modelo, esfuerzo, limiteDiario, fetch, timeoutMs }
 *   log        función de registro (false para silenciar)
 */
function createServer(opciones = {}) {
  const env = process.env;
  const store = new Store(opciones.db || env.GUIOS_DB || DEFAULT_DB);
  const iaCfg = Object.assign(
    {
      proveedor: env.IA_PROVEEDOR,
      apiKey: env.ANTHROPIC_API_KEY,
      openrouterKey: env.OPENROUTER_API_KEY,
      modelo: env.IA_MODELO,
      esfuerzo: env.IA_ESFUERZO,
      limiteDiario: env.IA_LIMITE_DIARIO ? Number(env.IA_LIMITE_DIARIO) : 100,
    },
    opciones.ia || {}
  );
  const ia = createIa({ provider: createProvider(iaCfg), store, limiteDiario: Number.isFinite(iaCfg.limiteDiario) ? iaCfg.limiteDiario : 100 });
  const extraOrigins = opciones.cors || (env.GUIOS_CORS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const log = opciones.log === undefined ? () => {} : opciones.log || (() => {});
  const routes = buildRoutes({ store, ia });

  const server = http.createServer(async (req, res) => {
    const t0 = process.hrtime.bigint();
    res.corsHeaders = corsHeadersFor(req, extraOrigins);
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      url = new URL("http://localhost/");
    }
    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204, Object.assign({ "Content-Length": 0 }, res.corsHeaders));
        return res.end();
      }
      const matches = routes.filter((r) => r.re.test(url.pathname));
      if (!matches.length) {
        if (url.pathname === "/" && req.method === "GET") return sendJson(res, 200, { nombre: "GUIOS PRO API", version: VERSION, salud: "/api/salud", documentacion: "api/openapi.yaml" });
        throw notFound(`No existe la ruta ${url.pathname}`);
      }
      const route = matches.find((r) => r.method === req.method || (req.method === "HEAD" && r.method === "GET"));
      if (!route) {
        const err = new ApiError(405, "metodo_no_permitido", `Método ${req.method} no permitido en ${url.pathname}`);
        err.headers = { Allow: [...new Set(matches.map((r) => r.method))].join(", ") };
        throw err;
      }
      const m = route.re.exec(url.pathname);
      const params = {};
      route.keys.forEach((k, i) => {
        try {
          params[k] = decodeURIComponent(m[i + 1]);
        } catch {
          params[k] = m[i + 1];
        }
      });
      const orgName = V.organizacion(req.headers["x-organizacion"]);
      const org = store.orgId(orgName);
      const ctx = { req, params, query: url.searchParams, org, orgName, body: () => readJson(req) };
      let out = await route.handler(ctx);
      let status = 200;
      if (Array.isArray(out) && typeof out[0] === "number") [status, out] = out;
      if (out && typeof out.html === "string") sendHtml(res, status, out.html);
      else sendJson(res, status, out);
    } catch (e) {
      if (e instanceof ApiError) sendError(res, e);
      else {
        console.error("[guios-api] error interno:", e && e.stack ? e.stack : e);
        sendError(res, new ApiError(500, "error_interno", "Error interno del servidor"));
      }
    } finally {
      // Registro mínimo: nunca cabeceras ni cuerpos (no hay claves ni datos personales en el log).
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      log(`${req.method} ${url.pathname} ${res.statusCode} ${ms.toFixed(1)}ms`);
    }
  });
  server.store = store;
  server.ia = ia;
  server.on("close", () => {
    try {
      store.close();
    } catch {
      /* ya cerrada */
    }
  });
  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 8787;
  const host = process.env.HOST || "127.0.0.1";
  const server = createServer({ log: (l) => console.log(l) });
  server.listen(port, host, () => {
    const info = server.ia.info();
    console.log(`GUIOS PRO API escuchando en http://${host}:${port}/api  (IA: ${info.disponible ? info.proveedor : "no disponible"})`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

module.exports = { createServer, VERSION };
