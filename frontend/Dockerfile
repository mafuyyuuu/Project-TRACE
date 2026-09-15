# ---------------------------------------------------------------------------
# TRACE Frontend — Vite SPA served by nginx.
#
# Only needed for the all-in-one docker-compose deployment; the production
# frontend is built and hosted by Vercel. Kept so `docker compose up` gives
# full local parity with the deployed system.
# ---------------------------------------------------------------------------
FROM node:22-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* at build time, which is why this is a build arg and not a
# runtime variable. Empty means "same origin", correct when nginx below also
# proxies /api.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build


FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
