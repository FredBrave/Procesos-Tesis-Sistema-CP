// Comprobación local de contraste WCAG 2.1 AA para los textos visibles de la página.
// Devuelve los elementos cuyo texto no alcanza 4.5:1 (3:1 si es texto grande).
(() => {
  function parse(c) {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function blend(top, bottom) {
    const a = top.a + bottom.a * (1 - top.a);
    if (a === 0) return { r: 255, g: 255, b: 255, a: 1 };
    return {
      r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
      g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
      b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
      a,
    };
  }
  function lum(c) {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  // Fondo efectivo: compone los fondos de los ancestros. Si hay imagen o degradado, se omite.
  function background(el) {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let acc = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) acc = blend(layers[i], acc);
    return acc;
  }
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.textContent.trim()) continue;
    const el = t.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (cs.visibility === "hidden" || cs.display === "none" || rect.width === 0 || rect.height === 0) continue;
    if (el.closest(".sr-only,[aria-hidden='true'],svg")) continue;
    if (parseFloat(cs.opacity) === 0) continue;
    if (el.closest("button:disabled,[aria-disabled='true'],.is-irrelevant,.is-muted")) continue; // texto deshabilitado: exento en WCAG
    const bg = background(el);
    if (!bg) continue;
    const fg = blend(parse(cs.color), bg);
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      out.push({
        texto: t.textContent.trim().slice(0, 40),
        clase: (el.className && el.className.baseVal === undefined ? el.className : "") || el.tagName,
        ratio: Math.round(ratio * 100) / 100,
        necesita: need,
        color: cs.color,
      });
    }
  }
  return out;
})();
