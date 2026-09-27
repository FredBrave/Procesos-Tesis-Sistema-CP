# TAREA #1 — Avance del proyecto: Alcance, requisitos, backlog y diseño

**Proyecto:** GUIOS PRO — Sistema de evaluación para la adopción de software
**Asignatura:** Procesos · **Docente:** Víctor Hugo Rea · **Entrega:** 30/09/2026
**Autores:** Freddy Bravo · Ariel Pesántez · Angie Dayanna Mendoza Barreto
**Base teórica:** Rea Sánchez, V. H. (2022). *Factores para la adopción de soluciones basadas en software libre*. Tesis doctoral, Universidad de Sevilla.

> **Cómo usar este documento.** Las secciones 1 a 4 completan las partes que quedaron pendientes en el borrador (`TAREA#1.docx`): alcance, ingeniería de requisitos, Product Backlog y análisis y diseño. Las figuras están en `docs/graficos/` en PNG de alta resolución, listas para insertar. La sección 0 lista las correcciones que hay que aplicar al texto ya redactado.

---

## 0. Correcciones a aplicar al borrador

Al contrastar el borrador con la tesis y con los datos del prototipo aparecieron cinco imprecisiones. **Conviene corregirlas antes de entregar, porque el docente es el autor de la tesis.**

| # | Dice el borrador | Debe decir | Motivo |
|---|---|---|---|
| 1 | "desglosadas en **22 factores** y 61 subfactores" | "**22 factores identificados** en la revisión sistemática, de los cuales **18 conforman la guía** y se desglosan en 61 subfactores" | La tesis (§5.2.1) excluyó 4 factores por no tener ningún subfactor: *Reingeniería de procesos empresariales*, *Coste de licencia*, *Coste operacional* y *Coste de soporte* (los tres últimos absorbidos por *Coste total de propiedad*). |
| 2 | Dimensión Tecnológica: "compatibilidad, mantenibilidad, fiabilidad, **rendimiento, seguridad** y personalización" | "compatibilidad, personalización, prueba, fiabilidad, reusabilidad, usabilidad, mantenibilidad, portabilidad y documentación" (9 factores) | *Rendimiento* y *seguridad* no son factores de la guía; la seguridad aparece como **subfactor** de *Fiabilidad*. |
| 3 | Dimensión Organizacional: "cultura organizacional, capacitación, apoyo de la alta dirección, resistencia al cambio y alineación estratégica" | "formación, tiempo de adopción, casos de estudio de adopción FLOSS, centralidad de la tecnología de la información, apoyo de la alta dirección, bloqueo de proveedores, soporte y actitud hacia el cambio" (8 factores) | Son los nombres exactos de la Tabla 5.1 de la tesis. |
| 4 | Dimensión Económica: "TCO, costo de licenciamiento, costos de migración y costo de soporte" | "**Coste total de propiedad (TCO)**, con 2 subfactores: costos ocultos y coste frente a la alternativa propietaria" | Es el único factor económico de la guía; los demás se integraron en él. |
| 5 | "recomendaciones sugeridas (Aceptar, Evaluar con Reservas, Rechazar)" | "**A** · No es posible adoptar — **B** · Es posible adoptar con reservas — **C** · Adoptar" | Son los códigos y textos de la matriz de recomendación GUIOSAD 2021 que implementa el sistema. *(Pendiente de confirmar con el docente: en el capítulo 6 de la tesis los códigos A y C aparecen invertidos.)* |

**Nota sobre el equipo.** La portada registra 3 autores y el plan de trabajo del repositorio está organizado en 5 roles de desarrollo (Dev A a Dev E). Si el grupo es de 3 personas, cada integrante asume más de un rol: se sugiere **Freddy Bravo → Dev A (IA e integración) + Dev B (backend)**, **Ariel Pesántez → Dev C (catálogo) + Dev D (pantallas de evaluación)** y **Angie Mendoza → Dev E (dashboard y reportes)**; o bien declarar los 5 roles como *áreas de trabajo* y no como personas.

---

## 1. Alcance del proyecto

### 1.1 Objetivo

Construir un sistema informático que **automatice la guía GUIOS** para evaluar si una solución de software es adecuada para una organización, sustituyendo el proceso empírico actual por una evaluación sistemática, trazable y repetible que concluya en una recomendación fundamentada.

### 1.2 Alcance funcional (lo que el sistema hará)

| Módulo | Funcionalidad incluida |
|---|---|
| **M1 · Configuración** | Registrar los datos de la organización (nombre, sector, evaluador por defecto) y las preferencias de la aplicación. |
| **M2 · Catálogo de software** | Registrar, editar, etiquetar y consultar los softwares candidatos (nombre, versión, tipo de licencia, proveedor, notas) y su ficha con las evaluaciones asociadas. |
| **M3 · Evaluación (los 3 pasos)** | **Paso 1 – Importancia:** asignar la importancia del decisor a los 18 factores y fijar el alcance de *Soporte*; cálculo automático de la importancia relativa y descarte de los irrelevantes. **Paso 2 – Cumplimiento:** valorar los 61 subfactores en escala de 4 niveles, con ayuda contextual, buscador y avisos de pendientes. **Paso 3 – Resultado:** ponderación media por factor, clasificación FODA y recomendación A/B/C con los factores críticos señalados. |
| **M4 · Dashboard e informes** | Panel de indicadores (evaluaciones por estado, avance, distribución FODA, cumplimiento por dimensión, línea de tiempo), gráficos de resultados e informe imprimible/exportable a PDF. |
| **M5 · Historial y comparación** | Lista de evaluaciones con filtros, detalle en modo lectura de una evaluación guardada y comparador de 2 a 5 candidatos. |
| **M6 · Administración de la guía** | Edición validada y versionada de dimensiones, factores, subfactores y reglas de recomendación, y plantillas de importancia reutilizables. |
| **M7 · Asistente de IA** | Sugerencia de valoración por subfactor (valor, justificación y nivel de confianza) que el evaluador acepta o descarta, y redacción del resumen ejecutivo del informe. La IA **nunca decide**: la recomendación siempre proviene del cálculo de GUIOS. |
| **M8 · Portabilidad de datos** | Exportar e importar evaluaciones, softwares y plantillas en JSON; funcionamiento sin servidor mediante almacenamiento local del navegador. |

### 1.3 Fuera del alcance

- **Cuentas de usuario, inicio de sesión y permisos por rol.** La organización y el evaluador se registran como datos de la evaluación. *(Es una de las extensiones que plantea la tesis; se deja fuera de este curso por tiempo y para evitar almacenar credenciales.)*
- **Evaluación colaborativa simultánea** entre varios decisores con mecanismo de consenso.
- **Métricas alternativas de decisión** (análisis multicriterio, eficiencia de Pareto): el motor queda aislado para poder añadirlas después.
- Integración con sistemas externos de la organización (inventario de TI, compras, ERP institucional).
- Instalación y puesta en producción en la infraestructura de una institución real; el despliegue previsto es de demostración.
- Aplicaciones móviles nativas (la aplicación web es adaptable a móvil, pero no se empaqueta para tiendas).

### 1.4 Supuestos y restricciones

| Tipo | Enunciado |
|---|---|
| Supuesto | El catálogo de la guía (3 dimensiones, 18 factores, 61 subfactores, importancias sugeridas) se toma de la tesis y se considera validado. |
| Supuesto | El evaluador conoce el software candidato o puede consultar su documentación pública. |
| Restricción | El entregable debe poder **ejecutarse con doble clic**, sin instalación ni servidor (requisito heredado del prototipo original). |
| Restricción | Sin dependencias de terceros en tiempo de ejecución: HTML, CSS y JavaScript sin frameworks. |
| Restricción | El proyecto se desarrolla en 5 sprints de 2 semanas, del 22/09/2026 al 30/11/2026, con dedicación parcial del equipo. |
| Restricción | La clave del servicio de IA no puede residir en el navegador; exige un componente de servidor. |

### 1.5 Entregables por sprint

| Sprint | Fechas | Entregable |
|---|---|---|
| 0 ✔ | 08 – 21/09/2026 | Repositorio, aplicación web con los 3 pasos, motor de cálculo probado, datos maestros, diseño de base de datos y este informe |
| 1 | 22/09 – 05/10/2026 | Dashboard, configuración, mejoras de la evaluación · **versión 1.1 publicada** |
| 2 | 06 – 19/10/2026 | Catálogo de software, API, gráficos, informe y primer servicio de IA · **versión 1.2** |
| 3 | 20/10 – 02/11/2026 | Historial, administración de la guía y asistente de IA · **versión 2.0** |
| 4 | 03 – 16/11/2026 | Comparador, dashboard con datos reales, evidencias y resumen ejecutivo · **versión 2.1** |
| 5 | 17 – 30/11/2026 | Pulido, corrección de errores, manuales e informe final · **versión final** |

> **Figura 9** (`docs/graficos/09-cronograma.png`) — cronograma de sprints.

---

## 2. Ingeniería de requisitos

### 2.1 Requisitos funcionales

Prioridad según MoSCoW: **A** = imprescindible, **M** = importante, **B** = deseable. La columna *Origen* indica de dónde procede el requisito: T = tesis, V = validación con la especialista (cap. 6), E = decisión del equipo.

| ID | Requisito funcional | Prioridad | Sprint | Origen |
|---|---|---|---|---|
| RF-01 | Registrar los datos del software candidato: nombre, versión, tipo de licencia, proveedor y organización. | A | 0 ✔ | T |
| RF-02 | Presentar los 18 factores agrupados por dimensión con su importancia sugerida y permitir al decisor asignar su propia importancia en 4 niveles. | A | 0 ✔ | T |
| RF-03 | Calcular la importancia relativa de cada factor como ⌊(IS + ID)/2⌋ y excluir del análisis los factores resultantes *Irrelevantes*. | A | 0 ✔ | T |
| RF-04 | Permitir elegir el alcance Interno/Externo de los factores cuyo alcance es "Ambos" (*Soporte*). | A | 0 ✔ | T |
| RF-05 | Permitir valorar cada subfactor de los factores relevantes en escala de 4 niveles y calcular la ponderación media del factor. | A | 0 ✔ | T |
| RF-06 | Clasificar cada factor evaluado como Fortaleza, Oportunidad, Debilidad o Amenaza según su ponderación media y su alcance. | A | 0 ✔ | T |
| RF-07 | Emitir la recomendación A, B o C aplicando la matriz de decisión e indicar los factores críticos que la determinan. | A | 0 ✔ | T |
| RF-08 | Exportar el informe de la evaluación en PDF y los datos en JSON, e importar una evaluación previa. | M | 0 ✔ | T |
| RF-09 | Guardar el avance automáticamente y permitir limpiar los datos de una evaluación anterior con confirmación. | M | 0 ✔ | E |
| RF-10 | Mostrar ayuda contextual en cada paso explicando el significado de cada nivel de las escalas. | M | 1 | V |
| RF-11 | Avisar de los factores con respuestas pendientes antes de mostrar el resultado y marcar el resultado como parcial. | M | 1 | V |
| RF-12 | Permitir buscar y filtrar factores y subfactores pendientes durante la valoración. | M | 1 | V |
| RF-13 | Ofrecer un panel de indicadores con el estado de las evaluaciones, el avance, la distribución FODA y el cumplimiento medio por dimensión. | A | 1 | E |
| RF-14 | Registrar los datos de la organización y las preferencias una sola vez y reutilizarlos en cada evaluación. | M | 1 | E |
| RF-15 | Mantener un catálogo de softwares candidatos con alta, edición, eliminación, búsqueda, etiquetas y ficha de detalle. | A | 2 | E |
| RF-16 | Persistir las evaluaciones en un servidor con sus estados (En proceso, Completada, Cancelada) y recuperarlas después. | A | 2-3 | T |
| RF-17 | Consultar el historial de evaluaciones con filtros por software, estado y fecha, y abrir el detalle de cualquiera en modo lectura. | A | 3 | T |
| RF-18 | Generar gráficos de cumplimiento por dimensión, de distribución FODA y de evolución temporal de las evaluaciones. | M | 2-3 | E |
| RF-19 | Administrar el catálogo de la guía (dimensiones, factores, subfactores y reglas) desde la interfaz, con validación y versionado. | M | 3 | T |
| RF-20 | Guardar y reutilizar plantillas de importancia de factores entre evaluaciones. | M | 3 | E |
| RF-21 | Sugerir mediante IA una valoración por subfactor con justificación y nivel de confianza, que el evaluador acepta o descarta individualmente. | A | 2-3 | E |
| RF-22 | Registrar la trazabilidad de las sugerencias de IA: qué propuso el modelo, qué aceptó la persona y con qué versión del prompt. | M | 3 | E |
| RF-23 | Generar un resumen ejecutivo en lenguaje natural del informe, editable antes de exportar y marcado como generado con IA. | M | 4 | V |
| RF-24 | Comparar de 2 a 5 evaluaciones en una sola vista, resaltando las diferencias por dimensión y factor. | M | 4 | V |
| RF-25 | Permitir adjuntar una observación o evidencia por subfactor y mostrarla en el informe. | B | 4 | T |
| RF-26 | Importar y exportar softwares, plantillas y evaluaciones entre instalaciones, con vista previa y resolución de duplicados. | B | 4 | E |

### 2.2 Requisitos no funcionales

| ID | Categoría | Requisito y criterio medible |
|---|---|---|
| RNF-01 | Usabilidad | Cualquier paso debe alcanzarse en **3 clics o menos**; cada pregunta se responde con **un solo control**, sin botón de guardar (el prototipo original requería 3 clics por factor). |
| RNF-02 | Portabilidad | Funciona en Chrome, Edge y Firefox actuales y **se abre con doble clic** desde `file://`, sin instalación ni servidor. |
| RNF-03 | Rendimiento | El recálculo completo (61 subfactores, FODA y recomendación) se ejecuta en **menos de 100 ms**; la carga inicial obtiene **≥ 90** en Lighthouse. |
| RNF-04 | Accesibilidad | Todos los controles con nombre accesible, foco visible, contraste **AA** en tema claro y oscuro, y navegación completa por teclado. |
| RNF-05 | Adaptabilidad | La interfaz es utilizable desde **390 px** de ancho sin desplazamiento horizontal. |
| RNF-06 | Mantenibilidad | El catálogo vive en archivos de datos versionados; la lógica de cálculo está **aislada de la interfaz** y cubierta por pruebas automáticas que se ejecutan en cada cambio. |
| RNF-07 | Fiabilidad del cálculo | El resultado del servidor y el del navegador deben ser **idénticos** para el mismo conjunto de respuestas; cualquier diferencia detiene la integración. |
| RNF-08 | Trazabilidad | Cada evaluación registra evaluador, organización, fecha, versión del catálogo y, si procede, el origen de las respuestas asistidas por IA. |
| RNF-09 | Seguridad | Validación de toda la entrada, protección ante inyección SQL y XSS, comunicación por HTTPS y clave del servicio de IA únicamente en el servidor. |
| RNF-10 | Disponibilidad | Disponibilidad objetivo del **99 %** mensual en el despliegue de demostración; ante caída del servidor la aplicación continúa en modo local. |
| RNF-11 | Continuidad | La evaluación en curso no se pierde al cerrar el navegador y puede exportarse en cualquier momento. |
| RNF-12 | Idioma | Interfaz, mensajes y documentación en español. |

### 2.3 Reglas de negocio

| ID | Regla |
|---|---|
| RN-01 | La importancia relativa de un factor se obtiene combinando la importancia sugerida y la del decisor: `IR = ⌊(IS + ID) / 2⌋`, sobre la escala 1 Irrelevante, 2 Opcional, 3 Importante, 4 Fundamental. |
| RN-02 | Solo se evalúan los factores cuya importancia relativa es superior a *Irrelevante*. |
| RN-03 | La ponderación media de un factor es la media aritmética de las valoraciones de sus subfactores, en el rango [1,0 – 4,0], y solo se calcula si están todos valorados. |
| RN-04 | Un factor es **Fortaleza** si es interno y su ponderación ≥ 3; **Debilidad** si es interno y < 3; **Oportunidad** si es externo y ≥ 3; **Amenaza** si es externo y < 3. |
| RN-05 | *Soporte* es el único factor cuyo alcance lo decide el evaluador; el resto tiene alcance fijo. |
| RN-06 | La recomendación se determina en orden: **A** si existe alguna Amenaza o Debilidad en un factor Importante o Fundamental; **B** si las hay solo en factores Opcionales; **C** si todos los factores evaluados son Fortalezas u Oportunidades. |
| RN-07 | La IA solo propone valoraciones; ninguna sugerencia se guarda sin la aceptación explícita del evaluador, y la recomendación final siempre procede del cálculo. |
| RN-08 | Modificar el catálogo de la guía no altera las evaluaciones ya completadas, que conservan la versión del catálogo con la que se hicieron. |

> **Figura 8** (`docs/graficos/08-flujo-calculo.png`) — cómo las reglas RN-01 a RN-06 encadenan las respuestas hasta la recomendación.

---

## 3. Product Backlog inicial

### 3.1 Épicas

| ID | Épica | Historias |
|---|---|---|
| EP-EVA | Pantallas de la evaluación (los 3 pasos, historial, detalle, evidencias) | HU-01 … HU-07, HU-09c, HU-12, HU-16 … HU-18, HU-24, HU-35 |
| EP-CAT | Catálogo de software y de la guía (configuración, catálogo, administración, plantillas) | HU-10, HU-15, HU-22, HU-23, HU-28, HU-33, HU-34 |
| EP-DASH | Dashboard, reportes y comparación | HU-11, HU-19, HU-25, HU-26, HU-29 |
| EP-API | Backend: API y base de datos | HU-09a, HU-09b, HU-14, HU-21, HU-31, HU-32, HU-36 |
| EP-IA | Asistente inteligente con IA | HU-20, HU-27, HU-30 |
| EP-OPS | Integración, publicación y revisión | (tareas técnicas, sin historias de usuario) |

### 3.2 Historias de usuario

Escala de estimación: puntos de historia (1, 2, 3, 5, 8). Prioridad: **A** imprescindible, **M** importante, **B** deseable.

#### Sprint 0 — completado

| ID | Historia de usuario | Criterios de aceptación | Prior. | Pts |
|---|---|---|---|---|
| HU-01 | Como **evaluador** quiero registrar el software candidato para identificar la evaluación. | Formulario con nombre, versión, licencia, proveedor, organización y evaluador; se guarda automáticamente. | A | 2 |
| HU-02 | Como **decisor** quiero fijar la importancia de cada factor para adaptar la guía a mi organización. | Factores agrupados por dimensión; selector de 4 niveles; importancia relativa calculada al instante; los irrelevantes quedan atenuados. | A | 5 |
| HU-03 | Como **decisor** quiero indicar si el factor *Soporte* es interno o externo. | Control segmentado Interno/Externo visible solo en factores con alcance "Ambos". | A | 2 |
| HU-04 | Como **evaluador** quiero valorar los subfactores de cada factor relevante. | Lista lateral con progreso n/N por factor; selector de 4 niveles por subfactor; ponderación visible al completar. | A | 5 |
| HU-05 | Como **decisor** quiero ver la matriz FODA y la recomendación para decidir. | Cuadrantes con sus factores, tarjeta de recomendación A/B/C con los factores críticos y tabla de detalle. | A | 8 |
| HU-06 | Como **decisor** quiero exportar el informe para presentarlo al comité. | Exportación a PDF con cabecera del informe y a JSON; la importación restaura la evaluación. | M | 3 |
| HU-07 | Como **usuario** quiero que mi avance no se pierda y poder empezar de cero al cambiar de proyecto. | Estado persistido en el navegador; botón «Limpiar datos» con confirmación. | M | 2 |
| HU-13 | Como **usuario** quiero una interfaz simple, con modo oscuro y navegación clara. | Tres pasos en lenguaje llano; detalle de cálculo oculto tras «Ver cálculo»; botón de tema; barra lateral con los pasos como línea de tiempo. | M | 3 |

#### Sprint 1 — nuevas pantallas y cimientos

| ID | Historia de usuario | Criterios de aceptación | Prior. | Pts |
|---|---|---|---|---|
| HU-19 | Como **decisor** quiero una pantalla de inicio con el estado general de mis evaluaciones para saber de un vistazo en qué punto estoy. | Dashboard con evaluaciones y su estado, avance de la evaluación en curso, distribución FODA, cumplimiento por dimensión y accesos directos; estado vacío cuando no hay ninguna. | A | 8 |
| HU-15 | Como **usuario** quiero guardar los datos de mi organización una sola vez para no repetirlos. | Pantalla de configuración con nombre, sector, logo, evaluador por defecto y tema; aviso al salir sin guardar; los datos se reutilizan al crear una evaluación. | A | 5 |
| HU-16 | Como **evaluador** quiero entender qué significa cada nivel de la escala para responder con criterio. | Ayuda breve plegable en cada paso; el paso 2 explica los 4 niveles; los textos provienen de los datos maestros. | A | 3 |
| HU-17 | Como **evaluador** quiero que el sistema me avise si dejo factores sin responder. | Aviso con la lista de pendientes y enlace directo a cada uno; el resultado se marca como parcial. | A | 3 |
| HU-18 | Como **evaluador** quiero buscar un factor y filtrar los pendientes para avanzar más rápido. | Búsqueda por nombre de factor o texto del subfactor, filtro «solo pendientes» y contador; funciona con teclado y en móvil. | M | 5 |
| HU-14 | Como **desarrollador del frontend** quiero obtener el catálogo desde la API para no depender del archivo generado. | Consulta de dimensiones, factores y subfactores con sus escalas; misma forma que los datos locales; documentado en OpenAPI. | M | 3 |

#### Sprint 2 — catálogo, API y primer servicio de IA

| ID | Historia de usuario | Criterios de aceptación | Prior. | Pts |
|---|---|---|---|---|
| HU-22 | Como **evaluador** quiero registrar en un solo lugar los softwares que evalúo. | Lista con buscador y filtro por licencia; alta, edición y eliminación con confirmación; al crear una evaluación se elige del catálogo; estado vacío con acción de alta. | A | 8 |
| HU-23 | Como **evaluador** quiero ver la ficha de un software con sus datos y sus evaluaciones. | Vista de detalle con datos, historial de evaluaciones y su recomendación, y accesos a evaluar o editar. | M | 2 |
| HU-24 | Como **evaluador** quiero ver todas mis evaluaciones en una lista. | Lista con software, fecha, estado, avance y recomendación; continuar, duplicar y eliminar con confirmación; buscador y estado vacío. | A | 5 |
| HU-09a | Como **evaluador** quiero que mi evaluación se guarde en el servidor. | Crear evaluación, guardar importancia y alcance por factor, guardar valoración por subfactor y completar; escrituras idempotentes; tres estados. | A | 8 |
| HU-21 | Como **evaluador** quiero registrar y consultar los softwares candidatos desde el servidor. | Alta, listado, edición y borrado con validación; filtrado por organización; documentado y con pruebas de error. | A | 5 |
| HU-25 | Como **decisor** quiero gráficos que resuman el cumplimiento por dimensión y la matriz FODA. | Gráfico radar por dimensión y barras FODA legibles en claro, oscuro e impresión, con tabla equivalente para lectores de pantalla. | M | 5 |
| HU-26 | Como **decisor** quiero una vista de informe completa para presentarla al comité. | Informe con portada, datos del software, recomendación, FODA, gráficos y detalle; exportable a PDF sin cortes y en máximo 3 páginas. | M | 5 |
| HU-20 | Como **evaluador** quiero que el sistema me proponga una valoración para cada subfactor. | Servicio que devuelve valor 1–4, justificación y confianza por subfactor; validación estricta de la respuesta; nada se guarda sin aceptación. | A | 8 |

#### Sprint 3 — evaluaciones guardadas y asistente

| ID | Historia de usuario | Criterios de aceptación | Prior. | Pts |
|---|---|---|---|---|
| HU-09b | Como **decisor** quiero consultar las evaluaciones anteriores y abrir cualquiera. | Listado paginado con filtros por software, estado y fecha, y detalle con todas las respuestas; incluye recomendación y conteos FODA. | A | 5 |
| HU-09c | Como **decisor** quiero ver y reabrir desde el servidor las evaluaciones guardadas. | Sección Historial activa con lista, filtros, estado y recomendación; abrir una evaluación restaura los tres pasos. | A | 5 |
| HU-10 | Como **responsable del método** quiero editar factores, subfactores y reglas sin tocar archivos. | Edición validada (escalas 1..4, alcance, importancia sugerida); cambios versionados que no alteran evaluaciones completadas; restauración del catálogo original. | M | 5 |
| HU-28 | Como **decisor** quiero guardar la importancia asignada y reutilizarla en próximas evaluaciones. | Guardar el paso 1 como plantilla con nombre; aplicarla al empezar; editar y eliminar; se indica la plantilla aplicada. | M | 5 |
| HU-29 | Como **decisor** quiero ver la evolución de mis evaluaciones en el tiempo. | Línea de tiempo por fecha con su recomendación, filtrable por software; al pulsar se abre el informe; estado vacío con menos de dos evaluaciones. | M | 5 |
| HU-27 | Como **evaluador** quiero ver las sugerencias de la IA junto a cada pregunta y aceptarlas o descartarlas. | Botón «Sugerir» por factor; cada sugerencia muestra valor, justificación y confianza; aceptar rellena y marca el origen; descartar no deja rastro. | A | 8 |

#### Sprint 4 — comparación y dashboard con datos reales

| ID | Historia de usuario | Criterios de aceptación | Prior. | Pts |
|---|---|---|---|---|
| HU-11 | Como **decisor** quiero comparar varios softwares evaluados en una sola pantalla. | Selección de 2 a 5 evaluaciones; tabla comparativa por dimensión y factor; diferencias resaltadas; gráfico comparativo; exportable a PDF. | A | 8 |
| HU-35 | Como **decisor** quiero abrir una evaluación anterior en modo lectura con todo su detalle. | Vista de solo lectura con respuestas, FODA, evaluador y fecha; acciones duplicar, continuar y abrir informe. | M | 5 |
| HU-12 | Como **evaluador** quiero justificar mis respuestas con una nota o un enlace. | Observación opcional por subfactor, guardada y visible en el informe y el detalle; no entorpece el flujo de respuesta. | B | 5 |
| HU-31 | Como **decisor** quiero que el dashboard muestre datos reales de toda la organización. | Indicadores de evaluaciones por estado, recomendaciones, cumplimiento por dimensión y últimas evaluaciones; respuesta por debajo de 300 ms. | A | 5 |
| HU-32 | Como **decisor** quiero comparar varias evaluaciones desde el servidor. | Acepta de 2 a 5 evaluaciones y devuelve resultados por dimensión, factor y FODA en estructura comparable. | A | 5 |
| HU-33 | Como **responsable** quiero mover mis datos entre equipos o instalaciones. | Exportación a JSON de softwares, plantillas y evaluaciones; importación con vista previa y resolución de duplicados. | M | 5 |
| HU-34 | Como **evaluador** quiero clasificar los softwares con etiquetas y notas. | Etiquetas con color, filtro por etiqueta y campo de notas en la ficha. | B | 3 |
| HU-30 | Como **decisor** quiero un resumen en lenguaje natural que explique la recomendación. | 150–250 palabras citando factores y ponderaciones; nunca contradice el cálculo; editable antes de exportar; marcado como generado con IA. | A | 8 |

#### Sprint 5 — cierre

| ID | Historia de usuario | Criterios de aceptación | Prior. | Pts |
|---|---|---|---|---|
| HU-36 | Como **decisor** quiero descargar el informe generado por el servidor, igual en cualquier navegador. | Informe con gráficos y resumen; incluye fecha, evaluador y aviso de contenido generado con IA. | M | 5 |

*El Sprint 5 se completa con tareas técnicas de pulido, corrección de errores, pruebas de regresión y documentación (manual de usuario, manual del catálogo e informe final).*

### 3.3 Resumen de estimación

| Sprint | 0 ✔ | 1 | 2 | 3 | 4 | 5 | **Total** |
|---|---|---|---|---|---|---|---|
| Puntos de historia | 30 | 27 | 46 | 33 | 44 | 5 | **185** |
| Tareas del sprint (incluye técnicas) | — | 12 | 12 | 11 | 11 | 7 | **53** |
| Puntos totales del sprint | — | 53 | 56 | 51 | 52 | 44 | **256** |

Velocidad planificada: ~10 puntos por integrante y sprint. El backlog completo con las tareas técnicas, sus dependencias y responsables está en `docs/jira/TAREAS.md`, y el archivo importable al tablero en `docs/jira/backlog-jira.csv`.

### 3.4 Trazabilidad requisitos ↔ historias

| Requisito | Historias | Requisito | Historias |
|---|---|---|---|
| RF-01 | HU-01 | RF-14 | HU-15 |
| RF-02 | HU-02 | RF-15 | HU-22, HU-23, HU-34 |
| RF-03 | HU-02 | RF-16 | HU-09a, HU-21 |
| RF-04 | HU-03 | RF-17 | HU-09b, HU-09c, HU-24, HU-35 |
| RF-05 | HU-04 | RF-18 | HU-25, HU-29 |
| RF-06 | HU-05 | RF-19 | HU-10 |
| RF-07 | HU-05 | RF-20 | HU-28 |
| RF-08 | HU-06, HU-26, HU-36 | RF-21 | HU-20, HU-27 |
| RF-09 | HU-07 | RF-22 | HU-27 |
| RF-10 | HU-16 | RF-23 | HU-30 |
| RF-11 | HU-17 | RF-24 | HU-11, HU-32 |
| RF-12 | HU-18 | RF-25 | HU-12 |
| RF-13 | HU-19, HU-31 | RF-26 | HU-33 |

---

## 4. Análisis y diseño

### 4.1 Actores y casos de uso

| Actor | Descripción |
|---|---|
| **Decisor** (Director/Responsable de TI) | Asigna la importancia de los factores, consulta el resultado, compara candidatos y toma la decisión. |
| **Evaluador técnico** | Registra los softwares candidatos y valora el cumplimiento de los subfactores. |
| **Responsable del método** | Mantiene el catálogo de la guía (factores, subfactores y reglas). |
| **Servicio de IA** (actor de sistema) | Devuelve sugerencias de valoración y el resumen ejecutivo a petición del sistema. |

> **Figura 5** (`docs/graficos/05-casos-uso.png`) — diagrama de casos de uso.

### 4.2 Modelo conceptual

El modelo se organiza en tres bloques:

1. **Catálogo de la guía** (datos maestros, iguales para todas las organizaciones): `DIMENSION` agrupa `FACTOR`, y cada `FACTOR` contiene varios `SUBFACTOR`. Las escalas se modelan como catálogos (`NIVEL_IMPORTANCIA`, `NIVEL_CUMPLIMIENTO`) y las reglas de decisión como `REGLA_RECOMENDACION`.
2. **Datos de la organización**: `ORGANIZACION` registra varios `SOFTWARE_CANDIDATO`.
3. **Evaluaciones**: cada `EVALUACION` pertenece a un software y se compone de `EVALUACION_FACTOR` (importancia del decisor, alcance, ponderación y clasificación FODA) y `EVALUACION_SUBFACTOR` (la valoración de cada pregunta).

> **Figura 4** (`docs/graficos/04-estructura-guios.png`) — estructura de dimensiones, factores y subfactores.

### 4.3 Modelo lógico

> **Figura 6** (`docs/graficos/06-modelo-logico.png`) — diagrama entidad-relación con atributos, claves primarias (PK) y foráneas (FK).

Relaciones principales y cardinalidades:

| Relación | Cardinalidad | Significado |
|---|---|---|
| DIMENSION — FACTOR | 1 : N | Una dimensión agrupa varios factores (3 dimensiones, 18 factores). |
| FACTOR — SUBFACTOR | 1 : N | Un factor contiene varios subfactores (61 en total). |
| ORGANIZACION — SOFTWARE_CANDIDATO | 1 : N | Una organización registra varios candidatos. |
| SOFTWARE_CANDIDATO — EVALUACION | 1 : N | Un software puede evaluarse varias veces a lo largo del tiempo. |
| EVALUACION — EVALUACION_FACTOR | 1 : N | Una evaluación pondera cada uno de los factores relevantes. |
| EVALUACION — EVALUACION_SUBFACTOR | 1 : N | Una evaluación registra la valoración de cada subfactor respondido. |
| REGLA_RECOMENDACION — EVALUACION | 1 : N | Una regla (A, B o C) explica el resultado de muchas evaluaciones. |

**Normalización.** El modelo está en tercera forma normal: las escalas y las reglas se extraen a catálogos propios para evitar valores repetidos; las tablas `EVALUACION_FACTOR` y `EVALUACION_SUBFACTOR` resuelven las relaciones N:M entre una evaluación y el catálogo, con clave primaria compuesta. Los contadores FODA de `EVALUACION` son un cálculo derivado que se almacena por rendimiento; la fuente de verdad es siempre el detalle.

### 4.4 Modelo físico

Implementado en **PostgreSQL 14+**. El script completo es `db/schema.sql` y la carga del catálogo `db/seed.sql`, generada automáticamente desde los archivos de datos.

| Tabla | Clave primaria | Claves foráneas | Restricciones destacadas |
|---|---|---|---|
| `dimension` | `id_dimension` | — | `codigo` y `nombre` únicos |
| `factor` | `id_factor` | `id_dimension` → dimension | `importancia_sugerida` entre 1 y 4; `alcance` ∈ {Interno, Externo, Ambos} |
| `subfactor` | `id_subfactor` | `id_factor` → factor | `(id_factor, orden)` único; borrado en cascada |
| `nivel_importancia` | `valor` | — | `valor` entre 1 y 4; etiqueta única |
| `nivel_cumplimiento` | `valor` | — | `valor` entre 1 y 4; etiqueta única |
| `regla_recomendacion` | `codigo` (A/B/C) | — | `orden` único; condiciones FODA e importancia como arreglos de texto |
| `organizacion` | `id_organizacion` | — | — |
| `software_candidato` | `id_software` | `id_organizacion` → organizacion | Borrado en cascada al eliminar la organización |
| `evaluacion` | `id_evaluacion` | `id_software` → software_candidato · `recomendacion` → regla_recomendacion | `estado` ∈ {En proceso, Completada, Cancelada} |
| `evaluacion_factor` | `(id_evaluacion, id_factor)` | ambas columnas + `importancia_decisor` → nivel_importancia | `alcance` ∈ {Interno, Externo}; `foda` ∈ {Fortaleza, Oportunidad, Debilidad, Amenaza} |
| `evaluacion_subfactor` | `(id_evaluacion, id_subfactor)` | ambas columnas + `valor` → nivel_cumplimiento | Una sola valoración por subfactor y evaluación |

**Vista de apoyo `v_evaluacion_factor`**: calcula en el servidor la importancia relativa de cada factor `((importancia_sugerida - 1 + importancia_decisor - 1) / 2) + 1` y la devuelve junto con su etiqueta, alcance, ponderación y clasificación FODA.

**Índices**: `evaluacion(id_software)`, `evaluacion(creado_en DESC)` y `subfactor(id_factor)`.

### 4.5 Arquitectura

> **Figura 7** (`docs/graficos/07-arquitectura.png`) — arquitectura del sistema.

- **Cliente**: interfaz en HTML, CSS y JavaScript sin dependencias, con el **motor de cálculo aislado** y cubierto por pruebas automáticas. Funciona sin servidor guardando el estado en el navegador.
- **Servidor** (a partir del Sprint 2): API REST sobre PostgreSQL y un servicio de IA que custodia la clave del modelo.
- **Datos maestros**: un único origen (`data/*.csv` y `data/recomendaciones.json`) genera tanto el catálogo que usa la aplicación como la carga inicial de la base de datos, lo que garantiza que ambos no se desincronicen.

### 4.6 Diseño de la interacción

> **Figura 10** (`docs/graficos/10-navegacion.png`) — mapa de navegación.
> **Figura 3** (`docs/graficos/03-pasos-guios.png`) — correspondencia entre los 6 pasos de GUIOS y las 3 pantallas.

Los seis pasos de la guía se presentan al usuario como **tres pasos numerados** (Importancia, Cumplimiento, Resultado), porque los pasos 1-2, 3-4 y 5-6 se resuelven en una misma pantalla. La barra lateral funciona como línea de tiempo, mostrando en qué paso está el usuario y el estado de cada uno.

---

## 5. Índice de figuras

| Figura | Archivo | Dónde insertarla |
|---|---|---|
| 1. Proceso actual de adopción (AS-IS) | `docs/graficos/01-proceso-actual.png` | Modelado del negocio · ¿Cómo trabaja actualmente el negocio? |
| 2. Proceso propuesto (TO-BE) | `docs/graficos/02-propuesta-to-be.png` | Propuesta · ¿Cómo mejorará el nuevo sistema? |
| 3. Los 6 pasos de GUIOS y las 3 pantallas | `docs/graficos/03-pasos-guios.png` | Procesos que se automatizarán |
| 4. Estructura del modelo de evaluación | `docs/graficos/04-estructura-guios.png` | Alcance inicial |
| 5. Diagrama de casos de uso | `docs/graficos/05-casos-uso.png` | Análisis y diseño |
| 6. Modelo lógico de datos (ER) | `docs/graficos/06-modelo-logico.png` | Análisis y diseño · Diseño lógico |
| 7. Arquitectura del sistema | `docs/graficos/07-arquitectura.png` | Análisis y diseño |
| 8. Motor de cálculo: de las respuestas a la recomendación | `docs/graficos/08-flujo-calculo.png` | Reglas de negocio |
| 9. Cronograma de sprints | `docs/graficos/09-cronograma.png` | Metodología SCRUM · Planificación |
| 10. Mapa de navegación | `docs/graficos/10-navegacion.png` | Análisis y diseño · Interacción |

**Capturas de la aplicación** disponibles en `docs/capturas/`: inicio, paso 1 (importancia), paso 2 (cumplimiento), paso 3 (resultado con FODA y recomendación), versión móvil y modo oscuro. Sirven como evidencia del avance del Sprint 0.

Los diagramas se regeneran con `python scripts/build_diagramas.py` y las capturas con `python scripts/screenshots.py`.
