# Generador del informe en Word

`informe.js` construye `docs/entregables/TAREA1-GUIOS-PRO.docx` a partir del contenido de
`docs/ENTREGA-TAREA1.md`, las figuras de `docs/graficos/` y las capturas de `docs/capturas/`.

## Regenerar el documento

```bash
npm install docx          # solo la primera vez
python scripts/docx/dimensiones.py   # actualiza img.json si cambiaron las figuras
node scripts/docx/informe.js         # escribe docs/entregables/TAREA1-GUIOS-PRO.docx
```

`img.json` guarda el tamaño en píxeles de cada imagen para calcular su proporción;
**hay que regenerarlo siempre que se rehagan las figuras**, o saldrán deformadas.

## Revisar el resultado

```bash
"C:/Program Files/LibreOffice/program/soffice.exe" --headless --convert-to pdf \
  --outdir . docs/entregables/TAREA1-GUIOS-PRO.docx
```

Al abrir el .docx en Word: clic derecho sobre el índice → Actualizar campos → Actualizar toda la tabla.
