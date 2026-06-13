# Frontend Dockerfile for Vite React app
# Multi-stage: build assets with node, serve with nginx

# ---- Builder stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL deps (dev deps required for `vite build`)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Production stage ----
FROM nginx:stable-alpine

# Sensible default nginx config for SPA routing (history API fallback)
RUN printf 'server {\n  listen 80;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n  location = /sw.js { add_header Cache-Control "no-cache"; }\n  location = /manifest.webmanifest { add_header Cache-Control "no-cache"; }\n  gzip on;\n  gzip_types text/plain text/css application/javascript application/json image/svg+xml;\n}\n' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
