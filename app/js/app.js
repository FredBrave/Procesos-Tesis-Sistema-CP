/**
 * GUIOS PRO — Interfaz (vanilla JS, sin build).
 *
 * Pantallas: 0 Inicio · 1 Paso 1-2 (factores) · 2 Paso 3-4 (subfactores) · 3 Paso 5-6 (resultados)
 * Estado persistido en localStorage (clave STORAGE_KEY). Toda la lógica de cálculo vive en engine.js.
 */
(function () {
  "use strict";

  const DATA = window.GUIOS_DATA;
  const E = window.GuiosEngine;
  const STORAGE_KEY = "guiospro.state.v1";
  const LICENCIAS = ["FLOSS permisiva (MIT, Apache, BSD)", "FLOSS copyleft (GPL, AGPL)", "FLOSS copyleft débil (LGPL, MPL)", "Privativa", "Otra"];

  const SCREENS = [
    { id: "inicio", short: "Inicio", label: "Inicio" },
    { id: "paso-1-2", short: "1-2", label: "Paso 1 y 2 · Factores relevantes" },
    { id: "paso-3-4", short: "3-4", label: "Paso 3 y 4 · Factores ponderados" },
    { id: "paso-5-6", short: "5-6", label: "Paso 5 y 6 · Evaluación y recomendación" },
  ];

  /* ------------------------------------------------------------------ */
  /* Estado                                                              */
  /* ------------------------------------------------------------------ */
  let state = load();
  const ui = { screen: screenFromHash(), factor: null, menu: false };

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
    check: '<polyline points="20 6 9 17 4 12"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  };
  function icon(name, size) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size || 18}" height="${size || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  }

  function fmt(n) {
    return n == null ? "—" : n.toFixed(2);
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
    if (!foda) return `<span class="badge badge-plain muted">Sin evaluar</span>`;
    return `<span class="badge badge-${foda}">${foda}</span>`;
  }

  /* ------------------------------------------------------------------ */
  /* Render principal                                                    */
  /* ------------------------------------------------------------------ */
  function render() {
    const result = E.evaluate(DATA, state);
    ensureSelectedFactor(result);
    renderStepper(result);
    const screen = $("#screen");
    screen.innerHTML = [renderInicio, renderPaso12, renderPaso34, renderPaso56][ui.screen](result);
    renderFooter(result);
    const wantedHash = "#" + SCREENS[ui.screen].id;
    if (location.hash !== wantedHash) history.replaceState(null, "", wantedHash);
    document.title = `GUIOS PRO · ${SCREENS[ui.screen].label}`;
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
    if (i === 1) return result.relevantes > 0;
    if (i === 2) return result.relevantes > 0 && result.pendientes.length === 0;
    if (i === 3) return !!result.recomendacion && result.pendientes.length === 0;
    return true;
  }

  function renderStepper(result) {
    const items = SCREENS.map((s, i) => {
      const current = i === ui.screen;
      const done = i !== ui.screen && stepDone(i, result) && i !== 0;
      return `<button class="page-btn is-step ${done ? "is-done" : ""}" data-nav="${i}" ${current ? 'aria-current="page"' : ""} title="${esc(s.label)}">${i === 0 ? icon("grid", 14) : esc(s.short)}</button>`;
    });
    $("#stepper").innerHTML = `
      <span class="step-label">${esc(SCREENS[ui.screen].label)}</span>
      <div class="pagination">
        <button class="page-btn" data-nav="${ui.screen - 1}" ${ui.screen === 0 ? "disabled" : ""} aria-label="Anterior">${icon("chevronLeft", 16)}</button>
        ${items.join("")}
        <button class="page-btn" data-nav="${ui.screen + 1}" ${ui.screen === SCREENS.length - 1 ? "disabled" : ""} aria-label="Siguiente">${icon("chevronRight", 16)}</button>
      </div>`;
  }

  function renderFooter(result) {
    const totalSub = DATA.factores.filter((f) => result.factores.find((r) => r.id === f.id).relevante).reduce((s, f) => s + f.subfactores.length, 0);
    const answered = result.factores.filter((f) => f.relevante).reduce((s, f) => s + f.subfactoresRespondidos, 0);
    const pct = totalSub ? Math.round((answered / totalSub) * 100) : 0;
    const status = [
      `${result.relevantes} de ${DATA.factores.length} factores relevantes`,
      `${answered} de ${totalSub} subfactores valorados`,
    ].join(" · ");
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
            : `<button class="btn btn-primary" data-nav="${ui.screen + 1}"><span>Siguiente</span>${icon("chevronRight")}</button>`
        }
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Pantalla 0 · Inicio                                                 */
  /* ------------------------------------------------------------------ */
  function renderInicio(result) {
    const sw = state.software;
    const totalSub = DATA.factores.reduce((s, f) => s + f.subfactores.length, 0);
    const answered = result.factores.reduce((s, f) => s + (f.relevante ? f.subfactoresRespondidos : 0), 0);
    const rec = result.recomendacion;
    const steps = [
      { i: 1, t: "Paso 1 y 2 · Factores relevantes", s: `${result.relevantes} de ${DATA.factores.length} factores marcados como relevantes`, done: stepDone(1, result) },
      { i: 2, t: "Paso 3 y 4 · Factores ponderados", s: result.pendientes.length ? `${result.pendientes.length} factor(es) relevante(s) pendiente(s) de valorar` : `${answered} subfactores valorados`, done: stepDone(2, result) },
      { i: 3, t: "Paso 5 y 6 · Evaluación y recomendación", s: rec && !result.pendientes.length ? `Recomendación ${rec.codigo}: ${rec.titulo}` : "Disponible cuando se completen los pasos anteriores", done: stepDone(3, result) },
    ];
    return `
      <div class="screen-header">
        <div>
          <div class="kicker">Guía GUIOS · Modelo T-O-E</div>
          <h1 class="h1">Evaluación de adopción de software</h1>
          <p>Registre la solución candidata y siga los seis pasos de la guía para obtener la clasificación FODA de cada factor y una recomendación objetiva de adopción.</p>
        </div>
        <div class="actions">
          <label class="btn btn-secondary">${icon("upload")} Importar<input type="file" accept="application/json" class="sr-only" data-action="import-file" /></label>
          <div class="menu-anchor">
            <button class="btn btn-icon btn-secondary" data-action="menu" aria-haspopup="menu" aria-expanded="${ui.menu}">${icon("more")}</button>
            ${ui.menu ? renderMenu() : ""}
          </div>
        </div>
      </div>

      <div class="hero">
        <section class="card">
          <div class="card-header"><h2 class="h3">Software a evaluar</h2><span class="badge badge-primary badge-plain">Opcional</span></div>
          <div class="card-body stack">
            <div class="grid-2">
              <div class="field"><label for="sw-nombre">Nombre del software</label><input id="sw-nombre" class="input" placeholder="Ej. Moodle, Odoo, LibreOffice" data-field="software.nombre" value="${esc(sw.nombre)}" /></div>
              <div class="field"><label for="sw-version">Versión</label><input id="sw-version" class="input" placeholder="Ej. 4.3" data-field="software.version" value="${esc(sw.version)}" /></div>
            </div>
            <div class="grid-2">
              <div class="field"><label for="sw-lic">Tipo de licencia</label>
                <select id="sw-lic" class="select" data-field="software.licencia">
                  <option value="">Seleccione…</option>
                  ${LICENCIAS.map((l) => `<option ${sw.licencia === l ? "selected" : ""}>${esc(l)}</option>`).join("")}
                </select></div>
              <div class="field"><label for="sw-prov">Proveedor / comunidad</label><input id="sw-prov" class="input" placeholder="Ej. Moodle HQ" data-field="software.proveedor" value="${esc(sw.proveedor)}" /></div>
            </div>
            <div class="grid-2">
              <div class="field"><label for="sw-org">Organización</label><input id="sw-org" class="input" placeholder="Ej. Universidad Estatal de Milagro" data-field="software.organizacion" value="${esc(sw.organizacion)}" /></div>
              <div class="field"><label for="sw-eval">Evaluador</label><input id="sw-eval" class="input" placeholder="Nombre del decisor o evaluador" data-field="software.evaluador" value="${esc(sw.evaluador)}" /></div>
            </div>
          </div>
          <div class="card-footer"><button class="btn btn-primary" data-nav="1">Comenzar evaluación ${icon("chevronRight")}</button></div>
        </section>

        <div class="stack">
          <section class="card steps-overview">
            <div class="card-header"><h2 class="h3">Progreso</h2><span class="badge ${result.pendientes.length || !result.relevantes ? "" : "badge-success"}">${rec && !result.pendientes.length ? "Completa" : "En proceso"}</span></div>
            <div class="list">
              ${steps
                .map(
                  (s) => `<button class="list-item" data-nav="${s.i}">
                    <span class="leading ${s.done ? "" : "is-muted"}">${s.done ? icon("check", 14) : s.i}</span>
                    <span class="title">${esc(s.t)}<small>${esc(s.s)}</small></span>
                    <span class="chevron">${icon("chevronRight")}</span>
                  </button>`
                )
                .join("")}
            </div>
          </section>

          <section class="card card-soft dim-summary">
            <div class="list-title">Modelo de evaluación</div>
            <div class="list">
              ${DATA.dimensiones
                .map((d) => {
                  const fs = DATA.factores.filter((f) => f.dimension === d.id);
                  const subs = fs.reduce((s, f) => s + f.subfactores.length, 0);
                  return `<div class="list-item"><span class="leading">${d.nombre.charAt(0)}</span><span class="title">${esc(d.nombre)}</span><span class="detail">${fs.length} ${fs.length === 1 ? "factor" : "factores"} · ${subs} subfactores</span></div>`;
                })
                .join("")}
              <div class="list-item"><span class="leading is-muted">Σ</span><span class="title">Total</span><span class="detail">${DATA.factores.length} factores · ${totalSub} subfactores</span></div>
            </div>
          </section>
        </div>
      </div>

      <section class="grid-3" style="margin-top:var(--sp-4)">
        ${[
          ["layers", "1. Factores relevantes", "Compare la importancia sugerida por la guía con la de su organización y defina el alcance interno/externo."],
          ["sliders", "2. Valoración de subfactores", "Indique en qué medida la solución cumple cada requisito. La media define la ponderación del factor."],
          ["grid", "3. FODA y recomendación", "Cada factor se clasifica como Fortaleza, Oportunidad, Debilidad o Amenaza y se aplica la matriz de decisión."],
        ]
          .map(
            ([ic, t, d]) => `<div class="card card-horizontal card-body"><span class="thumb">${icon(ic)}</span><div><div class="h4">${t}</div><p class="small muted">${d}</p></div></div>`
          )
          .join("")}
      </section>`;
  }

  function renderMenu() {
    return `<div class="menu" role="menu">
      <button role="menuitem" data-action="export-json">${icon("download", 16)} Exportar evaluación (JSON)</button>
      <button role="menuitem" data-action="print">${icon("printer", 16)} Exportar informe (PDF)</button>
      <button role="menuitem" data-action="demo">${icon("star", 16)} Cargar evaluación de ejemplo</button>
      <hr />
      <button role="menuitem" class="is-danger" data-action="reset">${icon("trash", 16)} Reiniciar evaluación</button>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Pantalla 1 · Paso 1 y 2                                             */
  /* ------------------------------------------------------------------ */
  function renderPaso12(result) {
    const byDim = DATA.dimensiones.map((d) => ({ d, rows: result.factores.filter((f) => f.dimension === d.id) }));
    let n = 0;
    return `
      <div class="screen-header">
        <div>
          <div class="kicker">Paso 1 y 2</div>
          <h1 class="h1">Obtención de factores relevantes</h1>
          <p>Evalúe la importancia que tiene cada factor para su organización. La importancia relativa combina la sugerida por la guía con la del decisor; los factores <em>Irrelevantes</em> quedan fuera del análisis. Clasifique el alcance de los factores que pueden ser internos o externos.</p>
        </div>
        <div class="actions"><span class="badge badge-primary">${result.relevantes} relevantes</span></div>
      </div>
      <div class="stack">
      ${byDim
        .map(
          ({ d, rows }) => `
        <section class="card">
          <div class="card-header"><h2 class="h3">Dimensión ${esc(d.nombre)}</h2><span class="badge badge-plain">${rows.filter((r) => r.relevante).length}/${rows.length} relevantes</span></div>
          <div class="card-body">
            <div class="factor-table">
              <div class="th thead">Factor</div><div class="th thead">Imp. sugerida</div><div class="th thead">Imp. decisor</div><div class="th thead">Imp. relativa</div><div class="th thead">Alcance</div>
              ${rows
                .map((f, i) => {
                  n++;
                  const def = factorById(f.id);
                  return `${i ? '<div class="row-sep"></div>' : ""}
                  <div class="cell cell-name ${f.relevante ? "" : "is-irrelevant"}"><span class="idx">${n}</span><span>${esc(f.nombre)}</span></div>
                  <div class="cell"><span class="cell-label">Imp. sugerida</span>${levelBadge(f.importanciaSugerida - 1, true)}</div>
                  <div class="cell"><span class="cell-label">Imp. decisor</span>
                    <select class="select select-sm is-level-${f.importanciaDecisor}" data-decisor="${f.id}" aria-label="Importancia del decisor para ${esc(f.nombre)}">
                      ${DATA.nivelesImportancia.map((l, k) => `<option value="${k + 1}" ${f.importanciaDecisor === k + 1 ? "selected" : ""}>${esc(l)}</option>`).join("")}
                    </select></div>
                  <div class="cell"><span class="cell-label">Imp. relativa</span>${levelBadge(f.importanciaRelativaIdx, f.relevante)}</div>
                  <div class="cell"><span class="cell-label">Alcance</span>${
                    def.alcance === "Ambos"
                      ? `<div class="segmented" role="group" aria-label="Alcance de ${esc(f.nombre)}">
                          <button type="button" data-scope="${f.id}" data-value="Interno" aria-pressed="${f.alcance === "Interno"}">Interno</button>
                          <button type="button" data-scope="${f.id}" data-value="Externo" aria-pressed="${f.alcance === "Externo"}">Externo</button>
                        </div>`
                      : `<span class="badge badge-plain">${esc(f.alcance)}</span>`
                  }</div>`;
                })
                .join("")}
            </div>
          </div>
        </section>`
        )
        .join("")}
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Pantalla 2 · Paso 3 y 4                                             */
  /* ------------------------------------------------------------------ */
  function renderPaso34(result) {
    const relevant = result.factores.filter((f) => f.relevante);
    const header = `
      <div class="screen-header">
        <div>
          <div class="kicker">Paso 3 y 4</div>
          <h1 class="h1">Obtención de factores ponderados</h1>
          <p>Para cada factor relevante indique en qué medida la solución cumple cada subfactor. La ponderación del factor es la media de sus subfactores (1 a 4); a partir de ${DATA.umbralFoda} se considera favorable.</p>
        </div>
        <div class="actions"><span class="badge ${result.pendientes.length ? "badge-warning" : "badge-success"}">${result.pendientes.length ? `${result.pendientes.length} pendientes` : "Todos valorados"}</span></div>
      </div>`;
    if (!relevant.length) {
      return header + `<div class="alert alert-warning">${icon("alert")}<div>No hay factores relevantes. Regrese al <a href="#paso-1-2" data-nav="1">Paso 1 y 2</a> y asigne una importancia distinta de <em>Irrelevante</em>.</div></div>`;
    }
    const cur = relevant.find((f) => f.id === ui.factor) || relevant[0];
    const def = factorById(cur.id);
    const pos = relevant.indexOf(cur);
    const side = `
      <aside class="side card">
        <div class="list-title">Factores relevantes · ${relevant.length}</div>
        <div class="list">
          ${relevant
            .map(
              (f, i) => `<button class="list-item" data-factor="${f.id}" ${f.id === cur.id ? 'aria-current="true"' : ""}>
                <span class="leading ${f.completo ? "" : "is-muted"}">${f.completo ? icon("check", 14) : i + 1}</span>
                <span class="title">${esc(f.nombre)}</span>
                <span class="count ${f.completo ? "count-success" : f.subfactoresRespondidos ? "count-primary" : "count-muted"}">${f.subfactoresRespondidos}/${f.subfactoresTotal}</span>
              </button>`
            )
            .join("")}
        </div>
      </aside>`;
    const mobileSelect = `<div class="mobile-factor-select field"><label for="mf">Factor</label>
      <select id="mf" class="select" data-factor-select>
        ${relevant.map((f) => `<option value="${f.id}" ${f.id === cur.id ? "selected" : ""}>${esc(f.nombre)} (${f.subfactoresRespondidos}/${f.subfactoresTotal})</option>`).join("")}
      </select></div>`;
    const panel = `
      <section class="card">
        <div class="card-header factor-panel-header">
          <h2 class="h3">${esc(cur.nombre)}</h2>
          <span class="badge badge-plain">${esc(dimName(cur.dimension))}</span>
          ${levelBadge(cur.importanciaRelativaIdx, true)}
          <span class="badge badge-plain">${esc(cur.alcance)}</span>
          ${cur.foda ? `${fodaBadge(cur.foda)}<span class="badge badge-plain">Ponderación ${fmt(cur.ponderacion)}</span>` : ""}
        </div>
        <div class="card-body">
          ${def.subfactores
            .map(
              (s, i) => `<div class="subfactor-row">
                <div class="text"><span class="idx">${i + 1}.</span><span>${esc(s.nombre)}</span></div>
                <select class="select select-sm ${state.subfactores[s.id] ? "is-level-" + state.subfactores[s.id] : ""}" data-sub="${s.id}" aria-label="Valoración: ${esc(s.nombre)}">
                  <option value="">Sin valorar</option>
                  ${DATA.nivelesSubfactor.map((l, k) => `<option value="${k + 1}" ${state.subfactores[s.id] === k + 1 ? "selected" : ""}>${esc(l)}</option>`).join("")}
                </select>
              </div>`
            )
            .join("")}
        </div>
        <div class="card-footer">
          <button class="btn btn-ghost btn-sm" data-action="fill-factor" data-id="${cur.id}" title="Marca todos los subfactores pendientes como 'Cumple el requisito'">Marcar pendientes como cumple</button>
          <span class="spacer"></span>
          <button class="btn btn-secondary" data-factor="${pos > 0 ? relevant[pos - 1].id : ""}" ${pos === 0 ? "disabled" : ""}>${icon("chevronLeft")} Anterior factor</button>
          <button class="btn btn-primary" data-factor="${pos < relevant.length - 1 ? relevant[pos + 1].id : ""}" ${pos === relevant.length - 1 ? "disabled" : ""}>Siguiente factor ${icon("chevronRight")}</button>
        </div>
      </section>`;
    return header + mobileSelect + `<div class="split">${side}<div>${panel}</div></div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Pantalla 3 · Paso 5 y 6                                             */
  /* ------------------------------------------------------------------ */
  function renderPaso56(result) {
    const sw = state.software;
    const rec = result.recomendacion;
    const evaluated = result.factores.filter((f) => f.foda);
    const pending = result.pendientes.map((id) => factorById(id).nombre);
    const tiles = [
      ["Fortalezas", result.foda.Fortaleza, "var(--foda-fortaleza)", "Internos favorables"],
      ["Oportunidades", result.foda.Oportunidad, "var(--foda-oportunidad)", "Externos favorables"],
      ["Debilidades", result.foda.Debilidad, "var(--foda-debilidad)", "Internos desfavorables"],
      ["Amenazas", result.foda.Amenaza, "var(--foda-amenaza)", "Externos desfavorables"],
    ];
    const printHeader = `
      <div class="print-only" style="margin-bottom:24px">
        <h1 class="h1">GUIOS PRO · Informe de evaluación de adopción</h1>
        <p class="muted small">${esc(sw.nombre || "Software sin nombre")}${sw.version ? " " + esc(sw.version) : ""}${sw.licencia ? " · " + esc(sw.licencia) : ""}${sw.organizacion ? " · " + esc(sw.organizacion) : ""}${sw.evaluador ? " · Evaluador: " + esc(sw.evaluador) : ""} · ${new Date().toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>`;
    const recCard = !evaluated.length
      ? `<div class="alert alert-warning">${icon("alert")}<div>Aún no hay factores evaluados. Complete el <a href="#paso-3-4" data-nav="2">Paso 3 y 4</a> para obtener la clasificación FODA y la recomendación.</div></div>`
      : `<section class="card recommendation tone-${rec.tono}">
          <div class="card-body body">
            <span class="code">${rec.codigo}</span>
            <div>
              <div class="kicker" style="font-size:var(--text-xs);font-weight:700;color:var(--rec-color);text-transform:uppercase;letter-spacing:.08em">Recomendación ${rec.codigo}</div>
              <h2 class="h2">${esc(rec.titulo)}</h2>
              <p>${esc(rec.texto)}</p>
              ${
                rec.factoresCriticos.length
                  ? `<div class="critical"><span class="small muted" style="align-self:center">Factores a revisar:</span>${rec.factoresCriticos.map((f) => `<span class="badge badge-${f.foda}">${esc(f.nombre)} · ${esc(f.importanciaRelativa)}</span>`).join("")}</div>`
                  : ""
              }
              ${
                pending.length
                  ? `<div class="alert alert-warning" style="margin-top:var(--sp-3)">${icon("alert")}<div>Resultado parcial: faltan por valorar <strong>${pending.length}</strong> factor(es) relevante(s): ${esc(pending.join(", "))}.</div></div>`
                  : ""
              }
            </div>
          </div>
        </section>`;
    const quadrant = (name, color) => {
      const fs = evaluated.filter((f) => f.foda === name);
      return `<div class="foda-quadrant" style="--q-color:${color}"><div class="h4"><span>${name}s</span><span>${fs.length}</span></div>${
        fs.length ? `<ul>${fs.map((f) => `<li>${esc(f.nombre)} <span class="muted">(${fmt(f.ponderacion)})</span></li>`).join("")}</ul>` : `<div class="empty">Ninguno</div>`
      }</div>`;
    };
    return `
      <div class="screen-header">
        <div>
          <div class="kicker">Paso 5 y 6</div>
          <h1 class="h1">Evaluación y recomendación sobre la adopción</h1>
          <p>Clasificación FODA de cada factor según su ponderación y alcance, y recomendación derivada de la matriz de decisión GUIOS. Los factores sin valores no fueron considerados relevantes o no tienen sus subfactores valorados.</p>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" data-action="print">${icon("printer")} Exportar PDF</button>
          <button class="btn btn-secondary" data-action="export-json">${icon("download")} JSON</button>
          <button class="btn btn-danger btn-icon" data-action="reset" title="Reiniciar evaluación" aria-label="Reiniciar evaluación">${icon("trash")}</button>
        </div>
      </div>
      ${printHeader}
      <div class="stack">
        <div class="grid-4">
          ${tiles.map(([l, v, c, h]) => `<div class="stat-tile" style="--tile-color:${c}"><span class="label">${l}</span><span class="value">${v}</span><span class="hint">${h}</span></div>`).join("")}
        </div>
        ${recCard}
        <div class="grid-2">
          <section class="card">
            <div class="card-header"><h2 class="h3">Matriz FODA</h2><span class="badge badge-plain">${result.positivos} favorables · ${result.negativos} desfavorables</span></div>
            <div class="card-body foda-grid">
              ${quadrant("Fortaleza", "var(--foda-fortaleza)")}${quadrant("Oportunidad", "var(--foda-oportunidad)")}${quadrant("Debilidad", "var(--foda-debilidad)")}${quadrant("Amenaza", "var(--foda-amenaza)")}
            </div>
          </section>
          <section class="card">
            <div class="card-header"><h2 class="h3">Ponderación por dimensión</h2></div>
            <div class="card-body dim-bars">
              ${result.dimensiones
                .map(
                  (d) => `<div class="bar-row"><span>${esc(d.nombre)}<br /><span class="xs muted">${d.factoresEvaluados} factor(es)</span></span>
                    <div class="progress"><span style="width:${d.ponderacion ? (d.ponderacion / 4) * 100 : 0}%"></span></div>
                    <span class="num">${fmt(d.ponderacion)}</span></div>`
                )
                .join("")}
              <p class="xs muted" style="margin-top:var(--sp-3)">Escala 1–4. Umbral favorable: ${DATA.umbralFoda}.</p>
            </div>
          </section>
        </div>
        <section class="card">
          <div class="card-header"><h2 class="h3">Detalle por factor</h2><span class="badge badge-plain">${evaluated.length} de ${DATA.factores.length} evaluados</span></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>#</th><th>Factor</th><th>Dimensión</th><th>Imp. relativa</th><th class="num">Ponderación</th><th>Alcance</th><th>FODA</th></tr></thead>
              <tbody>
                ${result.factores
                  .map(
                    (f, i) => `<tr>
                      <td class="muted">${i + 1}</td>
                      <td>${esc(f.nombre)}</td>
                      <td class="muted">${esc(dimName(f.dimension))}</td>
                      <td>${levelBadge(f.importanciaRelativaIdx, f.relevante)}</td>
                      <td class="num">${fmt(f.ponderacion)}</td>
                      <td class="muted">${f.relevante ? esc(f.alcance) : "—"}</td>
                      <td>${f.relevante ? (f.foda ? fodaBadge(f.foda) : `<span class="badge badge-plain badge-warning">Pendiente ${f.subfactoresRespondidos}/${f.subfactoresTotal}</span>`) : `<span class="badge badge-plain muted">No relevante</span>`}</td>
                    </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </section>
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Overlays: pop-up, action sheet, toast                               */
  /* ------------------------------------------------------------------ */
  function closeOverlay() {
    $("#overlay").innerHTML = "";
  }

  function popup({ title, text, confirmLabel, danger, onConfirm }) {
    $("#overlay").innerHTML = `
      <div class="popup-backdrop" data-action="close-overlay">
        <div class="popup" role="dialog" aria-modal="true" aria-labelledby="popup-title">
          <h3 class="h3" id="popup-title">${esc(title)}</h3>
          <p>${esc(text)}</p>
          <div class="actions">
            <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-action="popup-confirm">${esc(confirmLabel)}</button>
            <button class="btn btn-secondary" data-action="close-overlay">Cancelar</button>
          </div>
        </div>
      </div>`;
    $("#overlay [data-action='popup-confirm']").addEventListener("click", () => {
      closeOverlay();
      onConfirm();
    });
    $("#overlay [data-action='popup-confirm']").focus();
  }

  function actionSheet() {
    $("#overlay").innerHTML = `
      <div class="sheet-backdrop" data-action="close-overlay">
        <div class="sheet" role="dialog" aria-modal="true">
          <div class="group">
            <header><div class="h4">Exportar evaluación</div><p>Elija el formato del entregable.</p></header>
            <button class="action" data-action="print">Informe en PDF (imprimir)</button>
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
    toast("Evaluación exportada en JSON");
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
    state = st;
    save();
    ui.factor = null;
  }

  function reset() {
    popup({
      title: "¿Reiniciar la evaluación?",
      text: "Se borrarán las importancias, valoraciones y datos del software registrados en este navegador. Esta acción no se puede deshacer.",
      confirmLabel: "Reiniciar",
      danger: true,
      onConfirm: () => {
        state = E.initialState(DATA);
        save();
        ui.screen = 0;
        ui.factor = null;
        render();
        toast("Evaluación reiniciada");
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
        render();
      }
      return;
    }
    if (t.hasAttribute("data-nav")) {
      ev.preventDefault();
      const n = Number(t.getAttribute("data-nav"));
      if (n >= 0 && n < SCREENS.length) {
        ui.screen = n;
        ui.menu = false;
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
    if (action === "menu") {
      ui.menu = !ui.menu;
      render();
    } else if (action === "close-overlay") {
      const isBackdrop = t.classList.contains("popup-backdrop") || t.classList.contains("sheet-backdrop");
      if (!isBackdrop || ev.target === t) closeOverlay();
    } else if (action === "export-sheet") {
      actionSheet();
    } else if (action === "export-json") {
      closeOverlay();
      ui.menu = false;
      exportJson();
      render();
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
      toast("Evaluación de ejemplo cargada (Moodle)");
    } else if (action === "reset") {
      ui.menu = false;
      render();
      reset();
    } else if (action === "fill-factor") {
      const def = factorById(t.getAttribute("data-id"));
      def.subfactores.forEach((s) => {
        if (!state.subfactores[s.id]) state.subfactores[s.id] = 4;
      });
      save();
      render();
    }
  });

  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.matches("[data-decisor]")) {
      state.decisor[t.getAttribute("data-decisor")] = Number(t.value);
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
      if (ui.menu) {
        ui.menu = false;
        render();
      }
    }
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
