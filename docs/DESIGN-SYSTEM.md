# Sistema de diseño GUIOS PRO

Implementación en CSS del UI kit de referencia (capturas: Pop-Up, List, Action Sheet, Dropdown, Context Menu, Card, Pagination, Page Control, Icons). Todo vive en `app/css/`:

| Archivo | Contenido |
|---|---|
| `tokens.css` | Variables CSS (`:root`) para color, tipografía, espaciado, radios, sombras; variante oscura bajo `[data-theme="dark"]` |
| `components.css` | Componentes reutilizables, sin conocimiento de la app |
| `app.css` | Layout de las cinco pantallas (Inicio, pasos 1-3 y Panel), sidebar, impresión y breakpoints |

## Tokens

| Token | Valor (light) | Uso |
|---|---|---|
| `--color-primary` | `#4f5bf5` | Botones primarios, selección, enlaces, indicadores de página |
| `--color-primary-hover / -active` | `#3f4be0` / `#3440c7` | Estados |
| `--color-primary-subtle` | `#eef0ff` | Fondos de hover en listas/menús, badges primarios |
| `--color-bg` | `#f5f5f7` | Fondo de página |
| `--color-surface` | `#ffffff` | Tarjetas, header, footer, pop-ups |
| `--color-surface-2 / -3` | `#f7f7f9` / `#efeff3` | Filas de listas, tablas, segmented |
| `--color-border` | `#e5e6eb` | Bordes de tarjetas y separadores |
| `--color-text / -2 / -3` | `#17171f` / `#6b6f80` / `#a0a3b1` | Texto principal, secundario, deshabilitado |
| `--color-danger / success / warning` | `#ef4444` / `#1f9d61` / `#d98a0b` | Semánticos (+ variantes `-subtle`) |
| `--foda-*` | fortaleza `#1f9d61`, oportunidad `#4f5bf5`, debilidad `#d98a0b`, amenaza `#ef4444` | Colores de la matriz FODA |
| `--foda-*-solid` | fortaleza `#15803d`, oportunidad `#4f5bf5`, debilidad `#b45309`, amenaza `#dc2626` | Relleno de los cuadrantes FODA y del veredicto; texto blanco encima con contraste ≥ 4.8:1 (AA) |
| `--on-solid` / `--on-solid-veil` | `#fff` / blanco al 20 % | Texto e iconos sobre rellenos sólidos; fondo del icono del cuadrante |
| `--font-sans` | Inter, system-ui | Tipografía (Google Fonts con fallback local) |
| `--radius-sm / md / lg / pill` | 6 / 8 / 12 / 999 px | Botones e inputs = md, tarjetas = lg |
| `--control-h / -sm` | 40 / 32 px | Altura de botones, inputs y selects |
| `--sp-1 … --sp-10` | 4 … 40 px | Escala de espaciado (múltiplos de 4) |
| `--focus-ring` | `0 0 0 3px rgba(79,91,245,.25)` | Foco visible en todos los controles |
| `--sidebar-bg / -bg-2` | `#232a6b` → `#1c2259` | Degradado sólido de marca del sidebar (casi negro en tema oscuro) |
| `--sidebar-fg / -fg-2 / -fg-3` | `#ffffff` / `#aeb4e8` / `#7f88c9` | Texto del sidebar: principal, secundario y atenuado |
| `--sidebar-hover / -active / -line` | blancos translúcidos | Estados y conectores sobre la superficie de marca |
| `--sidebar-accent` | `#8b95ff` | Indicador de la sección actual, paso actual y barra de progreso del sidebar |

## Componentes (clase → equivalente del UI kit)

| Clase | UI kit | Notas |
|---|---|---|
| `.btn.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger` | Button (filled / outline) | `.btn-sm`, `.btn-block`, `.btn-icon` (circular), `.btn-ghost.is-danger` (acción destructiva discreta, como «Limpiar datos») |
| `.input`, `.field > label` | Placeholder input del Pop-Up | `textarea.input` |
| `.select` | Dropdown (Default / Hover / Expanded / Disabled) | `select` nativo estilizado; `.is-level-N` colorea por valor. Para escalas cortas usar `.choice` |
| `.choice > .choice-opt` | — (matriz de escala) | **Escala de un clic**: grupo de radios nativos (`role="radiogroup"`, flechas del teclado incluidas) dibujados como círculos de 24 px (`.choice-dot`) alineados en 4 columnas. `--c` = color del nivel (relleno con check al marcar). `.is-suggested` = anillo discontinuo (valor sugerido por la guía). `.choice-label` solo se ve en móvil. **Cascada**: con el botón del ratón pulsado, cada círculo por el que pasa el puntero queda marcado (`pointerdown/pointerover` en `app.js`, un solo guardado al soltar); tacto y teclado usan el `change` normal |
| `.scale` + `.scale-head` | — | Contenedor de una escala: cabecera fija (`position: sticky`) con el nombre de cada columna subrayado con su color, y filas con la columna `var(--scale-w)` (`.scale-importance` 340 px, `.scale-answer` 300 px). En móvil la cabecera se oculta y cada círculo muestra su texto |
| `.segmented` | — (extensión) | Alternativa compacta al dropdown para Interno/Externo |
| `.toggle` | List → toggle | `aria-checked` |
| `.badge`, `.badge-{primary,success,warning,danger}`, `.badge-{Fortaleza,…}` | List → chip/detail | `.badge-plain` sin punto |
| `.count` | List → contador rojo | `.count-primary`, `.count-success`, `.count-muted` |
| `.card`, `.card-header`, `.card-body`, `.card-footer` | Card: Vertical | `.card-soft` (fondo gris), `.card-horizontal` (Card: Horizontal – Small) |
| `.list`, `.list-item`, `.list-title` | List | `.leading` (avatar/índice), `.title` (+ `.subtitle` en segunda línea), `.detail`, `.chevron`; `aria-current="true"` = seleccionado. `.list-flush`: lista dentro de una tarjeta, sin fondo, filas de 64 px — es la **lista de estado** del panel (badge de estado por fila) |
| `.table` | — | Tablas de resultados |
| `.popup-backdrop > .popup` | Pop-Up | Título, mensaje, `.actions` (horizontal) o `.actions.stack` (vertical) |
| `.sheet-backdrop > .sheet` | Action Sheet | `.group > header + .action` y `.cancel`; `.action.is-danger` |
| `.menu-anchor > .menu` | Context Menu | Ítems con icono; `.is-danger` |
| `.pagination > .page-btn` | Pagination (Default / Hover / Focus / Selected / Disabled) | `aria-current="page"`; `.is-done` = paso completado; `.is-step` |
| `.page-control` | Page Control (dots) | Disponible para futuros carruseles |
| `.progress` | — | Barra de progreso |
| `.kpi-grid > .kpi` | — | **Tarjeta de indicador**: `.kpi-icon` (color `--kpi-color`), `.kpi-label`, `.kpi-value` (con `<small>` para el total) y `.kpi-hint`. La rejilla es de 2 columnas |
| `.gauge` | — | **Medidor circular de avance** con `conic-gradient`: `style="--value:62"` (0-100) y opcional `--gauge-color`, `--gauge-size`; texto en `.gauge-value`. Lleva `role="progressbar"` y `aria-valuenow` |
| `.stacked-bar` + `.legend` | — | **Distribución** (FODA): un `<span>` por serie con `--q-color` y `--n` (peso); `role="img"` con `aria-label` que enumera los valores. La leyenda repite los números en texto |
| `.empty-state` | — | **Estado vacío**: `.empty-icon`, título, texto y `.actions`. Siempre con una acción para salir del vacío |
| `.alert`, `.alert-warning` | — | Mensajes inline |
| `.verdict` (`.verdict-code`, `.verdict-scale`) | Card | Veredicto del paso 3: letra A/B/C en un círculo de 84 px con halo suave, texto de la regla, factores a revisar y **escala A · B · C** con el veredicto actual resaltado. El tono sale de `.tone-danger/-warning/-success` (`--rec-solid`, `--rec-bg`) |
| `.foda-board` (`.foda-q`, `.foda-core`) | — | **Matriz FODA**: cuatro cuadrantes sólidos (`--q` = `--foda-*-solid`) con icono, título, conteo y lista de factores en blanco con su cumplimiento medio; la fila inferior va en espejo (título en el borde exterior). En el centro, un núcleo circular F·O·D·A con anillo de cuatro colores (`conic-gradient`). Encima, `.foda-axis` (origen interno / externo). En móvil: una columna, sin núcleo y con la letra junto al título |
| `.foda-balance` | — | Balance a favor / en contra en la cabecera de la tarjeta FODA: dos cifras y barra proporcional |
| `.toast` | — | Notificación efímera |
| `.sidebar` (`.side-top`, `.side-nav`, `.side-link`, `.side-title`, `.side-bottom`) | List + Card | Barra lateral fija de 300 px sobre superficie sólida de marca: logo; Inicio y Panel (`app.js → NAV_MAIN`); línea de tiempo de los pasos; «Próximamente» (`NAV_EXTRA`, `soon: true` = enlace atenuado con `.soon`). La sección actual lleva un indicador vertical de 3 px en `--sidebar-accent`. Por debajo de 960 px se convierte en cajón (`.is-open`) con `.sidebar-backdrop` |
| `.side-eval` | Card: Horizontal | Tarjeta de la evaluación en curso en el pie: avatar con la inicial del software, nombre, estado (o recomendación), % y barra; enlaza al Panel |
| `.side-actions > .side-tool` | — | Barra de herramientas del pie con icono + etiqueta: tema (Oscuro/Claro), Ayuda y Más (menú `.menu-up`) |
| `.side-steps > .side-step` | Page Control (vertical) | **Línea de tiempo**: nodo de 32 px (`--node`) con el número del paso o un check al completarse, riel vertical continuo entre nodos que se colorea al avanzar, y texto en dos niveles (`.step-title`, `.step-state`). El enlace lleva `aria-label` completo («Paso 1 de 3: …»); `.is-current`, `.is-done` |
| `.topbar` | — | Barra superior solo en móvil: hamburguesa, título del paso y tema |
| `.menu.menu-up` | Context Menu | Variante que se despliega hacia arriba (usada en el pie del sidebar) |
| `.details > summary` | — | Sección plegable (`<details>`); `.details.card` para tarjetas plegables. Se despliegan automáticamente al imprimir |
| `.switch` + `.toggle` | List → toggle | Interruptor con etiqueta ("Ver cálculo") |
| `.factor-row` | List | Fila de factor: nombre + alcance (o segmented Interno/Externo si es «Ambos») y `.choice` de importancia; `.is-irrelevant` tacha el nombre; `.has-detail` añade la columna «Relativa» |
| `.quick-hint` | — | Aviso del paso 1: las importancias ya vienen con la sugerencia de la guía; incluye «Restablecer sugeridas (n)» |
| `.subfactor-row` | List | Pregunta del paso 2 con su `.choice`. `.is-active` (fondo suave y barra izquierda) marca la pregunta que responden las teclas 1-4; `.is-answered` atenúa el texto y pone un check en el índice |
| `.quick-fill` | — | Franja del paso 2: «Responder las n pendientes como: Cumple / Parcial / No cumple» (no pisa las ya respondidas) |
| `kbd` | — | Tecla de atajo |

Iconos: SVG inline estilo *feather* (24 px, trazo 2) definidos en `app.js → ICONS`. Añadir uno nuevo = añadir la ruta al diccionario.

## Tema claro / oscuro

- El atributo `data-theme="light|dark"` en `<html>` decide el tema; `tokens.css` redefine las variables bajo `:root[data-theme="dark"]`.
- Un script inline en `index.html` aplica antes del primer pintado el tema guardado (`localStorage: guiospro.theme`), o el del sistema si no hay preferencia. `?theme=dark|light` en la URL fuerza uno (para capturas).
- El botón sol/luna del sidebar (o de la barra superior en móvil, `data-action="theme"`) alterna y persiste la preferencia.

## Principios

1. Un solo color de marca; los estados se expresan con `-hover`, `-active`, `-subtle`.
2. Superficies planas con borde de 1 px y sombra mínima; la elevación fuerte (`--shadow-lg`) solo en overlays.
3. Altura de control uniforme (40 px) y radios coherentes (8 px control / 12 px tarjeta).
4. Estados siempre accesibles: `aria-current`, `aria-pressed`, `aria-checked`, `:focus-visible`.
5. Mobile first: por debajo de 960 px el sidebar pasa a cajón lateral y aparece la barra superior; la lista de factores del paso 2 se sustituye por un dropdown; por debajo de 760 px las filas se apilan.
6. La impresión (`@media print`) oculta la navegación y muestra la cabecera del informe (`.print-only`).
7. Menos es más: cada pantalla muestra una sola pregunta y un solo control por fila; los datos de cálculo (importancia relativa, ponderaciones, tabla) van detrás de un interruptor o una sección plegable.
8. Un clic por respuesta: las escalas de hasta 4 niveles se muestran como matriz `.scale` + `.choice` (columnas con cabecera, círculos por fila) en lugar de un desplegable, y admiten arrastre en cascada para marcar varias filas. En el paso 2, al responder, el foco pasa a la siguiente pregunta pendiente y, al completar un factor, al siguiente factor con pendientes.
