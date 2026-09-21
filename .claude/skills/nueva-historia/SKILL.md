---
name: nueva-historia
description: Implementar una historia de usuario (HU-nn) de GUIOS PRO de principio a fin siguiendo las reglas del proyecto. Usar cuando el usuario pida implementar una HU del backlog o una funcionalidad nueva en la app.
---

# Implementar una historia de usuario

1. Lee `CLAUDE.md` y localiza la HU en `docs/SPRINT-0.md` (sección 3.3). Si no existe, redáctala con criterios de aceptación y añádela a la tabla antes de programar.
2. Propón en 5 líneas qué archivos tocarás. Respeta la separación: cálculo en `app/js/engine.js`, UI en `app/js/app.js`, estilos con tokens/componentes existentes.
3. Implementa. Reglas duras: sin dependencias de runtime, sin `fetch()`/módulos ES (debe funcionar desde `file://`), controles con etiqueta accesible, responsive a 390 px.
4. Si tocaste `engine.js`, añade o ajusta un test en `tests/engine.test.js`.
5. Verifica: `npm test`, `node --check app/js/app.js`, `python scripts/screenshots.py` y revisa las capturas generadas en `docs/capturas/`.
6. Actualiza la documentación afectada (`README.md`, `docs/DESIGN-SYSTEM.md` si hay componente/token nuevo, `docs/SPRINT-0.md` marcando la HU como hecha).
7. Propón un mensaje de commit con Conventional Commits en español, p. ej. `feat(hu-09): guardar evaluaciones en el servidor`.
