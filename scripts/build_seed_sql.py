"""Genera db/seed.sql (catálogos GUIOS) a partir de app/js/data.js.

Uso:  python scripts/build_data.py && python scripts/build_seed_sql.py

Así los CSV de data/ son la única fuente de verdad tanto para la app web
como para la base de datos PostgreSQL.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "app" / "js" / "data.js"
OUT = ROOT / "db" / "seed.sql"


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def sql_array(values):
    return "ARRAY[" + ", ".join(q(v) for v in values) + "]::TEXT[]"


def main():
    js = DATA_JS.read_text(encoding="utf-8")
    payload = json.loads(re.search(r"window\.GUIOS_DATA = (\{.*\});\s*$", js, re.S).group(1))

    lines = [
        "-- ARCHIVO GENERADO — no editar a mano. Fuente: data/*.csv y data/recomendaciones.json",
        "-- Regenerar con: python scripts/build_data.py && python scripts/build_seed_sql.py",
        "BEGIN;",
        "",
        "INSERT INTO nivel_importancia (valor, etiqueta) VALUES",
        ",\n".join(f"  ({i + 1}, {q(l)})" for i, l in enumerate(payload["nivelesImportancia"])) + ";",
        "",
        "INSERT INTO nivel_cumplimiento (valor, etiqueta) VALUES",
        ",\n".join(f"  ({i + 1}, {q(l)})" for i, l in enumerate(payload["nivelesSubfactor"])) + ";",
        "",
        "INSERT INTO dimension (codigo, nombre) VALUES",
        ",\n".join(f"  ({q(d['id'])}, {q(d['nombre'])})" for d in payload["dimensiones"]) + ";",
        "",
        "INSERT INTO factor (codigo, id_dimension, nombre, importancia_sugerida, alcance, orden) VALUES",
    ]
    rows = []
    for i, f in enumerate(payload["factores"]):
        rows.append(
            f"  ({q(f['id'])}, (SELECT id_dimension FROM dimension WHERE codigo = {q(f['dimension'])}), "
            f"{q(f['nombre'])}, {f['importanciaSugerida']}, {q(f['alcance'])}, {i + 1})"
        )
    lines.append(",\n".join(rows) + ";")
    lines += ["", "INSERT INTO subfactor (codigo, id_factor, enunciado, orden) VALUES"]
    rows = []
    for f in payload["factores"]:
        for j, s in enumerate(f["subfactores"]):
            rows.append(
                f"  ({q(s['id'])}, (SELECT id_factor FROM factor WHERE codigo = {q(f['id'])}), {q(s['nombre'])}, {j + 1})"
            )
    lines.append(",\n".join(rows) + ";")
    lines += ["", "INSERT INTO regla_recomendacion (codigo, orden, titulo, tono, foda_condicion, importancia_condicion, texto) VALUES"]
    rows = []
    for i, r in enumerate(payload["reglas"]):
        cond = r.get("condicion")
        foda = sql_array(cond["foda"]) if cond else "NULL"
        imp = sql_array(cond["importancia_relativa"]) if cond else "NULL"
        rows.append(f"  ({q(r['codigo'])}, {i + 1}, {q(r['titulo'])}, {q(r['tono'])}, {foda}, {imp}, {q(r['texto'])})")
    lines.append(",\n".join(rows) + ";")
    lines += ["", "COMMIT;", ""]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"OK -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
