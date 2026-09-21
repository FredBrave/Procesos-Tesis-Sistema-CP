-- ============================================================================
-- GUIOS PRO — Diseño físico de base de datos (PostgreSQL 14+)
-- Sprint 0 · Modelo de datos para la versión multiusuario (Sprint 2+).
-- La app web actual (app/) funciona sin servidor; este esquema es el destino
-- de la migración descrita en docs/PLAN-DESARROLLO-IA.md.
--
-- Cargar:  psql -U postgres -d guiospro -f db/schema.sql
--          psql -U postgres -d guiospro -f db/seed.sql   (generado por scripts/build_seed_sql.py)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Catálogos de la guía GUIOS (datos maestros, se cargan con seed.sql)
-- ---------------------------------------------------------------------------
CREATE TABLE dimension (
    id_dimension    SMALLSERIAL PRIMARY KEY,
    codigo          VARCHAR(5)   NOT NULL UNIQUE,          -- D1, D2, D3
    nombre          VARCHAR(50)  NOT NULL UNIQUE,          -- Tecnológica, Organizacional, Económica
    descripcion     TEXT
);

CREATE TABLE factor (
    id_factor              SMALLSERIAL PRIMARY KEY,
    codigo                 VARCHAR(5)   NOT NULL UNIQUE,   -- F01..F18
    id_dimension           SMALLINT     NOT NULL REFERENCES dimension(id_dimension) ON DELETE RESTRICT,
    nombre                 VARCHAR(120) NOT NULL,
    importancia_sugerida   SMALLINT     NOT NULL CHECK (importancia_sugerida BETWEEN 1 AND 4),
    alcance                VARCHAR(10)  NOT NULL CHECK (alcance IN ('Interno', 'Externo', 'Ambos')),
    orden                  SMALLINT     NOT NULL,
    UNIQUE (id_dimension, nombre)
);

CREATE TABLE subfactor (
    id_subfactor    SERIAL PRIMARY KEY,
    codigo          VARCHAR(10)  NOT NULL UNIQUE,          -- F01-S01 ...
    id_factor       SMALLINT     NOT NULL REFERENCES factor(id_factor) ON DELETE CASCADE,
    enunciado       VARCHAR(300) NOT NULL,
    orden           SMALLINT     NOT NULL,
    UNIQUE (id_factor, orden)
);

-- Escalas (1..4) usadas por la guía
CREATE TABLE nivel_importancia (
    valor   SMALLINT PRIMARY KEY CHECK (valor BETWEEN 1 AND 4),
    etiqueta VARCHAR(40) NOT NULL UNIQUE                   -- Irrelevante, Opcional, Importante, Fundamental
);

CREATE TABLE nivel_cumplimiento (
    valor   SMALLINT PRIMARY KEY CHECK (valor BETWEEN 1 AND 4),
    etiqueta VARCHAR(60) NOT NULL UNIQUE                   -- No cumple ... Cumple el requisito
);

-- Matriz de recomendación (A, B, C). Las condiciones se evalúan en orden.
CREATE TABLE regla_recomendacion (
    codigo            CHAR(1)      PRIMARY KEY,            -- A, B, C
    orden             SMALLINT     NOT NULL UNIQUE,
    titulo            VARCHAR(80)  NOT NULL,
    tono              VARCHAR(10)  NOT NULL CHECK (tono IN ('danger', 'warning', 'success')),
    foda_condicion    TEXT[],                              -- NULL = regla por defecto
    importancia_condicion TEXT[],
    texto             TEXT         NOT NULL
);

-- ---------------------------------------------------------------------------
-- Usuarios y organizaciones
-- ---------------------------------------------------------------------------
CREATE TABLE organizacion (
    id_organizacion SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    sector          VARCHAR(80),
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE usuario (
    id_usuario      SERIAL PRIMARY KEY,
    id_organizacion INT          REFERENCES organizacion(id_organizacion) ON DELETE SET NULL,
    nombre          VARCHAR(120) NOT NULL,
    email           VARCHAR(160) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,                 -- bcrypt / argon2
    rol             VARCHAR(20)  NOT NULL CHECK (rol IN ('Administrador', 'Evaluador', 'Decisor')),
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Software candidato y evaluaciones
-- ---------------------------------------------------------------------------
CREATE TABLE software_candidato (
    id_software     SERIAL PRIMARY KEY,
    id_organizacion INT          REFERENCES organizacion(id_organizacion) ON DELETE CASCADE,
    nombre          VARCHAR(120) NOT NULL,
    version         VARCHAR(40),
    tipo_licencia   VARCHAR(60),                           -- FLOSS permisiva, copyleft, privativa...
    proveedor       VARCHAR(120),
    url             VARCHAR(255),
    registrado_por  INT          REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE evaluacion (
    id_evaluacion   SERIAL PRIMARY KEY,
    id_software     INT          NOT NULL REFERENCES software_candidato(id_software) ON DELETE CASCADE,
    id_evaluador    INT          NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    estado          VARCHAR(15)  NOT NULL DEFAULT 'En proceso'
                    CHECK (estado IN ('En proceso', 'Completada', 'Cancelada')),
    -- Resultados consolidados (se recalculan al completar; fuente de verdad = detalle)
    recomendacion   CHAR(1)      REFERENCES regla_recomendacion(codigo),
    n_fortalezas    SMALLINT     NOT NULL DEFAULT 0,
    n_oportunidades SMALLINT     NOT NULL DEFAULT 0,
    n_debilidades   SMALLINT     NOT NULL DEFAULT 0,
    n_amenazas      SMALLINT     NOT NULL DEFAULT 0,
    observaciones   TEXT,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completado_en   TIMESTAMPTZ
);

-- Paso 1-2: importancia asignada por el decisor y alcance elegido, por factor
CREATE TABLE evaluacion_factor (
    id_evaluacion        INT      NOT NULL REFERENCES evaluacion(id_evaluacion) ON DELETE CASCADE,
    id_factor            SMALLINT NOT NULL REFERENCES factor(id_factor),
    importancia_decisor  SMALLINT NOT NULL REFERENCES nivel_importancia(valor),
    alcance              VARCHAR(10) NOT NULL CHECK (alcance IN ('Interno', 'Externo')),
    -- Derivados (columnas generadas para consultas rápidas)
    ponderacion          NUMERIC(4,2),                     -- media de subfactores; NULL si incompleto
    foda                 VARCHAR(12) CHECK (foda IN ('Fortaleza', 'Oportunidad', 'Debilidad', 'Amenaza')),
    PRIMARY KEY (id_evaluacion, id_factor)
);

-- Paso 3-4: valoración de cada subfactor
CREATE TABLE evaluacion_subfactor (
    id_evaluacion   INT      NOT NULL REFERENCES evaluacion(id_evaluacion) ON DELETE CASCADE,
    id_subfactor    INT      NOT NULL REFERENCES subfactor(id_subfactor),
    valor           SMALLINT NOT NULL REFERENCES nivel_cumplimiento(valor),
    observacion     TEXT,
    PRIMARY KEY (id_evaluacion, id_subfactor)
);

-- ---------------------------------------------------------------------------
-- Vistas de apoyo
-- ---------------------------------------------------------------------------
-- Importancia relativa = niveles[ floor((sugerida-1 + decisor-1) / 2) + 1 ]
CREATE VIEW v_evaluacion_factor AS
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
JOIN factor f            ON f.id_factor = ef.id_factor
JOIN dimension d         ON d.id_dimension = f.id_dimension
JOIN nivel_importancia ni ON ni.valor = ((f.importancia_sugerida - 1 + ef.importancia_decisor - 1) / 2) + 1;

CREATE INDEX idx_evaluacion_software  ON evaluacion(id_software);
CREATE INDEX idx_evaluacion_evaluador ON evaluacion(id_evaluador);
CREATE INDEX idx_subfactor_factor     ON subfactor(id_factor);

COMMIT;
