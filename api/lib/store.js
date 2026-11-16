/**
 * Acceso a datos sobre SQLite embebido (node:sqlite). Todas las consultas son
 * parametrizadas (RNF-06). Los resultados de cada evaluación se recalculan con
 * engine.evaluate en cada guardado (RNF-11).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { DATA, engine, evaluate, factorById } = require("./catalog");
const { ApiError, notFound } = require("./http");

const SCHEMA_FILE = path.join(__dirname, "..", "schema.sqlite.sql");

const nowIso = () => new Date().toISOString();
const newId = (prefix) => `${prefix}_${crypto.randomBytes(9).toString("hex")}`;

/** JSON con claves ordenadas, para huellas deterministas. */
function canonical(v) {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
  }
  return JSON.stringify(v === undefined ? null : v);
}
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

/** Escapa comodines de LIKE (se usa con ESCAPE '\'). */
const likeEscape = (s) => s.replace(/[\\%_]/g, (m) => "\\" + m);

class Store {
  constructor(dbPath = ":memory:") {
    if (dbPath !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;");
    this.db.exec(fs.readFileSync(SCHEMA_FILE, "utf8"));
    this.txDepth = 0;
    this.orgCache = new Map();
    this.stmts = new Map();
    this.seedCatalog();
  }

  close() {
    this.db.close();
  }

  /** Sentencias preparadas cacheadas. */
  q(sql) {
    let s = this.stmts.get(sql);
    if (!s) {
      s = this.db.prepare(sql);
      this.stmts.set(sql, s);
    }
    return s;
  }

  /** Transacción (anidable mediante SAVEPOINT). */
  tx(fn) {
    const sp = `sp${this.txDepth}`;
    this.db.exec(this.txDepth === 0 ? "BEGIN IMMEDIATE" : `SAVEPOINT ${sp}`);
    this.txDepth++;
    try {
      const r = fn();
      this.txDepth--;
      this.db.exec(this.txDepth === 0 ? "COMMIT" : `RELEASE ${sp}`);
      return r;
    } catch (e) {
      this.txDepth--;
      this.db.exec(this.txDepth === 0 ? "ROLLBACK" : `ROLLBACK TO ${sp}; RELEASE ${sp}`);
      throw e;
    }
  }

  // -------------------------------------------------------------------------
  // Catálogo: se sincroniza desde data.js (fuente de verdad: data/*.csv)
  // -------------------------------------------------------------------------
  seedCatalog() {
    this.tx(() => {
      const upDim = this.db.prepare(
        "INSERT INTO dimension (codigo, nombre) VALUES (?, ?) ON CONFLICT(codigo) DO UPDATE SET nombre = excluded.nombre"
      );
      DATA.dimensiones.forEach((d) => upDim.run(d.id, d.nombre));
      const dimId = new Map(this.db.prepare("SELECT codigo, id_dimension FROM dimension").all().map((r) => [r.codigo, r.id_dimension]));
      const upFac = this.db.prepare(
        `INSERT INTO factor (codigo, id_dimension, nombre, importancia_sugerida, alcance, orden) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(codigo) DO UPDATE SET id_dimension = excluded.id_dimension, nombre = excluded.nombre,
           importancia_sugerida = excluded.importancia_sugerida, alcance = excluded.alcance, orden = excluded.orden`
      );
      DATA.factores.forEach((f, i) => upFac.run(f.id, dimId.get(f.dimension), f.nombre, f.importanciaSugerida, f.alcance, i + 1));
      this.factorPk = new Map(this.db.prepare("SELECT codigo, id_factor FROM factor").all().map((r) => [r.codigo, r.id_factor]));
      const upSub = this.db.prepare(
        `INSERT INTO subfactor (codigo, id_factor, enunciado, orden) VALUES (?, ?, ?, ?)
         ON CONFLICT(codigo) DO UPDATE SET id_factor = excluded.id_factor, enunciado = excluded.enunciado, orden = excluded.orden`
      );
      DATA.factores.forEach((f) => f.subfactores.forEach((s, i) => upSub.run(s.id, this.factorPk.get(f.id), s.nombre.slice(0, 300), i + 1)));
      this.subPk = new Map(this.db.prepare("SELECT codigo, id_subfactor FROM subfactor").all().map((r) => [r.codigo, r.id_subfactor]));
      const upNi = this.db.prepare("INSERT INTO nivel_importancia (valor, etiqueta) VALUES (?, ?) ON CONFLICT(valor) DO UPDATE SET etiqueta = excluded.etiqueta");
      DATA.nivelesImportancia.forEach((e, i) => upNi.run(i + 1, e));
      const upNc = this.db.prepare("INSERT INTO nivel_cumplimiento (valor, etiqueta) VALUES (?, ?) ON CONFLICT(valor) DO UPDATE SET etiqueta = excluded.etiqueta");
      DATA.nivelesSubfactor.forEach((e, i) => upNc.run(i + 1, e));
      const upRe = this.db.prepare(
        `INSERT INTO regla_recomendacion (codigo, orden, titulo, tono, foda_condicion, importancia_condicion, texto) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(codigo) DO UPDATE SET orden = excluded.orden, titulo = excluded.titulo, tono = excluded.tono,
           foda_condicion = excluded.foda_condicion, importancia_condicion = excluded.importancia_condicion, texto = excluded.texto`
      );
      DATA.reglas.forEach((r, i) =>
        upRe.run(r.codigo, i + 1, r.titulo, r.tono,
          r.condicion ? JSON.stringify(r.condicion.foda) : null,
          r.condicion ? JSON.stringify(r.condicion.importancia_relativa) : null, r.texto)
      );
    });
    this.factorCode = new Map([...this.factorPk].map(([c, id]) => [id, c]));
    this.subCode = new Map([...this.subPk].map(([c, id]) => [id, c]));
  }

  // -------------------------------------------------------------------------
  // Organizaciones
  // -------------------------------------------------------------------------
  orgId(nombre) {
    const key = nombre.toLowerCase();
    if (this.orgCache.has(key)) return this.orgCache.get(key);
    this.q("INSERT INTO organizacion (nombre) VALUES (?) ON CONFLICT(nombre) DO NOTHING").run(nombre);
    const id = this.q("SELECT id_organizacion FROM organizacion WHERE nombre = ?").get(nombre).id_organizacion;
    this.orgCache.set(key, id);
    return id;
  }

  // -------------------------------------------------------------------------
  // Softwares candidatos (HU-17)
  // -------------------------------------------------------------------------
  static softwareFromRow(r) {
    return {
      id: r.codigo,
      nombre: r.nombre,
      version: r.version || "",
      licencia: r.tipo_licencia || "",
      proveedor: r.proveedor || "",
      url: r.url || "",
      notas: r.notas || "",
      etiquetas: JSON.parse(r.etiquetas_json || "[]"),
      creadoEn: r.creado_en,
      actualizadoEn: r.actualizado_en,
    };
  }

  listSoftwares(org, { q, licencia, etiqueta } = {}) {
    const where = ["s.id_organizacion = ?"];
    const params = [org];
    if (q) {
      where.push("(s.nombre LIKE ? ESCAPE '\\' OR s.proveedor LIKE ? ESCAPE '\\' OR s.notas LIKE ? ESCAPE '\\')");
      const p = `%${likeEscape(q)}%`;
      params.push(p, p, p);
    }
    if (licencia) {
      where.push("s.tipo_licencia = ?");
      params.push(licencia);
    }
    if (etiqueta) {
      where.push("EXISTS (SELECT 1 FROM json_each(s.etiquetas_json) je WHERE lower(json_extract(je.value, '$.nombre')) = lower(?))");
      params.push(etiqueta);
    }
    const rows = this.db.prepare(`SELECT s.* FROM software_candidato s WHERE ${where.join(" AND ")} ORDER BY s.nombre COLLATE NOCASE, s.codigo`).all(...params);
    return rows.map(Store.softwareFromRow);
  }

  softwareRow(org, codigo) {
    return this.q("SELECT * FROM software_candidato WHERE id_organizacion = ? AND codigo = ?").get(org, codigo);
  }

  getSoftware(org, codigo) {
    const r = this.softwareRow(org, codigo);
    return r ? Store.softwareFromRow(r) : null;
  }

  /** Alta (POST). 409 si el id ya existe. */
  createSoftware(org, sw) {
    const id = sw.id || newId("sw");
    if (this.softwareRow(org, id)) throw new ApiError(409, "ya_existe", `Ya existe un software con id ${id}; usa PUT para actualizarlo`);
    return this.upsertSoftware(org, Object.assign({}, sw, { id })).software;
  }

  /** Upsert idempotente (PUT). Devuelve { software, creado, cambiado }. */
  upsertSoftware(org, sw) {
    return this.tx(() => {
      const prev = this.softwareRow(org, sw.id);
      const fields = [sw.nombre, sw.version, sw.licencia, sw.proveedor, sw.url, sw.notas, JSON.stringify(sw.etiquetas)];
      if (prev) {
        const same = canonical([prev.nombre, prev.version || "", prev.tipo_licencia || "", prev.proveedor || "", prev.url || "", prev.notas || "", prev.etiquetas_json]) === canonical(fields);
        if (same) return { software: Store.softwareFromRow(prev), creado: false, cambiado: false };
        this.q(
          `UPDATE software_candidato SET nombre = ?, version = ?, tipo_licencia = ?, proveedor = ?, url = ?, notas = ?, etiquetas_json = ?, actualizado_en = ?
           WHERE id_software = ?`
        ).run(...fields, sw.actualizadoEn || nowIso(), prev.id_software);
      } else {
        const t = nowIso();
        this.q(
          `INSERT INTO software_candidato (codigo, id_organizacion, nombre, version, tipo_licencia, proveedor, url, notas, etiquetas_json, creado_en, actualizado_en)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(sw.id, org, ...fields, sw.creadoEn || t, sw.actualizadoEn || sw.creadoEn || t);
      }
      return { software: this.getSoftware(org, sw.id), creado: !prev, cambiado: true };
    });
  }

  deleteSoftware(org, codigo, cascada) {
    return this.tx(() => {
      const r = this.softwareRow(org, codigo);
      if (!r) throw notFound("Software no encontrado");
      const n = this.q("SELECT COUNT(*) n FROM evaluacion WHERE id_software = ?").get(r.id_software).n;
      if (n > 0 && !cascada) {
        throw new ApiError(409, "tiene_evaluaciones", `El software tiene ${n} evaluación(es) asociada(s); usa ?cascada=1 para eliminarlas también`, [{ campo: "evaluaciones", mensaje: String(n) }]);
      }
      this.q("DELETE FROM evaluacion WHERE id_software = ?").run(r.id_software);
      this.q("DELETE FROM software_candidato WHERE id_software = ?").run(r.id_software);
      return { eliminado: codigo, evaluacionesEliminadas: n };
    });
  }

  // -------------------------------------------------------------------------
  // Evaluaciones (RF-10, RF-30)
  // -------------------------------------------------------------------------
  /** Contenido que define la evaluación (sin fechas ni revisión): base de la huella. */
  static contentOf(ev) {
    return {
      softwareId: ev.softwareId || null,
      software: ev.software,
      decisor: ev.decisor,
      alcance: ev.alcance,
      subfactores: ev.subfactores,
      observaciones: ev.observaciones,
      origenIA: ev.origenIA,
      resumen: ev.resumen,
      plantilla: ev.plantilla,
      paso1Confirmado: ev.paso1Confirmado,
      estado: ev.estado,
      catalogoVersion: ev.catalogoVersion,
    };
  }

  evalRow(org, codigo) {
    return this.q("SELECT * FROM evaluacion WHERE id_organizacion = ? AND codigo = ?").get(org, codigo);
  }

  /**
   * Upsert con control de concurrencia optimista.
   * Devuelve { evaluacion, creado, cambiado }; lanza 409 con `servidor` si hay conflicto.
   */
  saveEvaluacion(org, ev, { forzar = false } = {}) {
    return this.tx(() => {
      const prev = this.evalRow(org, ev.id);
      const content = Store.contentOf(ev);
      const huella = sha256(canonical(content));
      // Idempotencia: el mismo contenido no genera revisión nueva (aunque la revisionBase sea antigua).
      if (prev && prev.huella === huella) return { evaluacion: this.getEvaluacion(org, ev.id), creado: false, cambiado: false };
      if (prev && !forzar && prev.revision !== ev.revisionBase) {
        throw new ApiError(409, "conflicto",
          `La evaluación cambió en el servidor (revisión ${prev.revision}; el cliente partía de la ${ev.revisionBase})`,
          undefined, { servidor: this.getEvaluacion(org, ev.id) });
      }
      let swPk = null;
      if (ev.softwareId) {
        const sw = this.softwareRow(org, ev.softwareId);
        if (!sw) throw new ApiError(422, "software_no_encontrado", `No existe el software ${ev.softwareId} en esta organización`, [{ campo: "softwareId", mensaje: "Software desconocido" }]);
        swPk = sw.id_software;
      }
      const r = evaluate({ decisor: ev.decisor, alcance: ev.alcance, subfactores: ev.subfactores });
      const t = nowIso();
      const completado = ev.estado === "Completada" ? (prev && prev.completado_en) || ev.actualizadoEn || t : null;
      const extras = JSON.stringify({ software: ev.software, origenIA: ev.origenIA, resumen: ev.resumen, plantilla: ev.plantilla });
      const cols = [
        swPk, ev.software.evaluador || null, ev.estado, r.recomendacion ? r.recomendacion.codigo : null,
        r.foda.Fortaleza, r.foda.Oportunidad, r.foda.Debilidad, r.foda.Amenaza, avanceDe(r),
        ev.paso1Confirmado ? 1 : 0, ev.catalogoVersion, extras, huella,
      ];
      let pk;
      if (prev) {
        this.q(
          `UPDATE evaluacion SET id_software = ?, evaluador = ?, estado = ?, recomendacion = ?, n_fortalezas = ?, n_oportunidades = ?,
             n_debilidades = ?, n_amenazas = ?, avance = ?, paso1_confirmado = ?, catalogo_version = ?, extras_json = ?, huella = ?,
             revision = ?, actualizado_en = ?, completado_en = ? WHERE id_evaluacion = ?`
        ).run(...cols, prev.revision + 1, ev.actualizadoEn || t, completado, prev.id_evaluacion);
        pk = prev.id_evaluacion;
        this.q("DELETE FROM evaluacion_factor WHERE id_evaluacion = ?").run(pk);
        this.q("DELETE FROM evaluacion_subfactor WHERE id_evaluacion = ?").run(pk);
      } else {
        const res = this.q(
          `INSERT INTO evaluacion (id_software, evaluador, estado, recomendacion, n_fortalezas, n_oportunidades, n_debilidades, n_amenazas,
             avance, paso1_confirmado, catalogo_version, extras_json, huella, codigo, id_organizacion, revision, creado_en, actualizado_en, completado_en)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
        ).run(...cols, ev.id, org, ev.creadoEn || t, ev.actualizadoEn || ev.creadoEn || t, completado);
        pk = Number(res.lastInsertRowid);
      }
      const insF = this.q("INSERT INTO evaluacion_factor (id_evaluacion, id_factor, importancia_decisor, alcance, ponderacion, foda) VALUES (?, ?, ?, ?, ?, ?)");
      r.factores.forEach((f) => insF.run(pk, this.factorPk.get(f.id), f.importanciaDecisor, f.alcance, f.ponderacion, f.foda));
      const insS = this.q("INSERT INTO evaluacion_subfactor (id_evaluacion, id_subfactor, valor, observacion, enlace) VALUES (?, ?, ?, ?, ?)");
      const subIds = new Set([...Object.keys(ev.subfactores), ...Object.keys(ev.observaciones)]);
      [...subIds].sort().forEach((sid) => {
        const o = ev.observaciones[sid];
        insS.run(pk, this.subPk.get(sid), ev.subfactores[sid] == null ? null : ev.subfactores[sid], o ? o.texto || null : null, o ? o.enlace || null : null);
      });
      return { evaluacion: this.getEvaluacion(org, ev.id), creado: !prev, cambiado: true };
    });
  }

  /** Reconstruye el estado de la evaluación desde las tablas normalizadas. */
  stateOf(row) {
    const decisor = {};
    const alcance = {};
    this.q("SELECT id_factor, importancia_decisor, alcance FROM evaluacion_factor WHERE id_evaluacion = ?").all(row.id_evaluacion).forEach((r) => {
      const code = this.factorCode.get(r.id_factor);
      decisor[code] = r.importancia_decisor;
      if (factorById.get(code).alcance === "Ambos") alcance[code] = r.alcance;
    });
    const subfactores = {};
    const observaciones = {};
    this.q("SELECT id_subfactor, valor, observacion, enlace FROM evaluacion_subfactor WHERE id_evaluacion = ?").all(row.id_evaluacion).forEach((r) => {
      const code = this.subCode.get(r.id_subfactor);
      if (r.valor != null) subfactores[code] = r.valor;
      if (r.observacion || r.enlace) observaciones[code] = { texto: r.observacion || "", enlace: r.enlace || "" };
    });
    const sort = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
    return { decisor: sort(decisor), alcance: sort(alcance), subfactores: sort(subfactores), observaciones: sort(observaciones) };
  }

  evaluacionFromRow(row) {
    const st = this.stateOf(row);
    const extras = JSON.parse(row.extras_json || "{}");
    const sw = row.id_software ? this.q("SELECT codigo FROM software_candidato WHERE id_software = ?").get(row.id_software) : null;
    return {
      id: row.codigo,
      softwareId: sw ? sw.codigo : null,
      software: extras.software || {},
      decisor: st.decisor,
      alcance: st.alcance,
      subfactores: st.subfactores,
      observaciones: st.observaciones,
      origenIA: extras.origenIA || {},
      resumen: extras.resumen || null,
      plantilla: extras.plantilla || null,
      paso1Confirmado: !!row.paso1_confirmado,
      estado: row.estado,
      catalogoVersion: row.catalogo_version,
      creadoEn: row.creado_en,
      actualizadoEn: row.actualizado_en,
      completadoEn: row.completado_en || null,
      revision: row.revision,
      resultado: evaluate({ decisor: st.decisor, alcance: st.alcance, subfactores: st.subfactores }),
    };
  }

  getEvaluacion(org, codigo) {
    const row = this.evalRow(org, codigo);
    return row ? this.evaluacionFromRow(row) : null;
  }

  static SUMMARY_SQL = `SELECT e.codigo, e.estado, e.recomendacion, e.n_fortalezas, e.n_oportunidades, e.n_debilidades, e.n_amenazas,
      e.avance, e.revision, e.creado_en, e.actualizado_en, e.completado_en, e.evaluador, e.catalogo_version,
      s.codigo AS sw_codigo,
      COALESCE(NULLIF(json_extract(e.extras_json, '$.software.nombre'), ''), s.nombre, '') AS sw_nombre,
      COALESCE(NULLIF(json_extract(e.extras_json, '$.software.version'), ''), s.version, '') AS sw_version
    FROM evaluacion e LEFT JOIN software_candidato s ON s.id_software = e.id_software`;

  static summaryFromRow(r) {
    return {
      id: r.codigo,
      softwareId: r.sw_codigo || null,
      software: { nombre: r.sw_nombre || "", version: r.sw_version || "" },
      evaluador: r.evaluador || "",
      estado: r.estado,
      recomendacion: r.recomendacion || null,
      foda: { Fortaleza: r.n_fortalezas, Oportunidad: r.n_oportunidades, Debilidad: r.n_debilidades, Amenaza: r.n_amenazas },
      avance: r.avance,
      catalogoVersion: r.catalogo_version,
      creadoEn: r.creado_en,
      actualizadoEn: r.actualizado_en,
      completadoEn: r.completado_en || null,
      revision: r.revision,
    };
  }

  listEvaluaciones(org, { softwareId, estado, desde, limite } = {}) {
    const where = ["e.id_organizacion = ?"];
    const params = [org];
    if (softwareId) {
      where.push("s.codigo = ?");
      params.push(softwareId);
    }
    if (estado) {
      where.push("e.estado = ?");
      params.push(estado);
    }
    if (desde) {
      where.push("e.actualizado_en >= ?");
      params.push(desde);
    }
    let sql = `${Store.SUMMARY_SQL} WHERE ${where.join(" AND ")} ORDER BY e.actualizado_en DESC, e.codigo`;
    if (limite) {
      sql += " LIMIT ?";
      params.push(limite);
    }
    return this.db.prepare(sql).all(...params).map(Store.summaryFromRow);
  }

  deleteEvaluacion(org, codigo) {
    const r = this.q("DELETE FROM evaluacion WHERE id_organizacion = ? AND codigo = ?").run(org, codigo);
    if (!r.changes) throw notFound("Evaluación no encontrada");
    return { eliminado: codigo };
  }

  // -------------------------------------------------------------------------
  // Plantillas de importancia (HU-37)
  // -------------------------------------------------------------------------
  static plantillaFromRow(r) {
    return {
      id: r.codigo,
      nombre: r.nombre,
      decisor: JSON.parse(r.decisor_json),
      alcance: JSON.parse(r.alcance_json),
      creadoEn: r.creado_en,
      actualizadoEn: r.actualizado_en,
    };
  }

  listPlantillas(org) {
    return this.q("SELECT * FROM plantilla_importancia WHERE id_organizacion = ? ORDER BY nombre COLLATE NOCASE, codigo").all(org).map(Store.plantillaFromRow);
  }

  plantillaRow(org, codigo) {
    return this.q("SELECT * FROM plantilla_importancia WHERE id_organizacion = ? AND codigo = ?").get(org, codigo);
  }

  createPlantilla(org, pl) {
    const id = pl.id || newId("pl");
    if (this.plantillaRow(org, id)) throw new ApiError(409, "ya_existe", `Ya existe una plantilla con id ${id}; usa PUT para actualizarla`);
    return this.upsertPlantilla(org, Object.assign({}, pl, { id })).plantilla;
  }

  upsertPlantilla(org, pl) {
    return this.tx(() => {
      const prev = this.plantillaRow(org, pl.id);
      const fields = [pl.nombre, JSON.stringify(pl.decisor), JSON.stringify(pl.alcance)];
      if (prev) {
        if (canonical([prev.nombre, prev.decisor_json, prev.alcance_json]) === canonical(fields)) {
          return { plantilla: Store.plantillaFromRow(prev), creado: false, cambiado: false };
        }
        this.q("UPDATE plantilla_importancia SET nombre = ?, decisor_json = ?, alcance_json = ?, actualizado_en = ? WHERE id_plantilla = ?")
          .run(...fields, pl.actualizadoEn || nowIso(), prev.id_plantilla);
      } else {
        const t = nowIso();
        this.q("INSERT INTO plantilla_importancia (codigo, id_organizacion, nombre, decisor_json, alcance_json, creado_en, actualizado_en) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(pl.id, org, ...fields, pl.creadoEn || t, pl.actualizadoEn || pl.creadoEn || t);
      }
      return { plantilla: Store.plantillaFromRow(this.plantillaRow(org, pl.id)), creado: !prev, cambiado: true };
    });
  }

  deletePlantilla(org, codigo) {
    const r = this.q("DELETE FROM plantilla_importancia WHERE id_organizacion = ? AND codigo = ?").run(org, codigo);
    if (!r.changes) throw notFound("Plantilla no encontrada");
    return { eliminado: codigo };
  }

  // -------------------------------------------------------------------------
  // Dashboard (HU-30, RNF-10)
  // -------------------------------------------------------------------------
  /**
   * Los indicadores se agregan con engine.summarize (la misma función que usa el
   * panel del navegador), a partir de los resultados ya guardados por evaluación:
   * así ambos dan cifras idénticas (RNF-11) sin recalcular las 61 respuestas.
   */
  dashboard(org, { softwareId } = {}) {
    const rows = this.db.prepare(
      `SELECT e.id_evaluacion, e.codigo, e.estado, e.recomendacion, e.n_fortalezas, e.n_oportunidades, e.n_debilidades, e.n_amenazas,
         COALESCE(e.completado_en, e.actualizado_en) AS fecha, s.codigo AS sw_codigo,
         COALESCE(NULLIF(json_extract(e.extras_json, '$.software.nombre'), ''), s.nombre, '') AS sw_nombre
       FROM evaluacion e LEFT JOIN software_candidato s ON s.id_software = e.id_software
       WHERE e.id_organizacion = ? ORDER BY e.codigo`
    ).all(org);
    // Ponderación por dimensión de cada evaluación, en el mismo orden de factores que engine.evaluate.
    const dimSums = new Map(); // id_evaluacion -> { D1: [p, ...], ... }
    this.db.prepare(
      `SELECT ef.id_evaluacion, d.codigo AS dim, ef.ponderacion
       FROM evaluacion_factor ef
       JOIN evaluacion e ON e.id_evaluacion = ef.id_evaluacion
       JOIN factor fa ON fa.id_factor = ef.id_factor
       JOIN dimension d ON d.id_dimension = fa.id_dimension
       WHERE e.id_organizacion = ? AND ef.foda IS NOT NULL
       ORDER BY ef.id_evaluacion, fa.orden`
    ).all(org).forEach((r) => {
      let m = dimSums.get(r.id_evaluacion);
      if (!m) dimSums.set(r.id_evaluacion, (m = {}));
      (m[r.dim] = m[r.dim] || []).push(r.ponderacion);
    });
    const tono = Object.fromEntries(DATA.reglas.map((r) => [r.codigo, r.tono]));
    const meta = new Map();
    const entries = rows.map((r) => {
      meta.set(r.codigo, r);
      const m = dimSums.get(r.id_evaluacion) || {};
      return {
        id: r.codigo,
        fecha: r.fecha,
        software: r.sw_nombre,
        estado: r.estado,
        result: {
          recomendacion: r.recomendacion ? { codigo: r.recomendacion, tono: tono[r.recomendacion] } : null,
          foda: { Fortaleza: r.n_fortalezas, Oportunidad: r.n_oportunidades, Debilidad: r.n_debilidades, Amenaza: r.n_amenazas },
          dimensiones: DATA.dimensiones.map((d) => {
            const ps = m[d.id] || [];
            return { id: d.id, nombre: d.nombre, ponderacion: ps.length ? ps.reduce((s, p) => s + p, 0) / ps.length : null };
          }),
        },
      };
    });
    const s = engine.summarize(entries);
    const byDim = new Map(s.dimensiones.map((d) => [d.id, d]));
    const summaries = new Map(this.listEvaluaciones(org).map((e) => [e.id, e]));
    return {
      total: s.total,
      completadas: s.completadas,
      porEstado: s.porEstado,
      recomendaciones: s.recomendaciones,
      foda: s.foda,
      dimensiones: DATA.dimensiones.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        ponderacion: byDim.has(d.id) ? byDim.get(d.id).ponderacion : null,
        evaluaciones: byDim.has(d.id) ? byDim.get(d.id).evaluaciones : 0,
      })),
      ultimas: s.ultimas.map((id) => summaries.get(id)),
      lineaTiempo: s.lineaTiempo
        .map((x) => Object.assign({ softwareId: meta.get(x.id).sw_codigo || null }, x))
        .filter((x) => !softwareId || x.softwareId === softwareId),
    };
  }

  // -------------------------------------------------------------------------
  // Límite diario de IA por organización (RNF-14)
  // -------------------------------------------------------------------------
  consumeIa(org, limit) {
    const fecha = nowIso().slice(0, 10);
    return this.tx(() => {
      const r = this.q("SELECT llamadas FROM uso_ia WHERE id_organizacion = ? AND fecha = ?").get(org, fecha);
      const used = r ? r.llamadas : 0;
      if (used >= limit) {
        const err = new ApiError(429, "limite_ia", `Se alcanzó el límite diario de ${limit} llamadas al asistente de IA para esta organización`);
        const midnight = new Date(fecha + "T00:00:00Z").getTime() + 86400000;
        err.headers = { "Retry-After": String(Math.max(1, Math.ceil((midnight - Date.now()) / 1000))) };
        throw err;
      }
      this.q("INSERT INTO uso_ia (id_organizacion, fecha, llamadas) VALUES (?, ?, 1) ON CONFLICT(id_organizacion, fecha) DO UPDATE SET llamadas = llamadas + 1").run(org, fecha);
      return { usadas: used + 1, limite: limit };
    });
  }
}

/** % de subfactores respondidos de los factores relevantes (engine.progress, igual que en el navegador). */
function avanceDe(r) {
  return engine.progress(r).pct;
}

module.exports = { Store, canonical, newId, nowIso, avanceDe };
