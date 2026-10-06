/**
 * GUIOS PRO — Interfaz (vanilla JS, sin build).
 *
 * Pantallas: 0 Inicio · 1 Paso 1 Importancia (GUIOS 1-2) · 2 Paso 2 Cumplimiento (GUIOS 3-4) · 3 Paso 3 Resultado (GUIOS 5-6) · 4 Panel
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
    { id: "inicio", icon: "home", label: "Inicio" },
    { id: "paso-1-2", step: 1, icon: "sliders", label: "Importancia", title: "¿Qué tan importante es cada factor para su organización?", guios: "Pasos 1 y 2 de la guía GUIOS" },
    { id: "paso-3-4", step: 2, icon: "checkSquare", label: "Cumplimiento", title: "¿En qué medida el software cumple cada requisito?", guios: "Pasos 3 y 4 de la guía GUIOS" },
    { id: "paso-5-6", step: 3, icon: "pie", label: "Resultado", title: "Resultado de la evaluación", guios: "Pasos 5 y 6 de la guía GUIOS" },
    { id: "panel", icon: "grid", label: "Panel" },
  ];
  const PANEL = 4;
  const LAST_STEP = 3;

  /** Pantallas sin paso que encabezan el sidebar, en este orden (índices de SCREENS). */
  const NAV_MAIN = [0, PANEL];

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
  const ui = { screen: screenFromHash(), factor: null, sub: null, menu: false, nav: false, detail: false };

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
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    trendingUp: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    trendingDown: '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
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
  /** Color de cada nivel de las escalas (círculo marcado y cabecera de columna). */
  const IMPORTANCE_TONE = ["var(--color-text-3)", "var(--color-warning)", "var(--color-primary)", "var(--color-success)"];
  const ANSWER_TONE = ["var(--color-danger)", "var(--color-text-3)", "var(--color-warning)", "var(--color-success)"];
  /** Etiquetas cortas de la escala de cumplimiento (la completa va en aria-label y title). */
  const ANSWER_SHORT = ["No cumple", "No sé", "Parcial", "Cumple"];

  /**
   * Escala de un clic: grupo de radios nativos dibujados como círculos alineados en columnas
   * bajo una cabecera (`scaleHead`). Admite arrastre «en cascada» (ver `paint`).
   * opts: { name, label, value, levels, short, tones, attr, suggested }
   */
  function choice(o) {
    return `<div class="choice" role="radiogroup" aria-label="${esc(o.label)}">
      ${o.levels
        .map((full, k) => {
          const v = k + 1;
          const sug = o.suggested === v;
          return `<label class="choice-opt ${sug ? "is-suggested" : ""}" style="--c:${o.tones[k]}" title="${esc(full)}${sug ? " · sugerida por la guía" : ""}">
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
    $("#screen").innerHTML = [renderInicio, renderPaso1, renderPaso2, renderPaso3, renderPanel][ui.screen](result);
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

  /** Primer paso sin completar (al que lleva «Continuar»). */
  function nextStep(result) {
    for (let i = 1; i <= LAST_STEP; i++) if (!stepDone(i, result)) return i;
    return LAST_STEP;
  }

  function hasData() {
    return Object.keys(state.subfactores).length > 0 || !!state.paso1Confirmado || Object.values(state.software).some((v) => v);
  }

  /** Avance y estado de la evaluación en curso (sidebar y panel). */
  function progress(result) {
    const relevant = result.factores.filter((f) => f.relevante);
    const total = relevant.reduce((n, f) => n + f.subfactoresTotal, 0);
    const answered = relevant.reduce((n, f) => n + f.subfactoresRespondidos, 0);
    const pct = total ? Math.round((answered / total) * 100) : 0;
    const complete = stepDone(LAST_STEP, result);
    const status = !hasData()
      ? { label: "Sin empezar", tone: "plain" }
      : complete
        ? { label: "Completada", tone: "success" }
        : { label: "En curso", tone: "primary" };
    return { total, answered, pct, complete, status };
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
    const p = progress(result);
    const dark = currentTheme() === "dark";
    const sw = state.software.nombre;

    const steps = SCREENS.filter((x) => x.step)
      .map((x, i) => {
        const idx = i + 1;
        const current = idx === ui.screen;
        const done = stepDone(idx, result);
        const sub = stepSubtitle(idx, result);
        return `<li class="side-step ${current ? "is-current" : ""} ${done ? "is-done" : ""}">
          <a href="#${x.id}" data-nav="${idx}" ${current ? 'aria-current="page"' : ""} aria-label="Paso ${x.step} de 3: ${esc(x.label)}. ${esc(sub)}">
            <span class="step-num" aria-hidden="true">${done ? icon("check", 16) : x.step}</span>
            <span class="step-text" aria-hidden="true">
              <span class="step-title">${esc(x.label)}</span>
              <small class="step-state">${esc(sub)}</small>
            </span>
          </a>
        </li>`;
      })
      .join("");

    const main = NAV_MAIN.map((n) => {
      const x = SCREENS[n];
      return `<a class="side-link" href="#${x.id}" data-nav="${n}" ${ui.screen === n ? 'aria-current="page"' : ""}>${icon(x.icon, 18)}<span>${esc(x.label)}</span></a>`;
    }).join("");

    const extra = NAV_EXTRA.map((item) =>
      item.soon
        ? `<span class="side-link is-disabled" aria-disabled="true" title="Disponible en una próxima versión">${icon(item.icon, 18)}<span>${esc(item.label)}</span><span class="soon">Pronto</span></span>`
        : `<a class="side-link" href="${item.href || "#" + SCREENS[item.screen].id}" ${item.screen != null ? `data-nav="${item.screen}"` : ""} ${item.screen === ui.screen ? 'aria-current="page"' : ""}>${icon(item.icon, 18)}<span>${esc(item.label)}</span></a>`
    ).join("");

    const evalMeta = p.complete && result.recomendacion ? `Recomendación ${result.recomendacion.codigo}` : p.status.label;

    $("#sidebar").innerHTML = `
      <div class="side-top">
        <a class="brand" href="#inicio" data-nav="0"><span class="logo" aria-hidden="true">G</span><span><span class="name">GUIOS PRO</span><small>Adopción de software</small></span></a>
        <button class="btn btn-icon btn-ghost side-close" data-action="nav-close" aria-label="Cerrar menú">${icon("x")}</button>
      </div>
      <nav class="side-nav" aria-label="Secciones">
        ${main}
        <div class="side-title">Evaluación</div>
        <ol class="side-steps">${steps}</ol>
        <div class="side-title">Próximamente</div>
        ${extra}
      </nav>
      <div class="side-bottom">
        <a class="side-eval" href="#panel" data-nav="${PANEL}" aria-label="Evaluación de ${esc(sw || "software sin nombre")}: ${p.pct}% respondido. Abrir el panel">
          <span class="side-eval-avatar" aria-hidden="true">${esc((sw || "?").charAt(0).toUpperCase())}</span>
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
    if (ui.screen === 0 || ui.screen === PANEL) {
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
    const last = ui.screen === LAST_STEP;
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
    const hayDatos = hasData();
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
    const changed = result.factores.filter((f) => f.importanciaDecisor !== f.importanciaSugerida).length;
    const toggle = `<label class="switch"><button type="button" class="toggle" role="switch" aria-checked="${ui.detail}" data-action="detail"></button><span>Ver cálculo</span></label>`;
    return (
      screenHeader(result, toggle) +
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
                  ${choice({ name: `dec-${f.id}`, label: `Importancia de ${f.nombre}`, value: f.importanciaDecisor, levels: DATA.nivelesImportancia, tones: IMPORTANCE_TONE, attr: `data-decisor="${f.id}"`, suggested: f.importanciaSugerida })}
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
    const pendingSubs = def.subfactores.filter((s) => !state.subfactores[s.id]);
    if (!def.subfactores.some((s) => s.id === ui.sub)) ui.sub = pendingSubs.length ? pendingSubs[0].id : null;
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
        ${
          pendingSubs.length > 1
            ? `<div class="quick-fill">
                <span class="small muted">Responder ${plural(pendingSubs.length, "pendiente", "pendientes")} como:</span>
                ${[4, 3, 1].map((v) => `<button class="btn btn-secondary btn-sm" data-fill="${v}" style="--c:${ANSWER_TONE[v - 1]}">${ANSWER_SHORT[v - 1]}</button>`).join("")}
              </div>`
            : ""
        }
        <div class="scale scale-answer">
          ${scaleHead("Requisito", ANSWER_SHORT, ANSWER_TONE)}
          ${def.subfactores
            .map(
              (s, i) => `<div class="subfactor-row ${s.id === ui.sub ? "is-active" : ""} ${state.subfactores[s.id] ? "is-answered" : ""}" data-sub-row="${s.id}">
                <div class="text"><span class="idx">${state.subfactores[s.id] ? icon("check", 12) : i + 1}</span><span id="q-${s.id}">${esc(s.nombre)}</span></div>
                ${choice({ name: `sub-${s.id}`, label: s.nombre, value: state.subfactores[s.id], levels: DATA.nivelesSubfactor, short: ANSWER_SHORT, tones: ANSWER_TONE, attr: `data-sub="${s.id}"` })}
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
    const hint = `<p class="lead">Un clic por pregunta; mantenga pulsado y arrastre para responder varias seguidas. <span class="kbd-hint">Teclado: <kbd>1</kbd>–<kbd>4</kbd> responde la pregunta resaltada.</span></p>`;
    return header + hint + mobileSelect + `<div class="split">${side}<div>${panel}</div></div>`;
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

    // Escala de veredictos A · B · C (orden de la matriz de recomendación)
    const verdicts = DATA.reglas.slice().sort((a, b) => a.codigo.localeCompare(b.codigo));
    const recCard = `<section class="card verdict tone-${rec.tono}">
        <div class="verdict-main">
          <span class="verdict-code" aria-hidden="true">${rec.codigo}</span>
          <div class="verdict-text">
            <div class="verdict-kicker">Recomendación ${rec.codigo}${sw.nombre ? ` · ${esc(sw.nombre)}` : ""}</div>
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
            ? `<div class="alert alert-warning verdict-alert">${icon("alert")}<div>Resultado parcial: faltan por responder ${esc(pending.join(", "))}.</div></div>`
            : ""
        }
      </section>`;

    // Matriz FODA: filas = a favor / en contra; columnas = origen interno / externo
    const QUADRANTS = [
      { key: "Fortaleza", letter: "F", title: "Fortalezas", one: "fortaleza", hint: "Internas · a favor", icon: "shield", pos: "tl" },
      { key: "Oportunidad", letter: "O", title: "Oportunidades", one: "oportunidad", hint: "Externas · a favor", icon: "trendingUp", pos: "tr" },
      { key: "Debilidad", letter: "D", title: "Debilidades", one: "debilidad", hint: "Internas · en contra", icon: "trendingDown", pos: "bl" },
      { key: "Amenaza", letter: "A", title: "Amenazas", one: "amenaza", hint: "Externas · en contra", icon: "alert", pos: "br" },
    ];
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
    const fodaCard = `<section class="card">
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
        ${fodaCard}
        ${details}
      </div>`
    );
  }

  /* ------------------------------------------------------------------ */
  /* Pantalla 4 · Panel (dashboard)                                      */
  /* ------------------------------------------------------------------ */
  const FODA_SERIES = [
    { key: "Fortaleza", label: "Fortalezas", color: "var(--foda-fortaleza)" },
    { key: "Oportunidad", label: "Oportunidades", color: "var(--foda-oportunidad)" },
    { key: "Debilidad", label: "Debilidades", color: "var(--foda-debilidad)" },
    { key: "Amenaza", label: "Amenazas", color: "var(--foda-amenaza)" },
  ];
  const TONE_COLOR = { success: "var(--color-success)", warning: "var(--color-warning)", danger: "var(--color-danger)", primary: "var(--color-primary)" };

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

  function renderPanel(result) {
    const header = (actions) => `<div class="screen-header">
        <div>
          <div class="kicker">Panel</div>
          <h1 class="h1">Estado de sus evaluaciones</h1>
        </div>
        ${actions ? `<div class="actions">${actions}</div>` : ""}
      </div>`;

    if (!hasData()) {
      return (
        header() +
        `<section class="card empty-state">
          <span class="empty-icon">${icon("grid", 28)}</span>
          <h2 class="h3">Todavía no hay evaluaciones</h2>
          <p>Registre un software y responda los tres pasos de la guía. Aquí verá su avance, la matriz FODA y la recomendación.</p>
          <div class="actions">
            <button class="btn btn-secondary" data-action="demo">${icon("star")} Ver un ejemplo</button>
            <button class="btn btn-primary" data-nav="0">Nueva evaluación ${icon("chevronRight")}</button>
          </div>
        </section>`
      );
    }

    const sw = state.software;
    const p = progress(result);
    const rec = result.recomendacion;
    const next = nextStep(result);
    const nextLabel = p.complete ? "Ver resultado" : "Continuar";
    const evaluated = result.factores.filter((f) => f.foda).length;

    const actions = `<button class="btn btn-ghost is-danger" data-action="reset">${icon("trash")} Nueva evaluación</button>
      <button class="btn btn-primary" data-nav="${next}">${nextLabel} ${icon("chevronRight")}</button>`;

    const current = `<section class="card dash-current">
        <div class="card-body">
          <div class="gauge" role="progressbar" aria-valuenow="${p.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Avance de la evaluación" style="--value:${p.pct};--gauge-color:${p.complete ? "var(--color-success)" : "var(--color-primary)"}">
            <span class="gauge-value">${p.pct}<small>%</small></span>
          </div>
          <div class="dash-current-text">
            <span class="badge badge-${p.status.tone}">${esc(p.status.label)}</span>
            <h2 class="h3">${sw.nombre ? esc(sw.nombre) : "Software sin nombre"}</h2>
            <p class="small muted">${p.answered} de ${p.total} preguntas respondidas${p.complete ? "" : ` · siguiente: paso ${next}, ${esc(SCREENS[next].label.toLowerCase())}`}</p>
          </div>
        </div>
      </section>`;

    const kpis = `<div class="kpi-grid">
        ${kpi("sliders", "Factores a evaluar", `${result.relevantes}<small> / ${DATA.factores.length}</small>`, "Importancia distinta de Irrelevante")}
        ${kpi("checkSquare", "Factores completos", `${result.relevantes - result.pendientes.length}<small> / ${result.relevantes}</small>`, result.pendientes.length ? `Faltan ${plural(result.pendientes.length, "factor", "factores")}` : "Todos respondidos", result.pendientes.length ? "var(--color-warning)" : "var(--color-success)")}
        ${kpi("pie", "A favor / en contra", `${result.positivos}<small> / ${result.negativos}</small>`, "Factores en la matriz FODA")}
        ${kpi("star", "Recomendación", rec ? rec.codigo : "—", rec ? (result.pendientes.length ? `${rec.titulo} (parcial)` : rec.titulo) : "Sin respuestas todavía", rec ? TONE_COLOR[rec.tono] : "var(--color-text-3)")}
      </div>`;

    const meta = [sw.version, sw.licencia, sw.evaluador && `Evaluador: ${sw.evaluador}`].filter(Boolean).join(" · ");
    const list = `<section class="card">
        <div class="card-header"><h2 class="h3">Evaluaciones</h2><span class="muted small">1 registrada en este navegador</span></div>
        <div class="list list-flush">
          <button class="list-item" data-nav="${next}">
            <span class="leading">${esc((sw.nombre || "?").charAt(0).toUpperCase())}</span>
            <span class="title">${sw.nombre ? esc(sw.nombre) : "Software sin nombre"}${meta ? `<span class="subtitle">${esc(meta)}</span>` : ""}</span>
            ${rec ? `<span class="detail">Recomendación ${rec.codigo}</span>` : ""}
            <span class="badge badge-${p.status.tone}">${esc(p.status.label)}</span>
            <span class="chevron">${icon("chevronRight")}</span>
          </button>
        </div>
      </section>`;

    const fodaTotal = FODA_SERIES.reduce((n, x) => n + result.foda[x.key], 0);
    const foda = `<section class="card">
        <div class="card-header"><h2 class="h3">Distribución FODA</h2><span class="muted small">${plural(evaluated, "factor clasificado", "factores clasificados")}</span></div>
        <div class="card-body">
          ${
            fodaTotal
              ? `<div class="stacked-bar" role="img" aria-label="${FODA_SERIES.map((x) => `${x.label}: ${result.foda[x.key]}`).join(", ")}">
                  ${FODA_SERIES.filter((x) => result.foda[x.key]).map((x) => `<span style="--q-color:${x.color};--n:${result.foda[x.key]}"></span>`).join("")}
                </div>`
              : `<p class="small muted">Aparecerá cuando termine de responder al menos un factor.</p>`
          }
          <ul class="legend">
            ${FODA_SERIES.map((x) => `<li style="--q-color:${x.color}"><span>${x.label}</span><strong>${result.foda[x.key]}</strong></li>`).join("")}
          </ul>
        </div>
      </section>`;

    const dims = `<section class="card">
        <div class="card-header"><h2 class="h3">Cumplimiento por dimensión</h2><span class="muted small">escala 1 – 4</span></div>
        <div class="card-body dim-bars">
          ${result.dimensiones
            .map(
              (d) => `<div class="bar-row"><span>${esc(d.nombre)}</span>
                <div class="progress" role="img" aria-label="${esc(d.nombre)}: ${d.ponderacion ? fmt(d.ponderacion) + " de 4" : "sin datos"}"><span style="width:${d.ponderacion ? (d.ponderacion / 4) * 100 : 0}%"></span></div>
                <span class="num">${fmt(d.ponderacion)}</span></div>`
            )
            .join("")}
        </div>
      </section>`;

    return (
      header(actions) +
      `<div class="stack">
        <div class="dash-top">${current}${kpis}</div>
        ${list}
        <div class="grid-2">${foda}${dims}</div>
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

  /**
   * Guarda respuestas del paso 2 y avanza: a la siguiente pregunta pendiente del factor
   * o, si el factor queda completo, al siguiente factor con pendientes.
   */
  function answer(ids, value) {
    const def = factorOfSub(ids[0]);
    const wasComplete = def.subfactores.every((s) => state.subfactores[s.id]);
    ids.forEach((id) => (state.subfactores[id] = value));
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
        if (nextF) {
          ui.factor = nextF.id;
          toast(`${def.nombre} completo · sigue ${nextF.nombre}`);
          window.scrollTo({ top: 0 });
        } else {
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
  document.addEventListener("click", (ev) => {
    if (ev.detail > 0) keyboardMode = false;
    const t = ev.target.closest("[data-nav],[data-action],[data-factor],[data-scope],[data-fill],[data-sub-row]");
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
        ui.sub = null;
        render();
        window.scrollTo({ top: 0 });
      }
      return;
    }
    if (t.hasAttribute("data-fill")) {
      const def = factorById(ui.factor);
      const ids = def.subfactores.filter((s) => !state.subfactores[s.id]).map((s) => s.id);
      if (ids.length) answer(ids, Number(t.getAttribute("data-fill")));
      return;
    }
    if (t.hasAttribute("data-sub-row")) {
      // Clic en el texto de una pregunta: se vuelve la activa (destino de las teclas 1-4).
      if (!ev.target.closest(".choice") && ui.sub !== t.getAttribute("data-sub-row")) {
        ui.sub = t.getAttribute("data-sub-row");
        document.querySelectorAll(".subfactor-row.is-active").forEach((r) => r.classList.remove("is-active"));
        t.classList.add("is-active");
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
    } else if (action === "reset-decisor") {
      state.decisor = E.initialState(DATA).decisor;
      save();
      render();
      toast("Importancias sugeridas restablecidas");
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
      refocus(t);
    } else if (t.matches("[data-sub]")) {
      if (keyboardMode && /^Arrow/.test(lastKey)) {
        // Recorrer opciones con las flechas marca el radio: se guarda sin saltar de pregunta.
        state.subfactores[t.getAttribute("data-sub")] = Number(t.value);
        save();
        render();
        refocus(t);
      } else answer([t.getAttribute("data-sub")], Number(t.value));
    } else if (t.matches("[data-factor-select]")) {
      ui.factor = t.value;
      ui.sub = null;
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
