# Backend Dockerfile for Express API
FROM node:20-alpine AS deps
WORKDIR /app

# Install production dependencies (lockfile required for `npm ci`)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- Runtime ----
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# Copy deps and source
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

# Run as non-root
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:5000/api/health || exit 1
CMD ["node", "src/app.js"]
