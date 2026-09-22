# CLAUDE.md — Guía para agentes de IA en GUIOS PRO

Este archivo lo lee Claude Code (y otros asistentes) al abrir el repositorio. Resume lo que no se deduce del código.

## Qué es

Sistema de evaluación de adopción de software basado en la guía GUIOS (tesis doctoral Rea Sánchez, 2022). Proyecto académico (Ingeniería de Software, asignatura Metodologías Ágiles) gestionado con SCRUM. El entregable ejecutable es `app/index.html`: **debe seguir funcionando al abrirse con doble clic** (protocolo `file://`, sin servidor, sin build, sin `fetch()`, sin ES modules).

## Comandos

- `npm test` — pruebas del motor (obligatorio antes de cada commit que toque `engine.js` o `data/`).
- `npm run build:data` — regenera `app/js/data.js` y `db/seed.sql`. **Nunca editar esos dos archivos a mano.**
- `npm run serve` — servidor local en :8080 (opcional).
- Verificación visual: abrir `app/index.html?demo=1#paso-5-6` (carga una evaluación de ejemplo).

## Reglas del proyecto

1. **Fuente de verdad de los datos**: `data/*.csv` (TSV, UTF-8) y `data/recomendaciones.json`. Cualquier cambio en factores/subfactores/reglas va ahí y luego `npm run build:data`.
2. **Lógica de cálculo solo en `app/js/engine.js`** (pura, sin DOM). La UI (`app.js`) solo llama a `GuiosEngine.evaluate()`. Cada cambio al algoritmo requiere un test en `tests/`.
3. **Algoritmo fiel al prototipo original** (`legacy/main.py`) y a la matriz `legacy/MATRIZ RECOMENDACION GUIOSAD 2021.xlsx`. Escalas 1..4 (no Likert 1..5). No "mejorar" el algoritmo sin una historia de usuario que lo pida.
4. **Diseño**: usar únicamente tokens de `app/css/tokens.css` y componentes de `app/css/components.css` (ver `docs/DESIGN-SYSTEM.md`). No introducir colores/tamaños literales en `app.css` ni estilos inline salvo variables CSS (`style="--q-color:..."`).
5. **Sin dependencias de runtime.** Nada de npm packages en la app. Node/Python solo para tests y generadores.
6. **Idioma**: UI, comentarios, commits y documentación en español. Identificadores de código en inglés (`evaluate`, `relativeIndex`), claves de datos en español (`importanciaSugerida`, `alcance`) porque reflejan el vocabulario de la guía.
7. **Accesibilidad**: todo control con etiqueta (`aria-label` o `<label>`), foco visible, contraste AA, funcionar a 390 px de ancho.
8. **Commits**: Conventional Commits en español (`feat:`, `fix:`, `docs:`, `data:`, `design:`, `chore:`). Un commit por historia de usuario o cambio atómico.

## Mapa rápido

| Quiero… | Tocar |
|---|---|
| Cambiar un texto de la guía, añadir un subfactor | `data/guiosad_data.csv` → `npm run build:data` |
| Cambiar la importancia sugerida o alcance de un factor | `data/factors.csv` |
| Cambiar el texto o la condición de una recomendación | `data/recomendaciones.json` |
| Cambiar una fórmula / umbral | `engine.js` + test en `tests/engine.test.js` (`umbralFoda` vive en `recomendaciones.json`) |
| Añadir una pantalla | `SCREENS[]` y una función `renderX()` en `app.js`; estilos en `app.css` |
| Añadir una sección al navbar | `NAV_ITEMS[]` en `app.js` (`soon: true` mientras no exista la pantalla) |
| Mostrar más información en un paso | Preferir un `<details class="details">` o el interruptor "Ver cálculo"; las pantallas deben quedar simples por defecto |
| Cambiar colores / tipografía | `tokens.css` (light y dark) |
| Cambiar el esquema de BD | `db/schema.sql`; el seed se regenera |

## Estado y hoja de ruta

Ver `docs/PLAN-DESARROLLO-IA.md` (backlog priorizado, sprints, prompts sugeridos y automatizaciones) y `docs/SPRINT-0.md` (modelado del negocio, requisitos, diseño de datos).
