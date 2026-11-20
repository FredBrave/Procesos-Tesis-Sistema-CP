/**
 * GUIOS PRO — Cliente del servidor opcional (api/).
 *
 * La app funciona sin servidor (RNF-12). Si el usuario lo activa en Configuración:
 *   - sincroniza softwares, plantillas y evaluaciones (RF-30) con detección de conflictos;
 *   - habilita el asistente de IA (HU-16, HU-19, HU-20), cuya clave vive solo en el servidor.
 * Nunca se usa fetch() para leer archivos locales: solo para llamar a la API por HTTP.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GuiosApi = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const TIMEOUT = 8000;
  // Los modelos gratuitos de OpenRouter tardan 15-35 s y el servidor puede reintentar una vez.
  const IA_TIMEOUT = 180000;

  class ApiError extends Error {
    constructor(status, body) {
      super((body && body.error && body.error.mensaje) || (status ? `Error ${status} del servidor` : "No se pudo conectar con el servidor"));
      this.status = status;
      this.codigo = body && body.error && body.error.codigo;
      this.body = body;
    }
  }

  function client(cfg) {
    const base = String(cfg.url || "").replace(/\/+$/, "");

    async function request(method, path, body, timeout) {
      if (!base) throw new ApiError(0, null);
      const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), timeout || TIMEOUT) : null;
      let res;
      try {
        res = await fetch(base + path, {
          method,
          headers: Object.assign({ Accept: "application/json" }, body ? { "Content-Type": "application/json" } : {}, cfg.organizacion ? { "X-Organizacion": encodeURIComponent(cfg.organizacion) } : {}),
          body: body ? JSON.stringify(body) : undefined,
          signal: ctrl ? ctrl.signal : undefined,
        });
      } catch (err) {
        throw new ApiError(0, null);
      } finally {
        if (timer) clearTimeout(timer);
      }
      let data = null;
      try {
        data = await res.json();
      } catch (err) {
        data = null;
      }
      if (!res.ok) throw new ApiError(res.status, data);
      return data;
    }

    return {
      health: () => request("GET", "/api/salud", null, 4000),
      sugerencias: (body) => request("POST", "/api/ia/sugerencias", body, IA_TIMEOUT),
      resumen: (body) => request("POST", "/api/ia/resumen", body, IA_TIMEOUT),
      getEvaluation: (id) => request("GET", `/api/evaluaciones/${encodeURIComponent(id)}`),
      remove: (tipo, id) => request("DELETE", `/api/${tipo === "software" ? "softwares" : tipo === "plantilla" ? "plantillas" : "evaluaciones"}/${encodeURIComponent(id)}${tipo === "software" ? "?cascada=1" : ""}`),
      sync: (payload) => request("POST", "/api/sync", payload, 30000),
      reportUrl: (id) => `${base}/api/evaluaciones/${encodeURIComponent(id)}/informe`,
    };
  }

  function strip(x) {
    const c = JSON.parse(JSON.stringify(x));
    delete c.cambiosLocales;
    return c;
  }

  /**
   * Sincroniza el almacén local con el servidor. Muta `db` y devuelve un informe.
   * Regla: lo local con cambios se envía con su `revisionBase`; lo remoto más nuevo
   * solo reemplaza a lo local si lo local no tiene cambios pendientes. Los conflictos
   * se guardan en db.sync.conflictos para que el usuario decida (nunca se pierden en silencio).
   */
  async function syncDb(api, db, store, engine, base) {
    const report = { enviados: 0, recibidos: 0, conflictos: 0, errores: 0 };

    // 1. Borrados locales pendientes
    for (const del of db.sync.eliminados.slice()) {
      try {
        await api.remove(del.tipo, del.id);
      } catch (err) {
        if (err.status !== 404) {
          if (err.status === 0) throw err;
          continue;
        }
      }
      db.sync.eliminados = db.sync.eliminados.filter((x) => !(x.tipo === del.tipo && x.id === del.id));
    }

    // 2. Envío en lote de lo que tiene cambios
    const pendingConflict = new Set(db.sync.conflictos.map((c) => c.tipo + ":" + c.id));
    const dirty = (list, tipo) => list.filter((x) => x.cambiosLocales && !pendingConflict.has(tipo + ":" + x.id));
    const sent = {};
    const payload = {
      softwares: dirty(db.softwares, "software").map(strip),
      plantillas: dirty(db.plantillas, "plantilla").map(strip),
      evaluaciones: dirty(db.evaluaciones, "evaluacion").map((e) => Object.assign(strip(e), { revisionBase: e.revision || 0 })),
    };
    ["softwares", "plantillas", "evaluaciones"].forEach((k) => payload[k].forEach((x) => (sent[x.id] = x.actualizadoEn)));
    const res = await api.sync(payload);
    const list = (tipo) => (tipo === "software" ? db.softwares : tipo === "plantilla" ? db.plantillas : db.evaluaciones);

    (res.aceptados || []).forEach((a) => {
      const item = list(a.tipo).find((x) => x.id === a.id);
      if (!item) return;
      if (a.revision != null) item.revision = a.revision;
      if (item.actualizadoEn === sent[a.id]) item.cambiosLocales = false; // no cambió durante el envío
      report.enviados++;
    });
    (res.conflictos || []).forEach((c) => {
      db.sync.conflictos = db.sync.conflictos.filter((x) => !(x.tipo === c.tipo && x.id === c.id));
      db.sync.conflictos.push({ tipo: c.tipo, id: c.id, servidor: c.servidor, fecha: store.now() });
      report.conflictos++;
    });
    report.errores = (res.errores || []).length;
    db.sync.rechazados = (res.errores || []).map((e) => ({ tipo: e.tipo, id: e.id, mensaje: (e.error && e.error.mensaje) || "Rechazado por el servidor" }));

    // 3. Descarga de lo nuevo en el servidor
    const remote = res.servidor || {};
    const deleted = new Set(db.sync.eliminados.map((x) => x.tipo + ":" + x.id));
    (remote.softwares || []).forEach((r) => {
      if (deleted.has("software:" + r.id)) return;
      const local = db.softwares.find((x) => x.id === r.id);
      if (!local) {
        db.softwares.push(Object.assign(store.normalizeSoftware(r), { cambiosLocales: false }));
        report.recibidos++;
      } else if (!local.cambiosLocales && String(r.actualizadoEn) > String(local.actualizadoEn)) {
        Object.assign(local, store.normalizeSoftware(r), { cambiosLocales: false });
        report.recibidos++;
      }
    });
    (remote.plantillas || []).forEach((r) => {
      if (deleted.has("plantilla:" + r.id)) return;
      const local = db.plantillas.find((x) => x.id === r.id);
      if (!local) {
        db.plantillas.push(Object.assign(store.normalizeTemplate(r), { cambiosLocales: false }));
        report.recibidos++;
      } else if (!local.cambiosLocales && String(r.actualizadoEn) > String(local.actualizadoEn)) {
        Object.assign(local, store.normalizeTemplate(r), { cambiosLocales: false });
        report.recibidos++;
      }
    });
    for (const r of remote.evaluaciones || []) {
      if (deleted.has("evaluacion:" + r.id)) continue;
      const idx = db.evaluaciones.findIndex((x) => x.id === r.id);
      const local = idx >= 0 ? db.evaluaciones[idx] : null;
      if (local && (local.cambiosLocales || (r.revision || 0) <= (local.revision || 0))) continue;
      const full = await api.getEvaluation(r.id);
      const ev = Object.assign(store.normalizeEvaluation(engine, store.catalogFor(db, base, full.catalogoVersion), full), { revision: full.revision || 0, cambiosLocales: false });
      if (idx >= 0) db.evaluaciones[idx] = ev;
      else db.evaluaciones.push(ev);
      report.recibidos++;
    }

    db.sync.ultima = store.now();
    db.sync.error = null;
    return report;
  }

  /** Resuelve un conflicto: "servidor" adopta la versión remota; "local" la sobrescribe en el próximo envío. */
  function resolveConflict(db, store, engine, base, conflict, choice) {
    const listName = conflict.tipo === "software" ? "softwares" : conflict.tipo === "plantilla" ? "plantillas" : "evaluaciones";
    const list = db[listName];
    const idx = list.findIndex((x) => x.id === conflict.id);
    const remote = conflict.servidor || {};
    if (choice === "servidor") {
      let item;
      if (conflict.tipo === "evaluacion") item = store.normalizeEvaluation(engine, store.catalogFor(db, base, remote.catalogoVersion), remote);
      else if (conflict.tipo === "software") item = store.normalizeSoftware(remote);
      else item = store.normalizeTemplate(remote);
      Object.assign(item, { revision: remote.revision || 0, cambiosLocales: false });
      if (idx >= 0) list[idx] = item;
      else list.push(item);
    } else if (idx >= 0) {
      list[idx].revision = remote.revision || 0;
      list[idx].cambiosLocales = true;
    }
    db.sync.conflictos = db.sync.conflictos.filter((x) => !(x.tipo === conflict.tipo && x.id === conflict.id));
  }

  return { client, syncDb, resolveConflict, ApiError };
});
