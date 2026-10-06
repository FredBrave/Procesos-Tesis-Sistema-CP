"""Genera capturas de las pantallas de la app con Chrome/Edge headless.

Uso:  python scripts/screenshots.py [carpeta_salida]   (por defecto docs/capturas/)

Sirve para (a) incluir imágenes en el informe y (b) que un agente de IA verifique
visualmente un cambio de diseño sin abrir el navegador a mano.
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = (ROOT / "app" / "index.html").resolve().as_uri()
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs" / "capturas"

CANDIDATES = [
    shutil.which("chrome"),
    shutil.which("google-chrome"),
    shutil.which("msedge"),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]
BROWSER = next((c for c in CANDIDATES if c and Path(c).exists()), None)

# (nombre, hash, query, ancho, alto)
SHOTS = [
    ("00-inicio", "inicio", "?demo=1&theme=light", 1280, 900),
    ("01-paso-1-2", "paso-1-2", "?theme=light", 1280, 1300),
    ("02-paso-3-4", "paso-3-4", "?demo=1&theme=light", 1280, 1000),
    ("03-paso-5-6", "paso-5-6", "?demo=1&theme=light", 1280, 1300),
    ("04-movil-paso-5-6", "paso-5-6", "?demo=1&theme=light", 500, 1400),  # Chrome no baja de ~500 px de ventana
    ("05-modo-oscuro", "paso-5-6", "?demo=1&theme=dark", 1280, 1100),
    ("06-panel", "panel", "?demo=1&theme=light", 1280, 1000),
    ("07-panel-oscuro", "panel", "?demo=1&theme=dark", 1280, 1000),
    ("08-movil-panel", "panel", "?demo=1&theme=light", 500, 1500),
    ("09-panel-vacio", "panel", "?theme=light", 1280, 800),
    ("10-paso-3-4-vacio", "paso-3-4", "?theme=light", 1280, 900),
    ("11-movil-paso-1-2", "paso-1-2", "?theme=light", 500, 1400),
]


def main():
    if not BROWSER:
        sys.exit("No se encontró Chrome/Edge. Instale uno o añada su ruta a CANDIDATES.")
    OUT.mkdir(parents=True, exist_ok=True)
    for name, frag, query, w, h in SHOTS:
        # Perfil nuevo por captura: el localStorage del demo no se filtra a las demás.
        with tempfile.TemporaryDirectory() as profile:
            target = OUT / f"{name}.png"
            url = f"{APP}{query}#{frag}"
            subprocess.run(
                [
                    BROWSER,
                    "--headless=new",
                    "--disable-gpu",
                    "--hide-scrollbars",
                    f"--window-size={w},{h}",
                    "--virtual-time-budget=4000",
                    f"--user-data-dir={profile}",
                    f"--screenshot={target}",
                    url,
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            print(f"OK -> {target.relative_to(ROOT) if target.is_relative_to(ROOT) else target}")


if __name__ == "__main__":
    main()
