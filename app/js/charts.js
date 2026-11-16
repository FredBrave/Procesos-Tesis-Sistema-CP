/**
 * GUIOS PRO — Gráficos en SVG (sin dependencias, sin DOM: devuelven cadenas).
 *
 * radar(): cumplimiento por dimensión en escala 1..4 (HU-22). Admite de 1 a 5 series
 * (comparador). Cada vértice lleva <title> para el tooltip nativo; la identidad de
 * cada serie nunca depende solo del color: la app muestra siempre leyenda y tabla.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GuiosCharts = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * @param {object} o {
   *   axes:   ["Tecnológica", …],
   *   series: [{ label, color, values: [número 1..4 | null, …] }],
   *   threshold: 3,             // anillo discontinuo del umbral FODA
   *   title:  "texto accesible"
   * }
   */
  function radar(o) {
    const W = 360;
    const H = 300;
    const cx = W / 2;
    const cy = H / 2 + 8;
    const R = 104;
    const n = o.axes.length;
    const MAX = 4;
    const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const pt = (i, v) => [cx + Math.cos(angle(i)) * (R * v) / MAX, cy + Math.sin(angle(i)) * (R * v) / MAX];
    const poly = (v) =>
      o.axes
        .map((_, i) => pt(i, v).map((x) => x.toFixed(1)).join(","))
        .join(" ");

    const rings = [1, 2, 3, 4]
      .map((v) => `<polygon points="${poly(v)}" class="chart-ring${v === o.threshold ? " is-threshold" : ""}"/>`)
      .join("");
    const ringLabels = [1, 2, 3, 4]
      .map((v) => {
        const [x, y] = pt(0, v);
        return `<text x="${(x - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="chart-tick">${v}</text>`;
      })
      .join("");
    const spokes = o.axes
      .map((_, i) => {
        const [x, y] = pt(i, MAX);
        return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="chart-spoke"/>`;
      })
      .join("");
    const labels = o.axes
      .map((a, i) => {
        const [x, y] = pt(i, MAX + 0.55);
        const anchor = Math.abs(x - cx) < 4 ? "middle" : x > cx ? "start" : "end";
        return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}" class="chart-axis">${esc(a)}</text>`;
      })
      .join("");

    const shapes = o.series
      .map((s) => {
        const vals = s.values.map((v) => (v == null ? 0 : Math.max(0, Math.min(MAX, v))));
        const pts = vals.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(",")).join(" ");
        const dots = vals
          .map((v, i) => {
            const [x, y] = pt(i, v);
            const shown = s.values[i] == null ? "sin datos" : `${s.values[i].toFixed(1)} de 4`;
            return `<g class="chart-hit"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" fill="transparent"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" class="chart-dot" style="--s:${s.color}"/><title>${esc(s.label)} · ${esc(o.axes[i])}: ${shown}</title></g>`;
          })
          .join("");
        return `<g class="chart-series" style="--s:${s.color}"><polygon points="${pts}" class="chart-area"/>${dots}</g>`;
      })
      .join("");

    return `<svg class="chart chart-radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || "Gráfico radar")}" xmlns="http://www.w3.org/2000/svg">
      ${rings}${spokes}${ringLabels}${labels}${shapes}
    </svg>`;
  }

  return { radar };
});
