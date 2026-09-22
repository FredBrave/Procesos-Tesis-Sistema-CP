/**
 * GUIOS PRO — Interfaz (vanilla JS, sin build).
 *
 * Pantallas: 0 Inicio · 1 Paso 1 Importancia (GUIOS 1-2) · 2 Paso 2 Cumplimiento (GUIOS 3-4) · 3 Paso 3 Resultado (GUIOS 5-6)
 * Estado persistido en localStorage. Toda la lógica de cálculo vive en engine.js.
 */
(function () {
  "use strict";

  const DATA = window.GUIOS_DATA;
  const E = window.GuiosEngine;
  const STORAGE_KEY = "guiospro.state.v1";
  const THEME_KEY = "guiospro.theme";
  const LICENCIAS = ["FLOSS permisiva (MIT, Apache, BSD)", "FLOSS copyleft (GPL, AGPL)", "FLOSS copyleft débil (LGPL, MPL)", "Privativa", "Otra"];

  /** Pantallas. `id` es el hash de la URL; `step` es el número que ve el usuario. */
  const SCREENS = [
    { id: "inicio", label: "Inicio" },
    { id: "paso-1-2", step: 1, icon: "sliders", label: "Importancia", title: "¿Qué tan importante es cada factor para su organización?", guios: "Pasos 1 y 2 de la guía GUIOS" },
    { id: "paso-3-4", step: 2, icon: "checkSquare", label: "Cumplimiento", title: "¿En qué medida el software cumple cada requisito?", guios: "Pasos 3 y 4 de la guía GUIOS" },
    { id: "paso-5-6", step: 3, icon: "pie", label: "Resultado", title: "Resultado de la evaluación", guios: "Pasos 5 y 6 de la guía GUIOS" },
  ];

  /**
   * Secciones adicionales del sidebar (además de Inicio y los 3 pasos).
   * Para activar una: quitar `soon: true` y asignar `screen` (índice de SCREENS) o `href`.
   */
  const NAV_EXTRA = [
    { label: "Historial", icon: "clock", soon: true },
    { label: "Administración", icon: "settings", soon: true },
  ];

  /* ------------------------------------------------------------------ */
  /* Estado                                                              */
  /* ------------------------------------------------------------------ */
  let state = load();
  const ui = { screen: screenFromHash(), factor: null, menu: false, nav: false, detail: false };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Object.assign(E.initialState(DATA), parsed, {
          software: Object.assign(E.initialState(DATA).software, parsed.software || {}),
        });
      }
    } catch (err) {
      /* almacenamiento no disponible o corrupto: empezar de cero */
    }
    return E.initialState(DATA);
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      /* modo privado / cuota: se sigue funcionando en memoria */
    }
  }

  function screenFromHash() {
    const idx = SCREENS.findIndex((s) => "#" + s.id === location.hash);
    return idx >= 0 ? idx : 0;
  }

  /* ------------------------------------------------------------------ */
  /* Tema                                                                */
  /* ------------------------------------------------------------------ */
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      /* sin persistencia */
    }
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
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  };
  function icon(name, size) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size || 18}" height="${size || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  }

  function fmt(n) {
    return n == null ? "—" : n.toFixed(1);
  }
  function dimName(id) {
    const d = DATA.dimensiones.find((x) => x.id === id);
    return d ? d.nombre : id;
  }
  function factorById(id) {
    return DATA.factores.find((f) => f.id === id);
  }
  function levelBadge(idx, relevant) {
    const cls = !relevant ? "" : idx === 3 ? "badge-success" : idx === 2 ? "badge-primary" : "badge-warning";
    return `<span class="badge ${cls}">${esc(DATA.nivelesImportancia[idx])}</span>`;
  }
  function fodaBadge(foda) {
    return `<span class="badge badge-${foda}">${foda}</span>`;
  }
  function plural(n, s, p) {
    return `${n} ${n === 1 ? s : p}`;
  }

  /* ------------------------------------------------------------------ */
  /* Render principal                                                    */
  /* ------------------------------------------------------------------ */
  function render() {
    const result = E.evaluate(DATA, state);
    ensureSelectedFactor(result);
    renderSidebar(result);
    $("#screen").innerHTML = [renderInicio, renderPaso1, renderPaso2, renderPaso3][ui.screen](result);
    renderFooter(result);
    const wantedHash = "#" + SCREENS[ui.screen].id;
    if (location.hash !== wantedHash) history.replaceState(null, "", wantedHash);
    const s = SCREENS[ui.screen];
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

  /* ---------- Sidebar (navegación principal) ---------- */
  function stepSubtitle(i, result) {
    if (i === 1) return state.paso1Confirmado ? `${plural(result.relevantes, "factor", "factores")} a evaluar` : "Pendiente";
    if (i === 2) {
      const relevant = result.factores.filter((f) => f.relevante);
      const total = relevant.reduce((n, f) => n + f.subfactoresTotal, 0);
      const done = relevant.reduce((n, f) => n + f.subfactoresRespondidos, 0);
      return done ? `${done} de ${total} respuestas` : "Pendiente";
    }
    const rec = result.recomendacion;
    return rec && !result.pendientes.length ? `Recomendación ${rec.codigo}` : "Pendiente";
  }

  function renderSidebar(result) {
    const relevant = result.factores.filter((f) => f.relevante);
    const total = relevant.reduce((n, f) => n + f.subfactoresTotal, 0);
    const answered = relevant.reduce((n, f) => n + f.subfactoresRespondidos, 0);
    const pct = total ? Math.round((answered / total) * 100) : 0;
    const dark = currentTheme() === "dark";
    const sw = state.software.nombre;

    const steps = SCREENS.filter((x) => x.step)
      .map((x, i) => {
        const idx = i + 1;
        const current = idx === ui.screen;
        const done = stepDone(idx, result);
        return `<li class="side-step ${current ? "is-current" : ""} ${done ? "is-done" : ""}">
          <a href="#${x.id}" data-nav="${idx}" ${current ? 'aria-current="page"' : ""}>
            <span class="step-num">${done && !current ? icon("check", 20) : icon(x.icon, 20)}</span>
            <span class="step-text">
              <small class="step-kicker">Paso ${x.step} de 3</small>
              <span class="step-title">${esc(x.label)}</span>
              <small class="step-state">${esc(stepSubtitle(idx, result))}</small>
            </span>
          </a>
        </li>`;
      })
      .join("");

    const extra = NAV_EXTRA.map((item) =>
      item.soon
        ? `<span class="side-link is-disabled" title="Disponible en una próxima versión">${icon(item.icon, 18)}<span>${esc(item.label)}</span><span class="badge badge-plain">Pronto</span></span>`
        : `<a class="side-link" href="${item.href || "#" + SCREENS[item.screen].id}" ${item.screen != null ? `data-nav="${item.screen}"` : ""} ${item.screen === ui.screen ? 'aria-current="page"' : ""}>${icon(item.icon, 18)}<span>${esc(item.label)}</span></a>`
    ).join("");

    $("#sidebar").innerHTML = `
      <div class="side-top">
        <a class="brand" href="#inicio" data-nav="0"><span class="logo" aria-hidden="true">G</span><span><span class="name">GUIOS PRO</span><small>Adopción de software</small></span></a>
        <button class="btn btn-icon btn-ghost side-close" data-action="nav-close" aria-label="Cerrar menú">${icon("x")}</button>
      </div>
      <nav class="side-nav">
        <a class="side-link" href="#inicio" data-nav="0" ${ui.screen === 0 ? 'aria-current="page"' : ""}>${icon("home", 18)}<span>Inicio</span></a>
        <div class="side-title">Evaluación</div>
        <ol class="side-steps">${steps}</ol>
        <div class="side-title">Más</div>
        ${extra}
      </nav>
      <div class="side-bottom">
        <div class="side-eval">
          <div class="row-between"><span class="side-eval-name">${sw ? esc(sw) : "Sin software"}</span><span class="xs muted">${pct}%</span></div>
          <div class="progress"><span style="width:${pct}%"></span></div>
        </div>
        <div class="side-actions">
          <button class="btn btn-icon btn-ghost" data-action="theme" title="${dark ? "Modo claro" : "Modo oscuro"}" aria-label="${dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}">${icon(dark ? "sun" : "moon")}</button>
          <button class="btn btn-icon btn-ghost" data-action="how" title="¿Cómo funciona?" aria-label="¿Cómo funciona?">${icon("help")}</button>
          <span class="spacer"></span>
          <div class="menu-anchor">
            <button class="btn btn-icon btn-ghost" data-action="menu" aria-haspopup="menu" aria-expanded="${ui.menu}" aria-label="Más opciones">${icon("more")}</button>
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
      <button role="menuitem" data-action="demo">${icon("star", 16)} Cargar ejemplo</button>
      <label role="menuitem" class="menu-file" data-action="import-label">${icon("upload", 16)} Importar evaluación<input type="file" accept="application/json" class="sr-only" data-action="import-file" /></label>
      <button role="menuitem" data-action="export-json">${icon("download", 16)} Exportar evaluación (JSON)</button>
      <button role="menuitem" data-action="print">${icon("printer", 16)} Exportar informe (PDF)</button>
      <hr />
      <button role="menuitem" class="is-danger" data-action="reset">${icon("trash", 16)} Limpiar datos</button>
    </div>`;
  }

  function screenHeader(result, extra) {
    const s = SCREENS[ui.screen];
    return `<div class="screen-header">
        <div>
          <div class="kicker">Paso ${s.step} de 3 · ${esc(s.guios)}</div>
          <h1 class="h1">${esc(s.title)}</h1>
        </div>
        ${extra ? `<div class="actions">${extra}</div>` : ""}
      </div>`;
  }

  /* ---------- Footer ---------- */
  function renderFooter(result) {
    if (ui.screen === 0) {
      $("#footer").innerHTML = "";
      $("#footer").hidden = true;
      return;
    }
    $("#footer").hidden = false;
    const relevant = result.factores.filter((f) => f.relevante);
    const totalSub = relevant.reduce((s, f) => s + f.subfactoresTotal, 0);
    const answered = relevant.reduce((s, f) => s + f.subfactoresRespondidos, 0);
    const pct = totalSub ? Math.round((answered / totalSub) * 100) : 0;
    let status = "";
    if (ui.screen === 1) status = `${plural(result.relevantes, "factor", "factores")} se evaluarán`;
    else if (ui.screen === 2) status = `${answered} de ${totalSub} preguntas respondidas`;
    else if (ui.screen === 3) status = result.pendientes.length ? `Faltan ${plural(result.pendientes.length, "factor", "factores")} por responder` : "Evaluación completa";
    else status = answered ? `Evaluación en curso · ${pct}%` : "Sin evaluación en curso";
    const last = ui.screen === SCREENS.length - 1;
    $("#footer").innerHTML = `
      <div class="inner">
        <div class="status">
          <span>${esc(status)}</span>
          <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
        </div>
        <button class="btn btn-secondary" data-nav="${ui.screen - 1}" ${ui.screen === 0 ? "disabled" : ""}>${icon("chevronLeft")}<span>Anterior</span></button>
        ${
          last
            ? `<button class="btn btn-primary" data-action="export-sheet">${icon("download")}<span>Exportar</span></button>`
            : `<button class="btn btn-primary" data-nav="${ui.screen + 1}"><span>${ui.screen === 0 ? "Comenzar" : "Siguiente"}</span>${icon("chevronRight")}</button>`
        }
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Pantalla 0 · Inicio                                                 */
  /* ------------------------------------------------------------------ */
  function renderInicio(result) {
    const sw = state.software;
    const started = Object.keys(state.subfactores).length > 0;
    const hayDatos = started || state.paso1Confirmado || Object.values(sw).some((v) => v);
    return `
      <div class="screen-header">
        <div>
          <div class="kicker">Guía GUIOS para la adopción de software</div>
          <h1 class="h1">Evalúe si un software es adecuado para su organización</h1>
          <p>Tres pasos: indique qué factores le importan, valore si el software los cumple y obtenga una recomendación.</p>
        </div>
      </div>

      <div class="hero">
        <section class="card">
          <div class="card-header"><h2 class="h3">Software a evaluar</h2></div>
          <div class="card-body stack">
            <div class="field"><label for="sw-nombre">Nombre del software</label><input id="sw-nombre" class="input" placeholder="Ej. Moodle, Odoo, LibreOffice" data-field="software.nombre" value="${esc(sw.nombre)}" /></div>
            <details class="details" ${sw.version || sw.licencia || sw.proveedor || sw.organizacion || sw.evaluador ? "open" : ""}>
              <summary>Más datos (opcional) ${icon("chevronDown", 16)}</summary>
              <div class="stack" style="padding-top:var(--sp-3)">
                <div class="grid-2">
                  <div class="field"><label for="sw-version">Versión</label><input id="sw-version" class="input" placeholder="Ej. 4.3" data-field="software.version" value="${esc(sw.version)}" /></div>
                  <div class="field"><label for="sw-lic">Tipo de licencia</label>
                    <select id="sw-lic" class="select" data-field="software.licencia">
                      <option value="">Seleccione…</option>
                      ${LICENCIAS.map((l) => `<option ${sw.licencia === l ? "selected" : ""}>${esc(l)}</option>`).join("")}
                    </select></div>
                </div>
                <div class="grid-2">
                  <div class="field"><label for="sw-prov">Proveedor / comunidad</label><input id="sw-prov" class="input" data-field="software.proveedor" value="${esc(sw.proveedor)}" /></div>
                  <div class="field"><label for="sw-org">Organización</label><input id="sw-org" class="input" data-field="software.organizacion" value="${esc(sw.organizacion)}" /></div>
                </div>
                <div class="field"><label for="sw-eval">Evaluador</label><input id="sw-eval" class="input" data-field="software.evaluador" value="${esc(sw.evaluador)}" /></div>
              </div>
            </details>
          </div>
          <div class="card-footer">
            <button class="btn btn-ghost" data-action="how">${icon("help")} ¿Cómo funciona?</button>
            <span class="spacer"></span>
            ${hayDatos ? `<button class="btn btn-ghost is-danger" data-action="reset">${icon("trash")} Limpiar datos</button>` : ""}
            <button class="btn btn-primary" data-nav="1">${started ? "Continuar" : "Comenzar"} ${icon("chevronRight")}</button>
          </div>
        </section>

      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Pantalla 1 · Importancia (GUIOS 1-2)                                */
  /* ------------------------------------------------------------------ */
  function renderPaso1(result) {
    const byDim = DATA.dimensiones.map((d) => ({ d, rows: result.factores.filter((f) => f.dimension === d.id) }));
    const toggle = `<label class="switch"><button type="button" class="toggle" role="switch" aria-checked="${ui.detail}" data-action="detail"></button><span>Ver cálculo</span></label>`;
    return (
      screenHeader(result, toggle) +
      `<p class="lead">Elija la importancia de cada factor. Los marcados como <strong>Irrelevante</strong> no se evaluarán.</p>
      <div class="stack">
      ${byDim
        .map(
          ({ d, rows }) => `
        <section class="card">
          <div class="card-header"><h2 class="h3">${esc(d.nombre)}</h2><span class="muted small">${plural(rows.filter((r) => r.relevante).length, "factor", "factores")} de ${rows.length}</span></div>
          <div class="factor-list ${ui.detail ? "has-detail" : ""}">
            ${rows
              .map((f) => {
                const def = factorById(f.id);
                return `<div class="factor-row ${f.relevante ? "" : "is-irrelevant"}">
                  <div class="factor-name">
                    <span>${esc(f.nombre)}</span>
                    <small class="muted">Sugerido: ${esc(DATA.nivelesImportancia[f.importanciaSugerida - 1])}${def.alcance !== "Ambos" ? ` · ${esc(def.alcance)}` : ""}</small>
                  </div>
                  <div class="factor-control">
                    <select class="select select-sm is-level-${f.importanciaDecisor}" data-decisor="${f.id}" aria-label="Importancia de ${esc(f.nombre)}">
                      ${DATA.nivelesImportancia.map((l, k) => `<option value="${k + 1}" ${f.importanciaDecisor === k + 1 ? "selected" : ""}>${esc(l)}</option>`).join("")}
                    </select>
                    ${
                      def.alcance === "Ambos"
                        ? `<div class="segmented" role="group" aria-label="Alcance de ${esc(f.nombre)}">
                            <button type="button" data-scope="${f.id}" data-value="Interno" aria-pressed="${f.alcance === "Interno"}">Interno</button>
                            <button type="button" data-scope="${f.id}" data-value="Externo" aria-pressed="${f.alcance === "Externo"}">Externo</button>
                          </div>`
                        : ""
                    }
                  </div>
                  <div class="factor-detail"><span class="xs muted">Importancia relativa</span>${levelBadge(f.importanciaRelativaIdx, f.relevante)}</div>
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
  /* Pantalla 2 · Cumplimiento (GUIOS 3-4)                               */
  /* ------------------------------------------------------------------ */
  function renderPaso2(result) {
    const relevant = result.factores.filter((f) => f.relevante);
    const header = screenHeader(result);
    if (!relevant.length) {
      return header + `<div class="alert alert-warning">${icon("alert")}<div>No hay factores para evaluar. Vuelva al <a href="#paso-1-2" data-nav="1">paso 1</a> y asigne una importancia distinta de <em>Irrelevante</em>.</div></div>`;
    }
    const cur = relevant.find((f) => f.id === ui.factor) || relevant[0];
    const def = factorById(cur.id);
    const pos = relevant.indexOf(cur);
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
    const panel = `
      <section class="card">
        <div class="card-header">
          <div>
            <h2 class="h3">${esc(cur.nombre)}</h2>
            <div class="small muted">${esc(dimName(cur.dimension))} · ${pos + 1} de ${relevant.length}</div>
          </div>
          <span class="badge ${cur.completo ? "badge-success" : "badge-plain"}">${cur.subfactoresRespondidos} de ${cur.subfactoresTotal}</span>
        </div>
        <div class="card-body">
          ${def.subfactores
            .map(
              (s, i) => `<div class="subfactor-row">
                <div class="text"><span class="idx">${i + 1}</span><span>${esc(s.nombre)}</span></div>
                <select class="select select-sm ${state.subfactores[s.id] ? "is-level-" + state.subfactores[s.id] : ""}" data-sub="${s.id}" aria-label="Respuesta: ${esc(s.nombre)}">
                  <option value="">Seleccione…</option>
                  ${DATA.nivelesSubfactor.map((l, k) => `<option value="${k + 1}" ${state.subfactores[s.id] === k + 1 ? "selected" : ""}>${esc(l)}</option>`).join("")}
                </select>
              </div>`
            )
            .join("")}
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
    return header + mobileSelect + `<div class="split">${side}<div>${panel}</div></div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Pantalla 3 · Resultado (GUIOS 5-6)                                  */
  /* ------------------------------------------------------------------ */
  function renderPaso3(result) {
    const sw = state.software;
    const rec = result.recomendacion;
    const evaluated = result.factores.filter((f) => f.foda);
    const pending = result.pendientes.map((id) => factorById(id).nombre);
    const actions = `<button class="btn btn-secondary" data-action="print">${icon("printer")} Exportar PDF</button>`;
    const printHeader = `
      <div class="print-only" style="margin-bottom:24px">
        <h1 class="h1">GUIOS PRO · Informe de evaluación</h1>
        <p class="muted small">${esc(sw.nombre || "Software sin nombre")}${sw.version ? " " + esc(sw.version) : ""}${sw.licencia ? " · " + esc(sw.licencia) : ""}${sw.organizacion ? " · " + esc(sw.organizacion) : ""}${sw.evaluador ? " · Evaluador: " + esc(sw.evaluador) : ""} · ${new Date().toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>`;

    if (!evaluated.length) {
      return screenHeader(result) + `<div class="alert alert-warning">${icon("alert")}<div>Todavía no hay respuestas. Complete el <a href="#paso-3-4" data-nav="2">paso 2</a> para ver el resultado.</div></div>`;
    }

    const recCard = `<section class="card recommendation tone-${rec.tono}">
        <div class="card-body body">
          <span class="code">${rec.codigo}</span>
          <div>
            <div class="rec-kicker">Recomendación ${rec.codigo}${sw.nombre ? ` para ${esc(sw.nombre)}` : ""}</div>
            <h2 class="h2">${esc(rec.titulo)}</h2>
            <p>${esc(rec.texto)}</p>
            ${
              rec.factoresCriticos.length
                ? `<div class="critical"><span class="small muted">Factores a revisar:</span>${rec.factoresCriticos.map((f) => `<span class="badge badge-${f.foda}">${esc(f.nombre)}</span>`).join("")}</div>`
                : ""
            }
          </div>
        </div>
        ${
          pending.length
            ? `<div class="alert alert-warning" style="border-radius:0 0 var(--radius-lg) 0">${icon("alert")}<div>Resultado parcial: faltan por responder ${esc(pending.join(", "))}.</div></div>`
            : ""
        }
      </section>`;

    const quadrant = (name, plural, color, hint) => {
      const fs = evaluated.filter((f) => f.foda === name);
      return `<div class="foda-quadrant" style="--q-color:${color}">
        <div class="h4"><span>${plural} <small class="muted">· ${hint}</small></span><span>${fs.length}</span></div>
        ${fs.length ? `<ul>${fs.map((f) => `<li>${esc(f.nombre)}</li>`).join("")}</ul>` : `<div class="empty">Ninguna</div>`}
      </div>`;
    };

    const details = `
      <details class="details card">
        <summary class="card-header">Ver detalle por factor ${icon("chevronDown", 16)}</summary>
        <div class="card-body dim-bars">
          ${result.dimensiones
            .map(
              (d) => `<div class="bar-row"><span>${esc(d.nombre)}</span>
                <div class="progress"><span style="width:${d.ponderacion ? (d.ponderacion / 4) * 100 : 0}%"></span></div>
                <span class="num">${fmt(d.ponderacion)}</span></div>`
            )
            .join("")}
          <p class="xs muted" style="margin-top:var(--sp-2)">Cumplimiento medio por dimensión (1 = no cumple, 4 = cumple).</p>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Factor</th><th>Importancia</th><th class="num">Cumplimiento</th><th>Alcance</th><th>Clasificación</th></tr></thead>
            <tbody>
              ${result.factores
                .map(
                  (f) => `<tr class="${f.relevante ? "" : "is-muted"}">
                    <td>${esc(f.nombre)}<br /><span class="xs muted">${esc(dimName(f.dimension))}</span></td>
                    <td>${levelBadge(f.importanciaRelativaIdx, f.relevante)}</td>
                    <td class="num">${fmt(f.ponderacion)}</td>
                    <td class="muted">${f.relevante ? esc(f.alcance) : "—"}</td>
                    <td>${f.relevante ? (f.foda ? fodaBadge(f.foda) : `<span class="badge badge-plain badge-warning">Pendiente</span>`) : `<span class="badge badge-plain muted">No evaluado</span>`}</td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </details>`;

    return (
      screenHeader(result, actions) +
      printHeader +
      `<div class="stack">
        ${recCard}
        <section class="card">
          <div class="card-header"><h2 class="h3">Matriz FODA</h2><span class="muted small">${result.positivos} a favor · ${result.negativos} en contra</span></div>
          <div class="card-body foda-grid">
            ${quadrant("Fortaleza", "Fortalezas", "var(--foda-fortaleza)", "internas")}${quadrant("Oportunidad", "Oportunidades", "var(--foda-oportunidad)", "externas")}${quadrant("Debilidad", "Debilidades", "var(--foda-debilidad)", "internas")}${quadrant("Amenaza", "Amenazas", "var(--foda-amenaza)", "externas")}
          </div>
        </section>
        ${details}
      </div>`
    );
  }

  /* ------------------------------------------------------------------ */
  /* Overlays: pop-up, action sheet, toast                               */
  /* ------------------------------------------------------------------ */
  function closeOverlay() {
    $("#overlay").innerHTML = "";
  }

  function popup({ title, html, confirmLabel, danger, onConfirm }) {
    $("#overlay").innerHTML = `
      <div class="popup-backdrop" data-action="close-overlay">
        <div class="popup" role="dialog" aria-modal="true" aria-labelledby="popup-title">
          <h3 class="h3" id="popup-title">${esc(title)}</h3>
          ${html}
          <div class="actions">
            ${onConfirm ? `<button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-action="popup-confirm">${esc(confirmLabel)}</button>` : ""}
            <button class="btn ${onConfirm ? "btn-secondary" : "btn-primary"}" data-action="close-overlay">${onConfirm ? "Cancelar" : "Entendido"}</button>
          </div>
        </div>
      </div>`;
    const confirm = $("#overlay [data-action='popup-confirm']");
    if (confirm) {
      confirm.addEventListener("click", () => {
        closeOverlay();
        onConfirm();
      });
      confirm.focus();
    }
  }

  function howItWorks() {
    popup({
      title: "¿Cómo funciona?",
      html: `<ol class="how">
        <li><strong>Importancia.</strong> Indique qué tan importante es cada factor (tecnológico, organizacional y económico) para su organización.</li>
        <li><strong>Cumplimiento.</strong> Responda, para cada factor importante, si el software cumple los requisitos.</li>
        <li><strong>Resultado.</strong> Cada factor se clasifica como Fortaleza, Oportunidad, Debilidad o Amenaza y se obtiene una recomendación: <em>A</em> no adoptar, <em>B</em> adoptar con reservas, <em>C</em> adoptar.</li>
      </ol>
      <p class="xs muted">Basado en la guía GUIOS: ${DATA.factores.length} factores y ${DATA.factores.reduce((s, f) => s + f.subfactores.length, 0)} criterios. Su avance se guarda automáticamente en este navegador.</p>`,
    });
  }

  function actionSheet() {
    $("#overlay").innerHTML = `
      <div class="sheet-backdrop" data-action="close-overlay">
        <div class="sheet" role="dialog" aria-modal="true">
          <div class="group">
            <header><div class="h4">Exportar</div><p>Elija el formato.</p></header>
            <button class="action" data-action="print">Informe en PDF</button>
            <button class="action" data-action="export-json">Datos de la evaluación (JSON)</button>
          </div>
          <button class="btn btn-primary cancel" data-action="close-overlay">Cancelar</button>
        </div>
      </div>`;
  }

  let toastTimer;
  function toast(msg) {
    $("#toast").innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($("#toast").innerHTML = ""), 2600);
  }

  /* ------------------------------------------------------------------ */
  /* Acciones                                                            */
  /* ------------------------------------------------------------------ */
  function exportJson() {
    const result = E.evaluate(DATA, state);
    const payload = {
      app: "GUIOS PRO",
      version: DATA.version,
      exportado: new Date().toISOString(),
      software: state.software,
      estado: { decisor: state.decisor, alcance: state.alcance, subfactores: state.subfactores },
      resultado: {
        recomendacion: result.recomendacion,
        foda: result.foda,
        factores: result.factores.map((f) => ({
          id: f.id,
          nombre: f.nombre,
          dimension: dimName(f.dimension),
          importanciaRelativa: f.importanciaRelativa,
          relevante: f.relevante,
          alcance: f.alcance,
          ponderacion: f.ponderacion,
          foda: f.foda,
        })),
      },
    };
    const name = (state.software.nombre || "evaluacion").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `guiospro-${name || "evaluacion"}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Evaluación exportada");
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const src = parsed.estado || parsed;
        if (!src.decisor || !src.subfactores) throw new Error("formato");
        state = Object.assign(E.initialState(DATA), {
          decisor: src.decisor,
          alcance: src.alcance || {},
          subfactores: src.subfactores,
          software: Object.assign(E.initialState(DATA).software, parsed.software || {}),
          paso1Confirmado: true,
        });
        save();
        render();
        toast("Evaluación importada");
      } catch (err) {
        toast("El archivo no es una evaluación GUIOS PRO válida");
      }
    };
    reader.readAsText(file);
  }

  /** Evaluación de ejemplo (Moodle) para demostraciones: determinista, no aleatoria. */
  function loadDemo() {
    const st = E.initialState(DATA);
    st.software = { nombre: "Moodle", version: "4.3 LTS", licencia: LICENCIAS[1], proveedor: "Moodle HQ / comunidad", organizacion: "Universidad Estatal de Milagro", evaluador: "Comité de TI" };
    const decisor = { Compatibilidad: 4, Personalización: 3, Prueba: 2, Fiabilidad: 4, Reusabilidad: 1, Usabilidad: 4, Mantenibilidad: 3, Portabilidad: 3, Documentación: 3, Formación: 3, "Tiempo de adopción": 2, "Casos de estudio de adopción FLOSS": 2, "Centralidad de la tecnología de la información": 2, "Apoyo de la alta dirección": 4, "Bloqueo de proveedores": 3, Soporte: 3, "Actitud hacia el cambio": 3, "Coste total de propiedad": 4 };
    const low = new Set(["Tiempo de adopción", "Actitud hacia el cambio"]);
    DATA.factores.forEach((f) => {
      if (decisor[f.nombre]) st.decisor[f.id] = decisor[f.nombre];
      if (f.alcance === "Ambos") st.alcance[f.id] = "Interno";
      f.subfactores.forEach((s, i) => {
        st.subfactores[s.id] = low.has(f.nombre) ? (i % 2 ? 2 : 1) : i % 4 === 3 ? 3 : 4;
      });
    });
    st.paso1Confirmado = true;
    state = st;
    save();
    ui.factor = null;
  }

  function reset() {
    popup({
      title: "¿Limpiar los datos de la evaluación?",
      html: "<p>Se borrarán el software registrado, las importancias y todas las respuestas guardadas en este navegador. Exporte el JSON antes si desea conservarlos.</p>",
      confirmLabel: "Limpiar datos",
      danger: true,
      onConfirm: () => {
        state = E.initialState(DATA);
        save();
        ui.screen = 0;
        ui.factor = null;
        render();
        toast("Datos borrados: puede iniciar una nueva evaluación");
      },
    });
  }

  function setField(path, value) {
    const [obj, key] = path.split(".");
    state[obj][key] = value;
    save();
  }

  /* ------------------------------------------------------------------ */
  /* Eventos (delegación)                                                */
  /* ------------------------------------------------------------------ */
  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-nav],[data-action],[data-factor],[data-scope]");
    if (!t) {
      if (ui.menu) {
        ui.menu = false;
        renderSidebar(E.evaluate(DATA, state));
      }
      return;
    }
    if (t.hasAttribute("data-nav")) {
      ev.preventDefault();
      const n = Number(t.getAttribute("data-nav"));
      if (n >= 0 && n < SCREENS.length) {
        if (ui.screen === 1 && n > 1) {
          state.paso1Confirmado = true;
          save();
        }
        ui.screen = n;
        ui.menu = false;
        ui.nav = false;
        render();
        window.scrollTo({ top: 0 });
      }
      return;
    }
    if (t.hasAttribute("data-factor")) {
      const id = t.getAttribute("data-factor");
      if (id) {
        ui.factor = id;
        render();
        window.scrollTo({ top: 0 });
      }
      return;
    }
    if (t.hasAttribute("data-scope")) {
      state.alcance[t.getAttribute("data-scope")] = t.getAttribute("data-value");
      save();
      render();
      return;
    }
    const action = t.getAttribute("data-action");
    if (action === "import-file" || action === "import-label") return; // el <label> abre el selector; se maneja en "change"
    if (action === "menu") {
      ui.menu = !ui.menu;
      ui.nav = false;
      renderSidebar(E.evaluate(DATA, state));
    } else if (action === "nav") {
      ui.nav = !ui.nav;
      ui.menu = false;
      renderSidebar(E.evaluate(DATA, state));
    } else if (action === "nav-close") {
      ui.nav = false;
      ui.menu = false;
      renderSidebar(E.evaluate(DATA, state));
    } else if (action === "theme") {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
      renderSidebar(E.evaluate(DATA, state));
    } else if (action === "detail") {
      ui.detail = !ui.detail;
      render();
    } else if (action === "how") {
      ui.menu = false;
      renderSidebar(E.evaluate(DATA, state));
      howItWorks();
    } else if (action === "close-overlay") {
      const isBackdrop = t.classList.contains("popup-backdrop") || t.classList.contains("sheet-backdrop");
      if (!isBackdrop || ev.target === t) closeOverlay();
    } else if (action === "export-sheet") {
      actionSheet();
    } else if (action === "export-json") {
      closeOverlay();
      ui.menu = false;
      exportJson();
      renderSidebar(E.evaluate(DATA, state));
    } else if (action === "print") {
      closeOverlay();
      ui.menu = false;
      ui.screen = 3;
      render();
      setTimeout(() => window.print(), 50);
    } else if (action === "demo") {
      ui.menu = false;
      loadDemo();
      ui.screen = 3;
      render();
      toast("Ejemplo cargado (Moodle)");
    } else if (action === "reset") {
      ui.menu = false;
      renderSidebar(E.evaluate(DATA, state));
      reset();
    }
  });

  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.matches("[data-decisor]")) {
      state.decisor[t.getAttribute("data-decisor")] = Number(t.value);
      state.paso1Confirmado = true;
      save();
      render();
    } else if (t.matches("[data-sub]")) {
      const id = t.getAttribute("data-sub");
      if (t.value) state.subfactores[id] = Number(t.value);
      else delete state.subfactores[id];
      save();
      render();
    } else if (t.matches("[data-factor-select]")) {
      ui.factor = t.value;
      render();
    } else if (t.matches("[data-action='import-file']")) {
      ui.menu = false;
      if (t.files && t.files[0]) importJson(t.files[0]);
      t.value = "";
    }
  });

  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.matches("[data-field]")) setField(t.getAttribute("data-field"), t.value);
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      closeOverlay();
      if (ui.menu || ui.nav) {
        ui.menu = false;
        ui.nav = false;
        renderSidebar(E.evaluate(DATA, state));
      }
    }
  });

  // Al imprimir, desplegar los detalles plegados para que salgan en el PDF.
  window.addEventListener("beforeprint", () => {
    document.querySelectorAll("details").forEach((d) => (d.open = true));
  });

  window.addEventListener("hashchange", () => {
    const n = screenFromHash();
    if (n !== ui.screen) {
      ui.screen = n;
      render();
    }
  });

  if (/[?&]demo=1/.test(location.search) && !Object.keys(state.subfactores).length) loadDemo();
  render();
})();
