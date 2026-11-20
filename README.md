# GUIOS PRO

Sistema informático que automatiza la **guía GUIOS** para evaluar si una solución de software (especialmente FLOSS) es adecuada para una organización. Se basa en el marco teórico de la tesis doctoral *Guía para la adopción de software libre y de código abierto en organizaciones* (Rea Sánchez, 2022) y evoluciona el prototipo original **GUIOSAD v0.1.2** (Python/Flexx, conservado en [`legacy/`](legacy/)).

| | |
|---|---|
| **Modelo** | 3 dimensiones (Tecnológica, Organizacional, Económica) · 18 factores · 61 subfactores |
| **Flujo** | 3 pasos para el usuario: Importancia (GUIOS 1-2) → Cumplimiento (GUIOS 3-4) → Resultado: FODA y recomendación A/B/C (GUIOS 5-6) |
| **Módulos** | Configuración · Catálogo de softwares (etiquetas, ficha) · Evaluación en 3 pasos (ayuda, buscador, avisos, evidencias) · Panel con línea de tiempo · Historial y detalle en solo lectura · Informe imprimible con gráficos · Comparador de 2 a 5 candidatos · Administración versionada de la guía y plantillas · Importar/exportar · Sincronización y asistente de IA opcionales |
| **Stack actual** | Cliente: HTML + CSS + JavaScript sin dependencias, se abre con doble clic. Servidor opcional ([`api/`](api/)): Node ≥ 22 sin dependencias, SQLite embebido e IA de Claude. |
| **Metodología** | SCRUM · ver [`docs/SPRINT-0.md`](docs/SPRINT-0.md) |
| **Base teórica** | Tesis doctoral Rea Sánchez (2022) · resumen y dudas abiertas en [`docs/REUNION-DOCENTE.md`](docs/REUNION-DOCENTE.md) |
| **Entrega del avance** | [`docs/entregables/TAREA1-GUIOS-PRO.docx`](docs/entregables/TAREA1-GUIOS-PRO.docx) (informe en Word) · contenido en [`docs/ENTREGA-TAREA1.md`](docs/ENTREGA-TAREA1.md) · figuras en [`docs/graficos/`](docs/graficos/) |
| **Equipo y plan** | 5 desarrolladores · 5 sprints · [`docs/EQUIPO-Y-CRONOGRAMA.md`](docs/EQUIPO-Y-CRONOGRAMA.md) y [`docs/jira/TAREAS.md`](docs/jira/TAREAS.md) |

## Ejecutar

1. Descargar/clonar el repositorio.
2. Abrir [`app/index.html`](app/index.html) en Chrome, Edge o Firefox (no requiere servidor ni instalación).
3. Opcional, con servidor local: `npm run serve` → http://localhost:8080

Para ver el flujo completo con datos de prueba: menú **Más → Cargar ejemplo** o abrir `app/index.html?demo=1` (carga Moodle, Chamilo y Open edX). El estado general está en **Panel** (`#panel`), el historial en **Evaluaciones** y la comparación en **Comparar**. En el paso 2 las teclas `1`–`4` responden la pregunta resaltada.

### Servidor opcional (sincronización e IA)

Sin servidor la aplicación funciona completa con los datos del navegador. Para sincronizar varios equipos y activar el asistente de IA:

```bash
npm run api                                   # http://localhost:8787 (SQLite en api/data/)
IA_PROVEEDOR=simulado npm run api             # demo de la IA sin clave
ANTHROPIC_API_KEY=... npm run api             # IA real; la clave solo vive en el servidor
```

Después, en la app: **Configuración → Usar servidor** con la dirección `http://localhost:8787`. Detalles, variables de entorno y política de privacidad en [`api/README.md`](api/README.md); contrato en [`api/openapi.yaml`](api/openapi.yaml).

## Estructura

```
app/                 Aplicación web (entregable ejecutable)
  index.html         Shell de la app
  css/tokens.css     Design tokens (colores, tipografía, espaciado, radios)
  css/components.css Componentes del UI kit (button, list, card, dropdown, pop-up, ...)
  css/app.css        Layout de pantallas, impresión y responsive
  js/data.js         GENERADO desde data/ — catálogo de dimensiones/factores/subfactores
  js/engine.js       Motor de cálculo (lógica pura, probada con node --test)
  js/store.js        Almacén local: evaluaciones, softwares, plantillas, versiones de la guía, import/export
  js/charts.js       Gráficos SVG (radar por dimensión)
  js/api.js          Cliente del servidor opcional: sincronización con conflictos e IA
  js/app.js          Interfaz: render por pantallas (SCREENS[]) y eventos
api/                 Servidor REST opcional (Node sin dependencias, SQLite, IA), OpenAPI y pruebas
data/                Fuente de verdad de los datos maestros (TSV + JSON)
db/                  Diseño físico PostgreSQL (schema.sql) y seed GENERADO (seed.sql)
docs/                Sprint 0, sistema de diseño, plan con IA, equipo y cronograma
  jira/              Reparto de tareas (tareas.json) y CSV importable a Jira
legacy/              Prototipo GUIOSAD original, manual técnico y matriz de recomendación
scripts/             Generadores: CSV -> data.js, data.js -> seed.sql
tests/               Pruebas del motor de cálculo y del almacén local
.github/workflows/   CI: regenera datos, ejecuta pruebas y publica en GitHub Pages
```

## Comandos

```bash
npm test               # pruebas del motor, del almacén y de la API (node --test)
npm run api            # servidor REST opcional en :8787
npm run build:data     # regenerar app/js/data.js y db/seed.sql desde data/
npm run check:generated# falla si los archivos generados están desactualizados
npm run serve          # servidor estático en :8080
npm run build:jira     # regenera docs/jira/backlog-jira.csv y docs/jira/TAREAS.md
npm run build:diagramas# regenera las figuras del informe en docs/graficos/
npm run build:informe  # regenera docs/entregables/TAREA1-GUIOS-PRO.docx
```

Requisitos de desarrollo: Node ≥ 22 (pruebas y servidor; usa `node:sqlite`) y Python ≥ 3.10 (solo para los generadores). La app final no necesita ninguno.

### Regresión de extremo a extremo

[`scripts/e2e/regresion.py`](scripts/e2e/regresion.py) ejecuta en un navegador real los 15 casos de prueba de la lista *Casos de Prueba* de ClickUp, CP-01 a CP-15, y guarda el resultado de cada uno. CP-13 usa [`scripts/e2e/contraste.js`](scripts/e2e/contraste.js), que calcula el contraste WCAG AA de todos los textos visibles. Necesita Playwright (`pip install playwright`) y Chrome o Edge, y el servidor levantado en el puerto 8799 para CP-12 y CP-14:

```bash
PORT=8799 IA_PROVEEDOR=simulado npm run api
python scripts/e2e/regresion.py . resultados.json scripts/e2e/contraste.js
```

## Modificar el modelo (factores / subfactores / recomendaciones)

1. Editar `data/guiosad_data.csv`, `data/factors.csv` o `data/recomendaciones.json`.
2. `npm run build:data`
3. `npm test`
4. Commit incluyendo los archivos generados.

## Algoritmo (resumen)

- **Importancia relativa** = `niveles[ floor((sugerida + decisor) / 2) ]` con niveles 1..4 (Irrelevante, Opcional, Importante, Fundamental). Un factor *Irrelevante* queda fuera del análisis.
- **Ponderación del factor** = media de sus subfactores (1 = No cumple … 4 = Cumple).
- **FODA**: alcance Interno → Fortaleza (≥ 3) / Debilidad; alcance Externo → Oportunidad (≥ 3) / Amenaza.
- **Recomendación** (matriz GUIOSAD 2021):
  - **A – No es posible adoptar**: alguna Amenaza/Debilidad en un factor Importante o Fundamental.
  - **B – Adoptar con reservas**: Amenazas/Debilidades solo en factores Opcionales.
  - **C – Adoptar**: todos los factores son Fortalezas u Oportunidades.

## Licencia

MIT. Datos del modelo © Rea Sánchez (2022), uso académico.
