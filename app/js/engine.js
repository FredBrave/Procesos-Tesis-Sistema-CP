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

  /**
   * Avance y estado de una evaluación (sidebar, historial y panel).
   * Completada = hay recomendación y ningún factor relevante queda pendiente.
   */
  function progress(result) {
    const relevant = result.factores.filter((f) => f.relevante);
    const total = relevant.reduce((n, f) => n + f.subfactoresTotal, 0);
    const answered = relevant.reduce((n, f) => n + f.subfactoresRespondidos, 0);
    const pct = total ? Math.round((answered / total) * 100) : 0;
    const complete = !!result.recomendacion && result.relevantes > 0 && result.pendientes.length === 0;
    return { total, answered, pct, complete };
  }

  /** Aplica una plantilla de importancia: solo factores conocidos y valores válidos. */
  function applyTemplate(data, state, template) {
    const decisor = Object.assign({}, state.decisor);
    const alcance = Object.assign({}, state.alcance);
    data.factores.forEach((f) => {
      const v = template.decisor ? Number(template.decisor[f.id]) : NaN;
      if (Number.isInteger(v) && v >= 1 && v <= 4) decisor[f.id] = v;
      const a = template.alcance && template.alcance[f.id];
      if (f.alcance === "Ambos" && (a === "Interno" || a === "Externo")) alcance[f.id] = a;
    });
    return Object.assign({}, state, { decisor, alcance });
  }

  /**
   * Indicadores agregados del panel (HU-26, HU-40).
   * @param {Array} entries [{ id, fecha, software, estado, result }]
   *   `estado` ∈ "En proceso" | "Completada" | "Cancelada"; `result` = evaluate(...)
   * Solo las evaluaciones completadas cuentan para recomendaciones, FODA y dimensiones.
   */
  function summarize(entries) {
    const porEstado = { "En proceso": 0, Completada: 0, Cancelada: 0 };
    const recomendaciones = { A: 0, B: 0, C: 0 };
    const foda = { Fortaleza: 0, Oportunidad: 0, Debilidad: 0, Amenaza: 0 };
    const dims = {};
    const done = [];
    entries.forEach((e) => {
      if (porEstado[e.estado] != null) porEstado[e.estado]++;
      if (e.estado !== "Completada" || !e.result || !e.result.recomendacion) return;
      done.push(e);
      recomendaciones[e.result.recomendacion.codigo] = (recomendaciones[e.result.recomendacion.codigo] || 0) + 1;
      Object.keys(foda).forEach((k) => (foda[k] += e.result.foda[k] || 0));
      e.result.dimensiones.forEach((d) => {
        if (d.ponderacion == null) return;
        const acc = dims[d.id] || (dims[d.id] = { id: d.id, nombre: d.nombre, suma: 0, n: 0 });
        acc.suma += d.ponderacion;
        acc.n++;
      });
    });
    const byDate = (a, b) => String(a.fecha).localeCompare(String(b.fecha));
    return {
      total: entries.length,
      completadas: done.length,
      porEstado,
      recomendaciones,
      foda,
      dimensiones: Object.keys(dims)
        .sort()
        .map((k) => ({ id: dims[k].id, nombre: dims[k].nombre, ponderacion: dims[k].suma / dims[k].n, evaluaciones: dims[k].n })),
      lineaTiempo: done
        .slice()
        .sort(byDate)
        .map((e) => ({ id: e.id, fecha: e.fecha, software: e.software, recomendacion: e.result.recomendacion.codigo, tono: e.result.recomendacion.tono })),
      ultimas: entries.slice().sort(byDate).reverse().slice(0, 5).map((e) => e.id),
    };
  }

  /**
   * Comparación de 2 a 5 evaluaciones (HU-11, HU-31).
   * @param {Array} entries [{ id, software, result }]
   * Las filas se unen por id de factor/dimensión; `mejor` marca el índice con mayor ponderación.
   */
  function compare(entries) {
    if (!Array.isArray(entries) || entries.length < 2 || entries.length > 5) {
      throw new RangeError("Se comparan entre 2 y 5 evaluaciones");
    }
    function best(values) {
      let idx = -1;
      let max = -Infinity;
      values.forEach((v, i) => {
        if (v && v.ponderacion != null && v.ponderacion > max) {
          max = v.ponderacion;
          idx = i;
        }
      });
      const ties = values.filter((v) => v && v.ponderacion === max).length;
      return ties > 1 ? -1 : idx;
    }
    function rows(key) {
      const order = [];
      const names = {};
      entries.forEach((e) =>
        e.result[key].forEach((x) => {
          if (!(x.id in names)) order.push(x.id);
          names[x.id] = x.nombre;
        })
      );
      return order.map((id) => {
        const values = entries.map((e) => {
          const x = e.result[key].find((y) => y.id === id);
          if (!x) return null;
          return key === "factores"
            ? { ponderacion: x.ponderacion, foda: x.foda, importanciaRelativa: x.importanciaRelativa, relevante: x.relevante }
            : { ponderacion: x.ponderacion };
        });
        return { id, nombre: names[id], valores: values, mejor: best(values) };
      });
    }
    return {
      evaluaciones: entries.map((e) => ({
        id: e.id,
        software: e.software,
        recomendacion: e.result.recomendacion ? e.result.recomendacion.codigo : null,
        foda: e.result.foda,
        positivos: e.result.positivos,
        negativos: e.result.negativos,
      })),
      dimensiones: rows("dimensiones"),
      factores: rows("factores"),
    };
  }

  /**
   * Valida un catálogo editado desde la administración (HU-10).
   * Devuelve una lista de errores en español; vacía si es válido.
   */
  function validateCatalog(data) {
    const errors = [];
    const ALCANCES = ["Interno", "Externo", "Ambos"];
    if (!data || !Array.isArray(data.factores) || !Array.isArray(data.dimensiones)) return ["El catálogo no tiene dimensiones ni factores"];
    if (!Array.isArray(data.nivelesImportancia) || data.nivelesImportancia.length !== 4) errors.push("La escala de importancia debe tener 4 niveles");
    if (!Array.isArray(data.nivelesSubfactor) || data.nivelesSubfactor.length !== 4) errors.push("La escala de cumplimiento debe tener 4 niveles");
    const dimIds = new Set(data.dimensiones.map((d) => d.id));
    const factorIds = new Set();
    const subIds = new Set();
    data.factores.forEach((f, i) => {
      const label = f.nombre ? `«${f.nombre}»` : `n.º ${i + 1}`;
      if (factorIds.has(f.id)) errors.push(`El factor ${label} tiene un identificador repetido`);
      factorIds.add(f.id);
      const nombre = String(f.nombre || "").trim();
      if (!nombre) errors.push(`El factor n.º ${i + 1} no tiene nombre`);
      else if (nombre.length > 120) errors.push(`El nombre del factor ${label} supera los 120 caracteres`);
      if (!dimIds.has(f.dimension)) errors.push(`El factor ${label} no pertenece a una dimensión válida`);
      if (!Number.isInteger(f.importanciaSugerida) || f.importanciaSugerida < 1 || f.importanciaSugerida > 4) {
        errors.push(`La importancia sugerida de ${label} debe ser un nivel de 1 a 4`);
      }
      if (!ALCANCES.includes(f.alcance)) errors.push(`El alcance de ${label} debe ser Interno, Externo o Ambos`);
      if (!Array.isArray(f.subfactores) || !f.subfactores.length) {
        errors.push(`El factor ${label} necesita al menos un subfactor`);
        return;
      }
      f.subfactores.forEach((s, j) => {
        if (subIds.has(s.id)) errors.push(`El subfactor ${s.id} está repetido`);
        subIds.add(s.id);
        const texto = String(s.nombre || "").trim();
        if (!texto) errors.push(`El subfactor ${j + 1} de ${label} está vacío`);
        else if (texto.length > 300) errors.push(`El subfactor ${j + 1} de ${label} supera los 300 caracteres`);
      });
    });
    (data.reglas || []).forEach((r) => {
      if (!String(r.titulo || "").trim() || !String(r.texto || "").trim()) errors.push(`La recomendación ${r.codigo} necesita título y texto`);
    });
    if (!(data.reglas || []).length) errors.push("El catálogo necesita las reglas de recomendación");
    return errors;
  }

  return {
    evaluate,
    relativeIndex,
    globalWeight,
    foda,
    recommend,
    initialState,
    clamp,
    progress,
    applyTemplate,
    summarize,
    compare,
    validateCatalog,
  };
});
