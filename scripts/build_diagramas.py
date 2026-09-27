"""Genera los diagramas del informe en PNG de alta resolución.

Uso:  python scripts/build_diagramas.py [carpeta_salida]   (por defecto docs/graficos/)

Renderiza cada diagrama Mermaid en Chrome/Edge headless a escala 2x y recorta
los márgenes en blanco. Requiere conexión a internet (Mermaid se carga por CDN).
"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs" / "graficos"

CANDIDATES = [
    shutil.which("chrome"), shutil.which("google-chrome"), shutil.which("msedge"),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]
BROWSER = next((c for c in CANDIDATES if c and Path(c).exists()), None)

# Paleta del sistema de diseño (app/css/tokens.css)
THEME = {
    "primaryColor": "#eef0ff",
    "primaryTextColor": "#17171f",
    "primaryBorderColor": "#4f5bf5",
    "lineColor": "#6b6f80",
    "secondaryColor": "#f7f7f9",
    "tertiaryColor": "#ffffff",
    "fontFamily": "Inter, Segoe UI, Arial, sans-serif",
    "fontSize": "15px",
}

DIAGRAMAS = {
"01-proceso-actual": ("Figura 1. Proceso actual de adopción de software (AS-IS)", """
flowchart TD
    A["1· Detección de la necesidad<br/><i>Área de TI o disposición institucional</i>"] --> B["2· Búsqueda empírica de alternativas<br/><i>Experiencia previa, colegas, internet</i>"]
    B --> C["3· Procedimiento ad-hoc<br/><i>Cada organización inventa el suyo</i>"]
    C --> D["4· Evaluación manual en hoja de cálculo<br/><i>Sin integrar lo tecnológico, organizacional y económico</i>"]
    D --> E["5· Decisión del responsable de TI<br/><i>Criterio subjetivo</i>"]
    E --> F["6· Implantación"]
    F --> G["Problemas detectados tarde"]
    G --> G1["No se pueden importar<br/>los datos existentes"]
    G --> G2["Documentación insuficiente"]
    G --> G3["Costos ocultos"]
    G --> G4["Resistencia al cambio"]
    style G fill:#fdecec,stroke:#ef4444
    style G1 fill:#fdecec,stroke:#ef4444
    style G2 fill:#fdecec,stroke:#ef4444
    style G3 fill:#fdecec,stroke:#ef4444
    style G4 fill:#fdecec,stroke:#ef4444
"""),

"02-propuesta-to-be": ("Figura 2. Proceso propuesto con GUIOS PRO (TO-BE)", """
flowchart LR
    subgraph AS["Situación actual (AS-IS)"]
        A1["Selección empírica"]
        A2["Hoja de cálculo manual"]
        A3["Criterio subjetivo"]
        A4["Sin historial ni trazabilidad"]
        A5["Problemas descubiertos<br/>tras implantar"]
    end
    subgraph TO["Con GUIOS PRO (TO-BE)"]
        B1["Guía de 3 pasos<br/>18 factores · 61 subfactores"]
        B2["Cálculo automático de<br/>importancia y ponderación"]
        B3["Clasificación FODA<br/>y recomendación A/B/C"]
        B4["Historial, catálogo de software<br/>y comparación de candidatos"]
        B5["Riesgos identificados<br/>antes de decidir"]
    end
    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B4
    A5 --> B5
    style AS fill:#fdecec,stroke:#ef4444
    style TO fill:#e6f7ee,stroke:#1f9d61
"""),

"03-pasos-guios": ("Figura 3. Los 6 pasos de GUIOS y su automatización en 3 pantallas", """
flowchart TD
    I(["Inicio"]) --> P1["Paso 1· Cálculo de la importancia relativa<br/>IR = f(Importancia sugerida, Importancia del decisor)"]
    P1 --> P2["Paso 2· Selección de factores relevantes<br/>se descartan los Irrelevantes · se fija el alcance de Soporte"]
    P2 --> P3["Paso 3· Evaluación de los subfactores<br/>escala 1 No cumple … 4 Cumple"]
    P3 --> P4["Paso 4· Ponderación media por factor<br/>PM = media de sus subfactores"]
    P4 --> P5["Paso 5· Clasificación FODA<br/>PM ≥ 3 y alcance interno/externo"]
    P5 --> P6["Paso 6· Recomendación de adopción<br/>A · B · C"]
    P6 --> F(["Fin"])
    P1 -.-> S1
    P2 -.-> S1
    P3 -.-> S2
    P4 -.-> S2
    P5 -.-> S3
    P6 -.-> S3
    S1["Pantalla 1<br/><b>Importancia</b>"]
    S2["Pantalla 2<br/><b>Cumplimiento</b>"]
    S3["Pantalla 3<br/><b>Resultado</b>"]
    style S1 fill:#eef0ff,stroke:#4f5bf5
    style S2 fill:#eef0ff,stroke:#4f5bf5
    style S3 fill:#eef0ff,stroke:#4f5bf5
"""),

"04-estructura-guios": ("Figura 4. Estructura del modelo de evaluación", """
flowchart TD
    G["Modelo GUIOS<br/><b>3 dimensiones · 18 factores · 61 subfactores</b>"]
    G --> T["<b>Tecnológica</b><br/>9 factores · 40 subfactores"]
    G --> O["<b>Organizacional</b><br/>8 factores · 19 subfactores"]
    G --> E["<b>Económica</b><br/>1 factor · 2 subfactores"]
    T --> T1["Compatibilidad · Personalización<br/>Prueba · Fiabilidad · Reusabilidad<br/>Usabilidad · Mantenibilidad<br/>Portabilidad · Documentación"]
    O --> O1["Formación · Tiempo de adopción<br/>Casos de estudio · Centralidad de TI<br/>Apoyo de la alta dirección · Bloqueo de<br/>proveedores · Soporte · Actitud al cambio"]
    E --> E1["Coste total de propiedad"]
    style G fill:#eef0ff,stroke:#4f5bf5
    style T fill:#f7f7f9,stroke:#4f5bf5
    style O fill:#f7f7f9,stroke:#4f5bf5
    style E fill:#f7f7f9,stroke:#4f5bf5
"""),

"05-casos-uso": ("Figura 5. Diagrama de casos de uso", """
flowchart LR
    D(("Decisor<br/>Director de TI"))
    EV(("Evaluador<br/>técnico"))
    RM(("Responsable<br/>del método"))
    IA(("Servicio<br/>de IA"))

    subgraph SIS["Sistema GUIOS PRO"]
        U1["Registrar software candidato"]
        U2["Configurar la organización"]
        U3["Asignar importancia a los factores"]
        U4["Valorar el cumplimiento de subfactores"]
        U5["Consultar resultado FODA y recomendación"]
        U6["Exportar informe"]
        U7["Consultar historial de evaluaciones"]
        U8["Comparar candidatos"]
        U9["Administrar el catálogo de la guía"]
        U10["Solicitar sugerencia de valoración"]
    end

    D --> U2
    D --> U3
    D --> U5
    D --> U6
    D --> U7
    D --> U8
    EV --> U1
    EV --> U4
    EV --> U7
    EV --> U10
    RM --> U9
    U10 --> IA
    style SIS fill:#f7f7f9,stroke:#4f5bf5
"""),

"06-modelo-logico": ("Figura 6. Modelo lógico de datos (diagrama entidad-relación)", """
erDiagram
    ORGANIZACION ||--o{ SOFTWARE_CANDIDATO : registra
    SOFTWARE_CANDIDATO ||--o{ EVALUACION : recibe
    EVALUACION ||--o{ EVALUACION_FACTOR : pondera
    EVALUACION ||--o{ EVALUACION_SUBFACTOR : valora
    DIMENSION ||--o{ FACTOR : agrupa
    FACTOR ||--o{ SUBFACTOR : contiene
    FACTOR ||--o{ EVALUACION_FACTOR : "se evalua en"
    SUBFACTOR ||--o{ EVALUACION_SUBFACTOR : "se valora en"
    REGLA_RECOMENDACION ||--o{ EVALUACION : determina
    NIVEL_IMPORTANCIA ||--o{ EVALUACION_FACTOR : califica
    NIVEL_CUMPLIMIENTO ||--o{ EVALUACION_SUBFACTOR : califica

    ORGANIZACION {
        int id_organizacion PK
        varchar nombre
        varchar sector
    }
    SOFTWARE_CANDIDATO {
        int id_software PK
        int id_organizacion FK
        varchar nombre
        varchar version
        varchar tipo_licencia
        varchar proveedor
    }
    EVALUACION {
        int id_evaluacion PK
        int id_software FK
        varchar evaluador
        varchar estado
        char recomendacion FK
        smallint n_fortalezas
        smallint n_oportunidades
        smallint n_debilidades
        smallint n_amenazas
        timestamptz creado_en
    }
    EVALUACION_FACTOR {
        int id_evaluacion PK,FK
        smallint id_factor PK,FK
        smallint importancia_decisor
        varchar alcance
        numeric ponderacion
        varchar foda
    }
    EVALUACION_SUBFACTOR {
        int id_evaluacion PK,FK
        int id_subfactor PK,FK
        smallint valor
        text observacion
    }
    DIMENSION {
        smallint id_dimension PK
        varchar codigo
        varchar nombre
    }
    FACTOR {
        smallint id_factor PK
        smallint id_dimension FK
        varchar nombre
        smallint importancia_sugerida
        varchar alcance
    }
    SUBFACTOR {
        int id_subfactor PK
        smallint id_factor FK
        varchar enunciado
        smallint orden
    }
    REGLA_RECOMENDACION {
        char codigo PK
        varchar titulo
        text texto
    }
    NIVEL_IMPORTANCIA {
        smallint valor PK
        varchar etiqueta
    }
    NIVEL_CUMPLIMIENTO {
        smallint valor PK
        varchar etiqueta
    }
"""),

"07-arquitectura": ("Figura 7. Arquitectura del sistema", """
flowchart TB
    subgraph CLI["Cliente · navegador"]
        UI["Interfaz GUIOS PRO<br/>HTML · CSS · JavaScript"]
        EN["Motor de cálculo<br/>engine.js (probado)"]
        LS[("localStorage<br/>modo sin servidor")]
        UI <--> EN
        UI <--> LS
    end
    subgraph SRV["Servidor · Sprint 2+"]
        API["API REST<br/>evaluaciones · catálogo · indicadores"]
        AI["Servicio de IA<br/>sugerencias y resumen"]
        DB[("PostgreSQL<br/>db/schema.sql")]
        API <--> DB
        API <--> AI
    end
    UI <-->|"HTTPS / JSON"| API
    AI -->|"API del modelo"| LLM["Modelo de lenguaje"]
    DATA[("data/*.csv<br/>catálogo de la guía")] -->|"genera"| EN
    DATA -->|"genera"| DB
    style CLI fill:#eef0ff,stroke:#4f5bf5
    style SRV fill:#f7f7f9,stroke:#6b6f80
"""),

"08-flujo-calculo": ("Figura 8. Motor de cálculo: de las respuestas a la recomendación", """
flowchart LR
    IS["Importancia sugerida (IS)<br/><i>literatura + expertos</i>"] --> IR
    ID["Importancia del decisor (ID)<br/><i>la fija la organización</i>"] --> IR
    IR["Importancia relativa (IR)<br/>⌊(IS + ID) / 2⌋"] --> REL{"¿IR > Irrelevante?"}
    REL -->|No| EX["Factor excluido"]
    REL -->|Sí| SUB["Valoración de subfactores<br/>1 No cumple … 4 Cumple"]
    SUB --> PM["Ponderación media (PM)<br/>media de los subfactores"]
    PM --> FODA{"PM ≥ 3"}
    ALC["Alcance del factor<br/>Interno / Externo"] --> FODA
    FODA -->|"Sí · Interno"| F["Fortaleza"]
    FODA -->|"Sí · Externo"| O["Oportunidad"]
    FODA -->|"No · Interno"| DB2["Debilidad"]
    FODA -->|"No · Externo"| AM["Amenaza"]
    F --> REC
    O --> REC
    DB2 --> REC
    AM --> REC
    REC["Matriz de recomendación<br/>FODA × Importancia relativa"] --> RA["A· No es posible adoptar"]
    REC --> RB["B· Es posible adoptar con reservas"]
    REC --> RC["C· Adoptar"]
    style F fill:#e6f7ee,stroke:#1f9d61
    style O fill:#eef0ff,stroke:#4f5bf5
    style DB2 fill:#fff4df,stroke:#d98a0b
    style AM fill:#fdecec,stroke:#ef4444
    style RA fill:#fdecec,stroke:#ef4444
    style RB fill:#fff4df,stroke:#d98a0b
    style RC fill:#e6f7ee,stroke:#1f9d61
"""),

"09-cronograma": ("Figura 9. Cronograma de sprints", """
gantt
    title Cronograma del proyecto GUIOS PRO
    dateFormat YYYY-MM-DD
    axisFormat %d/%m
    section Hitos
    Entrega del avance (Sprint 0)  :milestone, m1, 2026-09-30, 0d
    Version 1.1 publicada          :milestone, m2, 2026-10-05, 0d
    Version 2.0 con servidor       :milestone, m3, 2026-11-02, 0d
    Entrega final                  :milestone, m4, 2026-11-30, 0d
    section Sprints
    Sprint 0 · Cimentacion                 :done,   s0, 2026-09-08, 14d
    Sprint 1 · Nuevas pantallas            :active, s1, 2026-09-22, 14d
    Sprint 2 · Catalogo, API e IA          :        s2, 2026-10-06, 14d
    Sprint 3 · Evaluaciones y asistente    :        s3, 2026-10-20, 14d
    Sprint 4 · Comparacion y dashboard     :        s4, 2026-11-03, 14d
    Sprint 5 · Cierre y entrega            :        s5, 2026-11-17, 14d
"""),

"10-navegacion": ("Figura 10. Mapa de navegación de la aplicación", """
flowchart TD
    N["Menú lateral"] --> IN["Inicio"]
    N --> EV["Evaluación"]
    N --> RE["Resultado"]
    N --> DA["Dashboard"]
    N --> CA["Catálogo de software"]
    N --> HI["Historial"]
    N --> AD["Administración"]
    IN --> P1["Paso 1· Importancia"]
    P1 --> P2["Paso 2· Cumplimiento"]
    P2 --> P3["Paso 3· Resultado"]
    P3 --> INF["Informe / Exportar PDF"]
    P3 --> CMP["Comparador de candidatos"]
    CA --> FICHA["Ficha del software"]
    HI --> DET["Detalle de evaluación"]
    DET --> INF
    style P1 fill:#eef0ff,stroke:#4f5bf5
    style P2 fill:#eef0ff,stroke:#4f5bf5
    style P3 fill:#eef0ff,stroke:#4f5bf5
"""),
}

HTML = """<!doctype html>
<html><head><meta charset="utf-8">
<style>
  body {{ margin:0; padding:28px; background:#fff; font-family:Inter,Segoe UI,Arial,sans-serif; }}
  .mermaid {{ display:inline-block; }}
</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
<pre class="mermaid">{codigo}</pre>
<script>
  mermaid.initialize({{ startOnLoad: true, theme: 'base', themeVariables: {tema},
    flowchart: {{ curve: 'basis', nodeSpacing: 40, rankSpacing: 50, useMaxWidth: false }},
    er: {{ useMaxWidth: false }}, gantt: {{ useMaxWidth: false }} }});
</script>
</body></html>
"""


def recortar(path):
    """Recorta el blanco sobrante y deja un margen uniforme."""
    try:
        from PIL import Image
    except ImportError:
        return
    im = Image.open(path).convert("RGB")
    fondo = Image.new("RGB", im.size, (255, 255, 255))
    from PIL import ImageChops
    caja = ImageChops.difference(im, fondo).getbbox()
    if not caja:
        return
    m = 32
    caja = (max(0, caja[0] - m), max(0, caja[1] - m), min(im.width, caja[2] + m), min(im.height, caja[3] + m))
    im.crop(caja).save(path)


def main():
    if not BROWSER:
        sys.exit("No se encontró Chrome/Edge.")
    OUT.mkdir(parents=True, exist_ok=True)
    tema = json.dumps(THEME)
    with tempfile.TemporaryDirectory() as tmp:
        perfil = Path(tmp) / "perfil"
        for nombre, (titulo, codigo) in DIAGRAMAS.items():
            html = Path(tmp) / f"{nombre}.html"
            html.write_text(HTML.format(codigo=codigo.strip(), tema=tema), encoding="utf-8")
            destino = OUT / f"{nombre}.png"
            subprocess.run([
                BROWSER, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                "--window-size=2000,1600", "--force-device-scale-factor=2",
                "--virtual-time-budget=8000", f"--user-data-dir={perfil}",
                f"--screenshot={destino}", html.as_uri(),
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            recortar(destino)
            print(f"OK -> {destino.relative_to(ROOT) if destino.is_relative_to(ROOT) else destino}  ({titulo})")


if __name__ == "__main__":
    main()
