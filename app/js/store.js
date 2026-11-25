/**
 * GUIOS PRO — Almacén local (sin DOM).
 *
 * Guarda en un único objeto («db») todo lo que la app persiste en el navegador:
 *   config       datos de la organización y preferencias (HU-24)
 *   softwares    catálogo de softwares candidatos (HU-18, HU-36, HU-39)
 *   evaluaciones evaluaciones guardadas (HU-27, HU-34); `activa` es la que se edita
 *   plantillas   plantillas de importancia del paso 1 (HU-37)
 *   catalogos    versiones locales de la guía editadas en Administración (HU-10)
 *   sync         estado de la sincronización con el servidor opcional (RF-30)
 *
 * Las funciones son puras sobre `db` salvo `load`/`persist`, que reciben el storage.
 * Funciona en navegador (window.GuiosStore) y en Node (module.exports) para tests.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GuiosStore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DB_KEY = "guiospro.db.v2";
  const LEGACY_KEY = "guiospro.state.v1";
  const ESTADOS = ["En proceso", "Completada", "Cancelada"];
  const COLORES = ["primary", "success", "warning", "danger", "info", "neutral"];
  const SOFTWARE_FIELDS = ["nombre", "version", "licencia", "proveedor", "organizacion", "evaluador"];

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */
  function uid(prefix) {
    const rnd = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${Date.now().toString(36)}${rnd}`;
  }
  function now() {
    return new Date().toISOString();
  }
  function clone(x) {
    return x == null ? x : JSON.parse(JSON.stringify(x));
  }
  function str(v, max) {
    return String(v == null ? "" : v).trim().slice(0, max || 500);
  }
  function isObj(x) {
    return !!x && typeof x === "object" && !Array.isArray(x);
  }
  /** Solo enlaces http(s): evita `javascript:` y similares en las evidencias. */
  function safeUrl(u) {
    const s = str(u, 500);
    return /^https?:\/\/[^\s]+$/i.test(s) ? s : "";
  }

  /* ------------------------------------------------------------------ */
  /* Estructura                                                          */
  /* ------------------------------------------------------------------ */
  /**
   * Datos por defecto de la organización: el piloto de validación de la tesis (Rea Sánchez, 2022),
   * hecho en la Universidad Estatal de Milagro con la Dirección de TICs como evaluadora.
   */
  const ORGANIZACION_TESIS = {
    nombre: "Universidad Estatal de Milagro",
    sector: "Educación superior",
    logo: "img/logo-unemi.png",
  };
  const EVALUADOR_TESIS = "Dirección de TICs";
  /** Software evaluado en ese piloto: primer elemento del catálogo de softwares. */
  const SOFTWARE_TESIS = {
    id: "sw_tesis_libreoffice",
    nombre: "LibreOffice",
    version: "",
    licencia: "FLOSS copyleft débil (LGPL, MPL)",
    proveedor: "The Document Foundation",
    url: "https://www.libreoffice.org",
    notas: "Suite ofimática evaluada en el piloto de validación de la guía GUIOS en la Universidad Estatal de Milagro, con la Dirección de TICs, según la tesis de Rea Sánchez de 2022.",
    etiquetas: [
      { nombre: "Ofimática", color: "primary" },
      { nombre: "Caso de la tesis", color: "success" },
    ],
  };

  function emptyDb(base) {
    return {
      version: 2,
      catalogoInicial: true, // el software de la tesis ya está en el catálogo; no se vuelve a añadir si se borra
      config: {
        organizacion: Object.assign({}, ORGANIZACION_TESIS),
        evaluadorPorDefecto: EVALUADOR_TESIS,
        tema: "sistema",
        servidor: { url: "http://localhost:8787", activo: false },
        guardada: false, // pasa a true al guardar la configuración: desde entonces no se rellenan valores por defecto
      },
      softwares: [normalizeSoftware(SOFTWARE_TESIS)],
      evaluaciones: [],
      activa: null,
      plantillas: [],
      catalogos: [],
      catalogoActivo: base.version,
      sync: { ultima: null, conflictos: [], eliminados: [], error: null },
    };
  }

  /** Evaluación nueva, vacía, con la importancia sugerida del catálogo indicado. */
  function newEvaluation(engine, data, opts) {
    const o = opts || {};
    const st = engine.initialState(data);
    const ts = now();
    return {
      id: uid("ev"),
      softwareId: o.softwareId || null,
      software: Object.assign(st.software, o.software || {}),
      decisor: st.decisor,
      alcance: st.alcance,
      subfactores: {},
      observaciones: {},
      origenIA: {},
      resumen: null,
      plantilla: null,
      paso1Confirmado: false,
      estado: "En proceso",
      catalogoVersion: data.version,
      creadoEn: ts,
      actualizadoEn: ts,
      completadoEn: null,
      revision: 0,
      cambiosLocales: true,
    };
  }

  /**
   * Normaliza una evaluación de origen externo (importación, servidor, versión anterior):
   * descarta claves desconocidas y valores fuera de escala.
   */
  function normalizeEvaluation(engine, data, raw) {
    const ev = newEvaluation(engine, data, {});
    if (!isObj(raw)) return ev;
    if (typeof raw.id === "string" && /^[\w-]{3,64}$/.test(raw.id)) ev.id = raw.id;
    if (typeof raw.softwareId === "string") ev.softwareId = raw.softwareId;
    if (isObj(raw.software)) SOFTWARE_FIELDS.forEach((k) => (ev.software[k] = str(raw.software[k], 150)));
    const level = (v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 4 ? n : null;
    };
    if (isObj(raw.decisor)) Object.keys(raw.decisor).forEach((k) => level(raw.decisor[k]) && (ev.decisor[k] = level(raw.decisor[k])));
    if (isObj(raw.alcance)) {
      Object.keys(raw.alcance).forEach((k) => {
        if (raw.alcance[k] === "Interno" || raw.alcance[k] === "Externo") ev.alcance[k] = raw.alcance[k];
      });
    }
    if (isObj(raw.subfactores)) Object.keys(raw.subfactores).forEach((k) => level(raw.subfactores[k]) && (ev.subfactores[k] = level(raw.subfactores[k])));
    if (isObj(raw.observaciones)) {
      Object.keys(raw.observaciones).forEach((k) => {
        const o = raw.observaciones[k];
        if (!isObj(o)) return;
        const texto = str(o.texto, 2000);
        const enlace = safeUrl(o.enlace);
        if (texto || enlace) ev.observaciones[k] = { texto, enlace };
      });
    }
    if (isObj(raw.origenIA)) {
      Object.keys(raw.origenIA).forEach((k) => {
        const o = raw.origenIA[k];
        if (isObj(o) && level(o.valor)) ev.origenIA[k] = { valor: level(o.valor), confianza: Math.max(0, Math.min(1, Number(o.confianza) || 0)), justificacion: str(o.justificacion, 400) };
      });
    }
    if (isObj(raw.resumen) && str(raw.resumen.texto, 4000)) {
      ev.resumen = { texto: str(raw.resumen.texto, 4000), generadoIA: !!raw.resumen.generadoIA, fecha: str(raw.resumen.fecha, 40) || now() };
    }
    if (isObj(raw.plantilla) && raw.plantilla.id) ev.plantilla = { id: str(raw.plantilla.id, 64), nombre: str(raw.plantilla.nombre, 80) };
    ev.paso1Confirmado = !!raw.paso1Confirmado || Object.keys(ev.subfactores).length > 0;
    if (ESTADOS.includes(raw.estado)) ev.estado = raw.estado;
    if (typeof raw.catalogoVersion === "string") ev.catalogoVersion = str(raw.catalogoVersion, 40);
    ["creadoEn", "actualizadoEn", "completadoEn"].forEach((k) => {
      if (typeof raw[k] === "string" && !Number.isNaN(Date.parse(raw[k]))) ev[k] = raw[k];
    });
    ev.revision = Number.isInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0;
    ev.cambiosLocales = raw.cambiosLocales !== false;
    return ev;
  }

  function normalizeSoftware(raw) {
    const ts = now();
    const sw = { id: uid("sw"), nombre: "", version: "", licencia: "", proveedor: "", url: "", notas: "", etiquetas: [], creadoEn: ts, actualizadoEn: ts, cambiosLocales: true };
    if (!isObj(raw)) return sw;
    if (typeof raw.id === "string" && /^[\w-]{3,64}$/.test(raw.id)) sw.id = raw.id;
    sw.nombre = str(raw.nombre, 120);
    sw.version = str(raw.version, 40);
    sw.licencia = str(raw.licencia, 60);
    sw.proveedor = str(raw.proveedor, 120);
    sw.url = safeUrl(raw.url);
    sw.notas = str(raw.notas, 4000);
    sw.etiquetas = normalizeTags(raw.etiquetas);
    ["creadoEn", "actualizadoEn"].forEach((k) => {
      if (typeof raw[k] === "string" && !Number.isNaN(Date.parse(raw[k]))) sw[k] = raw[k];
    });
    sw.cambiosLocales = raw.cambiosLocales !== false;
    return sw;
  }

  function normalizeTags(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
      .map((t) => (typeof t === "string" ? { nombre: t } : t))
      .filter(isObj)
      .map((t) => ({ nombre: str(t.nombre, 30), color: COLORES.includes(t.color) ? t.color : "neutral" }))
      .filter((t) => {
        const k = t.nombre.toLowerCase();
        if (!t.nombre || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 12);
  }

  function normalizeTemplate(raw) {
    const ts = now();
    const pl = { id: uid("pl"), nombre: "", decisor: {}, alcance: {}, creadoEn: ts, actualizadoEn: ts, cambiosLocales: true };
    if (!isObj(raw)) return pl;
    if (typeof raw.id === "string" && /^[\w-]{3,64}$/.test(raw.id)) pl.id = raw.id;
    pl.nombre = str(raw.nombre, 80);
    if (isObj(raw.decisor)) {
      Object.keys(raw.decisor).forEach((k) => {
        const n = Number(raw.decisor[k]);
        if (Number.isInteger(n) && n >= 1 && n <= 4) pl.decisor[k] = n;
      });
    }
    if (isObj(raw.alcance)) {
      Object.keys(raw.alcance).forEach((k) => {
        if (raw.alcance[k] === "Interno" || raw.alcance[k] === "Externo") pl.alcance[k] = raw.alcance[k];
      });
    }
    ["creadoEn", "actualizadoEn"].forEach((k) => {
      if (typeof raw[k] === "string" && !Number.isNaN(Date.parse(raw[k]))) pl[k] = raw[k];
    });
    pl.cambiosLocales = raw.cambiosLocales !== false;
    return pl;
  }

  /* ------------------------------------------------------------------ */
  /* Carga, migración y guardado                                         */
  /* ------------------------------------------------------------------ */
  /**
   * Lee el almacén. Si solo existe el estado de la versión 1 (una evaluación),
   * lo convierte en la primera evaluación guardada y registra su software.
   */
  function load(storage, engine, base) {
    let db = null;
    try {
      const raw = storage && storage.getItem(DB_KEY);
      if (raw) db = JSON.parse(raw);
    } catch (err) {
      db = null;
    }
    if (db && db.version === 2) return repair(db, engine, base);
    db = emptyDb(base);
    try {
      const legacy = storage && storage.getItem(LEGACY_KEY);
      if (legacy) migrateV1(db, engine, base, JSON.parse(legacy));
    } catch (err) {
      /* estado antiguo corrupto: se empieza de cero */
    }
    return db;
  }

  function migrateV1(db, engine, base, old) {
    const ev = normalizeEvaluation(engine, base, old);
    if (!hasData(ev)) return db;
    if (ev.software.nombre) {
      let sw = softwareByName(db, ev.software.nombre);
      if (!sw) {
        sw = normalizeSoftware(ev.software);
        db.softwares.push(sw);
      }
      ev.softwareId = sw.id;
    }
    if (ev.software.organizacion) db.config.organizacion.nombre = ev.software.organizacion;
    if (ev.software.evaluador) db.config.evaluadorPorDefecto = ev.software.evaluador;
    db.evaluaciones.push(ev);
    db.activa = ev.id;
    return db;
  }

  /** Completa claves que falten en un almacén guardado (versiones intermedias). */
  function repair(db, engine, base) {
    const fresh = emptyDb(base);
    db.config = Object.assign(fresh.config, db.config || {});
    db.config.organizacion = Object.assign(emptyDb(base).config.organizacion, db.config.organizacion || {});
    db.config.servidor = Object.assign(emptyDb(base).config.servidor, db.config.servidor || {});
    // Mientras la configuración no se haya guardado nunca, los campos vacíos toman los datos de la tesis.
    if (!db.config.guardada) {
      Object.keys(ORGANIZACION_TESIS).forEach((k) => db.config.organizacion[k] || (db.config.organizacion[k] = ORGANIZACION_TESIS[k]));
      if (!db.config.evaluadorPorDefecto) db.config.evaluadorPorDefecto = EVALUADOR_TESIS;
    }
    ["softwares", "evaluaciones", "plantillas", "catalogos"].forEach((k) => Array.isArray(db[k]) || (db[k] = []));
    db.sync = Object.assign(fresh.sync, db.sync || {});
    if (!db.catalogoActivo) db.catalogoActivo = base.version;
    // Almacenes creados antes de que existiera el catálogo inicial: se añade una sola vez.
    if (!db.catalogoInicial) {
      if (!softwareByName(db, SOFTWARE_TESIS.nombre)) db.softwares.unshift(normalizeSoftware(SOFTWARE_TESIS));
      db.catalogoInicial = true;
    }
    if (db.activa && !db.evaluaciones.some((e) => e.id === db.activa)) db.activa = null;
    return db;
  }

  /** Persiste el almacén. Devuelve false si el navegador no lo permite (modo privado, cuota). */
  function persist(storage, db) {
    try {
      storage.setItem(DB_KEY, JSON.stringify(db));
      return true;
    } catch (err) {
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Consultas                                                           */
  /* ------------------------------------------------------------------ */
  /**
   * ¿La evaluación tiene datos propios? La organización y el evaluador no cuentan: se rellenan solos
   * con la configuración, y una evaluación vacía no debe aparecer como «en proceso».
   */
  const OWN_FIELDS = ["nombre", "version", "licencia", "proveedor"];
  function hasData(ev) {
    return !!ev && (Object.keys(ev.subfactores || {}).length > 0 || !!ev.paso1Confirmado || OWN_FIELDS.some((k) => ev.software && ev.software[k]));
  }

  /** Catálogo con el que se hizo una evaluación (RN-08): la base o una versión local. */
  function catalogFor(db, base, version) {
    if (!version || version === base.version) return base;
    const c = db.catalogos.find((x) => x.version === version);
    return c ? c.data : base;
  }
  function activeCatalog(db, base) {
    return catalogFor(db, base, db.catalogoActivo);
  }

  /** Estado derivado de una evaluación; «Cancelada» solo cambia si el usuario la reactiva. */
  function deriveStatus(engine, data, ev) {
    if (ev.estado === "Cancelada") return "Cancelada";
    return engine.progress(engine.evaluate(data, ev)).complete ? "Completada" : "En proceso";
  }

  function findSoftware(db, id) {
    return db.softwares.find((s) => s.id === id) || null;
  }
  function softwareByName(db, nombre) {
    const k = str(nombre, 120).toLowerCase();
    return k ? db.softwares.find((s) => s.nombre.toLowerCase() === k) || null : null;
  }

  /* ------------------------------------------------------------------ */
  /* Versiones del catálogo de la guía                                   */
  /* ------------------------------------------------------------------ */
  /** Publica una versión local nueva del catálogo y la deja activa. */
  function addCatalogVersion(db, base, data, nota) {
    const n = db.catalogos.length + 1;
    const version = `${base.version}-org.${n}`;
    const copy = clone(data);
    copy.version = version;
    db.catalogos.push({ version, fecha: now(), nota: str(nota, 200), data: copy });
    db.catalogoActivo = version;
    return version;
  }

  /** Siguiente id libre de subfactor de un factor (no reutiliza ids de subfactores borrados). */
  function nextSubfactorId(db, base, factorId) {
    let max = 0;
    [base].concat(db.catalogos.map((c) => c.data)).forEach((cat) => {
      const f = cat.factores.find((x) => x.id === factorId);
      (f ? f.subfactores : []).forEach((s) => {
        const m = /-S(\d+)$/.exec(s.id);
        if (m) max = Math.max(max, Number(m[1]));
      });
    });
    return `${factorId}-S${String(max + 1).padStart(2, "0")}`;
  }

  /* ------------------------------------------------------------------ */
  /* Operaciones                                                         */
  /* ------------------------------------------------------------------ */
  function duplicateEvaluation(db, ev) {
    const copy = clone(ev);
    const ts = now();
    Object.assign(copy, { id: uid("ev"), creadoEn: ts, actualizadoEn: ts, completadoEn: null, revision: 0, cambiosLocales: true, estado: "En proceso", resumen: null });
    db.evaluaciones.push(copy);
    return copy;
  }

  function removeEvaluation(db, id) {
    const before = db.evaluaciones.length;
    db.evaluaciones = db.evaluaciones.filter((e) => e.id !== id);
    if (db.activa === id) db.activa = null;
    if (before !== db.evaluaciones.length) db.sync.eliminados.push({ tipo: "evaluacion", id });
  }

  /** Borra un software; con `cascade` también sus evaluaciones (si no, quedan sin vincular). */
  function removeSoftware(db, id, cascade) {
    db.softwares = db.softwares.filter((s) => s.id !== id);
    db.evaluaciones.slice().forEach((e) => {
      if (e.softwareId !== id) return;
      if (cascade) removeEvaluation(db, e.id);
      else e.softwareId = null;
    });
    db.sync.eliminados.push({ tipo: "software", id });
  }

  function removeTemplate(db, id) {
    db.plantillas = db.plantillas.filter((p) => p.id !== id);
    db.sync.eliminados.push({ tipo: "plantilla", id });
  }

  /* ------------------------------------------------------------------ */
  /* Portabilidad: exportar e importar (HU-38, RF-26)                    */
  /* ------------------------------------------------------------------ */
  const PACKAGE_FORMAT = "guiospro-paquete";

  function strip(x) {
    const c = clone(x);
    delete c.cambiosLocales;
    return c;
  }

  /** Paquete JSON con los elementos seleccionados (listas de ids; `true` = todos). */
  function exportPackage(db, sel) {
    const pick = (list, ids) => list.filter((x) => ids === true || (Array.isArray(ids) && ids.includes(x.id))).map(strip);
    const evaluaciones = pick(db.evaluaciones, sel.evaluaciones);
    const versions = new Set(evaluaciones.map((e) => e.catalogoVersion));
    return {
      app: "GUIOS PRO",
      formato: PACKAGE_FORMAT,
      version: 2,
      exportado: now(),
      softwares: pick(db.softwares, sel.softwares),
      plantillas: pick(db.plantillas, sel.plantillas),
      evaluaciones,
      catalogos: db.catalogos.filter((c) => versions.has(c.version)).map(clone),
    };
  }

  /**
   * Convierte un JSON importado en un paquete normalizado.
   * Acepta el paquete v2 y la exportación de una evaluación de la versión 1.
   */
  function parsePackage(engine, base, json) {
    if (!isObj(json)) throw new Error("formato");
    if (json.formato === PACKAGE_FORMAT) {
      const catalogos = (Array.isArray(json.catalogos) ? json.catalogos : []).filter((c) => isObj(c) && typeof c.version === "string" && engine.validateCatalog(c.data).length === 0);
      const catFor = (v) => (catalogos.find((c) => c.version === v) || {}).data || base;
      return {
        softwares: (json.softwares || []).map(normalizeSoftware).filter((s) => s.nombre),
        plantillas: (json.plantillas || []).map(normalizeTemplate).filter((p) => p.nombre),
        evaluaciones: (json.evaluaciones || []).map((e) => normalizeEvaluation(engine, catFor(e && e.catalogoVersion), e)),
        catalogos,
      };
    }
    const src = json.estado || json;
    if (!isObj(src.decisor) || !isObj(src.subfactores)) throw new Error("formato");
    const ev = normalizeEvaluation(engine, base, Object.assign({}, src, { software: json.software, paso1Confirmado: true }));
    const softwares = [];
    if (ev.software.nombre) {
      const sw = normalizeSoftware(ev.software);
      ev.softwareId = sw.id;
      softwares.push(sw);
    }
    return { softwares, plantillas: [], evaluaciones: [ev], catalogos: [] };
  }

  /** Vista previa: qué elementos son nuevos y cuáles ya existen (mismo id o mismo nombre de software). */
  function previewImport(db, pkg) {
    const items = [];
    pkg.softwares.forEach((s) => {
      const dup = findSoftware(db, s.id) || softwareByName(db, s.nombre);
      items.push({ tipo: "software", id: s.id, nombre: s.nombre, duplicado: !!dup, existente: dup ? dup.id : null });
    });
    pkg.plantillas.forEach((p) => {
      const dup = db.plantillas.find((x) => x.id === p.id || x.nombre.toLowerCase() === p.nombre.toLowerCase());
      items.push({ tipo: "plantilla", id: p.id, nombre: p.nombre, duplicado: !!dup, existente: dup ? dup.id : null });
    });
    pkg.evaluaciones.forEach((e) => {
      const dup = db.evaluaciones.find((x) => x.id === e.id);
      items.push({ tipo: "evaluacion", id: e.id, nombre: e.software.nombre || "Software sin nombre", fecha: e.actualizadoEn, duplicado: !!dup, existente: dup ? dup.id : null });
    });
    return items;
  }

  /**
   * Aplica la importación. `mode` resuelve los duplicados:
   *   "omitir"     conserva lo que ya hay
   *   "reemplazar" sustituye lo existente por lo importado
   *   "copia"      importa con un id nuevo (y « (copia)» en el nombre del software/plantilla)
   */
  function applyImport(db, pkg, mode) {
    const counts = { nuevos: 0, reemplazados: 0, copias: 0, omitidos: 0 };
    const swMap = {};
    pkg.catalogos.forEach((c) => {
      if (!db.catalogos.some((x) => x.version === c.version)) db.catalogos.push(clone(c));
    });
    pkg.softwares.forEach((s) => {
      const dup = findSoftware(db, s.id) || softwareByName(db, s.nombre);
      if (!dup) {
        db.softwares.push(Object.assign(clone(s), { cambiosLocales: true }));
        swMap[s.id] = s.id;
        counts.nuevos++;
      } else if (mode === "reemplazar") {
        Object.assign(dup, clone(s), { id: dup.id, actualizadoEn: now(), cambiosLocales: true });
        swMap[s.id] = dup.id;
        counts.reemplazados++;
      } else if (mode === "copia") {
        const copy = Object.assign(clone(s), { id: uid("sw"), nombre: `${s.nombre} (copia)`.slice(0, 120), cambiosLocales: true });
        db.softwares.push(copy);
        swMap[s.id] = copy.id;
        counts.copias++;
      } else {
        swMap[s.id] = dup.id;
        counts.omitidos++;
      }
    });
    pkg.plantillas.forEach((p) => {
      const dup = db.plantillas.find((x) => x.id === p.id || x.nombre.toLowerCase() === p.nombre.toLowerCase());
      if (!dup) {
        db.plantillas.push(Object.assign(clone(p), { cambiosLocales: true }));
        counts.nuevos++;
      } else if (mode === "reemplazar") {
        Object.assign(dup, clone(p), { id: dup.id, actualizadoEn: now(), cambiosLocales: true });
        counts.reemplazados++;
      } else if (mode === "copia") {
        db.plantillas.push(Object.assign(clone(p), { id: uid("pl"), nombre: `${p.nombre} (copia)`.slice(0, 80), cambiosLocales: true }));
        counts.copias++;
      } else counts.omitidos++;
    });
    pkg.evaluaciones.forEach((e) => {
      const ev = Object.assign(clone(e), { softwareId: e.softwareId && swMap[e.softwareId] ? swMap[e.softwareId] : e.softwareId, cambiosLocales: true });
      if (ev.softwareId && !findSoftware(db, ev.softwareId)) ev.softwareId = null;
      const idx = db.evaluaciones.findIndex((x) => x.id === e.id);
      if (idx < 0) {
        db.evaluaciones.push(ev);
        counts.nuevos++;
      } else if (mode === "reemplazar") {
        ev.revision = db.evaluaciones[idx].revision;
        db.evaluaciones[idx] = ev;
        counts.reemplazados++;
      } else if (mode === "copia") {
        Object.assign(ev, { id: uid("ev"), revision: 0 });
        db.evaluaciones.push(ev);
        counts.copias++;
      } else counts.omitidos++;
    });
    return counts;
  }

  return {
    DB_KEY,
    LEGACY_KEY,
    ESTADOS,
    COLORES,
    uid,
    now,
    clone,
    safeUrl,
    emptyDb,
    newEvaluation,
    normalizeEvaluation,
    normalizeSoftware,
    normalizeTemplate,
    normalizeTags,
    load,
    persist,
    hasData,
    catalogFor,
    activeCatalog,
    deriveStatus,
    findSoftware,
    softwareByName,
    addCatalogVersion,
    nextSubfactorId,
    duplicateEvaluation,
    removeEvaluation,
    removeSoftware,
    removeTemplate,
    exportPackage,
    parsePackage,
    previewImport,
    applyImport,
  };
});
