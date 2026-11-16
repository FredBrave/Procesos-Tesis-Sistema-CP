// Utilidades comunes de las pruebas de la API: arrancan el servidor en un puerto libre con BD :memory:.
"use strict";

const { createServer } = require("../server");
const { DATA, engine } = require("../lib/catalog");

async function start(opciones = {}) {
  const server = createServer(Object.assign({ db: ":memory:", log: false, ia: { proveedor: "simulado" } }, opciones));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function req(method, path, body, headers = {}) {
    const init = { method, headers: Object.assign({}, headers) };
    if (body !== undefined && body !== null) {
      init.body = typeof body === "string" ? body : JSON.stringify(body);
      if (!init.headers["content-type"]) init.headers["content-type"] = "application/json";
    }
    const res = await fetch(base + path, init);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* no JSON (p. ej. informe HTML) */
    }
    return { status: res.status, headers: res.headers, text, json };
  }
  const close = () => new Promise((resolve) => server.close(resolve));
  return { server, base, req, close, store: server.store };
}

/** Estado completo con todos los subfactores = value (importancia sugerida como decisor). */
function fullState(value) {
  const st = engine.initialState(DATA);
  DATA.factores.forEach((f) => f.subfactores.forEach((s) => (st.subfactores[s.id] = value)));
  return st;
}

/** Cuerpo de evaluación listo para PUT. */
function evalBody(id, overrides = {}) {
  const st = fullState(4);
  return Object.assign(
    {
      id,
      softwareId: null,
      software: { nombre: "Moodle", version: "4.3", licencia: "FLOSS copyleft (GPL, AGPL)", proveedor: "Moodle HQ", organizacion: "UTP", evaluador: "Ana" },
      decisor: st.decisor,
      alcance: st.alcance,
      subfactores: st.subfactores,
      observaciones: {},
      origenIA: {},
      resumen: null,
      plantilla: null,
      paso1Confirmado: true,
      estado: "En proceso",
      catalogoVersion: DATA.version,
      revisionBase: 0,
    },
    overrides
  );
}

module.exports = { start, fullState, evalBody, DATA, engine };
