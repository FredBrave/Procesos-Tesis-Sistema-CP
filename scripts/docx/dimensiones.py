"""Actualiza scripts/docx/img.json con el tamaño de cada figura y captura."""
from PIL import Image
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
d = {}
for carpeta in ("docs/graficos", "docs/capturas"):
    for p in sorted((ROOT / carpeta).glob("*.png")):
        d[p.name] = Image.open(p).size
salida = ROOT / "scripts" / "docx" / "img.json"
salida.write_text(json.dumps(d, indent=1), encoding="utf-8")
print(f"OK -> {salida.relative_to(ROOT)} ({len(d)} imágenes)")
