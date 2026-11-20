# GUIOS PRO — Servidor REST (`api/`)

Servidor opcional de GUIOS PRO para persistir evaluaciones por organización (RF-10), gestionar el
catálogo de softwares candidatos (RF-11), sincronizar los datos locales de la app (RF-30) y ofrecer
el asistente de IA (RF-28, RF-29). La app (`app/index.html`) **sigue funcionando sin servidor**
desde `file://`; el servidor solo añade persistencia compartida y funciones que necesitan clave.

- **Sin dependencias**: solo módulos de Node 24 (`node:http`, `node:sqlite`, `node:test`, `fetch`, `node:crypto`).
- **El cálculo no se reimplementa**: el servidor carga `app/js/engine.js` y el catálogo `app/js/data.js`
  (con `vm.runInNewContext`), así servidor y navegador dan resultados idénticos (RNF-11). Las pruebas lo comprueban.
- **Base de datos**: SQLite embebido en `api/data/guiospro.db`. `api/schema.sqlite.sql` es el
  **equivalente SQLite, para el despliegue de demostración, del diseño PostgreSQL de `db/schema.sql`**:
  mismas tablas normalizadas (`organizacion`, `software_candidato`, `evaluacion`, `evaluacion_factor`,
  `evaluacion_subfactor`, catálogos) más las columnas que pide el contrato (id de texto del cliente,
  `revision`, `huella`, `catalogo_version`, extras en JSON) y las tablas `plantilla_importancia` y `uso_ia`.
  El esquema se aplica solo al arrancar y el catálogo se sincroniza desde `data.js`.
- Contrato completo: [`openapi.yaml`](openapi.yaml) (OpenAPI 3.1).

## Cómo ejecutar

Requiere Node 24 (incluye `node:sqlite`).

```bash
npm run api            # http://127.0.0.1:8787/api
npm run test:api       # pruebas del servidor
npm test               # pruebas del motor + servidor
```

Si Node no está en el PATH pero hay VS Code instalado, su Node integrado sirve:

```powershell
$env:ELECTRON_RUN_AS_NODE=1; & "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" api/server.js
$env:ELECTRON_RUN_AS_NODE=1; & "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" --test "api/tests/**/*.test.js"
```

Modo demostración con IA simulada (sin clave):

```powershell
$env:IA_PROVEEDOR="simulado"; npm run api
```

Con Docker (desde la raíz del repositorio, porque el servidor usa `app/js/`):

```bash
docker build -f api/Dockerfile -t guiospro-api .
docker run -p 8787:8787 -v guios-datos:/app/api/data -e IA_PROVEEDOR=simulado guiospro-api
```

### Uso desde la app

```js
fetch("http://localhost:8787/api/evaluaciones/" + ev.id, {
  method: "PUT",
  headers: { "Content-Type": "application/json", "X-Organizacion": encodeURIComponent("Universidad X") },
  body: JSON.stringify(Object.assign({}, ev, { revisionBase: ev.revision || 0 })),
});
```

- `X-Organizacion` es texto libre (≤ 150). Los navegadores no permiten caracteres no ASCII en
  cabeceras: envíalo con `encodeURIComponent` (el servidor lo decodifica). Sin cabecera → «Predeterminada».
- CORS permite `Origin: null` (app abierta con doble clic, `file://`), `http://localhost:*`,
  `http://127.0.0.1:*` y los orígenes de `GUIOS_CORS`.
- Sincronización: cada `PUT /api/evaluaciones/:id` lleva `revisionBase`. Si el servidor tiene otra
  revisión responde **409** con `servidor` (su versión); el cliente fusiona y reintenta con
  `revisionBase = servidor.revision`, o usa `?forzar=1`. Reenviar el mismo contenido nunca crea una
  revisión nueva (idempotente), así que un reintento tras perder la respuesta es seguro.
  `POST /api/sync` hace lo mismo en lote y devuelve el estado del servidor para descargar lo nuevo.

## Variables de entorno

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `8787` | Puerto HTTP. |
| `HOST` | `127.0.0.1` | Interfaz de escucha (`0.0.0.0` en Docker). |
| `GUIOS_DB` | `api/data/guiospro.db` | Ruta del archivo SQLite (`:memory:` en pruebas). |
| `GUIOS_CORS` | — | Orígenes adicionales permitidos, separados por comas (p. ej. `https://guios.midominio.edu`). |
| `IA_PROVEEDOR` | `openrouter` si hay `OPENROUTER_API_KEY`; `anthropic` si hay `ANTHROPIC_API_KEY`; si no, `ninguno` | `openrouter` \| `anthropic` \| `simulado` (determinista, para demos y pruebas) \| `ninguno`. |
| `ANTHROPIC_API_KEY` | — | Clave de la API de Claude. Solo en el servidor. |
| `OPENROUTER_API_KEY` | — | Clave de OpenRouter. Solo en el servidor. |
| `IA_MODELO` | Anthropic: `claude-opus-5-5`. OpenRouter: `anthropic/claude-haiku-5.5,nvidia/nemotron-3.5-super-vl:free` | Modelo. Con OpenRouter admite una lista separada por comas: si un modelo responde sin saldo (402), saturado (429/503) o no responde a tiempo, se prueba el siguiente. |
| `IA_ESFUERZO` | `medium` | `output_config.effort` (`low`…`max`); vacío para no enviarlo. |
| `IA_LIMITE_DIARIO` | `100` | Llamadas de IA por organización y día (UTC). Al superarlo: 429 con `Retry-After`. |
| `IA_UMBRAL` | `0.7` | Umbral de acierto de `ia/evaluar-calidad.js`. |
| `IA_METRICA` | `exacto` | Métrica comparada con el umbral: `exacto` o `cercano` (±1). |

## Endpoints (resumen)

| Método y ruta | Historia | Notas |
|---|---|---|
| `GET /api/salud` | — | `{ ok, version, ia: { disponible, proveedor } }` |
| `GET /api/catalogo`, `/catalogo/dimensiones`, `/catalogo/factores[?dimension=]`, `/catalogo/factores/:id[/subfactores]` | HU-23 | Misma forma que `window.GUIOS_DATA` |
| `GET/POST /api/softwares`, `GET/PUT/DELETE /api/softwares/:id` | HU-17 | Filtros `q`, `licencia`, `etiqueta`; `DELETE` → 409 si tiene evaluaciones salvo `?cascada=1` |
| `GET /api/evaluaciones`, `GET/PUT/DELETE /api/evaluaciones/:id` | RF-10, HU-09a | Filtros `softwareId`, `estado`, `desde`; `PUT` con `revisionBase` y `?forzar=1` |
| `GET /api/evaluaciones/:id/informe` | HU-35 | HTML autocontenido, imprimible, con CSP sin scripts |
| `POST /api/sync` | RF-30 | `{ aceptados, conflictos, errores, servidor }` |
| `GET/POST /api/plantillas`, `GET/PUT/DELETE /api/plantillas/:id` | HU-37 | |
| `GET /api/dashboard[?softwareId=]` | HU-30 | Agregado con `engine.summarize` (como el panel de la app) |
| `GET /api/comparar?ids=a,b[,…]` | HU-31 | 2..5 ids; si no, 422 |
| `POST /api/ia/sugerencias` | HU-16 | Sugerencias 1..4 con confianza y justificación |
| `POST /api/ia/resumen` | HU-20 | 150–250 palabras; nunca contradice la recomendación |

Errores: `{ "error": { "codigo", "mensaje", "detalles"? } }` con 400, 404, 405, 409, 413, 415, 422, 429, 502 y 503.

## Seguridad (RNF-06)

- Toda la entrada se valida: tipos, rangos 1..4, longitudes, ids del catálogo, URLs solo `http(s)`,
  fechas ISO 8601, ids `^[A-Za-z0-9_-]{1,64}$`. Cuerpos > 1 MB → 413.
- Todas las consultas SQL son parametrizadas (incluidos los `LIKE`, con comodines escapados).
- Las respuestas llevan `Content-Type` explícito, `X-Content-Type-Options: nosniff` y `Cache-Control: no-store`.
  El informe escapa todo el contenido y se sirve con una CSP que prohíbe scripts.
- Los registros solo contienen método, ruta, estado y duración: nunca cabeceras ni cuerpos.
- HTTPS: en el despliegue institucional el servidor va detrás de un proxy inverso con TLS; por defecto
  solo escucha en `127.0.0.1`.

## Privacidad y uso de la IA

Esta sección es la política escrita de tratamiento de datos con el proveedor de IA que exige RNF-16.

**Proveedor.** Con `IA_PROVEEDOR=anthropic` el servidor llama a la Messages API de Anthropic
(`https://api.anthropic.com/v1/messages`) por HTTPS, con el modelo `claude-opus-5-5` por defecto y
salida estructurada (JSON Schema). Con `simulado` no sale ningún dato del servidor. Con `ninguno`
(o sin clave) los endpoints de IA responden 503 y la app sigue en modo manual (RNF-14).

**Qué datos se envían**

| Función | Se envía | No se envía nunca |
|---|---|---|
| Sugerencias (`/api/ia/sugerencias`) | Datos del software (nombre, versión, licencia, proveedor, URL, notas), el contexto libre que escriba el evaluador y los textos del factor y sus subfactores de la guía. | Nombre del evaluador, nombre de la organización, otras evaluaciones. |
| Resumen (`/api/ia/resumen`) | Nombre, versión, licencia y proveedor del software; el resultado calculado (recomendación, FODA, ponderación e importancia relativa de cada factor, medias por dimensión). | Nombre del evaluador, organización, observaciones y enlaces de evidencia, respuestas individuales de los subfactores. |

Las **notas** del software y el **contexto** se envían tal cual: no escribas en ellos datos personales
ni información confidencial. El evaluador **no** se envía nunca (las pruebas lo verifican).

**Dónde vive la clave.** `ANTHROPIC_API_KEY` solo existe como variable de entorno del servidor. No se
devuelve en ninguna respuesta, no se escribe en los registros y los errores del proveedor se traducen
a mensajes propios sin reenviar su cuerpo. La app del navegador nunca la ve.

**Control humano (RNF-13).** Las sugerencias no se guardan en el servidor al generarlas: la app las
muestra y el evaluador acepta o descarta cada una (lo aceptado queda en `origenIA`). La recomendación
siempre la calcula `engine.js`; el resumen se valida para que cite «Recomendación X» con el código
calculado y ninguna otra, y el informe marca el resumen como «Contenido generado con IA, revisado por el evaluador».

**Validación de las respuestas.** Se exige JSON con los ids exactos del factor, valor entero 1..4,
confianza 0..1 y justificación ≤ 400 caracteres; el resumen debe tener 150–250 palabras. Si falla se
reintenta una vez indicando los errores y, si sigue fallando, 502 `ia_respuesta_invalida`. Si los
clasificadores de seguridad del proveedor rechazan la solicitud, se usa su mecanismo de reintento
en otro modelo (`fallbacks: "default"`).

**Límite y costo (RNF-14).** Cada solicitud válida consume una llamada del cupo diario de la
organización (`IA_LIMITE_DIARIO`, 100 por defecto; cuenta por día UTC en la tabla `uso_ia`). Al
agotarlo: 429 `limite_ia` con `Retry-After`. Un reintento por validación no consume cupo extra.

**Retención.** El servidor no almacena los prompts ni las respuestas del modelo. La retención en el
proveedor se rige por sus condiciones comerciales; el equipo debe revisarlas antes del despliegue
institucional.

## Calidad de la IA (RNF-15)

```bash
IA_PROVEEDOR=anthropic ANTHROPIC_API_KEY=... node api/ia/evaluar-calidad.js   # cada caso es una llamada facturable
IA_PROVEEDOR=simulado node api/ia/evaluar-calidad.js
```

Lee `api/ia/casos/*.json` (`{ software, factorId, contexto?, esperado: { "F01-S01": 4, … } }`) y
reporta el % de acierto exacto y ±1 frente a `IA_UMBRAL`; sale con código 1 si no lo alcanza.
**Solo hay 2 casos de ejemplo** (marcados con `"_nota"`): no son referencia validada. El equipo debe
reemplazarlos por al menos 30 casos de referencia valorados por evaluadores humanos con evidencia.

## Estructura

```
api/
  server.js            arranque y rutas (exporta createServer(opciones))
  schema.sqlite.sql    esquema SQLite (equivalente de db/schema.sql)
  openapi.yaml         contrato OpenAPI 3.1
  lib/catalog.js       carga data.js y engine.js
  lib/http.js          errores, cuerpo con límite, CORS
  lib/validate.js      validación y normalización de la entrada
  lib/store.js         acceso a datos (SQLite)
  lib/report.js        informe HTML
  lib/ia/              asistente de IA (prompts, proveedores, validación)
  ia/evaluar-calidad.js, ia/casos/   medición RNF-15
  tests/               pruebas node:test
```

## OpenRouter

Con `OPENROUTER_API_KEY` el servidor usa la API de OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) con salida JSON estructurada estricta. La cadena por defecto prueba primero Claude Haiku 5.5, que es de pago, rápido y cuesta alrededor de una décima de centavo por llamada. Si la cuenta no tiene saldo, pasa a `nvidia/nemotron-3.5-super-vl:free`, que es gratuito pero tarda de 15 a 35 segundos.

Límites de los modelos gratuitos de OpenRouter: 20 peticiones por minuto y 50 al día por cuenta, o 1000 al día si la cuenta ha comprado al menos 10 USD de créditos. Las peticiones fallidas también cuentan. Cada clic en «Sugerir con IA» o «Redactar con IA» es una petición, o dos si el servidor tiene que reintentar por una respuesta inválida.
