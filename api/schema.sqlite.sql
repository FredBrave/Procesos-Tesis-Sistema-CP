-- ============================================================================
-- GUIOS PRO — Esquema SQLite del servidor REST (api/)
--
-- NOTA: este archivo es el EQUIVALENTE SQLite del diseño PostgreSQL de
-- db/schema.sql, usado para el despliegue de demostración (node:sqlite, sin
-- dependencias ni servidor de BD). Mantiene las mismas tablas normalizadas
-- (dimension, factor, subfactor, niveles, regla_recomendacion, organizacion,
-- software_candidato, evaluacion, evaluacion_factor, evaluacion_subfactor) y
-- añade solo lo que el contrato de la API necesita:
--   * `codigo` de texto en software_candidato/evaluacion: id generado por el cliente
--     (sw_…, ev_…), único por organización; la clave primaria sigue siendo entera.
--   * evaluacion.revision, huella (detección de cambios/idempotencia),
--     catalogo_version (RNF-08/17), actualizado_en, avance y extras_json
--     (origenIA, resumen, plantilla, datos del software en la evaluación).
--   * evaluacion.id_software admite NULL (evaluación sin software del catálogo).
--   * evaluacion_subfactor.valor admite NULL (observación sin valoración) y
--     tiene columna `enlace` (HU-12).
--   * Tablas nuevas: plantilla_importancia (HU-37) y uso_ia (límite diario, RNF-14).
-- Diferencias de dialecto: SERIAL -> INTEGER PRIMARY KEY, TIMESTAMPTZ -> TEXT
-- ISO 8601 (UTC), TEXT[] -> TEXT con JSON, NUMERIC(4,2) -> REAL (sin redondeo,
-- para que la ponderación sea idéntica a la del navegador, RNF-11).
-- Se aplica automáticamente al arrancar (CREATE ... IF NOT EXISTS).
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Catálogos de la guía GUIOS (se sincronizan desde app/js/data.js al arrancar)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dimension (
    id_dimension    INTEGER PRIMARY KEY,
    codigo          TEXT NOT NULL UNIQUE CHECK (length(codigo) <= 5),
    nombre          TEXT NOT NULL UNIQUE CHECK (length(nombre) <= 50),
    descripcion     TEXT
);

CREATE TABLE IF NOT EXISTS factor (
    id_factor              INTEGER PRIMARY KEY,
    codigo                 TEXT NOT NULL UNIQUE CHECK (length(codigo) <= 5),
    id_dimension           INTEGER NOT NULL REFERENCES dimension(id_dimension) ON DELETE RESTRICT,
    nombre                 TEXT NOT NULL CHECK (length(nombre) <= 120),
    importancia_sugerida   INTEGER NOT NULL CHECK (importancia_sugerida BETWEEN 1 AND 4),
    alcance                TEXT NOT NULL CHECK (alcance IN ('Interno', 'Externo', 'Ambos')),
    orden                  INTEGER NOT NULL,
    UNIQUE (id_dimension, nombre)
);

CREATE TABLE IF NOT EXISTS subfactor (
    id_subfactor    INTEGER PRIMARY KEY,
    codigo          TEXT NOT NULL UNIQUE CHECK (length(codigo) <= 10),
    id_factor       INTEGER NOT NULL REFERENCES factor(id_factor) ON DELETE CASCADE,
    enunciado       TEXT NOT NULL CHECK (length(enunciado) <= 300),
    orden           INTEGER NOT NULL,
    UNIQUE (id_factor, orden)
);

CREATE TABLE IF NOT EXISTS nivel_importancia (
    valor    INTEGER PRIMARY KEY CHECK (valor BETWEEN 1 AND 4),
    etiqueta TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS nivel_cumplimiento (
    valor    INTEGER PRIMARY KEY CHECK (valor BETWEEN 1 AND 4),
    etiqueta TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS regla_recomendacion (
    codigo                TEXT PRIMARY KEY CHECK (codigo IN ('A', 'B', 'C')),
    orden                 INTEGER NOT NULL UNIQUE,
    titulo                TEXT NOT NULL,
    tono                  TEXT NOT NULL CHECK (tono IN ('danger', 'warning', 'success')),
    foda_condicion        TEXT,      -- JSON array; NULL = regla por defecto
    importancia_condicion TEXT,      -- JSON array
    texto                 TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Organizaciones (sin cuentas de usuario: se identifican por la cabecera X-Organizacion)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizacion (
    id_organizacion INTEGER PRIMARY KEY,
    nombre          TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(nombre) <= 150),
    sector          TEXT,
    creado_en       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------------------
-- Software candidato y evaluaciones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS software_candidato (
    id_software     INTEGER PRIMARY KEY,
    codigo          TEXT NOT NULL,                         -- id del cliente (sw_…)
    id_organizacion INTEGER NOT NULL REFERENCES organizacion(id_organizacion) ON DELETE CASCADE,
    nombre          TEXT NOT NULL CHECK (length(nombre) BETWEEN 1 AND 120),
    version         TEXT CHECK (length(version) <= 40),
    tipo_licencia   TEXT CHECK (length(tipo_licencia) <= 60),
    proveedor       TEXT CHECK (length(proveedor) <= 120),
    url             TEXT CHECK (length(url) <= 255),
    notas           TEXT,
    etiquetas_json  TEXT NOT NULL DEFAULT '[]',            -- [{nombre,color}] (HU-39)
    creado_en       TEXT NOT NULL,
    actualizado_en  TEXT NOT NULL,
    UNIQUE (id_organizacion, codigo)
);

CREATE TABLE IF NOT EXISTS evaluacion (
    id_evaluacion   INTEGER PRIMARY KEY,
    codigo          TEXT NOT NULL,                         -- id del cliente (ev_…)
    id_organizacion INTEGER NOT NULL REFERENCES organizacion(id_organizacion) ON DELETE CASCADE,
    id_software     INTEGER REFERENCES software_candidato(id_software) ON DELETE CASCADE,
    evaluador       TEXT CHECK (length(evaluador) <= 120),
    estado          TEXT NOT NULL DEFAULT 'En proceso'
                    CHECK (estado IN ('En proceso', 'Completada', 'Cancelada')),
    -- Resultados consolidados (los recalcula engine.evaluate en cada guardado)
    recomendacion   TEXT REFERENCES regla_recomendacion(codigo),
    n_fortalezas    INTEGER NOT NULL DEFAULT 0,
    n_oportunidades INTEGER NOT NULL DEFAULT 0,
    n_debilidades   INTEGER NOT NULL DEFAULT 0,
    n_amenazas      INTEGER NOT NULL DEFAULT 0,
    avance          INTEGER NOT NULL DEFAULT 0 CHECK (avance BETWEEN 0 AND 100),
    observaciones   TEXT,
    paso1_confirmado INTEGER NOT NULL DEFAULT 0 CHECK (paso1_confirmado IN (0, 1)),
    catalogo_version TEXT NOT NULL,
    extras_json     TEXT NOT NULL DEFAULT '{}',            -- software, origenIA, resumen, plantilla
    revision        INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
    huella          TEXT NOT NULL,                         -- sha256 del contenido normalizado
    creado_en       TEXT NOT NULL,
    actualizado_en  TEXT NOT NULL,
    completado_en   TEXT,
    UNIQUE (id_organizacion, codigo)
);

-- Paso 1-2: importancia asignada por el decisor y alcance, por factor
CREATE TABLE IF NOT EXISTS evaluacion_factor (
    id_evaluacion        INTEGER NOT NULL REFERENCES evaluacion(id_evaluacion) ON DELETE CASCADE,
    id_factor            INTEGER NOT NULL REFERENCES factor(id_factor),
    importancia_decisor  INTEGER NOT NULL REFERENCES nivel_importancia(valor),
    alcance              TEXT NOT NULL CHECK (alcance IN ('Interno', 'Externo')),
    ponderacion          REAL,                             -- media de subfactores; NULL si incompleto/no relevante
    foda                 TEXT CHECK (foda IN ('Fortaleza', 'Oportunidad', 'Debilidad', 'Amenaza')),
    PRIMARY KEY (id_evaluacion, id_factor)
);

-- Paso 3-4: valoración y evidencia de cada subfactor
CREATE TABLE IF NOT EXISTS evaluacion_subfactor (
    id_evaluacion   INTEGER NOT NULL REFERENCES evaluacion(id_evaluacion) ON DELETE CASCADE,
    id_subfactor    INTEGER NOT NULL REFERENCES subfactor(id_subfactor),
    valor           INTEGER REFERENCES nivel_cumplimiento(valor),   -- NULL = observación sin valoración
    observacion     TEXT,
    enlace          TEXT CHECK (length(enlace) <= 500),
    PRIMARY KEY (id_evaluacion, id_subfactor)
);

-- Plantillas de importancia reutilizables (HU-37)
CREATE TABLE IF NOT EXISTS plantilla_importancia (
    id_plantilla    INTEGER PRIMARY KEY,
    codigo          TEXT NOT NULL,                         -- id del cliente (pl_…)
    id_organizacion INTEGER NOT NULL REFERENCES organizacion(id_organizacion) ON DELETE CASCADE,
    nombre          TEXT NOT NULL CHECK (length(nombre) BETWEEN 1 AND 120),
    decisor_json    TEXT NOT NULL DEFAULT '{}',
    alcance_json    TEXT NOT NULL DEFAULT '{}',
    creado_en       TEXT NOT NULL,
    actualizado_en  TEXT NOT NULL,
    UNIQUE (id_organizacion, codigo)
);

-- Consumo del asistente de IA por organización y día (RNF-14)
CREATE TABLE IF NOT EXISTS uso_ia (
    id_organizacion INTEGER NOT NULL REFERENCES organizacion(id_organizacion) ON DELETE CASCADE,
    fecha           TEXT NOT NULL,                         -- YYYY-MM-DD (UTC)
    llamadas        INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (id_organizacion, fecha)
);

-- ---------------------------------------------------------------------------
-- Vista de apoyo (equivalente a v_evaluacion_factor de PostgreSQL)
-- ---------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_evaluacion_factor AS
SELECT ef.id_evaluacion,
       f.codigo                                   AS factor,
       f.nombre,
       d.nombre                                   AS dimension,
       f.importancia_sugerida,
       ef.importancia_decisor,
       ((f.importancia_sugerida - 1 + ef.importancia_decisor - 1) / 2) + 1 AS importancia_relativa,
       ni.etiqueta                                AS importancia_relativa_lbl,
       ef.alcance,
       ef.ponderacion,
       ef.foda
FROM evaluacion_factor ef
JOIN factor f             ON f.id_factor = ef.id_factor
JOIN dimension d          ON d.id_dimension = f.id_dimension
JOIN nivel_importancia ni ON ni.valor = ((f.importancia_sugerida - 1 + ef.importancia_decisor - 1) / 2) + 1;

CREATE INDEX IF NOT EXISTS idx_software_org        ON software_candidato(id_organizacion, nombre);
CREATE INDEX IF NOT EXISTS idx_evaluacion_software ON evaluacion(id_software);
CREATE INDEX IF NOT EXISTS idx_evaluacion_org_fecha ON evaluacion(id_organizacion, actualizado_en DESC);
CREATE INDEX IF NOT EXISTS idx_subfactor_factor    ON subfactor(id_factor);
CREATE INDEX IF NOT EXISTS idx_plantilla_org       ON plantilla_importancia(id_organizacion);
