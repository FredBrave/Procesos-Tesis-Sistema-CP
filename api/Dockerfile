# GUIOS PRO — Servidor REST (sin dependencias: no hay npm install)
# Construir desde la raíz del repositorio, porque el servidor usa app/js/engine.js y app/js/data.js:
#   docker build -f api/Dockerfile -t guiospro-api .
#   docker run -p 8787:8787 -v guios-datos:/app/api/data -e IA_PROVEEDOR=simulado guiospro-api
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    GUIOS_DB=/app/api/data/guiospro.db

COPY package.json ./
COPY app/js/engine.js app/js/data.js ./app/js/
COPY api/server.js api/schema.sqlite.sql ./api/
COPY api/lib ./api/lib
COPY api/ia ./api/ia

RUN mkdir -p /app/api/data && chown -R node:node /app/api/data
USER node
VOLUME ["/app/api/data"]
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8787/api/salud || exit 1

CMD ["node", "api/server.js"]
