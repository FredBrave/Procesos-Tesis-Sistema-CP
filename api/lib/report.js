/**
 * Informe HTML autocontenido e imprimible de una evaluación (HU-35).
 * Todo dato variable pasa por esc(); el documento no contiene scripts y se
 * sirve con una CSP que los prohíbe (defensa en profundidad contra XSS).
 */
"use strict";

const { DATA, factorById, dimensionById } = require("./catalog");

const esc = (v) =>
  String(v == null ? "" : v).replace(/[&<>"'`]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" })[c]);
const num = (n) => (n == null ? "—" : n.toFixed(2).replace(".", ","));
const fecha = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
};
const safeHref = (u) => (/^https?:\/\//i.test(u || "") ? esc(u) : null);

const FODA_ORDER = ["Fortaleza", "Oportunidad", "Debilidad", "Amenaza"];
const FODA_CLASS = { Fortaleza: "ok", Oportunidad: "info", Debilidad: "warn", Amenaza: "bad" };

/** Barras horizontales SVG por dimensión (escala 1..4). */
function dimensionBars(dims) {
  const rowH = 34;
  const labelW = 130;
  const barW = 360;
  const h = dims.length * rowH + 28;
  const x = (v) => labelW + ((v - 1) / 3) * barW;
  let svg = `<svg class="bars" viewBox="0 0 ${labelW + barW + 60} ${h}" role="img" aria-labelledby="bars-t" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<title id="bars-t">Ponderación media por dimensión (escala de 1 a 4)</title>`;
  [1, 2, 3, 4].forEach((t) => {
    svg += `<line x1="${x(t)}" y1="4" x2="${x(t)}" y2="${h - 22}" class="grid"/><text x="${x(t)}" y="${h - 6}" class="tick" text-anchor="middle">${t}</text>`;
  });
  svg += `<line x1="${x(DATA.umbralFoda)}" y1="0" x2="${x(DATA.umbralFoda)}" y2="${h - 22}" class="umbral"/>`;
  dims.forEach((d, i) => {
    const y = 6 + i * rowH;
    svg += `<text x="${labelW - 8}" y="${y + 17}" text-anchor="end" class="lbl">${esc(d.nombre)}</text>`;
    if (d.ponderacion == null) {
      svg += `<text x="${labelW + 6}" y="${y + 17}" class="na">Sin factores evaluados</text>`;
    } else {
      const w = Math.max(2, x(d.ponderacion) - labelW);
      svg += `<rect x="${labelW}" y="${y + 4}" width="${w.toFixed(1)}" height="18" rx="3" class="${d.ponderacion >= DATA.umbralFoda ? "bar-ok" : "bar-bad"}"/>`;
      svg += `<text x="${(labelW + w + 6).toFixed(1)}" y="${y + 17}" class="val">${num(d.ponderacion)}</text>`;
    }
  });
  return svg + "</svg>";
}

function render(ev, { organizacion } = {}) {
  const r = ev.resultado;
  const sw = ev.software || {};
  const rec = r.recomendacion;
  const title = `Informe GUIOS — ${sw.nombre || "Software sin nombre"}`;
  const niveles = DATA.nivelesSubfactor;
  const evaluated = r.factores.filter((f) => f.foda);

  const fodaCells = FODA_ORDER.map((k) => {
    const fs = evaluated.filter((f) => f.foda === k);
    const items = fs.length ? fs.map((f) => `<li>${esc(f.nombre)} <span class="muted">(${num(f.ponderacion)})</span></li>`).join("") : `<li class="muted">Ninguno</li>`;
    return `<div class="cell ${FODA_CLASS[k]}"><h4>${esc(k === "Oportunidad" ? "Oportunidades" : k === "Debilidad" ? "Debilidades" : k + "s")} <span class="count">${r.foda[k]}</span></h4><ul>${items}</ul></div>`;
  }).join("");

  const factorRows = r.factores
    .map((f) => {
      const dim = dimensionById.get(f.dimension);
      return `<tr class="${f.relevante ? "" : "irrel"}"><td>${esc(f.id)}</td><td>${esc(f.nombre)}</td><td>${esc(dim ? dim.nombre : f.dimension)}</td><td>${esc(f.importanciaRelativa)}</td><td>${esc(f.alcance)}</td><td class="num">${f.subfactoresRespondidos}/${f.subfactoresTotal}</td><td class="num">${num(f.ponderacion)}</td><td>${f.foda ? `<span class="tag ${FODA_CLASS[f.foda]}">${esc(f.foda)}</span>` : f.relevante ? "Pendiente" : "No relevante"}</td></tr>`;
    })
    .join("");

  const detalle = r.factores
    .filter((f) => f.relevante)
    .map((f) => {
      const cat = factorById.get(f.id);
      const rows = cat.subfactores
        .map((s) => {
          const v = ev.subfactores[s.id];
          const o = (ev.observaciones || {})[s.id];
          const ia = (ev.origenIA || {})[s.id];
          let obs = "";
          if (o) {
            const href = safeHref(o.enlace);
            obs = `${esc(o.texto)}${href ? ` <a href="${href}" rel="noopener noreferrer">${esc(o.enlace)}</a>` : ""}`;
          }
          const iaMark = ia && ia.valor === v ? ` <span class="tag ia" title="Valor sugerido por IA y aceptado por el evaluador">IA</span>` : "";
          return `<tr><td>${esc(s.id)}</td><td>${esc(s.nombre)}</td><td>${v ? `${v} · ${esc(niveles[v - 1])}` : `<span class="muted">Sin responder</span>`}${iaMark}</td><td>${obs}</td></tr>`;
        })
        .join("");
      return `<section class="card factor"><h3>${esc(f.id)} · ${esc(f.nombre)} <span class="muted">— ponderación ${num(f.ponderacion)}${f.foda ? `, ${esc(f.foda)}` : ""}</span></h3>
<table><thead><tr><th>Id</th><th>Subfactor</th><th>Valoración</th><th>Observación / evidencia</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    })
    .join("");

  const resumen = ev.resumen && ev.resumen.texto
    ? `<section class="card"><h2>Resumen ejecutivo</h2>${ev.resumen.generadoIA ? `<p class="ia-note" role="note">Contenido generado con IA, revisado por el evaluador.</p>` : ""}${ev.resumen.texto
        .split(/\n{2,}/)
        .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
        .join("")}</section>`
    : "";

  const criticos = rec && rec.factoresCriticos.length
    ? `<p><strong>Factores críticos:</strong></p><ul>${rec.factoresCriticos.map((f) => `<li>${esc(f.nombre)} — ${esc(f.foda)}, importancia ${esc(f.importanciaRelativa.toLowerCase())}</li>`).join("")}</ul>`
    : "";
  const recCard = rec
    ? `<section class="card rec ${esc(rec.tono)}"><h2>Recomendación ${esc(rec.codigo)} · ${esc(rec.titulo)}</h2><p>${esc(rec.texto)}</p>${criticos}${r.pendientes.length ? `<p class="warn-note">Resultado parcial: ${r.pendientes.length} factor(es) relevante(s) sin completar (${esc(r.pendientes.join(", "))}).</p>` : ""}</section>`
    : `<section class="card rec"><h2>Sin recomendación</h2><p>Todavía no hay factores evaluados por completo.</p></section>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--ink:#1d2433;--muted:#5b6475;--line:#d9dee7;--bg:#ffffff;--soft:#f4f6fa;--ok:#1f7a4d;--ok-bg:#e5f4ec;--info:#1f5fa8;--info-bg:#e6eef9;--warn:#8a5a00;--warn-bg:#fbf0da;--bad:#a8322d;--bad-bg:#f9e5e4;--accent:#3b4fd8}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:900px;margin:0 auto;padding:24px 16px}
h1{font-size:28px;margin:0 0 4px}h2{font-size:18px;margin:0 0 8px}h3{font-size:15px;margin:0 0 8px}h4{margin:0 0 6px;font-size:14px}
.cover{border-bottom:3px solid var(--accent);padding:32px 0 20px;margin-bottom:20px}
.cover .kicker{text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-size:12px;margin:0}
dl.meta{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:12px 0 0}dl.meta dt{color:var(--muted)}dl.meta dd{margin:0}
.card{border:1px solid var(--line);border-radius:8px;padding:16px;margin:0 0 16px;break-inside:avoid;page-break-inside:avoid}
.rec.danger{border-left:6px solid var(--bad);background:var(--bad-bg)}.rec.warning{border-left:6px solid var(--warn);background:var(--warn-bg)}.rec.success{border-left:6px solid var(--ok);background:var(--ok-bg)}
.foda{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cell{border-radius:6px;padding:10px}.cell ul{margin:0;padding-left:18px}.cell .count{float:right;font-weight:700}
.ok{background:var(--ok-bg);color:var(--ok)}.info{background:var(--info-bg);color:var(--info)}.warn{background:var(--warn-bg);color:var(--warn)}.bad{background:var(--bad-bg);color:var(--bad)}
.cell li{color:var(--ink)}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}th{background:var(--soft)}
td.num{text-align:right;font-variant-numeric:tabular-nums}tr.irrel td{color:var(--muted)}
.tag{display:inline-block;border-radius:4px;padding:0 6px;font-size:12px;font-weight:600}.tag.ia{background:var(--info-bg);color:var(--info)}
.muted{color:var(--muted)}.ia-note{font-size:12px;color:var(--info);background:var(--info-bg);padding:6px 10px;border-radius:4px}
.warn-note{color:var(--warn)}
svg.bars{width:100%;height:auto;max-width:560px}svg .grid{stroke:var(--line)}svg .umbral{stroke:var(--accent);stroke-dasharray:4 3}
svg .tick,svg .na{fill:var(--muted);font-size:11px}svg .lbl{fill:var(--ink);font-size:12px}svg .val{fill:var(--ink);font-size:12px;font-weight:600}
svg .bar-ok{fill:var(--ok)}svg .bar-bad{fill:var(--bad)}
a{color:var(--accent);word-break:break-all}
footer{color:var(--muted);font-size:12px;margin-top:24px}
@media (max-width:600px){.foda{grid-template-columns:1fr}table{font-size:12px}}
@media print{main{max-width:none;padding:0}.cover{page-break-after:always;border:0;padding-top:30vh}.factor{page-break-inside:auto}a{color:inherit}}
</style>
</head>
<body>
<main>
<header class="cover">
<p class="kicker">GUIOS PRO · Informe de evaluación para la adopción de software</p>
<h1>${esc(sw.nombre || "Software sin nombre")}${sw.version ? ` <span class="muted">${esc(sw.version)}</span>` : ""}</h1>
<dl class="meta">
<dt>Fecha</dt><dd>${esc(fecha(ev.completadoEn || ev.actualizadoEn))}</dd>
<dt>Evaluador indicado</dt><dd>${esc(sw.evaluador || "No indicado")}</dd>
<dt>Organización</dt><dd>${esc(sw.organizacion || organizacion || "—")}</dd>
<dt>Estado</dt><dd>${esc(ev.estado)}</dd>
<dt>Versión del catálogo</dt><dd>${esc(ev.catalogoVersion)} · revisión ${esc(ev.revision)}</dd>
</dl>
</header>

<section class="card"><h2>Datos del software</h2>
<dl class="meta">
<dt>Nombre</dt><dd>${esc(sw.nombre || "—")}</dd>
<dt>Versión</dt><dd>${esc(sw.version || "—")}</dd>
<dt>Licencia</dt><dd>${esc(sw.licencia || "—")}</dd>
<dt>Proveedor</dt><dd>${esc(sw.proveedor || "—")}</dd>
${ev.plantilla && ev.plantilla.nombre ? `<dt>Plantilla de importancia</dt><dd>${esc(ev.plantilla.nombre)}</dd>` : ""}
</dl></section>

${recCard}
${resumen}

<section class="card"><h2>Matriz FODA</h2><div class="foda">${fodaCells}</div></section>

<section class="card"><h2>Cumplimiento por dimensión</h2>${dimensionBars(r.dimensiones)}
<table aria-label="Cumplimiento por dimensión"><thead><tr><th>Dimensión</th><th>Factores evaluados</th><th>Ponderación</th></tr></thead><tbody>${r.dimensiones
    .map((d) => `<tr><td>${esc(d.nombre)}</td><td class="num">${d.factoresEvaluados}</td><td class="num">${num(d.ponderacion)}</td></tr>`)
    .join("")}</tbody></table>
<p class="muted">Línea discontinua: umbral FODA (${esc(DATA.umbralFoda)}).</p></section>

<section class="card"><h2>Detalle por factor</h2>
<table><thead><tr><th>Id</th><th>Factor</th><th>Dimensión</th><th>Importancia relativa</th><th>Alcance</th><th>Respondidos</th><th>Ponderación</th><th>FODA</th></tr></thead><tbody>${factorRows}</tbody></table></section>

<h2>Valoraciones y observaciones</h2>
${detalle || `<p class="muted">No hay factores relevantes.</p>`}

<footer>Generado por GUIOS PRO el ${esc(fecha(new Date().toISOString()))}. La recomendación procede del cálculo de la guía GUIOS, no de un modelo de IA.</footer>
</main>
</body>
</html>`;
}

module.exports = { render, esc };
