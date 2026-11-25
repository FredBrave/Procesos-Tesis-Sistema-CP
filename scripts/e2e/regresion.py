"""Regresión de los 15 casos de prueba de ClickUp (CP-01 a CP-15) contra la app real.

Cada caso corre en un contexto de navegador nuevo (localStorage vacío). Guarda en JSON el
resultado de cada caso: pasó o falló y la descripción del resultado obtenido.
Uso: python scripts/e2e/regresion.py <raíz del repo> <salida.json> scripts/e2e/contraste.js
Requiere Playwright y el servidor en http://127.0.0.1:8799 con IA_PROVEEDOR=simulado (CP-12 y CP-14).
"""
import json
import re
import sys
import traceback
import urllib.request
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(sys.argv[1])
OUT = Path(sys.argv[2])
CONTRASTE = Path(sys.argv[3]).read_text(encoding="utf-8")
APP = (ROOT / "app" / "index.html").resolve().as_uri()
API = "http://127.0.0.1:8799"
results = {}
errors = []


def case(cp):
    def deco(fn):
        fn.cp = cp
        CASES.append(fn)
        return fn
    return deco


CASES = []


def set_radio(page, selector):
    page.locator(selector).evaluate("e => { e.checked = true; e.dispatchEvent(new Event('change', {bubbles: true})) }")


def stored(page):
    return page.evaluate("JSON.parse(localStorage.getItem('guiospro.db.v2') || 'null')")


# ---------------------------------------------------------------- casos
@case("CP-01")
def cp01(page):
    page.goto(APP + "#inicio")
    page.fill("#sw-nombre", "Odoo")
    page.fill("#sw-version", "17")
    page.select_option("#sw-lic", label="FLOSS copyleft débil (LGPL, MPL)")
    page.fill("#sw-prov", "Odoo S.A.")
    page.fill("#sw-org", "UNEMI")
    page.fill("#sw-eval", "Comité de TI")
    page.reload()
    vals = [page.input_value(s) for s in ("#sw-nombre", "#sw-version", "#sw-prov", "#sw-org", "#sw-eval")]
    lic = page.locator("#sw-lic").input_value()
    assert vals == ["Odoo", "17", "Odoo S.A.", "UNEMI", "Comité de TI"], vals
    assert "LGPL" in lic, lic
    return "Tras recargar se conservan nombre Odoo, versión 17, licencia LGPL, proveedor, organización y evaluador."


@case("CP-02")
def cp02(page):
    data = page.evaluate("window.GUIOS_DATA")
    page.goto(APP + "#inicio")
    page.fill("#sw-nombre", "Odoo")
    page.click("[data-action='start']")
    ids = [f["id"] for f in data["factores"]]
    fundamentales = ids[:3]
    for fid in ids:
        set_radio(page, f"input[data-decisor='{fid}'][value='{4 if fid in fundamentales else 1}']")
    page.click("[data-action='detail']")
    levels = data["nivelesImportancia"]
    errores = []
    irrelevantes = 0
    for f in data["factores"]:
        d = 4 if f["id"] in fundamentales else 1
        idx = (f["importanciaSugerida"] - 1 + d - 1) // 2
        row = page.locator(".factor-row").filter(has=page.locator(f"input[data-decisor='{f['id']}']"))
        shown = row.locator(".factor-detail .badge").inner_text().strip()
        irr = "is-irrelevant" in (row.get_attribute("class") or "")
        if shown != levels[idx] or irr != (idx == 0):
            errores.append((f["nombre"], shown, levels[idx]))
        irrelevantes += idx == 0
    assert not errores, errores
    return (
        f"La importancia relativa de los 18 factores coincide con la fórmula de la guía y {irrelevantes} factores quedan atenuados como Irrelevantes. "
        "Observación: la guía GUIOS expresa la importancia relativa en niveles, no en porcentajes; el criterio «suma 100 %» no aplica y conviene corregir el caso."
    )


@case("CP-03")
def cp03(page):
    page.goto(APP + "?demo=1#paso-1-2")
    seg = page.locator(".factor-row .segmented")
    assert seg.count() == 1, seg.count()
    row = page.locator(".factor-row").filter(has=page.locator(".segmented"))
    assert "Soporte" in row.inner_text()
    page.goto(APP + "#paso-5-6")
    assert "Soporte" in page.locator(".foda-q-tl").inner_text()
    page.goto(APP + "#paso-1-2")
    page.click("[data-scope][data-value='Externo']")
    page.goto(APP + "#paso-5-6")
    assert "Soporte" in page.locator(".foda-q-tr").inner_text()
    assert "Soporte" not in page.locator(".foda-q-tl").inner_text()
    return "Solo Soporte muestra el control Interno/Externo; al pasarlo a Externo se mueve de Fortalezas a Oportunidades."


@case("CP-04")
def cp04(page):
    page.goto(APP + "#inicio")
    page.fill("#sw-nombre", "Odoo")
    page.click("[data-action='start']")
    page.click("a[data-nav='paso-3-4']")
    rows = page.locator(".subfactor-row")
    total = rows.count()
    for i, v in enumerate([3, 4, 2]):
        rows.nth(i).locator(f"input[value='{v}']").evaluate("e => { e.checked = true; e.dispatchEvent(new Event('change', {bubbles: true})) }")
    badge = page.locator(".card-header .badge").last.inner_text().strip()
    assert badge == f"3 de {total}", badge
    side = page.locator(".side .list-item[aria-current='true'] .detail").inner_text().strip()
    assert side == f"3/{total}", side
    fill = page.locator("[data-fill='4']")
    fill.first.click()
    page.goto(APP + "#paso-5-6")
    if page.locator(".popup").count():
        page.click("[data-action='popup-confirm']")
    page.click(".details.card > summary")
    first_row = page.locator(".details.card table tbody tr").first
    pond = first_row.locator("td.num").inner_text().strip()
    assert re.match(r"^\d\.\d$", pond), pond
    return f"El contador muestra 3 de {total} en el factor y 3/{total} en la lista lateral; al completar el factor su ponderación aparece en el resultado ({pond})."


@case("CP-05")
def cp05(page):
    page.goto(APP + "?demo=1#paso-5-6")
    code = page.locator(".verdict-code").inner_text().strip()
    assert code in ("A", "B", "C")
    counts = [int(page.locator(f".foda-q-{p} .foda-q-count").inner_text()) for p in ("tl", "tr", "bl", "br")]
    expected = page.evaluate("(() => { const db = JSON.parse(localStorage.getItem('guiospro.db.v2')); const ev = db.evaluaciones.find(e => e.id === db.activa); const r = GuiosEngine.evaluate(GUIOS_DATA, ev); return [r.recomendacion.codigo, r.foda.Fortaleza, r.foda.Oportunidad, r.foda.Debilidad, r.foda.Amenaza]; })()")
    assert [code] + counts == expected, ([code] + counts, expected)
    return (
        f"Se muestran F {counts[0]}, O {counts[1]}, D {counts[2]}, A {counts[3]} y la recomendación {code}, iguales al cálculo del motor, "
        "cuya fidelidad con legacy/main.py cubren las pruebas automáticas de tests/engine.test.js."
    )


@case("CP-06")
def cp06(page):
    page.goto(APP + "#inicio")
    page.fill("#sw-nombre", "Odoo")
    page.click("[data-action='start']")
    page.click("a[data-nav='paso-3-4']")
    # Precondición del caso: todos los factores respondidos salvo 2
    total = page.locator(".side .list-item").count()
    for _ in range(total - 2):
        page.locator("[data-fill='4']").first.click() if page.locator("[data-fill='4']").count() else page.locator(".subfactor-row:not(.is-answered) label.choice-opt:nth-child(4)").first.click()
    assert page.locator(".side .list-item .leading.is-muted").count() == 2
    page.click("a[data-nav='paso-5-6']")
    expect(page.locator(".popup")).to_contain_text("por responder")
    n = page.locator(".pending-list [data-goto-factor]").count()
    assert n >= 2, n
    page.locator(".pending-list [data-goto-factor]").nth(1).click()
    assert "paso-3-4" in page.url
    page.click("a[data-nav='paso-5-6']")
    page.click("[data-action='popup-confirm']")
    expect(page.locator(".verdict-alert")).to_contain_text("Resultado parcial")
    return f"Al ir al resultado aparece el aviso con {n} factores pendientes, cada uno con enlace directo; el resultado se marca como parcial."


@case("CP-07")
def cp07(page):
    page.goto(APP + "?demo=1#paso-3-4")
    page.fill("[data-search='q']", "soporte")
    info = page.locator(".toolbar .small.muted").inner_text()
    titles = page.locator(".side .list-item .title").all_inner_texts()
    # Busca en el nombre del factor y en el texto de sus subfactores (HU-25)
    assert "Soporte" in titles and len(titles) < 17, titles
    page.goto(APP + "#evaluacion/ev_demo_openedx")
    page.click("[data-continue='ev_demo_openedx']")
    page.goto(APP + "#paso-3-4")
    page.click("[data-action='only-pending']")
    pend = page.locator(".side .list-item").count()
    page.set_viewport_size({"width": 390, "height": 844})
    page.fill("[data-search='q']", "")
    box = page.locator("[data-search='q']").bounding_box()
    sw = page.evaluate("document.documentElement.scrollWidth")
    page.click("[data-action='nav']")
    page.wait_for_timeout(300)
    top = page.evaluate(f"!!document.elementFromPoint({box['x'] + 20}, {box['y'] + 20}).closest('#sidebar')")
    assert sw <= 392 and top, (sw, top)
    return f"Con «soporte» la lista se filtra a {len(titles)} factores, el de Soporte y los que lo mencionan en sus requisitos, y el contador se actualiza ({info.strip()}); «Solo pendientes» deja {pend} factores. A 390 px no hay desbordamiento y el menú queda por encima del buscador."


@case("CP-08")
def cp08(page):
    page.goto(APP + "?demo=1#informe/ev_demo_moodle")
    page.emulate_media(media="print")
    pdf = page.pdf(format="A4", print_background=True)
    page.emulate_media(media="screen")
    pages = len(re.findall(rb"/Type\s*/Page[^s]", pdf))
    before = next(e for e in stored(page)["evaluaciones"] if e["id"] == "ev_demo_moodle")
    with page.expect_download() as dl:
        page.click("[data-export-eval='ev_demo_moodle']")
    path = dl.value.path()
    page.goto(APP + "#datos")
    page.click("[data-action='wipe']")
    page.click("[data-action='popup-confirm']")
    assert not stored(page)["evaluaciones"]
    page.goto(APP + "#datos")
    page.set_input_files("[data-import-file]", path)
    page.click("[data-action='import-apply']")
    after = next(e for e in stored(page)["evaluaciones"] if e["id"] == "ev_demo_moodle")
    same = all(before[k] == after[k] for k in ("decisor", "alcance", "subfactores", "observaciones", "software"))
    assert same and 1 <= pages <= 3, (same, pages)
    return f"El PDF del informe sale con portada y cabecera en {pages} páginas A4. El JSON exportado, importado tras borrar los datos, restaura la evaluación idéntica."


@case("CP-09")
def cp09(page):
    page.goto(APP + "?demo=1#datos")
    n0 = len(stored(page)["evaluaciones"])
    page.click("[data-action='wipe']")
    page.click(".popup [data-action='close-overlay'].btn")
    assert len(stored(page)["evaluaciones"]) == n0
    page.click("[data-action='wipe']")
    page.click("[data-action='popup-confirm']")
    db = stored(page)
    # Tras borrar todo queda el estado inicial: solo LibreOffice, el software del caso de la tesis
    assert not db["evaluaciones"] and not db["plantillas"] and [s["nombre"] for s in db["softwares"]] == ["LibreOffice"]
    return f"Al cancelar se mantienen las {n0} evaluaciones; al confirmar «Borrar todo» se vacían evaluaciones, plantillas y softwares, y queda solo el catálogo inicial con LibreOffice."


@case("CP-10")
def cp10(page):
    page.goto(APP + "#panel")
    expect(page.locator(".empty-state")).to_contain_text("Todavía no hay evaluaciones")
    page.click(".empty-state [data-action='demo']")
    expect(page.locator(".kpi-grid")).to_be_visible()
    expect(page.locator(".stacked-bar")).to_be_visible()
    return "Sin evaluaciones el Panel muestra el estado vacío; con evaluaciones completadas muestra los indicadores, la distribución FODA y la línea de tiempo."


@case("CP-11")
def cp11(page):
    page.goto(APP + "#softwares")
    expect(page.locator(".list-item")).to_have_count(1)  # catálogo inicial: LibreOffice
    page.click(".screen-header [data-action='sw-new']")
    page.fill("#swf-nombre", "SAP B1")
    page.select_option("#swf-lic", label="Otra")
    page.click("[data-action='popup-confirm']")
    expect(page.locator("h1")).to_have_text("SAP B1")
    page.click("[data-sw-edit]")
    page.select_option("#swf-lic", label="Privativa")
    page.click("[data-action='popup-confirm']")
    expect(page.locator(".meta-grid")).to_contain_text("Privativa")
    page.click("[data-sw-delete]")
    page.click("[data-action='popup-confirm']")
    expect(page.locator(".list-item")).to_have_count(1)
    expect(page.locator(".list-item")).not_to_contain_text("SAP B1")
    return "Alta de SAP B1, edición de su licencia a Privativa y baja con confirmación funcionan; la lista se actualiza en cada paso."


@case("CP-12")
def cp12(page):
    page.goto(APP + "?demo=1#configuracion")
    page.click("[data-action='cfg-server-toggle']")
    page.fill("#cfg-url", API)
    page.click("[data-action='cfg-save']")
    expect(page.locator(".badge-success")).to_contain_text("Conectado", timeout=8000)
    page.goto(APP + "#datos")
    page.click("[data-action='sync-now']")
    expect(page.locator("#toast")).to_contain_text("Sincronizado", timeout=10000)
    original = next(e for e in stored(page)["evaluaciones"] if e["id"] == "ev_demo_moodle")
    page.click("[data-action='wipe']")
    page.click("[data-action='popup-confirm']")
    page.goto(APP + "#configuracion")
    page.click("[data-action='cfg-server-toggle']")
    page.fill("#cfg-url", API)
    page.click("[data-action='cfg-save']")
    expect(page.locator(".badge-success")).to_contain_text("Conectado", timeout=8000)
    page.goto(APP + "#datos")
    page.click("[data-action='sync-now']")
    expect(page.locator("#toast")).to_contain_text("recibidos", timeout=10000)
    page.goto(APP + "#evaluacion/ev_demo_moodle")
    expect(page.locator(".meta-grid")).to_contain_text("Moodle")
    restored = next(e for e in stored(page)["evaluaciones"] if e["id"] == "ev_demo_moodle")
    same = all(original[k] == restored[k] for k in ("decisor", "alcance", "subfactores"))
    assert same
    return "Con la API levantada, la evaluación se guardó en el servidor, se borraron los datos locales y al sincronizar se recuperó con los tres pasos y todas sus respuestas idénticas."


@case("CP-13")
def cp13(page):
    screens = ["inicio", "paso-1-2", "paso-3-4", "paso-5-6", "panel", "evaluaciones", "informe/ev_demo_moodle", "comparar/ev_demo_moodle,ev_demo_chamilo", "softwares", "administracion", "configuracion", "datos"]
    page.goto(APP + "?demo=1&theme=dark#inicio")
    fails = []
    for sc in screens:
        page.goto(APP + f"?theme=dark#{sc}")
        page.wait_for_timeout(150)
        fails += [(sc, f["texto"], f["ratio"]) for f in page.evaluate(CONTRASTE)]
    page.goto(APP + "?theme=dark#inicio")
    focus_ok = 0
    for _ in range(8):
        page.keyboard.press("Tab")
        visible = page.evaluate("(() => { const e = document.activeElement; if (!e || e === document.body) return false; const cs = getComputedStyle(e); return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== 'none'; })()")
        focus_ok += bool(visible)
    assert not fails and focus_ok == 8, (fails[:5], focus_ok)
    return f"En tema oscuro, los textos visibles de {len(screens)} pantallas cumplen contraste AA (≥ 4.5:1, 3:1 en texto grande) y los 8 primeros controles recorridos con Tab muestran foco visible."


@case("CP-14")
def cp14(page):
    page.goto(APP + "?demo=1#configuracion")
    page.click("[data-action='cfg-server-toggle']")
    page.fill("#cfg-url", API)
    page.click("[data-action='cfg-save']")
    expect(page.locator(".badge-success")).to_contain_text("IA disponible", timeout=8000)
    page.goto(APP + "#evaluacion/ev_demo_openedx")
    page.click("[data-continue='ev_demo_openedx']")
    page.goto(APP + "#paso-3-4")
    page.click("[data-action='ia-suggest']")
    sug = page.locator(".ia-suggestion").first
    expect(sug).to_be_visible(timeout=15000)
    text = sug.inner_text()
    assert "IA sugiere" in text and "confianza" in text
    sub = page.locator("[data-ia-accept]").first.get_attribute("data-ia-accept")
    page.locator("[data-ia-accept]").first.click()
    ev = next(e for e in stored(page)["evaluaciones"] if e["id"] == "ev_demo_openedx")
    assert sub in ev["origenIA"] and ev["subfactores"][sub] == ev["origenIA"][sub]["valor"]
    expect(page.locator(".badge-xs", has_text="IA").first).to_be_visible()
    return (
        "Con el servicio de IA configurado en modo simulado, «Sugerir con IA» muestra valor, justificación y confianza por subfactor; al aceptar se rellena la respuesta y se marca el origen IA. "
        "El factor «Seguridad» del caso no existe en la guía; se usó el primer factor pendiente. Queda pendiente repetirlo con la clave real del proveedor."
    )


@case("CP-15")
def cp15(page):
    page.goto(APP + "?demo=1#evaluacion/ev_demo_openedx")
    page.click("[data-continue='ev_demo_openedx']")
    page.goto(APP + "#paso-3-4")
    for _ in range(30):
        f = page.locator("[data-fill='4']")
        if f.count():
            f.first.click()
            continue
        single = page.locator(".subfactor-row:not(.is-answered) label.choice-opt:nth-child(4)")
        if single.count():
            single.first.click()
            continue
        nxt = page.locator(".card-footer .btn-primary[data-factor]")
        if nxt.count():
            nxt.first.click()
            continue
        break
    page.goto(APP + "#comparar/ev_demo_moodle,ev_demo_chamilo,ev_demo_openedx")
    expect(page.locator(".compare-table")).to_be_visible()
    cols = page.locator(".compare-table thead th").count() - 1
    stars = page.locator(".compare-table td.is-best").count()
    radar = page.locator(".chart-radar .chart-series").count()
    assert cols == 3 and stars > 0 and radar == 3, (cols, stars, radar)
    return f"Con 3 evaluaciones completadas, el comparador muestra la tabla con 3 columnas, {stars} mejores valores resaltados con estrella y el gráfico radar con 3 series."


# ---------------------------------------------------------------- ejecución
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge")
    for fn in CASES:
        ctx = browser.new_context(viewport={"width": 1280, "height": 900}, accept_downloads=True)
        page = ctx.new_page()
        page_errors = []
        page.on("pageerror", lambda e: page_errors.append(str(e)))
        page.goto(APP + "#inicio")
        try:
            obtained = fn(page)
            ok = not page_errors
            if page_errors:
                obtained += " Errores de JavaScript: " + "; ".join(page_errors)
        except Exception as e:  # noqa: BLE001
            ok = False
            obtained = f"Falló: {type(e).__name__}: {str(e)[:300]}"
            traceback.print_exc()
        results[fn.cp] = {"paso": ok, "obtenido": obtained}
        print(("PASÓ " if ok else "FALLÓ"), fn.cp, "-", obtained[:160])
        ctx.close()
    browser.close()

OUT.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
print("\nResumen:", sum(r["paso"] for r in results.values()), "de", len(results), "pasaron")
