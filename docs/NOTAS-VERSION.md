# Notas de la versión

## v2.2.0 · Versión final del curso · 20/11/2026

Cierra el alcance de GUIOS PRO definido en `docs/SPRINT-0.md` y `docs/ENTREGA-TAREA1.md`: los módulos M1 a M8 están implementados y verificados.

### Novedades desde v1.0

- **Varias evaluaciones:** historial con búsqueda y filtros, detalle en solo lectura, duplicar, cancelar y reactivar.
- **Catálogo de softwares:** ficha, etiquetas de color y notas internas.
- **Configuración** de la organización: nombre, sector, logotipo, evaluador por defecto, tema y servidor.
- **Pasos de la evaluación:**
  - ayuda contextual por paso y por nivel de la escala;
  - buscador y filtro de pendientes;
  - observación y enlace de evidencia por pregunta;
  - aviso de factores pendientes antes del resultado.
- **Informe:** imprimible en un máximo de 3 páginas A4, con radar por dimensión, barras FODA y resumen ejecutivo.
- **Comparador** de 2 a 5 evaluaciones completadas.
- **Panel:** indicadores de todas las evaluaciones y línea de tiempo.
- **Administración de la guía:** versiones propias de la organización y plantillas de importancia.
- **Importación y exportación** de paquetes JSON con vista previa y resolución de duplicados.
- **Servidor opcional** (`api/`):
  - sincronización entre equipos con detección de conflictos;
  - asistente de IA para sugerir valoraciones y redactar el resumen, que nunca decide la recomendación;
  - informe generado en el servidor.

### Calidad

- **Pruebas automáticas:** 62, sobre el motor, el almacén local, la API y la sincronización cliente-servidor.
- **Regresión de extremo a extremo** de los 15 casos de prueba de ClickUp: 15 de 15 pasaron el 20/11/2026. Se ejecuta con `scripts/e2e/regresion.py`.
- **Contraste:** todos los textos de las 14 pantallas cumplen WCAG AA en tema claro y oscuro. Se comprueba con `scripts/e2e/contraste.js`.
- **Defectos:** BUG-01 a BUG-07, corregidos y verificados.

### Pendiente fuera de esta versión

- Medir la calidad de la IA con 30 casos de referencia reales (RNF-15). Hoy solo hay 2 de ejemplo en `api/ia/casos/`.
- Probar el asistente de IA con una clave real del proveedor. La regresión usó el proveedor simulado.
- Requisitos pendientes de validación con el docente: RF-31 a RF-36.
