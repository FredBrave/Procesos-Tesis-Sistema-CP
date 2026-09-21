"""Genera app/js/data.js a partir de los datos maestros en data/.

Uso:  python scripts/build_data.py

La app web se abre con doble clic (file://), por lo que no puede hacer fetch()
de los CSV. Este script los convierte en un único archivo JS embebido.
Ejecutar cada vez que se modifique data/*.csv o data/recomendaciones.json.
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "app" / "js" / "data.js"


def read_tsv(path):
    with open(path, encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh, delimiter="\t"))


def build():
    factors_meta = {r["Factor"].strip(): r for r in read_tsv(DATA / "factors.csv")}
    rows = read_tsv(DATA / "guiosad_data.csv")
    recom = json.loads((DATA / "recomendaciones.json").read_text(encoding="utf-8"))

    dimensions = []
    factors = []
    dim_index = {}
    fac_index = {}
    for row in rows:
        dname = row["Dimensión"].strip()
        fname = row["Factor"].strip()
        sname = row["Subfactor"].strip()
        if dname not in dim_index:
            dim_index[dname] = len(dimensions)
            dimensions.append({"id": f"D{len(dimensions) + 1}", "nombre": dname})
        if fname not in fac_index:
            meta = factors_meta.get(fname)
            if meta is None:
                raise SystemExit(f"Factor sin metadatos en factors.csv: {fname}")
            fac_index[fname] = len(factors)
            factors.append({
                "id": f"F{len(factors) + 1:02d}",
                "nombre": fname,
                "dimension": dimensions[dim_index[dname]]["id"],
                "importanciaSugerida": int(meta["Sugerida"]),
                "alcance": meta["Alcance"].strip(),
                "subfactores": [],
            })
        f = factors[fac_index[fname]]
        f["subfactores"].append({
            "id": f"{f['id']}-S{len(f['subfactores']) + 1:02d}",
            "nombre": sname,
        })

    payload = {
        "version": "1.0.0",
        "dimensiones": dimensions,
        "factores": factors,
        "nivelesImportancia": recom["niveles_importancia"],
        "nivelesSubfactor": recom["niveles_subfactor"],
        "umbralFoda": recom["umbral_foda"],
        "reglas": recom["reglas"],
    }
    total_sub = sum(len(f["subfactores"]) for f in factors)
    js = (
        "// ARCHIVO GENERADO — no editar a mano. Fuente: data/*.csv y data/recomendaciones.json\n"
        "// Regenerar con: python scripts/build_data.py\n"
        f"// {len(dimensions)} dimensiones, {len(factors)} factores, {total_sub} subfactores\n"
        "window.GUIOS_DATA = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n"
    )
    OUT.write_text(js, encoding="utf-8")
    print(f"OK -> {OUT.relative_to(ROOT)}: {len(dimensions)} dimensiones, {len(factors)} factores, {total_sub} subfactores")


if __name__ == "__main__":
    build()
