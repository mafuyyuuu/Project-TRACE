# ---------------------------------------------------------------------------
# TRACE Backend API — Node.js/Express + Socket.IO
#
# Runs as a long-lived process (not a serverless function) because Socket.IO
# holds open connections and uploads are written to a mounted volume.
# ---------------------------------------------------------------------------
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copied first so a source-only change doesn't reinstall dependencies.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY database ./database

# Declared so the image is usable without a volume, but MOUNT ONE in
# production: the database stores only filenames, so without a volume the rows
# survive a redeploy and the bytes do not — every avatar and receipt 404s.
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

ENV NODE_ENV=production \
    PORT=3300
EXPOSE 3300

# Hits the real health route, which runs SELECT 1 and returns 503 on a dead
# database — so an unhealthy container is reported as unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3300/api/health || exit 1

CMD ["node", "src/server.js"]
