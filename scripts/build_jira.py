"""Genera el CSV importable a Jira y la tabla legible de tareas.

Uso:  python scripts/build_jira.py

Fuente de verdad: docs/jira/tareas.json
Salidas (no editar a mano):
  docs/jira/backlog-jira.csv  -> importar en Jira (Configuración › Importar datos externos › CSV)
  docs/jira/TAREAS.md         -> reparto completo por sprint y por desarrollador
"""
import csv
import json
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "jira" / "tareas.json"
OUT_CSV = ROOT / "docs" / "jira" / "backlog-jira.csv"
OUT_MD = ROOT / "docs" / "jira" / "TAREAS.md"

# Columnas del importador de Jira. "Labels" aparece dos veces a propósito:
# el importador admite columnas repetidas para campos multivalor.
COLUMNS = [
    "Issue Type",
    "Summary",
    "Description",
    "Priority",
    "Story Points",
    "Sprint",
    "Assignee",
    "Component",
    "Labels",
    "Labels",
    "Epic Name",
    "Epic Link",
    "Due Date",
]


def load():
    return json.loads(SRC.read_text(encoding="utf-8"))


def sprint_name(sprints, n):
    for s in sprints:
        if s["n"] == n:
            return s["nombre"]
    return f"Sprint {n}"


def sprint_end(sprints, n):
    for s in sprints:
        if s["n"] == n:
            return s["fin"]
    return ""


def description(task, tasks_by_id):
    """Descripción en una sola línea: Jira importa mejor así y se lee igual en el ticket."""
    partes = [task["descripcion"], f"Criterios de aceptación: {task['criterios']}"]
    deps = task.get("depende_de") or []
    if deps:
        nombres = [f"{d} ({tasks_by_id[d]['resumen']})" if d in tasks_by_id else d for d in deps]
        partes.append("Depende de: " + "; ".join(nombres))
    partes.append(f"Ficha: docs/jira/TAREAS.md ({task['id']})")
    return " · ".join(partes)


def build_rows(data):
    equipo = {d["id"]: d for d in data["equipo"]}
    epicas = {e["id"]: e for e in data["epicas"]}
    tasks_by_id = {t["id"]: t for t in data["tareas"]}
    sprints = data["sprints"]
    rows = []

    for e in data["epicas"]:
        rows.append({
            "Issue Type": "Epic",
            "Summary": e["nombre"],
            "Description": e["descripcion"],
            "Priority": "High",
            "Story Points": "",
            "Sprint": "",
            "Assignee": equipo[e["dev"]]["alias"],
            "Component": e["componente"],
            "Labels": [equipo[e["dev"]]["alias"], "epica"],
            "Epic Name": e["nombre"],
            "Epic Link": "",
            "Due Date": "",
        })

    for t in data["tareas"]:
        epica = epicas[t["epica"]]
        dev = equipo[t["dev"]]
        rows.append({
            "Issue Type": {"Historia": "Story", "Tarea": "Task", "Spike": "Task", "Bug": "Bug"}[t["tipo"]],
            "Summary": t["resumen"],
            "Description": description(t, tasks_by_id),
            "Priority": t["prioridad"],
            "Story Points": t["puntos"],
            "Sprint": sprint_name(sprints, t["sprint"]),
            "Assignee": dev["alias"],
            "Component": epica["componente"],
            "Labels": [dev["alias"], f"sprint-{t['sprint']}"],
            "Epic Name": "",
            "Epic Link": epica["nombre"],
            "Due Date": sprint_end(sprints, t["sprint"]),
        })
    return rows


def write_csv(rows):
    with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(COLUMNS)
        for r in rows:
            labels = r["Labels"] if isinstance(r["Labels"], list) else [r["Labels"], ""]
            labels = (labels + ["", ""])[:2]
            w.writerow([
                r["Issue Type"], r["Summary"], r["Description"], r["Priority"], r["Story Points"],
                r["Sprint"], r["Assignee"], r["Component"], labels[0], labels[1],
                r["Epic Name"], r["Epic Link"], r["Due Date"],
            ])


def write_md(data):
    equipo = {d["id"]: d for d in data["equipo"]}
    epicas = {e["id"]: e for e in data["epicas"]}
    tareas = data["tareas"]
    sprints = [s for s in data["sprints"] if s["n"] > 0]

    L = []
    L.append("# Tareas del proyecto GUIOS PRO\n")
    L.append("> ARCHIVO GENERADO — no editar a mano. Fuente: `docs/jira/tareas.json`.")
    L.append("> Regenerar con `python scripts/build_jira.py`. Para importar en Jira use `docs/jira/backlog-jira.csv`.\n")
    L.append("Reparto, cronograma y forma de montar el tablero: [`docs/EQUIPO-Y-CRONOGRAMA.md`](../EQUIPO-Y-CRONOGRAMA.md).\n")

    # Resumen por desarrollador
    L.append("## Carga por desarrollador\n")
    cab = "| Desarrollador | Rol | " + " | ".join(f"S{s['n']}" for s in sprints) + " | Tareas | Puntos |"
    L.append(cab)
    L.append("|---|---|" + "---|" * (len(sprints) + 2))
    for d in data["equipo"]:
        propias = [t for t in tareas if t["dev"] == d["id"]]
        por_sprint = [sum(t["puntos"] for t in propias if t["sprint"] == s["n"]) for s in sprints]
        L.append(
            f"| **Dev {d['id']}** (`{d['alias']}`) | {d['rol']} | "
            + " | ".join(str(p) for p in por_sprint)
            + f" | {len(propias)} | {sum(t['puntos'] for t in propias)} |"
        )
    total_pts = sum(t["puntos"] for t in tareas)
    L.append(f"| | **Total equipo** | " + " | ".join(str(sum(t["puntos"] for t in tareas if t["sprint"] == s["n"])) for s in sprints) + f" | {len(tareas)} | {total_pts} |")
    L.append("")

    # Detalle por sprint
    for s in sprints:
        del_sprint = [t for t in tareas if t["sprint"] == s["n"]]
        ini = datetime.strptime(s["inicio"], "%Y-%m-%d").strftime("%d/%m/%Y")
        fin = datetime.strptime(s["fin"], "%Y-%m-%d").strftime("%d/%m/%Y")
        L.append(f"## {s['nombre']}\n")
        L.append(f"**{ini} – {fin}** · {sum(t['puntos'] for t in del_sprint)} puntos · {len(del_sprint)} tareas · Estado: {s['estado']}\n")
        L.append(f"*Objetivo:* {s['objetivo']}\n")
        L.append("| ID | Dev | Tipo | Tarea | Épica | Pts | Prioridad | Depende de |")
        L.append("|---|---|---|---|---|---|---|---|")
        for t in sorted(del_sprint, key=lambda x: (x["dev"], x["id"])):
            deps = ", ".join(t.get("depende_de") or []) or "—"
            L.append(
                f"| `{t['id']}` | {t['dev']} | {t['tipo']} | **{t['resumen']}**<br /><span>{t['descripcion']}</span><br /><em>Aceptación:</em> {t['criterios']} | {epicas[t['epica']]['nombre']} | {t['puntos']} | {t['prioridad']} | {deps} |"
            )
        L.append("")

    OUT_MD.write_text("\n".join(L), encoding="utf-8")


def main():
    data = load()
    # Validaciones básicas de integridad
    ids = {t["id"] for t in data["tareas"]}
    epicas = {e["id"] for e in data["epicas"]}
    devs = {d["id"] for d in data["equipo"]}
    sprints = {s["n"] for s in data["sprints"]}
    for t in data["tareas"]:
        assert t["epica"] in epicas, f"{t['id']}: épica desconocida {t['epica']}"
        assert t["dev"] in devs, f"{t['id']}: desarrollador desconocido {t['dev']}"
        assert t["sprint"] in sprints, f"{t['id']}: sprint desconocido {t['sprint']}"
        for d in t.get("depende_de") or []:
            assert d in ids, f"{t['id']}: depende de una tarea inexistente {d}"

    rows = build_rows(data)
    write_csv(rows)
    write_md(data)
    print(f"OK -> {OUT_CSV.relative_to(ROOT)} ({len(rows)} filas: {len(data['epicas'])} épicas + {len(data['tareas'])} tareas)")
    print(f"OK -> {OUT_MD.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
