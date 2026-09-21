---
name: verificar
description: Ejecutar la verificación completa del proyecto GUIOS PRO (datos generados al día, pruebas, sintaxis y capturas) y reportar el resultado. Usar antes de un commit, al terminar una tarea o cuando el usuario pida comprobar que todo funciona.
---

# Verificación completa

Ejecuta en orden y reporta cada resultado sin omitir fallos:

1. `npm run build:data` y luego `git status --short app/js/data.js db/seed.sql` — si aparecen modificados, los generados estaban desactualizados: inclúyelos en el commit.
2. `npm test` — deben pasar todas las pruebas.
3. `node --check app/js/engine.js && node --check app/js/app.js`.
4. `python scripts/screenshots.py` y abre (Read) al menos `docs/capturas/03-paso-5-6.png` para confirmar que la pantalla de resultados renderiza con la recomendación B del demo.
5. Resume: qué pasó, qué falló y qué archivos cambiaron.
