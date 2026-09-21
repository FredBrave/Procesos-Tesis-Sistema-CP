# Plan de desarrollo asistido por IA y automatización

Cómo seguir construyendo GUIOS PRO sprint a sprint usando Claude Code (u otro agente) de forma controlada, con verificación automática en cada cambio.

## 1. Principios

1. **El repositorio es el contexto.** `CLAUDE.md` contiene las reglas; `docs/` el porqué; `data/` los datos maestros; `tests/` la verdad del algoritmo. Un agente nuevo debe poder trabajar leyendo solo eso.
2. **Un cambio = una historia de usuario = un commit (o PR).** Nunca pedir "mejora la app": pedir HU-09, con criterios de aceptación.
3. **Verificación antes de confiar.** Todo cambio pasa por: `npm run build:data` (si tocó datos) → `npm test` → `python scripts/screenshots.py` (si tocó UI) → revisión de las capturas → commit.
4. **Los datos generados nunca se editan.** `app/js/data.js` y `db/seed.sql` se regeneran; el CI falla si están desactualizados.
5. **El algoritmo no cambia sin test.** Cualquier modificación de `engine.js` va acompañada de un caso en `tests/engine.test.js` que la demuestre.
6. **Diseño con tokens.** Si un cambio necesita un color o tamaño nuevo, primero se añade el token en `tokens.css` (light y dark) y se documenta en `DESIGN-SYSTEM.md`.

## 2. Flujo estándar por historia de usuario

```
1. Crear issue en GitHub con el ID de la HU, criterios de aceptación y sprint.
2. Rama: feat/hu-09-persistencia-servidor
3. Sesión de Claude Code con el prompt de la sección 4 (o la skill /nueva-historia).
4. El agente: lee CLAUDE.md → propone plan → implementa → ejecuta npm test y screenshots → resume.
5. Revisión humana de diff + capturas. Correcciones en la misma sesión.
6. /code-review (Claude Code) para una segunda revisión automática.
7. Commit con Conventional Commits en español + PR → CI verde → merge a main → despliegue automático en GitHub Pages.
```

**Definición de Hecho (DoD):** criterios de aceptación cumplidos · `npm test` verde · sin errores en consola del navegador · funciona desde `file://` · responsive a 390 px · documentación actualizada (`README`/`SPRINT-0`/`DESIGN-SYSTEM` según aplique) · capturas regeneradas si cambió la UI.

## 3. Hoja de ruta por sprints

| Sprint | Objetivo | Historias | Entregable |
|---|---|---|---|
| **0** (hecho) | Cimentación: repositorio, rediseño con UI kit, motor probado, datos maestros, esquema BD, CI | HU-01 … HU-07 | `app/index.html` portable + informe Sprint 0 |
| **1** | Pulido del prototipo y validación con el Product Owner | Ajustes de textos de la guía, ayuda contextual por paso, modo oscuro con selector, exportación PDF con gráfico FODA, pruebas de UI básicas (Playwright) | v1.1 en GitHub Pages |
| **2** | Backend mínimo y autenticación | HU-08, HU-09 (parte 1: API + BD), Docker Compose (PostgreSQL + API) | API REST documentada (OpenAPI) + `db/schema.sql` en uso |
| **3** | Persistencia completa y administración | HU-09 (parte 2: la app usa la API, sincroniza con localStorage), HU-10 | v2.0 multiusuario |
| **4** | Valor para el decisor | HU-11 tablero comparativo, HU-12 evidencias, informe PDF generado en servidor | v2.1 + manual de usuario |

Backend sugerido: **FastAPI + SQLAlchemy + PostgreSQL** (Python ya está en el proyecto y en el manual técnico original). Alternativa: Node/Express reutilizando `engine.js` sin cambios. Decidir en la Planning del Sprint 2.

## 4. Prompts listos para usar (Claude Code)

Copiar y completar. Siempre iniciar la sesión en la raíz del repositorio para que lea `CLAUDE.md`.

**a) Cambiar datos de la guía**
```
Añade el subfactor "<enunciado>" al factor "<nombre>" en data/guiosad_data.csv, regenera los
datos con npm run build:data, ejecuta npm test y muéstrame el diff. No toques app/js/data.js a mano.
```

**b) Nueva historia de usuario de UI**
```
Implementa HU-<n>: "<historia>". Criterios de aceptación: <lista>.
Restricciones: usa solo componentes de app/css/components.css y tokens de tokens.css; la lógica
de cálculo sigue en engine.js; debe funcionar desde file:// y a 390 px. Al terminar ejecuta
npm test y python scripts/screenshots.py, y resume qué cambiaste y qué verificaste.
```

**c) Cambio en el algoritmo (con prueba)**
```
Según la matriz legacy/MATRIZ RECOMENDACION GUIOSAD 2021.xlsx, <describe la regla>. Primero
escribe un test en tests/engine.test.js que falle, luego ajusta engine.js o
data/recomendaciones.json hasta que pase. No cambies otras reglas.
```

**d) Backend (Sprint 2)**
```
Crea api/ con FastAPI y SQLAlchemy usando db/schema.sql como modelo. Endpoints: auth (JWT),
CRUD de software_candidato, crear/listar/completar evaluacion, guardar evaluacion_factor y
evaluacion_subfactor. Añade docker-compose.yml con PostgreSQL 16 que cargue db/schema.sql y
db/seed.sql. Incluye tests con pytest y actualiza el workflow de CI.
```

**e) Revisión**
```
/code-review high
```

**f) Informe académico**
```
A partir de docs/SPRINT-0.md, docs/DESIGN-SYSTEM.md y las capturas en docs/capturas/, genera el
informe de avance en .docx con la estructura de la tarea S4-TAREA_1 (portada, metodología,
modelado del negocio, requisitos, backlog, análisis y diseño con el diagrama ER). Usa las
capturas como figuras numeradas.
```

## 5. Automatizaciones

### Ya configuradas
| Qué | Dónde | Efecto |
|---|---|---|
| CI en cada push/PR | `.github/workflows/ci.yml` | Regenera datos y falla si difieren; `npm test`; `node --check` |
| Despliegue continuo | mismo workflow, job `deploy` | Publica `app/` en GitHub Pages al hacer merge a `main` (activar Pages → Source: GitHub Actions en el repo) |
| Generadores | `scripts/build_data.py`, `scripts/build_seed_sql.py` | CSV → `data.js` → `seed.sql` |
| Capturas | `scripts/screenshots.py` | PNG de cada pantalla para informe y verificación visual |
| Contexto para agentes | `CLAUDE.md`, `.claude/skills/` | Reglas + flujos repetibles (`/actualizar-datos`, `/nueva-historia`, `/verificar`) |

### Recomendadas para el Sprint 1
- **Hook pre-commit** (sin dependencias): `git config core.hooksPath .githooks` y un script que ejecute `npm run check:generated && npm test`. Plantilla en `.githooks/pre-commit`.
- **Plantillas de issue** (`.github/ISSUE_TEMPLATE/historia-de-usuario.md`) con los campos de la tabla del backlog.
- **Pruebas de UI** con Playwright (`tests/ui/`): recorrer los 4 pasos con `?demo=1` y comprobar que la recomendación es "B".
- **Rutina semanal** (Claude Code `/schedule`): cada lunes generar un resumen del estado del backlog y de los commits de la semana para el Daily/Review.

### Para el Sprint 2+
- `docker-compose.yml` (PostgreSQL + API) y job de CI que levante la BD, cargue `schema.sql` + `seed.sql` y ejecute `pytest`.
- Migraciones con Alembic; `seed.sql` se convierte en una migración de datos.
- Dependabot para `api/requirements.txt` y las actions.

## 6. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| El agente "corrige" el algoritmo por su cuenta | Regla 3 de `CLAUDE.md` + tests que fijan los resultados A/B/C |
| Divergencia entre CSV y `data.js` | `check:generated` en CI |
| Regresiones visuales | Capturas versionadas en `docs/capturas/` y revisión del diff de imágenes en el PR |
| Dependencia de Google Fonts sin conexión | Fallback a `system-ui` ya definido en `--font-sans` |
| Pérdida de datos en localStorage | Exportar JSON (ya existe); persistencia en servidor en Sprint 2-3 |
| Turnitin en el informe | Redactar el informe a partir de `docs/` con las propias palabras del equipo; citar Rea Sánchez (2022) |
