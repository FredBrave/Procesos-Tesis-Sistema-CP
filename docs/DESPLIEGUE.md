# Guía de publicación de GUIOS PRO

GUIOS PRO tiene dos partes, y se publican por separado:

| Parte | Qué es | ¿Es obligatoria? |
|---|---|---|
| Aplicación web | La carpeta `app/`: HTML, CSS y JavaScript sin compilación | Sí. Con ella sola el software funciona completo, guardando los datos en el navegador |
| Servidor | La carpeta `api/`: Node 22.13 o superior, sin dependencias | No. Solo hace falta para sincronizar entre equipos y para el asistente de IA |

Para la presentación en clase basta con publicar la aplicación. Si se quiere mostrar la IA desde las Chromebooks, hay que publicar también el servidor, como se explica en el apartado 4.

## 1. Aplicación en GitHub Pages (recomendada)

El repositorio ya tiene la publicación automatizada en `.github/workflows/ci.yml`: en cada cambio en `main` se ejecutan las pruebas y, si pasan, se publica la carpeta `app/`. Solo hay que activar Pages una vez.

1. Entrar al repositorio en GitHub con la cuenta propietaria.
2. Ir a **Settings → Pages**.
3. En **Build and deployment → Source**, elegir **GitHub Actions**.
4. Ir a **Actions → CI**, abrir la última ejecución y pulsar **Re-run all jobs**. También vale hacer cualquier commit en `main`.
5. Cuando termine, el trabajo «Publicar app en GitHub Pages» muestra el enlace:

   https://fredbrave.github.io/Procesos-Tesis-Sistema-CP/

Si el paso `configure-pages` falla con «Not Found», Pages no está activado: revisar el paso 3.

## 2. Aplicación en Vercel

1. Crear una cuenta en https://vercel.com con la cuenta de GitHub.
2. Pulsar **Add New → Project** e importar el repositorio `Procesos-Tesis-Sistema-CP`.
3. En la configuración del proyecto:
   - **Framework Preset:** Other.
   - **Root Directory:** `app`. Pulsar Edit y elegir esa carpeta.
   - **Build Command** y **Output Directory:** dejarlos vacíos, porque no hay nada que compilar.
4. Pulsar **Deploy**. Vercel muestra un enlace del tipo `https://procesos-tesis-sistema-cp.vercel.app`.

Cada commit en `main` vuelve a publicar la aplicación automáticamente.

## 3. Aplicación en Netlify, sin cuenta de GitHub

1. Descargar el repositorio con **Code → Download ZIP** y descomprimirlo.
2. Abrir https://app.netlify.com/drop.
3. Arrastrar la carpeta `app` a la página. Netlify publica la aplicación y muestra el enlace.

Con este método las actualizaciones no son automáticas: hay que volver a arrastrar la carpeta.

## 4. Servidor en Render, para la IA y la sincronización

Render ofrece un plan gratuito que ejecuta Node directamente desde el repositorio.

1. Crear una cuenta en https://render.com con la cuenta de GitHub.
2. Pulsar **New → Web Service** y elegir el repositorio.
3. Configurar:
   - **Language:** Node.
   - **Branch:** main.
   - **Build Command:** `npm install`.
   - **Start Command:** `node api/server.js`.
   - **Instance Type:** Free.
4. En **Environment**, añadir estas variables:

   | Variable | Valor |
   |---|---|
   | `NODE_VERSION` | `24` |
   | `HOST` | `0.0.0.0` |
   | `OPENROUTER_API_KEY` | la clave de OpenRouter del equipo |
   | `GUIOS_CORS` | el dominio donde se publicó la aplicación, sin barra final; por ejemplo `https://fredbrave.github.io` |
   | `IA_LIMITE_DIARIO` | `40` |

   Render asigna el puerto con la variable `PORT`, que el servidor ya lee.
5. En **Health Check Path** escribir `/api/salud` y pulsar **Create Web Service**.
6. Al terminar, abrir `https://NOMBRE.onrender.com/api/salud`. Debe responder `"ok":true` y `"ia":{"disponible":true,"proveedor":"openrouter"}`.

Conectar la aplicación con el servidor:

1. Abrir la aplicación publicada e ir a **Sistema → Configuración**.
2. Activar **Usar servidor**, escribir `https://NOMBRE.onrender.com` y pulsar **Probar conexión**.
3. Si indica «Conectado · IA disponible», pulsar **Guardar**.

Cada navegador guarda su propia configuración, así que hay que hacer estos tres pasos en cada Chromebook que vaya a usar la IA.

### Limitaciones del plan gratuito

- **Render** apaga el servidor tras 15 minutos sin uso, y la primera petición después tarda alrededor de un minuto. Antes de presentar, abrir `/api/salud` para despertarlo.
- **Render** borra la base de datos SQLite al reiniciar o volver a publicar, porque el disco del plan gratuito no es permanente. Para una demostración no importa: los datos siguen guardados en cada navegador. Para conservarlos, añadir un disco de pago y definir `GUIOS_DB=/var/data/guiospro.db`.
- **OpenRouter**, con una cuenta sin créditos, permite 50 peticiones al día a los modelos gratuitos, y cada respuesta tarda de 15 a 35 segundos. Cada clic en «Sugerir con IA» o «Redactar con IA» gasta una petición, o dos si hay que reintentar. Con al menos 10 USD de créditos el límite sube a 1000 al día, y el servidor usa Claude Haiku 5.5, que responde en 2 o 3 segundos.

## 5. Ejecutarlo en un equipo propio

- **Solo la aplicación:** abrir `app/index.html` con doble clic.
- **Con servidor:** con Node 22.13 o superior, ejecutar en la carpeta del repositorio:

  ```bash
  npm run serve                                   # aplicación en http://localhost:8080
  OPENROUTER_API_KEY=... npm run api              # servidor en http://localhost:8787
  IA_PROVEEDOR=simulado npm run api               # o con IA simulada, sin clave
  ```

  En PowerShell, las variables se definen antes del comando: `$env:OPENROUTER_API_KEY="..."; npm run api`.

## 6. Comprobación antes de entregar

- [ ] El enlace de la aplicación abre la pantalla de inicio.
- [ ] Más → Cargar ejemplo muestra el Panel con tres evaluaciones.
- [ ] El informe de Moodle se imprime en tres páginas o menos.
- [ ] Si se usa servidor: `/api/salud` responde, Configuración indica «Conectado · IA disponible» y «Sugerir con IA» devuelve sugerencias en el paso 2.
- [ ] El enlace del repositorio es público: abrirlo en una ventana privada.

La clave de OpenRouter nunca se pone en la aplicación ni en el repositorio: solo en las variables de entorno del servidor.
