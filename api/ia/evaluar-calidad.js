#!/usr/bin/env node
/**
 * RNF-15 — Medición de la calidad de las sugerencias de la IA.
 *
 * Lee los casos de api/ia/casos/*.json con el formato
 *   { "software": { nombre, version, licencia, proveedor, url, notas }, "factorId": "F01",
 *     "contexto": "opcional", "esperado": { "F01-S01": 4, ... } }
 * llama al proveedor configurado (IA_PROVEEDOR, ANTHROPIC_API_KEY, IA_MODELO) y
 * reporta el % de acierto exacto y ±1 frente al umbral IA_UMBRAL (0.7 por defecto).
 * IA_METRICA = "exacto" (por defecto) | "cercano" decide qué porcentaje se compara.
 *
 * Uso:  node api/ia/evaluar-calidad.js [carpeta-de-casos]
 * Sale con código 1 si no alcanza el umbral (sirve en CI).
 * Nota: con el proveedor «anthropic» cada caso consume una llamada facturable.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { factorById } = require("../lib/catalog");
const { createProvider, withRetry, checkSugerencias } = require("../lib/ia");

const MIN_CASOS = 30;

function loadCases(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const c = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      const factor = factorById.get(c.factorId);
      if (!factor) throw new Error(`${f}: factorId desconocido (${c.factorId})`);
      const ids = new Set(factor.subfactores.map((s) => s.id));
      Object.entries(c.esperado || {}).forEach(([k, v]) => {
        if (!ids.has(k)) throw new Error(`${f}: ${k} no pertenece a ${c.factorId}`);
        if (!Number.isInteger(v) || v < 1 || v > 4) throw new Error(`${f}: valor esperado de ${k} fuera de 1..4`);
      });
      if (!c.software || !c.software.nombre) throw new Error(`${f}: falta software.nombre`);
      return Object.assign({ archivo: f, factor }, c);
    });
}

async function run({ dir = path.join(__dirname, "casos"), provider, umbral = 0.7, metrica = "exacto", out = console.log } = {}) {
  if (!provider) throw new Error("No hay proveedor de IA configurado (IA_PROVEEDOR / ANTHROPIC_API_KEY)");
  const cases = loadCases(dir);
  let total = 0;
  let exact = 0;
  let near = 0;
  const filas = [];
  for (const c of cases) {
    const { valor } = await withRetry(
      (fb) => provider.sugerir({ factor: c.factor, software: c.software, contexto: c.contexto || "" }, fb),
      (data) => checkSugerencias(data, c.factor)
    );
    let e = 0;
    let n = 0;
    let t = 0;
    valor.forEach((s) => {
      const exp = c.esperado[s.subfactorId];
      if (exp == null) return;
      t++;
      if (s.valor === exp) e++;
      if (Math.abs(s.valor - exp) <= 1) n++;
    });
    total += t;
    exact += e;
    near += n;
    filas.push({ archivo: c.archivo, factor: c.factorId, subfactores: t, exacto: t ? e / t : null, cercano: t ? n / t : null, ejemplo: !!c._nota });
  }
  const res = {
    proveedor: provider.nombre,
    modelo: provider.modelo,
    casos: cases.length,
    subfactores: total,
    exacto: total ? exact / total : 0,
    cercano: total ? near / total : 0,
    umbral,
    metrica,
    filas,
  };
  res.aprobado = res[metrica] >= umbral;
  const pct = (x) => (x == null ? "—" : (100 * x).toFixed(1) + " %");
  out(`Proveedor: ${res.proveedor} (${res.modelo}) · ${res.casos} casos · ${res.subfactores} subfactores`);
  filas.forEach((f) => out(`  ${f.archivo.padEnd(32)} ${f.factor}  exacto ${pct(f.exacto).padStart(8)}  ±1 ${pct(f.cercano).padStart(8)}${f.ejemplo ? "  (EJEMPLO, no es referencia)" : ""}`));
  out(`Acierto exacto: ${pct(res.exacto)} · Acierto ±1: ${pct(res.cercano)} · Umbral (${metrica}): ${pct(umbral)} → ${res.aprobado ? "APROBADO" : "NO ALCANZA EL UMBRAL"}`);
  if (cases.length < MIN_CASOS) out(`AVISO: RNF-15 exige al menos ${MIN_CASOS} casos de referencia; hay ${cases.length}.`);
  if (filas.some((f) => f.ejemplo)) out("AVISO: hay casos de ejemplo (campo «_nota»); sustitúyelos por casos de referencia validados por el equipo.");
  return res;
}

if (require.main === module) {
  const provider = createProvider({
    proveedor: process.env.IA_PROVEEDOR,
    apiKey: process.env.ANTHROPIC_API_KEY,
    modelo: process.env.IA_MODELO,
    esfuerzo: process.env.IA_ESFUERZO,
  });
  run({
    dir: process.argv[2] ? path.resolve(process.argv[2]) : undefined,
    provider,
    umbral: process.env.IA_UMBRAL ? Number(process.env.IA_UMBRAL) : 0.7,
    metrica: process.env.IA_METRICA === "cercano" ? "cercano" : "exacto",
  })
    .then((r) => process.exit(r.aprobado ? 0 : 1))
    .catch((e) => {
      console.error("Error:", e.message);
      process.exit(2);
    });
}

module.exports = { run, loadCases };
