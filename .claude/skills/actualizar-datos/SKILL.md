---
name: actualizar-datos
description: Modificar factores, subfactores o reglas de recomendación de la guía GUIOS (data/) y regenerar los archivos derivados. Usar cuando el usuario pida añadir, quitar o editar un factor/subfactor, cambiar una importancia sugerida, un alcance, el umbral FODA o el texto de una recomendación.
---

# Actualizar datos maestros de la guía

1. Identifica el archivo fuente correcto:
   - Subfactores y su factor/dimensión → `data/guiosad_data.csv` (TSV: Dimensión, Factor, Subfactor; UTF-8).
   - Importancia sugerida (1..4) y alcance (Interno/Externo/Ambos) de un factor → `data/factors.csv`.
   - Reglas A/B/C, etiquetas de escalas, umbral FODA → `data/recomendaciones.json`.
2. Edita solo ese archivo. Si añades un factor nuevo, debe aparecer en **ambos** CSV con el mismo nombre exacto.
3. Ejecuta `npm run build:data` (regenera `app/js/data.js` y `db/seed.sql`). Nunca edites esos dos archivos a mano.
4. Ejecuta `npm test`. Si cambió el número de factores/subfactores, actualiza el primer test de `tests/engine.test.js` y los conteos en `README.md` y `docs/SPRINT-0.md`.
5. Si es una regla nueva de recomendación, añade un test que la ejercite.
6. Resume al usuario: qué cambió, conteos resultantes y archivos regenerados.
