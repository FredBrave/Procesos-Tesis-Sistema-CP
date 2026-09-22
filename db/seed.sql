-- ARCHIVO GENERADO — no editar a mano. Fuente: data/*.csv y data/recomendaciones.json
-- Regenerar con: python scripts/build_data.py && python scripts/build_seed_sql.py
BEGIN;

INSERT INTO nivel_importancia (valor, etiqueta) VALUES
  (1, 'Irrelevante'),
  (2, 'Opcional'),
  (3, 'Importante'),
  (4, 'Fundamental');

INSERT INTO nivel_cumplimiento (valor, etiqueta) VALUES
  (1, 'No cumple'),
  (2, 'Desconozco si cumple'),
  (3, 'Cumple parcialmente'),
  (4, 'Cumple');

INSERT INTO dimension (codigo, nombre) VALUES
  ('D1', 'Tecnológica'),
  ('D2', 'Organizacional'),
  ('D3', 'Económica');

INSERT INTO factor (codigo, id_dimension, nombre, importancia_sugerida, alcance, orden) VALUES
  ('F01', (SELECT id_dimension FROM dimension WHERE codigo = 'D1'), 'Compatibilidad', 3, 'Externo', 1),
  ('F02', (SELECT id_dimension FROM dimension WHERE codigo = 'D1'), 'Personalización', 3, 'Externo', 2),
  ('F03', (SELECT id_dimension FROM dimension WHERE codigo = 'D1'), 'Prueba', 3, 'Externo', 3),
  ('F04', (SELECT id_dimension FROM dimension WHERE codigo = 'D1'), 'Fiabilidad', 3, 'Externo', 4),
  ('F05', (SELECT id_dimension FROM dimension WHERE codigo = 'D1'), 'Reusabilidad', 2, 'Externo', 5),
  ('F06', (SELECT id_dimension FROM dimension WHERE codigo = 'D1'), 'Usabilidad', 3, 'Externo', 6),
  ('F07', (SELECT id_dimension FROM dimension WHERE codigo = 'D1'), 'Mantenibilidad', 3, 'Externo', 7),
  ('F08', (SELECT id_dimension FROM dimension WHERE codigo = 'D1'), 'Portabilidad', 2, 'Externo', 8),
  ('F09', (SELECT id_dimension FROM dimension WHERE codigo = 'D1'), 'Documentación', 2, 'Externo', 9),
  ('F10', (SELECT id_dimension FROM dimension WHERE codigo = 'D2'), 'Formación', 3, 'Interno', 10),
  ('F11', (SELECT id_dimension FROM dimension WHERE codigo = 'D2'), 'Tiempo de adopción', 2, 'Interno', 11),
  ('F12', (SELECT id_dimension FROM dimension WHERE codigo = 'D2'), 'Casos de estudio de adopción FLOSS', 2, 'Externo', 12),
  ('F13', (SELECT id_dimension FROM dimension WHERE codigo = 'D2'), 'Centralidad de la tecnología de la información', 2, 'Interno', 13),
  ('F14', (SELECT id_dimension FROM dimension WHERE codigo = 'D2'), 'Apoyo de la alta dirección', 2, 'Interno', 14),
  ('F15', (SELECT id_dimension FROM dimension WHERE codigo = 'D2'), 'Bloqueo de proveedores', 2, 'Externo', 15),
  ('F16', (SELECT id_dimension FROM dimension WHERE codigo = 'D2'), 'Soporte', 3, 'Ambos', 16),
  ('F17', (SELECT id_dimension FROM dimension WHERE codigo = 'D2'), 'Actitud hacia el cambio', 2, 'Interno', 17),
  ('F18', (SELECT id_dimension FROM dimension WHERE codigo = 'D3'), 'Coste total de propiedad', 3, 'Interno', 18);

INSERT INTO subfactor (codigo, id_factor, enunciado, orden) VALUES
  ('F01-S01', (SELECT id_factor FROM factor WHERE codigo = 'F01'), 'Una empresa proporciona una infraestructura de nube lista para usar para este software', 1),
  ('F01-S02', (SELECT id_factor FROM factor WHERE codigo = 'F01'), 'Los programas informáticos pueden exportar formatos propietarios', 2),
  ('F01-S03', (SELECT id_factor FROM factor WHERE codigo = 'F01'), 'El software interactúa y se integra con el software propietario existente', 3),
  ('F01-S04', (SELECT id_factor FROM factor WHERE codigo = 'F01'), 'El software está certificado para operar en su nicho de mercado', 4),
  ('F01-S05', (SELECT id_factor FROM factor WHERE codigo = 'F01'), 'El software es compatible con los casos de uso y las funcionalidades más comunes', 5),
  ('F01-S06', (SELECT id_factor FROM factor WHERE codigo = 'F01'), 'El software es compatible con múltiples componentes de hardware', 6),
  ('F01-S07', (SELECT id_factor FROM factor WHERE codigo = 'F01'), 'El software utiliza formatos estándar', 7),
  ('F01-S08', (SELECT id_factor FROM factor WHERE codigo = 'F01'), 'El software es compatible con varios sistemas operativos diferentes (el software es multiplataforma)', 8),
  ('F02-S01', (SELECT id_factor FROM factor WHERE codigo = 'F02'), 'El acceso al código fuente es un incentivo para la organización', 1),
  ('F02-S02', (SELECT id_factor FROM factor WHERE codigo = 'F02'), 'El software se puede ampliar fácilmente para satisfacer las necesidades de la organización modificando el código fuente', 2),
  ('F02-S03', (SELECT id_factor FROM factor WHERE codigo = 'F02'), 'Las innovaciones se introducen en el software a un ritmo rápido', 3),
  ('F02-S04', (SELECT id_factor FROM factor WHERE codigo = 'F02'), 'El software es fácil de personalizar sin necesidad de modificar el códigofuente', 4),
  ('F02-S05', (SELECT id_factor FROM factor WHERE codigo = 'F02'), 'El software soporta nuevas funciones a través de módulos (el software es modular)', 5),
  ('F02-S06', (SELECT id_factor FROM factor WHERE codigo = 'F02'), 'Hay un repositorio público de extensiones para este software', 6),
  ('F03-S01', (SELECT id_factor FROM factor WHERE codigo = 'F03'), 'El software es fácil de desplegar y de probar', 1),
  ('F04-S01', (SELECT id_factor FROM factor WHERE codigo = 'F04'), 'El software es fiable y estable', 1),
  ('F04-S02', (SELECT id_factor FROM factor WHERE codigo = 'F04'), 'El software tiene un buen historial en cuanto a errores de seguridad (el software es seguro)', 2),
  ('F04-S03', (SELECT id_factor FROM factor WHERE codigo = 'F04'), 'El software es más flexible que la solución propietaria', 3),
  ('F04-S04', (SELECT id_factor FROM factor WHERE codigo = 'F04'), 'El software es más confiable que la solución propietaria', 4),
  ('F04-S05', (SELECT id_factor FROM factor WHERE codigo = 'F04'), 'El programa proporciona una amplia variedad de funciones de control de acceso', 5),
  ('F05-S01', (SELECT id_factor FROM factor WHERE codigo = 'F05'), 'La licencia permite extensiones propietarias', 1),
  ('F05-S02', (SELECT id_factor FROM factor WHERE codigo = 'F05'), 'El software se ofrece como una biblioteca / marco de trabajo', 2),
  ('F06-S01', (SELECT id_factor FROM factor WHERE codigo = 'F06'), 'El software proporciona una interfaz gráfica de usuario (GUI)', 1),
  ('F06-S02', (SELECT id_factor FROM factor WHERE codigo = 'F06'), 'El software es más fácil de usar que la alternativa propietaria', 2),
  ('F06-S03', (SELECT id_factor FROM factor WHERE codigo = 'F06'), 'El software es fácil de aprender', 3),
  ('F06-S04', (SELECT id_factor FROM factor WHERE codigo = 'F06'), 'El usuario está descontento con el software propietario', 4),
  ('F07-S01', (SELECT id_factor FROM factor WHERE codigo = 'F07'), 'El software es mantenido activamente por los desarrolladores', 1),
  ('F08-S01', (SELECT id_factor FROM factor WHERE codigo = 'F08'), 'Una versión de aplicación móvil de este software está disponible', 1),
  ('F08-S02', (SELECT id_factor FROM factor WHERE codigo = 'F08'), 'El software es una sistemas de administración de base de datos independiente', 2),
  ('F09-S01', (SELECT id_factor FROM factor WHERE codigo = 'F09'), 'El software está bien documentado', 1),
  ('F09-S02', (SELECT id_factor FROM factor WHERE codigo = 'F09'), 'La documentación de desarrollo cubre todas las características', 2),
  ('F09-S03', (SELECT id_factor FROM factor WHERE codigo = 'F09'), 'La documentación está disponible en múltiples formatos', 3),
  ('F09-S04', (SELECT id_factor FROM factor WHERE codigo = 'F09'), 'La documentación es fácil de entender', 4),
  ('F09-S05', (SELECT id_factor FROM factor WHERE codigo = 'F09'), 'La documentación está actualizada', 5),
  ('F09-S06', (SELECT id_factor FROM factor WHERE codigo = 'F09'), 'La documentación está escrita por escritores especializados (no desarrolladores)', 6),
  ('F09-S07', (SELECT id_factor FROM factor WHERE codigo = 'F09'), 'La documentación del software es de alta calidad', 7),
  ('F09-S08', (SELECT id_factor FROM factor WHERE codigo = 'F09'), 'El software viene con documentación de desarrollo', 8),
  ('F09-S09', (SELECT id_factor FROM factor WHERE codigo = 'F09'), 'El software viene con documentación de usuario', 9),
  ('F09-S10', (SELECT id_factor FROM factor WHERE codigo = 'F09'), 'La documentación del usuario cubre todas las características', 10),
  ('F09-S11', (SELECT id_factor FROM factor WHERE codigo = 'F09'), 'Los formatos de datos están bien documentados', 11),
  ('F10-S01', (SELECT id_factor FROM factor WHERE codigo = 'F10'), 'La adopción de este software permite a los usuarios mejorar las habilidades técnicas de TI', 1),
  ('F10-S02', (SELECT id_factor FROM factor WHERE codigo = 'F10'), 'El personal de la organización puede aprender fácilmente por sí mismo a utilizar este software', 2),
  ('F10-S03', (SELECT id_factor FROM factor WHERE codigo = 'F10'), 'El personal de la organización está capacitado para resolver problemas tecnológicos', 3),
  ('F10-S04', (SELECT id_factor FROM factor WHERE codigo = 'F10'), 'Los planes de entrenamiento de este software están disponibles', 4),
  ('F11-S01', (SELECT id_factor FROM factor WHERE codigo = 'F11'), 'Los requisitos de instalación y despliegue del software son fáciles de cumplir', 1),
  ('F11-S02', (SELECT id_factor FROM factor WHERE codigo = 'F11'), 'El tiempo requerido para adoptar este software es bajo', 2),
  ('F12-S01', (SELECT id_factor FROM factor WHERE codigo = 'F12'), 'Hay informes públicos disponibles en Internet que describen el éxito de la adopción de este software', 1),
  ('F13-S01', (SELECT id_factor FROM factor WHERE codigo = 'F13'), 'La adopción de este software mejora el entorno de trabajo de los usuarios', 1),
  ('F13-S02', (SELECT id_factor FROM factor WHERE codigo = 'F13'), 'Centralizar la infraestructura de TI ayuda a acelerar la adopción de este software', 2),
  ('F14-S01', (SELECT id_factor FROM factor WHERE codigo = 'F14'), 'La alta dirección apoya la adopción exitosa de este software', 1),
  ('F15-S01', (SELECT id_factor FROM factor WHERE codigo = 'F15'), 'El software reduce las dependencias de los proveedores en su entorno', 1),
  ('F16-S01', (SELECT id_factor FROM factor WHERE codigo = 'F16'), 'El soporte de la comunidad para este software está disponible', 1),
  ('F16-S02', (SELECT id_factor FROM factor WHERE codigo = 'F16'), 'Soporte de expertos y consultores externos para consultas específicas está disponible', 2),
  ('F16-S03', (SELECT id_factor FROM factor WHERE codigo = 'F16'), 'El soporte comercial de este software está disponible 24/7/365', 3),
  ('F16-S04', (SELECT id_factor FROM factor WHERE codigo = 'F16'), 'Hay desarrolladores en su organización que saben cómo desarrollar este software', 4),
  ('F16-S05', (SELECT id_factor FROM factor WHERE codigo = 'F16'), 'Soporte comercial para la personalización de software está disponible', 5),
  ('F16-S06', (SELECT id_factor FROM factor WHERE codigo = 'F16'), 'Es fácil contratar personal informático en la comunidad que conozca este software', 6),
  ('F17-S01', (SELECT id_factor FROM factor WHERE codigo = 'F17'), 'El personal de la organización muestra poca resistencia al cambio tecnológico', 1),
  ('F17-S02', (SELECT id_factor FROM factor WHERE codigo = 'F17'), 'El personal técnico encargado del despliegue y soporte en la organización respalda la adopción de este software', 2),
  ('F18-S01', (SELECT id_factor FROM factor WHERE codigo = 'F18'), 'Es poco probable que haya costos ocultos al adoptar este software', 1),
  ('F18-S02', (SELECT id_factor FROM factor WHERE codigo = 'F18'), 'La adopción de este software es menos costosa que la alternativa patentada', 2);

INSERT INTO regla_recomendacion (codigo, orden, titulo, tono, foda_condicion, importancia_condicion, texto) VALUES
  ('A', 1, 'No es posible adoptar', 'danger', ARRAY['Amenaza', 'Debilidad']::TEXT[], ARRAY['Importante', 'Fundamental']::TEXT[], 'No es posible adoptar. Se han detectado amenazas y/o debilidades en factores cuya importancia relativa es fundamental o importante, por lo tanto, es indispensable que el decisor revise los subfactores que no cumplen con lo mínimo requerido para adoptar la solución FLOSS. Esta revisión consistiría en proporcionar recursos (humano, tecnológico, económico, etc.) para mitigar en gran medida los subfactores con baja valoración.'),
  ('B', 2, 'Es posible adoptar con reservas', 'warning', ARRAY['Amenaza', 'Debilidad']::TEXT[], ARRAY['Opcional']::TEXT[], 'Es posible adoptar. A pesar de que se han detectado amenazas y/o debilidades, estas corresponden a factores cuya importancia relativa es opcional; por lo tanto, se sugiere revisar los criterios que no cumplen con lo mínimo requerido para adoptar.'),
  ('C', 3, 'Adoptar', 'success', NULL, NULL, 'Es posible adoptar. Todos los factores han sido identificados como Oportunidades y/o Fortalezas. Esto quiere decir que la organización cumple satisfactoriamente con la mayoría de requisitos para adoptar la solución FLOSS.');

COMMIT;
