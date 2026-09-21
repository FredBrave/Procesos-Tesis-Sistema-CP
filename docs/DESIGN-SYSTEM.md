# Sistema de diseño GUIOS PRO

Implementación en CSS del UI kit de referencia (capturas: Pop-Up, List, Action Sheet, Dropdown, Context Menu, Card, Pagination, Page Control, Icons). Todo vive en `app/css/`:

| Archivo | Contenido |
|---|---|
| `tokens.css` | Variables CSS (`:root`) para color, tipografía, espaciado, radios, sombras; variante oscura bajo `[data-theme="dark"]` |
| `components.css` | Componentes reutilizables, sin conocimiento de la app |
| `app.css` | Layout de las cuatro pantallas, impresión y breakpoints |

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
| `--font-sans` | Inter, system-ui | Tipografía (Google Fonts con fallback local) |
| `--radius-sm / md / lg / pill` | 6 / 8 / 12 / 999 px | Botones e inputs = md, tarjetas = lg |
| `--control-h / -sm` | 40 / 32 px | Altura de botones, inputs y selects |
| `--sp-1 … --sp-10` | 4 … 40 px | Escala de espaciado (múltiplos de 4) |
| `--focus-ring` | `0 0 0 3px rgba(79,91,245,.25)` | Foco visible en todos los controles |

## Componentes (clase → equivalente del UI kit)

| Clase | UI kit | Notas |
|---|---|---|
| `.btn.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger` | Button (filled / outline) | `.btn-sm`, `.btn-block`, `.btn-icon` (circular) |
| `.input`, `.field > label` | Placeholder input del Pop-Up | `textarea.input` |
| `.select` | Dropdown (Default / Hover / Expanded / Disabled) | `select` nativo estilizado; `.is-level-N` colorea por valor |
| `.segmented` | — (extensión) | Alternativa compacta al dropdown para Interno/Externo |
| `.toggle` | List → toggle | `aria-checked` |
| `.badge`, `.badge-{primary,success,warning,danger}`, `.badge-{Fortaleza,…}` | List → chip/detail | `.badge-plain` sin punto |
| `.count` | List → contador rojo | `.count-primary`, `.count-success`, `.count-muted` |
| `.card`, `.card-header`, `.card-body`, `.card-footer` | Card: Vertical | `.card-soft` (fondo gris), `.card-horizontal` (Card: Horizontal – Small) |
| `.list`, `.list-item`, `.list-title` | List | `.leading` (avatar/índice), `.title`, `.detail`, `.chevron`; `aria-current="true"` = seleccionado |
| `.table` | — | Tablas de resultados |
| `.popup-backdrop > .popup` | Pop-Up | Título, mensaje, `.actions` (horizontal) o `.actions.stack` (vertical) |
| `.sheet-backdrop > .sheet` | Action Sheet | `.group > header + .action` y `.cancel`; `.action.is-danger` |
| `.menu-anchor > .menu` | Context Menu | Ítems con icono; `.is-danger` |
| `.pagination > .page-btn` | Pagination (Default / Hover / Focus / Selected / Disabled) | `aria-current="page"`; `.is-done` = paso completado; `.is-step` |
| `.page-control` | Page Control (dots) | Disponible para futuros carruseles |
| `.progress` | — | Barra de progreso |
| `.alert`, `.alert-warning` | — | Mensajes inline |
| `.toast` | — | Notificación efímera |
| `.stat-tile` | — | KPI (dataviz) |

Iconos: SVG inline estilo *feather* (24 px, trazo 2) definidos en `app.js → ICONS`. Añadir uno nuevo = añadir la ruta al diccionario.

## Principios

1. Un solo color de marca; los estados se expresan con `-hover`, `-active`, `-subtle`.
2. Superficies planas con borde de 1 px y sombra mínima; la elevación fuerte (`--shadow-lg`) solo en overlays.
3. Altura de control uniforme (40 px) y radios coherentes (8 px control / 12 px tarjeta).
4. Estados siempre accesibles: `aria-current`, `aria-pressed`, `aria-checked`, `:focus-visible`.
5. Mobile first en el contenido: las tablas se convierten en fichas por debajo de 720 px; la barra lateral desaparece por debajo de 960 px y se sustituye por un dropdown.
6. La impresión (`@media print`) oculta la navegación y muestra la cabecera del informe (`.print-only`).
