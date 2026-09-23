# Reunión con el docente — Lectura de la tesis, dudas y cambios propuestos

**Fuente:** Rea Sánchez, V. H. (2022). *Factores para la adopción de soluciones basadas en software libre*. Tesis doctoral, Universidad de Sevilla. Directores: Dr. Pablo Neira Ayuso y Dr. David Benavides Cuevas. 138 páginas.

---

## 1. Resumen de la tesis

### 1.1 Problema y objetivo

La adopción de FLOSS (Free/Libre Open Source Software) crece en el sector público y privado —en Ecuador, el Decreto 1014 (2008) y el Código Orgánico de Economía Social de los Conocimientos impulsaron su uso: **64 %** de implantación en servicios estatales y **43 %** en software de escritorio de servidores públicos—, pero **no existe una guía completa** que oriente a los responsables de TI. Cada organización improvisa su procedimiento, lo que lleva a "reinventar la rueda" y a seleccionar mal el software. Las amenazas típicas: no poder importar los ficheros de datos existentes, falta de documentación, costes ocultos y resistencia al cambio.

**Objetivo:** proponer una guía (GUIOS) que asista al decisor a evaluar de forma ágil y sistemática si un FLOSS es adecuado para su organización, y una herramienta que la automatice (GUIOS PRO).

### 1.2 Contribuciones (las cinco)

1. **Identificación de dimensiones, factores y subfactores** mediante revisión sistemática de la literatura (RSL).
2. **Definición de 5 indicadores de importancia** para caracterizar factores y subfactores.
3. **Encuesta a expertos FLOSS** para valorar la importancia de los subfactores.
4. **Diseño de GUIOS**: la guía de 6 pasos.
5. **Construcción de GUIOS PRO**: prototipo multiplataforma en Python + Flexx 0.8.

### 1.3 Los factores (capítulo 4)

Revisión sistemática de la literatura (2008-2019, revistas indexadas) → **22 factores** agrupados en 3 dimensiones:

| Dimensión | Presencia en la literatura | Factores más citados |
|---|---|---|
| **Organizacional** | 50 trabajos (**93 %**) — la más relevante | Soporte (43 citas), Formación (27) |
| **Tecnológica** | 49 trabajos (**91 %**) | Compatibilidad (34 citas), Fiabilidad (23), Usabilidad (17), Personalización (17) |
| **Económica** | 61 % | Coste total de propiedad (24 citas) |

> **Dato clave para el informe:** de los **22 factores** identificados se **excluyeron 4** al no encontrarles ningún subfactor: *Reingeniería de procesos empresariales*, *Coste de licencia*, *Coste operacional* y *Coste de soporte* (los tres últimos se absorbieron dentro de *Coste total de propiedad*). **La guía opera con 18 factores y 61 subfactores.** Ambas cifras son correctas según el contexto: 22 en la revisión de literatura, 18 en la guía y en la herramienta.

### 1.4 Los indicadores de importancia (capítulo 5)

Cinco indicadores, todos en escala discreta de 4 niveles — **1 Irrelevante, 2 Opcional, 3 Importante, 4 Fundamental**:

| Indicador | De dónde sale |
|---|---|
| **IE** · Importancia del experto | Media de las respuestas de la encuesta a expertos (57 respuestas) |
| **IL** · Importancia de la literatura | Citas por subfactor (`r = citas / nº subfactores`), clasificadas por cuartiles |
| **IS** · Importancia sugerida | Combinación de IE e IL mediante una matriz 4×4 (Figura 5.10) |
| **ID** · Importancia del decisor | La asigna el responsable de la organización |
| **IR** · Importancia relativa | Combinación de IS e ID con **la misma matriz 4×4** |

La matriz 4×4 equivale exactamente a `nivel = ⌊(a + b) / 2⌋`, que es lo que implementa nuestro motor de cálculo. La tesis reconoce que se eligió por ser **fácil de interpretar para el decisor**, y admite como extensión el uso de técnicas multicriterio (p. ej. eficiencia de Pareto).

**Ponderación del subfactor (PS):** escala 1 No cumple · 2 No sé · 3 Cumple parcialmente · 4 Cumple.
**Ponderación media del factor (PM):** media aritmética de sus subfactores, rango [1,0 – 4,0].

**Clasificación FODA** (regla 5.3):

| | Interno | Externo |
|---|---|---|
| **PM ≥ 3** | Fortaleza | Oportunidad |
| **PM < 3** | Debilidad | Amenaza |

*Internos* = determinados por la propia organización (Formación, Tiempo de adopción, Centralidad de TIC, Apoyo de la alta dirección, Actitud hacia el cambio, Coste total de propiedad). *Externos* = vienen dados por el software (Compatibilidad, Personalización, Prueba, Fiabilidad, Reusabilidad, Usabilidad, Mantenibilidad, Portabilidad, Documentación, Casos de estudio, Bloqueo de proveedores). **Soporte** es el único que puede ser interno o externo, y lo decide el decisor.

### 1.5 GUIOS: los 6 pasos (capítulo 6)

1. **Cálculo de la importancia relativa** de cada factor (IS × ID).
2. **Selección de factores relevantes**: se descartan los *Irrelevantes*; el decisor fija el alcance de *Soporte*.
3. **Evaluación de los subfactores** de cada factor relevante.
4. **Cálculo de la ponderación media** por factor.
5. **Clasificación FODA** de cada factor.
6. **Presentación de recomendaciones** de adopción.

GUIOS PRO agrupa los pasos de dos en dos en tres pantallas — exactamente la estructura que conserva nuestra aplicación.

### 1.6 Validación: piloto en la UNEMI

- **Contexto:** Universidad Estatal de Milagro (Ecuador). 4 facultades, 242 docentes titulares, 36 604 estudiantes. Departamento de TICs.
- **Participante:** la Directora de TICs (Ing. en Sistemas, Mg. en Gestión y Diseño Web; COBIT 5, ITIL, Scrum Master; 15 años de experiencia). Con aprobación del comité de ética y consentimiento informado.
- **Software evaluado:** **LibreOffice** (elegido de común acuerdo; la UNEMI no puede optar a suites de pago por política institucional).
- **Tiempos observados:** capacitación 1 h 40 min · pasos 1-2 → **15 min** · pasos 3-4 → **25 min** (los más lentos) · pasos 5-6 → 10 min · entrevista 45 min.

**Resultados de la entrevista:**

| Lo que funcionó | Lo que falló |
|---|---|
| "Lo más importante de la guía es que **organiza el proceso de adopción**, el cual habría sido propenso a errores si no se contara con pasos bien definidos." | La pantalla de los **pasos 3 y 4 es compleja**: se necesitan mínimo 3 clics por factor (seleccionar factor → evaluar → guardar), frente a 1 clic en la primera pantalla. |
| Valoró la **transparencia**: las ponderaciones precalculadas están siempre visibles. | Las **recomendaciones finales son "algo genéricas"**. |
| "Me resultó muy útil poder **regresar a las pantallas anteriores** y comprender el porqué de estos resultados." | Antes de GUIOS, las adopciones se decidían "siguiendo criterios muy limitados, como el costo económico y las opiniones en portales de comparación". |

**Mejoras que pidió la especialista:** mejor entrada de datos en los pasos 3-4, **trabajo colaborativo entre varios decisores** ("la decisión de adoptar un software no es responsabilidad de una persona") y **recomendaciones más personalizadas**.

### 1.7 Limitaciones y extensiones que la propia tesis plantea (capítulo 7)

La sección "Debate, limitaciones y extensiones" enumera explícitamente lo que le falta a GUIOS PRO:

1. **No permite agregar, modificar ni eliminar factores y subfactores** desde la herramienta.
2. **No tiene autenticación**: "no está diseñado para que un usuario pueda iniciar sesión", lo que impide conocer **quién realizó las evaluaciones anteriores, cuándo y con qué resultados** (sin historial).
3. **No ofrece evaluación multiusuario** ni colaboración entre decisores.
4. Podría soportar **otras métricas** (multicriterio, Pareto, técnicas semicualitativas).
5. Nuevas RSL y casos de estudio para ampliar dimensiones, factores y subfactores.

---

## 2. Hallazgos al contrastar la tesis con los archivos del prototipo

Los detectamos comparando la tesis con `legacy/main.py`, `data/factors.csv` y la matriz `MATRIZ RECOMENDACION GUIOSAD 2021.xlsx`. **Son el origen de las preguntas de la sección 3.**

| # | Hallazgo | Detalle |
|---|---|---|
| **H1** | **Las recomendaciones A/B/C están invertidas** entre la tesis y la matriz de 2021 | **Tesis (cap. 6, fig. 6.5-6.6):** A = *Adoptar* · B = *Adoptar con matices* · C = *Posponer la adopción*. **Matriz 2021 y prototipo:** A = *No es posible adoptar* · B = *Es posible adoptar* · C = *Adoptar*. Nuestra implementación sigue **la matriz de 2021** por ser posterior. |
| **H2** | **Dos importancias sugeridas no coinciden** | Tabla 5.3 de la tesis: **Usabilidad = Opcional (2)** y **Apoyo de la alta dirección = Importante (3)**. En `factors.csv` del prototipo están al revés: Usabilidad = 3 y Apoyo de la alta dirección = 2. Parece un intercambio al transcribir. El resto de los 16 factores coincide exactamente. |
| **H3** | **El criterio de decisión cambió de la tesis a la matriz** | La tesis (cap. 6) describe la recomendación por **conteo** ("las amenazas y debilidades son mayores a las oportunidades y fortalezas"). La matriz 2021 usa **cruce de FODA × importancia relativa** (si hay Amenaza/Debilidad en un factor Importante o Fundamental → A). El prototipo tiene el código de ambas versiones, una encima de la otra. |
| **H4** | **El prototipo original tiene errores que impiden ver la recomendación** | En `legacy/main.py`: `a, b, c = False` (línea del bloque "AUMENTADO POR KERLY") lanza `TypeError` al pulsar *Ver recomendación*; además `"{:.1f}".format(str(...))` y `the_importance_levels[global_weight - 1]` fallan con valores decimales. Nuestro motor reimplementa la lógica correctamente y la fija con pruebas automáticas. |
| **H5** | Todo lo demás **coincide al 100 %** | 3 dimensiones, 18 factores, 61 subfactores, alcance interno/externo de cada factor, *Soporte* como único "Ambos", escalas de 4 niveles, fórmula de importancia relativa y umbral FODA ≥ 3. |

---

## 3. Preguntas para el docente

### Sobre el modelo y el algoritmo (prioritarias)

1. **¿Qué nomenclatura de recomendaciones usamos?** En la tesis A significa *Adoptar* y C *Posponer*; en la matriz de 2021 es justo al revés. Nosotros implementamos la de la matriz de 2021. ¿Es la versión vigente o debemos alinearnos con la tesis? *(Afecta directamente a lo que ve el decisor en pantalla.)*
2. **¿Cuál es el valor correcto de la importancia sugerida de *Usabilidad* y de *Apoyo de la alta dirección*?** La tabla 5.3 de la tesis dice 2 y 3; el `factors.csv` del prototipo dice 3 y 2. ¿Corregimos el CSV según la tesis?
3. **¿La recomendación se decide por conteo (mayoría de F/O frente a D/A) o por el cruce FODA × importancia relativa de la matriz 2021?** Son dos criterios distintos y dan resultados distintos.
4. **¿El umbral FODA (PM ≥ 3) debe ser configurable** por la organización, o se mantiene fijo como en la tesis?
5. **¿Qué hacemos con el nivel "2 = No sé / Desconozco si cumple"?** Hoy cuenta como un 2 en la media, igual que "cumple parcialmente" a medias. ¿Debería tratarse aparte (p. ej. marcar el factor como "no evaluable" o pedir evidencia)?

### Sobre el alcance del proyecto

6. **¿Es aceptable que el sistema no tenga cuentas de usuario?** La tesis pide expresamente autenticación e historial como extensión futura. Nuestra propuesta guarda organización, evaluador y fecha como datos de la evaluación (sin credenciales), lo que da historial pero no identidad verificada. ¿Basta para el alcance del curso o el docente espera el login?
7. **¿Incluimos la evaluación colaborativa** (varios decisores sobre el mismo software, con consenso), que es la petición más fuerte de la especialista en la validación? Es lo que más valor añadiría, pero también lo que más cuesta.
8. **¿Hasta dónde puede llegar la IA?** Proponemos que el asistente **solo sugiera** valoraciones de subfactores con justificación y nivel de confianza, y que el evaluador acepte o descarte una por una; la recomendación final siempre sale del cálculo de GUIOS, nunca del modelo. ¿Está de acuerdo con ese límite? ¿Hay alguna objeción metodológica a que la IA proponga valoraciones?
9. **¿La herramienta debe permitir editar el catálogo** (añadir/quitar factores y subfactores), tal como pide la extensión del capítulo 7? ¿Cualquier usuario o solo un responsable?
10. **¿Qué caso de estudio usamos para validar?** ¿Repetimos LibreOffice en la UNEMI para poder comparar con los resultados de la tesis, u otro software (Moodle, Odoo)?

### Sobre la entrega académica

11. **¿Cómo citamos las cifras 22 vs 18 factores** en el informe? Proponemos: "22 factores identificados en la RSL, de los cuales 18 conforman la guía tras excluir 4 sin subfactores".
12. **¿El entregable final debe seguir ejecutándose con doble clic** (sin servidor), o se acepta/espera la versión con base de datos y despliegue web?
13. **¿Se puede publicar el repositorio y la aplicación** (GitHub Pages) siendo un trabajo basado en su tesis? ¿Qué licencia y qué forma de cita prefiere?
14. **¿Hay acceso a los datos de la encuesta a expertos** (las 57 respuestas) o a la matriz original en un formato más detallado? Nos serviría para validar los indicadores IE/IL.

---

## 4. Cambios planificados — resumen para presentar

### 4.1 Qué es lo que hicimos

Tomamos GUIOS PRO (prototipo Python/Flexx que había que abrir desde PyCharm) y lo reconstruimos como **aplicación web portable**: se abre con doble clic, sin instalar nada, y también puede publicarse en línea. **La guía no cambia**: mismas 3 dimensiones, 18 factores, 61 subfactores, mismas escalas de 4 niveles, misma fórmula de importancia relativa, mismo umbral FODA y misma matriz de recomendación.

### 4.2 Mejoras que responden a las limitaciones de la tesis

| Limitación / petición de la tesis | Nuestra respuesta | Estado |
|---|---|---|
| Pasos 3-4 con entrada de datos compleja (3 clics por factor, 25 min de interacción) | Lista lateral con progreso por factor, un solo control por pregunta, guardado automático (sin botón "Guardar"), buscador y filtro de pendientes | Hecho / Sprint 1 |
| "Regresar a pantallas anteriores para entender el resultado" | Navegación libre entre pasos, interruptor **"Ver cálculo"** y detalle por factor en el informe | Hecho |
| Recomendaciones "algo genéricas" | La recomendación nombra **los factores críticos concretos** que la provocan; y un **resumen ejecutivo generado por IA** que cita factores y ponderaciones | Hecho / Sprint 4 |
| No se puede mantener el catálogo de factores | **Pantalla de administración** del catálogo (añadir, editar, versionar) | Sprint 3 |
| No hay historial: no se sabe quién evaluó, cuándo ni con qué resultado | **Catálogo de software + historial de evaluaciones** con evaluador, fecha, estado y recomendación, guardados en PostgreSQL | Sprint 2-3 |
| Decisión de una sola persona | **Comparador de varios candidatos** y exportación de informes para presentar al comité | Sprint 4 |
| Otras métricas de evaluación | Fuera del alcance por ahora; el motor está aislado y probado, de modo que añadir una métrica nueva no obliga a rehacer la interfaz | Propuesta futura |

### 4.3 Lo nuevo que aporta el proyecto

- **Motor de cálculo separado de la interfaz** (`engine.js`), con **8 pruebas automáticas** que fijan los resultados A/B/C: cualquier cambio que altere el algoritmo rompe la compilación. En el prototipo original la lógica estaba mezclada con la interfaz y **tenía errores que impedían mostrar la recomendación**.
- **Datos maestros versionados** (`data/*.csv`, `recomendaciones.json`): cambiar un subfactor es editar una línea y regenerar; no se toca el código.
- **Diseño de base de datos** completo en PostgreSQL (`db/schema.sql`) con su carga de catálogo generada automáticamente.
- **Interfaz accesible y responsive**, en español, con modo claro y oscuro, informe imprimible en PDF y exportación/importación en JSON.
- **Asistente de IA** (propuesta): sugiere la valoración de cada subfactor con justificación y nivel de confianza; el evaluador decide. Queda registro de qué sugirió la IA y qué aceptó la persona.
- **Gestión del proyecto con SCRUM**: 5 desarrolladores, 5 sprints (22 sep – 30 nov 2026), 53 tareas con criterios de aceptación y un tablero listo para importar en Jira.

### 4.4 Lo que queremos que el docente confirme

1. La nomenclatura A/B/C (pregunta 1).
2. Los dos valores de importancia sugerida en disputa (pregunta 2).
3. Que el sistema **sin cuentas de usuario** es aceptable (pregunta 6).
4. El límite del papel de la IA: **sugerir, nunca decidir** (pregunta 8).
5. El caso de estudio para la validación (pregunta 10).
