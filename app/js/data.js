// ARCHIVO GENERADO — no editar a mano. Fuente: data/*.csv y data/recomendaciones.json
// Regenerar con: python scripts/build_data.py
// 3 dimensiones, 18 factores, 61 subfactores
window.GUIOS_DATA = {
  "version": "1.0.0",
  "dimensiones": [
    {
      "id": "D1",
      "nombre": "Tecnológica"
    },
    {
      "id": "D2",
      "nombre": "Organizacional"
    },
    {
      "id": "D3",
      "nombre": "Económica"
    }
  ],
  "factores": [
    {
      "id": "F01",
      "nombre": "Compatibilidad",
      "dimension": "D1",
      "importanciaSugerida": 3,
      "alcance": "Externo",
      "subfactores": [
        {
          "id": "F01-S01",
          "nombre": "Una empresa proporciona una infraestructura de nube lista para usar para este software"
        },
        {
          "id": "F01-S02",
          "nombre": "Los programas informáticos pueden exportar formatos propietarios"
        },
        {
          "id": "F01-S03",
          "nombre": "El software interactúa y se integra con el software propietario existente"
        },
        {
          "id": "F01-S04",
          "nombre": "El software está certificado para operar en su nicho de mercado"
        },
        {
          "id": "F01-S05",
          "nombre": "El software es compatible con los casos de uso y las funcionalidades más comunes"
        },
        {
          "id": "F01-S06",
          "nombre": "El software es compatible con múltiples componentes de hardware"
        },
        {
          "id": "F01-S07",
          "nombre": "El software utiliza formatos estándar"
        },
        {
          "id": "F01-S08",
          "nombre": "El software es compatible con varios sistemas operativos diferentes (el software es multiplataforma)"
        }
      ]
    },
    {
      "id": "F02",
      "nombre": "Personalización",
      "dimension": "D1",
      "importanciaSugerida": 3,
      "alcance": "Externo",
      "subfactores": [
        {
          "id": "F02-S01",
          "nombre": "El acceso al código fuente es un incentivo para la organización"
        },
        {
          "id": "F02-S02",
          "nombre": "El software se puede ampliar fácilmente para satisfacer las necesidades de la organización modificando el código fuente"
        },
        {
          "id": "F02-S03",
          "nombre": "Las innovaciones se introducen en el software a un ritmo rápido"
        },
        {
          "id": "F02-S04",
          "nombre": "El software es fácil de personalizar sin necesidad de modificar el códigofuente"
        },
        {
          "id": "F02-S05",
          "nombre": "El software soporta nuevas funciones a través de módulos (el software es modular)"
        },
        {
          "id": "F02-S06",
          "nombre": "Hay un repositorio público de extensiones para este software"
        }
      ]
    },
    {
      "id": "F03",
      "nombre": "Prueba",
      "dimension": "D1",
      "importanciaSugerida": 3,
      "alcance": "Externo",
      "subfactores": [
        {
          "id": "F03-S01",
          "nombre": "El software es fácil de desplegar y de probar"
        }
      ]
    },
    {
      "id": "F04",
      "nombre": "Fiabilidad",
      "dimension": "D1",
      "importanciaSugerida": 3,
      "alcance": "Externo",
      "subfactores": [
        {
          "id": "F04-S01",
          "nombre": "El software es fiable y estable"
        },
        {
          "id": "F04-S02",
          "nombre": "El software tiene un buen historial en cuanto a errores de seguridad (el software es seguro)"
        },
        {
          "id": "F04-S03",
          "nombre": "El software es más flexible que la solución propietaria"
        },
        {
          "id": "F04-S04",
          "nombre": "El software es más confiable que la solución propietaria"
        },
        {
          "id": "F04-S05",
          "nombre": "El programa proporciona una amplia variedad de funciones de control de acceso"
        }
      ]
    },
    {
      "id": "F05",
      "nombre": "Reusabilidad",
      "dimension": "D1",
      "importanciaSugerida": 2,
      "alcance": "Externo",
      "subfactores": [
        {
          "id": "F05-S01",
          "nombre": "La licencia permite extensiones propietarias"
        },
        {
          "id": "F05-S02",
          "nombre": "El software se ofrece como una biblioteca / marco de trabajo"
        }
      ]
    },
    {
      "id": "F06",
      "nombre": "Usabilidad",
      "dimension": "D1",
      "importanciaSugerida": 3,
      "alcance": "Externo",
      "subfactores": [
        {
          "id": "F06-S01",
          "nombre": "El software proporciona una interfaz gráfica de usuario (GUI)"
        },
        {
          "id": "F06-S02",
          "nombre": "El software es más fácil de usar que la alternativa propietaria"
        },
        {
          "id": "F06-S03",
          "nombre": "El software es fácil de aprender"
        },
        {
          "id": "F06-S04",
          "nombre": "El usuario está descontento con el software propietario"
        }
      ]
    },
    {
      "id": "F07",
      "nombre": "Mantenibilidad",
      "dimension": "D1",
      "importanciaSugerida": 3,
      "alcance": "Externo",
      "subfactores": [
        {
          "id": "F07-S01",
          "nombre": "El software es mantenido activamente por los desarrolladores"
        }
      ]
    },
    {
      "id": "F08",
      "nombre": "Portabilidad",
      "dimension": "D1",
      "importanciaSugerida": 2,
      "alcance": "Externo",
      "subfactores": [
        {
          "id": "F08-S01",
          "nombre": "Una versión de aplicación móvil de este software está disponible"
        },
        {
          "id": "F08-S02",
          "nombre": "El software es una sistemas de administración de base de datos independiente"
        }
      ]
    },
    {
      "id": "F09",
      "nombre": "Documentación",
      "dimension": "D1",
      "importanciaSugerida": 2,
      "alcance": "Externo",
      "subfactores": [
        {
          "id": "F09-S01",
          "nombre": "El software está bien documentado"
        },
        {
          "id": "F09-S02",
          "nombre": "La documentación de desarrollo cubre todas las características"
        },
        {
          "id": "F09-S03",
          "nombre": "La documentación está disponible en múltiples formatos"
        },
        {
          "id": "F09-S04",
          "nombre": "La documentación es fácil de entender"
        },
        {
          "id": "F09-S05",
          "nombre": "La documentación está actualizada"
        },
        {
          "id": "F09-S06",
          "nombre": "La documentación está escrita por escritores especializados (no desarrolladores)"
        },
        {
          "id": "F09-S07",
          "nombre": "La documentación del software es de alta calidad"
        },
        {
          "id": "F09-S08",
          "nombre": "El software viene con documentación de desarrollo"
        },
        {
          "id": "F09-S09",
          "nombre": "El software viene con documentación de usuario"
        },
        {
          "id": "F09-S10",
          "nombre": "La documentación del usuario cubre todas las características"
        },
        {
          "id": "F09-S11",
          "nombre": "Los formatos de datos están bien documentados"
        }
      ]
    },
    {
      "id": "F10",
      "nombre": "Formación",
      "dimension": "D2",
      "importanciaSugerida": 3,
      "alcance": "Interno",
      "subfactores": [
        {
          "id": "F10-S01",
          "nombre": "La adopción de este software permite a los usuarios mejorar las habilidades técnicas de TI"
        },
        {
          "id": "F10-S02",
          "nombre": "El personal de la organización puede aprender fácilmente por sí mismo a utilizar este software"
        },
        {
          "id": "F10-S03",
          "nombre": "El personal de la organización está capacitado para resolver problemas tecnológicos"
        },
        {
          "id": "F10-S04",
          "nombre": "Los planes de entrenamiento de este software están disponibles"
        }
      ]
    },
    {
      "id": "F11",
      "nombre": "Tiempo de adopción",
      "dimension": "D2",
      "importanciaSugerida": 2,
      "alcance": "Interno",
      "subfactores": [
        {
          "id": "F11-S01",
          "nombre": "Los requisitos de instalación y despliegue del software son fáciles de cumplir"
        },
        {
          "id": "F11-S02",
          "nombre": "El tiempo requerido para adoptar este software es bajo"
        }
      ]
    },
    {
      "id": "F12",
      "nombre": "Casos de estudio de adopción FLOSS",
      "dimension": "D2",
      "importanciaSugerida": 2,
      "alcance": "Externo",
      "subfactores": [
        {
          "id": "F12-S01",
          "nombre": "Hay informes públicos disponibles en Internet que describen el éxito de la adopción de este software"
        }
      ]
    },
    {
      "id": "F13",
      "nombre": "Centralidad de la tecnología de la información",
      "dimension": "D2",
      "importanciaSugerida": 2,
      "alcance": "Interno",
      "subfactores": [
        {
          "id": "F13-S01",
          "nombre": "La adopción de este software mejora el entorno de trabajo de los usuarios"
        },
        {
          "id": "F13-S02",
          "nombre": "Centralizar la infraestructura de TI ayuda a acelerar la adopción de este software"
        }
      ]
    },
    {
      "id": "F14",
      "nombre": "Apoyo de la alta dirección",
      "dimension": "D2",
      "importanciaSugerida": 2,
      "alcance": "Interno",
      "subfactores": [
        {
          "id": "F14-S01",
          "nombre": "La alta dirección apoya la adopción exitosa de este software"
        }
      ]
    },
    {
      "id": "F15",
      "nombre": "Bloqueo de proveedores",
      "dimension": "D2",
      "importanciaSugerida": 2,
      "alcance": "Externo",
      "subfactores": [
        {
          "id": "F15-S01",
          "nombre": "El software reduce las dependencias de los proveedores en su entorno"
        }
      ]
    },
    {
      "id": "F16",
      "nombre": "Soporte",
      "dimension": "D2",
      "importanciaSugerida": 3,
      "alcance": "Ambos",
      "subfactores": [
        {
          "id": "F16-S01",
          "nombre": "El soporte de la comunidad para este software está disponible"
        },
        {
          "id": "F16-S02",
          "nombre": "Soporte de expertos y consultores externos para consultas específicas está disponible"
        },
        {
          "id": "F16-S03",
          "nombre": "El soporte comercial de este software está disponible 24/7/365"
        },
        {
          "id": "F16-S04",
          "nombre": "Hay desarrolladores en su organización que saben cómo desarrollar este software"
        },
        {
          "id": "F16-S05",
          "nombre": "Soporte comercial para la personalización de software está disponible"
        },
        {
          "id": "F16-S06",
          "nombre": "Es fácil contratar personal informático en la comunidad que conozca este software"
        }
      ]
    },
    {
      "id": "F17",
      "nombre": "Actitud hacia el cambio",
      "dimension": "D2",
      "importanciaSugerida": 2,
      "alcance": "Interno",
      "subfactores": [
        {
          "id": "F17-S01",
          "nombre": "El personal de la organización muestra poca resistencia al cambio tecnológico"
        },
        {
          "id": "F17-S02",
          "nombre": "El personal técnico encargado del despliegue y soporte en la organización respalda la adopción de este software"
        }
      ]
    },
    {
      "id": "F18",
      "nombre": "Coste total de propiedad",
      "dimension": "D3",
      "importanciaSugerida": 3,
      "alcance": "Interno",
      "subfactores": [
        {
          "id": "F18-S01",
          "nombre": "Es poco probable que haya costos ocultos al adoptar este software"
        },
        {
          "id": "F18-S02",
          "nombre": "La adopción de este software es menos costosa que la alternativa patentada"
        }
      ]
    }
  ],
  "nivelesImportancia": [
    "Irrelevante",
    "Opcional",
    "Importante",
    "Fundamental"
  ],
  "nivelesSubfactor": [
    "No cumple el requisito",
    "Desconozco si cumple el requisito",
    "Cumple parcialmente el requisito",
    "Cumple el requisito"
  ],
  "umbralFoda": 3,
  "reglas": [
    {
      "codigo": "A",
      "titulo": "No es posible adoptar",
      "tono": "danger",
      "condicion": {
        "foda": [
          "Amenaza",
          "Debilidad"
        ],
        "importancia_relativa": [
          "Importante",
          "Fundamental"
        ]
      },
      "texto": "No es posible adoptar. Se han detectado amenazas y/o debilidades en factores cuya importancia relativa es fundamental o importante, por lo tanto, es indispensable que el decisor revise los subfactores que no cumplen con lo mínimo requerido para adoptar la solución FLOSS. Esta revisión consistiría en proporcionar recursos (humano, tecnológico, económico, etc.) para mitigar en gran medida los subfactores con baja valoración."
    },
    {
      "codigo": "B",
      "titulo": "Es posible adoptar con reservas",
      "tono": "warning",
      "condicion": {
        "foda": [
          "Amenaza",
          "Debilidad"
        ],
        "importancia_relativa": [
          "Opcional"
        ]
      },
      "texto": "Es posible adoptar. A pesar de que se han detectado amenazas y/o debilidades, estas corresponden a factores cuya importancia relativa es opcional; por lo tanto, se sugiere revisar los criterios que no cumplen con lo mínimo requerido para adoptar."
    },
    {
      "codigo": "C",
      "titulo": "Adoptar",
      "tono": "success",
      "condicion": null,
      "texto": "Es posible adoptar. Todos los factores han sido identificados como Oportunidades y/o Fortalezas. Esto quiere decir que la organización cumple satisfactoriamente con la mayoría de requisitos para adoptar la solución FLOSS."
    }
  ]
};
