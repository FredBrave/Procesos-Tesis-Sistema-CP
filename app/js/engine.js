/**
 * GUIOS PRO — Motor de cálculo (lógica pura, sin DOM).
 *
 * Replica el algoritmo del prototipo GUIOSAD v0.1.2 (legacy/main.py):
 *   Paso 1-2  Importancia relativa = niveles[ floor((IS + ID) / 2) ]  (índices 0..3)
 *             Un factor es relevante si su importancia relativa NO es "Irrelevante".
 *   Paso 3-4  Ponderación global del factor = media aritmética de sus subfactores (1..4).
 *   Paso 5    FODA: Interno -> Fortaleza (>= umbral) | Debilidad
 *                   Externo -> Oportunidad (>= umbral) | Amenaza
 *   Paso 6    Recomendación según matriz (data/recomendaciones.json): A, B o C.
 *
 * Funciona en navegador (window.GuiosEngine) y en Node (module.exports) para tests.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GuiosEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function clamp(v, min, max) {
    v = Number(v);
    if (Number.isNaN(v)) return min;
    return Math.min(max, Math.max(min, v));
  }

  /** Importancia relativa (índice 0..3) a partir de sugerida y del decisor (1..4). */
  function relativeIndex(suggested, decisor) {
    const a = clamp(suggested, 1, 4) - 1;
    const b = clamp(decisor, 1, 4) - 1;
    return Math.floor((a + b) / 2);
  }

  /** Media de las valoraciones de subfactores (1..4). null si no hay valoraciones. */
  function globalWeight(values) {
    const nums = (values || []).map(Number).filter((n) => n >= 1 && n <= 4);
    if (!nums.length) return null;
    return nums.reduce((s, n) => s + n, 0) / nums.length;
  }

  function foda(scope, weight, threshold) {
    if (weight == null) return null;
    const ok = weight >= threshold;
    if (scope === "Interno") return ok ? "Fortaleza" : "Debilidad";
    return ok ? "Oportunidad" : "Amenaza";
  }

  /**
   * Evalúa el estado completo.
   * @param {object} data   window.GUIOS_DATA
   * @param {object} state  {
   *   decisor:     { [factorId]: 1..4 },
   *   alcance:     { [factorId]: "Interno"|"Externo" }  (solo factores con alcance "Ambos")
   *   subfactores: { [subfactorId]: 1..4 }
   * }
   */
  function evaluate(data, state) {
    const levels = data.nivelesImportancia;
    const threshold = data.umbralFoda;
    const decisorMap = state.decisor || {};
    const scopeMap = state.alcance || {};
    const subMap = state.subfactores || {};

    const factors = data.factores.map((f) => {
      const decisor = clamp(decisorMap[f.id] != null ? decisorMap[f.id] : 1, 1, 4);
      const relIdx = relativeIndex(f.importanciaSugerida, decisor);
      const relevant = relIdx > 0;
      const scope = f.alcance === "Ambos" ? scopeMap[f.id] || "Interno" : f.alcance;
      const values = f.subfactores.map((s) => subMap[s.id]);
      const answered = values.filter((v) => v != null).length;
      const complete = answered === f.subfactores.length;
      const weight = relevant && complete ? globalWeight(values) : null;
      return {
        id: f.id,
        nombre: f.nombre,
        dimension: f.dimension,
        importanciaSugerida: f.importanciaSugerida,
        importanciaDecisor: decisor,
        importanciaRelativa: levels[relIdx],
        importanciaRelativaIdx: relIdx,
        relevante: relevant,
        alcance: scope,
        subfactoresTotal: f.subfactores.length,
        subfactoresRespondidos: answered,
        completo: complete,
        ponderacion: weight,
        foda: foda(scope, weight, threshold),
      };
    });

    const evaluated = factors.filter((f) => f.foda);
    const counts = { Fortaleza: 0, Oportunidad: 0, Debilidad: 0, Amenaza: 0 };
    evaluated.forEach((f) => counts[f.foda]++);

    const relevantes = factors.filter((f) => f.relevante);
    const pending = relevantes.filter((f) => !f.completo);

    const dimensiones = data.dimensiones.map((d) => {
      const fs = evaluated.filter((f) => f.dimension === d.id);
      const avg = fs.length ? fs.reduce((s, f) => s + f.ponderacion, 0) / fs.length : null;
      return { id: d.id, nombre: d.nombre, factoresEvaluados: fs.length, ponderacion: avg };
    });

    return {
      factores: factors,
      relevantes: relevantes.length,
      pendientes: pending.map((f) => f.id),
      foda: counts,
      positivos: counts.Fortaleza + counts.Oportunidad,
      negativos: counts.Debilidad + counts.Amenaza,
      dimensiones,
      recomendacion: evaluated.length ? recommend(data.reglas, evaluated) : null,
    };
  }

  /** Aplica la matriz de recomendación: primera regla que se cumple. */
  function recommend(rules, evaluatedFactors) {
    for (const rule of rules) {
      if (!rule.condicion) return withEvidence(rule, []);
      const hits = evaluatedFactors.filter(
        (f) =>
          rule.condicion.foda.includes(f.foda) &&
          rule.condicion.importancia_relativa.includes(f.importanciaRelativa)
      );
      if (hits.length) return withEvidence(rule, hits);
    }
    return null;
  }

  function withEvidence(rule, hits) {
    return {
      codigo: rule.codigo,
      titulo: rule.titulo,
      tono: rule.tono,
      texto: rule.texto,
      factoresCriticos: hits.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        foda: f.foda,
        importanciaRelativa: f.importanciaRelativa,
      })),
    };
  }

  /** Estado inicial: importancia del decisor = sugerida, subfactores sin responder. */
  function initialState(data) {
    const decisor = {};
    const alcance = {};
    data.factores.forEach((f) => {
      decisor[f.id] = f.importanciaSugerida;
      if (f.alcance === "Ambos") alcance[f.id] = "Interno";
    });
    return {
      decisor,
      alcance,
      subfactores: {},
      software: { nombre: "", version: "", licencia: "", proveedor: "", organizacion: "", evaluador: "" },
    };
  }

  return { evaluate, relativeIndex, globalWeight, foda, recommend, initialState, clamp };
});
