/**
 * GUIOS PRO — Interfaz (vanilla JS, sin build).
 *
 * Pantallas (SCREENS[]): Inicio · Paso 1 Importancia (GUIOS 1-2) · Paso 2 Cumplimiento (GUIOS 3-4)
 * · Paso 3 Resultado (GUIOS 5-6) · Panel · Evaluaciones · Detalle (solo lectura) · Informe
 * · Comparar · Softwares · Ficha de software · Guía y plantillas · Configuración · Datos.
 *
 * Persistencia en localStorage a través de store.js; cálculo en engine.js; gráficos en charts.js;
 * servidor opcional (sincronización e IA) en api.js. La app funciona entera sin servidor.
 */
(function () {
  "use strict";

  const BASE = window.GUIOS_DATA;
  const E = window.GuiosEngine;
  const Store = window.GuiosStore;
  const Charts = window.GuiosCharts;
  const Api = window.GuiosApi;
  const THEME_KEY = "guiospro.theme";
  const LICENCIAS = ["FLOSS permisiva (MIT, Apache, BSD)", "FLOSS copyleft (GPL, AGPL)", "FLOSS copyleft débil (LGPL, MPL)", "Privativa", "Otra"];
  const TAG_COLORS = { primary: "Azul", success: "Verde", warning: "Ámbar", danger: "Rojo", info: "Índigo", neutral: "Gris" };

  /** Pantallas. `id` es el hash de la URL; `step` es el número que ve el usuario; `parent` marca la sección del sidebar. */
  const SCREENS = [
    { id: "inicio", icon: "home", label: "Inicio" },
    { id: "paso-1-2", step: 1, icon: "sliders", label: "Importancia", title: "¿Qué tan importante es cada factor para su organización?", guios: "Pasos 1 y 2 de la guía GUIOS" },
    { id: "paso-3-4", step: 2, icon: "checkSquare", label: "Cumplimiento", title: "¿En qué medida el software cumple cada requisito?", guios: "Pasos 3 y 4 de la guía GUIOS" },
    { id: "paso-5-6", step: 3, icon: "pie", label: "Resultado", title: "Resultado de la evaluación", guios: "Pasos 5 y 6 de la guía GUIOS" },
    { id: "panel", icon: "grid", label: "Panel" },
    { id: "evaluaciones", icon: "clock", label: "Evaluaciones" },
    { id: "evaluacion", icon: "clock", label: "Detalle de la evaluación", parent: "evaluaciones" },
    { id: "informe", icon: "file", label: "Informe", parent: "evaluaciones" },
    { id: "comparar", icon: "columns", label: "Comparar" },
    { id: "softwares", icon: "box", label: "Softwares" },
    { id: "software", icon: "box", label: "Ficha del software", parent: "softwares" },
    { id: "administracion", icon: "book", label: "Guía y plantillas" },
    { id: "configuracion", icon: "settings", label: "Configuración" },
    { id: "datos", icon: "database", label: "Datos" },
  ];
  const IDX = {};
  SCREENS.forEach((s, i) => (IDX[s.id] = i));
  const LAST_STEP = 3;

  /** Secciones del sidebar (además de los 3 pasos), en este orden. */
  const NAV_MAIN = ["inicio", "panel"];
  const NAV_GROUPS = [
    { title: "Gestión", items: ["evaluaciones", "softwares", "comparar"] },
    { title: "Sistema", items: ["administracion", "configuracion", "datos"] },
  ];

  /* ------------------------------------------------------------------ */
  /* Estado                                                              */
  /* ------------------------------------------------------------------ */
  const storage = (() => {
    try {
      return window.localStorage;
    } catch (err) {
      return null;
    }
  })();
  let db = Store.load(storage, E, BASE);
  let DATA = BASE; // catálogo de la evaluación activa
  let state = null; // evaluación activa (referencia dentro de db.evaluaciones, o borrador)
  const hashInfo = parseHash();
  const ui = {
    screen: hashInfo.screen,
    param: hashInfo.param,
    factor: null,
    sub: null,
    menu: false,
    nav: false,
    detail: false,
    q: "",
    onlyPending: false,
    note: null,
    sugerencias: {},
    iaBusy: null,
    server: { estado: "off" },
    syncing: false,
    histQ: "",
    histEstado: "",
    swQ: "",
    swLic: "",
    swTag: "",
    compare: [],
    timelineSw: "",
    adminTab: "guia",
    draft: null,
    draftDirty: false,
    draftNota: "",
    openFactors: new Set(),
    cfg: null,
    cfgDirty: false,
    importPkg: null,
    importMode: "omitir",
    exportSel: null,
    swForm: null,
  };
  activateFromDb();

  function activateFromDb() {
    const ev = db.activa && db.evaluaciones.find((e) => e.id === db.activa);
    if (ev) setActive(ev);
    else startDraft();
  }

  function setActive(ev) {
    state = ev;
    DATA = catalogOf(ev);
    if (db.evaluaciones.includes(ev)) db.activa = ev.id;
    ui.factor = null;
    ui.sub = null;
    ui.sugerencias = {};
  }

  /** Borrador nuevo: no entra en el historial hasta que tenga algún dato. */
  function startDraft(opts) {
    const o = opts || {};
    const cat = Store.activeCatalog(db, BASE);
    const sw = o.software ? Store.findSoftware(db, o.software) : null;
    const ev = Store.newEvaluation(E, cat, {
      softwareId: sw ? sw.id : null,
      software: Object.assign(
        { organizacion: db.config.organizacion.nombre, evaluador: db.config.evaluadorPorDefecto },
        sw ? { nombre: sw.nombre, version: sw.version, licencia: sw.licencia, proveedor: sw.proveedor } : {}
      ),
    });
    db.activa = null;
    setActive(ev);
  }

  function catalogOf(ev) {
    return Store.catalogFor(db, BASE, ev && ev.catalogoVersion);
  }
  function resultOf(ev) {
    return E.evaluate(catalogOf(ev), ev);
  }
  function statusOf(ev) {
    return Store.deriveStatus(E, catalogOf(ev), ev);
  }
  function evalById(id) {
    return db.evaluaciones.find((e) => e.id === id) || (state && state.id === id ? state : null);
  }
  function savedEvaluations() {
    return db.evaluaciones.filter(Store.hasData);
  }

  function persistDb() {
    if (storage && !Store.persist(storage, db)) toast("No se pudo guardar en este navegador (modo privado o sin espacio)");
    scheduleSync();
  }

  /** Marca una evaluación como modificada, actualiza su estado y guarda. */
  function saveEval(ev) {
    const before = ev.estado;
    ev.actualizadoEn = Store.now();
    ev.cambiosLocales = true;
    ev.estado = statusOf(ev);
    if (ev.estado === "Completada" && before !== "Completada") ev.completadoEn = ev.actualizadoEn;
    if (ev === state && !db.evaluaciones.includes(ev) && Store.hasData(ev)) {
      db.evaluaciones.push(ev);
      db.activa = ev.id;
    }
    persistDb();
  }
  function save() {
    saveEval(state);
  }

  function parseHash() {
    const m = /^#([\w-]+)(?:\/(.+))?$/.exec(location.hash || "");
    if (!m || IDX[m[1]] == null) return { screen: 0, param: null };
    return { screen: IDX[m[1]], param: m[2] ? decodeURIComponent(m[2]) : null };
  }

  /* ------------------------------------------------------------------ */
  /* Tema                                                                */
  /* ------------------------------------------------------------------ */
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function applyTheme(pref) {
    let t = pref === "oscuro" ? "dark" : pref === "claro" ? "light" : null;
    try {
      if (t) localStorage.setItem(THEME_KEY, t);
      else localStorage.removeItem(THEME_KEY);
    } catch (err) {
      /* sin persistencia */
    }
    if (!t) t = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
  }

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */
  const $ = (sel, root) => (root || document).querySelector(sel);

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const ICONS = {
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
    chevronDown: '<polyline points="6 9 12 15 18 9"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    checkSquare: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    trendingUp: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    trendingDown: '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    note: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    sparkle: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  };
  function icon(name, size) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size || 18}" height="${size || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  }

  function fmt(n) {
    return n == null ? "—" : n.toFixed(1);
  }
  function fmtDate(iso, long) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-EC", long ? { year: "numeric", month: "long", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" });
  }
  function dimName(id, data) {
    const d = (data || DATA).dimensiones.find((x) => x.id === id);
    return d ? d.nombre : id;
  }
  function factorById(id, data) {
    return (data || DATA).factores.find((f) => f.id === id);
  }
  function levelBadge(idx, relevant, data) {
    const cls = !relevant ? "" : idx === 3 ? "badge-success" : idx === 2 ? "badge-primary" : "badge-warning";
    return `<span class="badge ${cls}">${esc((data || DATA).nivelesImportancia[idx])}</span>`;
  }
  /** Color de cada nivel de las escalas (círculo marcado y cabecera de columna). */
  const IMPORTANCE_TONE = ["var(--color-text-3)", "var(--color-warning)", "var(--color-primary)", "var(--color-success)"];
  const ANSWER_TONE = ["var(--color-danger)", "var(--color-text-3)", "var(--color-warning)", "var(--color-success)"];
  /** Etiquetas cortas de la escala de cumplimiento (la completa va en aria-label y title). */
  const ANSWER_SHORT = ["No cumple", "No sé", "Parcial", "Cumple"];
  const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];
  const STATUS_TONE = { "Sin empezar": "plain", "En proceso": "primary", Completada: "success", Cancelada: "danger" };
  const REC_TONE = { A: "danger", B: "warning", C: "success" };

  function ayuda() {
    return DATA.ayuda || BASE.ayuda || { niveles_importancia: [], niveles_subfactor: [], pasos: {} };
  }

  /**
   * Escala de un clic: grupo de radios nativos dibujados como círculos alineados en columnas
   * bajo una cabecera (`scaleHead`). Admite arrastre «en cascada» (ver `paint`).
   * opts: { name, label, value, levels, short, tones, attr, suggested, help }
   */
  function choice(o) {
    return `<div class="choice" role="radiogroup" aria-label="${esc(o.label)}">
      ${o.levels
        .map((full, k) => {
          const v = k + 1;
          const sug = o.suggested === v;
          const tip = `${full}${o.help && o.help[k] ? ": " + o.help[k] : ""}${sug ? " · sugerida por la guía" : ""}`;
          return `<label class="choice-opt ${sug ? "is-suggested" : ""}" style="--c:${o.tones[k]}" title="${esc(tip)}">
            <input type="radio" class="sr-only" name="${o.name}" value="${v}" ${o.attr} ${o.value === v ? "checked" : ""} aria-label="${esc(full)}${sug ? ", sugerida" : ""}" />
            <span class="choice-dot" aria-hidden="true">${icon("check", 14)}</span>
            <span class="choice-label" aria-hidden="true">${esc((o.short || o.levels)[k])}</span>
          </label>`;
        })
        .join("")}
    </div>`;
  }

  /** Cabecera de columnas de una escala (se oculta en móvil, donde cada círculo lleva su texto). */
  function scaleHead(first, labels, tones, extra) {
    return `<div class="scale-head" aria-hidden="true">
      <span>${esc(first)}</span>
      <div class="scale-cols">${labels.map((l, k) => `<span style="--c:${tones[k]}">${esc(l)}</span>`).join("")}</div>
      ${extra ? `<span class="scale-extra">${esc(extra)}</span>` : ""}
    </div>`;
  }

  function fodaBadge(foda) {
    return `<span class="badge badge-${foda}">${foda}</span>`;
  }
  function statusBadge(estado) {
    return `<span class="badge badge-${STATUS_TONE[estado] || "plain"}">${esc(estado)}</span>`;
  }
  function recBadge(code) {
    return code ? `<span class="badge badge-${REC_TONE[code]}">Recomendación ${code}</span>` : "";
  }
  function plural(n, s, p) {
    return `${n} ${n === 1 ? s : p}`;
  }
  function avatar(name) {
    return esc((name || "?").trim().charAt(0).toUpperCase() || "?");
  }
  function navAttrs(id, param) {
    return `href="#${id}${param ? "/" + encodeURIComponent(param) : ""}" data-nav="${id}"${param ? ` data-param="${esc(param)}"` : ""}`;
  }
  function header(kicker, title, actions, lead) {
    return `<div class="screen-header">
        <div>
          ${kicker ? `<div class="kicker">${esc(kicker)}</div>` : ""}
          <h1 class="h1">${title}</h1>
          ${lead ? `<p>${lead}</p>` : ""}
        </div>
        ${actions ? `<div class="actions">${actions}</div>` : ""}
      </div>`;
  }
  function emptyState(iconName, title, text, actions) {
    return `<section class="card empty-state">
        <span class="empty-icon">${icon(iconName, 28)}</span>
        <h2 class="h3">${esc(title)}</h2>
        <p>${text}</p>
        ${actions ? `<div class="actions">${actions}</div>` : ""}
      </section>`;
  }
  function softwareLine(sw) {
    return [sw.version, sw.licencia, sw.evaluador && `Evaluador: ${sw.evaluador}`].filter(Boolean).join(" · ");
  }
  function iaReady() {
    return serverOn() && ui.server.estado === "ok" && !!ui.server.ia && !!ui.server.ia.disponible;
  }
  function serverOn() {
    return !!db.config.servidor.activo;
  }

  /* ------------------------------------------------------------------ */
  /* Render principal                                                    */
  /* ------------------------------------------------------------------ */
  const RENDER = {
    inicio: renderInicio,
    "paso-1-2": renderPaso1,
    "paso-3-4": renderPaso2,
    "paso-5-6": renderPaso3,
    panel: renderPanel,
    evaluaciones: renderEvaluaciones,
    evaluacion: renderDetalle,
    informe: renderInforme,
    comparar: renderComparar,
    softwares: renderSoftwares,
    software: renderFicha,
    administracion: renderAdmin,
    configuracion: renderConfig,
    datos: renderDatos,
  };

  function render() {
    const result = E.evaluate(DATA, state);
    ensureSelectedFactor(result);
    renderSidebar(result);
    const s = SCREENS[ui.screen];
    $("#screen").innerHTML = RENDER[s.id](result);
    renderFooter(result);
    const wantedHash = "#" + s.id + (ui.param ? "/" + encodeURIComponent(ui.param) : "");
    if (location.hash !== wantedHash) history.replaceState(null, "", wantedHash);
    document.title = `GUIOS PRO · ${s.step ? `Paso ${s.step} · ` : ""}${s.label}`;
  }

  function ensureSelectedFactor(result) {
    const relevant = result.factores.filter((f) => f.relevante);
    if (!relevant.length) {
      ui.factor = null;
      return;
    }
    if (!ui.factor || !relevant.some((f) => f.id === ui.factor)) ui.factor = relevant[0].id;
  }

  function stepDone(i, result) {
    if (i === 1) return result.relevantes > 0 && !!state.paso1Confirmado;
    if (i === 2) return result.relevantes > 0 && result.pendientes.length === 0 && Object.keys(state.subfactores).length > 0;
    if (i === 3) return !!result.recomendacion && result.pendientes.length === 0;
    return true;
  }

  /** Primer paso sin completar (al que lleva «Continuar»). */
  function nextStep(result) {
    for (let i = 1; i <= LAST_STEP; i++) if (!stepDone(i, result)) return i;
    return LAST_STEP;
  }

  function hasData() {
    return Store.hasData(state);
  }

  /** Avance y estado de la evaluación en curso (sidebar y panel). */
  function progress(result) {
    const p = E.progress(result);
    const status = !hasData() ? { label: "Sin empezar", tone: "plain" } : p.complete ? { label: "Completada", tone: "success" } : { label: "En proceso", tone: "primary" };
    return Object.assign(p, { status });
  }

  /* ---------- Sidebar (navegación principal) ---------- */
  function stepSubtitle(i, result) {
    if (i === 1) return state.paso1Confirmado ? `${plural(result.relevantes, "factor", "factores")} a evaluar` : "Pendiente";
    if (i === 2) {
      const p = E.progress(result);
      return p.answered ? `${p.answered} de ${p.total} respuestas` : "Pendiente";
    }
    const rec = result.recomendacion;
    return rec && !result.pendientes.length ? `Recomendación ${rec.codigo}` : "Pendiente";
  }

  function sideLink(id, extra) {
    const x = SCREENS[IDX[id]];
    const cur = SCREENS[ui.screen];
    const active = cur.id === id || cur.parent === id;
    return `<a class="side-link" ${navAttrs(id)} ${active ? 'aria-current="page"' : ""}>${icon(x.icon, 18)}<span>${esc(x.label)}</span>${extra || ""}</a>`;
  }

  function renderSidebar(result) {
    const p = progress(result);
    const dark = currentTheme() === "dark";
    const sw = state.software.nombre;

    const steps = SCREENS.filter((x) => x.step)
      .map((x) => {
        const idx = x.step;
        const current = idx === ui.screen;
        const done = stepDone(idx, result);
        const sub = stepSubtitle(idx, result);
        return `<li class="side-step ${current ? "is-current" : ""} ${done ? "is-done" : ""}">
          <a ${navAttrs(x.id)} ${current ? 'aria-current="page"' : ""} aria-label="Paso ${x.step} de 3: ${esc(x.label)}. ${esc(sub)}">
            <span class="step-num" aria-hidden="true">${done ? icon("check", 16) : x.step}</span>
            <span class="step-text" aria-hidden="true">
              <span class="step-title">${esc(x.label)}</span>
              <small class="step-state">${esc(sub)}</small>
            </span>
          </a>
        </li>`;
      })
      .join("");

    const syncAlert = db.sync.conflictos.length ? `<span class="soon is-alert" title="Conflictos de sincronización">${db.sync.conflictos.length}</span>` : "";
    const groups = NAV_GROUPS.map(
      (g) => `<div class="side-title">${esc(g.title)}</div>${g.items.map((id) => sideLink(id, id === "datos" ? syncAlert : "")).join("")}`
    ).join("");

    const evalMeta = p.complete && result.recomendacion ? `Recomendación ${result.recomendacion.codigo}` : p.status.label;

    $("#sidebar").innerHTML = `
      <div class="side-top">
        <a class="brand" ${navAttrs("inicio")}><span class="logo" aria-hidden="true">G</span><span><span class="name">GUIOS PRO</span><small>${esc(db.config.organizacion.nombre || "Adopción de software")}</small></span></a>
        <button class="btn btn-icon btn-ghost side-close" data-action="nav-close" aria-label="Cerrar menú">${icon("x")}</button>
      </div>
      <nav class="side-nav" aria-label="Secciones">
        ${NAV_MAIN.map((id) => sideLink(id)).join("")}
        <div class="side-title">Evaluación en curso</div>
        <ol class="side-steps">${steps}</ol>
        ${groups}
      </nav>
      <div class="side-bottom">
        <a class="side-eval" ${navAttrs("panel")} aria-label="Evaluación de ${esc(sw || "software sin nombre")}: ${p.pct}% respondido. Abrir el panel">
          <span class="side-eval-avatar" aria-hidden="true">${avatar(sw)}</span>
          <span class="side-eval-text" aria-hidden="true">
            <span class="side-eval-name">${sw ? esc(sw) : "Sin software"}</span>
            <small>${esc(evalMeta)}</small>
          </span>
          <span class="side-eval-pct" aria-hidden="true">${p.pct}%</span>
          <span class="progress" aria-hidden="true"><span style="width:${p.pct}%"></span></span>
        </a>
        <div class="side-actions">
          <button class="side-tool" data-action="theme" aria-label="${dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}">${icon(dark ? "sun" : "moon", 18)}<span>${dark ? "Claro" : "Oscuro"}</span></button>
          <button class="side-tool" data-action="how" aria-label="¿Cómo funciona?">${icon("help", 18)}<span>Ayuda</span></button>
          <div class="menu-anchor">
            <button class="side-tool" data-action="menu" aria-haspopup="menu" aria-expanded="${ui.menu}" aria-label="Más opciones">${icon("more", 18)}<span>Más</span></button>
            ${ui.menu ? renderMenu() : ""}
          </div>
        </div>
      </div>`;
    $("#sidebar").classList.toggle("is-open", ui.nav);
    $("#sidebar-backdrop").classList.toggle("is-open", ui.nav);

    const cur = SCREENS[ui.screen];
    $("#topbar").innerHTML = `
      <button class="btn btn-icon btn-ghost" data-action="nav" aria-label="Abrir menú" aria-expanded="${ui.nav}">${icon("menu")}</button>
      <span class="topbar-title">${cur.step ? `Paso ${cur.step} · ` : ""}${esc(cur.label)}</span>
      <button class="btn btn-icon btn-ghost" data-action="theme" aria-label="Cambiar tema">${icon(dark ? "sun" : "moon")}</button>`;
  }

  function renderMenu() {
    return `<div class="menu menu-up" role="menu">
      <button role="menuitem" data-action="new-eval">${icon("plus", 16)} Nueva evaluación</button>
      <button role="menuitem" data-action="demo">${icon("star", 16)} Cargar ejemplo</button>
      <button role="menuitem" data-action="export-current">${icon("download", 16)} Exportar evaluación (JSON)</button>
      <button role="menuitem" data-action="print">${icon("printer", 16)} Exportar informe (PDF)</button>
      <button role="menuitem" data-nav="datos">${icon("upload", 16)} Importar y exportar…</button>
    </div>`;
  }

  function screenHeader(extra) {
    const s = SCREENS[ui.screen];
    const versionNote =
      state.catalogoVersion !== BASE.version ? `<span class="badge badge-plain">Guía ${esc(state.catalogoVersion)}</span>` : "";
    return `<div class="screen-header">
        <div>
          <div class="kicker">Paso ${s.step} de 3 · ${esc(s.guios)}${state.software.nombre ? ` · ${esc(state.software.nombre)}` : ""}</div>
          <h1 class="h1">${esc(s.title)}</h1>
          ${versionNote}
        </div>
        ${extra ? `<div class="actions">${extra}</div>` : ""}
      </div>`;
  }

  /** Ayuda plegable de cada paso (HU-14). Los textos vienen de data/recomendaciones.json. */
  function stepHelp(step, levels, texts, tones) {
    const a = ayuda();
    return `<details class="details help-box">
        <summary>${icon("help", 16)} ¿Cómo se responde este paso? ${icon("chevronDown", 16)}</summary>
        <div class="help-body">
          <p>${esc((a.pasos || {})[step] || "")}</p>
          ${
            levels
              ? `<dl class="level-list">${levels
                  .map((l, k) => `<div style="--c:${tones[k]}"><dt>${k + 1} · ${esc(l)}</dt><dd>${esc(texts[k] || "")}</dd></div>`)
                  .join("")}</dl>`
              : ""
          }
        </div>
      </details>`;
  }

  /* ---------- Footer ---------- */
  function renderFooter(result) {
    if (!SCREENS[ui.screen].step) {
      $("#footer").innerHTML = "";
      $("#footer").hidden = true;
      return;
    }
    $("#footer").hidden = false;
    const p = E.progress(result);
    let status = "";
    if (ui.screen === 1) status = `${plural(result.relevantes, "factor", "factores")} se evaluarán`;
    else if (ui.screen === 2) status = `${p.answered} de ${p.total} preguntas respondidas`;
    else status = result.pendientes.length ? `Faltan ${plural(result.pendientes.length, "factor", "factores")} por responder` : "Evaluación completa";
    const last = ui.screen === LAST_STEP;
    $("#footer").innerHTML = `
      <div class="inner">
        <div class="status">
          <span>${esc(status)}</span>
          <div class="progress" role="progressbar" aria-valuenow="${p.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Avance"><span style="width:${p.pct}%"></span></div>
        </div>
        <button class="btn btn-secondary" data-nav="${ui.screen - 1}">${icon("chevronLeft")}<span>Anterior</span></button>
        ${
          last
            ? `<button class="btn btn-primary" data-nav="informe" data-param="${esc(state.id)}">${icon("file")}<span>Ver informe</span></button>`
            : `<button class="btn btn-primary" data-nav="${ui.screen + 1}"><span>Siguiente</span>${icon("chevronRight")}</button>`
        }
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Inicio                                                              */
  /* ------------------------------------------------------------------ */
  function renderInicio() {
    const sw = state.software;
    const linked = state.softwareId ? Store.findSoftware(db, state.softwareId) : null;
    const started = Object.keys(state.subfactores).length > 0;
    const org = db.config.organizacion;
    const recent = savedEvaluations()
      .filter((e) => e !== state)
      .sort((a, b) => String(b.actualizadoEn).localeCompare(String(a.actualizadoEn)))
      .slice(0, 4);

    const swSelect = `<div class="field"><label for="sw-pick">Software del catálogo</label>
        <select id="sw-pick" class="select" data-action-change="pick-software">
          <option value="">— Registrar un software nuevo —</option>
          ${db.softwares
            .slice()
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map((s) => `<option value="${esc(s.id)}" ${s.id === state.softwareId ? "selected" : ""}>${esc(s.nombre)}${s.version ? " " + esc(s.version) : ""}</option>`)
            .join("")}
        </select></div>`;

    const swFields = linked
      ? `<div class="linked-sw">
          <span class="leading" aria-hidden="true">${avatar(linked.nombre)}</span>
          <div><strong>${esc(linked.nombre)}</strong><div class="small muted">${esc([linked.version, linked.licencia, linked.proveedor].filter(Boolean).join(" · ") || "Sin más datos")}</div></div>
          <a class="btn btn-ghost btn-sm" ${navAttrs("software", linked.id)}>${icon("edit", 16)} Ficha</a>
        </div>`
      : `<div class="field"><label for="sw-nombre">Nombre del software</label><input id="sw-nombre" class="input" placeholder="Ej. Moodle, Odoo, LibreOffice" data-field="software.nombre" value="${esc(sw.nombre)}" /></div>
         <div class="grid-2">
           <div class="field"><label for="sw-version">Versión</label><input id="sw-version" class="input" placeholder="Ej. 4.3" data-field="software.version" value="${esc(sw.version)}" /></div>
           <div class="field"><label for="sw-lic">Tipo de licencia</label>
             <select id="sw-lic" class="select" data-field="software.licencia">
               <option value="">Seleccione…</option>
               ${LICENCIAS.map((l) => `<option ${sw.licencia === l ? "selected" : ""}>${esc(l)}</option>`).join("")}
             </select></div>
         </div>
         <div class="field"><label for="sw-prov">Proveedor / comunidad</label><input id="sw-prov" class="input" data-field="software.proveedor" value="${esc(sw.proveedor)}" /></div>`;

    const templates = db.plantillas.length && !started
      ? `<div class="field"><label for="tpl-pick">Plantilla de importancia (opcional)</label>
          <select id="tpl-pick" class="select" data-action-change="apply-template">
            <option value="">Importancias sugeridas por la guía</option>
            ${db.plantillas.map((p) => `<option value="${esc(p.id)}" ${state.plantilla && state.plantilla.id === p.id ? "selected" : ""}>${esc(p.nombre)}</option>`).join("")}
          </select></div>`
      : "";

    const recentCard = recent.length
      ? `<section class="card">
          <div class="card-header"><h2 class="h3">Otras evaluaciones</h2><a class="btn btn-ghost btn-sm" ${navAttrs("evaluaciones")}>Ver todas ${icon("chevronRight", 16)}</a></div>
          <div class="list list-flush">
            ${recent
              .map((e) => {
                const st = statusOf(e);
                const rec = resultOf(e).recomendacion;
                return `<a class="list-item" ${navAttrs("evaluacion", e.id)}>
                  <span class="leading">${avatar(e.software.nombre)}</span>
                  <span class="title">${esc(e.software.nombre || "Software sin nombre")}<span class="subtitle">${esc(fmtDate(e.actualizadoEn))}</span></span>
                  ${st === "Completada" && rec ? `<span class="detail">Recomendación ${rec.codigo}</span>` : ""}
                  ${statusBadge(st)}
                  <span class="chevron">${icon("chevronRight")}</span>
                </a>`;
              })
              .join("")}
          </div>
        </section>`
      : `<section class="card card-soft">
          <div class="card-body stack">
            <h2 class="h3">¿Primera vez?</h2>
            <p class="small muted">Cargue un ejemplo con tres evaluaciones (Moodle, Chamilo y Open edX) para recorrer el panel, el comparador y el informe.</p>
            <div><button class="btn btn-secondary" data-action="demo">${icon("star")} Cargar ejemplo</button></div>
          </div>
        </section>`;

    return `
      ${header(
        org.nombre ? `Guía GUIOS · ${org.nombre}` : "Guía GUIOS para la adopción de software",
        "Evalúe si un software es adecuado para su organización",
        "",
        "Tres pasos: indique qué factores le importan, valore si el software los cumple y obtenga una recomendación."
      )}
      <div class="hero">
        <section class="card">
          <div class="card-header"><h2 class="h3">${hasData() ? "Evaluación en curso" : "Nueva evaluación"}</h2>${hasData() ? statusBadge(progress(E.evaluate(DATA, state)).status.label) : ""}</div>
          <div class="card-body stack">
            ${swSelect}
            ${swFields}
            <div class="grid-2">
              <div class="field"><label for="sw-org">Organización</label><input id="sw-org" class="input" data-field="software.organizacion" value="${esc(sw.organizacion)}" /></div>
              <div class="field"><label for="sw-eval">Evaluador</label><input id="sw-eval" class="input" data-field="software.evaluador" value="${esc(sw.evaluador)}" placeholder="Nombre o área" /></div>
            </div>
            ${templates}
          </div>
          <div class="card-footer">
            <button class="btn btn-ghost" data-action="how">${icon("help")} ¿Cómo funciona?</button>
            <span class="spacer"></span>
            ${hasData() ? `<button class="btn btn-ghost" data-action="new-eval">${icon("plus")} Nueva evaluación</button>` : ""}
            <button class="btn btn-primary" data-action="start">${started ? "Continuar" : "Comenzar"} ${icon("chevronRight")}</button>
          </div>
        </section>
        ${recentCard}
      </div>`;
  }

  /** Vincula la evaluación activa con el catálogo de softwares (lo registra si es nuevo). */
  function linkSoftware() {
    if (state.softwareId || !state.software.nombre.trim()) return;
    let sw = Store.softwareByName(db, state.software.nombre);
    if (!sw) {
      sw = Store.normalizeSoftware(state.software);
      db.softwares.push(sw);
      toast(`«${sw.nombre}» se registró en el catálogo de softwares`);
    }
    state.softwareId = sw.id;
    save();
  }

  /* ------------------------------------------------------------------ */
  /* Paso 1 · Importancia (GUIOS 1-2)                                    */
  /* ------------------------------------------------------------------ */
  function renderPaso1(result) {
    const byDim = DATA.dimensiones.map((d) => ({ d, rows: result.factores.filter((f) => f.dimension === d.id) }));
    const changed = result.factores.filter((f) => f.importanciaDecisor !== f.importanciaSugerida).length;
    const toggle = `<label class="switch"><button type="button" class="toggle" role="switch" aria-checked="${ui.detail}" data-action="detail" aria-label="Ver cálculo"></button><span>Ver cálculo</span></label>`;
    const a = ayuda();
    const tplBar = `<div class="template-bar">
        ${icon("book", 18)}
        <div class="template-text">${
          state.plantilla
            ? `Plantilla aplicada: <strong>${esc(state.plantilla.nombre)}</strong>`
            : `<span class="muted">Sin plantilla: importancias sugeridas por la guía y sus cambios.</span>`
        }</div>
        ${
          db.plantillas.length
            ? `<select class="select select-sm" data-action-change="apply-template" aria-label="Aplicar una plantilla de importancia">
                <option value="">Aplicar plantilla…</option>
                ${db.plantillas.map((p) => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join("")}
              </select>`
            : ""
        }
        <button class="btn btn-secondary btn-sm" data-action="save-template">${icon("download", 16)} Guardar como plantilla</button>
      </div>`;
    return (
      screenHeader(toggle) +
      stepHelp("1", DATA.nivelesImportancia, a.niveles_importancia, IMPORTANCE_TONE) +
      tplBar +
      `<div class="quick-hint">
        ${icon("info")}
        <div>Ya vienen marcadas las importancias <strong>sugeridas por la guía</strong> <span class="suggested-ring" aria-hidden="true"></span>: cambie solo las que no encajen. <span class="paint-hint">Para marcar varias, mantenga pulsado el clic y arrastre por la columna.</span></div>
        ${changed ? `<button class="btn btn-ghost btn-sm" data-action="reset-decisor">Restablecer sugeridas (${changed})</button>` : `<span class="badge badge-success">Sin cambios</span>`}
      </div>
      <div class="stack">
      ${byDim
        .map(
          ({ d, rows }) => `
        <section class="card">
          <div class="card-header"><h2 class="h3">${esc(d.nombre)}</h2><span class="muted small">${plural(rows.filter((r) => r.relevante).length, "factor", "factores")} de ${rows.length}</span></div>
          <div class="factor-list scale scale-importance ${ui.detail ? "has-detail" : ""}">
            ${scaleHead("Factor", DATA.nivelesImportancia, IMPORTANCE_TONE, ui.detail ? "Relativa" : "")}
            ${rows
              .map((f) => {
                const def = factorById(f.id);
                return `<div class="factor-row ${f.relevante ? "" : "is-irrelevant"}">
                  <div class="factor-name">
                    <span>${esc(f.nombre)}</span>
                    ${
                      def.alcance === "Ambos"
                        ? `<div class="segmented" role="group" aria-label="Alcance de ${esc(f.nombre)}">
                            <button type="button" data-scope="${f.id}" data-value="Interno" aria-pressed="${f.alcance === "Interno"}">Interno</button>
                            <button type="button" data-scope="${f.id}" data-value="Externo" aria-pressed="${f.alcance === "Externo"}">Externo</button>
                          </div>`
                        : `<small>${esc(def.alcance)}</small>`
                    }
                  </div>
                  ${choice({ name: `dec-${f.id}`, label: `Importancia de ${f.nombre}`, value: f.importanciaDecisor, levels: DATA.nivelesImportancia, tones: IMPORTANCE_TONE, attr: `data-decisor="${f.id}"`, suggested: f.importanciaSugerida, help: a.niveles_importancia })}
                  <div class="factor-detail"><span class="sr-only">Importancia relativa:</span>${levelBadge(f.importanciaRelativaIdx, f.relevante)}</div>
                </div>`;
              })
              .join("")}
          </div>
        </section>`
        )
        .join("")}
      </div>`
    );
  }

  /* ------------------------------------------------------------------ */
  /* Paso 2 · Cumplimiento (GUIOS 3-4)                                   */
  /* ------------------------------------------------------------------ */
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  /** Subfactores visibles de un factor según la búsqueda y el filtro de pendientes (HU-25). */
  function visibleSubs(def) {
    const q = norm(ui.q.trim());
    const nameHit = q && norm(def.nombre).includes(q);
    return def.subfactores.filter((s) => (!ui.onlyPending || !state.subfactores[s.id]) && (!q || nameHit || norm(s.nombre).includes(q)));
  }

  function renderPaso2(result) {
    const allRelevant = result.factores.filter((f) => f.relevante);
    const head = screenHeader(iaReady() ? `<span class="badge badge-primary">${icon("sparkle", 14)} Asistente de IA disponible</span>` : "");
    if (!allRelevant.length) {
      return head + `<div class="alert alert-warning">${icon("alert")}<div>No hay factores para evaluar. Vuelva al <a href="#paso-1-2" data-nav="1">paso 1</a> y asigne una importancia distinta de <em>Irrelevante</em>.</div></div>`;
    }
    const filtering = !!ui.q.trim() || ui.onlyPending;
    const relevant = filtering ? allRelevant.filter((f) => visibleSubs(factorById(f.id)).length) : allRelevant;
    const matches = relevant.reduce((n, f) => n + visibleSubs(factorById(f.id)).length, 0);
    const a = ayuda();

    const toolbar = `<div class="toolbar">
        <label class="search">${icon("search", 16)}<input type="search" class="input" placeholder="Buscar factor o requisito" value="${esc(ui.q)}" data-search="q" aria-label="Buscar factor o requisito" /></label>
        <label class="switch"><button type="button" class="toggle" role="switch" aria-checked="${ui.onlyPending}" data-action="only-pending" aria-label="Solo pendientes"></button><span>Solo pendientes</span></label>
        <span class="small muted" aria-live="polite">${filtering ? `${plural(matches, "pregunta", "preguntas")} en ${plural(relevant.length, "factor", "factores")}` : `${plural(allRelevant.length, "factor", "factores")} a evaluar`}</span>
      </div>`;

    if (!relevant.length) {
      return head + stepHelp("2", DATA.nivelesSubfactor, a.niveles_subfactor, ANSWER_TONE) + toolbar + `<div class="alert">${icon("info")}<div>Ninguna pregunta coincide con el filtro. <button class="btn btn-ghost btn-sm" data-action="clear-filter">Quitar filtros</button></div></div>`;
    }

    const cur = relevant.find((f) => f.id === ui.factor) || relevant[0];
    ui.factor = cur.id;
    const def = factorById(cur.id);
    const pos = relevant.indexOf(cur);
    const pendingSubs = def.subfactores.filter((s) => !state.subfactores[s.id]);
    const subs = visibleSubs(def);
    if (!subs.some((s) => s.id === ui.sub)) {
      const firstPending = subs.find((s) => !state.subfactores[s.id]);
      ui.sub = firstPending ? firstPending.id : null;
    }
    const sugg = ui.sugerencias[def.id] || {};
    const pendingSugg = Object.keys(sugg).length;

    const side = `
      <aside class="side card">
        <div class="list">
          ${relevant
            .map(
              (f, i) => `<button class="list-item" data-factor="${f.id}" ${f.id === cur.id ? 'aria-current="true"' : ""}>
                <span class="leading ${f.completo ? "" : "is-muted"}">${f.completo ? icon("check", 14) : i + 1}</span>
                <span class="title">${esc(f.nombre)}</span>
                <span class="detail">${f.subfactoresRespondidos}/${f.subfactoresTotal}</span>
              </button>`
            )
            .join("")}
        </div>
      </aside>`;
    const mobileSelect = `<div class="mobile-factor-select field">
      <select class="select" data-factor-select aria-label="Factor">
        ${relevant.map((f) => `<option value="${f.id}" ${f.id === cur.id ? "selected" : ""}>${f.completo ? "✓ " : ""}${esc(f.nombre)} (${f.subfactoresRespondidos}/${f.subfactoresTotal})</option>`).join("")}
      </select></div>`;

    const iaBtn = iaReady()
      ? `<button class="btn btn-secondary btn-sm" data-action="ia-suggest" ${ui.iaBusy === def.id ? "disabled" : ""}>${icon("sparkle", 16)} ${ui.iaBusy === def.id ? "Consultando…" : "Sugerir con IA"}</button>`
      : "";

    const row = (s, i) => {
      const value = state.subfactores[s.id];
      const fromIA = state.origenIA[s.id] && state.origenIA[s.id].valor === value;
      const obs = state.observaciones[s.id];
      const sg = sugg[s.id];
      const noteOpen = ui.note === s.id;
      return `<div class="subfactor-row ${s.id === ui.sub ? "is-active" : ""} ${value ? "is-answered" : ""}" data-sub-row="${s.id}">
          <div class="text">
            <span class="idx">${value ? icon("check", 12) : def.subfactores.indexOf(s) + 1}</span>
            <span id="q-${s.id}">${esc(s.nombre)}
              <span class="row-tags">
                ${fromIA ? `<span class="badge badge-primary badge-xs" title="Valor sugerido por la IA y aceptado por el evaluador">IA</span>` : ""}
                <button type="button" class="note-btn ${obs ? "has-note" : ""}" data-note="${s.id}" aria-expanded="${noteOpen}" aria-label="${obs ? "Ver observación" : "Añadir observación o evidencia"}" title="${obs ? "Observación: " + esc(obs.texto || obs.enlace) : "Añadir observación o evidencia"}">${icon("note", 14)}${obs ? "<span>Nota</span>" : ""}</button>
              </span>
            </span>
          </div>
          ${choice({ name: `sub-${s.id}`, label: s.nombre, value, levels: DATA.nivelesSubfactor, short: ANSWER_SHORT, tones: ANSWER_TONE, attr: `data-sub="${s.id}"`, help: a.niveles_subfactor })}
        </div>
        ${
          sg
            ? `<div class="ia-suggestion" role="group" aria-label="Sugerencia de la IA para: ${esc(s.nombre)}">
                ${icon("sparkle", 16)}
                <div class="ia-text"><strong>IA sugiere: ${esc(DATA.nivelesSubfactor[sg.valor - 1])}</strong> <span class="muted">· confianza ${Math.round(sg.confianza * 100)} %</span><div class="small">${esc(sg.justificacion)}</div></div>
                <div class="ia-actions">
                  <button class="btn btn-primary btn-sm" data-ia-accept="${s.id}">Aceptar</button>
                  <button class="btn btn-ghost btn-sm" data-ia-discard="${s.id}">Descartar</button>
                </div>
              </div>`
            : ""
        }
        ${
          noteOpen
            ? `<div class="note-editor">
                <div class="field"><label for="obs-${s.id}">Observación</label><textarea id="obs-${s.id}" class="input" rows="2" data-obs="${s.id}" data-obs-key="texto" placeholder="Qué se comprobó y dónde">${esc(obs ? obs.texto : "")}</textarea></div>
                <div class="field"><label for="lnk-${s.id}">Enlace de evidencia</label><input id="lnk-${s.id}" class="input" type="url" data-obs="${s.id}" data-obs-key="enlace" placeholder="https://…" value="${esc(obs ? obs.enlace : "")}" /></div>
                <button class="btn btn-ghost btn-sm" data-note="${s.id}">Cerrar</button>
              </div>`
            : ""
        }`;
    };

    const panel = `
      <section class="card">
        <div class="card-header">
          <div>
            <h2 class="h3">${esc(cur.nombre)}</h2>
            <div class="small muted">${esc(dimName(cur.dimension))} · ${pos + 1} de ${relevant.length}</div>
          </div>
          <div class="actions">
            ${iaBtn}
            <span class="badge ${cur.completo ? "badge-success" : "badge-plain"}">${cur.subfactoresRespondidos} de ${cur.subfactoresTotal}</span>
          </div>
        </div>
        ${
          pendingSugg
            ? `<div class="quick-fill">${icon("sparkle", 16)}<span class="small">${plural(pendingSugg, "sugerencia pendiente", "sugerencias pendientes")} de revisar.</span>
                <button class="btn btn-secondary btn-sm" data-action="ia-accept-all">Aceptar todas</button>
                <button class="btn btn-ghost btn-sm" data-action="ia-discard-all">Descartar todas</button></div>`
            : pendingSubs.length > 1
              ? `<div class="quick-fill">
                  <span class="small muted">Responder ${plural(pendingSubs.length, "pendiente", "pendientes")} como:</span>
                  ${[4, 3, 1].map((v) => `<button class="btn btn-secondary btn-sm" data-fill="${v}" style="--c:${ANSWER_TONE[v - 1]}">${ANSWER_SHORT[v - 1]}</button>`).join("")}
                </div>`
              : ""
        }
        <div class="scale scale-answer">
          ${scaleHead("Requisito", ANSWER_SHORT, ANSWER_TONE)}
          ${subs.map(row).join("")}
        </div>
        <div class="card-footer">
          <button class="btn btn-secondary" data-factor="${pos > 0 ? relevant[pos - 1].id : ""}" ${pos === 0 ? "disabled" : ""}>${icon("chevronLeft")} Anterior</button>
          <span class="spacer"></span>
          ${
            pos < relevant.length - 1
              ? `<button class="btn btn-primary" data-factor="${relevant[pos + 1].id}">Siguiente factor ${icon("chevronRight")}</button>`
              : `<button class="btn btn-primary" data-nav="3">Ver resultado ${icon("chevronRight")}</button>`
          }
        </div>
      </section>`;
    const hint = `<p class="lead">Un clic por pregunta; mantenga pulsado y arrastre para responder varias seguidas. <span class="kbd-hint">Teclado: <kbd>1</kbd>–<kbd>4</kbd> responde la pregunta resaltada.</span></p>`;
    return head + stepHelp("2", DATA.nivelesSubfactor, a.niveles_subfactor, ANSWER_TONE) + hint + toolbar + mobileSelect + `<div class="split">${side}<div>${panel}</div></div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Bloques de resultado (paso 3, detalle, informe)                     */
  /* ------------------------------------------------------------------ */
  const QUADRANTS = [
    { key: "Fortaleza", letter: "F", title: "Fortalezas", one: "fortaleza", hint: "Internas · a favor", icon: "shield", pos: "tl" },
    { key: "Oportunidad", letter: "O", title: "Oportunidades", one: "oportunidad", hint: "Externas · a favor", icon: "trendingUp", pos: "tr" },
    { key: "Debilidad", letter: "D", title: "Debilidades", one: "debilidad", hint: "Internas · en contra", icon: "trendingDown", pos: "bl" },
    { key: "Amenaza", letter: "A", title: "Amenazas", one: "amenaza", hint: "Externas · en contra", icon: "alert", pos: "br" },
  ];
  const FODA_SERIES = [
    { key: "Fortaleza", label: "Fortalezas", color: "var(--foda-fortaleza)" },
    { key: "Oportunidad", label: "Oportunidades", color: "var(--foda-oportunidad)" },
    { key: "Debilidad", label: "Debilidades", color: "var(--foda-debilidad)" },
    { key: "Amenaza", label: "Amenazas", color: "var(--foda-amenaza)" },
  ];
  const TONE_COLOR = { success: "var(--color-success)", warning: "var(--color-warning)", danger: "var(--color-danger)", primary: "var(--color-primary)" };

  function verdictCard(result, data, swName, pendingLinks) {
    const rec = result.recomendacion;
    const verdicts = data.reglas.slice().sort((a, b) => a.codigo.localeCompare(b.codigo));
    const pending = result.pendientes.map((id) => factorById(id, data));
    return `<section class="card verdict tone-${rec.tono}">
        <div class="verdict-main">
          <span class="verdict-code" aria-hidden="true">${rec.codigo}</span>
          <div class="verdict-text">
            <div class="verdict-kicker">Recomendación ${rec.codigo}${swName ? ` · ${esc(swName)}` : ""}</div>
            <h2 class="h2">${esc(rec.titulo)}</h2>
            <p>${esc(rec.texto)}</p>
            ${
              rec.factoresCriticos.length
                ? `<div class="critical"><span class="small muted">Factores a revisar:</span>${rec.factoresCriticos.map((f) => `<span class="badge badge-${f.foda}">${esc(f.nombre)}</span>`).join("")}</div>`
                : ""
            }
          </div>
        </div>
        <ol class="verdict-scale" aria-label="Escala de recomendación">
          ${verdicts
            .map(
              (v) => `<li class="tone-${v.tono} ${v.codigo === rec.codigo ? "is-current" : ""}" ${v.codigo === rec.codigo ? 'aria-current="true"' : ""}>
                <span class="verdict-step">${v.codigo}</span><span class="verdict-step-label">${esc(v.titulo)}</span>
              </li>`
            )
            .join("")}
        </ol>
        ${
          pending.length
            ? `<div class="alert alert-warning verdict-alert">${icon("alert")}<div>Resultado parcial: faltan por responder ${
                pendingLinks
                  ? pending.map((f) => `<button class="link-btn" data-goto-factor="${f.id}">${esc(f.nombre)}</button>`).join(", ")
                  : esc(pending.map((f) => f.nombre).join(", "))
              }.</div></div>`
            : ""
        }
      </section>`;
  }

  function fodaBoard(result) {
    const evaluated = result.factores.filter((f) => f.foda);
    const quadrant = (q) => {
      const fs = evaluated.filter((f) => f.foda === q.key).sort((a, b) => b.ponderacion - a.ponderacion);
      return `<article class="foda-q foda-q-${q.pos}" style="--q:var(--foda-${q.key.toLowerCase()}-solid)" aria-label="${q.title}: ${fs.length}">
        <header class="foda-q-head">
          <span class="foda-q-icon">${icon(q.icon, 22)}</span>
          <div class="foda-q-title">
            <h3><span class="foda-q-letter" aria-hidden="true">${q.letter}</span>${q.title}</h3>
            <small>${q.hint}</small>
          </div>
          <span class="foda-q-count">${fs.length}</span>
        </header>
        ${
          fs.length
            ? `<ul class="foda-chips">${fs.map((f) => `<li title="${esc(f.nombre)} · cumplimiento medio ${fmt(f.ponderacion)} de 4"><span>${esc(f.nombre)}</span><b>${fmt(f.ponderacion)}</b></li>`).join("")}</ul>`
            : `<p class="foda-q-empty">Ninguna ${q.one} detectada</p>`
        }
      </article>`;
    };
    const total = result.positivos + result.negativos;
    return `<section class="card">
        <div class="card-header">
          <div>
            <h2 class="h3">Matriz FODA</h2>
            <div class="small muted">${plural(total, "factor evaluado", "factores evaluados")} · cumplimiento medio de 1 a 4</div>
          </div>
          <div class="foda-balance" role="img" aria-label="${result.positivos} a favor y ${result.negativos} en contra">
            <span class="foda-balance-num is-pos">${result.positivos}<small>a favor</small></span>
            <span class="foda-balance-bar"><span style="--n:${result.positivos}"></span><span style="--n:${result.negativos}"></span></span>
            <span class="foda-balance-num is-neg">${result.negativos}<small>en contra</small></span>
          </div>
        </div>
        <div class="card-body">
          <div class="foda-axis" aria-hidden="true"><span>Origen interno</span><span>Origen externo</span></div>
          <div class="foda-board">
            ${QUADRANTS.map(quadrant).join("")}
            <div class="foda-core" aria-hidden="true">${QUADRANTS.map((q) => `<span style="--q:var(--foda-${q.key.toLowerCase()}-solid)">${q.letter}</span>`).join("")}</div>
          </div>
        </div>
      </section>`;
  }

  /** Barras horizontales de la matriz FODA (HU-22), con etiqueta y valor en texto. */
  function fodaBars(counts) {
    const max = Math.max(1, ...FODA_SERIES.map((x) => counts[x.key] || 0));
    return `<div class="hbars" role="img" aria-label="${FODA_SERIES.map((x) => `${x.label}: ${counts[x.key] || 0}`).join(", ")}">
        ${FODA_SERIES.map(
          (x) => `<div class="hbar" title="${x.label}: ${counts[x.key] || 0}">
            <span class="hbar-label">${x.label}</span>
            <span class="hbar-track"><span style="--q-color:${x.color};--w:${((counts[x.key] || 0) / max) * 100}%"></span></span>
            <span class="hbar-value">${counts[x.key] || 0}</span>
          </div>`
        ).join("")}
      </div>`;
  }

  /** Tarjeta de gráficos: radar por dimensión + barras FODA + tabla equivalente. */
  function chartsCard(result, data, title) {
    const dims = result.dimensiones;
    const radar = Charts.radar({
      axes: dims.map((d) => d.nombre),
      series: [{ label: "Cumplimiento", color: "var(--series-1)", values: dims.map((d) => d.ponderacion) }],
      threshold: data.umbralFoda,
      title: `Cumplimiento por dimensión: ${dims.map((d) => `${d.nombre} ${d.ponderacion == null ? "sin datos" : fmt(d.ponderacion)}`).join(", ")}`,
    });
    return `<section class="card charts-card">
        <div class="card-header"><h2 class="h3">${esc(title || "Gráficos de resultados")}</h2><span class="muted small">escala 1 – 4 · umbral ${data.umbralFoda}</span></div>
        <div class="card-body charts-grid">
          <figure class="chart-fig">
            ${radar}
            <figcaption class="small muted"><span class="legend-swatch is-dashed" aria-hidden="true"></span> Umbral FODA (${data.umbralFoda}): por encima, el factor es favorable.</figcaption>
          </figure>
          <figure class="chart-fig">
            <figcaption class="small muted">Factores por clasificación FODA</figcaption>
            ${fodaBars(result.foda)}
          </figure>
        </div>
        <details class="details chart-table">
          <summary>Ver los datos en tabla ${icon("chevronDown", 16)}</summary>
          <div class="table-wrap">
            <table class="table">
              <caption class="sr-only">Cumplimiento medio por dimensión y factores por clasificación FODA</caption>
              <thead><tr><th>Dimensión</th><th class="num">Cumplimiento medio</th><th class="num">Factores evaluados</th></tr></thead>
              <tbody>${dims.map((d) => `<tr><td>${esc(d.nombre)}</td><td class="num">${fmt(d.ponderacion)}</td><td class="num">${d.factoresEvaluados}</td></tr>`).join("")}</tbody>
              <tbody>${FODA_SERIES.map((x) => `<tr><td>${x.label}</td><td class="num">—</td><td class="num">${result.foda[x.key]}</td></tr>`).join("")}</tbody>
            </table>
          </div>
        </details>
      </section>`;
  }

  function factorTable(result, data) {
    return `<div class="table-wrap">
        <table class="table">
          <thead><tr><th>Factor</th><th>Importancia</th><th class="num">Cumplimiento</th><th>Alcance</th><th>Clasificación</th></tr></thead>
          <tbody>
            ${result.factores
              .map(
                (f) => `<tr class="${f.relevante ? "" : "is-muted"}">
                  <td>${esc(f.nombre)}<span class="factor-dim xs muted"><br />${esc(dimName(f.dimension, data))}</span></td>
                  <td>${levelBadge(f.importanciaRelativaIdx, f.relevante, data)}</td>
                  <td class="num">${fmt(f.ponderacion)}</td>
                  <td class="muted">${f.relevante ? esc(f.alcance) : "—"}</td>
                  <td>${f.relevante ? (f.foda ? fodaBadge(f.foda) : `<span class="badge badge-plain badge-warning">Pendiente</span>`) : `<span class="badge badge-plain muted">No evaluado</span>`}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Paso 3 · Resultado (GUIOS 5-6)                                      */
  /* ------------------------------------------------------------------ */
  function renderPaso3(result) {
    const evaluated = result.factores.filter((f) => f.foda);
    const actions = `<button class="btn btn-secondary" data-nav="informe" data-param="${esc(state.id)}">${icon("file")} Ver informe</button>`;
    if (!evaluated.length) {
      return screenHeader() + `<div class="alert alert-warning">${icon("alert")}<div>Todavía no hay respuestas. Complete el <a href="#paso-3-4" data-nav="2">paso 2</a> para ver el resultado.</div></div>`;
    }
    const a = ayuda();
    return (
      screenHeader(actions) +
      `<details class="details help-box"><summary>${icon("help", 16)} ¿Cómo se obtiene este resultado? ${icon("chevronDown", 16)}</summary><div class="help-body"><p>${esc((a.pasos || {})["3"] || "")}</p></div></details>
      <div class="stack">
        ${verdictCard(result, DATA, state.software.nombre, true)}
        ${fodaBoard(result)}
        ${chartsCard(result, DATA)}
        <details class="details card">
          <summary class="card-header">Ver detalle por factor ${icon("chevronDown", 16)}</summary>
          ${factorTable(result, DATA)}
        </details>
      </div>`
    );
  }

  /* ------------------------------------------------------------------ */
  /* Panel (dashboard) · HU-26, HU-40                                    */
  /* ------------------------------------------------------------------ */
  function kpi(iconName, label, value, hint, color) {
    return `<div class="kpi" style="--kpi-color:${color || "var(--color-primary)"}">
      <span class="kpi-icon">${icon(iconName, 20)}</span>
      <div class="kpi-body">
        <div class="kpi-label">${esc(label)}</div>
        <div class="kpi-value">${value}</div>
        ${hint ? `<div class="kpi-hint">${esc(hint)}</div>` : ""}
      </div>
    </div>`;
  }

  function entriesFor(list) {
    return list.map((e) => ({
      id: e.id,
      fecha: e.completadoEn || e.actualizadoEn,
      software: e.software.nombre || "Software sin nombre",
      softwareId: e.softwareId,
      estado: statusOf(e),
      result: resultOf(e),
    }));
  }

  function renderPanel(result) {
    const evals = savedEvaluations();
    const head = (actions) => header("Panel", "Estado de sus evaluaciones", actions);
    if (!evals.length && !hasData()) {
      return (
        head() +
        emptyState(
          "grid",
          "Todavía no hay evaluaciones",
          "Registre un software y responda los tres pasos de la guía. Aquí verá el avance, la distribución FODA, el cumplimiento por dimensión y la evolución en el tiempo.",
          `<button class="btn btn-secondary" data-action="demo">${icon("star")} Ver un ejemplo</button>
           <button class="btn btn-primary" data-nav="inicio">Nueva evaluación ${icon("chevronRight")}</button>`
        )
      );
    }
    const entries = entriesFor(evals);
    const sum = E.summarize(entries);
    const sw = state.software;
    const p = progress(result);
    const next = nextStep(result);

    const actions = `<button class="btn btn-secondary" data-action="new-eval">${icon("plus")} Nueva evaluación</button>
      ${hasData() ? `<button class="btn btn-primary" data-nav="${next}">${p.complete ? "Ver resultado" : "Continuar"} ${icon("chevronRight")}</button>` : ""}`;

    const current = hasData()
      ? `<section class="card dash-current">
          <div class="card-body">
            <div class="gauge" role="progressbar" aria-valuenow="${p.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Avance de la evaluación en curso" style="--value:${p.pct};--gauge-color:${p.complete ? "var(--color-success)" : "var(--color-primary)"}">
              <span class="gauge-value">${p.pct}<small>%</small></span>
            </div>
            <div class="dash-current-text">
              <span class="small muted">Evaluación en curso</span>
              <h2 class="h3">${sw.nombre ? esc(sw.nombre) : "Software sin nombre"}</h2>
              <p class="small muted">${p.answered} de ${p.total} preguntas${p.complete ? " · completa" : ` · siguiente: paso ${next}, ${esc(SCREENS[next].label.toLowerCase())}`}</p>
              ${statusBadge(p.status.label)}
            </div>
          </div>
        </section>`
      : `<section class="card dash-current"><div class="card-body"><div class="dash-current-text"><span class="small muted">Evaluación en curso</span><h2 class="h3">Ninguna</h2><p class="small muted">Empiece una nueva desde Inicio o desde la ficha de un software.</p></div></div></section>`;

    const recTotal = sum.recomendaciones.A + sum.recomendaciones.B + sum.recomendaciones.C;
    const kpis = `<div class="kpi-grid">
        ${kpi("clock", "Evaluaciones", `${sum.total}`, `${sum.porEstado["En proceso"]} en proceso · ${sum.porEstado.Completada} completadas`)}
        ${kpi("box", "Softwares registrados", `${db.softwares.length}`, db.softwares.length ? "En el catálogo" : "Catálogo vacío")}
        ${kpi("star", "Recomendaciones emitidas", `${recTotal}`, recTotal ? `A ${sum.recomendaciones.A} · B ${sum.recomendaciones.B} · C ${sum.recomendaciones.C}` : "Ninguna completada", recTotal ? "var(--color-success)" : "var(--color-text-3)")}
        ${kpi("pie", "A favor / en contra", `${sum.foda.Fortaleza + sum.foda.Oportunidad}<small> / ${sum.foda.Debilidad + sum.foda.Amenaza}</small>`, "Factores en evaluaciones completadas")}
      </div>`;

    const last = sum.ultimas.map((id) => entries.find((e) => e.id === id));
    const list = `<section class="card">
        <div class="card-header"><h2 class="h3">Últimas evaluaciones</h2><a class="btn btn-ghost btn-sm" ${navAttrs("evaluaciones")}>Ver todas ${icon("chevronRight", 16)}</a></div>
        <div class="list list-flush">
          ${last
            .map((e) => {
              const ev = evalById(e.id);
              const rec = e.result.recomendacion;
              return `<a class="list-item" ${navAttrs("evaluacion", e.id)}>
                <span class="leading">${avatar(e.software)}</span>
                <span class="title">${esc(e.software)}<span class="subtitle">${esc([fmtDate(ev.actualizadoEn), ev.software.evaluador].filter(Boolean).join(" · "))}</span></span>
                ${e.estado === "Completada" && rec ? `<span class="detail">Recomendación ${rec.codigo}</span>` : `<span class="detail">${E.progress(e.result).pct}%</span>`}
                ${statusBadge(e.estado)}
                <span class="chevron">${icon("chevronRight")}</span>
              </a>`;
            })
            .join("")}
        </div>
      </section>`;

    const fodaTotal = FODA_SERIES.reduce((n, x) => n + sum.foda[x.key], 0);
    const foda = `<section class="card">
        <div class="card-header"><h2 class="h3">Distribución FODA</h2><span class="muted small">${plural(sum.completadas, "evaluación completada", "evaluaciones completadas")}</span></div>
        <div class="card-body">
          ${
            fodaTotal
              ? `<div class="stacked-bar" role="img" aria-label="${FODA_SERIES.map((x) => `${x.label}: ${sum.foda[x.key]}`).join(", ")}">
                  ${FODA_SERIES.filter((x) => sum.foda[x.key]).map((x) => `<span style="--q-color:${x.color};--n:${sum.foda[x.key]}"></span>`).join("")}
                </div>`
              : `<p class="small muted">Aparecerá cuando complete al menos una evaluación.</p>`
          }
          <ul class="legend">
            ${FODA_SERIES.map((x) => `<li style="--q-color:${x.color}"><span>${x.label}</span><strong>${sum.foda[x.key]}</strong></li>`).join("")}
          </ul>
        </div>
      </section>`;

    const dims = `<section class="card">
        <div class="card-header"><h2 class="h3">Cumplimiento medio por dimensión</h2><span class="muted small">escala 1 – 4</span></div>
        <div class="card-body dim-bars">
          ${
            sum.dimensiones.length
              ? sum.dimensiones
                  .map(
                    (d) => `<div class="bar-row"><span>${esc(d.nombre)}</span>
                      <div class="progress" role="img" aria-label="${esc(d.nombre)}: ${fmt(d.ponderacion)} de 4"><span style="width:${(d.ponderacion / 4) * 100}%"></span></div>
                      <span class="num">${fmt(d.ponderacion)}</span></div>`
                  )
                  .join("")
              : `<p class="small muted">Aparecerá cuando complete al menos una evaluación.</p>`
          }
        </div>
      </section>`;

    // Línea de tiempo (HU-40)
    const swOptions = Array.from(new Set(sum.lineaTiempo.map((x) => x.software))).sort();
    const tl = sum.lineaTiempo.filter((x) => !ui.timelineSw || x.software === ui.timelineSw);
    const timeline = `<section class="card">
        <div class="card-header">
          <h2 class="h3">Línea de tiempo</h2>
          ${
            swOptions.length > 1
              ? `<select class="select select-sm" data-action-change="timeline-filter" aria-label="Filtrar la línea de tiempo por software">
                  <option value="">Todos los softwares</option>
                  ${swOptions.map((s) => `<option ${ui.timelineSw === s ? "selected" : ""}>${esc(s)}</option>`).join("")}
                </select>`
              : ""
          }
        </div>
        <div class="card-body">
          ${
            tl.length < 2
              ? `<p class="small muted">La evolución aparece cuando hay al menos dos evaluaciones completadas${ui.timelineSw ? " de este software" : ""}.</p>${tl.length ? timelineList(tl) : ""}`
              : timelineList(tl)
          }
        </div>
      </section>`;

    const shortcuts = `<section class="card card-soft">
        <div class="card-body shortcuts">
          <a class="btn btn-secondary" ${navAttrs("softwares")}>${icon("box")} Softwares</a>
          <a class="btn btn-secondary" ${navAttrs("comparar")}>${icon("columns")} Comparar</a>
          ${hasData() ? `<a class="btn btn-secondary" ${navAttrs("informe", state.id)}>${icon("file")} Informe</a>` : ""}
          <a class="btn btn-secondary" ${navAttrs("datos")}>${icon("database")} Importar / exportar</a>
        </div>
      </section>`;

    return (
      head(actions) +
      `<div class="stack">
        <div class="dash-top">${current}${kpis}</div>
        ${shortcuts}
        <div class="grid-2">${list}${timeline}</div>
        <div class="grid-2">${foda}${dims}</div>
      </div>`
    );
  }

  function timelineList(items) {
    return `<ol class="timeline">
        ${items
          .map(
            (x) => `<li class="tone-${x.tono}">
              <a ${navAttrs("informe", x.id)} class="timeline-item">
                <span class="timeline-dot" aria-hidden="true">${x.recomendacion}</span>
                <span class="timeline-text"><strong>${esc(x.software)}</strong><small>${esc(fmtDate(x.fecha))}</small></span>
                ${recBadge(x.recomendacion)}
              </a>
            </li>`
          )
          .join("")}
      </ol>`;
  }

  /* ------------------------------------------------------------------ */
  /* Evaluaciones (historial) · HU-27                                    */
  /* ------------------------------------------------------------------ */
  function renderEvaluaciones() {
    const all = savedEvaluations().sort((a, b) => String(b.actualizadoEn).localeCompare(String(a.actualizadoEn)));
    const head = header("Historial", "Evaluaciones", `<button class="btn btn-primary" data-action="new-eval">${icon("plus")} Nueva evaluación</button>`);
    if (!all.length) {
      return head + emptyState("clock", "Todavía no hay evaluaciones guardadas", "Cada evaluación que empiece se guarda aquí automáticamente, con su estado y su recomendación.", `<button class="btn btn-secondary" data-action="demo">${icon("star")} Cargar ejemplo</button><button class="btn btn-primary" data-action="new-eval">Nueva evaluación</button>`);
    }
    const q = norm(ui.histQ.trim());
    const rows = all.filter((e) => {
      const st = statusOf(e);
      if (ui.histEstado && st !== ui.histEstado) return false;
      return !q || norm([e.software.nombre, e.software.evaluador, e.software.organizacion].join(" ")).includes(q);
    });
    const selectable = (e) => statusOf(e) === "Completada";
    const sel = ui.compare.filter((id) => all.some((e) => e.id === id));
    ui.compare = sel;

    const toolbar = `<div class="toolbar">
        <label class="search">${icon("search", 16)}<input type="search" class="input" placeholder="Buscar por software o evaluador" value="${esc(ui.histQ)}" data-search="histQ" aria-label="Buscar evaluaciones" /></label>
        <select class="select select-sm" data-action-change="hist-estado" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          ${Store.ESTADOS.map((s) => `<option ${ui.histEstado === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
        <span class="spacer"></span>
        <button class="btn btn-secondary btn-sm" data-nav="comparar" data-param="${esc(sel.join(","))}" ${sel.length >= 2 && sel.length <= 5 ? "" : "disabled"}>${icon("columns", 16)} Comparar (${sel.length})</button>
      </div>`;

    const list = rows.length
      ? `<section class="card"><ul class="rows">
          ${rows
            .map((e) => {
              const st = statusOf(e);
              const r = resultOf(e);
              const p = E.progress(r);
              const active = e === state;
              const can = selectable(e);
              return `<li class="row-item ${active ? "is-active" : ""}">
                <label class="row-check" title="${can ? "Seleccionar para comparar" : "Solo se comparan evaluaciones completadas"}">
                  <input type="checkbox" data-compare-pick="${esc(e.id)}" ${sel.includes(e.id) ? "checked" : ""} ${can ? "" : "disabled"} aria-label="Comparar ${esc(e.software.nombre || "evaluación")}" />
                </label>
                <span class="leading" aria-hidden="true">${avatar(e.software.nombre)}</span>
                <div class="row-main">
                  <a class="row-title" ${navAttrs("evaluacion", e.id)}>${esc(e.software.nombre || "Software sin nombre")}</a>
                  <div class="small muted">${esc([fmtDate(e.actualizadoEn), e.software.evaluador, active ? "En edición" : ""].filter(Boolean).join(" · "))}</div>
                  <div class="row-meta">
                    ${statusBadge(st)}
                    ${st === "Completada" && r.recomendacion ? recBadge(r.recomendacion.codigo) : `<span class="badge badge-plain">${p.pct}% respondido</span>`}
                    ${e.cambiosLocales && serverOn() ? `<span class="badge badge-plain" title="Cambios pendientes de sincronizar">${icon("cloud", 12)} Sin sincronizar</span>` : ""}
                  </div>
                </div>
                <div class="row-actions">
                  ${st !== "Completada" ? `<button class="btn btn-primary btn-sm" data-continue="${esc(e.id)}">Continuar</button>` : `<a class="btn btn-secondary btn-sm" ${navAttrs("informe", e.id)}>${icon("file", 16)} Informe</a>`}
                  <a class="btn btn-ghost btn-sm btn-icon" ${navAttrs("evaluacion", e.id)} aria-label="Ver en modo lectura" title="Ver en modo lectura">${icon("eye", 16)}</a>
                  <button class="btn btn-ghost btn-sm btn-icon" data-duplicate="${esc(e.id)}" aria-label="Duplicar" title="Duplicar">${icon("copy", 16)}</button>
                  <button class="btn btn-ghost btn-sm btn-icon is-danger" data-delete-eval="${esc(e.id)}" aria-label="Eliminar" title="Eliminar">${icon("trash", 16)}</button>
                </div>
              </li>`;
            })
            .join("")}
        </ul></section>`
      : `<div class="alert">${icon("info")}<div>Ninguna evaluación coincide con la búsqueda.</div></div>`;
    return head + toolbar + list;
  }

  /* ------------------------------------------------------------------ */
  /* Detalle en modo lectura · HU-34                                     */
  /* ------------------------------------------------------------------ */
  function notFound(what) {
    return header("", `${esc(what)} no encontrado`) + `<div class="alert alert-warning">${icon("alert")}<div>El elemento no existe en este navegador. <a ${navAttrs("evaluaciones")}>Volver a evaluaciones</a></div></div>`;
  }

  function renderDetalle() {
    const ev = evalById(ui.param);
    if (!ev) return notFound("Evaluación");
    const data = catalogOf(ev);
    const r = resultOf(ev);
    const st = statusOf(ev);
    const sw = ev.software;
    const actions = `
      ${st === "En proceso" ? `<button class="btn btn-ghost is-danger" data-cancel-eval="${esc(ev.id)}">${icon("x")} Cancelar evaluación</button>` : ""}
      <button class="btn btn-ghost" data-duplicate="${esc(ev.id)}">${icon("copy")} Duplicar</button>
      ${st === "Cancelada" ? `<button class="btn btn-secondary" data-continue="${esc(ev.id)}">${icon("refresh")} Reactivar</button>` : st !== "Completada" ? `<button class="btn btn-secondary" data-continue="${esc(ev.id)}">${icon("edit")} Continuar</button>` : `<button class="btn btn-ghost" data-continue="${esc(ev.id)}">${icon("edit")} Editar</button>`}
      <a class="btn btn-primary" ${navAttrs("informe", ev.id)}>${icon("file")} Abrir informe</a>`;
    const meta = `<section class="card">
        <div class="card-body meta-grid">
          <div><span class="small muted">Software</span><strong>${esc(sw.nombre || "Sin nombre")}</strong>${sw.version ? `<span class="small">${esc(sw.version)}</span>` : ""}</div>
          <div><span class="small muted">Licencia</span><strong>${esc(sw.licencia || "—")}</strong></div>
          <div><span class="small muted">Evaluador</span><strong>${esc(sw.evaluador || "No indicado")}</strong><span class="small">${esc(sw.organizacion)}</span></div>
          <div><span class="small muted">Fechas</span><strong>${esc(fmtDate(ev.creadoEn))}</strong><span class="small">Actualizada ${esc(fmtDate(ev.actualizadoEn))}</span></div>
          <div><span class="small muted">Estado</span>${statusBadge(st)}</div>
          <div><span class="small muted">Versión de la guía</span><strong>${esc(ev.catalogoVersion)}</strong>${ev.plantilla ? `<span class="small">Plantilla: ${esc(ev.plantilla.nombre)}</span>` : ""}</div>
        </div>
      </section>`;

    const answers = data.factores
      .map((f) => {
        const fr = r.factores.find((x) => x.id === f.id);
        if (!fr.relevante) return "";
        return `<details class="details answer-group">
          <summary><span>${esc(f.nombre)}</span><span class="answer-sum">${fr.foda ? fodaBadge(fr.foda) : `<span class="badge badge-plain">${fr.subfactoresRespondidos}/${fr.subfactoresTotal}</span>`} <b>${fmt(fr.ponderacion)}</b></span>${icon("chevronDown", 16)}</summary>
          <ol class="answer-list">
            ${f.subfactores
              .map((s) => {
                const v = ev.subfactores[s.id];
                const o = ev.observaciones[s.id];
                const ia = ev.origenIA[s.id] && ev.origenIA[s.id].valor === v;
                return `<li>
                  <span>${esc(s.nombre)}</span>
                  <span class="answer-value" style="--c:${v ? ANSWER_TONE[v - 1] : "var(--color-text-3)"}">${v ? esc(data.nivelesSubfactor[v - 1]) : "Sin responder"}${ia ? ` <span class="badge badge-primary badge-xs">IA</span>` : ""}</span>
                  ${o ? `<div class="answer-note">${icon("note", 14)} ${esc(o.texto)}${o.enlace ? ` <a href="${esc(o.enlace)}" target="_blank" rel="noopener noreferrer">${icon("link", 14)} Evidencia</a>` : ""}</div>` : ""}
                </li>`;
              })
              .join("")}
          </ol>
        </details>`;
      })
      .join("");

    return (
      header("Evaluación · solo lectura", esc(sw.nombre || "Software sin nombre"), actions) +
      `<div class="stack">
        ${meta}
        ${r.recomendacion ? verdictCard(r, data, sw.nombre, false) : `<div class="alert alert-warning">${icon("alert")}<div>Esta evaluación todavía no tiene respuestas suficientes para emitir una recomendación.</div></div>`}
        ${r.recomendacion ? `<section class="card"><div class="card-header"><h2 class="h3">Importancia y clasificación por factor</h2></div>${factorTable(r, data)}</section>` : ""}
        <section class="card"><div class="card-header"><h2 class="h3">Respuestas</h2><span class="small muted">${E.progress(r).answered} de ${E.progress(r).total}</span></div><div class="card-body stack-sm">${answers || `<p class="small muted">No hay factores relevantes.</p>`}</div></section>
      </div>`
    );
  }

  /* ------------------------------------------------------------------ */
  /* Informe · HU-28, HU-20                                              */
  /* ------------------------------------------------------------------ */
  function wordCount(s) {
    return (String(s || "").match(/\S+/g) || []).length;
  }
  /** RNF-13: el resumen nunca puede afirmar una recomendación distinta de la calculada. */
  function contradicts(texto, code) {
    const re = /recomendaci[oó]n\s+([ABC])\b/gi;
    let m;
    while ((m = re.exec(texto || ""))) if (m[1].toUpperCase() !== code) return true;
    return false;
  }

  function renderInforme() {
    const ev = evalById(ui.param || state.id);
    if (!ev) return notFound("Evaluación");
    const data = catalogOf(ev);
    const r = resultOf(ev);
    const sw = ev.software;
    const org = db.config.organizacion;
    const actions = `
      <a class="btn btn-ghost" ${navAttrs("evaluacion", ev.id)}>${icon("eye")} Detalle</a>
      ${serverOn() && ui.server.estado === "ok" && !ev.cambiosLocales ? `<a class="btn btn-ghost" href="${esc(apiClient().reportUrl(ev.id))}" target="_blank" rel="noopener">${icon("cloud")} Informe del servidor</a>` : ""}
      <button class="btn btn-secondary" data-export-eval="${esc(ev.id)}">${icon("download")} JSON</button>
      <button class="btn btn-primary" data-action="print-now">${icon("printer")} Imprimir / PDF</button>`;
    if (!r.recomendacion) {
      return header("Informe", "Informe de evaluación", actions) + `<div class="alert alert-warning">${icon("alert")}<div>El informe estará disponible cuando haya respuestas suficientes. <button class="link-btn" data-continue="${esc(ev.id)}">Continuar la evaluación</button></div></div>`;
    }
    const resumen = ev.resumen;
    const words = wordCount(resumen && resumen.texto);
    const contra = resumen && contradicts(resumen.texto, r.recomendacion.codigo);
    const obs = [];
    data.factores.forEach((f) =>
      f.subfactores.forEach((s) => {
        const o = ev.observaciones[s.id];
        if (o) obs.push({ f, s, o });
      })
    );

    const cover = `<section class="card report-cover">
        <div class="card-body">
          <div class="report-org">
            ${org.logo ? `<img src="${esc(org.logo)}" alt="Logotipo de ${esc(org.nombre || "la organización")}" />` : `<span class="logo" aria-hidden="true">G</span>`}
            <div><strong>${esc(sw.organizacion || org.nombre || "Organización")}</strong>${org.sector ? `<div class="small muted">${esc(org.sector)}</div>` : ""}</div>
          </div>
          <div class="kicker">Informe de evaluación · guía GUIOS</div>
          <h1 class="h1">${esc(sw.nombre || "Software sin nombre")}${sw.version ? ` <span class="muted">${esc(sw.version)}</span>` : ""}</h1>
          <dl class="report-meta">
            <div><dt>Licencia</dt><dd>${esc(sw.licencia || "—")}</dd></div>
            <div><dt>Proveedor</dt><dd>${esc(sw.proveedor || "—")}</dd></div>
            <div><dt>Evaluador</dt><dd>${esc(sw.evaluador || "No indicado")}</dd></div>
            <div><dt>Fecha</dt><dd>${esc(fmtDate(ev.completadoEn || ev.actualizadoEn, true))}</dd></div>
            <div><dt>Guía</dt><dd>${esc(ev.catalogoVersion)}</dd></div>
            <div><dt>Estado</dt><dd>${esc(statusOf(ev))}</dd></div>
          </dl>
        </div>
      </section>`;

    const summary = `<section class="card report-summary ${resumen && resumen.texto.trim() ? "" : "is-empty"}">
        <div class="card-header">
          <h2 class="h3">Resumen ejecutivo</h2>
          <div class="actions no-print">
            ${iaReady() ? `<button class="btn btn-secondary btn-sm" data-ia-summary="${esc(ev.id)}" ${ui.iaBusy === "resumen" ? "disabled" : ""}>${icon("sparkle", 16)} ${ui.iaBusy === "resumen" ? "Redactando…" : resumen ? "Volver a redactar con IA" : "Redactar con IA"}</button>` : ""}
          </div>
        </div>
        <div class="card-body stack-sm">
          ${resumen && resumen.generadoIA ? `<span class="badge badge-primary">${icon("sparkle", 12)} Contenido generado con IA y revisado por el evaluador</span>` : ""}
          <label class="sr-only" for="resumen-${esc(ev.id)}">Resumen ejecutivo</label>
          <textarea id="resumen-${esc(ev.id)}" class="input report-textarea no-print" rows="7" data-resumen="${esc(ev.id)}" placeholder="Escriba aquí un resumen para el comité (entre 150 y 250 palabras)${iaReady() ? " o pida un borrador a la IA" : ""}.">${esc(resumen ? resumen.texto : "")}</textarea>
          <p class="print-only report-text">${esc(resumen ? resumen.texto : "")}</p>
          <div class="small muted no-print" data-resumen-info>${resumenInfo(words, contra, r.recomendacion.codigo)}</div>
          ${!iaReady() ? `<p class="xs muted no-print">El asistente de IA está disponible cuando se conecta el servidor en <a ${navAttrs("configuracion")}>Configuración</a>; sin él, el resumen se redacta a mano.</p>` : ""}
        </div>
      </section>`;

    const obsCard = obs.length
      ? `<section class="card"><div class="card-header"><h2 class="h3">Observaciones y evidencias</h2><span class="small muted">${obs.length}</span></div>
          <div class="card-body"><ul class="obs-list">${obs
            .map(
              (x) => `<li><strong>${esc(x.f.nombre)}</strong> · ${esc(x.s.nombre)}<div>${esc(x.o.texto)}${x.o.enlace ? ` <a href="${esc(x.o.enlace)}" target="_blank" rel="noopener noreferrer">${esc(x.o.enlace)}</a>` : ""}</div></li>`
            )
            .join("")}</ul></div></section>`
      : "";

    const iaCount = Object.keys(ev.origenIA).filter((k) => ev.origenIA[k].valor === ev.subfactores[k]).length;
    return (
      header("Informe", "Informe de evaluación", actions) +
      `<div class="stack report">
        ${cover}
        ${verdictCard(r, data, sw.nombre, false)}
        ${summary}
        ${fodaBoard(r)}
        ${chartsCard(r, data)}
        <section class="card report-detail"><div class="card-header"><h2 class="h3">Detalle por factor</h2></div>${factorTable(r, data)}</section>
        ${obsCard}
        <p class="xs muted">Generado con GUIOS PRO el ${esc(fmtDate(Store.now(), true))}. La recomendación se calcula con la matriz de la guía GUIOS; ${
          iaCount ? `${plural(iaCount, "respuesta se tomó", "respuestas se tomaron")} de sugerencias de IA aceptadas por el evaluador.` : "ninguna respuesta procede de sugerencias de IA."
        }</p>
      </div>`
    );
  }

  function resumenInfo(words, contra, code) {
    if (!words) return "Sin resumen todavía.";
    const range = words >= 150 && words <= 250 ? `${words} palabras` : `${words} palabras (se recomiendan entre 150 y 250)`;
    return contra ? `<span class="text-danger">${icon("alert", 14)} El texto menciona una recomendación distinta de la calculada (${code}). Corríjalo antes de presentarlo.</span> · ${range}` : range;
  }

  /* ------------------------------------------------------------------ */
  /* Comparar · HU-11, HU-31                                             */
  /* ------------------------------------------------------------------ */
  function renderComparar() {
    // Solo evaluaciones completadas: un resultado parcial podría inducir a error al decidir.
    const candidates = savedEvaluations().filter((e) => statusOf(e) === "Completada");
    if (ui.param) ui.compare = ui.param.split(",").filter((id) => candidates.some((e) => e.id === id)).slice(0, 5);
    const head = header("Comparación", "Comparar candidatos", "", "Elija de 2 a 5 evaluaciones completadas para verlas lado a lado.");
    if (candidates.length < 2) {
      return head + emptyState("columns", "Hacen falta al menos dos evaluaciones completadas", "Complete otra evaluación (o cargue el ejemplo) para compararlas por dimensión, factor y FODA.", `<button class="btn btn-secondary" data-action="demo">${icon("star")} Cargar ejemplo</button>`);
    }
    const sel = ui.compare;
    const picker = `<section class="card">
        <div class="card-header"><h2 class="h3">Evaluaciones</h2><span class="small muted">${sel.length} de 5 seleccionadas</span></div>
        <div class="card-body pick-grid">
          ${candidates
            .map((e) => {
              const i = sel.indexOf(e.id);
              const r = resultOf(e);
              return `<label class="pick ${i >= 0 ? "is-on" : ""}" ${i >= 0 ? `style="--s:${SERIES[i]}"` : ""}>
                <input type="checkbox" data-compare-pick="${esc(e.id)}" ${i >= 0 ? "checked" : ""} ${i < 0 && sel.length >= 5 ? "disabled" : ""} />
                <span class="pick-swatch" aria-hidden="true">${i >= 0 ? i + 1 : ""}</span>
                <span><strong>${esc(e.software.nombre || "Sin nombre")}</strong><small>${esc(fmtDate(e.completadoEn || e.actualizadoEn))}</small></span>
                ${recBadge(r.recomendacion.codigo)}
              </label>`;
            })
            .join("")}
        </div>
      </section>`;
    if (sel.length < 2) return head + picker;

    const evs = sel.map(evalById);
    const cmp = E.compare(evs.map((e) => ({ id: e.id, software: e.software.nombre || "Sin nombre", result: resultOf(e) })));
    const names = cmp.evaluaciones.map((x, i) => `<th class="num" style="--s:${SERIES[i]}"><span class="series-key">${i + 1}</span> ${esc(x.software)}</th>`).join("");
    const cell = (v, i, best, isFactor) =>
      v == null
        ? `<td class="num muted">—</td>`
        : `<td class="num ${best === i ? "is-best" : ""}">${best === i ? `${icon("star", 12)} ` : ""}${fmt(v.ponderacion)}${isFactor && v.foda ? `<br />${fodaBadge(v.foda)}` : isFactor && !v.relevante ? `<br /><span class="xs muted">No evaluado</span>` : ""}</td>`;
    const radar = Charts.radar({
      axes: cmp.dimensiones.map((d) => d.nombre),
      series: cmp.evaluaciones.map((x, i) => ({ label: x.software, color: SERIES[i], values: cmp.dimensiones.map((d) => (d.valores[i] ? d.valores[i].ponderacion : null)) })),
      threshold: BASE.umbralFoda,
      title: "Cumplimiento por dimensión de las evaluaciones seleccionadas",
    });
    const legend = `<ul class="legend legend-inline">${cmp.evaluaciones.map((x, i) => `<li style="--q-color:${SERIES[i]}"><span>${i + 1} · ${esc(x.software)}</span></li>`).join("")}</ul>`;

    const table = `<section class="card">
        <div class="card-header"><h2 class="h3">Resultados lado a lado</h2><span class="small muted">${icon("star", 12)} mayor cumplimiento de la fila</span></div>
        <div class="table-wrap">
          <table class="table compare-table">
            <thead><tr><th>Criterio</th>${names}</tr></thead>
            <tbody>
              <tr><th scope="row">Recomendación</th>${cmp.evaluaciones.map((x) => `<td class="num">${recBadge(x.recomendacion)}</td>`).join("")}</tr>
              <tr><th scope="row">A favor / en contra</th>${cmp.evaluaciones.map((x) => `<td class="num">${x.positivos} / ${x.negativos}</td>`).join("")}</tr>
              ${FODA_SERIES.map((f) => `<tr><th scope="row">${f.label}</th>${cmp.evaluaciones.map((x) => `<td class="num">${x.foda[f.key]}</td>`).join("")}</tr>`).join("")}
            </tbody>
            <tbody>
              <tr class="group-row"><th colspan="${cmp.evaluaciones.length + 1}">Dimensiones</th></tr>
              ${cmp.dimensiones.map((d) => `<tr><th scope="row">${esc(d.nombre)}</th>${d.valores.map((v, i) => cell(v, i, d.mejor, false)).join("")}</tr>`).join("")}
            </tbody>
            <tbody>
              <tr class="group-row"><th colspan="${cmp.evaluaciones.length + 1}">Factores</th></tr>
              ${cmp.factores.map((f) => `<tr><th scope="row">${esc(f.nombre)}</th>${f.valores.map((v, i) => cell(v, i, f.mejor, true)).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
      </section>`;

    return (
      head +
      `<div class="stack">
        ${picker}
        <section class="card"><div class="card-header"><h2 class="h3">Cumplimiento por dimensión</h2>${legend}</div><div class="card-body chart-center">${radar}</div></section>
        ${table}
      </div>`
    );
  }

  /* ------------------------------------------------------------------ */
  /* Softwares (catálogo) · HU-18, HU-39                                 */
  /* ------------------------------------------------------------------ */
  function evalsOfSoftware(id) {
    return savedEvaluations()
      .filter((e) => e.softwareId === id)
      .sort((a, b) => String(b.actualizadoEn).localeCompare(String(a.actualizadoEn)));
  }
  function tagChip(t, removable) {
    return `<span class="tag tag-${t.color}">${icon("tag", 12)}${esc(t.nombre)}${removable ? `<button type="button" data-tag-remove="${esc(t.nombre)}" aria-label="Quitar etiqueta ${esc(t.nombre)}">${icon("x", 12)}</button>` : ""}</span>`;
  }
  function allTags() {
    const map = {};
    db.softwares.forEach((s) => s.etiquetas.forEach((t) => (map[t.nombre.toLowerCase()] = map[t.nombre.toLowerCase()] || t)));
    return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  function renderSoftwares() {
    const head = header("Catálogo", "Softwares candidatos", `<button class="btn btn-primary" data-action="sw-new">${icon("plus")} Nuevo software</button>`);
    if (!db.softwares.length) {
      return head + emptyState("box", "Aún no hay softwares registrados", "Registre aquí los softwares que su organización está considerando. Al crear una evaluación podrá elegirlos sin volver a escribir sus datos.", `<button class="btn btn-primary" data-action="sw-new">${icon("plus")} Registrar software</button>`);
    }
    const q = norm(ui.swQ.trim());
    const tags = allTags();
    const rows = db.softwares
      .filter((s) => (!ui.swLic || s.licencia === ui.swLic) && (!ui.swTag || s.etiquetas.some((t) => t.nombre.toLowerCase() === ui.swTag)) && (!q || norm([s.nombre, s.proveedor, s.notas].join(" ")).includes(q)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    const toolbar = `<div class="toolbar">
        <label class="search">${icon("search", 16)}<input type="search" class="input" placeholder="Buscar por nombre, proveedor o notas" value="${esc(ui.swQ)}" data-search="swQ" aria-label="Buscar softwares" /></label>
        <select class="select select-sm" data-action-change="sw-lic" aria-label="Filtrar por tipo de licencia">
          <option value="">Todas las licencias</option>
          ${LICENCIAS.map((l) => `<option ${ui.swLic === l ? "selected" : ""}>${esc(l)}</option>`).join("")}
        </select>
        ${
          tags.length
            ? `<select class="select select-sm" data-action-change="sw-tag" aria-label="Filtrar por etiqueta">
                <option value="">Todas las etiquetas</option>
                ${tags.map((t) => `<option value="${esc(t.nombre.toLowerCase())}" ${ui.swTag === t.nombre.toLowerCase() ? "selected" : ""}>${esc(t.nombre)}</option>`).join("")}
              </select>`
            : ""
        }
        <span class="small muted">${plural(rows.length, "software", "softwares")}</span>
      </div>`;
    const list = rows.length
      ? `<section class="card"><div class="list list-flush">
          ${rows
            .map((s) => {
              const evs = evalsOfSoftware(s.id);
              const lastDone = evs.find((e) => statusOf(e) === "Completada");
              const rec = lastDone && resultOf(lastDone).recomendacion;
              return `<a class="list-item" ${navAttrs("software", s.id)}>
                <span class="leading">${avatar(s.nombre)}</span>
                <span class="title">${esc(s.nombre)}${s.version ? ` <span class="muted">${esc(s.version)}</span>` : ""}
                  <span class="subtitle">${esc(s.licencia || "Licencia sin indicar")} · ${plural(evs.length, "evaluación", "evaluaciones")}</span>
                  ${s.etiquetas.length ? `<span class="tag-row">${s.etiquetas.map((t) => tagChip(t)).join("")}</span>` : ""}
                </span>
                ${rec ? recBadge(rec.codigo) : ""}
                <span class="chevron">${icon("chevronRight")}</span>
              </a>`;
            })
            .join("")}
        </div></section>`
      : `<div class="alert">${icon("info")}<div>Ningún software coincide con los filtros.</div></div>`;
    return head + toolbar + list;
  }

  /* ---------- Ficha del software · HU-36, HU-39 ---------- */
  function renderFicha() {
    const s = Store.findSoftware(db, ui.param);
    if (!s) return notFound("Software");
    const evs = evalsOfSoftware(s.id);
    const actions = `
      <button class="btn btn-ghost is-danger" data-sw-delete="${esc(s.id)}">${icon("trash")} Eliminar</button>
      <button class="btn btn-secondary" data-sw-edit="${esc(s.id)}">${icon("edit")} Editar</button>
      <button class="btn btn-primary" data-sw-evaluate="${esc(s.id)}">${icon("plus")} Evaluar</button>`;
    const info = `<section class="card">
        <div class="card-body meta-grid">
          <div><span class="small muted">Versión</span><strong>${esc(s.version || "—")}</strong></div>
          <div><span class="small muted">Licencia</span><strong>${esc(s.licencia || "—")}</strong></div>
          <div><span class="small muted">Proveedor / comunidad</span><strong>${esc(s.proveedor || "—")}</strong></div>
          <div><span class="small muted">Sitio web</span>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url.replace(/^https?:\/\//, ""))}</a>` : "<strong>—</strong>"}</div>
          <div><span class="small muted">Registrado</span><strong>${esc(fmtDate(s.creadoEn))}</strong></div>
          <div><span class="small muted">Etiquetas</span><span class="tag-row">${s.etiquetas.length ? s.etiquetas.map((t) => tagChip(t)).join("") : `<span class="small muted">Sin etiquetas</span>`}</span></div>
        </div>
      </section>`;
    const notes = `<section class="card">
        <div class="card-header"><h2 class="h3">Notas internas</h2><span class="small muted">Se guardan al escribir</span></div>
        <div class="card-body"><label class="sr-only" for="sw-notes">Notas internas</label><textarea id="sw-notes" class="input" rows="4" data-sw-notes="${esc(s.id)}" placeholder="Contexto, contactos, costes estimados…">${esc(s.notas)}</textarea></div>
      </section>`;
    const history = `<section class="card">
        <div class="card-header"><h2 class="h3">Evaluaciones</h2><span class="small muted">${evs.length}</span></div>
        ${
          evs.length
            ? `<div class="list list-flush">${evs
                .map((e) => {
                  const st = statusOf(e);
                  const rec = resultOf(e).recomendacion;
                  return `<a class="list-item" ${navAttrs("evaluacion", e.id)}>
                    <span class="leading">${icon("clock", 16)}</span>
                    <span class="title">${esc(fmtDate(e.actualizadoEn))}<span class="subtitle">${esc(e.software.evaluador || "Evaluador no indicado")}</span></span>
                    ${st === "Completada" && rec ? recBadge(rec.codigo) : ""}
                    ${statusBadge(st)}
                    <span class="chevron">${icon("chevronRight")}</span>
                  </a>`;
                })
                .join("")}</div>`
            : `<div class="card-body"><p class="small muted">Todavía no se ha evaluado. <button class="link-btn" data-sw-evaluate="${esc(s.id)}">Empezar una evaluación</button></p></div>`
        }
      </section>`;
    return header("Ficha del software", esc(s.nombre), actions) + `<div class="stack">${info}<div class="grid-2">${history}${notes}</div></div>`;
  }

  /** Formulario de alta/edición de software en un pop-up (estado en ui.swForm). */
  function softwareForm(id) {
    const s = id ? Store.findSoftware(db, id) : null;
    ui.swForm = s ? Store.clone(s) : Store.normalizeSoftware({});
    if (!s) ui.swForm.id = null;
    drawSoftwareForm();
  }
  function drawSoftwareForm(error) {
    const f = ui.swForm;
    popup({
      title: f.id ? "Editar software" : "Nuevo software",
      wide: true,
      html: `<form class="stack" data-sw-form onsubmit="return false">
          ${error ? `<div class="alert alert-warning">${icon("alert")}<div>${esc(error)}</div></div>` : ""}
          <div class="field"><label for="swf-nombre">Nombre *</label><input id="swf-nombre" class="input" data-swf="nombre" value="${esc(f.nombre)}" required maxlength="120" /></div>
          <div class="grid-2">
            <div class="field"><label for="swf-version">Versión</label><input id="swf-version" class="input" data-swf="version" value="${esc(f.version)}" maxlength="40" /></div>
            <div class="field"><label for="swf-lic">Tipo de licencia</label><select id="swf-lic" class="select" data-swf="licencia"><option value="">Seleccione…</option>${LICENCIAS.map((l) => `<option ${f.licencia === l ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
          </div>
          <div class="grid-2">
            <div class="field"><label for="swf-prov">Proveedor / comunidad</label><input id="swf-prov" class="input" data-swf="proveedor" value="${esc(f.proveedor)}" maxlength="120" /></div>
            <div class="field"><label for="swf-url">Sitio web</label><input id="swf-url" class="input" type="url" data-swf="url" value="${esc(f.url)}" placeholder="https://…" /></div>
          </div>
          <div class="field"><label for="swf-notas">Notas internas</label><textarea id="swf-notas" class="input" rows="3" data-swf="notas">${esc(f.notas)}</textarea></div>
          <fieldset class="field tag-editor">
            <legend>Etiquetas</legend>
            <div class="tag-row">${f.etiquetas.length ? f.etiquetas.map((t) => tagChip(t, true)).join("") : `<span class="small muted">Sin etiquetas</span>`}</div>
            <div class="tag-add">
              <input class="input" id="swf-tag" placeholder="Nueva etiqueta" maxlength="30" aria-label="Nombre de la nueva etiqueta" list="swf-tags" />
              <datalist id="swf-tags">${allTags().map((t) => `<option value="${esc(t.nombre)}"></option>`).join("")}</datalist>
              <select class="select" id="swf-color" aria-label="Color de la etiqueta">${Object.keys(TAG_COLORS).map((c) => `<option value="${c}">${TAG_COLORS[c]}</option>`).join("")}</select>
              <button type="button" class="btn btn-secondary" data-action="tag-add">${icon("plus", 16)} Añadir</button>
            </div>
          </fieldset>
        </form>`,
      confirmLabel: f.id ? "Guardar cambios" : "Registrar",
      onConfirm: saveSoftwareForm,
    });
  }
  function saveSoftwareForm() {
    const f = ui.swForm;
    const clean = Store.normalizeSoftware(Object.assign({}, f, { id: f.id || undefined }));
    if (!clean.nombre) {
      drawSoftwareForm("El nombre es obligatorio.");
      return false;
    }
    if (f.url && !clean.url) {
      drawSoftwareForm("El sitio web debe empezar por http:// o https://");
      return false;
    }
    const dup = Store.softwareByName(db, clean.nombre);
    if (dup && dup.id !== f.id) {
      drawSoftwareForm(`Ya existe un software llamado «${dup.nombre}».`);
      return false;
    }
    if (f.id) {
      const s = Store.findSoftware(db, f.id);
      Object.assign(s, clean, { id: s.id, creadoEn: s.creadoEn, actualizadoEn: Store.now(), cambiosLocales: true });
      // La evaluación en curso de este software refleja los datos nuevos
      if (state.softwareId === s.id) Object.assign(state.software, { nombre: s.nombre, version: s.version, licencia: s.licencia, proveedor: s.proveedor });
      toast("Software actualizado");
    } else {
      db.softwares.push(clean);
      toast(`«${clean.nombre}» registrado`);
      ui.screen = IDX.software;
      ui.param = clean.id;
    }
    ui.swForm = null;
    persistDb();
    closeOverlay();
    render();
    return false;
  }

  /* ------------------------------------------------------------------ */
  /* Administración: guía, versiones y plantillas · HU-10, HU-37         */
  /* ------------------------------------------------------------------ */
  function renderAdmin() {
    const tabs = [
      { id: "guia", label: "Guía GUIOS" },
      { id: "versiones", label: "Versiones" },
      { id: "plantillas", label: `Plantillas (${db.plantillas.length})` },
    ];
    const tabBar = `<div class="tabs" role="tablist" aria-label="Secciones de administración">${tabs
      .map((t) => `<button role="tab" class="tab" data-admin-tab="${t.id}" aria-selected="${ui.adminTab === t.id}">${esc(t.label)}</button>`)
      .join("")}</div>`;
    const body = ui.adminTab === "versiones" ? adminVersions() : ui.adminTab === "plantillas" ? adminTemplates() : adminGuide();
    return header("Administración", "Guía y plantillas", "", "La guía oficial vive en <code>data/</code>. Aquí puede crear versiones propias de su organización sin alterar las evaluaciones ya hechas.") + tabBar + body;
  }

  function adminGuide() {
    const active = Store.activeCatalog(db, BASE);
    if (!ui.draft) {
      const nSub = active.factores.reduce((n, f) => n + f.subfactores.length, 0);
      return `<section class="card">
          <div class="card-header"><div><h2 class="h3">Versión activa: ${esc(active.version)}</h2><div class="small muted">${active.dimensiones.length} dimensiones · ${active.factores.length} factores · ${nSub} subfactores · umbral FODA ${active.umbralFoda}</div></div>
            <button class="btn btn-primary" data-action="draft-start">${icon("edit")} Editar la guía</button></div>
          <div class="card-body">
            <p class="small muted">Las evaluaciones nuevas usan la versión activa. Cada evaluación conserva la versión con la que se empezó, así que editar la guía no cambia resultados ya obtenidos.</p>
          </div>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Factor</th><th>Dimensión</th><th>Importancia sugerida</th><th>Alcance</th><th class="num">Subfactores</th></tr></thead>
            <tbody>${active.factores.map((f) => `<tr><td>${esc(f.nombre)}</td><td class="muted">${esc(dimName(f.dimension, active))}</td><td>${esc(active.nivelesImportancia[f.importanciaSugerida - 1])}</td><td>${esc(f.alcance)}</td><td class="num">${f.subfactores.length}</td></tr>`).join("")}</tbody>
          </table></div>
        </section>`;
    }
    const d = ui.draft;
    const errors = E.validateCatalog(d);
    const factorCards = d.dimensiones
      .map(
        (dim) => `<h2 class="h3 admin-dim">${esc(dim.nombre)}</h2>
        ${d.factores
          .map((f, fi) => ({ f, fi }))
          .filter((x) => x.f.dimension === dim.id)
          .map(
            ({ f, fi }) => `<details class="details card admin-factor" data-fi="${fi}" ${ui.openFactors.has(fi) ? "open" : ""}>
              <summary class="card-header"><span>${esc(f.nombre || "(sin nombre)")}</span><span class="small muted">${plural(f.subfactores.length, "subfactor", "subfactores")}</span>${icon("chevronDown", 16)}</summary>
              <div class="card-body stack">
                <div class="admin-grid">
                  <div class="field"><label for="df-${fi}-n">Nombre</label><input id="df-${fi}-n" class="input" data-draft="factores.${fi}.nombre" value="${esc(f.nombre)}" maxlength="120" /></div>
                  <div class="field"><label for="df-${fi}-s">Importancia sugerida</label><select id="df-${fi}-s" class="select" data-draft="factores.${fi}.importanciaSugerida" data-num>${d.nivelesImportancia.map((l, k) => `<option value="${k + 1}" ${f.importanciaSugerida === k + 1 ? "selected" : ""}>${k + 1} · ${esc(l)}</option>`).join("")}</select></div>
                  <div class="field"><label for="df-${fi}-a">Alcance</label><select id="df-${fi}-a" class="select" data-draft="factores.${fi}.alcance">${["Interno", "Externo", "Ambos"].map((a) => `<option ${f.alcance === a ? "selected" : ""}>${a}</option>`).join("")}</select></div>
                </div>
                <ol class="admin-subs">
                  ${f.subfactores
                    .map(
                      (s, si) => `<li>
                        <label class="sr-only" for="ds-${fi}-${si}">Subfactor ${si + 1} de ${esc(f.nombre)}</label>
                        <textarea id="ds-${fi}-${si}" class="input" rows="2" data-draft="factores.${fi}.subfactores.${si}.nombre" maxlength="300">${esc(s.nombre)}</textarea>
                        <button class="btn btn-ghost btn-icon btn-sm is-danger" data-draft-remove="${fi}.${si}" aria-label="Quitar el subfactor ${si + 1}" title="Quitar">${icon("trash", 16)}</button>
                      </li>`
                    )
                    .join("")}
                </ol>
                <div><button class="btn btn-secondary btn-sm" data-draft-add="${fi}">${icon("plus", 16)} Añadir subfactor</button></div>
              </div>
            </details>`
          )
          .join("")}`
      )
      .join("");
    const rules = `<h2 class="h3 admin-dim">Textos de la recomendación</h2>
      ${d.reglas
        .map(
          (r, ri) => `<section class="card"><div class="card-body stack">
            <div class="field"><label for="dr-${ri}-t">Recomendación ${r.codigo} · título</label><input id="dr-${ri}-t" class="input" data-draft="reglas.${ri}.titulo" value="${esc(r.titulo)}" maxlength="80" /></div>
            <div class="field"><label for="dr-${ri}-x">Texto</label><textarea id="dr-${ri}-x" class="input" rows="3" data-draft="reglas.${ri}.texto">${esc(r.texto)}</textarea></div>
            <p class="xs muted">La condición de la regla (${r.condicion ? `${r.condicion.foda.join(" o ")} en factores ${r.condicion.importancia_relativa.join(" o ")}` : "regla por defecto"}) es la de la matriz de la guía y no se edita aquí.</p>
          </div></section>`
        )
        .join("")}`;
    return `<div class="alert">${icon("info")}<div>Editando una copia de la versión ${esc(active.version)}. Los cambios se aplican al guardar como versión nueva.</div></div>
      <div class="stack admin-editor">${factorCards}${rules}</div>
      <div class="admin-savebar card">
        <div data-draft-errors>${draftErrorsHtml(errors)}</div>
        <div class="field"><label for="draft-nota">Nota de la versión</label><input id="draft-nota" class="input" data-draft-nota placeholder="Qué cambió y por qué" value="${esc(ui.draftNota)}" maxlength="200" /></div>
        <div class="actions">
          <button class="btn btn-ghost" data-action="draft-cancel">Descartar cambios</button>
          <button class="btn btn-primary" data-action="draft-save" ${errors.length ? "disabled" : ""}>${icon("check")} Guardar como versión nueva</button>
        </div>
      </div>`;
  }

  function draftErrorsHtml(errors) {
    return errors.length
      ? `<div class="alert alert-warning">${icon("alert")}<div><strong>Corrija antes de guardar:</strong><ul>${errors.slice(0, 6).map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div></div>`
      : "";
  }
  /** Actualiza los errores de validación del editor sin re-renderizar (no se pierde el foco). */
  function refreshDraftErrors() {
    const errors = E.validateCatalog(ui.draft);
    const box = $("[data-draft-errors]");
    if (box) box.innerHTML = draftErrorsHtml(errors);
    const btn = $("[data-action='draft-save']");
    if (btn) btn.disabled = errors.length > 0;
  }

  function adminVersions() {
    const usage = (v) => db.evaluaciones.filter((e) => e.catalogoVersion === v).length;
    const row = (v, fecha, nota, isBase) => `<li class="row-item ${db.catalogoActivo === v ? "is-active" : ""}">
        <span class="leading" aria-hidden="true">${icon("book", 16)}</span>
        <div class="row-main"><strong>${esc(v)}</strong>${isBase ? ` <span class="badge badge-plain">Oficial (data/)</span>` : ""} ${db.catalogoActivo === v ? `<span class="badge badge-success">Activa</span>` : ""}
          <div class="small muted">${esc([fecha ? fmtDate(fecha) : "", nota, plural(usage(v), "evaluación", "evaluaciones")].filter(Boolean).join(" · "))}</div></div>
        <div class="row-actions">
          <button class="btn btn-ghost btn-sm" data-catalog-export="${esc(v)}">${icon("download", 16)} JSON</button>
          ${db.catalogoActivo !== v ? `<button class="btn btn-secondary btn-sm" data-catalog-activate="${esc(v)}">${isBase ? "Restaurar original" : "Activar"}</button>` : ""}
        </div>
      </li>`;
    return `<section class="card"><ul class="rows">
        ${row(BASE.version, null, "Catálogo de la tesis", true)}
        ${db.catalogos.slice().reverse().map((c) => row(c.version, c.fecha, c.nota, false)).join("")}
      </ul></section>
      <p class="small muted">Las versiones locales se guardan en este navegador y viajan dentro del paquete de exportación junto con las evaluaciones que las usan.</p>`;
  }

  function adminTemplates() {
    const cat = Store.activeCatalog(db, BASE);
    const head = `<div class="toolbar"><span class="small muted">Una plantilla guarda la importancia del paso 1 para reutilizarla en otras evaluaciones.</span><span class="spacer"></span><button class="btn btn-primary btn-sm" data-action="save-template">${icon("plus", 16)} Crear desde la evaluación en curso</button></div>`;
    if (!db.plantillas.length) return head + emptyState("book", "No hay plantillas", "Guarde la importancia que asignó en el paso 1 para aplicarla al empezar otra evaluación.", "");
    return (
      head +
      `<div class="stack">${db.plantillas
        .map((p) => {
          const changes = cat.factores.filter((f) => p.decisor[f.id] != null && p.decisor[f.id] !== f.importanciaSugerida);
          return `<section class="card">
            <div class="card-header">
              <div class="field grow"><label for="tpl-${esc(p.id)}" class="sr-only">Nombre de la plantilla</label><input id="tpl-${esc(p.id)}" class="input" data-tpl-name="${esc(p.id)}" value="${esc(p.nombre)}" maxlength="80" /></div>
              <div class="actions">
                <button class="btn btn-ghost btn-sm" data-tpl-update="${esc(p.id)}" title="Sustituir por la importancia de la evaluación en curso">${icon("refresh", 16)} Actualizar</button>
                <button class="btn btn-ghost btn-sm is-danger" data-tpl-delete="${esc(p.id)}">${icon("trash", 16)} Eliminar</button>
              </div>
            </div>
            <details class="details"><summary class="card-body small">${plural(changes.length, "factor difiere", "factores difieren")} de la importancia sugerida · actualizada ${esc(fmtDate(p.actualizadoEn))} ${icon("chevronDown", 16)}</summary>
              <div class="table-wrap"><table class="table"><thead><tr><th>Factor</th><th>Sugerida</th><th>Plantilla</th></tr></thead><tbody>
                ${cat.factores.map((f) => `<tr class="${changes.includes(f) ? "" : "is-muted"}"><td>${esc(f.nombre)}</td><td>${esc(cat.nivelesImportancia[f.importanciaSugerida - 1])}</td><td>${esc(cat.nivelesImportancia[(p.decisor[f.id] || f.importanciaSugerida) - 1])}${p.alcance[f.id] ? ` · ${esc(p.alcance[f.id])}` : ""}</td></tr>`).join("")}
              </tbody></table></div>
            </details>
          </section>`;
        })
        .join("")}</div>`
    );
  }

  function setPath(obj, path, value) {
    const keys = path.split(".");
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = value;
  }

  /* ------------------------------------------------------------------ */
  /* Configuración · HU-24                                               */
  /* ------------------------------------------------------------------ */
  function renderConfig() {
    if (!ui.cfg) ui.cfg = Store.clone(db.config);
    const c = ui.cfg;
    const srv = ui.server;
    const srvState =
      !c.servidor.activo
        ? `<span class="badge badge-plain">Desactivado: la app trabaja solo con los datos de este navegador</span>`
        : srv.estado === "ok"
          ? `<span class="badge badge-success">Conectado${srv.ia && srv.ia.disponible ? " · IA disponible" : " · IA no configurada"}</span>`
          : srv.estado === "probando"
            ? `<span class="badge badge-primary">Probando…</span>`
            : srv.estado === "error"
              ? `<span class="badge badge-danger">Sin conexión: ${esc(srv.mensaje || "")}</span>`
              : "";
    return (
      header("Configuración", "Organización y preferencias", `${ui.cfgDirty ? `<span class="badge badge-warning">Cambios sin guardar</span>` : ""}<button class="btn btn-primary" data-action="cfg-save" ${ui.cfgDirty ? "" : "disabled"}>${icon("check")} Guardar</button>`) +
      `<div class="stack cfg">
        <section class="card">
          <div class="card-header"><h2 class="h3">Organización</h2></div>
          <div class="card-body stack">
            <div class="grid-2">
              <div class="field"><label for="cfg-org">Nombre</label><input id="cfg-org" class="input" data-cfg="organizacion.nombre" value="${esc(c.organizacion.nombre)}" maxlength="150" /></div>
              <div class="field"><label for="cfg-sector">Sector</label><input id="cfg-sector" class="input" data-cfg="organizacion.sector" value="${esc(c.organizacion.sector)}" placeholder="Educación superior, salud, gobierno…" maxlength="80" /></div>
            </div>
            <div class="field"><label for="cfg-eval">Evaluador por defecto</label><input id="cfg-eval" class="input" data-cfg="evaluadorPorDefecto" value="${esc(c.evaluadorPorDefecto)}" placeholder="Se propone al crear cada evaluación" maxlength="120" /></div>
            <div class="field">
              <span class="label">Logotipo (aparece en el informe)</span>
              <div class="logo-field">
                ${c.organizacion.logo ? `<img src="${esc(c.organizacion.logo)}" alt="Logotipo actual" class="logo-preview" />` : `<span class="logo-preview is-empty" aria-hidden="true">${icon("box", 20)}</span>`}
                <label class="btn btn-secondary btn-sm">${icon("upload", 16)} Elegir imagen<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="sr-only" data-cfg-logo /></label>
                ${c.organizacion.logo ? `<button class="btn btn-ghost btn-sm is-danger" data-action="cfg-logo-remove">Quitar</button>` : ""}
                <span class="xs muted">PNG, JPG, WebP o SVG de hasta 300 KB.</span>
              </div>
            </div>
          </div>
        </section>
        <section class="card">
          <div class="card-header"><h2 class="h3">Apariencia</h2></div>
          <div class="card-body">
            <div class="segmented" role="radiogroup" aria-label="Tema">
              ${[["sistema", "Según el sistema"], ["claro", "Claro"], ["oscuro", "Oscuro"]].map(([v, l]) => `<button type="button" role="radio" aria-checked="${c.tema === v}" aria-pressed="${c.tema === v}" data-cfg-theme="${v}">${l}</button>`).join("")}
            </div>
          </div>
        </section>
        <section class="card">
          <div class="card-header"><h2 class="h3">Servidor y asistente de IA</h2>${srvState}</div>
          <div class="card-body stack">
            <p class="small muted">Opcional. Con el servidor de GUIOS PRO (<code>npm run api</code>) las evaluaciones se sincronizan entre equipos y se habilita el asistente de IA. Sin servidor la app funciona igual, en modo manual.</p>
            <label class="switch"><button type="button" class="toggle" role="switch" aria-checked="${c.servidor.activo}" data-action="cfg-server-toggle" aria-label="Usar servidor"></button><span>Usar servidor</span></label>
            <div class="grid-2">
              <div class="field"><label for="cfg-url">Dirección del servidor</label><input id="cfg-url" class="input" type="url" data-cfg="servidor.url" value="${esc(c.servidor.url)}" placeholder="http://localhost:8787" /></div>
              <div class="field field-end"><button class="btn btn-secondary" data-action="cfg-test">${icon("refresh")} Probar conexión</button></div>
            </div>
          </div>
        </section>
      </div>`
    );
  }

  function saveConfig() {
    const c = ui.cfg;
    c.servidor.url = String(c.servidor.url || "").trim();
    if (c.servidor.activo && !/^https?:\/\/[^\s]+$/i.test(c.servidor.url)) {
      toast("La dirección del servidor debe empezar por http:// o https://");
      return;
    }
    const serverChanged = c.servidor.activo !== db.config.servidor.activo || c.servidor.url !== db.config.servidor.url;
    db.config = Store.clone(c);
    ui.cfgDirty = false;
    applyTheme(db.config.tema);
    // El borrador vacío adopta los datos por defecto nuevos
    if (!hasData()) Object.assign(state.software, { organizacion: db.config.organizacion.nombre, evaluador: db.config.evaluadorPorDefecto });
    persistDb();
    toast("Configuración guardada");
    if (serverChanged) checkServer(true);
    render();
  }

  /* ------------------------------------------------------------------ */
  /* Datos: importar, exportar y sincronizar · HU-38, RF-30              */
  /* ------------------------------------------------------------------ */
  function renderDatos() {
    const evs = savedEvaluations();
    if (!ui.exportSel) ui.exportSel = { softwares: db.softwares.map((s) => s.id), plantillas: db.plantillas.map((p) => p.id), evaluaciones: evs.map((e) => e.id) };
    const sel = ui.exportSel;
    const group = (tipo, label, items, name) => `<fieldset class="check-group">
        <legend><label><input type="checkbox" data-export-all="${tipo}" ${items.length && items.every((x) => sel[tipo].includes(x.id)) ? "checked" : ""} ${items.length ? "" : "disabled"} /> ${esc(label)} <span class="muted">(${items.length})</span></label></legend>
        ${items.map((x) => `<label class="check"><input type="checkbox" data-export-pick="${tipo}" value="${esc(x.id)}" ${sel[tipo].includes(x.id) ? "checked" : ""} /> ${esc(name(x))}</label>`).join("") || `<span class="small muted">Nada que exportar</span>`}
      </fieldset>`;
    const nSel = sel.softwares.length + sel.plantillas.length + sel.evaluaciones.length;
    const exportCard = `<section class="card">
        <div class="card-header"><h2 class="h3">Exportar</h2><button class="btn btn-primary btn-sm" data-action="export-pkg" ${nSel ? "" : "disabled"}>${icon("download", 16)} Descargar (${nSel})</button></div>
        <div class="card-body export-grid">
          ${group("evaluaciones", "Evaluaciones", evs, (e) => `${e.software.nombre || "Sin nombre"} · ${fmtDate(e.actualizadoEn)}`)}
          ${group("softwares", "Softwares", db.softwares, (s) => s.nombre)}
          ${group("plantillas", "Plantillas", db.plantillas, (p) => p.nombre)}
        </div>
      </section>`;

    const pkg = ui.importPkg;
    const preview = pkg ? Store.previewImport(db, pkg) : [];
    const dups = preview.filter((x) => x.duplicado).length;
    const TIPO = { software: "Software", plantilla: "Plantilla", evaluacion: "Evaluación" };
    const importCard = `<section class="card">
        <div class="card-header"><h2 class="h3">Importar</h2>
          <label class="btn btn-secondary btn-sm">${icon("upload", 16)} Elegir archivo JSON<input type="file" accept="application/json,.json" class="sr-only" data-import-file /></label></div>
        <div class="card-body stack">
          ${
            !pkg
              ? `<p class="small muted">Acepta paquetes exportados desde GUIOS PRO (softwares, plantillas y evaluaciones) y también la exportación de una sola evaluación de la versión anterior.</p>`
              : `<div class="table-wrap"><table class="table">
                  <thead><tr><th>Tipo</th><th>Elemento</th><th>Situación</th></tr></thead>
                  <tbody>${preview.map((x) => `<tr><td>${TIPO[x.tipo]}</td><td>${esc(x.nombre)}${x.fecha ? ` <span class="xs muted">${esc(fmtDate(x.fecha))}</span>` : ""}</td><td>${x.duplicado ? `<span class="badge badge-warning">Ya existe</span>` : `<span class="badge badge-success">Nuevo</span>`}</td></tr>`).join("")}</tbody>
                </table></div>
                ${
                  dups
                    ? `<fieldset class="field"><legend class="label">${plural(dups, "elemento ya existe", "elementos ya existen")}. ¿Qué hacer con ellos?</legend>
                        <div class="segmented" role="radiogroup" aria-label="Resolución de duplicados">
                          ${[["omitir", "Conservar los míos"], ["reemplazar", "Reemplazar"], ["copia", "Importar como copia"]].map(([v, l]) => `<button type="button" role="radio" aria-checked="${ui.importMode === v}" aria-pressed="${ui.importMode === v}" data-import-mode="${v}">${l}</button>`).join("")}
                        </div></fieldset>`
                    : ""
                }
                <div class="actions"><button class="btn btn-ghost" data-action="import-cancel">Cancelar</button><button class="btn btn-primary" data-action="import-apply">${icon("check")} Importar ${plural(preview.length, "elemento", "elementos")}</button></div>`
          }
        </div>
      </section>`;

    const pending = db.softwares.filter((x) => x.cambiosLocales).length + db.plantillas.filter((x) => x.cambiosLocales).length + evs.filter((x) => x.cambiosLocales).length + db.sync.eliminados.length;
    const syncCard = `<section class="card">
        <div class="card-header"><h2 class="h3">Sincronización con el servidor</h2>
          ${serverOn() ? `<button class="btn btn-secondary btn-sm" data-action="sync-now" ${ui.syncing ? "disabled" : ""}>${icon("refresh", 16)} ${ui.syncing ? "Sincronizando…" : "Sincronizar ahora"}</button>` : `<a class="btn btn-secondary btn-sm" ${navAttrs("configuracion")}>Configurar servidor</a>`}</div>
        <div class="card-body stack">
          ${
            !serverOn()
              ? `<p class="small muted">Sin servidor, todo queda guardado en este navegador. Exporte un paquete para hacer copias de seguridad o moverlo a otro equipo.</p>`
              : `<dl class="report-meta">
                  <div><dt>Conexión</dt><dd>${ui.server.estado === "ok" ? "Conectado" : ui.server.estado === "error" ? "Sin conexión" : "Comprobando…"}</dd></div>
                  <div><dt>Última sincronización</dt><dd>${db.sync.ultima ? esc(new Date(db.sync.ultima).toLocaleString("es-EC")) : "Nunca"}</dd></div>
                  <div><dt>Cambios pendientes</dt><dd>${pending}</dd></div>
                </dl>
                ${db.sync.error ? `<div class="alert alert-warning">${icon("alert")}<div>${esc(db.sync.error)}. Sus cambios están a salvo en este navegador y se enviarán cuando vuelva la conexión.</div></div>` : ""}`
          }
          ${(db.sync.rechazados || []).length ? `<div class="alert alert-warning">${icon("alert")}<div><strong>El servidor rechazó ${plural(db.sync.rechazados.length, "elemento", "elementos")}:</strong><ul>${db.sync.rechazados.map((r) => `<li>${esc(r.tipo)} ${esc(r.id)}: ${esc(r.mensaje)}</li>`).join("")}</ul></div></div>` : ""}
          ${db.sync.conflictos
            .map((c, i) => {
              const local = (c.tipo === "software" ? db.softwares : c.tipo === "plantilla" ? db.plantillas : db.evaluaciones).find((x) => x.id === c.id);
              const nombre = c.tipo === "evaluacion" ? (local || c.servidor).software && (local || c.servidor).software.nombre : (local || c.servidor || {}).nombre;
              return `<div class="conflict">
                <div>${icon("alert", 16)} <strong>Conflicto en ${esc(TIPO[c.tipo] || c.tipo).toLowerCase()} «${esc(nombre || c.id)}»</strong>
                  <div class="small muted">Se modificó aquí y en el servidor. Suya: ${esc(local ? new Date(local.actualizadoEn).toLocaleString("es-EC") : "—")} · Servidor: ${esc(c.servidor && c.servidor.actualizadoEn ? new Date(c.servidor.actualizadoEn).toLocaleString("es-EC") : "—")}</div></div>
                <div class="actions"><button class="btn btn-secondary btn-sm" data-conflict="${i}" data-choice="local">Conservar la mía</button><button class="btn btn-ghost btn-sm" data-conflict="${i}" data-choice="servidor">Usar la del servidor</button></div>
              </div>`;
            })
            .join("")}
        </div>
      </section>`;

    const danger = `<section class="card danger-zone">
        <div class="card-header"><div><h2 class="h3">Borrar los datos de este navegador</h2><p class="small muted">Elimina evaluaciones, softwares, plantillas, versiones de la guía y configuración. No afecta al servidor.</p></div>
          <button class="btn btn-danger btn-sm" data-action="wipe">${icon("trash", 16)} Borrar todo</button></div>
      </section>`;

    return header("Portabilidad", "Importar, exportar y sincronizar") + `<div class="stack">${exportCard}${importCard}${syncCard}${danger}</div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Overlays: pop-up, toast                                             */
  /* ------------------------------------------------------------------ */
  function closeOverlay() {
    $("#overlay").innerHTML = "";
  }

  /** Pop-up modal. Si onConfirm devuelve false, el pop-up sigue abierto (validación de formularios). */
  function popup({ title, html, confirmLabel, danger, onConfirm, wide }) {
    $("#overlay").innerHTML = `
      <div class="popup-backdrop" data-action="close-overlay">
        <div class="popup ${wide ? "popup-wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="popup-title">
          <h3 class="h3" id="popup-title">${esc(title)}</h3>
          ${html}
          <div class="actions">
            ${onConfirm ? `<button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-action="popup-confirm">${esc(confirmLabel)}</button>` : ""}
            <button class="btn ${onConfirm ? "btn-secondary" : "btn-primary"}" data-action="close-overlay">${onConfirm ? "Cancelar" : "Entendido"}</button>
          </div>
        </div>
      </div>`;
    const box = $("#overlay .popup");
    const confirm = $("#overlay [data-action='popup-confirm']");
    if (confirm) {
      confirm.addEventListener("click", () => {
        const r = onConfirm();
        if (r !== false && $("#overlay .popup") === box) closeOverlay();
      });
    }
    const first = box.querySelector("input:not([type=hidden]):not(.sr-only), textarea, select");
    (first || confirm || box.querySelector("button")).focus();
  }

  function howItWorks() {
    popup({
      title: "¿Cómo funciona?",
      html: `<ol class="how">
        <li><strong>Importancia.</strong> Indique qué tan importante es cada factor (tecnológico, organizacional y económico) para su organización.</li>
        <li><strong>Cumplimiento.</strong> Responda, para cada factor importante, si el software cumple los requisitos. Puede añadir observaciones y, con el servidor, pedir sugerencias a la IA.</li>
        <li><strong>Resultado.</strong> Cada factor se clasifica como Fortaleza, Oportunidad, Debilidad o Amenaza y se obtiene una recomendación: <em>A</em> no adoptar, <em>B</em> adoptar con reservas, <em>C</em> adoptar.</li>
      </ol>
      <p class="xs muted">Basado en la guía GUIOS: ${DATA.factores.length} factores y ${DATA.factores.reduce((s, f) => s + f.subfactores.length, 0)} criterios. Todo se guarda automáticamente en este navegador; en <em>Evaluaciones</em> encontrará las anteriores y en <em>Comparar</em> podrá ponerlas lado a lado.</p>`,
    });
  }

  /** HU-15: aviso antes de ver el resultado con factores sin responder. */
  function pendingWarning(result) {
    const pend = result.pendientes.map((id) => factorById(id));
    popup({
      title: `Faltan ${plural(pend.length, "factor", "factores")} por responder`,
      html: `<p>El resultado se mostrará como <strong>parcial</strong> hasta que responda todas las preguntas de:</p>
        <ul class="pending-list">${pend
          .map((f) => {
            const fr = result.factores.find((x) => x.id === f.id);
            return `<li><button class="link-btn" data-goto-factor="${f.id}">${esc(f.nombre)}</button> <span class="small muted">${fr.subfactoresRespondidos} de ${fr.subfactoresTotal}</span></li>`;
          })
          .join("")}</ul>`,
      confirmLabel: "Ver resultado parcial",
      onConfirm: () => {
        ui.screen = LAST_STEP;
        ui.param = null;
        render();
        window.scrollTo({ top: 0 });
      },
    });
  }

  let toastTimer;
  function toast(msg) {
    $("#toast").innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($("#toast").innerHTML = ""), 2800);
  }

  /* ------------------------------------------------------------------ */
  /* Navegación                                                          */
  /* ------------------------------------------------------------------ */
  function go(target, param, opts) {
    const n = typeof target === "number" ? target : IDX[target];
    if (n == null || n < 0 || n >= SCREENS.length) return;
    const leaving = SCREENS[ui.screen].id;
    if (!(opts && opts.force)) {
      if (leaving === "configuracion" && ui.cfgDirty && n !== ui.screen) {
        return popup({
          title: "¿Salir sin guardar?",
          html: "<p>Hay cambios en la configuración que no se han guardado.</p>",
          confirmLabel: "Salir sin guardar",
          danger: true,
          onConfirm: () => {
            ui.cfgDirty = false;
            ui.cfg = null;
            go(n, param, { force: true });
          },
        });
      }
      if (leaving === "administracion" && ui.draft && ui.draftDirty && n !== ui.screen) {
        return popup({
          title: "¿Descartar la edición de la guía?",
          html: "<p>Los cambios en la guía no se han guardado como versión nueva.</p>",
          confirmLabel: "Descartar cambios",
          danger: true,
          onConfirm: () => {
            ui.draft = null;
            ui.draftDirty = false;
            go(n, param, { force: true });
          },
        });
      }
      if (n === LAST_STEP && ui.screen !== LAST_STEP) {
        const result = E.evaluate(DATA, state);
        // Solo hay resultado parcial que avisar si al menos un factor está completo.
        if (result.pendientes.length && result.positivos + result.negativos > 0) {
          if (ui.screen === 1) confirmStep1();
          return pendingWarning(result);
        }
      }
    }
    if (ui.screen === 1 && n > 1 && n <= LAST_STEP) confirmStep1();
    if (n >= 1 && n <= LAST_STEP && ui.screen === 0) linkSoftware();
    if (leaving === "configuracion" && n !== ui.screen) {
      ui.cfg = null;
      applyTheme(db.config.tema); // deshace la vista previa del tema si no se guardó
    }
    ui.screen = n;
    ui.param = param || null;
    ui.menu = false;
    ui.nav = false;
    render();
    window.scrollTo({ top: 0 });
  }

  function confirmStep1() {
    if (!state.paso1Confirmado) {
      state.paso1Confirmado = true;
      save();
    }
  }

  function continueEval(id) {
    const ev = evalById(id);
    if (!ev) return;
    if (ev.estado === "Cancelada") ev.estado = "En proceso";
    setActive(ev);
    persistDb();
    const r = E.evaluate(DATA, state);
    go(nextStep(r), null, { force: true });
  }

  function newEvaluation(softwareId) {
    startDraft({ software: softwareId });
    persistDb();
    go("inicio", null, { force: true });
    toast("Nueva evaluación: la anterior queda guardada en Evaluaciones");
  }

  /* ------------------------------------------------------------------ */
  /* Servidor e IA                                                       */
  /* ------------------------------------------------------------------ */
  function apiClient() {
    return Api.client({ url: db.config.servidor.url, organizacion: db.config.organizacion.nombre });
  }
  function apiClientFor(cfg) {
    return Api.client({ url: cfg.servidor.url, organizacion: cfg.organizacion.nombre });
  }

  async function checkServer(thenSync, cfg) {
    const c = cfg || db.config;
    if (!c.servidor.activo && !cfg) {
      ui.server = { estado: "off" };
      return;
    }
    ui.server = { estado: "probando" };
    if (SCREENS[ui.screen].id === "configuracion") render();
    try {
      const h = await apiClientFor(c).health();
      ui.server = { estado: "ok", ia: h.ia || null, version: h.version };
      if (thenSync) syncNow(true);
    } catch (err) {
      ui.server = { estado: "error", mensaje: err.message };
    }
    rerenderSafe();
  }

  /** Re-renderiza sin perder el foco de un campo de texto en el que se está escribiendo. */
  function rerenderSafe() {
    const a = document.activeElement;
    if (a && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && a.type !== "radio" && a.type !== "checkbox"))) {
      renderSidebar(E.evaluate(DATA, state));
      return;
    }
    render();
  }

  let syncTimer = null;
  function scheduleSync() {
    if (!serverOn() || ui.server.estado !== "ok") return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow(true), 4000);
  }

  async function syncNow(quiet) {
    if (!serverOn() || ui.syncing) return;
    ui.syncing = true;
    if (!quiet) rerenderSafe();
    try {
      const activeId = state.id;
      const rep = await Api.syncDb(apiClient(), db, Store, E, BASE);
      // La evaluación activa pudo ser reemplazada por la versión del servidor
      const again = db.evaluaciones.find((e) => e.id === activeId);
      if (again && again !== state) setActive(again);
      if (storage) Store.persist(storage, db);
      ui.server.estado = "ok";
      if (!quiet || rep.conflictos || rep.recibidos) {
        toast(rep.conflictos ? `Sincronizado con ${plural(rep.conflictos, "conflicto", "conflictos")}: revíselos en Datos` : `Sincronizado · ${rep.enviados} enviados, ${rep.recibidos} recibidos`);
      }
    } catch (err) {
      db.sync.error = err.message || "No se pudo sincronizar";
      if (err.status === 0) ui.server = { estado: "error", mensaje: err.message };
      if (storage) Store.persist(storage, db);
      if (!quiet) toast(db.sync.error);
    }
    ui.syncing = false;
    rerenderSafe();
  }

  async function iaSuggest() {
    const def = factorById(ui.factor);
    if (!def || ui.iaBusy) return;
    const sw = (state.softwareId && Store.findSoftware(db, state.softwareId)) || state.software;
    ui.iaBusy = def.id;
    render();
    try {
      const res = await apiClient().sugerencias({
        factorId: def.id,
        software: { nombre: sw.nombre || "", version: sw.version || "", licencia: sw.licencia || "", proveedor: sw.proveedor || "", url: sw.url || "", notas: sw.notas || "" },
      });
      const map = {};
      (res.sugerencias || []).forEach((s) => {
        if (def.subfactores.some((x) => x.id === s.subfactorId) && Number.isInteger(s.valor) && s.valor >= 1 && s.valor <= 4) {
          map[s.subfactorId] = { valor: s.valor, confianza: Math.max(0, Math.min(1, Number(s.confianza) || 0)), justificacion: String(s.justificacion || "").slice(0, 400) };
        }
      });
      ui.sugerencias[def.id] = map;
      toast(Object.keys(map).length ? `${plural(Object.keys(map).length, "sugerencia", "sugerencias")} para revisar` : "La IA no devolvió sugerencias");
    } catch (err) {
      toast(err.codigo === "ia_no_disponible" ? "El asistente de IA no está disponible: siga en modo manual" : err.message);
    }
    ui.iaBusy = null;
    render();
  }

  function acceptSuggestion(subId) {
    const map = ui.sugerencias[ui.factor] || {};
    const s = map[subId];
    if (!s) return;
    state.subfactores[subId] = s.valor;
    state.origenIA[subId] = s;
    delete map[subId];
  }

  async function iaSummary(id) {
    const ev = evalById(id);
    if (!ev || ui.iaBusy) return;
    const code = resultOf(ev).recomendacion.codigo;
    ui.iaBusy = "resumen";
    render();
    try {
      const strip = Store.clone(ev);
      delete strip.cambiosLocales;
      delete strip.software.evaluador; // RNF-16: no se envía el nombre del evaluador
      const res = await apiClient().resumen({ evaluacion: strip });
      if (res.recomendacion && res.recomendacion !== code) throw new Error("El resumen recibido no coincide con la recomendación calculada; se descartó");
      if (contradicts(res.texto, code)) throw new Error("El resumen contradecía la recomendación calculada; se descartó");
      ev.resumen = { texto: String(res.texto || ""), generadoIA: true, fecha: Store.now() };
      saveEval(ev);
      toast("Borrador listo: revíselo y edítelo antes de presentarlo");
    } catch (err) {
      toast(err.codigo === "ia_no_disponible" ? "El asistente de IA no está disponible" : err.message);
    }
    ui.iaBusy = null;
    render();
  }

  /* ------------------------------------------------------------------ */
  /* Acciones                                                            */
  /* ------------------------------------------------------------------ */
  function download(name, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function slug(s) {
    return (
      String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "evaluacion"
    );
  }
  const today = () => new Date().toISOString().slice(0, 10);

  /** Exporta una evaluación (con su software) como paquete; incluye el resultado para lectura humana. */
  function exportEval(id) {
    const ev = evalById(id);
    if (!ev) return;
    if (!db.evaluaciones.includes(ev)) saveEval(ev);
    const pkg = Store.exportPackage(db, { evaluaciones: [ev.id], softwares: ev.softwareId ? [ev.softwareId] : [], plantillas: [] });
    const r = resultOf(ev);
    pkg.resultado = {
      recomendacion: r.recomendacion,
      foda: r.foda,
      factores: r.factores.map((f) => ({ id: f.id, nombre: f.nombre, importanciaRelativa: f.importanciaRelativa, relevante: f.relevante, alcance: f.alcance, ponderacion: f.ponderacion, foda: f.foda })),
    };
    download(`guiospro-${slug(ev.software.nombre)}-${today()}.json`, pkg);
    toast("Evaluación exportada");
  }

  function readImport(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        ui.importPkg = Store.parsePackage(E, BASE, JSON.parse(reader.result));
        ui.importMode = "omitir";
        if (SCREENS[ui.screen].id !== "datos") go("datos");
        else render();
        if (!Store.previewImport(db, ui.importPkg).length) {
          ui.importPkg = null;
          toast("El archivo no contiene elementos para importar");
          render();
        }
      } catch (err) {
        ui.importPkg = null;
        toast("El archivo no es un JSON de GUIOS PRO válido");
        render();
      }
    };
    reader.readAsText(file);
  }

  function saveTemplateDialog() {
    popup({
      title: "Guardar como plantilla",
      html: `<p class="small muted">Se guardará la importancia y el alcance que tiene ahora la evaluación en curso. Si ya existe una plantilla con ese nombre, se actualizará.</p>
        <div class="field"><label for="tpl-name">Nombre de la plantilla</label><input id="tpl-name" class="input" maxlength="80" value="${esc(state.plantilla ? state.plantilla.nombre : db.config.organizacion.nombre ? `Prioridades de ${db.config.organizacion.nombre}` : "")}" placeholder="Ej. Prioridades de la universidad" /></div>`,
      confirmLabel: "Guardar plantilla",
      onConfirm: () => {
        const nombre = ($("#tpl-name").value || "").trim();
        if (!nombre) {
          $("#tpl-name").setAttribute("aria-invalid", "true");
          $("#tpl-name").focus();
          return false;
        }
        let pl = db.plantillas.find((p) => p.nombre.toLowerCase() === nombre.toLowerCase());
        if (pl) Object.assign(pl, { decisor: Object.assign({}, state.decisor), alcance: Object.assign({}, state.alcance), actualizadoEn: Store.now(), cambiosLocales: true });
        else {
          pl = Store.normalizeTemplate({ nombre, decisor: state.decisor, alcance: state.alcance });
          db.plantillas.push(pl);
        }
        state.plantilla = { id: pl.id, nombre: pl.nombre };
        save();
        toast(`Plantilla «${pl.nombre}» guardada`);
        render();
      },
    });
  }

  function applyTemplate(id) {
    const pl = db.plantillas.find((p) => p.id === id);
    if (!pl) return;
    const next = E.applyTemplate(DATA, state, pl);
    state.decisor = next.decisor;
    state.alcance = next.alcance;
    state.plantilla = { id: pl.id, nombre: pl.nombre };
    if (ui.screen === 1) state.paso1Confirmado = true;
    save();
    render();
    toast(`Plantilla «${pl.nombre}» aplicada`);
  }

  /** Conjunto de ejemplo determinista: 3 softwares, 3 evaluaciones y 1 plantilla. */
  function loadDemo() {
    const decisorByName = { Compatibilidad: 4, Personalización: 3, Prueba: 2, Fiabilidad: 4, Reusabilidad: 1, Usabilidad: 4, Mantenibilidad: 3, Portabilidad: 3, Documentación: 3, Formación: 3, "Tiempo de adopción": 2, "Casos de estudio de adopción FLOSS": 2, "Centralidad de la tecnología de la información": 2, "Apoyo de la alta dirección": 4, "Bloqueo de proveedores": 3, Soporte: 3, "Actitud hacia el cambio": 3, "Coste total de propiedad": 4 };
    const org = db.config.organizacion.nombre || "Universidad Estatal de Milagro";
    const softwares = [
      { id: "sw_demo_moodle", nombre: "Moodle", version: "4.3 LTS", licencia: LICENCIAS[1], proveedor: "Moodle HQ / comunidad", url: "https://moodle.org", notas: "Plataforma actual del campus virtual.", etiquetas: [{ nombre: "LMS", color: "primary" }, { nombre: "En producción", color: "success" }] },
      { id: "sw_demo_chamilo", nombre: "Chamilo", version: "1.11", licencia: LICENCIAS[1], proveedor: "Asociación Chamilo", url: "https://chamilo.org", notas: "", etiquetas: [{ nombre: "LMS", color: "primary" }] },
      { id: "sw_demo_openedx", nombre: "Open edX", version: "Quince", licencia: LICENCIAS[1], proveedor: "Axim Collaborative", url: "https://openedx.org", notas: "Candidato para cursos masivos (MOOC).", etiquetas: [{ nombre: "MOOC", color: "warning" }] },
    ];
    const make = (id, sw, fecha, valueFor, answeredFactors) => {
      const ev = Store.newEvaluation(E, BASE, { softwareId: sw.id, software: { nombre: sw.nombre, version: sw.version, licencia: sw.licencia, proveedor: sw.proveedor, organizacion: org, evaluador: "Comité de TI" } });
      ev.id = id;
      BASE.factores.forEach((f, fi) => {
        if (decisorByName[f.nombre]) ev.decisor[f.id] = decisorByName[f.nombre];
        if (f.alcance === "Ambos") ev.alcance[f.id] = "Interno";
        if (answeredFactors != null && fi >= answeredFactors) return;
        f.subfactores.forEach((s, i) => (ev.subfactores[s.id] = valueFor(f, i)));
      });
      ev.paso1Confirmado = true;
      ev.creadoEn = fecha;
      ev.actualizadoEn = fecha;
      ev.estado = Store.deriveStatus(E, BASE, ev);
      ev.completadoEn = ev.estado === "Completada" ? fecha : null;
      return ev;
    };
    const low = new Set(["Tiempo de adopción", "Actitud hacia el cambio"]);
    const evs = [
      make("ev_demo_chamilo", softwares[1], "2026-06-12T15:00:00.000Z", (f, i) => (f.dimension === "D1" ? (i % 2 ? 2 : 3) : i % 3 === 2 ? 2 : 4)),
      make("ev_demo_moodle", softwares[0], "2026-09-03T15:00:00.000Z", (f, i) => (low.has(f.nombre) ? (i % 2 ? 2 : 1) : i % 4 === 3 ? 3 : 4)),
      make("ev_demo_openedx", softwares[2], "2026-10-20T15:00:00.000Z", (f, i) => (i % 3 ? 4 : 3), 7),
    ];
    evs[1].observaciones["F01-S03"] = { texto: "Integración con el sistema académico vía servicios web probada en el piloto.", enlace: "https://docs.moodle.org/" };
    softwares.forEach((s) => {
      const clean = Store.normalizeSoftware(s);
      db.softwares = db.softwares.filter((x) => x.id !== clean.id);
      db.softwares.push(clean);
    });
    evs.forEach((ev) => {
      db.evaluaciones = db.evaluaciones.filter((x) => x.id !== ev.id);
      db.evaluaciones.push(ev);
    });
    if (!db.plantillas.some((p) => p.id === "pl_demo_universidad")) {
      const pl = Store.normalizeTemplate({ id: "pl_demo_universidad", nombre: "Prioridades de la universidad", decisor: evs[1].decisor, alcance: evs[1].alcance });
      db.plantillas.push(pl);
    }
    setActive(evs[1]);
    persistDb();
  }

  function resetDb() {
    popup({
      title: "¿Borrar todos los datos de este navegador?",
      html: "<p>Se eliminarán las evaluaciones, los softwares, las plantillas, las versiones locales de la guía y la configuración. Exporte un paquete antes si desea conservarlos.</p>",
      confirmLabel: "Borrar todo",
      danger: true,
      onConfirm: () => {
        db = Store.emptyDb(BASE);
        try {
          localStorage.removeItem(Store.LEGACY_KEY);
        } catch (err) {
          /* nada */
        }
        startDraft();
        persistDb();
        ui.exportSel = null;
        ui.importPkg = null;
        ui.compare = [];
        ui.server = { estado: "off" };
        go("inicio", null, { force: true });
        toast("Datos borrados");
      },
    });
  }

  /**
   * Guarda respuestas del paso 2 y avanza: a la siguiente pregunta pendiente del factor
   * o, si el factor queda completo, al siguiente factor con pendientes.
   */
  function answer(ids, value) {
    const def = factorOfSub(ids[0]);
    const wasComplete = def.subfactores.every((s) => state.subfactores[s.id]);
    ids.forEach((id) => {
      state.subfactores[id] = value;
      if (state.origenIA[id] && state.origenIA[id].valor !== value) delete state.origenIA[id];
      if (ui.sugerencias[def.id]) delete ui.sugerencias[def.id][id];
    });
    save();
    advance(def, wasComplete, ids[ids.length - 1]);
  }

  function factorOfSub(subId) {
    return factorById(subId.slice(0, subId.indexOf("-")));
  }

  function advance(def, wasComplete, lastId) {
    const pending = def.subfactores.filter((s) => !state.subfactores[s.id]);
    if (pending.length) {
      const after = def.subfactores.findIndex((s) => s.id === lastId);
      ui.sub = (pending.find((s) => def.subfactores.indexOf(s) > after) || pending[0]).id;
    } else {
      ui.sub = null;
      if (!wasComplete) {
        const result = E.evaluate(DATA, state);
        const relevant = result.factores.filter((f) => f.relevante);
        const pos = relevant.findIndex((f) => f.id === def.id);
        const nextF = relevant.slice(pos + 1).concat(relevant.slice(0, pos)).find((f) => !f.completo);
        if (nextF && !ui.q && !(ui.sugerencias[def.id] && Object.keys(ui.sugerencias[def.id]).length)) {
          ui.factor = nextF.id;
          toast(`${def.nombre} completo · sigue ${nextF.nombre}`);
          window.scrollTo({ top: 0 });
        } else if (!nextF) {
          toast("Todas las preguntas respondidas: ya puede ver el resultado");
        }
      }
    }
    render();
    focusActive();
  }

  /** Lleva la vista (y el foco, si venía del teclado) a la pregunta activa. */
  function focusActive() {
    const row = $(".subfactor-row.is-active");
    if (!row) return;
    if (row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
    if (keyboardMode) {
      const input = row.querySelector("input:checked") || row.querySelector("input");
      if (input) input.focus({ preventScroll: true });
    }
  }
  let keyboardMode = false;
  let lastKey = "";

  /** Tras re-renderizar, devuelve el foco al mismo radio (solo navegación por teclado). */
  function refocus(input) {
    if (!keyboardMode) return;
    const again = document.querySelector(`input[name="${input.name}"][value="${input.value}"]`);
    if (again) again.focus();
  }

  /** Re-renderiza y devuelve el foco (y el cursor) al campo de búsqueda. */
  function renderKeepingFocus(selector) {
    const el = document.activeElement;
    const pos = el && el.selectionStart;
    render();
    const again = $(selector);
    if (again) {
      again.focus();
      try {
        again.setSelectionRange(pos, pos);
      } catch (err) {
        /* input sin selección */
      }
    }
  }

  /**
   * Cascada: con el botón del ratón pulsado, cada círculo por el que pasa el puntero queda
   * marcado. Se pinta directamente en el DOM y se guarda/re-renderiza una sola vez al soltar.
   * El tacto y el teclado siguen el camino normal (evento change).
   */
  let paint = null;

  function paintOpt(opt) {
    const input = opt.querySelector("input");
    if (!input || input.checked) return;
    input.checked = true;
    const v = Number(input.value);
    if (input.hasAttribute("data-decisor")) {
      state.decisor[input.getAttribute("data-decisor")] = v;
      state.paso1Confirmado = true;
    } else if (input.hasAttribute("data-sub")) {
      const id = input.getAttribute("data-sub");
      if (factorOfSub(id) !== paint.def) return;
      state.subfactores[id] = v;
      if (state.origenIA[id] && state.origenIA[id].valor !== v) delete state.origenIA[id];
      if (ui.sugerencias[paint.def.id]) delete ui.sugerencias[paint.def.id][id];
      paint.last = id;
      const row = input.closest(".subfactor-row");
      if (row) row.classList.add("is-answered");
    }
    paint.count++;
  }

  function endPaint() {
    const p = paint;
    paint = null;
    document.body.classList.remove("is-painting");
    if (!p.count) return;
    save();
    if (p.def && p.last) advance(p.def, p.wasComplete, p.last);
    else render();
  }

  document.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType !== "mouse" || ev.button !== 0) return;
    const opt = ev.target.closest(".choice-opt");
    if (!opt) return;
    ev.preventDefault(); // sin selección de texto ni foco: el clic lo resuelve paint
    keyboardMode = false;
    const sub = opt.querySelector("[data-sub]");
    const def = sub ? factorOfSub(sub.getAttribute("data-sub")) : null;
    paint = { count: 0, last: null, def, wasComplete: def ? def.subfactores.every((s) => state.subfactores[s.id]) : false };
    document.body.classList.add("is-painting");
    paintOpt(opt);
  });
  document.addEventListener("pointerover", (ev) => {
    if (!paint) return;
    if (!(ev.buttons & 1)) return endPaint();
    const opt = ev.target.closest(".choice-opt");
    if (opt) paintOpt(opt);
  });
  document.addEventListener("pointerup", () => paint && endPaint());
  window.addEventListener("blur", () => paint && endPaint());

  function setField(path, value) {
    const [obj, key] = path.split(".");
    state[obj][key] = value;
    save();
  }

  /* ------------------------------------------------------------------ */
  /* Eventos (delegación)                                                */
  /* ------------------------------------------------------------------ */
  const ACTIONS = {
    menu: () => {
      ui.menu = !ui.menu;
      ui.nav = false;
      renderSidebar(E.evaluate(DATA, state));
    },
    nav: () => {
      ui.nav = !ui.nav;
      ui.menu = false;
      renderSidebar(E.evaluate(DATA, state));
    },
    "nav-close": () => {
      ui.nav = false;
      ui.menu = false;
      renderSidebar(E.evaluate(DATA, state));
    },
    theme: () => {
      const next = currentTheme() === "dark" ? "claro" : "oscuro";
      db.config.tema = next;
      if (ui.cfg) ui.cfg.tema = next;
      applyTheme(next);
      persistDb();
      render();
    },
    "reset-decisor": () => {
      state.decisor = E.initialState(DATA).decisor;
      state.plantilla = null;
      save();
      render();
      toast("Importancias sugeridas restablecidas");
    },
    detail: () => {
      ui.detail = !ui.detail;
      render();
    },
    how: () => {
      ui.menu = false;
      renderSidebar(E.evaluate(DATA, state));
      howItWorks();
    },
    start: () => {
      linkSoftware();
      const r = E.evaluate(DATA, state);
      go(Object.keys(state.subfactores).length ? nextStep(r) : 1);
    },
    "new-eval": () => {
      ui.menu = false;
      newEvaluation(null);
    },
    "export-current": () => {
      ui.menu = false;
      exportEval(state.id);
      renderSidebar(E.evaluate(DATA, state));
    },
    print: () => {
      ui.menu = false;
      closeOverlay();
      go("informe", state.id, { force: true });
      setTimeout(() => window.print(), 80);
    },
    "print-now": () => window.print(),
    demo: () => {
      ui.menu = false;
      loadDemo();
      go("panel", null, { force: true });
      toast("Ejemplo cargado: Moodle, Chamilo y Open edX");
    },
    "only-pending": () => {
      ui.onlyPending = !ui.onlyPending;
      ui.sub = null;
      render();
    },
    "clear-filter": () => {
      ui.q = "";
      ui.onlyPending = false;
      render();
    },
    "save-template": saveTemplateDialog,
    "ia-suggest": iaSuggest,
    "ia-accept-all": () => {
      const map = ui.sugerencias[ui.factor] || {};
      Object.keys(map).forEach(acceptSuggestion);
      save();
      render();
      toast("Sugerencias aceptadas");
    },
    "ia-discard-all": () => {
      delete ui.sugerencias[ui.factor];
      render();
    },
    "sw-new": () => softwareForm(null),
    "tag-add": () => {
      const name = ($("#swf-tag").value || "").trim();
      if (!name) return $("#swf-tag").focus();
      ui.swForm.etiquetas = Store.normalizeTags(ui.swForm.etiquetas.concat([{ nombre: name, color: $("#swf-color").value }]));
      drawSoftwareForm();
      $("#swf-tag").focus();
    },
    "draft-start": () => {
      ui.draft = Store.clone(Store.activeCatalog(db, BASE));
      ui.draftDirty = false;
      ui.draftNota = "";
      render();
    },
    "draft-cancel": () => {
      ui.draft = null;
      ui.draftDirty = false;
      render();
    },
    "draft-save": () => {
      const errs = E.validateCatalog(ui.draft);
      if (errs.length) return toast(errs[0]);
      ui.draft.factores.forEach((f) => {
        f.nombre = f.nombre.trim();
        f.subfactores.forEach((s) => (s.nombre = s.nombre.trim()));
      });
      const v = Store.addCatalogVersion(db, BASE, ui.draft, ui.draftNota);
      ui.draft = null;
      ui.draftDirty = false;
      if (!hasData()) startDraft();
      persistDb();
      render();
      toast(`Versión ${v} guardada y activa para las evaluaciones nuevas`);
    },
    "cfg-save": saveConfig,
    "cfg-server-toggle": () => {
      ui.cfg.servidor.activo = !ui.cfg.servidor.activo;
      ui.cfgDirty = true;
      render();
    },
    "cfg-test": () => checkServer(false, Object.assign(Store.clone(ui.cfg), { servidor: Object.assign({}, ui.cfg.servidor, { activo: true }) })),
    "cfg-logo-remove": () => {
      ui.cfg.organizacion.logo = "";
      ui.cfgDirty = true;
      render();
    },
    "export-pkg": () => {
      const pkg = Store.exportPackage(db, ui.exportSel);
      download(`guiospro-paquete-${today()}.json`, pkg);
      toast(`Exportados ${pkg.evaluaciones.length + pkg.softwares.length + pkg.plantillas.length} elementos`);
    },
    "import-cancel": () => {
      ui.importPkg = null;
      render();
    },
    "import-apply": () => {
      const c = Store.applyImport(db, ui.importPkg, ui.importMode);
      ui.importPkg = null;
      ui.exportSel = null;
      persistDb();
      render();
      toast(`Importación: ${c.nuevos} nuevos, ${c.reemplazados} reemplazados, ${c.copias} copias, ${c.omitidos} omitidos`);
    },
    "sync-now": () => syncNow(false),
    wipe: resetDb,
  };

  document.addEventListener("click", (ev) => {
    if (ev.detail > 0) keyboardMode = false;
    const t = ev.target.closest(
      "[data-nav],[data-action],[data-factor],[data-scope],[data-fill],[data-sub-row],[data-note],[data-ia-accept],[data-ia-discard],[data-goto-factor],[data-continue],[data-duplicate],[data-delete-eval],[data-cancel-eval],[data-export-eval],[data-ia-summary],[data-sw-edit],[data-sw-delete],[data-sw-evaluate],[data-tag-remove],[data-admin-tab],[data-draft-add],[data-draft-remove],[data-catalog-activate],[data-catalog-export],[data-tpl-update],[data-tpl-delete],[data-cfg-theme],[data-import-mode],[data-conflict]"
    );
    if (!t) {
      if (ui.menu) {
        ui.menu = false;
        renderSidebar(E.evaluate(DATA, state));
      }
      return;
    }
    const attr = (n) => t.getAttribute(n);

    if (t.hasAttribute("data-nav")) {
      ev.preventDefault();
      const raw = attr("data-nav");
      go(/^\d+$/.test(raw) ? Number(raw) : raw, attr("data-param"));
      return;
    }
    if (t.hasAttribute("data-note")) {
      ev.stopPropagation();
      ui.note = ui.note === attr("data-note") ? null : attr("data-note");
      render();
      if (ui.note) {
        const ta = $(`#obs-${ui.note}`);
        if (ta) ta.focus();
      }
      return;
    }
    if (t.hasAttribute("data-factor")) {
      const id = attr("data-factor");
      if (id) {
        ui.factor = id;
        ui.sub = null;
        ui.note = null;
        render();
        window.scrollTo({ top: 0 });
      }
      return;
    }
    if (t.hasAttribute("data-goto-factor")) {
      closeOverlay();
      ui.factor = attr("data-goto-factor");
      ui.sub = null;
      ui.q = "";
      ui.onlyPending = false;
      go(2, null, { force: true });
      return;
    }
    if (t.hasAttribute("data-fill")) {
      const def = factorById(ui.factor);
      const ids = def.subfactores.filter((s) => !state.subfactores[s.id]).map((s) => s.id);
      if (ids.length) answer(ids, Number(attr("data-fill")));
      return;
    }
    if (t.hasAttribute("data-ia-accept")) {
      const id = attr("data-ia-accept");
      const def = factorById(ui.factor);
      const wasComplete = def.subfactores.every((s) => state.subfactores[s.id]);
      acceptSuggestion(id);
      save();
      advance(def, wasComplete, id);
      return;
    }
    if (t.hasAttribute("data-ia-discard")) {
      const map = ui.sugerencias[ui.factor] || {};
      delete map[attr("data-ia-discard")];
      render();
      return;
    }
    if (t.hasAttribute("data-sub-row")) {
      // Clic en el texto de una pregunta: se vuelve la activa (destino de las teclas 1-4).
      if (!ev.target.closest(".choice") && ui.sub !== attr("data-sub-row")) {
        ui.sub = attr("data-sub-row");
        document.querySelectorAll(".subfactor-row.is-active").forEach((r) => r.classList.remove("is-active"));
        t.classList.add("is-active");
      }
      return;
    }
    if (t.hasAttribute("data-scope")) {
      state.alcance[attr("data-scope")] = attr("data-value");
      save();
      render();
      return;
    }
    if (t.hasAttribute("data-continue")) return continueEval(attr("data-continue"));
    if (t.hasAttribute("data-duplicate")) {
      const src = evalById(attr("data-duplicate"));
      if (!src) return;
      if (!db.evaluaciones.includes(src)) saveEval(src);
      const copy = Store.duplicateEvaluation(db, src);
      copy.estado = statusOf(copy);
      persistDb();
      toast("Evaluación duplicada");
      go("evaluacion", copy.id, { force: true });
      return;
    }
    if (t.hasAttribute("data-delete-eval")) {
      const e = evalById(attr("data-delete-eval"));
      if (!e) return;
      popup({
        title: "¿Eliminar esta evaluación?",
        html: `<p>Se borrará la evaluación de <strong>${esc(e.software.nombre || "software sin nombre")}</strong> del ${esc(fmtDate(e.actualizadoEn, true))}, con todas sus respuestas. Esta acción no se puede deshacer.</p>`,
        confirmLabel: "Eliminar",
        danger: true,
        onConfirm: () => {
          Store.removeEvaluation(db, e.id);
          ui.compare = ui.compare.filter((x) => x !== e.id);
          if (state.id === e.id) startDraft();
          persistDb();
          toast("Evaluación eliminada");
          if (SCREENS[ui.screen].id === "evaluacion") go("evaluaciones", null, { force: true });
          else render();
        },
      });
      return;
    }
    if (t.hasAttribute("data-cancel-eval")) {
      const e = evalById(attr("data-cancel-eval"));
      if (!e) return;
      popup({
        title: "¿Cancelar esta evaluación?",
        html: "<p>Quedará en el historial como <strong>Cancelada</strong>, con sus respuestas, y no contará en el panel. Puede reactivarla cuando quiera.</p>",
        confirmLabel: "Cancelar evaluación",
        danger: true,
        onConfirm: () => {
          e.estado = "Cancelada";
          if (!db.evaluaciones.includes(e)) db.evaluaciones.push(e);
          e.actualizadoEn = Store.now();
          e.cambiosLocales = true;
          if (state.id === e.id) startDraft();
          persistDb();
          render();
          toast("Evaluación cancelada");
        },
      });
      return;
    }
    if (t.hasAttribute("data-export-eval")) return exportEval(attr("data-export-eval"));
    if (t.hasAttribute("data-ia-summary")) {
      const e = evalById(attr("data-ia-summary"));
      if (e && e.resumen && e.resumen.texto) {
        return popup({ title: "¿Sustituir el resumen actual?", html: "<p>El texto actual se reemplazará por un borrador nuevo de la IA.</p>", confirmLabel: "Sustituir", onConfirm: () => iaSummary(e.id) });
      }
      return iaSummary(attr("data-ia-summary"));
    }
    if (t.hasAttribute("data-sw-edit")) return softwareForm(attr("data-sw-edit"));
    if (t.hasAttribute("data-sw-evaluate")) return newEvaluation(attr("data-sw-evaluate"));
    if (t.hasAttribute("data-sw-delete")) {
      const s = Store.findSoftware(db, attr("data-sw-delete"));
      if (!s) return;
      const n = evalsOfSoftware(s.id).length;
      popup({
        title: `¿Eliminar «${s.nombre}»?`,
        html: n
          ? `<p>Este software tiene ${plural(n, "evaluación", "evaluaciones")}.</p><label class="check"><input type="checkbox" id="sw-cascade" /> Eliminar también sus evaluaciones (si no, quedan en el historial sin vincular)</label>`
          : "<p>Se quitará del catálogo de softwares.</p>",
        confirmLabel: "Eliminar",
        danger: true,
        onConfirm: () => {
          const cascade = !!($("#sw-cascade") && $("#sw-cascade").checked);
          Store.removeSoftware(db, s.id, cascade);
          if (state.softwareId === s.id && cascade) startDraft();
          else if (state.softwareId === s.id) state.softwareId = null;
          persistDb();
          toast("Software eliminado");
          go("softwares", null, { force: true });
        },
      });
      return;
    }
    if (t.hasAttribute("data-tag-remove")) {
      const name = attr("data-tag-remove");
      ui.swForm.etiquetas = ui.swForm.etiquetas.filter((x) => x.nombre !== name);
      drawSoftwareForm();
      return;
    }
    if (t.hasAttribute("data-admin-tab")) {
      ui.adminTab = attr("data-admin-tab");
      render();
      return;
    }
    if (t.hasAttribute("data-draft-add")) {
      const f = ui.draft.factores[Number(attr("data-draft-add"))];
      const id = Store.nextSubfactorId({ catalogos: db.catalogos.concat([{ data: ui.draft }]) }, BASE, f.id);
      f.subfactores.push({ id, nombre: "" });
      ui.draftDirty = true;
      ui.openFactors.add(Number(attr("data-draft-add")));
      render();
      const fresh = $(`.admin-factor[data-fi="${attr("data-draft-add")}"]`);
      const tas = fresh ? fresh.querySelectorAll("textarea") : [];
      if (tas.length) tas[tas.length - 1].focus();
      return;
    }
    if (t.hasAttribute("data-draft-remove")) {
      const [fi, si] = attr("data-draft-remove").split(".").map(Number);
      ui.draft.factores[fi].subfactores.splice(si, 1);
      ui.draftDirty = true;
      ui.openFactors.add(fi);
      render();
      return;
    }
    if (t.hasAttribute("data-catalog-activate")) {
      db.catalogoActivo = attr("data-catalog-activate");
      if (!hasData()) startDraft();
      persistDb();
      render();
      toast(`Versión ${db.catalogoActivo} activa para las evaluaciones nuevas`);
      return;
    }
    if (t.hasAttribute("data-catalog-export")) {
      const v = attr("data-catalog-export");
      download(`guiospro-guia-${slug(v)}.json`, Store.catalogFor(db, BASE, v));
      return;
    }
    if (t.hasAttribute("data-tpl-update")) {
      const p = db.plantillas.find((x) => x.id === attr("data-tpl-update"));
      Object.assign(p, { decisor: Object.assign({}, state.decisor), alcance: Object.assign({}, state.alcance), actualizadoEn: Store.now(), cambiosLocales: true });
      persistDb();
      render();
      toast(`«${p.nombre}» actualizada con la importancia de la evaluación en curso`);
      return;
    }
    if (t.hasAttribute("data-tpl-delete")) {
      const p = db.plantillas.find((x) => x.id === attr("data-tpl-delete"));
      popup({
        title: `¿Eliminar la plantilla «${p.nombre}»?`,
        html: "<p>Las evaluaciones que la usaron no cambian.</p>",
        confirmLabel: "Eliminar",
        danger: true,
        onConfirm: () => {
          Store.removeTemplate(db, p.id);
          persistDb();
          render();
        },
      });
      return;
    }
    if (t.hasAttribute("data-cfg-theme")) {
      ui.cfg.tema = attr("data-cfg-theme");
      ui.cfgDirty = true;
      applyTheme(ui.cfg.tema); // vista previa inmediata; se revierte si se sale sin guardar
      render();
      return;
    }
    if (t.hasAttribute("data-import-mode")) {
      ui.importMode = attr("data-import-mode");
      render();
      return;
    }
    if (t.hasAttribute("data-conflict")) {
      const c = db.sync.conflictos[Number(attr("data-conflict"))];
      if (!c) return;
      const activeId = state.id;
      Api.resolveConflict(db, Store, E, BASE, c, attr("data-choice"));
      const again = db.evaluaciones.find((e) => e.id === activeId);
      if (again && again !== state) setActive(again);
      if (storage) Store.persist(storage, db);
      if (attr("data-choice") === "local") syncNow(true);
      render();
      return;
    }

    const action = attr("data-action");
    if (action === "close-overlay") {
      const isBackdrop = t.classList.contains("popup-backdrop") || t.classList.contains("sheet-backdrop");
      if (!isBackdrop || ev.target === t) closeOverlay();
      return;
    }
    if (ACTIONS[action]) ACTIONS[action](t, ev);
  });

  document.addEventListener("change", (ev) => {
    const t = ev.target;
    const ac = t.getAttribute("data-action-change");
    if (t.matches("[data-decisor]")) {
      state.decisor[t.getAttribute("data-decisor")] = Number(t.value);
      state.paso1Confirmado = true;
      save();
      render();
      refocus(t);
    } else if (t.matches("[data-sub]")) {
      if (keyboardMode && /^Arrow/.test(lastKey)) {
        // Recorrer opciones con las flechas marca el radio: se guarda sin saltar de pregunta.
        const id = t.getAttribute("data-sub");
        state.subfactores[id] = Number(t.value);
        if (state.origenIA[id] && state.origenIA[id].valor !== Number(t.value)) delete state.origenIA[id];
        save();
        render();
        refocus(t);
      } else answer([t.getAttribute("data-sub")], Number(t.value));
    } else if (t.matches("[data-factor-select]")) {
      ui.factor = t.value;
      ui.sub = null;
      render();
    } else if (ac === "pick-software") {
      const sw = Store.findSoftware(db, t.value);
      state.softwareId = sw ? sw.id : null;
      if (sw) Object.assign(state.software, { nombre: sw.nombre, version: sw.version, licencia: sw.licencia, proveedor: sw.proveedor });
      else Object.assign(state.software, { nombre: "", version: "", licencia: "", proveedor: "" });
      save();
      render();
    } else if (ac === "apply-template") {
      if (t.value) applyTemplate(t.value);
    } else if (ac === "timeline-filter") {
      ui.timelineSw = t.value;
      render();
    } else if (ac === "hist-estado") {
      ui.histEstado = t.value;
      render();
    } else if (ac === "sw-lic") {
      ui.swLic = t.value;
      render();
    } else if (ac === "sw-tag") {
      ui.swTag = t.value;
      render();
    } else if (t.matches("[data-compare-pick]")) {
      const id = t.getAttribute("data-compare-pick");
      ui.compare = t.checked ? ui.compare.concat([id]).slice(0, 5) : ui.compare.filter((x) => x !== id);
      if (SCREENS[ui.screen].id === "comparar") ui.param = ui.compare.join(",") || null;
      render();
    } else if (t.matches("[data-export-all]")) {
      const tipo = t.getAttribute("data-export-all");
      const list = tipo === "evaluaciones" ? savedEvaluations() : db[tipo];
      ui.exportSel[tipo] = t.checked ? list.map((x) => x.id) : [];
      render();
    } else if (t.matches("[data-export-pick]")) {
      const tipo = t.getAttribute("data-export-pick");
      ui.exportSel[tipo] = t.checked ? ui.exportSel[tipo].concat([t.value]) : ui.exportSel[tipo].filter((x) => x !== t.value);
      render();
    } else if (t.matches("[data-import-file]")) {
      if (t.files && t.files[0]) readImport(t.files[0]);
      t.value = "";
    } else if (t.matches("[data-cfg-logo]")) {
      const file = t.files && t.files[0];
      t.value = "";
      if (!file) return;
      if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return toast("Formato de imagen no admitido");
      if (file.size > 300 * 1024) return toast("La imagen supera los 300 KB");
      const reader = new FileReader();
      reader.onload = () => {
        ui.cfg.organizacion.logo = String(reader.result);
        ui.cfgDirty = true;
        render();
      };
      reader.readAsDataURL(file);
    } else if (t.matches("[data-draft]") && t.tagName === "SELECT") {
      setPath(ui.draft, t.getAttribute("data-draft"), t.hasAttribute("data-num") ? Number(t.value) : t.value);
      ui.draftDirty = true;
      render();
    } else if (t.matches("[data-tpl-name]")) {
      const p = db.plantillas.find((x) => x.id === t.getAttribute("data-tpl-name"));
      const name = t.value.trim();
      if (!name) {
        t.value = p.nombre;
        return toast("La plantilla necesita un nombre");
      }
      p.nombre = name.slice(0, 80);
      p.actualizadoEn = Store.now();
      p.cambiosLocales = true;
      db.evaluaciones.forEach((e) => e.plantilla && e.plantilla.id === p.id && (e.plantilla.nombre = p.nombre));
      persistDb();
      toast("Plantilla renombrada");
    }
  });

  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.matches("[data-field]")) setField(t.getAttribute("data-field"), t.value);
    else if (t.matches("[data-search]")) {
      ui[t.getAttribute("data-search")] = t.value;
      if (t.getAttribute("data-search") === "q") ui.sub = null;
      renderKeepingFocus(`[data-search="${t.getAttribute("data-search")}"]`);
    } else if (t.matches("[data-obs]")) {
      const id = t.getAttribute("data-obs");
      const cur = Object.assign({ texto: "", enlace: "" }, state.observaciones[id]);
      cur[t.getAttribute("data-obs-key")] = t.value;
      const enlace = Store.safeUrl(cur.enlace);
      t.toggleAttribute("aria-invalid", t.getAttribute("data-obs-key") === "enlace" && !!cur.enlace && !enlace);
      if (cur.texto.trim() || cur.enlace.trim()) state.observaciones[id] = { texto: cur.texto.slice(0, 2000), enlace: cur.enlace.trim() ? cur.enlace.slice(0, 500) : "" };
      else delete state.observaciones[id];
      save();
    } else if (t.matches("[data-resumen]")) {
      const e = evalById(t.getAttribute("data-resumen"));
      const texto = t.value.slice(0, 4000);
      e.resumen = texto.trim() ? { texto, generadoIA: !!(e.resumen && e.resumen.generadoIA), fecha: Store.now() } : null;
      saveEval(e);
      const info = $("[data-resumen-info]");
      if (info) info.innerHTML = resumenInfo(wordCount(texto), contradicts(texto, resultOf(e).recomendacion.codigo), resultOf(e).recomendacion.codigo);
    } else if (t.matches("[data-sw-notes]")) {
      const s = Store.findSoftware(db, t.getAttribute("data-sw-notes"));
      s.notas = t.value.slice(0, 4000);
      s.actualizadoEn = Store.now();
      s.cambiosLocales = true;
      persistDb();
    } else if (t.matches("[data-swf]")) {
      ui.swForm[t.getAttribute("data-swf")] = t.value;
    } else if (t.matches("[data-draft]") && t.tagName !== "SELECT") {
      setPath(ui.draft, t.getAttribute("data-draft"), t.value);
      ui.draftDirty = true;
      refreshDraftErrors();
    } else if (t.matches("[data-draft-nota]")) {
      ui.draftNota = t.value;
    } else if (t.matches("[data-cfg]")) {
      setPath(ui.cfg, t.getAttribute("data-cfg"), t.value);
      if (!ui.cfgDirty) {
        ui.cfgDirty = true;
        const btn = $("[data-action='cfg-save']");
        if (btn) btn.disabled = false;
      }
    }
  });

  // Recordar qué factores del editor de la guía están desplegados (el evento toggle no burbujea).
  document.addEventListener(
    "toggle",
    (ev) => {
      const d = ev.target;
      if (!d.matches || !d.matches(".admin-factor")) return;
      const fi = Number(d.getAttribute("data-fi"));
      if (d.open) ui.openFactors.add(fi);
      else ui.openFactors.delete(fi);
    },
    true
  );

  document.addEventListener("keydown", (ev) => {
    keyboardMode = true;
    lastKey = ev.key;
    // Atajo del paso 2: 1-4 responde la pregunta activa.
    if (ui.screen === 2 && ui.sub && /^[1-4]$/.test(ev.key) && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !$("#overlay").innerHTML) {
      const tag = ev.target.tagName;
      if (!(tag === "TEXTAREA" || tag === "SELECT" || (tag === "INPUT" && ev.target.type !== "radio"))) {
        ev.preventDefault();
        answer([ui.sub], Number(ev.key));
        return;
      }
    }
    if (ev.key === "Enter" && ev.target.id === "swf-tag") {
      ev.preventDefault();
      ACTIONS["tag-add"]();
      return;
    }
    if (ev.key === "Enter" && ev.target.id === "tpl-name") {
      ev.preventDefault();
      const c = $("#overlay [data-action='popup-confirm']");
      if (c) c.click();
      return;
    }
    if (ev.key === "Escape") {
      closeOverlay();
      if (ui.menu || ui.nav) {
        ui.menu = false;
        ui.nav = false;
        renderSidebar(E.evaluate(DATA, state));
      }
    }
  });

  // Al imprimir, desplegar los detalles plegados (salvo la tabla de datos de los gráficos).
  window.addEventListener("beforeprint", () => {
    document.querySelectorAll("details:not(.chart-table):not(.help-box)").forEach((d) => (d.open = true));
  });

  window.addEventListener("beforeunload", (ev) => {
    if (ui.cfgDirty || (ui.draft && ui.draftDirty)) {
      ev.preventDefault();
      ev.returnValue = "";
    }
  });

  window.addEventListener("hashchange", () => {
    const h = parseHash();
    if (h.screen !== ui.screen || h.param !== ui.param) go(h.screen, h.param);
  });

  // Otra pestaña modificó el almacén: recargar para no sobrescribir sus cambios.
  window.addEventListener("storage", (ev) => {
    if (ev.key !== Store.DB_KEY) return;
    db = Store.load(storage, E, BASE);
    activateFromDb();
    render();
  });

  if (/[?&]demo=1/.test(location.search) && !savedEvaluations().length) loadDemo();
  if (db.config.tema && db.config.tema !== "sistema" && !/[?&]theme=/.test(location.search)) applyTheme(db.config.tema);
  render();
  if (serverOn()) checkServer(true);
})();
